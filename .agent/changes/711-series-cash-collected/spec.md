# Spec — #711 series[].cashCollected

1. `series[].cashCollected` = `series[].collected` + Σ securityDeposit of RENT orders picked up that day − Σ securityDeposit of RENT orders returned that day.
2. Σ over the days of the period = `revenue.cashCollected` (#710).
3. Unchanged: `series[].collected`, `revenue.collected`, `revenue.collateralFlow`.
4. Left out (not 0) when the day's collateral cannot be read.
