# Spec — #556 Shop web Tạo đơn: pricing per cart line, overlap tags, no category chips

Issue: #556 · Status: accepted · Intent: ./intent.md

## Behavior

1. `/orders/create` and `/orders/[id]/edit` show no category chips; the categories call is gone.
2. A rent line shows a pricing chip ("Theo ngày · 150.000đ/ngày"). Clicking it opens an inline editor:
   segmented "Theo lần | Theo ngày" (plus any other active option type of the product, e.g. Theo giờ),
   a "Giá cho đơn này" money input with the unit suffix, the note
   "Chỉ áp dụng cho đơn này, không đổi giá sản phẩm." and "Xong".
3. Switching mode: unit price = the manual price of that mode if set, else the product option's price, else 0.
   Leaving a mode that has no product option keeps its current price for when the user comes back (iOS legacy option).
4. A typed price is stored for the current mode only (Theo lần and Theo ngày independent) and becomes the unit price.
5. Line total = qty × price, × rental days (both ends) for Theo ngày. Payload sends `pricingType` FIXED/HOURLY/DAILY
   and `pricingOptionId` only when the chosen option has that type.
6. Rent → Sale → Rent keeps a manual rent price.
7. A rent line with unit price 0 shows "Nhập giá" in the danger colour, and create is blocked with "Nhập giá cho {name}."
8. With days chosen, per rent line, from the batch answer for the order's outlet:
   - conflict when, on some Vietnam civil day of the window, another order holds the product and
     stock − units held that day < line quantity → tag "Hết đồ {days} · đã thuê ở đơn {#numbers}"
     (or "Hết đồ {days}" without numbers); `{days}` = "03–05/10", "03/10", "30/09–02/10";
     numbers are the last segment of the order number, deduplicated.
   - a day no other order holds is never a conflict; without a stock figure, the free-unit figure decides for the
     whole window, only when other orders hold the product.
   - fits → "Còn {free} bộ trong lịch này"; short while no other order holds it → the old "Chỉ còn {free} trong lịch này".
   - sale lines: "Còn {free} trong kho" (no conflicts).
9. Setting `merchant.allowOverlappingOrders` (profile; missing = ON):
   ON + conflicts → submit opens "Trùng lịch" with one line per conflict
   ("{name} thiếu {n} bộ ngày {days} (đã thuê ở {#numbers})."), confirm button "Vẫn tạo đơn" (edit: "Vẫn lưu thay đổi").
   OFF + conflicts → submit disabled, notice "Cửa hàng không cho tạo đơn trùng lịch. Đổi ngày, bớt số lượng hoặc bỏ món đã hết."
   No conflicts, or a sale → as before.
10. A 409 `ORDER_SCHEDULE_CONFLICT` shows the localized message (global handler, `errors.json`), switches the screen
    to OFF and re-reads availability.
11. Availability answers for older days / outlet are dropped. Sửa đơn sends `excludeOrderId`, so the edited order
    never flags itself.

12. "Ngày giao và trả" shows one range calendar (no date inputs): Monday-first, today ringed, past days allowed,
    two months side by side from 640px, one month on a phone, ‹ › to change month. First click = pickup day,
    second click = return day (before the pickup → swapped; the same day twice → a same-day rental, 1 day);
    a click after a full range starts again; while picking the return day, hovering previews the range.
    The quick picks stay. Summary "T5 08/10 → T6 16/10 · 9 ngày"; "Chọn · 9 ngày" applies. Day keys only
    (Vietnam civil days); sale orders keep no days, as before.

## Out of scope

- Editing a sale line's price; a settings toggle on web; any API, mobile, or package change.
- Marking fully-booked days on the calendar (needs per-day availability the screen does not fetch).

## API and data

None. Reads `availabilityByOutlet[].{stock,effectivelyAvailable,conflicts[].orderNumber,quantity,pickupDate,returnDate}`
and `merchant.allowOverlappingOrders` from `GET /api/users/profile`.

## Acceptance

- [x] Behaviors 3–9 have unit tests in `tests/web-orders-schedule-model.test.ts` / `tests/web-create-order-model.test.ts`
- [x] Mobile: no API or rule change; iOS is the source of the rule
- [x] New strings in `locales/{en,vi}/orders.json` (`web.editor`; ja/ko/zh have no `orders.json`)
- [x] Vietnam civil days hold under both TZ
