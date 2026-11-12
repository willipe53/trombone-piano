import { describe, expect, it } from 'vitest'
import { KeySignature } from './scoreNotation'
import {
  closedLoop,
  droneNotes,
  dronePitchNames,
  reedHarmonics,
  reedLoop,
  shiftDroneOctave,
  toneHarmonics,
} from './drone'

const on = { tonic: true, fourth: true, upper: true }
const root = { tonic: true, fourth: false, upper: true }

describe('drone notes', () => {
  it('holds Bb and the octave, and adds Eb for the fourth', () => {
    expect(droneNotes(KeySignature.bFlat, 2, root)).toEqual([46, 58])
    expect(droneNotes(KeySignature.bFlat, 2, on)).toEqual([46, 51, 58])
  })

  it('holds G minor as G, C, and G', () => {
    expect(droneNotes(KeySignature.gMinor, 2, on)).toEqual([43, 48, 55])
  })

  it('spells F# major and F major from the key', () => {
    expect(dronePitchNames(KeySignature.fSharp, 2, { tonic: true, fourth: true, upper: false })).toEqual(['F#2', 'B2'])
    expect(dronePitchNames(KeySignature.f, 2, { tonic: true, fourth: true, upper: false })).toEqual(['F2', 'Bb2'])
  })

  it('leaves the octave in place at the ends of the range', () => {
    expect(shiftDroneOctave(1, -1)).toBe(1)
    expect(shiftDroneOctave(4, 1)).toBe(4)
    expect(shiftDroneOctave(2, 1)).toBe(3)
  })

  it('holds nothing when every toggle is off', () => {
    expect(droneNotes(KeySignature.c, 3, { tonic: false, fourth: false, upper: false })).toEqual([])
  })
})

describe('drone loops', () => {
  it('uses a falling reed stack and two closed pitches', () => {
    const harmonics = reedHarmonics()
    for (let index = 1; index < harmonics.length; index += 1) {
      expect(harmonics[index].amplitude).toBeLessThan(harmonics[index - 1].amplitude)
    }
    const loop = reedLoop(46, 44_100)
    expect(loop.frames).toBeGreaterThanOrEqual(44_100)
    expect(loop.highPeriods).toBe(loop.lowPeriods + 1)
    expect(loop.lowFrequency).not.toBe(loop.highFrequency)
    expect(loop.lowPeriods * 44_100).toBeCloseTo(loop.lowFrequency * loop.frames, 5)
    expect(loop.highPeriods * 44_100).toBeCloseTo(loop.highFrequency * loop.frames, 5)
  })

  it('uses one tone copy with a quieter second harmonic', () => {
    const harmonics = toneHarmonics()
    expect(harmonics).toHaveLength(2)
    expect(harmonics[1].amplitude).toBeLessThan(harmonics[0].amplitude)
    const loop = closedLoop(46, 44_100)
    expect(loop.frames).toBeGreaterThanOrEqual(44_100)
    expect(loop.periods * 44_100).toBeCloseTo(loop.frequency * loop.frames, 5)
  })
})
