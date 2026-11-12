const storageKey = 'trombone-piano-layout'

export function readStoredLayout(): string | null {
  return localStorage.getItem(storageKey)
}

export function writeStoredLayout(json: string): void {
  localStorage.setItem(storageKey, json)
}
