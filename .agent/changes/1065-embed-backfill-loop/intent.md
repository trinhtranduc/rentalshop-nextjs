# Admin embedding backfill card: load the status once

Issue: #1065 · Author: Trinh Tran (agent) · Status: approved · Created: 2026-10-18

## Problem

Release e2e for #1049: Settings › Admin Info sends `GET /api/admin/embedding-backfill` about 200 times a second
(4037 requests in 20 s while the page sits idle). `EmbeddingBackfillCard.loadStatus` depends on `toastError`, which
`useToast()` recreates on every render, and an effect runs `loadStatus` whenever its identity changes.

## Proposed outcome

The card loads the status once on mount, once more on "Làm mới" and after a real (non dry-run) run. `useToast()`
returns stable functions, so other admin/client pages that list `toastError` / `toastSuccess` in deps stop re-running.

## Affected users and systems

Admin web (`apps/admin`), `packages/ui` (admin and client). No API, no mobile, no data.

## Constraints

Blocker for release #1049. `useToast` keeps the same return shape.

## Decision log

- 2026-10-18 — fix both the card (ref, mount-only loader) and the root (`useToast` memoised) (owner task)
