#!/usr/bin/env bash
# #727 Android flows driven with adb-ui.sh (emulator-$E2E_AVD_PORT). Every result is an `ANDROID_NOTE: ...` line in the same
# format as the iOS notes, so tests/e2e/mobile/{stock-flow,calendar,todo,detail}-check.js read the output of this script too.
#
#   tests/e2e/mobile/android-flows.sh login <email> <password>       log in (logs out first when another account is in)
#   tests/e2e/mobile/android-flows.sh tabs <tag>                     visit every tab, note its texts, flag raw API codes
#   tests/e2e/mobile/android-flows.sh sub <slug> <owner|staff|kho>   broken subscription -> tabs -> fixed -> Home lists again
#   tests/e2e/mobile/android-flows.sh stock                          STOCKFLOW final <name>: <line> for the stock scenario's products
#   tests/e2e/mobile/android-flows.sh calendar                       CAL <day> | title=.. | summary=.. | orders=..  (ops scenario)
#   tests/e2e/mobile/android-flows.sh todo                           TODO <counter> | <label>                       (ops scenario)
#
# Install the app first: scripts/mobile-e2e/android-e2e.sh --fresh (builds with -PapiBaseUrl=http://10.0.2.2:$E2E_API_PORT) or adb install -r.
# Emulator text cannot be typed in Vietnamese: the flows only type ASCII.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
. "$ROOT/scripts/mobile-e2e/env.sh"
set +e   # env.sh sets -e; the flows tolerate a missing control and keep going
U="$ROOT/scripts/mobile-e2e/adb-ui.sh"
OUT="$E2E_OUT/android"; mkdir -p "$OUT"
note() { echo "ANDROID_NOTE: $*" | tee -a "$OUT/notes.txt"; }
RAW='(^|[ |])[A-Z][A-Z0-9]*(_[A-Z0-9]+)+([ |]|$)|SUBSCRIPTION_|PLAN_LIMIT|PERIOD_ENDED|NO_SUBSCRIPTION|INSUFFICIENT_PERMISSIONS|VALIDATION_ERROR'
TABS=("Trang chủ|Home" "Đơn hàng|Orders" "Lịch|Calendar" "Tổng quan|Overview|Báo cáo|Reports" "Cài đặt|Settings")

# monkey aborts on emulators without hardware keys: start the launcher activity instead
launch_app() {
  local a; a="$(adb -s "emulator-$E2E_AVD_PORT" shell cmd package resolve-activity --brief -c android.intent.category.LAUNCHER anyrent.shop | tail -1 | tr -d '\r')"
  adb -s "emulator-$E2E_AVD_PORT" shell am start -W -n "$a" >/dev/null
}

texts() { "$U" dump | cut -d'|' -f1,2 | tr '\n' '¦' | cut -c1-1500; }
tap_any() { local IFS='|'; for s in $1; do if "$U" has "$s" >/dev/null 2>&1; then "$U" tap "$s" >/dev/null; return 0; fi; done; return 1; }

do_login() { # email password
  launch_app; sleep 4
  tap_any "Don’t allow|Không cho phép" >/dev/null 2>&1; sleep 1   # notification permission prompt after a data clear
  if "$U" has "~Sign in" >/dev/null 2>&1 || "$U" has "~Đăng nhập" >/dev/null 2>&1; then :; else
    # in the app: log out through Settings
    tap_any "Cài đặt|Settings" || true; "$U" swipe up >/dev/null; "$U" swipe up >/dev/null
    tap_any "Đăng xuất|Log out" || true; sleep 1; "$U" tap "Đăng xuất" 2 >/dev/null 2>&1 || "$U" tap "Log out" 2 >/dev/null 2>&1 || true
    sleep 2
  fi
  "$U" tap "Email" 2 >/dev/null 2>&1 || tap_any "Nhập email|Enter your email"
  "$U" clear >/dev/null; "$U" type "$1" >/dev/null; "$U" back >/dev/null || true
  "$U" tap "Mật khẩu" 2 >/dev/null 2>&1 || "$U" tap "Password" 2 >/dev/null 2>&1 || tap_any "Nhập mật khẩu|Enter password"
  "$U" clear >/dev/null; "$U" type "$2" >/dev/null; "$U" back >/dev/null || true
  tap_any "Đăng nhập|Sign in|Log in"; sleep 6
  tap_any "Bỏ qua|Skip" >/dev/null 2>&1 || true; sleep 2
}

do_tabs() { # tag
  local tag="$1" n=0 raw=0 spec
  note "SUB $tag after-login | $(texts)"
  for spec in "${TABS[@]}"; do
    n=$((n + 1))
    if tap_any "$spec"; then
      sleep 4; "$U" shot "a-${tag//\//-}-tab$n" >/dev/null
      local t; t="$(texts)"
      note "SUB $tag tab$n | $t"
      if echo "$t" | grep -Eq "$RAW"; then note "RAWKEY $tag tab$n | $(echo "$t" | grep -Eo "$RAW" | head -3 | tr '\n' ' ')"; raw=1; fi
    else
      note "SUB $tag tab$n | tab not offered ($spec)"
    fi
  done
  return $raw
}

