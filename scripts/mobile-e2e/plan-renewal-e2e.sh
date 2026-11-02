#!/usr/bin/env bash
# #1459 Gia hạn gói end to end: sets merchant1's plan period in the LOCAL e2e database before each step, then runs one
# iOS UI test method (POS ADBDUITests/PlanRenewalE2ETests) through ios-e2e.sh, or prints the state for an Android step.
# The API must run with REVENUECAT_WEBHOOK_SECRET set (api-local.sh inherits it): the tests post the RevenueCat webhook.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/env.sh"

usage() {
  cat <<'EOF'
Usage: scripts/mobile-e2e/plan-renewal-e2e.sh ios [step…] | state <active5|expired> | --help

ios       runs the iOS steps in order (default all): owner-purchases (hosted: renew 12 months from Home, refund →
          gate after login → buy Professional, refund → 403 gate → restore), owner-gate (real login), staff-retry
state     only sets merchant1's subscription: active5 = Basic, 5 days left; expired = Basic, ended 2 days ago
Needs: E2E_DATABASE_URL on 127.0.0.1/localhost, the local API up (api-local.sh start) with REVENUECAT_WEBHOOK_SECRET,
psql. Screenshots: $E2E_OUT/ios/plan-*/.
EOF
}

case "$E2E_DATABASE_URL" in
  *@127.0.0.1*|*@localhost*|*//127.0.0.1*|*//localhost*) ;;
  *) echo "E2E_DATABASE_URL must be a local database (127.0.0.1 / localhost)" >&2; exit 1 ;;
esac
: "${REVENUECAT_WEBHOOK_SECRET:?export REVENUECAT_WEBHOOK_SECRET (the same value the local API runs with)}"

MERCHANT_EMAIL="${E2E_MERCHANT_EMAIL}"
merchant_id() {
  psql "$E2E_DATABASE_URL" -tAc "SELECT \"merchantId\" FROM \"User\" WHERE email = '$MERCHANT_EMAIL'"
}

set_state() {
  local id end
  id="$(merchant_id)"
  case "$1" in
    active5) end="now() + interval '5 days'" ;;
    expired) end="now() - interval '2 days'" ;;
    *) echo "state active5|expired" >&2; exit 64 ;;
  esac
  psql "$E2E_DATABASE_URL" -qc "UPDATE \"Subscription\" SET \"planId\" = (SELECT id FROM \"Plan\" WHERE name = 'Basic'),
    status = 'ACTIVE', \"currentPeriodStart\" = now() - interval '360 days', \"currentPeriodEnd\" = $end,
    \"autoRenew\" = false, \"billingChannel\" = NULL, \"storeProductId\" = NULL, \"billingIssueAt\" = NULL,
    \"cancelAtPeriodEnd\" = false, \"canceledAt\" = NULL, \"trialStart\" = NULL, \"trialEnd\" = NULL
    WHERE \"merchantId\" = $id"
  psql "$E2E_DATABASE_URL" -tAc "SELECT 'merchant ' || \"merchantId\" || ': plan ' || \"planId\" || ', ends ' || \"currentPeriodEnd\" FROM \"Subscription\" WHERE \"merchantId\" = $id"
}

run_ios() {
  local step="$1" method account fresh bundle cls
  case "$step" in
    # Hosted in the app (SKTestSession needs an XCTest process): renew, refund + gate after login + buy Professional,
    # refund + 403 gate + restore, in one run
    owner-purchases) bundle="POS ADBDTests"; cls=PlanRenewalHostedE2ETests; method=""; account=merchant; fresh=1; set_state active5 ;;
    owner-gate) bundle="POS ADBDUITests"; cls=PlanRenewalE2ETests; method=testOwnerGateAfterLogin; account=merchant; fresh=1; set_state expired ;;
    staff-retry) bundle="POS ADBDUITests"; cls=PlanRenewalE2ETests; method=testStaffExpiredRetries; account=staff; fresh=1; set_state expired ;;
    *) echo "unknown step $step" >&2; exit 64 ;;
  esac
  export E2E_TEST_BUNDLE="$bundle" E2E_TEST_CLASS="$cls"
  export TEST_RUNNER_E2E_RC_SECRET="$REVENUECAT_WEBHOOK_SECRET"
  export TEST_RUNNER_E2E_MERCHANT_ID="$(merchant_id)"
  export TEST_RUNNER_E2E_STOREKIT_PATH="$E2E_ROOT/apps/mobile/POS ADBD/Configuration/AnyRentSubscriptions.storekit"
  local args=(--account "$account" --label "plan-$step" --lang vi --no-stage)
  [ -n "$method" ] && args+=(--only "$method")
  [ "$fresh" = 1 ] && args+=(--fresh)
  "$(dirname "${BASH_SOURCE[0]}")/ios-e2e.sh" "${args[@]}"
}

case "${1:-}" in
  -h|--help|"") usage ;;
  state) set_state "${2:?state active5|expired}" ;;
  ios)
    shift
    steps=("$@")
    [ ${#steps[@]} -eq 0 ] && steps=(owner-purchases owner-gate staff-retry)
    status=0
    for s in "${steps[@]}"; do run_ios "$s" || status=1; done
    exit "$status"
    ;;
  *) usage >&2; exit 64 ;;
esac
