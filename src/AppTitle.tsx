import { useEffect, useMemo, useState } from 'react'
import { Asset } from 'expo-asset'
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia'
import { Platform, StyleSheet, View } from 'react-native'
import { CloseBall, HelpBall } from './MoogChrome'
import { fittedTitleSize, titleBallSize, titleBandHeight, titleGap, titleMarkSize, titleText } from './panelMeasure'

const titleMark = require('../assets/trombone-piano-title.svg')
const titleMarkIntrinsic = { width: 2270.715, height: 188.418 }

function svgPathData(source: string): string[] {
  const paths: string[] = []
  const pattern = /<path\b[^>]*\bd="([^"]+)"/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source))) paths.push(match[1])
  return paths
}

function useTitlePaths(): string[] | null {
  const [paths, setPaths] = useState<string[] | null>(null)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const asset = Asset.fromModule(titleMark)
      let text: string
      if (Platform.OS === 'web') {
        text = await (await fetch(asset.uri)).text()
      } else {
        await asset.downloadAsync()
        const { File } = await import('expo-file-system')
        text = new File(asset.localUri ?? asset.uri).textSync()
      }
      if (!cancelled) setPaths(svgPathData(text))
    })()
    return () => {
      cancelled = true
    }
  }, [])
  return paths
}

export function TitleWordmark({ width, height }: { width: number; height: number }) {
  return (
    <View accessibilityLabel={titleText} style={{ width, height }}>
      <Wordmark width={width} height={height} />
    </View>
  )
}

function Wordmark({ width, height }: { width: number; height: number }) {
  const paths = useTitlePaths()
  if (!paths || width <= 0 || height <= 0) return null
  const scaleX = width / titleMarkIntrinsic.width
  const scaleY = height / titleMarkIntrinsic.height
  return (
    <Canvas style={{ width, height }}>
      <Group transform={[{ scaleX }, { scaleY }]}>
        {paths.map((data) => (
          <FilledPath key={data} data={data} />
        ))}
      </Group>
    </Canvas>
  )
}

function FilledPath({ data }: { data: string }) {
  const path = useMemo(() => Skia.Path.MakeFromSVGString(data), [data])
  if (!path) return null
  return <Path path={path} color="#FFFFFF" style="fill" />
}

export function AppTitle({
  width,
  onClose,
  onHelp,
}: {
  width: number
  onClose?: () => void
  onHelp?: () => void
}) {
  const ball = Boolean(onClose || onHelp)
  const available = Math.max(0, width - (ball ? titleBallSize + titleGap : 0))
  const size = useMemo(
    () => fittedTitleSize(available, (fontSize) => titleMarkSize(fontSize).width),
    [available],
  )
  const mark = titleMarkSize(size)
  return (
    <View style={[styles.row, { width }]}>
      <View accessibilityLabel={titleText} style={[styles.markSlot, { width: available }]}>
        <Wordmark width={mark.width} height={mark.height} />
      </View>
      {ball ? <View style={{ width: titleGap }} /> : null}
      {onClose ? <CloseBall onPress={onClose} /> : onHelp ? <HelpBall onPress={onHelp} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { height: titleBandHeight, flexDirection: 'row', alignItems: 'center' },
  markSlot: { height: titleBandHeight, alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' },
})
