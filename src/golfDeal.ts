import { answerMilliseconds, type GameAnswer } from './gameLog'
import { GameRNG } from './gameRng'
import { conventionalStop, landingStop, sitsOnStaff, type SlideStop } from './playingChart'
import { KeySignature, trombonePosition, type ScoreStaff } from './scoreNotation'

export type GolfLevel = {
  columns: number
  ledgerLines: boolean
  clef: ScoreStaff
}

export const GolfLevel = {
  start(clef: ScoreStaff): GolfLevel {
    return { columns: 5, ledgerLines: false, clef }
  },

  eased(level: GolfLevel): GolfLevel {
    if (level.ledgerLines) return { ...level, ledgerLines: false }
    return { ...level, columns: Math.max(3, level.columns - 2) }
  },

  hardened(level: GolfLevel): GolfLevel {
    if (!level.ledgerLines) return { ...level, ledgerLines: true }
    return { ...level, columns: Math.min(7, level.columns + 2) }
  },

  nextLine(level: GolfLevel): string {
    const staff = level.ledgerLines ? 'with ledger lines' : 'on the staff'
    const name = level.clef === 'tenor' ? 'tenor' : 'bass'
    return `Next: ${level.columns} columns in ${name}, ${staff}.`
  },
}

export type GolfCard = {
  id: string
  midi: number
  revealed?: SlideStop
  availableSince: Date
}

export function golfCard(midi: number, availableSince: Date, revealed?: SlideStop): GolfCard {
  return { id: crypto.randomUUID(), midi, revealed, availableSince }
}

type GolfMove = {
  column: number
  card: GolfCard
  uncoveredAvailableSince?: Date
}

export type GolfTake =
  | { kind: 'rejected' }
  | { kind: 'took'; stop: SlideStop; cleared: boolean; answer: GameAnswer }

export class GolfDeal {
  static readonly columnHeight = 3
  /// Spelling for a deal that has no key of its own. Flats match the usual trombone names.
  static readonly spelling = KeySignature.bFlat

  columns: GolfCard[][]
  private waste: GolfCard[]
  clef: ScoreStaff
  ledgerLines: boolean
  private moves: GolfMove[] = []

  private constructor(columns: GolfCard[][], waste: GolfCard[], clef: ScoreStaff, ledgerLines: boolean) {
    this.columns = columns
    this.waste = waste
    this.clef = clef
    this.ledgerLines = ledgerLines
  }

  get wasteCard(): GolfCard | undefined {
    return this.waste[this.waste.length - 1]
  }

  get isCleared(): boolean {
    return this.columns.every((column) => column.length === 0)
  }

  /// Takes, in order, without the opening waste card.
  playedNotes(): number[] {
    return this.waste.slice(1).map((card) => card.midi)
  }

