import { useMemo } from 'react'
import { Canvas, Group, Line, Oval, Path, Skia, Text, useFont } from '@shopify/react-native-skia'
import { MusicGlyph } from './MusicGlyph'
import { bassOutline, flatOutline, naturalOutline, sharpOutline, tenorOutline, trebleOutline } from './musicOutlines'
import { clefReference, evenClefSlot, type DrawnClef } from './panelMeasure'
import {
  noteBelongsOnDrawnStaff,
  signatureMarks,
  trombonePositionLabel,
  writtenNotes,
  type KeySignature,
  type KeyboardInstrument,
  type ScoreColumn,
  type ScoreStaff as StaffName,
  type TromboneHorn,
} from './scoreNotation'

const ink = 'rgba(255,255,255,0.72)'
const labelTypeface = require('../assets/fonts/Roboto-Medium.ttf')

type Metrics = {
  spacing: number
  trebleTop: number
  bassTop: number
  clefLeft: number
  clefSlot: number
  signatureOrigin: number
  signatureStep: number
  noteLeft: number
  slot: number
  headWidth: number
  headHeight: number
  gapSpaces: number
}

export function ScoreStaff({
  width,
  height,
  instrument,
  horn,
  showPositions,
  keySignature,
  columns,
  shiftColumns,
}: {
  width: number
  height: number
  instrument: KeyboardInstrument
  horn: TromboneHorn
  showPositions: boolean
  keySignature: KeySignature
  columns: readonly ScoreColumn[]
  shiftColumns: number
}) {
  const metrics = useMemo(
    () => staffMetrics(width, height, instrument, keySignature),
    [width, height, instrument, keySignature],
  )
  const positionFont = useFont(labelTypeface, Math.max(8, metrics?.headHeight ?? 12))
  if (width <= 0 || height <= 0 || !metrics) return null
  const staves: StaffName[] = instrument === 'trombone' ? ['tenor', 'bass'] : ['treble', 'bass']
  return (
    <Canvas style={{ width, height }}>
      <Brace metrics={metrics} />
      <StaffLines metrics={metrics} width={width} />
      <Clef upper instrument={instrument} metrics={metrics} />
      <Clef upper={false} instrument={instrument} metrics={metrics} />
      {staves.map((staff) =>
        signatureMarks(keySignature, staff).map((mark, index) => (
          <MusicGlyph
            key={`${staff}-${index}`}
            outline={accidentalOutline(mark.accidental)}
            x={metrics.signatureOrigin + index * metrics.signatureStep}
            y={yFor(mark.step, staff, metrics)}
            spacing={metrics.spacing}
            color="#FFFFFF"
            centered
          />
        )),
      )}
      {columns.map((column, index) => {
        const centerX = metrics.noteLeft + (index + shiftColumns) * metrics.slot + metrics.slot / 2
        const written = column.notes.flatMap((event) =>
          writtenNotes(event.midi, instrument, keySignature).map((note) => ({ event, note })),
        )
        const offsets = columnOffsets(written, metrics, staves)
        return written.map((item, noteIndex) => {
          if (!noteBelongsOnDrawnStaff(item.note.staff, item.note.step, metrics.gapSpaces)) return null
          const color = item.event.sounding ? '#FFFFFF' : 'rgba(255,255,255,0.5)'
          const center = {
            x: centerX + offsets[noteIndex],
            y: yFor(item.note.step, item.note.staff, metrics),
          }
          const label =
            showPositions && positionFont ? trombonePositionLabel(item.event.midi, horn) : null
          return (
            <Group key={`${index}-${noteIndex}`}>
              <LedgerLines note={item.note} centerX={center.x} metrics={metrics} color={color} />
              {item.note.accidental ? (
                <MusicGlyph
                  outline={accidentalOutline(item.note.accidental)}
                  x={center.x - metrics.headWidth * 0.9 - metrics.spacing * 0.9}
                  y={center.y}
                  spacing={metrics.spacing}
                  color={color}
                  centered
                />
              ) : null}
              <Group transform={[{ translateX: center.x }, { translateY: center.y }, { rotate: -0.4 }]}>
                <Oval
                  x={-metrics.headWidth / 2}
                  y={-metrics.headHeight / 2}
                  width={metrics.headWidth}
                  height={metrics.headHeight}
                  color={color}
                />
              </Group>
              {label && positionFont ? (
                <Text
                  font={positionFont}
                  text={label}
                  x={center.x - positionFont.getTextWidth(label) / 2}
                  y={center.y - metrics.headHeight / 2 - metrics.spacing * 0.12 - positionFont.getSize()}
                  color={color}
                />
              ) : null}
            </Group>
          )
        })
      })}
    </Canvas>
  )
}

function accidentalOutline(accidental: 'sharp' | 'flat' | 'natural') {
  if (accidental === 'sharp') return sharpOutline
  if (accidental === 'flat') return flatOutline
  return naturalOutline
}

