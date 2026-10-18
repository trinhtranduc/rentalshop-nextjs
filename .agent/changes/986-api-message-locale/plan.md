# Plan — API message theo ngôn ngữ app chọn

Issue: #986 · Status: in-progress · Spec: ./spec.md

## Steps

Thứ tự là A, rồi B, rồi C. Phần sau chỉ bắt đầu khi phần trước đã pass.

### A. Đồng bộ iOS và Android

1. Branch `feat/986-api-message-locale` từ `dev`. Không trộn với diff đăng ký demo.
2. Lấy key trong `locales/vi/errors-mobile.json` (bỏ `_`). Key thiếu trong `locales/en/errors.json` hoặc `locales/vi/errors.json` thì thêm câu vào cả hai file, và vào `ja`/`ko`/`zh` theo skill `i18n-keys`.
3. Ghi câu từ hai file `errors.json` vào iOS `en.lproj` và `vi-VN.lproj` dưới đúng mã `code`. Ghi cùng câu vào Android `values/strings.xml`, `values-vi/strings.xml`, và map đủ mã trong `ApiErrorMessages.kt`. Không dịch tay lại.
4. Sửa câu catalog còn kiểu kỹ thuật (Prisma, database, ML model, "Internal server error") thành câu người dùng cửa hàng đọc được, ở `en` và `vi`, cùng key ở `ja`/`ko`/`zh`. Rồi mới copy sang hai app.
5. Test so khớp: cùng tập mã trên iOS, Android và `errors-mobile.json`; câu en/vi trùng catalog. Skill `mobile-parity`.
6. Phần A không đổi API, không thêm dòng mới vào `.agent/api-changes/LOG.md`.

### B. Response không lộ lỗi kỹ thuật

7. Trong `packages/utils/src/core/errors.ts`, `handleApiError` không gán exception, câu Zod, hay `Field: ...` vào `response.message` hoặc `response.error`. Hai field lấy câu catalog. `console.error` giữ nguyên exception.
8. Test: ném lỗi Prisma và Zod qua `handleApiError`; response không chứa `error.message` gốc; status và `code` giữ nguyên.

### C. Accept-Language

9. Sửa `getApiMessage` trong `packages/utils/src/api-messages.ts` để nhận locale và đọc `locales/en/errors.json` hoặc `locales/vi/errors.json`. Thêm test catalog trong `tests/` trước khi nối vào request.
10. Đọc `Accept-Language` một chỗ dùng chung cho ResponseBuilder và các route đang gọi `getApiMessage` trực tiếp. Thiếu header hoặc không phải `en`/`vi` → `vi`.
11. Web: `packages/utils/src/core/common.ts` gắn `Accept-Language` theo locale app (`NEXT_LOCALE`), ghi đè header trình duyệt.
12. iOS: `BaseService.swift` gắn header theo ngôn ngữ app. Android: `ApiClient.kt` cùng cách.
13. Skills: `i18n-keys`, `api-route-standard`, `api-compat-review`. Không migration.
14. Verify phần C: test catalog + login sai mật khẩu local (`en`, `vi`, không header).

## Files

- `locales/vi/errors-mobile.json` — danh sách mã app phải có
- `locales/en/errors.json`, `locales/vi/errors.json` — câu nguồn; `ja`/`ko`/`zh` khi thêm key còn thiếu
- `apps/mobile/POS ADBD/en.lproj/Localizable.strings` — câu tiếng Anh theo mã
- `apps/mobile/POS ADBD/vi-VN.lproj/Localizable.strings` — câu tiếng Việt theo mã
- `apps/mobile-android/app/src/main/res/values/strings.xml` — câu tiếng Anh
- `apps/mobile-android/app/src/main/res/values-vi/strings.xml` — câu tiếng Việt
- `apps/mobile-android/.../ApiErrorMessages.kt` — map đủ mã
- `packages/utils/src/core/errors.ts` — phần B, không đưa exception ra `message` / `error`
- `packages/utils/src/api-messages.ts` — phần C, chọn catalog theo locale
- `packages/utils/src/api/response-builder.ts` — phần C, truyền locale vào câu
- `packages/utils/src/core/common.ts` — phần C, header web
- `apps/mobile/POS ADBD/Library/Services/BaseService.swift` — phần C, header iOS
- `apps/mobile-android/.../ApiClient.kt` — phần C, header Android
- `tests/` — so khớp mã app, rồi catalog và HTTP login
- `.agent/api-changes/LOG.md` — phần B và C đổi nội dung `message`/`error`; dòng #986 đã có, status `planned` đến khi merge

## Risks

App cũ không gửi header sẽ thấy `message` tiếng Việt ở đường chưa có chuỗi local. Trên `release-2026-10-12.2` câu đó đang là tiếng Anh. Mã app đã dịch không đổi. Xem bảng trong issue #986.

## Rollback

Phần A: hoàn nguyên file chuỗi iOS, Android và câu catalog. Phần B: trả `handleApiError` về hành vi cũ. Phần C: trả `getApiMessage` về catalog tiếng Việt cho mọi request và gỡ header ở ba client. Không sửa dữ liệu.
