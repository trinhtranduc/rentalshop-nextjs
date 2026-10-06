# Plan — #539

1. `settings-model.ts`: `settingsHref(pathname, search, tab)`, `closeSettingsHref(pathname, search)`,
   `legacySettingsRedirect(search)` (pure, tested).
2. `app/settings/SettingsPanel.tsx`: body of today's page (state, saves, sections) with `tab` / `onTab` props.
3. `app/components/shell/SettingsDialog.tsx`: modal reading `?settings`, mounted in `ShopShell` under `Suspense`.
4. `ShopSidebar` / `nav.ts`: settings item opens the dialog on the current page; active while open.
5. `app/settings/page.tsx`: redirect to `/dashboard?settings=…`. Update `SettingsSubscriptionMerchantActions`
   and `users/page.tsx` links to the dialog URL.
6. i18n: `settings.web.close` / `dialogTitle` in en, vi (ja, ko, zh have no `settings.json`; same as #528).
7. Tests: `tests/web-settings-model.test.ts`. Verify: jest (both TZ), lint, client tsc, browser run (light/dark,
   1440/390, merchant/staff, nested bank-account dialog).
