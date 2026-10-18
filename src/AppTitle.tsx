import { useMemo } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { Canvas, Group, ImageSVG, useSVG } from '@shopify/react-native-skia'
import { CloseBall } from './MoogChrome'
import { fittedTitleSize, titleBallSize, titleBandHeight, titleGap, titleMarkSize, titleText } from './panelMeasure'

const titleMark = require('../assets/trombone-piano-title.svg')
const titleMarkIntrinsic = { width: 2270.715, height: 188.418 }

function PlacedMark({
  svg,
  x,
  y,
  width,
  height,
}: {
  svg: NonNullable<ReturnType<typeof useSVG>>
  x: number
  y: number
  width: number
  height: number
}) {
  if (Platform.OS !== 'web') {
    return <ImageSVG svg={svg} x={x} y={y} width={width} height={height} />
  }
  return (
    <Group
      transform={[
        { translateX: x },
        { translateY: y },
        { scaleX: width / titleMarkIntrinsic.width },
        { scaleY: height / titleMarkIntrinsic.height },
      ]}
    >
      <ImageSVG svg={svg} />
    </Group>
  )
}

export function TitleWordmark({ width, height }: { width: number; height: number }) {
  const svg = useSVG(titleMark)
  return (
    <View accessibilityLabel={titleText} style={{ width, height }}>
      <Canvas style={{ width, height }}>
        {svg ? <PlacedMark svg={svg} x={0} y={0} width={width} height={height} /> : null}
      </Canvas>
    </View>
  )
}

export function AppTitle({ width, onClose }: { width: number; onClose: () => void }) {
  const available = Math.max(0, width - titleBallSize - titleGap)
  const svg = useSVG(titleMark)
  const size = useMemo(
    () => fittedTitleSize(available, (fontSize) => titleMarkSize(fontSize).width),
    [available],
  )
  const mark = titleMarkSize(size)
  const x = Math.max(0, available - mark.width)
  const y = (titleBandHeight - mark.height) / 2
  return (
    <View accessibilityLabel={titleText} style={[styles.row, { width }]}>
      <Canvas style={{ width: available, height: titleBandHeight }}>
        {svg ? <PlacedMark svg={svg} x={x} y={y} width={mark.width} height={mark.height} /> : null}
      </Canvas>
      <View style={{ width: titleGap }} />
      <CloseBall onPress={onClose} />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { height: titleBandHeight, flexDirection: 'row', alignItems: 'center' },
})
