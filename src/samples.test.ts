import { describe, expect, it } from 'vitest'
import {
  highestMidiNote,
  lowestMidiNote,
  noteChanges,
  sampleFileStem,
  sampleLoadOrder,
  tromboneFundamentalPeriod,
  tromboneSustainLoop,
} from './samples'

describe('sample names', () => {
  it('uses flat spellings for the 88 keys', () => {
    expect(sampleFileStem(21)).toBe('A0')
    expect(sampleFileStem(22)).toBe('Bb0')
    expect(sampleFileStem(60)).toBe('C4')
    expect(sampleFileStem(61)).toBe('Db4')
    expect(sampleFileStem(108)).toBe('C8')
  })
})

describe('trombone sustain', () => {
  it('loops the steady middle without a seam', () => {
    const rate = 44_100
    const midi = 48
    const frequency = 440 * 2 ** ((midi - 69) / 12)
    const count = Math.floor(3.2 * rate)
    const samples = new Float32Array(count)
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = Math.sin((2 * Math.PI * frequency * index) / rate)
    }

    const period = tromboneFundamentalPeriod(samples, rate, midi, Math.round(0.8 * rate))
    expect(Math.abs(period - Math.round(rate / frequency))).toBeLessThan(5)

    const sustain = tromboneSustainLoop(samples, rate, midi)
    expect(sustain).not.toBeNull()
    if (!sustain) return
    expect(sustain.loop[0]).toBeCloseTo(samples[sustain.intro.length], 4)

    const window = Math.floor(0.02 * rate)
    let quietest = 1
    let index = 0
    while (index + window < sustain.loop.length) {
      let energy = 0
      for (let cursor = index; cursor < index + window; cursor += 1) {
        energy += sustain.loop[cursor] * sustain.loop[cursor]
      }
      quietest = Math.min(quietest, Math.sqrt(energy / window))
      index += Math.floor(window / 2)
    }
    expect(quietest).toBeGreaterThan(0.5)
  })

  it('does not loop a short recording', () => {
    const samples = new Float32Array(1000).fill(0.2)
    expect(tromboneSustainLoop(samples, 44_100, 60)).toBeNull()
  })
})

describe('notes', () => {
  it('reports pressed and released keys', () => {
    const changes = noteChanges(new Set([60, 64, 67]), new Set([64, 67, 72]))
    expect(changes.started).toEqual([72])
    expect(changes.stopped).toEqual([60])
  })

  it('loads from the middle of the keyboard outward', () => {
    const order = sampleLoadOrder(lowestMidiNote, highestMidiNote, 60)
    expect(order).toHaveLength(88)
    expect(new Set(order)).toEqual(new Set(Array.from({ length: 88 }, (_, index) => lowestMidiNote + index)))
    expect(order.slice(0, 5)).toEqual([60, 59, 61, 58, 62])
    expect(order.at(-1)).toBe(highestMidiNote)
  })
})
