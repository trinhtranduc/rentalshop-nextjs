# Spec — #1187

## Outlet add-on on a 1-outlet plan

- `POST /api/merchants/[id]/addons` with an `outlets` price-list row succeeds on Professional / Basic (`limits.outlets === 1`) the same way as extra users. Quote too.
- Legacy `POST /api/plan-limit-addons` and `POST /api/merchants/[id]/plan-limit-addons` with `outlets > 0` succeed on a 1-outlet plan. `PUT` may raise `outlets`.
- Admin add-ons page lists active outlet rows for every shop with a subscription (no `multiBranchPlan` hide).
- Add-on prices hint no longer says Enterprise-only.
- `outletAddonsBlockPlan` never blocks a plan switch: extra outlets are paid add-ons on any plan.
- Error code `ADDON_OUTLETS_NEED_MULTI_BRANCH_PLAN` stays in the catalog (unused). `isMultiBranchPlan` stays for `GET …/addons` `multiBranchPlan` (display).

## Admin enable loyalty

- `PUT /api/merchants/[id]/modules/loyalty` `{ enabled, endDate? }` is ADMIN only, same body as attendance. 200 + `MerchantModule` row. GET catalog lists `attendance` and `loyalty`.
- Add-ons page: when `featureSources` loyalty is off, ADMIN sees **Bật Khách thân thiết**. When on only via the legacy switch (not plan, not add-on), **Tắt Khách thân thiết**. Plan-included loyalty stays the "theo gói" pill; paid add-on stays "Tắt từ kỳ sau".
- Buying the loyalty add-on when the plan already has it still 422 `ADDON_FEATURE_IN_PLAN`.

## Out of scope

- Changing plan prices or creating the price-list row (must already exist in Add-on prices).
- Forcing Enterprise. Client/merchant self-serve buy.