  static deal(level: GolfLevel, seed: number, now: Date): GolfDeal {
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const shifted = seed + attempt * 1_000_003
      const built = GolfDeal.chained(level, shifted, now)
      if (built) return built
    }
    return GolfDeal.forced(level, now)
  }

  /// A neighbor chain long enough that taking column 0, then 1, and so on clears the board.
  private static chained(level: GolfLevel, seed: number, now: Date): GolfDeal | null {
    const rng = new GameRNG(seed)
    let pool = GolfDeal.notePool(level)
    if (pool.length === 0) pool = notesWithStops(28, 84)
    const needed = level.columns * GolfDeal.columnHeight
    const chain = [pool[rng.int(pool.length)]]
    let wasteStop = conventionalStop(chain[0]) ?? { number: 1, short: false }
    let spins = 0
    const wide = notesWithStops(28, 84)
    while (chain.length < needed + 1 && spins < 4000) {
      spins += 1
      const source = pool.some((midi) => landingStop(midi, wasteStop) !== null) ? pool : wide
      const options = source.filter((midi) => landingStop(midi, wasteStop) !== null)
      if (options.length === 0) break
      const midi = options[rng.int(options.length)]
      const printed = landingStop(midi, wasteStop)
      if (!printed) break
      chain.push(midi)
      wasteStop = printed
    }
    const takes = chain.slice(1)
    if (takes.length < needed) return null
    return GolfDeal.laidOut(takes.slice(0, needed), chain[0], level, now)
  }

  /// Positions 1, 2, and 3, walked so each card neighbors the one before it.
  private static forced(level: GolfLevel, now: Date): GolfDeal {
    const homes = new Map<number, number>()
    const absorb = (low: number, high: number, onStaff: boolean) => {
      for (let midi = low; midi <= high; midi += 1) {
        const position = trombonePosition(midi)
        if (position === null || homes.has(position)) continue
        if (onStaff && !sitsOnStaff(midi, level.clef, GolfDeal.spelling)) continue
        homes.set(position, midi)
      }
    }
    absorb(40, 77, !level.ledgerLines)
    absorb(28, 84, false)
    const walk = [1, 2, 3, 2]
    const needed = level.columns * GolfDeal.columnHeight
    const sequence: number[] = []
    let cursor = 0
    while (sequence.length < needed + 1) {
      const position = walk[cursor % walk.length]
      cursor += 1
      sequence.push(homes.get(position) ?? homes.get(1) ?? firstValue(homes) ?? 46)
    }
    return GolfDeal.laidOut(sequence.slice(1, 1 + needed), sequence[0], level, now)
  }

  private static laidOut(takes: number[], wasteMidi: number, level: GolfLevel, now: Date): GolfDeal {
    const columns: GolfCard[][] = []
    for (let index = 0; index < level.columns; index += 1) {
      const slice = takes.slice(index * GolfDeal.columnHeight, (index + 1) * GolfDeal.columnHeight)
      columns.push(slice.map((midi) => golfCard(midi, now)))
    }
    const waste = golfCard(wasteMidi, now, conventionalStop(wasteMidi) ?? undefined)
    return new GolfDeal(columns, [waste], level.clef, level.ledgerLines)
  }

  bottom(column: number): GolfCard | undefined {
    if (column < 0 || column >= this.columns.length) return undefined
    return this.columns[column][0]
  }

  take(column: number, now: Date): GolfTake {
    const card = this.bottom(column)
    const wasteStop = this.wasteCard?.revealed
    if (!card || !wasteStop) return { kind: 'rejected' }
    const landing = landingStop(card.midi, wasteStop)
    if (!landing) return { kind: 'rejected' }
    const taken: GolfCard = { ...card, revealed: landing }
    this.columns[column].shift()
    let uncovered: Date | undefined
    const next = this.columns[column][0]
    if (next) {
      uncovered = next.availableSince
      next.availableSince = now
    }
    this.waste.push(taken)
    this.moves.push({ column, card, uncoveredAvailableSince: uncovered })
    const answer: GameAnswer = {
      game: 'golf',
      clef: this.clef === 'tenor' ? 'tenor' : 'bass',
      ledgerLines: this.ledgerLines,
      note: card.midi,
      action: 'filled',
      milliseconds: answerMilliseconds(card.availableSince, now),
    }
    return { kind: 'took', stop: landing, cleared: this.isCleared, answer }
  }

  peek(column: number, now: Date): GameAnswer | null {
    const card = this.bottom(column)
    if (!card || card.revealed) return null
    const stop = conventionalStop(card.midi)
    if (!stop) return null
    card.revealed = stop
    return {
      game: 'golf',
      clef: this.clef === 'tenor' ? 'tenor' : 'bass',
      ledgerLines: this.ledgerLines,
      note: card.midi,
      action: 'peeked',
      milliseconds: answerMilliseconds(card.availableSince, now),
    }
  }

  undo(): boolean {
    const move = this.moves.pop()
    if (!move || this.waste.length === 0) return false
    this.waste.pop()
    const uncovered = this.columns[move.column][0]
    if (uncovered && move.uncoveredAvailableSince) uncovered.availableSince = move.uncoveredAvailableSince
    this.columns[move.column].unshift(move.card)
    return true
  }

  private static notePool(level: GolfLevel): number[] {
    const pool: number[] = []
    for (let midi = 40; midi <= 77; midi += 1) {
      if (!conventionalStop(midi)) continue
      if (!level.ledgerLines && !sitsOnStaff(midi, level.clef, GolfDeal.spelling)) continue
      pool.push(midi)
    }
    return pool
  }
}

function notesWithStops(low: number, high: number): number[] {
  const notes: number[] = []
  for (let midi = low; midi <= high; midi += 1) {
    if (conventionalStop(midi)) notes.push(midi)
  }
  return notes
}

function firstValue(homes: Map<number, number>): number | undefined {
  return homes.values().next().value
}
