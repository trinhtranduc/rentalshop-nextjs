#!/usr/bin/env bash
# #1459 Gia hạn gói end to end: sets merchant1's plan period in the LOCAL e2e database before each step, then runs one
# iOS UI test method (POS ADBDUITests/PlanRenewalE2ETests) through ios-e2e.sh, or prints the state for an Android step.
# The API must run with REVENUECAT_WEBHOOK_SECRET set (api-local.sh inherits it): the tests post the RevenueCat webhook.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/env.sh"

usage() {
  cat <<'EOF'
Usage: scripts/mobile-e2e/plan-renewal-e2e.sh ios [step…] | state <active5|expired> | --help

ios       runs the iOS steps in order (default all): owner-renew (hosted: 5 days left, renew 12 months from Home; the
          days continue after the new period, A13), owner-buy-restore (expired → gate after login → buy Professional,
          then refund of that purchase → 403 gate → restore, one StoreKit session), owner-gate (real login),
          staff-retry. owner-purchases = owner-renew owner-buy-restore
android   boots $E2E_AVD with a window, builds debug against the local API, then: owner Home line → plan screen (no
          store key) → webhook → Thử lại; Settings row; 403 → expired screen → Thử lại; expired at launch; staff
          (NO_BUILD=1 skips the gradle build)
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
    \"storeBonusMs\" = NULL, \"lastStoreEventAt\" = NULL,
    \"cancelAtPeriodEnd\" = false, \"canceledAt\" = NULL, \"trialStart\" = NULL, \"trialEnd\" = NULL
    WHERE \"merchantId\" = $id"
  psql "$E2E_DATABASE_URL" -tAc "SELECT 'merchant ' || \"merchantId\" || ': plan ' || \"planId\" || ', ends ' || \"currentPeriodEnd\" FROM \"Subscription\" WHERE \"merchantId\" = $id"
}

run_ios() {
  local step="$1" method account fresh bundle cls skip=""
  case "$step" in
    # Hosted in the app (SKTestSession needs an XCTest process). A13: a refund of a purchase made with days left gives
    # those days back, so the expired steps start from the expired state; test 3 refunds test 2's purchase
    owner-renew) bundle="POS ADBDTests"; cls=PlanRenewalHostedE2ETests; method=test1OwnerRenews12MonthsFromHome; account=merchant; fresh=1; set_state active5 ;;
    # test 3 restores test 2's StoreKit purchase: both in one run (one StoreKit test session)
    owner-buy-restore) bundle="POS ADBDTests"; cls=PlanRenewalHostedE2ETests; method=""; skip=test1OwnerRenews12MonthsFromHome; account=merchant; fresh=1; set_state expired ;;
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
  [ -n "$skip" ] && args+=(--skip "$skip")
  [ "$fresh" = 1 ] && args+=(--fresh)
  "$(dirname "${BASH_SOURCE[0]}")/ios-e2e.sh" "${args[@]}"
}


# --- Android (#1459): no Play purchase (no RevenueCat key in these builds); screens and states with a simulated webhook ---
SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="$(command -v adb || echo "$SDK/platform-tools/adb")"
SERIAL="emulator-$E2E_AVD_PORT"
PKG="anyrent.shop"
UI="$(dirname "${BASH_SOURCE[0]}")/adb-ui.sh"
APK="$E2E_ROOT/apps/mobile-android/app/build/outputs/apk/debug/app-debug.apk"
AOUT="$E2E_OUT/android"

android_boot() {
  case "$E2E_AVD" in vm_pos|vm_kitchen) echo "REFUSED: $E2E_AVD belongs to the user." >&2; exit 1 ;; esac
  case "$E2E_AVD_PORT" in 5554|5556) echo "REFUSED: port $E2E_AVD_PORT" >&2; exit 1 ;; esac
  mkdir -p "$AOUT"
  if "$ADB" devices | grep -q "^$SERIAL[[:space:]]"; then return 0; fi
  if ! "$SDK/emulator/emulator" -list-avds | grep -qx "$E2E_AVD"; then
    echo no | "$SDK/cmdline-tools/latest/bin/avdmanager" create avd -n "$E2E_AVD" \
      -k "system-images;android-34;google_apis;arm64-v8a" -d pixel_6 >/dev/null
  fi
  # With a window (visible run): never -no-window
  # The first boot creates a 6 GB (sparse) data partition and refuses to start with less than ~7.2 GB free
  nohup "$SDK/emulator/emulator" -avd "$E2E_AVD" -port "$E2E_AVD_PORT" -no-snapshot-save -no-audio -no-boot-anim \
    >"$AOUT/emulator.log" 2>&1 &
  "$ADB" -s "$SERIAL" wait-for-device
  for _ in $(seq 1 240); do
    [ "$("$ADB" -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] && break
    sleep 1
  done
}

