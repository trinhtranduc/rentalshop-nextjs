# Block a discount larger than the order total

Issue: #1067 · Author: Claude (for Trinh Tran) · Status: accepted · Created: 2026-10-18

## Problem

Owner: "chặn giảm giá lớn hơn tổng đơn luôn". In the e2e run the mobile cart's discount keypad appended
digits to the old value, so after a few runs the discount was −5.000.050.000 on a 77đ order (the total clamps
to 0). The cart also kept the discount after every item was removed. The web client lets you type a discount
above the rent and silently clamps it.

## Proposed outcome

- iOS (reference), Android and the web client refuse a discount above what it applies to: the line subtotal
  before the discount (tiền thuê / tiền hàng; deposit and loyalty are not part of it). A percent discount is at
  most 100%.
- The discount sheet shows a red inline error "Giảm giá không được lớn hơn tổng đơn (X)" /
  "Discount can't be more than the order total (X)" and Confirm is disabled until the value is valid.
- Opening the sheet with an existing value: the first key replaces it (select-all), so values no longer grow.
- Removing items so the subtotal falls below the saved discount: the discount is invalid, "Tạo đơn" /
  "Lưu thay đổi" are disabled and the same message shows in the cart's blocking notice.

## Affected users and systems

All cart roles (MERCHANT, OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY). iOS, Android, `apps/client`.
No API, prisma or shared API package change.

## Constraints

- No API change: `POST /api/orders` / `PUT` do not reject a discount above the subtotal today (zod only checks
  `nonnegative`). A guard there could give installed apps new 400s → separate issue with an api-compat review.
- Another agent edits `CartV2ViewController.swift` near the availability note (~520-560): stay in the discount
  sheet, money rows, bottom notice and cart logic.

## Open questions

- None.

## Decision log

- 2026-10-18 — Case 3 (items removed): mark invalid + block create with the same message, not auto-lower.
  Reason: the cart already blocks with `blockedNotice` for overlaps; lowering silently would also be the
  "silent clamp" the owner does not want. (Claude, per the brief: "pick the simplest")
- 2026-10-18 — Keypad fresh entry applies to every use of the shared keypad (deposit, price too): the same
  append bug hits them. (Claude)
