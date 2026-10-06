#!/usr/bin/env bash
# Shop web e2e (#573): chosen rental days round trip in a real browser (tests/e2e/web/date-roundtrip.web.js).
# Runs against a LOCAL API and a LOCAL shop web (apps/client). Creates orders for the account and cancels them.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

usage() {
  cat <<'EOF'
Usage: scripts/e2e/web-e2e.sh [--tz "Asia/Ho_Chi_Minh UTC America/Los_Angeles"] [--case WEB-RT-01,...] [--headed] [--show-bugs]

For each browser time zone and case: open /orders/create, click the pickup and return days, add a fresh test product,
pick a fresh test customer, create; then check the order page, Sửa đơn, the orders list row, /calendar (month cells and
day panel), /availability and /dashboard "Việc hôm nay" show the same Vietnam days. Hands the order over through the
API to check the return day, then cancels it (always, also on failure). Catalogue: tests/e2e/TEST_CASES.md (WEB-RT).

Needs: a running API and shop web, a MERCHANT account on that API, Chrome for Testing, and playwright-core
(cd tests && yarn install --frozen-lockfile).

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

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --tz) shift; export WEB_E2E_TZS="${1:?--tz needs a value}" ;;
    --case) shift; export WEB_E2E_CASES="${1:?--case needs a value}" ;;
    --headed) export WEB_E2E_HEADED=1 ;;
    --show-bugs) export WEB_E2E_SHOW_BUGS=1 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 64 ;;
  esac
  shift
done

API="${WEB_E2E_API_URL:-http://localhost:3280}"
CLIENT="${WEB_E2E_CLIENT_URL:-http://localhost:3293}"
curl -fsS -m 5 "$API/api/health" >/dev/null || { echo "API not reachable: $API/api/health" >&2; exit 1; }
curl -fsS -m 120 -o /dev/null "$CLIENT/login" || { echo "Shop web not reachable: $CLIENT/login" >&2; exit 1; }

cd "$ROOT/tests"
exec node e2e/web/date-roundtrip.web.js
