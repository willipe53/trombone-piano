import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, Text as NativeText, View, type GestureResponderEvent } from 'react-native'
import {
  Canvas,
  Group,
  Image,
  Line,
  LinearGradient,
  Path,
  RoundedRect,
  Skia,
  Text,
  useFont,
  useImage,
  vec,
  type SkFont,
  type SkPath,
} from '@shopify/react-native-skia'
import { MoogLayout } from './moogLayout'
import { hatchPath, type KeyHatch } from './keyHatch'
import {
  pitchClasses,
  tromboneHornMessage,
  tromboneOuterDropForHorn,
  tromboneOuterShiftForTravel,
  trombonePositionLabel,
  tromboneSlide,
  TromboneHorn,
  type TromboneHorn as HornDrawing,
  type KeyboardInstrument,
  type KeySignature,
} from './scoreNotation'
import {
  clampScroll,
  centeredKeyboardOffset,
  ipadProPointsPerMillimeter,
  keyboardEdgeCue,
  keyboardEndFlingSpeed,
  keyboardOctaveFlingSpeed,
  keyboardOffsetForDrag,
  keyboardPageDuration,
  keyboardPageTarget,
  keyboardScrollRange,
  keyboardScrollTarget,
  keyboardWidth,
  keyScaleMax,
  layoutKeyboard,
  noteAt,
  noteBadgeStyle,
  noteLabel,
  octaveScrollDistance,
  scaleForVisibleKeyHeight,
  scaleThatFitsKeyboard,
  whiteKeyHeightMm,
  whiteKeyWidthMm,
  type NoteBadgeStyle,
  type PianoKey,
} from './geometry'
const visibleKeyRatio = 0.85
const noteGreen = '#17803A'
const labelTypeface = require('../assets/fonts/Roboto-Medium.ttf')

type TouchPoint = GestureResponderEvent['nativeEvent']['touches'][number]

type Motion =
  | {
      kind: 'ease'
      from: number
      to: number
      start: number
      duration: number
      springTarget: number | null
      springVelocity: number
    }
  | { kind: 'spring'; velocity: number; target: number; began: number }

