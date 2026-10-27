# Spec

- iOS `InstallmentCardView.make`: bỏ khung viền/bo góc, bỏ inset ngang của holder và của nội dung; chỉ giữ khoảng cách dọc. Lề ngang do stack cha (DS.Spacing.lg) quyết định, giống các hàng khác.
- Android `InstallmentCard`: bỏ border/padding 14dp, giữ padding dọc.
- Web: không đổi (trang toàn thẻ).
- Không đổi API, chuỗi, id kiểm thử (`deposit.card`, `deposit.stage.*`).