function staffMetrics(
  width: number,
  height: number,
  instrument: KeyboardInstrument,
  keySignature: KeySignature,
): Metrics | null {
  if (width <= 0 || height <= 0) return null
  const inset = 6
  const usable = Math.max(48, height - inset * 2)
  const previousGapSpaces = 20
  const gapSpaces = previousGapSpaces * 0.75
  const marginSpaces = 10
  const spacing = usable / (4 + previousGapSpaces + 4 + marginSpaces * 2)
  const freed = (previousGapSpaces - gapSpaces) * spacing
  const trebleTop = inset + marginSpaces * spacing + freed / 2
  const clefSpaces = Math.max(
    ...(instrument === 'trombone'
      ? [tenorOutline.advance, bassOutline.advance]
      : [trebleOutline.advance, bassOutline.advance]),
  )
  const accidentalSpaces = keySignature.accidentals < 0 ? flatOutline.advance : sharpOutline.advance
  const clefSlot = evenClefSlot(spacing, clefSpaces, accidentalSpaces)
  const signatureOrigin = clefSlot.signatureCenter
  const signatureStep = spacing * 1.1
  const signatureCount = Math.abs(keySignature.accidentals)
  const afterSignature =
    signatureCount > 0
      ? signatureOrigin + (signatureCount - 1) * signatureStep + spacing * 1.8
      : clefSlot.left + clefSlot.width + spacing
  const slot = Math.max(8, ((width - afterSignature - 4) / 10) * 0.5)
  const headWidth = Math.min(slot * 0.62, spacing * 1.28, Math.max(4, (slot - 4) / 2))
  return {
    spacing,
    trebleTop,
    bassTop: trebleTop + (4 + gapSpaces) * spacing,
    clefLeft: clefSlot.left,
    clefSlot: clefSlot.width,
    signatureOrigin,
    signatureStep,
    noteLeft: afterSignature,
    slot,
    headWidth,
    headHeight: spacing * 0.9,
    gapSpaces,
  }
}

function yFor(step: number, staff: StaffName, metrics: Metrics): number {
  const half = metrics.spacing / 2
  if (staff === 'treble') return metrics.trebleTop + (10 - step) * half
  if (staff === 'tenor') return metrics.trebleTop + (2 - step) * half
  return metrics.bassTop + (-2 - step) * half
}

function Brace({ metrics }: { metrics: Metrics }) {
  const top = yFor(10, 'treble', metrics)
  const bottom = yFor(-10, 'bass', metrics)
  const mid = (top + bottom) / 2
  const path = Skia.PathBuilder.Make()
  path.moveTo(8, top)
  path.quadTo(2, top + (mid - top) * 0.72, 1.5, mid)
  path.quadTo(2, mid + (bottom - mid) * 0.28, 8, bottom)
  return <Path path={path.build()} style="stroke" strokeWidth={1.4} color={ink} strokeCap="round" />
}

function StaffLines({ metrics, width }: { metrics: Metrics; width: number }) {
  const lines = [10, 8, 6, 4, 2].map((step) => ({ y: yFor(step, 'treble', metrics), key: `t${step}` }))
  const bass = [-2, -4, -6, -8, -10].map((step) => ({ y: yFor(step, 'bass', metrics), key: `b${step}` }))
  const top = yFor(10, 'treble', metrics)
  const bottom = yFor(-10, 'bass', metrics)
  return (
    <Group>
      {[...lines, ...bass].map((line) => (
        <Line key={line.key} p1={{ x: 12, y: line.y }} p2={{ x: width, y: line.y }} color={ink} strokeWidth={1} />
      ))}
      <Line p1={{ x: 12, y: top }} p2={{ x: 12, y: bottom }} color={ink} strokeWidth={1} />
    </Group>
  )
}

function clefOutline(name: DrawnClef) {
  if (name === 'tenor') return tenorOutline
  if (name === 'treble') return trebleOutline
  return bassOutline
}

function Clef({
  upper,
  instrument,
  metrics,
}: {
  upper: boolean
  instrument: KeyboardInstrument
  metrics: Metrics
}) {
  const name: DrawnClef = upper && instrument === 'trombone' ? 'tenor' : upper ? 'treble' : 'bass'
  const outline = clefOutline(name)
  const reference = clefReference(name)
  const x = metrics.clefLeft + (metrics.clefSlot - outline.advance * metrics.spacing) / 2
  return (
    <MusicGlyph
      outline={outline}
      x={x}
      y={yFor(reference.step, reference.staff, metrics)}
      spacing={metrics.spacing}
      color="#FFFFFF"
    />
  )
}

function LedgerLines({
  note,
  centerX,
  metrics,
  color,
}: {
  note: { staff: StaffName; step: number }
  centerX: number
  metrics: Metrics
  color: string
}) {
  const lineSteps = note.staff === 'treble' ? [2, 4, 6, 8, 10] : note.staff === 'tenor' ? [-6, -4, -2, 0, 2] : [-10, -8, -6, -4, -2]
  const bottom = Math.min(...lineSteps)
  const top = Math.max(...lineSteps)
  const lines: number[] = []
  if (note.step < bottom) {
    for (let line = bottom - 2; line >= note.step; line -= 2) lines.push(line)
  } else if (note.step > top) {
    for (let line = top + 2; line <= note.step; line += 2) lines.push(line)
  }
  const half = metrics.headWidth * 0.85
  return (
    <Group>
      {lines.map((step) => {
        const y = yFor(step, note.staff, metrics)
        return <Line key={step} p1={{ x: centerX - half, y }} p2={{ x: centerX + half, y }} color={color} strokeWidth={1} />
      })}
    </Group>
  )
}

function columnOffsets(
  written: readonly { note: { staff: StaffName; step: number } }[],
  metrics: Metrics,
  staves: readonly StaffName[],
): number[] {
  const offsets = written.map(() => 0)
  for (const staff of staves) {
    const indices = written
      .map((item, index) => ({ index, step: item.note.step, staff: item.note.staff }))
      .filter((item) => item.staff === staff)
      .sort((a, b) => a.step - b.step)
    let previousStep: number | null = null
    let previousOffset = 0
    for (const item of indices) {
      if (previousStep !== null && item.step - previousStep <= 1) {
        previousOffset = previousOffset === 0 ? metrics.headWidth + 2 : 0
        offsets[item.index] = previousOffset
      } else {
        previousOffset = 0
      }
      previousStep = item.step
    }
  }
  return offsets
}
