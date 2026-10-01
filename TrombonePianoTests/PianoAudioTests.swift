import XCTest
@testable import TrombonePiano

final class PianoAudioTests: XCTestCase {
    func testSampleNamesUseFlatSpellingsForThe88Keys() {
        XCTAssertEqual(sampleFileStem(midiNote: 21), "A0")
        XCTAssertEqual(sampleFileStem(midiNote: 22), "Bb0")
        XCTAssertEqual(sampleFileStem(midiNote: 60), "C4")
        XCTAssertEqual(sampleFileStem(midiNote: 61), "Db4")
        XCTAssertEqual(sampleFileStem(midiNote: 108), "C8")
    }

    func testTromboneHoldLoopsTheSteadyMiddleWithoutASeam() {
        let rate = 44_100.0
        let midi = 48
        let frequency = 440.0 * pow(2.0, Double(midi - 69) / 12.0)
        let count = Int(3.2 * rate)
        var samples = [Float](repeating: 0, count: count)
        for index in samples.indices {
            samples[index] = sin(2 * .pi * Float(frequency) * Float(index) / Float(rate))
        }

        let period = tromboneFundamentalPeriod(samples: samples, sampleRate: rate, midi: midi, at: Int(0.8 * rate))
        XCTAssertLessThan(abs(period - Int((rate / frequency).rounded())), 5)

        let sustain = tromboneSustainLoop(samples: samples, sampleRate: rate, midi: midi)
        XCTAssertNotNil(sustain)
        guard let sustain else { return }
        XCTAssertEqual(sustain.loop[0], samples[sustain.intro.count], accuracy: 0.0001)

        let window = Int(0.02 * rate)
        var quietest: Float = 1
        var index = 0
        while index + window < sustain.loop.count {
            let slice = sustain.loop[index..<(index + window)]
            let mean = slice.reduce(0) { $0 + $1 * $1 } / Float(window)
            quietest = min(quietest, sqrt(mean))
            index += window / 2
        }
        XCTAssertGreaterThan(quietest, 0.5)
    }

    func testShortRecordingDoesNotLoop() {
        let samples = [Float](repeating: 0.2, count: 1000)
        XCTAssertNil(tromboneSustainLoop(samples: samples, sampleRate: 44_100, midi: 60))
    }

    func testNoteChangesReportPressedAndReleasedKeys() {
        let changes = noteChanges(from: [60, 64, 67], to: [64, 67, 72])
        XCTAssertEqual(changes.started, [72])
        XCTAssertEqual(changes.stopped, [60])
    }

    func testSpeakerOverrideLeavesHeadphonesAndTakesUsb() {
        XCTAssertFalse(shouldPlayThroughBuiltInSpeaker(ports: [.builtInSpeaker]))
        XCTAssertFalse(shouldPlayThroughBuiltInSpeaker(ports: [.headphones]))
        XCTAssertFalse(shouldPlayThroughBuiltInSpeaker(ports: [.bluetoothA2DP]))
        XCTAssertTrue(shouldPlayThroughBuiltInSpeaker(ports: [.usbAudio]))
        XCTAssertTrue(shouldPlayThroughBuiltInSpeaker(ports: []))
    }
}
