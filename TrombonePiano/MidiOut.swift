import CoreMIDI
import Darwin

let midiNoteVelocity: UInt8 = 100

func midiNoteOn(_ note: Int, velocity: UInt8 = midiNoteVelocity) -> [UInt8] {
    [0x90, UInt8(clamping: note), velocity]
}

func midiNoteOff(_ note: Int) -> [UInt8] {
    [0x80, UInt8(clamping: note), 0]
}

func midiMessages(started: [Int], stopped: [Int]) -> [[UInt8]] {
    stopped.map { midiNoteOff($0) } + started.map { midiNoteOn($0) }
}

func midiHostDestinationName(_ name: String) -> Bool {
    name.range(of: "IDAM", options: .caseInsensitive) != nil
}

/// Virtual source named Trombone Piano. Note on and note off go out while this is enabled. The sampler stays with PianoAudio.
final class MidiOut {
    private var client = MIDIClientRef()
    private var source = MIDIEndpointRef()
    private var output = MIDIPortRef()
    private var held: Set<Int> = []
    private(set) var isEnabled = false

    @discardableResult
    func setEnabled(_ enabled: Bool) -> Bool {
        if enabled {
            return open()
        }
        releaseHeldNotes()
        close()
        return true
    }

    func play(started: [Int], stopped: [Int]) {
        guard isEnabled else { return }
        for bytes in midiMessages(started: started, stopped: stopped) {
            let note = Int(bytes[1])
            if bytes[0] == 0x80 {
                transmit(bytes)
                held.remove(note)
            } else if !held.contains(note) {
                transmit(bytes)
                held.insert(note)
            }
        }
    }

    func releaseHeldNotes() {
        guard isEnabled else { return }
        for note in held.sorted() {
            transmit(midiNoteOff(note))
        }
        held.removeAll()
    }

    private func open() -> Bool {
        guard !isEnabled else { return true }
        let name = "Trombone Piano" as CFString
        guard MIDIClientCreateWithBlock(name, &client, nil) == noErr else {
            client = 0
            return false
        }
        guard MIDISourceCreate(client, name, &source) == noErr else {
            MIDIClientDispose(client)
            client = 0
            source = 0
            return false
        }
        if MIDIOutputPortCreate(client, name, &output) != noErr {
            output = 0
        }
        let session = MIDINetworkSession.default()
        session.connectionPolicy = .anyone
        session.isEnabled = true
        isEnabled = true
        return true
    }

    private func close() {
        guard isEnabled || client != 0 || source != 0 else { return }
        let session = MIDINetworkSession.default()
        session.isEnabled = false
        session.connectionPolicy = .noOne
        if output != 0 {
            MIDIPortDispose(output)
            output = 0
        }
        if source != 0 {
            MIDIEndpointDispose(source)
            source = 0
        }
        if client != 0 {
            MIDIClientDispose(client)
            client = 0
        }
        held.removeAll()
        isEnabled = false
    }

    private func transmit(_ bytes: [UInt8]) {
        guard source != 0, bytes.count == 3 else { return }
        var list = MIDIPacketList()
        let packet = MIDIPacketListInit(&list)
        var added = false
        bytes.withUnsafeBufferPointer { buffer in
            guard let address = buffer.baseAddress else { return }
            _ = MIDIPacketListAdd(
                &list,
                MemoryLayout<MIDIPacketList>.size,
                packet,
                hostTime(),
                3,
                address
            )
            added = true
        }
        guard added else { return }
        MIDIReceived(source, &list)
        guard output != 0 else { return }
        let network = MIDINetworkSession.default().destinationEndpoint()
        if network != 0 {
            MIDISend(output, network, &list)
        }
        let count = MIDIGetNumberOfDestinations()
        for index in 0..<count {
            let destination = MIDIGetDestination(index)
            guard destination != 0, destination != network else { continue }
            guard midiHostDestinationName(midiEndpointName(destination)) else { continue }
            MIDISend(output, destination, &list)
        }
    }

    private func midiEndpointName(_ endpoint: MIDIEndpointRef) -> String {
        var value: Unmanaged<CFString>?
        guard MIDIObjectGetStringProperty(endpoint, kMIDIPropertyName, &value) == noErr else { return "" }
        return value?.takeRetainedValue() as String? ?? ""
    }

    private func hostTime() -> MIDITimeStamp {
        let now = mach_absolute_time()
        return now == 0 ? 1 : now
    }
}
