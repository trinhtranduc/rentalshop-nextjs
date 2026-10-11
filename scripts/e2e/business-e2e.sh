#!/usr/bin/env bash
# Business end-to-end suite (#498) on a LOCAL seeded database and a LOCAL API.
# Seeds (scripts/mobile-e2e/seed-local.sh), starts the API (scripts/mobile-e2e/api-local.sh) once per time zone,
# runs `yarn test:e2e` (tests/e2e) with the API and Jest under TZ=UTC and TZ=Asia/Ho_Chi_Minh, prints a summary
# and stops the API it started. Never points at dev-api, Railway or production.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Own defaults so we never share the mobile e2e database or port; both can be overridden.
export E2E_DATABASE_URL="${E2E_DATABASE_URL:-postgresql://postgres@127.0.0.1:54343/anyrent_business_e2e}"
export E2E_API_PORT="${E2E_API_PORT:-3190}"
# shellcheck source=../mobile-e2e/env.sh
. "$HERE/../mobile-e2e/env.sh"

usage() {
  cat <<'EOF'
Usage: scripts/e2e/business-e2e.sh [--no-seed] [--build] [--tz "UTC Asia/Ho_Chi_Minh"] [-- <jest args>]

  1. seed E2E_DATABASE_URL (default postgresql://postgres@127.0.0.1:54343/anyrent_business_e2e) with
     scripts/mobile-e2e/seed-local.sh (WIPES that local database; refuses non-local hosts)   skip: --no-seed
  2. for each time zone (default "UTC Asia/Ho_Chi_Minh"):
       TZ=<tz> scripts/mobile-e2e/api-local.sh start   (port E2E_API_PORT, default 3190; --build builds first)
       TZ=<tz> E2E_API_URL=http://localhost:<port> yarn --cwd tests test:e2e
       scripts/mobile-e2e/api-local.sh stop
     If an API already listens on the port it is reused (not restarted, its TZ is whatever it was started with).
  3. prints passed / failed / known-bug (test.failing) counts per time zone; exit 1 when any test failed.

Env: E2E_DATABASE_URL, E2E_API_PORT, E2E_API_DIR, E2E_OUT (see scripts/mobile-e2e/env.sh --help),
     BIZ_E2E_MERCHANT_EMAIL / BIZ_E2E_OTHER_MERCHANT_EMAIL / BIZ_E2E_STAFF_EMAIL (+ _PASSWORD) to change accounts,
     BIZ_E2E_SHOW_BUGS=1 to run known-bug cases as plain tests and see the real numbers.
Needs tests/node_modules (cd tests && yarn install --frozen-lockfile) and a built apps/api (--build or E2E_API_DIR).
EOF
}

SEED=1
BUILD=0
TZS="UTC Asia/Ho_Chi_Minh"
JEST_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --no-seed) SEED=0 ;;
    --build) BUILD=1 ;;
    --tz) shift; TZS="${1:?--tz needs a value}" ;;
    --) shift; JEST_ARGS=("$@"); break ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 64 ;;
  esac
  shift
done

e2e_require_local_db "$E2E_DATABASE_URL"
BASE="$(e2e_api_base_url)"
RUN_DIR="$E2E_OUT/business-e2e-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RUN_DIR"
[ -d "$E2E_ROOT/tests/node_modules" ] || { echo "Missing tests/node_modules: cd tests && yarn install --frozen-lockfile" >&2; exit 1; }

if [ "$SEED" = 1 ]; then
  echo "== Seeding $(e2e_mask_url "$E2E_DATABASE_URL")"
  "$E2E_ROOT/scripts/mobile-e2e/seed-local.sh" >"$RUN_DIR/seed.log" 2>&1 || { tail -30 "$RUN_DIR/seed.log" >&2; exit 1; }
  tail -14 "$RUN_DIR/seed.log"
fi

