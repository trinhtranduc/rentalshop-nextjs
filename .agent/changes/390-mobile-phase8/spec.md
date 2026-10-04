# Spec — Mobile phase 8

Issue: #390 · Status: accepted · Intent: ./intent.md

## Behavior

### Order rows (`newOrders`, boards VL-tat-ca, VL-tim)
1. A "Tất cả đơn" or search row reads `amountDue` / `refundDue` of `GET /api/orders` (optional numbers).
   Right-hand line under the total: `refundDue > 0` → "trả cọc X" (purple), else `amountDue > 0` → "còn thu X"
   (orange), else "✓ đã thu đủ" (green). Nothing when both fields are missing or the order is CANCELLED.
   Sale rows (Đơn bán) follow the same rule. Money is hidden for staff when the shop hides money (existing rule).

### Filter sheet (`newOrders`, board Loc)
2. Sort options, in order: Việc gần nhất (`nearestTask`), Mới tạo nhất (`createdAt`), Ngày giao gần nhất
   (`pickupPlanAt`), Ngày trả gần nhất (`returnPlanAt`). Caption under the options: "Việc gần nhất: đơn trễ hạn trả
   trước, rồi đơn cần giao hoặc nhận trả sớm nhất." Default stays Mới tạo nhất (board VL-tat-ca).
3. KHOẢNG NGÀY: Ngày tạo → `dateField=createdAt`, Ngày giao → `pickupPlanAt`, Ngày trả → `returnPlanAt`, with the
   existing `startDate` / `endDate` of the chosen device-zone days. The list header shows the sort name.

### Calendar rows (`newCalendar`, board Lich)
4. Each by-date row reads optional `amountDue`, `refundDue`, `lateFee`. Note under the total:
   - a late row (`lateDays > 0`): "trễ N ngày", plus " · phí X" when `lateFee > 0` (red);
   - else `refundDue > 0` → "trả cọc X" (purple); `amountDue > 0` → "còn thu X" (orange); else nothing.
   With money hidden (iOS staff rule) only the late text shows.

### Product delete (`newProducts`, SP-chi-tiet)
5. Roles that may delete (`products.manage`, never OUTLET_STAFF) see "Xóa" next to "Sửa" on the photo.
   Tap → confirm sheet "Xóa sản phẩm?" with the product name and "Xóa" (destructive) / "Huỷ".
6. Success → back to the list, which reloads. 409 `PRODUCT_HAS_OPEN_ORDERS` → the localized message
   (iOS `ErrorCodes` + `Localizable.strings`, Android `ApiErrorMessages` + `strings.xml`); the screen stays.

### Extend rental (`newOrderDetail`, CT-gon / CT-qua-han)
7. RENT orders in RESERVED or PICKUPED, for users with `orders.update`, get "Gia hạn" (⋯ menu; also an outline
   button beside "Nhận trả" when PICKUPED).
8. Sheet: current return day, a date picker whose first selectable day is the day after the current return day,
   "Thêm N ngày", and "Gia hạn đến <day>".
9. Confirm → `POST /api/products/batch-availability` for the order's items (quantity summed per product) over the
   extra days only: start = start of (old return day + 1), end = end of the new return day (device zone). Any item
   not available → "Không đủ hàng: <names>" in the sheet, nothing saved.
10. All available → `PUT /api/orders/{id}` `{ returnPlanAt }` = last second of the new day in the device zone →
    sheet closes, detail reloads, lists refresh. API errors show the localized message.

## Out of scope

- Repricing DAILY items on extension (the API keeps `totalAmount`; editing the order in the cart reprices).
- Late-fee "+ phí trễ" on list rows, the "không tính doanh thu" line on cancelled rows, API changes.

## API and data

All fields read are optional: `GET /api/orders` rows `amountDue`, `refundDue`; by-date rows `amountDue`, `refundDue`,
`lateFee`; `DELETE /api/products/{id}` 409 `PRODUCT_HAS_OPEN_ORDERS`; `sortBy=nearestTask`;
`dateField=pickupPlanAt|returnPlanAt`. IDs stay numeric.

## Acceptance

- [ ] Unit tests: pay line from optional balances (absent, cancelled, refund, due, paid); calendar note; filter →
  query (`nearestTask`, planned `dateField`); extension window / min day / instants / availability verdict /
  allowed statuses; delete permission; 409 → message.
- [ ] iOS `POS ADBDTests` and Android `:app:testDebugUnitTest :app:assembleDebug` green.
- [ ] Manual check of the 5 items on both apps against a local API (merchant and staff), screenshots.
