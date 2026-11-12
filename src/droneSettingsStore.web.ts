const storageKey = 'trombone-piano-drone-settings'

export function readStoredDroneSettings(): string | null {
  return localStorage.getItem(storageKey)
}

export function writeStoredDroneSettings(json: string): void {
  localStorage.setItem(storageKey, json)
}
