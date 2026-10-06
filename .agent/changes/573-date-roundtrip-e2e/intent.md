# Chosen rental days round trip (API + shop web e2e)

Issue: #573 · Author: Claude (for Trinh Tran) · Status: in progress · Created: 2026-10-06

## Problem

Owner: "lúc tạo đơn chọn ngày này nọ thì lúc load về, check calendar có chuẩn không, cần có test kỹ".
Days are chosen in the Vietnam calendar but sent as UTC instants, and every client builds them differently
(web `dayStartIso`, iOS start/end of the device day, Android `OrderPlanDays`, old apps with UTC-day windows).
Most hotfixes in this repo were timezone bugs. Nothing checks end to end that the days come back unchanged on
every screen that reads the order.

## Proposed outcome

Two committed suites, runnable on a laptop:

- A. API round trip in `tests/e2e/business` (both process zones) for every client's instant shape.
- B. Browser round trip on the shop web (Playwright) in three browser zones.

Each mismatch becomes a bug issue and a known-bug case, so the suites stay green while the bug is open.

## Affected users and systems

MERCHANT on the shop web, iOS and Android apps (their create payloads are replayed over HTTP), API endpoints
`/api/orders*`, `/api/calendar/orders/*`, `/api/products/batch-availability`, `/api/analytics/outlet-operations`.

## Constraints

Tests only, no app code. Local API and DB. Day keys in test logic (`timezone-dates`). Cancel what the web suite creates.

## Open questions

- Old Android (before #413) saved the return as `R T23:59Z` (= R+1 06:59 VN). Should the API read it back as R?

## Decision log

- 2026-10-06 — Calendar by-date lists an order on its pickup day (default) and on its return day only with
  `kind=return` for PICKUPED orders; the middle days are not listed there (availability covers them). (Claude, from route code)
