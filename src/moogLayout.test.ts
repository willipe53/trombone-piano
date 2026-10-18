import { describe, expect, it } from 'vitest'
import { ipadProPointsPerMillimeter, whiteKeyHeightMm } from './geometry'
import { MoogLayout } from './moogLayout'

describe('moog layout', () => {
  it('makes the rosewood bar one third of the keys when the panel still fits', () => {
    const keyHeight = 200
    const layout = MoogLayout.layout(1000, keyHeight)
    expect(layout.woodHeight).toBe((keyHeight / 3) * MoogLayout.barHeightFactor)
    expect(layout.panelHeight).toBe(1000 - keyHeight - (keyHeight / 3) * MoogLayout.barHeightFactor)
  })

  it('yields the bar when a full-height bar would hide the panel', () => {
    const viewport = 1032
    const keyHeight = 624
    const layout = MoogLayout.layout(viewport, keyHeight)
    const roomLeftAfterPanel = viewport - keyHeight - MoogLayout.minPanelHeight
    expect(Math.abs(layout.woodHeight - (roomLeftAfterPanel / 3) * MoogLayout.barHeightFactor)).toBeLessThanOrEqual(0.001)
    expect(layout.panelHeight).toBeGreaterThanOrEqual(MoogLayout.minPanelHeight)
    expect(layout.panelHeight + layout.woodHeight).toBe(viewport - keyHeight)
  })

  it('keeps the panel and a draggable strip on a short screen', () => {
    const viewport = 375
    const keyHeight = MoogLayout.maxVisibleKeyHeight(viewport)
    const layout = MoogLayout.layout(viewport, keyHeight)
    expect(layout.panelHeight).toBeGreaterThanOrEqual(MoogLayout.minPanelHeight - 0.01)
    expect(Math.abs(layout.woodHeight - MoogLayout.minWoodHeight)).toBeLessThanOrEqual(0.01)
  })

  it('still fits full-size keys in an 11-inch landscape', () => {
    const fullVisible = whiteKeyHeightMm * ipadProPointsPerMillimeter * 0.85
    expect(fullVisible).toBeLessThanOrEqual(MoogLayout.maxVisibleKeyHeight(834))
  })
})
