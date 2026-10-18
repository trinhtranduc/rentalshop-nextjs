# Spec — sửa 2 test cũ

Issue: #1052 · Status: done · Intent: ./intent.md

## Behavior

1. Mock `@rentalshop/utils` trong `mobile-login-refresh.test.ts` có `ResponseBuilder.success`, trả đúng kết quả của `ResponseBuilder.success` thật trong `packages/utils/src/api/response-builder.ts`.
2. Mọi assertion cũ về session, token, refresh token (#344, #660) giữ nguyên. Thêm kiểm tra `code: LOGIN_SUCCESS` và câu tiếng Việt mặc định "Đăng nhập thành công".
3. Test SEARCH_TIMEOUT: không có request (không header) thì câu tiếng Việt trong `locales/vi/errors.json`; `Accept-Language: en` (qua `withApiMessageRequest`) thì câu tiếng Anh trong `locales/en/errors.json`.

## API and data

Không đổi.

## Acceptance

- [x] Hai file pass ở cả hai TZ
- [x] Test login khác và test api-message pass ở cả hai TZ
