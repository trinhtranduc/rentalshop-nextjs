# Settings detail pages in the new UI style

Issue: #459 · Author: agent (for Trinh Tran) · Status: accepted · Created: 2026-10-05

## Problem

With `newSettings` on (the default since #456), the redesigned Settings tab (#374) opens detail pages that
still use the old look: old navigation bar, inset-grouped iOS tables / Material top bars and cards, old text
fields and old buttons. Every tap from the new Settings list lands in a different visual style.
Owner, 2026-10-05: "các trang detail ở setting cũng nên theo style mới".

## Proposed outcome

With `newSettings` on, the pages opened from Settings v2 use the new UI (tokens, #424 type scale, grouped
list with grey section bands and thin dividers, v2 back header, v2 form fields, v2 primary/secondary
buttons). iOS is the reference; Android matches. With `newSettings` off the old pages look exactly as before.

## Affected users and systems

All roles that open Settings (`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF`, `ADMIN`). iOS and Android apps only.
No API, data or string change.

## Constraints

- Restyle only. No new rows, features or screens (owner: keep it lean).
- Behaviour, API calls, validation, permissions unchanged (user management only for roles that manage users;
  store edit only with `canManageOutlets` / `canManageStore`; OUTLET_STAFF limits unchanged).
- Flag-off path untouched.
- Do not touch the order-row files of the parallel change (OrderRowCell, overview drill-down lists, pay line).

## Open questions

- None. The modal "Sửa cửa hàng" (iOS `EditStoreViewController`) is reached from Store information but is
  not one of the five rows; it stays as is in this change.

## Decision log

- 2026-10-05 — Restyle in place behind a `v2` switch that only Settings v2 turns on (iOS: a property set
  when Settings v2 pushes the page; Android: a `v2` parameter the nav host passes when `newSettings` is on).
  Keeps one copy of the behaviour, API calls and validation instead of duplicating them (agent, per brief
  "choose the least risky").
