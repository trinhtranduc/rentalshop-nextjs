#!/usr/bin/env bash
# MOB-SUB (#727): an account of a dedicated merchant from prepare-accounts.sh logs into the iOS app while the subscription is
# broken (expired-trial, expired-active, cancelled-ended, paused, past-due), then again after the subscription was fixed in
# the database. at-limit runs the plan-limit creates instead. Nothing may be created: row counts before == after.
#   tests/e2e/mobile/subscription-flow.sh <slug> <owner|staff|kho> [--lang vi|en]
# Needs the env of scripts/mobile-e2e (E2E_DATABASE_URL, E2E_API_PORT, E2E_SIMULATOR, ...) and a running API.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
. "$ROOT/scripts/mobile-e2e/env.sh"
SLUG="${1:?usage: subscription-flow.sh <slug> <owner|staff|kho> [--lang vi|en]}"; ROLE="${2:?role}"; shift 2
LANG_ARG=("$@")
PREP="$ROOT/scripts/mobile-e2e/prepare-accounts.sh"
e2e_require_local_db "$E2E_DATABASE_URL" >/dev/null
EMAIL="$SLUG.owner@e2e-sub.test"

counts() {
  psql "$E2E_DATABASE_URL" -qAt -F ' ' -c "SELECT
    (SELECT count(*) FROM \"Product\" WHERE \"merchantId\" = m.id),
    (SELECT count(*) FROM \"Customer\" WHERE \"merchantId\" = m.id),
    (SELECT count(*) FROM \"Order\" o JOIN \"Outlet\" t ON t.id = o.\"outletId\" WHERE t.\"merchantId\" = m.id),
    (SELECT count(*) FROM \"User\" WHERE \"merchantId\" = m.id),
    (SELECT count(*) FROM \"Outlet\" WHERE \"merchantId\" = m.id)
    FROM \"Merchant\" m WHERE m.email = '$EMAIL'"
}
run_ios() { "$ROOT/scripts/mobile-e2e/ios-e2e.sh" --scenario "$SLUG" --role "$ROLE" --only "$1" ${LANG_ARG[@]+"${LANG_ARG[@]}"}; }

"$PREP" break "$SLUG" >/dev/null 2>&1 || true
BEFORE="$(counts)"
echo "rows before (products customers orders users outlets): $BEFORE"
STATUS=0
if [ "$SLUG" = at-limit ]; then
  run_ios test10cPlanLimit || STATUS=1
else
  run_ios test10aSubscriptionBroken || STATUS=1
fi
AFTER="$(counts)"
echo "rows after: $AFTER"
if [ "$BEFORE" = "$AFTER" ]; then echo "PASS nothing was created"; else echo "FAIL rows changed: $BEFORE -> $AFTER"; STATUS=1; fi
if [ "$SLUG" != at-limit ]; then
  "$PREP" fix "$SLUG" >/dev/null
  run_ios test10bSubscriptionFixed || STATUS=1
  "$PREP" break "$SLUG" >/dev/null
fi
exit "$STATUS"
