# Spec #796

- `pickEditableSubscriptionFields(body)` (`apps/api/lib/subscription-update.ts`) giữ: `status`, `currency`, `cancelReason`, `cancelAtPeriodEnd`, `amount` (số hữu hạn), `currentPeriodStart`, `currentPeriodEnd` (chuỗi ISO → `Date`, bỏ nếu không phải ngày).
- `PUT /api/subscriptions/[id]` dùng nó cho cả nhánh có đổi `planId` (sau `changePlan`) và nhánh không đổi gói. `merchantId`, `planId`, `interval*`, `discount`, `savings` và field lạ bị bỏ qua.
- Test: `tests/api/subscription-update-fields.test.ts`.
