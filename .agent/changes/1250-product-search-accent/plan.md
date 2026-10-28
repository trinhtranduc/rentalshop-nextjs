# Plan
1. Test đỏ: `tests/product-search-accent.test.ts` (luật JS + SQL thật nếu có DB), cập nhật hai test cũ khẳng định "đúng dấu".
2. Sửa `packages/database/src/product-search-words.ts`: bỏ nhánh `hasDiacritics`.
3. Dọn chú thích trong `product.ts`.
4. Dòng `.agent/api-changes/LOG.md`, bảng API compatibility trong PR.
5. Kiểm: Jest hai TZ, tsc, mobile (không đổi code).
