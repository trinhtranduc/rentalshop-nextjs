# Web: nhiều giỏ hàng bằng tab trên trang Tạo đơn

Issue: #1293 · Status: draft · Created: 2026-10-28

## Problem
Trang Tạo đơn web (apps/client) chỉ có một giỏ. Khách thứ hai tới là phải bỏ giỏ đang làm; tải lại trang là mất hết. App iOS/Android đã có nhiều giỏ (#1079).

## Proposed outcome
Owner chốt phương án B (mockup tab "Web: nhiều giỏ hàng"): thanh tab giỏ ngang trên cùng trang Tạo đơn, phủ hai cột, rộng 48px. Quy tắc lấy từ app, iOS là chuẩn: tối đa 10 giỏ, tên = tên khách hoặc "Giỏ k", avatar chữ đầu của từ đầu và từ cuối, tóm tắt "n món · tiền", chuyển giỏ không hỏi, xoá giỏ luôn hỏi, giỏ trống duy nhất không lưu.

## Constraints
Không đổi API, mobile. Giữ bố cục #1292 (ngày thuê ở cột phải). Màn < 1100px vẫn đúng. Đơn giản: không đặt tên giỏ tay, không kéo thả, không đồng bộ giữa máy.

## Decision log
- 2026-10-28 — B: tab ngang trên cả hai cột (owner)
- 2026-10-28 — mặc định, chờ owner đổi: (1) lưu giỏ vào localStorage `anyrent.draftCarts.<userId>`; (2) tạo đơn xong vẫn đóng biên lai rồi sang trang đơn, giỏ vừa tạo bị đóng; (3) vào từ "Kiểm tra còn hàng" thì giỏ có món → mở giỏ mới, giỏ trống → dùng giỏ đó; (4) Sửa đơn không có tab, không đọc/ghi giỏ nháp
