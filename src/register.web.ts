import { registerRootComponent } from 'expo'
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web'

export function register(): void {
  const style = document.createElement('style')
  style.textContent = 'html, body, #root { height: 100%; margin: 0; }'
  document.head.appendChild(style)
  void LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(async () => {
    const { default: App } = await import('./App')
    registerRootComponent(App)
  })
}
