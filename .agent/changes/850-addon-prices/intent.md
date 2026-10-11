# Add-on prices managed by admin

Issue: #850 (Refs #782) · Author: agent for Trinh Tran · Status: accepted (owner decisions 2026-10-11) · Created: 2026-10-11

## Problem

Add-ons (`PlanLimitAddon`) raise a shop's limits for free and forever: no price, no period, typed by hand,
and one row can bundle five limits. The owner wants to sell add-ons for a VND price set once by the admin, charged mid-period
and at renewal.

## Proposed outcome

- Admin menu **Plans → Add-on prices**: a catalog. Each row = one limit kind + pack size + monthly VND price per pack.
  ADMIN edits; OPS reads.
- Merchants → shop → **Add-on**: pick a catalog row and a number of packs. The price comes from the catalog.
  Mid-period charge = price × packs × days left ÷ days of the period (Vietnam days). The limit goes up at once.
  Removal takes effect at period end. Renewal total = plan + active add-ons.
- An edited price applies only to new purchases and later renewals. "Tạm tắt" stops new sales. Items already
  bought keep their captured price and keep running until the end of the paid period.

## Affected users and systems

ADMIN, OPS (admin web); MERCHANT (renewal total, limits); `apps/api`, `apps/admin`, `packages/database`,
`packages/utils`, `packages/ui`, `prisma`. iOS/Android: no change. They only see the limits (`PLAN_LIMIT_EXCEEDED`), which
work as before.

## Constraints

- Additive migration only. Every shop keeps exactly today's limits after deploy.
- Installed apps and stale web tabs keep working (api-compat-review against `release-2026-10-11`).
- VND integers; Vietnam civil days (`civilDaysBetween`).
- No new charge happens on its own. Payments are recorded by the admin action (add) and by renewal.

## Open questions

- Raised with the spec on #850 (see spec "Choices made here"): proration for 3/6/12-month periods, trial shops.

## Decision log

- 2026-10-11 — owner decisions 1–6 on #850 (last comment) + mockup PjnxEfi3tXwS8GWM775kZY (owner)
- 2026-10-11 — one limit kind per add-on item; old bundled rows split per kind (owner, #782)
- 2026-10-11 — outlets add-on only for a multi-branch plan (#826, owner)
