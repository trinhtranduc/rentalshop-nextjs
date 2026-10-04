# Mobile: a rent order from the new cart cannot be handed over (papers/deposit required)

Issue: #427 · Author: Trinh Tran · Status: approved · Created: 2026-10-05

## Problem

On iOS with `newOrderDetail`, "Handed over" on a RENT order created in the new cart shows an
"Error" alert with the hard-coded Vietnamese text "Quý khách có thể cọc bằng các loại giấy tờ…"
(also in English) and sends no request. `OrderViewModel.handlePickup` requires papers
(collateral) or a security deposit, and neither the v2 cart nor the v2 hand-over sheet can enter
them, so every v2 rental is blocked at hand-over. Found in the #391 e2e run.

## Proposed outcome

The v2 hand-over sheet (iOS and Android) asks for two optional fields, "Giấy tờ để lại"
(papers, e.g. CCCD/GPLX) and "Cọc thế chân" (security deposit money, no currency symbol),
prefilled from the order. Both may stay empty. Confirm sends one `PUT /api/orders/:id` with
`status: PICKUPED` plus the papers/deposit when given, and the order becomes PICKUPED.

## Affected users and systems

All roles that hand over rent orders on iOS and Android with `newOrderDetail` on.
No API or web change (the API does not require collateral; the fields are already in the
order update whitelist, `packages/database/src/order.ts`).

## Constraints

- The old (flag-off) screens keep their current rule; the check there uses the localized key.
- Failing test first (`bug-fix-tdd`). No API change. Mobile parity (iOS and Android).

## Open questions

- None.

## Decision log

- 2026-10-05 — Ask, do not require: optional papers and deposit fields on the v2 sheet; remove
  the client block on the v2 path (owner, issue comment).
- 2026-10-05 — Papers are sent like the old iOS screen: `collateralType: "ID_CARD"` +
  `collateralDetails` when not empty. Clearing prefilled papers sends `collateralDetails: ""`;
  clearing a prefilled deposit sends `securityDeposit: 0`.
- 2026-10-05 — Android v2 has no client block; it gets the same two fields. Its PICKUP payment
  amount follows the deposit entered in the sheet.
