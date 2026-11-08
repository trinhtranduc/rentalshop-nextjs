# Plan — Sheet hủy đơn không tự focus ô Phụ thu

Issue: #1498 · Status: accepted · Spec: ./spec.md

1. Web: `dialogFocusSelector` trong `actions-model.ts`, prop `initialFocus` của `ActionDialog`, `CancelWithKeptDialog` truyền `button`.
2. iOS: bỏ `viewDidAppear` của `CancelDepositOrderSheet`. Android: bỏ `FocusRequester` và `LaunchedEffect` ở `CancelDepositOrderSheet`.
3. Xác minh: web suites, Android unit tests, UI iOS `test5oCancelWithFee` + ảnh chụp.

Rollback: revert PR.
