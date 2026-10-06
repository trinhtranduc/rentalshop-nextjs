# Plan — #557 Gói dịch vụ shows plan, expiry, usage and history

Issue: #557 · Status: accepted · Spec: ./spec.md

## Steps

1. `apps/client/app/settings/subscription-model.ts` — pure: status tag, plan label, price, expiry, usage
   rows, activity / payment → history item, merge + sort, day text. No `@rentalshop/*` import; the
   instant → day-key converter is passed in (`formatDateKeyInTimeZone(…, SHOP_TIMEZONE)` in the component).
2. `tests/web-subscription-model.test.ts` — spec 2–10, run under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
3. `apps/client/app/settings/SubscriptionTab.tsx` — plan card, usage card, history card on `SectionCard`;
   loads activities + payments for `subscriptionId`.
4. `apps/client/app/components/SettingsSubscriptionMerchantActions.tsx` — render the new tab instead of the
   shared `SubscriptionSection`; keep the flag, dialogs and `?checkout=` / `?action=` handling.
5. `apps/client/app/settings/SettingsPanel.tsx` — drop `LegacyPanel` for this tab; pass the raw status.
6. `locales/{en,vi}/settings.json` — `web.subscription.*` (`i18n-keys`).
7. Verify (`verify-change`): tsc on apps/client, eslint on touched paths, Jest both TZ, browser on
   :3292 with real trial data and `page.route` stubs (paid, upgraded, renewed, expiring, expired,
   cancelled, empty history), light / dark, 1440 / 390.

Domain skills: `timezone-dates`, `i18n-keys`. Not applicable: `api-route-standard`, `db-migration`,
`mobile-parity`, `api-compat-review` (no API change).

## Files

- `apps/client/app/settings/subscription-model.ts` — new, pure mapping
- `apps/client/app/settings/SubscriptionTab.tsx` — new, the tab UI
- `apps/client/app/settings/SettingsPanel.tsx` — wire the tab
- `apps/client/app/components/SettingsSubscriptionMerchantActions.tsx` — use the new tab
- `locales/en/settings.json`, `locales/vi/settings.json` — strings
- `tests/web-subscription-model.test.ts` — tests

## Risks

- Activity metadata shapes differ by writer; the model reads them defensively and falls back to a neutral title.
- PR #540 must merge first.

## Rollback

Revert the PR; the tab returns to the shared panel.
