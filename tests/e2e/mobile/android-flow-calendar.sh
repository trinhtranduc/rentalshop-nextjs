# sourced by android-flows.sh: MOB-CAL-01..03 on the `ops` scenario (ops.owner@e2e-sub.test), then calendar-check.js
# The day list (#893 lean row) shows no order number: a row is its tag (Giao / Trả) and its total, noted as
# `rows=out:300000,back:200000` for calendar-check.js, which builds the same list from the API.
cal_parse() { "$U" dump | python3 -c '
import sys, re
out_tag, back_tag, home = sys.argv[1], sys.argv[2], sys.argv[3]
rows = [l.rstrip("\n").split(" | ") for l in sys.stdin]
texts = [r[0].strip() for r in rows]
# header: "HÔM NAY · 20/10/26" on today, "18/10/26" on another day (en "TODAY · …")
hi = next((i for i, t in enumerate(texts) if re.match(r"^((TODAY|HÔM NAY) · )?\d\d/\d\d/\d\d$", t)), -1)
title = texts[hi] if hi >= 0 else ""
summary = next((t for t in texts[hi + 1:hi + 3] if re.search(r"(out|lấy) \d+ · (back|trả) \d+", t)), "") if hi >= 0 else ""
items, kind = [], None
for t in texts[hi + 1:] if hi >= 0 else []:
    if t == home: break
    if t == out_tag or t == back_tag: kind = "out" if t == out_tag else "back"; continue
    if kind and re.match(r"^\d{1,3}([.,]\d{3})*$", t): items.append(kind + ":" + re.sub(r"\D", "", t)); kind = None
print(title + "\t" + summary + "\t" + ",".join(sorted(items)))' "$(L orders_hand_over)" "$(L calendar_v2_tag_return)" "$(L home)"; }

set_lang
do_login ops.owner@e2e-sub.test merchant123
clear_cart; tap_any "$(L calendar)"; sleep 4
"$U" shot a-cal-0-month >/dev/null
note "CAL header: $(texts 300)"
today_title="$(cal_parse | cut -f1)"
echo "$today_title" | grep -Eqi "^($(L calendar_v2_today)|TODAY|HÔM NAY)" && pass "calendar opens on today ($today_title)" || fail "calendar should open on today: '$today_title'"
echo "$today_title" | grep -q "$(vn_day 0 dm)" && pass "title carries the Vietnam day $(vn_day 0 dm)" || fail "title lacks $(vn_day 0 dm): '$today_title'"
for off in -5 -4 -3 -2 -1 0 1 2 3 4; do
  key="$(vn_day $off iso)"; dm="$(vn_day $off dm)"
  "$U" tap "~$dm" >/dev/null 2>&1 || { note "CAL $key | not on this month's grid"; continue; }
  sleep 3; IFS=$'\t' read -r title summary orders < <(cal_parse)
  note "CAL $key | title=$title | summary=$summary | rows=$orders"
  "$U" shot "a-cal-$key" >/dev/null
done
# MOB-CAL-03: a row opens its order. Today lists 710001 (hand over), 710002 (return) and the late 710003; the first row is the
# hand-over 710001 (hand-overs first), its customer is "Khách E2E 1" on every ops order
"$U" tap "~$(vn_day 0 dm)" >/dev/null 2>&1; sleep 2
if "$U" tap "Khách E2E 1" >/dev/null 2>&1; then
  sleep 3; "$U" shot a-cal-row-detail >/dev/null
  texts 1500 | grep -q "710001" && pass "the first calendar row of today opens the order 710001" || fail "the first row of today did not open order 710001: $(texts 400)"
  "$U" back >/dev/null
else fail "no calendar row of today to tap"; fi
echo "--- calendar-check.js (API calendar/orders; logs ops.owner in)"
node "$CHK/calendar-check.js" "$OUT/notes.txt" || FAILS=$((FAILS + 1))
exit $((FAILS > 0))
