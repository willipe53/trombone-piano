import { useEffect, useState } from 'react'
import { BackHandler, Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { AppFrame } from './AppFrame'
import { GamesScreen } from './GamesScreen'
import { HelpScreen } from './HelpScreen'
import { InstrumentScreen } from './InstrumentScreen'
import { lockPianoOrientation, unlockOrientation } from './orientation'
import { PillChoice } from './PillChoice'
import { canonicalPath, pathForScreen, screenFromPath, type Screen } from './routes'

function historyIndex(): number {
  const state = window.history.state as { index?: unknown } | null
  return typeof state?.index === 'number' ? state.index : 0
}

function screenFromLocation(): Screen {
  if (Platform.OS !== 'web') return 'choice'
  return screenFromPath(window.location.pathname) ?? 'choice'
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(screenFromLocation)
  useEffect(() => {
    const lock = screen === 'piano' ? lockPianoOrientation() : unlockOrientation()
    void lock
  }, [screen])

  useEffect(() => {
    if (Platform.OS !== 'web') return
    const path = canonicalPath(window.location.pathname)
    const known = screenFromPath(path)
    const canonical = pathForScreen(known ?? 'choice')
    window.history.replaceState({ index: path === canonical ? historyIndex() : 0 }, '', canonical)
    if (known === null) setScreen('choice')
    const onPop = () => setScreen(screenFromPath(window.location.pathname) ?? 'choice')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    if (Platform.OS === 'web' || screen === 'choice') return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setScreen('choice')
      return true
    })
    return () => subscription.remove()
  }, [screen])

  function show(next: Screen): void {
    if (Platform.OS === 'web') {
      const path = pathForScreen(next)
      if (canonicalPath(window.location.pathname) !== path) {
        window.history.pushState({ index: historyIndex() + 1 }, '', path)
      }
    }
    setScreen(next)
  }

  function leave(): void {
    if (Platform.OS === 'web' && historyIndex() > 0) {
      window.history.back()
      return
    }
    if (Platform.OS === 'web' && canonicalPath(window.location.pathname) !== '/') {
      window.history.replaceState({ index: 0 }, '', '/')
    }
    setScreen('choice')
  }

  const framed = screen !== 'choice'
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppFrame
        onClose={framed ? leave : undefined}
        insetContent={screen === 'games' || screen === 'help'}
        background={screen === 'piano' ? '#1B1B1B' : '#000000'}
      >
        {screen === 'piano' ? <InstrumentScreen /> : null}
        {screen === 'games' ? <GamesScreen /> : null}
        {screen === 'help' ? <HelpScreen /> : null}
        {screen === 'choice' ? (
          <PillChoice onKeyboard={() => show('piano')} onGames={() => show('games')} onHelp={() => show('help')} />
        ) : null}
      </AppFrame>
    </SafeAreaProvider>
  )
}
