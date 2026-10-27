# Spec #1261
- `packages/database/src/product.ts`: `buildSearchWordTerm(word)` chỉ lấy `pattern`; `projectSearchColumnSql('name')` một tham số.
- Hết TS2339 / TS2554 ở `product.ts`. Kết quả tìm kiếm giữ nguyên (Jest `product-search*` vẫn xanh).
- Ngoài phạm vi: lỗi type có sẵn khác.
