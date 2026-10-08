# Intent — #663 public shop API leaks cost price

Status: accepted (owner, 2026-10-08: "không được hiện giá vốn")

## Problem
`GET /api/public/{tenantKey}/products` needs no login and returns `costPrice` (giá vốn) for every product,
plus internal fields (`embeddingGeneratedAt`, `barcode`, outlet-stock CUIDs). Seen on production and dev-api.

## Outcome
The public route returns an allowlist of shop-facing fields only. The shop page keeps working.

## Constraints
- Only reader: web shop page `apps/client/app/[tenantKey]/products`. Mobile apps on `main-real` never call `/api/public`.
- Keep every field that page reads, and `pricingOptions` (per-day price for the shop redesign).
