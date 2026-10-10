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

# ---- language: the app follows its per-app locale (Android 13+), so no emulator locale change is needed -----------------------------
LANG_E2E="${LANG_E2E:-en}"
RES="$ROOT/apps/mobile-android/app/src/main/res"
set_lang() { LANG_E2E="${1:-$LANG_E2E}"; adb -s "$SERIAL" shell cmd locale set-app-locales anyrent.shop --locales "$LANG_E2E" >/dev/null; sleep 1; }
# L <string key> [args...]: the string of strings.xml in the current language (%1$s / %1$d / %s filled with the args)
L() { python3 - "$RES" "$LANG_E2E" "$@" <<'PY'
import sys, re, xml.etree.ElementTree as ET
res, lang, key, args = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
path = f"{res}/values{'' if lang == 'en' else '-' + lang}/strings.xml"
val = None
for p in (path, f"{res}/values/strings.xml"):
    for s in ET.parse(p).getroot().iter("string"):
        if s.get("name") == key:
            val = "".join(s.itertext()); break
    if val is not None: break
if val is None: sys.exit(f"no string {key}")
val = val.replace("\\'", "'").replace('\\"', '"').replace("\\n", "\n").replace("\\@", "@")
for i, a in enumerate(args, 1):
    val = re.sub(r"%%%d\$[sd]" % i, lambda m: a, val)
val = re.sub(r"%[sd]", lambda m: args[0] if args else "", val, count=1)
print(val)
PY
}
# VN civil day of today +N: "2026-10-10" (iso) / "10/10" (dm) / day number (d) / "October 10, 2026" or "10 tháng 10, 2026" (cell)
vn_day() { python3 - "$1" "${2:-iso}" "$LANG_E2E" <<'PY'
import sys, datetime
off, fmt, lang = int(sys.argv[1]), sys.argv[2], sys.argv[3]
d = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))) + datetime.timedelta(days=off)
months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
print({"iso": d.strftime("%Y-%m-%d"), "dm": d.strftime("%d/%m"), "d": str(d.day),
       "cell": f"{months[d.month-1]} {d.day}, {d.year}" if lang == "en" else f"{d.day} tháng {d.month}, {d.year}"}[fmt])
PY
}

# ---- login / logout ------------------------------------------------------------------------------------------------------------------
on_login_screen() { have_any "$(L authv2_login_button)|~Sign in|~Đăng nhập" && have_any "~Email"; }
dismiss_prompts() { tap_any "Don’t allow|Không cho phép|Don't allow" >/dev/null 2>&1; tap_any "$(L skip)" >/dev/null 2>&1; }
do_logout() {
  local i; for i in 1 2 3 4; do have_any "$(L settings)" && break; "$U" back >/dev/null; sleep 1; done   # leave a cart / sheet first
  tap_any "$(L settings)" || return 1
  "$U" swipe up >/dev/null; "$U" swipe up >/dev/null
  tap_any "$(L logout)" || return 1; sleep 1
  "$U" tap "$(L logout)" 2 >/dev/null 2>&1 || "$U" tap "$(L logout)" 1 >/dev/null 2>&1; sleep 2
}
# do_login <email> <password>
do_login() {
  launch_app; sleep 4; dismiss_prompts; sleep 1
  on_login_screen || { do_logout; sleep 2; }
  "$U" tap "$(L authv2_email)" 2 >/dev/null 2>&1 || tap_any "$(L authv2_email_placeholder)"
  "$U" clear >/dev/null; "$U" type "$1" >/dev/null; "$U" back >/dev/null
  "$U" tap "$(L authv2_password)" 2 >/dev/null 2>&1
  "$U" clear >/dev/null; "$U" type "$2" >/dev/null; "$U" back >/dev/null
  tap_any "$(L authv2_login_button)"; sleep 6; dismiss_prompts; sleep 2
}

