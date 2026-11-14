# Plan — Giao diện web quản lý sang nhiều ngôn ngữ

Issue: #1570 · Status: accepted · Spec: ./spec.md

## Steps

1. (Đã làm) Trích khóa thiếu bằng `scripts/i18n/missing.js`, chia phần, dịch bằng nhiều agent theo bảng thuật ngữ `locales/GLOSSARY.md`.
2. (Đã làm) Gộp bằng `scripts/i18n/merge.js`; kiểm tra bằng `scripts/i18n/check.js`.
3. (Đã làm) Review độc lập; sửa bằng `merge.js --force`.
4. (Đã làm) ja/ko/zh vào `locales/`; zh-TW/fr/de/ru/th/id/es vào `locales-pending/`.
5. (Đã làm) Sửa kiểu `'ja'` trong `packages/types`, `packages/utils/src/api`.
6. (Đã làm) Test locale theo `i18n-keys`.
7. Tiếp theo (PR riêng): review bản ngữ; chuyển ngôn ngữ đã review sang `locales/` và bật trong `APP_LANGUAGES`.

## Files

- `locales/{ja,ko,zh}/*.json` — bản dịch đã review
- `locales-pending/{zh-TW,fr,de,ru,th,id,es}/*.json` — bản dịch chưa review
- `locales/GLOSSARY.md` — thuật ngữ
- `packages/types/src/entities/user.ts`, `packages/utils/src/api/auth.ts`, `packages/utils/src/api/settings.ts` — thêm `'ja'`
- `.agent/api-changes/LOG.md` — dòng #1570

## Risks

- Bản dịch chưa review nếu bị đưa vào `locales/` sẽ hiển thị cho người dùng. Test `shop-12-locales` bảo vệ việc này.
- Thay đổi API chỉ thêm giá trị; app đã cài không gửi `ja`.

## Rollback

Revert PR #1571 trên dev. Không có migration nên không cần rollback dữ liệu.
