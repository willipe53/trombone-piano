import XCTest
@testable import TrombonePiano

final class PianoGeometryTests: XCTestCase {
    func testFullSizeWhiteKeysAre22By120Millimeters() {
        let white = layoutKeyboard(scale: 1).first { !$0.isBlack }!
        XCTAssertEqual(
            white.rect.width,
            whiteKeyWidthMm * ipadProPointsPerMillimeter,
            accuracy: 0.001
        )
        XCTAssertEqual(
            white.rect.height,
            whiteKeyHeightMm * ipadProPointsPerMillimeter,
            accuracy: 0.001
        )
    }

    func testFullSizeIsAboutAnOctaveAndAHalfOnAn11InchIPadPro() {
        let landscapeWidth = 1210.0
        let whiteWidth = layoutKeyboard(scale: 1).first { !$0.isBlack }!.rect.width
        XCTAssertEqual(landscapeWidth / whiteWidth, 10.5, accuracy: 0.15)
    }

    func testMinimumScaleFitsAll88KeysAcrossTheScreen() {
        let landscapeWidth = 1210.0
        let scale = scaleThatFitsKeyboard(landscapeWidth)
        let keys = layoutKeyboard(scale: scale)
        let width = keyboardWidth(keys)
        let offset = centeredKeyboardOffset(keyboardWidth: width, viewportWidth: landscapeWidth)
        XCTAssertLessThan(scale, keyScaleMax)
        XCTAssertEqual(width, landscapeWidth, accuracy: 0.01)
        XCTAssertEqual(keys.first!.rect.left + offset, 0, accuracy: 0.01)
        XCTAssertEqual(keys.last!.rect.right + offset, landscapeWidth, accuracy: 0.01)
    }

    func testNoteLabelsUseScientificPitch() {
        XCTAssertEqual(noteLabel(21), "A0")
        XCTAssertEqual(noteLabel(60), "C4")
        XCTAssertEqual(noteLabel(108), "C8")
    }

    func testKeyboardIsThe88KeysFromA0ThroughC8() {
        let keys = layoutKeyboard(scale: 1)
        XCTAssertEqual(keys.count, 88)
        XCTAssertEqual(keys.first?.midiNote, lowestMidiNote)
        XCTAssertEqual(keys.last?.midiNote, highestMidiNote)
        XCTAssertEqual(keys.filter { !$0.isBlack }.count, 52)
        XCTAssertEqual(keys.filter(\.isBlack).count, 36)
    }

    func testCenteredWindowShowsTheMiddleOfTheKeyboard() {
        let landscapeWidth = 1210.0
        let keys = layoutKeyboard(scale: 1)
        let width = keyboardWidth(keys)
        let offset = centeredKeyboardOffset(keyboardWidth: width, viewportWidth: landscapeWidth)
        let visibleCenter = -offset + landscapeWidth / 2
        XCTAssertEqual(visibleCenter, width / 2, accuracy: 0.001)
        XCTAssertLessThan(keys.first!.rect.right + offset, 0)
        XCTAssertGreaterThan(keys.last!.rect.left + offset, landscapeWidth)
    }

    func testCSharpIsCenteredOnTheGapAfterCAndWinsTheOverlap() {
        let keys = layoutKeyboard(scale: 1)
        let c = keys.first { $0.midiNote == 60 }!
        let cSharp = keys.first { $0.midiNote == 61 }!
        let boundary = c.rect.right
        let center = cSharp.rect.left + cSharp.rect.width / 2
        XCTAssertEqual(center, boundary, accuracy: 0.001)
        XCTAssertEqual(noteAt(x: center, y: cSharp.rect.height / 2, keys: keys), 61)
        XCTAssertEqual(
            noteAt(x: c.rect.left + c.rect.width / 2, y: c.rect.bottom - 1, keys: keys),
            60
        )
    }

    func testEAndFHaveNoBlackKeyBetweenThem() {
        let keys = layoutKeyboard(scale: 1)
        let e = keys.first { $0.midiNote == 64 }!
        let f = keys.first { $0.midiNote == 65 }!
        XCTAssertFalse(e.isBlack)
        XCTAssertFalse(f.isBlack)
        XCTAssertEqual(f.rect.left, e.rect.right, accuracy: 0.001)
    }

    func testNoteBadgesShareOneSize() {
        let style = noteBadgeStyle(visualKeyWidth: 90)
        let again = noteBadgeStyle(visualKeyWidth: 90)
        XCTAssertEqual(style, again)
        guard let style else {
            XCTFail("expected a badge")
            return
        }
        let font = moogFont(size: style.fontSize, weight: .medium)
        let labels = (lowestMidiNote...highestMidiNote).filter { !isBlackKey($0) }.map(noteLabel)
        for label in labels {
            let textWidth = (label as NSString).size(withAttributes: [.font: font]).width
            XCTAssertLessThanOrEqual(textWidth, style.width * 0.82 + 0.5)
        }
    }

