#!/usr/bin/env bash
# Admin dashboard tile clicks (#1190). Visible Chrome. Local API + admin web only.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

usage() {
  cat <<'EOF'
Usage: scripts/e2e/admin-e2e.sh [--headed]

Clicks In use / Basic / Pro / Enterprise / Trial / Expiring / Expired / Cancelled
on the admin dashboard and checks the merchant list (URL, API total, every row).

Env (defaults in brackets):
  WEB_E2E_API_URL          API                                         [http://localhost:3280]
  WEB_E2E_ADMIN_URL        admin web                                   [http://localhost:3301]
  WEB_E2E_ADMIN_EMAIL      ADMIN account                               [admin@rentalshop.com]
  WEB_E2E_ADMIN_PASSWORD   password                                    [admin123]
  WEB_E2E_HEADED           1 = visible Chrome (default). 0 = headless
  WEB_E2E_CHROME           Chrome for Testing binary
  WEB_E2E_OUT              screenshots + json                          [$TMPDIR/anyrent-admin-e2e]
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --headed) export WEB_E2E_HEADED=1 ;;
    --headless) export WEB_E2E_HEADED=0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 64 ;;
  esac
  shift
done

API="${WEB_E2E_API_URL:-http://localhost:3280}"
ADMIN="${WEB_E2E_ADMIN_URL:-http://localhost:3301}"
curl -fsS -m 5 "$API/api/health" >/dev/null || { echo "API not reachable: $API/api/health" >&2; exit 1; }
curl -fsS -m 120 -o /dev/null "$ADMIN/login" || { echo "Admin web not reachable: $ADMIN/login" >&2; exit 1; }

export WEB_E2E_HEADED="${WEB_E2E_HEADED:-1}"
export WEB_E2E_API_URL="$API" WEB_E2E_ADMIN_URL="$ADMIN"
cd "$ROOT/tests"
exec node e2e/web/admin-dashboard-stats.web.js
