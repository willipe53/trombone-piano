import { useMemo } from 'react'
import { Canvas, Group, Line, Oval, Path, Skia, Text, useFont } from '@shopify/react-native-skia'
import { MusicGlyph } from './MusicGlyph'
import { bassOutline, flatOutline, naturalOutline, sharpOutline, tenorOutline, trebleOutline } from './musicOutlines'
import { clefReference, type DrawnClef } from './panelMeasure'
import { measureStaff, type StaffMetrics } from './scoreMeasure'
import {
  noteBelongsOnDrawnStaff,
  signatureMarks,
  trombonePositionLabel,
  visibleScoreColumns,
  writtenNotes,
  type KeySignature,
  type KeyboardInstrument,
  type ScoreColumn,
  type ScoreStaff as StaffName,
  type TromboneHorn,
} from './scoreNotation'

const ink = 'rgba(255,255,255,0.72)'
const labelTypeface = require('../assets/fonts/Roboto-Medium.ttf')

type Metrics = StaffMetrics

export function ScoreStaff({
  width,
  height,
  instrument,
  horn,
  showPositions,
  keySignature,
  columns,
  shiftColumns,
  columnSlot,
  columnHead,
  visibleCount,
}: {
  width: number
  height: number
  instrument: KeyboardInstrument
  horn: TromboneHorn
  showPositions: boolean
  keySignature: KeySignature
  columns: readonly ScoreColumn[]
  shiftColumns: number
  columnSlot?: number
  columnHead?: number
  visibleCount: number
}) {
  const metrics = useMemo(() => {
    const measured = measureStaff(width, height, instrument, keySignature)
    if (!measured || !columnSlot || !columnHead) return measured
    return { ...measured, slot: columnSlot, headWidth: columnHead }
  }, [width, height, instrument, keySignature, columnSlot, columnHead])
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
      {visibleScoreColumns(columns, visibleCount).columns.map((column, index, shown) => {
        const pad = Math.max(0, visibleCount - shown.length)
        const centerX = metrics.noteLeft + (pad + index + shiftColumns) * metrics.slot + metrics.slot / 2
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
