# Spec — inclusive rental days

Issue: #351 · Status: accepted · Intent: ./intent.md

## Behavior

1. `countRentalDays(pickup, return)` (`packages/utils`): Vietnam civil days from the pickup day to the
   return day inclusive, minimum 1. Accepts `YYYY-MM-DD` keys or instants. 03→04 = 2; 03→03 = 1;
   17:00Z (00:00 +07) to 16:59:59Z the next UTC day is one civil day; 30/09 → 02/10 = 3.
2. `calculateDurationInUnit(start, end, 'DAILY')` returns `countRentalDays(start, end)`. HOURLY and FIXED unchanged.
   This also drives `calculateOptionPricing` and `PricingResolver.calculatePrice`.
3. `POST /api/orders` DAILY fallback (`rentalDuration` when the client sends none) uses the same count.
4. Web create/edit order form: the summary duration, the DAILY line totals and the validation use the same count.

## Out of scope

Mobile (already inclusive), HOURLY rules, stored orders, the availability page (already treats both days as occupied).

## Acceptance

- [ ] 1, 2 in `tests/packages/utils/rental-days.test.ts` (both TZ)
- [ ] 3, 4 by reading the code paths + localhost: 03/10 → 04/10 shows "2 ngày" and a per-day item costs 2 × unit price
