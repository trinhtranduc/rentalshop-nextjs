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
#   Final e2e before the store build (#1359, epic #1309; needs prepare-accounts.sh create + staged for the one-branch shop):
#         listing <merchant|manager|kho|staff|onebranch>  #1346 "Hiện ở chi nhánh" tick: Home, form, detail, open order of an unticked product
#         othbr <merchant|manager|kho|staff|onebranch>    #1353 "Chi nhánh khác còn: A (3), B (1)" under a short cart line (one-day and multi-day; staff: no hint, no API call)
#         sharenote <merchant|manager|staff|kho>          #1354 the switch "Hiện ghi chú đơn trên ảnh chia sẻ" on In & phiếu
#         share <merchant|manager|staff|kho>              #1345 / #1350 / #1354 staged-deposit order: detail "Thu khi giao", the share image (JPG copied from cache/receipts) with stage 2 unpaid / paid, note switch on / off
SYNC="node $CHK/settings-sync-api.js"
which_case="${2:?currency|currency-fg|rows|shopinfo|owner|print|bankcache|deposit|overlap|listing|othbr|sharenote|share}"
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

# ---- final e2e before the store build (#1309): #1346 branch tick, #1353 other-branches hint, #1354 order note on the share image, #1345 / #1350 money order ----
FIX="node $CHK/order-fixtures-api.js"; SHOTS="$E2E_OUT/shots"; mkdir -p "$SHOTS"
posts_other() { grep -c "Request received: POST /api/products/other-outlets-availability" "$E2E_OUT/api-$E2E_API_PORT.log" 2>/dev/null; }
fx_listing() { # E2E Tick An: not shown at branch 1 (stock 5); Tick Het: shown, none left; Tick Hien: shown, 6 left; every one also at branch 3. An order of An exists (made before the untick).
  sql "update \"Product\" set name='E2E Tick An', \"totalStock\"=8 where id=21; update \"Product\" set name='E2E Tick Het', \"totalStock\"=4 where id=22; update \"Product\" set name='E2E Tick Hien', \"totalStock\"=6 where id=23;
    update \"OutletStock\" set stock=5, available=5, renting=0, \"isListed\"=true where \"productId\"=21 and \"outletId\"=1; update \"OutletStock\" set stock=3, available=3, renting=0, \"isListed\"=true where \"productId\"=21 and \"outletId\"=3;
    update \"OutletStock\" set stock=0, available=0, renting=0, \"isListed\"=true where \"productId\"=22 and \"outletId\"=1; update \"OutletStock\" set stock=4, available=4, renting=0, \"isListed\"=true where \"productId\"=22 and \"outletId\"=3;
    update \"OutletStock\" set stock=6, available=6, renting=0, \"isListed\"=true where \"productId\"=23 and \"outletId\" in (1,3)" >/dev/null
  if [ ! -s "$E2E_OUT/listing-order.txt" ]; then $FIX multi manager 21 1 6 7 | python3 -I -c 'import sys,json; print(json.load(sys.stdin)["orderNumber"])' > "$E2E_OUT/listing-order.txt"; fi
  sql "update \"OutletStock\" set \"isListed\"=false where \"productId\"=21 and \"outletId\"=1" >/dev/null
}
listed_db() { sql "select \"isListed\" from \"OutletStock\" where \"productId\"=$1 and \"outletId\"=$2"; }
tick_state() { # tick_state <outletId>: true | false | none (no such row), read from a fresh dump + screenshot: the Compose checkbox has no node, so the pixel inside its box says whether it is filled
  "$U" dump >/dev/null; adb -s "$SERIAL" exec-out screencap -p > "$E2E_OUT/android/tick.png" 2>/dev/null
  python3 -I - "$E2E_OUT/android/ui.xml" "product.form.listing.$1" "$E2E_OUT/android/tick.png" <<'PY'
import re, sys, xml.etree.ElementTree as ET
from PIL import Image
root = ET.parse(sys.argv[1]).getroot()
rows = [n for n in root.iter("node") if n.get("content-desc") == sys.argv[2]]
if not rows: print("none"); sys.exit()
m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", rows[0].get("bounds"))
x1, y1, x2, y2 = map(int, m.groups())
im = Image.open(sys.argv[3]).convert("RGB")
# the box is 54 px wide at x 47..101 (1080 px wide screen); the row text may wrap, so look for blue in the box over the row's height
cy = (y1 + y2) // 2
# the box is 54 px wide at x 47..101; the row text may wrap, so look inside the box over the row's height.
# A ticked box is filled (blue, or grey when dimmed), an empty one is white inside its border.
hits = total = 0
for y in range(max(y1, cy - 40), min(y2, cy + 40), 4):
    for x in range(58, 92, 4):
        r, g, b = im.getpixel((x, y))
        total += 1
        if min(r, g, b) < 225: hits += 1
print("true" if total and hits * 100 // total >= 35 else "false")
PY
}
form_to_ticks() { local i; for i in 1 2 3 4; do "$U" swipe up >/dev/null; done; "$U" has "product.form.listing.1" >/dev/null 2>&1; }   # the box is at the bottom of the form: scroll to the end
value_after() { # value_after "<exact text>": the text of the node right after it in a fresh dump
  "$U" dump | python3 -I -c '
import sys
rows = [l.rstrip("\n").split(" | ") for l in sys.stdin]
for i, r in enumerate(rows):
    if r[0].strip() == sys.argv[1] and i + 1 < len(rows): print(rows[i + 1][0].strip()); break' "$1"
}
open_product() { # open_product "<name>" "<short ascii query>": Home search -> the row -> the detail screen (a short query: the keyboard's suggestions garble long ones)
  to_tabs; go_home; home_search "${2:-$1}"; "$U" tap "$1" 1 >/dev/null; sleep 3
}
detail_collect() { # detail_collect: scroll the order detail until the payment section is on screen; DT = its texts, CV = the value after "Thu khi giao" (empty when the row is not shown)
  local i; for i in 0 1 2 3 4; do DT="$(texts 9000)"; CV="$(value_after "$(L detail_collect_at_hand_over)")"; [ -n "$CV" ] && return 0; "$U" swipe up >/dev/null; done; return 1
}
share_image() { # share_image <label>: order detail open -> Thêm thao tác -> Chia sẻ đơn -> the JPG the app wrote (cache/receipts) is copied to SHARE_IMG
  tap_any "$(L detail_more_actions)"; sleep 2; tap_any "$(L order_sheet_share)"; sleep 7
  local name; name="$(adb -s "$SERIAL" shell run-as anyrent.shop ls -t cache/receipts 2>/dev/null | head -1 | tr -d '\r')"
  SHARE_IMG="$SHOTS/share-$1.jpg"; adb -s "$SERIAL" exec-out run-as anyrent.shop cat "cache/receipts/$name" > "$SHARE_IMG" 2>/dev/null
  "$U" shot "share-$1-chooser" >/dev/null; "$U" back >/dev/null; sleep 2; note "SHARE IMAGE $1: $SHARE_IMG ($(wc -c < "$SHARE_IMG" | tr -d ' ') bytes, app file $name)"
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
  sharenote)  # #1354 the switch "Hiện ghi chú đơn trên ảnh chia sẻ" on In & phiếu: the owner flips it (saved at once), the others see it dimmed with "Chỉ chủ shop bật/tắt."
    flagdb() { sql "select coalesce(settings->>'shareOrderNote','false') from \"Merchant\" where id=1"; }
    switch_xy() { # centre of the Switch node (content-desc = the title, clickable), scrolling the printer screen until it is on screen
      local i xy; for i in 0 1 2 3; do
        xy="$("$U" dump | python3 -I -c '
import re, sys
for l in sys.stdin:
    if l.startswith(" | " + sys.argv[1] + " |") and "(clickable)" in l:
        m = re.search(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", l); print((int(m.group(1)) + int(m.group(3))) // 2, (int(m.group(2)) + int(m.group(4))) // 2); break' "$(L printer_share_note_title)")"
        [ -n "$xy" ] && { echo "$xy"; return 0; }; "$U" swipe up >/dev/null
      done; return 1; }
    CUR="$(flagdb)"; note "share note flag at start: $CUR"
    sign_in "$who"; open_printer; XY="$(switch_xy)"; ALL="$(texts 6000)"; shot "sharenote-$who"; "$U" swipe up >/dev/null; ALL="$ALL$(texts 6000)"; "$U" swipe down >/dev/null; XY="$(switch_xy)"   # the caption sits under the row: look one screen further too, then back to the row
    [ -n "$XY" ] && pass "$tag $who: the switch '$(L printer_share_note_title)' is on In & phiếu" || fail "$tag $who: no switch row on In & phiếu: ${PT:0:300}"
    if [ "$who" = merchant ]; then
      echo "$ALL" | grep -Fq "$(L printer_share_note_readonly)" && fail "$tag owner sees the read-only caption" || pass "$tag owner: no read-only caption"
      [ "$CUR" = false ] && pass "$tag default is OFF (DB)" || note "flag was $CUR at start"
      "$U" tap "@${XY% *},${XY#* }" >/dev/null; sleep 4; shot sharenote-merchant-on
      [ "$(flagdb)" = true ] && pass "$tag owner turned it ON on the device (DB true, saved at once)" || fail "$tag owner tapped the switch: DB flag is $(flagdb)"
      XY="$(switch_xy)"; "$U" tap "@${XY% *},${XY#* }" >/dev/null; sleep 4; shot sharenote-merchant-off
      [ "$(flagdb)" = false ] && pass "$tag owner turned it OFF again (DB false)" || fail "$tag owner: DB flag stays $(flagdb)"
    else
      echo "$ALL" | grep -Fq "$(L printer_share_note_readonly)" && pass "$tag $who: dimmed with '$(L printer_share_note_readonly)'" || fail "$tag $who lacks '$(L printer_share_note_readonly)': ${ALL:0:300}"
      "$U" tap "@${XY% *},${XY#* }" >/dev/null 2>&1; sleep 3; shot "sharenote-$who-tapped"
      [ "$(flagdb)" = "$CUR" ] && pass "$tag $who: tapping the switch changes nothing (DB $CUR)" || fail "$tag $who changed the shop flag to $(flagdb)"
    fi ;;
  listing)  # #1346 "Hiện ở chi nhánh" tick: <merchant|manager|staff|kho|onebranch> (onebranch = a shop with one branch: no tick at all)
    fx_listing; LO="$(cat "$E2E_OUT/listing-order.txt")"
    case "$who" in
      merchant)
        sign_in merchant; go_home; home_search "Tick"; T="$(texts 6000)"; shot listing-merchant-home
        echo "$T" | grep -Fq "E2E Tick An" && pass "$tag owner: the product not shown at the branch is still listed on Home" || fail "$tag owner does not see E2E Tick An: ${T:0:300}"
        echo "$T" | grep -Fq "$(L products_listing_not_shown)" && pass "$tag owner: its row says '$(L products_listing_not_shown)'" || fail "$tag owner: no '$(L products_listing_not_shown)' label"
        echo "$T" | grep -Fq "$(L v2_add_to_cart_named "E2E Tick An")" && fail "$tag owner: a + button on the unticked product" || pass "$tag owner: no + button on the unticked product"
        echo "$T" | grep -Fq "$(L v2_add_to_cart_named "E2E Tick Hien")" && pass "$tag owner: the ticked product has +" || fail "$tag owner: the ticked product has no +"
        echo "$T" | grep -Fq "$(L v2_stock_none_today)" && pass "$tag owner: ticked product with 0 left shows '$(L v2_stock_none_today)'" || fail "$tag owner: no '$(L v2_stock_none_today)' for E2E Tick Het"
        # the form: tick An (not blocked, saved), untick again; untick Hien (reminder, saved), tick again
        "$U" tap "E2E Tick An" 1 >/dev/null; sleep 3; tap_any "$(L v2_detail_edit)"; sleep 4; form_to_ticks; shot listing-merchant-form-an
        A1="$(tick_state 1)"; A3="$(tick_state 3)"; [ "$A1" = false ] && [ "$A3" = true ] && pass "$tag owner form: branch 1 unticked, branch 3 ticked" || fail "$tag owner form ticks: branch1=$A1 branch3=$A3"
        "$U" tap "product.form.listing.1" >/dev/null; sleep 1; [ "$(tick_state 1)" = true ] && pass "$tag owner: tapping the row ticks it" || fail "$tag owner: row did not tick ($(tick_state 1))"
        tap_any "$(L v2_form_save_changes)"; sleep 5; shot listing-merchant-form-an-saved
        [ "$(listed_db 21 1)" = t ] && pass "$tag owner saved the tick (DB isListed true)" || fail "$tag owner tick not saved: $(listed_db 21 1)"
        sql "update \"OutletStock\" set \"isListed\"=false where \"productId\"=21 and \"outletId\"=1" >/dev/null
        to_tabs; open_product "E2E Tick Hien" "Tick%sHien"; tap_any "$(L v2_detail_edit)"; sleep 4; form_to_ticks
        "$U" tap "product.form.listing.1" >/dev/null; sleep 1; F="$(texts 6000)"; shot listing-merchant-form-hien-untick
        echo "$F" | grep -Fq "$(L products_listing_reminder_no_rent 6 | cut -c1-30)" && pass "$tag owner: unticking shows the reminder line (units still counted)" || fail "$tag owner: no reminder after unticking: ${F:0:400}"
        tap_any "$(L v2_form_save_changes)"; sleep 5
        [ "$(listed_db 23 1)" = f ] && pass "$tag owner: unticking was not blocked and saved (DB isListed false)" || fail "$tag owner: untick not saved: $(listed_db 23 1)"
        sql "update \"OutletStock\" set \"isListed\"=true where \"productId\"=23 and \"outletId\"=1" >/dev/null
        # an order that holds the unticked product still opens
        open_order "$LO"; D="$(texts 6000)"; shot listing-merchant-open-order; echo "$D" | grep -Fq "E2E Tick An" && pass "$tag owner: the open order of the unticked product opens ($LO)" || fail "$tag owner: order $LO did not open with its product: ${D:0:300}" ;;
      manager|kho)
        sign_in "$who"; go_home; home_search "Tick"; T="$(texts 6000)"; shot "listing-$who-home"
        echo "$T" | grep -Fq "E2E Tick An" && fail "$tag $who sees the unticked product on Home" || pass "$tag $who: the unticked product is not on Home"
        echo "$T" | grep -Fq "E2E Tick Hien" && pass "$tag $who: the ticked product is listed" || fail "$tag $who: E2E Tick Hien missing: ${T:0:300}"
        echo "$T" | grep -Fq "E2E Tick Het" && echo "$T" | grep -Fq "$(L v2_stock_none_today)" && pass "$tag $who: ticked product with 0 left is listed as '$(L v2_stock_none_today)'" || fail "$tag $who: E2E Tick Het (0 left) not listed as out"
        "$U" tap "E2E Tick Hien" 1 >/dev/null; sleep 3; tap_any "$(L v2_detail_edit)"; sleep 4; form_to_ticks; F="$(texts 6000)"; shot "listing-$who-form"
        T1="$(tick_state 1)"; [ "$T1" != none ] && pass "$tag $who: sees its own dimmed tick row (checked=$T1)" || fail "$tag $who: no tick row in the form: ${F:0:300}"
        echo "$F" | grep -Fq "$(L products_listing_owner_only)" && pass "$tag $who: '$(L products_listing_owner_only)'" || fail "$tag $who: no '$(L products_listing_owner_only)'"
        "$U" tap "product.form.listing.1" >/dev/null 2>&1; sleep 1; [ "$(tick_state 1)" = "$T1" ] && pass "$tag $who: tapping the tick changes nothing" || fail "$tag $who: the tick moved ($T1 -> $(tick_state 1))"
        [ "$(listed_db 23 1)" = t ] && pass "$tag $who: DB isListed unchanged" || fail "$tag $who: DB isListed changed"
        to_tabs; open_order "$LO"; D="$(texts 6000)"; shot "listing-$who-open-order"; echo "$D" | grep -Fq "E2E Tick An" && pass "$tag $who: the open order of the unticked product opens ($LO)" || fail "$tag $who: order $LO did not open: ${D:0:300}" ;;
      staff)
        sign_in staff; go_home; home_search "Tick"; T="$(texts 6000)"; shot listing-staff-home
        echo "$T" | grep -Fq "E2E Tick An" && fail "$tag staff sees the unticked product on Home" || pass "$tag staff: the unticked product is not on Home"
        echo "$T" | grep -Fq "E2E Tick Hien" && pass "$tag staff: the ticked product is listed" || fail "$tag staff: E2E Tick Hien missing"
        "$U" tap "E2E Tick Hien" 1 >/dev/null; sleep 3; D="$(texts 6000)"; shot listing-staff-detail
        echo "$D" | grep -Fq "$(L products_listing_title): " && echo "$D" | grep -Fq "$(L products_listing_owner_only)" && pass "$tag staff: detail has the dimmed line '$(L products_listing_title) ... $(L products_listing_owner_only)'" || fail "$tag staff: no dimmed tick line on the detail: ${D:0:500}"
        echo "$D" | grep -Fq "$(L v2_detail_edit)" && fail "$tag staff sees Sửa"
        to_tabs; open_order "$LO"; D="$(texts 6000)"; echo "$D" | grep -Fq "E2E Tick An" && pass "$tag staff: the open order of the unticked product opens ($LO)" || fail "$tag staff: order $LO did not open: ${D:0:300}" ;;
      onebranch)
        login_as healthy.owner@e2e-sub.test merchant123 && note "signed in as healthy.owner (one branch)" || { fail "$tag no sign-in"; exit 1; }
        go_home; home_search "SP%s1"; "$U" tap "E2E SP 1" 1 >/dev/null; sleep 3; tap_any "$(L v2_detail_edit)"; sleep 4; F="$(texts 6000)"; shot listing-onebranch-form
        echo "$F" | grep -Fq "$(L products_listing_title)" && fail "$tag one-branch shop: the form has a '$(L products_listing_title)' box" || pass "$tag one-branch shop: no tick box in the form"
        form_to_ticks; [ "$(tick_state 1)" = none ] && pass "$tag one-branch shop: no tick row nodes" ;;
    esac ;;
  othbr)  # #1353 "Chi nhánh khác còn: A (3), B (1)" under a short cart line: <merchant|manager|kho|staff|onebranch>
    O5="$(sql "select id from \"Outlet\" where name='Chi nhanh E2E Ba'")"
    if [ -z "$O5" ]; then
      sql "insert into \"Outlet\"(name,\"isDefault\",\"merchantId\",\"updatedAt\") values ('Chi nhanh E2E Ba', false, 1, now())" >/dev/null; O5="$(sql "select id from \"Outlet\" where name='Chi nhanh E2E Ba'")"
      sql "insert into \"OutletStock\"(\"productId\",\"outletId\",stock,available,renting,\"isListed\",\"updatedAt\") select id, $O5, 0, 0, 0, true, now() from \"Product\" where \"merchantId\"=1 on conflict do nothing" >/dev/null
    fi
    sql "update \"Product\" set name='E2E Thieu Hang', \"totalStock\"=5 where id=24; update \"OutletStock\" set stock=1, available=1, renting=0, \"isListed\"=true where \"productId\"=24 and \"outletId\"=1;
      update \"OutletStock\" set stock=3, available=3, renting=0, \"isListed\"=true where \"productId\"=24 and \"outletId\"=3; update \"OutletStock\" set stock=1, available=1, renting=0, \"isListed\"=true where \"productId\"=24 and \"outletId\"=$O5" >/dev/null
    if [ ! -s "$E2E_OUT/othbr-order.txt" ]; then $FIX multi manager 24 1 0 1 | python3 -I -c 'import sys,json; print(json.load(sys.stdin)["orderNumber"])' > "$E2E_OUT/othbr-order.txt"; fi
    HINT="$(L v2_cart_others_have "")"; HINT="${HINT% }"
    cart_try() { # cart_try <label> <qty> <from> <to> <product>: Home -> add -> cart -> dates -> wait for the hint; CT = texts
      go_home; clear_cart; home_search "$(echo "$5" | cut -d' ' -f2- | sed 's/ /%s/g')"; add_to_cart "$5" "$2"; open_cart; sleep 2; pick_dates "$3" "$4"; sleep 7; CT="$(texts 6000)"; shot "othbr-$who-$1"
    }
    case "$who" in
      onebranch) login_as healthy.owner@e2e-sub.test merchant123 && note "signed in as healthy.owner (one branch)" || { fail "$tag no sign-in"; exit 1; }
        N0="$(posts_other)"; cart_try short 6 0 1 "E2E SP 1"
        echo "$CT" | grep -Fq "$HINT" && fail "$tag one-branch shop: a hint shows" || pass "$tag one-branch shop: no hint under the short line"
        echo "$CT" | grep -Eq "$(L v2_cart_short_stock 5 | cut -c1-12)|$(L v2_cart_short_rent 5 | cut -c1-12)|$(L v2_cart_out_of_stock)" && pass "$tag one-branch shop: the cart shows its shortage line" || note "one-branch cart: no shortage text found: ${CT:0:300}"
        note "API lines other-outlets-availability: $N0 -> $(posts_other) (one-branch shop; the app may or may not ask, the API answers [])"; clear_cart ;;
      merchant|manager|kho|staff)
        sign_in "$who"; N0="$(posts_other)"
        cart_try one-day 2 0 1 "E2E Thieu Hang"
        if [ "$who" = staff ]; then
          echo "$CT" | grep -Fq "$HINT" && fail "$tag staff sees the hint" || pass "$tag staff: no hint, only the shortage line"
          echo "$CT" | grep -Eq "$(L v2_cart_short_rent 1 | cut -c1-12)" && pass "$tag staff: the plain shortage line shows" || note "staff cart texts: ${CT:0:300}"
          N1="$(posts_other)"; [ "$N1" = "$N0" ] && pass "$tag staff: the app did not call other-outlets-availability (API log lines $N0 -> $N1)" || fail "$tag staff: the app called other-outlets-availability ($N0 -> $N1)"
        else
          echo "$CT" | grep -Fq "$HINT" && pass "$tag $who: the hint shows under the short line" || fail "$tag $who: no hint '$HINT': ${CT:0:400}"
          echo "$CT" | grep -Fq "Outlet 2 - Rental Shop Demo (3)" && echo "$CT" | grep -Fq "Chi nhanh E2E Ba (1)" && pass "$tag $who: both other branches with their units" || fail "$tag $who: hint lacks 'Outlet 2 - Rental Shop Demo (3)' / 'Chi nhanh E2E Ba (1)': $(echo "$CT" | grep -o "$HINT[^¦]*")"
          echo "$CT" | grep -o "Chi nhánh khác còn: [^|¦]*" | head -1 | grep -Eq "^Chi nhánh khác còn: Outlet 2 - Rental Shop Demo \(3\), Chi nhanh E2E Ba \(1\)" && pass "$tag $who: most units first" || note "order of the branches: $(echo "$CT" | grep -o "Chi nhánh khác còn: [^|¦]*" | head -1)"
        fi
        clear_cart
        # a rental of two days (today..tomorrow) whose only unit is held by another order on both days: same hint (not for staff)
        cart_try multi-day 1 0 1 "E2E Thieu Hang"; N2="$(posts_other)"
        if [ "$who" = staff ]; then echo "$CT" | grep -Fq "$HINT" && fail "$tag staff sees the hint on a multi-day order" || pass "$tag staff: multi-day order: no hint"; [ "$N2" = "$N0" ] && pass "$tag staff: still no call after the multi-day order" || fail "$tag staff called the API ($N0 -> $N2)"
        else echo "$CT" | grep -Fq "$HINT" && pass "$tag $who: multi-day order (today..tomorrow, held by order $(cat "$E2E_OUT/othbr-order.txt")): the hint shows" || fail "$tag $who: no hint on the multi-day order: ${CT:0:400}"; fi
        clear_cart ;;
    esac ;;
  share)  # #1345 / #1350 / #1354: the order with a staged deposit on <role>: detail "Thu khi giao", the share image with the stage unpaid then paid, the note switch flipped from "another device"
    NOTE="Ghi chu don: giao truoc 9h, goi khach truoc khi den, mang theo CCCD goc"
    # the staged order and the collection of stage 2 come from "another device": never the account that is on this device (a login elsewhere signs it out)
    ACTOR=manager; COLLECT_ACTOR=manager; [ "$who" = manager ] && ACTOR=merchant && COLLECT_ACTOR=merchant; [ "$who" = staff ] && COLLECT_ACTOR=merchant; [ "$who" = kho ] && COLLECT_ACTOR=merchant
    flag() { if [ "$who" = merchant ]; then sql "update \"Merchant\" set settings = jsonb_set(coalesce(settings,'{}'::jsonb), '{shareOrderNote}', '$1'::jsonb) where id=1" >/dev/null; else $SYNC set sharenote "$1" >/dev/null; fi; note "flag shareOrderNote=$1 set from another device"; }
    sql "update \"Merchant\" set currency='VND' where id=1" >/dev/null   # the seed shop is in USD: the money order is read in VND (1.150.000)
    ORD="$($FIX staged $ACTOR "$NOTE")"; ID="$(echo "$ORD" | python3 -I -c 'import sys,json; print(json.load(sys.stdin)["id"])')"; NUM="$(echo "$ORD" | python3 -I -c 'import sys,json; print(json.load(sys.stdin)["orderNumber"])')"
    note "order for $who: $ORD"
    flag false
    sign_in "$who"
    open_order "$NUM"; detail_collect; D="$DT"; shot "share-$who-detail-unpaid"
    echo "$CV" | grep -Fq "575.000" && pass "$tag $who: detail 'Thu khi giao' = 575.000 while stage 2 is unpaid (was: '$CV')" || fail "$tag $who: detail 'Thu khi giao' is '$CV', expected 575.000: ${D:0:900}"
    BTN="$(echo "$D" | grep -o "$(L detail_hand_over_collect "" | cut -d' ' -f1-3)[^|¦]*" | head -1)"; note "hand-over button text (known, waits for the owner's decision: 920.000 while a stage is unpaid): '$BTN'"
    share_image "$who-unpaid-noteoff"
    flag true; tap_any "$(L back)" >/dev/null 2>&1; to_tabs; open_order "$NUM"; share_image "$who-unpaid-noteon"
    $FIX collect "$ID" $COLLECT_ACTOR >/dev/null && note "stage 2 collected by $COLLECT_ACTOR (API)"
    to_tabs; restart_app; sleep 8; open_order "$NUM"; detail_collect; D="$DT"; shot "share-$who-detail-paid"
    echo "$CV" | grep -Fq "575.000" && pass "$tag $who: detail 'Thu khi giao' = 575.000 after stage 2 is collected (was: '$CV')" || fail "$tag $who: after collecting, 'Thu khi giao' is '$CV': ${D:0:900}"
    BTN="$(echo "$D" | grep -o "$(L detail_hand_over_collect "" | cut -d' ' -f1-3)[^|¦]*" | head -1)"; echo "$BTN" | grep -Fq "575.000" && pass "$tag $who: hand-over button says 575.000 once every stage is collected ('$BTN')" || fail "$tag $who: hand-over button after collecting: '$BTN'"
    share_image "$who-paid-noteon"; flag false; to_tabs; open_order "$NUM"; share_image "$who-paid-noteoff" ;;
  *) sed -n 1,22p "$0"; exit 64 ;;
esac
note "settings-sync $which_case${3:+/$3} done: $FAILS failed"
exit $((FAILS > 0))
