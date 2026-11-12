import { useEffect, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import {
  midiAppearance,
  midiIsAvailable,
  midiListen,
  midiSetAdvertising,
  type MidiAppearance,
} from 'trombone-midi'
import { keyHatches, type KeyHatch } from './keyHatch'
import { instrumentSettingsSnapshot, patchInstrumentSettings, useInstrumentSettings } from './instrumentSettings'
import { BluetoothRune, ColorWell, HatchWell } from './MoogChrome'
import { HatchChoice, Picker } from './MoogPanel'
import { paletteRing, paletteSwatches, storedPaletteColor } from './panelMeasure'
import { TPToggle } from './TPToggle'

const midiOff: MidiAppearance = {
  available: false,
  glyph: 'disabled',
  statusLine: 'Off',
  wantsAdvertising: false,
}

export function SettingsToggles() {
  const settings = useInstrumentSettings()
  const [palette, setPalette] = useState<'note' | 'position' | null>(null)
  const [hatchOpen, setHatchOpen] = useState(false)
  const [bluetoothOpen, setBluetoothOpen] = useState(false)
  const [appearance, setAppearance] = useState(midiAppearance)
  const midiOn = settings.midi && Platform.OS === 'ios' && midiIsAvailable()
  const shown = midiOn ? appearance : midiOff

  useEffect(() => {
    if (!midiOn) return
    return midiListen(setAppearance)
  }, [midiOn])

  function advertise(next: boolean): void {
    patchInstrumentSettings({ bluetoothAdvertising: next })
    if (instrumentSettingsSnapshot().midi) midiSetAdvertising(next)
  }

  function chooseHatch(hatch: KeyHatch): void {
    patchInstrumentSettings({ keyHatch: hatch })
    setHatchOpen(false)
  }

  function chooseColor(swatch: string): void {
    const stored = storedPaletteColor(swatch)
    if (palette === 'note') patchInstrumentSettings({ noteColor: stored })
    if (palette === 'position') patchInstrumentSettings({ positionColor: stored })
    setPalette(null)
  }

  return (
    <View style={styles.settings}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.row}>
        <TPToggle
          label="SHOW NOTES"
          on={settings.showNotes}
          onPress={() => patchInstrumentSettings({ showNotes: !settings.showNotes })}
          accessory={
            <ColorWell color={settings.noteColor} label="Note labels" onPress={() => setPalette('note')} />
          }
        />
        <TPToggle
          label="SHOW KEY"
          on={settings.showKey}
          onPress={() => patchInstrumentSettings({ showKey: !settings.showKey })}
          accessory={<HatchWell hatch={settings.keyHatch} onPress={() => setHatchOpen(true)} />}
        />
        <TPToggle
          label="KEEP ALIVE"
          on={settings.keepAlive}
          onPress={() => patchInstrumentSettings({ keepAlive: !settings.keepAlive })}
        />
      </View>
      <View style={styles.row}>
        <TPToggle
          label="SHOW POSITIONS"
          on={settings.showPositions}
          disabled={settings.instrument !== 'trombone'}
          onPress={() => patchInstrumentSettings({ showPositions: !settings.showPositions })}
          accessory={
            <ColorWell
              color={settings.positionColor}
              label="Position labels"
              onPress={() => setPalette('position')}
            />
          }
        />
        <TPToggle
          label="MIDI"
          on={settings.midi}
          disabled={Platform.OS !== 'ios' || !midiIsAvailable()}
          onPress={() => {
            const next = !settings.midi
            patchInstrumentSettings({ midi: next })
            if (next) setAppearance(midiAppearance())
          }}
          accessory={<BluetoothRune appearance={shown} onPress={() => setBluetoothOpen(true)} />}
        />
      </View>
      <Picker title="Key pattern" visible={hatchOpen} onClose={() => setHatchOpen(false)}>
        <View style={styles.hatchRow}>
          {keyHatches.map((hatch) => (
            <HatchChoice
              key={hatch}
              hatch={hatch}
              chosen={hatch === settings.keyHatch}
              onPress={() => chooseHatch(hatch)}
            />
          ))}
        </View>
      </Picker>
      <Picker title="Color" visible={palette !== null} onClose={() => setPalette(null)}>
        <View style={styles.hatchRow}>
          {paletteSwatches.map((swatch) => {
            const current = palette === 'note' ? settings.noteColor : settings.positionColor
            const chosen = paletteRing(current, swatch)
            return (
              <Pressable
                key={swatch}
                accessibilityLabel={swatch}
                onPress={() => chooseColor(swatch)}
                style={[styles.swatch, { backgroundColor: swatch }, chosen && styles.swatchChosen]}
              />
            )
          })}
        </View>
      </Picker>
      <Picker title="Bluetooth" visible={bluetoothOpen} onClose={() => setBluetoothOpen(false)}>
        <Text style={styles.status}>{shown.statusLine}</Text>
        <Pressable
          onPress={() => advertise(!shown.wantsAdvertising)}
          style={styles.advertise}
        >
          <Text style={styles.advertiseText}>{shown.wantsAdvertising ? 'Stop advertising' : 'Advertise'}</Text>
        </Pressable>
      </Picker>
    </View>
  )
}

const styles = StyleSheet.create({
  settings: { alignItems: 'center', gap: 18 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  hatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 28, height: 28, borderRadius: 14 },
  swatchChosen: { borderWidth: 2, borderColor: '#FFFFFF' },
  status: { color: '#F4F1EA', fontSize: 15 },
  advertise: {
    height: 40,
    paddingHorizontal: 10,
    backgroundColor: '#070707',
    borderWidth: 1,
    borderColor: '#6A6A6A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  advertiseText: { color: '#FFFFFF', fontSize: 13 },
})
