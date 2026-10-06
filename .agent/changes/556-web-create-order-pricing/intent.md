# Intent — #556 Shop web Tạo đơn: pricing per cart line, overlap tags like mobile, no category chips

Issue: #556 · Author: Claude (for Trinh Tran) · Status: accepted · Created: 2026-10-06

## Problem

Owner, on `/orders/create` (verbatim): "tôi nghĩ ẩn danh mục, sản phẩm trong cart cần cho chọn thuê theo lần
hay theo ngày, cho đổi giá, và cần báo trùng hay có sẵn khi chọn ngày thuê tương tự như mobile".

Today the web cart (#523) only offers a `<select>` when a product has more than one pricing option, cannot
change a line's price, and shows a red "Chỉ còn n" without saying which days or which orders hold the item.
It ignores the shop setting "Cho tạo đơn khi trùng lịch" (#518), so a shop with it OFF only learns at the 409.

## Proposed outcome

1. The product grid has no category chips (search stays).
2. A rent cart line switches "Theo lần" / "Theo ngày" and takes a price for this order only, like iOS
   (`CartItem.selectPricingType`, `setCustomRentalPrice`).
3. With rental days chosen, every rent line says whether it fits ("Còn n bộ trong lịch này") or is booked
   out ("Hết đồ 03–05/10 · đã thuê ở đơn #0003"), with the iOS day rule (`ScheduleConflictLogic`).
   Setting ON: create asks first ("Trùng lịch" → "Vẫn tạo đơn"). OFF: "Tạo đơn" disabled with the notice.
4. Sửa đơn uses the same screen and never flags the order being edited.
5. Second owner request (same screen, 2026-10-06): "chỗ chọn ngày nên dùng 1 calendar duration như trước" —
   the rental days are picked on one range calendar (pickup day, then return day, range highlighted), like the
   old create form's `DateRangePicker`, instead of two date inputs.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` on `apps/client`. No API, package, migration or mobile change.

## Constraints

- Existing calls only: `POST /api/products/batch-availability` (already returns `availabilityByOutlet[].conflicts`,
  `stock`, `effectivelyAvailable`), `GET /api/users/profile` for `merchant.allowOverlappingOrders`.
- Vietnam civil days; a same-day rental holds that day. Tests under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
- iOS is the reference; Android follows iOS. No mobile code change.

## Open questions

- none

## Decision log

- 2026-10-06 — Staff may set the price for this order: iOS lets any role do it ("for this order only, any role,
  any time", owner 2026-10-05, `CartV2ViewController`). The rule "OUTLET_STAFF cannot edit product prices"
  is about the product's price, which this never changes. (agent, following iOS)
- 2026-10-06 — Conflicts are computed on the client from the batch availability answer the screen already asks
  for (quantity 1 per product), with the cart line's quantity as the requested amount, so changing a
  quantity does not refetch. (agent)
- 2026-10-06 — The old picker (`packages/ui` `DateRangePicker`, used by `CreateOrderForm` / `RentalPeriodSelector`)
  is not reused: it does day math with local `Date` (`getDate`, `setHours`), Sunday-first, and has no shell
  tokens. A small range calendar on day keys is drawn inside `apps/client` with the same click behaviour. (agent)
- 2026-10-06 — Fully-booked days are not marked on the calendar: the screen only fetches availability for the
  chosen window, so marking other days would need a per-day call per cart product. Skipped. (agent)
- 2026-10-06 — A rent line with price 0 blocks create with "Nhập giá cho {name}." like iOS `needsPrice`. (agent)
