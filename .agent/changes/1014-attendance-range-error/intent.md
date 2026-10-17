# Attendance QR: location, outlet-setup and shift errors apart

Issue: #1014 · Status: implementing · Created: 2026-10-17

## Problem
Staff who scan the attendance QR outside the outlet's radius see "Chi nhánh chưa cài chấm công". If the
scanned outlet has a QR but no location, the punch route answers `ATTENDANCE_NOT_CONFIGURED` before the distance
check (`apps/api/app/api/attendance/punch/route.ts:95`), so the distance is never measured. The code and the copy
do not say what is missing or for which outlet, so a scan from far away looks like the wrong error.

## Outcome
Each failure group has its own code and message on the API and in both apps:
- location (staff side): `OUT_OF_RANGE`, `GPS_INACCURATE`, `MOCK_LOCATION`, app-side `NO_LOCATION` (unchanged);
- outlet configuration: new `ATTENDANCE_LOCATION_NOT_SET` (with the outlet), `ATTENDANCE_NOT_CONFIGURED` kept;
- shift: punch has no shift rejection (#907 rule 17); no new rule.

## Constraints
Installed apps cannot be updated. The new code is additive, keeps 422, and old apps get a readable Vietnamese
server sentence. No migration, no env. Keep it simple: no new screens.

## Decision log
- 2026-10-17: add a new code instead of giving `ATTENDANCE_NOT_CONFIGURED` a new meaning; the kiosk keeps the old code.
- 2026-10-17: no shift rejection added, because it would block shops that clock in without shifts.
