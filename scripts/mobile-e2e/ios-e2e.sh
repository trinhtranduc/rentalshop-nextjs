#!/usr/bin/env bash
# Run the committed iOS end-to-end UI test (POS ADBDUITests/AnyRentE2ETests) against the local API (#395).
set -euo pipefail
# shellcheck source=env.sh
. "$(dirname "${BASH_SOURCE[0]}")/env.sh"

usage() {
  cat <<'EOF'
Usage: scripts/mobile-e2e/ios-e2e.sh [--fresh] [--account merchant|staff|inventory] [--only <testMethod>] [--lang vi|en]
       scripts/mobile-e2e/ios-e2e.sh --scenario <slug> --role owner|staff|kho [--only <testMethod>] [--lang vi|en]
       scripts/mobile-e2e/ios-e2e.sh --email <e> --password <p> --role merchant|staff|inventory [--label <dir>]

Builds the Development scheme and runs -only-testing:"POS ADBDUITests/AnyRentE2ETests" on $E2E_SIMULATOR
(default "iPhone 17 Pro Max") with API_BASE_URL=http://localhost:$E2E_API_PORT. Start the API first
(api-local.sh start).

  --fresh            uninstall the app (com.anyrent.debug) first: onboarding, notification prompt and
                     the 5-minute app-config cache start clean
  --account          merchant (default), staff or inventory (Nhân viên kho, #682); credentials from env.sh
  --only <method>    run one test method, e.g. testCartRent
  --scenario <slug>  log in as <slug>.<role>@e2e-sub.test (an account made by prepare-accounts.sh: expired-trial,
                     expired-active, cancelled-ended, paused, past-due, at-limit, healthy); --role owner|staff|kho
                     (default owner). The UI test gets E2E_SCENARIO and runs the test10* subscription flows.
  --email/--password log in as any account; --role says what the account is (merchant|staff|inventory), --label names
                     the screenshot dir (default: the email's local part)
  --lang vi|en       app language for the run (xcodebuild -testLanguage); default: simulator setting

Credentials, flags and the output dir reach the UI test through TEST_RUNNER_* variables
(xcodebuild strips the prefix): E2E_EMAIL, E2E_PASSWORD, E2E_ROLE, E2E_FEATURES, E2E_OUT_DIR.
Screenshots: $E2E_OUT/ios/<account>/NN-feature-step.png. Derived data: $E2E_DERIVED_DATA (default
$E2E_OUT/DerivedData; delete after). Under /tmp the bridging-header PCH can fail: then set
E2E_DERIVED_DATA=~/Library/Developer/Xcode/DerivedData/<your-name>.
Result bundle: $E2E_OUT/ios/<account>.xcresult. Exit code is xcodebuild's.
EOF
}

FRESH=0
ONLY=""
SCENARIO=""; ROLE_ARG=""; ARG_EMAIL=""; ARG_PASSWORD=""; LABEL=""
LANG_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --fresh) FRESH=1 ;;
    --account) E2E_ACCOUNT="${2:?--account needs merchant|staff|inventory}"; shift ;;
    --only) ONLY="${2:?--only needs a test method}"; shift ;;
    --scenario) SCENARIO="${2:?--scenario needs a slug}"; shift ;;
    --role) ROLE_ARG="${2:?--role needs a role}"; shift ;;
    --email) ARG_EMAIL="${2:?--email needs a value}"; shift ;;
    --password) ARG_PASSWORD="${2:?--password needs a value}"; shift ;;
    --label) LABEL="${2:?--label needs a value}"; shift ;;
    --lang)
      case "${2:-}" in
        vi) LANG_ARGS=(-testLanguage vi -testRegion VN) ;;
        en) LANG_ARGS=(-testLanguage en -testRegion US) ;;
        *) echo "--lang vi|en" >&2; exit 64 ;;
      esac
      shift ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 64 ;;
  esac
  shift
done
if [ -n "$SCENARIO" ]; then
  # accounts from prepare-accounts.sh: <slug>.<owner|staff|kho>@e2e-sub.test
  case "${ROLE_ARG:-owner}" in
    owner) ARG_PASSWORD="${ARG_PASSWORD:-merchant123}"; E2E_ACCOUNT=merchant ;;
    staff) ARG_PASSWORD="${ARG_PASSWORD:-staff123}"; E2E_ACCOUNT=staff ;;
    kho) ARG_PASSWORD="${ARG_PASSWORD:-inventory123}"; E2E_ACCOUNT=inventory ;;
    *) echo "--role owner|staff|kho with --scenario" >&2; exit 64 ;;
  esac
  ARG_EMAIL="$SCENARIO.${ROLE_ARG:-owner}@e2e-sub.test"
  LABEL="${LABEL:-sub-$SCENARIO-${ROLE_ARG:-owner}}"
fi
if [ -n "$ARG_EMAIL" ]; then
  [ -n "$ARG_PASSWORD" ] || { echo "--email needs --password" >&2; exit 64; }
  case "${ROLE_ARG:-}" in merchant|staff|inventory) E2E_ACCOUNT="$ROLE_ARG" ;; esac
  E2E_EMAIL="$ARG_EMAIL"; E2E_PASSWORD="$ARG_PASSWORD"; export E2E_EMAIL E2E_PASSWORD
  LABEL="${LABEL:-${ARG_EMAIL%%@*}}"
