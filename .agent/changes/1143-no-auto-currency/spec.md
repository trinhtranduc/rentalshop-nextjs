# Spec — Opening Settings must not change the shop currency

Issue: #1143 · Status: approved · Intent: ./intent.md

## Behavior

1. `POST /api/auth/register` and `/register/merchant-google` create the merchant with `currency`:
   - explicit language (body `locale`, else `NEXT_LOCALE` cookie) starting with `vi` → `VND`, any other → `USD`;
   - no explicit language → the existing onboarding locale (`country`, then `Accept-Language`, default `vi`):
     `vi` → `VND`, `en` → `USD`.
2. Body `locale` accepts any short language tag (was only `en` / `vi`); `en` / `vi` keep working. The onboarding
   seed copy is unchanged (`resolveOnboardingLocale`: `en*` → en, everything else → vi).
3. The web sign-up form sends its UI language as `locale` (ja → `ja`, was `vi`).
4. The web Settings panel never calls `PUT /api/settings/currency` by itself; `currencyForLocale` is gone.
5. Existing merchants and admin `POST /api/merchants` are untouched.

## Why a missing language defaults to VND

Old iOS / Android send no `locale` but send `Accept-Language: en|vi` (app language), so they get vi → VND,
en → USD. A request with no signal at all falls back to `vi`, the same default the onboarding copy already uses,
and the market where today's vi shops end up VND (via the removed sync).

## Out of scope

A currency picker; the unmounted `packages/ui` Settings/MerchantSection (still has the old sync, no app mounts it).
