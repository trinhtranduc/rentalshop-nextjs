# Spec (#1665)

Route: `apps/api/app/api/seo-connector/[[...path]]/route.ts` (public trong middleware), logic `apps/api/lib/seo-connector/`. Dạng phản hồi `{ ok: true, data }` hoặc `{ ok: false, error: { code, message, details? } }`.

1. Khoá: thiếu hoặc sai khoá trả `401 unauthorized` JSON ở **mọi** đường dẫn dưới `/api/seo-connector/` (phiên bản khác, không có đường dẫn, lời gọi lạ, ghi thiếu `Idempotency-Key`), trước mọi xử lý khác. Chưa đặt `SEO_CONNECTOR_KEY_SHA256` (hoặc sai dạng) thì không ai vào được.
2. `GET /meta`: `{ name: "AnyRent", baseUrl, locales: 12 ngôn ngữ công khai, contractVersion: "v1", supports: [] }`.
3. `GET /pages`: trang chủ, bảng giá, tính năng, tải app, tìm bằng ảnh, blog, cộng tối đa 300 bài `vi` đã đăng (`kind: article`); đường dẫn bắt đầu bằng `/`.
4. `GET /images`: ảnh `media/blog/` trên S3 `{ id: key, url đầy đủ, alt, tags }`; chưa cấu hình S3 thì `[]`.
5. `GET /facts/:set`: `404 not_found` (tuỳ chọn, chưa có bộ số liệu).
6. `GET /rules`: `{ disclosure: false, riskPath: null, voice, locales: ["vi"], wordRange: { min: 800, max: 3000 } }`.
7. `GET /articles?since=`: bài **đã đăng**, `url` đầy đủ, `since` lọc theo `updatedAt`, ngày không hợp lệ `400 invalid`.
8. Mọi lời gọi ghi (`POST`/`PUT`) cần `Idempotency-Key` (thiếu: `400 invalid`). Khoá chưa thấy: xử lý rồi lưu phản hồi thành công (`SeoConnectorKey`); khoá đã thấy: trả đúng phản hồi cũ, không làm gì thêm. Lỗi không được lưu (thử lại sau khi sửa vẫn chạy).
9. `POST /drafts`: tạo `Post` `status = DRAFT` (không `publishedAt`), `authorId = SEO_CONNECTOR_AUTHOR_ID`, `body` HTML đổi sang JSON TipTap; `locale` mặc định `vi`; slug trùng trong cùng locale `409 conflict`; thiếu hoặc sai trường `400 invalid` kèm `details`; body JSON hỏng hoặc quá 1 MB `400 invalid`; chưa đặt tác giả `500 server`. Trả `201 { id, previewUrl }` (`previewUrl` là trang sửa bài trong admin). Bỏ qua trường lạ.
10. `PUT /drafts/:id` (title, body, excerpt), `PUT /drafts/:id/cover` (`imageId` phải thuộc thư viện ảnh), chỉ với nháp do connector tạo: bài của người khác `403 forbidden`, không có `404 not_found`, đã đăng `409 conflict`.
11. `POST /drafts/:id/publish`: nháp sang `PUBLISHED`, đặt `publishedAt`, trả `{ url đầy đủ, publishedAt }`; gọi lại trên bài đã đăng trả cùng kết quả, không đăng hai lần. Đây là lời gọi **duy nhất** làm nội dung công khai.
12. `POST /drafts/:id/unpublish`: đưa bài đã đăng về nháp; bài đang là nháp để nguyên.
13. Bộ chuyển HTML sang TipTap chỉ tạo các node trình soạn thảo lưu được và `RichPostBody` vẽ được; script, style, iframe, form bị bỏ cùng nội dung; link chỉ http(s), `/`, `mailto:`, `tel:`, `#`; ảnh chỉ http(s) và `/`.
14. Lỗi máy chủ không lộ thông điệp hay chuỗi kết nối: `500 server` với câu chung.
15. Web `anyrent.shop/api/seo-connector/*` chuyển sang API bằng một rewrite (chỉ đường dẫn này).

Test: `tests/api/seo-connector.test.ts`, `tests/seo-connector-html.test.ts`; `connector:check` của Hub (read-only và `--write`) trên API local.
