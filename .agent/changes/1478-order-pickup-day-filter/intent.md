# Intent — Web orders "Ngày giao" must include orders picked up that day

Issue: #1478 (hotfix on `main-real`; the same fix is on `dev` as #1472 / PR #1473) · Status: in-progress

## Why
A shop's customer chose "Ngày giao: Hôm nay" (03/11/2026) and an order delivered that day (#284697, "chị linh 354":
`pickedUpAt` 08:54 on 03/11, status RETURNED) was missing. The filter only looks at the planned pickup day
(`pickupPlanAt`, #1369), so an order delivered on another day than planned never shows under its real delivery day.

## Wanted
"Ngày giao" (every range, "Hôm nay" included) matches an order whose planned pickup day OR actual pickup day
(`pickedUpAt`) is in the range. Days are Vietnam civil days.

## Constraints
- Installed mobile apps use `dateField=pickupPlanAt` (filter sheet #389): that value keeps its exact meaning.
- Additive only: a new `dateField` value, `pickupDay`. Only the web asks for it.
- Chip counts, pagination, sorting, Excel export and the `pickup=` URL value keep working.
- No migration and no index in this PR. Report the query shape and the risk.

## Hotfix scope
- Goes to `main-real` on its own, before release #1469: the 5 commits of #1473 re-applied as they are (no change in code, tests or locales).
- Nothing from #1460 / #1469 is needed: the diff touches no subscription, payment or plan file.
- No migration and no index. Known risk kept open: `Order.pickedUpAt` has no index.
