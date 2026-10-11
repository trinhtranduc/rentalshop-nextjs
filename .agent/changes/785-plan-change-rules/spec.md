# Spec

## Who may change which plan, when (`canChangePlan`, pure, `packages/utils/src/core/plan-change-rules.ts`)
1. Input: `role`, subscription `status`, `currentPeriodEnd`, current plan `basePrice`, new plan `id` and `basePrice`, `now`.
2. `isNewPeriod` = `currentPeriodEnd` is missing or not after `now` (expired), or `status` is `TRIAL`.
3. In a new period: any role in `ADMIN`, `OPS`, `MERCHANT` may change to any plan (upgrade, same price, downgrade).
4. In the middle of a period (not a new period):
   - `MERCHANT` → refused, code `PLAN_CHANGE_ONLY_AT_NEW_PERIOD` (403).
   - `ADMIN` / `OPS`: allowed only when the new plan's `basePrice` is **higher** than the current plan's (an upgrade); otherwise refused, code `DOWNGRADE_ONLY_AT_NEW_PERIOD` (422). Same plan or same price counts as refused.
5. Returns `{ allowed: true, newPeriod, isUpgrade }` or `{ allowed: false, code, status }`.

## Where it is enforced (server)
6. `POST` / `PATCH /api/subscriptions/[id]/change-plan` and `PUT /api/merchants/[id]/plan` call `canChangePlan` before anything is written; refused → the code and status above, nothing written. The existing merchant-scope check stays first (403 for another merchant's subscription).

## Payment of an upgrade
7. `changePlan(subscriptionId, planId, interval, options)` writes the subscription update and the `Payment` in **one transaction**.
8. A `Payment` is written when `planChange.totalDue > 0` (rounded to whole VND for VND): `type PLAN_CHANGE`, `amount = totalDue`, `currency` of the plan, `method` and `transactionId` from the request, `status` `COMPLETED` for `STRIPE` else `PENDING` (same as renew), description "old plan → new plan".
9. When `totalDue > 0` the request must carry `method` (`STRIPE` | `TRANSFER` | `MANUAL`) and `transactionId`; otherwise 400 `PAYMENT_METHOD_AND_TRANSACTION_ID_REQUIRED` and nothing is written. When `totalDue` is 0 (downgrade at a new period at a lower price, or free plan) no Payment and the fields stay optional.
10. `PUT /api/merchants/[id]/plan` follows the same rules (7 to 9) and still ignores the client's `totalPrice` and `discount`.
11. A trial turned into a paid plan (`status TRIAL`, new plan `basePrice > 0`) sets `status = ACTIVE` inside `changePlan` (the `trialDays` check in the route is removed).

## Extend
12. `POST /api/subscriptions/[id]/extend` moves `currentPeriodEnd` only. It no longer writes `interval`, `intervalCount` or `amount` (the cycle and the price of the plan stay).
13. When `method = PAYMENT_RECEIVED` and the amount is above 0 it writes a `Payment` (`type PLAN_EXTENSION`, `method MANUAL`, `status COMPLETED`, `transactionId` optional, description "extension to <date>"). Any other method (`MANUAL_EXTENSION`, `ADMIN_EXTENSION`, `COMPENSATION`) writes no Payment: the extension is a free grant. The activity log keeps the amount as before.

## UI (admin)
14. Change-plan dialog: payment method and reference fields (required while the total due is above 0), the plans that cannot be chosen now (downgrade in the middle of a period) are disabled with the reason "Hạ cấp chỉ khi sang kỳ mới"; when nothing can be chosen the dialog says so. Phone treatment as in #783 (footer fixed, controls 44 px).
15. Extend dialog: the "Method" help text says that only "Payment Received" records a payment; the other methods are free grants.
16. `MerchantPlanManagement` passes the payment fields through to `PUT /api/merchants/[id]/plan`.
17. Errors: the three new codes in `errors.ts` and `locales/{en,vi,ja,ko,zh}/errors.json`.

## Not changed
Renew (already pays and prices, #779), add-ons and modules (#782), Lemon Squeezy and Sepay amounts.
