# Spec — Đổi nhãn "Phí hư hỏng" thành "Phụ phí"

Issue: #1433 · Status: in-progress · Intent: ./intent.md

## Behavior

1. Chuỗi hiển thị tiếng Việt trên iOS, Android, web không còn "phí hư hỏng" hay "phí hư hại".
2. Cách diễn đạt: "Phụ phí", "Phụ phí:", "Phí trễ + phụ phí", "Phụ phí, trễ hạn", "Phụ phí, trễ", "Thu phụ phí", "Dự kiến thu phụ phí khi trả hàng", "Trễ hạn {late} · Phụ phí {damage}".
3. Tiếng Anh cùng nghĩa: "Extra Fee", "Extra Fee:", "Extra fee", "Late + extra fees", "Extra and late fees", "Extra fee collected", "Expected extra fee at return", "Late {late} · Extra {damage}".
4. Biên lai: iOS `PreviewViewController.swift` in "Phụ Phí" / "Extra Fee"; web `web.receipt.rows.damageFee` là "Phụ phí" / "Extra fee".
5. API vẫn gửi "Thu phí hư hỏng" và "Ước tính thu phí hư hỏng khi trả hàng". App mới và web nhận các câu đó và hiển thị theo nhãn mới, kể cả từng phần của dòng `MULTIPLE`.
6. Web ja, ko, zh hiện "Extra fee" qua tiếng Anh, không thêm bản dịch riêng.

## Out of scope

- Câu API, tên key, `damageFee`, `damageNotes`, cơ sở dữ liệu.
- Trang marketing, tài liệu `docs/`, hồ sơ `.agent/changes/` cũ, chú thích trong code.
- Mục ghi chú "Hư hỏng", "Ghi chú hư hỏng", cột Excel "Tiền đền bù".
- Thêm dòng phí vào ảnh chia sẻ hay bản in Android (hiện không có dòng này).

## API and data

Không đổi. Xem bảng ở issue #1433.

## Acceptance

- [ ] Hành vi 1, 2, 3, 5, 6: `tests/phu-phi-wording.test.ts`.
- [ ] Hành vi 2, 3, 5 trên iOS: `CalendarOverviewSettingsV2Tests`, `OverviewDashLogicTests`.
- [ ] Hành vi 2, 3, 5 trên Android: `Issue484ResourcesTest`, `EventReasonTest`.
- [ ] Hành vi 4: xem biên lai web, đọc code iOS, chạy `web-receipt-model`.
- [ ] Xem một màn có khoản phí trên iOS, Android, web.
