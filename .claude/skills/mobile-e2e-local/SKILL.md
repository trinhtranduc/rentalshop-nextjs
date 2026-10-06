---
name: mobile-e2e-local
description: Use before a mobile PR, after a merge to dev, before a store release, or when the user asks to "test like a tester" / "test the app end to end". Seeds a dedicated local database, runs a local API with chosen MOBILE_FEATURES, drives the iOS app on a simulator (committed UI test) and the Android app on an emulator (adb/uiautomator), reviews screenshots against the canvas, and reports bugs in a fixed format.
---

# Mobile end-to-end on a local stack

Tooling: `scripts/mobile-e2e/` (every script has `--help`). UI test: `apps/mobile/POS ADBDUITests/AnyRentE2ETests.swift`.
The run finds bugs; it does not fix app code. Real app bugs go into the report (format below), test-script
problems get fixed in the script or the UI test.

## 1. Pick resources nobody else uses

Several agents run at once. Before anything, choose and export your own set:

```bash
export E2E_DATABASE_URL=postgresql://postgres@127.0.0.1:54343/anyrent_mobile_e2e  # your own DB, never a shared one
export E2E_API_PORT=3180                     # check: lsof -nP -iTCP:3180 -sTCP:LISTEN
export E2E_SIMULATOR="iPhone 17 Pro Max"     # check: xcrun simctl list devices | grep Booted
export E2E_AVD=anyrent_e2e E2E_AVD_PORT=5570 # check: adb devices; emulator -list-avds
export E2E_OUT=<scratch>/e2e                 # logs, screenshots, derived data
scripts/mobile-e2e/env.sh                    # prints the effective values
```

