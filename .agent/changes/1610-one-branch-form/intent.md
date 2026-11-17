# Product form of a one-branch shop shows no branch

Issue: #1610 · Author: agent · Status: accepted · Created: 2026-11-16

## Problem

The owner (2026-11-16): "phần tạo sản phẩm UI nếu có 1 chi nhánh thì không cần hiện chi nhánh". On the web form a shop with
one branch still reads "Tại {branch}" under "Số lượng" (`form.quantityAt`). iOS and Android already show "Số lượng" alone
(they count open branches only, `BranchListing.showsTick`).

## Proposed outcome

With one branch, the web form (create and edit) has only "Số lượng", with no branch name. Two or more branches: unchanged.

## Constraints

No API change. Branch roles: unchanged.

## Decision log

- 2026-11-16 — "one branch" = one open branch. The form's list (`/api/merchants/{id}/outlets`) already holds open branches
  only (checked on a local API with one branch closed), so closed branches never count; edit included (agent)
