# Spec — Hộp thoại nhập số trên iOS 15

Issue: #1502 · Status: accepted · Intent: ./intent.md

## Behavior

1. iOS 16 trở lên: chiều cao hộp thoại nhập số không đổi (tự đo theo nội dung).
2. iOS 15: hộp thoại nhập số có detent duy nhất `.large()`, mở ở `.large`, nên cụm `%` / số tiền và nút Xác nhận đều thấy và bấm được, kể cả trên iPad nằm ngang.

## Out of scope

Bố cục bên trong hộp thoại, chuỗi, API.

## Acceptance

- [x] iOS 16+ chạy như cũ (UI test cart giảm giá trên iOS 26: `test8lCartDiscountCap`)
- [ ] iOS 15 trên iPad: chờ chủ shop xác nhận (máy dev không có runtime iOS 15)
