# Plan — "Đặt lại" đơn

Issue: #1515 · Status: accepted · Spec: ./spec.md

## Steps

Mỗi nền tảng một PR vào `dev` (web trước vì không cần build app), đều dùng `Fixes #1515` / `Refs #1515`, và làm theo `mobile-parity`: iOS chuẩn.

1. **Web** (`feat/1515-web-reorder`)
   1. Test đỏ `tests/` cho `apps/client/app/orders/create/reorder-model.ts`: `draftFromOrder(order, products)` ca 1–5 (`bug-fix-tdd` không áp dụng, nhưng viết test trước).
   2. `reorder-model.ts`: dựng `Partial<DraftCart>` (orderType, customer, notes, lines qua `addProduct` + `setQuantity`); đếm món bị bỏ.
   3. `OrderEditor.tsx`: đọc `?reorder=` trong effect `prefilled` (cạnh `bookingRequestId`), mở giỏ mới nếu giỏ đang dùng có món (`store.add()`), điền giỏ, mở hộp chọn ngày nếu thuê, báo món bị bỏ.
   4. `apps/client/app/orders/[id]/page.tsx`: dòng "Đặt lại đơn" đầu menu `menu` (kèm đường kẻ), chỉ khi có `orders.create`.
   5. `locales/{en,vi,ja,ko,zh}` (`i18n-keys`).
2. **iOS** (`feat/1515-ios-reorder`)
   1. Test `POS ADBDTests`: `ReorderCartBuilder.cart(from:products:)` ca 1–5; `CartStore.startReorderCart` ca 6–8 (mẫu: `BookingRequestTests`, `CartStoreMultiCartTests`).
   2. `ReorderCartBuilder` (cạnh `BookingCartBuilder`), `CartStore.startReorderCart` (như `startBookingCart`).
   3. `OrderSheetAction.reorder` trong `OrderDetailLogic`, hàng trong `OrderActionSheet` (tiêu đề, mô tả, symbol), `OrderDetailViewController.perform`, `OrderDetailRouter`: tải sản phẩm, dựng giỏ, mở `CartV2ViewController`.
   4. `Localizable.strings` (vi, en và các ngôn ngữ app có).
3. **Android** (`feat/1515-android-reorder`)
   1. Test đơn vị: dựng giỏ ca 1–5, `CartStore.startReorderCart` ca 6–8, `OrderActionSheet.rows` có REORDER.
   2. `CartStore.startReorderCart` (như `startBookingCart`), `OrderActionSheet.Action.REORDER`, `OrderActionsSheet.kt` dòng và icon, tải sản phẩm, mở `Routes.cart()`.
   3. `strings.xml` (cùng ngôn ngữ với iOS).
4. **Bố cục điện thoại D** (iOS và Android, cùng PR của nền tảng): hàng 3 nút dưới khối trạng thái; `sheetActions` / `OrderActionSheet.rows` bỏ Chia sẻ và Ghi chú (chỉ Sửa đơn, Gia hạn, Lịch sử, đỏ); ẩn nút ⋯ khi sheet trống; thêm icon cho nút thanh dưới. Test `OrderDetailLogic.sheetActions` / `OrderActionSheet.rows` và một test cho hàng nút (quyền, số ghi chú).
5. Xác minh: `cd tests && yarn test <reorder>` (TZ=UTC và TZ=Asia/Ho_Chi_Minh), `yarn lint`, `yarn type-check`; iOS `xcodebuild … test`; Android `./gradlew :app:testDebugUnitTest :app:assembleDebug`;
   chạy `mobile-e2e-local` (đặt lại một đơn thuê và một đơn bán trên API local), mở cửa sổ Simulator / AVD / Chrome để chủ shop xem.
6. `.agent/api-changes/LOG.md`: không có dòng mới (không đổi API); ghi rõ trong mục "API compatibility" của mỗi PR: "No API change".

## Risks

- Giá đổi so với đơn cũ: chủ shop đã chọn giá hiện tại; nhân viên thấy giá mới ngay trong giỏ.
- Nhiều lần tải sản phẩm khi bấm (một lần mỗi dòng): chậm với đơn nhiều món; hiện chờ có vòng quay như "Xác nhận đơn online". Giới hạn số dòng của đơn thường dưới 20.
- Đủ 10 giỏ: bị chặn, báo như hiện nay.
- Màn chi tiết cao thêm khoảng 66 pt ở đầu; đã duyệt trong mockup (phương án D).
- Nút ⋯ ẩn khi sheet trống: kiểm tra bằng test.

## Rollback

Revert từng PR. Không có dữ liệu ghi, không migration; app đã cài không bị ảnh hưởng.
