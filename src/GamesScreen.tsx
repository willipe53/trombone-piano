import { useEffect, useMemo, useRef, useState } from 'react'
import { Asset } from 'expo-asset'
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { useHeaderLeading } from './AppFrame'
import { getEngine } from './engine'
import { GameLog, gameAnswerEntry, type GameAnswer } from './gameLog'
import { fileGameLogStore } from './gameLogStore'
import { GolfDeal, GolfLevel, type GolfLevel as GolfLevelValue } from './golfDeal'
import { GolfBoard } from './GolfBoard'
import { readInstrumentSettings } from './instrumentSettings'
import { helpParagraph } from './noticeText'
import { KeySignature } from './scoreNotation'
import { ScaleBoard } from './ScaleBoard'
import { ScaleInventoryDeal, ScaleLevel, type ScaleLevel as ScaleLevelValue } from './scaleInventory'

const helpAsset = require('../swift_version/TrombonePiano/Help.md')

type Kind = 'chooser' | 'golf' | 'scale'

export function GamesScreen() {
  const [kind, setKind] = useState<Kind>('chooser')
  const [soundOn, setSoundOn] = useState(true)
  const [golf, setGolf] = useState<GolfDeal | null>(null)
  const [golfLevel, setGolfLevel] = useState<GolfLevelValue>(GolfLevel.start('bass'))
  const [armed, setArmed] = useState<number | null>(null)
  const [scaleDeal, setScaleDeal] = useState<ScaleInventoryDeal | null>(null)
  const [scaleLevel, setScaleLevel] = useState<ScaleLevelValue>(ScaleLevel.start(KeySignature.bFlat))
  const [cleared, setCleared] = useState(false)
  const [tick, setTick] = useState(0)
  const [helpSource, setHelpSource] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const seed = useRef(1)
  const phrase = useRef(0)
  const sound = useRef(true)
  const log = useRef(new GameLog(fileGameLogStore()))

  useEffect(() => {
    const stored = readInstrumentSettings()
    const key = KeySignature.matching(stored.keySignature) ?? KeySignature.bFlat
    setScaleLevel(ScaleLevel.start(key))
    const engine = getEngine()
    engine.setInstrument('trombone')
    void engine.load('trombone').then(() => engine.resume())
    let cancelled = false
    void readHelp().then((text) => {
      if (!cancelled) setHelpSource(text)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function play(notes: number[]): void {
    phrase.current += 1
    const token = phrase.current
    notes.forEach((note, index) => {
      setTimeout(() => {
        if (!sound.current || phrase.current !== token) return
        getEngine().playOneShot(note)
      }, index * 280)
    })
  }

  function record(answer: GameAnswer): void {
    log.current.append(gameAnswerEntry(answer))
  }

  function beginGolf(level: GolfLevelValue): void {
    phrase.current += 1
    const deal = GolfDeal.deal(level, seed.current, new Date())
    seed.current += 1
    setGolfLevel(level)
    setGolf(deal)
    setScaleDeal(null)
    setKind('golf')
    setArmed(null)
    setCleared(false)
    setTick((value) => value + 1)
  }

  function beginScale(level: ScaleLevelValue): void {
    phrase.current += 1
    const deal = ScaleInventoryDeal.deal(level, seed.current, new Date())
    seed.current += 1
    setScaleLevel(level)
    setScaleDeal(deal)
    setGolf(null)
    setKind('scale')
    setCleared(false)
    setTick((value) => value + 1)
  }

  function takeGolf(column: number): void {
    if (!golf) return
    const result = golf.take(column, new Date())
    if (result.kind === 'rejected') {
      setArmed(column)
      setTick((value) => value + 1)
      return
    }
    setArmed(null)
    record(result.answer)
    setCleared(result.cleared)
    setTick((value) => value + 1)
    if (result.cleared) {
      if (sound.current) play(golf.playedNotes())
    } else if (sound.current) {
      play([result.answer.note])
    }
  }

  const peekEnabled = kind === 'golf' && armed !== null && golf?.bottom(armed)?.revealed === undefined
  const chrome = useRef({
    games() {},
    undo() {},
    peek() {},
    help() {},
    sound(_value: boolean) {},
  })
  chrome.current = {
    games() {
      setHelpOpen(false)
      setKind('chooser')
    },
    undo() {
      if (!golf?.undo()) return
      phrase.current += 1
      setArmed(null)
      setCleared(golf.isCleared)
      setTick((value) => value + 1)
    },
    peek() {
      if (armed === null || !golf) return
      const answer = golf.peek(armed, new Date())
      if (!answer) return
      record(answer)
      setTick((value) => value + 1)
      if (sound.current) play([answer.note])
    },
    help() {
      setHelpOpen(true)
    },
    sound(value: boolean) {
      sound.current = value
      setSoundOn(value)
      if (!value) phrase.current += 1
    },
  }
  const helpTitle = kind === 'golf' ? 'Golf' : 'Scale inventory'
  const dealHeader = useMemo(
    () =>
      kind === 'chooser' ? null : (
        <GameDealHeader kind={kind} soundOn={soundOn} peekEnabled={peekEnabled} chrome={chrome} />
      ),
    [kind, soundOn, peekEnabled],
  )
  useHeaderLeading(dealHeader, kind !== 'chooser')

  return (
    <View style={styles.screen}>
      {kind === 'chooser' ? (
        <View style={styles.chooser}>
          <Pressable accessibilityLabel="Golf, bass" onPress={() => beginGolf(GolfLevel.start('bass'))} style={styles.choice}>
            <Text style={styles.choiceText}>Golf, bass</Text>
          </Pressable>
          <Pressable accessibilityLabel="Golf, tenor" onPress={() => beginGolf(GolfLevel.start('tenor'))} style={styles.choice}>
            <Text style={styles.choiceText}>Golf, tenor</Text>
          </Pressable>
          <Pressable accessibilityLabel="Scale inventory" onPress={() => beginScale(scaleLevel)} style={styles.choice}>
            <Text style={styles.choiceText}>Scale inventory</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {kind === 'golf' && golf ? <GolfBoard key={tick} deal={golf} armedColumn={armed} onColumn={takeGolf} /> : null}
          {kind === 'scale' && scaleDeal ? (
            <ScaleBoard
              key={tick}
              deal={scaleDeal}
              onPlace={(midi, slot) => {
                const answer = scaleDeal.place(midi, slot, new Date())
                if (!answer) return false
                record(answer)
                const done = scaleDeal.isCleared
                setCleared(done)
                setTick((value) => value + 1)
                if (done && sound.current) play(scaleDeal.notes)
                else if (sound.current) play([midi])
                return true
              }}
            />
          ) : null}
          <GameHelp
            visible={helpOpen}
            text={helpParagraph(helpSource, helpTitle) ?? ''}
            onDismiss={() => setHelpOpen(false)}
          />
          <Text style={styles.nextLine}>
            {cleared ? 'Cleared.' : kind === 'golf' ? GolfLevel.nextLine(golfLevel) : ScaleLevel.nextLine(scaleLevel)}
          </Text>
          <View style={styles.footer}>
            <Pressable
              accessibilityLabel="Easier"
              onPress={() => (kind === 'golf' ? beginGolf(GolfLevel.eased(golfLevel)) : beginScale(ScaleLevel.eased(scaleLevel)))}
              style={styles.button}
            >
              <Text style={styles.buttonText}>EASIER</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Next"
              onPress={() => (kind === 'golf' ? beginGolf(golfLevel) : beginScale(ScaleLevel.stepped(scaleLevel)))}
              style={styles.button}
            >
              <Text style={styles.buttonText}>NEXT</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Harder"
              onPress={() => (kind === 'golf' ? beginGolf(GolfLevel.hardened(golfLevel)) : beginScale(ScaleLevel.hardened(scaleLevel)))}
              style={styles.button}
            >
              <Text style={styles.buttonText}>HARDER</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

function GameDealHeader({
  kind,
  soundOn,
  peekEnabled,
  chrome,
}: {
  kind: Kind
  soundOn: boolean
  peekEnabled: boolean
  chrome: { current: { games: () => void; undo: () => void; peek: () => void; help: () => void; sound: (value: boolean) => void } }
}) {
  return (
    <>
      <Pressable accessibilityLabel="Games" onPress={() => chrome.current.games()} style={styles.button}>
        <Text style={styles.buttonText}>GAMES</Text>
      </Pressable>
      {kind === 'golf' ? (
        <>
          <Pressable accessibilityLabel="Undo" onPress={() => chrome.current.undo()} style={styles.button}>
            <Text style={styles.buttonText}>UNDO</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Peek"
            disabled={!peekEnabled}
            onPress={() => chrome.current.peek()}
            style={[styles.button, !peekEnabled && styles.dim]}
          >
            <Text style={styles.buttonText}>PEEK</Text>
          </Pressable>
        </>
      ) : null}
      <Pressable accessibilityLabel="Help" onPress={() => chrome.current.help()} style={styles.button}>
        <Text style={styles.buttonText}>HELP</Text>
      </Pressable>
      <Text style={styles.soundLabel}>SOUND</Text>
      <Switch accessibilityLabel="Sound" value={soundOn} onValueChange={(value) => chrome.current.sound(value)} />
    </>
  )
}

function GameHelp({ visible, text, onDismiss }: { visible: boolean; text: string; onDismiss: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.shade}>
        <View style={styles.card}>
          <ScrollView style={styles.helpScroll}>
            <Text style={styles.helpBody}>{text}</Text>
          </ScrollView>
          <Pressable accessibilityLabel="Dismiss" onPress={onDismiss} style={styles.dismiss}>
            <Text style={styles.buttonText}>DISMISS</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

async function readHelp(): Promise<string> {
  const asset = Asset.fromModule(helpAsset)
  if (Platform.OS === 'web') return (await fetch(asset.uri)).text()
  await asset.downloadAsync()
  const { File } = await import('expo-file-system')
  return new File(asset.localUri ?? asset.uri).textSync()
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  chooser: { marginTop: 24, gap: 12, paddingHorizontal: 24 },
  choice: { minHeight: 48, borderRadius: 8, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  choiceText: { color: '#FFFFFF', fontSize: 18 },
  button: { minHeight: 36, paddingHorizontal: 10, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 13 },
  dim: { opacity: 0.35 },
  soundLabel: { color: '#17803A', fontSize: 12 },
  nextLine: { color: '#F4F1EA', textAlign: 'center', marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 8 },
  shade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  card: { maxHeight: '80%', backgroundColor: '#1B1B1B', borderRadius: 12, padding: 16, gap: 16 },
  helpScroll: { flexShrink: 1 },
  helpBody: { color: '#F4F1EA', fontSize: 16, lineHeight: 22 },
  dismiss: { minHeight: 36, paddingHorizontal: 10, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
})
