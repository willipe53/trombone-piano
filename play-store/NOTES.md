# Play Console

Trombone Piano is a new app on the existing Extent Devices developer account, not an update of Ditch. Do not create the Play listing until the games are ready and an AAB exists.

Confirm the developer account is an organization account. The 12-tester / 14-day closed test applies to personal accounts created after 13 November 2023. Organization accounts are exempt. If the account is still a personal account, budget for that test before production.

## Identity

- Application id: `com.extentdevices.trombonepiano`
- Play does not allow this id to change after the first upload.
- Create the app with that id only when the AAB is ready.
- Enroll Play App Signing on the first upload. EAS holds the upload key.
- `npm run android-build` runs `eas build --platform android --profile production`. There is no submit command.
- `autoIncrement` bumps `versionCode` only. Set the marketing version by hand above the iOS version that is live, so the two stores stay on the same release number.

## Answers

These match an app that collects nothing and has no account.

- Privacy policy URL: `https://trombonepiano.com/privacy-policy.html`. Play wants this URL even when the app collects nothing.
- Ads: no. `app.json` blocks `com.google.android.gms.permission.AD_ID`. A permission left in the manifest with an answer of no fails the upload.
- App access: all functionality is available without a login. No test credentials.
- News, government, financial features, health: no.
- Target audience: not directed at children. Do not opt into Designed for Families.
- Content rating (IARC): music tool, no violence, no user-generated content shared with other users, no location, no unrestricted web.
- Data safety: no data collected and no data shared. That covers approximate location, personal info, financial info, photos, audio, files, contacts, device ids, and diagnostics. A crash or analytics SDK would change this.
- Data deletion: every developer answers these questions. Account deletion applies only if the app lets someone create an account. This app does not, so an in-app deletion path and an account-deletion URL are not required. Offline-only local state is not an app account. The privacy page is the disclosure both stores link.
- Photo and video permissions: none in the manifest.
- Bluetooth and nearby devices: none on Android. MIDI stays iOS-only.
- Foreground service: `androidForegroundService` stays false on `react-native-audio-api` unless background playback is added.
- Category: Music & Audio.
- Contact email: `support@trombonepiano.com`.

## Listing files

This folder is for the files Google asks for. They are not here yet:

- 512 icon
- 1024×500 feature graphic
- phone screenshots
- 7-inch and 10-inch tablet screenshots, if the listing says tablets are supported

The store listing also needs the app name, an 80-character short description, and a full description.

## Before the first AAB

Confirm the Expo SDK 58 target API against the current Play target-API requirement in the versioned Expo docs. Check 16 KB ELF alignment of the native libraries inside the AAB. That requirement has been in force since 31 May 2026. The libraries to check are the ones from React Native, `react-native-audio-api`, and `@shopify/react-native-skia`. The trombone MIDI module is Kotlin and has no `.so` of its own.
