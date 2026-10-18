# Spec — Admin embedding backfill card: load the status once

Issue: #1065 · Status: approved · Intent: ./intent.md

## Behavior

1. Opening Settings › Admin Info sends exactly one `GET /api/admin/embedding-backfill`; an idle page sends no more.
2. "Kiểm tra" (dry run) sends one `POST` and no `GET`. "Làm mới" sends one `GET`. A confirmed real run sends one
   `POST` then one `GET`.
3. `useToast()` returns the same `toastSuccess`, `toastError`, `toastWarning`, `toastInfo`, `removeToast` (and the
   deprecated `success` / `error` / `warning` / `info` aliases) on every render under the same provider.
4. Toast texts, durations and the card's UI are unchanged.

## Out of scope

Rewriting other pages' `useCallback` deps; they become stable through (3).
