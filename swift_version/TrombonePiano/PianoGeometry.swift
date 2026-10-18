/// Points per millimeter on iPad Pro.
///
/// Those displays are 264 pixels per inch at 2x, so one point is 1/132 of an inch.
let ipadProPointsPerMillimeter: Double = 132 / 25.4

let whiteKeyWidthMm: Double = 22
let whiteKeyHeightMm: Double = 120

let blackKeyWidthRatio: Double = 0.6
let blackKeyHeightRatio: Double = 0.65

/// Full size. The slider does not grow keys past this.
let keyScaleMax: Double = 1

/// A0, the bottom note of an 88-key piano.
let lowestMidiNote = 21

/// C8, the top note of an 88-key piano.
let highestMidiNote = 108

struct KeyRect: Equatable {
    var left: Double
    var top: Double
    var width: Double
    var height: Double

    var right: Double { left + width }
    var bottom: Double { top + height }

    func contains(x: Double, y: Double) -> Bool {
        x >= left && x < right && y >= top && y <= bottom
    }

}

struct PianoKey: Equatable {
    var midiNote: Int
    var isBlack: Bool
    var rect: KeyRect
}

private let pitchClassNames = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
]

/// Scientific pitch name, such as C4 for middle C.
func noteLabel(_ midiNote: Int) -> String {
    let octave = (midiNote / 12) - 1
    return "\(pitchClassNames[midiNote % 12])\(octave)"
}

func isBlackKey(_ midiNote: Int) -> Bool {
    switch midiNote % 12 {
    case 1, 3, 6, 8, 10:
        return true
    default:
        return false
    }
}

/// White keys are `whiteKeyWidthMm` by `whiteKeyHeightMm` at scale 1.
/// Black keys sit on the top of the keyboard, centered on the gap after
/// the white key they follow.
func layoutKeyboard(scale: Double) -> [PianoKey] {
    let whiteWidth = whiteKeyWidthMm * scale * ipadProPointsPerMillimeter
    let whiteHeight = whiteKeyHeightMm * scale * ipadProPointsPerMillimeter
    let blackWidth = whiteWidth * blackKeyWidthRatio
    let blackHeight = whiteHeight * blackKeyHeightRatio

    var keys: [PianoKey] = []
    var whiteIndex = 0
    for midi in lowestMidiNote...highestMidiNote {
        if isBlackKey(midi) {
            keys.append(
                PianoKey(
                    midiNote: midi,
                    isBlack: true,
                    rect: KeyRect(
                        left: Double(whiteIndex) * whiteWidth - blackWidth / 2,
                        top: 0,
                        width: blackWidth,
                        height: blackHeight
                    )
                )
            )
        } else {
            keys.append(
                PianoKey(
                    midiNote: midi,
                    isBlack: false,
                    rect: KeyRect(
                        left: Double(whiteIndex) * whiteWidth,
                        top: 0,
                        width: whiteWidth,
                        height: whiteHeight
                    )
                )
            )
            whiteIndex += 1
        }
    }
    return keys
}

/// Width of the keybed from the left edge of A0 to the right edge of C8.
func keyboardWidth(_ keys: [PianoKey]) -> Double {
    keys.reduce(0) { width, key in
        max(width, key.rect.right)
    }
}

/// Scale whose cropped key height is `visibleHeight`. `visibleRatio` is the fraction of the key that stays on screen.
func scaleForVisibleKeyHeight(_ visibleHeight: Double, visibleRatio: Double) -> Double {
    let full = whiteKeyHeightMm * ipadProPointsPerMillimeter * visibleRatio
    guard full > 0 else { return keyScaleMax }
    return visibleHeight / full
}

/// Scale at which the full keybed is exactly as wide as `viewportWidth`.
func scaleThatFitsKeyboard(_ viewportWidth: Double) -> Double {
    let fullWidth = keyboardWidth(layoutKeyboard(scale: 1))
    if fullWidth == 0 || viewportWidth <= 0 {
        return keyScaleMax
    }
    let scale = viewportWidth / fullWidth
    return scale > keyScaleMax ? keyScaleMax : scale
}

