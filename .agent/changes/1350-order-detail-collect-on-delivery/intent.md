# Chi tiết đơn: "Thu khi giao" bằng số thu thật lúc giao

Issue: #1350 · Author: Trinh Tran · Status: done · Created: 2026-10-30

## Problem

Đơn thuê có nhiều đợt cọc, còn đợt chưa thu: mục thanh toán của chi tiết đơn ghi "Thu khi giao" 920.000, thẻ đợt cọc và ảnh chia sẻ (#1345) ghi 575.000. 920.000 là "còn phải thu tổng" (tổng − tiền đã thu) mang nhãn "Thu khi giao". Đợt chưa thu luôn phải thu TRƯỚC khi giao (API 400 `INSTALLMENT_UNPAID_AT_PICKUP`), nên số khách đưa thêm lúc nhận đồ là 575.000.

## Proposed outcome

Quyết định của chủ shop (cách A): dòng "Thu khi giao" của chi tiết đơn chỉ hiện 575.000, bằng thẻ đợt và ảnh chia sẻ. Không thêm dòng "còn phải thu tổng". Dùng chung hàm thuần `ShareMoneyRule.collectOnDelivery` của ảnh chia sẻ.

## Affected users and systems

Chủ shop và nhân viên xem chi tiết đơn thuê đã đặt (RESERVED) có nhiều đợt cọc. iOS và Android. Không API.

## Constraints

- Không đổi API, không đổi ảnh chia sẻ, không đổi chuỗi.
- Số tiền app đề nghị thu khi bấm "Giao hàng" (`handOver(...).due` / `collectNow`) KHÔNG đổi.
- Đơn một lần cọc, đơn không cọc, đơn bán, đơn đã lấy/trả: giữ nguyên.
- App cũ trên store giữ số cũ đến khi cập nhật.

## Open questions

- (đã chốt) cách A: đổi số, không đổi nhãn.

## Decision log

- 2026-10-30 — Tách số HIỂN THỊ khỏi `handOver`: thêm `OrderDetailLogic.collectOnDeliveryShown`, chỉ dòng "Thu khi giao" của mục thanh toán dùng nó. Nút "Giao đồ · thu X" và sheet giao hàng vẫn dùng `handOver`.
