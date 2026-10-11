# Spec
- The calendar page reads `GET /api/subscriptions/status` (open to blocked merchants; answers 403 with a
  `SUBSCRIPTION_*` code on older builds, #728) once per load and on "Thử lại".
- Blocked = status `EXPIRED | CANCELED | CANCELLED | PAUSED | PAST_DUE`, or a failed answer with code
  `SUBSCRIPTION_EXPIRED | SUBSCRIPTION_CANCELLED | SUBSCRIPTION_PAUSED | SUBSCRIPTION_PAST_DUE | TRIAL_EXPIRED`.
  Anything else (ACTIVE, TRIAL, no subscription, network error) is not blocked: the calendar loads as today.
- Blocked: the month card shows `calendar.web.loadFailed` + Thử lại, cells show no counts, both day sections show
  `dayFailed` + Thử lại. Thử lại re-reads the status and the data; after renewal the calendar loads.
- Pure rule `subscriptionBlocked(res)` in `calendar-model.ts`, tested in `tests/web-calendar-subscription.test.ts`.
