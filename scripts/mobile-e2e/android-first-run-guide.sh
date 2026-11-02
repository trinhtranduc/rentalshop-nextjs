#!/usr/bin/env bash
# #1393, #1394, #1410: a new empty shop walks the whole first-run guide on Android: product, customer in the cart, order, finish.
# The main guard against bubbles drifting when screens change (iOS: FirstRunGuideUITests). Needs a local API and a booted
# window-mode emulator ($E2E_AVD_PORT), with the debug APK built with -PapiBaseUrl. Exit code = number of misses.
# Product photos need fake-s3.mjs and AWS_ENDPOINT_URL on the API. E2E_LANG=vi runs the app in Vietnamese.
# Usage: android-first-run-guide.sh [walk|later|hide|exit|customers|sale|back|dup]
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
# The system picker lists this by name
SEED="$(dirname "${BASH_SOURCE[0]}")/../../apps/mobile/POS ADBD/Assets.xcassets/AppIcon.appiconset"
SEED_FILE="$(find "$SEED" -name '*.png' | head -1)"
adb_s push "$SEED_FILE" /sdcard/Pictures/guide-seed.png >/dev/null
adb_s shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Pictures/guide-seed.png >/dev/null
if [ "${E2E_LANG:-}" = vi ]; then adb_s shell cmd locale set-app-locales "$PKG" --locales vi-VN >/dev/null 2>&1 || true; fi
activity="$(adb_s shell cmd package resolve-activity --brief -c android.intent.category.LAUNCHER "$PKG" | tail -1 | tr -d '\r')"
adb_s shell am start -W -n "$activity" >/dev/null
sleep 3

# The intro pages come first on a fresh install (#1455), then login.
for _ in $(seq 1 25); do if ui has "Bỏ qua" || ui has "Skip"; then break; fi; sleep 1; done
first_of "Bỏ qua" "Skip" >/dev/null || miss "the pages on a fresh install"
ui wait "~Email" 25 >/dev/null || miss "login screen"
ui tap "Email" 2 >/dev/null 2>&1 || ui tap "~Email" >/dev/null
sleep 1; ui type "$E2E_EMAIL"; sleep 1
# adb input drops text when the machine is busy: the whole address must be there before going on
for _ in 1 2 3; do ui has "$E2E_EMAIL" && break; ui clear; sleep 1; ui type "$E2E_EMAIL"; sleep 2; done
hide_keyboard
ui tap "Mật khẩu" 2 >/dev/null 2>&1 || ui tap "Password" 2 >/dev/null 2>&1 || ui tap "~Password" >/dev/null 2>&1 || ui tap "~Mật khẩu" >/dev/null
sleep 1; ui type "$E2E_PASSWORD"; sleep 1; hide_keyboard
first_of "Đăng nhập" "Sign in" "Log in" >/dev/null || miss "login button"
for _ in $(seq 1 25); do
  if ui has "#guide.count"; then break; fi
  if ui has "Bỏ qua" || ui has "Skip"; then miss "the pages came after login"; break; fi
  sleep 1
done

need "card on a new shop" "$([ -n "${E2E_WITH_CUSTOMER:-}" ] && echo 1/3 || echo 0/3)" 20
shot guide-01-home-new-shop

if ui has "#guide.bubble.exit"; then miss "no bubble before a row is tapped"; fi

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
  need "the button runs the step on Home" "#guide.bubble.product_photo" 20
  ui back
  sleep 2
  need "card back on Home" "#guide.cta" 20
  shot guide-hide-05-card-back
  echo "misses: $MISSES"
  exit "$MISSES"
fi

