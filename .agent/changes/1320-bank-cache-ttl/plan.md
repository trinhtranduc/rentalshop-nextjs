# Plan — Bank account cache for bills expires

Issue: #1320 · Status: in-progress · Spec: ./spec.md

## Steps

1. Test first (bug-fix-tdd): iOS `POS ADBDTests/BankAccountCacheTests.swift`, Android
   `domain/bank/BankAccountCacheTest.kt`. Run, see red (does not compile: the function is missing). Commit alone.
2. iOS: pure function in `Utils/VietQR.swift` (`BillBankQR`); `BankAccountService` stores `(account, cachedAt)`,
   checks freshness; `AppDelegate.applicationWillEnterForeground` calls `clearPrintCache()`.
3. Android: pure function in `domain/bank/BankAccounts.kt`; `BankAccountRepository` stores time, checks freshness,
   `clearPrintCache()`; `MainActivity.onStart` calls it.
4. Run both tests green, build both apps.

## Domain skills

`mobile-parity` (iOS reference, Android matches), `api-compat-review` (no API change: nothing to log).