/// Shifts the keybed so its midpoint lines up with the middle of `viewportWidth`.
/// The value is negative when the keyboard is wider than the screen.
func centeredKeyboardOffset(keyboardWidth: Double, viewportWidth: Double) -> Double {
    (viewportWidth - keyboardWidth) / 2
}

/// Where the keybed may sit. `maximum` parks A0, the bottom note, on the left.
/// `minimum` parks C8, the top note, on the right. A keybed that fits in the
/// viewport uses the centered offset for both.
struct KeyboardScrollRange: Equatable {
    var minimum: Double
    var maximum: Double

    func clamped(_ offset: Double) -> Double {
        min(maximum, max(minimum, offset))
    }
}

func keyboardScrollRange(keyboardWidth: Double, viewportWidth: Double) -> KeyboardScrollRange {
    if viewportWidth <= 0 {
        return KeyboardScrollRange(minimum: 0, maximum: 0)
    }
    if keyboardWidth <= viewportWidth {
        let centered = centeredKeyboardOffset(keyboardWidth: keyboardWidth, viewportWidth: viewportWidth)
        return KeyboardScrollRange(minimum: centered, maximum: centered)
    }
    return KeyboardScrollRange(minimum: viewportWidth - keyboardWidth, maximum: 0)
}

func octaveScrollDistance(scale: Double) -> Double {
    whiteKeyWidthMm * scale * ipadProPointsPerMillimeter * 7
}

/// Points per second. A slower release stays where the finger left it.
let keyboardOctaveFlingSpeed: Double = 450

/// Points per second. At this speed and above, the keybed runs to A0 or C8.
let keyboardEndFlingSpeed: Double = 1600

enum KeyboardFling: Equatable {
    case settle
    case octave
    case end
}

func keyboardFling(velocity: Double) -> KeyboardFling {
    let speed = abs(velocity)
    if speed >= keyboardEndFlingSpeed {
        return .end
    }
    if speed >= keyboardOctaveFlingSpeed {
        return .octave
    }
    return .settle
}

/// Positive velocity moves the keybed right, toward A0. Negative moves it left, toward C8.
func keyboardScrollTarget(
    offset: Double,
    velocity: Double,
    range: KeyboardScrollRange,
    octaveDistance: Double
) -> Double {
    let direction = velocity >= 0 ? 1.0 : -1.0
    switch keyboardFling(velocity: velocity) {
    case .settle:
        return range.clamped(offset)
    case .octave:
        return range.clamped(offset + direction * octaveDistance)
    case .end:
        return direction > 0 ? range.maximum : range.minimum
    }
}

/// Resistance past either end. `overscroll` is how far the finger has gone beyond the end.
func keyboardRubberBand(overscroll: Double, viewportWidth: Double) -> Double {
    let dimension = max(viewportWidth, 1)
    let over = max(0, overscroll)
    return dimension * (1 - 1 / (over / dimension + 1)) * 0.45
}

func keyboardOffsetForDrag(
    unbandedOffset: Double,
    range: KeyboardScrollRange,
    viewportWidth: Double
) -> Double {
    if unbandedOffset > range.maximum {
        return range.maximum + keyboardRubberBand(
            overscroll: unbandedOffset - range.maximum,
            viewportWidth: viewportWidth
        )
    }
    if unbandedOffset < range.minimum {
        return range.minimum - keyboardRubberBand(
            overscroll: range.minimum - unbandedOffset,
            viewportWidth: viewportWidth
        )
    }
    return unbandedOffset
}

/// Black keys are tested first so a touch on the overlap plays the black key.
func noteAt(x: Double, y: Double, keys: [PianoKey]) -> Int? {
    for key in keys where key.isBlack && key.rect.contains(x: x, y: y) {
        return key.midiNote
    }
    for key in keys where !key.isBlack && key.rect.contains(x: x, y: y) {
        return key.midiNote
    }
    return nil
}
