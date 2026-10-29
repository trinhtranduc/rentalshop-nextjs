# sourced by android-flows.sh: `settings-sync <case> [role]` (#1315, epic #1309: role-based settings sync on Android, run for #1309 on 2026-10-29).
# The OWNER's change goes through the API (tests/e2e/mobile/settings-sync-api.js, as the shop owner = "another device"); the device is a
# MANAGER / STAFF / KHO account that must show the new value. Owner-on-device cases drive the real screens and read the result from the DB / API.
# Run (windows must be VISIBLE: AVD with a window, never -no-window):
#   scripts/mobile-e2e/seed-local.sh && scripts/mobile-e2e/api-local.sh start --build && scripts/mobile-e2e/prepare-accounts.sh staged
#   scripts/mobile-e2e/android-e2e.sh --fresh            # installs the app on the AVD (MOBILE_FEATURES must include newSettings)
#   python3 -I tests/e2e/mobile/escpos-capture.py 9291 $E2E_OUT/printer &     # stand-in printer: keeps every ESC/POS job (the emulator reaches the host as 10.0.2.2)
#   node tests/e2e/mobile/settings-sync-api.js bank create "NGUYEN VAN A" 0123456789 Vietcombank true VCB   # + a second account (9876543210) for bankcache
#   LANG_E2E=vi tests/e2e/mobile/android-flows.sh settings-sync <case> [merchant|manager|staff|kho]
# Cases:  currency                         staff: API change, app relaunch (the older check)
#         currency-fg <staff|manager|kho>  #1307 refresh WITHOUT relaunch: app back to the foreground / Overview tab, throttled to 1 minute (waits 2 x 65 s)
#         rows <merchant|manager|staff|kho>  which Settings rows each role sees (#1310 Cọc, #1313 titles; #1319 bank accounts is noted, not failed)
#         shopinfo <manager|staff|kho>     "Thông tin chi nhánh": manager edits the own branch, staff / kho read only (#1313)
#         owner                            the shop owner on the device: shop + branch forms, currency, print note + QR, bills per outlet, overlap switch
#         print <manager|staff|kho>        note + QR read-only for the role, IP / port set by the role itself, the printed bill (bytes captured) carries the note
#         bankcache                        staff prints, owner changes the default bank account, app to background and back, prints again (#1320)
#         classic <merchant|manager|staff> (API without newSettings) the old Settings list: store row per role
#         deposit                          Cọc hidden for manager, staff, kho; shown for the owner (#1310)
#         overlap <staff|manager>          owner turns "Cho trùng lịch" off / on: the cart of the device follows
SYNC="node $CHK/settings-sync-api.js"
which_case="${2:?currency|currency-fg|rows|shopinfo|owner|print|bankcache|deposit|overlap}"
who="${3:-staff}"
tag="[$LANG_E2E settings-sync/$which_case${3:+/$3}]"
STAFF_EMAIL="${E2E_STAFF_EMAIL:-staff.outlet1@example.com}"; STAFF_PW="${E2E_STAFF_PASSWORD:-staff123}"
PRN="$E2E_OUT/printer"; PRN_PORT="${E2E_PRINTER_PORT:-9291}"
set_lang
acct() { # acct merchant|manager|staff|kho -> "email password"
  case "$1" in
    merchant) echo "${E2E_MERCHANT_EMAIL:-merchant1@example.com} ${E2E_MERCHANT_PASSWORD:-merchant123}" ;;
    manager) echo "${E2E_OUTLET_ADMIN_EMAIL:-admin.outlet1@example.com} ${E2E_OUTLET_ADMIN_PASSWORD:-admin123}" ;;
    staff) echo "$STAFF_EMAIL $STAFF_PW" ;;
    kho) echo "${E2E_INVENTORY_EMAIL:-inventory.outlet1@example.com} ${E2E_INVENTORY_PASSWORD:-inventory123}" ;;
    *) echo "unknown role $1" >&2; return 1 ;;
  esac
}
sign_in() { local c; c="$(acct "$1")"; login_as "${c% *}" "${c#* }" && note "signed in as $1 (${c% *})" || { fail "$tag could not sign in as $1"; exit 1; }; }
sql() { psqlc -c "$1"; }
open_settings() { to_tabs; tap_any "$(L settings)"; sleep 3; }
shot() { "$U" shot "a1309-$1" >/dev/null; }
has() { echo "¦$1" | grep -Fq "¦$2 |"; }   # the text is a whole node ("title |" in `texts`)
expect() { # expect <yes|no> <haystack> <title> <description>
  if has "$2" "$3"; then [ "$1" = yes ] && pass "$tag $4" || fail "$tag $4 (found '$3')"; else [ "$1" = no ] && pass "$tag $4" || fail "$tag $4 (missing '$3')"; fi
}
settings_texts() { open_settings; local a b; a="$(texts 6000)"; "$U" swipe up >/dev/null; b="$(texts 6000)"; "$U" swipe down >/dev/null; echo "${a}¦${b}"; }
open_printer() { # Settings -> In & phiếu; PT = its texts. One retry: right after a sign-in the branch settings once failed to load
  open_settings; tap_any "$(L settings_v2_printing)"; sleep 3; PT="$(texts 6000)"
  if echo "$PT" | grep -Fq "$(L printer_outlet_load_failed | cut -c1-25)"; then
    note "SURPRISE $tag Máy in showed '$(L printer_outlet_load_failed)' 3 s after opening; reopening"; "$U" back >/dev/null; sleep 5
    tap_any "$(L settings_v2_printing)"; sleep 6; PT="$(texts 6000)"
  fi
}
set_printer_device() { # on the Máy in screen: IP + port of THIS device (every role sets its own), then Lưu
  "$U" swipe up >/dev/null; sleep 1
  have_any "$(L printer_ip)" || { fail "$tag set_printer_device: not on the printer screen: $(texts 200)"; return 1; }
  "$U" tap "$(L printer_ip)" 2 >/dev/null 2>&1; "$U" clear >/dev/null; "$U" type "10.0.2.2" >/dev/null; "$U" back >/dev/null
  "$U" tap "$(L printer_port)" 2 >/dev/null 2>&1; "$U" clear >/dev/null; "$U" type "$PRN_PORT" >/dev/null; "$U" back >/dev/null
  tap_any "~$(L settings_v2_printing_group_printer)" >/dev/null 2>&1; tap_any "$(L save)"; sleep 3
}
open_order() { # open_order <orderNumber>: Orders tab -> search -> detail
  to_tabs; tap_any "$(L orders)"; sleep 3
  "$U" tap "~$(L orders_v2_search_placeholder | cut -c1-12)" 1 >/dev/null 2>&1; sleep 1; "$U" clear >/dev/null; "$U" type "$1" >/dev/null; adb -s "$SERIAL" shell input keyevent 66; sleep 4
  "$U" tap "~#${1##*-}" 1 >/dev/null; sleep 4
}
print_bill() { # print_bill <orderNumber> -> JOB = the readable job the stand-in printer received (empty when nothing arrived)
  local before now; before="$(ls "$PRN"/*.bin 2>/dev/null | wc -l | tr -d ' ')"; JOB=""
  open_order "$1"; "$U" tap "$(L print)" 1 >/dev/null 2>&1 || tap_any "$(L detail_print_receipt)"
  for _ in $(seq 1 20); do now="$(ls "$PRN"/*.bin 2>/dev/null | wc -l | tr -d ' ')"; [ "$now" -gt "$before" ] && break; sleep 1; done
  [ "$now" -gt "$before" ] && JOB="$(cat "$PRN/job-$((before + 1)).txt")"
  shot "bill-$1"; note "BILL $1: $(echo "$JOB" | tr '\n' '|' | cut -c1-500)"; to_tabs
}
switch_outlet() { # switch_outlet "<outlet name>": the owner's branch picker on Home (Chọn chi nhánh sheet -> Dùng <name>); Vietnamese UI only
  to_tabs; go_home; "$U" tap "~Chi nhánh:" 1 >/dev/null; sleep 2; "$U" tap "~$1, " 1 >/dev/null; sleep 2; "$U" tap "~Dùng $1" 1 >/dev/null; sleep 4
}
tap_overlap_switch() { # the Switch has no text node: tap right of the row title (Settings tab must be open)
  local y; y="$("$U" dump | python3 -I -c '
import re, sys
for l in sys.stdin:
    if l.startswith(sys.argv[1] + " |"):
        m = re.search(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", l); print((int(m.group(2)) + int(m.group(4))) // 2 + 12); break' "$(L settings_v2_allow_overlap)")"
  [ -n "$y" ] && "$U" tap "@980,$y" >/dev/null; sleep 4
}
case "$which_case" in
  currency)  # (a) owner changes the currency; the staff device shows the new unit after reopening the app (#1307)
    START="$($SYNC get currency)"; OTHER=USD; [ "$START" = USD ] && OTHER=VND
    mark() { [ "$1" = VND ] && echo '/lần|/ngày' || echo '\$'; }
    sign_in staff; go_home; sleep 4; "$U" shot "a-sync-currency-0-$START" >/dev/null
    t="$(texts 3000)"; echo "$t" | grep -Eq "$(mark "$START")" && pass "$tag staff sees $START before the change" || fail "$tag staff Home lacks $(mark "$START") at start: ${t:0:300}"
    $SYNC set currency "$OTHER" >/dev/null && note "owner set currency $OTHER (API)"
    restart_app; sleep 8; go_home; sleep 4; "$U" shot "a-sync-currency-1-$OTHER" >/dev/null; t="$(texts 3000)"
    echo "$t" | grep -Eq "$(mark "$OTHER")" && pass "$tag after reopening, staff Home shows $OTHER" || fail "$tag staff still shows the old unit after reopening (#1307): ${t:0:300}"
    $SYNC set currency "$START" >/dev/null; restart_app; sleep 8; go_home; sleep 4
    echo "$(texts 3000)" | grep -Eq "$(mark "$START")" && pass "$tag changed back: staff shows $START again (no stale value)" || fail "$tag staff did not follow the change back" ;;
  currency-fg)  # (a2) #1307 refresh paths without a relaunch: app back to the foreground (MainActivity.onResume) and the Overview tab; at most once a minute
    START="$($SYNC get currency)"; OTHER=USD; [ "$START" = USD ] && OTHER=VND
    mark() { [ "$1" = VND ] && echo '/lần|/ngày' || echo '\$'; }
    sign_in "$who"; go_home; sleep 3; t="$(texts 3000)"
    echo "$t" | grep -Eq "$(mark "$START")" && pass "$tag $who sees $START at start" || fail "$tag $who lacks $(mark "$START") at start: ${t:0:200}"
    path=foreground; [ "$who" = manager ] && path="Overview tab"
    for to in "$OTHER" "$START"; do
      note "waiting 65 s so the 1-minute throttle of the currency refresh has passed"; sleep 65
      $SYNC set currency "$to" >/dev/null && note "owner set currency $to (API; the device app is NOT relaunched)"
      if [ "$who" = manager ]; then tap_any "$(L overview)"; sleep 5; shot "currency-fg-$who-overview-$to"; go_home; sleep 3
      else adb -s "$SERIAL" shell input keyevent KEYCODE_HOME; sleep 3; launch_app; sleep 6; go_home; sleep 3; shot "currency-fg-$who-resume-$to"; fi
      t="$(texts 3000)"
      echo "$t" | grep -Eq "$(mark "$to")" && pass "$tag $who shows $to via the $path, no relaunch" || fail "$tag $who still shows the old unit via the $path (#1307): ${t:0:300}"
    done ;;
  rows)  # which Settings rows a role sees (#1310 Cọc owner only, #1313 titles, #1319 bank accounts still open to the manager)
    sign_in "$who"; S="$(settings_texts)"; shot "rows-$who"; note "ROWS-TEXTS $who: ${S:0:700}"
    case "$who" in
      merchant)
        expect yes "$S" "$(L store_info)" "owner: 'Thông tin cửa hàng' row"; expect yes "$S" "$(L bank_accounts)" "owner: bank accounts row"
        expect yes "$S" "$(L settings_v2_deposit)" "owner: Cọc row"; expect yes "$S" "$(L settings_v2_printing)" "owner: In & phiếu row"
        expect yes "$S" "$(L settings_v2_allow_overlap)" "owner: overlap switch"; expect no "$S" "$(L settings_v2_currency)" "owner: no Tiền tệ row in the list (it moved into Thông tin cửa hàng)" ;;
      manager)
        expect yes "$S" "$(L shopinfo_branch_info)" "manager: 'Thông tin chi nhánh' row"; expect no "$S" "$(L store_info)" "manager: no 'Thông tin cửa hàng'"
        expect no "$S" "$(L settings_v2_deposit)" "manager: no Cọc row (#1310)"; expect no "$S" "$(L settings_v2_allow_overlap)" "manager: no overlap switch"
        expect yes "$S" "$(L settings_v2_printing)" "manager: In & phiếu row"
        has "$S" "$(L bank_accounts)" && known 1319 "$tag manager still sees the bank accounts row (rule 'only the owner edits bank accounts' is not built yet)" || pass "$tag manager does not see the bank accounts row (#1319 done)" ;;
      staff|kho)
        expect yes "$S" "$(L shopinfo_branch_info)" "$who: 'Thông tin chi nhánh' row"; expect yes "$S" "$(L shopinfo_view_only_value)" "$who: row value 'Chỉ xem'"
        expect no "$S" "$(L settings_v2_deposit)" "$who: no Cọc row (#1310)"; expect no "$S" "$(L bank_accounts)" "$who: no bank accounts row"
        expect no "$S" "$(L settings_v2_allow_overlap)" "$who: no overlap switch"; expect no "$S" "$(L settings_v2_currency)" "$who: no Tiền tệ row" ;;
    esac ;;
  shopinfo)  # (#1313) the branch form per role
    sign_in "$who"; open_settings; tap_any "$(L shopinfo_branch_info)"; sleep 4; F="$(texts 6000)"; shot "shopinfo-$who"
    echo "$F" | grep -Fq "$(L shopinfo_branch_name)" && pass "$tag $who: branch form has the name field" || fail "$tag $who: no name field"; expect yes "$F" "$(L store_v2_phone)" "$who: phone field"
    expect no "$F" "$(L shopinfo_tax_id)" "$who: no tax id field (that is the shop form)"
    if [ "$who" = manager ]; then
      expect yes "$F" "$(L save)" "manager: Lưu button"; expect yes "$F" "$(L cancel)" "manager: Hủy button"
      OLD="$(sql "select phone from \"Outlet\" where id=1")"; NEW="0911222333"
      tap_field "$(L store_v2_phone)"; "$U" clear >/dev/null; "$U" type "$NEW" >/dev/null; "$U" back >/dev/null; tap_any "~$(L shopinfo_branch_info)" >/dev/null 2>&1
      tap_any "$(L save)"; sleep 5; shot "shopinfo-manager-saved"
      [ "$(sql "select phone from \"Outlet\" where id=1")" = "$NEW" ] && pass "$tag manager saved the phone of the own branch (DB: $NEW)" || fail "$tag manager's phone did not reach the DB: $(sql "select phone from \"Outlet\" where id=1")"
      sql "update \"Outlet\" set phone='$OLD' where id=1" >/dev/null
    else
      expect yes "$F" "$(L shopinfo_view_only)" "$who: 'Bạn chỉ xem được mục này.'"; expect no "$F" "$(L save)" "$who: no Lưu button"; expect no "$F" "$(L cancel)" "$who: no Hủy button"
    fi ;;
  owner)  # the shop owner on the device: real screens, results read from the DB / API
    sign_in merchant
    S="$(settings_texts)"; expect yes "$S" "$(L settings_v2_deposit)" "owner sees Cọc"; shot owner-settings
    tap_any "$(L settings_v2_deposit)"; sleep 4; shot owner-deposit; "$U" back >/dev/null
    # Thông tin cửa hàng: a switched-off branch is not listed; the main branch comes first
    sql "update \"Outlet\" set \"isActive\"=false where id=3" >/dev/null
    open_settings; tap_any "$(L store_info)"; sleep 5; H="$(texts 6000)"; shot owner-shop-hub-inactive
    expect yes "$H" "$(L settings_v2_currency)" "owner: Tiền tệ row inside the shop screen"; expect yes "$H" "$(L edit)" "owner: Sửa (shop)"
    expect yes "$H" "Rental Shop Demo - Main Branch" "owner: main branch listed"; expect no "$H" "Outlet 2 - Rental Shop Demo" "owner: the switched-off branch is not listed"
    python3 -I -c 'import sys; sys.exit(0 if sys.argv[1].casefold() in sys.argv[2].casefold() else 1)' "$(L shopinfo_branches 1)" "$H" && pass "$tag owner: header counts open branches only ('$(L shopinfo_branches 1)')" || fail "$tag owner: branch header is not '$(L shopinfo_branches 1)'"
    "$U" back >/dev/null; sleep 2; echo "$(texts 3000)" | grep -Fq "$(L shopinfo_branch_count 2)" && note "SURPRISE $tag Settings row value says '$(L shopinfo_branch_count 2)' while one branch is switched off (the count includes the closed branch)" || pass "$tag Settings row count matches the open branches"
    sql "update \"Outlet\" set \"isActive\"=true where id=3" >/dev/null
    sql "update \"Outlet\" set \"isDefault\"=false where id=1; update \"Outlet\" set \"isDefault\"=true where id=3" >/dev/null
    tap_any "$(L store_info)"; sleep 5; H="$(texts 6000)"; shot owner-shop-hub-main-first
    python3 - "$H" <<'PY' && pass "$tag owner: the main branch (Chính) is listed first" || fail "$tag owner: main branch is not first"
