# Plan

1. Guard in the PUT order route before the outletId auto-fill; owner check in the by-id, by-number and qr-code GETs.
2. Own-outlet check in the four availability routes where the outlet is chosen.
3. Turn `BF-ROLE-07..09` from known bugs into plain tests, add `BF-ROLE-09B`.
4. Run the whole business e2e suite under both time zones and the unit tests; compare with the baseline.
5. LOG row and PR with the API compatibility table.
