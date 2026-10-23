# Spec — Pricing page comparison and add-ons

Issue: #1171 · Status: implemented · Intent: ./intent.md

## Behavior

1. A pricing card’s `web` flag is true only when that plan’s **features** include web dashboard (or “all professional features”). `limits.allowWebAccess` alone is not enough. Production Basic has `allowWebAccess: true` and no web feature → `web` is false.
2. The comparison “Web Dashboard” cell for Basic is false / X. Professional and Enterprise stay true.
3. The comparison table does not include an API Access row.
4. Below the comparison, a section lists paid add-ons: extra user (30.000 ₫/month, already on the landing), extra outlet (extra monthly fee), attendance / chấm công (extra monthly fee).
5. Copy lives in `locales/*/plans.json` `pricingPage` for all 12 public languages.
6. `/pricing` uses `PublicSiteHeader` / `PublicSiteFooter`. The public header has a Home link (`landing.navigation.home`) so visitors can leave pricing without the browser back button.

## Out of scope

Login / `allowWebAccess` in the database. Changing catalog addon prices. Mobile apps. Landing homepage pricing cards (they already list features from the API).

## API and data

No API change. Cards still come from `GET /api/plans/public`.

## Acceptance

- [ ] `cd tests && yarn test pricing-real-plans pricing-format`
- [ ] `/en/pricing` Basic Web Dashboard is X; no “API Access” / “Truy cập API”
- [ ] Add-on section visible in Vietnamese and English
