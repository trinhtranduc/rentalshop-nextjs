# Plan — Gợi ý "Chi nhánh khác còn N" trong giỏ điện thoại

Issue: #1353 · Status: done · Skills: implement-issue, mobile-parity, api-compat-review, timezone-dates, verify-change, review-pr, mobile-e2e-local

1. Test đỏ trước (commit riêng `test(mobile): reproduce ...`): iOS `OtherBranchesHintTests` (trong `ProductsV2Tests.swift`), Android `OtherBranchesHintTest` (JVM).
2. iOS: hàm thuần `OtherBranchesHint` + model `Codable` chịu thiếu khoá (`Model/ProductsV2.swift`), `ProductService.loadOtherBranches`, hook trong `CartV2ViewController` (gọi sau `fetchAvailability`, thế hệ để bỏ kết quả cũ, dòng chữ dưới dòng thiếu hàng), chuỗi `en` + `vi-VN` (nối bằng `cat >>`, kiểm `wc -l`).
3. Android: `OtherBranchesHint` (domain), `ProductsV2Api`/`ApiClient` gọi route, hook trong `CartV2Screen.kt`, chuỗi `values` + `values-vi`.
4. Kiểm: UI test `test2cCartOtherBranches` (AnyRentE2ETests, theo vai trò), iOS `xcodebuild test -only-testing`, Android `assembleDebug` + `testDebugUnitTest`, kiểm trực quan trên Simulator iOS (chủ shop, quản lý, nhân viên, shop một chi nhánh, đổi ngày), Android emulator nếu đủ đĩa.
5. Không làm: đổi API, khối "Các chi nhánh khác" ở chi tiết sản phẩm, nhập Excel, chi tiết đơn, ảnh chia sẻ.
