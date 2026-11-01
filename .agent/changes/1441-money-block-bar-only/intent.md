# Bỏ nút "Thu giai đoạn N" trong khối THANH TOÁN, giữ nút ở thanh dưới

Issue: #1441 · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-11-01

## Problem

Sau #1435, màn chi tiết đơn có hai nút "Thu giai đoạn N" cùng một giai đoạn: một nút nhạt trong khối THANH TOÁN, một nút chính ở thanh dưới (#1400). Chủ sản phẩm muốn giữ một nút.

## Proposed outcome

Chỉ còn nút ở thanh dưới, trên iOS và Android. "Sửa" trong khối giữ nguyên. Không tiệm nào mất đường thu.

## Affected users and systems

Mọi vai trò xem đơn có cọc theo giai đoạn trên iOS và Android. Không đổi API, không đổi web.

## Constraints

- Nếu có trạng thái mà bỏ nút trong khối làm mất đường thu thì giữ nút ở đúng trạng thái đó. Kiểm tra trong #1441: không có trạng thái nào.
- Sửa kèm `test7qStagedDeposit` lỗi thời từ #1400, không giảm điều nó kiểm.
- Sửa kèm `api-local.sh`: `--build` để lại file dist đang track bị sửa.

## Decision log

- 2026-11-01: chủ sản phẩm duyệt bỏ nút trong khối, giữ nút ở thanh dưới.
