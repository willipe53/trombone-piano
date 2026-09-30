import Foundation

enum ScoreStaff: Equatable {
    case treble
    case tenor
    case bass
}

enum ScoreAccidental: Equatable {
    case sharp
    case flat
    case natural
}

struct KeySignature: Equatable {
    var id: String
    var title: String
    /// Positive is sharps, negative is flats, in the usual order.
    var accidentals: Int

    static let c = KeySignature(id: "C", title: "C MAJOR", accidentals: 0)
    static let g = KeySignature(id: "G", title: "G MAJOR", accidentals: 1)
    static let d = KeySignature(id: "D", title: "D MAJOR", accidentals: 2)
    static let a = KeySignature(id: "A", title: "A MAJOR", accidentals: 3)
    static let e = KeySignature(id: "E", title: "E MAJOR", accidentals: 4)
    static let b = KeySignature(id: "B", title: "B MAJOR", accidentals: 5)
    static let fSharp = KeySignature(id: "F#", title: "F# MAJOR", accidentals: 6)
    static let cSharp = KeySignature(id: "C#", title: "C# MAJOR", accidentals: 7)
    static let f = KeySignature(id: "F", title: "F MAJOR", accidentals: -1)
    static let bFlat = KeySignature(id: "Bb", title: "Bb MAJOR", accidentals: -2)
    static let eFlat = KeySignature(id: "Eb", title: "Eb MAJOR", accidentals: -3)
    static let aFlat = KeySignature(id: "Ab", title: "Ab MAJOR", accidentals: -4)
    static let dFlat = KeySignature(id: "Db", title: "Db MAJOR", accidentals: -5)
    static let gFlat = KeySignature(id: "Gb", title: "Gb MAJOR", accidentals: -6)
    static let cFlat = KeySignature(id: "Cb", title: "Cb MAJOR", accidentals: -7)

    static let aMinor = KeySignature(id: "Am", title: "A MINOR", accidentals: 0)
    static let eMinor = KeySignature(id: "Em", title: "E MINOR", accidentals: 1)
    static let bMinor = KeySignature(id: "Bm", title: "B MINOR", accidentals: 2)
    static let fSharpMinor = KeySignature(id: "F#m", title: "F# MINOR", accidentals: 3)
    static let cSharpMinor = KeySignature(id: "C#m", title: "C# MINOR", accidentals: 4)
    static let gSharpMinor = KeySignature(id: "G#m", title: "G# MINOR", accidentals: 5)
    static let dSharpMinor = KeySignature(id: "D#m", title: "D# MINOR", accidentals: 6)
    static let aSharpMinor = KeySignature(id: "A#m", title: "A# MINOR", accidentals: 7)
    static let dMinor = KeySignature(id: "Dm", title: "D MINOR", accidentals: -1)
    static let gMinor = KeySignature(id: "Gm", title: "G MINOR", accidentals: -2)
    static let cMinor = KeySignature(id: "Cm", title: "C MINOR", accidentals: -3)
    static let fMinor = KeySignature(id: "Fm", title: "F MINOR", accidentals: -4)
    static let bFlatMinor = KeySignature(id: "Bbm", title: "Bb MINOR", accidentals: -5)
    static let eFlatMinor = KeySignature(id: "Ebm", title: "Eb MINOR", accidentals: -6)
    static let aFlatMinor = KeySignature(id: "Abm", title: "Ab MINOR", accidentals: -7)

    /// No signature first, then sharps, then flats. Each major is followed by its relative minor.
    static let catalog: [KeySignature] = [
        c, aMinor,
        g, eMinor,
        d, bMinor,
        a, fSharpMinor,
        e, cSharpMinor,
        b, gSharpMinor,
        fSharp, dSharpMinor,
        cSharp, aSharpMinor,
        f, dMinor,
        bFlat, gMinor,
        eFlat, cMinor,
        aFlat, fMinor,
        dFlat, bFlatMinor,
        gFlat, eFlatMinor,
        cFlat, aFlatMinor,
    ]

    static func matching(_ id: String) -> KeySignature? {
        catalog.first { $0.id == id }
    }
}

/// Pitch classes that belong to the key. Relative minor shares the major's set.
func pitchClasses(in key: KeySignature) -> Set<Int> {
    var classes: Set<Int> = [0, 2, 4, 5, 7, 9, 11]
    if key.accidentals > 0 {
        let raised = [5, 0, 7, 2, 9, 4, 11]
        for pitch in raised.prefix(min(7, key.accidentals)) {
            classes.remove(pitch)
            classes.insert((pitch + 1) % 12)
        }
    } else if key.accidentals < 0 {
        let lowered = [11, 4, 9, 2, 7, 0, 5]
        for pitch in lowered.prefix(min(7, -key.accidentals)) {
            classes.remove(pitch)
            classes.insert((pitch + 11) % 12)
        }
    }
    return classes
}

