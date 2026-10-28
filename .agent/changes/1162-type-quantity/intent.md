# Type a product quantity on the phone

Issue: #1162 · Author: owner · Status: done · Created: 2026-10-21

## Problem

On the phone, the quantity control is only − and +. A cart line or the stock on the product form moves one unit per tap. Setting 20 takes twenty taps.

## Proposed outcome

Tapping the number opens the same number-pad sheet as price, deposit, and discount, titled "Nhập số lượng". Confirming sets that quantity. − and + still move by one. Dismissing the sheet leaves the quantity unchanged. Typing 0 on a cart line still asks before the line is removed.

## Affected users and systems

Shop staff on iOS and Android. The shared stepper is the cart line and the product form stock. No API, web, or admin change.

## Constraints

Installed apps keep the old stepper until this build is installed. No response field changes. A typed count above 9.999 becomes 9.999. A count below the stepper minimum becomes the minimum.

## Open questions

None. The owner asked for a dialog to type the number instead of tapping − / +.

## Decision log

- 2026-10-21 — The dialog lives on the shared stepper, so the cart and the product form both get it (owner: the quantity control on the phone).
- 2026-10-21 — First sketch used a system alert. The owner asked for the existing number-pad sheet so quantity matches price / deposit / discount.
- 2026-10-21 — Cap quantity at 9.999 (owner: product quantity should have a limit). Same cap on the cart stepper because it is the same control. Availability shortage stays a warning, not a hard cart max.
