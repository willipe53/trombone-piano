import { File, Paths } from 'expo-file-system'

function settingsFile(): File {
  return new File(Paths.document, 'drone-settings.json')
}

export function readStoredDroneSettings(): string | null {
  const file = settingsFile()
  if (!file.exists) return null
  return file.textSync()
}

export function writeStoredDroneSettings(json: string): void {
  const file = settingsFile()
  if (!file.exists) file.create()
  file.writeSync(json)
}
