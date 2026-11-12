import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Dimensions, Easing, Modal, Platform, Pressable, StyleSheet, Text, View, type ViewInstance } from 'react-native'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TitleWordmark } from './AppTitle'
import { CloseBall, HelpBall, SettingsBall } from './MoogChrome'
import { phoneModalOrientations } from './orientation'
import { HelpDialog } from './HelpScreen'
import { KeyboardPanel } from './KeyboardPanel'
import { useInstrumentSettings } from './instrumentSettings'
import { readLayoutSettings, writeLayoutSettings } from './layoutSettings'
import { fittedTitleSize, titleBallSize, titleGap, titleMarkSize, titleMarkWidthAtPreferred } from './panelMeasure'
import { SettingsToggles } from './SettingsDialog'

const line = '#3A3A3A'
const ink = '#FFFFFF'
type Dialog = 'Help' | 'Settings'

function windowAnchor(kind: Dialog): { x: number; y: number } {
  const window = Dimensions.get('window')
  return { x: kind === 'Settings' ? 28 : window.width - 28, y: 28 }
}

export function Stage({
  onClose,
  children,
}: {
  onClose?: () => void
  children?: ReactNode
}) {
  const insets = useSafeAreaInsets()
  useKeepAwake()
  const [headerWidth, setHeaderWidth] = useState(0)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [arrival, setArrival] = useState(0)
  const settingsAnchor = useRef<ViewInstance>(null)
  const helpAnchor = useRef<ViewInstance>(null)
  const origin = useRef(windowAnchor('Settings'))
  const generation = useRef(0)
  const closing = useRef(false)
  const [shift] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }))
  const [veil] = useState(() => new Animated.Value(0))
  const padLeft = insets.left + 12
  const padRight = insets.right + 12
  const titleRoom =
    headerWidth > 0
      ? Math.max(0, headerWidth - padLeft - padRight - titleBallSize - titleGap - titleBallSize)
      : titleMarkWidthAtPreferred
  const titleSize = fittedTitleSize(titleRoom, (fontSize) => titleMarkSize(fontSize).width)
  const mark = titleMarkSize(titleSize)

  useEffect(() => {
    if (!dialog) return
    const motion = Animated.parallel([
      Animated.timing(shift, {
        toValue: { x: 0, y: 0 },
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(veil, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ])
    motion.start()
    return () => motion.stop()
  }, [arrival, dialog, shift, veil])

  function place(kind: Dialog, anchor: { x: number; y: number }): void {
    const window = Dimensions.get('window')
    shift.stopAnimation()
    veil.stopAnimation()
    origin.current = anchor
    generation.current += 1
    closing.current = false
    shift.setValue({ x: anchor.x - window.width / 2, y: anchor.y - window.height / 2 })
    veil.setValue(0)
    setDialog(kind)
    setArrival((value) => value + 1)
  }

  function open(kind: Dialog): void {
    const node = kind === 'Settings' ? settingsAnchor.current : helpAnchor.current
    if (!node) {
      place(kind, windowAnchor(kind))
      return
    }
    node.measureInWindow((x, y, width, height) => {
      place(
        kind,
        width > 0 && height > 0 ? { x: x + width / 2, y: y + height / 2 } : windowAnchor(kind),
      )
    })
  }

  function dismiss(): void {
    if (!dialog || closing.current) return
    closing.current = true
    const token = generation.current
    const window = Dimensions.get('window')
    Animated.parallel([
      Animated.timing(shift, {
        toValue: {
          x: origin.current.x - window.width / 2,
          y: origin.current.y - window.height / 2,
        },
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(veil, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      closing.current = false
      if (!finished || token !== generation.current) return
      setDialog(null)
    })
  }

  return (
    <View style={styles.screen}>
      <View
        onLayout={(event) => {
          const next = event.nativeEvent.layout.width
          setHeaderWidth((current) => (current === next ? current : next))
        }}
        style={[
          styles.header,
          {
            paddingTop: insets.top + 7,
            paddingLeft: padLeft,
            paddingRight: padRight,
          },
        ]}
      >
        <View ref={settingsAnchor} collapsable={false}>
          <SettingsBall onPress={() => open('Settings')} />
        </View>
        <View style={styles.spacer} />
        <TitleWordmark width={mark.width} height={mark.height} />
        <View style={{ width: titleGap }} />
        {onClose ? (
          <CloseBall onPress={onClose} />
        ) : (
          <View ref={helpAnchor} collapsable={false}>
            <HelpBall onPress={() => open('Help')} />
          </View>
        )}
      </View>
      <View
        style={[
          styles.body,
          { paddingLeft: insets.left, paddingRight: insets.right, paddingBottom: insets.bottom },
        ]}
      >
        {children ?? <Panels />}
      </View>
      <Modal
        visible={dialog !== null}
        transparent
        animationType="none"
        onRequestClose={dismiss}
        supportedOrientations={phoneModalOrientations()}
      >
        <View style={styles.shade} pointerEvents="box-none">
          <Animated.View style={[StyleSheet.absoluteFill, styles.veil, { opacity: veil }]}>
            <Pressable accessibilityLabel="Dismiss" style={StyleSheet.absoluteFill} onPress={dismiss} />
          </Animated.View>
          <Animated.View style={{ transform: shift.getTranslateTransform() }}>
            {dialog === 'Help' ? (
              <HelpDialog />
            ) : dialog === 'Settings' ? (
              <View accessibilityLabel="Settings" style={styles.card}>
                <SettingsToggles />
              </View>
            ) : null}
          </Animated.View>
        </View>
      </Modal>
    </View>
  )
}

function useKeepAwake(): void {
  const keepAlive = useInstrumentSettings().keepAlive
  useEffect(() => {
    if (Platform.OS === 'web' || !keepAlive) return
    void activateKeepAwakeAsync('trombone-piano')
    return () => {
      void deactivateKeepAwake('trombone-piano')
    }
  }, [keepAlive])
}

const handleHit = 36
const paneMinimum = 48

function Panels() {
  const stored = useState(readLayoutSettings)[0]
  const [box, setBox] = useState({ width: 0, height: 0 })
  const [columnRatio, setColumnRatio] = useState(stored.controls)
  const [keyboardRatio, setKeyboardRatio] = useState(stored.keyboard)
  const [columnHeld, setColumnHeld] = useState(false)
  const [keyboardHeld, setKeyboardHeld] = useState(false)
  const columnRatioRef = useRef(stored.controls)
  const keyboardRatioRef = useRef(stored.keyboard)
  const columnDrag = useRef({ x: 0, ratio: stored.controls })
  const keyboardDrag = useRef({ y: 0, ratio: stored.keyboard })
  const controls = box.width * clampShare(columnRatio, box.width)
  const keyboard = box.height * clampShare(keyboardRatio, box.height)
  const middleHeight = Math.max(0, box.height - keyboard)

  function finishDrag(): void {
    setColumnHeld(false)
    setKeyboardHeld(false)
    writeLayoutSettings({ controls: columnRatioRef.current, keyboard: keyboardRatioRef.current })
  }

  return (
    <View
      style={styles.panels}
      onLayout={(event) => {
        const next = event.nativeEvent.layout
        setBox((current) =>
          current.width === next.width && current.height === next.height
            ? current
            : { width: next.width, height: next.height },
        )
      }}
    >
      <View style={[styles.middle, { height: middleHeight }]}>
        <View style={[styles.pane, { width: controls, flexBasis: 'auto', flexGrow: 0, flexShrink: 0 }]}>
          <Text style={styles.region}>Controls</Text>
        </View>
        <View style={[styles.pane, styles.paneFill]}>
          <Text style={styles.region}>Staffs</Text>
        </View>
        <View
          accessibilityLabel="Resize staffs"
          accessibilityRole="adjustable"
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(event) => {
            columnDrag.current = { x: event.nativeEvent.pageX, ratio: columnRatio }
            setColumnHeld(true)
          }}
          onResponderMove={(event) => {
            if (box.width <= 0) return
            const next = clampShare(
              columnDrag.current.ratio + (event.nativeEvent.pageX - columnDrag.current.x) / box.width,
              box.width,
            )
            columnRatioRef.current = next
            setColumnRatio(next)
          }}
          onResponderRelease={finishDrag}
          onResponderTerminate={finishDrag}
          style={[styles.columnHandle, { left: controls - handleHit / 2 }]}
        >
          <View style={styles.columnSeam} />
          <View style={[styles.columnGrip, columnHeld && styles.gripHeld]}>
            <View style={styles.columnGripLine} />
          </View>
        </View>
      </View>
      <View style={[styles.keyboard, { height: keyboard }]}>
        {keyboard > 0 ? <KeyboardPanel height={keyboard} /> : null}
      </View>
      <View
        accessibilityLabel="Keyboard size"
        accessibilityRole="adjustable"
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => {
          keyboardDrag.current = { y: event.nativeEvent.pageY, ratio: keyboardRatio }
          setKeyboardHeld(true)
        }}
        onResponderMove={(event) => {
          if (box.height <= 0) return
          const next = clampShare(
            keyboardDrag.current.ratio - (event.nativeEvent.pageY - keyboardDrag.current.y) / box.height,
            box.height,
          )
          keyboardRatioRef.current = next
          setKeyboardRatio(next)
        }}
        onResponderRelease={finishDrag}
        onResponderTerminate={finishDrag}
        style={[styles.keyboardHandle, { top: middleHeight - handleHit / 2 }]}
      >
        <View style={styles.keyboardSeam} />
        <View style={[styles.keyboardGrip, keyboardHeld && styles.gripHeld]}>
          <View style={styles.keyboardGripLine} />
        </View>
      </View>
    </View>
  )
}

function clampShare(share: number, span: number): number {
  if (span <= paneMinimum * 2) return 0.5
  const minimum = paneMinimum / span
  return Math.min(1 - minimum, Math.max(minimum, share))
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1B1B1B' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: line,
  },
  spacer: { flex: 1 },
  body: { flex: 1 },
  panels: { flex: 1 },
  middle: { flexDirection: 'row', minHeight: 0, overflow: 'hidden' },
  pane: { alignItems: 'center', justifyContent: 'center', minWidth: 0, overflow: 'hidden' },
  paneFill: { flex: 1 },
  keyboard: { minHeight: 0, overflow: 'hidden' },
  columnHandle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: handleHit,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  columnSeam: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#4A4A4A',
  },
  columnGrip: {
    width: 18,
    height: 46,
    borderRadius: 2,
    backgroundColor: '#C8C8C8',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnGripLine: { width: 1, height: 28, backgroundColor: '#1A1A1A' },
  keyboardHandle: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: handleHit,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  keyboardSeam: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#4A4A4A',
  },
  keyboardGrip: {
    width: 46,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#C8C8C8',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardGripLine: { width: 28, height: 1, backgroundColor: '#1A1A1A' },
  gripHeld: { backgroundColor: '#F4F4F4' },
  region: { color: ink, fontSize: 28, fontWeight: '500' },
  shade: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  veil: { backgroundColor: 'rgba(0,0,0,0.45)' },
  card: {
    minWidth: 220,
    backgroundColor: '#1B1B1B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: line,
    paddingHorizontal: 36,
    paddingVertical: 28,
    alignItems: 'center',
  },
})