export function Keybed({
  instrument,
  horn = TromboneHorn.straight,
  enabled,
  onNotes,
  showNotes = true,
  showPositions = false,
  showKey = false,
  noteColor = noteGreen,
  positionColor = noteGreen,
  keySignature,
  keyHatch = 'crosshatch',
  scale: scaleProp,
  woodHeight: woodHeightProp,
  slideNote = null,
  loading = false,
  initialOrigin = null,
  onOrigin,
  onToggleHorn,
}: {
  instrument: KeyboardInstrument
  horn?: HornDrawing
  enabled: boolean
  onNotes: (notes: Set<number>) => void
  showNotes?: boolean
  showPositions?: boolean
  showKey?: boolean
  noteColor?: string
  positionColor?: string
  keySignature?: KeySignature
  keyHatch?: KeyHatch
  scale?: number
  woodHeight?: number
  slideNote?: number | null
  loading?: boolean
  initialOrigin?: number | null
  onOrigin?: (origin: number) => void
  onToggleHorn?: () => void
}) {
  const [region, setRegion] = useState({ width: 0, height: 0 })
  const [origin, setOrigin] = useState(0)
  const [pressed, setPressed] = useState<ReadonlySet<number>>(new Set())
  const originRef = useRef(0)
  const onNotesRef = useRef(onNotes)
  onNotesRef.current = onNotes
  const onOriginRef = useRef(onOrigin)
  onOriginRef.current = onOrigin
  const motionRef = useRef<Motion | null>(null)
  const frameRef = useRef(0)
  const applied = useRef({ scale: -1, width: -1 })
  const drag = useRef({ startOrigin: 0, startX: 0, samples: [] as { t: number; x: number }[] })
  const arrowHits = useRef({ lower: null as ArrowHit | null, higher: null as ArrowHit | null })
  const keyPage = useRef({ x: 0, y: 0 })
  const keyHost = useRef<React.ComponentRef<typeof View>>(null)
  const wood = useImage(require('../swift_version/TrombonePiano/mahogany.png'))
  const straightInner = useImage(require('../swift_version/TrombonePiano/trombone_inner.png'))
  const straightOuter = useImage(require('../swift_version/TrombonePiano/trombone_outer.png'))
  const straightOver = useImage(require('../swift_version/TrombonePiano/trombone_over.png'))
  const triggerInner = useImage(require('../swift_version/TrombonePiano/trigger_inner.png'))
  const triggerOuter = useImage(require('../swift_version/TrombonePiano/trigger_outer.png'))
  const triggerOver = useImage(require('../swift_version/TrombonePiano/trigger_over.png'))
  const triggerRotate = useImage(require('../swift_version/TrombonePiano/trigger_rotate.png'))

  const woodHeight =
    woodHeightProp ??
    (region.height <= 0 ? 0 : Math.max(MoogLayout.minWoodHeight, Math.min(88, region.height * 0.18)))
  const keysHeight = Math.max(0, region.height - woodHeight)
  const width = region.width
  const minScale = width > 0 ? scaleThatFitsKeyboard(width) : keyScaleMax
  const heightCap = keysHeight > 0 ? scaleForVisibleKeyHeight(keysHeight, visibleKeyRatio) : minScale
  const scale = scaleProp ?? Math.min(keyScaleMax, Math.max(heightCap, minScale))
  const keys = useMemo(() => layoutKeyboard(scale), [scale])
  const bedWidth = keyboardWidth(keys)
  const fullHeight = whiteKeyHeightMm * scale * ipadProPointsPerMillimeter
  const topCrop = Math.max(0, fullHeight - keysHeight)
  const measureFont = useFont(labelTypeface, 32)
  const badge = useMemo(() => badgeFor(keys, measureFont), [keys, measureFont])
  const font = useFont(labelTypeface, Math.max(1, Math.round(badge?.fontSize ?? 16)))

  function place(next: number): void {
    originRef.current = next
    setOrigin(next)
  }

  function remember(): void {
    onOriginRef.current?.(originRef.current)
  }

  function stopMotion(): void {
    motionRef.current = null
    cancelAnimationFrame(frameRef.current)
  }

  useEffect(() => {
    if (width <= 0) return
    const range = keyboardScrollRange(bedWidth, width)
    if (applied.current.scale < 0 || applied.current.width < 0) {
      place(initialOrigin ?? centeredKeyboardOffset(bedWidth, width))
    } else if (scale !== applied.current.scale) {
      stopMotion()
      const keyboardX = applied.current.width / 2 - originRef.current
      const scaledX = keyboardX * (scale / applied.current.scale)
      place(clampScroll(range, width / 2 - scaledX))
    } else if (width !== applied.current.width) {
      stopMotion()
      const keyboardX = applied.current.width / 2 - originRef.current
      place(clampScroll(range, width / 2 - keyboardX))
    }
    applied.current = { scale, width }
    remember()
  }, [bedWidth, scale, width])

  useEffect(() => {
    if (enabled) return
    setPressed(new Set())
    onNotesRef.current(new Set())
  }, [enabled])

  function fling(velocity: number): void {
    const range = keyboardScrollRange(bedWidth, width)
    const from = originRef.current
    const target = keyboardScrollTarget(from, velocity, range, octaveScrollDistance(scale))
    const direction = velocity >= 0 ? 1 : -1
    const speed = Math.abs(velocity)
    const distance = Math.abs(target - from)
    const now = nowSeconds()
    if (speed < keyboardOctaveFlingSpeed) {
      motionRef.current = { kind: 'ease', from, to: target, start: now, duration: 0.25, springTarget: null, springVelocity: 0 }
    } else if (speed < keyboardEndFlingSpeed) {
      const duration = Math.min(0.42, Math.max(0.24, distance / Math.max(speed, 700)))
      motionRef.current = { kind: 'ease', from, to: target, start: now, duration, springTarget: null, springVelocity: 0 }
    } else if (distance < 24) {
      motionRef.current = { kind: 'spring', velocity: direction * Math.min(speed, 850), target, began: now }
    } else {
      const duration = Math.min(0.65, Math.max(0.2, (2.4 * distance) / Math.max(speed, 500)))
      const arrival = Math.min(780, (0.4 * distance) / duration)
      motionRef.current = {
        kind: 'ease',
        from,
        to: target,
        start: now,
        duration,
        springTarget: target,
        springVelocity: direction * arrival,
      }
    }
    runMotion()
  }

  function page(direction: 'lower' | 'higher'): void {
    const motion = motionRef.current
    const current = originRef.current
    let basis = current
    if (motion) {
      const dest = motion.kind === 'ease' ? motion.to : motion.target
      const towardLower = dest > current + 0.5
      const towardHigher = dest < current - 0.5
      if ((direction === 'lower' && towardLower) || (direction === 'higher' && towardHigher)) basis = dest
    }
    const range = keyboardScrollRange(bedWidth, width)
    const white = whiteKeyWidthMm * scale * ipadProPointsPerMillimeter
    const target = keyboardPageTarget(basis, direction, width, white, range)
    if (Math.abs(target - current) < 0.5) {
      stopMotion()
      place(target)
      remember()
      return
    }
    motionRef.current = {
      kind: 'ease',
      from: current,
      to: target,
      start: nowSeconds(),
      duration: keyboardPageDuration(Math.abs(target - current)),
      springTarget: null,
      springVelocity: 0,
    }
    runMotion()
  }

  function runMotion(): void {
    cancelAnimationFrame(frameRef.current)
    let last = nowSeconds()
    const step = (stamp: number) => {
      const motion = motionRef.current
      if (!motion) return
      const time = stamp / 1000
      const dt = Math.min(Math.max(time - last, 0), 1 / 30)
      last = time
      if (motion.kind === 'ease') {
        const t = (time - motion.start) / motion.duration
        if (t >= 1) {
          place(motion.to)
          if (motion.springTarget !== null) {
            motionRef.current = { kind: 'spring', velocity: motion.springVelocity, target: motion.springTarget, began: time }
          } else {
            motionRef.current = null
            remember()
          }
        } else {
          const progress = motion.springTarget === null ? easeOut(t) : flingProgress(t)
          place(motion.from + (motion.to - motion.from) * progress)
        }
      } else {
        const omega = 16
        const zeta = 0.55
        const displacement = originRef.current - motion.target
        const accel = -omega * omega * displacement - 2 * zeta * omega * motion.velocity
        const velocity = motion.velocity + accel * dt
        place(originRef.current + velocity * dt)
        if ((Math.abs(originRef.current - motion.target) < 0.5 && Math.abs(velocity) < 10) || time - motion.began > 1.6) {
          place(motion.target)
          motionRef.current = null
          remember()
        } else {
          motionRef.current = { ...motion, velocity }
        }
      }
      if (motionRef.current) frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
  }

  function notesFrom(touches: readonly TouchPoint[]): Set<number> {
    const next = new Set<number>()
    for (const touch of touches) {
      const x = localX(touch, keyPage.current.x)
      const y = localY(touch, keyPage.current.y)
      const note = noteAt(x - originRef.current, y + topCrop, keys)
      if (note !== null) next.add(note)
    }
    return next
  }

  function publish(next: Set<number>): void {
    setPressed((current) => (sameNotes(current, next) ? current : next))
    onNotes(next)
  }

  const inKey = keySignature ? pitchClasses(keySignature) : null
  const hornImage =
    horn.name === 'trigger'
      ? { inner: triggerInner, outer: triggerOuter, over: triggerOver, trigger: triggerRotate }
      : { inner: straightInner, outer: straightOuter, over: straightOver, trigger: null }
  const hornDrawing = hornFrame(width, woodHeight, horn, hornImage.inner, slideNote, instrument)
  const hornMessage =
    loading
      ? 'Loading sound files...'
      : instrument === 'trombone' && slideNote != null
        ? tromboneHornMessage(slideNote, horn)
        : null
  const hornX = hornDrawing?.frame.x
  const hornW = hornDrawing?.frame.width
  const scrollMarks = useMemo(
    () => scrollMarkPaths(width, woodHeight, hornX === undefined || hornW === undefined ? null : { x: hornX, width: hornW }),
    [hornW, hornX, width, woodHeight],
  )
  const edgeCue = keyboardEdgeCue(origin, keyboardScrollRange(bedWidth, width))
  arrowHits.current = {
    lower: edgeCue.left > 0 && scrollMarks.left ? scrollMarks.left.hit : null,
    higher: edgeCue.right > 0 && scrollMarks.right ? scrollMarks.right.hit : null,
  }

  return (
    <View
      style={styles.column}
      onLayout={(event) => {
        const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout
        setRegion({ width: nextWidth, height: nextHeight })
      }}
    >
      <View
        accessibilityLabel="mahogany strip"
        accessibilityHint="Drag to slide the keyboard, or tap an arrow to shift one view"
        style={[styles.wood, { height: woodHeight }]}
        onStartShouldSetResponder={() => enabled}
        onMoveShouldSetResponder={() => enabled}
        onResponderGrant={(event) => {
          stopMotion()
          const x = localX(event.nativeEvent.touches[0] ?? event.nativeEvent.changedTouches[0], 0)
          drag.current = { startOrigin: originRef.current, startX: x, samples: [{ t: performance.now(), x }] }
        }}
        onResponderMove={(event) => {
          const touch = event.nativeEvent.touches[0]
          if (!touch) return
          const x = localX(touch, 0)
          const samples = drag.current.samples
          samples.push({ t: performance.now(), x })
          if (samples.length > 8) samples.shift()
          const range = keyboardScrollRange(bedWidth, width)
          place(keyboardOffsetForDrag(drag.current.startOrigin + (x - drag.current.startX), range, width))
        }}
        onResponderRelease={(event) => {
          const samples = drag.current.samples
          const moved = samples.length > 0 ? Math.abs(samples[samples.length - 1].x - samples[0].x) : 0
          const touch = event.nativeEvent.changedTouches[0]
          if (moved < 8 && samples.length > 0) {
            const x = samples[0].x
            if (arrowHitContains(arrowHits.current.lower, x)) {
              page('lower')
              return
            }
            if (arrowHitContains(arrowHits.current.higher, x)) {
              page('higher')
              return
            }
          }
          if (moved < 8 && hornDrawing && onToggleHorn && touch) {
            const x = localX(touch, 0)
            const y = localY(touch, 0)
            const frame = hornDrawing.frame
            if (x >= frame.x && x <= frame.x + frame.width && y >= frame.y && y <= frame.y + frame.height) {
              onToggleHorn()
              return
            }
          }
          fling(dragVelocity(samples))
        }}
        onResponderTerminate={() => fling(0)}
      >
        {woodHeight > 0 && width > 0 ? (
          <Canvas style={{ width, height: woodHeight }} pointerEvents="none">
            {wood ? <Image image={wood} x={origin} y={0} width={bedWidth} height={woodHeight} fit="fill" /> : null}
            {hornDrawing && hornImage.inner ? (
              <Image image={hornImage.inner} x={hornDrawing.frame.x} y={hornDrawing.frame.y} width={hornDrawing.frame.width} height={hornDrawing.frame.height} fit="fill" />
            ) : null}
            {hornDrawing && hornImage.outer ? (
              <Image image={hornImage.outer} x={hornDrawing.outer.x} y={hornDrawing.outer.y} width={hornDrawing.outer.width} height={hornDrawing.outer.height} fit="fill" />
            ) : null}
            {hornDrawing && hornImage.over ? (
              <Image image={hornImage.over} x={hornDrawing.frame.x} y={hornDrawing.frame.y} width={hornDrawing.frame.width} height={hornDrawing.frame.height} fit="fill" />
            ) : null}
            {hornDrawing?.trigger && hornImage.trigger ? (
              <Image image={hornImage.trigger} x={hornDrawing.frame.x} y={hornDrawing.frame.y} width={hornDrawing.frame.width} height={hornDrawing.frame.height} fit="fill" />
            ) : null}
            <RoundedRect x={1} y={1} width={Math.max(0, width - 2)} height={Math.max(0, woodHeight - 2)} r={0} style="stroke" strokeWidth={1} color="#000000" />
            <EdgeMark path={scrollMarks.left?.path ?? null} opacity={edgeCue.left} />
            <EdgeMark path={scrollMarks.right?.path ?? null} opacity={edgeCue.right} />
          </Canvas>
        ) : null}
        {hornMessage ? (
          <NativeText style={styles.hornMessage} pointerEvents="none">
            {hornMessage}
          </NativeText>
        ) : null}
      </View>
      <View
        ref={keyHost}
        accessibilityLabel="keys"
        style={styles.keys}
        onLayout={() => {
          keyHost.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
            keyPage.current = { x: pageX, y: pageY }
          })
        }}
        onStartShouldSetResponder={() => enabled}
        onMoveShouldSetResponder={() => enabled}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => {
          keyHost.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
            keyPage.current = { x: pageX, y: pageY }
          })
          publish(notesFrom(activeTouches(event, false)))
        }}
        onResponderMove={(event) => publish(notesFrom(activeTouches(event, false)))}
        onResponderRelease={(event) => publish(notesFrom(activeTouches(event, true)))}
        onResponderTerminate={() => publish(new Set())}
      >
        {width > 0 && keysHeight > 0 ? (
          <Canvas style={{ width, height: keysHeight }} pointerEvents="none">
            <Group transform={[{ translateX: origin }, { translateY: -topCrop }]}>
              {keys.map((key) =>
                key.isBlack ? null : (
                  <DrawnKey
                    key={key.midiNote}
                    pianoKey={key}
                    pressed={pressed.has(key.midiNote)}
                    badge={badge}
                    font={font}
                    showNotes={showNotes}
                    showPositions={showPositions}
                    showKey={showKey}
                    inKey={inKey?.has(key.midiNote % 12) ?? true}
                    noteColor={noteColor}
                    positionColor={positionColor}
                    keyHatch={keyHatch}
                    horn={horn}
                  />
                ),
              )}
              {keys.map((key) =>
                key.isBlack ? (
                  <DrawnKey
                    key={key.midiNote}
                    pianoKey={key}
                    pressed={pressed.has(key.midiNote)}
                    badge={badge}
                    font={font}
                    showNotes={showNotes}
                    showPositions={showPositions}
                    showKey={showKey}
                    inKey={inKey?.has(key.midiNote % 12) ?? true}
                    noteColor={noteColor}
                    positionColor={positionColor}
                    keyHatch={keyHatch}
                    horn={horn}
                  />
                ) : null,
              )}
            </Group>
          </Canvas>
        ) : null}
      </View>
    </View>
  )
}

