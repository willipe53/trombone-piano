import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, PanResponder, StyleSheet, Text, View, type ViewInstance } from 'react-native'
import { Canvas, Circle, Line, Oval } from '@shopify/react-native-skia'
import { nearestSlot, type SlotPoint } from './boardHit'
import { MusicGlyph } from './MusicGlyph'
import { bassOutline, flatOutline, sharpOutline } from './musicOutlines'
import { clefPlacement } from './panelMeasure'
import { ScaleInventoryDeal } from './scaleInventory'
import { signatureMarks, writtenNote } from './scoreNotation'

export function ScaleBoard({
  deal,
  onPlace,
}: {
  deal: ScaleInventoryDeal
  onPlace: (midi: number, slot: number) => boolean
}) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const spacing = Math.min(14, Math.max(8, size.height * 0.045))
  const staffTop = spacing * 3.2
  const placement = clefPlacement('bass', spacing, (_staff, step) => staffTop + (-2 - step) * (spacing / 2))
  const marks = signatureMarks(deal.key, 'bass')
  const signatureX = 28 + spacing * 2.4
  const signatureEnd = signatureX + marks.length * spacing * 1.15 + spacing
  const slots = useMemo(() => {
    const points: SlotPoint[] = []
    const span = Math.max(1, size.width - signatureEnd - 24)
    deal.notes.forEach((midi, slot) => {
      const written = writtenNote(midi, 'trombone', deal.key)
      points.push({
        slot,
        x: signatureEnd + ((slot + 0.5) * span) / deal.notes.length,
        y: staffTop + (-2 - written.step) * (spacing / 2),
      })
    })
    return points
  }, [deal, signatureEnd, size.width, spacing, staffTop])
  const missing = [...deal.missing].sort((a, b) => a - b)
  const host = useRef<ViewInstance>(null)
  const origin = useRef({ x: 0, y: 0 })
  return (
    <View
      ref={host}
      style={{ flex: 1 }}
      onLayout={(event) => {
        setSize(event.nativeEvent.layout)
        host.current?.measureInWindow((x, y) => {
          origin.current = { x, y }
        })
      }}
    >
      {size.width > 0 ? (
        <Canvas style={{ width: size.width, height: size.height }} pointerEvents="none">
          {[0, 1, 2, 3, 4].map((line) => (
            <Line
              key={line}
              p1={{ x: 8, y: staffTop + line * spacing }}
              p2={{ x: size.width - 8, y: staffTop + line * spacing }}
              color="rgba(255,255,255,0.7)"
              strokeWidth={1}
            />
          ))}
          <MusicGlyph outline={bassOutline} x={placement.x} y={placement.baseline} spacing={spacing} color="#FFFFFF" />
          {marks.map((mark, index) => (
            <MusicGlyph
              key={index}
              outline={mark.accidental === 'sharp' ? sharpOutline : flatOutline}
              x={signatureX + index * spacing * 1.15}
              y={staffTop + (-2 - mark.step) * (spacing / 2)}
              spacing={spacing}
              color="#FFFFFF"
              centered
            />
          ))}
          {slots.map((slot) =>
            deal.missing.has(slot.slot) ? (
              <Circle key={slot.slot} cx={slot.x} cy={slot.y} r={14} style="stroke" strokeWidth={1} color="rgba(255,255,255,0.45)" />
            ) : (
              <Oval key={slot.slot} x={slot.x - 8} y={slot.y - 6} width={16} height={12} color="#FFFFFF" />
            ),
          )}
        </Canvas>
      ) : null}
      <View style={styles.chips}>
        {missing.map((slot) => (
          <ScaleChip
            key={`${deal.key.id}-${slot}-${deal.notes[slot]}`}
            label={chipLabel(deal.notes[slot], deal.key.accidentals < 0)}
            onDrop={(pageX, pageY) => {
              const point = { x: pageX - origin.current.x, y: pageY - origin.current.y }
              const hit = nearestSlot(point, slots, deal.missing)
              if (hit === null) return false
              return onPlace(deal.notes[slot], hit)
            }}
          />
        ))}
      </View>
    </View>
  )
}

function chipLabel(midi: number, flats: boolean): string {
  const sharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const flat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
  const names = flats ? flat : sharp
  return names[((midi % 12) + 12) % 12]
}

function ScaleChip({ label, onDrop }: { label: string; onDrop: (pageX: number, pageY: number) => boolean }) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const point = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const id = pan.addListener((value) => {
      point.current = value
    })
    return () => pan.removeListener(id)
  }, [pan])
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: point.current.x, y: point.current.y })
        pan.setValue({ x: 0, y: 0 })
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (event) => {
        pan.flattenOffset()
        const landed = onDrop(event.nativeEvent.pageX, event.nativeEvent.pageY)
        if (landed) return
        Animated.timing(pan, {
          toValue: { x: 0, y: 0 },
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start()
      },
    }),
  ).current
  return (
    <Animated.View
      style={[styles.chip, { transform: pan.getTranslateTransform() }]}
      {...responder.panHandlers}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  chips: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    width: 44,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#8A8A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { color: '#FFFFFF', fontSize: 13 },
})
