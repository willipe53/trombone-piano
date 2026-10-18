import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia'
import { columnPitch, companionGap, companionWidth, rockerHeight, rockerWidth } from './panelMeasure'

/// Label and rocker. The slot beside the rocker stays the same width with or without a color, a key pattern, or the Bluetooth mark.
export function TPToggle({
  label,
  on,
  disabled,
  onPress,
  accessory,
}: {
  label: string
  on: boolean
  disabled?: boolean
  onPress: () => void
  accessory?: ReactNode
}) {
  return (
    <View style={[styles.slot, { width: columnPitch }]}>
      <Text pointerEvents="none" style={styles.caption}>
        {label}
      </Text>
      <View style={styles.line}>
        <Rocker label={label} on={on} disabled={disabled} onPress={onPress} />
        <View style={styles.accessory}>{accessory}</View>
      </View>
    </View>
  )
}

function Rocker({
  label,
  on,
  disabled,
  onPress,
}: {
  label: string
  on: boolean
  disabled?: boolean
  onPress: () => void
}) {
  const slide = useRef(new Animated.Value(on ? 1 : 0)).current
  const [progress, setProgress] = useState(on ? 1 : 0)
  useEffect(() => {
    const id = slide.addListener(({ value }) => setProgress(value))
    Animated.timing(slide, {
      toValue: on ? 1 : 0,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start()
    return () => slide.removeListener(id)
  }, [on, slide])
  const inset = 4.4
  const cap = (rockerWidth - inset * 2 - 2) / 2
  const capHeight = rockerHeight - inset * 2
  const left = inset
  const right = inset + cap + 2
  const redX = left + progress * (right - left)
  const darkX = right + progress * (left - right)
  return (
    <Pressable accessibilityLabel={label} disabled={disabled} onPress={onPress} style={disabled && styles.dim}>
      <Canvas style={{ width: rockerWidth, height: rockerHeight }}>
        <Rect x={0} y={0} width={rockerWidth} height={rockerHeight} color="#0C0C0C" />
        <Rect
          x={0.7}
          y={0.7}
          width={rockerWidth - 1.4}
          height={rockerHeight - 1.4}
          style="stroke"
          strokeWidth={1.4}
          color="#8A8A8A"
        />
        <Cap x={darkX} y={inset} width={cap} height={capHeight} raised={false} base="#2C2C2C" />
        <Cap x={redX} y={inset} width={cap} height={capHeight} raised base="#E23C12" />
      </Canvas>
    </Pressable>
  )
}

function Cap({
  x,
  y,
  width,
  height,
  raised,
  base,
}: {
  x: number
  y: number
  width: number
  height: number
  raised: boolean
  base: string
}) {
  const light = raised ? mix(base, '#FFFFFF', 0.32) : mix(base, '#FFFFFF', 0.08)
  const dark = raised ? mix(base, '#000000', 0.22) : mix(base, '#000000', 0.45)
  return (
    <Rect x={x} y={y} width={width} height={height}>
      <LinearGradient start={vec(x, y)} end={vec(x, y + height)} colors={[light, base, dark]} />
    </Rect>
  )
}

function mix(hex: string, toward: string, amount: number): string {
  const from = rgb(hex)
  const to = rgb(toward)
  const channel = (index: number) => Math.round(from[index] + (to[index] - from[index]) * amount)
  return `#${[channel(0), channel(1), channel(2)].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

function rgb(hex: string): [number, number, number] {
  const bare = hex.replace('#', '')
  return [parseInt(bare.slice(0, 2), 16), parseInt(bare.slice(2, 4), 16), parseInt(bare.slice(4, 6), 16)]
}

const styles = StyleSheet.create({
  slot: { alignItems: 'center', gap: 6 },
  line: {
    width: rockerWidth + companionGap + companionWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: companionGap,
  },
  accessory: { width: companionWidth, height: companionWidth },
  dim: { opacity: 0.35 },
  caption: { color: '#FFFFFF', fontSize: 12, letterSpacing: 1.2, textAlign: 'center' },
})
