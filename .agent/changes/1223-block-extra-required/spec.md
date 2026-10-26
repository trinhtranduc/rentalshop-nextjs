# Spec #1223

1. `POST /api/products`, `PUT /api/products/[id]` với `pricingSchemaVersion: 2`: option BLOCK có `blockExtraMode` EXTRA_PER_DAY (hoặc không gửi mode) mà `blockExtraPrice` null/thiếu: 400 `BLOCK_TABLE_INVALID`.
2. `HOLD_LAST` với `blockExtraPrice` null vẫn hợp lệ. `blockExtraPrice: 0` ở EXTRA_PER_DAY hợp lệ (chủ chọn 0đ).
3. Bộ tính giá và `isValidBlockTable` giữ nguyên (đọc bảng đã lưu thiếu X: tính X=0, không lỗi 500).
4. `isCompleteBlockTable` (utils) và `blockTableValid` (API) cùng quy tắc; golden `invalidSaveTables` giữ chúng bằng nhau.
