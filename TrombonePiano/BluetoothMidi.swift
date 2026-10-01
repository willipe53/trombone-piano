import CoreBluetooth
import Darwin

/// Bluetooth MIDI service and characteristic from the BLE MIDI specification.
let bleMidiServiceUUID = CBUUID(string: "03B80E5A-EDE8-4B33-A751-6CE34EC4C700")
let bleMidiCharacteristicUUID = CBUUID(string: "7772E5DB-3868-4112-A1A9-F2669D106BF3")

enum BluetoothGlyphState: Equatable {
    /// Gray rune, black ground. MIDI is off.
    case disabled
    /// White rune, black ground. MIDI is on and this device is not advertising.
    case idle
    /// White rune, black ground, blinking. Advertising, no computer subscribed.
    case advertising
    /// White rune, blue ground. A computer is subscribed.
    case connected
}

enum BluetoothRadioState: Equatable {
    case unknown
    case poweredOff
    case denied
    case unsupported
    case ready
}

struct BluetoothAppearance: Equatable {
    var midiEnabled: Bool
    var wantsAdvertising: Bool
    var radio: BluetoothRadioState
    var advertising: Bool
    var connected: Bool

    var glyph: BluetoothGlyphState {
        bluetoothGlyphState(midiEnabled: midiEnabled, advertising: advertising, connected: connected)
    }

    var statusLine: String {
        guard midiEnabled else { return "Off" }
        return bluetoothStatusLine(
            wantsAdvertising: wantsAdvertising,
            radio: radio,
            advertising: advertising,
            connected: connected
        )
    }
}

func bluetoothGlyphState(midiEnabled: Bool, advertising: Bool, connected: Bool) -> BluetoothGlyphState {
    guard midiEnabled else { return .disabled }
    if connected { return .connected }
    if advertising { return .advertising }
    return .idle
}

func bluetoothStatusLine(
    wantsAdvertising: Bool,
    radio: BluetoothRadioState,
    advertising: Bool,
    connected: Bool
) -> String {
    if connected { return "Connected" }
    if advertising { return "Advertising" }
    if wantsAdvertising {
        switch radio {
        case .poweredOff: return "Bluetooth is off"
        case .denied: return "Bluetooth access is off"
        case .unsupported: return "Bluetooth is unavailable"
        case .unknown, .ready: return "Starting"
        }
    }
    return "Off"
}

/// One BLE MIDI packet. The header carries timestamp bits 12–7 and the next byte carries bits 6–0.
func bleMidiPacket(message: [UInt8], timestamp: UInt16) -> Data {
    let ts = timestamp & 0x1FFF
    var data = Data([
        0x80 | UInt8((ts >> 7) & 0x3F),
        0x80 | UInt8(ts & 0x7F),
    ])
    data.append(contentsOf: message)
    return data
}

/// Advertises this device as a Bluetooth MIDI peripheral and sends note bytes to subscribed computers.
final class BluetoothMidi: NSObject, CBPeripheralManagerDelegate {
    private(set) var wantsAdvertising = false
    private(set) var sessionActive = false
    private(set) var isAdvertising = false
    private(set) var isConnected = false
    private(set) var radio: BluetoothRadioState = .unknown
    var onChange: (() -> Void)?

    private var manager: CBPeripheralManager?
    private var characteristic: CBMutableCharacteristic?
    private var serviceAdded = false
    private var servicePending = false
    private var subscribers: Set<UUID> = []
    private var pending: [Data] = []
    private var timebase = mach_timebase_info_data_t(numer: 0, denom: 0)
    private let queueLimit = 32

    func setWantsAdvertising(_ wants: Bool) {
        wantsAdvertising = wants
        if wants {
            startIfNeeded()
        } else {
            stopAdvertising()
        }
        publish()
    }

    func setSessionActive(_ active: Bool) {
        sessionActive = active
        if active {
            startIfNeeded()
        } else {
            tearDownLink()
        }
        publish()
    }

    /// Starts advertising again after the app returns to the foreground.
    func restore() {
        guard sessionActive, wantsAdvertising else { return }
        startIfNeeded()
    }

