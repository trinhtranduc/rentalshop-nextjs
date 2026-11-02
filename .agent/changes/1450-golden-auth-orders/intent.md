# Golden test for GET /api/orders and the auth error paths

Issue: #1450 · Author: Claude · Status: in-review · Created: 2026-11-02

## Problem

`release-review` step 3.4 asks for a golden proof for each changed mobile endpoint without a clear "additive only" reading. #1409 changes the answer of every authenticated route when the database fails during authentication, and #1392 turns a manager's bank account write into 403. `tests/api-compat/` has no golden for `GET /api/orders` or for `authenticateRequest`.

While reading the diff: #1409 also changes `code` from `IMAGE_UPLOAD_FAILED` to `UPLOAD_IMAGE_FAILED` on `POST /api/products` and `PUT /api/products/[id]` when an upload fails. The table of that PR says `code` is kept and no LOG row names it.

## Proposed outcome

A golden file recorded from `origin/main-real`, a test that says which answers may differ and why, and the missing LOG row.

## Constraints

Tests and records only. No code under `apps/` or `packages/` changes.

## Decision log

- The LOG row records the code change instead of reverting it: both codes have a sentence in every installed app and no client branches on either. The owner can ask for the revert.
