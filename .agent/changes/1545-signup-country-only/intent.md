# Đăng ký chỉ hỏi Quốc gia; ngôn ngữ theo trang / app, tiền tệ theo quốc gia

Issue: #1545 · Author: agent · Status: in-review · Created: 2026-11-13

## Problem

#1539 (web) và #1541 (app) cho màn đăng ký 3 ô: Quốc gia, Ngôn ngữ, Tiền tệ, kèm một dòng ghi chú. Chủ sản phẩm thấy form dài.
Các trang đăng ký khác (KiotViet, Sapo, Haravan, Square, Stripe, Booqable, Shopify…) gần như không hỏi ngôn ngữ, và không có ô tiền tệ riêng.

Nếu ngôn ngữ lấy theo quốc gia thì có trường hợp sai: người đang đọc trang bằng English mà chọn Việt Nam sẽ nhận email tiếng Việt,
dữ liệu mẫu tiếng Việt, và web đổi sang tiếng Việt sau khi đăng ký.

## Proposed outcome

- Màn đăng ký (web, iOS, Android) chỉ còn ô **Quốc gia** (mặc định Việt Nam).
- **Ngôn ngữ shop = ngôn ngữ đang hiện**: trang đăng ký trên web, ngôn ngữ app trên điện thoại. Tiếng Việt → `vi`, ngôn ngữ khác → `en`.
- **Tiền tệ = theo quốc gia**: Việt Nam → VND, nước khác → USD.
- Dưới ô Quốc gia có một dòng: "Tiền tệ VND · Email tiếng Việt · đổi được trong Cài đặt." / "Currency USD · Emails in English · change in Settings."
- Web: trang đăng ký đã có nút đổi ngôn ngữ (màn rộng: góc trên phải; điện thoại: chân trang, #510), giữ nguyên. Sau đăng ký web giữ ngôn ngữ đang xem, không tải lại.
- Đổi sau trong Cài đặt: Tiền tệ, Ngôn ngữ email (đã có trên web và app).

## Affected users and systems

Chủ shop mới đăng ký (`MERCHANT`). `client` (`packages/ui` RegisterForm, ShopAuthPage), `packages/constants`, iOS, Android. API không đổi.

## Constraints

- Không đổi API, không migration. Body đăng ký giữ các key `country`, `language`, `currency` (app thêm `timezone`).
- iOS là chuẩn, Android theo iOS.
- App có #1542 chưa lên store; bản web 3 ô lên production với release #1544, bản gọn đi ở release sau.

## Decision log

- 2026-11-13 Chủ sản phẩm: bỏ ô Ngôn ngữ (chỉ còn Quốc gia + Tiền tệ). Sau khi xem các trang khác: bỏ luôn ô Tiền tệ, ngôn ngữ và tiền tệ đổi sau trong Cài đặt.
- 2026-11-13 Chủ sản phẩm đồng ý: ngôn ngữ theo ngôn ngữ trang / app (không theo quốc gia), tiền tệ theo quốc gia.
- 2026-11-13 Chủ sản phẩm: bỏ khối "Free Trial Includes" (Dùng thử 14 ngày, Full access…, Mobile app access) ở bước 2 đăng ký web.
