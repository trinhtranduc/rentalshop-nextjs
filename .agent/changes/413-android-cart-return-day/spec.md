# Spec — Android: cart saves the return day as 23:59 UTC

Issue: #413 · Status: approved · Intent: ./intent.md

## Behavior

1. `pickupPlanAt` for day D = start of D in the device zone, as UTC `yyyy-MM-ddTHH:mm:ss.SSSZ`.
2. `returnPlanAt` for day D = start of D+1 in the device zone minus one second, same format.
3. Device zone `Asia/Ho_Chi_Minh`: 04/10 → 05/10 sends `2026-10-03T17:00:00.000Z` →
   `2026-10-05T16:59:59.000Z`. Device zone `UTC`: `2026-10-04T00:00:00.000Z` →
   `2026-10-05T23:59:59.000Z`.
4. Loading an order into the cart reads each instant as a day in the device zone
   (`2026-10-04T16:59:59Z` is 04/10 and `2026-10-04T17:00:00Z` is 05/10 in Vietnam). A plain
   `YYYY-MM-DD` value is taken as that day. Round trip D → instant → D holds in both zones.
5. The cart availability check (`checkBatchAvailability`, and the single check it falls back to)
   sends the same two instants as the order.
6. One pure function owns the conversion (`OrderPlanDays`); `CartStore` and the availability
   repository call it.

## Out of scope

- Existing orders stored with `T23:59Z` (no migration without the owner's go).
- iOS (already sends device-zone start/end of day).

## API and data

No API change. New orders store VN-civil-day boundaries for VN devices.

## Acceptance

- [ ] Behaviors 1–4 covered by `CartPlanDatesTest` under both default zones
- [ ] Behavior 5 covered by the batch availability test (#414)
- [ ] Manual: an order created in the old cart and in `CartV2` shows the expected instants in the DB
