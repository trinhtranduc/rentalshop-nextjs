# #923 Intent — attendance apps: my-week hours, Android rows, copy, stable JSON test

## Why
The final e2e of the Chấm công module on `dev` `dab1050aa` (Refs #906) found four app issues:
1. "Ca và công của tôi": a record added by hand on a day with a shift shows 8,9 g; the server and the web count
   7,9 g (shift break 60′). Day rows do not add up to the month total.
2. Android packs two records of a day into one line and wraps the shift name; iOS shows one line per record.
3. Seven Android strings differ from iOS (vi, en).
4. iOS `ShopTimeZoneTests.testVietnamPhoneSendsTheSameBytesAsBefore` is flaky: it compares JSON bytes without
   a fixed key order.

## Outcome
Row hours equal the server's, Android one line per record, Android copy = iOS, the test is stable.

## Constraints
No API change. Owner approved 2026-10-13. The Chấm công (clock in / out) screen layout is not touched; it is being
redesigned separately.
