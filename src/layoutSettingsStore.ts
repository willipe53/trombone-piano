import { File, Paths } from 'expo-file-system'

function settingsFile(): File {
  return new File(Paths.document, 'layout-settings.json')
}

export function readStoredLayout(): string | null {
  const file = settingsFile()
  if (!file.exists) return null
  return file.textSync()
}

export function writeStoredLayout(json: string): void {
  const file = settingsFile()
  if (!file.exists) file.create()
  file.writeSync(json)
}