# Tiếp's state is in its tag: on when the step is valid
next_on() { need "$1: Tiếp goes solid" "#guide.bubble.next.on"; tap "#guide.bubble.next.on"; }
next_off() { ui has "#guide.bubble.next.off" || miss "$1: Tiếp should be off"; }
counter() { need "counter $1" "$1" 10; } # the counter's text is on screen
dim_tap() { # a tap on the dim only flashes the ring
  local size
  size="$(adb_s shell wm size | awk -F': ' '/Physical/{print $2}' | tr -d '\r')"
  ui tap "@$(( ${size%x*} / 2 )),$(( ${size#*x} * 72 / 100 ))" >/dev/null
  sleep 1
}
pick_seeded_photo() { # GetContent runs the system picker, out of the app
  first_of "Thêm ảnh" "Add photo" >/dev/null || miss "add photo tile"
  sleep 4
  shot "${1:-guide}-picker"
  # Android's photo picker: its cells say "Photo taken on ...". Its sheet can open half or full height, so a place in each is the fallback.
  ui tap "~Photo taken" >/dev/null 2>&1 || ui tap "~Ảnh chụp" >/dev/null 2>&1 || true
  sleep 3
  local size at
  size="$(adb_s shell wm size | awk -F': ' '/Physical/{print $2}' | tr -d '\r')"
  for at in 34 66; do
    ui has "~can only access the photos" || ui has "~chỉ có thể truy cập" || break
    ui tap "@$(( ${size%x*} * 16 / 100 )),$(( ${size#*x} * at / 100 ))" >/dev/null
    sleep 4
  done
  if ui has "~can only access the photos" || ui has "~chỉ có thể truy cập"; then miss "the seeded photo in the picker"; ui back; sleep 1; fi
}
add_with_normal_form() { # the + on Home, outside the guide: no photo, no price
  first_of "~Sản phẩm mới" "~New product" >/dev/null || miss "+ on Home"
  need "the form" "#product.form.name" 20
  if ui has "#guide.bubble.next.off"; then miss "the guide runs only from the card"; fi
  tap "#product.form.name"
  ui type "Vest"
  sleep 1
  hide_keyboard
  tap "#product.form.save"
}

# exit: Thoát returns to the card; with content it asks first; Hủy stays (#1412)
if [ "${1:-walk}" = exit ]; then
  tap "#guide.cta"
  need "photo bubble" "#guide.bubble.product_photo"
  tap "#guide.bubble.exit"
  need "the card, no question" "0/3"
  tap "#guide.cta"
  need "photo bubble" "#guide.bubble.product_photo"
  pick_seeded_photo guide-exit
  next_on "photo"
  need "name bubble" "#guide.bubble.product_name"
  hide_keyboard
  tap "#guide.bubble.exit"
  sleep 1
  shot guide-exit-02-discard
  first_of "Hủy" "Cancel" >/dev/null || miss "cancel the question"
  sleep 1
  need "Hủy stays" "#guide.bubble.product_name"
  tap "#guide.bubble.exit"
  sleep 1
  first_of "Bỏ" "Discard" >/dev/null || miss "discard"
  need "the card" "0/3" 20
  shot guide-exit-03-card
  tap "#guide.cta"
  need "the form starts over" "#guide.bubble.product_photo"
  counter "1/9"
  echo "misses: $MISSES"
  exit "$MISSES"
fi

# customers: a shop with customers walks 7 (E2E_WITH_CUSTOMER=1)
if [ "${1:-walk}" = customers ]; then
  need "customer row ticked" "1/3" 20
  tap "#guide.cta"
  need "photo bubble" "#guide.bubble.product_photo"
  counter "1/7"
  shot guide-customers-01-counter
  tap "#guide.bubble.exit"
  add_with_normal_form
  need "two done" "2/3" 20
  tap "#guide.cta"
  need "customer row bubble" "#guide.bubble.cart_customer"
  counter "5/7"
  shot guide-customers-02-cart
  tap "#cart.customerRow"
  sleep 3
  if ui has "#guide.bubble.next.off"; then miss "no bubble on the list"; fi
  shot guide-customers-03-picker
  first_of "~Khach Co San" >/dev/null || miss "the existing customer"
  need "dates bubble" "#guide.bubble.cart_dates" 20
  counter "6/7"
  shot guide-customers-04-dates
  echo "misses: $MISSES"
  exit "$MISSES"
fi

