# Intent — Fix the timezone bugs found by the audit, without disturbing the live system

Issue: #578 · Author: Trinh (via Claude) · Status: draft · Created: 2026-10-06

## Problem

A read-only audit of API, shared packages, admin, shop web, iOS and Android (`audit.md`, ~66 findings) found
day logic that uses the UTC day or the server/device zone instead of the Vietnam civil day. Two affect every
shop today: availability can double-book (API-1) or report false conflicts (API-2). Reports, exports and
"today" numbers move orders made between 00:00 and 06:59 Vietnam time to the wrong day. Mobile apps are
wrong only when the phone is not on Vietnam time. Admin subscription dates shift by 7 hours on each save.

## Proposed outcome

Every finding is fixed or explicitly closed, in six small PRs (A–F, `plan.md`), each proven by a failing
test first, without breaking what runs today:
- request and response shapes of every endpoint stay the same (old installed apps keep working);
- no schema change, no data migration, no rewrite of existing rows;
- for every input the old apps send, the API returns the Vietnam-day answer.

## Affected users and systems

All shop roles, ADMIN/OPS. Apps: api, admin, client, iOS, Android. Models are only read (Order, Subscription,
loyalty). Cron: loyalty-expire. Emails: subscription mails.

## Constraints (how the live system is protected)

- Agents never touch production: no production scripts, no production environment commands, no migrations,
  no seed or reset outside local databases (the production-gate hook enforces it). Release to `main-real` only
  through `release-review` with the owner's explicit go, after the change has run on dev.
- Additive and shape-preserving only (`api-compat-review` table in every API PR). Inputs accepted exactly as
  today: `YYYY-MM-DD` keys, ISO instants, old iOS `T00:00Z…T23:59:59Z` windows, old Android 23:59Z returns,
  optional `timeZone`.
- Numbers that change are corrections; each PR lists before/after on seeded data so the owner sees what moves
  (e.g. an order made at 03:00 VN now counts on its own day).
- Mobile fixes keep Vietnam as the shop zone (constant), so a phone set to Vietnam behaves exactly as today;
  they ship only with new builds. #567 phase 4 later swaps the constant for the shop's zone.
- One PR at a time per area; each can be reverted alone. Batch B starts after #567 phase 1 merges (same files).

## Open questions

- None blocking batch A. Batch E: confirm "31 Jan + 1 month = 28/29 Feb" (month clamp) is the wanted billing rule.

## Decision log

- 2026-10-06 — Owner: "đảm bảo không ảnh hưởng hệ thống đang hoạt động, cần bạn note bạn sẽ làm gì" → this
  intent and plan before any code (Trinh)
