# Admin has the --ar-ai-scan token

Issue: #1449 · Author: Claude · Status: in-review · Created: 2026-11-02

## Problem

#1390 added `--ar-ai-scan` to `apps/client/app/globals.css` only. `tests/admin-theme-tokens.test.ts` (#802) requires the admin light `--ar-*` tokens to equal the portal's, so it is red on `dev` and green on `main-real`. A new red suite blocks the release (`release-review` step 2).

## Proposed outcome

The test is green in both time zones. Nothing changes on screen: no admin code uses this token.

## Constraints

One CSS line. No test change. No change under `apps/api`, `prisma`, `packages`.
