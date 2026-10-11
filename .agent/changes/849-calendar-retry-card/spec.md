# Spec
- The calendar page reads `GET /api/subscriptions/status` (open to blocked merchants; answers 403 with a
  `SUBSCRIPTION_*` code on older builds, #728) once per load and on "Thử lại".
- Blocked (same as the API gate in `packages/auth/src/core.ts`) = computed `status` `EXPIRED | CANCELED | CANCELLED |
  PAUSED | PAST_DUE`, or stored `dbStatus` `PAUSED | PAST_DUE` (the route computes `status` from the period end only,
  so a paused / past-due shop with a running period reads `ACTIVE`), or a failed answer with code `SUBSCRIPTION_EXPIRED |
  SUBSCRIPTION_CANCELLED | SUBSCRIPTION_PAUSED | SUBSCRIPTION_PAST_DUE | SUBSCRIPTION_PERIOD_ENDED | TRIAL_EXPIRED`.
  A cancelled shop keeps access until its period ends (`dbStatus CANCELLED`, `status ACTIVE`): not blocked.
  Anything else (ACTIVE, TRIAL, no subscription, network error) is not blocked: the calendar loads as today.
- Blocked: the month card shows `calendar.web.loadFailed` + Thử lại, cells show no counts, both day sections show
  `dayFailed` + Thử lại. Thử lại re-reads the status and the data; after renewal the calendar loads.
- Pure rule `subscriptionBlocked(res)` in `calendar-model.ts`, tested in `tests/web-calendar-subscription.test.ts`.