# ---- Home list / cart helpers (stock flows) ---------------------------------------------------------------------------------------------
# home_lines: "<product name>\t<stock line>" for every product row on screen
home_lines() { "$U" dump | python3 -c '
import sys, re
rows = [l.rstrip("\n").split(" | ") for l in sys.stdin]
names = [r[0] for r in rows]; cur = None
for r in rows:
    t = r[0].strip()
    if t.startswith("E2E ") and "|" not in t and not re.search(r"free|Còn|Hết|None", t): cur = t
    elif cur and re.search(r"(\d+ free today|None free today|Còn \d+ hôm nay|Hết hôm nay)", t):
        print(cur + "\t" + t.lstrip("● ").strip()); cur = None' ; }
free_of() { echo "$1" | grep -Eo '[0-9]+' | head -1; }
go_home() { tap_any "$(L home)"; sleep 2; }
home_search() { # home_search <ascii text>: filter the Home list
  "$U" tap "~$(L v2_search_placeholder 2>/dev/null | cut -c1-12)" >/dev/null 2>&1 || "$U" tap "~Search name" >/dev/null 2>&1 || "$U" tap "~Tìm" >/dev/null 2>&1
  "$U" clear >/dev/null; "$U" type "${1// /%s}" >/dev/null; adb -s "$SERIAL" shell input keyevent 66; sleep 2; "$U" back >/dev/null; sleep 1
}
add_to_cart() { # add_to_cart <product> [times]: + on the Home row, then the stepper on the row
  "$U" tap "$(L v2_add_to_cart_named "$1")" >/dev/null || return 1
  local i=2; while [ "$i" -le "${2:-1}" ]; do "$U" tap "$(L v2_add_in_cart_named "$1" $((i - 1)))" >/dev/null; i=$((i + 1)); done
}
open_cart() { "$U" tap "$(L v2_cart_create)" >/dev/null; sleep 2; }   # the cart bar on Home carries the same label as the cart button
pick_customer() { "$U" tap "$(L v2_cart_pick_customer)" >/dev/null; sleep 2; "$U" tap "$1" >/dev/null; sleep 2; }
# pick_dates <start offset> <end offset> (VN days from today): the default (today -> tomorrow) needs no taps
pick_dates() {
  "$U" tap "$(L v2_cart_pick_dates)" >/dev/null 2>&1 || "$U" tap "~$(vn_day 0 dm)" >/dev/null 2>&1; sleep 2
  if [ "$1" != 0 ] || [ "$2" != 1 ]; then
    "$U" tap "~$(vn_day "$1" cell)" >/dev/null; sleep 1; "$U" tap "~$(vn_day "$2" cell)" >/dev/null; sleep 1
  fi
  "$U" tap "$(L confirm)" >/dev/null; sleep 2
}
submit_order() { # submit_order -> prints the order number; the confirm sheet's button is the only "create" node on screen
  local want="${1:-rent}" k=v2_create_confirm_rent_title b=v2_cart_create
  [ "$want" = sale ] && { k=v2_create_confirm_sale_title; b=v2_cart_sell_and_collect; }
  "$U" tap "$(L $b)" >/dev/null; sleep 2
  wait_any "$(L $k)" 8 || { echo "NOSHEET"; return 1; }
  "$U" tap "$(L $b)" >/dev/null; sleep 3
  wait_any "~$(L v2_create_done_title '' | cut -d'#' -f1)#" 20 || { echo "NODONE"; return 1; }
  "$U" dump | grep -Eo '#[0-9]{5,6}' | head -1
  tap_any "$(L v2_create_done_new_order)"; sleep 2
}
# clear_cart: from Home (cart bar) or the cart screen: More -> Clear cart -> Delete, then back on Home
clear_cart() {
  have_any "$(L v2_cart_more)" || { have_any "$(L v2_cart_create)" && "$U" tap "$(L v2_cart_create)" >/dev/null && sleep 2; }
  if have_any "$(L v2_cart_more)"; then
    "$U" tap "$(L v2_cart_more)" >/dev/null; sleep 1; tap_any "$(L clear_cart)"; sleep 1; tap_any "$(L delete)"; sleep 2
    have_any "$(L v2_cart_back)" && "$U" tap "$(L v2_cart_back)" >/dev/null; sleep 1
  fi
}
