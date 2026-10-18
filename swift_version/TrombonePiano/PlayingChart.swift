import Foundation

/// A numbered slide stop. `#2` is the short 2nd, between 1st and 2nd, and it shares 2's neighbors.
struct SlideStop: Equatable, Codable {
    var number: Int
    var short: Bool

    var label: String {
        short ? "#\(number)" : "\(number)"
    }
}

/// One stop either way. `#2` sits in the 2 slot, so it is next to 1 and 3, and not next to a true 2.
func slideStopsAreNeighbors(_ a: SlideStop, _ b: SlideStop) -> Bool {
    abs(a.number - b.number) == 1
}

/// Home stop from `trombonePosition`, plus the short 7th-partial stop.
/// G4 is `#2`, and 4 remains legal. The same partial continues a semitone longer per position through D4 at short 7th.
/// Ab4 in 1st is the lip and is not a stop. Trigger rows wait.
func playingStops(midi: Int) -> [SlideStop] {
    var stops: [SlideStop] = []
    if let home = trombonePosition(midi: midi) {
        stops.append(SlideStop(number: home, short: false))
    }
    if let short = shortSeventhStop(midi: midi), !stops.contains(short) {
        stops.append(short)
    }
    return stops
}

/// The stop a waste note shows, and the one a peek prints.
/// G4's usual place is `#2`. Every other note shows its home stop.
func conventionalStop(midi: Int) -> SlideStop? {
    let stops = playingStops(midi: midi)
    if midi == 67, let short = stops.first(where: \.short) {
        return short
    }
    if let home = trombonePosition(midi: midi) {
        return SlideStop(number: home, short: false)
    }
    return stops.first
}

/// The stop printed when a note is taken beside `waste`. Nil when none of its stops are one away.
/// If more than one stop neighbors the waste, the conventional stop wins when it is one of them.
func landingStop(midi: Int, beside waste: SlideStop) -> SlideStop? {
    let neighbors = playingStops(midi: midi).filter { slideStopsAreNeighbors($0, waste) }
    guard !neighbors.isEmpty else { return nil }
    if let conventional = conventionalStop(midi: midi), neighbors.contains(conventional) {
        return conventional
    }
    return neighbors.min { lhs, rhs in
        abs(lhs.number - waste.number) < abs(rhs.number - waste.number)
    }
}

/// Five-line range, inclusive. A step outside it is a ledger note.
func staffStepRange(_ staff: ScoreStaff) -> ClosedRange<Int> {
    switch staff {
    case .bass: return -10 ... -2
    case .tenor: return -6 ... 2
    case .treble: return 2 ... 10
    }
}

func sitsOnStaff(midi: Int, staff: ScoreStaff, key: KeySignature) -> Bool {
    let step = writtenNote(midi: midi, instrument: .trombone, key: key).step
    return staffStepRange(staff).contains(step)
}

/// G4 is MIDI 67. Short 2nd, then one semitone and one position number per stop, through D4 at short 7th.
private func shortSeventhStop(midi: Int) -> SlideStop? {
    let number = 2 + (67 - midi)
    guard (2...7).contains(number) else { return nil }
    return SlideStop(number: number, short: true)
}
