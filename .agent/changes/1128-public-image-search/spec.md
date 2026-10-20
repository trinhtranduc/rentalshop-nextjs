# Spec — #1128

## API `POST /api/public/[tenantKey]/search-by-image` (không đăng nhập)
1. Body multipart, field `image`: jpeg/png/webp, 100 B – 5 MB (`VALIDATION.MAX_FILE_SIZE`). Sai → 400 `IMAGE_VALIDATION_FAILED`; thiếu → 400 `NO_IMAGE_FILE`.
2. Shop theo `tenantKey` như route public products: key sai 400 `INVALID_TENANT_KEY`, không có 404 `MERCHANT_NOT_FOUND`, ngừng 403 `MERCHANT_INACTIVE`.
3. Giới hạn: 10 lượt / 10 phút / IP và 200 lượt / giờ / shop (bộ đếm trong bộ nhớ `takeRateSlot`, như #1124) → 429 `IMAGE_SEARCH_RATE_LIMITED`.
4. Tìm: nén ảnh (`compressImageForEmbedding`) → embedding (Python) → vector store lọc `merchantId` của shop, ngưỡng `IMAGE_SEARCH_MIN_SIMILARITY` (mặc định 0.5); dùng chung cache vector hits của `searchByImage` (khoá theo ảnh + merchant + ngưỡng). Không lưu ảnh.
5. Kết quả: tối đa 10 sản phẩm đang bán (`isActive`, chưa xoá) của đúng shop, theo thứ tự giống nhất; hình dạng như `toPublicProduct` (không `costPrice`, id số) + `similarity` (0–1). Mã `PRODUCTS_FOUND` / `NO_PRODUCTS_FOUND`.
6. Dịch vụ AI hết thời gian → 503 `SEARCH_TIMEOUT`; lỗi khác → 503 `SEARCH_FAILED` (mã đã có, có chữ).
7. `GET /api/public/[tenantKey]/products` thêm `merchant.imageSearchAvailable` (có ít nhất 1 sản phẩm đang bán đã có embedding); lỗi thì `false`.

## Web
8. Khi `imageSearchAvailable`: dải "Có ảnh mẫu? Tìm đồ giống bằng AI" trên lưới (chọn ảnh / kéo thả; điện thoại: chụp hoặc thư viện) + nút máy ảnh trong ô tìm. Không có cờ → trang như cũ.
9. Ảnh thu nhỏ trên máy (cạnh dài ≤ 1024 px, JPEG) rồi gửi.
10. Kết quả trên lưới: ảnh khách, tối đa 10 thẻ (ảnh, tên, giá, còn hôm nay, % giống); bấm mở chi tiết sản phẩm (có "Đặt thuê" khi shop bật). Không có kết quả: gợi ý Gọi / Zalo. Lỗi: câu thân thiện (hết lượt / AI bận / ảnh không hợp lệ).
11. Chữ vi + en, namespace `products.public.imageSearch`.
