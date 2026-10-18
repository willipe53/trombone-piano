/// Points per millimeter on iPad Pro. Those displays are 264 pixels per inch at 2x, so one point is 1/132 of an inch.
export const ipadProPointsPerMillimeter = 132 / 25.4

export const whiteKeyWidthMm = 22
export const whiteKeyHeightMm = 120

export const blackKeyWidthRatio = 0.6
export const blackKeyHeightRatio = 0.65

/// Full size. The slider does not grow keys past this.
export const keyScaleMax = 1

/// A0, the bottom note of an 88-key piano.
export const lowestMidiNote = 21

/// C8, the top note of an 88-key piano.
export const highestMidiNote = 108

export type KeyRect = {
  left: number
  top: number
  width: number
  height: number
}

export function keyRight(rect: KeyRect): number {
  return rect.left + rect.width
}

export function keyBottom(rect: KeyRect): number {
  return rect.top + rect.height
}

export function keyContains(rect: KeyRect, x: number, y: number): boolean {
  return x >= rect.left && x < keyRight(rect) && y >= rect.top && y <= keyBottom(rect)
}

export type PianoKey = {
  midiNote: number
  isBlack: boolean
  rect: KeyRect
}

const pitchClassNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/// Scientific pitch name, such as C4 for middle C.
export function noteLabel(midiNote: number): string {
  const octave = Math.floor(midiNote / 12) - 1
  return `${pitchClassNames[midiNote % 12]}${octave}`
}

export function isBlackKey(midiNote: number): boolean {
  switch (midiNote % 12) {
    case 1:
    case 3:
    case 6:
    case 8:
    case 10:
      return true
    default:
      return false
  }
}

/// White keys are `whiteKeyWidthMm` by `whiteKeyHeightMm` at scale 1.
/// Black keys sit on the top of the keyboard, centered on the gap after the white key they follow.
export function layoutKeyboard(scale: number): PianoKey[] {
  const whiteWidth = whiteKeyWidthMm * scale * ipadProPointsPerMillimeter
  const whiteHeight = whiteKeyHeightMm * scale * ipadProPointsPerMillimeter
  const blackWidth = whiteWidth * blackKeyWidthRatio
  const blackHeight = whiteHeight * blackKeyHeightRatio
  const keys: PianoKey[] = []
  let whiteIndex = 0
  for (let midi = lowestMidiNote; midi <= highestMidiNote; midi += 1) {
    if (isBlackKey(midi)) {
      keys.push({
        midiNote: midi,
        isBlack: true,
        rect: { left: whiteIndex * whiteWidth - blackWidth / 2, top: 0, width: blackWidth, height: blackHeight },
      })
    } else {
      keys.push({
        midiNote: midi,
        isBlack: false,
        rect: { left: whiteIndex * whiteWidth, top: 0, width: whiteWidth, height: whiteHeight },
      })
      whiteIndex += 1
    }
  }
  return keys
}

/// Width of the keybed from the left edge of A0 to the right edge of C8.
export function keyboardWidth(keys: readonly PianoKey[]): number {
  return keys.reduce((width, key) => Math.max(width, keyRight(key.rect)), 0)
}

/// Scale whose cropped key height is `visibleHeight`. `visibleRatio` is the fraction of the key that stays on screen.
export function scaleForVisibleKeyHeight(visibleHeight: number, visibleRatio: number): number {
  const full = whiteKeyHeightMm * ipadProPointsPerMillimeter * visibleRatio
  if (full <= 0) return keyScaleMax
  return visibleHeight / full
}

/// Scale at which the full keybed is exactly as wide as `viewportWidth`.
export function scaleThatFitsKeyboard(viewportWidth: number): number {
  const fullWidth = keyboardWidth(layoutKeyboard(1))
  if (fullWidth === 0 || viewportWidth <= 0) return keyScaleMax
  const scale = viewportWidth / fullWidth
  return scale > keyScaleMax ? keyScaleMax : scale
}

/// Shifts the keybed so its midpoint lines up with the middle of `viewportWidth`.
/// The value is negative when the keyboard is wider than the screen.
export function centeredKeyboardOffset(width: number, viewportWidth: number): number {
  return (viewportWidth - width) / 2
}

export type KeyboardScrollRange = {
  minimum: number
  maximum: number
}

export function clampScroll(range: KeyboardScrollRange, offset: number): number {
  return Math.min(range.maximum, Math.max(range.minimum, offset))
}

export function keyboardScrollRange(width: number, viewportWidth: number): KeyboardScrollRange {
  if (viewportWidth <= 0) return { minimum: 0, maximum: 0 }
  if (width <= viewportWidth) {
    const centered = centeredKeyboardOffset(width, viewportWidth)
    return { minimum: centered, maximum: centered }
  }
  return { minimum: viewportWidth - width, maximum: 0 }
}

export function octaveScrollDistance(scale: number): number {
  return whiteKeyWidthMm * scale * ipadProPointsPerMillimeter * 7
}

/// Points per second. A slower release stays where the finger left it.
export const keyboardOctaveFlingSpeed = 450

/// Points per second. At this speed and above, the keybed runs to A0 or C8.
export const keyboardEndFlingSpeed = 1600

export type KeyboardFling = 'settle' | 'octave' | 'end'

export function keyboardFling(velocity: number): KeyboardFling {
  const speed = Math.abs(velocity)
  if (speed >= keyboardEndFlingSpeed) return 'end'
  if (speed >= keyboardOctaveFlingSpeed) return 'octave'
  return 'settle'
}

