# #949 Attendance: same-coordinates check at GPS precision; wrong-branch scans refused and visible to managers

Status: in progress

## What
1. `SAME_COORDS` also catches a repeat scan when the phone sends full-precision GPS numbers (17 digits).
2. A scan of a QR code of a branch the person does not belong to is refused (`QR_WRONG_OUTLET`) using one
   function "allowed outlets of the user"; the error says which branch the code is from and the person's branches.
3. That refused scan is stored under the scanning person's branch, so managers see it in Chi tiết theo người
   (filter "Bị từ chối").

## Why
Found in the full Chấm công e2e on `dev` (DB `anyrent_fulle2e`, scans 5, 37, 45). Owner decision 13/10/26. Refs #906.

## Constraints
- Additive only: error code, status and message unchanged; `data` gains fields.
- Old installed apps have no attendance code (`release-2026-10-12.2`).
- Apps: iOS is the reference; both read the new `data`, fall back to the current text.
