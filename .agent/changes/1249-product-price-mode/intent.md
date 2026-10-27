# Form sản phẩm: ba loại giá thuê cùng tồn tại (Theo lần / Theo mỗi ngày / Theo block ngày)

Issue: #1249 · Author: Trinh Tran · Status: chủ đã chốt lần cuối ("chốt"), 2026-10-27 · Created: 2026-10-27

> Chủ đã chốt lần cuối: 3 loại giá cùng tồn tại, THAY THẾ thiết kế "chọn 1 trong 2" của #1258/#1260 (đã merge). Nguồn: trang mockup 9b56KwErJWiGpiyFEfyEY4, tab 1 "Tạo và sửa sản phẩm", phiên bản 179.

## Problem
Form sản phẩm có quá nhiều chỗ chọn kiểu giá. Chủ shop: "đơn giản và chuẩn". Thiết kế #1258/#1260 vẫn bắt chọn 1 trong 2 (radio) giữa giá theo ngày và bảng block.

## Proposed outcome (mockup đã chốt)
Sắp dọc từ trên xuống, full width cùng lề, KHÔNG thụt lề. Mục GIÁ THUÊ có ba hàng cùng tồn tại, không radio, không công tắc, không nhãn Đang dùng / Chưa dùng:
1. "Theo lần": một ô giá (đ / lần), luôn có, là mặc định khi tạo đơn.
2. "Theo mỗi ngày": một ô giá (đ / ngày).
3. "Theo block ngày": dòng tóm tắt "N mốc · +X đ/ngày · 1 ngày A · 3 ngày B ›" hoặc "Chưa cài ›"; bấm mở màn setup block riêng.
Dưới đó: Giá bán, Cọc mỗi món, Kho, Lưu như cũ. Màn setup block: bảng Số ngày -> Giá, "+ Thêm ngày N", "Thuê quá N ngày" (hai radio), "Xem thử", "Sao chép từ sản phẩm khác", "Lưu bảng giá", "Tắt giá theo khối ngày" (xoá bảng, về "Chưa cài"). Không có "Tạo nhanh" (#1266, gộp vào PR này).
Cả ba điền được cùng lúc. Giỏ/đơn: mỗi dòng chọn cách tính qua menu giá như hiện có (mặc định Theo lần); không đổi luồng giỏ.

## Constraints
API không đổi. Lưu gửi FIXED (giá/lần) + DAILY (nếu có giá/ngày) + BLOCK (nếu có bảng) cùng lúc; cờ mặc định = FIXED. App cũ đã đối chiếu (xem spec). Admin `packages/ui` ProductForm giữ nguyên.

## Decision log
- 2026-10-27 (1..4) radio hai tầng + bảng nhúng, rồi "chọn 1 trong 2" mockup v170 (#1258, #1260): đã thay.
- 2026-10-27 (5) Chủ chốt lần cuối mockup v179: ba loại giá cùng tồn tại. Quyết định cuối, thay #1258/#1260.
