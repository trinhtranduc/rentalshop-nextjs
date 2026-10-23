# Plan — Pricing page comparison and add-ons

Issue: #1171 · Status: implemented · Spec: ./spec.md

## Steps

1. Failing test (`bug-fix-tdd`): production-shaped Basic (`allowWebAccess: true`, no web feature) must have `web: false`; comparison helper omits API Access.
2. `planHasWebDashboard` + `visibleComparisonFeatures` in `apps/client/lib/pricing-format.ts`. `buildPricingCards` uses features, not `allowWebAccess`.
3. `PricingClient.tsx`: filtered comparison, add-on section, `PublicSiteHeader` / `PublicSiteFooter`.
4. `PublicSiteHeader`: Home link (`landing.navigation.home`) on desktop and phone.
5. i18n (`i18n-keys`): addon keys in all 12 `locales/*/plans.json`; `navigation.home` in all 12 `locales/*/landing.json`.
6. Verify: `cd tests && yarn test pricing-real-plans pricing-format landing-i18n public-pages-i18n`; open `/en/pricing`.

## Files

- `apps/client/lib/pricing-format.ts`
- `apps/client/app/pricing/PricingClient.tsx`
- `apps/client/app/components/PublicSiteHeader.tsx`
- `locales/*/plans.json`
- `locales/*/landing.json`
- `tests/pricing-real-plans.test.ts`
- `tests/pricing-format.test.ts`

## Risks

None for installed apps. Marketing copy only.

## Rollback

Revert the PR.
