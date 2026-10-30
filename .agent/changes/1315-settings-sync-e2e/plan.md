# Plan (#1315)

Status: in-progress.

1. Thêm tài khoản `outletAdmin`, `outletAdminOther`, `staffOther` vào `tests/e2e/helpers/api.js` và chọn chúng từ DB trong `scripts/e2e/business-e2e.sh`.
2. Viết `settings-sync.e2e.test.js`; chạy trên API cục bộ (DB riêng), TZ=UTC và TZ=Asia/Ho_Chi_Minh.
3. Viết kịch bản mobile (Android script + helper API cho phía chủ shop + spec iOS), không chạy.
4. Cập nhật `tests/e2e/TEST_CASES.md`. Mở PR vào `dev` (`Fixes #1315`, `Refs #1309`).

Skills: verify-change, mobile-parity (đọc). Không đổi API.
