import { AudioContext } from 'react-native-audio-api'
import type { AudioBuffer, AudioBufferSourceNode, GainNode } from 'react-native-audio-api'
import { sampleModules } from './sampleManifest'
import { scheduledSources } from './playback'
import {
  highestMidiNote,
  lowestMidiNote,
  noteChanges,
  sampleFileStem,
  sampleLoadOrder,
  tromboneSustainLoop,
} from './samples'

export type Instrument = 'piano' | 'trombone'

const voiceCount = 8
const gainLevel = 0.7
const releaseSeconds = 0.09
const decodeWidth = 4

type Prepared = {
  attack: AudioBuffer
  sustain: AudioBuffer | null
}

type Voice = {
  gain: GainNode
  sources: AudioBufferSourceNode[]
  note: number | null
  age: number
  fading: boolean
  token: number
}

export class Engine {
  private context: AudioContext | null = null
  private voices: Voice[] = []
  private age = 0
  private sounding = new Set<number>()
  private readonly cache = new Map<string, Prepared>()
  private readonly loaded = new Set<Instrument>()
  private readonly loading = new Map<Instrument, Promise<void>>()
  private readonly fallbacks = new Map<Instrument, number>()
  instrument: Instrument = 'piano'

  isLoaded(instrument: Instrument): boolean {
    return this.loaded.has(instrument)
  }

  loopFallbacks(instrument: Instrument): number {
    return this.fallbacks.get(instrument) ?? 0
  }

  async resume(): Promise<void> {
    const context = this.audio()
    this.installVoices(context)
    if (context.state === 'suspended') await context.resume()
  }

  load(instrument: Instrument, onProgress?: (done: number, total: number) => void): Promise<void> {
    const existing = this.loading.get(instrument)
    if (existing) return existing
    const pending = this.decodeInstrument(instrument, onProgress)
    this.loading.set(instrument, pending)
    pending.catch(() => {
      if (this.loading.get(instrument) === pending) this.loading.delete(instrument)
    })
    return pending
  }

  setInstrument(instrument: Instrument): void {
    if (instrument === this.instrument) return
    this.silence()
    this.instrument = instrument
  }

  setSounding(notes: ReadonlySet<number>): void {
    if (!this.loaded.has(this.instrument)) return
    const changes = noteChanges(this.sounding, notes)
    this.sounding = new Set(notes)
    for (const note of changes.stopped) this.release(note)
    for (const note of changes.started) this.play(note)
  }

  /// Trombone attack once, with no sustain source, stopped after 0.9s.
  playOneShot(midi: number): void {
    this.playPrepared(midi, 'trombone', 'oneShot')
  }

  silence(): void {
    const context = this.context
    for (const voice of this.voices) {
      voice.token += 1
      voice.note = null
      voice.fading = false
      this.stopSource(voice)
      if (context) {
        voice.gain.gain.cancelScheduledValues(context.currentTime)
        voice.gain.gain.setValueAtTime(gainLevel, context.currentTime)
      }
    }
    this.sounding.clear()
  }

  private audio(): AudioContext {
    this.context ??= new AudioContext({ sampleRate: 44_100 })
    return this.context
  }

  private installVoices(context: AudioContext): void {
    if (this.voices.length > 0) return
    for (let index = 0; index < voiceCount; index += 1) {
      const gain = context.createGain()
      gain.gain.value = gainLevel
      gain.connect(context.destination)
      this.voices.push({ gain, sources: [], note: null, age: 0, fading: false, token: 0 })
    }
  }

  private async decodeInstrument(
    instrument: Instrument,
    onProgress?: (done: number, total: number) => void,
  ): Promise<void> {
    const context = this.audio()
    const order = sampleLoadOrder(lowestMidiNote, highestMidiNote, 60)
    const missing: number[] = []
    let done = 0
    await runPool(order, decodeWidth, async (midi) => {
      try {
        await this.decodeOne(context, instrument, midi)
      } catch {
        missing.push(midi)
      }
      done += 1
      onProgress?.(done, order.length)
    })
    for (const midi of missing) {
      await this.decodeOne(context, instrument, midi)
    }
    this.loaded.add(instrument)
  }

  private async decodeOne(context: AudioContext, instrument: Instrument, midi: number): Promise<void> {
    const key = cacheKey(instrument, midi)
    if (this.cache.has(key)) return
    const file = `${instrument}-${sampleFileStem(midi)}`
    const moduleId = sampleModules[file]
    if (moduleId === undefined) throw new Error(`Missing sample ${file}`)
    const decoded = await context.decodeAudioData(moduleId)
    this.cache.set(key, this.prepare(context, decoded, instrument, midi))
  }

