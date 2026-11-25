# Lịch đặt thuê trên trang shop báo còn / hết

Issue: #1646 · Author: Trinh · Status: in-progress · Created: 2026-11-25

## Problem

Lịch đặt thuê trên trang shop công khai không báo ngày nào còn hay hết (bỏ ở #1174). Một số shop muốn khách thấy còn mấy cái mỗi ngày và tự bật / tắt.

## Proposed outcome

- Công tắc mới `Merchant.showPublicStock` (mặc định tắt) "Hiện còn / hết trên lịch đặt thuê", ngay dưới "Hiện giá trên trang shop" trong Cài đặt → Trang shop công khai.
- Bật: lịch đặt thuê hiện số cái còn dưới mỗi ngày (chi nhánh đang chọn), "Hết" cho ngày hết; ngày hết vẫn chọn được và vẫn gửi yêu cầu, có dòng báo vàng.
- Tắt: API public không trả số còn, lịch như hiện nay.

## Affected users and systems

MERCHANT (bật / tắt), khách công khai. `apps/api` (settings merchant, users profile, public products, public availability), `apps/client`, `packages/utils`, `prisma` (1 cột), locales ×12. Không iOS / Android.

## Constraints

Migration chỉ thêm, có default. Tắt thì không lộ tồn kho. Ngày theo giờ Việt Nam. Booking POST vẫn không kiểm tra hàng (#1174). Tìm bằng ảnh và lưới sản phẩm vẫn không có Còn / Hết.

## Open questions

None. Owner (25/11) "làm giúp tôi" sau mockup với 4 đề xuất: mặc định tắt, hiện số, không chặn ngày hết, chỉ web.

## Decision log

- 2026-11-25 — Công tắc nằm dưới "Hiện giá" ở tab Trang shop công khai; mờ khi "Nhận đặt online" tắt (owner).
- 2026-11-25 — Yêu cầu đặt thuê chưa xác nhận chưa trừ số còn (cùng cách tính với lịch của app shop).
