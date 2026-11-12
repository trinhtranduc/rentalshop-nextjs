# Spec — Order notes in Tổng quan › Đơn cần làm hôm nay (web)

Issue: #1527 · Status: in-progress · Intent: ./intent.md

## Behavior

1. `GET /api/analytics/outlet-operations`: every order row (all lists, including `tomorrowPickups`,
   `tomorrowReturns`, `collateralHeld`) has `notes`: the order note trimmed, or `null` when empty or blank.
2. Each `items[]` entry of a row has `notes`: the item note trimmed, or `null` when empty or blank.
3. Every field the rows had before keeps its name, type and value.
4. Web `buildTodayRows`: pickup and return rows carry `notes` (order note or `null`) and `itemNotes`
   (`{ name, notes }` for each item with a note, in item order); deposit-stage rows carry `null` and `[]`.
5. "Đơn cần làm hôm nay": a row with an order note or an item note shows one note block under it,
   from the name column to the end of the row (full width on a phone): the order note first, then
   "<product>: <note>" per item; each at most 2 lines; a hidden "Ghi chú" label for screen readers.
   A row without notes renders as before.
6. The "+N đơn nữa" line adds "· K có ghi chú" (K = rows after the first 5 with an order or item note)
   when K ≥ 1, and stays as before when K = 0.
7. New strings `home.orders.notesLabel` and `home.orders.moreNotes` in `locales/{en,vi}/dashboard.json`
   (ja, ko, zh load the en dashboard file, `apps/client/i18n.ts`).

## Out of scope

- iOS and Android screens.
- `pickupNotes`, `returnNotes`, `damageNotes` and note photos.
- Tomorrow's lists on the web card (the card shows today's work only, as now).
- Any change to which orders the card lists or their order.

## API and data

- `GET /api/analytics/outlet-operations`: rows add `notes: string | null`; `items[]` add `notes: string | null`.
- `packages/database/src/outlet-operations.ts` selects `notes` on the order and on `orderItems`.
- No ids added; scope and permissions unchanged (`analytics.view.dashboard`, merchant / outlet scope).

## Acceptance

- [x] Each behavior line has a test, a command, or a UI check named in `plan.md`
- [x] iOS and Android called out: not changed, they ignore the new keys (issue #1527 table)
- [x] New user-facing strings listed (en, vi; ja/ko/zh use the en file)
- [x] Cancelled orders, Vietnam civil days, and role limits: unchanged (no list or day logic touched)
