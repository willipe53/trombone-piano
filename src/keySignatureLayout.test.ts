import { describe, expect, it } from 'vitest'
import { keySignatureGlyphLayout, keySignatureGlyphWidth } from './keySignatureLayout'
import { KeySignature } from './scoreNotation'

describe('key signature glyph', () => {
  const height = 48
  const width = keySignatureGlyphWidth(height)

  it('matches the Swift box: eight spaces tall and ten wide', () => {
    expect(width).toBe(60)
  })

  it('puts the treble F sharp on the top line and leaves C major empty', () => {
    const spacing = height / 8
    const staffTop = (height - spacing * 4) / 2
    const g = keySignatureGlyphLayout(width, height, 'treble', KeySignature.g)
    expect(g.marks).toHaveLength(1)
    expect(g.marks[0]).toMatchObject({ accidental: 'sharp', y: staffTop })
    expect(keySignatureGlyphLayout(width, height, 'treble', KeySignature.c).marks).toEqual([])
  })

  it('puts the bass B flat on the fourth line', () => {
    const spacing = height / 8
    const staffTop = (height - spacing * 4) / 2
    const f = keySignatureGlyphLayout(width, height, 'bass', KeySignature.f)
    expect(f.marks[0]).toMatchObject({ accidental: 'flat', y: staffTop + spacing * 3 })
  })
})