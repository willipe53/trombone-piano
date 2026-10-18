export type HitRect = {
  column: number
  x: number
  y: number
  width: number
  height: number
}

export type BoardRect = { x: number; y: number; width: number; height: number }

function contains(rect: { x: number; y: number; width: number; height: number }, point: { x: number; y: number }): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height
}

function centerDistance(point: { x: number; y: number }, rect: HitRect): number {
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  return Math.hypot(point.x - cx, point.y - cy)
}

/// The column whose hit rect contains the point. Overlaps pick the nearest center.
export function columnAt(point: { x: number; y: number }, rects: readonly HitRect[]): number | null {
  const hits = rects.filter((rect) => contains(rect, point))
  if (hits.length === 0) return null
  let best = hits[0]
  let bestDistance = centerDistance(point, best)
  for (const hit of hits.slice(1)) {
    const distance = centerDistance(point, hit)
    if (distance < bestDistance) {
      best = hit
      bestDistance = distance
    }
  }
  return best.column
}

export type SlotPoint = { slot: number; x: number; y: number }

/// A missing slot within 36pt. A filled slot is ignored even when it is closer.
export function nearestSlot(
  point: { x: number; y: number },
  slots: readonly SlotPoint[],
  missing: ReadonlySet<number>,
  reach = 36,
): number | null {
  let best: number | null = null
  let bestDistance = reach
  for (const slot of slots) {
    if (!missing.has(slot.slot)) continue
    const distance = Math.hypot(point.x - slot.x, point.y - slot.y)
    if (distance <= bestDistance) {
      best = slot.slot
      bestDistance = distance
    }
  }
  return best
}

/// Waste on the left, columns rising from the bottom card.
export function golfBoardLayout(
  bounds: { width: number; height: number },
  depths: readonly number[],
): { waste: BoardRect; columns: BoardRect[][]; hits: HitRect[] } {
  const gap = 8
  const margin = 12
  const height = Math.max(36, Math.min(86, (bounds.height - margin * 2 - gap * 2) / 3))
  const wasteWidth = Math.min(88, Math.max(64, bounds.width * 0.18))
  const columnsLeft = margin + wasteWidth + gap * 2
  const columnsWidth = Math.max(0, bounds.width - columnsLeft - margin)
  const count = Math.max(depths.length, 1)
  const cardWidth = Math.max(30, Math.min(78, (columnsWidth - gap * (count - 1)) / count))
  const waste = {
    x: margin,
    y: bounds.height - margin - height,
    width: wasteWidth,
    height,
  }
  const rowWidth = count * cardWidth + gap * (count - 1)
  const originX = columnsLeft + Math.max(0, (columnsWidth - rowWidth) / 2)
  const columns: BoardRect[][] = []
  const hits: HitRect[] = []
  depths.forEach((depth, index) => {
    const rects: BoardRect[] = []
    const x = originX + index * (cardWidth + gap)
    for (let cardIndex = 0; cardIndex < depth; cardIndex += 1) {
      const y = bounds.height - margin - height - cardIndex * (height * 0.72)
      const rect = { x, y, width: cardWidth, height }
      rects.push(rect)
      if (cardIndex === 0) hits.push({ column: index, ...rect })
    }
    columns.push(rects)
  })
  return { waste, columns, hits }
}
