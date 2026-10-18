import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, View } from 'react-native'
import { Canvas, Circle, Group, Line, LinearGradient, Path, RadialGradient, Rect, Skia, vec } from '@shopify/react-native-skia'
import { hatchPath, type KeyHatch } from './keyHatch'
import { companionWidth } from './panelMeasure'
import type { MidiAppearance } from 'trombone-midi'

export function MoogFader({
  value,
  minimum,
  maximum,
  onChange,
}: {
  value: number
  minimum: number
  maximum: number
  onChange: (value: number) => void
}) {
  const width = useRef(1)
  const [track, setTrack] = useState(1)
  function setFromX(x: number): void {
    const span = Math.max(maximum - minimum, 0.0001)
    onChange(minimum + Math.min(1, Math.max(0, x / width.current)) * span)
  }
  const fraction = maximum <= minimum ? 1 : Math.min(1, Math.max(0, (value - minimum) / (maximum - minimum)))
  const thumb = 18
  const left = fraction * Math.max(0, track - thumb)
  return (
    <View
      accessibilityLabel="Key size"
      style={styles.fader}
      onLayout={(event) => {
        width.current = Math.max(1, event.nativeEvent.layout.width)
        setTrack(width.current)
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => setFromX(event.nativeEvent.locationX)}
      onResponderMove={(event) => setFromX(event.nativeEvent.locationX)}
    >
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={6} width={track} height={24} color="#070707">
          <LinearGradient start={vec(0, 6)} end={vec(0, 30)} colors={['#070707', '#070707']} />
        </Rect>
        <Rect x={0.5} y={6.5} width={Math.max(0, track - 1)} height={23} style="stroke" strokeWidth={1} color="#6A6A6A" />
        <Rect x={left} y={4} width={thumb} height={28}>
          <LinearGradient
            start={vec(left, 4)}
            end={vec(left + thumb, 4)}
            colors={['#6E6E6E', '#F4F4F4', '#8E8E8E', '#E4E4E4']}
            positions={[0, 0.33, 0.66, 1]}
          />
        </Rect>
        <Rect x={left} y={4} width={thumb} height={28} style="stroke" strokeWidth={1} color="#2A2A2A" />
        <Rect x={left + thumb / 2 - 0.5} y={6} width={1} height={24} color="#1A1A1A" />
      </Canvas>
    </View>
  )
}

const wellSize = companionWidth

export function HatchWell({ hatch, onPress }: { hatch: KeyHatch; onPress: () => void }) {
  const path = useMemo(() => {
    const spacing = Math.max(2.5, wellSize / 5)
    const svg = hatchPath(hatch, { left: 0, top: 0, width: wellSize, height: wellSize }, spacing)
    return svg ? Skia.Path.MakeFromSVGString(svg) : null
  }, [hatch])
  const clip = useMemo(() => {
    const circle = Skia.PathBuilder.Make()
    circle.addCircle(wellSize / 2, wellSize / 2, wellSize / 2 - 1)
    return circle.build()
  }, [])
  return (
    <Pressable accessibilityLabel="Key pattern" onPress={onPress} style={styles.wellHit}>
      <Canvas style={{ width: wellSize, height: wellSize }}>
        <Circle cx={wellSize / 2} cy={wellSize / 2} r={wellSize / 2 - 1} color="#0C0C0C" />
        <Group clip={clip}>
          {path ? <Path path={path} style="stroke" strokeWidth={1.25} color="rgba(255,255,255,0.9)" /> : null}
        </Group>
        <Circle cx={wellSize / 2} cy={wellSize / 2} r={wellSize / 2 - 1} style="stroke" strokeWidth={1} color="#8A8A8A" />
      </Canvas>
    </Pressable>
  )
}

export function ColorWell({ color, label, onPress }: { color: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={styles.wellHit}>
      <Canvas style={{ width: wellSize, height: wellSize }}>
        <Circle cx={wellSize / 2} cy={wellSize / 2} r={wellSize / 2 - 1} color={color} />
        <Circle cx={wellSize / 2} cy={wellSize / 2} r={wellSize / 2 - 1} style="stroke" strokeWidth={1} color="#8A8A8A" />
      </Canvas>
    </Pressable>
  )
}

const runeSvg =
  'M 17.71 7.71 L 12 2 L 11 2 L 11 9.59 L 6.41 5 L 5 6.41 L 10.59 12 L 5 17.59 L 6.41 19 L 11 14.41 L 11 22 L 12 22 L 17.71 16.29 L 13.41 12 Z M 13 5.83 L 14.88 7.71 L 13 9.59 Z M 14.88 16.29 L 13 18.17 L 13 14.41 Z'

export function BluetoothRune({ appearance, onPress }: { appearance: MidiAppearance; onPress: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current
  const [drawn, setDrawn] = useState(1)
  const advertising = appearance.glyph === 'advertising'
  useEffect(() => {
    if (!advertising) {
      opacity.setValue(1)
      setDrawn(1)
      return
    }
    const id = opacity.addListener(({ value }) => setDrawn(value))
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2, duration: 550, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 1, duration: 550, useNativeDriver: false }),
      ]),
    )
    loop.start()
    return () => {
      loop.stop()
      opacity.removeListener(id)
    }
  }, [advertising, opacity])
  const path = useMemo(() => Skia.Path.MakeFromSVGString(runeSvg), [])
  const connected = appearance.glyph === 'connected'
  const rune = appearance.glyph === 'disabled' ? '#8E8E93' : '#FFFFFF'
  const scale = (wellSize - 4) / 24
  return (
    <Pressable
      accessibilityLabel="Bluetooth"
      accessibilityValue={{ text: appearance.statusLine }}
      onPress={onPress}
      style={styles.wellHit}
    >
      <Canvas style={{ width: wellSize, height: wellSize }}>
        <Circle cx={wellSize / 2} cy={wellSize / 2} r={wellSize / 2 - 1} color={connected ? '#0A84FF' : '#070707'} />
        <Circle
          cx={wellSize / 2}
          cy={wellSize / 2}
          r={wellSize / 2 - 1}
          style="stroke"
          strokeWidth={1}
          color={connected ? 'rgba(255,255,255,0.35)' : '#6A6A6A'}
        />
        <Group transform={[{ translateX: 2 }, { translateY: 2 }, { scale }]} opacity={drawn}>
          {path ? <Path path={path} color={rune} style="fill" /> : null}
        </Group>
      </Canvas>
    </Pressable>
  )
}

export function CloseBall({ onPress }: { onPress: () => void }) {
  const size = 30
  const inset = 9.5
  return (
    <Pressable accessibilityLabel="Close" onPress={onPress} style={styles.ballHit}>
      <Canvas style={{ width: size, height: size }}>
        <Circle cx={size / 2} cy={size / 2} r={size / 2}>
          <RadialGradient c={vec(11, 9)} r={18} colors={['#FFFFFF', '#D0D0D0', '#7A7A7A']} />
        </Circle>
        <Line
          p1={vec(inset, inset)}
          p2={vec(size - inset, size - inset)}
          color="#1A1A1A"
          strokeWidth={2.2}
          strokeCap="round"
        />
        <Line
          p1={vec(size - inset, inset)}
          p2={vec(inset, size - inset)}
          color="#1A1A1A"
          strokeWidth={2.2}
          strokeCap="round"
        />
      </Canvas>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  fader: { height: 36, justifyContent: 'center' },
  wellHit: { width: wellSize, height: wellSize },
  ballHit: { width: 30, height: 30 },
})
