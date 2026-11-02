# Spec: onboarding before login on first launch

Issue: #1455 · Status: accepted · Intent: ./intent.md

## Behavior

1. Launch, signed out, pages not done: the pages. Finish or Bỏ qua: mark done, then Login.
2. Launch, signed in, pages not done: the pages. Finish or Bỏ qua: mark done, then Home. They do not show twice.
3. Launch, pages done: Login when signed out, Home when signed in.
4. A successful login goes to Home and marks the pages done, whatever the flag said before.
5. Finish reads the session at that moment: a session that ended while the pages were up goes to Login, not Home.
6. Logout and a session that ended go to Login and never to the pages. Neither clears the flag.
7. The update screen comes first, and when it lifts the app opens by rule 1 to 3. Finishing the pages does not get past it.
8. Fresh install with no cached config: the new pages (`newAuth` unset is on). A config that lands while they are up does not swap the screen.
9. `anyrent://order/...`, `anyrent://todo`, the draft cart link, a push tap or a widget tap while signed out: no crash, no skipped login. An order link opens after login, like today.
10. Android: the "signed out on a screen that needs a session" check leaves the pages alone (it would otherwise skip them on every fresh install).
11. Signed in with the pages still to do, a link opens the tabs as today, no notification question, and the next launch shows the pages.
12. The notification question still waits for Home. The first-run guide still starts after login. Register from Login still ends at check-email and back to Login.
13. Copy unchanged. Last page still "Bắt đầu" / "Get started".

## Out of scope

Copy changes, new pages, a "login" link on the pages, changes to the register form.

## API and data

None. No path under `apps/api`, `packages/` or `prisma/` changes. `HasCompletedOnboarding` (iOS) and `onboardingDone` (Android) keep their keys.

## Acceptance

- Unit tests of the rule, red first, on both apps: `AppStartRouteTests.swift`, `AppStartRouteTest.kt`.
- UI tests updated without weakening: `OnboardingV2UITests`, `PromptTimingUITests`, `FirstRunGuideUITests`, `AnyRentE2ETests` (`E2E`), `scripts/mobile-e2e/*`.
- Walks on a visible Simulator and a windowed AVD: fresh → pages → login → Home; fresh → Bỏ qua → login; signed-in relaunch; logout → login, no pages; register path; deep link on a fresh install; a real upgrade from the old build with the pages to do; session ending on a page.
