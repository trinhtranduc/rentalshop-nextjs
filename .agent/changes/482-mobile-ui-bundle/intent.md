# Mobile UI bundle: order-by headers, notification wrap, created time, cart pricing sheet, change-password sheet, status names

Issue: #482 · Author: Trinh Tran (agent) · Status: accepted · Created: 2026-10-05

## Problem

Several iOS and Android screens lag behind the approved canvas boards (DT-don-theo-sp, DT-don-theo-kh, TB-thong-bao,
Gio-hang, Gio-hang-chon-gia, DMK-doi-mat-khau, CT-gon / CT-qua-han / CT-ban):

1. "Đơn theo sản phẩm" / "Đơn theo khách hàng" use an old header card and, on Android, the generic filtered orders screen.
2. The notifications list cuts long titles and bodies with an ellipsis.
3. The order detail "Đã đặt" step shows only the day; list rows show "tạo 28/09" without a year for older orders.
4. The new cart shows a two-way "Theo lần | Theo ngày" toggle plus a tap-to-edit price on every line (#473/#475):
   crowded, and it cannot hold more than two pricing options.
5. Change password is an alert / dialog with three fields instead of a sheet over Cài đặt.
6. Status names disagree: the order detail pill says "Mới cọc" / "Đã hủy" while the orders list says "Đã đặt" /
   "Đã huỷ"; the pill has its own style; the task tags "Giao" / "Trả" read like a status.

## Proposed outcome

The screens match the boards on both apps (iOS is the reference). No API change.

## Affected users and systems

Shop staff on iOS and Android. API, web: none.

## Constraints

- No API change; stats come from what the existing endpoints return or from the loaded orders.
- Cart: only the cart line price changes, never the catalog price; the create-order payload keeps its shape.
- Change password: same endpoint and same validation (min 6 characters, as today).
- Dates in Vietnam civil time; created-time tests run with a non-VN zone too.
- Bundles PR #481 (cart note photos + tab bar fix), which this PR supersedes.

## Open questions

- None.

## Decision log

- 2026-10-05 — Coordinator: one PR for items 1–5; item 6 added (status names), then extended: task tags
  "Cần giao" / "Cần trả", cancelled spelled "Đã huỷ" in the detail pill and old filter; the detail status uses the
  list row tag (14pt bold, 3/8 padding, radius 7) left of the customer name.
