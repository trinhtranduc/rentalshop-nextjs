# Plan — Nhân viên kho (`OUTLET_INVENTORY`)

Issue: #682 · Status: accepted · Spec: ./spec.md

## Steps

1. **Failing tests first** (`test-driven`): `tests/packages/auth/permissions.test.ts` (role exists, staff ⊂ inventory,
   inventory has the four product keys, others unchanged snapshot); `tests/api/user-route-scope.test.ts`
   (`canAssignRole`, flag off → refused).
2. **DB** (`db-migration`): `prisma/schema.prisma` enum + `prisma/migrations/<ts>_add_outlet_inventory_role/`
   (`ALTER TYPE "UserRole" ADD VALUE 'OUTLET_INVENTORY'`).
3. **Shared packages**: `packages/constants/src/status.ts` (`USER_ROLE`, add `OUTLET_ROLES` +
   `isOutletRole`, `STAFF_LIKE_ROLES` + `isStaffLikeRole`), `packages/types` unions + boolean `ROLE_PERMISSIONS`,
   `packages/utils` zod enums + `PLAN_LIMIT_USER_ROLES` + badge/role utils, `packages/auth` (`permissions.ts`,
   `normalizeRole`, helpers, `unified-auth` role lists), `packages/middleware` requiredRoles.
4. **API** (`api-route-standard`): replace each `OUTLET_ADMIN || OUTLET_STAFF` pair with `isOutletRole`, each
   `=== OUTLET_STAFF` money/action block with `isStaffLikeRole`; update `lib/user-scope.ts`,
   `lib/user-merchant-assignment.ts`, `lib/calendar-scope.ts`, `lib/change-history.ts` (unchanged list = excluded),
   notifications `ROLES`, `MOBILE_ROLES`, 4-role `withAuthRoles` lists, categories `[id]` PUT/DELETE + GET branch,
   products DELETE outlet rule, `merchants/[id]/users` POST `canAssignRole`; flag `INVENTORY_ROLE_ENABLED` in
   `canAssignRole` callers + `app-config` `features.inventoryRole`. Grep gate: no remaining bare
   `OUTLET_STAFF` comparison without a reviewed reason.
5. **Web** (`i18n-keys`): `staff-form-model.ts`, `users-model.ts`, `staff-parts.tsx` role card, `nav.ts`,
   `settings-model.ts`, orders/products models, `ProductFormPage`/`form-model`, `role-utils`, `useUserRole`,
   admin labels; `locales/{en,vi,ja,ko,zh}` (`users.json` roles/roleHelp/rolesCard, `common.json` roles).
6. **iOS** (`mobile-parity`): `Model/User.swift` enum + login/register mapping, `ProductsV2.swift`
   `ProductAccess`/`CategoryRules`, staff-like checks (`OrdersHomeViewModel`, `OverviewViewController`,
   `SettingsViewController`, `ChangeHistory`, `SettingsV2`), `UserFormViewController` allowed roles + flag,
   `Localizable.strings` vi/en; unit tests.
7. **Android**: `PermissionManager.kt` enum + helpers, `ProductRules.kt`, staff-like checks
   (`BankAccounts`, `ChangeHistory`, `OverviewLogic`, `SettingsRows`, `SettingsScreens`, `SettingsParity`),
   strings vi/en; unit tests.
8. **Seed + e2e**: `scripts/regenerate-entire-system-2025.js`, `scripts/mobile-e2e/seed-local.sh`,
   `tests/e2e/business/inventory-role.e2e.test.js`, `tests/e2e/TEST_CASES.md`.
9. **Compat** (`api-compat-review`): row in `.agent/api-changes/LOG.md`, PR `## API compatibility` table,
   env `INVENTORY_ROLE_ENABLED` in `env.example` / deployment doc.

## Verify

- `cd tests && yarn test permissions user-route-scope web-users-form web-shell-nav web-products-form`
- `yarn type-check`, `yarn lint`, `SKIP_ENV_VALIDATION=true yarn build`
- `scripts/e2e/business-e2e.sh` (BF-INV-* and the existing BF-STAFF-* still green, TZ=UTC and Asia/Ho_Chi_Minh)
- iOS `xcodebuild … test` (ProductsV2Tests, role tests) and Android `./gradlew :app:testDebugUnitTest :app:assembleDebug`
- `mobile-e2e-local` with `inventory.outlet1@example.com` on both apps; web login as it in a headed browser

## Risks

- A missed `OUTLET_STAFF` comparison gives the new role too much (money) or too little (scope). Mitigation:
  the grep gate in step 4 and the BF-STAFF + BF-INV suites.
- Old Android users with the role break; mitigation is the default-off flag (spec 10).

## Rollback

Turn `INVENTORY_ROLE_ENABLED` off (no new assignments); move affected users back to `OUTLET_STAFF`.
The enum value stays (Postgres cannot drop an enum value cheaply); unused it is harmless.
