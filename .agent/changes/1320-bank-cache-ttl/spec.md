# Spec — Bank account cache for bills expires

Issue: #1320 · Status: in-progress · Intent: ./intent.md

## Behavior

1. Pure rule `isFresh(cachedAt, now)`: true when `0 <= now - cachedAt < 300 s`. At exactly 300 s it is stale.
   If the clock went backwards (`now < cachedAt`) it is stale.
   - iOS: `BillBankQR.isCacheFresh(cachedAt: Date, now: Date) -> Bool`, `BillBankQR.cacheTTL = 300`.
   - Android: `BankAccountRules.isCacheFresh(cachedAtMs: Long, nowMs: Long): Boolean`, `CACHE_TTL_MS = 300_000`.
2. `printAccount(outletId)` answers from the cache only while the entry is fresh; otherwise it reloads from
   `GET .../bank-accounts` and stores the new entry with the time. An outlet with no account is cached too (as today).
3. The cache is cleared when the app enters the foreground (iOS `applicationWillEnterForeground`,
   Android `MainActivity.onStart`).
4. Create / update / delete on the device still clear the cache at once.
5. A failed load is not cached (unchanged).

## Out of scope

Who may edit accounts (#1319), print note and QR switch (#1308), push-based invalidation, any API change.

## API and data

None.

## Acceptance

- [ ] iOS `BankAccountCacheTests` and Android `BankAccountCacheTest`: fresh / stale / boundary / clock back
- [ ] iOS and Android build
