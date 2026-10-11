# sourced by android-flows.sh: MOB-STOCK-01..08 on the `stock` scenario (stock.owner@e2e-sub.test)
st_line() { home_lines | awk -F'\t' -v n="$1" '$1 == n { print $2 }' | head -1; }
st_expect() { # st_expect <what> <product> <number|none>
  local line n; line="$(st_line "$2")"; n="$(free_of "$line")"
  note "STOCKFLOW $1 $2: ${line:-<none>}"
  if [ "$3" = none ]; then
    echo "$line" | grep -Eq "$(L v2_stock_none_today)" && pass "$1 $2 shows '$line'" || fail "$1 $2 expected '$(L v2_stock_none_today)' got '$line'"
  else
    [ "$n" = "$3" ] && pass "$1 $2 shows $3 free ('$line')" || fail "$1 $2 expected $3 free got '$line'"
  fi
}

reset_stock; set_lang
do_login stock.owner@e2e-sub.test merchant123
clear_cart; go_home; "$U" wait "~E2E Con5" 20 >/dev/null; sleep 2
"$U" shot a-stock-0-initial >/dev/null
st_expect initial "E2E Con5" 5; st_expect initial "E2E Con1" 1; st_expect initial "E2E Het" none

# MOB-STOCK-02: sale of 2 x Con5 through the cart; the sale line says 5 in stock
add_to_cart "E2E Con5" 2; open_cart
tap_any "$(L v2_cart_sale)"; sleep 2
"$U" shot a-stock-1-sale-cart >/dev/null
have_any "$(L v2_cart_in_stock 5)" && pass "sale cart line: $(L v2_cart_in_stock 5)" || fail "sale cart line should say '$(L v2_cart_in_stock 5)': $(texts 600)"
pick_customer "Khách E2E 1"
n="$(submit_order sale)"; [ -n "$n" ] && [[ "$n" == \#* ]] && pass "sale created $n" || fail "sale not created ($n)"
go_home; sleep 3
st_expect after-sale "E2E Con5" 3

# MOB-STOCK-03: rent of 1 x Con5 for today (default dates today -> tomorrow)
add_to_cart "E2E Con5" 1; open_cart
pick_customer "Khách E2E 2"; pick_dates 0 1
"$U" shot a-stock-2-rent-cart >/dev/null
n="$(submit_order rent)"; [ -n "$n" ] && [[ "$n" == \#* ]] && pass "rent created $n" || fail "rent not created ($n)"
go_home; sleep 3
st_expect final "E2E Con5" 2
st_expect final "E2E Con1" 1
st_expect final "E2E Het" none
"$U" shot a-stock-3-final >/dev/null

# MOB-STOCK-04: product detail shows the same number in the next-days strip (sale took 2 units away: 3 in this shop, 1 rented)
"$U" tap "E2E Con5" >/dev/null; sleep 3
"$U" shot a-stock-4-detail >/dev/null
d="$(texts 1200)"; note "STOCKFLOW detail Con5 | $d"
echo "$d" | grep -Fq "$(L v2_detail_strip_accessibility): $(vn_day 0 d): 2," && pass "detail Con5: free today 2 in the next-days strip" || fail "detail Con5 strip should start '$(vn_day 0 d): 2,': ${d:0:500}"
"$U" back >/dev/null; sleep 2

# MOB-STOCK-05/06: out today product in the cart for today: Out tag, + still works; the tag opens the free days
add_to_cart "E2E Het" 1; open_cart
pick_customer "Khách E2E 2"; pick_dates 0 1
out="$(L v2_cart_overlap_one_day "$(vn_day 0 dm)")"
"$U" shot a-stock-5-het-today >/dev/null
have_any "~$out" && pass "Het for today carries the tag '$out'" || fail "Het for today should carry '$out': $(texts 700)"
tap_any "~$out" && sleep 2; "$U" shot a-stock-5b-free-days >/dev/null
fd="$(texts 2500)"
echo "$fd" | grep -q "$(L v2_detail_free_calendar)" && pass "tag opens '$(L v2_detail_free_calendar)'" || fail "tag did not open the free days: ${fd:0:300}"
"$U" back >/dev/null; sleep 2

# MOB-STOCK-07: Het for tomorrow (free): no tag, no shortage line
pick_dates 1 2
"$U" shot a-stock-6-het-tomorrow >/dev/null
t="$(texts 1500)"
if echo "$t" | grep -Eq "$(L v2_cart_overlap_one_day 'x' | sed 's/x.*//')[0-9]|$(L v2_cart_short_rent 1 | sed 's/1.*//')"; then fail "Het for tomorrow shows a tag or shortage: ${t:0:400}"; else pass "Het for tomorrow: no tag, no shortage line"; fi

# MOB-STOCK-08: 2 x Het for tomorrow: "Only 1 free on these dates"
"$U" tap "$(L v2_stepper_plus)" >/dev/null; sleep 2
"$U" shot a-stock-7-het-2 >/dev/null
have_any "~$(L v2_cart_short_rent 1)" && pass "2 x Het tomorrow: '$(L v2_cart_short_rent 1)'" || fail "2 x Het tomorrow should say '$(L v2_cart_short_rent 1)': $(texts 900)"

# leave a clean cart
clear_cart
note "STOCKFLOW done: $FAILS failed"
echo "--- stock-flow-check.js (API availability, logs stock.owner in: the app is logged out by it)"
node "$CHK/stock-flow-check.js" "$OUT/notes.txt" || FAILS=$((FAILS + 1))
exit $((FAILS > 0))
