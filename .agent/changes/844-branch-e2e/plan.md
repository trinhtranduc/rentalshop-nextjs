# Plan #844
1. Suite `branches.e2e.test.js` dùng `helpers/subscription.js` (world riêng, SQL kiểm dữ liệu).
2. Mục BF-BRANCH trong `tests/e2e/TEST_CASES.md`.
3. Chạy `scripts/e2e/business-e2e.sh --build --tz "UTC Asia/Ho_Chi_Minh" -- branches` trên DB riêng `anyrent_branch_e2e`, cổng 3192.
4. Chạy lại cùng các suite liên quan (inventory-role, roles-flows, staff-permissions, subscription-plan, products-pricing, scope-roles).
5. Lỗi thật trong code đã merge: giữ ca bằng `knownBug`, mở issue. PR vào dev.
