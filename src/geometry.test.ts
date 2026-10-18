import { describe, expect, it } from 'vitest'
import { DartRandom } from './dartRandom'
import {
  blackKeyWidthRatio,
  centeredKeyboardOffset,
  clampScroll,
  highestMidiNote,
  ipadProPointsPerMillimeter,
  isBlackKey,
  keyBottom,
  keyboardEdgeCue,
  keyboardEndFlingSpeed,
  keyboardPageDuration,
  keyboardPageTarget,
  keyboardFling,
  keyboardOctaveFlingSpeed,
  keyboardOffsetForDrag,
  keyboardScrollRange,
  keyboardScrollTarget,
  keyboardWidth,
  keyRight,
  keyScaleMax,
  layoutKeyboard,
  lowestMidiNote,
  noteAt,
  noteBadgeStyle,
  noteLabel,
  octaveScrollDistance,
  scaleThatFitsKeyboard,
  whiteKeyHeightMm,
  whiteKeyWidthMm,
} from './geometry'

function close(actual: number, expected: number, accuracy = 0.001) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(accuracy)
}

describe('piano geometry', () => {
  it('draws full-size white keys at 22 by 120 millimeters', () => {
    const white = layoutKeyboard(1).find((key) => !key.isBlack)
    expect(white).toBeDefined()
    close(white!.rect.width, whiteKeyWidthMm * ipadProPointsPerMillimeter)
    close(white!.rect.height, whiteKeyHeightMm * ipadProPointsPerMillimeter)
    expect(blackKeyWidthRatio).toBe(0.6)
  })

  it('fits about an octave and a half on an 11-inch iPad Pro', () => {
    const landscapeWidth = 1210
    const whiteWidth = layoutKeyboard(1).find((key) => !key.isBlack)!.rect.width
    close(landscapeWidth / whiteWidth, 10.5, 0.15)
  })

  it('fits all 88 keys across the screen at the minimum scale', () => {
    const landscapeWidth = 1210
    const scale = scaleThatFitsKeyboard(landscapeWidth)
    const keys = layoutKeyboard(scale)
    const width = keyboardWidth(keys)
    const offset = centeredKeyboardOffset(width, landscapeWidth)
    expect(scale).toBeLessThan(keyScaleMax)
    close(width, landscapeWidth, 0.01)
    close(keys[0].rect.left + offset, 0, 0.01)
    close(keyRight(keys[keys.length - 1].rect) + offset, landscapeWidth, 0.01)
  })

  it('labels notes in scientific pitch', () => {
    expect(noteLabel(21)).toBe('A0')
    expect(noteLabel(60)).toBe('C4')
    expect(noteLabel(108)).toBe('C8')
  })

  it('is the 88 keys from A0 through C8', () => {
    const keys = layoutKeyboard(1)
    expect(keys).toHaveLength(88)
    expect(keys[0].midiNote).toBe(lowestMidiNote)
    expect(keys[keys.length - 1].midiNote).toBe(highestMidiNote)
    expect(keys.filter((key) => !key.isBlack)).toHaveLength(52)
    expect(keys.filter((key) => key.isBlack)).toHaveLength(36)
  })

  it('centers the window on the middle of the keyboard', () => {
    const landscapeWidth = 1210
    const keys = layoutKeyboard(1)
    const width = keyboardWidth(keys)
    const offset = centeredKeyboardOffset(width, landscapeWidth)
    const visibleCenter = -offset + landscapeWidth / 2
    close(visibleCenter, width / 2)
    expect(keyRight(keys[0].rect) + offset).toBeLessThan(0)
    expect(keys[keys.length - 1].rect.left + offset).toBeGreaterThan(landscapeWidth)
  })

  it('centers C sharp on the gap after C and lets it win the overlap', () => {
    const keys = layoutKeyboard(1)
    const c = keys.find((key) => key.midiNote === 60)!
    const cSharp = keys.find((key) => key.midiNote === 61)!
    const boundary = keyRight(c.rect)
    const center = cSharp.rect.left + cSharp.rect.width / 2
    close(center, boundary)
    expect(noteAt(center, cSharp.rect.height / 2, keys)).toBe(61)
    expect(noteAt(c.rect.left + c.rect.width / 2, keyBottom(c.rect) - 1, keys)).toBe(60)
  })

  it('puts no black key between E and F', () => {
    const keys = layoutKeyboard(1)
    const e = keys.find((key) => key.midiNote === 64)!
    const f = keys.find((key) => key.midiNote === 65)!
    expect(e.isBlack).toBe(false)
    expect(f.isBlack).toBe(false)
    close(f.rect.left, keyRight(e.rect))
  })

  it('uses one badge size for every white-key name', () => {
    const measure = (text: string, fontSize: number) => ({ width: text.length * fontSize * 0.5, height: fontSize })
    const style = noteBadgeStyle(90, measure)
    const again = noteBadgeStyle(90, measure)
    expect(style).toEqual(again)
    expect(style).not.toBeNull()
    const labels: string[] = []
    for (let midi = lowestMidiNote; midi <= highestMidiNote; midi += 1) {
      if (!isBlackKey(midi)) labels.push(noteLabel(midi))
    }
    for (const label of labels) {
      expect(measure(label, style!.fontSize).width).toBeLessThanOrEqual(style!.width * 0.82 + 0.5)
    }
  })

  it('parks the ends of a wide keybed on the screen', () => {
    const viewport = 1210
    const width = keyboardWidth(layoutKeyboard(1))
    const range = keyboardScrollRange(width, viewport)
    close(range.maximum, 0)
    close(range.minimum, viewport - width)
    expect(range.minimum).toBeLessThan(centeredKeyboardOffset(width, viewport))
  })

  it('stays centered when the keybed fits', () => {
    const viewport = 1210
    const scale = scaleThatFitsKeyboard(viewport)
    const width = keyboardWidth(layoutKeyboard(scale))
    const centered = centeredKeyboardOffset(width, viewport)
    const range = keyboardScrollRange(width, viewport)
    close(range.minimum, centered)
    close(range.maximum, centered)
  })

  it('chooses settle, octave, or end from the fling speed', () => {
    expect(keyboardFling(449)).toBe('settle')
    expect(keyboardFling(-449)).toBe('settle')
    expect(keyboardFling(keyboardOctaveFlingSpeed)).toBe('octave')
    expect(keyboardFling(-1599)).toBe('octave')
    expect(keyboardFling(keyboardEndFlingSpeed)).toBe('end')
    expect(keyboardFling(-keyboardEndFlingSpeed)).toBe('end')
  })

  it('moves one octave on a gentle fling and runs to the end on a hard one', () => {
    const viewport = 1210
    const width = keyboardWidth(layoutKeyboard(1))
    const range = keyboardScrollRange(width, viewport)
    const origin = centeredKeyboardOffset(width, viewport)
    const octave = octaveScrollDistance(1)
    close(octave, whiteKeyWidthMm * ipadProPointsPerMillimeter * 7)
    close(keyboardScrollTarget(origin, 800, range, octave), origin + octave)
    close(keyboardScrollTarget(origin, -800, range, octave), origin - octave)
    close(keyboardScrollTarget(origin, 2000, range, octave), range.maximum)
    close(keyboardScrollTarget(origin, -2000, range, octave), range.minimum)
  })

  it('stops an octave fling at the end', () => {
    const range = { minimum: -4000, maximum: 0 }
    close(keyboardScrollTarget(-200, 900, range, 800), 0)
    close(keyboardScrollTarget(-200, 200, range, 800), clampScroll(range, -200))
  })

  it('fades the end marks as the keybed reaches either end', () => {
    const range = { minimum: -4000, maximum: 0 }
    const mid = keyboardEdgeCue(-2000, range)
    expect(mid.left).toBe(1)
    expect(mid.right).toBe(1)
    expect(keyboardEdgeCue(0, range).left).toBe(0)
    expect(keyboardEdgeCue(0, range).right).toBe(1)
    expect(keyboardEdgeCue(-4000, range).left).toBe(1)
    expect(keyboardEdgeCue(-4000, range).right).toBe(0)
    const nearLow = keyboardEdgeCue(-20, range).left
    expect(nearLow).toBeGreaterThan(0)
    expect(nearLow).toBeLessThan(1)
    const fitted = keyboardEdgeCue(0, { minimum: 0, maximum: 0 })
    expect(fitted.left).toBe(0)
    expect(fitted.right).toBe(0)
    expect(keyboardEdgeCue(40, range).left).toBe(0)
  })

  it('pages so the white key at the tapped end stays visible at the other end', () => {
    const width = 50
    const viewport = 300
    const range = { minimum: -2000, maximum: 0 }
    const offset = -420
    const lower = keyboardPageTarget(offset, 'lower', viewport, width, range)
    close(lower + 10 * width, viewport)
    expect(lower).toBeGreaterThan(offset)
    const higher = keyboardPageTarget(offset, 'higher', viewport, width, range)
    close(higher + 13 * width, 0)
    expect(higher).toBeLessThan(offset)
  })

  it('keeps a page inside the keyboard and shorter than an octave of large keys', () => {
    const range = { minimum: -4000, maximum: 0 }
    close(keyboardPageTarget(-10, 'lower', 300, 50, range), 0)
    close(keyboardPageTarget(-4000, 'higher', 300, 50, range), -4000)
    const large = Math.abs(keyboardPageTarget(-400, 'higher', 500, 180, range) - -400)
    expect(large).toBeGreaterThan(0)
    expect(large).toBeLessThan(180 * 7)
    expect(keyboardPageDuration(700)).toBeGreaterThanOrEqual(0.42)
    expect(keyboardPageDuration(20)).toBeGreaterThanOrEqual(0.42)
  })

  it('resists a drag past either end', () => {
    const range = { minimum: -4000, maximum: 0 }
    const dragged = keyboardOffsetForDrag(300, range, 1000)
    expect(dragged).toBeGreaterThan(0)
    expect(dragged).toBeLessThan(300)
    const otherEnd = keyboardOffsetForDrag(-4300, range, 1000)
    expect(otherEnd).toBeLessThan(-4000)
    expect(otherEnd).toBeGreaterThan(-4300)
    close(keyboardOffsetForDrag(-1500, range, 1000), -1500)
  })
})

describe('dart random', () => {
  it('matches Dart for seed 4', () => {
    const random = new DartRandom(4)
    const expected = [
      0.286950384253, 0.933533458132, 0.11693869178, 0.708032015485, 0.104112019888, 0.561487004798,
      0.992777628036, 0.570393295484,
    ]
    for (const value of expected) close(random.nextDouble(), value, 0.000000001)
  })
})
