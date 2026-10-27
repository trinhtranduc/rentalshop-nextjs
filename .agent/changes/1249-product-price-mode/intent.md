# Form sản phẩm: Thuê theo lần + chọn 1 trong 2 (Thuê theo ngày | Giá theo khối ngày)

Issue: #1249 · Author: Trinh Tran · Status: chủ đã chốt mockup (nói "đồng ý") 2026-10-27 · Created: 2026-10-27

> Chủ đã chốt mockup (trang mockup 9b56KwErJWiGpiyFEfyEY4, tab "Tạo và sửa sản phẩm", phiên bản 170). Thiết kế này THAY THẾ mọi hướng trước, kể cả radio hai tầng + bảng block nhúng đã merge ở PR #1258.

## Problem
Form sản phẩm có quá nhiều chỗ chọn kiểu giá ("Khi tạo đơn, mặc định tính", hai ô giá song song, nhãn Đang dùng / Chưa dùng, bảng block nhúng). Chủ shop: "đơn giản và chuẩn".

## Proposed outcome (mockup đã chốt)
Sắp dọc, không thụt lề, mọi thẻ full width cùng lề:
1. Mục GIÁ THUÊ: ô "Thuê theo lần" (đ / lần), luôn có, là mặc định khi tạo đơn.
2. Nhóm "Giá nhiều ngày (chọn 1 trong 2)": radio "Thuê theo ngày" (chọn thì ô một giá đ / ngày hiện NGAY DƯỚI, nối liền cùng viền) hoặc "Giá theo khối ngày" (chọn thì thẻ tóm tắt "N mốc · +X đ/ngày · 1 ngày A · 3 ngày B ›" hiện ngay dưới, bấm mở MÀN RIÊNG). Chưa có bảng mà chọn radio này: mở thẳng màn setup; huỷ/quay lại không lưu thì trở về lựa chọn trước.
3. Giá bán, Cọc mỗi món, Kho, nút Lưu như cũ.
4. Màn setup block riêng: bảng Số ngày -> Giá, "+ Thêm ngày N", "Thuê quá N ngày" (Cộng thêm mỗi ngày / Giữ nguyên giá khối cuối), "Xem thử N ngày", "Tạo nhanh", "Sao chép từ sản phẩm khác", "Lưu bảng giá", "Tắt giá theo khối ngày" (= quay lại Thuê theo ngày). Không còn danh sách 3 radio "cách tính mặc định".
5. Không còn công tắc "Khi tạo đơn, mặc định tính", không nhãn "Đang dùng / Chưa dùng", không hai ô giá song song. Mặc định khi tạo đơn luôn là Theo lần; giỏ/đơn giữ như cũ.

## Constraints
App cài trên main-real đọc/ghi cùng payload FIXED / DAILY / BLOCK. Không đổi API, schema, field. Admin `packages/ui` ProductForm giữ nguyên.

## Decision log
- 2026-10-27 (1) radio hai tầng + bảng nhúng (#1258, đã merge) -> thay.
- 2026-10-27 (2..3) các hướng trung gian (đã bỏ).
- 2026-10-27 (4) Chủ chốt mockup v170 ("đồng ý"). Quyết định cuối. Thay UI của #1258.
