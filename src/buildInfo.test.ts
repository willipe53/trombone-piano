import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { versionLabel } from './buildInfo'

describe('version label', () => {
  it('matches the About line used by the help screen', () => {
    expect(versionLabel('2.0.0', '1')).toBe('Version: 2.0.0+1')
  })
})

describe('store pages', () => {
  const privacy = readFileSync(new URL('../website/privacy-policy.html', import.meta.url), 'utf8')
  const support = readFileSync(new URL('../website/support.html', import.meta.url), 'utf8')
  const help = readFileSync(new URL('../swift_version/TrombonePiano/Help.md', import.meta.url), 'utf8')

  it('names the trombonepiano.com contact address', () => {
    expect(privacy).toContain('support@trombonepiano.com')
    expect(support).toContain('support@trombonepiano.com')
    expect(privacy).not.toContain('support@extentdevices.com')
    expect(support).not.toContain('support@extentdevices.com')
  })

  it('points help at the privacy page on trombonepiano.com', () => {
    expect(help).toContain('https://trombonepiano.com/privacy-policy.html')
    expect(help).not.toContain('https://extentdevices.com/privacy-policy.html')
  })
})
