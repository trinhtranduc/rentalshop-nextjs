# Manual upgrade and renewal count from the current end

Issue: #1470 · Author: Claude (for the owner) · Status: in progress · Created: 2026-11-03

## Problem

Owner, 2026-11-03: "khi tôi gia hạn hay nâng cấp manual thì nó không tính từ ngày kết thúc. ví dụ 5/11 hết hạn mà
gia hạn từ 3/11 thì nó tính từ 3/11".

An admin plan change (upgrade, or a trial turned into a paid plan) while the plan is still running starts the new
period today, so the shop loses the days it had left. #779 paid those days back as money credit; the owner now wants
the days themselves kept, like the in-app rule A13 (#1459).

## Proposed outcome

- Plan still running: renewal, extension and upgrade count from the current end. End 05/11/2026, 12 months on
  03/11/2026 → end 05/11/2027.
- Upgrade: the new plan applies now; end = old end + cycle months; no money credit (the days left become days of the
  new plan); amount due = new cycle price + add-ons of the cycle.
- Trial still running → paid plan: from the trial end.
- Expired: from now.
- Store plan running: the manual time joins `storeBonusMs` (A13); otherwise billing `MANUAL` (A10).
- The admin change-plan dialog shows the dates and amount the server writes.

## Affected users and systems

`ADMIN` / `OPS` in the admin web (subscription list, merchant page, subscription edit). API `changePlan()` and
`POST /api/payments/manual`. Shops see a later `currentPeriodEnd` after an upgrade. No mobile change.

## Constraints

- Installed iOS / Android builds do not call the changed routes; response shapes stay the same.
- Vietnam civil day for months (`addMonthsInTimeZone`); tests under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
- Extend, renew and admin extend already follow the rule and keep their A13 / A10 behaviour.

## Open questions

- None. Out of scope: an admin plan change on a running App Store / Play plan is replaced by the store product's plan
  at the next store renewal (only the time is kept).

## Decision log

- 2026-11-03 — Upgrade keeps the days left as days of the new plan, no money credit; same rule as in-app A13 (owner).
