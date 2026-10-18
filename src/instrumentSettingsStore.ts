import { File, Paths } from 'expo-file-system'

function settingsFile(): File {
  return new File(Paths.document, 'instrument-settings.json')
}

export function readStoredSettings(): string | null {
  const file = settingsFile()
  if (!file.exists) return null
  return file.textSync()
}

export function writeStoredSettings(json: string): void {
  const file = settingsFile()
  if (!file.exists) file.create()
  file.writeSync(json)
}
