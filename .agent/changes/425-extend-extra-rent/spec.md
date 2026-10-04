# Spec — Gia hạn lets staff enter the extra rent

Issue: #425 · Status: accepted · Intent: ./intent.md

## Behavior

1. The Gia hạn sheet (iOS `OrderExtendSheetViewController`, Android `OrderExtendSheet`) shows, under the day count,
   a money field titled "Tiền thuê thêm" / "Extra rent". It starts empty (= 0), takes digits only, and shows them
   with dot grouping and no currency symbol (`MoneyInput.display` → `MoneyFormatter.format` / `formatMoneyVnd`).
2. When extra > 0 the sheet shows "Tổng mới: X" / "New total: X" under the field, X = old `totalAmount` + extra.
   When extra is 0 or empty the line is hidden.
3. Save (after the unchanged availability check) sends `PUT /api/orders/{id}` with:
   - `returnPlanAt` = last second of the new day in the device zone (unchanged);
   - `rentalDuration` = inclusive civil days from the pickup day to the new return day (same day = 1), the count
     the cart (`CartV2Logic.rentalDays` / `ProductRules.rentalDays`) and the detail use; omitted when the order has
     no `pickupPlanAt`;
   - `totalAmount` = old `totalAmount` + extra, only when extra > 0; otherwise the key is absent.
   No other field is sent (deposit and discount untouched).
4. After the save the detail reloads and shows the new total, the new "còn thu" (API `amountDue` / local balance)
   and the new day count. iOS shows "N ngày" in "Ngày thuê" from `rentalDuration`; Android's "Lịch" row gains
   " · N ngày" computed from the plan days.

## Out of scope

- API repricing, per-item `rentalDays`, deposit, discount, payments, old (flag-off) screens.

## API and data

`PUT /api/orders/{id}` already accepts `returnPlanAt`, `rentalDuration`, `totalAmount`. Order id is the numeric
public id. Auth and scope unchanged (`orders.update`).

## Acceptance

- [x] Unit tests (iOS `Phase8Tests` / Android `Phase8LogicTest` or a new test): extra 0 → no `totalAmount`;
      extra 50 → total + 50; `rentalDuration` = pickup → new day inclusive; no pickup → no `rentalDuration`;
      new-total line hidden at 0.
- [x] iOS `POS ADBDTests` and Android `:app:testDebugUnitTest :app:assembleDebug` green.
- [x] Manual: extend one PICKUPED order with extra 100 on each app against a local API; DB row shows
      `totalAmount`, `rentalDuration`, `returnPlanAt`; screenshots of sheet and detail.
- [x] New strings in en + vi on both apps.
