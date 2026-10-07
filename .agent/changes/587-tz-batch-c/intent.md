# Intent — timezone batch C: admin app and shared UI use the Vietnam day

Issue: #587 (sub-issue of #578) · Spec: #578 `spec.md` §C · Status: in progress · Created: 2026-10-07

## Problem

The admin app and the shared `packages/ui` / `packages/hooks` code take "today", presets, month math, picker
days and displayed business dates from the browser zone (or the UTC day via `toISOString().split`). An admin
whose browser is not on Vietnam time (UTC, Los Angeles, Tokyo) gets the wrong day; even a Vietnam browser saves
subscription dates 7 hours off. Audit IDs: ADM-1, ADM-4, ADM-5, ADM-6, ADM-7, ADM-9, PKG-3, PKG-4, PKG-5, PKG-8, PKG-9.

## Outcome

C1–C4 of #578: presets and custom ranges send Vietnam keys whatever the browser zone; the subscription form and
extend dialog keep the same instant on save without edits and extend to the Vietnam end of day; the admin
create/edit order picker returns the tapped day's key; business dates display in the Vietnam zone.

## Constraints

No API, schema or data change; request shapes unchanged (`YYYY-MM-DD` keys and ISO instants as today). A browser
set to Vietnam sends what it sends today, except the subscription fixes (those were wrong in Vietnam too).
`apps/client` is batch D and is not edited; client importers of the changed shared code are checked.

## Open question for the owner

Extension month math clamps to the end of the month (31 Jan + 1 month = 28/29 Feb). Not confirmed yet.
