# Plan — Mobile calendar, overview and settings

Issue: #374 · Status: accepted · Spec: ./spec.md

## Steps

1. iOS pure logic + parsing: `Model/CalendarV2.swift`, `Model/OverviewV2.swift`, `Model/SettingsV2.swift`;
   tests `POS ADBDTests/CalendarOverviewSettingsV2Tests.swift`.
2. iOS UI: `Viewcontrollers/Calendar/CalendarV2ViewController.swift`, `Viewcontrollers/Chart/OverviewV2ViewController.swift`
   (+ period sheet), `Viewcontrollers/Settings/SettingsV2ViewController.swift`; `TabbarViewController` picks each by flag.
   `OrderDetailRouter.open(orderId:from:)` shared by calendar rows.
3. Android pure logic + parsing: `domain/calendar/CalendarLogic.kt`, `domain/overview/OverviewLogic.kt`,
   `domain/settings/SettingsRows.kt` + tests; UI `ui/calendar/v2/`, `ui/overview/v2/`, `ui/settings/v2/`;
   `MainTab` composables pick by flag in `AnyRentNavHost`.
4. Strings vi/en on both apps.
5. Skills: `mobile-parity`, `timezone-dates`, `i18n-keys`.

## Verify

```bash
cd apps/mobile && xcodebuild -workspace "POS ADBD.xcworkspace" -scheme Development -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:"POS ADBDTests" test
cd apps/mobile-android && ./gradlew :app:testDebugUnitTest :app:assembleDebug
```
Manual: local API with all phase flags; `merchant1` (MERCHANT) and `staff.outlet1` (OUTLET_STAFF); flags on and off.

## Risks

- Period keys are device-zone days while the server buckets days its own way until #355 lands; numbers can differ
  from the web by a day edge until then.
- Password change revokes all tokens: the app signs out after success.

## Rollback

Turn the flag off in app-config; the current tab returns on next launch.
