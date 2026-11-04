# Spec — Manual upgrade and renewal count from the current end (hotfix)

Issue: #1474 · Status: in progress · Intent: ./intent.md

## Behavior

1. `calculatePlanChangeTotal` with `currentPeriodEnd` after `now`: `newPeriodStart` = `now`,
   `newPeriodEnd` = `addMonthsInTimeZone(currentPeriodEnd, cycle months)`.
   End 2026-11-05 (VN), now 2026-11-03 (VN), annual → end 2027-11-05 (VN), same wall time.
2. Same input: `remainingCreditValue` = 0, `addonCreditValue` = 0, `totalDue` = `newPlanPeriodPrice` +
   `addonPeriodPrice`. The fields stay in the result and in `planChange` of the response. `remainingDays` /
   `usedDays` / `oldPlanPeriodDays` keep their meaning (days left = days carried). New field `expired`.
3. A trial still running behaves like 1–2 (from the trial end).
4. `currentPeriodEnd` at or before `now`, or missing: `newPeriodStart` = `now`, `newPeriodEnd` = `now` + cycle
   (unchanged), no credit, `expired` = true.
5. `changePlan()` writes `planId`, `currentPeriodStart`, `currentPeriodEnd` from 1–4, and a Payment of the full
   amount due. A trial becomes `ACTIVE`. `POST /api/subscriptions/[id]/change-plan`, `PUT /api/subscriptions/[id]`
   and `PUT /api/merchants/[id]/plan` all go through `changePlan()`.
6. `POST /api/payments/manual` with `extendSubscription`: an expired plan extends from now; a running one from its end.
7. The admin change-plan dialog shows the start, end and total from 1–4, and says "Days left of <old plan>, carried to
   the new plan: N days" instead of a credit line (same wording as #1471; the dialog is English-only).
8. Results 1–6 are the same under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
9. Extend, renew and admin extend are unchanged (existing suites stay green, guards added).

## Out of scope

Store plans (App Store / Play, `storeBonusMs`, `manualExtensionBilling`) exist only on `dev` (#1460); `dev` keeps its
own implementation.
