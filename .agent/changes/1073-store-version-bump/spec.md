# Spec — #1073

- iOS `POS ADBD.xcodeproj/project.pbxproj`: every `MARKETING_VERSION` = 1.2.3, every `CURRENT_PROJECT_VERSION` = 1810202601
  (app and Live Activity extension, Debug and Release; the two must stay equal or App Store Connect rejects the upload).
- Android `app/build.gradle.kts`: `versionName = "0.1.9"`, `versionCode = 10`.
- Nothing else changes.
