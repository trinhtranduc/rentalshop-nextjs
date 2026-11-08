# Spec — Ước tính gói tạo tay và gia hạn sau hotfix

Issue: #1511 · Status: accepted · Intent: ./intent.md · Nối tiếp spec của #1505

## Behavior

1. `subscription_created` có `metadata.status` khác `TRIAL` (không phân biệt hoa thường), `metadata.amount` > 0, tiền tệ VND (hoặc không ghi) và chưa có dòng
   thanh toán của cùng gói trong 5 phút quanh nó: sự kiện `NEW_SUBSCRIPTION`, tiền = `amount`, ngày = lúc ghi nhật ký (giờ Việt Nam).
2. `subscription_extended` và `MANUAL_EXTENSION` có `createdAt` >= 07/11/2026 14:37 (`PENDING_COUNTS_BEFORE`): bỏ. Từ mốc đó mọi lần gia hạn có thu tiền đều ghi `Payment`
   (nằm ở "Tiền đã nhận").
3. Đổi gói (`subscription_plan_changed`, `plan_changed`) và dòng `PENDING` giữ nguyên như #1505.

Ca ví dụ (gói 79.000/tháng):
| Ca | Nhật ký | Ước tính |
|---|---|---|
| J | 10/04 tạo tay, ACTIVE, 79.000 | 79.000 vào tháng 4 |
| K | tạo tay TRIAL / không có số tiền / 0 / USD | 0 |
| K2 | tạo tay có `Payment` trong 5 phút | 0 |
| L | gia hạn có số tiền 100.000, tạo đúng mốc hotfix hoặc sau, không có `Payment` | 0 |
| L2 | cùng gia hạn, tạo 1 phút trước mốc | 100.000 |
| L3 | đổi gói 09/11 `amountDueRounded` 50.000 + tạo tay ACTIVE 79.000 cùng tháng | 129.000 (mốc chỉ áp cho gia hạn) |

## Out of scope

Phân biệt gói tặng với gói thu tiền; đổi UI (`estimated.months` và `total` đã có); đổi gói; ghi dữ liệu.

## API and data

`GET /api/admin/revenue/monthly`: `estimated.items[].kind` có thêm giá trị `NEW_SUBSCRIPTION` (additive). Đọc thêm loại `subscription_created` từ `SubscriptionActivity`. Không migration.