function DrawnKey({
  pianoKey,
  pressed,
  badge,
  font,
  showNotes,
  showPositions,
  showKey,
  inKey,
  noteColor,
  positionColor,
  keyHatch,
  horn,
}: {
  pianoKey: PianoKey
  pressed: boolean
  badge: NoteBadgeStyle | null
  font: SkFont | null
  showNotes: boolean
  showPositions: boolean
  showKey: boolean
  inKey: boolean
  noteColor: string
  positionColor: string
  keyHatch: KeyHatch
  horn: HornDrawing
}) {
  const visual = visualRect(pianoKey)
  const travel = pressTravel(pianoKey, visual)
  const body = pressed ? { ...visual, top: visual.top + travel } : visual
  const shape = frontPath(body)
  const top = pressed
    ? pianoKey.isBlack
      ? '#2A2A2C'
      : '#C8C2B6'
    : pianoKey.isBlack
      ? '#4A4A4E'
      : '#FFFBF7'
  const bottom = pressed
    ? pianoKey.isBlack
      ? '#101012'
      : '#B7B1A6'
    : pianoKey.isBlack
      ? '#141416'
      : '#E4DDD2'
  const label = noteLabel(pianoKey.midiNote).toUpperCase()
  const position = showPositions ? trombonePositionLabel(pianoKey.midiNote, horn) : null
  const hatch =
    showKey && !inKey && shape
      ? Skia.Path.MakeFromSVGString(
          hatchPath(keyHatch, body, Math.max(4, Math.min(8, body.width * 0.34))),
        )
      : null
  const badgeRect = badge ? noteBadgeRect(body, badge) : null
  return (
    <Group>
      {pressed ? (
        <RoundedRect x={visual.left} y={visual.top} width={visual.width} height={travel + 1} r={0} color="#0E0E0E" />
      ) : null}
      {shape ? (
        <Path path={shape} color={top}>
          <LinearGradient start={vec(body.left, body.top)} end={vec(body.left, body.top + body.height)} colors={[top, bottom]} />
        </Path>
      ) : null}
      {hatch && shape ? (
        <Group clip={shape}>
          <Path path={hatch} style="stroke" strokeWidth={1} color={pianoKey.isBlack ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.45)'} />
        </Group>
      ) : null}
      <Line
        p1={vec(body.left + 3, body.top + (pressed ? 1.4 : 1.1))}
        p2={vec(body.left + body.width - 3, body.top + (pressed ? 1.4 : 1.1))}
        color={pressed ? 'rgba(0,0,0,0.4)' : pianoKey.isBlack ? 'rgba(255,255,255,0.33)' : 'rgba(255,255,255,0.8)'}
        strokeWidth={pressed ? 2 : 1.2}
      />
      {showNotes && badge && badgeRect && !pianoKey.isBlack ? (
        <RoundedRect
          x={badgeRect.left}
          y={badgeRect.top}
          width={badgeRect.width}
          height={badgeRect.height}
          r={badge.cornerRadius}
          style="stroke"
          strokeWidth={1}
          color={noteColor}
        />
      ) : null}
      {showNotes && badge && badgeRect && font && !pianoKey.isBlack ? (
        <Text
          font={font}
          text={label}
          x={badgeRect.left + (badgeRect.width - font.getTextWidth(label)) / 2}
          y={textBaseline(badgeRect.top, badgeRect.height, font)}
          color={noteColor}
        />
      ) : null}
      {badge && font && position ? (
        <Text
          font={font}
          text={position}
          x={body.left + body.width / 2 - font.getTextWidth(position) / 2}
          y={positionBaseline(body, badge, pianoKey.isBlack, badgeRect, font)}
          color={positionColor}
        />
      ) : null}
    </Group>
  )
}

