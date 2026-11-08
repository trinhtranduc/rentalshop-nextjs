# Plan — Ước tính gói tạo tay và gia hạn sau hotfix

Issue: #1511 · Status: accepted · Spec: ./spec.md

## Steps

1. `apps/api/lib/admin-revenue-estimate.ts`: thêm `CREATED_ACTIVITY_TYPE`, kind `NEW_SUBSCRIPTION`; bỏ nhật ký gia hạn từ `PENDING_COUNTS_BEFORE`.
2. `tests/api/admin-revenue-estimate.test.ts` (ca J, K, K2, L, L3) và `tests/api/admin-revenue-route.test.ts` (danh sách loại nhật ký đọc).
3. `locales/vi|en/dashboard.json`: câu `estimateDetail` nhắc thêm "tạo gói tay".
4. `.agent/api-changes/LOG.md`: một dòng `dev`.
5. Xác minh: `admin-revenue*` trong TZ=UTC và TZ=Asia/Ho_Chi_Minh, `locales-valid-json`.

## Risks

- Gói tạo tay là gói tặng vẫn bị ước tính (nhật ký không phân biệt): nằm ở dòng "Ước tính", không vào "Tiền đã nhận".
- Mốc hotfix: gia hạn sau mốc mà `Payment` bị lỗi ghi sẽ không hiện ở đâu cả; đúng với quy tắc "Payment là nguồn số đúng".

## Rollback

Revert PR: ước tính về như #1505; không có dữ liệu nào bị ghi.
