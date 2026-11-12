import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
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
import { DroneControls } from './DroneControls'
import { droneNotes, type DroneToggles } from './drone'
import { readDroneSettings, writeDroneSettings, type DroneSettings } from './droneSettings'
import { useHeaderLeading } from './AppFrame'
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
import { MoogLayout, scaleForKeyboardBlock } from './moogLayout'
import { noteChanges } from './samples'
import {
  KeySignature,
  ScoreHistory,
  TromboneHorn,
  type ScoreColumn,
} from './scoreNotation'
import type { KeyHatch } from './keyHatch'

const visibleKeyRatio = 0.85
const keyHandleHit = 36

function keyHeightForScale(scale: number): number {
  return whiteKeyHeightMm * scale * ipadProPointsPerMillimeter * visibleKeyRatio
}
const emptyNotes = new Set<number>()
const engine = getEngine()
const keepAwakeTag = 'trombone-piano'

const midiOff: MidiAppearance = {
  available: false,
  glyph: 'disabled',
  statusLine: 'Off',
  wantsAdvertising: false,
}

export function InstrumentScreen({
  mode,
  onMode,
}: {
  mode: 'piano' | 'drone'
  onMode: (mode: 'piano' | 'drone') => void
}) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [settings, setSettings] = useState<InstrumentSettings>(defaultInstrumentSettings)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sounding, setSounding] = useState<ReadonlySet<number>>(new Set())
  const [slideNote, setSlideNote] = useState<number | null>(null)
  const [columns, setColumns] = useState<readonly ScoreColumn[]>([])
  const [shiftColumns, setShiftColumns] = useState(0)
  const [appearance, setAppearance] = useState<MidiAppearance>(midiOff)
  const [drone, setDrone] = useState<DroneSettings>(readDroneSettings)
  const [, setDroneEpoch] = useState(0)
  const history = useRef(new ScoreHistory())
  const keyDrag = useRef({ y: 0, block: 0 })
  const [keyDragging, setKeyDragging] = useState(false)
  const playedOrder = useRef<number[]>([])
  const settingsRef = useRef(settings)
  const soundingRef = useRef(sounding)
  const droneRef = useRef(drone)
  const modeRef = useRef(mode)
  settingsRef.current = settings
  soundingRef.current = sounding
  droneRef.current = drone
  modeRef.current = mode
  const showMidi = Platform.OS === 'ios' && midiIsAvailable()

  function commit(next: InstrumentSettings): void {
    settingsRef.current = next
    setSettings(next)
    writeInstrumentSettings(next)
  }

  function patch(partial: Partial<InstrumentSettings>): void {
    commit({ ...settingsRef.current, ...partial })
  }

  function patchDrone(partial: Partial<DroneSettings>): void {
    const next = { ...droneRef.current, ...partial }
    droneRef.current = next
    setDrone(next)
    writeDroneSettings(next)
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
        if (modeRef.current === 'drone') {
          void engine.resume()
          return
        }
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

  useEffect(() => {
    if (mode === 'drone') {
      if (soundingRef.current.size > 0) {
        history.current.apply([], [...soundingRef.current])
        setColumns([...history.current.columns])
      }
      soundingRef.current = new Set()
      playedOrder.current = []
      setSounding(new Set())
      return
    }
    engine.silence()
    midiReleaseHeldNotes()
    if (!settingsRef.current.midi) {
      void engine.resume().then(() => {
        if (modeRef.current !== 'piano') return
        engine.setSounding(soundingRef.current)
      })
    }
  }, [mode])

  const droneVoiceRef = useRef(drone.voice)
  const droneActiveRef = useRef(false)
  useEffect(() => {
    if (mode !== 'drone') {
      droneActiveRef.current = false
      return
    }
    let cancelled = false
    const entered = !droneActiveRef.current
    droneActiveRef.current = true
    const voiceChanged = droneVoiceRef.current !== drone.voice
    droneVoiceRef.current = drone.voice
    const key = KeySignature.matching(drone.keySignature) ?? KeySignature.bFlat
    const toggles: DroneToggles = { tonic: drone.tonic, fourth: drone.fourth, upper: drone.upper }
    const notes = drone.sounding ? new Set(droneNotes(key, drone.octave, toggles)) : new Set<number>()
    const voice = drone.voice
    const volume = drone.volume
    if (entered || voiceChanged) engine.silence()
    void (async () => {
      await engine.resume()
      if (voice === 'trombone' && !engine.isLoaded('trombone')) await engine.load('trombone')
      if (cancelled || modeRef.current !== 'drone') return
      setDroneEpoch((value) => value + 1)
      midiReleaseHeldNotes()
      engine.setDrone(notes, voice, volume)
    })()
    return () => {
      cancelled = true
    }
  }, [mode, drone.sounding, drone.voice, drone.volume, drone.keySignature, drone.octave, drone.tonic, drone.fourth, drone.upper])

  const onVisibleColumns = useCallback((count: number) => {
    history.current.hold(count)
  }, [])

  function playNotes(notes: Set<number>): void {
    if (modeRef.current !== 'piano') return
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
    const shift = changes.started.length > 0 ? Math.max(1, removed) : 0
    if (shift > 0) {
      setShiftColumns(shift)
      const started = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - started) / 220)
        const eased = 1 - (1 - t) ** 3
        setShiftColumns(shift * (1 - eased))
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
  const droneKey = KeySignature.matching(drone.keySignature) ?? KeySignature.bFlat
  const keysEnabled = settings.midi || (ready && !loading)
  const droneLoading = mode === 'drone' && drone.voice === 'trombone' && !engine.isLoaded('trombone')
  const heldNotes = useMemo(() => {
    if (mode !== 'drone' || !drone.sounding) return emptyNotes
    return new Set(
      droneNotes(droneKey, drone.octave, { tonic: drone.tonic, fourth: drone.fourth, upper: drone.upper }),
    )
  }, [mode, drone.sounding, drone.octave, drone.tonic, drone.fourth, drone.upper, droneKey])
  const header = useMemo(
    () => (
      <View style={styles.modes}>
        <ModeButton label="Piano" selected={mode === 'piano'} onPress={() => onMode('piano')} />
        <ModeButton label="Drone" selected={mode === 'drone'} onPress={() => onMode('drone')} />
      </View>
    ),
    [mode, onMode],
  )
  useHeaderLeading(header, true)

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
            onVisibleColumns={onVisibleColumns}
            onAdvertise={(bluetoothAdvertising) => {
              patch({ bluetoothAdvertising })
              if (settingsRef.current.midi) midiSetAdvertising(bluetoothAdvertising)
              setAppearance(midiAppearance())
            }}
            controls={
              mode === 'drone' ? (
                <DroneControls
                  settings={drone}
                  loading={droneLoading}
                  keepAlive={settings.keepAlive}
                  onKeepAlive={(keepAlive) => patch({ keepAlive })}
                  onChange={patchDrone}
                />
              ) : undefined
            }
          />
          <View style={{ height: layout.woodHeight + Math.max(0, height - layout.panelHeight - layout.woodHeight) }}>
            <Keybed
              instrument={settings.instrument}
              horn={horn}
              enabled={mode === 'drone' || keysEnabled}
              playKeys={mode === 'piano' && keysEnabled}
              heldNotes={heldNotes}
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
          <View
            accessibilityLabel="Keyboard size"
            accessibilityRole="adjustable"
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
            onResponderGrant={(event) => {
              keyDrag.current = {
                y: event.nativeEvent.pageY,
                block: layout.woodHeight + keyHeight,
              }
              setKeyDragging(true)
            }}
            onResponderMove={(event) => {
              const dy = event.nativeEvent.pageY - keyDrag.current.y
              const next = scaleForKeyboardBlock(
                height,
                keyDrag.current.block - dy,
                minScale,
                maxScale,
                keyHeightForScale,
              )
              patch({ keyScale: next })
            }}
            onResponderRelease={() => setKeyDragging(false)}
            onResponderTerminate={() => setKeyDragging(false)}
            style={[styles.keyHandle, { top: layout.panelHeight - keyHandleHit / 2 }]}
          >
            <View style={styles.keySeam} />
            <View style={[styles.keyGrip, keyDragging && styles.keyGripHeld]}>
              <View style={styles.keyGripLine} />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  )
}

function ModeButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.mode, selected && styles.modeSelected]}
    >
      <Text style={styles.modeText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1B1B1B',
  },
  modes: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mode: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#2C2C2C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSelected: { backgroundColor: '#3E3E3E' },
  modeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
  keyHandle: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: keyHandleHit,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keySeam: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#4A4A4A',
  },
  keyGrip: {
    width: 46,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#C8C8C8',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyGripHeld: { backgroundColor: '#F4F4F4' },
  keyGripLine: { width: 28, height: 1, backgroundColor: '#1A1A1A' },
})
