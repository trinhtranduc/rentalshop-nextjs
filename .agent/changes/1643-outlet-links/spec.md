# Spec #1643

Status: in-progress

## Behaviors
1. `normalizeOutletLink(type, url)`: cắt khoảng trắng; thiếu `http(s)://` thì thêm `https://`; chỉ nhận `http` và `https`; phải có host có dấu chấm; tối đa 300 ký tự; sai thì trả lỗi `invalid`.
2. Facebook phải ở `facebook.com` / `fb.com` / `fb.me`; Instagram ở `instagram.com`; TikTok ở `tiktok.com`; YouTube ở `youtube.com` / `youtu.be`; Zalo ở `zalo.me` / `zalo.com` (kể cả `www.`, `m.`). Website và Khác nhận host bất kỳ.
3. Loại `other` có nhãn `label` (1–30 ký tự); loại khác không có nhãn.
4. Tối đa 6 link mỗi chi nhánh; link trùng (cùng loại và cùng URL sau chuẩn hóa) bị bỏ bớt, chỉ giữ một.
5. `POST /api/outlets` và `PUT /api/outlets` nhận `links` tùy chọn: có thì thay cả danh sách (đã chuẩn hóa), `[]` xóa hết, vắng mặt thì giữ nguyên.
6. `links` sai (quá 6, URL sai, loại lạ) → 400 `VALIDATION_ERROR` có `fieldErrors.links`.
7. `GET /api/outlets` và `GET/PUT/POST` chi nhánh trả `links` (mảng, `[]` khi chưa có).
8. `GET /api/public/<tenantKey>/products`: mỗi `outlets[]` thêm `links` (đã lọc lại, chỉ link http/https hợp lệ) và `isDefault`. Không thêm/đổi trường khác.
9. Form Sửa chi nhánh (web) có nhóm "Liên kết": thêm/xóa dòng, chọn loại, nhập URL, báo lỗi dưới dòng, đếm "Đã dùng n / 6", nút thêm ẩn khi đủ 6. Form Thêm chi nhánh cũng có.
10. Trang shop: chi nhánh đang chọn = `?outlet=` nếu là chi nhánh đang hoạt động của shop, không thì chi nhánh chính, không thì chi nhánh đầu danh sách.
11. Shop từ 2 chi nhánh đang hoạt động hiện chip chọn chi nhánh; 1 chi nhánh thì không. Bấm chip đổi tên, địa chỉ, số điện thoại, link; URL đổi theo `?outlet=<id>` không tải lại danh sách sản phẩm.
12. Hàng link hiện mỗi link một nút có icon theo loại (nhãn riêng cho loại Khác); chi nhánh không có link thì không có hàng này. Mọi link mở tab mới `rel="noopener noreferrer"`.
13. Nút to "Nhắn Zalo" (lấy từ số điện thoại) chỉ hiện khi chi nhánh đang chọn không có link loại Zalo.
14. App cũ sửa chi nhánh (body không có `links`) không làm mất link: đọc rồi lưu lại bằng payload cũ, `links` vẫn còn.
15. Chữ mới có đủ 12 ngôn ngữ (web shop `outlets.json`, trang công khai `products.json`).
16. Hộp thoại Sửa chi nhánh, Chi tiết chi nhánh và Chọn khách rộng 640px trên màn hình từ 640px; các hộp thoại khác vẫn 480px.

## Out of scope
Form chi nhánh trong app iOS/Android (PR 2); lọc sản phẩm theo chi nhánh; sửa link ở trang admin hệ thống.