function EdgeMark({ path, opacity }: { path: SkPath | null; opacity: number }) {
  if (!path || opacity <= 0) return null
  return (
    <Group opacity={opacity}>
      <Path path={path} style="stroke" strokeWidth={3.6} strokeCap="round" strokeJoin="round" color="rgba(24, 6, 2, 0.82)" />
      <Path path={path} style="stroke" strokeWidth={1.9} strokeCap="round" strokeJoin="round" color="rgba(255, 246, 230, 0.96)" />
    </Group>
  )
}

type ArrowHit = { left: number; width: number }

type ScrollMark = { path: SkPath; hit: ArrowHit }

function scrollMarkPaths(width: number, woodHeight: number, horn: { x: number; width: number } | null) {
  if (width <= 0 || woodHeight <= 0) return { left: null as ScrollMark | null, right: null as ScrollMark | null }
  const size = Math.min(20, Math.max(13, woodHeight * 0.36))
  const centerY = woodHeight / 2
  const pad = 14
  const occupy = size * 1.12
  const clearance = pad + occupy + 8
  const leftRoom = horn ? horn.x : width
  const rightRoom = horn ? width - (horn.x + horn.width) : width
  const leftHit = markHitWidth(leftRoom, pad + occupy)
  const rightHit = markHitWidth(rightRoom, pad + occupy)
  return {
    left: leftRoom >= clearance && leftHit > 0 ? { path: chevronPair(pad, centerY, size, -1), hit: { left: 0, width: leftHit } } : null,
    right:
      rightRoom >= clearance && rightHit > 0
        ? { path: chevronPair(width - pad, centerY, size, 1), hit: { left: width - rightHit, width: rightHit } }
        : null,
  }
}

