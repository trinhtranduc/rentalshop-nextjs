# Spec — Android new-UI screens match iOS

Issue: #448 · Status: accepted · Intent: ./intent.md

## Behavior

1. A new or cleared cart has no rental dates chosen. The new cart (`CartV2Screen`) shows
   "Chọn ngày thuê" in the dates row, with no day-count pill, until the user picks dates.
2. Picking dates, loading an order to edit, or restoring a saved draft marks them chosen.
3. Tapping "Tạo đơn" in the new cart with missing data shows one "Lỗi" alert listing every problem,
   in iOS order: empty cart, no customer, no pickup date, no return date (rent only).
4. The review reached from the new cart is titled "Tạo đơn" ("Chỉnh sửa đơn" when editing) with
   section titles "Thông tin", "Thông tin ngày tháng", "Danh sách Sản phẩm",
   "Tiền cọc & Giấy tờ thế chân" (rent only), "Ghi chú", "Tổng kết", as written (not upper-cased).
   The deposit row reads "Tiền cọc", not "Đã thu". The bottom button reads "Tạo đơn"
   ("Cập nhật đơn" when editing).
5. Tapping that button opens a sheet: rent → "Thu tiền cọc" + deposit amount; sale → "Thu tiền" +
   order total. "Hủy" closes it; "Xác nhận" creates (or updates) the order with the same request as
   before this change.
6. The old cart and old review (`Routes.Cart`, `Routes.CartPreview`) are unchanged.
7. New login and forgot password: when the keyboard opens, the fields and the main button scroll
   into view above it, and the footer hides while the keyboard is up. Create store and the
   new-customer sheet keep their pinned button above the keyboard (checked on the emulator).
8. New-UI hand-over (`newOrderDetail`): no "Phương thức thanh toán" picker; "Đã giao" sends only
   `PUT /api/orders/{id}` with `status: PICKUPED` and the optional papers / security deposit, no
   `/api/payments/process` call. New-UI return (Nhận trả): no picker; changed fees are saved, then
   `status: RETURNED`, no payment call. The money box ("Thu bây giờ" / refund) still shows the
   amount. Old flag-off screens keep their payment sheet.
9. The hand-over papers and security-deposit fields carry test tags `handOver.papers` and
   `handOver.securityDeposit`, exposed as resource ids (`testTagsAsResourceId`).

## Out of scope

- Old flag-off order screens (`OrderDetailActions`, `OrdersScreens`) still record payments.
- The transfer QR button that lived inside the removed picker on the new sheets.
- iOS review rows "Tạo bởi" and "Sẵn sàng giao".
- Per-day line totals shown before dates are picked still use the stored default days; dates are
  required before the review, so the created order uses the picked days.

## API and data

No change. Create/update order bodies are the same as Android sent before.

## Acceptance

- [x] Behaviors 1–5: unit tests `CartDatesChosenTest`, `OrderReviewV2Test`, `Issue448ResourcesTest`
- [x] Behavior 8: `HandOverReturnNoPaymentTest` (requests sent; the v2 screen/sheets reference no
  payment code); order 140820 on the local API after the Maestro run: PICKUPED, papers saved, `payments: []`
- [x] 7 and 9: emulator-5570 screenshots and the Maestro flow (`rent-handover.yaml` and a variant
  without the Android-only branches)
- [x] iOS unchanged; strings in `values` and `values-vi`

## Found while verifying

- Before the picker was removed, the hand-over sheet could leave "Đã giao" under the keyboard.
  Without the picker the buttons stay above the keyboard (Maestro run without any keyboard hide
  in login, new customer and hand-over passed).
