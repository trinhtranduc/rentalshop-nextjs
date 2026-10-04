# Mobile auth screens match the approved boards (phase 5)

Issue: #386 · Author: Trinh Tran · Status: accepted · Created: 2026-10-04

## Problem

Login, sign-up and forgot-password on iOS and Android still use the old look (photo background, cards, a 3-step
sign-up). The approved boards "CHỐT" (`Dang-nhap`, `Dang-ky`, `Dang-ky-2`, `Quen-mat-khau`, `Quen-mat-khau-da-gui`)
show a plain white layout and a 2-step "Tạo cửa hàng". New owners see the old screens first.

## Proposed outcome

With `newAuth` on, both apps show the five boards: login, create store step 1/2 and 2/2, forgot password, and the
email-sent screen with "Gửi lại email". They call the same endpoints with the same payloads as today and land where
today's flow lands. With the flag off, the old screens are unchanged.

## Affected users and systems

Everyone who signs in on iOS and Android (`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF`), and new merchants signing up.
API: `POST /api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/resend-verification` (read only).

## Constraints

- No API change. Register payload identical to today's (the old 3 steps merged into 2).
- Login logic unchanged: iOS `AuthenticationService.login`, `User.save`, push start; Android `ApiClient.login`,
  `SessionStore`, push token refresh. The session-expired handling in `AppDelegate` / `AnyRentNavHost` is untouched.
- The flag is read before any login, from the cached app-config.
- Auth is the critical path: `newAuth` is switched on last and can be switched off at once.

## Open questions

- None.

## Decision log

- 2026-10-04 — Boards approved; issue #386 opened under round 2 (#385) (Trinh Tran)
- 2026-10-04 — Password minimum stays 6 (what the current screens and the API require); the board hint reads 8,
  the screen says 6 so the hint matches the rule (agent)
- 2026-10-04 — Owner approved visual style E (white, drifting blobs, no cards; boards Login-E, Register1-E,
  Register2-E, Forgot-E, Sent-E). It lives in one style file per platform (iOS `AuthV2Style.swift`,
  Android `ui/auth/v2/AuthV2Style.kt`); blobs and the floating mail icon stop with Reduce Motion /
  animations off (coordinator)
