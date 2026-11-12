export type MoogFrame = {
  panelHeight: number
  woodHeight: number
}

const minPanelHeight = 188
/// Tall enough to drag the keyboard. The layout formula turns a larger leftover into this strip.
const minWoodHeight = 44
/// Extra bar height around the trombone drawing, which stays at the previous bar height.
const barHeightFactor = 1.4
/// One row of pointers and position labels under the horn.
const positionLane = 28
const laneKeyRemainder = 48

export const MoogLayout = {
  minPanelHeight,
  minWoodHeight,
  barHeightFactor,
  positionLane,

  /// On-screen key height that still leaves the panel and a draggable strip.
  maxVisibleKeyHeight(viewportHeight: number): number {
    const reserved = minPanelHeight + (minWoodHeight * 3) / barHeightFactor
    return Math.max(0, viewportHeight - reserved)
  },

  layout(viewportHeight: number, keyHeight: number, panelFloor = minPanelHeight): MoogFrame {
    const room = Math.min(Math.max(viewportHeight - keyHeight, 0), viewportHeight)
    const availableForWood = Math.max(0, room - panelFloor)
    const natural = (Math.min(keyHeight, availableForWood) / 3) * barHeightFactor
    const woodHeight = Math.min(
      availableForWood,
      Math.max(natural, Math.min(minWoodHeight, availableForWood)),
    )
    return {
      panelHeight: room - woodHeight,
      woodHeight,
    }
  },
}

/// Wood strip inside a band that holds only that strip and the keys.
export function woodHeightForBand(bandHeight: number): number {
  if (bandHeight <= 0) return 0
  const ratio = barHeightFactor / 3
  const natural = (bandHeight * ratio) / (1 + ratio)
  const floor = Math.min(minWoodHeight, bandHeight / 2)
  const horn = Math.min(bandHeight, Math.max(floor, natural))
  const lane = Math.min(positionLane, Math.max(0, bandHeight - horn - laneKeyRemainder))
  return Math.min(bandHeight, horn + lane)
}

/// Bottom of a strip produced by `woodHeightForBand` that holds the position marks.
export function laneForStrip(stripHeight: number): number {
  if (stripHeight <= minWoodHeight) return 0
  return Math.min(positionLane, stripHeight - minWoodHeight)
}

/// Height of the wood strip plus the keys for a given key height.
export function keyboardBlockHeight(viewportHeight: number, keyHeight: number): number {
  return MoogLayout.layout(viewportHeight, keyHeight).woodHeight + Math.max(0, keyHeight)
}

/// Scale whose keyboard block is `blockHeight`, clamped to the slider range.
export function scaleForKeyboardBlock(
  viewportHeight: number,
  blockHeight: number,
  minScale: number,
  maxScale: number,
  keyHeightForScale: (scale: number) => number,
): number {
  const low = Math.min(minScale, maxScale)
  const high = Math.max(minScale, maxScale)
  const at = (scale: number) => keyboardBlockHeight(viewportHeight, Math.max(0, keyHeightForScale(scale)))
  if (blockHeight >= at(high)) return high
  if (blockHeight <= at(low)) return low
  let lo = low
  let hi = high
  for (let step = 0; step < 24; step += 1) {
    const mid = (lo + hi) / 2
    if (at(mid) > blockHeight) hi = mid
    else lo = mid
  }
  return (lo + hi) / 2
}