    func testScrollRangeParksTheEndsOnTheScreen() {
        let viewport = 1210.0
        let width = keyboardWidth(layoutKeyboard(scale: 1))
        let range = keyboardScrollRange(keyboardWidth: width, viewportWidth: viewport)
        XCTAssertEqual(range.maximum, 0, accuracy: 0.001)
        XCTAssertEqual(range.minimum, viewport - width, accuracy: 0.001)
        XCTAssertLessThan(range.minimum, centeredKeyboardOffset(keyboardWidth: width, viewportWidth: viewport))
    }

    func testScrollRangeStaysCenteredWhenTheKeybedFits() {
        let viewport = 1210.0
        let scale = scaleThatFitsKeyboard(viewport)
        let width = keyboardWidth(layoutKeyboard(scale: scale))
        let centered = centeredKeyboardOffset(keyboardWidth: width, viewportWidth: viewport)
        let range = keyboardScrollRange(keyboardWidth: width, viewportWidth: viewport)
        XCTAssertEqual(range.minimum, centered, accuracy: 0.001)
        XCTAssertEqual(range.maximum, centered, accuracy: 0.001)
    }

    func testFlingSpeedChoosesSettleOctaveOrEnd() {
        XCTAssertEqual(keyboardFling(velocity: 449), .settle)
        XCTAssertEqual(keyboardFling(velocity: -449), .settle)
        XCTAssertEqual(keyboardFling(velocity: keyboardOctaveFlingSpeed), .octave)
        XCTAssertEqual(keyboardFling(velocity: -1599), .octave)
        XCTAssertEqual(keyboardFling(velocity: keyboardEndFlingSpeed), .end)
        XCTAssertEqual(keyboardFling(velocity: -keyboardEndFlingSpeed), .end)
    }

    func testGentleFlingMovesOneOctaveAndAHardFlingRunsToTheEnd() {
        let viewport = 1210.0
        let width = keyboardWidth(layoutKeyboard(scale: 1))
        let range = keyboardScrollRange(keyboardWidth: width, viewportWidth: viewport)
        let origin = centeredKeyboardOffset(keyboardWidth: width, viewportWidth: viewport)
        let octave = octaveScrollDistance(scale: 1)
        XCTAssertEqual(octave, whiteKeyWidthMm * ipadProPointsPerMillimeter * 7, accuracy: 0.001)

        let towardBottom = keyboardScrollTarget(
            offset: origin,
            velocity: 800,
            range: range,
            octaveDistance: octave
        )
        XCTAssertEqual(towardBottom, origin + octave, accuracy: 0.001)

        let towardTop = keyboardScrollTarget(
            offset: origin,
            velocity: -800,
            range: range,
            octaveDistance: octave
        )
        XCTAssertEqual(towardTop, origin - octave, accuracy: 0.001)

        XCTAssertEqual(
            keyboardScrollTarget(offset: origin, velocity: 2000, range: range, octaveDistance: octave),
            range.maximum,
            accuracy: 0.001
        )
        XCTAssertEqual(
            keyboardScrollTarget(offset: origin, velocity: -2000, range: range, octaveDistance: octave),
            range.minimum,
            accuracy: 0.001
        )
    }

    func testOctaveFlingStopsAtTheEnd() {
        let range = KeyboardScrollRange(minimum: -4000, maximum: 0)
        XCTAssertEqual(
            keyboardScrollTarget(offset: -200, velocity: 900, range: range, octaveDistance: 800),
            0,
            accuracy: 0.001
        )
        XCTAssertEqual(
            keyboardScrollTarget(offset: -200, velocity: 200, range: range, octaveDistance: 800),
            -200,
            accuracy: 0.001
        )
    }

    func testDragPastTheEndResists() {
        let range = KeyboardScrollRange(minimum: -4000, maximum: 0)
        let dragged = keyboardOffsetForDrag(unbandedOffset: 300, range: range, viewportWidth: 1000)
        XCTAssertGreaterThan(dragged, 0)
        XCTAssertLessThan(dragged, 300)
        let otherEnd = keyboardOffsetForDrag(unbandedOffset: -4300, range: range, viewportWidth: 1000)
        XCTAssertLessThan(otherEnd, -4000)
        XCTAssertGreaterThan(otherEnd, -4300)
        XCTAssertEqual(
            keyboardOffsetForDrag(unbandedOffset: -1500, range: range, viewportWidth: 1000),
            -1500,
            accuracy: 0.001
        )
    }

    func testSeededRandomMatchesDart() {
        var random = DartRandom(seed: 4)
        let expected = [
            0.286950384253,
            0.933533458132,
            0.116938691780,
            0.708032015485,
            0.104112019888,
            0.561487004798,
            0.992777628036,
            0.570393295484,
        ]
        for value in expected {
            XCTAssertEqual(random.nextDouble(), value, accuracy: 0.000000001)
        }
    }
}