function markHitWidth(room: number, arrowSpan: number): number {
  return Math.min(Math.max(0, room - 4), Math.max(arrowSpan + 16, 52))
}

function arrowHitContains(hit: ArrowHit | null, x: number): boolean {
  return hit !== null && x >= hit.left && x <= hit.left + hit.width
}

function chevronPair(outerTip: number, centerY: number, size: number, direction: -1 | 1): SkPath {
  const path = Skia.PathBuilder.Make()
  addChevron(path, outerTip, centerY, size, direction)
  addChevron(path, outerTip - direction * size * 0.7, centerY, size, direction)
  return path.build()
}

function addChevron(path: ReturnType<typeof Skia.PathBuilder.Make>, tipX: number, centerY: number, size: number, direction: -1 | 1) {
  const wing = size * 0.62
  const depth = size * 0.42
  const tail = tipX - direction * depth
  path.moveTo(tail, centerY - wing)
  path.lineTo(tipX, centerY)
  path.lineTo(tail, centerY + wing)
}

function hornFrame(
  width: number,
  woodHeight: number,
  horn: HornDrawing,
  image: { width: () => number; height: () => number } | null,
  slideNote: number | null,
  instrument: KeyboardInstrument,
): { frame: { x: number; y: number; width: number; height: number }; outer: { x: number; y: number; width: number; height: number }; trigger: boolean } | null {
  if (instrument !== 'trombone' || width <= 0 || woodHeight <= 0) return null
  const canvasW = image?.width() ?? horn.canvasWidth
  const canvasH = image?.height() ?? 334
  const aspect = canvasH > 0 ? canvasW / canvasH : 1
  const height = woodHeight / 1.2
  const drawWidth = height * aspect
  const frame = { left: (width - drawWidth) / 2, top: (woodHeight - height) / 2, width: drawWidth, height }
  let outer = { ...frame }
  let trigger = false
  if (slideNote != null) {
    const setting = tromboneSlide(slideNote, horn)
    if (setting) {
      const shift = tromboneOuterShiftForTravel(setting.travel, drawWidth, horn)
      outer = { ...outer, left: outer.left + shift, top: outer.top + tromboneOuterDropForHorn(shift, horn) }
      trigger = setting.trigger
    }
  }
  return {
    frame: { x: frame.left, y: frame.top, width: frame.width, height: frame.height },
    outer: { x: outer.left, y: outer.top, width: outer.width, height: outer.height },
    trigger,
  }
}

