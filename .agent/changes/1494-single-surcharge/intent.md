# Một ô Phụ thu ở Nhận trả, tiêu đề nút xác nhận ngắn

Issue: #1494 · Author: Trinh Tran · Status: accepted · Created: 2026-11-08

## Problem

Sheet Nhận trả có hai ô tiền riêng, "Phí trễ" (`lateFee`) và "Phụ phí" (`damageFee`); chủ shop chỉ cần một khoản và khi hủy đơn
đã gọi khoản shop giữ là "phụ thu". Nút xác nhận quá dài: "Taken back · give back $700,000" / "Đã nhận · trả $700,000".

## Proposed outcome

- Sheet (iOS, Android) và hộp thoại (web) Nhận trả có **một ô "Phụ thu"**, điền sẵn tổng `lateFee + damageFee`.
- Lưu khi tổng đổi: `damageFee = tổng`, `lateFee = 0`. Tổng không đổi thì không gửi gì.
- Số thu/hoàn khi trả không đổi. Nhãn "Phụ phí" ("Extra fee") của dòng phí ở chi tiết đơn thành "Phụ thu" ("Surcharge").
- Nút xác nhận chỉ số tiền: "Give back $700,000" / "Trả khách $700.000", "Collect more $50,000" / "Thu thêm $50.000"; không có khoản nào: "Taken back" / "Đã nhận".

## Affected users and systems

Mọi role thao tác Nhận trả. iOS (`OrderHandOverSheetViewController`, `OrderDetailViewController`, `OrderDetailLogic`), Android
(`OrderDetailV2Sheets`, `OrderDetailV2ViewModel`, `OrderDetailV2Screen`), web (`orders/detail/dialogs.tsx`, `actions-model.ts`,
`locales/{en,vi}/orders.json`). API không đổi.

## Constraints

- API vẫn hai trường; app cũ trên `main-real` đọc cả hai và cộng lại, nên tổng và số thu/hoàn giống nhau.
- Chồng lên #1490 (cùng sheet). Không đổi nhãn toàn cục của "Phụ phí" ở lịch sử thay đổi và báo cáo (test hiện có khóa các nhãn đó).
- Cùng hành vi ở ba nơi (`mobile-parity`). Chuỗi mới có en, vi.

## Open questions

- Dòng "Phí trễ" ở chi tiết đơn vẫn hiện cho đơn cũ có phí trễ. Có gộp luôn hai dòng chi tiết thành một "Phụ thu" không? Chưa làm.

## Decision log

- 2026-11-08 — Gộp thành một ô "Phụ thu", áp dụng iOS + Android + web (Trinh Tran).
- 2026-11-08 — Tiêu đề nút chỉ số tiền (Trinh Tran).
