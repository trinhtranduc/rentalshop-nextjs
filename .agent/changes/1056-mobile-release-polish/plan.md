# Plan — #1056

1. Issue #1056 (Vietnamese), branch `fix/1056-mobile-release-polish` from `origin/dev`.
2. Measure the flash: count `render()` calls and read 60 fps frames of the cart opening (baseline recording).
3. Commit the failing tests (iOS unit, Android unit, UI test `test8iReleasePolish`).
4. `fix(mobile)`: product order chips `desc`; vi direction labels (iOS + Android).
5. `fix(mobile)`: cart price link `.custom`; no cart post / render when availability or the overlap setting did not change (iOS).
6. `feat(mobile)`: TIỀN rows blue + pencil, order note row (iOS + Android).
7. Verify: iOS `-only-testing:"POS ADBDTests"`, Android `:app:assembleDebug :app:testDebugUnitTest`,
   iOS simulator against a local API + own Postgres: screenshots and a recording of the cart opening.
8. PR into `dev` (Vietnamese body, `Fixes #1056`), comment on release PR #1049.

Out of scope: the shortage-warning colour (#1054), any API change.