    func send(_ bytes: [UInt8]) {
        guard sessionActive, isConnected, !bytes.isEmpty, characteristic != nil else { return }
        pending.append(bleMidiPacket(message: bytes, timestamp: currentTimestamp()))
        if pending.count > queueLimit {
            pending.removeFirst(pending.count - queueLimit)
        }
        flush()
    }

    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        switch peripheral.state {
        case .poweredOn:
            radio = .ready
            startIfNeeded()
        case .poweredOff:
            radio = .poweredOff
            dropRadio()
        case .unauthorized:
            radio = .denied
            dropRadio()
        case .unsupported:
            radio = .unsupported
            dropRadio()
        default:
            radio = .unknown
            isAdvertising = false
        }
        publish()
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
        servicePending = false
        serviceAdded = error == nil
        if error != nil {
            characteristic = nil
        }
        startAdvertisingIfReady()
        publish()
    }

    func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
        isAdvertising = error == nil && peripheral.isAdvertising
        publish()
    }

    func peripheralManager(
        _ peripheral: CBPeripheralManager,
        central: CBCentral,
        didSubscribeTo characteristic: CBCharacteristic
    ) {
        subscribers.insert(central.identifier)
        isConnected = true
        publish()
    }

    func peripheralManager(
        _ peripheral: CBPeripheralManager,
        central: CBCentral,
        didUnsubscribeFrom characteristic: CBCharacteristic
    ) {
        subscribers.remove(central.identifier)
        isConnected = !subscribers.isEmpty
        if !isConnected {
            pending.removeAll()
        }
        publish()
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest) {
        request.value = Data()
        peripheral.respond(to: request, withResult: .success)
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
        for request in requests {
            peripheral.respond(to: request, withResult: .success)
        }
    }

    func peripheralManagerIsReady(toUpdateSubscribers peripheral: CBPeripheralManager) {
        flush()
    }

    private func startIfNeeded() {
        guard sessionActive, wantsAdvertising else { return }
        if manager == nil {
            manager = CBPeripheralManager(delegate: self, queue: .main)
            return
        }
        guard manager?.state == .poweredOn else { return }
        ensureService()
        startAdvertisingIfReady()
    }

    private func ensureService() {
        guard let manager, manager.state == .poweredOn, !serviceAdded, !servicePending else { return }
        let characteristic = CBMutableCharacteristic(
            type: bleMidiCharacteristicUUID,
            properties: [.read, .write, .writeWithoutResponse, .notify],
            value: nil,
            permissions: [.readable, .writeable]
        )
        let service = CBMutableService(type: bleMidiServiceUUID, primary: true)
        service.characteristics = [characteristic]
        self.characteristic = characteristic
        servicePending = true
        manager.add(service)
    }

    private func startAdvertisingIfReady() {
        guard sessionActive, wantsAdvertising, serviceAdded, let manager, manager.state == .poweredOn else { return }
        if manager.isAdvertising {
            isAdvertising = true
            return
        }
        manager.startAdvertising([
            CBAdvertisementDataLocalNameKey: "Trombone Piano",
            CBAdvertisementDataServiceUUIDsKey: [bleMidiServiceUUID],
        ])
    }

    private func stopAdvertising() {
        manager?.stopAdvertising()
        isAdvertising = false
    }

    private func tearDownLink() {
        stopAdvertising()
        if serviceAdded || servicePending {
            manager?.removeAllServices()
        }
        serviceAdded = false
        servicePending = false
        characteristic = nil
        subscribers.removeAll()
        isConnected = false
        pending.removeAll()
    }

    private func dropRadio() {
        isAdvertising = false
        serviceAdded = false
        servicePending = false
        characteristic = nil
        subscribers.removeAll()
        isConnected = false
        pending.removeAll()
    }

    private func flush() {
        guard let characteristic, let manager else { return }
        while !pending.isEmpty {
            guard manager.updateValue(pending[0], for: characteristic, onSubscribedCentrals: nil) else { return }
            pending.removeFirst()
        }
    }

    private func currentTimestamp() -> UInt16 {
        if timebase.denom == 0 {
            mach_timebase_info(&timebase)
        }
        let denom = UInt64(max(timebase.denom, 1))
        let nanos = mach_absolute_time() * UInt64(timebase.numer) / denom
        return UInt16((nanos / 1_000_000) & 0x1FFF)
    }

    private func publish() {
        onChange?()
    }
}
