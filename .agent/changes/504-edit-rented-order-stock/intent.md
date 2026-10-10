# Intent — #504 editing a rented-out order must keep the stock counts right

Changing the lines of a PICKUPED order (qty, add, remove, swap product) left `OutletStock.renting` / `available` wrong for good: stock moved only on a status change, and the return used the new lines. Units stayed "Đang thuê" forever.

Constraint: RESERVED edits do not touch OutletStock (by design). Hand-over has no stock guard (Q1/Q9 in `tests/e2e/TEST_CASES.md`), so an edit must not add one.
