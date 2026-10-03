# Plan — Mobile UI refresh (iOS + Android)

Issue: #363 · Status: draft · Spec: ./spec.md · Depends on: `../362-mobile-api/`

One PR per phase, iOS and Android together (skill `mobile-parity`). Screen files below are the current
entry points; confirm before editing.

| Phase | Spec | Needs API | iOS | Android |
|---|---|---|---|---|
| 0. App version | 1–2 | PR 3 | `Library/Services/BaseService.swift`, app delegate / scene | `data/ApiClient.kt` (headers), `MainActivity.kt` |
| 1. Orders tab | 3–9 | PR 2 (todo, amountDue, lateDays, search) | `Viewcontrollers/Sale/SaleViewController.swift`, `OrderFilterViewController.swift` | `ui/orders/OrdersScreens.kt` |
| 2. Order detail | 10–13 | PR 1 (guard), PR 2 (amountDue) | `Viewcontrollers/Tabbar/PreviewViewController.swift`, `OrderCheckViewController.swift`, `Payment/*` | `ui/orders/OrderDetailActions.kt`, `PaymentCollectionSheet.kt` |
| 3. Products & cart | 14–17 | none (existing endpoints) | `Viewcontrollers/Products/*`, `Main /MainViewController.swift` | `ui/home/HomeScreens.kt`, `CartCheckoutScreen.kt`, `AvailabilitySheet.kt` |
| 4. Calendar, Overview, Settings | 18–20 | PR 2 (calendar, stats), #355 | `Calendar/CalendarViewController.swift`, `Chart/Overview*`, `Settings/SettingsViewController.swift` | `ui/calendar/CalendarScreen.kt`, `ui/overview/OverviewScreen.kt`, `ui/settings/SettingsScreens.kt` |

## Steps per phase

1. Shared tokens first (phase 1): colors, status/note pills, date formatter `T7 03/10`, money formatter,
   row component — iOS `Library/` + Android `ui/theme`, `ui/common`.
2. Fix audit bugs inside the screens they touch (phase 1): stale-response guard (request id / cancel previous),
   unique `LazyColumn` keys (`publicId` + action), Sale filter, status label mapping, reset on view switch.
3. Build the screen against dev-api; keep the old screen reachable behind a local flag until the phase is verified.
4. Strings: iOS `Localizable.strings`, Android `res/values*/strings.xml` (vi, en; ja/ko/zh where present).
5. Screenshots on both platforms beside the canvas board in the PR.

## Release

1. Phase 0 ships first, alone, so later releases can require an update if needed.
2. Phase 3 can ship any time (no API dependency).
3. Phases 1, 2, 4 ship after API PR 1 + PR 2 are on `main-real`.
4. Raise `minVersion` only after most active devices run the new version (check `X-App-Version` in request logs).

## Verify

```bash
cd apps/mobile && pod install && xcodebuild -workspace "POS ADBD.xcworkspace" -scheme Development -destination 'generic/platform=iOS Simulator' build
cd apps/mobile-android && ./gradlew :app:assembleDebug
```
Manual on dev-api with seed data: a same-day order, a late return, a RESERVED past pickup, a SALE then cancel,
times at 23:30 and 00:30 Vietnam.

## Risks

- Large UI change for staff used to the old list → per-phase release, keep labels in their words.
- Old app + new API: covered by additive API rules.
- New app + old API (store review lag vs API deploy): phases 1, 2, 4 check that the new fields exist and fall back
  to client computation when they do not.

## Rollback

App releases cannot be pulled back from devices. Each phase keeps the old screen behind a remote flag in
`app-config` (`features.newOrders`, …) so it can be switched off without a new release.
