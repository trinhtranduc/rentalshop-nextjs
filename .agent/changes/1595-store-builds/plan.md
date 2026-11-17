# Plan — Store builds iOS 1.2.8 / Android 0.1.14

Issue: #1595 · Status: in-progress · Spec: ./spec.md

## Steps

1. `tests/android-strings-apostrophe.test.ts` (fails on dev), then escape the four strings.
2. Bump versions in `apps/mobile/POS ADBD.xcodeproj/project.pbxproj` and `apps/mobile-android/app/build.gradle.kts`.
3. iOS: `xcodebuild -scheme Production -configuration Release archive`, then `-exportArchive` with
   `~/Documents/AnyRent-builds/ExportOptions.plist` (app-store-connect).
4. Android: the owner runs the signed release bundle task with `!`; check the AAB signature with the JBR `keytool`.

## Verify

- `yarn --cwd tests test android-strings-apostrophe mobile-error-catalog locales-complete`
- `./gradlew :app:testDebugUnitTest :app:assembleDebug`; iOS archive and export logs end in SUCCEEDED

## Rollback

Do not submit the build; the stores keep 1.2.7 / 0.1.13.
