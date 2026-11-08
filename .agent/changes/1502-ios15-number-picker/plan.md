# Plan — Hộp thoại nhập số trên iOS 15

Issue: #1502 · Status: accepted · Spec: ./spec.md

1. `NumberPickerViewController.instance()`: nhánh iOS < 16 dùng `.large()` thay `.medium()`.
2. Xác minh: build iOS, UI test cart giảm giá trên iOS hiện có. Phần iOS 15 nhờ chủ shop thử trên iPad.

Rollback: revert PR.
