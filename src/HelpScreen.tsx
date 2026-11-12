import { useEffect, useState } from 'react'
import { Asset } from 'expo-asset'
import { Canvas, ImageSVG, useSVG } from '@shopify/react-native-skia'
import { Image, Linking, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { versionLabel } from './buildInfo'
import { joinLicenseNotice, parseHelp, type HelpBlock } from './noticeText'

const icons: Record<string, number> = {
  piano: require('../games/icons/piano.svg'),
  straighten: require('../games/icons/straighten.svg'),
  toggle_on: require('../games/icons/toggle_on.svg'),
  music_note: require('../games/icons/music_note.svg'),
  drone: require('../games/icons/drone.svg'),
  signature: require('../games/icons/signature.svg'),
  library_music: require('../games/icons/library_music.svg'),
  golf_course: require('../games/icons/golf_course.svg'),
  queue_music: require('../games/icons/queue_music.svg'),
  info: require('../games/icons/info.svg'),
  privacy_tip: require('../games/icons/privacy_tip.svg'),
  copyright: require('../games/icons/copyright.svg'),
}

const helpAsset = require('../swift_version/TrombonePiano/Help.md')
const noticeAsset = require('../swift_version/TrombonePiano/Sounds/NOTICE.txt')

function useHelpBlocks(): HelpBlock[] {
  const [blocks, setBlocks] = useState<HelpBlock[]>([])
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const help = await readAsset(helpAsset)
      const notice = joinLicenseNotice(await readAsset(noticeAsset))
      if (!cancelled) setBlocks(parseHelp(`${help.trim()}\n\n${notice}\n`))
    })()
    return () => {
      cancelled = true
    }
  }, [])
  return blocks
}

export function HelpDocument() {
  const blocks = useHelpBlocks()
  return (
    <View style={styles.blocks}>
      {blocks.map((block, index) =>
        block.kind === 'heading' ? (
          <View key={index} style={styles.heading}>
            <HelpIcon name={block.icon} />
            <Text style={styles.headingText}>{block.title}</Text>
          </View>
        ) : (
          <RichText key={index} text={block.text} />
        ),
      )}
      <Text style={styles.body}>{versionLabel()}</Text>
    </View>
  )
}

export function HelpDialog() {
  const viewport = useWindowDimensions()
  const maxWidth = viewport.width * 0.9
  const maxHeight = viewport.height * 0.9
  const [contentHeight, setContentHeight] = useState(0)
  const height = contentHeight > 0 ? Math.min(contentHeight + 2, maxHeight) : maxHeight
  return (
    <View accessibilityLabel="Help" style={[styles.dialog, { width: maxWidth, height }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.dialogContent}
        onContentSizeChange={(_width, next) => {
          setContentHeight((current) => (Math.abs(current - next) < 1 ? current : next))
        }}
      >
        <HelpDocument />
      </ScrollView>
    </View>
  )
}

export function HelpScreen() {
  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <HelpDocument />
      </ScrollView>
    </View>
  )
}

function HelpIcon({ name }: { name: string }) {
  const source = icons[name]
  if (source === undefined) return <View style={styles.icon} />
  return <LoadedIcon source={source} />
}

function LoadedIcon({ source }: { source: number }) {
  if (Platform.OS === 'web') return <Image source={source} style={styles.icon} resizeMode="contain" />
  return <SkiaIcon source={source} />
}

function SkiaIcon({ source }: { source: number }) {
  const svg = useSVG(source)
  if (!svg) return <View style={styles.icon} />
  return (
    <Canvas style={styles.icon}>
      <ImageSVG svg={svg} x={0} y={0} width={24} height={24} />
    </Canvas>
  )
}

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g)
  return (
    <Text style={styles.body}>
      {parts.map((part, index) => {
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
        if (!link) return part
        return (
          <Text key={index} style={styles.link} onPress={() => void Linking.openURL(link[2])}>
            {link[1]}
          </Text>
        )
      })}
    </Text>
  )
}

async function readAsset(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId)
  if (Platform.OS === 'web') {
    const response = await fetch(asset.uri)
    return response.text()
  }
  await asset.downloadAsync()
  const { File } = await import('expo-file-system')
  return new File(asset.localUri ?? asset.uri).textSync()
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  dialog: {
    backgroundColor: '#1B1B1B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    overflow: 'hidden',
  },
  scroll: { flex: 1 },
  blocks: { gap: 12 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  dialogContent: { paddingHorizontal: 20, paddingVertical: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  headingText: { color: '#FFFFFF', fontSize: 20 },
  icon: { width: 24, height: 24 },
  body: { color: '#F4F1EA', fontSize: 16, lineHeight: 22 },
  link: { color: '#7EB6D9', textDecorationLine: 'underline' },
})
