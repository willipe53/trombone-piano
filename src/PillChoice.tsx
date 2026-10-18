import { useEffect, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { TitleWordmark } from './AppTitle'
import { ipadProPointsPerMillimeter } from './geometry'
import { fittedTitleSize, titleMarkHeightAtPreferred, titleMarkSize } from './panelMeasure'

const maxPillHeight = 200 * ipadProPointsPerMillimeter
const margin = 28
const explainHeight = 44
const explainGap = 16
const logoSlot = titleMarkHeightAtPreferred
const redRatio = 620 / 624
const blueRatio = 580 / 624

export function PillChoice({ onKeyboard, onGames, onHelp }: { onKeyboard: () => void; onGames: () => void; onHelp: () => void }) {
  const [box, setBox] = useState({ width: 0, height: 0 })
  const [explain, setExplain] = useState(0)
  useEffect(() => {
    setExplain(0)
    const wait = setTimeout(() => {
      const started = Date.now()
      const frame = setInterval(() => {
        const next = Math.min(1, (Date.now() - started) / 5000)
        setExplain(next)
        if (next >= 1) clearInterval(frame)
      }, 50)
    }, 2000)
    return () => clearTimeout(wait)
  }, [])
  const safeWidth = Math.max(1, box.width - margin * 2)
  const safeHeight = Math.max(1, box.height - margin * 2 - explainGap - explainHeight - explainGap - logoSlot)
  const laid = arrangePills(safeWidth, safeHeight)
  const mark = titleMarkSize(fittedTitleSize(laid.width, (fontSize) => titleMarkSize(fontSize).width))
  return (
    <View style={styles.screen} onLayout={(event) => setBox(event.nativeEvent.layout)}>
      <View style={styles.stage}>
        <View
          pointerEvents="none"
          accessibilityElementsHidden={explain <= 0}
          style={[styles.logo, { width: laid.width, opacity: explain }]}
        >
          <TitleWordmark width={mark.width} height={mark.height} />
        </View>
        <View style={{ width: laid.width, height: laid.height }}>
          <Pressable
            accessibilityLabel="Keyboard"
            onPress={onKeyboard}
            style={{ position: 'absolute', left: laid.red.x, top: laid.red.y, width: laid.red.width, height: laid.red.height }}
          >
            <Image source={require('../assets/red_pill.png')} style={styles.pill} />
          </Pressable>
          <Pressable
            accessibilityLabel="Games"
            onPress={onGames}
            style={{ position: 'absolute', left: laid.blue.x, top: laid.blue.y, width: laid.blue.width, height: laid.blue.height }}
          >
            <Image source={require('../assets/blue_pill.png')} style={styles.pill} />
          </Pressable>
        </View>
        <Pressable
          accessibilityLabel="Explain this app"
          disabled={explain <= 0}
          onPress={onHelp}
          style={[styles.explain, { width: laid.width, opacity: explain }]}
        >
          <Text style={styles.explainText}>Explain this app</Text>
        </Pressable>
      </View>
    </View>
  )
}

function arrangePills(limitWidth: number, limitHeight: number) {
  const widthBudget = Math.max(1, limitWidth)
  const natural = maxPillHeight * redRatio + maxPillHeight * blueRatio
  let height = Math.min(limitHeight, maxPillHeight)
  if (natural > 0) height = Math.min(height, (maxPillHeight * widthBudget) / natural)
  const used = height * redRatio + height * blueRatio
  if (used > widthBudget) height *= widthBudget / used
  const red = { x: 0, y: 0, width: height * redRatio, height }
  const blue = { x: red.width, y: 0, width: height * blueRatio, height }
  return { red, blue, width: blue.x + blue.width, height }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  stage: { flex: 1, margin, alignItems: 'center', justifyContent: 'center' },
  logo: { height: logoSlot, marginBottom: explainGap, alignItems: 'center', justifyContent: 'center' },
  pill: { width: '100%', height: '100%', resizeMode: 'contain' },
  explain: {
    marginTop: explainGap,
    height: explainHeight,
    borderRadius: 6,
    backgroundColor: '#2C2C2C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  explainText: { color: '#FFFFFF', fontSize: 16 },
})
