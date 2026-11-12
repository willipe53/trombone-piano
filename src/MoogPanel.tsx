import { useEffect, useRef, useState } from 'react'
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
  type GestureResponderEvent,
} from 'react-native'
import { KeySignatureSheet } from './KeySignatureGlyph'
import { phoneModalOrientations } from './orientation'
import { BluetoothRune, ColorWell, HatchWell } from './MoogChrome'
import { TPToggle } from './TPToggle'
import { keySignatureGlyphWidth } from './keySignatureLayout'
import { keyHatches, type KeyHatch } from './keyHatch'
import {
  clampScoreMagnification,
  controlColumnWidth,
  controlContentWidth,
  controlInset,
  keyButtonWidth,
  controlRockerCount,
  paletteRing,
  paletteSwatches,
  clampScoreColumn,
  scoreColumnInset,
  scoreIsAtDefaultView,
  headerClearance,
  splitPanel,
  storedPaletteColor,
} from './panelMeasure'
import { firstChordRight, noteColumnCapacity, noteColumnMetrics, staffContentWidth } from './scoreMeasure'
import { ScoreStaff } from './ScoreStaff'
import { KeySignature, type KeySignature as Signature, type KeyboardInstrument, type ScoreColumn, type TromboneHorn } from './scoreNotation'
import type { MidiAppearance } from 'trombone-midi'

const panel = '#1B1B1B'
const label = '#F4F1EA'
const scoreHandleHit = 36

