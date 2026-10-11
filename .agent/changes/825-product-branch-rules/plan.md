# Plan #825

1. Test đỏ: `tests/api/product-branch-rules.test.ts`, sửa 2 test cũ theo luật mới.
2. `apps/api/lib/product-branch-rules.ts` (hàm thuần) + nối vào PUT (kiểm tra trước S3), DELETE, batch-delete, POST, bulk-import.
3. Mã lỗi mới trong `locales/{en,vi}/errors.json`; chuỗi web trong `locales/*/products.json`.
4. Web: form khóa trường dùng chung, payload chỉ tồn; ẩn nút xóa; OUTLET_STAFF không thêm sản phẩm (quyền + API + web).
5. LOG.md, type-check API + client, test.
