# Spec — timezone batch C (#578 §C)

Day = Vietnam civil day key. Tests at 16:59:59Z / 17:00:00Z, month and year edges, under
`TZ=UTC`, `TZ=Asia/Ho_Chi_Minh`, `TZ=America/Los_Angeles`, `TZ=Asia/Tokyo` (process zone = browser zone).

1. One browser-safe helper module `packages/utils/src/core/shop-day.ts`: `getShopTodayKey`, `addMonthsToDateKey`
   (end-of-month clamp), week/quarter/month bounds, `dateKeyToPickerDate` / `pickerDateToDateKey`,
   `toShopDateTimeLocalValue` / `fromShopDateTimeLocalValue`, `formatInShopZone(value, locale, opts)`,
   `shopDayRangesOverlap`.
2. ADM-1: `getAdminDashboardDateRange` today/month/year from the Vietnam today.
3. ADM-4 / PKG-4: order date filter, quick filters and export dialog presets from the Vietnam today; a custom
   range keeps the typed keys; max/default via Vietnam keys; ranges handed out as Vietnam day bounds; the admin
   orders page writes the Vietnam keys to the URL.
4. ADM-5: extend dialog: base = Vietnam day of the current end, + N months with clamp, min = that day, saved end =
   23:59:59.999 Vietnam time. Owner question: the clamp rule.
5. ADM-6: subscription form reads the instants the edit page passes, shows/reads datetime-local in Vietnam wall
   time, and does not recompute end/next billing on load in edit mode.
6. ADM-7: dashboard charts and subscription totals bucket by Vietnam hour/day/month inside the Vietnam window.
7. ADM-9 / PKG-5: `packages/utils/src/core/date.ts` formatters and `packages/ui/src/lib/utils.ts` format in the
   Vietnam zone (a plain day key stays that day). Admin pages listed in the audit use `formatInShopZone`. Audit-log
   timestamps stay in the viewer's zone and show the zone name.
8. PKG-3: admin create/edit order picker: key from the tapped cell's local y/m/d; keys shown via local-midnight
   dates (`new Date(y, m-1, d)`). Date-range picker compares by day, "tomorrow" preset from the Vietnam today.
9. PKG-8: `useProductAvailability` compares Vietnam civil days inclusively.
10. PKG-9: delete unused month helpers in `utils/src/api/calendar.ts`; `usePaymentsData` today/month/year by
    Vietnam keys.
