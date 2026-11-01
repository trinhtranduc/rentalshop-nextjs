# Repair the merge of dev into #1426

Issue: #1428 · Author: Claude · Status: in-review · Created: 2026-11-01

## Problem

The conflict resolution in c34c3cd97 kept both sides in `settings.tsx` and lost a closing brace in `AnyRentE2ETests.swift`. On dev the web order page declares its constants twice and the iOS UI test target does not compile.

## Proposed outcome

Both files say what #1424 and #1426 meant. No behaviour beyond that.

## Constraints

No change under `apps/api`, `prisma` or API packages.

## Decision log

- `tests/web-note-photo-limit.test.ts` already catches the web half. It did not run on that merge commit.
