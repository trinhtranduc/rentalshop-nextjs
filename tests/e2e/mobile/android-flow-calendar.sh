# sourced by android-flows.sh: MOB-CAL-01..03 on the `ops` scenario (ops.owner@e2e-sub.test), then calendar-check.js
cal_parse() { "$U" dump | python3 -c '
import sys, re
rows = [l.rstrip("\n").split(" | ") for l in sys.stdin]
texts = [t.strip() for r in rows for t in r[:2] if t.strip()]
title = next((r[0].strip() for r in rows if re.match(r"^(TODAY|HÔM NAY|[A-ZÀ-Ỹ0-9]{2,4}[ .]+\d\d/\d\d)", r[0].strip())), "")
summary = next((t for t in texts if re.search(r"(out|giao) \d+ · (back|trả) \d+", t)), "")
orders = sorted(set(re.findall(r"#(\d{6})", " ".join(texts))))
print(title + "\t" + summary + "\t" + ",".join(orders))'; }
# "1 late · out 1 · back 1" -> the iOS wording the checker reads ("giao 1 · trả 1")
cal_norm() { sed -E 's/.*(out|giao) ([0-9]+) · (back|trả) ([0-9]+).*/giao \2 · trả \4/'; }

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
  note "CAL $key | title=$title | summary=$(echo "$summary" | cal_norm) | orders=$orders"
  "$U" shot "a-cal-$key" >/dev/null
done
# MOB-CAL-03: a row opens its order
"$U" tap "~$(vn_day 0 dm)" >/dev/null 2>&1; sleep 2
if "$U" tap "~#710001" >/dev/null 2>&1; then
  sleep 3; "$U" shot a-cal-row-detail >/dev/null
  texts 1500 | grep -q "710001" && pass "calendar row opens the order 710001" || fail "calendar row did not open order 710001: $(texts 400)"
  "$U" back >/dev/null
else fail "no calendar row #710001 to tap"; fi
echo "--- calendar-check.js (API calendar/orders; logs ops.owner in)"
node "$CHK/calendar-check.js" "$OUT/notes.txt" || FAILS=$((FAILS + 1))
exit $((FAILS > 0))
