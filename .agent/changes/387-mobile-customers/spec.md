# Spec — Mobile onboarding and customers

Issue: #387 · Status: accepted · Intent: ./intent.md

## Behavior

### Onboarding (`newAuth`)
1. Three steps: Thêm đồ cho thuê, Lưu khách hàng, Tạo đơn. Blue rounded tile with an icon, "Bước n/3", title,
   short body, dots (active one wide), Bỏ qua (top right, hidden on the last step), Tiếp / Bắt đầu.
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
14. "ĐƠN GẦN ĐÂY": first 20 orders: "#number · first item (+n)", dates (rent: pickup → return; sale: created),
    status pill, total. Tapping opens the order detail through the existing router.
15. "Tạo đơn cho khách này": sets the customer on the cart (an order being edited is dropped first) and opens the cart.

### Roles
16. Every role with `customers.view` sees the list and detail; `customers.manage` gives + and Sửa. No new screen has
    delete; Android's edit form opened from the detail hides Xóa for OUTLET_STAFF.

## Out of scope

Address/ID fields in the new form, delete from the new screens, API changes, web.

## Acceptance

- [ ] Unit tests both apps: phone duplicate, name split / payload, search stale-drop, list + detail parsing with
      missing optional fields, initials, row/tile formatting.
- [ ] iOS `POS ADBDTests` and Android `:app:testDebugUnitTest :app:assembleDebug` green.
- [ ] Manual run on both apps against a local API (merchant2, staff.outlet2), flags on and off, with screenshots.
- [ ] Strings in iOS `vi-VN`/`en` and Android `values`/`values-vi`.
