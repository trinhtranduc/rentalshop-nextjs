# Intent — #602 timezone batch F (Android)

Part of #578 (spec §F, audit AND-1 … AND-9). Android counterpart of #596 / PR #601 (iOS is the reference).

**What:** the Android app decides every business day (cart pickup/return, edit and extension, availability window,
rent list filters, today, late days, rental-day count, day labels, receipts, the `timeZone` sent to the
calendar/overview/today-work) in the shop zone, through one accessor `ShopTime.zone`, whatever zone the phone is set to.

**Why:** a phone set to Tokyo, Los Angeles or UTC books, extends, filters and labels the wrong Vietnam day today
(a UTC phone sends `T00:00Z…T23:59:59Z`, the #413 bug again).

**Constraints:** no API change; wire formats unchanged; a phone set to Vietnam sends byte-identical requests to
today's build; clock times (HH:mm) may stay in the device zone; #567 phase 4 swaps the accessor in one line.
