# Plan — #751

1. Android: `NotificationsLogic.appendPage`, `InboxV2Screen.kt`, `InboxScreen.kt`, strings vi/en, `NotificationsLogicTest.kt`.
2. iOS: `NotificationsLogic.appendPage`, `NotificationsViewController.swift`, `NotificationsNotesV2Tests.swift`.
3. Verify: `./gradlew :app:testDebugUnitTest --tests 'com.anyrent.pos.domain.notifications.*'`; iOS `NotificationsNotesV2Tests`.
