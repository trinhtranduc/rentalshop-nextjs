#!/usr/bin/env bash
# #1393: a new empty shop walks the first-run card on Android: product, customer in the cart, order, finish.
# The guard against the guide drifting when screens change (iOS: FirstRunGuideUITests). Needs a local API and a booted
# window-mode emulator ($E2E_AVD_PORT), with the debug APK built with -PapiBaseUrl. Exit code = number of misses.
# Usage: android-first-run-guide.sh [walk|skip]
set -uo pipefail
# shellcheck source=env.sh
. "$(dirname "${BASH_SOURCE[0]}")/env.sh"

SERIAL="emulator-$E2E_AVD_PORT"
PKG="anyrent.shop"
UI="$(dirname "${BASH_SOURCE[0]}")/adb-ui.sh"
APK="$E2E_ROOT/apps/mobile-android/app/build/outputs/apk/debug/app-debug.apk"
OUT="${E2E_OUT_SHOTS:-$E2E_OUT/android/first-run-guide}"
ADB_BIN="$(command -v adb || echo "${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb")"
mkdir -p "$OUT"
MISSES=0

ui() { "$UI" "$@"; }
adb_s() { "$ADB_BIN" -s "$SERIAL" "$@"; }
shot() { adb_s exec-out screencap -p >"$OUT/$1.png"; echo "shot  $1"; }
miss() { echo "MISS  $1"; MISSES=$((MISSES + 1)); shot "miss-$MISSES"; }
need() { # need <what> <selector> [seconds]
  ui wait "$2" "${3:-15}" >/dev/null || miss "$1 ($2)"
}
tap() { ui tap "$1" >/dev/null || miss "tap $1"; sleep 1; }
first_of() { local s; for s in "$@"; do if ui has "$s"; then ui tap "$s" >/dev/null; return 0; fi; done; return 1; }
field() { # field <vi label> <en label> <text>: the field's content-desc is its label; the label text above it matches too
  ui tap "$1" 2 >/dev/null 2>&1 || ui tap "$2" 2 >/dev/null 2>&1 || ui tap "$1" >/dev/null 2>&1 || ui tap "$2" >/dev/null 2>&1 || miss "field $1"
  sleep 1
  ui type "$3"
  sleep 1
}
hide_keyboard() { # back only with a keyboard up: a second back would close the form
  if adb_s shell dumpsys input_method | grep -q "mInputShown=true"; then ui back; fi
}

eval "$("$(dirname "${BASH_SOURCE[0]}")/new-empty-shop.sh")"
echo "New shop: $E2E_EMAIL"
adb_s uninstall "$PKG" >/dev/null 2>&1 || true
adb_s install -r -g "$APK" >/dev/null
activity="$(adb_s shell cmd package resolve-activity --brief -c android.intent.category.LAUNCHER "$PKG" | tail -1 | tr -d '\r')"
adb_s shell am start -W -n "$activity" >/dev/null
sleep 3

# Login, then the intro pages. The card has its own Bỏ qua, so the intro is left before the card can show.
ui wait "~Email" 25 >/dev/null || miss "login screen"
ui tap "Email" 2 >/dev/null 2>&1 || ui tap "~Email" >/dev/null
sleep 1; ui type "$E2E_EMAIL"; sleep 1; hide_keyboard
ui tap "Mật khẩu" 2 >/dev/null 2>&1 || ui tap "Password" 2 >/dev/null 2>&1 || ui tap "~Password" >/dev/null 2>&1 || ui tap "~Mật khẩu" >/dev/null
sleep 1; ui type "$E2E_PASSWORD"; sleep 1; hide_keyboard
first_of "Đăng nhập" "Sign in" "Log in" >/dev/null || miss "login button"
for _ in $(seq 1 25); do
  if ui has "#guide.count"; then break; fi
  if first_of "Bỏ qua" "Skip" >/dev/null; then sleep 2; fi
  sleep 1
done

need "card on a new shop" "0/3" 20
shot guide-01-home-new-shop

# skip: Bỏ qua, then back through Cài đặt › Hướng dẫn bắt đầu
if [ "${1:-walk}" = skip ]; then
  tap "#guide.dismiss"
  sleep 1
  shot guide-skip-01-home
  if ui has "#guide.card"; then miss "Bỏ qua should hide the card"; fi
  first_of "Cài đặt" "Settings" >/dev/null || miss "settings tab"
  sleep 2
  for _ in 1 2 3 4; do ui has "#settings.firstRunGuide" && break; ui swipe up; done
  shot guide-skip-02-settings
  tap "#settings.firstRunGuide"
  need "card in a sheet" "#guide.card"
  shot guide-skip-03-sheet
  tap "#guide.row.product"
  need "the row runs the step on Home" "#product.form.name" 20
  shot guide-skip-04-form
  ui back
  sleep 2
  need "card back on Home" "0/3" 20
  shot guide-skip-05-card-back
  echo "misses: $MISSES"
  exit "$MISSES"
fi

# 1. Product
tap "#guide.row.product"
need "product form" "#product.form.name"
shot guide-02-product-form
tap "#product.form.name"
ui type "Ao%scuoi%sren"
sleep 1
hide_keyboard
ui has "#product.form.perRental" || { ui swipe up; sleep 1; }
tap "#product.form.perRental"
ui type "1200000"
sleep 1
shot guide-03-product-filled
hide_keyboard
first_of "Lưu sản phẩm" "Save product" >/dev/null || miss "save product"
need "one step done" "1/3" 20
shot guide-04-home-one-done

# 2. Customer, inside the cart
tap "#guide.row.customer"
need "cart opens" "#cart.more"
shot guide-05-cart
tap "#cart.customerRow"
need "picker" "#customers.picker.new"
tap "#customers.picker.new"
need "new customer form" "#customers.new.phone"
tap "#customers.new.phone"
ui type "09$(date +%s | tail -c 9)"
sleep 1
tap "#customers.new.name"
ui type "Lan%sAnh"
sleep 1
shot guide-06-new-customer
hide_keyboard
first_of "Lưu và chọn" "Save and select" >/dev/null || miss "save and select"
need "customer in the cart" "~Lan Anh" 20
shot guide-07-cart-customer

# 3. Order
tap "#cart.datesRow"
sleep 2
shot guide-08-dates
first_of "Xác nhận" "Confirm" "Xong" "Done" >/dev/null || miss "confirm dates"
sleep 2
shot guide-09-cart-dates
tap "#cart.cta"
sleep 2
shot guide-10-confirm
# The confirm sheet's button has the same label as the cart's: the sheet is on top, so the last match
first_of "Tạo đơn" "Create order" >/dev/null || miss "create order"
need "order created" "~#" 20
shot guide-11-created
first_of "Tạo đơn mới" "New order" >/dev/null || miss "new order"
sleep 2
if ui has "#cart.more"; then ui back; fi # "Tạo đơn mới" may already have closed the cart
sleep 3

# Finish, once
need "finish card" "#guide.finish.close" 20
shot guide-12-finish
tap "#guide.finish.close"
sleep 2
if ui has "#guide.finish"; then miss "finish card still there"; fi
if ui has "#guide.card"; then miss "card back after finish"; fi
shot guide-13-home-after-finish

echo "misses: $MISSES"
exit "$MISSES"
