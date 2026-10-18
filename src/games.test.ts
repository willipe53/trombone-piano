import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GameLog, type GameLogEntry, type GameLogStore } from './gameLog'
import { GolfDeal, GolfLevel } from './golfDeal'
import { conventionalStop, landingStop, playingStops, slideStopLabel, slideStopsAreNeighbors } from './playingChart'
import { KeySignature } from './scoreNotation'
import { ScaleInventoryDeal, ScaleLevel } from './scaleInventory'

const sharpSecond = { number: 2, short: true }

describe('playing chart', () => {
  it('treats a short second as a neighbor of first and third', () => {
    expect(slideStopsAreNeighbors(sharpSecond, { number: 1, short: false })).toBe(true)
    expect(slideStopsAreNeighbors(sharpSecond, { number: 3, short: false })).toBe(true)
    expect(slideStopsAreNeighbors(sharpSecond, { number: 2, short: false })).toBe(false)
    expect(slideStopLabel(sharpSecond)).toBe('#2')
  })

  it('accepts sharp second and fourth for G4', () => {
    const stops = playingStops(67)
    expect(stops).toContainEqual({ number: 2, short: true })
    expect(stops).toContainEqual({ number: 4, short: false })
    expect(conventionalStop(67)).toEqual({ number: 2, short: true })
    expect(landingStop(67, { number: 1, short: false })).toEqual({ number: 2, short: true })
    expect(landingStop(67, { number: 5, short: false })).toEqual({ number: 4, short: false })
    expect(landingStop(67, { number: 3, short: false })).toEqual({ number: 2, short: true })
  })
})

describe('golf deal', () => {
  it('takes, undoes, and clears a legal board', () => {
    const now = new Date(1_000_000)
    const deal = GolfDeal.deal(GolfLevel.start('bass'), 11, now)
    expect(deal.columns).toHaveLength(5)
    expect(deal.columns.map((column) => column.length)).toEqual([3, 3, 3, 3, 3])
    expect(deal.wasteCard?.revealed).toBeDefined()
    const later = new Date(now.getTime() + 1500)
    const taken = deal.take(0, later)
    expect(taken.kind).toBe('took')
    if (taken.kind !== 'took') return
    expect(taken.answer.action).toBe('filled')
    expect(taken.answer.milliseconds).toBe(1500)
    expect(deal.wasteCard?.revealed).toEqual(taken.stop)
    expect(deal.undo()).toBe(true)
    expect(deal.columns[0]).toHaveLength(3)
    expect(deal.bottom(0)?.revealed).toBeUndefined()

    let guard = 0
    while (!deal.isCleared && guard < 40) {
      guard += 1
      let took = false
      for (let column = 0; column < deal.columns.length; column += 1) {
        if (deal.columns[column].length === 0) continue
        if (deal.take(column, new Date(later.getTime() + guard * 1000)).kind === 'took') {
          took = true
          break
        }
      }
      expect(took).toBe(true)
    }
    expect(deal.isCleared).toBe(true)
  })

  it('reveals a peek without moving the card', () => {
    const now = new Date(2_000_000)
    const deal = GolfDeal.deal(GolfLevel.start('tenor'), 4, now)
    const before = deal.bottom(0)?.midi
    const answer = deal.peek(0, new Date(now.getTime() + 400))
    expect(answer?.action).toBe('peeked')
    expect(answer?.clef).toBe('tenor')
    expect(deal.bottom(0)?.midi).toBe(before)
    expect(deal.bottom(0)?.revealed).toEqual(before === undefined ? undefined : conventionalStop(before))
    expect(deal.peek(0, now)).toBeNull()
  })

  it('changes the board when the level gets easier or harder', () => {
    const start = GolfLevel.start('bass')
    expect(GolfLevel.eased(start).columns).toBe(3)
    expect(GolfLevel.eased(start).ledgerLines).toBe(false)
    const harder = GolfLevel.hardened(start)
    expect(harder.ledgerLines).toBe(true)
    expect(harder.columns).toBe(5)
    expect(GolfLevel.hardened(harder).columns).toBe(7)
    expect(GolfLevel.nextLine(start)).toContain('5 columns in bass')
    const eased = GolfDeal.deal(GolfLevel.eased(start), 1, new Date())
    expect(eased.columns).toHaveLength(3)
  })
})

describe('scale inventory', () => {
  it('springs a wrong degree back and clears the right ones', () => {
    const now = new Date(3_000_000)
    const level = ScaleLevel.start(KeySignature.bFlat)
    expect(level.blanks).toBe(2)
    expect(level.accidentals).toBe(2)
    const deal = ScaleInventoryDeal.deal(level, 9, now)
    expect(deal.notes).toHaveLength(8)
    expect(deal.missing.size).toBe(2)
    const slot = [...deal.missing][0] ?? 0
    expect(deal.place(deal.notes[0] + 1, slot, now)).toBeNull()
    expect(deal.missing.size).toBe(2)
    for (const missing of [...deal.missing].sort((a, b) => a - b)) {
      const answer = deal.place(deal.notes[missing], missing, new Date(now.getTime() + 2000))
      expect(answer?.action).toBe('filled')
      expect(answer?.keyID).toBe('Bb')
    }
    expect(deal.isCleared).toBe(true)
  })

  it('quiets the key when easier and keeps the width on the next key', () => {
    const start = ScaleLevel.start(KeySignature.bFlat)
    const easier = ScaleLevel.eased(start)
    expect(easier.accidentals).toBe(1)
    expect(easier.blanks).toBe(2)
    expect(Math.abs(easier.key.accidentals)).toBe(1)
    const harder = ScaleLevel.hardened(start)
    expect(harder.blanks).toBe(3)
    expect(harder.accidentals).toBe(2)
    const next = ScaleLevel.stepped(start)
    expect(Math.abs(next.key.accidentals)).toBe(2)
    expect(next.key.id).not.toBe(start.key.id)
    expect(ScaleLevel.nextLine(start)).toContain('major')
    expect(ScaleLevel.start(KeySignature.gMinor).key.id).toBe('Bb')
  })
})

describe('game log', () => {
  it('reads back what it appended', () => {
    const directory = mkdtempSync(join(tmpdir(), 'game-log-test-'))
    const log = new GameLog(jsonlStore(join(directory, 'game-log.jsonl')))
    const entry: GameLogEntry = {
      id: crypto.randomUUID(),
      at: new Date(10_000),
      game: 'golf',
      clef: 'bass',
      ledgerLines: false,
      note: 67,
      action: 'filled',
      milliseconds: 800,
    }
    log.append(entry)
    log.append(entry)
    const loaded = log.load()
    expect(loaded).toHaveLength(2)
    expect(loaded[0].note).toBe(67)
    expect(loaded[0].milliseconds).toBe(800)
    expect(loaded[0].action).toBe('filled')
  })
})

function jsonlStore(filePath: string): GameLogStore {
  return {
    appendLine(line) {
      mkdirSync(dirname(filePath), { recursive: true })
      appendFileSync(filePath, line)
    },
    readText() {
      if (!existsSync(filePath)) return null
      return readFileSync(filePath, 'utf8')
    },
  }
}