func noteIsInKey(midi: Int, key: KeySignature) -> Bool {
    pitchClasses(in: key).contains(midi % 12)
}

/// First-position harmonics of a straight tenor trombone that sit within 15 cents of equal temperament.
/// The flat 7th partial is left out, so Ab4 is not position 1.
private let inTuneTrombonePartials: Set<Int> = {
    var notes = Set<Int>()
    let fundamental = 34
    for partial in 1...64 {
        let cents = 1200 * log2(Double(partial))
        let semitones = (cents / 100).rounded()
        if abs(cents - semitones * 100) <= 15 {
            notes.insert(fundamental + Int(semitones))
        }
    }
    return notes
}()

/// Shortest slide position, 1 through 7, for a straight tenor trombone. Nil when the note needs an F attachment or sits past the slide.
func trombonePosition(midi: Int) -> Int? {
    for position in 1...7 {
        if inTuneTrombonePartials.contains(midi + position - 1) {
            return position
        }
    }
    return nil
}

/// B1, C2, C♯2, D2, and E♭2. A straight tenor slide cannot reach them.
func tromboneNeedsFAttachment(midi: Int) -> Bool {
    (35...39).contains(midi)
}

/// Red line drawn over the horn when the slide has no position for this note.
func tromboneHornMessage(midi: Int) -> String? {
    if tromboneNeedsFAttachment(midi: midi) {
        return "requires F attachment"
    }
    if trombonePosition(midi: midi) != nil {
        return nil
    }
    if midi < 28 {
        return "Ok now you're scaring me"
    }
    return "Play it anywhere you like!"
}

/// Slide travel at the full 1498-point drawing. First position is the resting drawing.
private let tromboneSlideTravel = [0.0, 172.0, 244.0, 330.0, 459.0, 660.0, 804.0]

func tromboneOuterShift(position: Int, displayedWidth: Double, fullWidth: Double = 1498) -> Double {
    guard fullWidth > 0, (1...7).contains(position) else { return 0 }
    return tromboneSlideTravel[position - 1] * displayedWidth / fullWidth
}

/// The slide tubes in the drawing fall 9 pixels over the 795 pixels from x=627 to the water key at x=1422.
let tromboneSlideSlope = 9.0 / 795.0

func tromboneOuterDrop(horizontal: Double) -> Double {
    horizontal * tromboneSlideSlope
}

struct SignatureMark: Equatable {
    var step: Int
    var accidental: ScoreAccidental
}

struct WrittenNote: Equatable {
    var staff: ScoreStaff
    var step: Int
    var accidental: ScoreAccidental?
}

private enum LetterAlteration {
    case natural
    case sharp
    case flat
}

/// C, D, E, F, G, A, B.
private let sharpLetterOrder = [3, 0, 4, 1, 5, 2, 6]
private let flatLetterOrder = [6, 2, 5, 1, 4, 0, 3]

private let trebleSharpSteps = [10, 7, 11, 8, 5, 9, 6]
private let trebleFlatSteps = [6, 9, 5, 8, 4, 7, 3]
private let bassSharpSteps = [-4, -7, -3, -6, -9, -5, -8]
private let bassFlatSteps = [-8, -5, -9, -6, -10, -7, -11]
/// Tenor clef, middle C on the fourth line. The first and third sharps sit an octave lower than the treble pattern so the signature stays on the staff.
private let tenorSharpSteps = [-4, 0, -3, 1, -2, 2, -1]
private let tenorFlatSteps = [-1, 2, -2, 1, -3, 0, -4]

func signatureMarks(key: KeySignature, staff: ScoreStaff) -> [SignatureMark] {
    let count = min(7, abs(key.accidentals))
    guard count > 0 else { return [] }
    let steps: [Int]
    if key.accidentals > 0 {
        switch staff {
        case .treble: steps = trebleSharpSteps
        case .tenor: steps = tenorSharpSteps
        case .bass: steps = bassSharpSteps
        }
    } else {
        switch staff {
        case .treble: steps = trebleFlatSteps
        case .tenor: steps = tenorFlatSteps
        case .bass: steps = bassFlatSteps
        }
    }
    let accidental: ScoreAccidental = key.accidentals > 0 ? .sharp : .flat
    return (0..<count).map { SignatureMark(step: steps[$0], accidental: accidental) }
}

