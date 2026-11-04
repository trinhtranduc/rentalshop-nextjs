# Manual upgrade and renewal count from the current end (hotfix on main-real)

Issue: #1474 · Same rule as #1470 / PR #1471 on `dev` · Author: Claude (for the owner) · Status: in progress · Created: 2026-11-04

## Problem

Owner, 2026-11-03: "khi tôi gia hạn hay nâng cấp manual thì nó không tính từ ngày kết thúc. ví dụ 5/11 hết hạn mà
gia hạn từ 3/11 thì nó tính từ 3/11".

An admin plan change (upgrade, or a trial turned into a paid plan) while the plan is still running starts the new
period today, so the shop loses the days it had left. #779 paid those days back as money credit; the owner wants the
days themselves kept.

`dev` already has the fix (#1470, PR #1471), but it sits on the plan-renewal work of PR #1460 (`manualExtensionBilling`,
`storeBonusMs`, store billing channel fields) that is **not** on `main-real`. The owner asked for the fix to reach
`main-real` before the big release #1469, so the same rule is re-implemented here on `main-real`'s code, without any
store or credit logic. A sync PR then brings this branch into `dev` with `dev`'s own implementation kept.

## Proposed outcome

- Plan still running (a trial too): the new plan applies now; the end = current end + the cycle's calendar months.
  End 05/11/2026, 12 months on 03/11/2026 → end 05/11/2027.
- No money credit for the unused days; amount due = new cycle price + add-ons of the cycle.
- Expired: from now.
- The admin change-plan dialog shows the dates and amount the server writes.
- Renew and Extend already follow the rule; only guard tests are added.

## Affected users and systems

`ADMIN` / `OPS` in the admin web (subscription list, merchant page, subscription edit). API `changePlan()` and
`POST /api/payments/manual`. Shops see a later `currentPeriodEnd` after an upgrade. No mobile change.

## Constraints

- Installed iOS / Android builds do not call the changed routes (only `/api/subscriptions/status`); shapes unchanged.
- Vietnam civil day for months (`addMonthsInTimeZone`); tests under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
- No migration, no env var. Do not port anything else from #1460.

## Open questions

- None.

## Decision log

- 2026-11-03 — Upgrade keeps the days left as days of the new plan, no money credit (owner, #1470).
- 2026-11-04 — Owner wants this on `main-real` before release #1469; re-implemented without store logic (#1474).
