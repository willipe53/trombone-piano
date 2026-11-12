import { KeySignature } from './scoreNotation'
import { clampDroneOctave, type DroneVoice } from './drone'
import { readStoredDroneSettings, writeStoredDroneSettings } from './droneSettingsStore'

export type DroneSettings = {
  keySignature: string
  octave: number
  tonic: boolean
  fourth: boolean
  upper: boolean
  sounding: boolean
  voice: DroneVoice
  volume: number
  keybedOrigin: number | null
}

export const defaultDroneSettings: DroneSettings = {
  keySignature: KeySignature.bFlat.id,
  octave: 2,
  tonic: true,
  fourth: false,
  upper: true,
  sounding: false,
  voice: 'trombone',
  volume: 0.85,
  keybedOrigin: null,
}

export function readDroneSettings(): DroneSettings {
  try {
    const raw = readStoredDroneSettings()
    if (!raw) return defaultDroneSettings
    const stored = JSON.parse(raw) as Partial<DroneSettings>
    const voice = stored.voice === 'reed' || stored.voice === 'tone' || stored.voice === 'trombone' ? stored.voice : defaultDroneSettings.voice
    const octave = clampDroneOctave(typeof stored.octave === 'number' ? stored.octave : defaultDroneSettings.octave)
    return { ...defaultDroneSettings, ...stored, voice, octave }
  } catch {
    return defaultDroneSettings
  }
}

export function writeDroneSettings(settings: DroneSettings): void {
  try {
    writeStoredDroneSettings(JSON.stringify(settings))
  } catch {
    // The screen still runs if storage is unavailable.
  }
}
