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

    func testSetChangeBecomesNoteOnAndNoteOff() {
        let changes = noteChanges(from: [60, 64], to: [64, 67])
        XCTAssertEqual(
            midiMessages(started: changes.started, stopped: changes.stopped),
            [midiNoteOff(60), midiNoteOn(67)]
        )
    }
}
