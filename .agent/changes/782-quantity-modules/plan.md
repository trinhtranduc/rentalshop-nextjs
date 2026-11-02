# Plan (after the owner's "chốt")

0. Reopen #782 with the scope of `spec.md` section 3 and the compat table. Branch `feat/782-addon-gaps` from `origin/dev`. Drop nothing from `feat/782-modules` and do not merge it.
1. Failing tests, under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`:
   - `packSize = 1`, typed 100: limit +100, quote, renewal keeps +100, more and fewer via `packs`, 100,000 accepted.
   - Loyalty purchase sets `isActive`, in `tests/packages/database/loyalty-addon-db.test.ts` and `tests/e2e/business/loyalty-addon.e2e.test.js` (drop the manual SQL in `startProgram`).
   - Status route: new fields present, `limits` unchanged, read failure leaves them out.
   - `tests/api/plan-limit-addon-branch-plan.test.ts:186` changes: no `enable-loyalty` button.
2. `packages/utils/src/core/addon-pricing.ts`: raise the `packs` maximum.
3. `packages/database/src/addon-price.ts`: loyalty purchase provisions and activates in the transaction.
4. `apps/api/app/api/subscriptions/status/route.ts`: additive fields. Add the LOG row.
5. Admin: `plans/addon-prices/page.tsx` defaults and label; `merchants/[id]/addons/page.tsx` dialog, labels, unlimited-plan block, no free button. Check in a visible browser at 390px and desktop.
6. Web: `apps/client/app/settings/SubscriptionTab.tsx`, `subscription-model.ts`, new key in 5 locales. Run `cd tests && npx jest locales-valid-json`.
7. `verify-change`: lint, type-check, tests, `scripts/e2e/business-e2e.sh`. PR to dev in Vietnamese with the compat table.
8. After release, admin creates the rows and prices: Thêm chi nhánh, Thêm sản phẩm, Thêm đơn, Khách thân thiết.