function badgeFor(keys: readonly PianoKey[], measureFont: SkFont | null): NoteBadgeStyle | null {
  const white = keys.find((key) => !key.isBlack)
  if (!white) return null
  return noteBadgeStyle(visualRect(white).width, (text, fontSize) => {
    const width = measureFont ? measureFont.getTextWidth(text) * (fontSize / 32) : text.length * fontSize * 0.55
    return { width, height: fontSize }
  })
}

type Box = { left: number; top: number; width: number; height: number }

function visualRect(key: PianoKey): Box {
  const gap = clamp(key.rect.width * 0.08, 1, 4.5)
  const front = clamp(key.rect.height * 0.02, 2, 8)
  return {
    left: key.rect.left + gap / 2,
    top: key.rect.top,
    width: key.rect.width - gap,
    height: key.rect.height - front,
  }
}

function pressTravel(key: PianoKey, visual: Box): number {
  const front = key.rect.top + key.rect.height - (visual.top + visual.height)
  return clamp(front * 0.55, 1, 4)
}

function noteBadgeRect(body: Box, badge: NoteBadgeStyle): Box {
  return {
    left: body.left + body.width / 2 - badge.width / 2,
    top: body.top + body.height - badge.height - body.height * 0.045,
    width: badge.width,
    height: badge.height,
  }
}

