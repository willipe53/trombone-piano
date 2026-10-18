import XCTest
@testable import TrombonePiano

final class PlayingChartTests: XCTestCase {
    func testShortSecondNeighborsFirstAndThird() {
        let sharpSecond = SlideStop(number: 2, short: true)
        XCTAssertTrue(slideStopsAreNeighbors(sharpSecond, SlideStop(number: 1, short: false)))
        XCTAssertTrue(slideStopsAreNeighbors(sharpSecond, SlideStop(number: 3, short: false)))
        XCTAssertFalse(slideStopsAreNeighbors(sharpSecond, SlideStop(number: 2, short: false)))
        XCTAssertEqual(sharpSecond.label, "#2")
    }

    func testG4AcceptsSharpSecondAndFourth() {
        let stops = playingStops(midi: 67)
        XCTAssertTrue(stops.contains(SlideStop(number: 2, short: true)))
        XCTAssertTrue(stops.contains(SlideStop(number: 4, short: false)))
        XCTAssertEqual(conventionalStop(midi: 67), SlideStop(number: 2, short: true))
        XCTAssertEqual(
            landingStop(midi: 67, beside: SlideStop(number: 1, short: false)),
            SlideStop(number: 2, short: true)
        )
        XCTAssertEqual(
            landingStop(midi: 67, beside: SlideStop(number: 5, short: false)),
            SlideStop(number: 4, short: false)
        )
        XCTAssertEqual(
            landingStop(midi: 67, beside: SlideStop(number: 3, short: false)),
            SlideStop(number: 2, short: true)
        )
    }
}

final class GolfDealTests: XCTestCase {
    func testLegalTakeUndoAndClear() {
        let now = Date(timeIntervalSince1970: 1_000)
        var deal = GolfDeal.deal(level: .start(clef: .bass), seed: 11, now: now)
        XCTAssertEqual(deal.columns.count, 5)
        XCTAssertEqual(deal.columns.map(\.count), [3, 3, 3, 3, 3])
        XCTAssertNotNil(deal.wasteCard?.revealed)
        let later = now.addingTimeInterval(1.5)
        guard case .took(let stop, _, let answer) = deal.take(column: 0, at: later) else {
            return XCTFail("column 0 should take")
        }
        XCTAssertEqual(answer.action, .filled)
        XCTAssertEqual(answer.milliseconds, 1500)
        XCTAssertEqual(deal.wasteCard?.revealed, stop)
        XCTAssertTrue(deal.undo())
        XCTAssertEqual(deal.columns[0].count, 3)
        XCTAssertNil(deal.bottom(0)?.revealed)

        var guardCount = 0
        while !deal.isCleared && guardCount < 40 {
            guardCount += 1
            var took = false
            for column in deal.columns.indices where !deal.columns[column].isEmpty {
                if case .took = deal.take(column: column, at: later.addingTimeInterval(Double(guardCount))) {
                    took = true
                    break
                }
            }
            XCTAssertTrue(took)
        }
        XCTAssertTrue(deal.isCleared)
    }

    func testPeekRevealsWithoutMoving() {
        let now = Date(timeIntervalSince1970: 2_000)
        var deal = GolfDeal.deal(level: .start(clef: .tenor), seed: 4, now: now)
        let before = deal.bottom(0)?.midi
        let answer = deal.peek(column: 0, at: now.addingTimeInterval(0.4))
        XCTAssertEqual(answer?.action, .peeked)
        XCTAssertEqual(answer?.clef, "tenor")
        XCTAssertEqual(deal.bottom(0)?.midi, before)
        XCTAssertEqual(deal.bottom(0)?.revealed, before.flatMap { conventionalStop(midi: $0) })
        XCTAssertNil(deal.peek(column: 0, at: now))
    }

    func testEasierAndHarderChangeTheBoard() {
        let start = GolfLevel.start(clef: .bass)
        XCTAssertEqual(start.eased().columns, 3)
        XCTAssertFalse(start.eased().ledgerLines)
        let harder = start.hardened()
        XCTAssertTrue(harder.ledgerLines)
        XCTAssertEqual(harder.columns, 5)
        XCTAssertEqual(harder.hardened().columns, 7)
        XCTAssertTrue(start.nextLine.contains("5 columns in bass"))
        let eased = GolfDeal.deal(level: start.eased(), seed: 1, now: Date())
        XCTAssertEqual(eased.columns.count, 3)
    }
}

final class ScaleInventoryTests: XCTestCase {
    func testMissingDegreesSpringBackAndClear() {
        let now = Date(timeIntervalSince1970: 3_000)
        let level = ScaleLevel.start(key: .bFlat)
        XCTAssertEqual(level.blanks, 2)
        XCTAssertEqual(level.accidentals, 2)
        var deal = ScaleInventoryDeal.deal(level: level, seed: 9, now: now)
        XCTAssertEqual(deal.notes.count, 8)
        XCTAssertEqual(deal.missing.count, 2)
        let wrong = deal.place(midi: deal.notes[0] + 1, at: deal.missing.first ?? 0, now: now)
        XCTAssertNil(wrong)
        XCTAssertEqual(deal.missing.count, 2)
        for slot in deal.missing.sorted() {
            let answer = deal.place(midi: deal.notes[slot], at: slot, now: now.addingTimeInterval(2))
            XCTAssertEqual(answer?.action, .filled)
            XCTAssertEqual(answer?.keyID, "Bb")
        }
        XCTAssertTrue(deal.isCleared)
    }

    func testEasierQuietsTheKeyAndNextKeepsTheWidth() {
        let start = ScaleLevel.start(key: .bFlat)
        let easier = start.eased()
        XCTAssertEqual(easier.accidentals, 1)
        XCTAssertEqual(easier.blanks, 2)
        XCTAssertEqual(abs(easier.key.accidentals), 1)
        let harder = start.hardened()
        XCTAssertEqual(harder.blanks, 3)
        XCTAssertEqual(harder.accidentals, 2)
        let next = start.stepped()
        XCTAssertEqual(abs(next.key.accidentals), 2)
        XCTAssertNotEqual(next.key.id, start.key.id)
        XCTAssertTrue(start.nextLine.contains("major"))
        let minorStart = ScaleLevel.start(key: .gMinor)
        XCTAssertEqual(minorStart.key.id, "Bb")
    }
}

final class GameLogTests: XCTestCase {
    func testAppendIsReadable() throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("game-log-test-\(UUID().uuidString)", isDirectory: true)
        let log = GameLog(directory: directory)
        let entry = GameLogEntry(
            id: UUID(),
            at: Date(timeIntervalSince1970: 10),
            game: "golf",
            clef: "bass",
            keyID: nil,
            ledgerLines: false,
            note: 67,
            action: .filled,
            milliseconds: 800
        )
        try log.append(entry)
        try log.append(entry)
        let loaded = try log.load()
        XCTAssertEqual(loaded.count, 2)
        XCTAssertEqual(loaded.first?.note, 67)
        XCTAssertEqual(loaded.first?.milliseconds, 800)
        XCTAssertEqual(loaded.first?.action, .filled)
    }
}
