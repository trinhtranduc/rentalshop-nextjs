# Onboarding before login on first launch

Issue: #1455 · Author: Trinh Tran (owner), agent · Status: accepted · Created: 2026-11-02

## Problem

The 3 pages only show after the first login. A new install opens on the login form, before the person has seen what the app does.

## Proposed outcome

First launch: 3 pages → login or register → Home. iOS is the reference, Android matches. Checked by a routing rule with unit tests on both apps and by walks on a Simulator and an emulator.

## Affected users and systems

Everyone who installs the app. iOS, Android. No API, database or web change.

## Constraints

- A person who already saw the pages (flag set) never sees them again. Same key, stored per install, no migration.
- Logout never shows the pages. Login never leads to the pages.
- The update screen stays first, the notification question stays on Home (#1413), the first-run guide stays after login, register still ends at check-email.
- Deep links and pushes while signed out do not crash and do not skip login.
- The copy of the pages does not change.

## Open questions

None.

## Decision log

- 2026-11-02: pages before login at first launch: "vậy cho trước đăng nhập khi user đầu tiên launch app" (owner).
- 2026-11-02: signed in with the pages still to do (upgrading mid-way): still pages at launch, then Home, as today.
- 2026-11-02: reaching login with the pages unfinished (the session ended on a page, or a logout from the tabs a widget link opened): login goes straight to Home and marks the pages done, so they never come after a login, now or at the next launch. Quitting on that login screen and launching again shows the pages once more, then login: signed out and not done is the first-launch state, and it cannot get stuck.
- 2026-11-02: flags unknown on a fresh install: the new pages, following the code's default (`FeatureFlags`: unset is on). The screen is chosen once when the pages open and a config that lands later does not swap it, so nothing flashes.
- 2026-11-02: keep "Bắt đầu" / "Get started" on the last page. It reads fine in front of the login form and the strings do not conflict.
