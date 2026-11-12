import type { KeySignature } from './scoreNotation'

export type DroneVoice = 'trombone' | 'reed' | 'tone'

export type DroneToggles = {
  tonic: boolean
  fourth: boolean
  upper: boolean
}

export type Harmonic = {
  harmonic: number
  amplitude: number
}

export const lowestDroneOctave = 1
export const highestDroneOctave = 4
export const droneNoteGain = 0.28

const letterNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const letterSemitones = [0, 2, 4, 5, 7, 9, 11]

type Spelled = {
  letter: number
  alteration: -1 | 0 | 1
  octave: number
}

export function clampDroneOctave(octave: number): number {
  return Math.min(highestDroneOctave, Math.max(lowestDroneOctave, octave))
}

export function shiftDroneOctave(octave: number, direction: -1 | 1): number {
  return clampDroneOctave(octave + direction)
}

export function droneNotes(key: KeySignature, octave: number, toggles: DroneToggles): number[] {
  const notes: number[] = []
  const tonic = tonicSpelling(key, clampDroneOctave(octave))
  if (toggles.tonic) notes.push(midiOf(tonic))
  if (toggles.fourth) notes.push(midiOf(fourthAbove(tonic)))
  if (toggles.upper) notes.push(midiOf({ ...tonic, octave: tonic.octave + 1 }))
  notes.sort((a, b) => a - b)
  return notes
}

export function dronePitchNames(key: KeySignature, octave: number, toggles: DroneToggles): string[] {
  const tonic = tonicSpelling(key, clampDroneOctave(octave))
  const names: string[] = []
  if (toggles.tonic) names.push(formatSpelling(tonic))
  if (toggles.fourth) names.push(formatSpelling(fourthAbove(tonic)))
  if (toggles.upper) names.push(formatSpelling({ ...tonic, octave: tonic.octave + 1 }))
  return names
}

export function toneHarmonics(): Harmonic[] {
  return [
    { harmonic: 1, amplitude: 1 },
    { harmonic: 2, amplitude: 0.18 },
  ]
}

export function reedHarmonics(): Harmonic[] {
  return [
    { harmonic: 1, amplitude: 1 },
    { harmonic: 2, amplitude: 0.5 },
    { harmonic: 3, amplitude: 0.25 },
    { harmonic: 4, amplitude: 0.12 },
    { harmonic: 5, amplitude: 0.06 },
  ]
}

export function midiFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

/// At least one second, and an integer number of periods of the closed frequency.
export function closedLoop(midi: number, sampleRate: number): { frames: number; periods: number; frequency: number } {
  const frequency = midiFrequency(midi)
  let periods = Math.max(1, Math.ceil(frequency))
  let frames = Math.max(1, Math.round((periods * sampleRate) / frequency))
  while (frames < sampleRate) {
    periods += 1
    frames = Math.max(1, Math.round((periods * sampleRate) / frequency))
  }
  return { frames, periods, frequency: (periods * sampleRate) / frames }
}

/// Two reed pitches whose periods both close in the same buffer. The higher one is one cycle ahead.
export function reedLoop(midi: number, sampleRate: number): {
  frames: number
  lowPeriods: number
  highPeriods: number
  lowFrequency: number
  highFrequency: number
} {
  const frequency = midiFrequency(midi)
  let periods = Math.max(1, Math.round(frequency / 0.7))
  let frames = Math.max(1, Math.round((periods * sampleRate) / frequency))
  while (frames < sampleRate) {
    periods += 1
    frames = Math.max(1, Math.round((periods * sampleRate) / frequency))
  }
  return {
    frames,
    lowPeriods: periods,
    highPeriods: periods + 1,
    lowFrequency: (periods * sampleRate) / frames,
    highFrequency: ((periods + 1) * sampleRate) / frames,
  }
}

export function renderDroneLoop(voice: 'reed' | 'tone', midi: number, sampleRate: number): Float32Array {
  if (voice === 'tone') {
    const loop = closedLoop(midi, sampleRate)
    const out = new Float32Array(loop.frames)
    addHarmonics(out, loop.frequency, sampleRate, toneHarmonics(), 1)
    normalize(out)
    return out
  }
  const loop = reedLoop(midi, sampleRate)
  const out = new Float32Array(loop.frames)
  addHarmonics(out, loop.lowFrequency, sampleRate, reedHarmonics(), 0.5)
  addHarmonics(out, loop.highFrequency, sampleRate, reedHarmonics(), 0.5)
  normalize(out)
  return out
}

function tonicSpelling(key: KeySignature, octave: number): Spelled {
  const id = key.id.endsWith('m') ? key.id.slice(0, -1) : key.id
  const letter = letterNames.indexOf(id[0] ?? '')
  const mark = id.slice(1)
  const alteration: Spelled['alteration'] = mark === '#' ? 1 : mark === 'b' ? -1 : 0
  return { letter, alteration, octave }
}

function fourthAbove(tonic: Spelled): Spelled {
  const letter = (tonic.letter + 3) % 7
  const octave = tonic.octave + (tonic.letter + 3 >= 7 ? 1 : 0)
  const target = midiOf(tonic) + 5
  const alterations: Spelled['alteration'][] = [-1, 0, 1]
  for (const alteration of alterations) {
    const spelled = { letter, alteration, octave }
    if (midiOf(spelled) === target) return spelled
  }
  return { letter, alteration: 0, octave }
}

function midiOf(spelled: Spelled): number {
  return (spelled.octave + 1) * 12 + letterSemitones[spelled.letter] + spelled.alteration
}

function formatSpelling(spelled: Spelled): string {
  const mark = spelled.alteration === 1 ? '#' : spelled.alteration === -1 ? 'b' : ''
  return `${letterNames[spelled.letter]}${mark}${spelled.octave}`
}

function addHarmonics(
  out: Float32Array,
  frequency: number,
  sampleRate: number,
  harmonics: readonly Harmonic[],
  gain: number,
): void {
  for (let index = 0; index < out.length; index += 1) {
    let sample = 0
    for (const partial of harmonics) {
      sample += partial.amplitude * Math.sin((2 * Math.PI * partial.harmonic * frequency * index) / sampleRate)
    }
    out[index] += sample * gain
  }
}

function normalize(out: Float32Array): void {
  let peak = 0
  for (let index = 0; index < out.length; index += 1) peak = Math.max(peak, Math.abs(out[index]))
  if (peak <= 0) return
  const scale = 0.9 / peak
  for (let index = 0; index < out.length; index += 1) out[index] *= scale
}
