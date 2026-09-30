import XCTest
@testable import TrombonePiano

final class ScoreNotationTests: XCTestCase {
    func testPianoSplitsAtMiddleCAndTromboneStaysOnTheBassStaff() {
        let c4 = writtenNote(midi: 60, instrument: .piano, key: .c)
        XCTAssertEqual(c4.staff, .treble)
        XCTAssertEqual(c4.step, 0)
        XCTAssertNil(c4.accidental)

        let b3 = writtenNote(midi: 59, instrument: .piano, key: .c)
        XCTAssertEqual(b3.staff, .bass)
        XCTAssertEqual(b3.step, -1)

        let tromboneC4 = writtenNote(midi: 60, instrument: .trombone, key: .c)
        XCTAssertEqual(tromboneC4.staff, .bass)
        XCTAssertEqual(tromboneC4.step, 0)

        let both = writtenNotes(midi: 60, instrument: .trombone, key: .c)
        XCTAssertEqual(both.map(\.staff), [.bass, .tenor])
        XCTAssertEqual(both.map(\.step), [0, 0])
        XCTAssertTrue(both.allSatisfy { noteBelongsOnDrawnStaff($0.staff, step: $0.step) })

        let low = writtenNotes(midi: 21, instrument: .trombone, key: .bFlat)
        XCTAssertEqual(low.map(\.step), [-23, -23])
        XCTAssertTrue(noteBelongsOnDrawnStaff(.bass, step: -23))
        XCTAssertFalse(noteBelongsOnDrawnStaff(.tenor, step: -23))

        let high = writtenNotes(midi: 84, instrument: .trombone, key: .c)
        XCTAssertEqual(high.map(\.step), [14, 14])
        XCTAssertFalse(noteBelongsOnDrawnStaff(.bass, step: 14))
        XCTAssertTrue(noteBelongsOnDrawnStaff(.tenor, step: 14))
        XCTAssertEqual(writtenNotes(midi: 60, instrument: .piano, key: .c).map(\.staff), [.treble])
    }

    func testKeySignatureSuppressesItsOwnAccidentalsAndMarksTheOthers() {
        let fSharp = writtenNote(midi: 66, instrument: .piano, key: .g)
        XCTAssertEqual(fSharp.step, 3)
        XCTAssertNil(fSharp.accidental)

        let fNatural = writtenNote(midi: 65, instrument: .piano, key: .g)
        XCTAssertEqual(fNatural.accidental, .natural)

        let bFlat = writtenNote(midi: 70, instrument: .piano, key: .f)
        XCTAssertEqual(bFlat.step, 6)
        XCTAssertNil(bFlat.accidental)

        let bNatural = writtenNote(midi: 71, instrument: .piano, key: .f)
        XCTAssertEqual(bNatural.accidental, .natural)

        let cSharp = writtenNote(midi: 61, instrument: .piano, key: .c)
        XCTAssertEqual(cSharp.accidental, .sharp)

        let dFlat = writtenNote(midi: 61, instrument: .piano, key: .f)
        XCTAssertEqual(dFlat.step, 1)
        XCTAssertEqual(dFlat.accidental, .flat)
    }

    func testSignatureMarksSitOnTheUsualStaffPositions() {
        XCTAssertEqual(signatureMarks(key: .c, staff: .treble), [])
        XCTAssertEqual(
            signatureMarks(key: .g, staff: .treble),
            [SignatureMark(step: 10, accidental: .sharp)]
        )
        XCTAssertEqual(
            signatureMarks(key: .g, staff: .bass),
            [SignatureMark(step: -4, accidental: .sharp)]
        )
        XCTAssertEqual(
            signatureMarks(key: .f, staff: .treble),
            [SignatureMark(step: 6, accidental: .flat)]
        )
        XCTAssertEqual(signatureMarks(key: .cSharp, staff: .bass).count, 7)
        XCTAssertEqual(signatureMarks(key: .cFlat, staff: .treble).count, 7)
        XCTAssertEqual(
            signatureMarks(key: .g, staff: .tenor).map(\.step),
            [-4]
        )
        XCTAssertEqual(
            signatureMarks(key: .f, staff: .tenor).map(\.step),
            [-1]
        )
        XCTAssertEqual(
            signatureMarks(key: .cSharp, staff: .tenor).map(\.step),
            [-4, 0, -3, 1, -2, 2, -1]
        )
        XCTAssertEqual(
            signatureMarks(key: .cFlat, staff: .tenor).map(\.step),
            [-1, 2, -2, 1, -3, 0, -4]
        )
        XCTAssertEqual(signatureMarks(key: .eMinor, staff: .treble), signatureMarks(key: .g, staff: .treble))
        XCTAssertEqual(signatureMarks(key: .dMinor, staff: .bass), signatureMarks(key: .f, staff: .bass))
    }

