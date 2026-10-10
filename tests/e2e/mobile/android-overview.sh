#!/bin/bash
# #722 #725 Android Overview (iOS layout) tiles vs their sheets and "See these orders" lists (English emulator, after android-e2e.sh).
# Run node tests/e2e/mobile/android-overview-api.js FIRST (single session), then this; compare ANDROID_NOTE lines with its JSON:
# New order value = orderValue (chip "N new orders" = newOrders), Collected = cash, Still to collect = outstanding
# (rows = outstandingOrders), Collateral = collateralNet; the Today card = todayCard. Periods: Today (default), then 7 days.
# Env: E2E_OUT, E2E_AVD_PORT (scripts/mobile-e2e/env.sh).
U=scripts/mobile-e2e/adb-ui.sh
note() { echo "ANDROID_NOTE: $*"; }
desc() { $U dump | grep -o "$1[^|]*" | head -1; }
# tile <title> <period> <n>: the tile, its sheet headline, then the related list total
tile() {
  note "TILE $2 | $(desc "$1, ")"
  $U tap "~$1, " >/dev/null || { note "$2 $1 | no tile"; return; }; sleep 2
  $U shot "8$3-$2-sheet" >/dev/null
  note "SHEET $2 | $($U dump | grep -A1 "^$1 · " | tr '\n' ' ' | cut -c1-200)"
  $U tap "~See these orders" >/dev/null || { note "$2 $1 | no link"; $U back; return; }
  for _ in $(seq 1 20); do $U has "~Total of the rows" || $U has "~No orders in this period" && break; sleep 1; done
  sleep 1; note "RELATED $2 $1 | $(desc 'Total of the rows')$(desc 'No orders in this period')"; $U shot "8$3-$2-related" >/dev/null; $U back; sleep 2
}
# log in when the scenario left the app on the login screen
if $U has "~Sign in to your shop"; then
  $U tap "@540,1420" >/dev/null; sleep 1   # password field (email is kept)
  $U clear >/dev/null; $U type "merchant123" >/dev/null; sleep 1
  $U tap "Sign in" >/dev/null; sleep 6
  $U tap "~Skip" >/dev/null 2>&1; sleep 2
fi
$U wait "Overview" 40 >/dev/null
$U tap "Overview" >/dev/null; $U wait "~New order value, " 40 >/dev/null; sleep 4
$U shot 80-overview-today >/dev/null
$U dump > $E2E_OUT/android/overview-dump.txt
note "SCREEN | $(cut -d'|' -f1,2 $E2E_OUT/android/overview-dump.txt | tr '\n' ' ' | cut -c1-900)"
$U swipe up >/dev/null; sleep 1; $U shot 80-overview-today-scrolled >/dev/null
note "TODAY CARD | $($U dump | cut -d'|' -f1,2 | grep -E 'To hand over|To take back|Overdue returns|Past pickup|Tomorrow' | tr '\n' ' ')"
$U swipe down >/dev/null; $U swipe down >/dev/null; sleep 1
tile "New order value" today 1
tile "Collected" today 2
tile "Still to collect" today 3
tile "Collateral" today 4
# 7 days
$U tap "7 days" >/dev/null; $U wait "~New order value, " 40 >/dev/null; sleep 4
$U shot 80-overview-7days >/dev/null
$U swipe up >/dev/null; sleep 1; $U shot 80-overview-7days-scrolled >/dev/null
$U swipe down >/dev/null; $U swipe down >/dev/null; sleep 1
tile "New order value" last7 5
tile "Collected" last7 6
tile "Still to collect" last7 7
tile "Collateral" last7 8
