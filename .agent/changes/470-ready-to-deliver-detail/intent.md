# Sẵn sàng giao on the new order detail

Issue: #470 · Author: Trinh Tran (agent) · Status: accepted · Created: 2026-10-05

## Problem

The new order detail screens (iOS `Viewcontrollers/OrderDetail/OrderDetailViewController.swift`,
Android `ui/orders/v2/OrderDetailV2Screen.kt`) have no "Sẵn sàng giao" control. Only the old detail
screens have it (iOS `PreviewViewController` checkbox, Android `OrderDetailActions` switch). Staff on
the new UI cannot clear the "Chưa soạn đồ" pill in Việc cần làm.

## Proposed outcome

A rental that is still RESERVED shows a "Sẵn sàng giao" row with a switch in the info list of the new
detail. Toggling it saves `isReadyToDeliver` with the same request the old screens send, and the
orders list then shows or hides "Chưa soạn đồ".

## Affected users and systems

All shop roles that can update orders (`orders.update`: MERCHANT, OUTLET_ADMIN, OUTLET_STAFF, ADMIN).
iOS and Android apps. No API or data change.

## Constraints

- Same endpoint and payload as the old screens: `PUT /api/orders/{id}` with `{"isReadyToDeliver": bool}`.
- Old screens unchanged. Order row files (OrderRowCell, OrdersHomeScreen) untouched (PR #469).
- iOS is the look reference; both apps behave the same.

## Open questions

- None.

## Decision log

- 2026-10-05 — Show only for RENT + RESERVED (owner, design board CT-gon "Đã đặt").
- 2026-10-05 — Permission: the old screens show the control to everyone and let the API decide
  (`PUT /api/orders/{id}` needs `orders.update`). The new row is hidden without `orders.update`, the
  same gate the new detail already uses for "Gia hạn". Every shop role has it today, so no role loses
  the control (agent, from the task brief "respect permissions like the old screen").
