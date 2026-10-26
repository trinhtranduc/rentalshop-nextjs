# Admin outlet Edit link 404

Issue: #1185 · Author: owner · Status: accepted · Created: 2026-10-24

## Problem

Super admin Edit on `/merchants/28/outlets` goes to `/outlets/343/edit` and Next.js 404s. There is no `edit` route. Edit is in-page on `/outlets/343`. Not a role issue.

## Proposed outcome

That URL opens the outlet in edit mode. List Edit does not 404.

## Affected users and systems

ADMIN / OPS on `apps/admin`. No API.

## Constraints

Hotfix onto `main-real`. Dual IDs unchanged.