android_build() {
  export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
  (cd "$E2E_ROOT/apps/mobile-android" && ./gradlew --no-daemon --no-watch-fs :app:assembleDebug -PapiBaseUrl="http://10.0.2.2:$E2E_API_PORT")
}

android_launch() {
  local activity
  activity="$("$ADB" -s "$SERIAL" shell cmd package resolve-activity --brief -c android.intent.category.LAUNCHER "$PKG" | tail -1 | tr -d '\r')"
  "$ADB" -s "$SERIAL" shell am start -W -n "$activity" >/dev/null
}

android_fresh() {
  "$ADB" -s "$SERIAL" uninstall "$PKG" >/dev/null 2>&1 || true
  "$ADB" -s "$SERIAL" install -r -g "$APK" >/dev/null
  # The checks read the Vietnamese screens: the app runs in Vietnamese whatever the emulator's language
  "$ADB" -s "$SERIAL" shell cmd locale set-app-locales "$PKG" --locales vi-VN >/dev/null 2>&1 || true
  android_launch
}

android_login() { # android_login <email> <password>
  sleep 3
  if "$UI" wait "Bỏ qua" 10; then "$UI" tap "Bỏ qua" || true; elif "$UI" has "Skip"; then "$UI" tap "Skip" || true; fi
  "$UI" wait "~Email" 20 || { echo "MISS  login screen"; return 1; }
  "$UI" tap "Email" 2 2>/dev/null || "$UI" tap "~Email"
  sleep 1; "$UI" clear; "$UI" type "$1"; sleep 1; "$UI" back || true
  "$UI" tap "Mật khẩu" 2 2>/dev/null || "$UI" tap "~Mật khẩu"
  sleep 1; "$UI" clear; "$UI" type "$2"; sleep 1; "$UI" back || true
  "$UI" tap "Đăng nhập"
  sleep 6
}

post_webhook() { # post_webhook <type> <product id> <price> [extra json fields]
  local id now end body
  id="$(merchant_id)"
  now="$(python3 -c 'import time;print(int(time.time()*1000))')"
  end="$(python3 -c 'import time;print(int((time.time()+365*86400)*1000))')"
  body="{\"api_version\":\"1.0\",\"event\":{\"id\":\"android-$(uuidgen)\",\"type\":\"$1\",\"app_user_id\":\"merchant_$id\",\"product_id\":\"$2\",\"store\":\"PLAY_STORE\",\"environment\":\"PRODUCTION\",\"purchased_at_ms\":$now,\"expiration_at_ms\":$end,\"event_timestamp_ms\":$now,\"price_in_purchased_currency\":$3,\"currency\":\"VND\",\"transaction_id\":\"gpa-$(uuidgen | cut -c1-8)\"${4:-}}}"
  curl -fsS -m 15 -X POST "$(e2e_api_base_url)/api/webhooks/revenuecat" -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $REVENUECAT_WEBHOOK_SECRET" -d "$body"
  echo
}

FAILS=0
check() { # check <description> <command...>
  local what="$1"; shift
  if "$@"; then echo "PASS  $what"; else echo "FAIL  $what"; FAILS=$((FAILS + 1)); fi
}

