# Danh sách sản phẩm: lọc danh mục bằng ô chọn, chọn được nhiều (web)

Issue: #1536 · Author: Claude (chủ shop yêu cầu 13/11, kèm ảnh) · Status: in-review · Created: 2026-11-13

## Problem

`/products` lọc danh mục bằng một hàng chip cuộn ngang. Shop nhiều danh mục thì chip bị cắt ("Audio Equipmen…"), phải cuộn, chen vào ô "Chi nhánh"/"Sắp xếp", và chỉ chọn được một danh mục. `GET /api/products` chỉ nhận một `categoryId`.

## Proposed outcome

- Một ô chọn "Danh mục" giống "Chi nhánh"/"Sắp xếp"; mở ra danh sách có ô tích, chọn nhiều, kèm số sản phẩm; "Tất cả danh mục" bỏ chọn; ô tìm khi có nhiều danh mục.
- URL `?category=3,7`; link cũ `?category=3` vẫn chạy.
- API thêm tham số tuỳ chọn `categoryIds`.

## Users and systems

Mọi vai trò xem danh sách sản phẩm trên web. `apps/client/app/products` (page, list-model, ô chọn mới), `packages/utils` (`searchProducts`), `packages/utils/src/core/validation-schemas.ts` (`productsQuerySchema`), `packages/types` (`ProductSearchFilter`), `packages/database/src/product.ts` (`searchProducts`), `apps/api/app/api/products/route.ts`.

## Constraints

- Additive API: `categoryId` giữ nguyên cho app đã cài; `categoryIds` mới, tuỳ chọn.
- Web gửi `categoryId` khi chọn 1 (chạy được cả với API cũ), `categoryIds` khi chọn 2 trở lên.
- Giữ đơn giản: không lưu bộ lọc, không đổi màn điện thoại.

## Decision log

- 2026-11-13 — Chủ shop: "chỗ category cho selection thôi có thể chọn nhiều" (ảnh: hàng chip danh mục ở danh sách sản phẩm).
- 2026-11-13 — Chọn / bỏ một danh mục áp dụng ngay (như chip cũ), danh sách vẫn mở để chọn tiếp.
- 2026-11-13 — Ô tìm danh mục chỉ hiện khi có hơn 8 danh mục.
- 2026-11-13 — Ô tích đổi ngay trên màn hình, không chờ URL: e2e cho thấy tích nhanh hai danh mục liên tiếp có thể mất lần tích đầu nếu đọc lại từ URL.

## Open questions

Không.
