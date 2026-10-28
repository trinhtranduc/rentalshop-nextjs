# Plan (#1279)
1. Test đỏ iOS: `OrderDetailLogicTests` (canEditCollateral, collateralSummary, returnMoney sau khi đổi thế chân).
2. Test đỏ Android: `OrderDetailLogicTest` tương tự.
3. iOS: logic, thẻ ở chi tiết đơn, sheet sửa, gọi `OrderService.updateOrder`, chuỗi en+vi.
4. Android: logic, thẻ ở `OrderDetailV2Screen`, sheet sửa, ViewModel gọi PUT, chuỗi en+vi.
5. Web: kiểm, không đổi.
6. Chạy test, chụp ảnh, mở PR vào dev.
