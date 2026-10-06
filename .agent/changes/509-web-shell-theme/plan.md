# Plan — #509 New shop web shell and light/dark theme

Issue: #509 · Status: accepted · Spec: ./spec.md

## Steps

1. Tokens:
   - Add `--ar-*` light and dark variables in `apps/client/app/globals.css`.
   - Map them in `apps/client/tailwind.config.js` under `colors.ar` as `rgb(var(--ar-x) / <alpha-value>)`.
   - Leave `tailwind.config.base.js` untouched (admin uses it).
2. Font: load Be Vietnam Pro with `next/font/google` in `apps/client/app/layout.tsx` as `--font-be-vietnam`, and apply it only on the shell and auth wrappers.
3. Theme:
   - `apps/client/app/lib/theme.ts`: `resolveTheme()`, the storage key, and the inline boot script string.
   - `apps/client/app/providers/ThemeProvider.tsx`: React context, toggle, and the OS listener.
   - Add the boot `<script>` in `<head>`.
4. Shell, in `apps/client/app/components/shell/`:
   - `nav.ts`: nav model and role filter.
   - `ShopSidebar.tsx`, `ShopTopBar.tsx`, `ThemeSwitch.tsx`, `NotificationBell.tsx` (panel), `notification-groups.ts` (Vietnam-day grouping, `timezone-dates`), `ShopShell.tsx`.
   - Swap `ClientSidebar` for `ShopShell` in `ClientLayout.tsx`. Keep every existing auth guard as is.
5. i18n: add `shell.*` keys to `locales/{en,vi,ja,ko,zh}/common.json` (`i18n-keys`).
6. Tests:
   - `tests/` unit tests for the nav role filter and `resolveTheme`;
   - the notification day grouping under both time zones.
7. Verify (`verify-change`), then open the PR with `Fixes #509`.

## Files

- `apps/client/app/globals.css`, `apps/client/tailwind.config.js` — tokens
- `apps/client/app/layout.tsx` — font, theme boot script, provider
- `apps/client/app/lib/theme.ts`, `apps/client/app/providers/ThemeProvider.tsx` — theme
- `apps/client/app/components/shell/*` — new shell
- `apps/client/app/components/ClientLayout.tsx` — use the new shell
- `locales/*/common.json` — strings
- `tests/unit/web-shell/*.test.ts` — nav filter, theme resolution

## Risks

- `apps/admin` regressions: no shared component or base token is edited; `apps/admin` is built in verify.
- Old pages in dark mode: hidden behind the flag until phase 7.
- Hydration mismatch from the theme class: `<html suppressHydrationWarning>`, and the class is set only by the boot script and the provider.

## Rollback

Revert the PR. No data or API change.
