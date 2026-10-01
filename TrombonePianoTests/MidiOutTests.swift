import XCTest
@testable import TrombonePiano

final class MidiOutTests: XCTestCase {
    func testNoteOnAndNoteOffBytes() {
        XCTAssertEqual(midiNoteOn(60), [0x90, 60, 100])
        XCTAssertEqual(midiNoteOff(60), [0x80, 60, 0])
        XCTAssertEqual(midiNoteOn(21), [0x90, 21, midiNoteVelocity])
        XCTAssertEqual(midiNoteOff(108), [0x80, 108, 0])
    }

    func testUsbHostDestinationIsTheIDAMPort() {
        XCTAssertTrue(midiHostDestinationName("IDAM MIDI Host"))
        XCTAssertFalse(midiHostDestinationName("Trombone Piano"))
    }

    func testBleMidiPacketCarriesThe13BitTimestamp() {
        let packet = [UInt8](bleMidiPacket(message: [0x90, 60, 100], timestamp: 0x1ABC))
        XCTAssertEqual(packet, [0xB5, 0xBC, 0x90, 60, 100])
        let wrapped = [UInt8](bleMidiPacket(message: midiNoteOff(60), timestamp: 0x9ABC))
        XCTAssertEqual(wrapped, [0xB5, 0xBC, 0x80, 60, 0])
    }

    func testBluetoothGlyphFollowsMidiAdvertisingAndConnection() {
        XCTAssertEqual(bluetoothGlyphState(midiEnabled: false, advertising: true, connected: true), .disabled)
        XCTAssertEqual(bluetoothGlyphState(midiEnabled: true, advertising: false, connected: false), .idle)
        XCTAssertEqual(bluetoothGlyphState(midiEnabled: true, advertising: true, connected: false), .advertising)
        XCTAssertEqual(bluetoothGlyphState(midiEnabled: true, advertising: true, connected: true), .connected)
        XCTAssertEqual(
            bluetoothStatusLine(wantsAdvertising: false, radio: .ready, advertising: false, connected: false),
            "Off"
        )
        XCTAssertEqual(
            bluetoothStatusLine(wantsAdvertising: true, radio: .ready, advertising: true, connected: false),
            "Advertising"
        )
        XCTAssertEqual(
            bluetoothStatusLine(wantsAdvertising: true, radio: .ready, advertising: true, connected: true),
            "Connected"
        )
        XCTAssertEqual(
            bluetoothStatusLine(wantsAdvertising: true, radio: .poweredOff, advertising: false, connected: false),
            "Bluetooth is off"
        )
        XCTAssertEqual(
            bluetoothStatusLine(wantsAdvertising: true, radio: .denied, advertising: false, connected: false),
            "Bluetooth access is off"
        )
    }

    func testSetChangeBecomesNoteOnAndNoteOff() {
        let changes = noteChanges(from: [60, 64], to: [64, 67])
        XCTAssertEqual(
            midiMessages(started: changes.started, stopped: changes.stopped),
            [midiNoteOff(60), midiNoteOn(67)]
        )
    }
}
