# "Khách đưa lúc nhận đồ" và dòng thế chân cạnh "Thu khi giao" (chi tiết đơn, ảnh chia sẻ)

Issue: #1368 · Author: Trinh Tran · Status: done · Created: 2026-10-30 · Refs #1350, #1345

## Problem

Phát hiện F1 của #1350. Đơn thuê có thế chân BẰNG TIỀN (`securityDeposit > 0`, thu lúc giao đồ, trả khi trả đồ; `apps/api/lib/order-balance.ts:38`): chi tiết đơn ghi "Thu khi giao" 575.000 khi còn đợt cọc chưa thu nhưng 875.000 (đã gồm thế chân) khi đã thu hết: số nhảy chỉ vì thu thêm một đợt. Ảnh chia sẻ luôn ghi 575.000 và thế chân là dòng riêng, không có số khách thật sự đưa lúc nhận đồ.

## Proposed outcome

Chủ shop chốt "cách 3" (2026-10-30). Với đơn thuê có thế chân tiền > 0, chi tiết đơn và ảnh chia sẻ (iOS, Android) hiện: Tổng tiền thuê → Cọc → **Tiền thuê còn lại, thu khi giao** (số "Thu khi giao" cố định theo kế hoạch, không cộng thế chân) → **Thế chân, thu khi giao** → **Khách đưa lúc nhận đồ** (= hai dòng trên). Cùng một hàm thuần `ShareMoneyRule.cashAtHandover`. Không thế chân tiền: như hiện nay.

## Affected users and systems

Chủ shop, nhân viên xem chi tiết đơn và gửi ảnh cho khách. iOS và Android. Không API, không web.

## Constraints

- Không đổi `handOver` / `collectNow`, nút "Giao đồ · thu …", sheet giao hàng, `EditOrderSheet`, API, web, phiếu in.
- Số trên ảnh không đổi theo trạng thái đơn (#930).
- App cũ giữ số cũ đến khi cập nhật.

## Open questions

- Nút "Giao đồ · thu …" khi còn đợt chưa thu (chủ shop còn một câu hỏi riêng): không đụng ở đây.

## Decision log

- 2026-10-30 — Cách 3 (chủ shop). Nhãn dòng 3 chỉ đổi khi có dòng 4 (thế chân tiền).
- 2026-10-30 — Thế chân chỉ là giấy tờ: giữ dòng giấy tờ như nay, không dòng tiền, không dòng 5.
