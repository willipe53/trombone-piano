import Foundation

struct ScaleLevel: Equatable {
    var blanks: Int
    var accidentals: Int
    var ledgerLines: Bool
    var key: KeySignature

    static func start(key: KeySignature) -> ScaleLevel {
        let major = gameStartingMajor(from: key)
        return ScaleLevel(
            blanks: 2,
            accidentals: abs(major.accidentals),
            ledgerLines: false,
            key: major
        )
    }

    func eased() -> ScaleLevel {
        var copy = self
        if ledgerLines {
            copy.ledgerLines = false
        } else if accidentals > 0 {
            copy.accidentals -= 1
            copy.key = scaleKey(width: copy.accidentals, like: key)
        } else if blanks > 1 {
            copy.blanks -= 1
        }
        return copy
    }

    func hardened() -> ScaleLevel {
        var copy = self
        if blanks < 3 {
            copy.blanks += 1
        } else if accidentals < 7 {
            copy.accidentals += 1
            copy.key = scaleKey(width: copy.accidentals, like: key)
        } else {
            copy.ledgerLines = true
        }
        return copy
    }

    /// Another major of the same width. C stays C; the missing notes still change with the seed.
    func stepped() -> ScaleLevel {
        var copy = self
        let keys = majorKeys(width: accidentals)
        guard let index = keys.firstIndex(where: { $0.id == key.id }) else {
            copy.key = keys.first ?? key
            return copy
        }
        copy.key = keys[(index + 1) % keys.count]
        return copy
    }

    var nextLine: String {
        let upcoming = stepped()
        let staff = ledgerLines ? "with ledger lines" : "on the staff"
        let missing = blanks == 1 ? "1 note missing" : "\(blanks) notes missing"
        let again = upcoming.key.id == key.id ? "another " : ""
        return "Next: \(again)\(upcoming.key.id) major, \(missing), \(staff)."
    }
}

struct ScaleInventoryDeal: Equatable {
    static let clef = ScoreStaff.bass

    var key: KeySignature
    var ledgerLines: Bool
    /// Root through the octave, eight notes.
    private(set) var notes: [Int]
    private(set) var missing: Set<Int>
    private var openedAt: Date

    var isCleared: Bool { missing.isEmpty }

    static func deal(level: ScaleLevel, seed: Int, now: Date) -> ScaleInventoryDeal {
        var rng = GameRNG(seed: seed)
        let notes = majorOctave(key: level.key, ledgerLines: level.ledgerLines)
        var degrees = Array(0..<notes.count)
        for index in degrees.indices.reversed() where index > 0 {
            let swap = rng.int(index + 1)
            degrees.swapAt(index, swap)
        }
        let count = min(level.blanks, notes.count)
        return ScaleInventoryDeal(
            key: level.key,
            ledgerLines: level.ledgerLines,
            notes: notes,
            missing: Set(degrees.prefix(count)),
            openedAt: now
        )
    }

    /// Lands when `midi` is the degree that belongs in `slot`. A wrong pitch leaves the deal unchanged.
    mutating func place(midi: Int, at slot: Int, now: Date) -> GameAnswer? {
        guard missing.contains(slot), notes.indices.contains(slot), notes[slot] == midi else { return nil }
        let answer = GameAnswer(
            game: "scaleInventory",
            clef: "bass",
            keyID: key.id,
            ledgerLines: ledgerLines,
            note: midi,
            action: .filled,
            milliseconds: answerMilliseconds(from: openedAt, to: now)
        )
        missing.remove(slot)
        openedAt = now
        return answer
    }
}

func gameStartingMajor(from key: KeySignature) -> KeySignature {
    if key.title.hasSuffix("MAJOR") { return key }
    return KeySignature.catalog.first { $0.accidentals == key.accidentals && $0.title.hasSuffix("MAJOR") } ?? .bFlat
}

func majorKeys(width: Int) -> [KeySignature] {
    if width == 0 { return [.c] }
    let sharp = KeySignature.catalog.first { $0.accidentals == width && $0.title.hasSuffix("MAJOR") }
    let flat = KeySignature.catalog.first { $0.accidentals == -width && $0.title.hasSuffix("MAJOR") }
    return [sharp, flat].compactMap { $0 }
}

func majorTonicPitchClass(_ key: KeySignature) -> Int {
    let sharp = [0, 7, 2, 9, 4, 11, 6, 1]
    let flat = [0, 5, 10, 3, 8, 1, 6, 11]
    if key.accidentals >= 0 {
        return sharp[min(7, key.accidentals)]
    }
    return flat[min(7, -key.accidentals)]
}

func majorOctave(key: KeySignature, ledgerLines: Bool) -> [Int] {
    let pitch = majorTonicPitchClass(key)
    let intervals = [0, 2, 4, 5, 7, 9, 11, 12]
    let octaves = (1...5).map { octave in (octave + 1) * 12 + pitch }
    let scales = octaves.map { root in intervals.map { root + $0 } }
    func offStaff(_ scale: [Int]) -> Int {
        scale.filter { !sitsOnStaff(midi: $0, staff: ScaleInventoryDeal.clef, key: key) }.count
    }
    let closest = scales.min { offStaff($0) < offStaff($1) } ?? scales[0]
    guard ledgerLines else { return closest }
    let wider = scales.filter { offStaff($0) > offStaff(closest) }
    return wider.min { offStaff($0) < offStaff($1) } ?? closest
}

private func scaleKey(width: Int, like current: KeySignature) -> KeySignature {
    if width == 0 { return .c }
    let signed = current.accidentals < 0 ? -width : width
    if let match = KeySignature.catalog.first(where: { $0.accidentals == signed && $0.title.hasSuffix("MAJOR") }) {
        return match
    }
    return majorKeys(width: width).first ?? .c
}
