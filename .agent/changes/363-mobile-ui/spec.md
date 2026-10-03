# Spec — Mobile UI refresh (iOS + Android)

Issue: #363 · Status: draft · Intent: ./intent.md · Design: canvas boards named in brackets

## Behavior

### 0. App version
1. On launch and on foreground, the app reads `GET /api/mobile/app-config`; below `minVersion` it shows a
   blocking "Cập nhật ứng dụng" screen with the store link; if the call fails, the app continues.
2. Android sends `X-App-Version` and `X-Client-Platform` on every request (iOS already does).
2b. Day-based calls send `timeZone` = device zone (`TimeZone.current.identifier` / `ZoneId.systemDefault().id`); the app shows dates in the device zone.

### 1. Orders tab [Main, VL-tat-ca, VL-tim, Loc, VL-ban]
3. Default view "Việc cần làm" from `GET /api/analytics/outlet-operations`: groups TRỄ HẠN (red: late returns and late hand-overs), HÔM NAY, NGÀY MAI;
   row tag Giao/Trả; badge = `counts.total`.
4. Row: customer, items summary, `#code · dates`, total, `amountDue` line ("còn thu", "trả cọc"),
   "Chưa soạn đồ" when `isReadyToDeliver` is false, red note "Trễ N ngày" when `lateDays > 0`; call button on late rows.
5. "Tất cả đơn": all rentals, real status tag only (Đã đặt / Đang thuê / Đã trả / Đã huỷ), filter & sort sheet.
6. "Đơn bán" switch: SALE orders grouped by sale day with day count and sum; tag Hoàn thành / Đã hủy; no tabs.
7. Search (from either list) finds rentals and sales by name, phone, order code and product name; sale rows tagged "Bán · …".
8. A response for an old query never replaces a newer one (stale-response guard); switching view resets paging and filters.
9. No raw status code is ever shown; unknown status falls back to a neutral label.

### 2. Order detail [CT-gon, CT-qua-han, Nhan-tra, Giao-do, CT-ban]
10. Rental detail: status pill, progress Đã đặt → Giao → Trả with dates, items with image, money block,
    one primary action: "Giao đồ · thu X" (RESERVED) or "Nhận trả" (PICKUPED); "Hủy đơn" in the ⋯ menu for RESERVED and PICKUPED (confirm).
11. Hand-over and return sheets show the money rules: pickup collects total − deposit + collateral;
    return settles late + damage − collateral (negative = refund).
12. Sale detail: tag Hoàn thành / Đã hủy, sale day, items with sale price, "Đã thu"; actions Hủy đơn (confirm) and In hóa đơn.
12b. Edit rental [CT-sua]: same editable fields and rules as the current apps (no new locks); layout as the cart:
    customer, dates, items (Theo lần/ngày, qty), discount, note. Bottom shows the new total and the difference.
12c. Notes [CT-sua, CT-gon]: text plus up to 5 photos (`MAX_ORDER_NOTE_IMAGES`), add / remove, sent as `notesImages`
    per `docs/API_ORDER_NOTES_IMAGES.md`; detail shows the note with thumbnails, tap opens full screen.
12d. Android sends the kept note image URLs on edit so removing a photo works (today `existingNoteImageUrls` is unused).
13. Status changes rejected by the API (`INVALID_ORDER_STATUS`) show the translated message and refresh the order
    (Android today drops the result of the status call, `OrdersScreens.kt:1029`).

### 3. Products & cart [SP-dong, SP-chi-tiet, Gio-hang, Gio-hang-ban]
14. Product list with image; detail shows prices per rental / per day and sale price, and its orders (`GET /api/orders?productId=`).
14b. Add / edit product [SP-tao, SP-sua]: photos (cover first), name*, category, barcode with scan, price per rental,
    price per day, default pricing, sale price, deposit per item, quantity (edit shows rented/free); edit has "Xóa sản phẩm".
    `OUTLET_STAFF` can add a product without price fields and cannot open edit (no `products.update`).
    Barcode scan looks up `GET /api/products?q=<code>` and keeps only the exact barcode match.
15. Cart Thuê: date range (days), per item Theo lần / Theo ngày, stepper, availability warning, deposit; bottom "Thu ngay · cọc".
16. Cart Bán: no dates, no deposit, sale price, stock left; bottom "Khách trả X" + "Bán & thu tiền".
17. `OUTLET_STAFF` cannot edit prices in the cart.

### 4. Calendar, Overview, Settings [Lich, Tong-quan, Tong-quan-chon, Cai-dat]
18. Calendar month marks pickups (dot), returns (ring) and late returns (red square) from `byDate` / `lateReturns`; day list below.
19. Overview: period button "7 ngày qua ⌄" opens a sheet (Hôm nay, Hôm qua, 7 ngày qua, 30 ngày qua, Tháng này, Tháng trước, Chọn khoảng ngày…);
    net revenue, per-day bars, change vs previous period, order figures, top rented products; cancelled excluded.
20. Settings: profile row; CỬA HÀNG (store info, receipt note, printer), QUẢN LÝ (customers, users, export),
    TÀI KHOẢN (plan + days left, language, password); Đăng xuất. No outlet item.

### Cross-cutting
21. Dates show as `T7 03/10` in the device time zone (day keys from the API computed with the sent `timeZone`); no times on lists.
22. Every new string in vi and en (and ja, ko, zh where the app ships them).
23. Touch targets ≥ 44pt/dp; text contrast ≥ 4.5:1.

## Out of scope

- Multi-outlet UI, late-fee rules, stock-shortage note on list rows, web client changes.

## Acceptance

- [ ] Each phase demoed on both platforms against dev-api, screenshot next to its canvas board
- [ ] Old API (production before API PR 2) still works for phases that do not need new fields
- [ ] iOS `xcodebuild … build` and Android `./gradlew :app:assembleDebug` succeed
- [ ] Cancelled excluded in overview, Vietnam days in lists and calendar, staff price limit holds