    func testOutOfKeyNotesAreTheOnesTheSignatureDoesNotSpell() {
        XCTAssertTrue(noteIsInKey(midi: 60, key: .c))
        XCTAssertFalse(noteIsInKey(midi: 61, key: .c))
        XCTAssertTrue(noteIsInKey(midi: 64, key: .c))

        XCTAssertFalse(noteIsInKey(midi: 65, key: .g))
        XCTAssertTrue(noteIsInKey(midi: 66, key: .g))
        XCTAssertEqual(pitchClasses(in: .eMinor), pitchClasses(in: .g))

        XCTAssertFalse(noteIsInKey(midi: 71, key: .f))
        XCTAssertTrue(noteIsInKey(midi: 70, key: .f))
        XCTAssertEqual(pitchClasses(in: .dMinor), pitchClasses(in: .f))

        XCTAssertTrue(noteIsInKey(midi: 60, key: .cSharp))
        XCTAssertTrue(noteIsInKey(midi: 65, key: .cSharp))
        XCTAssertFalse(noteIsInKey(midi: 62, key: .cSharp))
        XCTAssertEqual(pitchClasses(in: .cSharp).count, 7)
    }

    func testKeyMenuPairsEachMajorWithItsRelativeMinor() {
        XCTAssertEqual(
            KeySignature.catalog.map(\.title),
            [
                "C MAJOR", "A MINOR",
                "G MAJOR", "E MINOR",
                "D MAJOR", "B MINOR",
                "A MAJOR", "F# MINOR",
                "E MAJOR", "C# MINOR",
                "B MAJOR", "G# MINOR",
                "F# MAJOR", "D# MINOR",
                "C# MAJOR", "A# MINOR",
                "F MAJOR", "D MINOR",
                "Bb MAJOR", "G MINOR",
                "Eb MAJOR", "C MINOR",
                "Ab MAJOR", "F MINOR",
                "Db MAJOR", "Bb MINOR",
                "Gb MAJOR", "Eb MINOR",
                "Cb MAJOR", "Ab MINOR",
            ]
        )
    }

    func testPlayedNotesStayWhiteUntilReleasedAndOldColumnsScrollOff() {
        var history = ScoreHistory()
        XCTAssertEqual(history.apply(started: [60, 64], stopped: []), 0)
        XCTAssertEqual(history.columns.count, 1)
        XCTAssertEqual(history.columns[0].notes.map(\.midi), [60, 64])
        XCTAssertTrue(history.columns[0].notes.allSatisfy(\.sounding))

        history.apply(started: [67], stopped: [60, 64])
        XCTAssertFalse(history.columns[0].notes[0].sounding)
        XCTAssertFalse(history.columns[0].notes[1].sounding)
        XCTAssertTrue(history.columns[1].notes[0].sounding)

        for midi in 72..<(72 + ScoreHistory.columnLimit) {
            history.apply(started: [midi], stopped: [])
        }
        XCTAssertEqual(history.columns.count, ScoreHistory.columnLimit)
        XCTAssertEqual(history.columns.last?.notes.first?.midi, 72 + ScoreHistory.columnLimit - 1)
        XCTAssertNotEqual(history.columns.first?.notes.first?.midi, 60)
    }

