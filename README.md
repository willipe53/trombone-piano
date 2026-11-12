# Trombone Piano

The screen is a full-width header, a middle row split in half, and a full-width bottom band. The header has a round settings gear on the left. Its hover text is Settings, and a click opens a dialog that moves in from that button. The dialog holds SHOW NOTES, SHOW KEY, KEEP ALIVE, SHOW POSITIONS, and MIDI. SHOW NOTES and SHOW POSITIONS include a color, SHOW KEY includes a pattern, and MIDI includes its status. The Futura Medium wordmark and the round help mark are on the right. A click on help opens a dialog that moves in from that button and shows the help. The dialog grows up to 90% of the screen and scrolls vertically. A click outside either dialog closes it, and the dialog moves back to its button. The middle left reads Controls and the middle right reads Staffs. A grip between them moves that split. The bottom band is the keyboard, with the mahogany strip and the trombone above the keys. The strip is taller by a label lane. Under the slide, each playable position for the sounding note has a pointer and a label lined up with that slide length. The slide rests on the shortest position. The flat 7th partial sits short of the numbered stop, so G4 is #2 and that partial continues through D4 at #7. Trigger positions are half steps of the longer tube, so a trigger 2nd is T2.5. Those marks show while SHOW POSITIONS is on. A grip above the band moves that band. The last dragged shares are saved in local storage. On the web the address is `/` for that screen and `/help` for the explanation. `/piano` and `/games` open the screen, and the address is replaced with `/`. The browser back button returns to the previous address. The settings gear does not open a screen yet.

The Swift app uses Futura Medium. The other type in that app is Roboto Medium.

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

`expo-screen-orientation` locks landscape while the keyboard is showing on a phone, in either panel. Help turns, and the keyboard turns on an iPad. Adding that package needs one rebuild of the iOS and Android development clients before the lock applies.

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
- With the drone on, Bb and the octave hold on trombone, reed, and tone, and those keys sit down.
- The fourth toggle, the octave buttons, and the drone switch change the chord and the pressed keys.
- Switching back to the piano stops the drone, and the keys play again.

If the status line says trombone notes are playing the whole file, the loop was not built for those notes.
