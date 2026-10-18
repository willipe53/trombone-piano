export type Screen = 'choice' | 'piano' | 'games' | 'help'

export function canonicalPath(path: string): string {
  const name = path.split('?')[0].split('#')[0]
  if (name === '' || name === '/') return '/'
  return name.replace(/\/+$/, '') || '/'
}

export function pathForScreen(screen: Screen): string {
  if (screen === 'piano') return '/piano'
  if (screen === 'games') return '/games'
  if (screen === 'help') return '/help'
  return '/'
}

/// Unknown addresses are the pill page. The caller can replace the address with `/`.
export function screenFromPath(path: string): Screen | null {
  const name = canonicalPath(path)
  if (name === '/') return 'choice'
  if (name === '/piano') return 'piano'
  if (name === '/games') return 'games'
  if (name === '/help') return 'help'
  return null
}
