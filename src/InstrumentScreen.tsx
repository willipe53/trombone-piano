import { useEffect, useRef, useState } from 'react'
import { AppState, Platform, StyleSheet, View } from 'react-native'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import {
  midiAppearance,
  midiIsAvailable,
  midiListen,
  midiPlay,
  midiReleaseHeldNotes,
  midiRestore,
  midiSetAdvertising,
  midiSetEnabled,
  type MidiAppearance,
} from 'trombone-midi'
import { getEngine } from './engine'
import { Keybed } from './Keybed'
import { MoogPanel } from './MoogPanel'
import {
  defaultInstrumentSettings,
  readInstrumentSettings,
  writeInstrumentSettings,
  type InstrumentSettings,
} from './instrumentSettings'
import {
  keyScaleMax,
  scaleForVisibleKeyHeight,
  scaleThatFitsKeyboard,
  whiteKeyHeightMm,
  ipadProPointsPerMillimeter,
} from './geometry'
import { MoogLayout } from './moogLayout'
import { noteChanges } from './samples'
import {
  KeySignature,
  ScoreHistory,
  TromboneHorn,
  type ScoreColumn,
} from './scoreNotation'
import type { KeyHatch } from './keyHatch'

const visibleKeyRatio = 0.85
const engine = getEngine()
const keepAwakeTag = 'trombone-piano'

const midiOff: MidiAppearance = {
  available: false,
  glyph: 'disabled',
  statusLine: 'Off',
  wantsAdvertising: false,
}

