#!/usr/bin/env bash
# Shared helpers of the Android e2e scripts (#727). Source it; needs scripts/mobile-e2e/env.sh values (E2E_OUT, E2E_AVD_PORT).
ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
. "$ROOT/scripts/mobile-e2e/env.sh"
set +e +u   # env.sh sets -e -u; the flows tolerate a missing control and keep going
U="$ROOT/scripts/mobile-e2e/adb-ui.sh"
SERIAL="emulator-$E2E_AVD_PORT"
OUT="$E2E_OUT/android"; mkdir -p "$OUT"
FAILS=0
note() { echo "ANDROID_NOTE: $*" | tee -a "$OUT/notes.txt"; }
pass() { note "PASS $*"; }
fail() { note "FAIL $*"; FAILS=$((FAILS + 1)); }
known() { note "KNOWN $1 | $2"; }   # known <issue> <text>: a documented app bug, not counted as a failure

# monkey aborts on emulators without hardware keys: start the launcher activity instead
launch_app() {
  local a; a="$(adb -s "$SERIAL" shell cmd package resolve-activity --brief -c android.intent.category.LAUNCHER anyrent.shop | tail -1 | tr -d '\r')"
  adb -s "$SERIAL" shell am start -W -n "$a" >/dev/null
}
restart_app() { adb -s "$SERIAL" shell am force-stop anyrent.shop; sleep 1; launch_app; }
texts() { "$U" dump | cut -d'|' -f1,2 | tr '\n' '¦' | cut -c1-"${1:-1500}"; }
# tap_any "a|b|c": tap the first selector (exact or ~substring) that is on screen
tap_any() { local IFS='|' s; for s in $1; do if "$U" has "$s" >/dev/null 2>&1; then "$U" tap "$s" >/dev/null; return 0; fi; done; return 1; }
# have_any "a|b": 0 when one of them is on screen
have_any() { local IFS='|' s; for s in $1; do "$U" has "$s" >/dev/null 2>&1 && return 0; done; return 1; }
# wait_any "a|b" [seconds]
wait_any() { local n="${2:-15}" i; for i in $(seq 1 "$n"); do have_any "$1" && return 0; sleep 1; done; return 1; }
# first node text/desc that starts with a prefix (from the last dump), e.g. node_with "New order value, "
node_with() { "$U" dump | python3 -c '
import sys
p=sys.argv[1]
for l in sys.stdin:
    parts=l.rstrip("\n").split(" | ")
    for x in parts[:2]:
        if x.strip().startswith(p):
            print(x.strip()); sys.exit(0)' "$1"; }
