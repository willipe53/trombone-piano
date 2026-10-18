const storageKey = 'trombone-piano-instrument-settings'

export function readStoredSettings(): string | null {
  return localStorage.getItem(storageKey)
}

export function writeStoredSettings(json: string): void {
  localStorage.setItem(storageKey, json)
}
