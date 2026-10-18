import type { GameLogStore } from './gameLog'

const key = 'trombone-piano-game-log'

export function fileGameLogStore(): GameLogStore {
  return {
    appendLine(line: string): void {
      const existing = globalThis.localStorage?.getItem(key) ?? ''
      globalThis.localStorage?.setItem(key, existing + line)
    },
    readText(): string | null {
      return globalThis.localStorage?.getItem(key) ?? null
    },
  }
}
