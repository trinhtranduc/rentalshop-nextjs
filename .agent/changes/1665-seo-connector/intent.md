# Connector cho SEO Agent Hub (#1665)

Issue: #1665 · Status: accepted · Created: 2026-11-26

## Problem
Chủ shop dùng **SEO Agent Hub** (`/Users/trinhtran/Documents/Source-Code/seo-agent-hub`) để chạy đội AI viết bài cho nhiều website. Để Hub làm việc với AnyRent, AnyRent phải trả lời một số lời gọi HTTP có chuẩn (connector, hợp đồng v1 trong `docs/connector-contract.md`, hướng dẫn `docs/connector-guide.md`).

## Outcome (verifiable)
- `https://anyrent.shop/api/seo-connector/v1/*` trả lời 11 lời gọi của hợp đồng; lệnh `connector:check` của Hub PASS hết (kể cả `--write`).
- Bài do Hub gửi nằm trong `Post` ở trạng thái **DRAFT**, không hiện công khai, không vào sitemap, cho tới khi Hub gửi `publish` (sau khi chủ shop xác nhận trong Hub).
- Không có khoá Claude hay DataForSEO trong AnyRent; AnyRent không gọi AI.

## Constraints
- Thay hướng cũ "host đội agent trong admin AnyRent" (#1637 module, #1638 host).
- Chỉ thêm: không đổi `/api/posts*`, trang công khai, sitemap, iOS, Android.
- Khoá: chỉ lưu SHA-256 (`SEO_CONNECTOR_KEY_SHA256`), so sánh hằng thời gian; khoá thật không vào repo, log hay chat.
- Một bảng mới `SeoConnectorKey` (chống gửi trùng); migration do chủ shop đặt (hook chặn agent).
- Quy tắc `write-article`: không tự đăng, không nêu tính năng chưa có.

## Decision log
- 2026-11-26 chủ shop: "đọc connector-guide.md để cung cấp các api cần thiết cho seo-agent-hub".
- Địa chỉ: Hub gọi `${baseUrl}/api/seo-connector/v1`; web `anyrent.shop` không proxy `/api` nên thêm một rewrite riêng cho đường dẫn này (`apps/client/next.config.js`), route thật nằm ở `apps/api`.
- Tác giả bài: tài khoản chỉ định bằng `SEO_CONNECTOR_AUTHOR_ID`; connector chỉ sửa, đăng, gỡ bài do chính nó tạo.
- Đường dẫn bài công khai là `/post/<slug>` (`publicPostPath`), `en` và các ngôn ngữ khác có tiền tố `/<locale>`.

## Open questions
- Tài khoản tác giả cho bài của Hub: dùng tài khoản ARTICLE riêng (khuyến nghị) hay admin hiện có?
- `GET /facts/:set`: AnyRent chưa có bộ số liệu; có muốn mở `plans` (giá các gói) cho người viết trích không? (chạm quy tắc tiền, cần chủ shop chốt bảng ví dụ VND trước.)
- `translations` và `video` (tuỳ chọn trong hợp đồng) để sau.
