# Spec — Giao diện web quản lý sang nhiều ngôn ngữ

Issue: #1570 · Status: accepted · Intent: ./intent.md

## Behavior

1. `locales/ja`, `locales/ko`, `locales/zh` có đủ 7.064 khóa web quản lý, khớp cấu trúc `locales/vi`.
2. `locales-pending/{zh-TW,fr,de,ru,th,id,es}` có đủ khóa web quản lý (ru/th/id/es 6.430 khóa; phần landing/public chưa dịch trong đợt này) và không được app đọc.
3. Mọi file JSON trong `locales/` và `locales-pending/` là JSON hợp lệ.
4. Biến `{…}` trong mỗi khóa giống tiếng Việt (`scripts/i18n/merge.js` từ chối bản dịch sai).
5. Ngôn ngữ `ja` được chấp nhận trong `ShopLanguage`, đăng ký và cập nhật cài đặt cửa hàng; `vi` và `en` không đổi.
6. Kiểu client (`RegisterData`, cài đặt cửa hàng) nhận `'ja'`.

## Out of scope

- Email, landing, trang công khai ja/ko/zh (chỉ web quản lý).
- iOS và Android (chờ phê duyệt).
- Phạm vi admin (chờ quyết định).
- Review bản dịch bởi người bản ngữ (là bước riêng, ngoài PR này).

## API and data

- `language` nhận thêm giá trị `ja` trong `POST /api/auth/register` và `PUT /api/settings/merchant`. Không thêm trường mới, không đổi trường cũ.
- `message` lỗi API theo `Accept-Language: ja` trả câu tiếng Nhật.
- Không có migration. Không đổi env.
- Scope merchant/outlet không đổi.

## Acceptance

- [x] `locales-valid-json`, `locales-complete`, `glossary-legal-words`, `deposit-wording`, `thechan-wording`, `error-codes-translated`, `shop-12-locales`: 533 test pass (chạy trước khi merge #1571).
- [x] `locales-valid-json` pass sau khi merge vào dev (443 test).
- [ ] `yarn type-check` sạch: chưa, còn 270 lỗi có sẵn (xem PR #1571).
- [ ] `yarn lint` sạch: chưa, package `database` thiếu cấu hình ESLint (có sẵn trên dev).
- [x] iOS và Android không đổi (`mobile-parity` không áp dụng: không đổi response shape cho app đã cài).
- [ ] Người bản ngữ review ja/ko/zh/zh-TW/fr/de/ru/th/id/es.
