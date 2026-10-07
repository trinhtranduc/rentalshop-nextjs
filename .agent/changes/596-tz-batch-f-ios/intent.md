# Intent — #596 timezone batch F (iOS)

Part of #578 (spec §F, audit IOS-1 … IOS-9).

**What:** the iOS app decides every business day (cart pickup/return, extension, list filters, today, late days,
rental-day count, day labels, `timeZone` sent to the calendar/overview/today-work) in the shop zone, through one
accessor `Date.shopTimeZone`, whatever zone the phone is set to.

**Why:** a phone set to Tokyo, Los Angeles or UTC books, extends, filters and labels the wrong Vietnam day today.

**Constraints:** no API change; a phone set to Vietnam sends byte-identical requests to today's build; clock times
(HH:mm) may stay in the device zone; #567 phase 4 swaps the accessor for the shop's zone in one line.
