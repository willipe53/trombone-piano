export type GameLogAction = 'filled' | 'peeked'

export type GameLogEntry = {
  id: string
  at: Date
  game: string
  clef?: string
  keyID?: string
  ledgerLines: boolean
  note?: number
  action: GameLogAction
  milliseconds: number
}

type StoredEntry = Omit<GameLogEntry, 'at'> & { at: number }

/// Append-only JSONL. The caller owns the file. Dates are milliseconds since 1970.
export type GameLogStore = {
  appendLine(line: string): void
  readText(): string | null
}

export class GameLog {
  constructor(private readonly store: GameLogStore) {}

  append(entry: GameLogEntry): void {
    this.store.appendLine(`${JSON.stringify(storeEntry(entry))}\n`)
  }

  load(): GameLogEntry[] {
    const text = this.store.readText()
    if (!text) return []
    return text
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => readEntry(JSON.parse(line) as StoredEntry))
  }
}

export type GameAnswer = {
  game: string
  clef?: string
  keyID?: string
  ledgerLines: boolean
  note: number
  action: GameLogAction
  milliseconds: number
}

export function gameAnswerEntry(answer: GameAnswer, id = crypto.randomUUID(), at = new Date()): GameLogEntry {
  return {
    id,
    at,
    game: answer.game,
    clef: answer.clef,
    keyID: answer.keyID,
    ledgerLines: answer.ledgerLines,
    note: answer.note,
    action: answer.action,
    milliseconds: answer.milliseconds,
  }
}

export function answerMilliseconds(start: Date, end: Date): number {
  return Math.max(0, Math.round(end.getTime() - start.getTime()))
}

function storeEntry(entry: GameLogEntry): StoredEntry {
  return { ...entry, at: entry.at.getTime() }
}

function readEntry(stored: StoredEntry): GameLogEntry {
  return { ...stored, at: new Date(stored.at) }
}
