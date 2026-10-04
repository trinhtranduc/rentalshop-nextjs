#!/usr/bin/env bash
# Run the committed iOS end-to-end UI test (POS ADBDUITests/AnyRentE2ETests) against the local API (#395).
set -euo pipefail
# shellcheck source=env.sh
. "$(dirname "${BASH_SOURCE[0]}")/env.sh"

usage() {
  cat <<'EOF'
Usage: scripts/mobile-e2e/ios-e2e.sh [--fresh] [--account merchant|staff] [--only <testMethod>] [--lang vi|en]

Builds the Development scheme and runs -only-testing:"POS ADBDUITests/AnyRentE2ETests" on $E2E_SIMULATOR
(default "iPhone 17 Pro Max") with API_BASE_URL=http://localhost:$E2E_API_PORT. Start the API first
(api-local.sh start).

  --fresh            uninstall the app (com.anyrent.debug) first: onboarding, notification prompt and
                     the 5-minute app-config cache start clean
  --account          merchant (default) or staff; credentials from env.sh
  --only <method>    run one test method, e.g. testCartRent
  --lang vi|en       app language for the run (xcodebuild -testLanguage); default: simulator setting

Credentials, flags and the output dir reach the UI test through TEST_RUNNER_* variables
(xcodebuild strips the prefix): E2E_EMAIL, E2E_PASSWORD, E2E_ROLE, E2E_FEATURES, E2E_OUT_DIR.
Screenshots: $E2E_OUT/ios/<account>/NN-feature-step.png. Derived data: $E2E_OUT/DerivedData (delete after).
Result bundle: $E2E_OUT/ios/<account>.xcresult. Exit code is xcodebuild's.
EOF
}

FRESH=0
ONLY=""
LANG_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --fresh) FRESH=1 ;;
    --account) E2E_ACCOUNT="${2:?--account needs merchant|staff}"; shift ;;
    --only) ONLY="${2:?--only needs a test method}"; shift ;;
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
e2e_account_credentials

MOBILE_DIR="$E2E_ROOT/apps/mobile"
BUNDLE_ID="com.anyrent.debug"
SHOT_DIR="$E2E_OUT/ios/$E2E_ACCOUNT"
RESULT="$E2E_OUT/ios/$E2E_ACCOUNT.xcresult"
LOG="$E2E_OUT/ios/$E2E_ACCOUNT-xcodebuild.log"
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

echo "Account: $E2E_EMAIL ($E2E_ACCOUNT)  API: $(e2e_api_base_url)  Features: $MOBILE_FEATURES"
echo "Running $TARGET (log: $LOG)"
set +e
(
  cd "$MOBILE_DIR"
  TEST_RUNNER_E2E_EMAIL="$E2E_EMAIL" \
  TEST_RUNNER_E2E_PASSWORD="$E2E_PASSWORD" \
  TEST_RUNNER_E2E_ROLE="$E2E_ACCOUNT" \
  TEST_RUNNER_E2E_FEATURES="$MOBILE_FEATURES" \
  TEST_RUNNER_E2E_OUT_DIR="$SHOT_DIR" \
  xcodebuild -workspace "POS ADBD.xcworkspace" -scheme Development \
    -destination "platform=iOS Simulator,id=$UDID" \
    -derivedDataPath "$E2E_OUT/DerivedData" \
    -resultBundlePath "$RESULT" \
    -only-testing:"$TARGET" \
    ${LANG_ARGS[@]+"${LANG_ARGS[@]}"} \
    API_BASE_URL="$(e2e_api_base_url)" \
    test >"$LOG" 2>&1
)
STATUS=$?
set -e

echo
echo "Results ($E2E_ACCOUNT):"
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
