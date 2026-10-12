# Attendance module (4/4): Android clock in / out and my shifts

Issue: #910 · Author: Trinh Tran (agent) · Status: accepted · Created: 2026-10-12
Product: #906 · API: #907 · iOS reference: #909 · Mockup (approved): tab "App (nhân viên)" of
`.agent/changes/907-attendance-api/mockup.html` (https://claude.ai/artifact/MikH31P6eVqyzbnj6BoWzf)

## Problem

Staff on Android cannot clock in / out or see their shifts and hours. The shop owner turned on the
attendance module (#907) and expects every phone, not only iPhones, to scan the counter QR code.

## Proposed outcome

On a shop with module `attendance`, the Android app shows "⏱ Chấm công" as the first row of Cài đặt; the
staff member opens it, taps the one button ("Vào ca" / "Ra ca"), scans the counter QR with the in-app camera,
and the app sends code + GPS position + accuracy + mock flag to `POST /api/attendance/punch`. The screen shows
"Đã vào ca" / "Đã ra ca" or one rejection with the mockup copy. "Ca và công của tôi" lists this week's shifts
with worked times and the month totals. A `SHIFT_CHANGED` push or inbox row opens "Ca và công của tôi".
Without the module (or on an old API without `merchant.modules`) nothing changes.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF`, `OUTLET_INVENTORY` on Android (`apps/mobile-android`).
API routes of #907 (read only). FCM push type `SHIFT_CHANGED`.

## Constraints

- Same screens and words as iOS (#909); when they differ Android follows iOS.
- Additive: an API without `merchant.modules` hides the row; new models parse missing fields as null.
- Camera + `ACCESS_FINE_LOCATION` asked with an explanation; denied → open app settings.
- `isMock`: `Location.isMock` on API 31+, `isFromMockProvider` before.
- Simple ("đơn giản và chuẩn"): no offline punch, no extra screens.

## Open questions

- None (copy for `MODULE_NOT_ENABLED`, `ATTENDANCE_NOT_CONFIGURED` and "no location" is not in the mockup:
  follow iOS #909 when it exists, else the short sentences in spec.md).

## Decision log

- 2026-10-12 — Owner gave the go for parts 1–4 in parallel; Android follows the approved mockup (owner).
