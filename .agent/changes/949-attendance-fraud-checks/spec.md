# Spec #949

## Rules
1. **Same coordinates.** Two scans are "the same place" when latitude and longitude are equal after rounding to
   6 decimals (~0.1 m). The second accepted punch gets `SAME_COORDS` (stored, never blocking).
2. **Allowed outlets** `allowedOutletsOf(user)` (`apps/api/lib/attendance/outlets.ts`):
   - `MERCHANT`: every outlet of the merchant.
   - `OUTLET_ADMIN`, `OUTLET_STAFF`, `OUTLET_INVENTORY`: their own outlet (empty if none).
   Returns `[{ id, name }]`.
3. **Wrong outlet.** A valid QR whose outlet is not in the list (or belongs to another merchant) →
   422 `QR_WRONG_OUTLET` with `data: { qrOutlet: { id, name } | null, allowedOutlets: [{ id, name }] }`.
   `qrOutlet` is null for another merchant's code (no name leaks).
4. **Stored under the scanner's outlet.** That scan row: `outletId` = the scanner's outlet (`null` for an owner
   scanning another merchant's code), coordinates kept, new nullable `qrOutletId` = the code's outlet (own merchant
   only). Migration: `AttendanceScan.qrOutletId INTEGER` nullable, no backfill.
5. **Person month** rows of such a scan add `qrOutlet: { id, name }` (only when `qrOutletId` is set).
6. **Apps.** Wrong-outlet message: "Mã này của <qrOutlet.name>. Bạn chấm công ở <allowed names>." when both are
   present, else the current text.

## Not changed
Order of checks, other error codes, accepted punch, exports (the row now simply lands in the scanner's outlet).
