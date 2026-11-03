# Spec — Manual upgrade and renewal count from the current end

Issue: #1470 · Status: in progress · Intent: ./intent.md

## Behavior

1. `calculatePlanChangeTotal` with `currentPeriodEnd` after `now`: `newPeriodStart` = `now`,
   `newPeriodEnd` = `addMonthsInTimeZone(currentPeriodEnd, cycle months)`.
   End 2026-11-05 (VN), now 2026-11-03 (VN), annual → end 2027-11-05 (VN), same wall time.
2. Same input: `remainingCreditValue` = 0, `addonCreditValue` = 0,
   `totalDue` = `newPlanPeriodPrice` + `addonPeriodPrice`. `remainingDays` / `usedDays` / `oldPlanPeriodDays` keep
   their meaning (days left are the days carried).
3. A trial still running behaves like 1–2 (from the trial end).
4. `currentPeriodEnd` at or before `now`, or missing: `newPeriodStart` = `newPeriodEnd` − cycle = `now`
   (unchanged), no credit.
5. `changePlan()` writes `planId`, `currentPeriodStart`, `currentPeriodEnd` from 1–4, and a Payment of the full
   amount due. A trial becomes `ACTIVE`.
6. `changePlan()` on a running store plan (`APP_STORE` / `PLAY_STORE`, store product, not EXPIRED, end after now):
   `storeBonusMs` = old credit + (new end − old end); `billingChannel`, `autoRenew`, `storeProductId`,
   `currentPeriodStart`, `amount`, `interval` are not written. Otherwise `billingChannel` = `MANUAL`,
   `autoRenew` = false, `storeProductId` = null, `billingIssueAt` = null, `storeBonusMs` = null (A10).
7. Results 1–6 are the same under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
8. `POST /api/payments/manual` with `extendSubscription`: an expired plan extends from now; a running one from its end.
9. The admin change-plan dialog shows the start, end and total from 1–4, and says the days left move to the new plan
   instead of a money credit line.
10. Extend, renew and admin extend are unchanged (existing suites stay green).
