# Intent — #562 Xem trước hóa đơn redone on the shop web

Issue: #562 · Author: Trinh (via Claude) · Status: accepted · Created: 2026-10-06

## Problem

The owner: "UI này cũng nên làm lại" about the receipt dialog of the shop web. After **Tạo đơn** and from
**In** on the order page, `apps/client` opens the shared `ReceiptPreviewModal` (`packages/ui`): old chrome
(a "Tùy chọn in" column, a big "In qua PDF" button with an off-palette ring), no dark mode, and a monospace
slip that prints wrong content:

- a per-day line reads `1 x 100,000 = 2,600,000` (the 26 rental days are missing);
- money has "," thousands and no "đ";
- thế chân (security deposit), giấy tờ thế chân and phí hư hại are missing (iOS prints them);
- after Tạo đơn the shop phone and address are missing (the create response has no nested outlet);
- SALE prints the created time twice.

## Proposed outcome

A shop user sees a receipt dialog on the shell design (light/dark, phone full screen) titled
"Hoá đơn #694224" with the slip on white paper, **In** and **Đóng**. The slip carries the same content,
in the same order, as the iOS receipt, with per-day lines "1 × 100.000đ/ngày × 26 ngày = 2.600.000đ",
VND money, Vietnam civil days and Vietnam time. Printing prints only the slip on 80mm paper.

## Affected users and systems

All shop roles that can open an order. App: `client` only. Reads existing endpoints.

## Constraints

- No `packages/**` change (admin keeps the shared modal), no API, schema or mobile change.
- `OrderEditor.tsx` edit stays one import line (PR #558 edits that file).
- Vietnam civil days (`timezone-dates`); i18n in `locales/{en,vi}/orders.json` (`web.receipt`).

## Open questions

- None blocking. iOS also prints a barcode of the order number on the thermal slip; the web slip does not
  (no barcode library in the client) — follow-up if the owner wants it.
