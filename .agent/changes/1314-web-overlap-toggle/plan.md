# Plan — Web: shop owner toggles overlapping orders

Issue: #1314 · Status: in-progress · Spec: ./spec.md

## Verified before coding

- Closest pattern: `OnlineBookingSection` and `BlockOldAppsSection` in `apps/client/app/settings/sections.tsx`, mounted in
  `SettingsPanel.tsx` (`case 'merchant'`); model flags in `settings-model.ts`; tests `tests/web-settings-online-booking.test.ts`.
- API: `PUT /api/settings/merchant` takes `{allowOverlappingOrders}` alone (no name), MERCHANT / ADMIN only; profile returns `merchant.allowOverlappingOrders` (`users/profile/route.ts:78`).
- OrderEditor already re-reads the profile on mount (`useOverlapSetting`), so nothing to change there.

## Steps

1. Failing test `tests/web-settings-overlap.test.ts` (commit `test(client): reproduce ...`).
2. `settings-model.ts`: `overlapFlag`, `canChangeOverlap`.
3. `packages/utils/src/api/booking-requests.ts`: `setAllowOverlappingOrders`.
4. `sections.tsx`: `OverlapSection`; `SettingsPanel.tsx`: mount for MERCHANT above `BlockOldAppsSection`, profile load when flag unknown.
5. `locales/{en,vi,ja,ko,zh}/settings.json` `web.overlap.{title,hint}`.
6. `.agent/api-changes/LOG.md`: one row, no API change (`packages/utils/src` is a path `pr-governance` watches).

## Verify

`cd tests && yarn test web-settings`, `npx jest locales-valid-json`, `yarn lint`, `npx tsc --noEmit -p apps/client/tsconfig.json`; visible run with local API.

## Risks

Low: additive web UI; same PUT field the phone uses.

## Rollback

Revert the PR.
