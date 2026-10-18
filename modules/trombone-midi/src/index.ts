import { requireNativeModule } from 'expo'
import { Platform } from 'react-native'

export type MidiGlyph = 'disabled' | 'idle' | 'advertising' | 'connected'

export type MidiAppearance = {
  available: boolean
  glyph: MidiGlyph
  statusLine: string
  wantsAdvertising: boolean
}

const unavailable: MidiAppearance = {
  available: false,
  glyph: 'disabled',
  statusLine: 'Off',
  wantsAdvertising: false,
}

type NativeMidi = {
  isAvailable: () => boolean
  setEnabled: (enabled: boolean) => boolean
  play: (started: number[], stopped: number[]) => void
  releaseHeldNotes: () => void
  setAdvertising: (wants: boolean) => void
  restore: () => void
  appearance: () => MidiAppearance
  addListener: (event: 'onChange', listener: (appearance: MidiAppearance) => void) => { remove: () => void }
}

let native: NativeMidi | null | undefined

function module(): NativeMidi | null {
  if (Platform.OS !== 'ios') return null
  if (native !== undefined) return native
  try {
    native = requireNativeModule<NativeMidi>('TromboneMidi')
  } catch {
    native = null
  }
  return native
}

export function midiIsAvailable(): boolean {
  return module()?.isAvailable() ?? false
}

export function midiSetEnabled(enabled: boolean): boolean {
  return module()?.setEnabled(enabled) ?? false
}

export function midiPlay(started: number[], stopped: number[]): void {
  module()?.play(started, stopped)
}

export function midiReleaseHeldNotes(): void {
  module()?.releaseHeldNotes()
}

export function midiSetAdvertising(wants: boolean): void {
  module()?.setAdvertising(wants)
}

export function midiRestore(): void {
  module()?.restore()
}

export function midiAppearance(): MidiAppearance {
  return module()?.appearance() ?? unavailable
}

export function midiListen(listener: (appearance: MidiAppearance) => void): () => void {
  const current = module()
  if (!current) return () => {}
  const subscription = current.addListener('onChange', listener)
  return () => subscription.remove()
}
