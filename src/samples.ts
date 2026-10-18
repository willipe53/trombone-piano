export { highestMidiNote, lowestMidiNote } from './geometry'
import { highestMidiNote, lowestMidiNote } from './geometry'

const pitchNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

export type TromboneSustain = {
  intro: Float32Array
  loop: Float32Array
}

/// File name used by the Fluid (R3) samples, such as `Db4` for C#4.
export function sampleFileStem(midiNote: number): string {
  const octave = Math.floor(midiNote / 12) - 1
  return `${pitchNames[midiNote % 12]}${octave}`
}

export function noteChanges(
  from: ReadonlySet<number>,
  to: ReadonlySet<number>,
): { started: number[]; stopped: number[] } {
  const started: number[] = []
  const stopped: number[] = []
  for (const note of to) {
    if (!from.has(note)) started.push(note)
  }
  for (const note of from) {
    if (!to.has(note)) stopped.push(note)
  }
  started.sort((a, b) => a - b)
  stopped.sort((a, b) => a - b)
  return { started, stopped }
}

/// Every note from `lowest` through `highest`, nearest to `center` first. Ties go to the lower note.
export function sampleLoadOrder(lowest: number, highest: number, center: number): number[] {
  if (lowest > highest) return []
  const notes: number[] = []
  for (let note = lowest; note <= highest; note += 1) notes.push(note)
  notes.sort((a, b) => {
    const da = Math.abs(a - center)
    const db = Math.abs(b - center)
    if (da === db) return a - b
    return da - db
  })
  return notes
}

export function tromboneFundamentalPeriod(
  samples: ArrayLike<number>,
  sampleRate: number,
  midi: number,
  at: number,
): number {
  const frequency = 440 * 2 ** ((midi - 69) / 12)
  const guess = Math.max(8, Math.round(sampleRate / frequency))
  const window = Math.min(Math.floor(0.05 * sampleRate), samples.length - at - guess - 2)
  if (window <= guess * 2) return guess
  const minLag = Math.max(8, Math.floor(guess * 0.98))
  const maxLag = Math.min(window - 1, Math.ceil(guess * 1.02))
  if (maxLag <= minLag) return guess
  let bestLag = guess
  let bestScore = Number.NEGATIVE_INFINITY
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let score = 0
    let index = 0
    while (index < window - lag) {
      score += samples[at + index] * samples[at + index + lag]
      index += 2
    }
    if (score > bestScore) {
      bestScore = score
      bestLag = lag
    }
  }
  return bestLag
}

/// Attack once, then a slice of the steady middle. The loop ends on the same waveform phase it starts on, and that join is crossfaded.
export function tromboneSustainLoop(
  samples: ArrayLike<number>,
  sampleRate: number,
  midi: number,
): TromboneSustain | null {
  if (sampleRate <= 0) return null
  const start = Math.round(0.8 * sampleRate)
  const fadeFloor = Math.round(0.04 * sampleRate)
  if (start <= fadeFloor || samples.length <= start + fadeFloor * 4) return null

  const period = tromboneFundamentalPeriod(samples, sampleRate, midi, start)
  const fadeCycles = Math.max(2, Math.ceil(fadeFloor / period))
  const fade = fadeCycles * period
  const nominalEnd = Math.min(Math.round(2.75 * sampleRate), samples.length - period - 8)
  if (nominalEnd - start <= fade * 3 || nominalEnd + period >= samples.length) return null

  let end = nominalEnd
  let bestError = Number.POSITIVE_INFINITY
  const compare = Math.min(period, samples.length - nominalEnd - period)
  if (compare <= 8) return null
  for (let candidate = nominalEnd - period; candidate <= nominalEnd + period; candidate += 1) {
    let error = 0
    for (let index = 0; index < compare; index += 1) {
      const delta = samples[candidate + index] - samples[start + index]
      error += delta * delta
    }
    if (error < bestError) {
      bestError = error
      end = candidate
    }
  }
  if (end - start <= fade * 2 || end + fade > samples.length) return null

  const loop = sliceSamples(samples, start, end)
  const fadeStart = loop.length - fade
  if (fadeStart <= 0) return null
  for (let index = 0; index < fade; index += 1) {
    const amount = (index + 1) / fade
    const fadeOut = Math.cos((amount * Math.PI) / 2)
    const fadeIn = Math.sin((amount * Math.PI) / 2)
    loop[fadeStart + index] =
      samples[end - fade + index] * fadeOut + samples[start + index] * fadeIn
  }
  return { intro: sliceSamples(samples, 0, start), loop }
}

function sliceSamples(samples: ArrayLike<number>, start: number, end: number): Float32Array {
  const out = new Float32Array(end - start)
  for (let index = start; index < end; index += 1) out[index - start] = samples[index]
  return out
}