- Never use `vm_pos` / `vm_kitchen` or ports 5554 / 5556 (the user's emulators). `android-e2e.sh` and `adb-ui.sh` refuse them.
- Never seed or write to a database another agent uses (e.g. `anyrent_e2e`).
- Logins are single-session: logging in anywhere else with the same account (even `curl`) logs the app out.
  One account per device at a time; do not curl-login with the account under test.
- Disk: derived data lives in `$E2E_OUT/DerivedData` (2–4 GB). Stop building below 6 GB free (`df -h /`).

## 2. Set up

```bash
scripts/mobile-e2e/seed-local.sh                   # creates the DB, prisma db push, unaccent, seed, prints accounts
scripts/mobile-e2e/api-local.sh start --build      # build this checkout's API, then start it
# or run a prebuilt API from another checkout with the same schema (it is only read):
E2E_API_DIR=/path/to/checkout/apps/api scripts/mobile-e2e/api-local.sh start
scripts/mobile-e2e/api-local.sh status             # shows the app-config flags the app will get
```

- The seed **wipes** Merchant, Outlet, User, Category, Product, Customer, Order, OrderItem, OutletStock, Payment,
  Subscription and Plan. `seed-local.sh` refuses any host other than `127.0.0.1`/`localhost`; the production gate blocks
  `yarn db:regenerate-system` / `railway:seed` without a local `DATABASE_URL` on the same command.
- No `node_modules` in this checkout? `E2E_NODE_MODULES=/other/checkout/node_modules` (same `prisma/schema.prisma`).
- Seed accounts: `merchant1@example.com / merchant123` (MERCHANT, merchant 1), `staff.outlet1@example.com / staff123`
  (OUTLET_STAFF, merchant 1 main branch), `admin.outlet1@example.com / admin123` (OUTLET_ADMIN), `admin@rentalshop.com / admin123`.
- Flags: `MOBILE_FEATURES=newOrders,newOrderDetail,…` on `api-local.sh start`. On the API, unset/blank means every
  new screen on (#456) and `none` means all off; the apps also default every new screen on without a cached config
  (`env.sh` still passes its own list unless you set one). The apps cache `/api/mobile/app-config` for up to
  5 minutes and read flags at launch: after changing flags restart the API and reinstall (`--fresh`).

## 3. Run

```bash
scripts/mobile-e2e/ios-e2e.sh --fresh --account merchant     # all flows, screenshots in $E2E_OUT/ios/merchant/
scripts/mobile-e2e/ios-e2e.sh --account staff                # staff restrictions, $E2E_OUT/ios/staff/
scripts/mobile-e2e/ios-e2e.sh --only test2CartRent --lang en  # one flow, English
scripts/mobile-e2e/android-e2e.sh --fresh                    # boots the AVD, builds with -PapiBaseUrl, runs the scenario
scripts/mobile-e2e/adb-ui.sh dump | tap "~Giao đồ" | shot 20-detail-handover   # drive Android by hand
```

- iOS gets credentials, role, flags and the screenshot dir through `TEST_RUNNER_E2E_*` (xcodebuild strips the prefix).
  Each flow is its own test method, numbered so they run in order: `test1HomeProducts`, `test2CartRent`,
  `test3CartSale`, `test4OrdersTab`, `test5OrderDetailActions`, `test6Calendar`, `test7Overview`,
  `test8StaffRestrictions` (staff run only), `test9SettingsLogout`. One failure does not stop the rest. Methods
  behind an off flag are skipped; order-changing flows (cart, detail actions) run for the merchant account only.
  Newer screens (#530): `test5cOrderActionSheet` (⋯ sheet), `test5dOrderChangeHistory`, `test7dProductChangeHistory`
  (changes Product 25's daily price, then removes it again), `test7eOverlapSetting` (turns "Cho tạo đơn khi trùng
  lịch" OFF and back ON in a teardown block), `test7fCartPricingSheet`, `test7gChangePasswordSheet` (never changes the
  password), `test7hOrdersByProductAndCustomer`, `test7iNotifications`, `test7jTodayWorkAndNotPickedUp`. The seed has no
  notifications: insert a long one into your own DB to exercise wrapping.
  Soft checks print `E2E_NOTE: SOFT CHECK FAILED …` in the log instead of failing.
- The test handles the notification prompt ("Don’t Allow" / "Không cho phép") and onboarding ("Skip" / "Bỏ qua"),
  logs in, and relaunches once so app-config flags apply.
- Android debug builds take `-PapiBaseUrl=http://10.0.2.2:<port>` (no edit to `build.gradle.kts`); the debug network
  config already allows cleartext to `10.0.2.2`. `adb input text` cannot type Vietnamese: search with ASCII.
- Look at every screenshot: `sips -Z 900 <png> --out <small.png>`, then Read it. A green test with a wrong screen is a bug.

## 3b. Business numbers without a device (API e2e)

Before or instead of the UI run, check the money and availability rules over HTTP:

```bash
scripts/e2e/business-e2e.sh              # own DB anyrent_business_e2e, API :3190, TZ=UTC and TZ=Asia/Ho_Chi_Minh
```

It reuses `seed-local.sh` and `api-local.sh`, runs `tests/e2e/business/*.e2e.test.js` (catalogue
`tests/e2e/TEST_CASES.md`: product → order → status → Overview, overbooking, quantity, edits, VN days, scope) and
prints passed / failed / known-bug counts per time zone. A red case there is an API or rule bug the apps will show;
report it with the case ID instead of reproducing it on a simulator.

## 4. Manual checklist (what the UI test does not cover)

Run each line on both platforms; tick it in the report or file a bug.

- **Flags:** every v2 screen with its flag on, and the old screen with it off (restart API + `--fresh`). Flag off must
  look and behave exactly as before.
- **Roles:** merchant vs `OUTLET_STAFF` (no "Sửa"/Edit on product detail, no price fields in add/edit product, no
  revenue where it is hidden) vs `OUTLET_ADMIN` (own outlet only).
- **Home/products:** search (with and without accents), barcode and image search buttons, out-of-stock grey state,
  + button count, product detail, add/edit product.
- **Cart:** rent and sale, date range across months, same-day pickup and return, customer search/create, discount,
  deposit, preview totals, confirm, draft kept after relaunch.
- **Orders:** Việc cần làm (late, hand over, take back), Tất cả đơn with each filter, Đơn bán, search by number, name, phone.
- **Order detail:** Giao đồ, Nhận trả (late fee, damage), cancel, edit, print/share, notes and images.
- **Calendar:** today highlighted on the Vietnam day, month switch, tapping a day near midnight, opening an order.
- **Overview:** each period, custom range, cancelled orders excluded from revenue.
- **Settings:** each row opens, language switch, logout, login again.
- **States:** empty lists (a new outlet), API errors (stop the API mid-screen), offline (simulator/emulator network off),
  slow network, pull to refresh, session kicked by a second login.
- **Language:** Vietnamese and English (`--lang vi|en`; Android: emulator locale). No raw keys, no clipped text.
- **Screens:** small (iPhone SE / 5" Android), large, dark mode, larger Dynamic Type / font scale.

## 5. Review screenshots against the canvas

The approved design is https://claude.ai/artifact/DY4DRyDH8Kps9gAw9FExLx. Only boards marked **"CHỐT"** are final.

1. List boards: Artifact `action: list`, `scope: files`, that URL. Boards are `project/<name>.dc.html`
   (e.g. `SP-dong`, `SP-chi-tiet`, `Gio-hang`, `Gio-hang-ban`, `VL-tat-ca`, `Loc`, `CT-gon`, `Giao-do`, `Nhan-tra`,
   `Lich`, `Tong-quan`, `Tong-quan-chon`, `Cai-dat`, `Dang-nhap`, `Onboarding`).
2. Read the board for the screen (`action: read`, `path: project/<name>.dc.html`); check it is marked CHỐT.
3. Compare the screenshot: layout order, copy (exact Vietnamese), colours (status pills, primary `#1D4ED8`), money
   format (`1.150.000đ`), day format (`T7 03/10`), touch targets, what is hidden per role.
4. A difference is a bug only against a CHỐT board. Note "not on canvas" for screens without one.

## 6. Bug report format

```
### <short title>
- Platform: iOS 26 / iPhone 17 Pro Max simulator | Android 16 / <AVD>
- Flags: newOrders,newOrderDetail,…   Account: merchant1@example.com (MERCHANT)
- Steps: 1. … 2. … 3. …
- Expected: … (canvas board <name> if it applies)
- Actual: …
- Screenshot: $E2E_OUT/ios/merchant/NN-feature-step.png
```

One bug per entry. Say whether it reproduces on the other platform. Do not fix app code in an e2e run.

## 7. Clean up

```bash
scripts/mobile-e2e/api-local.sh stop
xcrun simctl shutdown "$E2E_SIMULATOR"
adb -s emulator-$E2E_AVD_PORT emu kill            # only your own emulator
rm -rf "$E2E_OUT/DerivedData" "$E2E_OUT"/ios/*.xcresult   # keep the screenshots
dropdb -h 127.0.0.1 -p 54343 -U postgres anyrent_mobile_e2e   # optional, only your own DB
```
