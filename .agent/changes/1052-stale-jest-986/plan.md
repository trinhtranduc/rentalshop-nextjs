# Plan

Issue: #1052

1. Thêm `success` vào mock `ResponseBuilder` (gọi bản thật). Thêm assertion `code` / `message`.
2. Sửa test SEARCH_TIMEOUT: tiếng Việt mặc định, tiếng Anh khi `Accept-Language: en`.
3. Chạy `npx jest api/mobile-login-refresh image-search-user-message`, test login và api-message, ở `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`.
