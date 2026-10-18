import { Canvas, Group, Line } from '@shopify/react-native-skia'
import { MusicGlyph } from './MusicGlyph'
import { flatOutline, sharpOutline } from './musicOutlines'
import { keySignatureGlyphLayout } from './keySignatureLayout'
import type { KeySignature, ScoreStaff } from './scoreNotation'

/// One surface for the whole menu. A canvas per key exhausts the browser's WebGL contexts, and Chrome then paints the broken-image mark.
export function KeySignatureSheet({
  signatures,
  staff,
  chosenId,
  width,
  rowHeight,
  glyphHeight,
}: {
  signatures: readonly KeySignature[]
  staff: ScoreStaff
  chosenId: string
  width: number
  rowHeight: number
  glyphHeight: number
}) {
  const height = signatures.length * rowHeight
  const inset = (rowHeight - glyphHeight) / 2
  return (
    <Canvas style={{ position: 'absolute', left: 12, top: 0, width, height }} pointerEvents="none">
      {signatures.map((signature, index) => (
        <SignatureDrawing
          key={signature.id}
          signature={signature}
          staff={staff}
          width={width}
          height={glyphHeight}
          color={signature.id === chosenId ? '#FFFFFF' : '#BDBDBD'}
          y={index * rowHeight + inset}
        />
      ))}
    </Canvas>
  )
}

function SignatureDrawing({
  signature,
  staff,
  width,
  height,
  color,
  y,
}: {
  signature: KeySignature
  staff: ScoreStaff
  width: number
  height: number
  color: string
  y: number
}) {
  const layout = keySignatureGlyphLayout(width, height, staff, signature)
  return (
    <Group transform={[{ translateY: y }]}>
      {layout.lines.map((line) => (
        <Line
          key={line.y}
          p1={{ x: 0, y: line.y }}
          p2={{ x: line.x2, y: line.y }}
          color={fade(color)}
          strokeWidth={1}
        />
      ))}
      {layout.marks.map((mark, index) => (
        <MusicGlyph
          key={index}
          outline={mark.accidental === 'sharp' ? sharpOutline : flatOutline}
          x={mark.x}
          y={mark.y}
          spacing={layout.spacing}
          color={color}
          centered
        />
      ))}
    </Group>
  )
}

function fade(color: string): string {
  const hex = color.replace('#', '')
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  return `rgba(${red},${green},${blue},0.72)`
}
