# #916 Intent — attendance my week shows manager-added records; same copy on iOS and Android

## What
- "Ca và công của tôi" (iOS, Android): the week list shows records a manager added by hand on the web
  ("+ Thêm lượt") and records a manager edited, with the record's real in–out times.
- `MODULE_NOT_ENABLED`, `ATTENDANCE_NOT_CONFIGURED` and "no location fix" read the same on both apps
  (Android follows iOS), vi and en.

## Why
Both apps build the week from scan rows; a manual record has no scans, and an edited record still shows the
scan times. The month total (from the API) was right, so the list and the total disagreed.

## Constraints
- No API change. Use the `EDIT` rows of `GET /api/attendance/people/[userId]/month` (`recordId`, `after`).
- iOS is the mobile reference for copy.
