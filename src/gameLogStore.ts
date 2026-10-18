import { File, Paths } from 'expo-file-system'
import type { GameLogStore } from './gameLog'

function logFile(): File {
  return new File(Paths.document, 'game-log.jsonl')
}

export function fileGameLogStore(): GameLogStore {
  return {
    appendLine(line: string): void {
      const file = logFile()
      const existing = file.exists ? file.textSync() : ''
      if (!file.exists) file.create()
      file.writeSync(existing + line)
    },
    readText(): string | null {
      const file = logFile()
      if (!file.exists) return null
      return file.textSync()
    },
  }
}