# sale: 8 bubbles, the dates go
if [ "${1:-walk}" = sale ]; then
  add_with_normal_form
  need "one done" "1/3" 20
  tap "#guide.cta"
  need "customer row bubble" "#guide.bubble.cart_customer"
  tap "#guide.bubble.exit"
  need "the card" "1/3" 20
  first_of "Giỏ hàng" "Cart" >/dev/null || miss "cart button"
  sleep 2
  first_of "Bán" "Sale" >/dev/null || miss "sale switch"
  sleep 1
  ui back
  sleep 2
  tap "#guide.cta"
  need "customer row bubble" "#guide.bubble.cart_customer"
  counter "5/8"
  shot guide-sale-01-cart
  tap "#cart.customerRow"
  need "picker bubble" "#guide.bubble.new_customer"
  counter "6/8"
  tap "#customers.picker.new"
  need "form" "#customers.new.phone"
  tap "#customers.new.phone"
  ui type "09$(date +%s | tail -c 9)"
  sleep 1
  tap "#customers.new.name"
  ui type "Lan%sAnh"
  sleep 2
  next_on "new customer"
  need "bubble 7" "#guide.bubble.new_customer_save"
  counter "7/8"
  tap "#customers.new.save"
  need "create bubble, no dates" "#guide.bubble.cart_create" 20
  counter "8/8"
  shot guide-sale-02-create
  echo "misses: $MISSES"
  exit "$MISSES"
fi

# back: the system back button is not blocked; the cart resumes from its data, a form starts over
if [ "${1:-walk}" = back ]; then
  add_with_normal_form
  need "one done" "1/3" 20
  tap "#guide.cta"
  need "customer row bubble" "#guide.bubble.cart_customer"
  tap "#cart.customerRow"
  need "picker bubble" "#guide.bubble.new_customer"
  tap "#customers.picker.new"
  need "form" "#customers.new.phone"
  tap "#customers.new.phone"
  ui type "0912"
  sleep 1
  hide_keyboard
  ui back
  sleep 2
  need "back resumes on the cart or the picker" "~/9"
  shot guide-back-01-after-back
  if ui has "#customers.picker.new"; then
    tap "#customers.picker.new"
    need "the form again" "#customers.new.phone"
    next_off "the form starts over"
    hide_keyboard
    ui back
    sleep 2
    ui has "#customers.picker.new" && ui back
    sleep 2
  fi
  need "the cart's bubble again" "#guide.bubble.cart_customer"
  counter "5/9"
  shot guide-back-02-cart
  tap "#guide.bubble.exit"
  need "the card" "1/3" 20
  shot guide-back-03-card
  # Thoát with something typed, from inside the sheet: asks, then goes all the way to the card
  tap "#guide.cta"
  need "customer row bubble" "#guide.bubble.cart_customer"
  tap "#cart.customerRow"
  need "picker bubble" "#guide.bubble.new_customer"
  tap "#customers.picker.new"
  need "form" "#customers.new.phone"
  tap "#customers.new.phone"
  ui type "0912"
  sleep 1
  hide_keyboard
  tap "#guide.bubble.exit"
  sleep 1
  first_of "Bỏ" "Discard" >/dev/null || miss "discard"
  sleep 2
  need "the card" "1/3" 20
  if ui has "#customers.new.phone"; then miss "the sheet should be gone"; fi
  shot guide-back-04-card-after-discard
  echo "misses: $MISSES"
  exit "$MISSES"
fi

# dup: the phone belongs to a customer that arrived after the run started. The real box shows, the bubble leaves, "Chọn khách này" goes on.
if [ "${1:-walk}" = dup ]; then
  add_with_normal_form
  need "one done" "1/3" 20
  tap "#guide.cta"
  need "customer row bubble" "#guide.bubble.cart_customer"
  tap "#cart.customerRow"
  need "picker bubble" "#guide.bubble.new_customer"
  phone="0966$(date +%s | tail -c 7)"
  psql "$E2E_DATABASE_URL" -qc "insert into \"Customer\"(\"firstName\",phone,\"merchantId\",\"updatedAt\") select 'Khach Cu','$phone',\"merchantId\",now() from \"User\" where email='$E2E_EMAIL'" || miss "add the customer"
  tap "#customers.picker.new"
  need "form" "#customers.new.phone"
  tap "#customers.new.phone"
  ui type "$phone"
  sleep 1
  tap "#customers.new.name"
  ui type "Lan%sAnh"
  sleep 2
  next_on "new customer"
  need "bubble 7" "#guide.bubble.new_customer_save"
  tap "#customers.new.save"
  sleep 4
  if ui has "#guide.bubble.new_customer_save"; then miss "the bubble should not cover the box"; fi
  shot guide-dup-01-box
  hide_keyboard
  ui swipe up
  first_of "Chọn khách này" "Select this customer" >/dev/null || miss "the box's button"
  need "dates bubble" "#guide.bubble.cart_dates" 20
  counter "8/9"
  shot guide-dup-02-dates
  echo "misses: $MISSES"
  exit "$MISSES"
