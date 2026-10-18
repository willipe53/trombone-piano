import { signatureMarks, type KeySignature, type ScoreStaff } from './scoreNotation'

/// Eight staff spaces tall: the five lines, plus room for accidentals past the outer lines.
export const keySignatureGlyphSpacesTall = 8
/// Seven accidentals at 1.1 spaces, plus side margins.
export const keySignatureGlyphSpacesWide = 10

export function keySignatureGlyphWidth(height: number): number {
  return (height / keySignatureGlyphSpacesTall) * keySignatureGlyphSpacesWide
}

/// Staff lines and accidental centers for one key, in the picker's glyph box.
export function keySignatureGlyphLayout(width: number, height: number, staff: ScoreStaff, key: KeySignature) {
  const spacing = height / keySignatureGlyphSpacesTall
  const staffTop = (height - spacing * 4) / 2
  const half = spacing / 2
  const topLine = staff === 'treble' ? 10 : staff === 'tenor' ? 2 : -2
  return {
    spacing,
    lines: [0, 1, 2, 3, 4].map((line) => ({
      y: Math.round(staffTop + line * spacing) + 0.5,
      x2: width,
    })),
    marks: signatureMarks(key, staff).map((mark, index) => ({
      accidental: mark.accidental,
      x: spacing * 1.2 + index * spacing * 1.1,
      y: staffTop + (topLine - mark.step) * half,
    })),
  }
}
