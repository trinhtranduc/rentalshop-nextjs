# Link mạng xã hội cho chi nhánh + chọn chi nhánh ở trang shop công khai

Issue: #1643 · Author: Trinh Tran (with Claude) · Status: in-progress · Created: 2026-11-25

## Problem
Chủ shop không nhập được link web / Instagram / TikTok / Zalo của từng chi nhánh, nên trang shop công khai (`/<tenantKey>/products`) không hiện được. Trang đó lấy chi nhánh đầu danh sách (`outlets[0]`, không phải chi nhánh chính) và khách không chọn được chi nhánh.

## Outcome
Mỗi chi nhánh có tối đa 6 link (Website, Facebook, Instagram, TikTok, YouTube, Zalo, Khác) nhập ở form Sửa chi nhánh trên web. Trang shop hiện link của chi nhánh đang chọn; shop từ 2 chi nhánh đang hoạt động có chip chọn chi nhánh (mặc định chi nhánh chính, `?outlet=<id>`). Zalo là một link như các link khác; nút to "Nhắn Zalo" (từ số điện thoại) chỉ còn khi chi nhánh chưa nhập link Zalo. 12 ngôn ngữ.

## Constraints
- PR 1 (issue này): API + web + trang shop. PR 2 sau: form chi nhánh trong app iOS và Android, cùng một API.
- Chỉ thêm: 1 cột `Outlet.links` JSONB nullable; `links` tùy chọn khi tạo/sửa (vắng = giữ nguyên, app cũ không gửi). Không trả CUID. Link http/https, đã chuẩn hóa ở API.
- File migration bị hook chặn: SQL soạn ở scratchpad, owner đặt vào `prisma/migrations/`.

## Decisions
- 2026-11-25 owner đồng ý mockup (tab "Link mạng xã hội chi nhánh + chọn chi nhánh"): web trước, app ở PR 2; danh sách loại link như trên; chọn chi nhánh KHÔNG lọc sản phẩm theo tồn kho; Zalo là một loại link, nút to "Nhắn Zalo" từ số điện thoại giữ làm dự phòng khi chưa nhập link Zalo.
- 2026-11-25 "xóa hết link" lưu `[]` (không dùng `null`): Prisma cần `DbNull` để ghi null vào cột Json, `[]` đọc ra như nhau.
- 2026-11-25 chọn chi nhánh giữ trong URL bằng `history.replaceState` (không tải lại trang, không gọi lại API sản phẩm); trang server đọc `?outlet=` ban đầu.

- 2026-11-25 owner (khi xem thử): hộp thoại Sửa chi nhánh và Chọn khách quá hẹp. `Modal` có thêm `roomy` (640px thay 480px), dùng cho Sửa chi nhánh, Chi tiết chi nhánh và Chọn khách; các hộp thoại khác giữ 480px.
- 2026-11-25 file migration bị hook chặn: SQL ở `migration.sql` trong thư mục làm việc, đã chạy thử trong BEGIN/ROLLBACK. Owner đặt vào `prisma/migrations/` trước khi merge (thiếu cột thì mọi truy vấn chi nhánh trên dev lỗi).

## Open questions
Không.
