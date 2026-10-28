# Chi tiết đơn: cọc theo giai đoạn chia section phẳng, không card

Issue: #1256 · Status: done (PR #1257, đã merge vào dev 2026-10-27) · Created: 2026-10-27

> Ghi bổ sung sau khi release-review phát hiện thiếu thư mục này. Nội dung chỉ ghi lại điều đã làm. Thư mục liên quan: `.agent/changes/1246-order-deposit-card-width/` (ảnh chụp và spec được cập nhật ở đó).

## Problem
#1248 đã merge bản thẻ cọc phẳng. Chủ xem trên máy, muốn thiết kế dễ nhìn hơn, rồi đổi ý: không dùng card, chia section phẳng cùng kiểu tiêu đề "ITEMS · 2" để có nhiều chỗ.

## Proposed outcome
Section "THU CỌC THEO GIAI ĐOẠN" (huy hiệu và nút Sửa cùng hàng tiêu đề), thanh tiến độ, hai số Đã thu / Còn phải thu, danh sách giai đoạn có đường kẻ mảnh, giai đoạn trễ nền đỏ nhạt. iOS là chuẩn, Android theo, web giữ card.

## Affected users and systems
Mọi vai trò mở chi tiết đơn có cọc theo giai đoạn; iOS, Android. Web giữ nguyên.

## Constraints
Không đổi API, trường, chuỗi, id kiểm thử. Không đụng giỏ hàng (#1245).

## Decision log
- 2026-10-27 — bỏ card, chia section phẳng theo kiểu "ITEMS · 2" (chủ).
