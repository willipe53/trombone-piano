import Foundation

enum GameLogAction: String, Codable, Equatable {
    case filled
    case peeked
}

struct GameLogEntry: Codable, Equatable {
    var id: UUID
    var at: Date
    var game: String
    var clef: String?
    var keyID: String?
    var ledgerLines: Bool
    var note: Int?
    var action: GameLogAction
    var milliseconds: Int
}

/// Append-only record of answers. The play screen does not read it back.
struct GameLog {
    let fileURL: URL

    init(directory: URL) {
        fileURL = directory.appendingPathComponent("game-log.jsonl")
    }

    static func store() -> GameLog {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        let directory = base.appendingPathComponent("TrombonePiano", isDirectory: true)
        return GameLog(directory: directory)
    }

    func append(_ entry: GameLogEntry) throws {
        let directory = fileURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .millisecondsSince1970
        var line = try encoder.encode(entry)
        line.append(0x0A)
        if FileManager.default.fileExists(atPath: fileURL.path) {
            let handle = try FileHandle(forWritingTo: fileURL)
            defer { try? handle.close() }
            try handle.seekToEnd()
            try handle.write(contentsOf: line)
        } else {
            try line.write(to: fileURL)
        }
    }

    func load() throws -> [GameLogEntry] {
        guard FileManager.default.fileExists(atPath: fileURL.path) else { return [] }
        let text = try String(contentsOf: fileURL, encoding: .utf8)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .millisecondsSince1970
        return text.split(separator: "\n").compactMap { line in
            guard let data = line.data(using: .utf8) else { return nil }
            return try? decoder.decode(GameLogEntry.self, from: data)
        }
    }
}

struct GameAnswer: Equatable {
    var game: String
    var clef: String?
    var keyID: String?
    var ledgerLines: Bool
    var note: Int
    var action: GameLogAction
    var milliseconds: Int

    func entry(id: UUID = UUID(), at: Date = Date()) -> GameLogEntry {
        GameLogEntry(
            id: id,
            at: at,
            game: game,
            clef: clef,
            keyID: keyID,
            ledgerLines: ledgerLines,
            note: note,
            action: action,
            milliseconds: milliseconds
        )
    }
}

func answerMilliseconds(from start: Date, to end: Date) -> Int {
    max(0, Int((end.timeIntervalSince(start) * 1000).rounded()))
}
