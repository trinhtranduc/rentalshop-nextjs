# Spec — Ước tính doanh thu gói cũ

Issue: #1505 · Status: accepted · Intent: ./intent.md

## Behavior

Một "sự kiện ước tính" gồm: ngày (giờ Việt Nam, `timezone-dates`), shop, số tiền VND, loại.

1. Gia hạn từ trang admin con (`subscription_extended`, có `metadata.amount` > 0, phương thức không miễn phí) mà **chưa có** dòng thanh toán
   của cùng gói trong 5 phút quanh nó: một sự kiện loại `EXTENSION`, tiền = `amount`, ngày = lúc ghi nhật ký.
2. Gia hạn từ trang admin (`MANUAL_EXTENSION`, nhật ký không lưu tiền) chưa có dòng thanh toán: `EXTENSION`, tiền ước tính = giá một kỳ của gói ÷ số tháng của
   kỳ × số tháng gia hạn (nhật ký có `months`); không có `months` thì theo số ngày gia hạn ÷ số ngày của kỳ; gói không có giá thì giá gói/tháng
   theo cách hộp thoại Extend. Không tính được thì bỏ.
3. Phương thức `ADMIN_EXTENSION` và `COMPENSATION`: miễn phí, 0.
4. Đổi gói (`subscription_plan_changed`, `plan_changed`) có `metadata.planChange.amountDueRounded` (hoặc `amountDue`) > 0 và chưa có dòng
   thanh toán gần đó: `PLAN_CHANGE`, tiền = số đó, ngày = lúc ghi nhật ký.
5. Dòng thanh toán loại gói (`SUBSCRIPTION_PAYMENT`, `PLAN_EXTENSION`, `PLAN_CHANGE`), phương thức `TRANSFER`/`MANUAL`/`CASH`, trạng thái `PENDING`,
   tạo trước 7/11/2026 14:37 (giờ Việt Nam, lúc hotfix #1486 lên): sự kiện `PENDING_PAYMENT`, tiền = số lưu, ngày = `processedAt` hoặc `createdAt`.
   Sau mốc đó `PENDING` là chuyển khoản của shop đang chờ xác nhận, không tính.
6. Có dòng thanh toán trong 5 phút quanh nhật ký (bất kỳ trạng thái, hoặc `transactionId` = `backfill-1486-act-<id>`): bỏ nhật ký (spec 1, 2, 4).
7. Tiền tệ khác VND: bỏ khỏi ước tính.
8. Báo cáo: `estimated = { total, count, months[12] {month,total,count}, items[≤10 mới nhất trong kỳ] {at,dateKey,merchant,kind,amount} }`; `total/count` theo kỳ
   được chọn (tháng hoặc năm), `months` theo năm. Ngày tính theo ngày Việt Nam.
9. `received`, `daily`, `byChannel`, `months`, `latest` không đổi. Ước tính không cộng vào `received.total`.
10. Admin web: dưới "Tiền đã nhận" có dòng "Ước tính (chưa có dòng thanh toán)" khi `estimated.count > 0`, kèm cột/ghi chú theo tháng; không hiện khi 0.
11. Chỉ ADMIN và OPS (như hiện tại).

Ca ví dụ (giá Basic 79.000/tháng, một kỳ 1 tháng):
| Ca | Nhật ký | Ước tính |
|---|---|---|
| A | 05/08 gia hạn tay 3 tháng, không có dòng thanh toán | 237.000 vào tháng 8 |
| B | gia hạn "Admin Extension" | 0 |
| C | 03/10 gia hạn có dòng thanh toán thật 79.000 | 0 (đã tính ở "Tiền đã nhận") |
| D | gói dùng thử | 0 |
| E | 10/09 gia hạn 12 tháng, gói năm 790.000 | 790.000 vào tháng 9 |
| F | 03/10 và 03/11 mỗi lần 1 tháng | 79.000 tháng 10, 79.000 tháng 11 |
| G | nâng gói 15/09 `amountDueRounded` 150.000, không có dòng | 150.000 vào tháng 9 |
| H | dòng `PENDING` chuyển khoản tạo 02/11 (trước mốc), 300.000 | 300.000 vào tháng 11 |
| I | dòng `PENDING` tạo sau mốc | 0 |

## Out of scope

Chia doanh thu theo kỳ; ghi dữ liệu; đổi script nhập bù; tiền ngoài VND; hoàn tiền cũ.

## API and data

`GET /api/admin/revenue/monthly`: thêm `estimated` (additive). Đọc `SubscriptionActivity`, `Payment`, `Subscription`, `Plan.basePrice`. Không migration, không ghi.
Hàm ước tính (`estimateFromSubscription`, `estimateAmount`) chuyển sang `packages/utils` để route và script dùng chung.

## Acceptance

- [ ] Mỗi dòng Behavior và ca A-I có test
- [ ] Test chạy đúng dưới `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`
- [ ] Script nhập bù vẫn xanh (`manual-extension-backfill.test.ts`)
- [ ] Dòng `planned` rồi `dev` trong `.agent/api-changes/LOG.md`; bảng `## API compatibility` trong PR
- [ ] Chạy thử trên API local với nhật ký gieo sẵn
