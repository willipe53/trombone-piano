import Foundation

struct GolfLevel: Equatable {
    var columns: Int
    var ledgerLines: Bool
    var clef: ScoreStaff

    static func start(clef: ScoreStaff) -> GolfLevel {
        GolfLevel(columns: 5, ledgerLines: false, clef: clef)
    }

    func eased() -> GolfLevel {
        var copy = self
        if ledgerLines {
            copy.ledgerLines = false
        } else {
            copy.columns = max(3, columns - 2)
        }
        return copy
    }

    func hardened() -> GolfLevel {
        var copy = self
        if !ledgerLines {
            copy.ledgerLines = true
        } else {
            copy.columns = min(7, columns + 2)
        }
        return copy
    }

    var nextLine: String {
        let staff = ledgerLines ? "with ledger lines" : "on the staff"
        let name = clef == .tenor ? "tenor" : "bass"
        return "Next: \(columns) columns in \(name), \(staff)."
    }
}

struct GolfCard: Equatable {
    var id: UUID
    var midi: Int
    var revealed: SlideStop?
    var availableSince: Date

    init(id: UUID = UUID(), midi: Int, revealed: SlideStop? = nil, availableSince: Date) {
        self.id = id
        self.midi = midi
        self.revealed = revealed
        self.availableSince = availableSince
    }
}

struct GolfDeal: Equatable {
    static let columnHeight = 3
    /// Spelling for a deal that has no key of its own. Flats match the usual trombone names.
    static let spelling = KeySignature.bFlat

    private(set) var columns: [[GolfCard]]
    private(set) var waste: [GolfCard]
    var clef: ScoreStaff
    var ledgerLines: Bool
    private var moves: [GolfMove] = []

    var wasteCard: GolfCard? { waste.last }
    var isCleared: Bool { columns.allSatisfy(\.isEmpty) }

    static func deal(level: GolfLevel, seed: Int, now: Date) -> GolfDeal {
        for attempt in 0..<16 {
            let shifted = seed &+ attempt &* 1_000_003
            if let built = chained(level: level, seed: shifted, now: now) {
                return built
            }
        }
        return forced(level: level, now: now)
    }

    /// A neighbor chain long enough that taking column 0, then 1, and so on clears the board.
    private static func chained(level: GolfLevel, seed: Int, now: Date) -> GolfDeal? {
        var rng = GameRNG(seed: seed)
        var pool = notePool(level: level)
        if pool.isEmpty {
            pool = (28...84).filter { conventionalStop(midi: $0) != nil }
        }
        let needed = level.columns * columnHeight
        var chain = [pool[rng.int(pool.count)]]
        var wasteStop = conventionalStop(midi: chain[0]) ?? SlideStop(number: 1, short: false)
        var spins = 0
        let wide = (28...84).filter { conventionalStop(midi: $0) != nil }
        while chain.count < needed + 1 && spins < 4000 {
            spins += 1
            let options = (pool.contains { landingStop(midi: $0, beside: wasteStop) != nil } ? pool : wide)
                .filter { landingStop(midi: $0, beside: wasteStop) != nil }
            guard !options.isEmpty else { break }
            let midi = options[rng.int(options.count)]
            guard let printed = landingStop(midi: midi, beside: wasteStop) else { break }
            chain.append(midi)
            wasteStop = printed
        }
        let takes = Array(chain.dropFirst())
        guard takes.count >= needed else { return nil }
        return laidOut(takes: Array(takes.prefix(needed)), wasteMidi: chain[0], level: level, now: now)
    }

