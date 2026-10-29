# Mobile prints the outlet's note and bank QR from the server

Issue: #1308 (epic #1309) · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-10-29

## Problem

`Outlet.printNote` and `Outlet.printBankQr` are saved per branch on the server and the web prints them.
iOS and Android ignore the server and print a per-device note (iOS `UserDefaults "IpLabelPrinter"`, Android
SharedPreferences `anyrent.printer` `printerNote`) and a per-device QR switch (default off). Staff therefore do not
print the note and QR the owner set for the branch.

## Proposed outcome

- A bill (print and share image) takes `printNote` / `printBankQr` from the order's own branch (`order.outlet`), as web does.
- Owner (role with `outlet.manage`) edits the note and the QR switch in Cài đặt → Máy in; they are saved to the server
  (`PUT /api/outlets?outletId=`), not on the device.
- Staff see the server values read-only.
- First time the owner opens the screen: server note empty and a legacy device note exists -> the field is pre-filled,
  the owner taps Lưu. Nothing is pushed automatically.
- Paper width, printer IP, Bluetooth stay per device.

## Affected users and systems

All roles (printing), MERCHANT / OUTLET_ADMIN (editing). iOS, Android. No API change.

## Constraints

- Installed apps on the store keep their per-device behaviour until updated (additive: no API change).
- Missing `outlet.printNote` / `printBankQr` in a payload must not break decoding.
- Minimal UI: the existing Máy in screen, a read-only state for staff, no new screen.

## Open questions

- None.

## Decision log

- 2026-10-29 — owner: use the order's own outlet; owner edits on web and mobile, saved to the server; staff read-only; legacy note pre-filled once for the owner.
- 2026-10-29 — (agent) the share image follows the printed bill, so it also uses the order's outlet value.
- 2026-10-29 — (agent) the legacy device note is removed after a successful save, so the pre-fill never returns.
- 2026-10-29 — owner: MERCHANT and OUTLET_ADMIN edit, other roles read-only; MERCHANT picks the branch; device settings editable by all; Thu cọc untouched.
