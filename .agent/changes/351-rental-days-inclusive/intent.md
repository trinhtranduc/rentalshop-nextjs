# Rental days: one inclusive count on web, API and mobile

Issue: #351 · Author: Trinh Tran (with Claude) · Status: accepted · Created: 2026-10-02

## Problem

Web and API count rental days as nights (`ceil((return - pickup) / 24h)`): 03/10 → 04/10 is 1 day.
iOS and Android count calendar days with both ends included: 2 days. Items priced per day (DAILY)
cost 2 × unit price on mobile and 1 × on the web for the same rental, and the web summary says "1 ngày".

## Proposed outcome

Rental days = Vietnam civil days from the pickup day to the return day, both included, minimum 1,
on web and in every API fallback. 03/10 → 04/10 = 2, same day = 1. HOURLY and FIXED are unchanged.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` creating or editing rentals on the web; `api` order create
fallback and shared pricing helpers in `packages/utils`. iOS and Android already follow the rule.

## Constraints

- Vietnam civil days (`timezone-dates`); tests under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
- Stored orders keep their `rentalDays` and prices.

## Open questions

- none

## Decision log

- 2026-10-02 — 03/10 → 04/10 counts as 2 days, including the price of per-day items (owner)
- 2026-10-02 — The pricing method (per day / per time) stays a per-item choice when creating the order (owner)
