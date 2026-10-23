# Pricing page: Basic has no web, no API row, add-ons listed

Issue: #1171 · Author: Trinh · Status: implemented · Created: 2026-10-23

## Problem

On `/pricing` and `/{locale}/pricing` the comparison table shows Web Dashboard for Basic. Basic shops cannot use the web dashboard. The table also lists API Access, which we do not sell. Extra user, extra outlet, and attendance cost money, but the page does not say so.

## Proposed outcome

Basic shows no web dashboard. Professional and Enterprise still show it. API Access is gone. A visible add-on block lists extra user, extra outlet, and attendance as paid extras.

## Affected users and systems

Public visitors on `apps/client` `/pricing` and `/{locale}/pricing`. No POS, no API, no login rules.

## Constraints

Do not change `allowWebAccess` in the database in this issue. Do not invent outlet or attendance prices (only the extra-user 30.000 ₫/month already on the landing is public). 12 public languages.

## Open questions

None.

## Decision log

- 2026-10-23 — Owner: Basic cannot use web; comparison was wrong (owner).
- 2026-10-23 — Owner: list add-ons for extra user, extra outlet, attendance (owner).
- 2026-10-23 — Owner: drop API Access from the comparison (owner).
- 2026-10-23 — Owner: pricing page needs a menu way back to the landing (owner).
