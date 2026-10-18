import { KeySignature, type KeyboardInstrument, type TromboneHornName } from './scoreNotation'
import { keyScaleMax } from './geometry'
import { type KeyHatch } from './keyHatch'
import { readStoredSettings, writeStoredSettings } from './instrumentSettingsStore'

export type InstrumentSettings = {
  keyScale: number
  showNotes: boolean
  showKey: boolean
  keepAlive: boolean
  showPositions: boolean
  midi: boolean
  bluetoothAdvertising: boolean
  instrument: KeyboardInstrument
  horn: TromboneHornName
  keySignature: string
  noteColor: string
  positionColor: string
  keyHatch: KeyHatch
  keybedOrigin: number | null
  scoreMagnification: number
  scoreOffsetX: number
  scoreOffsetY: number
}

export const defaultInstrumentSettings: InstrumentSettings = {
  keyScale: keyScaleMax,
  showNotes: true,
  showKey: true,
  keepAlive: false,
  showPositions: true,
  midi: false,
  bluetoothAdvertising: false,
  instrument: 'trombone',
  horn: 'straight',
  keySignature: KeySignature.bFlat.id,
  noteColor: '#17803A',
  positionColor: '#17803A',
  keyHatch: 'crosshatch',
  keybedOrigin: null,
  scoreMagnification: 1,
  scoreOffsetX: 0,
  scoreOffsetY: 0,
}

export function readInstrumentSettings(): InstrumentSettings {
  try {
    const raw = readStoredSettings()
    if (!raw) return defaultInstrumentSettings
    const stored = JSON.parse(raw) as Partial<InstrumentSettings>
    return { ...defaultInstrumentSettings, ...stored }
  } catch {
    return defaultInstrumentSettings
  }
}

export function writeInstrumentSettings(settings: InstrumentSettings): void {
  try {
    writeStoredSettings(JSON.stringify(settings))
  } catch {
    // The screen still runs if storage is unavailable.
  }
}
