# Mobile e2e test cases — AnyRent (iOS + Android)

Issue: #447 · Status: draft · Owner review needed

One catalogue for both apps. Each case runs on iOS and Android with the new UI (all `MOBILE_FEATURES` on)
unless the case says otherwise. Data comes from `scripts/mobile-e2e/seed-local.sh` on the local stack.

## Suites

| Suite | Cases | When | Target time |
|---|---|---|---|
| **Smoke** | P0 | every mobile PR, after each merge to `dev` | ≤ 10 min per platform |
| **Regression** | P0 + P1 | before a TestFlight / Play internal build (#391) | ≤ 45 min per platform |
| **Full** | P0 + P1 + P2 + manual | before a store release, after a big UI phase | half a day, both platforms |

Automation column: `M` = Maestro flow (planned or done), `M✓` = Maestro flow passing, `X` = XCUITest today,
`manual` = by hand (needs a person or a device state Maestro cannot set).

## Accounts and data

| Role | Account (seed prints the real email) | Used for |
|---|---|---|
| MERCHANT | `merchant<n>@example.com / merchant123` | default for all cases |
| OUTLET_ADMIN | `admin.outlet<n>@example.com / admin123` | own-outlet scope |
| OUTLET_STAFF | `staff.outlet<n>@example.com / staff123` | restrictions |

Each run creates its own customer (`Khách E2E <stamp>`) so cases never depend on each other's orders.
Logins are single-session: one account per device at a time.

## Rules every case checks

- Dates are Vietnam civil days (`Asia/Ho_Chi_Minh`); a same-day pickup and return occupies that day.
- Revenue and rankings exclude CANCELLED orders.
- Search is scoped to the merchant and matches word prefixes without accents.
- `OUTLET_STAFF` never sees or sends product prices.
- No raw string keys, no clipped names (long names may wrap to two lines), no CUID on screen.

---

## A. Auth and session

| ID | P | Case | Expected | Source | Auto |
|---|---|---|---|---|---|
| A01 | P0 | Clean install → login on the **new** screen | "Xin chào" screen (not the old one) after the app-config is cached; lands on Home | #386, this pilot | M✓ |
| A02 | P1 | Wrong password | Error text shown, stays on login | #386 | X |
| A03 | P1 | Forgot password → send link | "Kiểm tra email" or the readable rate-limit text (429) | #386, #410 | X |
| A04 | P1 | Create store (2 steps) | New merchant lands on onboarding then Home | #386 | M |
| A05 | P0 | First-login onboarding | Skip works; not shown again on next login | #387 | M✓ |
| A06 | P1 | Login on a second device with the same account | First device shows "đăng nhập trên thiết bị khác" and returns to login | #343, #344 | manual |
| A07 | P2 | Token expiry / refresh | App stays signed in across the access-token lifetime; no silent logout | #344 (open) | manual |
| A08 | P1 | Logout → login again | Cart and cached data of the previous user are gone | — | X |

## B. Home and products

| ID | P | Case | Expected | Source | Auto |
|---|---|---|---|---|---|
| B01 | P0 | Home list loads | Products with code, price/lần, "Còn N" | #383 | M✓ |
| B02 | P0 | Merchant "Còn N" equals the product detail strip for today | Same number (default outlet) | #432 | M |
| B03 | P1 | Search with and without accents ("ao dai" finds "Áo dài") | Match by word prefix | AGENTS rule | M |
| B04 | P1 | Out of stock product | Grey state, cannot add | #373 | M |
| B05 | P1 | Add product (merchant): per-rental and per-day price, per-day as default | Saved; cart starts on the product's default option | #373, #418 | M |
| B06 | P1 | Edit product while units are rented | Rented count kept; availability unchanged | #359 eval | M |
| B07 | P1 | Delete product with an open order | Refused with readable text; without open orders it disappears (soft delete) | #389 | M |
| B08 | P0 | OUTLET_STAFF: product detail and form | No "Sửa", no price fields; API refuses a price change | AGENTS rule | X |
| B09 | P2 | Barcode and image search buttons open their screens | Camera permission prompt handled | — | manual |

## C. Cart and order creation

| ID | P | Case | Expected | Source | Auto |
|---|---|---|---|---|---|
| C01 | P0 | Rent today, new customer, create | Review → collect deposit → order RESERVED; appears in "Việc cần làm" | pilot | M✓ |
| C02 | P0 | Sale order | "Bán & thu tiền"; order COMPLETED; deposit 0 | #361 | X |
| C03 | P1 | Rent per-day item over 3 days | Line = price × qty × days; review and saved total match | #413, #444 | M |
| C04 | P1 | Date range across months | Days counted inclusively on Vietnam days | #351, vn-civil-day eval | M |
| C05 | P1 | Unavailable dates | Conflict shown before create; order not created | #414 | M |
| C06 | P1 | Cart opened from a customer → "+ Thêm" | Goes to Home, comes back with the customer kept | #433 | M |
| C07 | P1 | Discount and deposit edits | Totals update; saved order matches review | — | M |
| C08 | P1 | One confirm creates exactly one order (double tap, slow network) | One order only | #341 (open) | manual |
| C09 | P2 | Note with 5 photos at create | 5 accepted, 6th not offered | #435 | manual |
| C10 | P2 | Cart kept after relaunch | Items and customer still there | — | M |

## D. Orders tab

| ID | P | Case | Expected | Source | Auto |
|---|---|---|---|---|---|
| D01 | P0 | "Việc cần làm": hand over today, take back today, late | Counts "giao N · trả N" match the rows; late shows "Trễ N ngày" | #371, #401 | M |
| D02 | P0 | Search by customer without accents, by phone, by order number | Finds the order; other merchants' orders never shown | AGENTS rule | M✓ (name) |
| D03 | P1 | "Tất cả đơn" with each filter | Status filters match; reset when switching view | #371 | M |
| D04 | P1 | "Đơn bán" list | Only SALE orders, grouped by sale day | #371 | M |
| D05 | P1 | Long customer names, English plurals | Name wraps to two lines, never cut; "1 day / 1 order / 1 item" | #424, #430 | M |
| D06 | P2 | Sort by hand-over date | Orders without a planned pickup are not first | #428 (open) | M |

## E. Order detail actions

| ID | P | Case | Expected | Source | Auto |
|---|---|---|---|---|---|
| E01 | P0 | Hand over with papers in Vietnamese | Status ĐANG THUÊ; papers saved as typed; step bar shows actual day | #427, #434, pilot | M✓ |
| E02 | P0 | Hand over without papers or deposit | Allowed (optional), no block | #427 | M |
| E03 | P0 | Take back on time | Status ĐÃ TRẢ; step bar "Trả <actual day>" | #434 | M |
| E04 | P1 | Take back late, with late fee and damage note | Fee and note saved; totals right | #372 | M |
| E05 | P1 | Extend rental with extra rent | New return day and total; extra rent collected | #425 | X |
| E06 | P1 | Cancel RESERVED; cancel PICKUPED | Allowed; RETURNED cannot go back to RESERVED | #361 eval | M |
| E07 | P1 | Edit order items | Product name and image kept on old lines | #359 | X |
| E08 | P1 | Note photos: add up to 5, edit keeps them | 6th refused (UI and API) | #435 | manual |
| E09 | P2 | Print / share receipt | Share sheet opens; receipt shows the order | #348 | manual |

## F. Calendar

| ID | P | Case | Expected | Source | Auto |
|---|---|---|---|---|---|
| F01 | P0 | Today highlighted on the Vietnam day | Correct at 23:30 and 00:30 Vietnam time | vn-civil-day eval | M |
| F02 | P1 | Day shows pickups, returns, late returns and money | Matches the orders of that day | #389, #390 | M |
| F03 | P1 | Month switch; pickup on the last day of a month | Not dropped | #362 | M |

## G. Overview (reports)

| ID | P | Case | Expected | Source | Auto |
|---|---|---|---|---|---|
| G01 | P0 | Each period and a custom range | Revenue excludes CANCELLED; days are Vietnam days | #355 eval | M |
| G02 | P1 | "Đơn mới" drill-down | Title "Đơn mới"; list matches the card count | #434 | M |
| G03 | P1 | "Thế chấp đang giữ" opens the rented list | Rows = PICKUPED orders with collateral | #388 | M |
| G04 | P2 | "Cho thuê nhiều nhất" | Counts rentals only, not sale lines | #429 (open) | M |
| G05 | P2 | Net income vs bars | Matches web dashboard for the same range | #434 note | manual |

## H. Customers

| ID | P | Case | Expected | Source | Auto |
|---|---|---|---|---|---|
| H01 | P1 | Create customer with a Vietnamese name | Saved; found by accent-free search | #387 | M✓ (via cart) |
| H02 | P1 | Customer detail: orders and summary | Summary excludes CANCELLED | #405 | M |
| H03 | P1 | "Tạo đơn cho khách này" | Cart opens with the customer | #387, #433 | M |

## I. Settings and users

| ID | P | Case | Expected | Source | Auto |
|---|---|---|---|---|---|
| I01 | P1 | Each settings row opens | No dead rows | #374 | X |
| I02 | P1 | Language switch vi ↔ en | All screens switch; no raw keys | — | M |
| I03 | P2 | Users list (merchant) | Staff of own merchant only | #366 | X |

## J. Roles and scope

| ID | P | Case | Expected | Source | Auto |
|---|---|---|---|---|---|
| J01 | P0 | OUTLET_STAFF smoke: home, cart rent, hand over | Works; no prices, no revenue where hidden | AGENTS rule | M |
| J02 | P1 | OUTLET_ADMIN | Own outlet's orders and stock only | AGENTS rule | M |
| J03 | P1 | Staff moved to another outlet by admin | Signed out at once; next login shows the new outlet | #443 | manual |

## K. Flags, compatibility, states

| ID | P | Case | Expected | Source | Auto |
|---|---|---|---|---|---|
| K01 | P1 | Each flag off (restart API, reinstall) | Old screen, same behaviour as before | #376 | M (param) |
| K02 | P1 | App built from `main-real` against the `dev` API | Create, hand over, return, calendar still work | api-compat-review | manual |
| K03 | P1 | API stopped mid-screen; offline; slow network | Readable error, retry works, no crash | — | manual |
| K04 | P2 | Empty outlet (no products, no orders) | Empty states, no crash | — | M |
| K05 | P2 | Small screen, large font / Dynamic Type, dark mode | No clipped or overlapping text | #424 | manual |

---

## Counts

| Priority | Cases | Maestro passing | Maestro planned | XCUITest only | Manual |
|---|---|---|---|---|---|
| P0 | 17 | 5 | 9 | 3 | 0 |
| P1 | 38 | 1 | 25 | 6 | 6 |
| P2 | 12 | 0 | 5 | 1 | 6 |

(Counts are approximate; the table rows are the source of truth.)

## Order of work after the pilot

1. P0 Maestro flows (smoke) on both platforms — one flow per area: `smoke-auth`, `smoke-rent` (C01, E01–E03),
   `smoke-sale`, `smoke-orders` (D01–D02), `smoke-calendar-overview` (F01, G01), `smoke-staff` (J01).
2. P1 flows, reusing `login.yaml` and `run-vars.js`.
3. Accessibility ids on both apps where labels repeat (password, phone, name fields, cart CTA).
4. Retire an XCUITest method only when its Maestro flow passes 5/5 on both platforms.
