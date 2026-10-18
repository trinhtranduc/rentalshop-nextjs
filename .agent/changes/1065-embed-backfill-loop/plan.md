# Plan — Admin embedding backfill card: load the status once

Issue: #1065 · Status: approved · Spec: ./spec.md

## Steps

1. Failing test first: `tests/admin-embedding-backfill-load-once.test.ts` transpiles the real card and `toast.tsx`
   and runs them on a small hook runtime (no jsdom/RTL in `tests/`). It counts status fetches on mount, after a
   dry run and after Refresh, and checks `useToast` identities across renders.
2. `packages/ui/src/components/ui/toast.tsx`: `useToast` wraps its functions in `useMemo` over the provider's
   stable `addToast` / `removeToast`.
3. `apps/admin/app/settings/admin/EmbeddingBackfillCard.tsx`: `t` / `toastError` read through a ref, `loadStatus`
   has empty deps, so the mount effect runs once whatever the hooks return.
4. Verify: the test, the whole `tests/` suite, `tsc` for admin (compare with origin/dev), headed Chrome request count
   over 20 s idle against a local admin + API with its own Postgres.

## Files

- `apps/admin/app/settings/admin/EmbeddingBackfillCard.tsx`
- `packages/ui/src/components/ui/toast.tsx`
- `tests/admin-embedding-backfill-load-once.test.ts`

## Risks

A caller that relied on a new toast function every render to re-run an effect: none found. The provider's
`addToast` / `removeToast` were already stable (#919).

## Rollback

Revert the PR.
