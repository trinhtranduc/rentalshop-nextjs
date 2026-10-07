# Spec

- Golden responses: the code before #492 (commit 852bd196^) runs a fixed set of scenarios against an in-memory order store, and its responses are saved as JSON.
- Today's code runs the same scenarios. With the allowlisted additive fields removed, its responses must deep-equal the golden JSON. No other field path may appear or disappear.
- The additive fields:
  - `summary.collectedBreakdown` and `summary.collateralFlow`
  - `revenue.collectedBreakdown`, `revenue.collateralFlow` and `revenue.outstandingBreakdown`
  - `growth.orderValue`
  - `cash.collateralToCollect` and `cash.collateralToReturn`
- The new fields are checked against hand-worked values and against these invariants:
  - breakdown sum = collected
  - collected + received − returned = totalRevenue
  - atPickup + overduePickup = outstanding
  - orderValue.current = totalOrderValue
- The tests are green under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
