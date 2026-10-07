# Intent — #622 mobile bank accounts + VietQR on printed bills

Status: accepted (owner chose the options on 2026-10-07)

## Problem
Shops set up bank accounts on the web, but the mobile apps cannot. iOS has the screens but hides them; Android has nothing. Customers who pay by transfer have to ask for the account; a QR on the bill would let them scan.

## Outcome (verifiable)
- MERCHANT / OUTLET_ADMIN manage the outlet's bank accounts from mobile Settings (same API as web).
- A per-device switch next to the printer note prints the default account (name, number, holder, VietQR without amount) at the end of every bill. Default off.

## Users and systems
Shop owner and outlet admin (manage); staff (print only). iOS (reference) and Android. Existing bank-account API; no server change.

## Constraints
- No API or DB change; old installed apps unaffected.
- Switch stored on the device, like the printer note.
- QR must scan in Vietnamese banking apps: VietQR EMV with bank BIN and CRC, equal to web `generateVietQRString(info)` without amount. The stored `qrCode` field (`acc|name|code`) is not used for printing.
- Android matches iOS (iOS is the reference). One PR, many commits.

## Decision log
- 2026-10-07 owner: per device; account only (no amount); default off.
