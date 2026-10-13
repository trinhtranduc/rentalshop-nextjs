# #927 Intent (iOS) — big clock card in Settings

Status: in-progress. Owner approved 2026-10-13. Issue #927 (app part). Mockup
https://claude.ai/artifact/MikH31P6eVqyzbnj6BoWzf tab "App: Vào ca / Ra ca mới (chọn)", "Chốt: thẻ giờ lớn ở Cài đặt (phương án L)".

## Why
Vào ca / Ra ca sits behind a separate "Chấm công" screen (two taps); the Settings row shows only the first shift, no
branch, and everyone in the outlet sees it (owner and outlet admin too).

## Outcome
Settings (v2) starts with card L only when the shop has the module and `GET /api/attendance/me` says `required`
(missing = true, so it works before the API lands). Its button opens the QR scanner at once; the result shows in the
card or as a red box under it. The intermediate "Chấm công" screen goes; "Ca và công của tôi" stays.

## Constraints
Additive only (new optional field). Vietnam day. iOS is the reference for Android. Simple, as in the mockup.
