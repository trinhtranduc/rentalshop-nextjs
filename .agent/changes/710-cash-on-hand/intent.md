# Intent — cash on hand for reconciliation (#710)

Status: accepted (owner 2026-10-09)

- Goal: reconciliation. "Thực thu" answers: how much money the shop holds for a period/day, collateral included.
- Collateral (thế chân) is cash in when a rental is handed over and cash out when it is returned, so it counts.
- Doanh thu = total value of the sales and rentals created in the period (`totalOrderValue`), unchanged.
- Constraint: customers run installed apps that cannot be force-updated. Existing fields keep their meaning.
