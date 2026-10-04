# Spec — Mobile onboarding and customers

Issue: #387 · Status: accepted · Intent: ./intent.md

## Behavior

### Onboarding (`newAuth`)
1. Three steps: Thêm đồ cho thuê, Lưu khách hàng, Tạo đơn, in the approved style E (board `Onboarding-E`): three
   drifting blobs (12 s loop), a floating 120pt white icon card (dress / user / calendar, 4.2 s loop), "BƯỚC n/3",
   28pt heading, grey body, Bỏ qua pill (hidden on the last step), dots on the left and Tiếp / Bắt đầu on the right.
   No motion with Reduce Motion (iOS) or animations off (Android).
2. Same "show once" rule and storage as today: iOS `HasCompletedOnboarding` (`Utils.hasCompletedOnboarding`),
   Android `SessionStore.onboardingDone`. Flag off: the current onboarding.

### Customer picker (`newCustomers`, opened from the new cart)
3. Sheet "Chọn khách hàng" with Đóng, a search field (name or phone), a "Khách mới" row, then "GẦN ĐÂY".
4. The list is `GET /api/customers` in its default order (newest first, the same order the old picker shows).
   Typing searches with `q`, debounced 300 ms; an answer for an older query is dropped. The API ignores a query
   shorter than 2 characters, so the list then stays the default.
5. Row: initials avatar, name, loyalty tier pill when present, "masked phone · N đơn" (`orderCount`).
6. Tapping a row sets the cart customer exactly as the old picker does and closes the sheet.

### New customer
7. Fields: phone (required), full name (required), note (optional) and the hint line. "Lưu và chọn".
8. Before creating, `GET /api/customers?q=<phone>`; a customer whose phone has the same digits is shown with
   "Chọn khách này" instead of creating. A 409 `CUSTOMER_DUPLICATE` on create falls back to the same check.
9. Payload: name split like the iOS form today (first word → `firstName`, rest → `lastName`), `phone`, and
   `notes` when given. After saving, the customer is selected and the user is back in the cart.

### Customer list (Settings)
10. iOS: row "Khách hàng" in the new Settings (`newSettings`) when `newCustomers` is on and the user may view customers.
    Android: the existing row opens the new list when `newCustomers` is on.
11. Title "Khách hàng · total", back, + (new customer), search, paging (20 per page), rows like the picker plus a chevron.

### Customer detail
12. Header: back, Sửa (the existing edit form), initials, name, tier, phone, call button (hidden without phone).
13. Tiles: Số đơn = `summary.totalOrders`, Tổng chi = `summary.totalAmount`, Đang thuê = `total` of
    `GET /api/orders?customerId=&status=PICKUPED&limit=1`. Money hidden for staff when the shop hides it.
14. "ĐƠN GẦN ĐÂY": first 20 orders: "#number · N món" (the list rows carry no item names), dates (rent: pickup →
    return, one date when both fall on the same civil day; sale: created), status pill in the board colors, total.
    Tapping opens the order detail through the existing router.
15. "Tạo đơn cho khách này": sets the customer on the cart and opens it. Draft items stay; an order being edited is
    dropped first.

### Edit customer (board KH-sua, added by the owner)
16a. "Sửa" on the detail opens "Sửa khách hàng": phone and full name (required), then "THÔNG TIN THÊM (không bắt buộc)":
     email, address, CCCD / giấy tờ (`idNumber`) and date of birth (dd/MM/yyyy) side by side, notes. Hủy / Lưu.
16b. Loads `GET /api/customers/{id}`; saves with `PUT /api/customers/{id}` (firstName/lastName split as in create,
     phone, email, address, idNumber, notes, dateOfBirth as `YYYY-MM-DDT00:00:00.000Z`; an emptied field is sent as "").
16c. HTTP 409 (phone of another customer, DB unique `merchantId+phone`) shows "Số điện thoại này đã thuộc khách khác"
     under the phone field. After a save the detail reloads.

### Roles
16. Every role with `customers.view` sees the list and detail; `customers.manage` (MERCHANT, OUTLET_ADMIN,
    OUTLET_STAFF) gives +, Khách mới and Sửa. No new screen has delete.

## Out of scope

Address/ID fields in the new form, delete from the new screens, API changes, web.

## Acceptance

- [ ] Unit tests both apps: phone duplicate, name split / payload, search stale-drop, list + detail parsing with
      missing optional fields, initials, row/tile formatting.
- [ ] iOS `POS ADBDTests` and Android `:app:testDebugUnitTest :app:assembleDebug` green.
- [ ] Manual run on both apps against a local API (merchant2, staff.outlet2), flags on and off, with screenshots.
- [ ] Strings in iOS `vi-VN`/`en` and Android `values`/`values-vi`.
