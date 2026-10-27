# Spec: Cài đặt gọn lại

Issue: #1259

## Bảng Cũ -> Mới

| Mới | Gom từ (cũ) | Ai thấy |
|---|---|---|
| Thẻ tên (app) / "Hồ sơ & bảo mật" (web) | Hồ sơ + Đổi mật khẩu / tab Hồ sơ + tab Mật khẩu & bảo mật | mọi vai trò |
| Thông báo (app, dòng riêng dưới thẻ tên) | CỬA HÀNG, dòng đầu | mọi vai trò |
| Thông tin cửa hàng (+ Tiền tệ) | Thông tin cửa hàng + dòng Tiền tệ (app); web đã gộp | mọi vai trò; Tiền tệ chỉ chủ shop |
| Thu tiền | Tài khoản ngân hàng + Cách thu cọc + Mẫu giai đoạn + Chính sách huỷ/dời ngày | ngân hàng: chủ shop, quản lý chi nhánh; cọc: app mọi vai trò xem / chủ shop sửa, web chỉ chủ shop |
| In & phiếu | Ghi chú phiếu + Máy in (app); tab "Phiếu in" (web) | mọi vai trò; ghi chú in: chủ shop, quản lý chi nhánh |
| Cho phép đặt trùng lịch (công tắc, nhóm CỬA HÀNG) | nhóm ĐƠN HÀNG | chỉ chủ shop |
| QUẢN LÝ (app) | giữ nguyên: Danh mục, Khách hàng, Người dùng, Xuất dữ liệu | như hiện có |
| Gói dịch vụ, Ngôn ngữ | giữ nguyên | như hiện có |
| Nâng cao (app) | Thông tin ứng dụng + Xoá tài khoản | mọi vai trò |

Dòng phụ ghi giá trị hiện tại: Thông tin cửa hàng "Tên · VND", Thu tiền "Cọc 1 lần · 2 ngân hàng", In & phiếu "80 mm", Gói "Pro · còn 43 ngày", Ngôn ngữ, Nâng cao "Ứng dụng · Xoá tài khoản".

## Web
Tab chủ shop (7): merchant, public-page, payment, receipt, subscription, profile, language. Nhóm: Cửa hàng (merchant, public-page, payment, receipt), Tài khoản (subscription, profile, language).
Tab quản lý chi nhánh (5): outlet, payment, receipt, profile, language. Nhân viên / kho (4): outlet, receipt, profile, language.
Tab "payment" = Tài khoản ngân hàng (chọn chi nhánh một lần ở đầu, chủ shop và quản lý) + Cách thu cọc / Mẫu giai đoạn / Chính sách huỷ (chỉ chủ shop). Tab "profile" = Hồ sơ rồi Mật khẩu & bảo mật (đổi mật khẩu, đăng xuất, xoá tài khoản).
Link cũ: `bank-accounts` -> `payment`, `account` -> `profile`, `printer` -> `receipt`, `appearance` -> `language`; `merchant|outlet|public-page|payment|receipt|subscription|profile|language` giữ; khoá cấm theo vai trò rơi về tab mặc định như trước.

## App (iOS chuẩn, Android theo)
Chủ shop: thẻ tên; Thông báo; CỬA HÀNG: Thông tin cửa hàng, Thu tiền, In & phiếu, công tắc; QUẢN LÝ 4 dòng; TÀI KHOẢN: Gói dịch vụ, Ngôn ngữ, Nâng cao; Đăng xuất. Đếm: thẻ tên + Thông báo + 3 + 4 + 3 = 12 dòng (không kể công tắc và Đăng xuất).
Vai trò ẩn đúng như trước: Thu tiền luôn hiện (mọi vai trò xem cọc), dòng Tài khoản ngân hàng bên trong chỉ chủ shop / quản lý chi nhánh; Tiền tệ trong Thông tin cửa hàng chỉ chủ shop; công tắc chỉ chủ shop; Gói dịch vụ khi có gói.

## Các câu "Cần chốt" (dùng khuyến nghị)
1. 3 nhóm, tên mục như mockup, app và web cùng tên: đồng ý.
2. Cách thu cọc: app mọi vai trò xem, chỉ chủ shop sửa; web chỉ chủ shop thấy (giữ nguyên).
3. Hồ sơ + đổi mật khẩu gom vào thẻ tên (app); web một tab "Hồ sơ & bảo mật".
4. Công tắc đặt trùng lịch ở nhóm CỬA HÀNG.

## Lệch nhỏ so với mockup (giữ nguyên chức năng)
Ghi trong PR.

## API compatibility
Không đổi API (xem issue #1259). Hàng tương ứng trong `.agent/api-changes/LOG.md`.
