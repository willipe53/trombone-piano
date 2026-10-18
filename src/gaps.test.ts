import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { columnAt, nearestSlot } from './boardHit'
import { joinLicenseNotice } from './noticeText'
import {
  clefPlacement,
  captionWidth,
  columnPitch,
  controlColumnWidth,
  controlContentWidth,
  controlRockerCount,
  evenClefSlot,
  fittedTitleSize,
  headerClearance,
  paletteRing,
  rowWidth,
  scoreIsAtDefaultView,
  splitPanel,
  storedPaletteColor,
  titleBallSize,
  titleBandHeight,
  titleBlockWidth,
  titleGap,
  titleMarkWidthAtPreferred,
  titleMinimumSize,
  titlePreferredSize,
  titleTopMargin,
  clampScoreMagnification,
  clampScoreOffset,
} from './panelMeasure'
import { scheduledSources } from './playback'

describe('title fit', () => {
  const widthAt = (fontSize: number) => fontSize * 10

  it('stays at 22pt when the line fits', () => {
    expect(fittedTitleSize(220, widthAt)).toBe(titlePreferredSize)
  })

  it('shrinks in half-point steps down to 9pt and stays one size', () => {
    expect(fittedTitleSize(100, widthAt)).toBe(10)
    expect(fittedTitleSize(10, widthAt)).toBe(titleMinimumSize)
  })
})

describe('panel split', () => {
  it('gives the score the space the controls do not use', () => {
    const controls = controlColumnWidth(controlContentWidth(controlRockerCount(false, false)))
    const split = splitPanel(1194, controls)
    expect(controls).toBeLessThan(1194 / 2)
    expect(split.controls).toBe(controls)
    expect(split.score).toBe(1194 - controls)
  })

  it('keeps the controls and gives the score the remainder on a narrow panel', () => {
    const controls = controlColumnWidth(controlContentWidth(3))
    const split = splitPanel(500, controls)
    expect(split.controls).toBe(controls)
    expect(split.score).toBe(500 - controls)
    expect(split.score).toBeLessThan(250)
  })

  it('counts a third rocker only when that control is shown', () => {
    expect(controlRockerCount(false, false)).toBe(2)
    expect(controlContentWidth(2)).toBe(300)
    expect(controlRockerCount(true, false)).toBe(3)
    expect(controlRockerCount(false, true)).toBe(3)
    expect(controlContentWidth(3)).toBeGreaterThan(controlContentWidth(2))
  })

  it('gives a switch column room for its caption', () => {
    expect(columnPitch).toBeGreaterThanOrEqual(captionWidth)
  })

  it('keeps the title block one size until the row is narrower than the wordmark', () => {
    const full = titleMarkWidthAtPreferred + titleGap + titleBallSize
    expect(titleBlockWidth(800)).toBeCloseTo(full)
    expect(titleBlockWidth(full)).toBeCloseTo(full)
    expect(titleBlockWidth(140)).toBeLessThan(full)
    expect(titleBlockWidth(40)).toBeLessThanOrEqual(40)
    expect(headerClearance()).toBe(titleTopMargin + titleBandHeight)
  })

  it('puts the same gap on either side of the clef', () => {
    const spacing = 8
    const clefSpaces = 2.2
    const accidentalSpaces = 0.8
    const slot = evenClefSlot(spacing, clefSpaces, accidentalSpaces)
    const signatureLeft = slot.signatureCenter - (accidentalSpaces * spacing) / 2
    expect(slot.left - 12).toBeCloseTo(signatureLeft - (slot.left + slot.width))
  })
})

describe('staff view', () => {
  it('clamps magnification and offsets and reports the fitted view', () => {
    expect(clampScoreMagnification(8)).toBe(4)
    expect(clampScoreMagnification(0.2)).toBe(1)
    expect(clampScoreOffset(40, -4, 200, 100, 80, 50)).toEqual({ x: 40, y: 0 })
    expect(clampScoreOffset(400, 90, 200, 100, 80, 50)).toEqual({ x: 120, y: 50 })
    expect(scoreIsAtDefaultView(1, 0, 0)).toBe(true)
    expect(scoreIsAtDefaultView(1.03, 0, 0)).toBe(false)
    expect(scoreIsAtDefaultView(1, 1.2, 0)).toBe(false)
  })
})

describe('clef placement', () => {
  it('places the glyph origin on the reference line', () => {
    const y = (staff: string, step: number) => step * 10 + (staff === 'bass' ? 100 : 0)
    expect(clefPlacement('treble', 5, y)).toEqual({ x: 28, baseline: 40 })
    expect(clefPlacement('tenor', 5, y)).toEqual({ x: 18 + 5 * 2.15, baseline: 0 })
    expect(clefPlacement('bass', 5, y)).toEqual({ x: 28, baseline: 60 })
  })
})

describe('palette', () => {
  it('stores an uppercase hex and rings the current swatch', () => {
    expect(storedPaletteColor('#17803a')).toBe('#17803A')
    expect(paletteRing('#17803a', '#17803A')).toBe(true)
    expect(paletteRing('#17803A', '#F4F1EA')).toBe(false)
  })
})

describe('board hits', () => {
  it('picks the nearest golf column when hit rects overlap', () => {
    const rects = [
      { column: 0, x: 0, y: 0, width: 40, height: 40 },
      { column: 1, x: 20, y: 0, width: 40, height: 40 },
    ]
    expect(columnAt({ x: 25, y: 20 }, rects)).toBe(0)
    expect(columnAt({ x: 50, y: 20 }, rects)).toBe(1)
    expect(columnAt({ x: 90, y: 20 }, rects)).toBeNull()
  })

  it('accepts only a missing scale slot within 36pt', () => {
    const slots = [
      { slot: 0, x: 0, y: 0 },
      { slot: 1, x: 40, y: 0 },
      { slot: 2, x: 10, y: 0 },
    ]
    expect(nearestSlot({ x: 8, y: 0 }, slots, new Set([0, 1]))).toBe(0)
    expect(nearestSlot({ x: 8, y: 0 }, slots, new Set([1]))).toBe(1)
    expect(nearestSlot({ x: 0, y: 0 }, slots, new Set([1]))).toBeNull()
  })
})

describe('license notice', () => {
  it('keeps the first paragraph broken and joins the rest', () => {
    const raw = readFileSync(new URL('../swift_version/TrombonePiano/Sounds/NOTICE.txt', import.meta.url), 'utf8')
    const joined = joinLicenseNotice(raw)
    expect(joined.startsWith('Fluid (R3) SoundFont samples\nCopyright')).toBe(true)
    expect(joined).toContain('copy of this software')
    expect(joined).not.toMatch(/\nof this software/)
  })
})

describe('one shot playback', () => {
  it('does not schedule a sustain loop', () => {
    expect(scheduledSources('oneShot', true)).toEqual(['attack'])
    expect(scheduledSources('held', true)).toEqual(['attack', 'sustain'])
  })
})
