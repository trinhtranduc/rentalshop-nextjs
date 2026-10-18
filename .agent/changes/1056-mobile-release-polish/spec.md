# Spec — #1056 mobile release polish

## 1. Product order lists: farthest date on top

| Place | Before | After |
|---|---|---|
| Product detail chip "Sắp tới" (iOS `ProductOrdersChip`, Android `ProductOrdersChip`) | `pickupPlanAt asc` | `pickupPlanAt desc` |
| Chip "Đang thuê" | `returnPlanAt asc` | `returnPlanAt desc` |
| Chip "Đã xong" | `createdAt desc` | unchanged |
| "Tất cả N" (orders by product, #1025) | `pickupPlanAt desc` | unchanged |

Direction labels (`orders.v2.direction.nearest` = `desc`, `.farthest` = `asc`; Android `orders_v2_direction_*`):

| Key | vi before | vi after | en |
|---|---|---|---|
| nearest (`desc`) | Gần nhất trước | Mới nhất trước | Latest first (unchanged) |
| farthest (`asc`) | Xa nhất trước | Cũ nhất trước | Earliest first (unchanged) |

`newest` / `oldest` (created date) keep "Mới nhất trước" / "Cũ nhất trước" and "Newest first" / "Oldest first".
The new words also show in the main order list's sort sheet and "Xếp theo …" bar; the order sent is unchanged.

## 2. Cart price link does not flash (iOS)

Root cause (measured on the simulator, 60 fps frames of the cart opening):
- `CartV2ViewController.render()` rebuilds every row. On open it ran 3 times in 250 ms: `viewWillAppear`,
  the `OverlapSetting.refresh` callback, then `cartStoreDidChange` from `CartStore.updateAvailabilityStatus`
  (which posted even when nothing changed), plus the unconditional `render()` at the end of `fetchAvailability`.
- `pricingChip` built a `UIButton(type: .system)` with an attributed title. A new `.system` button fades its
  title in, so each rebuild blanked the price for ~180 ms and faded it back over ~230 ms (the ⌄ image stayed).

Fix:
- The link is a `.custom` button (`CartV2ViewController.pricingLinkButton`), same attributed title, ⌄ image,
  insets, and tap target; a pressed state dims the title (what `.system` did).
- `Cart.updateAvailabilityStatus(for:status:)` returns whether a line changed; `CartStore` posts only then
  (`AvailabilityStatus` is `Equatable`). `fetchAvailability` renders only when the conflicts changed and no
  store post already did. The overlap refresh renders only when the setting changed.

Android: the cart is Compose, lines are keyed by `lineId`, and `PricingChip` has no animation; no flicker,
no change.

## 3. Cart TIỀN rows: blue = tappable (mockup `cartmoney.html`)

| Row | Value | Icon | Tap |
|---|---|---|---|
| Tiền thuê / Tiền hàng | black | none | none |
| Giảm giá | blue bold, "0đ" or "−50.000đ" | blue pencil, no › | discount sheet |
| Tổng cộng | black bold | none | none |
| Đặt cọc (rent) | blue bold | blue pencil, no › | deposit sheet |
| Ghi chú | blue bold "Thêm", or the note on one line in #334155 cut with "…" | grey camera + count (new order with photos), blue pencil | "Ghi chú đơn" sheet |

- iOS: `V2ValueRow(title:editable:)`; Android: `CartMoneyEditRow`. Shared rules: `CartMoneyRow`, `CartMoneyTone`,
  `CartV2Logic.moneyRowTone`, `discountShown`, `moneyRowSpoken`.
- Accessibility: the whole row is a button; it reads the title, the value (+ "N ảnh"), and "Sửa" / "Edit".
- Strings reused: `products.cart.note` / `products.cart.addNote` / `products.detail.edit` (iOS),
  `v2_cart_note` / `v2_cart_add_note` / `edit` (Android). No new keys.
- Row order, sheets, the bottom bar, and edit-order mode are unchanged. The shortage-warning block is untouched.

## 4. Notes wrap; one note sheet (owner: "note cần xuống dòng và style present note view nên giống nhau")

- Item note under a cart line (iOS `CartNoteEntry`, Android `NoteEntry`) and the order note row in TIỀN show the
  whole note on as many lines as it needs (`CartV2Logic.noteShown`: each line trimmed, blank lines dropped). No "…".
- Order note row: "Ghi chú" on the left, the note on the right wrapping under itself; the title and the blue pencil
  stay on its first line. Empty stays blue "Thêm" + pencil.
- The order note and the item note open the same sheet class on each platform (iOS `CartItemNoteSheet`, now built by
  `CartItemNoteSheet.orderNote`; Android `CartItemNoteSheet`): same detent, header, text box, hint, buttons, corners.
  Only the title, placeholder, hint and the product name (item) differ; the order note on a new order adds the photo
  row. Editing an order keeps it text only.
- Android: "Xoá ghi chú" and "Lưu" are two equal buttons as on iOS ("Delete note" was cut on two lines at 1 : 1.6).

## API compatibility

No API, shared package, Prisma, or env change. `GET /api/orders` already accepts `sortOrder=desc`. Installed apps keep
sending what they send today. No row in `.agent/api-changes/LOG.md`.

## Tests

- iOS `POS ADBDTests`: `Phase7GapsTests` (chip sort), `OrdersHomeTests` (vi/en direction copy),
  `ProductsV2Tests` (`.custom` link, no post on unchanged availability, money rows, editable row view).
- Android: `ProductDetailLogicTest`, `Issue888ResourcesTest`, `CartMoneyRowsTest`.
- UI: `AnyRentE2ETests.test8iReleasePolish` (screenshots polish-*.png; record the simulator around it).