fi

# 1 photo: off, and neither Tiếp nor the dim moves on or closes anything
tap "#guide.cta"
need "bubble 1: photo" "#guide.bubble.product_photo"
counter "1/9"
next_off "photo"
shot guide-02-photo-empty
tap "#guide.bubble.next.off"
dim_tap
ui has "#guide.bubble.product_photo" || miss "a tap on the dim should only flash the ring"
pick_seeded_photo guide-02b
shot guide-03-photo-picked
next_on "photo"

# 2 name: the cursor is there, the bubble is above the keyboard
need "bubble 2: name" "#guide.bubble.product_name"
counter "2/9"
next_off "name"
sleep 2
ui type "Ao%scuoi%sren"
sleep 2
shot guide-04-name
next_on "name"

# 3 price: 0đ is not a price in the guide
need "bubble 3: price" "#guide.bubble.product_price"
counter "3/9"
next_off "price"
sleep 2
ui type "0"
sleep 2
next_off "price at 0"
ui type "1200000"
sleep 2
shot guide-05-price
next_on "price"

# 4 save: Tiếp does not save
need "bubble 4: save" "#guide.bubble.product_save"
counter "4/9"
shot guide-06-save
tap "#guide.bubble.next.off"
ui has "#guide.bubble.product_save" || miss "Tiếp must not save"
tap "#product.form.save"
need "one step done" "1/3" 30
shot guide-07-home-one-done

# 5 customer row
tap "#guide.cta"
need "cart opens" "#cart.more"
need "bubble 5: customer row" "#guide.bubble.cart_customer"
counter "5/9"
shot guide-08-cart-customer
tap "#cart.customerRow"

# 6 on the picker
need "bubble 6: picker" "#guide.bubble.new_customer"
counter "6/9"
next_off "picker"
shot guide-09-picker
tap "#customers.picker.new"

# 6 on the form: the form's own rule
need "bubble 6: form" "#customers.new.phone"
need "bubble 6: form" "#guide.bubble.new_customer"
counter "6/9"
next_off "new customer"
shot guide-10-new-customer-empty
tap "#customers.new.phone"
ui type "09$(date +%s | tail -c 9)"
sleep 2
next_off "name still missing"
tap "#customers.new.name"
ui type "Lan%sAnh"
sleep 2
shot guide-11-new-customer-filled
next_on "new customer"

# 7 save and select
need "bubble 7: save" "#guide.bubble.new_customer_save"
counter "7/9"
shot guide-12-save-and-select
tap "#customers.new.save"

# 8 dates
need "customer in the cart" "~Lan Anh" 20
need "bubble 8: dates" "#guide.bubble.cart_dates"
counter "8/9"
shot guide-13-dates
tap "#cart.datesRow"
sleep 2
if ui has "#guide.bubble.cart_dates"; then miss "no bubble over the calendar"; fi
first_of "Xác nhận" "Confirm" "Xong" "Done" >/dev/null || miss "confirm dates"

# 9 create, then the real confirm sheet with no bubble
need "bubble 9: create" "#guide.bubble.cart_create"
counter "9/9"
shot guide-14-create
tap "#cart.cta"
sleep 2
if ui has "#guide.bubble.cart_create"; then miss "no bubble over the confirm sheet"; fi
shot guide-15-order-preview
# The confirm sheet's button has the same label as the cart's: the sheet is on top, so the last match
first_of "Tạo đơn" "Create order" >/dev/null || miss "create order"
need "order created" "~#" 20
shot guide-15-order-created
first_of "Tạo đơn mới" "New order" >/dev/null || miss "new order"
sleep 2
if ui has "#cart.more"; then ui back; fi # "Tạo đơn mới" may already have closed the cart
sleep 3

# Finish, once
need "finish card" "#guide.finish.close" 20
shot guide-16-finish
tap "#guide.finish.close"
sleep 2
if ui has "#guide.finish"; then miss "finish card still there"; fi
if ui has "#guide.card"; then miss "card back after finish"; fi
shot guide-17-home-after-finish

echo "misses: $MISSES"
exit "$MISSES"
