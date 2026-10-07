# Spec — Sẵn sàng giao on the new order detail

Issue: #470 · Status: accepted · Intent: ./intent.md

## Behavior

1. The row shows only when `orderType == RENT`, `status == RESERVED` and the user has `orders.update`.
   It is hidden for SALE, PICKUPED, RETURNED, CANCELLED.
2. Place: the info list, right after "Lịch thuê" (before "Giấy tờ" when present).
3. Look (board CT-gon, iOS reference): title "Sẵn sàng giao" 15pt semibold, subtitle
   "Đã soạn đủ đồ cho đơn này" 14pt #475569, system switch on the right (green when on), divider below.
4. The switch starts at the order's `isReadyToDeliver`.
5. Toggling sends `PUT /api/orders/{id}` with body `{"isReadyToDeliver": <new value>}` and nothing else
   (iOS `UpdateOrderRequest.updateReadyToDeliver`, Android `ApiParity.setReadyToDeliver`).
6. While saving, the switch is disabled and a spinner shows next to it; a second toggle is ignored.
7. On failure the switch goes back to the previous value and the standard error message shows
   (iOS `UIAlertController.errorAlert`, Android toast with `AppError` message).
8. On success the order reloads and the orders list is marked for refresh, so Việc cần làm shows or
   hides "Chưa soạn đồ".

## Out of scope

- Old detail screens, calendar, order row pills.
- Any API change.

## API and data

None. Existing field `isReadyToDeliver` on `PUT /api/orders/{id}` (`orders.update`, outlet scope in the API).

## Acceptance

- [x] Behaviors 1 and 5 have unit tests on both apps (plan steps 1–2)
- [x] iOS and Android both change; no API shape change
- [x] New string: subtitle, vi + en on both apps (mobile only; web locales not touched)
- [x] Role limits hold: hidden without `orders.update`; the API still rejects
