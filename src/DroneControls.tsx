import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { KeySignatureSheet } from './KeySignatureGlyph'
import { MoogFader } from './MoogChrome'
import { TPToggle } from './TPToggle'
import { keySignatureGlyphWidth } from './keySignatureLayout'
import {
  KeySignatureChoice,
  Picker,
  keyChoiceHeight,
  keyGlyphHeight,
} from './MoogPanel'
import { KeySignature } from './scoreNotation'
import type { DroneSettings } from './droneSettings'
import { dronePitchNames, shiftDroneOctave, type DroneVoice } from './drone'

const label = '#F4F1EA'

export function DroneControls({
  settings,
  loading,
  keepAlive,
  onKeepAlive,
  onChange,
}: {
  settings: DroneSettings
  loading: boolean
  keepAlive: boolean
  onKeepAlive: (enabled: boolean) => void
  onChange: (patch: Partial<DroneSettings>) => void
}) {
  const [keysOpen, setKeysOpen] = useState(false)
  const key = KeySignature.matching(settings.keySignature) ?? KeySignature.bFlat
  const names = dronePitchNames(key, settings.octave, {
    tonic: settings.tonic,
    fourth: settings.fourth,
    upper: settings.upper,
  })
  const glyphWidth = keySignatureGlyphWidth(keyGlyphHeight)
  return (
    <View style={styles.column}>
      {Platform.OS === 'web' ? null : (
        <TPToggle label="KEEP ALIVE" on={keepAlive} onPress={() => onKeepAlive(!keepAlive)} />
      )}
      <View style={styles.row}>
        <VoiceToggle label="TROMBONE" voice="trombone" settings={settings} onChange={onChange} />
        <VoiceToggle label="REED" voice="reed" settings={settings} onChange={onChange} />
        <VoiceToggle label="TONE" voice="tone" settings={settings} onChange={onChange} />
      </View>
      <Pressable accessibilityLabel={key.title} onPress={() => setKeysOpen(true)} style={styles.keyButton}>
        <View style={{ width: glyphWidth, height: keyGlyphHeight }}>
          <KeySignatureSheet
            signatures={[key]}
            staff="bass"
            chosenId={key.id}
            width={glyphWidth}
            rowHeight={keyGlyphHeight}
            glyphHeight={keyGlyphHeight}
          />
        </View>
        <Text style={styles.keyTitle}>{key.title}</Text>
      </Pressable>
      <View style={styles.steps}>
        <StepButton
          label="OCTAVE DOWN"
          disabled={settings.octave <= 1}
          onPress={() => onChange({ octave: shiftDroneOctave(settings.octave, -1) })}
        />
        <StepButton
          label="OCTAVE UP"
          disabled={settings.octave >= 4}
          onPress={() => onChange({ octave: shiftDroneOctave(settings.octave, 1) })}
        />
      </View>
      <View style={styles.row}>
        <TPToggle label="TONIC" on={settings.tonic} onPress={() => onChange({ tonic: !settings.tonic })} />
        <TPToggle label="FOURTH" on={settings.fourth} onPress={() => onChange({ fourth: !settings.fourth })} />
        <TPToggle label="OCTAVE" on={settings.upper} onPress={() => onChange({ upper: !settings.upper })} />
      </View>
      <TPToggle label="DRONE" on={settings.sounding} onPress={() => onChange({ sounding: !settings.sounding })} />
      <View style={styles.volume}>
        <Text style={styles.caption}>VOLUME</Text>
        <MoogFader value={settings.volume} minimum={0} maximum={1} onChange={(volume) => onChange({ volume })} />
      </View>
      <Text style={styles.sounding}>{loading ? 'Loading trombone…' : names.length > 0 ? names.join('  ') : 'Silent'}</Text>
      <Picker
        title="Key signature"
        visible={keysOpen}
        onClose={() => setKeysOpen(false)}
        focusIndex={KeySignature.catalog.findIndex((entry) => entry.id === key.id)}
        rowHeight={keyChoiceHeight}
      >
        <View>
          {KeySignature.catalog.map((entry) => (
            <KeySignatureChoice
              key={entry.id}
              signature={entry}
              chosen={entry.id === key.id}
              onPress={() => {
                onChange({ keySignature: entry.id })
                setKeysOpen(false)
              }}
            />
          ))}
          <KeySignatureSheet
            signatures={KeySignature.catalog}
            staff="bass"
            chosenId={key.id}
            width={keySignatureGlyphWidth(keyGlyphHeight)}
            rowHeight={keyChoiceHeight}
            glyphHeight={keyGlyphHeight}
          />
        </View>
      </Picker>
    </View>
  )
}

function VoiceToggle({
  label: caption,
  voice,
  settings,
  onChange,
}: {
  label: string
  voice: DroneVoice
  settings: DroneSettings
  onChange: (patch: Partial<DroneSettings>) => void
}) {
  return <TPToggle label={caption} on={settings.voice === voice} onPress={() => onChange({ voice })} />
}

function StepButton({ label: caption, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={caption}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.step, disabled && styles.stepDisabled]}
    >
      <Text style={styles.stepText}>{caption}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  column: { alignSelf: 'stretch', gap: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  steps: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  keyButton: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54 },
  keyTitle: { color: label, fontSize: 16, fontWeight: '500' },
  volume: { alignSelf: 'stretch', gap: 8 },
  caption: { color: label, fontSize: 12, letterSpacing: 0.6 },
  sounding: { color: label, fontSize: 18 },
  step: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#2C2C2C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: { opacity: 0.35 },
  stepText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
})
