#!/usr/bin/env bash
# Boot a dedicated AVD, build the debug app against the local API, install it and walk the main flows (#395).
set -euo pipefail
# shellcheck source=env.sh
. "$(dirname "${BASH_SOURCE[0]}")/env.sh"

usage() {
  cat <<'EOF'
Usage: scripts/mobile-e2e/android-e2e.sh [--fresh] [--no-build] [--account merchant|staff] [--dry-run]

  1. refuses vm_pos / vm_kitchen and ports 5554 / 5556
  2. boots $E2E_AVD on port $E2E_AVD_PORT (-no-snapshot-save -no-audio -no-boot-anim) unless it is running
  3. ./gradlew :app:assembleDebug -PapiBaseUrl=http://10.0.2.2:$E2E_API_PORT   (skip with --no-build)
  4. installs (--fresh: uninstall first, clears login, onboarding and the app-config cache) and launches anyrent.shop
  5. runs the scenario through adb-ui.sh; screenshots go to $E2E_OUT/android/NN-feature-step.png

--dry-run prints the commands without touching any device or building.
The scenario is best effort: a missing control is logged as "MISS" and the run goes on. Review every screenshot.
Stop the emulator afterwards: adb -s emulator-$E2E_AVD_PORT emu kill
EOF
}

FRESH=0 BUILD=1 DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --fresh) FRESH=1 ;;
    --no-build) BUILD=0 ;;
    --dry-run) DRY=1 ;;
    --account) E2E_ACCOUNT="${2:?--account needs merchant|staff}"; shift ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 64 ;;
  esac
  shift
done
e2e_account_credentials

case "$E2E_AVD" in
  vm_pos|vm_kitchen) echo "REFUSED: $E2E_AVD belongs to the user." >&2; exit 1 ;;
esac
case "$E2E_AVD_PORT" in
  5554|5556) echo "REFUSED: port $E2E_AVD_PORT belongs to vm_pos / vm_kitchen." >&2; exit 1 ;;
esac

SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB_BIN="$(command -v adb || echo "$SDK/platform-tools/adb")"
EMULATOR="$SDK/emulator/emulator"
SERIAL="emulator-$E2E_AVD_PORT"
PKG="anyrent.shop"
APP_DIR="$E2E_ROOT/apps/mobile-android"
APK="$APP_DIR/app/build/outputs/apk/debug/app-debug.apk"
API_URL="http://10.0.2.2:$E2E_API_PORT"
UI="$(dirname "${BASH_SOURCE[0]}")/adb-ui.sh"
OUT_DIR="$E2E_OUT/android"

run() { if [ "$DRY" = 1 ]; then printf 'DRY: %s\n' "$*" >&2; else "$@"; fi; }
adb_s() { run "$ADB_BIN" -s "$SERIAL" "$@"; }
ui() { if [ "$DRY" = 1 ]; then printf 'DRY: adb-ui.sh %s\n' "$*" >&2; else "$UI" "$@"; fi; }

# --- 1. emulator ---------------------------------------------------------------------------------
if [ "$DRY" = 0 ] && "$ADB_BIN" devices | grep -q "^$SERIAL[[:space:]]"; then
  echo "Emulator $SERIAL already running"
