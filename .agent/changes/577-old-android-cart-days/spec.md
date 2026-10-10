# Spec

- `normalizeLegacyPlanDays({ pickupPlanAt, returnPlanAt })` (`packages/utils/src/core/legacy-plan-days.ts`), pure.
- Recognised: `returnPlanAt` exactly `YYYY-MM-DDT23:59:00Z` or `...T23:59:00.000Z` (valid calendar day).
  Rewritten to `R T16:59:59.000Z` (23:59:59 Vietnam of R, the form iOS and the current Android send).
- The pickup is not touched: `P T00:00:00Z` is P 07:00 in Vietnam (right civil day) and the old app reads the first 10
  characters of the stored instant as its day, so moving it to `P-1 T17:00Z` would show P-1 on that phone.
- Used on write only: `POST /api/orders`, `PUT /api/orders` (query id), `PUT /api/orders/{id}`.
- Not touched: any other instant (current iOS/Android/web, `T23:59:59[.fff]Z` UTC-day windows, other offsets).
- Pricing: not recomputed (Q4: the API stores the app's totals). The old app sends `rentalDuration` and item
  `rentDays` as inclusive days P..R (`CartStore.rentalDaysInclusive`, `ChronoUnit.DAYS.between + 1`) with its own
  totals; those were right and are stored as sent. When the request has no duration the API derives it from the
  (now correct) dates: `countRentalDays` P..R inclusive.
- Orders stored before the fix stay as they are: `data-fix.sql.pending`, owner decision.
