# Plan — Một ô Phụ thu ở Nhận trả

Issue: #1494 · Status: accepted · Spec: ./spec.md

## Steps

1. Test trước: web `returnFeesUpdate` (đỏ rồi xanh), iOS `surchargeShown` / `surchargeUpdate`, Android `takeReturn` so tổng.
2. iOS: `OrderHandOverSheetViewController` một ô, `OrderDetailLogic` hai hàm, `OrderDetailViewController.confirm`, nhãn dòng `damageFee`, chuỗi.
3. Android: `OrderDetailV2Sheets` một ô, `OrderDetailV2ViewModel.takeReturn` so tổng, `OrderDetailV2Screen` nhãn, chuỗi.
4. Web: `dialogs.tsx` một ô, `actions-model.ts` `returnFeesUpdate` so tổng, `locales/{en,vi}/orders.json`.
5. Rút gọn tiêu đề nút ở cả ba nơi, cập nhật chọn nút trong UI test.
6. Xác minh: `yarn --cwd tests test web-orders locales-valid-json`, iOS `xcodebuild test`, Android `./gradlew :app:testDebugUnitTest`, UI test `test5nDepositOverRentReturn`.

## Files

- iOS: `OrderHandOverSheetViewController.swift`, `OrderDetailViewController.swift`, `OrderDetailLogic.swift`, `{en,vi-VN}.lproj/Localizable.strings`, `OrderDetailLogicTests.swift`, `AnyRentE2ETests.swift`
- Android: `OrderDetailV2Sheets.kt`, `OrderDetailV2ViewModel.kt`, `OrderDetailV2Screen.kt`, `values{,-vi}/strings.xml`, `HandOverReturnNoPaymentTest.kt`
- Web: `apps/client/app/orders/detail/{dialogs.tsx,actions-model.ts}`, `locales/{en,vi}/orders.json`, `tests/web-orders-actions.test.ts`

## Risks

- App cũ đọc hai trường riêng: một đơn do app mới lưu hiện toàn bộ ở "Phụ phí" (không còn tách phí trễ). Tổng giống nhau.
- Chồng lên #1490: PR này nhắm nhánh của #1490 tới khi #1492 được gộp.

## Rollback

Revert PR (không có migration, không có dữ liệu mới).
