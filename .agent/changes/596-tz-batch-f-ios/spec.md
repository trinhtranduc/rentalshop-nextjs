# Spec — #596 timezone batch F (iOS)

See #578 `spec.md` §F (F1–F4). For iOS:

1. `Date.shopTimeZone` is the only shop-zone accessor (computed, Vietnam today). `Date.shopCalendar` is a gregorian
   calendar in that zone.
2. Cart (IOS-1): a day tapped in the device-zone date picker (FSCalendar) becomes the same `yyyy-MM-dd` in the shop
   zone; pickup = start of that shop day, return = last second of the return shop day
   (`[D-1T17:00:00.000Z, DT16:59:59.000Z]`, the bytes a Vietnam phone sends today). `rentalDuration`, the
   batch-availability window and the conflict keys follow those instants in the shop zone.
3. Extension (IOS-2): picker in the shop zone; `RentalExtension` defaults to the shop zone.
4. Rent list filters (IOS-3): Today / 7 days / month / custom bounds are shop-zone midnights — the same ISO instants
   a Vietnam phone sends today (switching to `yyyy-MM-dd` keys would break the byte-identical rule F4); custom
   pickers in the shop zone.
5. Calendar / overview / today-work (IOS-4) send `timeZone=Asia/Ho_Chi_Minh`; `todayKey` is the shop day.
6. Product strip (IOS-5), late days / grouping / section titles (IOS-6), rental-day counts (IOS-7),
   `DayFormatter` (IOS-8) default to the shop zone.
7. IOS-9: `dateServerInString` stays in the device zone on purpose (its callers pass days tapped in device-zone
   pickers, whose device key is the tapped day); its `Date()` callers use the shop key. Draft reminders use the shop
   zone. Legacy flagged-off screens: listed in the PR with the reason when left.

Acceptance: XCTest cases under `NSTimeZone.default` = Tokyo, Los Angeles, UTC and Vietnam at the 16:59:59Z /
17:00:00Z boundary give the same strings in every zone, equal to what a Vietnam phone sends today.
