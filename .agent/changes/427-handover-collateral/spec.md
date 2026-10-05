# Spec — Mobile: a rent order from the new cart cannot be handed over

Issue: #427 · Status: approved · Intent: ./intent.md

## Behavior

1. The v2 hand-over sheet shows "Giấy tờ để lại" (text) and "Cọc thế chân" (number, money
   format without currency symbol), prefilled from `collateralDetails` / `securityDeposit`.
2. Both fields may be empty; "Handed over" is never blocked on the client for missing
   papers/deposit.
3. Confirm sends one order update with `status: "PICKUPED"` and:
   - papers not empty → `collateralType: "ID_CARD"`, `collateralDetails: <trimmed text>`;
   - papers empty but the order had papers → `collateralDetails: ""`; otherwise no papers keys;
   - deposit > 0, or the order had a deposit → `securityDeposit: <amount>`; otherwise no key.
4. The money box ("Cọc thế chân" line and "Collect now") follows the deposit typed in the sheet.
   Android records the PICKUP payment with that amount before the status change.
5. iOS flag-off screen (`PreviewViewController` → `OrderViewModel.saveOrder`) keeps its check,
   with the message from the localized key "You can make a deposit using identification
   documents…" (no hard-coded Vietnamese).

## Out of scope

- Collateral in the v2 cart. API and web changes. The old Android screens.

## API and data

No change. `PUT /api/orders/:id` with `status`, `collateralType`, `collateralDetails`,
`securityDeposit` (already accepted).

## Acceptance

- [ ] 2–3: iOS `HandOverCollateralTests`, Android `HandOverCollateralTest`, failing before the fix
- [ ] 5: iOS test of the old-flow message
- [ ] Manual: hand over twice on each platform (empty; "CCCD" + 500), DB rows checked
- [ ] Strings in iOS `en`/`vi-VN` and Android `values`/`values-vi`
