import { answerMilliseconds, type GameAnswer } from './gameLog'
import { GameRNG } from './gameRng'
import { sitsOnStaff } from './playingChart'
import { KeySignature, type KeySignature as Signature } from './scoreNotation'

export type ScaleLevel = {
  blanks: number
  accidentals: number
  ledgerLines: boolean
  key: Signature
}

export const ScaleLevel = {
  start(key: Signature): ScaleLevel {
    const major = gameStartingMajor(key)
    return { blanks: 2, accidentals: Math.abs(major.accidentals), ledgerLines: false, key: major }
  },

  eased(level: ScaleLevel): ScaleLevel {
    if (level.ledgerLines) return { ...level, ledgerLines: false }
    if (level.accidentals > 0) {
      const accidentals = level.accidentals - 1
      return { ...level, accidentals, key: scaleKey(accidentals, level.key) }
    }
    if (level.blanks > 1) return { ...level, blanks: level.blanks - 1 }
    return { ...level }
  },

  hardened(level: ScaleLevel): ScaleLevel {
    if (level.blanks < 3) return { ...level, blanks: level.blanks + 1 }
    if (level.accidentals < 7) {
      const accidentals = level.accidentals + 1
      return { ...level, accidentals, key: scaleKey(accidentals, level.key) }
    }
    return { ...level, ledgerLines: true }
  },

  /// Another major of the same width. C stays C; the missing notes still change with the seed.
  stepped(level: ScaleLevel): ScaleLevel {
    const keys = majorKeys(level.accidentals)
    const index = keys.findIndex((key) => key.id === level.key.id)
    if (index < 0) return { ...level, key: keys[0] ?? level.key }
    return { ...level, key: keys[(index + 1) % keys.length] }
  },

  nextLine(level: ScaleLevel): string {
    const upcoming = ScaleLevel.stepped(level)
    const staff = level.ledgerLines ? 'with ledger lines' : 'on the staff'
    const missing = level.blanks === 1 ? '1 note missing' : `${level.blanks} notes missing`
    const again = upcoming.key.id === level.key.id ? 'another ' : ''
    return `Next: ${again}${upcoming.key.id} major, ${missing}, ${staff}.`
  },
}

export class ScaleInventoryDeal {
  static readonly clef = 'bass' as const

  key: Signature
  ledgerLines: boolean
  /// Root through the octave, eight notes.
  notes: number[]
  missing: Set<number>
  private openedAt: Date

  private constructor(key: Signature, ledgerLines: boolean, notes: number[], missing: Set<number>, openedAt: Date) {
    this.key = key
    this.ledgerLines = ledgerLines
    this.notes = notes
    this.missing = missing
    this.openedAt = openedAt
  }

  get isCleared(): boolean {
    return this.missing.size === 0
  }

  static deal(level: ScaleLevel, seed: number, now: Date): ScaleInventoryDeal {
    const rng = new GameRNG(seed)
    const notes = majorOctave(level.key, level.ledgerLines)
    const degrees = notes.map((_, index) => index)
    for (let index = degrees.length - 1; index > 0; index -= 1) {
      const swap = rng.int(index + 1)
      const held = degrees[index]
      degrees[index] = degrees[swap]
      degrees[swap] = held
    }
    const count = Math.min(level.blanks, notes.length)
    return new ScaleInventoryDeal(level.key, level.ledgerLines, notes, new Set(degrees.slice(0, count)), now)
  }

  /// Lands when `midi` is the degree that belongs in `slot`. A wrong pitch leaves the deal unchanged.
  place(midi: number, slot: number, now: Date): GameAnswer | null {
    if (!this.missing.has(slot) || slot < 0 || slot >= this.notes.length || this.notes[slot] !== midi) return null
    const answer: GameAnswer = {
      game: 'scaleInventory',
      clef: 'bass',
      keyID: this.key.id,
      ledgerLines: this.ledgerLines,
      note: midi,
      action: 'filled',
      milliseconds: answerMilliseconds(this.openedAt, now),
    }
    this.missing.delete(slot)
    this.openedAt = now
    return answer
  }
}

export function gameStartingMajor(key: Signature): Signature {
  if (key.title.endsWith('MAJOR')) return key
  return KeySignature.catalog.find((item) => item.accidentals === key.accidentals && item.title.endsWith('MAJOR'))
    ?? KeySignature.bFlat
}

export function majorKeys(width: number): Signature[] {
  if (width === 0) return [KeySignature.c]
  const sharp = KeySignature.catalog.find((key) => key.accidentals === width && key.title.endsWith('MAJOR'))
  const flat = KeySignature.catalog.find((key) => key.accidentals === -width && key.title.endsWith('MAJOR'))
  return [sharp, flat].filter((key): key is Signature => key !== undefined)
}

export function majorTonicPitchClass(key: Signature): number {
  const sharp = [0, 7, 2, 9, 4, 11, 6, 1]
  const flat = [0, 5, 10, 3, 8, 1, 6, 11]
  if (key.accidentals >= 0) return sharp[Math.min(7, key.accidentals)]
  return flat[Math.min(7, -key.accidentals)]
}

export function majorOctave(key: Signature, ledgerLines: boolean): number[] {
  const pitch = majorTonicPitchClass(key)
  const intervals = [0, 2, 4, 5, 7, 9, 11, 12]
  const scales = [1, 2, 3, 4, 5].map((octave) => {
    const root = (octave + 1) * 12 + pitch
    return intervals.map((interval) => root + interval)
  })
  const offStaff = (scale: number[]) =>
    scale.filter((midi) => !sitsOnStaff(midi, ScaleInventoryDeal.clef, key)).length
  let closest = scales[0]
  for (const scale of scales.slice(1)) {
    if (offStaff(scale) < offStaff(closest)) closest = scale
  }
  if (!ledgerLines) return closest
  const wider = scales.filter((scale) => offStaff(scale) > offStaff(closest))
  let chosen = wider[0] ?? closest
  for (const scale of wider.slice(1)) {
    if (offStaff(scale) < offStaff(chosen)) chosen = scale
  }
  return chosen
}

function scaleKey(width: number, current: Signature): Signature {
  if (width === 0) return KeySignature.c
  const signed = current.accidentals < 0 ? -width : width
  const match = KeySignature.catalog.find((key) => key.accidentals === signed && key.title.endsWith('MAJOR'))
  return match ?? majorKeys(width)[0] ?? KeySignature.c
}
