# Web: shop owner toggles overlapping orders

Issue: #1314 (epic #1309) · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-10-29

## Problem

"Cho tạo đơn khi trùng lịch" (`Merchant.allowOverlappingOrders`, #518) can only be changed on the phone. The web only reads it
(`apps/client/app/orders/create/OrderEditor.tsx`). An owner who works on the web cannot change it.

## Proposed outcome

A switch card "Cho tạo đơn khi trùng lịch" in Cài đặt → Thông tin cửa hàng, right above "Giá theo khối ngày với app cũ",
same card style as "Nhận đặt online". Owner (MERCHANT) only. Same words as the apps. Same setting as the phone switch.

## Affected users and systems

MERCHANT (changes it). Web client only (`apps/client`, `packages/utils` API helper, `locales`). No API, schema or payload change.

## Constraints

- Mockup agreed by the owner: artifact 9b56KwErJWiGpiyFEfyEY4, tab "Web: cho trùng lịch".
- Two new strings in `locales/{en,vi,ja,ko,zh}`; Vietnamese is the iOS text.
- Keep it simple: no extra UI.

## Open questions

- None.

## Decision log

- 2026-10-29 — owner: card goes above "Giá theo khối ngày với app cũ", saves on tap, no Lưu button (mockup).
