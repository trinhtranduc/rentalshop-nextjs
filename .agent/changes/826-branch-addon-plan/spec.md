# Spec — #826

- Multi-branch plan: the merchant's current plan has `limits.outlets > 1` or `-1` (unlimited). `limits` may be a
  JSON string. `0`, missing or unreadable `outlets`, or no subscription = not multi-branch. (The "0 = unlimited"
  fallback in `plan-limits.ts` is left as is; it only exists so legacy rows never block, and the plan form only
  accepts -1 or a positive number.)
- `POST /api/plan-limit-addons` and `POST /api/merchants/[id]/plan-limit-addons`: `outlets > 0` on a plan that is
  not multi-branch → 422 `ADDON_OUTLETS_NEED_MULTI_BRANCH_PLAN`, nothing written.
- `PUT /api/plan-limit-addons/[id]`: same 422 when the write adds branches: the add-on ends active with
  `outlets > 0` and either the outlets go up or an inactive add-on is turned back on. Notes, unchanged or lower
  outlets, and turning it off still work on an existing branch add-on.
- New error code in `ErrorCode` (422) and `locales/{en,vi,ja,ko,zh}/errors.json`.
- Admin add-on page shows the translated message (`useApiError().translateError`) for create, update, delete.
- Out of scope: existing add-ons, outlet creation limits, mobile apps (they do not call these routes).
