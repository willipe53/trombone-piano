import { Dimensions, Platform } from 'react-native'
import * as ScreenOrientation from 'expo-screen-orientation'

/// A phone is the small device. iPad and the web stay free to turn.
export function isPhone(): boolean {
  if (Platform.OS === 'web') return false
  if (Platform.OS === 'ios') return Platform.isPad !== true
  const window = Dimensions.get('window')
  return Math.min(window.width, window.height) < 600
}

export async function lockPianoOrientation(): Promise<void> {
  if (Platform.OS === 'web') return
  if (!isPhone()) {
    await ScreenOrientation.unlockAsync()
    return
  }
  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
}

export async function unlockOrientation(): Promise<void> {
  if (Platform.OS === 'web') return
  await ScreenOrientation.unlockAsync()
}
