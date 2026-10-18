export type MoogFrame = {
  panelHeight: number
  woodHeight: number
}

const minPanelHeight = 188
/// Tall enough to drag the keyboard. The layout formula turns a larger leftover into this strip.
const minWoodHeight = 44
/// Extra bar height around the trombone drawing, which stays at the previous bar height.
const barHeightFactor = 1.2

export const MoogLayout = {
  minPanelHeight,
  minWoodHeight,
  barHeightFactor,

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
