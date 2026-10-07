# Intent — #569 Confirm before creating an order (shop web)

## What
Owner: "lúc tạo đơn nên có dialog để confirm rồi thu bao nhiêu chứ?" Tạo đơn on the shop web
creates the order on the first press. Add one confirm dialog first, copied from the iOS
`CreateOrderConfirmSheet` (#476): who, which days, what items, the total, and how much to collect now.

## Why
Staff create an order with the customer in front of them. A last look at the days and the amount
to take now avoids a wrong order and a second trip to Sửa đơn.

## Constraints
- iOS is the reference for rows, wording and amounts (`ProductsV2Views.swift` `CreateOrderConfirmSheet`,
  `ProductsV2.swift` `CreateOrderSheetLogic`, `CartV2Logic.collectNow`).
- The "Trùng lịch" confirm (shop allows overlaps) merges into this dialog, as on iOS.
- Sửa đơn: iOS sends an edit to its review screen, not this sheet (`CartV2Logic.ctaRoute`). The web
  edit stays as today.
- Amounts come from the same payload that is sent. Request body unchanged.
- Only `apps/client/app/orders/create/**`, `locales/{en,vi}/orders.json`, `tests/**`. No API, packages
  or mobile change, so no mobile parity or API compatibility review.