else
  echo "Booting $E2E_AVD on port $E2E_AVD_PORT"
  mkdir -p "$OUT_DIR"
  if [ "$DRY" = 1 ]; then
    printf 'DRY: %s -avd %s -port %s -no-snapshot-save -no-audio -no-boot-anim\n' "$EMULATOR" "$E2E_AVD" "$E2E_AVD_PORT"
  else
    nohup "$EMULATOR" -avd "$E2E_AVD" -port "$E2E_AVD_PORT" -no-snapshot-save -no-audio -no-boot-anim \
      >"$OUT_DIR/emulator.log" 2>&1 &
    "$ADB_BIN" -s "$SERIAL" wait-for-device
    for _ in $(seq 1 180); do
      [ "$("$ADB_BIN" -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] && break
      sleep 1
    done
  fi
fi

# --- 2. build + install --------------------------------------------------------------------------
if [ "$BUILD" = 1 ]; then
  export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
  echo "Building debug with API $API_URL"
  (cd "$APP_DIR" && run ./gradlew :app:assembleDebug -PapiBaseUrl="$API_URL")
fi
if [ "$FRESH" = 1 ]; then adb_s uninstall "$PKG" >/dev/null 2>&1 || true; fi
adb_s install -r -g "$APK"   # -g grants runtime permissions (no notification prompt)
adb_s shell am force-stop "$PKG"
adb_s shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null

# --- 3. scenario ---------------------------------------------------------------------------------
MISSES=0
step() { # step <shot-name> [action...]: run one action (first_of / ui ...), never abort, then screenshot
  local name="$1"; shift
  if [ $# -gt 0 ] && ! "$@"; then
    echo "MISS  $name: $*"; MISSES=$((MISSES + 1))
  fi
  ui shot "$name" >/dev/null
}
first_of() { # tap the first selector that is on screen
  local s
  for s in "$@"; do if ui has "$s"; then ui tap "$s"; return 0; fi; done
  return 1
}

mkdir -p "$OUT_DIR"
sleep 3
step 00-launch
# Login (fields have no content-desc: tap the placeholder, then type).
if ui wait "Nhập email" 10 || ui has "Enter your email"; then
  first_of "Nhập email" "Enter your email" || true
  ui type "$E2E_EMAIL"
  first_of "Nhập mật khẩu" "Enter password" || true
  ui type "$E2E_PASSWORD"
  ui back || true                          # hide the keyboard
  first_of "Đăng nhập" "Log in" || echo "MISS  login button"
  step 01-login-submitted
fi
# Onboarding comes after the first login.
if ui wait "Bỏ qua" 8 || ui has "Skip"; then
  step 02-onboarding
  first_of "Bỏ qua" "Skip" || true
fi
# Relaunch once so the app-config flags apply.
sleep 3
adb_s shell am force-stop "$PKG"
adb_s shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
ui wait "~Trang chủ" 20 || ui wait "Home" 2 || echo "MISS  main shell"

# 1. Home / products
step 10-home-list
if first_of "Tên, mã vạch…" "Name, barcode…"; then
  ui type "a"; adb_s shell input keyevent 66 >/dev/null
  step 11-home-search
  ui back || true
fi
step 12-home-detail first_of "~₫"
if [ "$E2E_ACCOUNT" = staff ]; then
  if ui has "Sửa" || ui has "Edit"; then echo "FAIL  staff sees Edit on product detail"; MISSES=$((MISSES + 1)); fi
fi
step 13-home-add-to-cart first_of "Thêm vào giỏ" "Add to cart"
ui back || true
# 2. Cart (opens from the cart bar; creating the order needs dates and a customer: done by hand, see the skill)
step 20-cart first_of "~Giỏ hàng ·" "~Cart ·"
ui back || true
# 3. Orders
first_of "Đơn hàng" "Orders" || echo "MISS  orders tab"
step 30-orders-todo
step 31-orders-all first_of "Tất cả đơn" "All orders"
step 32-orders-filter first_of "Bộ lọc đơn hàng" "Order Filter"
ui back || true
step 33-orders-sale first_of "Đơn bán" "Sale"
step 34-order-detail first_of "~#ORD-"
ui back || true
# 4. Calendar
first_of "Lịch" "Calendar" || echo "MISS  calendar tab"
step 40-calendar
# 5. Overview
first_of "Tổng quan" "Overview" || echo "MISS  overview tab"
step 50-overview
step 51-overview-period first_of "~Khoảng thời gian:" "~Period:"
ui back || true
# 6. Settings + logout
first_of "Cài đặt" "Settings" || echo "MISS  settings tab"
step 60-settings
ui swipe up || true; ui swipe up || true
step 61-logout-confirm first_of "Đăng xuất" "Log out"
# The dialog repeats the title: the confirm button is the second match.
ui tap "Đăng xuất" 2 || ui tap "Log out" 2 || echo "MISS  logout confirm"
step 62-logged-out

echo
echo "Android scenario done. Misses: $MISSES. Screenshots: $OUT_DIR"
