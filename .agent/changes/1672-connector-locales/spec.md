# Spec #1672

- `GET /rules`: `locales` = `PUBLIC_LOCALES` (đúng bằng `/meta`). `voice`: viết bằng ngôn ngữ của bài.
- `POST /drafts`: `locale` không thuộc `PUBLIC_LOCALES` → `422`, `error.code = invalid`, `details.locale`. Lỗi trường khác vẫn `400`. Không lưu gì.
- Giữ nguyên (đã đúng): lưu `locale` cùng bản nháp; slug trùng cùng locale `409`, khác locale được dùng chung; `publish` trả `url` đúng tiền tố ngôn ngữ; `/articles` trả `locale`.
- Không làm: `GET /images` `locale` (thư viện AnyRent không có ảnh chứa chữ, ảnh không `locale` dùng cho mọi bài), đổi `locale` bằng `PUT`.
