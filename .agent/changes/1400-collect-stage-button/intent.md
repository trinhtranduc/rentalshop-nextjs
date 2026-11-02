# Nút "Thu giai đoạn N" thay dòng "Còn đợt chưa thu"

Issue: #1400 · Author: Claude · Status: accepted · Created: 2026-10-31

Sau #1389 đơn còn đợt chưa thu chỉ có dòng chữ không bấm được, còn nút thu ở thẻ cọc có thể nằm dưới màn hình. Chủ shop muốn dòng đó thành nút thật. Không đổi API, quy tắc thu, thẻ cọc.

## Decision log

- 2026-10-31 — Chủ shop duyệt (qua coordinator). Không kiểm tra vai trò. Trường hợp `blocksHandOver` đúng mà không có đợt thu được (dữ liệu lệch) giữ dòng chữ cũ.
