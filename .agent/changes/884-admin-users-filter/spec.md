# Spec — #884

## URL

| key | meaning |
|---|---|
| `merchantId` | numeric merchant id; absent = all merchants |
| `outletId` | numeric outlet id; ignored by the page when `merchantId` is absent |

- Changing the merchant resets `outletId` and `page`. Changing the outlet resets `page`.
- Clear removes every filter (existing behaviour: `router.push(pathname)`).
- Pure helpers in `apps/admin/app/users/users-filter-url.ts`:
  - `readUserListFilters(params)` → `{ merchantId?, outletId? }` (positive integers only; outlet only with a merchant).
  - `userFilterUrlUpdates(change)` → URL updates for a filter change (merchant change clears outlet).

## UI

- `UserFilters` gets `showMerchantOutletFilters?: boolean` (default false, so other callers are unchanged);
  `Users` passes it through.
- Merchant: `SearchableSelect`, options from `merchantsApi.getMerchantsPaginated(1, 1000)` (the list route
  defaults to 10), "All Merchants" placeholder.
- Outlet: `SearchableSelect`, disabled with "Select merchant first" until a merchant is chosen, options from
  `outletsApi.getOutletsByMerchant(merchantId)`.
- Clear button shows when search, role, merchant or outlet is set.
- Phone: the existing `.admin-list` chip row CSS scrolls the selects horizontally; widths `w-full sm:w-[200px]`.

## API

None. `GET /api/users` as ADMIN/OPS already passes `merchantId` / `outletId` to `db.users.search`; MERCHANT and
outlet callers keep their own scope whatever they send. A route test locks this in.
