# Every product is shown at one branch at least

Issue: #1603 · Author: agent · Status: accepted · Created: 2026-11-16

## Problem

"Hiện ở chi nhánh" (#1341) can be unticked at every branch. After #1601 the owner's app no longer lists such a
product anywhere. The owner (2026-11-16): "bắt buộc ít nhất 1 chi nhánh được chọn, không được bỏ trống".

## Proposed outcome

No product that is not deleted ends without a listed row at an open branch: the API refuses the untick or the create
that would cause it (400 `PRODUCT_NEEDS_ONE_BRANCH`), the web form says so before saving, and a data migration lists
the products that are already in that state at the shop's default branch.

## Affected users and systems

`MERCHANT` (only the owner ticks). `api`, `client`, `prisma` (data only). Installed iOS / Android apps get the 400.

## Constraints

- The owner chose: the API refuses for installed apps too. They send the untick before the tick (branch order), so
  moving a product from an earlier branch to a later one in one save is refused; the message says to do it in two saves.
  The next app build sends ticks first (separate PR to `dev`).
- Migration: data only, idempotent, no delete; only rows of products listed nowhere.

## Decision log

- 2026-11-16 — API refuses for every client; migration lists the orphans at the default branch (owner)
