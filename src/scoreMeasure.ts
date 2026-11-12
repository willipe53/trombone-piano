import { bassOutline, flatOutline, sharpOutline, tenorOutline, trebleOutline } from './musicOutlines'
import { evenClefSlot } from './panelMeasure'
import { ScoreHistory, type KeyboardInstrument, type KeySignature } from './scoreNotation'

/// Width used to choose the note spacing. The visible pane then keeps as many of those notes as fit.
export const staffContentWidth = 560

export type StaffMetrics = {
  spacing: number
  trebleTop: number
  bassTop: number
  clefLeft: number
  clefSlot: number
  signatureOrigin: number
  signatureStep: number
  noteLeft: number
  slot: number
  headWidth: number
  headHeight: number
  gapSpaces: number
}

export function measureStaff(
  width: number,
  height: number,
  instrument: KeyboardInstrument,
  keySignature: KeySignature,
): StaffMetrics | null {
  if (width <= 0 || height <= 0) return null
  const inset = 6
  const usable = Math.max(48, height - inset * 2)
  const previousGapSpaces = 20
  const gapSpaces = previousGapSpaces * 0.75
  const marginSpaces = 10
  const spacing = usable / (4 + previousGapSpaces + 4 + marginSpaces * 2)
  const freed = (previousGapSpaces - gapSpaces) * spacing
  const trebleTop = inset + marginSpaces * spacing + freed / 2
  const clefSpaces = Math.max(
    ...(instrument === 'trombone'
      ? [tenorOutline.advance, bassOutline.advance]
      : [trebleOutline.advance, bassOutline.advance]),
  )
  const accidentalSpaces = keySignature.accidentals < 0 ? flatOutline.advance : sharpOutline.advance
  const clefSlot = evenClefSlot(spacing, clefSpaces, accidentalSpaces)
  const signatureOrigin = clefSlot.signatureCenter
  const signatureStep = spacing * 1.1
  const signatureCount = Math.abs(keySignature.accidentals)
  const afterSignature =
    signatureCount > 0
      ? signatureOrigin + (signatureCount - 1) * signatureStep + spacing * 1.8
      : clefSlot.left + clefSlot.width + spacing
  const slot = Math.max(8, ((width - afterSignature - 4) / ScoreHistory.columnLimit) * 0.5)
  const headWidth = Math.min(slot * 0.62, spacing * 1.28, Math.max(4, (slot - 4) / 2))
  return {
    spacing,
    trebleTop,
    bassTop: trebleTop + (4 + gapSpaces) * spacing,
    clefLeft: clefSlot.left,
    clefSlot: clefSlot.width,
    signatureOrigin,
    signatureStep,
    noteLeft: afterSignature,
    slot,
    headWidth,
    headHeight: spacing * 0.9,
    gapSpaces,
  }
}

/// How many note columns fit in `visibleWidth` at the usual spacing, including the clefs and signature.
export function noteColumnCapacity(
  visibleWidth: number,
  height: number,
  instrument: KeyboardInstrument,
  keySignature: KeySignature,
): number {
  const metrics = measureStaff(staffContentWidth, height, instrument, keySignature)
  if (!metrics || metrics.slot <= 0 || visibleWidth <= 0) return 1
  const one = firstChordRight(staffContentWidth, height, instrument, keySignature)
  if (visibleWidth <= one + 0.01) return 1
  return 1 + Math.floor((visibleWidth - one) / metrics.slot)
}

/// Slot and head used to place those columns. Spacing stays put while the pane changes width.
export function noteColumnMetrics(
  height: number,
  instrument: KeyboardInstrument,
  keySignature: KeySignature,
): { slot: number; headWidth: number } {
  const metrics = measureStaff(staffContentWidth, height, instrument, keySignature)
  return { slot: metrics?.slot ?? 8, headWidth: metrics?.headWidth ?? 8 }
}

/// Right edge of the clefs, the signature, and one chord on a staff drawn at `drawnWidth`.
export function firstChordRight(
  drawnWidth: number,
  height: number,
  instrument: KeyboardInstrument,
  keySignature: KeySignature,
): number {
  const metrics = measureStaff(drawnWidth, height, instrument, keySignature)
  if (!metrics) return 0
  const chordRight = metrics.noteLeft + metrics.slot / 2 + metrics.headWidth * 1.5 + 2
  return chordRight + metrics.spacing * 0.4
}
