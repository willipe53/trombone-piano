export const titleText = 'TROMBONE PIANO'
export const titlePreferredSize = 22
export const titleMinimumSize = 9
export const titleBallSize = 30
export const titleGap = 8
export const titleBandHeight = 44
/// The wordmark and close mark sit this far below the safe-area top, and this far in from the safe-area right.
export const titleTopMargin = 0
export const titleRightMargin = 12
/// Ink size of the Futura Medium wordmark drawn at 22pt with the header tracking.
export const titleMarkWidthAtPreferred = 227.071
export const titleMarkHeightAtPreferred = 18.842

/// Shrinks from 22pt to 9pt in half-point steps until the measured line fits.
export function fittedTitleSize(availableWidth: number, widthAt: (fontSize: number) => number): number {
  let size = titlePreferredSize
  while (size > titleMinimumSize) {
    if (widthAt(size) <= availableWidth + 0.01) return size
    size = Math.round((size - 0.5) * 10) / 10
  }
  return titleMinimumSize
}

export function titleMarkSize(fontSize: number): { width: number; height: number } {
  const scale = fontSize / titlePreferredSize
  return {
    width: titleMarkWidthAtPreferred * scale,
    height: titleMarkHeightAtPreferred * scale,
  }
}

/// Width of the wordmark, the gap, and the close mark. Shrinks once the row is narrower than the 22pt line.
export function titleBlockWidth(room: number): number {
  const safe = Math.max(0, room)
  const available = Math.max(0, safe - titleBallSize - titleGap)
  const size = fittedTitleSize(available, (fontSize) => titleMarkSize(fontSize).width)
  return Math.min(safe, titleMarkSize(size).width + titleGap + titleBallSize)
}

export function headerClearance(): number {
  return titleTopMargin + titleBandHeight
}

export const scoreMagnificationMax = 4

export function clampScoreMagnification(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(scoreMagnificationMax, Math.max(1, value))
}

export function clampScoreOffset(
  x: number,
  y: number,
  contentWidth: number,
  contentHeight: number,
  viewWidth: number,
  viewHeight: number,
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(0, x), Math.max(0, contentWidth - viewWidth)),
    y: Math.min(Math.max(0, y), Math.max(0, contentHeight - viewHeight)),
  }
}

/// Magnification within 0.02 of 1 and both offsets under 1pt.
export function scoreIsAtDefaultView(magnification: number, x: number, y: number): boolean {
  return Math.abs(magnification - 1) < 0.02 && Math.abs(x) < 1 && Math.abs(y) < 1
}

export type DrawnClef = 'treble' | 'tenor' | 'bass'

export function clefX(clef: DrawnClef, spacing: number): number {
  if (clef === 'tenor') return 18 + spacing * 2.15
  return 28
}

export function clefReference(clef: DrawnClef): { staff: DrawnClef; step: number } {
  if (clef === 'treble') return { staff: 'treble', step: 4 }
  if (clef === 'tenor') return { staff: 'tenor', step: 0 }
  return { staff: 'bass', step: -4 }
}

export function clefPlacement(
  clef: DrawnClef,
  spacing: number,
  baselineY: (staff: DrawnClef, step: number) => number,
): { x: number; baseline: number } {
  const reference = clefReference(clef)
  return {
    x: clefX(clef, spacing),
    baseline: baselineY(reference.staff, reference.step),
  }
}

/// The five panel colors first, then a short fixed set.
export const paletteSwatches = [
  '#17803A',
  '#F4F1EA',
  '#E0B15A',
  '#D24B4B',
  '#7EB6D9',
  '#E23C12',
  '#F2C14E',
  '#2F6FED',
  '#8E8E93',
  '#FFFFFF',
  '#111111',
  '#C45C26',
] as const

export function storedPaletteColor(hex: string): string {
  const bare = hex.replace('#', '').trim()
  return `#${bare.toUpperCase()}`
}

export function paletteRing(current: string, swatch: string): boolean {
  return storedPaletteColor(current) === storedPaletteColor(swatch)
}

/// Square switch housing. The caption sits above it. A color, pattern, or Bluetooth mark may sit beside it, and that space stays reserved either way.
export const rockerWidth = 78
export const rockerHeight = 36
export const companionWidth = 24
export const companionGap = 6
/// "SHOW POSITIONS" at 12pt with the caption spacing. The column has to hold that word.
export const captionWidth = 116
/// Space on either side of a switch and its circle.
export const columnGutter = 14
export const columnPitch = Math.max(rockerWidth + companionGap + companionWidth, captionWidth) + columnGutter * 2
export const controlGap = 16
export const keyButtonWidth = 160
export const clearButtonWidth = 132
/// Padding on each side of the control column.
export const controlInset = 22
/// Right inset inside the score column. The header uses the same inset.
export const scoreColumnInset = titleRightMargin

export function rowWidth(count: number, itemWidth = rockerWidth, gap = controlGap): number {
  if (count <= 0) return 0
  return count * itemWidth + Math.max(0, count - 1) * gap
}

/// Width of the control block. Each shown switch keeps a column wide enough for its caption, and the key buttons share that block.
export function controlContentWidth(rockerCount: number): number {
  const rockers = Math.max(0, rockerCount) * columnPitch
  const keys = keyButtonWidth + 8 + clearButtonWidth
  return Math.max(rockers, keys)
}

/// The clef sits in a slot whose gap from the barline equals its gap to the key signature.
export function evenClefSlot(spacing: number, clefSpaces: number, accidentalSpaces: number) {
  const barline = 12
  const gap = spacing * 0.75
  const width = clefSpaces * spacing
  const left = barline + gap
  const signatureLeft = left + width + gap
  return {
    left,
    width,
    signatureCenter: signatureLeft + (accidentalSpaces * spacing) / 2,
  }
}

/// Show Notes and Show Key are always present. Keep Alive and MIDI add a third rocker on their rows.
export function controlRockerCount(showsKeepAlive: boolean, showsMidi: boolean): number {
  return Math.max(showsKeepAlive ? 3 : 2, showsMidi ? 3 : 2)
}

export function controlColumnWidth(contentWidth: number): number {
  return Math.max(0, contentWidth) + controlInset * 2
}

/// The controls keep the width they need. The score receives everything that remains.
export function splitPanel(width: number, controls: number): { controls: number; score: number } {
  const safeWidth = Math.max(0, width)
  const used = Math.min(Math.max(0, controls), safeWidth)
  return { controls: used, score: safeWidth - used }
}
