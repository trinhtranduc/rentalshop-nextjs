# Spec — Sheet hủy đơn không tự focus ô Phụ thu

Issue: #1498 · Status: accepted · Intent: ./intent.md

## Behavior

1. iOS: mở `CancelDepositOrderSheet` không bật bàn phím, ô Phụ thu không là first responder.
2. Android: mở sheet hủy không yêu cầu focus ô Phụ thu.
3. Web: hộp thoại hủy focus nút `data-autofocus` ("Giữ đơn"), không focus ô nhập (`dialogFocusSelector('button')` = `[data-autofocus]`); các hộp thoại khác vẫn focus ô nhập đầu tiên (`input, [data-autofocus]`).

## Out of scope

Quy tắc tiền, API, chuỗi, nhãn.

## Acceptance

- [x] `tests/web-orders-actions.test.ts` (`dialogFocusSelector`), iOS UI `test5oCancelWithFee` (ảnh chụp sheet không có bàn phím), Android `DepositPlanTest`
