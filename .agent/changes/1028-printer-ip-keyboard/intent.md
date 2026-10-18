# Intent — Printer IP keyboard has "."

Issue: #1028 · Type: bug · Apps: iOS, Android

## What

In Cài đặt → Máy in the IP field must let a shop type its printer IP (192.168.1.50) with the phone in Vietnamese.

## Why

Owner report: the IP keyboard has no "." in Vietnamese (iOS `.decimalPad`, Android `KeyboardType.Decimal` show the locale decimal ","), so the printer cannot be set up.

## Constraints

- Minimal: keyboard type plus a small input normaliser. No API change.
- iOS is the reference; Android matches.
- Port / paper width stay numeric. Keep the #1018 trim on save.
