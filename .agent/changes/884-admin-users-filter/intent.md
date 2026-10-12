# Admin users page: filter by merchant and outlet

Issue: #884 · Author: agent for Trinh Tran · Status: accepted (owner 2026-10-12, "giữ đơn giản và chuẩn") · Created: 2026-10-12

## Problem

https://admin.anyrent.shop/users lists every user of every shop. Support staff cannot narrow it to one shop
or one branch, so finding a shop's staff means scrolling or guessing a search term.

## Outcome

- The admin Users page has a merchant select and an outlet select next to the role filter.
- The outlet select is disabled ("Select merchant first") until a merchant is chosen, then lists that shop's outlets.
- Choosing a merchant shows only its users; choosing an outlet shows only that outlet's users; Clear shows all.
- Filters live in the URL (`merchantId`, `outletId`), so a reload or a shared link keeps them.
- Works at 390px (chip row) and 1280px.

## Constraints

- `GET /api/users` already accepts `merchantId` / `outletId` for ADMIN/OPS (`apps/api/app/api/users/route.ts`):
  no API change. Installed apps are untouched.
- Reuse the admin Orders filter pattern (`SearchableSelect`, outlets via `outletsApi.getOutletsByMerchant`).
- Opt-in prop on the shared `UserFilters`, so `apps/admin/app/merchants/[id]/users` (another agent, #882) and
  `apps/client` are unchanged. Do not touch merchants/[id], Plans (#882) or products (#883).
