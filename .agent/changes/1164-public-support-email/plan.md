# Plan — Public support mailbox

Issue: #1164 · Status: accepted · Spec: ./spec.md

## Steps

1. Replace public Gmail with `support@anyrent.shop` on client landing, footer, legal pages, JSON-LD, iOS, Android.
2. Add `landing.footer.emailAddress` in all locale `landing.json` files (`i18n-keys`).
3. Show the address in `PublicSiteFooter` and the unused landing `Footer` so both stay in sync.
4. Verify: grep + landing footer UI. No API tests. `mobile-parity` for the displayed Settings email only.

## Files

- `apps/client/app/LandingPageClient.tsx` — contact card, JSON-LD, footer mailto
- `apps/client/app/components/PublicSiteFooter.tsx` — visible address
- `apps/client/app/page.tsx`, `lib/schemas.ts`, `privacy/page.tsx`, `terms/page.tsx`
- `locales/*/landing.json` — `footer.emailAddress`
- iOS `AppInformationViewController.swift`, Android `SettingsScreens.kt`

## Risks

Installed apps still show Gmail until a store rebuild. Web updates on client deploy.

## Rollback

Revert the PR; mailbox at Hostinger can stay.
