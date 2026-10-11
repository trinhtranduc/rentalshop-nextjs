# Spec #844

Suite `tests/e2e/business/branches.e2e.test.js`, danh mục `BF-BRANCH-01..43` trong `tests/e2e/TEST_CASES.md`.

| Nhóm | Ca | Luật |
|---|---|---|
| Chi nhánh | 01–09 | chỉ MERCHANT thêm/tắt/bật/xóa; OUTLET_ADMIN sửa thông tin chi nhánh mình; staff/kho không quản lý; kho chỉ đọc chi nhánh mình |
| Giới hạn gói | 10–15 | 422 `PLAN_LIMIT_EXCEEDED` ở cả 2 route tạo và khi bật lại; thiếu/0 = 1; -1 không giới hạn; add-on chi nhánh chỉ cho gói nhiều chi nhánh (`ADDON_OUTLETS_NEED_MULTI_BRANCH_PLAN`) và cộng vào giới hạn |
| Đơn mở | 16–18 | 409 `OUTLET_HAS_OPEN_ORDERS` + `data.openOrders`; tồn không chặn |
| Đăng nhập | 19 | 403 / 401 `OUTLET_DEACTIVATED`; bật lại thì vào được |
| Tồn 0 | 20–22 | chi nhánh mới, sản phẩm mới, migration backfill (chạy trong transaction rồi rollback) |
| Sản phẩm | 23–33 | staff không tạo/sửa/xóa; admin chi nhánh và kho theo hàng chi nhánh mình có; tồn chỉ ở chi nhánh mình; chi nhánh shop khác 404; thiếu chi nhánh `OUTLET_REQUIRED`; danh sách số của chi nhánh mình; shop 1 chi nhánh xóa được; đơn mở chặn xóa |
| Xóa khi chi nhánh khác còn hàng (#847) | 34–37 | 409 `PRODUCT_HELD_BY_OTHER_OUTLETS` + `data.outlets` cho OUTLET_ADMIN (kho: BF-INV-18), xóa nhiều báo từng sản phẩm |
| Tổng quan | 38–41 | `byOutlet=1` cộng lại = tổng; `outletIds`; 403 / 400; vai trò chi nhánh bị khoá |
| Đơn theo chi nhánh | 42, 42b, 43 | đơn ở B dùng tồn B; 42b known bug #851; staff không tạo đơn ở chi nhánh khác |

API impact: không có (chỉ test).
