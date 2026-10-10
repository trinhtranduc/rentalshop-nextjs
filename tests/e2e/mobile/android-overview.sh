#!/usr/bin/env bash
# #722 #725 #727 Android Overview (iOS layout, English emulator) against the API: every tile, sheet headline, sheet rows, chip,
# "See these orders" total and row count, for Today and 7 days, plus the "Today" card.
#
#   MOBILE_STAT_API_URL=http://localhost:$E2E_API_PORT node tests/e2e/mobile/android-overview-api.js > $E2E_OUT/overview-api.json   # FIRST (single session)
#   tests/e2e/mobile/android-overview.sh $E2E_OUT/overview-api.json    # app logged in as merchant1@example.com (android-e2e.sh)
#
# Prints `ANDROID_NOTE: PASS|FAIL <what> | app=.. api=..` and exits 1 when something failed. Money is shown with "." as the
# thousands separator, signs "+" / "−" are ignored.
. "$(dirname "${BASH_SOURCE[0]}")/android-lib.sh"
API_JSON="${1:-$E2E_OUT/overview-api.json}"
[ -f "$API_JSON" ] || { echo "usage: $0 <overview-api.json> (node tests/e2e/mobile/android-overview-api.js)"; exit 64; }
D="$OUT/overview"; rm -rf "$D"; mkdir -p "$D"

# log in when the app sits on the login screen (credentials of the seeded merchant)
if "$U" has "~Sign in" >/dev/null 2>&1 && "$U" has "~Password" >/dev/null 2>&1; then
  "$ROOT/tests/e2e/mobile/android-flows.sh" login "$E2E_MERCHANT_EMAIL" "$E2E_MERCHANT_PASSWORD"
fi
"$U" wait "Overview" 40 >/dev/null || { fail "overview tab not found"; exit 1; }
"$U" tap Overview >/dev/null; sleep 3

grab() { "$U" dump >"$D/$1.txt"; }                 # one dump per screen, parsed by check() below
shot() { "$U" shot "ov-$1" >/dev/null; }

tile() { # tile <title> <period key>
  local t="$1" p="$2" k; k="$p-${t// /_}"
  if ! "$U" wait "~$t, " 30 >/dev/null; then note "$k | tile not found"; return; fi
  grab "$k-tile"
  "$U" tap "~$t, " >/dev/null; sleep 2; grab "$k-sheet"; shot "$k-sheet"
  if "$U" tap "~See these orders" >/dev/null; then
    for _ in $(seq 1 25); do "$U" has "~Total of the rows" >/dev/null && break; "$U" has "~No orders in this period" >/dev/null && break; sleep 1; done
    sleep 1; grab "$k-related"; shot "$k-related"; "$U" back >/dev/null; sleep 2
  else
    note "$k | no 'See these orders' link"; "$U" back >/dev/null; sleep 1
  fi
}

"$U" wait "~New order value, " 40 >/dev/null; sleep 3
shot today
grab today-screen
"$U" swipe up >/dev/null; sleep 1; grab today-card; shot today-card; "$U" swipe down >/dev/null; "$U" swipe down >/dev/null; sleep 1
for t in "New order value" "Collected" "Still to collect" "Collateral"; do tile "$t" today; done
"$U" tap "7 days" >/dev/null; sleep 4; "$U" wait "~New order value, " 40 >/dev/null; sleep 3; shot last7
for t in "New order value" "Collected" "Still to collect" "Collateral"; do tile "$t" last7; done

python3 - "$API_JSON" "$D" "$OUT/notes.txt" <<'PY'
import json, re, sys, os
api = json.load(open(sys.argv[1])); D = sys.argv[2]; notes = open(sys.argv[3], "a")
fails = 0
def say(ok, what, app, want):
    global fails
    line = f"ANDROID_NOTE: {'PASS' if ok else 'FAIL'} {what} | app={app} api={want}"
    print(line); notes.write(line + "\n"); fails += 0 if ok else 1
def load(n):
    p = os.path.join(D, n + ".txt")
    if not os.path.exists(p): return []
    return [[x.strip() for x in l.rstrip("\n").split(" | ")[:2]] for l in open(p)]
def money(s):
    m = re.search(r"([+−-]?)\s*([\d.,]+)", s or "")
    if not m: return None
    v = int(re.sub(r"[.,]", "", m.group(2))); return -v if m.group(1) in ("-", "−") else v
