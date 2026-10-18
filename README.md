# Trombone Piano

The app opens on the red and blue pills. On the web the address is `/` for the pills, `/piano` for the keyboard, `/games` for the games, and `/help` for the explanation. The browser back button returns to the previous address. Red is the instrument: the control column, the staff, the mahogany strip with the horn, and the 88 keys. Blue is the games, Golf in bass, Golf in tenor, and Scale inventory. Note names sit on the white keys. Trombone also shows slide positions, and a tap on the horn switches the straight horn and the trigger horn. The strip scrolls the keys. Arrows at the ends of the strip show which way the keys still move. Tapping an arrow shifts the keyboard so the white key at that end stays in view at the other end. MIDI is an iOS-only switch. Android and the web do not show it.

The drawings follow the Swift panel in layout and color. The title is a Futura Medium wordmark. The other type is Roboto Medium. The Swift app uses Futura Medium throughout.

Sound uses the playback route `react-native-audio-api` sets up. Headphones and the system route are left alone.

The samples stay in `swift_version/TrombonePiano/Sounds`. The Xcode app is in `swift_version/`. Piano plays a sample and fades out on release. Trombone plays the attack, then the same crossfaded loop as the Swift app.

The first launch loads trombone. Piano loads the first time it is selected. The keys stay off until that instrument has decoded.

## Run

From this directory:

```bash
npx expo start --web
npx expo run:ios
npx expo run:ios --device
npx expo run:android
npx expo run:android --device
```

The web build loads CanvasKit from `public/canvaskit.wasm`. `npm run web` copies that file out of `canvaskit-wasm` before starting. It is not committed.

`react-native-audio-api` is not in Expo Go. The iOS and Android commands build a development client, which takes a while the first time. After that client is installed, `npx expo start --dev-client` reloads it without rebuilding. Chrome is `start --web`. If the server says it is using Expo Go, press `s` to switch to the development build.

`expo-screen-orientation` locks landscape only while the piano is showing on a phone. The opening screen, help, and the games turn, and the piano turns on an iPad. Adding that package needs one rebuild of the iOS and Android development clients before the lock applies.

The iPhone install uses the same Apple development team as the app already for sale. The bundle id is `com.extentdevices.trombone-piano`, so a development install on a phone replaces the App Store copy already on that phone. The Android package is `com.extentdevices.trombonepiano`. Turn on USB debugging before `run:android --device`.

Web hosting and mail are in [DEPLOYMENT.md](DEPLOYMENT.md). Store notes are in [app-store/NOTES.md](app-store/NOTES.md) and [play-store/NOTES.md](play-store/NOTES.md).

Playback follows the library's audio session. A tethered phone uses whatever route the system picks.

`npm test` runs the sample checks and the ported geometry, notation, chart, and game rules.

The app plays Apple-decoded copies of the Fluid mp3s, not the mp3s themselves. On iOS the audio library would otherwise decode those files with its own mp3 decoder, which does not match the Swift app. `npm run decode` rebuilds `assets/sounds` with `afconvert`. That directory is local and is not committed.

## Listen

Judge the sound in Chrome, on the tethered iPhone, and on the tethered Android phone. The simulators only need to show that a note comes out.

- The selected instrument finishes loading.
- A piano note starts on the sample and stops on release without a click.
- Three piano notes sound together, from C E G and from fingers on a touchscreen.
- A trombone note held for several seconds loops without a click, then fades out on release.
- The other instrument plays after the switch.
- A low note and a high note are checked, not only the middle octave.

If the status line says trombone notes are playing the whole file, the loop was not built for those notes.