export function MoogPanel({
  width,
  height,
  showNotes,
  showKey,
  keepAlive,
  showPositions,
  positionsEnabled,
  midi,
  showMidi,
  instrument,
  horn,
  keySignature,
  noteColor,
  positionColor,
  keyHatch,
  scoreMagnification,
  scoreOffsetX,
  scoreOffsetY,
  columns,
  shiftColumns,
  midiAppearance,
  onShowNotes,
  onShowKey,
  onKeepAlive,
  onShowPositions,
  onMidi,
  onInstrument,
  onKeySignature,
  onNoteColor,
  onPositionColor,
  onKeyHatch,
  onClearScore,
  onScoreView,
  onAdvertise,
  onVisibleColumns,
  controls,
}: {
  width: number
  height: number
  showNotes: boolean
  showKey: boolean
  keepAlive: boolean
  showPositions: boolean
  positionsEnabled: boolean
  midi: boolean
  showMidi: boolean
  instrument: KeyboardInstrument
  horn: TromboneHorn
  keySignature: (typeof KeySignature.catalog)[number]
  noteColor: string
  positionColor: string
  keyHatch: KeyHatch
  scoreMagnification: number
  scoreOffsetX: number
  scoreOffsetY: number
  columns: readonly ScoreColumn[]
  shiftColumns: number
  midiAppearance: MidiAppearance
  onShowNotes: (show: boolean) => void
  onShowKey: (show: boolean) => void
  onKeepAlive: (enabled: boolean) => void
  onShowPositions: (show: boolean) => void
  onMidi: (enabled: boolean) => void
  onInstrument: (instrument: KeyboardInstrument) => void
  onKeySignature: (key: (typeof KeySignature.catalog)[number]) => void
  onNoteColor: (color: string) => void
  onPositionColor: (color: string) => void
  onKeyHatch: (hatch: KeyHatch) => void
  onClearScore: () => void
  onScoreView: (magnification: number, x: number, y: number) => void
  onAdvertise: (wants: boolean) => void
  onVisibleColumns: (count: number) => void
  controls?: React.ReactNode
}) {
  const [keysOpen, setKeysOpen] = useState(false)
  const [hatchOpen, setHatchOpen] = useState(false)
  const [bluetoothOpen, setBluetoothOpen] = useState(false)
  const [palette, setPalette] = useState<'note' | 'position' | null>(null)
  const pinch = useRef({ distance: 0, magnification: 1 })
  const scrollRef = useRef<ScrollViewInstance>(null)
  const offsetRef = useRef({ x: scoreOffsetX, y: scoreOffsetY })
  const [liveOffset, setLiveOffset] = useState({ x: scoreOffsetX, y: scoreOffsetY })
  const [scoreChoice, setScoreChoice] = useState<number | null>(null)
  const [scoreDragging, setScoreDragging] = useState(false)
  const splitDrag = useRef({ x: 0, score: 0, minimum: 0, panel: 0 })
  const blockWidth = controlContentWidth(controlRockerCount(Platform.OS !== 'web', showMidi))
  const split = splitPanel(width, controlColumnWidth(blockWidth))
  const scoreHeight = Math.max(0, height - headerClearance())
  const minScore = firstChordRight(staffContentWidth, scoreHeight, instrument, keySignature) + scoreColumnInset
  const scoreWidth = clampScoreColumn(scoreChoice ?? split.score, minScore, width)
  const leftWidth = Math.max(0, width - scoreWidth)
  const scoreViewport = Math.max(0, scoreWidth - scoreColumnInset)
  const columnFit = noteColumnMetrics(scoreHeight, instrument, keySignature)
  const visibleColumns = noteColumnCapacity(scoreViewport, scoreHeight, instrument, keySignature)
  const contentWidth = Math.max(scoreViewport, 1) * scoreMagnification
  const contentHeight = scoreHeight * scoreMagnification
  const showRecenter = !scoreIsAtDefaultView(scoreMagnification, liveOffset.x, liveOffset.y)

  useEffect(() => {
    onVisibleColumns(visibleColumns)
  }, [onVisibleColumns, visibleColumns])

  useEffect(() => {
    const next = { x: scoreOffsetX, y: scoreOffsetY }
    offsetRef.current = next
    setLiveOffset(next)
    scrollRef.current?.scrollTo({ x: scoreOffsetX, y: scoreOffsetY, animated: false })
  }, [scoreMagnification, scoreOffsetX, scoreOffsetY])

  function publishOffset(x: number, y: number): void {
    offsetRef.current = { x, y }
    setLiveOffset({ x, y })
    onScoreView(scoreMagnification, x, y)
  }

  function onStaffTouch(event: GestureResponderEvent): void {
    const touches = event.nativeEvent.touches
    if (touches.length < 2) return
    const distance = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY)
    if (pinch.current.distance <= 0) {
      pinch.current = { distance, magnification: scoreMagnification }
      return
    }
    const next = clampScoreMagnification(pinch.current.magnification * (distance / pinch.current.distance))
    onScoreView(next, offsetRef.current.x, offsetRef.current.y)
  }

  return (
    <View style={[styles.panel, { width, height }]}>
      <ScrollView
        style={[styles.controls, { width: leftWidth }]}
        contentContainerStyle={controls ? styles.controlContentTop : styles.controlContent}
      >
        {controls ?? (
        <View style={[styles.bank, { width: blockWidth }]}>
          <View style={styles.row}>
            <TPToggle
              label="SHOW NOTES"
              on={showNotes}
              onPress={() => onShowNotes(!showNotes)}
              accessory={<ColorWell color={noteColor} label="Note labels" onPress={() => setPalette('note')} />}
            />
            <TPToggle
              label="SHOW KEY"
              on={showKey}
              onPress={() => onShowKey(!showKey)}
              accessory={<HatchWell hatch={keyHatch} onPress={() => setHatchOpen(true)} />}
            />
            {Platform.OS === 'web' ? null : (
              <TPToggle label="KEEP ALIVE" on={keepAlive} onPress={() => onKeepAlive(!keepAlive)} />
            )}
          </View>
          <View style={styles.row}>
            <TPToggle
              label="TROMBONE"
              on={instrument === 'trombone'}
              onPress={() => onInstrument(instrument === 'trombone' ? 'piano' : 'trombone')}
            />
            <TPToggle
              label="SHOW POSITIONS"
              on={showPositions}
              disabled={!positionsEnabled}
              onPress={() => onShowPositions(!showPositions)}
              accessory={<ColorWell color={positionColor} label="Position labels" onPress={() => setPalette('position')} />}
            />
            {showMidi ? (
              <TPToggle
                label="MIDI"
                on={midi}
                onPress={() => onMidi(!midi)}
                accessory={<BluetoothRune appearance={midiAppearance} onPress={() => setBluetoothOpen(true)} />}
              />
            ) : null}
          </View>
          <View style={styles.keyLine}>
            <View style={styles.keyStack}>
              <Text style={styles.caption}>KEY SIGNATURE</Text>
              <Pressable accessibilityLabel={keySignature.title} onPress={() => setKeysOpen(true)} style={styles.keyButton}>
                <Text style={styles.keyText}>{keySignature.title}</Text>
                <Text style={styles.keyChevron}>▾</Text>
              </Pressable>
            </View>
          </View>
        </View>
        )}
      </ScrollView>
      <View style={[styles.scoreColumn, { width: scoreWidth }]}>
        <View style={{ height: headerClearance() }} />
        <View style={styles.scoreFrame}>
          <ScrollView
            ref={scrollRef}
            style={styles.scoreScroll}
            onScroll={(event) => {
              const next = {
                x: event.nativeEvent.contentOffset.x,
                y: event.nativeEvent.contentOffset.y,
              }
              offsetRef.current = next
              setLiveOffset(next)
            }}
            scrollEventThrottle={16}
            onScrollEndDrag={(event) => publishOffset(event.nativeEvent.contentOffset.x, event.nativeEvent.contentOffset.y)}
            onMomentumScrollEnd={(event) => publishOffset(event.nativeEvent.contentOffset.x, event.nativeEvent.contentOffset.y)}
          >
            <View
              style={{ width: contentWidth, height: contentHeight }}
              onTouchStart={onStaffTouch}
              onTouchMove={onStaffTouch}
              onTouchEnd={() => {
                pinch.current.distance = 0
              }}
            >
              <ScoreStaff
                width={contentWidth}
                height={contentHeight}
                instrument={instrument}
                horn={horn}
                showPositions={showPositions && positionsEnabled}
                keySignature={keySignature}
                columns={columns}
                shiftColumns={shiftColumns}
                visibleCount={visibleColumns}
                columnSlot={columnFit.slot * scoreMagnification}
                columnHead={columnFit.headWidth * scoreMagnification}
              />
            </View>
          </ScrollView>
          <Pressable accessibilityLabel="Clear score" onPress={onClearScore} style={styles.clearButton}>
            <Text style={styles.recenterText}>CLEAR</Text>
          </Pressable>
          {showRecenter ? (
            <Pressable
              accessibilityLabel="Recenter"
              onPress={() => onScoreView(1, 0, 0)}
              style={styles.recenter}
            >
              <Text style={styles.recenterText}>RECENTER</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <View
        accessibilityLabel="Resize score"
        accessibilityRole="adjustable"
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => {
          splitDrag.current = { x: event.nativeEvent.pageX, score: scoreWidth, minimum: minScore, panel: width }
          setScoreDragging(true)
        }}
        onResponderMove={(event) => {
          const drag = splitDrag.current
          const next = drag.score - (event.nativeEvent.pageX - drag.x)
          setScoreChoice(clampScoreColumn(next, drag.minimum, drag.panel))
        }}
        onResponderRelease={() => setScoreDragging(false)}
        onResponderTerminate={() => setScoreDragging(false)}
        style={[styles.scoreHandle, { left: leftWidth - scoreHandleHit / 2, top: headerClearance() }]}
      >
        <View style={styles.scoreSeam} />
        <View style={[styles.scoreGrip, scoreDragging && styles.scoreGripHeld]}>
          <View style={styles.scoreGripLine} />
        </View>
      </View>
      <Picker
        title="Key signature"
        visible={keysOpen}
        onClose={() => setKeysOpen(false)}
        focusIndex={KeySignature.catalog.findIndex((key) => key.id === keySignature.id)}
        rowHeight={keyChoiceHeight}
      >
        <View>
          {KeySignature.catalog.map((key) => (
            <KeySignatureChoice
              key={key.id}
              signature={key}
              chosen={key.id === keySignature.id}
              onPress={() => {
                onKeySignature(key)
                setKeysOpen(false)
              }}
            />
          ))}
          <KeySignatureSheet
            signatures={KeySignature.catalog}
            staff={instrument === 'trombone' ? 'bass' : 'treble'}
            chosenId={keySignature.id}
            width={keySignatureGlyphWidth(keyGlyphHeight)}
            rowHeight={keyChoiceHeight}
            glyphHeight={keyGlyphHeight}
          />
        </View>
      </Picker>
      <Picker title="Key pattern" visible={hatchOpen} onClose={() => setHatchOpen(false)}>
        <View style={styles.hatchRow}>
          {keyHatches.map((hatch) => (
            <HatchChoice
              key={hatch}
              hatch={hatch}
              chosen={hatch === keyHatch}
              onPress={() => {
                onKeyHatch(hatch)
                setHatchOpen(false)
              }}
            />
          ))}
        </View>
      </Picker>
      <Picker title="Color" visible={palette !== null} onClose={() => setPalette(null)}>
        <View style={styles.hatchRow}>
          {paletteSwatches.map((swatch) => {
            const current = palette === 'note' ? noteColor : positionColor
            const chosen = paletteRing(current, swatch)
            return (
              <Pressable
                key={swatch}
                accessibilityLabel={swatch}
                onPress={() => {
                  const stored = storedPaletteColor(swatch)
                  if (palette === 'note') onNoteColor(stored)
                  if (palette === 'position') onPositionColor(stored)
                  setPalette(null)
                }}
                style={[styles.paletteSwatch, { backgroundColor: swatch }, chosen && styles.paletteChosen]}
              />
            )
          })}
        </View>
      </Picker>
      <Picker title="Bluetooth" visible={bluetoothOpen} onClose={() => setBluetoothOpen(false)}>
        <Text style={styles.pickerText}>{midiAppearance.statusLine}</Text>
        <Pressable
          onPress={() => onAdvertise(!midiAppearance.wantsAdvertising)}
          style={styles.keyButton}
        >
          <Text style={styles.keyText}>{midiAppearance.wantsAdvertising ? 'Stop advertising' : 'Advertise'}</Text>
        </Pressable>
      </Picker>
    </View>
  )
}