function frontPath(box: Box) {
  const radius = clamp(box.width * 0.16, 1.2, 9)
  const right = box.left + box.width
  const bottom = box.top + box.height
  const path = Skia.Path.MakeFromSVGString(
    `M ${box.left} ${box.top} H ${right} V ${bottom - radius} Q ${right} ${bottom} ${right - radius} ${bottom} H ${box.left + radius} Q ${box.left} ${bottom} ${box.left} ${bottom - radius} Z`,
  )
  return path
}

function textBaseline(top: number, height: number, font: SkFont): number {
  const metrics = font.getMetrics()
  const textHeight = metrics.descent - metrics.ascent
  return top + (height - textHeight) / 2 - metrics.ascent
}

function positionBaseline(
  body: Box,
  badge: NoteBadgeStyle,
  black: boolean,
  badgeRect: Box | null,
  font: SkFont,
): number {
  const metrics = font.getMetrics()
  const bottom = black || !badgeRect ? body.top + body.height - body.height * 0.055 : badgeRect.top - Math.max(1, badge.fontSize * 0.12)
  return bottom - metrics.descent
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(value, min))
}

function easeOut(t: number): number {
  const p = Math.min(1, Math.max(0, t))
  return 1 - (1 - p) * (1 - p)
}

function flingProgress(t: number): number {
  const p = Math.min(1, Math.max(0, t))
  return 0.85 * p * p * p - 2.25 * p * p + 2.4 * p
}

