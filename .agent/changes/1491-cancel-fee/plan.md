# Plan — Hủy đơn chưa giao với phụ thu

Issue: #1491 · Status: accepted · Spec: ./spec.md

## Steps

1. **Test lỗi trước** (commit riêng, chạy thấy đỏ):
   - `tests/` revenue calculator: ca A, B, D của spec 5-9 (doanh thu hủy giữ phụ thu).
   - `tests/api/` cho `planCancellation`/route: spec 1-4, 8, 11, 12 (K ≤ C, K > C 400, nhân viên 403, không gửi K).
   - iOS `POS ADBDTests/` và Android `app/src/test/`: logic sheet (mặc định 0, chặn quá cọc, hoàn = C − K).
   - Web `tests/`: `cancelView` và `cancelledOutcome` cho đơn thường (spec 15, 16, 18), cùng bộ số với app.
2. **API:** `apps/api/lib/installments.ts` — `planCancellation` và `recordPlanCancellation` cho đơn thường (số đã thu = `depositAmount`, chỉ ghi `cancelKeptAmount` và `cancelledAt`). `apps/api/app/api/orders/[orderId]/route.ts` (khoảng dòng 802-815) và `.../status/route.ts` giữ nguyên hợp đồng, chỉ gọi nhánh mới.
3. **Doanh thu:** `packages/utils/src/core/revenue-calculator.ts` nhánh hủy (dòng 324-352): trừ `cancelKeptAmount`; truyền cột này vào `OrderRevenueData` cho đơn thường (`packages/utils/src/core/revenue-mapping.ts`, `packages/database/src/order.ts`).
4. **iOS:** `OrderDetailViewController.swift` `presentCancelSheet` (dòng 1265): hiện sheet `DepositPlanViews.swift` (dòng 343) cả cho đơn RENT `RESERVED` không có kế hoạch cọc, với số đã thu = `depositAmount`; `OrderViewModel.cancelOrder(keptAmount:note:)` đã có.
5. **Android:** `OrderDetailV2Screen.kt` mở sheet của `DepositPlanViews.kt` (dòng 315) cho cùng điều kiện; `OrderDetailV2ViewModel.cancel(keptAmount, note)` đã có.
5b. **Web:** `apps/client/app/installments/installments-model.ts` — `cancelView` (bật cho đơn RENT `RESERVED` không có kế hoạch cọc, C = `depositAmount` > 0) và `cancelledOutcome` (bỏ điều kiện `hasPlan` cho đơn thường; hoàn = C − K). `apps/client/app/orders/[id]/page.tsx` (dòng 189, 509, 570): hộp thoại giữ tiền thay cho hộp xác nhận thường. `packages/utils/src/api/installments.ts` `cancelOrderWithKept` đã có. Kiểm app web gửi capability `installments` (nếu không, API không trả `cancelKeptAmount`). Chữ: dùng lại khóa `detail.dialog.cancel.keep` và `installments.cancelKept`; khóa mới (nếu có) vào 5 locale.
6. **Domain skills:** `api-route-standard`, `timezone-dates`, `mobile-parity`, `api-compat-review`, `i18n-keys` (chỉ nếu thêm chuỗi).
7. **Xác minh:** `yarn --cwd tests test revenue` và `... test installments`; iOS `xcodebuild … test` cho test mới; Android `./gradlew :app:testDebugUnitTest`; `yarn lint`, `yarn type-check`; chạy thử trên máy: đơn 300.000, cọc 300.000, hủy với phụ thu 100.000, kiểm tra hoàn 200.000 và doanh thu ngày.

## Files

- `apps/api/lib/installments.ts` — kiểm K và ghi số giữ cho đơn thường
- `apps/api/app/api/orders/[orderId]/route.ts`, `.../status/route.ts` — gọi nhánh mới (nếu cần)
- `packages/utils/src/core/revenue-calculator.ts`, `revenue-mapping.ts`, `packages/database/src/order.ts` — doanh thu đơn hủy
- `apps/mobile/POS ADBD/Viewcontrollers/OrderDetail/OrderDetailViewController.swift`, `DepositPlanViews.swift`
- `apps/mobile-android/.../ui/orders/v2/OrderDetailV2Screen.kt`, `DepositPlanViews.kt`
- `apps/client/app/installments/installments-model.ts`, `apps/client/app/orders/[id]/page.tsx` — hộp thoại phụ thu và kết quả đơn hủy trên web
- `tests/`, `apps/mobile/POS ADBDTests/`, `apps/mobile-android/app/src/test/` — ca mới
- `.agent/api-changes/LOG.md` — dòng `planned` rồi `dev`

## Risks

- Cột `cancelKeptAmount` / `cancelledAt` chỉ ở `dev`: nếu #1199 chưa lên `main-real`, PR này không được lên trước.
- `recomputeDepositFromPayments` không được gọi cho đơn thường (xóa `depositAmount`); có test riêng.
- App cũ không có sheet: vẫn hoàn hết; không lệch số vì không có phụ thu.
- Báo cáo doanh thu ngày: chỉ đổi cho đơn hủy có phụ thu, kiểm ngày hủy theo giờ Việt Nam.
- Quyền nhân viên: chưa chốt (open question trong intent).

## Rollback

Revert PR API: đơn thường quay về "hoàn hết"; đơn đã lưu `cancelKeptAmount` vẫn giữ giá trị (doanh thu đơn đó quay về 0 cho tới khi nhánh doanh thu được đưa lại). Revert PR mobile cần build mới nên làm API trước.
