# Spec

Issue: #1380

## Quy tắc

`DepositPlanLogic.blocksHandOver` đúng khi tất cả cùng đúng:

- đơn có plan (`hasDepositPlan == true`),
- trạng thái RESERVED,
- `unpaidBeforePickup(stages)` khác rỗng (cùng điều kiện với `unpaidExplicitStages` của API).

Khi đúng: thanh dưới của chi tiết đơn giữ nút "In", thay nút Giao đồ bằng dòng chữ "Còn đợt chưa thu" (không bấm được, cả khi `due` bằng 0). Khi sai: không đổi gì.

## Chuỗi

| Khoá | vi | en |
|---|---|---|
| iOS `order.detail.stageUnpaid`, Android `detail_stage_unpaid` | Còn đợt chưa thu | Deposit stage unpaid |

## Không đổi

`handOver`/`due`/`collectNow`, sheet giao đồ, `EditOrderSheet`, ảnh chia sẻ, API, web. Giữ `presentUnpaidIfNeeded` / `showUnpaid`: chúng còn xử lý trường hợp màn hình cũ bị API từ chối.
