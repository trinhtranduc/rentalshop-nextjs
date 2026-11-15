# Spec — Store builds iOS 1.2.8 / Android 0.1.14

Issue: #1595 · Status: in-progress · Intent: ./intent.md

## Behavior

1. No `<string>` or `<item>` text in `apps/mobile-android/app/src/main/res/values*/strings.xml` has an apostrophe
   without a backslash before it (unless the whole text is in double quotes).
2. iOS `MARKETING_VERSION` 1.2.8 and `CURRENT_PROJECT_VERSION` 1511202601 in every build configuration.
3. Android `versionName` "0.1.14", `versionCode` 16.
4. `:app:assembleDebug` and `:app:testDebugUnitTest` pass; the iOS Production archive succeeds.

## Out of scope

Store listing text, screenshots, upload and review (owner).

## API and data

None.
