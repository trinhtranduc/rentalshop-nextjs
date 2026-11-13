# App iOS / Android: đăng ký chọn quốc gia, ngôn ngữ, tiền tệ; Ngôn ngữ email trong Cài đặt

Issue: #1541 · Author: Trinh Tran · Status: in-review · Created: 2026-11-13

## Problem

#1539 (PR #1540) đã làm phần web. App iOS / Android chưa hỏi quốc gia, ngôn ngữ, tiền tệ khi đăng ký; không gửi múi giờ
máy nên shop ở nước ngoài đăng ký trên điện thoại vẫn nhận múi giờ Việt Nam; chủ shop gói Basic (chỉ dùng điện thoại) không đổi
được ngôn ngữ email.

## Proposed outcome

- Màn đăng ký, bước "Cửa hàng", sau ô Địa chỉ: Quốc gia (mặc định Việt Nam, 249 nước như web, ô tìm, Việt Nam đầu),
  Ngôn ngữ (Tiếng Việt / English) và Tiền tệ (VND / USD) chung một hàng. Việt Nam → Tiếng Việt + VND; nước khác → English + USD.
- Gửi `country` (tên tiếng Anh như web), `language`, `currency`, `timezone` (múi giờ máy).
- Cài đặt → Thông tin cửa hàng (chủ shop): Ngôn ngữ email, chỉ hiện khi profile có `merchant.language`.

## Constraints

Không đổi API. iOS là chuẩn, Android theo iOS. App mới gặp API cũ: đăng ký như cũ, ô Ngôn ngữ email ẩn.

## Decision log

- 2026-11-13 — owner: "làm luôn" phần app sau mockup #1539; giữ mặc định Việt Nam và dòng ghi chú như web.
- 2026-11-13 — tên tiếng Anh của nước: tên CLDR tiếng Anh, riêng HK → "Hong Kong", CN → "China", MO, IO, GS như tên web lưu (Node / Chrome).
- 2026-11-13 — iOS và Android làm song song; Android theo iOS ở danh sách tên tiếng Anh (5 mã ghi đè) và tìm nước theo cả tên tiếng Anh.
