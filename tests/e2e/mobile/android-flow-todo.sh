# sourced by android-flows.sh: MOB-TODO-01..02 on the `ops` scenario: the Today card of Overview, the lists its tiles open and
# Orders > To do; then todo-check.js (API /api/analytics/outlet-operations)
# list_orders [pages]: "<all order numbers>\t<those of the first section>" of the list on screen (scrolls down to read the rest)
list_orders() { local i dump=""; for i in $(seq 1 "${1:-2}"); do dump="$dump"$'\n'"$("$U" dump)"; "$U" swipe up >/dev/null; done
  echo "$dump" | python3 -c '
import sys, re
texts = [l.rstrip("\n").split(" | ")[0].strip() for l in sys.stdin if l.strip()]
allo, first, seen_header = [], [], 0
for t in texts:
    if re.match(r"^[A-ZÀ-Ỹ ,.\-]+ · \d+$", t): seen_header += 1; continue   # a section header: LATE RETURN · 1, NOT DUE YET · 1 ...
    for n in re.findall(r"#(\d{6})", t):
        if n not in allo: allo.append(n)
        if seen_header <= 1 and n not in first: first.append(n)
print(",".join(sorted(allo)) + "\t" + ",".join(sorted(first)))'; }
card_label() { node_with "$1"; }
# today_rows: the "HÔM NAY · …" section of Orders > To do as "out:300000,back:200000". These rows show no order number
# (#893 lean row): a row is its tag (Cần giao / Cần trả) and its total; todo-check.js builds the same list from the API.
today_rows() { local i dumps=""; for i in 1 2 3; do dumps="$dumps"$'\n'"$("$U" dump)"$'\n@@'; "$U" swipe up >/dev/null; done
  echo "$dumps" | python3 -c '
import sys, re
out_tag, back_tag = sys.argv[1], sys.argv[2]
best = None
for dump in sys.stdin.read().split("@@"):
    texts = [l.split(" | ")[0].strip() for l in dump.split("\n") if l.strip()]
    hi = next((i for i, t in enumerate(texts) if re.match(r"^(HÔM NAY|TODAY) · ", t)), -1)
    if hi < 0: continue
    items, kind, done = [], None, False
    for t in texts[hi + 1:]:
        if re.match(r"^[A-ZÀ-Ỹ ,.\-]+ · ", t): done = True; break   # the next section header
        if t == out_tag or t == back_tag: kind = "out" if t == out_tag else "back"; continue
        if kind and re.match(r"^\d{1,3}([.,]\d{3})*$", t): items.append(kind + ":" + re.sub(r"\D", "", t)); kind = None
    if best is None or done: best = items
    if done: break
print(",".join(sorted(best or [])))' "$(L orders_v2_tag_hand_over)" "$(L orders_v2_tag_take_back)"; }

set_lang
do_login ops.owner@e2e-sub.test merchant123
clear_cart; tap_any "$(L overview)"; sleep 5
"$U" wait "~$(L overview_dash_today_pickups)" 20 >/dev/null || { "$U" swipe up >/dev/null; sleep 1; }
"$U" swipe up >/dev/null; sleep 1; "$U" shot a-todo-card >/dev/null
note "TODO pickups | $(card_label "$(L overview_dash_today_pickups)")"
note "TODO returns | $(card_label "$(L overview_dash_today_returns)")"
note "TODO late | $(card_label "$(L overview_dash_today_overdue)")"
note "TODO noshows | $(card_label "$(L overview_dash_today_no_shows)")"
note "TODO tomorrow | $(card_label "$(L overview_dash_today_tomorrow '' '' | cut -d'·' -f1)")"
for k in late noshows; do
  [ $k = late ] && tile="$(L overview_dash_today_overdue)" || tile="$(L overview_dash_today_no_shows)"
  if "$U" tap "~$tile" >/dev/null 2>&1; then
    sleep 3; "$U" shot "a-todo-list-$k" >/dev/null
    IFS=$'\t' read -r all first < <(list_orders 2); note "TODOLIST $k | rows=$all | first=$first"
    "$U" back >/dev/null; sleep 2; "$U" swipe up >/dev/null
  else note "TODOLIST $k | tile not tappable"; fi
done
# the pickups tile opens Orders > To do
if "$U" tap "~$(L overview_dash_today_pickups)" >/dev/null 2>&1; then
  sleep 4; "$U" shot a-todo-orders >/dev/null
  note "TODOLIST orders-todo-today | rows=$(today_rows)"
else note "TODOLIST orders-todo | tile not tappable"; fi
echo "--- todo-check.js (API outlet-operations; logs ops.owner in)"
node "$CHK/todo-check.js" "$OUT/notes.txt" || FAILS=$((FAILS + 1))
exit $((FAILS > 0))
