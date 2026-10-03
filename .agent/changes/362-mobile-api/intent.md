# API for the mobile UI refresh

Issue: #362 · Author: Trinh Tran · Status: draft · Created: 2026-10-03

## Problem

The new mobile design (order list "Việc cần làm", calendar, overview, sale orders, unified search)
needs data the API does not give, and the review found data-correctness bugs on the way:

- No way to list "what to hand over or take back today / tomorrow / late". `GET /api/orders`
  cannot filter by `pickupPlanAt` / `returnPlanAt`, takes one status per call, and uses UTC days.
- The list row has no "amount still to collect" (only `qr-code` computes it) and no "days late".
- The calendar counts only pickups. `calendar/orders/by-date` filters PICKUPED by `pickupPlanAt`,
  so it cannot list returns due. `calendar/orders` may drop pickups late on the last day of a month.
- Search does not match product names.
- Status changes are not validated: `PATCH /orders/:id/status` and `PUT /orders/:id` accept any
  status from any status (a RETURNED order can go back to RESERVED, a SALE can become PICKUPED).
- `analytics/period` `topProducts` counts CANCELLED orders (breaks the revenue rule in AGENTS.md).
- SALE create accepts a client `depositAmount`, although a sale is paid in full at creation.
- Overview has no "currently rented" / "collateral held now" figure.
- No minimum-app-version mechanism, so old apps in the field cannot be asked to update.
- Editing a product resets every outlet's `renting` to 0 and deletes stock rows of outlets not sent,
  so availability is wrong after any product edit while items are rented out.
- Editing an order's items drops the product name/image snapshots; deleting a product is a hard delete
  with no active-order check, so old orders can lose their item names.
- `OUTLET_STAFF` can set prices when creating a product.

Merchants already use the system and the apps in the field cannot be forced to update.

## Proposed outcome

- New endpoints and fields give every number the new screens show, on Vietnam civil days.
- Existing endpoints keep their current fields and meaning, so installed apps keep working.
- Invalid status changes are rejected with an error code; valid ones behave as today.
- Revenue and top products exclude CANCELLED everywhere.

## Affected users and systems

- Roles: all merchant roles (`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF`); scope unchanged.
- Apps: `api`; read by iOS, Android, and the web client/admin (shared endpoints).
- Data: `Order`, `OrderItem`, `Payment`, `Product`. No schema change.

## Constraints

- Backward compatible: add, never rename or change the meaning of a field or a default.
- Server stays UTC. Day logic uses the caller's `timeZone` (device zone from the apps), default `Asia/Ho_Chi_Minh`;
  use `getCalendarDayRangeInTimeZone` (`getLocalDateKey` is fixed +7h, only right for Vietnam; `getUtcRangeForDateKeys` named in AGENTS.md does not exist) (skill `timezone-dates`).
- Analytics UTC→VN day is tracked by #355; this change depends on it and does not redo it.
- No migration. Production stays untouched until `dev` is verified and the DB is backed up.
- Mixing `??` with `||` without parentheses breaks the Next 14 build.

## Open questions

1. Is any other transition (e.g. RETURNED→anything) used in production? Read-only audit before the guard ships (plan step A1).
2. Late fee: no rule exists (stored manually). Proposed: API returns `lateDays` only; the fee stays manual at return.
3. Stock shortage on list rows ("Thiếu 1 bộ"): proposed out of scope (expensive); warn only on create/edit.

## Decision log

- 2026-10-03 — Server uses UTC; mobile uses the device time zone and sends it as `timeZone` (Trinh Tran)
- 2026-10-03 — Editing an order keeps today's behavior (no new per-status locks or server recompute) (Trinh Tran)
- 2026-10-03 — A PICKUPED rental can be cancelled (Trinh Tran)
- 2026-10-03 — A RESERVED rental past its pickup day is listed as late in Việc cần làm ("Giao · trễ N ngày") (Trinh Tran)
- 2026-10-03 — No global API versioning (`/v2`). Additive changes plus a minimum-app-version check; version a single endpoint only if its shape must break (Trinh Tran)
- 2026-10-03 — Late is a note on RESERVED/PICKUPED orders, not a status (Trinh Tran)
- 2026-10-03 — SALE orders have two states only: COMPLETED and CANCELLED (Trinh Tran, matches `orders/route.ts:667`)
- 2026-10-03 — Search keeps "contains" matching; prefix matches rank first (avoid fewer results for existing users)
