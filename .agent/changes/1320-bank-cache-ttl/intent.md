# Bank account printed on bills must not stay stale

Issue: #1320 (epic #1309) · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-10-29

## Problem

Mobile keeps the bank account printed on bills (VietQR) in a per-process cache per outlet
(iOS `BankAccountService.printAccountCache`, Android `BankAccountRepository.printCache`). It is cleared only by a
write on the same device or when the app process dies. When the owner changes the account on another device or on
the web, a staff device keeps printing the old QR until the app is fully restarted.

## Proposed outcome

- The cached account expires after 5 minutes.
- The cache is dropped when the app comes back to the foreground.
- A write on the same device still clears it at once (as today).
- A staff device prints the new account within a few minutes, without closing the app.

## Affected users and systems

OUTLET_STAFF / OUTLET_ADMIN devices that print bills with the bank QR switch on. iOS and Android. No API.

## Constraints

- No API change, no new UI, no new string. iOS is the reference; Android matches.
- Not in scope: who may write bank accounts (#1319), print note / QR switch per outlet (#1308).
- Installed apps keep the old behaviour until updated.

## Open questions

- None.

## Decision log

- 2026-10-29 — TTL 5 minutes plus clear on foreground (issue text; owner: simple).
- 2026-10-29 — a failed load is still not cached (unchanged).
