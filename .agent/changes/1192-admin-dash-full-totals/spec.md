# Spec — Admin dashboard full merchant totals

Issue: #1192 · Status: accepted · Intent: ./intent.md

## Behavior

1. **Merchants** opens `/merchants`. The number is `GET /api/merchants` `total` with no status/plan (every shop, not analytics `isActive`).
2. Merchants chips **Basic / Pro / Enterprise** open `/merchants?plan=Basic|Professional|Enterprise` (no status). Counts are all shops on that plan.
3. **In use** (not labelled Active) opens `/merchants?status=current`. Number is còn hạn: `currentPeriodEnd > now` and status not `CANCELLED`/`PAUSED`.
4. **Expired** opens `/merchants?status=expired`. Number is `currentPeriodEnd < now`.
5. **Trial / Expiring / Cancelled** stay (`status=trial|expiring|cancelled`).
6. GET `/api/merchants`: `status=current` (alias `active` / `inuse`) = còn hạn. `plan` name without status does not require In use. Digits still `planId`. Omit filters = unfiltered list.
7. Merchants dropdown: In use (`current`), Trial, Expiring, Expired, Cancelled, Inactive. URL `status=active` maps to In use.

## Out of scope

- Changing `/subscriptions`.
- A dedicated stats API (tiles keep using `GET /api/merchants` `total`).
- Mobile POS.
- Making Trial/Expiring disjoint from In use (they stay useful subsets).

## API and data

| Param | Meaning |
|---|---|
| _(none)_ | all shops |
| `status=current` (alias `active`/`inuse`) | còn hạn |
| `status=trial\|cancelled` | enum |
| `status=expiring\|expired` | period window (#1180) |
| `status=inactive` | shop `isActive=false` |
| `plan=Basic\|Professional\|Enterprise` | plan name, any period |
| `plan=<digits>` | `planId` |

Response shape unchanged. External ids stay numeric.

## Acceptance

- [ ] `resolveMerchantListFilters`: current = period; plan without status has no period clause
- [ ] Dashboard source: Merchants uses unfiltered total; chips lack `status=current`; In use has no plan chips; no `title="Active"`
- [ ] Headed e2e `scripts/e2e/admin-e2e.sh`
- [ ] iOS/Android: not callers
- [ ] No new i18n keys
