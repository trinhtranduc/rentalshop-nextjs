#!/usr/bin/env bash
# #1393, #1394, #1410: a new empty shop walks the whole first-run guide on Android: product, customer in the cart, order, finish.
# The main guard against bubbles drifting when screens change (iOS: FirstRunGuideUITests). Needs a local API and a booted
# window-mode emulator ($E2E_AVD_PORT), with the debug APK built with -PapiBaseUrl. Exit code = number of misses.
# Usage: android-first-run-guide.sh [walk|later|hide]
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

# Login, then the intro pages.
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

if ui has "#guide.bubble.skip"; then miss "no bubble before a row is tapped"; fi

# later: Để sau collapses, the slim row stays after a restart and reopens the card (#1410)
if [ "${1:-walk}" = later ]; then
  if ui has "#guide.dismiss" || ui has "Bỏ qua" || ui has "Skip"; then miss "Bỏ qua left the card"; fi
  need "the blue button" "#guide.cta"
  shot guide-card-01-new
  tap "#guide.later"
  need "slim row" "#guide.slim"
  if ui has "#guide.cta"; then miss "Để sau should collapse the card"; fi
  shot guide-card-02-slim
  adb_s shell am force-stop "$PKG"
  adb_s shell am start -W -n "$activity" >/dev/null
  need "slim row after a restart" "#guide.slim" 25
  tap "#guide.slim"
  need "the card is back" "#guide.cta"
  shot guide-card-03-back
  echo "misses: $MISSES"
  exit "$MISSES"
fi

# hide: only from Cài đặt, with its confirm; the row brings the guide back (#1410)
if [ "${1:-walk}" = hide ]; then
  tap "#guide.later"
  need "slim row" "#guide.slim"
  first_of "Cài đặt" "Settings" >/dev/null || miss "settings tab"
  sleep 2
  for _ in 1 2 3 4; do ui has "#settings.firstRunGuide" && break; ui swipe up; done
  tap "#settings.firstRunGuide"
  need "card in a sheet" "#guide.card"
  shot guide-hide-01-sheet
  tap "#guide.hide"
  sleep 1
  shot guide-hide-02-confirm
  first_of "Ẩn" "Hide" >/dev/null || miss "confirm hide"
  sleep 2
  first_of "Trang chủ" "Home" >/dev/null || miss "home tab"
  sleep 2
  if ui has "#guide.slim" || ui has "#guide.card"; then miss "hidden: no slim row, no card"; fi
  shot guide-hide-03-home
  first_of "Cài đặt" "Settings" >/dev/null || miss "settings tab"
  sleep 2
  for _ in 1 2 3 4; do ui has "#settings.firstRunGuide" && break; ui swipe up; done
  tap "#settings.firstRunGuide"
  need "card in a sheet" "#guide.card"
  if ui has "#guide.hide"; then miss "already hidden"; fi
  shot guide-hide-04-sheet-hidden
  tap "#guide.cta"
  need "the button runs the step on Home" "#product.form.name" 20
  ui back
  sleep 2
  need "card back on Home" "#guide.cta" 20
  shot guide-hide-05-card-back
  echo "misses: $MISSES"
  exit "$MISSES"
fi

# 1. Product
tap "#guide.cta"
need "bubble 1: product form" "#guide.bubble.product_name"
shot guide-02-bubble-product
# A tap on the dim closes the bubble and leaves the form usable
size="$(adb_s shell wm size | awk -F': ' '/Physical/{print $2}' | tr -d '\r')"
ui tap "@$(( ${size%x*} / 2 )),$(( ${size#*x} * 72 / 100 ))" >/dev/null
sleep 1
if ui has "#guide.bubble.product_name"; then miss "a tap on the dim should close the bubble"; fi
need "the form stays" "#product.form.name"
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
tap "#guide.cta"
need "cart opens" "#cart.more"
need "bubble 2: customer row" "#guide.bubble.cart_customer"
shot guide-05-bubble-cart-customer
tap "#cart.customerRow"
need "bubble 3: picker" "#guide.bubble.picker_new"
shot guide-06-bubble-picker
tap "#customers.picker.new"
need "bubble 4: new customer" "#guide.bubble.new_customer_fields"
shot guide-07-bubble-new-customer
tap "#customers.new.phone"
ui type "09$(date +%s | tail -c 9)"
sleep 1
tap "#customers.new.name"
ui type "Lan%sAnh"
sleep 1
if ui has "#guide.bubble.new_customer_fields"; then miss "the bubble should go once the field is tapped"; fi
shot guide-08-new-customer-filled
hide_keyboard
first_of "Lưu và chọn" "Save and select" >/dev/null || miss "save and select"
need "customer in the cart" "~Lan Anh" 20
need "bubble 5: dates" "#guide.bubble.cart_dates"
shot guide-09-bubble-dates

# 3. Order
tap "#cart.datesRow"
sleep 2
shot guide-10-dates
first_of "Xác nhận" "Confirm" "Xong" "Done" >/dev/null || miss "confirm dates"
need "bubble 6: create" "#guide.bubble.cart_create"
shot guide-11-bubble-create
tap "#cart.cta"
sleep 2
if ui has "#guide.bubble.cart_create"; then miss "the bubble should go with the tap"; fi
shot guide-12-confirm
# The confirm sheet's button has the same label as the cart's: the sheet is on top, so the last match
first_of "Tạo đơn" "Create order" >/dev/null || miss "create order"
need "order created" "~#" 20
shot guide-13-created
first_of "Tạo đơn mới" "New order" >/dev/null || miss "new order"
sleep 2
if ui has "#cart.more"; then ui back; fi # "Tạo đơn mới" may already have closed the cart
sleep 3

# Finish, once
need "finish card" "#guide.finish.close" 20
shot guide-14-finish
tap "#guide.finish.close"
sleep 2
if ui has "#guide.finish"; then miss "finish card still there"; fi
if ui has "#guide.card"; then miss "card back after finish"; fi
shot guide-15-home-after-finish

echo "misses: $MISSES"
exit "$MISSES"
