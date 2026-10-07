# Spec — #559 Shared date-range calendar

## Component (`apps/client/app/components/date-range/`)

- `range-model.ts` (pure, no `@rentalshop/*`): `monthOf`, `shiftMonth`, `monthCells`, `pickDay`, `dayMark`
  (moved from `orders/create/calendar-model.ts`), plus `rangeDays(from, to)` (inclusive, same day = 1),
  `dayAllowed(key, { min, max })`, `rangeProblem(from, to, maxDays)` → `missing | tooLong | null`.
- `RangeCalendar.tsx`
  - `RangeCalendar`: two months ≥640px, one on phones, Monday-first, today ringed, click start then end,
    hover preview; optional `min` / `max` (days outside are disabled); optional `hints` for the line above the grid.
  - `DateRangeField`: compact trigger "T4 01/10 → T6 31/10 · 31 ngày" with a calendar icon; opens a popover under
    the trigger on ≥640px and a full-width bottom sheet on phones; quick picks from the caller; summary line;
    Huỷ / Áp dụng. `onChange(from, to)` fires only on Áp dụng. Escape and outside click close it.
- Labels from `common.dateRange.*` (en, vi).

## Places

| Screen | File | Before | After | URL / API |
|---|---|---|---|---|
| Tạo đơn / Sửa đơn | `orders/create/parts.tsx` | local `RangeCalendar` | shared `RangeCalendar` in the same modal | unchanged |
| Tổng quan "Tuỳ chọn…" | `dashboard/page.tsx` | 2 date inputs + Xem | `DateRangeField` (opens when the tab is picked), no future days | `?period=custom&from&to`, `startDate/endDate` unchanged |
| Kiểm tra còn hàng | `availability/page.tsx` | pickup / return inputs | one `DateRangeField` "Ngày giao → trả" | `?pickup&return`, check params unchanged |
| Đơn hàng "Ngày tạo · Tuỳ chọn" | `orders/page.tsx` | 2 date inputs + Áp dụng | `DateRangeField`, no future days | `?created=custom&from&to` unchanged |

Product / customer detail order lists have no date filter (grep `type="date"` in `apps/client/app`).
`SettingsSubscriptionMerchantActions` has a single date and stays.

## Acceptance

- Same-day pick reads "· 1 ngày". End before start swaps. Disabled days cannot be clicked.
- Tạo đơn calendar works as in #558.
- Light/dark at 1440 and 390, no page errors, API requests unchanged.
- No API change → no mobile parity or API compat review needed.
