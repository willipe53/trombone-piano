import { useEffect, useRef, useState } from 'react'
import { AppState, Platform, StyleSheet, View } from 'react-native'
import {
  midiIsAvailable,
  midiPlay,
  midiReleaseHeldNotes,
  midiRestore,
  midiSetAdvertising,
  midiSetEnabled,
} from 'trombone-midi'
import { getEngine } from './engine'
import { Keybed } from './Keybed'
import {
  instrumentSettingsSnapshot,
  patchInstrumentSettings,
  useInstrumentSettings,
  writeInstrumentSettings,
  type InstrumentSettings,
} from './instrumentSettings'
import { woodHeightForBand } from './moogLayout'
import { noteChanges } from './samples'
import { KeySignature, TromboneHorn } from './scoreNotation'

const engine = getEngine()

export function KeyboardPanel({ height }: { height: number }) {
  const settings = useInstrumentSettings()
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [slideNote, setSlideNote] = useState<number | null>(null)
  const settingsRef = useRef(settings)
  const soundingRef = useRef<ReadonlySet<number>>(new Set())
  const playedOrder = useRef<number[]>([])
  const midiWas = useRef(settings.midi)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    const stored = settingsRef.current
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
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const stored = settingsRef.current
    if (!stored.midi) return
    if (!midiReady() || !midiSetEnabled(true)) {
      patch({ midi: false })
      return
    }
    midiSetAdvertising(stored.bluetoothAdvertising)
  }, [])

  useEffect(() => {
    if (midiWas.current === settings.midi) return
    midiWas.current = settings.midi
    const notes = soundingRef.current
    if (settings.midi) {
      engine.silence()
      if (!midiReady() || !midiSetEnabled(true)) {
        midiWas.current = false
        patch({ midi: false })
        void engine.resume().then(() => engine.setSounding(notes))
        return
      }
      midiPlay([...notes].sort((a, b) => a - b), [])
      midiSetAdvertising(instrumentSettingsSnapshot().bluetoothAdvertising)
      return
    }
    midiReleaseHeldNotes()
    midiSetEnabled(false)
    void engine.resume().then(() => engine.setSounding(notes))
  }, [settings.midi])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        writeInstrumentSettings(settingsRef.current)
        if (settingsRef.current.midi) midiReleaseHeldNotes()
      }
      if (state === 'active') {
        if (settingsRef.current.midi && midiReady()) {
          midiRestore()
          midiPlay([...soundingRef.current].sort((a, b) => a - b), [])
        } else {
          void engine.resume().then(() => engine.setSounding(soundingRef.current))
        }
      }
    })
    return () => {
      subscription.remove()
      engine.silence()
    }
  }, [])

  function patch(partial: Partial<InstrumentSettings>): void {
    settingsRef.current = patchInstrumentSettings(partial)
  }

  function playNotes(notes: Set<number>): void {
    const changes = noteChanges(soundingRef.current, notes)
    soundingRef.current = notes
    for (const midi of changes.stopped) {
      playedOrder.current = playedOrder.current.filter((note) => note !== midi)
    }
    playedOrder.current.push(...changes.started)
    setSlideNote(playedOrder.current.at(-1) ?? null)
    if (settingsRef.current.midi && midiReady()) midiPlay(changes.started, changes.stopped)
    else void engine.resume().then(() => engine.setSounding(notes))
  }

  const horn = settings.horn === 'trigger' ? TromboneHorn.trigger : TromboneHorn.straight
  const keySignature = KeySignature.matching(settings.keySignature) ?? KeySignature.bFlat
  const keysEnabled = ready && !loading

  return (
    <View style={styles.band}>
      <Keybed
        instrument={settings.instrument}
        horn={horn}
        enabled={keysEnabled}
        playKeys={keysEnabled}
        onNotes={playNotes}
        showNotes={settings.showNotes}
        showPositions={settings.showPositions && settings.instrument === 'trombone'}
        showKey={settings.showKey}
        noteColor={settings.noteColor}
        positionColor={settings.positionColor}
        keySignature={keySignature}
        keyHatch={settings.keyHatch}
        woodHeight={woodHeightForBand(height)}
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
  )
}

function midiReady(): boolean {
  return Platform.OS === 'ios' && midiIsAvailable()
}

const styles = StyleSheet.create({
  band: { flex: 1 },
})