export function HatchChoice({ hatch, chosen, onPress }: { hatch: KeyHatch; chosen: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={hatch} onPress={onPress} style={[styles.hatchChoice, chosen && styles.hatchChosen]}>
      <HatchWell hatch={hatch} onPress={onPress} />
    </Pressable>
  )
}

export const keyChoiceHeight = 54
export const keyGlyphHeight = 48

export function KeySignatureChoice({
  signature,
  chosen,
  onPress,
}: {
  signature: Signature
  chosen: boolean
  onPress: () => void
}) {
  const color = chosen ? '#FFFFFF' : '#BDBDBD'
  return (
    <Pressable
      accessibilityLabel={signature.title}
      accessibilityState={{ selected: chosen }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.keyChoice,
        chosen && styles.keyChoiceChosen,
        pressed && styles.keyChoicePressed,
      ]}
    >
      <View style={{ width: keySignatureGlyphWidth(keyGlyphHeight), height: keyGlyphHeight }} />
      <Text style={[styles.keyChoiceText, { color }]}>{signature.title}</Text>
    </Pressable>
  )
}

export function Picker({
  title,
  visible,
  onClose,
  children,
  focusIndex,
  rowHeight,
}: {
  title: string
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  focusIndex?: number
  rowHeight?: number
}) {
  const list = useRef<ScrollViewInstance>(null)
  const [listHeight, setListHeight] = useState(0)
  useEffect(() => {
    if (!visible || focusIndex === undefined || focusIndex < 0 || !rowHeight || listHeight <= 0) return
    const target = focusIndex * rowHeight - (listHeight - rowHeight) / 2
    const frame = requestAnimationFrame(() => {
      list.current?.scrollTo({ y: Math.max(0, target), animated: false })
    })
    return () => cancelAnimationFrame(frame)
  }, [visible, focusIndex, rowHeight, listHeight])
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={phoneModalOrientations()}
    >
      <Pressable style={styles.modalShade} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView
            ref={list}
            style={styles.modalList}
            onLayout={(event) => setListHeight(event.nativeEvent.layout.height)}
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: panel,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  controls: {
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  controlContent: {
    paddingHorizontal: controlInset,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 18,
    alignItems: 'flex-start',
    flexGrow: 1,
    justifyContent: 'center',
  },
  controlContentTop: {
    paddingHorizontal: controlInset,
    paddingTop: headerClearance() + 8,
    paddingBottom: 16,
    alignItems: 'flex-start',
  },
  bank: {
    alignSelf: 'flex-start',
    gap: 18,
  },
  scoreColumn: {
    paddingRight: scoreColumnInset,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: panel,
    zIndex: 1,
  },
  scoreHandle: {
    position: 'absolute',
    bottom: 0,
    width: scoreHandleHit,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreSeam: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#4A4A4A',
  },
  scoreGrip: {
    width: 18,
    height: 46,
    borderRadius: 2,
    backgroundColor: '#C8C8C8',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreGripHeld: {
    backgroundColor: '#F4F4F4',
  },
  scoreGripLine: {
    width: 1,
    height: 28,
    backgroundColor: '#1A1A1A',
  },
  scoreFrame: {
    flex: 1,
  },
  scoreScroll: {
    flex: 1,
  },
  clearButton: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#070707',
    borderWidth: 1,
    borderColor: '#6A6A6A',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recenter: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#070707',
    borderWidth: 1,
    borderColor: '#6A6A6A',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recenterText: {
    color: '#FFFFFF',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  paletteSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  paletteChosen: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  caption: {
    color: '#FFFFFF',
    fontSize: 12,
    letterSpacing: 1.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
  },
  keyLine: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    alignSelf: 'stretch',
    justifyContent: 'center',
    gap: 8,
  },
  keyStack: {
    alignItems: 'center',
    gap: 8,
  },
  rocker: {
    height: 36,
    borderRadius: 8,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    justifyContent: 'center',
  },
  rockerOn: {
    backgroundColor: '#242424',
  },
  rockerCap: {
    width: 34,
    height: 26,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  capOff: {
    alignSelf: 'flex-start',
    backgroundColor: '#5C5C5C',
  },
  capOn: {
    alignSelf: 'flex-end',
    backgroundColor: '#D7D7D7',
  },
  dim: {
    opacity: 0.35,
  },
  fader: {
    height: 28,
    justifyContent: 'center',
  },
  faderTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A3A3A',
  },
  faderCap: {
    position: 'absolute',
    width: 18,
    height: 22,
    marginLeft: -9,
    borderRadius: 3,
    backgroundColor: '#C8C8C8',
  },
  swatchButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#8A8A8A',
  },
  hatch: {
    minWidth: 88,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8A8A8A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  hatchText: {
    color: label,
    fontSize: 12,
  },
  bluetooth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 32,
  },
  bluetoothMark: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  bluetoothText: {
    color: label,
    fontSize: 13,
  },
  keyButton: {
    width: keyButtonWidth,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 0,
    backgroundColor: '#070707',
    borderWidth: 1,
    borderColor: '#6A6A6A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  keyText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  keyChevron: {
    color: '#FFFFFF',
    fontSize: 10,
    marginLeft: 8,
  },
  modalShade: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    maxHeight: '80%',
    backgroundColor: '#1B1B1B',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  modalList: {
    flexGrow: 0,
  },
  keyChoice: {
    height: keyChoiceHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  keyChoiceChosen: {
    backgroundColor: '#2C2C2C',
  },
  keyChoicePressed: {
    backgroundColor: '#3A3A3A',
  },
  keyChoiceText: {
    fontSize: 13,
    letterSpacing: 0.8,
  },
  pickerRow: {
    minHeight: 44,
    justifyContent: 'center',
  },
  pickerText: {
    color: label,
    fontSize: 15,
  },
  hatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hatchChoice: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  hatchChosen: {
    borderColor: '#FFFFFF',
  },
})
