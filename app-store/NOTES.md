# App Store

This is an update of the Trombone Piano record already for sale. Use the same bundle id and the same app name. Do not open a second app. Do not upload until the games are ready.

## Identity

- Bundle id: `com.extentdevices.trombone-piano`
- Display name: Trombone Piano
- Apple team: `KA5HX86552`
- Marketing version: set by hand, higher than the version live in App Store Connect. `expo.version` in `app.json` is the marketing version.
- Build number: EAS `autoIncrement` on the production profile bumps the iOS build number. It does not change the marketing version.
- SKU: `TROMBONE-PIANO`
- Apple ID: `6817972558`. The production submit profile in `eas.json` uses this as `ascAppId`, with Apple team `KA5HX86552`.

`npm run ios-build` runs `eas build --platform ios --profile production`. There is no submit command. Log in as `peter-ditch`. The EAS project is `@peter-ditch/trombone-piano`, id `d33dc768-982d-4c42-ab6b-832ea3d06d7e`. EAS holds Apple Distribution certificate `4CE6FB28D66A7146812D3FBF1A508D0F` and provisioning profile `R2NDJ5UQR8` for `com.extentdevices.trombone-piano` on team `KA5HX86552`. Both expire 17 October 2027. The iPhone Distribution certificate already in Keychain expired 9 July 2026.

## Before the binary

`app.json` does not declare a background audio mode, and it does not include a microphone purpose string. A note stops when the app leaves the foreground. The app does not record.

A cable is an iPhone connected to a Mac. MIDI notes go to an application on that Mac, such as MuseScore or GarageBand. Android is not cabled for this.

`MIDISourceCreate` returns `kMIDINotPermitted` unless Info.plist lists `audio` under `UIBackgroundModes`. The shipping app has that entry so the MIDI source can be created. The entry is not there so a note keeps sounding after the app is left.

## Listing

Before uploading the binary, set these URLs in App Store Connect:

- Privacy policy: `https://trombonepiano.com/privacy-policy.html`
- Support: `https://trombonepiano.com/support.html`

Privacy nutrition labels stay "data not collected." Export compliance stays exempt (`ITSAppUsesNonExemptEncryption` false).

Review notes: This is an update of Trombone Piano. It does not require an account. Sound comes from the device speaker. MIDI is optional and off until the player turns it on. The reviewer does not need a computer.

What's New describes what a player can do that they could not do before. It does not need to name React Native.

Retake the screenshots in `app-store/screenshots/` if the binary shows the pills and the games. A listing that still shows only the old keyboard is the usual metadata rejection.

The age rating stays put if the games add no accounts, ads, web browsing, or shared user content. A phased release is available if the update needs a halt switch.
