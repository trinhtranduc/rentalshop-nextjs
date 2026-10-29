# NOT RUN (no disk left for an Android build on 2026-10-29). sourced by android-flows.sh: `settings-sync <currency|print|deposit|overlap>` (#1315, epic #1309). WRITTEN, NOT RUN YET.
# The OWNER's change goes through the API (tests/e2e/mobile/settings-sync-api.js, as the shop owner); the device is a STAFF account that must
# show the new value after the app reopens. Status per case:
#   currency  #1307 (merged, #1312)         print    #1308 (merged, #1311)
#   overlap   works today                   deposit  WAITS FOR #1310 (not built: the row is shown to every role today)
# Run (windows must be VISIBLE: AVD with a window, never -no-window):
#   scripts/mobile-e2e/seed-local.sh && scripts/mobile-e2e/api-local.sh start --build && scripts/mobile-e2e/prepare-accounts.sh staged
#   scripts/mobile-e2e/android-e2e.sh --fresh           # installs the app on the AVD
#   tests/e2e/mobile/android-flows.sh settings-sync currency   (then print, overlap, deposit; LANG_E2E=vi for Vietnamese)
SYNC="node $CHK/settings-sync-api.js"
which_case="${2:?currency|print|deposit|overlap}"
tag="[$LANG_E2E settings-sync/$which_case]"
STAFF_EMAIL="${E2E_STAFF_EMAIL:-staff.outlet1@example.com}"; STAFF_PW="${E2E_STAFF_PASSWORD:-staff123}"
set_lang
open_settings() { tap_any "$(L settings)"; sleep 3; }
open_overview() { go_home; sleep 4; }   # the staff Overview has no money tiles: the unit is read on the Home product rows ("$103/lần" vs "103/lần")
case "$which_case" in
  currency)  # (a) owner changes the currency; the staff device shows the new unit after reopening the app (#1307)
    START="$($SYNC get currency)"; OTHER=USD; [ "$START" = USD ] && OTHER=VND
    mark() { [ "$1" = VND ] && echo '/lần|/ngày' || echo '\$'; }
    do_login "$STAFF_EMAIL" "$STAFF_PW"; open_overview; "$U" shot "a-sync-currency-0-$START" >/dev/null
    t="$(texts 3000)"; echo "$t" | grep -Eq "$(mark "$START")" && pass "$tag staff sees $START before the change" || fail "$tag staff Overview lacks $(mark "$START") at start: ${t:0:300}"
    $SYNC set currency "$OTHER" >/dev/null && note "owner set currency $OTHER (API)"
    restart_app; sleep 8; open_overview; "$U" shot "a-sync-currency-1-$OTHER" >/dev/null; t="$(texts 3000)"
    echo "$t" | grep -Eq "$(mark "$OTHER")" && pass "$tag after reopening, staff Overview shows $OTHER" || fail "$tag staff still shows the old unit after reopening (#1307): ${t:0:300}"
    $SYNC set currency "$START" >/dev/null; restart_app; sleep 8; open_overview
    echo "$(texts 3000)" | grep -Eq "$(mark "$START")" && pass "$tag changed back: staff shows $START again (no stale value)" || fail "$tag staff did not follow the change back"
    # owner on the device, UI path (needs a second login; the same single-session rule): Settings -> Currency -> confirm. UNVERIFIED selectors.
    note "TODO owner UI: do_login owner; tap '$(L settings_v2_currency)'; pick the other currency; tap '$(L settings_v2_currency_confirm_button "$OTHER")'; then log in as staff and repeat the check" ;;
  print)  # (b) owner edits note + QR of the branch; staff and manager read them, read-only (#1308)
    NOTE="Ghi chu sync $(date +%H%M%S)"
    $SYNC set print "$NOTE" true >/dev/null && note "owner set print note '$NOTE' + QR on (API)"
    for who in "$STAFF_EMAIL|$STAFF_PW|staff" "${E2E_OUTLET_ADMIN_EMAIL:-admin.outlet1@example.com}|${E2E_OUTLET_ADMIN_PASSWORD:-admin123}|manager"; do
      IFS='|' read -r em pw role <<<"$who"
      do_login "$em" "$pw"; open_settings; tap_any "$(L settings_v2_printer)"; sleep 3; "$U" shot "a-sync-print-$role" >/dev/null; t="$(texts 3000)"
      echo "$t" | grep -q "$NOTE" && pass "$tag $role sees the owner's note on the printer screen" || fail "$tag $role does not see '$NOTE': ${t:0:300}"
      have_any "~$(L printer_outlet_readonly | cut -c1-30)" && pass "$tag $role sees the read-only caption (printer_outlet_readonly)" || fail "$tag $role lacks the read-only caption"
    done
    note "MANUAL $tag open an order > Share/Print as staff: the receipt text (and VietQR when on) must carry '$NOTE'; compare with screenshot a-sync-print-staff" ;;
  deposit)  # (c) "Thu cọc" hidden for manager and staff, shown for the owner. WAITS FOR #1310
    if [ "${E2E_PR1310_MERGED:-0}" != 1 ]; then note "SKIP $tag waits for #1310 (Thu cọc is hidden for every role except the owner); set E2E_PR1310_MERGED=1 after it lands"; exit 0; fi
    for who in "$STAFF_EMAIL|$STAFF_PW|staff" "${E2E_OUTLET_ADMIN_EMAIL:-admin.outlet1@example.com}|${E2E_OUTLET_ADMIN_PASSWORD:-admin123}|manager"; do
      IFS='|' read -r em pw role <<<"$who"; do_login "$em" "$pw"; open_settings; "$U" swipe up >/dev/null; "$U" shot "a-sync-deposit-$role" >/dev/null
      have_any "$(L deposit_settings_title)" && fail "$tag $role still sees '$(L deposit_settings_title)'" || pass "$tag $role does not see Thu cọc"
    done
    do_login "${E2E_MERCHANT_EMAIL:-merchant1@example.com}" "${E2E_MERCHANT_PASSWORD:-merchant123}"; open_settings; "$U" swipe up >/dev/null
    have_any "$(L deposit_settings_title)" && pass "$tag owner sees Thu cọc" || fail "$tag owner lacks Thu cọc" ;;
  overlap)  # (d) owner turns "Cho trùng lịch" off; the staff cart refuses a fully booked product; on again, it allows it
    # needs prepare-accounts.sh staged ("Váy trùng đơn test": 1 in stock, all held today by order 720001) on the staff's merchant
    PRODUCT="Váy trùng đơn test"
    try_cart() { go_home; clear_cart; add_to_cart "$PRODUCT" 1; open_cart; sleep 2; "$U" shot "a-sync-overlap-$1" >/dev/null; texts 3000; }
    $SYNC set overlap false >/dev/null; do_login "$STAFF_EMAIL" "$STAFF_PW"; restart_app; sleep 8
    t="$(try_cart off)"; echo "$t" | grep -q "$(L v2_cart_overlap_blocked | cut -c1-30)" && pass "$tag overlap OFF: the staff cart says the shop does not allow overlapping rentals" || fail "$tag overlap OFF: no blocked message in the staff cart: ${t:0:300}"
    $SYNC set overlap true >/dev/null; restart_app; sleep 8
    t="$(try_cart on)"; echo "$t" | grep -q "$(L v2_cart_overlap_blocked | cut -c1-30)" && fail "$tag overlap ON: the cart still blocks" || pass "$tag overlap ON: the cart no longer blocks (changed back, no stale value)"
    clear_cart ;;
  *) sed -n 2,10p "$0"; exit 64 ;;
esac
note "settings-sync $which_case done: $FAILS failed"
exit $((FAILS > 0))