function nowSeconds(): number {
  return performance.now() / 1000
}

function sameNotes(left: ReadonlySet<number>, right: ReadonlySet<number>): boolean {
  if (left.size !== right.size) return false
  for (const note of left) if (!right.has(note)) return false
  return true
}

function activeTouches(event: GestureResponderEvent, ended: boolean): readonly TouchPoint[] {
  if (!ended) return event.nativeEvent.touches
  const endedIds = new Set(event.nativeEvent.changedTouches.map((touch) => touch.identifier))
  return event.nativeEvent.touches.filter((touch) => !endedIds.has(touch.identifier))
}

function localX(touch: TouchPoint | undefined, pageX: number): number {
  if (!touch) return 0
  if (typeof touch.locationX === 'number') return touch.locationX
  return (touch.pageX ?? 0) - pageX
}

function localY(touch: TouchPoint, pageY: number): number {
  if (typeof touch.locationY === 'number') return touch.locationY
  return (touch.pageY ?? 0) - pageY
}

function dragVelocity(samples: readonly { t: number; x: number }[]): number {
  if (samples.length < 2) return 0
  const start = samples[0]
  const end = samples[samples.length - 1]
  const dt = (end.t - start.t) / 1000
  if (dt <= 0) return 0
  return (end.x - start.x) / dt
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    backgroundColor: '#1B1B1B',
  },
  wood: {
    backgroundColor: '#4A1A10',
    overflow: 'hidden',
  },
  keys: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#1B1B1B',
  },
  hornMessage: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 0,
    bottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#FF2A2A',
    fontSize: 16,
    fontWeight: '500',
  },
})
