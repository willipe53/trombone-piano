import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { Canvas, Group, Line, Oval, RoundedRect, Text, useFont } from '@shopify/react-native-skia'
import { columnAt, golfBoardLayout } from './boardHit'
import { GolfDeal } from './golfDeal'
import { slideStopLabel } from './playingChart'
import { writtenNote } from './scoreNotation'

const roboto = require('../assets/fonts/Roboto-Medium.ttf')

export function GolfBoard({
  deal,
  armedColumn,
  onColumn,
}: {
  deal: GolfDeal
  armedColumn: number | null
  onColumn: (column: number) => void
}) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const font = useFont(roboto, 14)
  const layout = useMemo(
    () => golfBoardLayout(size, deal.columns.map((column) => column.length)),
    [deal, size],
  )
  if (size.width <= 0) {
    return <View style={{ flex: 1 }} onLayout={(event) => setSize(event.nativeEvent.layout)} />
  }
  return (
    <View
      style={{ flex: 1 }}
      onLayout={(event) => setSize(event.nativeEvent.layout)}
      onStartShouldSetResponder={() => true}
      onResponderRelease={(event) => {
        const column = columnAt({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }, layout.hits)
        if (column !== null) onColumn(column)
      }}
    >
      <Canvas style={{ width: size.width, height: size.height }} pointerEvents="none">
        {deal.wasteCard ? (
          <Card
            rect={layout.waste}
            midi={deal.wasteCard.midi}
            clef={deal.clef === 'tenor' ? 'tenor' : 'bass'}
            armed={false}
            stop={deal.wasteCard.revealed}
            font={font}
          />
        ) : null}
        {deal.columns.map((column, index) =>
          column.map((card, cardIndex) => {
            const rect = layout.columns[index]?.[cardIndex]
            if (!rect) return null
            return (
              <Card
                key={card.id}
                rect={rect}
                midi={card.midi}
                clef={deal.clef === 'tenor' ? 'tenor' : 'bass'}
                armed={armedColumn === index && cardIndex === 0}
                stop={card.revealed}
                font={font}
              />
            )
          }),
        )}
      </Canvas>
    </View>
  )
}

function Card({
  rect,
  midi,
  clef,
  armed,
  stop,
  font,
}: {
  rect: { x: number; y: number; width: number; height: number }
  midi: number
  clef: 'tenor' | 'bass'
  armed: boolean
  stop?: { number: number; short: boolean }
  font: ReturnType<typeof useFont>
}) {
  const written = writtenNote(midi, 'trombone', GolfDeal.spelling)
  const spacing = Math.min(9, Math.max(4, (rect.height - 22) / 4))
  const staffTop = rect.y + 8
  const left = rect.x + 6
  const right = rect.x + rect.width - 6
  const topStep = clef === 'tenor' ? 2 : -2
  const centerY = staffTop + (topStep - written.step) * (spacing / 2)
  const centerX = rect.x + rect.width / 2 + 4
  return (
    <Group>
      <RoundedRect x={rect.x} y={rect.y} width={rect.width} height={rect.height} r={8} color="#2A2A2A" />
      <RoundedRect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        r={8}
        style="stroke"
        strokeWidth={armed ? 2 : 1}
        color={armed ? '#17803A' : 'rgba(255,255,255,0.35)'}
      />
      {[0, 1, 2, 3, 4].map((line) => (
        <Line
          key={line}
          p1={{ x: left, y: staffTop + line * spacing }}
          p2={{ x: right, y: staffTop + line * spacing }}
          color="rgba(255,255,255,0.55)"
          strokeWidth={1}
        />
      ))}
      <Oval
        x={centerX - spacing * 0.55}
        y={centerY - spacing * 0.4}
        width={spacing * 1.1}
        height={spacing * 0.8}
        color="#FFFFFF"
      />
      {stop && font ? (
        <Text
          font={font}
          text={slideStopLabel(stop)}
          x={rect.x + rect.width / 2 - font.getTextWidth(slideStopLabel(stop)) / 2}
          y={rect.y + rect.height - 6}
          color="#17803A"
        />
      ) : null}
    </Group>
  )
}