    func testPrimaryTrombonePositionIsTheShortestInTuneSlide() {
        XCTAssertEqual(trombonePosition(midi: 40), 7)
        XCTAssertEqual(trombonePosition(midi: 46), 1)
        XCTAssertEqual(trombonePosition(midi: 47), 7)
        XCTAssertEqual(trombonePosition(midi: 53), 1)
        XCTAssertEqual(trombonePosition(midi: 54), 5)
        XCTAssertEqual(trombonePosition(midi: 58), 1)
        XCTAssertEqual(trombonePosition(midi: 59), 4)
        XCTAssertEqual(trombonePosition(midi: 60), 3)
        XCTAssertEqual(trombonePosition(midi: 62), 1)
        XCTAssertEqual(trombonePosition(midi: 65), 1)
        XCTAssertEqual(trombonePosition(midi: 66), 5)
        XCTAssertEqual(trombonePosition(midi: 67), 4)
        XCTAssertEqual(trombonePosition(midi: 68), 3)
        XCTAssertEqual(trombonePosition(midi: 70), 1)
        XCTAssertEqual(trombonePosition(midi: 71), 2)
        XCTAssertEqual(trombonePosition(midi: 72), 1)
        XCTAssertEqual(trombonePosition(midi: 77), 1)
        XCTAssertEqual(trombonePosition(midi: 34), 1)
        XCTAssertEqual(trombonePosition(midi: 28), 7)
        XCTAssertNil(trombonePosition(midi: 35))
        XCTAssertNil(trombonePosition(midi: 36))
        XCTAssertNil(trombonePosition(midi: 39))
        for midi in 35...39 {
            XCTAssertTrue(tromboneNeedsFAttachment(midi: midi))
        }
        XCTAssertFalse(tromboneNeedsFAttachment(midi: 34))
        XCTAssertFalse(tromboneNeedsFAttachment(midi: 40))
        XCTAssertEqual(tromboneOuterShift(position: 1, displayedWidth: 1498), 0)
        XCTAssertEqual(tromboneOuterShift(position: 2, displayedWidth: 1498), 172)
        XCTAssertEqual(tromboneOuterShift(position: 3, displayedWidth: 1498), 244)
        XCTAssertEqual(tromboneOuterShift(position: 4, displayedWidth: 1498), 330)
        XCTAssertEqual(tromboneOuterShift(position: 5, displayedWidth: 1498), 459)
        XCTAssertEqual(tromboneOuterShift(position: 6, displayedWidth: 1498), 660)
        XCTAssertEqual(tromboneOuterShift(position: 7, displayedWidth: 1498), 804)
        XCTAssertEqual(tromboneOuterDrop(horizontal: 0), 0)
        XCTAssertEqual(tromboneOuterDrop(horizontal: 795), 9, accuracy: 0.001)
        XCTAssertEqual(tromboneOuterDrop(horizontal: 804), 804 * 9 / 795, accuracy: 0.001)
        XCTAssertEqual(tromboneOuterShift(position: 4, displayedWidth: 749), 165)
        XCTAssertEqual(tromboneHornMessage(midi: 27), "Ok now you're scaring me")
        XCTAssertNil(tromboneHornMessage(midi: 28))
        XCTAssertEqual(tromboneHornMessage(midi: 36), "requires F attachment")
        XCTAssertNil(tromboneHornMessage(midi: 106))
        XCTAssertEqual(tromboneHornMessage(midi: 107), "Play it anywhere you like!")
    }

    func testClearErasesTheStaffHistory() {
        var history = ScoreHistory()
        history.apply(started: [60, 64], stopped: [])
        history.apply(started: [67], stopped: [60])
        history.clear()
        XCTAssertTrue(history.columns.isEmpty)
        XCTAssertEqual(history.apply(started: [72], stopped: []), 0)
        XCTAssertEqual(history.columns.map { $0.notes.map(\.midi) }, [[72]])
    }
}
