export type Screen = 'piano' | 'help'

export function canonicalPath(path: string): string {
  const name = path.split('?')[0].split('#')[0]
  if (name === '' || name === '/') return '/'
  return name.replace(/\/+$/, '') || '/'
}

export function pathForScreen(screen: Screen): string {
  if (screen === 'help') return '/help'
  return '/'
}

/// Unknown addresses are the piano. The caller replaces the address with `/`.
export function screenFromPath(path: string): Screen | null {
  const name = canonicalPath(path)
  if (name === '/') return 'piano'
  if (name === '/help') return 'help'
  return null
}
