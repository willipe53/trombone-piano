import { describe, expect, it } from 'vitest'
import { canonicalPath, pathForScreen, screenFromPath } from './routes'

describe('screen routes', () => {
  it('maps the public addresses', () => {
    expect(screenFromPath('/')).toBe('piano')
    expect(screenFromPath('/help')).toBe('help')
    expect(pathForScreen('piano')).toBe('/')
    expect(pathForScreen('help')).toBe('/help')
  })

  it('ignores a trailing slash and a query', () => {
    expect(canonicalPath('/help/')).toBe('/help')
    expect(screenFromPath('/help/?x=1')).toBe('help')
  })

  it('treats an old or unknown address as the piano', () => {
    expect(screenFromPath('/piano')).toBeNull()
    expect(screenFromPath('/games')).toBeNull()
    expect(screenFromPath('/games/?x=1')).toBeNull()
    expect(screenFromPath('/nope')).toBeNull()
  })
})
