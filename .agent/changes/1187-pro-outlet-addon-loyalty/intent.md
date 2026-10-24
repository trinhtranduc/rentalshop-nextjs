# Intent — #1187 Pro outlet add-on + admin enable loyalty

## Wanted

On admin.anyrent.shop, a Professional shop (1 included outlet) can buy **Thêm chi nhánh**. Super admin can **Bật Khách thân thiết** for a shop whose plan does not already include it.

## Why

Áo Dài Bình Dương is Professional. Extra doors should be an add-on, not a forced Enterprise upgrade. Loyalty on Basic (or a Pro plan missing the feature) should be an admin switch, not only a paid add-on.

## Constraints

- Additive: requests that 422/404 now succeed. Keep `ADDON_FEATURE_IN_PLAN` so a plan that already has loyalty is not sold twice.
- Installed POS apps do not call these admin routes.
- Do not mix #984. Branch from `main-real` (dest remote missing).
- Dual IDs, ADMIN-only for the module PUT (unchanged).
