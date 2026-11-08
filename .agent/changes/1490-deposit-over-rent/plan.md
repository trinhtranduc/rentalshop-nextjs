# Plan — Cọc lớn hơn tiền thuê

Issue: #1490 · Status: accepted · Spec: ./spec.md

## Steps

1. **Test lỗi trước** (`bug-fix-tdd`), commit riêng, chạy thấy đỏ:
   - `tests/api/order-balance.test.ts`: thêm các ca spec 1-7 (case 1, case 2, case 2 không thế chân, gia hạn, D = T, D < T).
   - iOS `OrderDetailLogicTests.swift`: cùng bộ ca qua `handOver` và `returnMoney`.
   - Android `OrderDetailLogicTest.kt`: cùng bộ ca; thêm ca "balance matches computeOrderBalance" cho D > T.
2. **API**: sửa `apps/api/lib/order-balance.ts` dòng 39 và 43-45 theo spec 1 và 2. `order-balance-batch.ts` gọi lại hàm này nên không đổi. Không đổi route.
3. **iOS**: `apps/mobile/POS ADBD/ViewModels/OrderDetailLogic.swift` — `handOver` (due), `returnMoney` thêm `deposit` và `total`; sửa 3 chỗ gọi:
   `OrderDetailViewController.swift:742`, `OrderHandOverSheetViewController.swift:197`, `OrderDetailLogic.swift:258` (`balance`).
4. **Android**: `domain/orders/OrderDetailLogic.kt` — `handOver`, `returnMoney`, `balance`; sửa chỗ gọi `OrderDetailV2Screen.kt:831`, `OrderDetailV2Sheets.kt:162`.
5. **Skills áp dụng:** `bug-fix-tdd`, `mobile-parity`, `api-compat-review`. Không dùng `db-migration`, `i18n-keys`.
6. **Xác minh:**
   - `yarn --cwd tests test order-balance`
   - `xcodebuild … test -only-testing:"POS ADBDTests/OrderDetailLogicTests"` (scheme Development, Simulator)
   - `cd apps/mobile-android && ./gradlew :app:testDebugUnitTest --tests '*OrderDetailLogicTest*'`
   - `yarn lint`, `yarn type-check`
   - Chạy thử trên máy: tạo đơn thuê 100.000, cọc 300.000, thế chân 500.000; kiểm tra giao thu 500.000 và trả hoàn 700.000.

## Files

- `apps/api/lib/order-balance.ts` — công thức giao và trả
- `tests/api/order-balance.test.ts` — ca mới
- `apps/mobile/POS ADBD/ViewModels/OrderDetailLogic.swift` và hai nơi gọi trong `Viewcontrollers/OrderDetail/`
- `apps/mobile/POS ADBDTests/OrderDetailLogicTests.swift`
- `apps/mobile-android/.../domain/orders/OrderDetailLogic.kt`, `ui/orders/v2/OrderDetailV2Screen.kt`, `OrderDetailV2Sheets.kt`
- `apps/mobile-android/.../test/.../OrderDetailLogicTest.kt`
- `apps/client/app/orders/orders-model.ts`, `apps/client/app/orders/detail/actions-model.ts`, `locales/{en,vi}/orders.json` — công thức web và dòng cọc dư
- `tests/web-orders-model.test.ts`, `tests/web-orders-actions.test.ts`, `tests/e2e/business/deposit-over-rent.e2e.test.js`, UI test `test5nDepositOverRentReturn`
- `.agent/api-changes/LOG.md` — dòng `planned` rồi `dev`

## Risks

- App cũ trên `main-real` vẫn tự tính và hiện sai ở chi tiết đơn, trong khi danh sách/lịch hiện số API mới. Lệch giữa hai màn cho tới khi cập nhật app. Ghi trong bảng `## API compatibility`.
- Số QR lúc giao đổi cho đơn có cọc dư và thế chân (đúng hơn). Báo chủ tiệm.
- Đơn gia hạn có cọc dư: API và app khác nhau (spec 7). Không tệ hơn hiện tại.
- Khách đã trả tiền dưới công thức cũ: đơn đang `RESERVED` hoặc `PICKUPED` sẽ hiện số mới ngay khi API lên. Chỉ ảnh hưởng số hiển thị, không ghi lại payment cũ.

## Rollback

Revert PR API là trở lại công thức cũ (không có migration, không có dữ liệu mới). Revert PR mobile cần build mới nên làm API trước; hai app không phụ thuộc nhau vì mỗi app tự tính.
