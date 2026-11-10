# Spec — iOS Orders after an outlet change

Issue: #1525 · Status: accepted · Intent: ./intent.md

## Behavior

1. After `outletDidChange()`, the segment on screen reloads with a spinner (rows cleared) and sends one request.
2. After `outletDidChange()`, selecting a segment that was loaded before does not show its old rows: it loads with a spinner.
3. A fresh load is never served from a snapshot taken before the change.
4. An order change (`markDirty`) and the 5-minute TTL behave as before.

## Out of scope

Android, the Orders screen outlet button, API.

## API and data

None.

## Acceptance

- [ ] Behaviors 1–3: `OrdersHomeTests` (`testOutletChange…`)
- [ ] Behavior 4: existing refresh tests stay green
