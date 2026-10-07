# Spec — Mobile UI bundle (#482)

Issue: #482 · Status: accepted · Intent: ./intent.md

## Behavior

### 1. Orders by product / by customer (boards DT-don-theo-sp, DT-don-theo-kh)

1.1 Flat header: product = 56pt thumbnail (radius 12), name 17 bold, sub line "code · Còn N hôm nay" (the free part
    only when N > 0); customer = 52pt initials avatar, name, phone, 40pt call button. Tapping the name row opens
    product detail / customer detail.
1.2 Period chip (blue, calendar icon) with the period the screen was opened with ("All time" from product/customer pages).
1.3 Three tiles. Product: Số đơn (list `total`), Lượt thuê (non-cancelled RENT orders among the loaded orders),
    Doanh thu (this product's line totals in non-cancelled loaded orders; the order total when a row has no items).
    Customer: Số đơn (`summary.totalOrders`), Đã chi (`summary.totalAmount`, cancelled excluded by the API),
    Đang thuê (existing `GET /api/orders?customerId&status=PICKUPED` total, purple).
    Values computed from loaded pages read "N+" while more pages exist. Money reads "—" when hidden for staff.
1.4 Band "ĐƠN HÀNG", then the Orders tab "Tất cả" row (iOS `OrderRowCell` context `.list`, Android `OrderBoardRow`).
1.5 Snapshot / rented-out / late lists keep their current layout.

### 2. Notifications wrap (TB-thong-bao)

2.1 Title and body: no line limit, no ellipsis; a long unbroken word wraps.

### 3. Created time

3.1 Order detail step "Đã đặt": "Đã đặt 14:32 28/09"; "14:32 28/12/25" when the created year is not the current year;
    shop zone Asia/Ho_Chi_Minh (`OrderDetailLogic.createdStamp` in both apps).
3.2 Orders "Tất cả" row: "tạo hôm nay" / "tạo 28/09" / "tạo 28/12/25" (year when not the current year); every dd/MM in
    the same line (cancelled day, due day, rental span) follows the same year rule.

### 4. Cart pricing sheet (Gio-hang, Gio-hang-chon-gia)

4.1 Each cart line shows one chip "<mode> · <price>" ("Theo ngày · 150.000đ/ngày"; "· Nhập giá" in blue when 0).
4.2 Tapping the chip opens a bottom sheet "Cách tính giá": subtitle "<name> · N ngày"; radio rows for Theo lần,
    Theo ngày and every other active option type of the product (BLOCK "Theo block", HOURLY "Theo giờ"), each with its
    catalog price or "Nhập giá"; a "Giá cho đơn này" field prefilled with the line price (suffix đ or đ/ngày),
    note "Chỉ áp dụng cho đơn này, không đổi giá sản phẩm.", live preview "130.000đ × 3 ngày × 1 = 390.000đ", "Áp dụng".
    Choosing a row puts that mode's price (the line's current price when it is the line's mode, else the catalog
    price, else 0) in the field.
4.3 Apply sets the line's pricing type and unit price only (catalog untouched, every role). Sale lines get the same
    sheet with the price field only. Payload (`pricingType`, `unitPrice`, `totalPrice`) unchanged.
4.4 The segmented toggle and the tap-to-edit price row are removed. Price-0 validation before Tạo đơn stays.

### 5. Change password sheet (DMK-doi-mat-khau)

5.1 A bottom sheet over Cài đặt: title + close, three secure fields with lock icon and show/hide eye, hint
    "Ít nhất 6 ký tự." under the new password, inline red error under the field at fault, primary "Đổi mật khẩu".
    Same API and validation.

### 6. Status names (CT-gon, CT-qua-han, CT-ban)

6.1 Order detail header: the list row status tag (14pt bold, padding 3/8, radius 7, list colours) left of the customer
    name, status text only: Đã đặt / Đang thuê / Đã trả / Hoàn thành / Đã huỷ (iOS `OrdersHomeLogic.statusTag`,
    Android `orders_v2_status_*`). Test: the detail tag text equals the list tag text for each status.
6.2 Task tags on order rows: "Cần giao" / "Cần trả" (en "To hand over" / "To take back"); they fit a small iPhone row.
6.3 Cancelled spelled "Đã huỷ" in vi for the old filter / legacy status string on both apps.

## Out of scope

API, web, legacy order screens other than the status string, calendar legend, product-detail "Giao hôm nay".

## API and data

None. Existing endpoints only: `GET /api/orders`, `GET /api/customers/{id}/orders`, `GET /api/products/{id}`,
`POST /api/auth/change-password`, `POST /api/orders` (same payload).

## Acceptance

- iOS `POS ADBDTests` and Android `:app:testDebugUnitTest` cover 1.3, 3.1, 3.2, 4.2 (choices, preview, apply), 6.1.
- iOS Development build, Android `:app:assembleDebug`.
- Strings: iOS en + vi-VN, Android values + values-vi (the only locales the apps ship).
