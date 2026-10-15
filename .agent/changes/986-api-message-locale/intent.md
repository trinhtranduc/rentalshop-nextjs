# API message theo ngôn ngữ app chọn

Issue: #986 · Author: agent · Status: in-progress · Created: 2026-10-14

## Problem

App dịch câu người dùng thấy theo mã `code`: app tiếng Anh hiện tiếng Anh, app tiếng Việt hiện tiếng Việt. Mã mà bản app đã cài chưa có thì app hiện nguyên field `message`.

#985 để `message` luôn tiếng Việt, kể cả khi client gửi `Accept-Language: en`. Máy tiếng Anh gặp mã mới sẽ thấy tiếng Việt cho đến khi được cập nhật.

Trên `release-2026-10-12.2`, `message` đang là tiếng Anh. iOS và Android không gửi `Accept-Language`.

## Proposed outcome

Làm hai bước, bước app trước.

1. iOS và Android dùng cùng một danh sách mã. Câu tiếng Anh và tiếng Việt của mỗi mã trùng `locales/en/errors.json` và `locales/vi/errors.json`. App tiếng Anh hiện tiếng Anh, app tiếng Việt hiện tiếng Việt, không cần đợi server. Câu đó là lỗi dễ hiểu cho người dùng cửa hàng.
2. `message` và `error` mà server trả cho client chỉ là câu đó. Không trả nội dung exception, Prisma, SQL, stack, đường dẫn file, hay câu kiểu "check the database". Chi tiết kỹ thuật chỉ ở log server.
3. Sau khi hai app đã khớp, server mới trả `message` theo `Accept-Language` (`en` hoặc `vi`). Không có header thì tiếng Việt. `code`, HTTP status và các field giữ nguyên.

## Affected users and systems

Mọi vai trò gọi API. `apps/api`, `packages/utils` (`getApiMessage`, ResponseBuilder), web (`packages/utils/src/core/common.ts`), iOS (`BaseService.swift`), Android (`ApiClient.kt`). Không đụng database.

## Constraints

- Header là tùy chọn. App cũ không gửi header vẫn thành công và nhận tiếng Việt.
- Không thêm field, không đổi `code` hay status.
- Chỉ `en` và `vi`. `ja` / `ko` / `zh` không chọn ngôn ngữ server; những locale web đó vẫn dịch lỗi bằng catalog tiếng Anh phía client.
- Web phải ghi đè `Accept-Language` theo ngôn ngữ đã chọn trong app. Trình duyệt tự gửi header theo ngôn ngữ máy.
- Không dịch log, Swagger, webhook, health.
- Làm sau #985. Catalog và `getApiMessage` đã có từ issue đó.

## Open questions

Không còn.

## Decision log

- 2026-10-14 — Chốt hai lớp: app dịch theo `code`; server trả `message` theo `Accept-Language`; không header thì tiếng Việt (chủ shop).
- 2026-10-14 — Đồng bộ mã và câu trên iOS và Android trước. Header `Accept-Language` làm sau (chủ shop).
- 2026-10-14 — `message` và `error` trả cho client là câu dễ hiểu. Lỗi kỹ thuật chỉ ghi log (chủ shop).
- 2026-10-14 — 12 mã Android đã map nhưng thiếu trong `errors-mobile.json` được thêm vào danh sách đó (đã có trong `errors.json`), để không gỡ chuỗi app đang dùng. `PRODUCT_HAS_NO_IMAGES` cũng được thêm vào iOS.
