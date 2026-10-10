# sourced by android-flows.sh: MOB-ROLE-01..05 for staff / kho on the `ops` scenario
role="${2:?staff|kho}"; tag="[$LANG_E2E ops/$role]"
set_lang; do_login "ops.$role@e2e-sub.test" "$(role_pw "$role")"; clear_cart
absent() { # absent <what> <selector>...: none of the selectors is on the current screen
  local what="$1" s; shift
  for s in "$@"; do have_any "$s" && { fail "$tag $what: '$s' is on screen"; return 1; }; done; pass "$tag $what"; }
t="$(tap_any "$(L orders)"; sleep 4; texts 3000)"; "$U" shot "a-role-$role-orders" >/dev/null
echo "$t" | grep -q "#710004" && pass "$tag Orders loads (To do lists #710004)" || fail "$tag Orders did not load: ${t:0:300}"
echo "$t" | grep -Eq "$RAWRE" && fail "$tag raw key on Orders" || pass "$tag no raw key on Orders"
"$U" tap "~#710001" >/dev/null 2>&1; sleep 3; "$U" tap "$(L detail_more_actions)" >/dev/null 2>&1; sleep 2; "$U" shot "a-role-$role-order-sheet" >/dev/null
note "ROLE $role order sheet | $(texts 500)"
absent "order menu has no Delete" "$(L delete)" "~Xóa" "~Xoá" "~Delete"
to_tabs
tap_any "$(L calendar)"; sleep 4; "$U" shot "a-role-$role-calendar" >/dev/null; t="$(texts 6000)"
echo "$t" | grep -q "#710001" && pass "$tag Calendar loads today's order" || fail "$tag Calendar did not list #710001"
echo "$t" | grep -Eq "$RAWRE" && fail "$tag raw key on Calendar" || pass "$tag no raw key on Calendar"
tap_any "$(L overview)"; sleep 5; "$U" shot "a-role-$role-overview" >/dev/null
have_any "~$(L overview_dash_today_pickups)" && pass "$tag Overview shows the Today card" || fail "$tag Overview lacks the Today card: $(texts 300)"
absent "Overview has no money tiles" "~$(L overview_v2_new_order_value), " "~$(L overview_v2_outstanding), " "~$(L overview_v2_collateral), " "~$(L overview_dash_kpi_collected), "
tap_any "$(L settings)"; sleep 3; "$U" swipe up >/dev/null; "$U" shot "a-role-$role-settings" >/dev/null; t="$(texts 1500)"; note "ROLE $role settings | $t"
absent "Settings has no Users / Export / Bank accounts" "$(L settings_v2_users)" "$(L export_data)" "$(L bank_accounts)"
"$U" swipe down >/dev/null; "$U" swipe down >/dev/null
go_home; "$U" tap "E2E SP 1" >/dev/null 2>&1; sleep 3; "$U" shot "a-role-$role-product" >/dev/null
if [ "$role" = staff ]; then absent "staff product detail has no Edit / Delete" "$(L edit_product)" "$(L delete_product)"
else have_any "$(L edit_product)" && pass "$tag kho product detail has Edit" || fail "$tag kho product detail lacks Edit"; fi
to_tabs
note "ROLE $role done: $FAILS failed"
exit $((FAILS > 0))
