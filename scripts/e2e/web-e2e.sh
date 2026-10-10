#!/usr/bin/env bash
# Shop web e2e (#573): chosen rental days round trip in a real browser (tests/e2e/web/date-roundtrip.web.js).
# Runs against a LOCAL API and a LOCAL shop web (apps/client). Creates orders for the account and cancels them.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

usage() {
  cat <<'EOF'
Usage: scripts/e2e/web-e2e.sh [--tz "Asia/Ho_Chi_Minh UTC America/Los_Angeles"] [--case WEB-RT-01,...] [--headed] [--show-bugs]
       scripts/e2e/web-e2e.sh --roles | --plan | --stock | --accounts [--only WEB-ROLE-04,WEB-SUB-02] [--headed]

For each browser time zone and case: open /orders/create, click the pickup and return days, add a fresh test product,
pick a fresh test customer, create; then check the order page, Sửa đơn, the orders list row, /calendar (month cells and
day panel), /availability and /dashboard "Việc hôm nay" show the same Vietnam days. Hands the order over through the
API to check the return day, then cancels it (always, also on failure). Catalogue: tests/e2e/TEST_CASES.md (WEB-RT).

Needs: a running API and shop web, a MERCHANT account on that API, Chrome for Testing, and playwright-core
(cd tests && yarn install --frozen-lockfile).

Account suites (#727; each registers its own DEDICATED merchants with their own staff and kho, never the seeded ones):
  --roles    WEB-ROLE / WEB-DASH: menu, Tổng quan, orders, products, customers, categories, calendar, settings for merchant,
             staff and kho; control vs API; direct URLs of admin pages must not leak; merchant with no orders; custom range.
  --plan     WEB-SUB: expired (TRIAL, ACTIVE), cancelled, paused, past due, no subscription, plan without web access:
             message / retry cards / renew path for merchant, staff, kho in vi and en; PLAN_LIMIT_EXCEEDED on create product,
             customer, order, user, outlet; recovery after renewal. Changes subscription rows with psql.
  --stock    WEB-STOCK / WEB-CAL / WEB-TODO: stock after a sale and a rent order, picker and cart flags, order detail amounts,
             calendar cells and day panels, "việc cần làm" counters and lists vs GET /api/analytics/outlet-operations.
  --accounts all three, one after the other.   --only IDS  run only checks whose id starts with one of these prefixes.
  The result table is printed per suite (pass / fail / known / fixed?) and written to $WEB_E2E_OUT/web-{roles,plan,stock}-results.json.
  Needs E2E_DATABASE_URL (local 127.0.0.1/localhost only, the DB the API runs on) and WEB_E2E_CLIENT_URL pointing at a shop web
  that has its OWN .next folder (two `next dev` in the same apps/client overwrite each other's bundles and API URL).
  Run them with a visible browser: WEB_E2E_HEADED=1 (or --headed).

Env (defaults in brackets):
  WEB_E2E_API_URL      API base URL                               [http://localhost:3280]
  WEB_E2E_CLIENT_URL   shop web base URL (built with NEXT_PUBLIC_API_URL = the API above) [http://localhost:3293]
  WEB_E2E_EMAIL        MERCHANT account                           [agent3.merchant@example.com]
  WEB_E2E_PASSWORD     its password                               [merchant123]
  WEB_E2E_TZS          browser time zones, space separated        [Asia/Ho_Chi_Minh UTC America/Los_Angeles]
  WEB_E2E_CASES        only these case ids, comma separated       [all]
  WEB_E2E_OUT          screenshots of failures + web-rt-results.json [$TMPDIR/anyrent-web-e2e]
  WEB_E2E_CHROME       browser binary [~/Library/Caches/ms-playwright/chromium-1228/.../Google Chrome for Testing]
  PLAYWRIGHT_CORE_PATH playwright-core to load when tests/node_modules has none
  WEB_E2E_ALLOW_REMOTE=1 allow non-localhost URLs (never production: the run creates orders)

Exit 0 when every check passed or is a known bug; 1 when a check failed or a known bug looks fixed; 2 on a crash.
Login goes through POST /api/auth/login from Node with a random X-Forwarded-For (no shared rate-limit bucket); the
session is put into the browser's localStorage, so the account is logged out of other sessions.
EOF
}

SUITES=()
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --tz) shift; export WEB_E2E_TZS="${1:?--tz needs a value}" ;;
    --case) shift; export WEB_E2E_CASES="${1:?--case needs a value}" ;;
    --headed) export WEB_E2E_HEADED=1 ;;
    --show-bugs) export WEB_E2E_SHOW_BUGS=1 ;;
    --roles) SUITES+=(roles.web.js) ;;
    --plan) SUITES+=(plan.web.js) ;;
    --stock) SUITES+=(stock.web.js) ;;
    --accounts) SUITES+=(roles.web.js plan.web.js stock.web.js) ;;
    --only) shift; export WEB_E2E_ONLY="${1:?--only needs a value}" ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 64 ;;
  esac
  shift
done

API="${WEB_E2E_API_URL:-http://localhost:3280}"
CLIENT="${WEB_E2E_CLIENT_URL:-http://localhost:3293}"
curl -fsS -m 5 "$API/api/health" >/dev/null || { echo "API not reachable: $API/api/health" >&2; exit 1; }
curl -fsS -m 120 -o /dev/null "$CLIENT/login" || { echo "Shop web not reachable: $CLIENT/login" >&2; exit 1; }

cd "$ROOT/tests"
if [ "${#SUITES[@]}" -eq 0 ]; then
  exec node e2e/web/date-roundtrip.web.js
fi

# Account suites: they change subscription rows in SQL, so the database must be a local one
: "${E2E_DATABASE_URL:?E2E_DATABASE_URL is not set (postgresql://postgres@127.0.0.1:<port>/<db>, the database of the API above)}"
case "$E2E_DATABASE_URL" in
  postgresql://*@127.0.0.1[:/]*|postgresql://*@localhost[:/]*) ;;
  *) echo "E2E_DATABASE_URL must be on 127.0.0.1 or localhost" >&2; exit 64 ;;
esac
export WEB_E2E_API_URL="$API" WEB_E2E_CLIENT_URL="$CLIENT"
worst=0
for suite in "${SUITES[@]}"; do
  echo; echo "=== $suite ==="
  node "e2e/web/$suite" || { rc=$?; [ "$rc" -gt "$worst" ] && worst=$rc; }
done
exit "$worst"
