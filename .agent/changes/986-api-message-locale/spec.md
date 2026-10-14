# Spec — API message theo ngôn ngữ app chọn

Issue: #986 · Status: in-progress · Intent: ./intent.md

## Behavior

Thứ tự là A, rồi B, rồi C. Phần sau chỉ bắt đầu khi phần trước đã pass.

### A. iOS và Android cùng mã, cùng câu

1. Danh sách mã là các key trong `locales/vi/errors-mobile.json`, bỏ key bắt đầu bằng `_`. Key nào chưa có trong cả `locales/en/errors.json` và `locales/vi/errors.json` thì thêm vào hai file đó trước khi đưa vào app. Câu trong app lấy từ hai file `errors.json`, không lấy câu cũ lệch trong `errors-mobile.json`.
2. iOS `en.lproj/Localizable.strings` và `vi-VN.lproj/Localizable.strings` có từng mã đó. Giá trị tiếng Anh bằng `errors.json` tiếng Anh. Giá trị tiếng Việt bằng `errors.json` tiếng Việt. Placeholder `{name}` giữ nguyên để app điền từ `messageParams`.
3. Android `res/values/strings.xml`, `res/values-vi/strings.xml` và `ApiErrorMessages.stringId` có đúng các mã đó, cùng câu với iOS và với `errors.json`.
4. Một mã có trên iOS thì có trên Android, và ngược lại. Thiếu một mã hoặc lệch một câu thì bước kiểm tra fail.
5. Phần A không đổi request, response, `code` hay status.
6. Câu catalog của các mã trong `errors-mobile.json` nói cho người dùng cửa hàng việc gì đã xảy ra và việc họ làm tiếp. Không dùng từ Prisma, SQL, stack, constraint, undefined, null, đường dẫn file, mã `P1001`, hay câu bảo người dùng kiểm tra database hoặc mô hình ML.

### B. Server không trả lỗi kỹ thuật cho client

7. `message` và `error` trên response lỗi là câu catalog của `code`. Trước phần C câu đó là tiếng Việt. Phần C chọn `en` hoặc `vi`. Không gán `error.message` của exception, câu Zod thô, `Field: ...`, hay chi tiết Prisma vào hai field này.
8. `handleApiError` vẫn log đủ exception trên server. Không thêm field response mới để chứa diagnostic.
9. Lỗi không map được mã cụ thể dùng một mã catalog sẵn có (`INTERNAL_SERVER_ERROR` hoặc `VALIDATION_ERROR`) với câu dễ hiểu. `code` và HTTP status của các lỗi đã có mã giữ nguyên.

### C. Server trả message theo ngôn ngữ app

10. `getApiMessage(code, values, locale)` trả câu trong `locales/en/errors.json` khi `locale` là `en`, và câu trong `locales/vi/errors.json` khi `locale` là `vi` hoặc bỏ trống.
11. Giá trị `en-US` hoặc `vi-VN` chọn `en` hoặc `vi`. Header nhiều lựa chọn (`en-US,en;q=0.9,vi;q=0.8`) lấy lựa chọn đầu tiên. `ja`, `ko`, `zh`, chuỗi rỗng hoặc header thiếu thì dùng tiếng Việt.
12. Mọi response đang gọi `getApiMessage` / ResponseBuilder điền `message` và `error` theo locale của request. `code` và HTTP status không đổi. Placeholder `{name}` vẫn điền từ tham số hiện có.
13. Web (`common.ts`), iOS (`BaseService`) và Android (`ApiClient`) gửi `Accept-Language` đúng ngôn ngữ người dùng đang chọn trong app, không lấy ngôn ngữ hệ điều hành khi hai thứ khác nhau.
14. Request không có header vẫn 2xx/4xx như cũ và `message` tiếng Việt.
15. Log, Swagger, webhook và health không đổi ngôn ngữ.

## Out of scope

- Không thêm mã lỗi API mới ngoài những key đã có trong `errors-mobile.json` mà catalog web còn thiếu.
- Không bật tiếng Nhật, Hàn, Trung cho app hay cho `message` của server.
- Không sinh chuỗi cho key chỉ là mảnh câu `API_*` nếu key đó không nằm trong `errors-mobile.json`.
- Không đổi nội dung demo đăng ký (#984).

## API and data

Không field mới. Không migration. `message` / `error` đổi ngôn ngữ theo header tùy chọn. Auth và scope không đổi.

## Acceptance

- [x] Script hoặc test: tập mã iOS, tập mã Android và `errors-mobile.json` trùng nhau; câu en/vi trùng `errors.json`
- [x] `INVALID_CREDENTIALS` và `PRODUCT_HAS_OPEN_ORDERS` có trên cả hai app, cả hai ngôn ngữ, đúng câu catalog
- [x] Test: exception Prisma và Zod không đưa `error.message` vào `message` hay `error` của response; log server vẫn có exception; response dùng câu catalog
- [x] Test: không header và header lạ → câu tiếng Việt của một mã đã có trong cả hai catalog
- [x] Test: `Accept-Language: en` và `en-US` → câu tiếng Anh cùng mã; `vi` và `vi-VN` → câu tiếng Việt
- [x] Test HTTP local: login sai mật khẩu với và không có header
- [x] Web gửi header từ ngôn ngữ app (e2e đăng nhập đã chạy). iOS và Android đã có code gửi header; chưa mở app
- [x] `code` và status của response mẫu giữ nguyên
