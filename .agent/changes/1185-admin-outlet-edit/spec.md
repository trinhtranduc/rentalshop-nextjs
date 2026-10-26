# Spec — #1185

1. `apps/admin/app/merchants/[id]/outlets/page.tsx` does not navigate to `.../outlets/:id/edit`.
2. `.../outlets/[outletId]/edit` exists and redirects to `.../outlets/[outletId]?edit=1`.
3. The detail page opens in editing when `?edit=1`.

## Out of scope

API, outlet create, bank accounts, other `/edit` admin pages that already exist.
