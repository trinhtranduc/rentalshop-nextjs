# Mobile UI refresh (iOS + Android)

Issue: #363 · Author: Trinh Tran · Status: draft · Created: 2026-10-03

## Problem

Counter staff use the order list to find what to hand over or take back today, but the list is
organised by status, shows times that do not matter (the shop works by day), hides the total, and
mixes actions into the list. The audit of the current apps also found: stale responses overwriting
newer ones, duplicate `LazyColumn` keys on Android, a broken Sale tab filter, raw status codes shown
as badges, and filters not reset when switching tabs.

## Proposed outcome

Both apps match the agreed design (Design canvas "AnyRent mobile – bản đã chốt",
https://claude.ai/artifact/DY4DRyDH8Kps9gAw9FExLx):

- Orders tab: rentals by default with "Việc cần làm | Tất cả đơn"; a "Đơn bán" switch to a flat
  sale history grouped by sale day; one search that finds rentals and sales.
- Hand-over and return only from the order detail, through their sheets.
- Rental statuses: Đã đặt, Đang thuê, Đã trả, Đã huỷ. Sale: Hoàn thành, Đã huỷ.
  "Trễ N ngày" is a red note on a late order, never a status.
- Dates only (no times), Vietnam civil day. Product images in lists, detail and cart.
- Cart with Thuê/Bán; per item "Theo lần / Theo ngày" for rentals, sale price for sales.
- Calendar with pickups, returns and late returns; Overview with one period button and a sheet;
  Settings as one grouped list.

## Affected users and systems

- Roles: `MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` (staff still cannot edit prices).
- Apps: iOS (`apps/mobile`), Android (`apps/mobile-android`). API from `../362-mobile-api/`.

## Constraints

- Merchants already use the apps; each release must work against the current production API
  until the API PRs are on `main-real` (production), and must not lose offline/printing features.
- Parity: every screen ships on iOS and Android in the same release (skill `mobile-parity`).
- Only one outlet per merchant today: hide outlet pickers and labels.
- Keep proposals lean; no extra screens beyond the canvas.

## Open questions

1. Keep the "Trang chủ" tab (POS product grid) as the first tab? Design assumes yes.
2. Late fee: show only "Trễ N ngày" and enter the fee at return (API intent Q2).

## Decision log

- 2026-10-03 — Release per phase (Trinh Tran)
- 2026-10-03 — Late list includes RESERVED past pickup day as "Giao · trễ N ngày"; a PICKUPED rental can be cancelled from its detail (Trinh Tran)
- 2026-10-03 — No stage tabs; "Việc cần làm | Tất cả đơn" + Đơn bán switch (Trinh Tran)
- 2026-10-03 — Sale list has no tabs; status shown as a tag on each row (Trinh Tran)
- 2026-10-03 — Search is unified across rentals and sales (Trinh Tran)
- 2026-10-03 — Overview period is one button opening a sheet (Trinh Tran)
