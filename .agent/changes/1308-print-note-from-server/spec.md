# Spec: print note and bank QR from the order's outlet (#1308)

## Rules

1. Note: RENT bill only. Text = `order.outlet.printNote`; blank or missing = no "Note" block (signature block stays).
   The old default "*** Vui lòng mang theo CMND/BLX khi lấy đồ" is no longer printed.
2. Bank QR: printed (when the outlet has a bank account) only if `order.outlet.printBankQr == true`; missing = off.
3. Share image uses rule 2 as well.
4. Order without outlet print info (iOS list/cart order): load the order detail first, then print. If that fails,
   print without note and QR.
5. Screen "In & phiếu" (Máy in): note field + QR switch show one branch's values read from `GET /api/outlets`.
   Role rule (owner, 2026-10-29): MERCHANT and OUTLET_ADMIN edit; every other role (OUTLET_STAFF, OUTLET_INVENTORY) sees the
   server values read-only (field not editable, switch disabled, one hint line). Pure `OutletPrintSettings.canEdit(role)` on
   both apps (like `canManageBankAccounts` / `OverlapSetting.canEdit`).
   Branch: OUTLET_ADMIN and staff use their own outlet. MERCHANT has none: starts on the current branch (`CurrentOutlet`), else the
   default, else the first active; when the shop has more than one active branch a branch row opens a picker (pattern of the
   bank accounts screen). Pure `initialOutletId(...)`.
   Per-device settings (paper width, printer IP, Bluetooth) stay visible and editable for EVERY role.
   Out of scope: the "Thu cọc" screen.
6. Save sends `{printNote, printBankQr}` to `PUT /api/outlets?outletId=<id>`; blank note clears (API stores null).
   The QR switch saves on change (as before), the note on Lưu / test print / leaving the field (as before).
   A 403 shows the error and restores the server values.
7. Pre-fill: editable user, server note blank, legacy device note non-blank -> note field = legacy note (not saved).
   After a successful save the legacy device note is removed.

## API

No change. `PUT /api/outlets` already takes `printNote` (max 500, blank -> null) and `printBankQr`.
`GET /api/outlets` (db.outlets.search uses `include`) returns both. Order detail returns `outlet.printNote/printBankQr`
(`findByIdDetail`); the order list (`findManyLightweight`) does not, and mobile does not print from the list.

## Strings

en/vi: read-only hint for staff, save failure falls back to existing error strings.