run_android() {
  android_boot
  [ "${NO_BUILD:-0}" = 1 ] || android_build
  export E2E_OUT
  # A. owner, 5 days left: Home line → plan screen (no store key: purchase unavailable) → paid elsewhere → Thử lại
  set_state active5
  android_fresh
  android_login "$E2E_MERCHANT_EMAIL" "$E2E_MERCHANT_PASSWORD"
  check "A home shell" "$UI" wait "~Trang chủ" 30
  check "A home plan line" "$UI" wait "#home.planLine" 20
  "$UI" shot a-01-home-line >/dev/null
  "$UI" tap "#home.planLine"; sleep 3
  check "A plan screen says the purchase is unavailable" "$UI" wait "~Chưa mua được gói" 20
  "$UI" shot a-02-plan-no-store >/dev/null
  post_webhook RENEWAL anyrent_merchant_annual 1799000
  "$UI" tap "#plan.retry" 2>/dev/null || "$UI" tap "Thử lại"; sleep 4
  check "A auto-renewing state after the server got the payment" "$UI" wait "~Dùng đến" 20
  # A13: the 5 days left continue after the store period: "Dùng đến" = store day + 5. #1466: no auto-renew card
  local days
  days="$(psql "$E2E_DATABASE_URL" -tAc "SELECT to_char((\"currentPeriodEnd\" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY') || ' ' ||
    to_char(((\"currentPeriodEnd\" - make_interval(secs => COALESCE(\"storeBonusMs\", 0) / 1000)) AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY')
    FROM \"Subscription\" WHERE \"merchantId\" = $(merchant_id)")"
  echo "A13 access end / store charge: $days"
  check "A13 credit kept: access end differs from the store charge day" test "${days% *}" != "${days#* }"
  check "A13 status card: Dùng đến <access end>" "$UI" has "~Dùng đến ${days% *}"
  check "#1466 no auto-renew card" bash -c "! '$UI' has '~Tự gia hạn ngày'"
  check "#1466 Quản lý / huỷ gói in the footer" "$UI" has "~Quản lý / huỷ gói"
  "$UI" shot a-03-auto-renewing >/dev/null
  "$UI" back || true; sleep 1
  # Settings row (owner)
  "$UI" tap "Cài đặt" || true; sleep 3
  "$UI" swipe up || true
  check "A settings plan row" "$UI" wait "#settings.plan" 10
  "$UI" shot a-04-settings-row >/dev/null
  "$UI" tap "#settings.plan" && sleep 3 && "$UI" shot a-05-settings-opens-plan >/dev/null
  "$UI" back || true
  # B. the period ends while the app runs: the next call answers 403 → expired screen; paid elsewhere → Thử lại → Home
  set_state expired
  "$UI" tap "Đơn hàng" || true; sleep 4
  check "B expired screen on a 403" "$UI" wait "Gói của shop đã hết hạn" 25
  check "B Đăng xuất on the expired screen" "$UI" has "Đăng xuất"
  "$UI" shot b-01-expired-on-403 >/dev/null
  post_webhook RENEWAL anyrent_merchant_annual 1799000
  "$UI" tap "#plan.retry" 2>/dev/null || "$UI" tap "Thử lại"; sleep 5
  check "B Home after Thử lại" "$UI" wait "~Trang chủ" 25
  "$UI" shot b-02-home-after-retry >/dev/null
  # C. expired at launch (status read) for the owner
  set_state expired
  "$ADB" -s "$SERIAL" shell am force-stop "$PKG"; android_launch; sleep 6
  check "C expired screen at launch" "$UI" wait "Gói của shop đã hết hạn" 30
  "$UI" shot c-01-expired-at-launch >/dev/null
  # D. staff of an expired shop after login
  set_state expired
  android_fresh
  android_login "$E2E_STAFF_EMAIL" "$E2E_STAFF_PASSWORD"
  check "D staff expired screen" "$UI" wait "Nhờ chủ shop gia hạn." 30
  check "D staff has no buy button" bash -c "! '$UI' has '#plan.buy'"
  "$UI" shot d-01-expired-staff >/dev/null
  "$UI" tap "#plan.retry" 2>/dev/null || "$UI" tap "Thử lại"; sleep 3
  check "D still expired after Thử lại" "$UI" has "Nhờ chủ shop gia hạn."
  post_webhook RENEWAL anyrent_merchant_annual 1799000
  "$UI" tap "#plan.retry" 2>/dev/null || "$UI" tap "Thử lại"; sleep 5
  check "D staff Home once the owner paid" "$UI" wait "~Trang chủ" 25
  "$UI" shot d-02-staff-home >/dev/null
  echo "Android plan renewal: $FAILS failed check(s); screenshots in $AOUT"
  [ "$FAILS" = 0 ]
}

case "${1:-}" in
  -h|--help|"") usage ;;
  state) set_state "${2:?state active5|expired}" ;;
  ios)
    shift
    steps=()
    for s in "$@"; do
      if [ "$s" = owner-purchases ]; then steps+=(owner-renew owner-buy-restore); else steps+=("$s"); fi
    done
    [ ${#steps[@]} -eq 0 ] && steps=(owner-renew owner-buy-restore owner-gate staff-retry)
    status=0
    for s in "${steps[@]}"; do run_ios "$s" || status=1; done
    exit "$status"
    ;;
  android) run_android ;;
  *) usage >&2; exit 64 ;;
esac
