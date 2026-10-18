import { useMemo } from 'react'
import { Group, Path, Skia } from '@shopify/react-native-skia'
import type { MusicOutline } from './musicOutlines'

export function MusicGlyph({
  outline,
  x,
  y,
  spacing,
  color,
  centered,
}: {
  outline: MusicOutline
  x: number
  y: number
  spacing: number
  color: string
  centered?: boolean
}) {
  const path = useMemo(() => Skia.Path.MakeFromSVGString(outline.d), [outline])
  if (!path) return null
  const originX = centered ? x - (outline.advance * spacing) / 2 : x
  return (
    <Group transform={[{ translateX: originX }, { translateY: y }, { scale: spacing }]}>
      <Path path={path} color={color} style="fill" />
    </Group>
  )
}