else
  e2e_account_credentials
  LABEL="${LABEL:-$E2E_ACCOUNT}"
fi

MOBILE_DIR="$E2E_ROOT/apps/mobile"
BUNDLE_ID="com.anyrent.debug"
SHOT_DIR="$E2E_OUT/ios/$LABEL"
RESULT="$E2E_OUT/ios/$LABEL.xcresult"
DERIVED="${E2E_DERIVED_DATA:-$E2E_OUT/DerivedData}"
LOG="$E2E_OUT/ios/$LABEL-xcodebuild.log"
mkdir -p "$SHOT_DIR"
rm -rf "$RESULT"

# Exact-name match: "iPhone 17 Pro" must not pick "iPhone 17 Pro Max".
UDID="$(xcrun simctl list devices available -j | python3 -c '
import json, sys
name = sys.argv[1]
for runtime, devs in json.load(sys.stdin)["devices"].items():
    for d in devs:
        if d["name"] == name and d.get("isAvailable", True):
            print(d["udid"]); sys.exit(0)
sys.exit(1)' "$E2E_SIMULATOR")" || { echo "No available simulator named '$E2E_SIMULATOR'." >&2; exit 1; }
echo "Simulator: $E2E_SIMULATOR ($UDID)"

if ! curl -fsS -m 3 "$(e2e_api_base_url)/api/health" >/dev/null 2>&1; then
  echo "API not reachable at $(e2e_api_base_url). Run scripts/mobile-e2e/api-local.sh start first." >&2
  exit 1
fi

xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null
if [ "$FRESH" = 1 ]; then
  echo "Uninstalling $BUNDLE_ID"
  xcrun simctl uninstall "$UDID" "$BUNDLE_ID" 2>/dev/null || true
fi

[ -d "$MOBILE_DIR/Pods" ] || (cd "$MOBILE_DIR" && pod install)

TARGET="POS ADBDUITests/AnyRentE2ETests"
[ -n "$ONLY" ] && TARGET="$TARGET/$ONLY"

echo "Account: $E2E_EMAIL ($E2E_ACCOUNT, label $LABEL)  API: $(e2e_api_base_url)  Features: $MOBILE_FEATURES"
echo "Running $TARGET (log: $LOG)"
set +e
(
  cd "$MOBILE_DIR"
  # No bridging-header PCH: with derived data under /tmp (a /private/tmp symlink) the importer looks it up
  # under the other path and fails with "PCH file … not found".
  TEST_RUNNER_E2E_EMAIL="$E2E_EMAIL" \
  TEST_RUNNER_E2E_PASSWORD="$E2E_PASSWORD" \
  TEST_RUNNER_E2E_ROLE="$E2E_ACCOUNT" \
  TEST_RUNNER_E2E_SCENARIO="$SCENARIO" \
  TEST_RUNNER_E2E_SCENARIO_ROLE="${ROLE_ARG:-owner}" \
  TEST_RUNNER_E2E_FEATURES="$MOBILE_FEATURES" \
  TEST_RUNNER_E2E_OUT_DIR="$SHOT_DIR" \
  xcodebuild -workspace "POS ADBD.xcworkspace" -scheme Development \
    -destination "platform=iOS Simulator,id=$UDID" \
    -derivedDataPath "$DERIVED" \
    -resultBundlePath "$RESULT" \
    -only-testing:"$TARGET" \
    ${LANG_ARGS[@]+"${LANG_ARGS[@]}"} \
    API_BASE_URL="$(e2e_api_base_url)" \
    SWIFT_PRECOMPILE_BRIDGING_HEADER=NO \
    test >"$LOG" 2>&1
)
STATUS=$?
set -e

echo
echo "Results ($LABEL):"
grep -E "^Test Case '-\[POS_ADBDUITests\.AnyRentE2ETests test[A-Za-z0-9_]+\]' (passed|failed|skipped)" "$LOG" \
  | sed -E "s/^Test Case '-\[POS_ADBDUITests\.AnyRentE2ETests (test[A-Za-z0-9_]+)\]' ([a-z]+) \(([0-9.]+) seconds\)\./  \2  \1  (\3 s)/" || true
echo "  passed: $(grep -cE "^Test Case .*AnyRentE2ETests.*' passed" "$LOG" || true)" \
  " failed: $(grep -cE "^Test Case .*AnyRentE2ETests.*' failed" "$LOG" || true)" \
  " skipped: $(grep -cE "^Test Case .*AnyRentE2ETests.*' skipped" "$LOG" || true)"
FAILS="$(grep -E "error: -\[POS_ADBDUITests\.AnyRentE2ETests" "$LOG" || true)"
if [ -n "$FAILS" ]; then
  echo "Failures:"
  printf '%s\n' "$FAILS" | sed -E 's#^.*/AnyRentE2ETests\.swift:#  line #' | head -40
fi
if ! grep -q "^Test Case" "$LOG"; then
  echo "No tests ran. Last log lines:"
  tail -25 "$LOG"
fi
echo "Screenshots: $SHOT_DIR ($(find "$SHOT_DIR" -name '*.png' | wc -l | tr -d ' ') png)"
echo "Result bundle: $RESULT"
exit "$STATUS"
