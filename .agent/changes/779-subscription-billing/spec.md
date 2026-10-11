# Spec

1. `calculateRenewalTotal({ basePrice, addonMonthlyTotal = 0, interval, currentPeriodEnd, now })` in `packages/utils/src/core/subscription-billing-calculations.ts`:
   - `expired = currentPeriodEnd <= now` (or missing); `periodStart = expired ? now : currentPeriodEnd`; `periodEnd = addMonthsInTimeZone(periodStart, months)`.
   - `planPrice = calculateSubscriptionPrice({basePrice}, interval)`; `addonPrice` = same formula on `addonMonthlyTotal`; `totalDue = planPrice + addonPrice`; returns months, interval, discount %, expired, dates.
2. `renewalIntervalForMonths(1|3|6|12)` → monthly / quarterly / semi_annual / annual; other values → null.
3. `calculatePlanChangeTotal` also returns `newPeriodStart = now`, `newPeriodEnd = addMonthsInTimeZone(now, months)` (additive).
4. `POST /api/subscriptions/[id]/renew` (body unchanged: `duration` 1/3/6/12, method, transactionId…):
   - MERCHANT may renew only its own subscription (403 otherwise; was: any id).
   - `duration` not in 1/3/6/12 → 400 `INVALID_DURATION`.
   - Price from the plan's `basePrice` with rule 1 (was `amount × duration` with 5/10/20%). Payment amount = `totalDue`; period from rule 1; subscription `amount`, `interval`, `intervalCount`, `period`, `discount` set to the renewed cycle.
   - Response adds `renewal` (the calculation). Existing keys unchanged.
5. `db.subscriptions.findById` includes `plan.basePrice` and `plan.currency`, so `extend/calculate` and `extend` stop pricing 0 and use the plan currency.
6. Extend (calculate + write): the extension is counted from `max(currentPeriodEnd, now)` (expired → from now), same as the admin extend route.
7. `changePlan()`:
   - computes `calculatePlanChangeTotal` with the old subscription before the update;
   - period = `[now, addMonthsInTimeZone(now, months)]` (was now + 30/90/180/365 × 24h);
   - updates `amount` (new cycle price), `interval`, `intervalCount` (months), `period` (months), `discount` (%), `currency` (plan currency);
   - returns `planChange` (credit, amountDue, days) in the result (additive); activity metadata records it.
8. UI uses the same functions: `ManualRenewalModal` (price, discount, end date preview), `SubscriptionChangePlanDialog` (credit, total, dates on the Vietnam day), extend dialog auto price follows the selected cycle; `SubscriptionList` formats money in the subscription currency.
9. Not changed: Lemon Squeezy / Sepay amounts (follow-up), addon prices (#780), webhook flows.