    /// Positions 1, 2, and 3, walked so each card neighbors the one before it.
    private static func forced(level: GolfLevel, now: Date) -> GolfDeal {
        var homes: [Int: Int] = [:]
        func absorb(_ midis: ClosedRange<Int>, onStaff: Bool) {
            for midi in midis {
                guard let position = trombonePosition(midi: midi), homes[position] == nil else { continue }
                if onStaff && !sitsOnStaff(midi: midi, staff: level.clef, key: spelling) { continue }
                homes[position] = midi
            }
        }
        absorb(40...77, onStaff: !level.ledgerLines)
        absorb(28...84, onStaff: false)
        let walk = [1, 2, 3, 2]
        let needed = level.columns * columnHeight
        var sequence: [Int] = []
        var cursor = 0
        while sequence.count < needed + 1 {
            let position = walk[cursor % walk.count]
            cursor += 1
            sequence.append(homes[position] ?? homes[1] ?? homes.values.first ?? 46)
        }
        let takes = Array(sequence.dropFirst().prefix(needed))
        return laidOut(takes: takes, wasteMidi: sequence[0], level: level, now: now)
    }

    private static func laidOut(takes: [Int], wasteMidi: Int, level: GolfLevel, now: Date) -> GolfDeal {
        var columns: [[GolfCard]] = []
        for index in 0..<level.columns {
            let slice = takes[(index * columnHeight)..<((index + 1) * columnHeight)]
            columns.append(slice.map { GolfCard(midi: $0, availableSince: now) })
        }
        var waste = GolfCard(midi: wasteMidi, availableSince: now)
        waste.revealed = conventionalStop(midi: wasteMidi)
        return GolfDeal(
            columns: columns,
            waste: [waste],
            clef: level.clef,
            ledgerLines: level.ledgerLines
        )
    }

    func bottom(_ column: Int) -> GolfCard? {
        guard columns.indices.contains(column) else { return nil }
        return columns[column].first
    }

    enum Take: Equatable {
        case rejected
        case took(stop: SlideStop, cleared: Bool, answer: GameAnswer)
    }

    mutating func take(column: Int, at now: Date) -> Take {
        guard let card = bottom(column), let wasteStop = wasteCard?.revealed else { return .rejected }
        guard let landing = landingStop(midi: card.midi, beside: wasteStop) else { return .rejected }
        var taken = card
        taken.revealed = landing
        columns[column].removeFirst()
        var uncovered: Date?
        if var next = columns[column].first {
            uncovered = next.availableSince
            next.availableSince = now
            columns[column][0] = next
        }
        waste.append(taken)
        moves.append(GolfMove(column: column, card: card, uncoveredAvailableSince: uncovered))
        let answer = GameAnswer(
            game: "golf",
            clef: clef == .tenor ? "tenor" : "bass",
            keyID: nil,
            ledgerLines: ledgerLines,
            note: card.midi,
            action: .filled,
            milliseconds: answerMilliseconds(from: card.availableSince, to: now)
        )
        return .took(stop: landing, cleared: isCleared, answer: answer)
    }

    mutating func peek(column: Int, at now: Date) -> GameAnswer? {
        guard var card = bottom(column), card.revealed == nil else { return nil }
        guard let stop = conventionalStop(midi: card.midi) else { return nil }
        card.revealed = stop
        columns[column][0] = card
        return GameAnswer(
            game: "golf",
            clef: clef == .tenor ? "tenor" : "bass",
            keyID: nil,
            ledgerLines: ledgerLines,
            note: card.midi,
            action: .peeked,
            milliseconds: answerMilliseconds(from: card.availableSince, to: now)
        )
    }

    @discardableResult
    mutating func undo() -> Bool {
        guard let move = moves.popLast(), !waste.isEmpty else { return false }
        waste.removeLast()
        if columns[move.column].indices.contains(0), let since = move.uncoveredAvailableSince {
            columns[move.column][0].availableSince = since
        }
        columns[move.column].insert(move.card, at: 0)
        return true
    }

    private static func notePool(level: GolfLevel) -> [Int] {
        (40...77).filter { midi in
            guard conventionalStop(midi: midi) != nil else { return false }
            return level.ledgerLines || sitsOnStaff(midi: midi, staff: level.clef, key: spelling)
        }
    }
}

private struct GolfMove: Equatable {
    var column: Int
    var card: GolfCard
    var uncoveredAvailableSince: Date?
}