/// Positive velocity moves the keybed right, toward A0. Negative moves it left, toward C8.
export function keyboardScrollTarget(
  offset: number,
  velocity: number,
  range: KeyboardScrollRange,
  octaveDistance: number,
): number {
  const direction = velocity >= 0 ? 1 : -1
  switch (keyboardFling(velocity)) {
    case 'settle':
      return clampScroll(range, offset)
    case 'octave':
      return clampScroll(range, offset + direction * octaveDistance)
    case 'end':
      return direction > 0 ? range.maximum : range.minimum
  }
}

/// Resistance past either end. `overscroll` is how far the finger has gone beyond the end.
export function keyboardRubberBand(overscroll: number, viewportWidth: number): number {
  const dimension = Math.max(viewportWidth, 1)
  const over = Math.max(0, overscroll)
  return dimension * (1 - 1 / (over / dimension + 1)) * 0.45
}

/// How strongly to draw the strip's end marks. 0 hides a mark.
/// `left` is remaining travel toward A0. `right` is remaining travel toward C8.
export function keyboardEdgeCue(offset: number, range: KeyboardScrollRange): { left: number; right: number } {
  return {
    left: edgeCueStrength(range.maximum - offset),
    right: edgeCueStrength(offset - range.minimum),
  }
}

const edgeCueHidden = 12
const edgeCueFull = 56

function edgeCueStrength(remaining: number): number {
  if (remaining <= edgeCueHidden) return 0
  if (remaining >= edgeCueFull) return 1
  return (remaining - edgeCueHidden) / (edgeCueFull - edgeCueHidden)
}

export type KeyboardPageDirection = 'lower' | 'higher'

/// Next offset after tapping an end mark.
/// Toward the lower notes, the leftmost fully visible white key becomes the rightmost.
/// Toward the higher notes, the rightmost fully visible white key becomes the leftmost.
export function keyboardPageTarget(
  offset: number,
  direction: KeyboardPageDirection,
  viewportWidth: number,
  whiteKeyWidth: number,
  range: KeyboardScrollRange,
): number {
  if (whiteKeyWidth <= 0 || viewportWidth <= 0) return clampScroll(range, offset)
  const index =
    direction === 'lower'
      ? leftmostFullWhite(offset, viewportWidth, whiteKeyWidth)
      : rightmostFullWhite(offset, viewportWidth, whiteKeyWidth)
  if (index === null) {
    const step = direction === 'lower' ? whiteKeyWidth : -whiteKeyWidth
    return clampScroll(range, offset + step)
  }
  const parked = direction === 'lower' ? viewportWidth - (index + 1) * whiteKeyWidth : -index * whiteKeyWidth
  return clampScroll(range, parked)
}

/// Seconds for an arrow page. Long enough to see the keys pass.
export function keyboardPageDuration(distance: number): number {
  return Math.min(0.8, Math.max(0.42, distance / 1100))
}

const fullWhiteSlop = 0.5

function leftmostFullWhite(offset: number, viewportWidth: number, whiteKeyWidth: number): number | null {
  const index = Math.ceil((-offset - fullWhiteSlop) / whiteKeyWidth)
  return fullWhite(index, offset, viewportWidth, whiteKeyWidth)
}

function rightmostFullWhite(offset: number, viewportWidth: number, whiteKeyWidth: number): number | null {
  const index = Math.floor((viewportWidth - offset + fullWhiteSlop) / whiteKeyWidth) - 1
  return fullWhite(index, offset, viewportWidth, whiteKeyWidth)
}

function fullWhite(index: number, offset: number, viewportWidth: number, whiteKeyWidth: number): number | null {
  const screenLeft = offset + index * whiteKeyWidth
  if (screenLeft >= -fullWhiteSlop && screenLeft + whiteKeyWidth <= viewportWidth + fullWhiteSlop) return index
  return null
}

export function keyboardOffsetForDrag(
  unbandedOffset: number,
  range: KeyboardScrollRange,
  viewportWidth: number,
): number {
  if (unbandedOffset > range.maximum) {
    return range.maximum + keyboardRubberBand(unbandedOffset - range.maximum, viewportWidth)
  }
  if (unbandedOffset < range.minimum) {
    return range.minimum - keyboardRubberBand(range.minimum - unbandedOffset, viewportWidth)
  }
  return unbandedOffset
}

/// Black keys are tested first so a touch on the overlap plays the black key.
export function noteAt(x: number, y: number, keys: readonly PianoKey[]): number | null {
  for (const key of keys) {
    if (key.isBlack && keyContains(key.rect, x, y)) return key.midiNote
  }
  for (const key of keys) {
    if (!key.isBlack && keyContains(key.rect, x, y)) return key.midiNote
  }
  return null
}

export type NoteBadgeStyle = {
  width: number
  height: number
  cornerRadius: number
  fontSize: number
}

export type NoteBadgeMeasure = (text: string, fontSize: number) => { width: number; height: number }

/// One size for every white-key name. `measure` supplies the font, because Futura is not in this runtime.
export function noteBadgeStyle(visualKeyWidth: number, measure: NoteBadgeMeasure): NoteBadgeStyle | null {
  const width = visualKeyWidth * 0.8
  if (width < 8) return null
  const labels: string[] = []
  for (let midi = lowestMidiNote; midi <= highestMidiNote; midi += 1) {
    if (!isBlackKey(midi)) labels.push(noteLabel(midi).toUpperCase())
  }
  const sampleSize = 20
  let widest = labels[0]
  if (widest === undefined) return null
  for (const label of labels) {
    if (measure(label, sampleSize).width > measure(widest, sampleSize).width) widest = label
  }
  const sampleWidth = measure(widest, sampleSize).width
  if (sampleWidth <= 0) return null
  const fontSize = (sampleSize * (width * 0.82)) / sampleWidth
  const height = measure(widest, fontSize).height / 0.72
  return { width, height, cornerRadius: height * 0.28, fontSize }
}
