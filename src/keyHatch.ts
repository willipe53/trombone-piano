export type KeyHatch = 'crosshatch' | 'stripes' | 'lines' | 'grid' | 'chevron'

export const keyHatches: readonly KeyHatch[] = ['crosshatch', 'stripes', 'lines', 'grid', 'chevron']

type Box = { left: number; top: number; width: number; height: number }

/// SVG path for the hatch clipped to one key. Coordinates are the key's visual box.
export function hatchPath(hatch: KeyHatch, box: Box, spacing: number): string {
  if (spacing <= 0 || box.width <= 0 || box.height <= 0) return ''
  const right = box.left + box.width
  const bottom = box.top + box.height
  const parts: string[] = []
  if (hatch === 'crosshatch' || hatch === 'stripes') {
    let offset = -box.height
    while (offset < box.width) {
      parts.push(`M ${box.left + offset} ${box.top} L ${box.left + offset + box.height} ${bottom}`)
      offset += spacing
    }
  }
  if (hatch === 'crosshatch') {
    let offset = 0
    while (offset < box.width + box.height) {
      parts.push(`M ${box.left + offset} ${box.top} L ${box.left + offset - box.height} ${bottom}`)
      offset += spacing
    }
  }
  if (hatch === 'lines' || hatch === 'grid') {
    let y = box.top + spacing / 2
    while (y < bottom) {
      parts.push(`M ${box.left} ${y} L ${right} ${y}`)
      y += spacing
    }
  }
  if (hatch === 'grid') {
    let x = box.left + spacing / 2
    while (x < right) {
      parts.push(`M ${x} ${box.top} L ${x} ${bottom}`)
      x += spacing
    }
  }
  if (hatch === 'chevron') {
    const pitch = spacing * 1.35
    const rise = spacing * 0.42
    let baseline = box.top - pitch
    while (baseline < bottom + pitch) {
      let x = box.left - spacing
      let high = false
      let command = `M ${x} ${baseline}`
      while (x < right + spacing) {
        x += spacing
        high = !high
        command += ` L ${x} ${baseline + (high ? -rise : rise)}`
      }
      parts.push(command)
      baseline += pitch
    }
  }
  return parts.join(' ')
}
