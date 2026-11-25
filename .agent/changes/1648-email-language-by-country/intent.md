# Email theo quốc gia của shop, bỏ dòng "Ngôn ngữ email"

Issue: #1648 · Author: Trinh · Status: in-progress · Created: 2026-11-25

## Problem

Dòng "Ngôn ngữ email" (Tiếng Việt / English / 日本語) trong Thông tin cửa hàng (web, iOS, Android) hỏi thừa vì shop đã chọn Quốc gia, và dễ lệch (#1545).

## Proposed outcome

Dòng bị bỏ ở cả 3 nơi. Email gửi cho shop và nhân viên dùng ngôn ngữ theo `Merchant.country`: Việt Nam → vi, Nhật Bản → ja, nước khác → en; chưa có quốc gia → `Merchant.language`, trống → vi.

## Affected users and systems

MERCHANT (thấy dòng), mọi người nhận email xác thực / quên mật khẩu / nhắc gói. `apps/api`, `packages/constants`, `apps/client`, iOS, Android. Không migration.

## Constraints

Giữ cột `Merchant.language` và việc `PUT /api/settings/merchant` nhận `language` (app đang trên store còn dòng này). `GET /api/users/profile` vẫn trả `merchant.language` cùng kiểu. Không đổi tiêu đề / nội dung email.

## Open questions

None.

## Decision log

- 2026-11-25 — Owner: "bỏ, nó sẽ theo quốc gia". Đổi quyết định 13/11 (#1545 ngôn ngữ theo trang / app).
- 2026-11-25 — Chọn ngôn ngữ lúc gửi (không ghi vào cột), nên shop đổi Quốc gia là email đổi theo và shop cũ cũng theo quốc gia ngay, không cần backfill.
