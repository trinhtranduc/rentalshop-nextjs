# Spec — Admin dashboard merchant filters

Issue: #1190 · Status: accepted · Intent: ./intent.md

## Behavior

1. Dashboard **Merchants** opens `/merchants` (all shops). The number is `metrics.totalMerchants`.
2. **Trial** opens `/merchants?status=trial`. The number is subscriptions with DB status `TRIAL`.
3. **Active** opens `/merchants?status=active`. The number is subscriptions with DB status `ACTIVE`.
4. Active chips: **Basic: N** opens `/merchants?status=active&plan=Basic`; **Pro: M** opens `/merchants?status=active&plan=Professional`. N and M count only ACTIVE rows. Basic = plan name equals `basic` (case-insensitive). Pro = plan name contains `pro` (case-insensitive). Clicking a chip does not navigate as Active-all.
5. **Expiring Soon** opens `/merchants?status=expiring`. Count and list are `currentPeriodEnd` in `(now, now + 7×24h]`.
6. **Expired** opens `/merchants?status=expired`. Count and list are `currentPeriodEnd < now`.
7. **Cancelled** opens `/merchants?status=cancelled`. Count and list are DB status `CANCELLED`.
8. GET `/api/merchants` applies those filters in Prisma (paginated `total` is the full match, not the current page). `plan` that is all digits is still `planId`. `plan=Basic` / `Professional` / `Enterprise` match plan name. `subscriptionStatus` and `bucket` stay accepted and AND with the rest. `isActive=true|false` still maps to shop `isActive`. Omitting every filter returns the old unfiltered list.
9. Merchants page status dropdown includes Trial, Active, Expiring soon, Expired, Cancelled, Inactive. URL `status` + `plan` drive the list.

## Out of scope

- Changing `/subscriptions` (#1180 wiring stays).
- Recalculating tiles from a dedicated stats API (still derived from the subscriptions fetch).
- Enterprise chip (show only if we later need it; Active number already includes every paid plan).
- Mobile POS.

## API and data

GET `/api/merchants` query:

| Param | Meaning |
|---|---|
| `status=trial\|active\|cancelled` | nested `subscription.status` |
| `status=expiring\|expired` | nested `subscription.currentPeriodEnd` (#1180 window) |
| `status=inactive` | `Merchant.isActive=false` |
| `status=active` | **subscription ACTIVE** (was shop isActive) |
| `plan=<digits>` | `planId` (old) |
| `plan=Basic\|Professional\|Enterprise` | plan name |
| `subscriptionStatus`, `bucket`, `isActive` | unchanged additive |

Response shape unchanged (`merchants`, `total`, pagination). External ids stay numeric.

## Acceptance

- [ ] `computeDashboardSubscriptionStats` tests: Basic/Pro among ACTIVE; expiring/expired by period end
- [ ] `resolveMerchantListFilters` tests: URL → Prisma where
- [ ] Dashboard source test: tiles link to `/merchants?...`, not `/subscriptions?...`
- [ ] MerchantFilters lists the new status values
- [ ] iOS/Android: not callers of this route
- [ ] No new user-facing i18n keys (admin English copy only)
