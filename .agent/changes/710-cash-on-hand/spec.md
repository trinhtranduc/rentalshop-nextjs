# Spec — #710

1. `revenue.cashCollected` = `revenue.collected` + `revenue.collateralFlow.received` − `revenue.collateralFlow.returned`.
   Zero when there is no collateral flow in the period.
2. `series[].expectedCash` (per day, from today on, only when the range reaches today) = `series[].expectedCollected`
   + Σ securityDeposit of RESERVED rent orders whose `pickupPlanAt` is that day (collateral to receive)
   − Σ securityDeposit of PICKUPED rent orders whose `returnPlanAt` is that day (collateral to hand back).
3. Returns are counted only when `returnPlanAt` is today or later. A rental past its return day and not returned
   is not expected (it stays held, the same rule as no-show pickups). Open question for the owner, see below.
4. Unchanged fields: `revenue.collected`, `series[].expectedCollected`, `revenue.collateralFlow`, `revenue.totalOrderValue`.
5. Additive only: no field removed or renamed; old apps keep reading the same numbers.

Out of scope: UI for the new fields; the drill-downs (#707, #708).

Open question (not blocking the first version): an overdue rental that is not returned — expected today or dropped?
Default in this spec: dropped (not expected), as stated in 3.
