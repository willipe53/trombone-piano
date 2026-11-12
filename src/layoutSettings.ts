import { readStoredLayout, writeStoredLayout } from './layoutSettingsStore'

export type LayoutSettings = {
  controls: number
  keyboard: number
}

export const defaultLayoutSettings: LayoutSettings = {
  controls: 0.5,
  keyboard: 1 / 3,
}

export function layoutSettingsFrom(raw: string | null): LayoutSettings {
  if (!raw) return defaultLayoutSettings
  try {
    const stored = JSON.parse(raw) as Partial<LayoutSettings>
    return {
      controls: share(stored.controls, defaultLayoutSettings.controls),
      keyboard: share(stored.keyboard, defaultLayoutSettings.keyboard),
    }
  } catch {
    return defaultLayoutSettings
  }
}

export function readLayoutSettings(): LayoutSettings {
  try {
    return layoutSettingsFrom(readStoredLayout())
  } catch {
    return defaultLayoutSettings
  }
}

export function writeLayoutSettings(settings: LayoutSettings): void {
  try {
    writeStoredLayout(JSON.stringify({ controls: settings.controls, keyboard: settings.keyboard }))
  } catch {
    // The screen still runs if storage is unavailable.
  }
}

function share(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(1, Math.max(0, value))
}
