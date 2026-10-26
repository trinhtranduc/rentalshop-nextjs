# Spec

1. `InstallmentCardView.paidDay(collectedAt)`: chuỗi ISO UTC -> ngày `dd/MM` theo `Asia/Ho_Chi_Minh`. 17:12Z 25/10 -> "26/10"; 23:53Z 25/10 -> "26/10"; 16:59Z 25/10 -> "25/10". `dueDateKey` giữ nguyên (key YYYY-MM-DD). Chuỗi không đọc được: rơi về 10 ký tự đầu.
2. `DepositPlanLogic.listBadgePercent` (iOS, Android): nếu `hasDepositPlan == true` và có `installmentPercentCollected` thì dùng; ngược lại, khi cửa hàng ở chế độ STAGED, đơn RENT + RESERVED, total > 0, paid > 0: `min(100, round(paid/total*100))`; còn lại nil.
3. Mã lỗi `CANCEL_AMOUNTS_MISMATCH`, `CANCELLED_ORDER_KEEPS_AMOUNT` trong `errors-mobile.json` (en, vi), iOS map + Localizable (en, vi-VN), Android `ApiErrorMessages.kt` + strings (en, vi).
