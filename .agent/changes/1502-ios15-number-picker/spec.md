# Spec — Hộp thoại nhập số trên iOS 15

Issue: #1502 · Status: accepted · Intent: ./intent.md

## Behavior

1. iOS 16 trở lên: chiều cao hộp thoại nhập số không đổi (tự đo theo nội dung).
2. iOS 15: hộp thoại nhập số có detent duy nhất `.large()`, mở ở `.large`, nên cụm `%` / số tiền và nút Xác nhận đều thấy và bấm được, kể cả trên iPad nằm ngang.

## Out of scope

Bố cục bên trong hộp thoại, chuỗi, API.

## Acceptance

- [x] Build iOS và test đơn vị `DepositPlanTests` + `OrderDetailLogicTests` (85 xanh); nhánh iOS 16+ không đổi dòng nào
- [ ] UI test giảm giá trên iOS hiện có: chưa chạy lại sau thay đổi này
- [ ] iOS 15 trên iPad: chờ chủ shop xác nhận (máy dev không có runtime iOS 15)