# The seed names accounts after row ids (merchant<id>@, staff.outlet<id>@), which grow on every reseed.
# Pick them from the database: main = merchant on an ACTIVE plan, other = another merchant,
# staff = OUTLET_STAFF of the main merchant's default outlet. Explicit BIZ_E2E_* values win.
q() { psql "$E2E_DATABASE_URL" -tAc "$1" | head -1; }
MAIN_MERCHANT_ID="$(q "SELECT s.\"merchantId\" FROM \"Subscription\" s WHERE s.status = 'ACTIVE' ORDER BY s.\"merchantId\" LIMIT 1")"
[ -n "$MAIN_MERCHANT_ID" ] || MAIN_MERCHANT_ID="$(q "SELECT \"merchantId\" FROM \"User\" WHERE role = 'MERCHANT' ORDER BY id DESC LIMIT 1")"
export BIZ_E2E_MERCHANT_EMAIL="${BIZ_E2E_MERCHANT_EMAIL:-$(q "SELECT email FROM \"User\" WHERE role = 'MERCHANT' AND \"merchantId\" = $MAIN_MERCHANT_ID ORDER BY id LIMIT 1")}"
export BIZ_E2E_OTHER_MERCHANT_EMAIL="${BIZ_E2E_OTHER_MERCHANT_EMAIL:-$(q "SELECT email FROM \"User\" WHERE role = 'MERCHANT' AND \"merchantId\" <> $MAIN_MERCHANT_ID ORDER BY id LIMIT 1")}"
export BIZ_E2E_STAFF_EMAIL="${BIZ_E2E_STAFF_EMAIL:-$(q "SELECT u.email FROM \"User\" u JOIN \"Outlet\" o ON o.id = u.\"outletId\" WHERE u.role = 'OUTLET_STAFF' AND o.\"merchantId\" = $MAIN_MERCHANT_ID ORDER BY o.\"isDefault\" DESC, o.id LIMIT 1")}"
# #682: Nhân viên kho of the same outlet as staff
export BIZ_E2E_INVENTORY_EMAIL="${BIZ_E2E_INVENTORY_EMAIL:-$(q "SELECT u.email FROM \"User\" u JOIN \"Outlet\" o ON o.id = u.\"outletId\" WHERE u.role = 'OUTLET_INVENTORY' AND o.\"merchantId\" = $MAIN_MERCHANT_ID ORDER BY o.\"isDefault\" DESC, o.id LIMIT 1")}"
echo "== Accounts: merchant $BIZ_E2E_MERCHANT_EMAIL, other merchant $BIZ_E2E_OTHER_MERCHANT_EMAIL, staff $BIZ_E2E_STAFF_EMAIL, inventory $BIZ_E2E_INVENTORY_EMAIL"

api_up() { curl -fsS -m 3 "$BASE/api/health" >/dev/null 2>&1; }

REUSED=0
if api_up; then
  REUSED=1
  echo "== Reusing the API already on $BASE (not restarted; its TZ is unchanged)"
fi

STARTED=0
cleanup() {
  if [ "$STARTED" = 1 ]; then "$E2E_ROOT/scripts/mobile-e2e/api-local.sh" stop >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

SUMMARY="$RUN_DIR/summary.txt"
: >"$SUMMARY"
STATUS=0
for tz in $TZS; do
  echo
  echo "== TZ=$tz"
  if [ "$REUSED" = 0 ]; then
    if [ "$BUILD" = 1 ]; then
      TZ="$tz" "$E2E_ROOT/scripts/mobile-e2e/api-local.sh" start --build
      BUILD=0
    else
      TZ="$tz" "$E2E_ROOT/scripts/mobile-e2e/api-local.sh" start
    fi
    STARTED=1
  fi
  slug="$(printf '%s' "$tz" | tr '/' '_')"
  json="$RUN_DIR/jest-$slug.json"
  set +e
  (
    cd "$E2E_ROOT/tests"
    TZ="$tz" E2E_API_URL="$BASE" BIZ_E2E_TOKENS_FILE="$RUN_DIR/tokens.json" \
      npx jest --config e2e/jest.config.js --runInBand --json --outputFile="$json" "${JEST_ARGS[@]+"${JEST_ARGS[@]}"}"
  ) 2>&1 | tee "$RUN_DIR/jest-$slug.log" | grep -E '^(PASS|FAIL) |✓|✕|●.*›|Tests:' || true
  set -e
  if [ -f "$json" ]; then
    node -e '
      const r = require(process.argv[1]);
      const all = r.testResults.flatMap((f) => f.assertionResults);
      const known = all.filter((t) => t.title.includes("[known bug") && t.status === "passed").length;
      const line = `TZ=${process.argv[2]}  suites ${r.numTotalTestSuites}  tests ${r.numTotalTests}  passed ${r.numPassedTests - known}  failed ${r.numFailedTests}  known-bug(failing) ${known}  skipped ${r.numPendingTests}`;
      console.log(line);
      process.exit(r.numFailedTests > 0 || !r.success ? 1 : 0);
    ' "$json" "$tz" >>"$SUMMARY" || STATUS=1
  else
    echo "TZ=$tz  no jest result (see $RUN_DIR/jest-$slug.log)" >>"$SUMMARY"
    STATUS=1
  fi
  if [ "$REUSED" = 0 ]; then
    "$E2E_ROOT/scripts/mobile-e2e/api-local.sh" stop
    STARTED=0
  fi
done

echo
echo "== Business e2e summary ($RUN_DIR)"
cat "$SUMMARY"
exit "$STATUS"
