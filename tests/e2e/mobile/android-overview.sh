#!/bin/bash
# #722 Android Overview figures vs their "See the orders behind it" lists (English emulator, after android-e2e.sh).
# Run node tests/e2e/mobile/android-overview-api.js FIRST (single session), then this; compare ANDROID_NOTE lines with its JSON:
# Real income = cash, Collateral = collateralNet, Still to collect = outstanding (rows = outstandingOrders), New orders total = orderValue.
# Env: E2E_OUT, E2E_AVD_PORT (scripts/mobile-e2e/env.sh).
U=scripts/mobile-e2e/adb-ui.sh
note() { echo "ANDROID_NOTE: $*"; }
total() { $U wait "~Total of the rows" 40 >/dev/null || { note "$1 | no total"; return; }; sleep 1; note "$1 | $($U dump | grep -o 'Total of the rows[^|]*' | head -1)"; $U shot "8x-related-$2" >/dev/null; $U back; sleep 2; }
# log in when the scenario left the app on the login screen
if $U has "~Sign in to your shop"; then
  $U tap "@540,1420" >/dev/null; sleep 1   # password field (email is kept)
  $U clear >/dev/null; $U type "merchant123" >/dev/null; sleep 1
  $U tap "Sign in" >/dev/null; sleep 6
  $U tap "~Skip" >/dev/null 2>&1; sleep 2
fi
$U wait "Overview" 40 >/dev/null
$U tap "Overview" >/dev/null; $U wait "~Real income" 40 >/dev/null; sleep 3
$U shot 80-overview >/dev/null
$U dump > $E2E_OUT/android/overview-dump.txt
note "SCREEN | $(tr '\n' ' ' < $E2E_OUT/android/overview-dump.txt | cut -c1-900)"
# Real income sheet: the period's events, then the collateral events
$U tap "~Real income" >/dev/null; sleep 2; $U shot 81-received-sheet >/dev/null
note "SHEET collected | $($U dump | tr '\n' ' ' | cut -c1-600)"
$U tap "~See the orders behind it" >/dev/null; total collected 1
$U tap "~Real income" >/dev/null; sleep 2; $U tap "Collateral" >/dev/null; sleep 1
$U tap "~See the orders behind it" 1 >/dev/null; total collateral 2
# Still to collect sheet, first row
$U tap "~Still to collect" >/dev/null; sleep 2; $U shot 82-outstanding-sheet >/dev/null
$U tap "~To collect when customers pick up" >/dev/null; total outstanding 3
# Orders section: New orders
$U swipe up >/dev/null; sleep 1
$U dump | grep -i "new orders" | head -3 | sed 's/^/ANDROID_NOTE: ROW | /'
$U tap "New orders" >/dev/null; total orderValue 4