def texts(rows): return [t for r in rows for t in r if t]
def tiledesc(rows, title):
    for t in texts(rows):
        if t.startswith(title + ", "): return t
    return ""
def after(rows, prefix, off=1):
    tx = [r[0] or r[1] for r in rows]
    for i, t in enumerate(tx):
        if t.startswith(prefix): return tx[i + off] if i + off < len(tx) else ""
    return ""
def related(rows):
    for t in texts(rows):
        m = re.match(r"Total of the rows · (\d+): ([+−-]?[\d.]+)", t)
        if m: return int(m.group(1)), money(m.group(2))
    return (0, 0) if any("No orders in this period" in t for t in texts(rows)) else (None, None)
def rowcount(rows): return sum(1 for r in rows if re.match(r"ORD-\d+-\d+ ·|\d{6} ·", r[0] or ""))

for per in ("today", "last7"):
    a = api[per]
    exp = {"New order value": a["orderValue"], "Collected": a["cash"], "Still to collect": a["outstanding"], "Collateral": a["collateralNet"]}
    for title, want in exp.items():
        k = f"{per}-{title.replace(' ', '_')}"
        tile, sheet, rel = load(k + "-tile"), load(k + "-sheet"), load(k + "-related")
        d = tiledesc(tile, title); parts = [x.strip() for x in d.split(", ")]
        say(money(parts[1]) == want if len(parts) > 1 else False, f"{per} tile {title}", parts[1] if len(parts) > 1 else d, want)
        head = after(sheet, f"{title} · ")
        say(money(head) == want, f"{per} sheet headline {title}", head, want)
        n, tot = related(rel)
        if title == "Collateral":
            say(tot == 0 or tot == want, f"{per} related total {title}", f"{n} rows, {tot}", want)
        else:
            say(tot == want, f"{per} related total {title}", f"{n} rows, {tot}", want)
        if title == "New order value":
            say(f"{a['newOrders']} new order" in d, f"{per} chip new orders", d, a["newOrders"])
            row = after(sheet, "New orders · "); say(money(row) == want and f"{a['newOrders']} order" in after(sheet, "New orders · ", 0), f"{per} sheet New orders row", after(sheet, "New orders · ", 0) + " " + row, want)
        if title == "Still to collect":
            say(f"{a['outstandingOrders']} awaiting" in d or a["outstandingOrders"] == 0, f"{per} chip awaiting pickup", d, a["outstandingOrders"])
            say(n == a["outstandingOrders"] and rowcount(rel) == a["outstandingOrders"], f"{per} related rows count", f"total says {n}, rows {rowcount(rel)}", a["outstandingOrders"])
            s1, s2 = money(after(sheet, "Due when the customer picks up")), money(after(sheet, "Past pickup date, unpaid"))
            say((s1 or 0) + (s2 or 0) == want, f"{per} sheet rows add up", f"{s1}+{s2}", want)
        if title == "Collected":
            parts_ = [money(after(sheet, p)) or 0 for p in ("Deposits at order", "Paid at pickup, sales", "Damage and late fees", "Refunds on cancelled", "Collateral in")]
            say(sum(parts_) == want, f"{per} sheet rows add up", "+".join(map(str, parts_)), want)
        if title == "Collateral" and per == "today":
            say(f"holding {a.get('held', api['todayCard']['held'])} order" in d, f"{per} chip holding", d, api["todayCard"]["held"])
# Today card
card = texts(load("today-card")); c = api["todayCard"]
def has(s): return any(s in t for t in card)
say(has(f"Handed over {c['pickups']}"), "today card To hand over", [t for t in card if t.startswith("To hand over")][:1], c["pickups"])
say(has(f"Taken back {c['returns']}"), "today card To take back", [t for t in card if t.startswith("To take back")][:1], c["returns"])
say(has(f"Overdue returns: {c['late']}"), "today card Overdue returns", [t for t in card if t.startswith("Overdue")][:1], c["late"])
say(has(f"Past pickup: {c['noShows']}"), "today card Past pickup", [t for t in card if t.startswith("Past pickup")][:1], c["noShows"])
tm = c["tomorrow"] or {}
say(has(f"Hand over {tm.get('pickups', 0)}") and has(f"Return {tm.get('returns', 0)}"), "today card Tomorrow line", [t for t in card if t.startswith("Tomorrow")][:1], tm)
print(f"overview: {fails} failed"); sys.exit(1 if fails else 0)
PY
