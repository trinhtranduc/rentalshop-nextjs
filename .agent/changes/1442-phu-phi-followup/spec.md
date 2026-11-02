# Spec: phụ phí, phần còn lại

Issue: #1442 · Intent: ./intent.md

## In scope

- `GET /api/orders/export`, `format=excel` và `csv`: tiêu đề cột 13 từ `Tiền đền bù` thành `Phụ phí`. File xuất chỉ có một bộ tiêu đề tiếng Việt.
- `amount.tooltips.damageFee`, `vi` và `en`: bỏ "trả muộn" / "returned late". `ja`, `ko`, `zh` không có key.
- `docs/crisp-hugo-anyrent.md:31,47,61,69`: "phụ phí" thành "dịch vụ thêm".
- `.agent/api-changes/LOG.md`: thêm dòng #1442, dòng #1433 sang `dev`.

## Out of scope

Trang marketing, ghi chú "Hư hỏng", `locales/vi/plans.json`, chuỗi iOS và Android (không có cụm này).

## Acceptance

- Test đọc file Excel và CSV thật do route tạo: đủ 16 tiêu đề đúng thứ tự, cột 13 là `Phụ phí`, số liệu đúng chỗ.
- Test tooltip `vi`, `en`.
- Xuất file từ API local rồi mở file kiểm tiêu đề.
