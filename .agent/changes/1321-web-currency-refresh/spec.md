# Spec — Web reads the shop currency again

Issue: #1321 · Status: done · Intent: ./intent.md

## Behavior

1. `shouldRefreshShopCurrency({ now, role, hasMerchant, lastRefreshAt })` (pure, `apps/client/app/settings/settings-model.ts`):
   false for ADMIN / OPS or when the user has no merchant; true when never refreshed; true when at least 60 s since the last
   refresh; false inside the minute; true when the clock went backwards (`lastRefreshAt > now`).
2. After login the shop layout calls it on mount and on `visibilitychange` to `visible`. When true it calls
   `settingsApi.getMerchantCurrency()` (`authenticatedFetch`), keeps VND / USD only, and when it differs from the shown
   currency it sets the currency context and the stored user (`merchant.currency`), so prices redraw and a reload keeps it.
3. A failed call changes nothing and tries again at the next trigger.
4. `userSyncSignature` includes `merchant.currency`, so the sidebar's `useAuth()` instance takes the new value too.

## API compatibility

None: no API change. Existing endpoint, read only.

## Out of scope

Mobile (reads the currency already, #1145 / #1307); who may change the currency.
