import { useEffect, useState } from 'react'
import { Asset } from 'expo-asset'
import { Canvas, ImageSVG, useSVG } from '@shopify/react-native-skia'
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { versionLabel } from './buildInfo'
import { joinLicenseNotice, parseHelp, type HelpBlock } from './noticeText'

const icons: Record<string, number> = {
  piano: require('../games/icons/piano.svg'),
  straighten: require('../games/icons/straighten.svg'),
  toggle_on: require('../games/icons/toggle_on.svg'),
  music_note: require('../games/icons/music_note.svg'),
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

export function HelpScreen() {
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
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
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
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  headingText: { color: '#FFFFFF', fontSize: 20 },
  icon: { width: 24, height: 24 },
  body: { color: '#F4F1EA', fontSize: 16, lineHeight: 22 },
  link: { color: '#7EB6D9', textDecorationLine: 'underline' },
})