import sys
t = sys.argv[1]; a = t.find("Outlet 2 - Rental Shop Demo"); b = t.find("Rental Shop Demo - Main Branch")
sys.exit(0 if 0 <= a < b else 1)
PY
    sql "update \"Outlet\" set \"isDefault\"=true where id=1; update \"Outlet\" set \"isDefault\"=false where id=3" >/dev/null
    # edit the shop phone, then a branch phone
    OLDP="$(sql "select phone from \"Merchant\" where id=1")"
    tap_any "$(L edit)"; sleep 3; tap_field "$(L store_v2_phone)"; "$U" clear >/dev/null; "$U" type "0988777666" >/dev/null; "$U" back >/dev/null
    tap_any "~$(L shopinfo_title_shop)" >/dev/null 2>&1; tap_any "$(L save)"; sleep 5; shot owner-shop-saved
    [ "$(sql "select phone from \"Merchant\" where id=1")" = "0988777666" ] && pass "$tag owner saved the shop phone (DB)" || fail "$tag shop phone not saved: $(sql "select phone from \"Merchant\" where id=1")"
    sql "update \"Merchant\" set phone='$OLDP' where id=1" >/dev/null
    tap_any "Outlet 2 - Rental Shop Demo"; sleep 4; shot owner-branch-form; OLD3="$(sql "select phone from \"Outlet\" where id=3")"
    tap_field "$(L store_v2_phone)"; "$U" clear >/dev/null; "$U" type "0977666555" >/dev/null; "$U" back >/dev/null
    tap_any "~$(L shopinfo_title_branch)" >/dev/null 2>&1; tap_any "$(L save)"; sleep 5
    [ "$(sql "select phone from \"Outlet\" where id=3")" = "0977666555" ] && pass "$tag owner saved another branch (outlet 3 phone, DB)" || fail "$tag branch 3 phone not saved: $(sql "select phone from \"Outlet\" where id=3")"
    sql "update \"Outlet\" set phone='$OLD3' where id=3" >/dev/null
    # currency by UI, then back (read from the DB: an API login of the owner would sign the device out)
    cur() { sql "select currency from \"Merchant\" where id=1"; }
    C0="$(cur)"; C1=USD; [ "$C0" = USD ] && C1=VND
    open_settings; tap_any "$(L store_info)"; sleep 4
    tap_any "$(L settings_v2_currency)"; sleep 2; shot owner-currency-choice; "$U" tap "~$C1" >/dev/null; sleep 2; shot owner-currency-confirm
    tap_any "$(L settings_v2_currency_confirm_button "$C1")"; sleep 4; shot owner-currency-done
    [ "$(cur)" = "$C1" ] && pass "$tag owner changed the currency $C0 -> $C1 on the device (DB)" || fail "$tag currency is $(cur), not $C1"
    tap_any "$(L settings_v2_currency)"; sleep 2; "$U" tap "~$C0" >/dev/null; sleep 2; tap_any "$(L settings_v2_currency_confirm_button "$C0")"; sleep 4
    [ "$(cur)" = "$C0" ] && pass "$tag owner changed the currency back to $C0" || fail "$tag currency stays $(cur)"
    "$U" back >/dev/null
    "$U" back >/dev/null ;;
  owner-bills)  # the owner on the device: print note + QR of branch 1 by UI, bills per outlet, the overlap switch
    sign_in merchant
    # print note + QR for branch 1 by UI, branch 3 own note in the DB; bills come from the order's outlet
    open_printer; shot owner-printer; NOTE1="Ghi chu CH1 $(date +%H%M)"
    tap_field "$(L printer_note)"; "$U" clear >/dev/null; "$U" type "$NOTE1" >/dev/null; "$U" back >/dev/null; tap_any "~$(L settings_v2_printing_group_slip)" >/dev/null 2>&1
    tap_any "$(L save)"; sleep 4
    [ "$(sql "select \"printNote\" from \"Outlet\" where id=1")" = "$NOTE1" ] && pass "$tag owner saved the print note of branch 1 (DB)" || fail "$tag print note branch 1 not in DB: $(sql "select \"printNote\" from \"Outlet\" where id=1")"
    sql "update \"Outlet\" set \"printNote\"='Ghi chu CH3 only', \"printBankQr\"=false where id=3" >/dev/null
    set_printer_device
    print_bill ORD-001-0003; echo "$JOB" | grep -Fq "$NOTE1" && pass "$tag owner prints an outlet-1 order: the bill carries branch 1's note" || fail "$tag outlet-1 bill lacks '$NOTE1': ${JOB:0:200}"
    echo "$JOB" | grep -Fq "Ghi chu CH3 only" && fail "$tag outlet-1 bill carries branch 3's note"
    switch_outlet "Outlet 2 - Rental Shop Demo"; print_bill ORD-003-0008; echo "$JOB" | grep -Fq "Ghi chu CH3 only" && pass "$tag owner prints an outlet-3 order: the bill carries branch 3's note, not branch 1's (#1308)" || fail "$tag outlet-3 bill lacks branch 3's note: ${JOB:0:200}"
    echo "$JOB" | grep -Fq "$NOTE1" && fail "$tag outlet-3 bill carries branch 1's note"
    echo "$JOB" | grep -q "STK" && fail "$tag outlet-3 bill has a bank block although branch 3's QR switch is off" || pass "$tag outlet-3 bill has no bank block (branch 3 QR off) while branch 1 has one"
    sql "update \"Outlet\" set \"printNote\"=NULL where id=3" >/dev/null
    # the overlap switch
    open_settings; tap_overlap_switch
    O1="$(sql "select \"allowOverlappingOrders\" from \"Merchant\" where id=1")"; [ "$O1" = f ] && pass "$tag owner turned the overlap switch off on the device (DB)" || fail "$tag overlap is '$O1' after tapping the switch"
    open_settings; tap_overlap_switch
    O2="$(sql "select \"allowOverlappingOrders\" from \"Merchant\" where id=1")"; [ "$O2" = t ] && pass "$tag owner turned it back on (DB)" || fail "$tag overlap stays '$O2'" ;;
  print)  # (b) manager / staff / kho: note + QR read-only (set by the owner), IP + port their own, bill from the order's outlet
    NOTE="Ghi chu sync $(date +%H%M%S)"; $SYNC set print "$NOTE" true >/dev/null && note "owner set print note '$NOTE' + QR on (API)"
    sign_in "$who"; open_printer; shot "print-$who"
    echo "$PT" | grep -Fq "$NOTE" && pass "$tag $who sees the owner's note on Máy in" || fail "$tag $who does not see '$NOTE': ${PT:0:300}"
    echo "$PT" | grep -Fq "$(L printer_outlet_readonly | cut -c1-30)" && pass "$tag $who sees the read-only caption" || fail "$tag $who lacks the read-only caption"
    tap_field "$(L printer_note)" >/dev/null 2>&1; "$U" type "HACK" >/dev/null 2>&1   # a disabled field: no keyboard, so no Back here (it would leave the screen)
    echo "$(texts 3000)" | grep -Fq "HACK" && fail "$tag $who could type into the read-only note field" || pass "$tag $who: the note field takes no typing"
    set_printer_device
    [ "$(sql "select \"printNote\" from \"Outlet\" where id=1")" = "$NOTE" ] && pass "$tag $who: the shared note is unchanged on the server after typing + Lưu" || fail "$tag $who changed the shared note: $(sql "select \"printNote\" from \"Outlet\" where id=1")"
    adb -s "$SERIAL" shell run-as anyrent.shop cat shared_prefs/anyrent.printer.xml | grep -q "10.0.2.2" && pass "$tag $who saved the printer IP of this device" || fail "$tag $who: printer IP not saved"
    print_bill ORD-001-0003
    echo "$JOB" | grep -Fq "$NOTE" && pass "$tag $who: the printed bill carries the owner's note (ESC/POS bytes read at the printer)" || fail "$tag $who: bill lacks '$NOTE': ${JOB:0:300}"
    echo "$JOB" | grep -q "STK" && pass "$tag $who: the bill has the bank block (QR on)" || fail "$tag $who: bill has no bank block although the QR is on" ;;
  bankcache)  # (#1320) the owner changes the default bank account; the staff device prints the new one after background -> foreground
    ids="$($SYNC bank list | python3 -c 'import sys,json; l=json.load(sys.stdin); print(" ".join(str(x["id"]) for x in l))')"; A="${ids%% *}"; B="${ids##* }"
    [ "$A" != "$B" ] || { fail "$tag needs two bank accounts on outlet 1"; exit 1; }
    $SYNC bank default "$A" >/dev/null; $SYNC set print "Ghi chu bank cache" true >/dev/null
    sign_in staff; open_printer; set_printer_device
    print_bill ORD-001-0003; echo "$JOB" | grep -q "0123456789" && pass "$tag print 1: default account A (0123456789)" || fail "$tag print 1 lacks account A: ${JOB:0:200}"
    $SYNC bank default "$B" >/dev/null; note "owner made account B (9876543210) the default (API)"
    print_bill ORD-001-0003
    if echo "$JOB" | grep -q "0123456789"; then note "CONTROL $tag print 2 without leaving the app still shows A (cached for 5 minutes, as designed)"; else note "CONTROL $tag print 2 without leaving the app already shows B"; fi
    adb -s "$SERIAL" shell input keyevent KEYCODE_HOME; sleep 3; launch_app; sleep 6; note "app went to the background and came back (MainActivity.onStart clears the cache)"
    print_bill ORD-001-0003; echo "$JOB" | grep -q "9876543210" && pass "$tag print 3 after background + foreground: new default account B (9876543210)" || fail "$tag print 3 still has the old account: ${JOB:0:300}"
    $SYNC bank default "$A" >/dev/null ;;
  classic)  # (#1313) the "Cài đặt cũ" (API started WITHOUT newSettings): the owner still opens the new shop + branches screen, the others the old form
    sign_in "$who"; open_settings; S="$(texts 6000)"; shot "classic-settings-$who"; note "CLASSIC $who settings: ${S:0:400}"
    echo "$S" | grep -Fq "$(L settings_v2_title)" || note "classic: no v2 title on the list (expected, this is the old Settings)"
    tap_any "$(L store_info)|$(L shopinfo_branch_info)"; sleep 5; F="$(texts 6000)"; shot "classic-store-$who"; note "CLASSIC $who store row opens: ${F:0:500}"
    if [ "$who" = merchant ]; then
      expect yes "$F" "$(L edit)" "classic owner: the shop + branches screen (Sửa)"; expect yes "$F" "$(L settings_v2_currency)" "classic owner: Tiền tệ row in the shop screen"
    elif [ "$who" = manager ]; then expect yes "$F" "$(L save)" "classic manager: the old form has Lưu"; expect no "$F" "$(L shopinfo_view_only)" "classic manager: not read-only"
    else expect no "$F" "$(L save)" "classic $who: no Lưu in the old form"; fi
    S2="$(settings_texts)"; expect no "$S2" "$(L settings_v2_deposit)" "classic $who: no Cọc row for non-owners (the classic list has none for anyone)" ;;
  deposit)  # (c) Cọc hidden for manager, staff, kho; shown for the owner
    for r in manager staff kho merchant; do sign_in $r; S="$(settings_texts)"; shot "deposit-$r"
      if [ $r = merchant ]; then expect yes "$S" "$(L settings_v2_deposit)" "owner sees Cọc"; else expect no "$S" "$(L settings_v2_deposit)" "$r does not see Cọc"; fi
    done ;;
  overlap)  # (d) owner turns "Cho trùng lịch" off; the device cart refuses a fully booked product; on again, it allows it
    # needs prepare-accounts.sh staged ("Váy trùng đơn test": 1 in stock, all held today by order 720001) on the staff's merchant
    PRODUCT="Váy trùng đơn test"
    try_cart() { go_home; clear_cart; home_search "trung don"; add_to_cart "$PRODUCT" 1; open_cart; sleep 2; pick_dates 0 1; sleep 3; "$U" shot "a-sync-overlap-$who-$1" >/dev/null; texts 3000; }
    $SYNC set overlap false >/dev/null; sign_in "$who"; restart_app; sleep 8
    t="$(try_cart off)"; echo "$t" | grep -q "$(L v2_cart_overlap_blocked | cut -c1-30)" && pass "$tag overlap OFF: the $who cart says the shop does not allow overlapping rentals" || fail "$tag overlap OFF: no blocked message in the $who cart: ${t:0:300}"
    $SYNC set overlap true >/dev/null; restart_app; sleep 8
    t="$(try_cart on)"; echo "$t" | grep -q "$(L v2_cart_overlap_blocked | cut -c1-30)" && fail "$tag overlap ON: the cart still blocks" || pass "$tag overlap ON: the cart no longer blocks (changed back, no stale value)"
    clear_cart ;;
  *) sed -n 1,22p "$0"; exit 64 ;;
esac
note "settings-sync $which_case${3:+/$3} done: $FAILS failed"
exit $((FAILS > 0))
