# Giao diện web quản lý sang nhiều ngôn ngữ

Issue: #1570 · Thuộc: #1553 · Status: accepted (đã làm, PR #1571 đã merge) · Created: 2026-11-14

## Problem

Web quản lý chỉ có tiếng Việt và tiếng Anh. Chủ cửa hàng ở Nhật, Hàn, Trung và các thị trường khác phải dùng tiếng Anh hoặc tiếng Việt. Đây là lý do chính để họ không dùng sản phẩm.

## Proposed outcome

- ja, ko, zh (giản thể) đầy đủ 7.064 khóa web quản lý, bật cho người dùng đã chọn ngôn ngữ đó.
- zh-TW, fr, de, ru, th, id, es đầy đủ bản dịch nhưng ở `locales-pending/`, không hiển thị cho người dùng cho đến khi người bản ngữ review.
- Có thể kiểm tra bằng test: JSON hợp lệ, không thiếu/thừa khóa, biến `{…}` giống tiếng Việt, không lẫn ngôn ngữ.

## Affected users and systems

- Vai trò: MERCHANT, OUTLET_ADMIN, OUTLET_STAFF, ADMIN (web).
- Ứng dụng: `client`, `packages/ui`, `packages/utils`, `packages/constants`, `packages/types`, `api` (chỉ thêm `ja` vào `ShopLanguage` và câu lỗi).
- iOS và Android: chưa đổi.

## Constraints

- Không đổi giá trị `vi`/`en` hay trường mà app đã cài đang đọc (xem `.agent/api-changes/LOG.md` dòng #1570).
- Không đưa ngôn ngữ vào iOS/Android nếu chưa có phê duyệt riêng.
- Bản dịch chưa được review bản ngữ không được hiển thị công khai.

## Open questions

- Phạm vi admin (câu hỏi b): admin hiện chỉ có vi/en và còn khoảng 295 chuỗi cứng tiếng Việt.
- Đưa ja/ko/zh vào iOS/Android (câu hỏi c): cần phê duyệt riêng, là thay đổi nhìn thấy được.
- Người bản ngữ review zh-TW, fr, de, ru, th, id, es trước khi chuyển khỏi `locales-pending/`.

## Decision log

- 2026-11-14 — Chỉ bật ja/ko/zh trên web; các ngôn ngữ khác để ở `locales-pending/` đến khi review (owner).
- 2026-11-14 — Ngôn ngữ trang đăng ký theo trang; tiền tệ theo quốc gia (owner).