export function InstrumentScreen() {
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [settings, setSettings] = useState<InstrumentSettings>(defaultInstrumentSettings)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sounding, setSounding] = useState<ReadonlySet<number>>(new Set())
  const [slideNote, setSlideNote] = useState<number | null>(null)
  const [columns, setColumns] = useState<readonly ScoreColumn[]>([])
  const [shiftColumns, setShiftColumns] = useState(0)
  const [appearance, setAppearance] = useState<MidiAppearance>(midiOff)
  const history = useRef(new ScoreHistory())
  const playedOrder = useRef<number[]>([])
  const settingsRef = useRef(settings)
  const soundingRef = useRef(sounding)
  settingsRef.current = settings
  soundingRef.current = sounding
  const showMidi = Platform.OS === 'ios' && midiIsAvailable()

  function commit(next: InstrumentSettings): void {
    settingsRef.current = next
    setSettings(next)
    writeInstrumentSettings(next)
  }

  function patch(partial: Partial<InstrumentSettings>): void {
    commit({ ...settingsRef.current, ...partial })
  }

  useEffect(() => {
    const stored = readInstrumentSettings()
    if (!showMidi) stored.midi = false
    settingsRef.current = stored
    setSettings(stored)
    engine.setInstrument(stored.instrument)
    let cancelled = false
    engine
      .load(stored.instrument)
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    if (stored.midi && showMidi) {
      if (midiSetEnabled(true)) {
        midiSetAdvertising(stored.bluetoothAdvertising)
        setAppearance(midiAppearance())
      } else {
        commit({ ...stored, midi: false })
      }
    }
    return () => {
      cancelled = true
    }
  }, [showMidi])

  useEffect(() => {
    if (Platform.OS === 'web' || !settings.keepAlive) return
    void activateKeepAwakeAsync(keepAwakeTag)
    return () => {
      void deactivateKeepAwake(keepAwakeTag)
    }
  }, [settings.keepAlive])

  useEffect(() => {
    if (!showMidi) return
    return midiListen((next) => setAppearance(next))
  }, [showMidi])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        writeInstrumentSettings(settingsRef.current)
        if (settingsRef.current.midi) midiReleaseHeldNotes()
      }
      if (state === 'active') {
        if (settingsRef.current.midi) {
          midiRestore()
          midiPlay([...soundingRef.current].sort((a, b) => a - b), [])
        } else {
          void engine.resume().then(() => engine.setSounding(soundingRef.current))
        }
      }
    })
    return () => subscription.remove()
  }, [])

  async function chooseInstrument(next: InstrumentSettings['instrument']): Promise<void> {
    if (next === settingsRef.current.instrument) return
    engine.silence()
    engine.setInstrument(next)
    patch({ instrument: next })
    if (!engine.isLoaded(next)) {
      setReady(false)
      setLoading(true)
      try {
        await engine.load(next)
      } finally {
        setLoading(false)
      }
    }
    setReady(engine.isLoaded(next))
    if (!settingsRef.current.midi) engine.setSounding(soundingRef.current)
  }

  function setMidi(enabled: boolean): void {
    if (!showMidi || enabled === settingsRef.current.midi) return
    if (enabled) {
      engine.silence()
      if (!midiSetEnabled(true)) {
        patch({ midi: false })
        engine.setSounding(soundingRef.current)
        return
      }
      midiPlay([...soundingRef.current].sort((a, b) => a - b), [])
      midiSetAdvertising(settingsRef.current.bluetoothAdvertising)
      setAppearance(midiAppearance())
    } else {
      midiReleaseHeldNotes()
      midiSetEnabled(false)
      setAppearance(midiOff)
      void engine.resume().then(() => engine.setSounding(soundingRef.current))
    }
    patch({ midi: enabled })
  }

  function playNotes(notes: Set<number>): void {
    const changes = noteChanges(soundingRef.current, notes)
    soundingRef.current = notes
    setSounding(notes)
    for (const midi of changes.stopped) {
      playedOrder.current = playedOrder.current.filter((note) => note !== midi)
    }
    playedOrder.current.push(...changes.started)
    setSlideNote(playedOrder.current.at(-1) ?? null)
    const removed = history.current.apply(changes.started, changes.stopped)
    setColumns([...history.current.columns])
    if (removed > 0) {
      setShiftColumns(removed)
      const started = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - started) / 220)
        const eased = 1 - (1 - t) ** 3
        setShiftColumns(removed * (1 - eased))
        if (t < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }
    if (settingsRef.current.midi) midiPlay(changes.started, changes.stopped)
    else {
      void engine.resume().then(() => engine.setSounding(notes))
    }
  }

  const width = viewport.width
  const height = viewport.height
  const minScale = width > 0 ? scaleThatFitsKeyboard(width) : keyScaleMax
  const heightCap = scaleForVisibleKeyHeight(MoogLayout.maxVisibleKeyHeight(height), visibleKeyRatio)
  const maxScale = Math.min(keyScaleMax, Math.max(heightCap, minScale))
  const scale = Math.min(Math.max(settings.keyScale, minScale), maxScale)
  const fullKeyHeight = whiteKeyHeightMm * scale * ipadProPointsPerMillimeter
  const keyHeight = fullKeyHeight * visibleKeyRatio
  const layout = MoogLayout.layout(height, keyHeight)
  const horn = settings.horn === 'trigger' ? TromboneHorn.trigger : TromboneHorn.straight
  const keySignature = KeySignature.matching(settings.keySignature) ?? KeySignature.bFlat
  const keysEnabled = settings.midi || (ready && !loading)

  return (
    <View
      style={styles.screen}
      onLayout={(event) => {
        const next = event.nativeEvent.layout
        setViewport({ width: next.width, height: next.height })
      }}
    >
      {viewport.height > 0 ? (
        <View>
          <MoogPanel
            width={width}
            height={layout.panelHeight}
            scale={scale}
            minScale={minScale}
            maxScale={maxScale}
            showNotes={settings.showNotes}
            showKey={settings.showKey}
            keepAlive={settings.keepAlive}
            showPositions={settings.showPositions}
            positionsEnabled={settings.instrument === 'trombone'}
            midi={settings.midi}
            showMidi={showMidi}
            instrument={settings.instrument}
            horn={horn}
            keySignature={keySignature}
            noteColor={settings.noteColor}
            positionColor={settings.positionColor}
            keyHatch={settings.keyHatch}
            scoreMagnification={settings.scoreMagnification}
            scoreOffsetX={settings.scoreOffsetX}
            scoreOffsetY={settings.scoreOffsetY}
            columns={columns}
            shiftColumns={shiftColumns}
            midiAppearance={settings.midi ? appearance : midiOff}
            onScale={(keyScale) => patch({ keyScale })}
            onShowNotes={(showNotes) => patch({ showNotes })}
            onShowKey={(showKey) => patch({ showKey })}
            onKeepAlive={(keepAlive) => patch({ keepAlive })}
            onShowPositions={(showPositions) => patch({ showPositions })}
            onMidi={setMidi}
            onInstrument={(instrument) => void chooseInstrument(instrument)}
            onKeySignature={(key) => patch({ keySignature: key.id })}
            onNoteColor={(noteColor) => patch({ noteColor })}
            onPositionColor={(positionColor) => patch({ positionColor })}
            onKeyHatch={(keyHatch: KeyHatch) => patch({ keyHatch })}
            onClearScore={() => {
              history.current.clear()
              setColumns([])
              setShiftColumns(0)
            }}
            onScoreView={(scoreMagnification, scoreOffsetX, scoreOffsetY) =>
              patch({ scoreMagnification, scoreOffsetX, scoreOffsetY })
            }
            onAdvertise={(bluetoothAdvertising) => {
              patch({ bluetoothAdvertising })
              if (settingsRef.current.midi) midiSetAdvertising(bluetoothAdvertising)
              setAppearance(midiAppearance())
            }}
          />
          <View style={{ height: layout.woodHeight + Math.max(0, height - layout.panelHeight - layout.woodHeight) }}>
            <Keybed
              instrument={settings.instrument}
              horn={horn}
              enabled={keysEnabled}
              onNotes={playNotes}
              showNotes={settings.showNotes}
              showPositions={settings.showPositions && settings.instrument === 'trombone'}
              showKey={settings.showKey}
              noteColor={settings.noteColor}
              positionColor={settings.positionColor}
              keySignature={keySignature}
              keyHatch={settings.keyHatch}
              scale={scale}
              woodHeight={layout.woodHeight}
              slideNote={slideNote}
              loading={!keysEnabled}
              initialOrigin={settings.keybedOrigin}
              onOrigin={(keybedOrigin) => patch({ keybedOrigin })}
              onToggleHorn={() => {
                if (settingsRef.current.instrument !== 'trombone') return
                patch({ horn: settingsRef.current.horn === 'straight' ? 'trigger' : 'straight' })
              }}
            />
          </View>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1B1B1B',
  },
})
