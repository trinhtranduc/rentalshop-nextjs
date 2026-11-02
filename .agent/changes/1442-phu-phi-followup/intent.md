# Phụ phí, phần còn lại: cột Excel, tooltip, tài liệu Hugo

Issue: #1442 · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-11-01

## Problem

#1433 đổi "Phí hư hỏng" thành "Phụ phí" trên màn hình. Còn ba chỗ lệch: cột "Tiền đền bù" trong file xuất đơn, tooltip web nói "trả muộn" dù đã có phí trễ riêng, và `docs/crisp-hugo-anyrent.md` dùng "phụ phí" cho dịch vụ thêm của gói.

## Proposed outcome

File xuất đơn gọi cột là "Phụ phí". Tooltip không còn nói trả muộn. Hugo gọi phần mua thêm của gói là "dịch vụ thêm". Dòng #1433 trong `LOG.md` chuyển sang `dev`.

## Affected users and systems

Chủ tiệm xuất file đơn (iOS, Android, web). Người xem tooltip web. Hugo trả lời khách.

## Constraints

- Không đổi dữ liệu, thứ tự cột, key `damageFee`.
- Trang marketing và ghi chú "Hư hỏng" giữ nguyên, theo quyết định của chủ sản phẩm.
- `locales/vi/plans.json:224` giữ nguyên, vì chỉ hiện ở trang bảng giá.

## Decision log

- 2026-11-01: chủ sản phẩm duyệt bốn việc này. Rà soát tương thích trong #1442: không có code nào đọc tiêu đề cột.
