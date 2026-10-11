# Plan

1. `domain/outlet/CurrentOutletLogic.kt` (pure rules, parse/cache) and `CurrentOutletState.kt` (choice per account,
   fallback notice, version); `data/CurrentOutlet.kt` wires SharedPreferences, `SessionStore` and `GET /api/outlets`.
2. Replace every read of the session outlet for work data with `CurrentOutlet` (list above); settings screens keep the
   login outlet, as on iOS.
3. `ui/home/v2/OutletPicker.kt`: header button, sheet, cart confirm, fallback dialog; Home uses the button; the main
   tab host refreshes the list on start and turns a branch change into an `OrdersChanged` bump.
4. Strings vi + en. Unit tests `CurrentOutletTest`.
5. Verify: `./gradlew :app:assembleDebug :app:testDebugUnitTest`; e2e on an emulator with a window against a local
   seeded API (merchant with 2 branches, staff login), screenshots in `/private/tmp/claude-billing/m828a`.
