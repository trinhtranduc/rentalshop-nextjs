# Spec — Owner switches branch on the app

Issue: #1614 · Status: accepted · Intent: ./intent.md

## Behavior

1. `GET /api/analytics/outlet-operations`, MERCHANT whose scope has an `outletId`: `outletIds=3` → outlets `[3]`; no
   `outletIds` → every outlet of the shop; an outlet of another shop → 403.
2. `GET /api/analytics/income/orders`, same owner: `outletIds=4` → 200, every query narrowed to `[4]`; none → every outlet.
3. OUTLET_ADMIN / OUTLET_STAFF: unchanged (own outlet, `outletIds` ignored).
4. iOS `BranchListing.sendsListed` / Android `BranchListing.sendsListed`: MERCHANT with 2+ active branches → true;
   with 1 → false. The list query then carries `listed=true` beside `outletId`.

## Out of scope

- Other routes with the same `userScope.outletId` first pattern that the branch picker does not use (old income routes).
- Android keeping old rows while the orders list reloads after a switch.

## API and data

No field added or changed. Scope only.

## Acceptance

Jest tests above red before, green after, under TZ=UTC and TZ=Asia/Ho_Chi_Minh; iOS and Android unit tests green;
owner account with a branch on the account, 2 branches, switched on simulator and emulator: Việc cần làm and Home follow.
