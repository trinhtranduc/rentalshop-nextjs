# Intent — #492 Overview shows Thực thu, Tiền cọc, Thế chân

**What the owner wants (2026-10-06):** at a glance on the mobile Overview, how much money really came in
(Thực thu), how much deposit (cọc) was taken, and how much collateral (thế chân) was taken and is held.
Example: a 200k order with a 50k deposit, not picked up yet, is 50k of Thực thu.

**Why:** "Tiền đã thu" alone did not say what it contains. Cọc (part of the price, paid upfront) and
thế chân (a guarantee, handed back) are different and owners track both.

**Constraints**
- API changes are additive only (installed apps). Old apps ignore the new fields.
- Days are Vietnam civil days (reuses the #355 summary).
- Collateral never counts in Thực thu (#486).
- No cancelled-orders row: the owner said cancellations are rare.

**Decision 2026-10-06:** the owner found "thế chân đã nhận" vs "đang giữ" confusing. Only "Thế chân đang giữ" is shown; the deposit tile is "Cọc khi tạo đơn".