counts() { psql "$E2E_DATABASE_URL" -qAt -F ' ' -c "SELECT (SELECT count(*) FROM \"Product\" WHERE \"merchantId\"=m.id),(SELECT count(*) FROM \"Customer\" WHERE \"merchantId\"=m.id),(SELECT count(*) FROM \"Order\" o JOIN \"Outlet\" t ON t.id=o.\"outletId\" WHERE t.\"merchantId\"=m.id) FROM \"Merchant\" m WHERE m.email='$1.owner@e2e-sub.test'"; }

case "${1:-}" in
  login) do_login "${2:?email}" "${3:?password}" ;;
  tabs) do_tabs "${2:?tag}" ;;
  sub)
    slug="${2:?slug}"; role="${3:?role}"; PREP="$ROOT/scripts/mobile-e2e/prepare-accounts.sh"
    pw=merchant123; [ "$role" = staff ] && pw=staff123; [ "$role" = kho ] && pw=inventory123
    "$PREP" break "$slug" >/dev/null; before="$(counts "$slug")"
    do_login "$slug.$role@e2e-sub.test" "$pw"; rc=0; do_tabs "$slug/$role/broken" || rc=1
    [ "$(counts "$slug")" = "$before" ] && note "PASS nothing created ($before)" || { note "FAIL rows changed: $before -> $(counts "$slug")"; rc=1; }
    "$PREP" fix "$slug" >/dev/null
    adb -s "emulator-$E2E_AVD_PORT" shell am force-stop anyrent.shop; sleep 1
    launch_app; sleep 8
    tap_any "Trang chủ|Home"; sleep 4; "$U" shot "a-$slug-$role-fixed-home" >/dev/null
    t="$(texts)"; note "SUB $slug/$role fixed home | $t"
    echo "$t" | grep -q "E2E SP" && note "PASS fixed: Home lists the products again" || { note "FAIL fixed: Home shows no product"; rc=1; }
    "$PREP" break "$slug" >/dev/null
    exit $rc ;;
  stock)
    tap_any "Trang chủ|Home"; sleep 3
    for name in "E2E Con5" "E2E Con1" "E2E Het"; do
      "$U" tap "~Tên, mã vạch" >/dev/null 2>&1 || "$U" tap "~Name, barcode" >/dev/null 2>&1
      "$U" clear >/dev/null; "$U" type "${name// /%s}" >/dev/null; adb -s "emulator-$E2E_AVD_PORT" shell input keyevent 66; sleep 3
      "$U" dump | python3 -c '
import sys,re
name=sys.argv[1]; lines=[l.rstrip("\n") for l in sys.stdin]
txt=[l.split(" | ")[0]+" "+l.split(" | ")[1] if " | " in l else l for l in lines]
hit=[t.strip() for t in txt if re.search(r"(Còn \d+|Hết hôm nay|left today|Out today)", t)]
print(hit[0] if hit else "<no stock line>")' "$name" | while read -r line; do note "STOCKFLOW final $name: $line"; done
      "$U" shot "a-stock-${name##* }" >/dev/null
    done ;;
  calendar)
    tap_any "Lịch|Calendar"; sleep 3
    for off in -5 -4 -3 -2 -1 0 1 2 3 4; do
      read -r key dm day < <(python3 -c '
import sys,datetime
d=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7)))+datetime.timedelta(days=int(sys.argv[1]))
print(d.strftime("%Y-%m-%d"), d.strftime("%d/%m"), d.day)' "$off")
      "$U" tap "~$dm" >/dev/null 2>&1 || "$U" tap "$day" >/dev/null 2>&1 || { note "CAL $key | not on this month's grid"; continue; }
      sleep 3; t="$("$U" dump)"
      summary="$(echo "$t" | grep -Eo "(giao|Giao)[^|]*(trả|Trả)[^|]*[0-9]+" | head -1)"
      orders="$(echo "$t" | grep -Eo "#[0-9]{5,6}" | tr -d '#' | sort -u | paste -sd, -)"
      note "CAL $key | title=$(echo "$t" | grep -m1 -Eo "(HÔM NAY|Hôm nay)[^|]*") | summary=$summary | orders=$orders"
      "$U" shot "a-cal-$key" >/dev/null
    done ;;
  todo)
    tap_any "Tổng quan|Overview|Báo cáo|Reports"; sleep 5
    t="$("$U" dump)"
    for pair in "pickups:Cần giao" "returns:Cần nhận trả" "late:Trễ hạn trả" "noshows:Quá ngày lấy" "tomorrow:Ngày mai"; do
      k="${pair%%:*}"; w="${pair#*:}"
      note "TODO $k | $(echo "$t" | grep -m1 -E "$w" | cut -d'|' -f1,2 | tr -s ' ')"
    done
    "$U" shot a-todo >/dev/null ;;
  *) sed -n 2,14p "$0"; exit 64 ;;
esac