func writtenNote(midi: Int, instrument: KeyboardInstrument, key: KeySignature) -> WrittenNote {
    writtenNotes(midi: midi, instrument: instrument, key: key)[0]
}

/// Trombone writes each pitch on both staves. A copy is drawn only while it stays on its own side of the gap. Past that, its ledger lines run through the other staff and on out the far side.
func noteBelongsOnDrawnStaff(_ staff: ScoreStaff, step: Int, gapSpaces: CGFloat = 15) -> Bool {
    let upperBottom: CGFloat = 8
    let lowerTop = (4 + gapSpaces) * 2
    let midpoint = (upperBottom + lowerTop) / 2
    let halfSteps: CGFloat
    switch staff {
    case .treble:
        halfSteps = CGFloat(10 - step)
    case .tenor:
        halfSteps = CGFloat(2 - step)
    case .bass:
        halfSteps = lowerTop + CGFloat(-2 - step)
    }
    return staff == .bass ? halfSteps >= midpoint : halfSteps <= midpoint
}

/// Piano keeps one staff. Trombone writes the same pitch on the bass staff and the tenor staff.
func writtenNotes(midi: Int, instrument: KeyboardInstrument, key: KeySignature) -> [WrittenNote] {
    let spelled = preferredSpell(midi: midi, preferFlats: key.accidentals < 0)
    let signature = signatureAlteration(letter: spelled.letter, key: key)
    let step = (spelled.octave - 4) * 7 + spelled.letter
    let accidental = drawnAccidental(spelled: spelled.alteration, signature: signature)
    let staves: [ScoreStaff] = instrument == .trombone
        ? [.bass, .tenor]
        : [midi < 60 ? .bass : .treble]
    return staves.map { WrittenNote(staff: $0, step: step, accidental: accidental) }
}

struct ScoreColumn: Equatable {
    var notes: [ScoreEvent]
}

struct ScoreEvent: Equatable {
    var midi: Int
    var sounding: Bool
}

struct ScoreHistory: Equatable {
    static let columnLimit = 10
    var columns: [ScoreColumn] = []

    /// How many columns were dropped from the left.
    @discardableResult
    mutating func apply(started: [Int], stopped: [Int]) -> Int {
        for midi in stopped {
            for columnIndex in columns.indices.reversed() {
                if let noteIndex = columns[columnIndex].notes.lastIndex(where: { $0.midi == midi && $0.sounding }) {
                    columns[columnIndex].notes[noteIndex].sounding = false
                    break
                }
            }
        }
        guard !started.isEmpty else { return 0 }
        columns.append(ScoreColumn(notes: started.map { ScoreEvent(midi: $0, sounding: true) }))
        let overflow = max(0, columns.count - Self.columnLimit)
        if overflow > 0 {
            columns.removeFirst(overflow)
        }
        return overflow
    }

    mutating func clear() {
        columns.removeAll()
    }
}

private struct PreferredSpell {
    var letter: Int
    var octave: Int
    var alteration: LetterAlteration
}

private func preferredSpell(midi: Int, preferFlats: Bool) -> PreferredSpell {
    let pitchClass = midi % 12
    let octave = (midi / 12) - 1
    let sharpSpell: [(Int, LetterAlteration)] = [
        (0, .natural), (0, .sharp), (1, .natural), (1, .sharp),
        (2, .natural), (3, .natural), (3, .sharp), (4, .natural),
        (4, .sharp), (5, .natural), (5, .sharp), (6, .natural),
    ]
    let flatSpell: [(Int, LetterAlteration)] = [
        (0, .natural), (1, .flat), (1, .natural), (2, .flat),
        (2, .natural), (3, .natural), (4, .flat), (4, .natural),
        (5, .flat), (5, .natural), (6, .flat), (6, .natural),
    ]
    let choice = (preferFlats ? flatSpell : sharpSpell)[pitchClass]
    return PreferredSpell(letter: choice.0, octave: octave, alteration: choice.1)
}

private func signatureAlteration(letter: Int, key: KeySignature) -> LetterAlteration {
    if key.accidentals > 0 {
        let count = min(7, key.accidentals)
        if sharpLetterOrder.prefix(count).contains(letter) {
            return .sharp
        }
    } else if key.accidentals < 0 {
        let count = min(7, -key.accidentals)
        if flatLetterOrder.prefix(count).contains(letter) {
            return .flat
        }
    }
    return .natural
}

private func drawnAccidental(spelled: LetterAlteration, signature: LetterAlteration) -> ScoreAccidental? {
    guard spelled != signature else { return nil }
    switch spelled {
    case .sharp: return .sharp
    case .flat: return .flat
    case .natural: return .natural
    }
}
