# Intent — #494

The owner must understand how the shop runs from the mobile Overview. After #492 they see order value,
Thực thu (collected, without collateral) and Còn phải thu. They also need:

- the total money staff took in, collateral (thế chân) included, to close a shift;
- where Còn phải thu will come from (at pickup vs. pickups already overdue);
- the collateral that will move next: handed back (held now) and received at pickup (reserved orders).

Constraints: additive API only (installed apps). Vietnam civil days. Thế chân is never counted in Thực thu,
order value or Còn phải thu. Per-staff/per-shift cash is out of scope (no data on who took payment).