  private prepare(
    context: AudioContext,
    decoded: AudioBuffer,
    instrument: Instrument,
    midi: number,
  ): Prepared {
    const samples = monoSamples(decoded)
    const whole = pcmBuffer(context, samples, decoded.sampleRate)
    if (instrument !== 'trombone') return { attack: whole, sustain: null }
    const sustain = tromboneSustainLoop(samples, decoded.sampleRate, midi)
    if (!sustain) {
      this.fallbacks.set(instrument, (this.fallbacks.get(instrument) ?? 0) + 1)
      return { attack: whole, sustain: null }
    }
    try {
      return {
        attack: pcmBuffer(context, sustain.intro, decoded.sampleRate),
        sustain: pcmBuffer(context, sustain.loop, decoded.sampleRate),
      }
    } catch {
      this.fallbacks.set(instrument, (this.fallbacks.get(instrument) ?? 0) + 1)
      return { attack: whole, sustain: null }
    }
  }

  private play(note: number): void {
    this.playPrepared(note, this.instrument, 'held')
  }

  private playPrepared(note: number, instrument: Instrument, kind: 'held' | 'oneShot'): void {
    const context = this.context
    const prepared = this.cache.get(cacheKey(instrument, note))
    if (!context || !prepared) return
    this.installVoices(context)
    const voice = this.takeVoice(note)
    const now = context.currentTime
    voice.gain.gain.cancelScheduledValues(now)
    voice.gain.gain.setValueAtTime(gainLevel, now)
    const parts = scheduledSources(kind, prepared.sustain !== null)
    const attack = context.createBufferSource()
    attack.buffer = prepared.attack
    attack.connect(voice.gain)
    attack.start(now)
    voice.sources = [attack]
    if (parts.includes('sustain') && prepared.sustain) {
      // The library's loop region starts at loopStart, so the attack before it never plays.
      const sustain = context.createBufferSource()
      sustain.buffer = prepared.sustain
      sustain.loop = true
      sustain.connect(voice.gain)
      sustain.start(now + prepared.attack.duration)
      voice.sources.push(sustain)
    }
    if (kind !== 'oneShot') return
    const token = voice.token
    setTimeout(() => {
      if (voice.token !== token) return
      voice.note = null
      this.stopSource(voice)
    }, 900)
  }

  private release(note: number): void {
    const context = this.context
    const voice = this.voices.find((candidate) => candidate.note === note)
    if (!context || !voice || voice.sources.length === 0) return
    const sources = voice.sources
    const now = context.currentTime
    voice.gain.gain.cancelScheduledValues(now)
    voice.gain.gain.setValueAtTime(gainLevel, now)
    voice.gain.gain.linearRampToValueAtTime(0, now + releaseSeconds)
    voice.note = null
    voice.fading = true
    const token = voice.token
    setTimeout(() => {
      if (voice.token !== token) return
      voice.fading = false
      for (const source of sources) stopSourceNode(source)
      if (voice.sources === sources) voice.sources = []
    }, releaseSeconds * 1000 + 20)
  }

  private takeVoice(note: number): Voice {
    const existing = this.voices.findIndex((voice) => voice.note === note)
    const free = this.voices.findIndex((voice) => voice.note === null && !voice.fading)
    const idle = this.voices.findIndex((voice) => voice.note === null)
    let index = existing
    if (index < 0) index = free
    if (index < 0) index = idle
    if (index < 0) {
      index = 0
      for (let cursor = 1; cursor < this.voices.length; cursor += 1) {
        if (this.voices[cursor].age < this.voices[index].age) index = cursor
      }
    }
    const voice = this.voices[index]
    voice.token += 1
    this.stopSource(voice)
    voice.fading = false
    voice.note = note
    this.age += 1
    voice.age = this.age
    return voice
  }

  private stopSource(voice: Voice): void {
    const sources = voice.sources
    voice.sources = []
    for (const source of sources) stopSourceNode(source)
  }
}

function stopSourceNode(source: AudioBufferSourceNode): void {
  try {
    source.stop()
  } catch {
    // The source was never started, or it already stopped.
  }
  try {
    source.disconnect()
  } catch {
    // The source was already disconnected.
  }
}

function pcmBuffer(context: AudioContext, samples: ArrayLike<number>, sampleRate: number): AudioBuffer {
  const channel = new Float32Array(samples.length)
  for (let index = 0; index < samples.length; index += 1) channel[index] = samples[index]
  const buffer = context.createBuffer(1, channel.length, sampleRate)
  buffer.copyToChannel(channel, 0)
  return buffer
}

let shared: Engine | null = null

export function getEngine(): Engine {
  shared ??= new Engine()
  return shared
}

function cacheKey(instrument: Instrument, midi: number): string {
  return `${instrument}:${midi}`
}

function monoSamples(decoded: AudioBuffer): Float32Array<ArrayBuffer> {
  const frames = decoded.length
  const first = decoded.getChannelData(0)
  const mixed = new Float32Array(frames)
  mixed.set(first)
  const channels = decoded.numberOfChannels
  if (channels === 1) return mixed
  for (let channel = 1; channel < channels; channel += 1) {
    const data = decoded.getChannelData(channel)
    for (let index = 0; index < frames; index += 1) mixed[index] += data[index]
  }
  for (let index = 0; index < frames; index += 1) mixed[index] /= channels
  return mixed
}

async function runPool(items: number[], width: number, task: (item: number) => Promise<void>): Promise<void> {
  let cursor = 0
  const workers = Array.from({ length: width }, async () => {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      await task(item)
    }
  })
  await Promise.all(workers)
}
