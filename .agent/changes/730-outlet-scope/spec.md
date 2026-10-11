# Spec

- `PUT /api/orders/{id}`: for an outlet role, an order whose `outletId` is not the caller's answers 403
  `CANNOT_UPDATE_ORDER_FROM_OTHER_OUTLET`, before `outletId` is auto-filled. The order stays unchanged. This
  also covers `PUT {status}` (iOS/Android status change). `POST /api/orders/{id}/status` already had the guard.
- `GET /api/orders/{id}`, `GET /api/orders/by-number/{n}`, `GET /api/orders/{id}/qr-code`: an outlet role gets
  404 `ORDER_NOT_FOUND` for another outlet's order (same code as another merchant's order).
- `GET /api/products/{id}/availability`, `/availability-calendar`, `GET /api/products/availability`,
  `POST /api/products/batch-availability`: an outlet role sending an `outletId` that is not its own gets 403
  `NO_OUTLET_ACCESS`. No `outletId` or its own: unchanged.
- MERCHANT and ADMIN: unchanged. Outlet role = `isOutletRole` (OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY).
- Tests: `BF-ROLE-07..09` (staff and kho) plus `BF-ROLE-09B` (legacy availability, order QR).
