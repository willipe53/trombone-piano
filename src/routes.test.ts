import { describe, expect, it } from 'vitest'
import { canonicalPath, pathForScreen, screenFromPath } from './routes'

describe('screen routes', () => {
  it('maps the public addresses', () => {
    expect(screenFromPath('/')).toBe('choice')
    expect(screenFromPath('/piano')).toBe('piano')
    expect(screenFromPath('/games')).toBe('games')
    expect(screenFromPath('/help')).toBe('help')
    expect(pathForScreen('choice')).toBe('/')
    expect(pathForScreen('piano')).toBe('/piano')
    expect(pathForScreen('games')).toBe('/games')
    expect(pathForScreen('help')).toBe('/help')
  })

  it('ignores a trailing slash and a query', () => {
    expect(canonicalPath('/piano/')).toBe('/piano')
    expect(screenFromPath('/games/?x=1')).toBe('games')
  })

  it('treats an unknown address as the pill page', () => {
    expect(screenFromPath('/nope')).toBeNull()
  })
})
