# Plan

Đã làm (PR #1257, commit `2e664d4ad`):
1. iOS: sửa `InstallmentCardView.make` / `stageRow` trong `DepositPlanViews.swift`.
2. Android: sửa `InstallmentCard` / `StageRow` trong `DepositPlanViews.kt`.
3. Thêm UI test iOS `test5gDepositCardWidth` (chạy khi có `E2E_ORDER_NUMBER`).
4. Chụp ảnh Simulator và AVD (API local) vào `.agent/changes/1246-order-deposit-card-width/shots/`; cập nhật `spec.md` ở thư mục 1246.
5. Kiểm chứng theo PR: iOS unit test 731 test, 0 lỗi (lần đầu có lỗi định dạng tiền trên Simulator mới, chạy lại đạt); Android `:app:testDebugUnitTest` 0 lỗi; locale tests không đổi.

API compatibility: không đổi API, trường, quy tắc, migration hay env; app cũ trên main-real không bị ảnh hưởng.
Rủi ro đã nêu: #1245 có thể sửa helper dùng chung trong `DepositPlanViews.swift`; PR chỉ đổi phần chỉ dùng ở chi tiết đơn.
