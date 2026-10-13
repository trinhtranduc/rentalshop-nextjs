# Plan — #937

1. Tests first (commit failing): iOS `HomeCartButtonTests` (badge text) + SettingsV2 sections (notifications first in
   store, every role) + unread badge text; Android `HomeCartButtonTest`, `SettingsRowsTest` same rules.
2. iOS: `HomeCartButton` logic, `ProductsHomeViewController` (cart BadgeButton, no inbox badge loading),
   `SettingsV2.swift` (`.notifications`, `unreadBadge`), `SettingsV2ViewController` (row badge, unread loading,
   open inbox), `ProductRowV2Cell` name 2 lines. UI test `test7iNotifications` via Settings → Thông báo.
3. Android: same in `ProductsHomeScreen`, `SettingsRows`, `SettingsV2Screen` (+ `onOpenInbox`), NavHost.
4. Verify: unit tests, builds, visible run on Simulator / emulator with screenshots. PR into dev, API unchanged.
