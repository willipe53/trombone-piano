import { useEffect, useState } from 'react'
import { BackHandler, Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { HelpScreen } from './HelpScreen'
import { Stage } from './Stage'
import { lockPianoOrientation, unlockOrientation } from './orientation'
import { canonicalPath, pathForScreen, screenFromPath, type Screen } from './routes'

function historyIndex(): number {
  const state = window.history.state as { index?: unknown } | null
  return typeof state?.index === 'number' ? state.index : 0
}

function screenFromLocation(): Screen {
  if (Platform.OS !== 'web') return 'piano'
  return screenFromPath(window.location.pathname) ?? 'piano'
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
    const canonical = pathForScreen(known ?? 'piano')
    window.history.replaceState({ index: path === canonical ? historyIndex() : 0 }, '', canonical)
    const onPop = () => setScreen(screenFromPath(window.location.pathname) ?? 'piano')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    if (Platform.OS === 'web') return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'help') {
        setScreen('piano')
        return true
      }
      return false
    })
    return () => subscription.remove()
  }, [screen])

  function leave(): void {
    if (Platform.OS === 'web' && historyIndex() > 0) {
      window.history.back()
      return
    }
    if (Platform.OS === 'web' && canonicalPath(window.location.pathname) !== '/') {
      window.history.replaceState({ index: 0 }, '', '/')
    }
    setScreen('piano')
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stage onClose={screen === 'help' ? leave : undefined}>
        {screen === 'help' ? <HelpScreen /> : undefined}
      </Stage>
    </SafeAreaProvider>
  )
}
