# Spec — Admin dashboard merchant filters

Issue: #1190 · Status: accepted · Intent: ./intent.md

## Behavior

1. Dashboard **Merchants** opens `/merchants` (all shops). The number is `metrics.totalMerchants`.
2. **Trial** opens `/merchants?status=trial`. The number is subscriptions with DB status `TRIAL`.
3. **In use** (not labelled Active) opens `/merchants?status=current`. The number is còn hạn đang dùng: `currentPeriodEnd > now` and status not `CANCELLED`/`PAUSED` (trial + paid still in period). A paid `ACTIVE` row whose period already ended is **not** In use.
4. In use chips: **Basic** / **Pro** / **Enterprise** open `/merchants?status=current&plan=Basic|Professional|Enterprise`. Counts are among In use only. Basic = name equals `basic`; Pro = name contains `pro`; Enterprise = name contains `enterprise` (case-insensitive). Clicking a chip does not navigate as In-use-all.
5. **Expiring Soon** opens `/merchants?status=expiring`. Count and list are `currentPeriodEnd` in `(now, now + 7×24h]`.
6. **Expired** opens `/merchants?status=expired`. Count and list are `currentPeriodEnd < now`.
7. **Cancelled** opens `/merchants?status=cancelled`. Count and list are DB status `CANCELLED`.
8. GET `/api/merchants` applies those filters in Prisma (paginated `total` is the full match, not the current page). `plan` that is all digits is still `planId`. `plan=Basic` / `Professional` / `Enterprise` match plan name. `subscriptionStatus` and `bucket` stay accepted and AND with the rest. `isActive=true|false` still maps to shop `isActive`. Omitting every filter returns the old unfiltered list.
9. Merchants page status dropdown includes In use (`current`), Trial, Expiring soon, Expired, Cancelled, Inactive. URL `status` + `plan` drive the list. Bookmark `status=active` maps to In use.

## Out of scope

- Changing `/subscriptions` (#1180 wiring stays).
- A dedicated stats API. Tile numbers are `GET /api/merchants` `total` with the same `status`/`plan` the click opens.
- The old paid-only Active tile (DB enum `ACTIVE`).
- Mobile POS.

## API and data

GET `/api/merchants` query:

| Param | Meaning |
|---|---|
| `status=trial\|cancelled` | nested `subscription.status` |
| `status=current` (alias `active`/`inuse`) | còn hạn đang dùng: `currentPeriodEnd > now` and status not CANCELLED/PAUSED |
| `status=expiring\|expired` | nested `subscription.currentPeriodEnd` (#1180 window) |
| `status=inactive` | `Merchant.isActive=false` |
| `plan=<digits>` | `planId` (old) |
| `plan=Basic\|Professional\|Enterprise` | plan name |
| `subscriptionStatus`, `bucket`, `isActive` | unchanged additive |

Response shape unchanged (`merchants`, `total`, pagination). External ids stay numeric.

## Acceptance

- [ ] `computeDashboardSubscriptionStats` tests: In use = period not ended; Basic/Pro/Enterprise among In use
- [ ] Headed e2e `scripts/e2e/admin-e2e.sh`: each tile/chip opens `/merchants` with the same filter; list total = API total; every visible row matches the bucket
- [ ] `resolveMerchantListFilters` tests: URL → Prisma where
- [ ] Dashboard source test: tiles link to `/merchants?...`, not `/subscriptions?...`
- [ ] MerchantFilters lists the new status values
- [ ] iOS/Android: not callers of this route
- [ ] No new user-facing i18n keys (admin English copy only)
