# Plan — #582

1. `apps/client/app/components/auth/shop-auth.tsx`: client copy of the 4A field / button / notice classes
   (the `packages/ui` constants are not exported) + `AuthNotice`, `AuthStateCard`.
2. Rewrite the four auth pages on `ShopAuthPage` / `ShopAuthHeading` (from `@rentalshop/ui`), formik + yup
   as today, `useTranslations('auth')`. Add `auth.forgotPassword.*`, `auth.resetPassword.*`,
   `auth.verifyEmail.*` keys to en/vi/ja/ko/zh.
3. `apps/client/app/plans/plans-model.ts` (pure): `planLimits`, `planFeatures`, `limitText`, `cycleTotal`,
   `planPriceText` reusing `moneyText` from `settings/subscription-model.ts`.
   `tests/web-plans-model.test.ts` under both TZ.
4. Rewrite `apps/client/app/plans/page.tsx` on shell tokens (`cardClass`, `primaryBtn`, `outlineBtn`,
   `Modal` from orders parts). `plans.web.*` keys in 5 locales.
5. Restyle `affiliate/page.tsx` and `affiliate/guide/page.tsx` with the public header/footer; `t.rich`
   for the note; move hard-coded strings to `affiliate.json` (en, vi) and fix stale copy.
6. Verify: tsc apps/client before/after, eslint changed paths, Jest both TZ, Playwright screenshots
   1440/390 (+dark `/plans`), forget → reset with a fake token, page errors.
