# Intent — #828 Android: merchant picks the branch on Home

- **What:** the Android app gets the branch picker iOS got in #853. A MERCHANT with two or more active branches picks
  the branch on Home ("🏬 <branch> ▾"); the whole app then works in that branch (products and stock, availability,
  cart and order creation, order lists, calendar, Overview, today's work, receipts).
- **Why:** owner (2026-10-11, issue #828, part of #823): a shop with several branches must see and sell the stock of
  one branch at a time on the phone. iOS is the reference; Android matches it (`mobile-parity`).
- **Constraints:** button only on Home (owner's last change); Orders, Calendar, Overview have no button. Outlet users
  never switch. No API change (the API already takes `outletId` / `outletIds`). Choice remembered per account on the
  device, forgotten on logout. A cart with lines is only dropped after a confirm.
