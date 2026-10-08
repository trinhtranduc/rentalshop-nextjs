# Business e2e test cases (#498)

Bộ test e2e nghiệp vụ: tạo sản phẩm → lên đơn → đổi trạng thái → kiểm tra doanh thu (Tổng quan), trùng đơn, giảm số lượng, sửa đơn.

Every case runs over HTTP against a **local** API on a **local** seeded database, with the endpoints and bodies the
iOS/Android apps send (multipart `data` for product and order create, `PUT /api/orders/{id}` for status and edits,
`GET /api/analytics/period` for Overview). Code: `tests/e2e/business/*.e2e.test.js`, helper `tests/e2e/helpers/api.js`.
Run: `scripts/e2e/business-e2e.sh` (seed, API, both time zones) or `E2E_API_URL=http://localhost:3190 yarn test:e2e` in `tests/`.

## Common preconditions

- Seed from `scripts/mobile-e2e/seed-local.sh`. Accounts: main merchant = the merchant on an ACTIVE plan (fresh DB:
  `merchant2@example.com`), other merchant (`merchant1@`), OUTLET_STAFF of the main merchant's default outlet
  (`staff.outlet2@`). `business-e2e.sh` reads them from the DB (`BIZ_E2E_*` overrides).
- Each test makes its own products, customers and orders (unique names). Rent windows are future Vietnam days.
- Merchant-wide Overview numbers are checked as **deltas** (`watchOverview`: read before, act, read after), so runs
  repeat without reseeding. Product and customer numbers are absolute (fresh rows).
- Expected money is computed from the inputs in the test. Notation: A = order total, D = deposit (tiền cọc),
  S = collateral money (thế chân), L = late fee, F = damage fee. "today" = today's Vietnam day.
- Overview fields: thực thu = `revenue.collected`; giá trị đơn mới = `revenue.totalOrderValue`; còn phải thu =
  `revenue.outstanding` (`outstandingBreakdown.atPickup/overduePickup`); thế chân = `revenue.collateralFlow`;
  thế chân đang giữ = `operational.totalCollateral` and `outlet-operations cash.depositsHeld`; đơn mới =
  `operational.orderCounts.new`; còn thu of one order = `amountDue` / `refundDue` on `GET /api/orders` rows.
- **Known bug** cases assert the correct rule and run as `test.failing` (green while the bug exists). Set
  `BIZ_E2E_SHOW_BUGS=1` to run them as plain tests.

## BF-PROD — Sản phẩm (`products-pricing.e2e.test.js`)

| ID | Case | Steps | Expected |
|---|---|---|---|
| BF-PROD-01 | Thuê giá cố định, cọc, tồn 3 | create FIXED 150.000, deposit 500.000, stock 3 | numeric id; rentPrice 150.000, deposit 500.000, totalStock 3, pricingType FIXED, one FIXED option; outlet stock `{3,3,0}` |
| BF-PROD-02 | Thuê theo ngày | create DAILY 60.000, stock 2 | pricingType DAILY, DAILY option 60.000 |
| BF-PROD-03 | Sản phẩm bán | create sale 250.000, stock 10 | salePrice 250.000 |
| BF-PROD-04 | Có trong danh sách / tìm kiếm | create, `GET /api/products?search=<name>` | row with rentPrice and stock 4 at the outlet |
| BF-PROD-05 | Đổi giá chỉ áp dụng đơn mới | order at 100.000, PUT product 130.000 | old order total/unit/line stay 100.000; Overview Δ 0; new order 130.000 |
| BF-PROD-06 | Theo giờ cần cấu hình | HOURLY without / with durationConfig | 400 / 200 |
| BF-PROD-07 | Mã vạch duy nhất trong từng shop (#629) | main merchant creates barcode X; other merchant creates X; main merchant creates X again | 200 / 200 (other shop may reuse X) / 409 `DUPLICATE_ENTRY` |

## BF-PRICE — Tính tiền (`products-pricing.e2e.test.js`)

| ID | Case | Steps | Expected |
|---|---|---|---|
| BF-PRICE-01 | Tiền từng dòng | FIXED 150.000 × 2 + DAILY 45.000 × 3 over 4 days | lines 300.000 (rentalDays 1) and 540.000 (rentalDays 4); total 840.000; rentalDuration 4 |
| BF-PRICE-02 | Đồng chẵn, không lệch số lẻ | DAILY 33.333 × 3 × 3 days, 7% discount (rounded), D 33.333 | total = 299.997 − round(7%); today Δ collected D, orderValue A, outstanding A − D; after pickup Δ collected A − D; all integers |
| BF-PRICE-03 | Còn thu = tổng − cọc (+ thế chân phải nhận) − đã trả | A 500.000, D 150.000, S 300.000 at booking | row amountDue 650.000, refundDue 0, totalPaid 0; Overview Δ outstanding = atPickup = 350.000 |
| BF-PRICE-04 | Cọc lớn hơn tổng | A 100.000, D 150.000 | Δ collected 150.000, orderValue 100.000, outstanding 0; amountDue 0 |
| BF-PRICE-05 | Trả lại thế chân trừ phí | S 800.000 at pickup, F 120.000 | amountDue 0, refundDue 680.000 |
| BF-PRICE-06 | Theo giờ | HOURLY 20.000, 09:00 → 13:30 VN, no rentDays | rentalDays 5 (started hours), rentalDuration 5, line 100.000 |
| BF-PRICE-07 | Gói (block) gửi là FIXED (#482) | DAILY product with FIXED option 120.000; 4-day order on the FIXED option | total 120.000, line pricingType FIXED, rentalDays 1, pricingOptionId kept |
| BF-PRICE-08 | API lưu tổng do app gửi | lines 100.000, totalAmount 90.000 | stored 90.000 / line 100.000 (current behaviour, question Q4) |
| BF-PRICE-09 | Ngày thuê tính cả 2 đầu (#351) | DAILY 3 VN days, no rentalDuration/rentDays | rentalDuration 3, rentalDays 3 |

## BF-RENT — Vòng đời đơn thuê và doanh thu (`rent-lifecycle.e2e.test.js`)

| ID | Case | Steps | Expected Δ (today unless noted) |
|---|---|---|---|
| BF-RENT-01 | Cùng ngày: cọc → giao (thế chân tiền) → trả (phí trễ + hư) | A 300.000, D 100.000; PICKUPED with S 500.000 + papers; PUT L 40.000 F 60.000; RETURNED | RESERVED: collected +D, deposits +D, orderValue +A, outstanding = atPickup +(A − D), new +1, amountDue A − D. PICKUPED: collected +(A − D), deposits −D, pickupAndSale +A, outstanding −(A − D), collateral received +S, held +S, pickups +1; row amountDue 0 refundDue S. Fees: refundDue S − L − F. RETURNED: collected +(L + F), fees +(L + F), held −S, returns +1; row 0/0. Collateral never in collected. |
| BF-RENT-02 | Không cọc, thế chân giấy tờ | A 250.000; pickup with collateralDetails only | create: collected 0, outstanding +A; pickup: collected +A, collateral 0; return: Δ 0 |
| BF-RENT-03 | Khác ngày: cọc hôm nay, giao ngày P, trả ngày R | DAILY 80.000 × 3, D 50.000, S 1.000.000, F 30.000; pickedUpAt P 09:00, returnedAt R 18:00 | today +D; P: collected +(A − D), received +S, held +S, pickups +1; R: collected +F, fees +F, returned +S, returns +1; P afterwards held −S, collected 0; today..R: collected A + F, received = returned = S, outstanding 0, `totalRevenue − collected = received − returned` |
| BF-RENT-04 | Phí hư lớn hơn thế chân | S 100.000, F 300.000 | amountDue 200.000, refundDue 0 |
| BF-RENT-05 | Chỉ chuyển trạng thái hợp lệ (#361) | RESERVED→RETURNED / COMPLETED; echo; RETURNED→PICKUPED/RESERVED/CANCELLED; PATCH /status | 400 INVALID_ORDER_STATUS; echo 200 |
| BF-RENT-06 | Tồn kho khi giao / trả | stock 3, qty 2 | RESERVED `{3,3,0}`, PICKUPED `{3,1,2}`, RETURNED `{3,3,0}` |

## BF-SALE — Đơn bán (`sale-cancel.e2e.test.js`)

| ID | Case | Steps | Expected |
|---|---|---|---|
| BF-SALE-01 | Bán xong ngay khi tạo | sale 2 × 120.000, stock 5 | status COMPLETED; Δ collected = pickupAndSale = orderValue +240.000, outstanding 0, new +1; stock `{3,3,0}`; amountDue 0 |
| BF-SALE-02 | Giảm giá theo số tiền | 3 × 99.000 − 17.000 | total 280.000; Δ collected = orderValue 280.000 |
| BF-SALE-03 | Đơn bán không giữ cọc / thế chân | send D and S | stored 0 |
| BF-SALE-04 | Huỷ đơn bán đã xong | cancel | Δ collected −A, refunds +A, orderValue −A, cancelled +1; gone from topProducts and the ranking; stock back; customer summary `{1, 0}` |

## BF-CANC — Huỷ đơn (`sale-cancel.e2e.test.js`)

| ID | Case | Steps | Expected |
|---|---|---|---|
| BF-CANC-01 | Huỷ đơn đặt có cọc | A, D 200.000, cancel | Δ collected −D, refunds +D, orderValue −A, outstanding = atPickup −(A − D), cancelled +1; not in rankings; slot free (effectivelyAvailable 1); "Đã chi" 0 |
| BF-CANC-02 | Đơn huỷ vẫn là "đơn mới" của ngày tạo | create + cancel | new +1, series newOrderCount +1, cancelled +1, orderValue 0 (current rule, Q2) |
| BF-CANC-03 | **Known bug #503** Huỷ sau khi giao cùng ngày | A 300.000, D 100.000, S 400.000; PICKUPED; CANCELLED | Δ collected 0, totalRevenue 0, held 0 (today: collected −300.000) |
| BF-CANC-04 | Huỷ sau khi giao trả hàng về kho | qty 2, PICKUPED, CANCELLED | `{2,0,2}` → `{2,2,0}`; available |
| BF-CANC-05 | Đơn huỷ không mở lại | CANCELLED → RESERVED/PICKUPED/RETURNED | 400 |

## BF-DUP — Trùng đơn (`overbooking.e2e.test.js`)

| ID | Case | Steps | Expected |
|---|---|---|---|
| BF-DUP-01 | Bấm 2 lần / gửi lại (#341) | same body twice in parallel + once more | one order id; customer has 1 order; Overview counts it once |
| BF-DUP-02 | Cùng Idempotency-Key | key `[A-Za-z0-9_-]{8,128}`, second body differs | first order returned |
| BF-DUP-03 | Tồn 1, ngày đã đặt | book, check single + batch | isAvailable false, effectivelyAvailable 0, conflict = that order number |
| BF-DUP-04 | Đơn thứ 2 chồng ngày | stock 1, POST overlapping order | **200 accepted** (no server guard, Q1); availability: conflictingQuantity 2, effectivelyAvailable 0 |
| BF-DUP-05 | Cộng số lượng các đơn | stock 3; qty 2 then qty 1 | qty 1 ok (1 left), qty 2 refused; after the 2nd order conflictingQuantity 3 |
| BF-DUP-06 | Ngày kề nhau không trùng | book X..X+1 | X+2.. and ..X−1 free; X+1.. and ..X clash; next-day order ok |
| BF-DUP-07 | Lấy và trả cùng ngày vẫn chiếm ngày đó | book X..X | X busy, X±1 free |
| BF-DUP-08 | Trả hoặc huỷ thì trống lại | pickup → return; book → cancel | free again, effectivelyAvailable 1 |
| BF-DUP-09 | Sửa đơn không tự trùng với chính nó | `excludeOrderId` | available |
| BF-DUP-10 | Đơn ở chi nhánh khác | order at the other outlet | this outlet still available |

## BF-QTY — Giảm / tăng số lượng (`order-edit.e2e.test.js`)

| ID | Case | Steps | Expected |
|---|---|---|---|
| BF-QTY-01 | Giảm 3 → 1 khi đang đặt | DAILY 70.000 × 2 days, D 50.000 | total 140.000, line `{1, 70.000, 140.000, 2}`; Δ orderValue = outstanding −280.000, collected 0; 2 free; amountDue 90.000 |
| BF-QTY-02 | Tăng quá tồn | stock 3, qty 2 → 4 | cart check (excludeOrderId) qty 4 refused, qty 3 ok; PUT accepted (Q1) |
| BF-QTY-03 | Giảm tồn kho dưới số đã đặt | stock 2, booked 2, PUT stock 1 | accepted; window effectivelyAvailable 0; other day 1 |
| BF-QTY-04 | **Known bug #504** Giảm số lượng khi đang thuê | qty 2 PICKUPED → edit qty 1 → RETURNED | stock `{2,2,0}` (today `{2,1,1}`) |

## BF-EDIT — Sửa đơn (`order-edit.e2e.test.js`)

| ID | Case | Steps | Expected |
|---|---|---|---|
| BF-EDIT-01 | Đổi khách | RESERVED, customerId → new | old summary `{0, 0}`, new `{1, A}`; Overview Δ 0 |
| BF-EDIT-02 | Đổi ngày (dài hơn) | DAILY 40.000 + FIXED 150.000, 3 → 5 days | total 350.000; daily line 200.000 rentalDays 5, fixed 150.000 rentalDays 1; Δ orderValue = outstanding +80.000, new 0; new last day busy, next free |
| BF-EDIT-03 | Cùng ngày = 1 ngày | 3 days → same day | total 40.000, rentalDuration 1, rentalDays 1 |
| BF-EDIT-04 | Dời sang ngày đã kín | cart check vs PUT | check refuses; PUT accepted (Q1) |
| BF-EDIT-05 | Thêm / bớt dòng | +line 90.000, then remove the first | totals 200.000 → 90.000; Δ ±; removed product leaves the ranking and its stock frees |
| BF-EDIT-06 | Sửa giá dòng chỉ cho đơn này | catalog 200.000, line 150.000 → 120.000 | order 120.000; catalog stays 200.000 |
| BF-EDIT-07 | Giảm giá số tiền và % | 99.999 − 9.999 → 10% | discountType amount → percentage, value 10, amount 10.000 (rounded); Δ orderValue −1 |
| BF-EDIT-08 | Đổi tiền cọc | D 100.000 → 250.000 | Δ collected = deposits +150.000, outstanding −150.000; amountDue A − 250.000 |
| BF-EDIT-09 | Đổi thế chân trước khi giao | S 200.000 → 500.000 | amountDue A + S; Overview Δ 0 |
| BF-EDIT-10 | Ghi chú không đổi tiền | notes | Δ 0, totals same |
| BF-EDIT-11 | **Known bug #505** Gia hạn khi đang thuê | A 300.000, S 500.000, extend +100.000 | refundDue 400.000 and pickup-day collected unchanged (today refundDue 500.000) |
| BF-EDIT-12 | Trả trễ, phí trễ | DAILY 50.000, return 2 days late, L 100.000 | amountDue 100.000; return day Δ collected = fees +100.000 |
| BF-EDIT-13 | Sửa sau khi giao / đơn đã đóng | PUT on PICKUPED, RETURNED, CANCELLED, COMPLETED | all edits 200 (Q3); status back-moves 400 |

## BF-OVR — Tổng quan khớp nhau (`overview.e2e.test.js`)

| ID | Case | Expected |
|---|---|---|
| BF-OVR-01 | Đẳng thức nội bộ (today, 7 days) | deposits + pickupAndSale + fees − refunds = collected; atPickup + overdue = outstanding; totalRevenue − collected = received − returned; Σ series = headline; growth.current = headline; income/daily Σ = period |
| BF-OVR-02 | Một ngày kinh doanh | 4 orders (booked 280.000 D 50.000; picked up 140.000 S 300.000; sale 135.000; booked+cancelled D 10.000) → Δ collected 325.000, orderValue 555.000, outstanding = atPickup 230.000, deposits 60.000, pickupAndSale 275.000, refunds 10.000, received = held 300.000, new 4, pickups 1, cancelled 1; "Đã chi" excludes cancelled; renting 1; list by product |
| BF-OVR-03 | Top sản phẩm: tile vs drill-down | rent qty 3 + sale qty 1 + cancelled qty 2 → tile rentalCount 1 / saleCount 1 (lines, #429), drill-down rentalCount 3 / saleCount 1 / quantity 4 (units), revenue 4 × price both; first in today's list |
| BF-OVR-04 | **Known bug #506** Top khách: thế chân không phải chi tiêu | totalSpent = A (today A + S) |
| BF-OVR-05 | Top khách: đếm đơn, bỏ đơn huỷ | orderCount 2, rentalCount 1, saleCount 1, totalSpent A + 1.000 |
| BF-OVR-06 | Tăng trưởng so với kỳ trước | yesterday vs today: growth.collected.previous = yesterday's collected, growth = percentChange; same for orderValue |
| BF-OVR-07 | Thu theo ngày = biểu đồ | pickup day Δ collected 130.000, return day 15.000, collateral 100.000 in/out; income/daily = series per day |
| BF-OVR-08 | Thế chân đang giữ / sẽ nhận | cash.collateralToCollect +250.000 (1), depositsHeld +400.000 (1); back after return/cancel |
| BF-OVR-09 | Dự kiến thu theo ngày giao, giá trị đơn mới (#605) | future RESERVED 140.000, D 50.000, S 300.000 → pickup day Δ expectedCollected 90.000 (no collateral), futureIncome 0; today Δ Σ newOrderValue 140.000 = totalOrderValue identity; orderValueByType.rent +140.000 (1), rent + sale = totalOrderValue; after cancel both back |

## BF-DAY — Ngày giờ Việt Nam (`vn-days.e2e.test.js`, run under TZ=UTC and TZ=Asia/Ho_Chi_Minh)

| ID | Case | Expected |
|---|---|---|
| BF-DAY-01 | Giao lúc 06:30 VN (= 23:30 UTC hôm trước) | counted on the VN day (collected, pickups, income/daily RENT_PICKUP), not the UTC day |
| BF-DAY-02 | Trả 23:30 VN và 00:15 VN | 23:30 stays on R, 00:15 is R + 1 |
| BF-DAY-03 | Đơn tạo bây giờ | new order of the VN today (and not of the UTC date when they differ) |
| BF-DAY-04 | Kiểm tra trống theo ngày VN, kể cả cửa sổ UTC của app cũ | UTC window of X busy, X − 1 and X + 1 free; `date=X` busy |
| BF-DAY-05 | Lịch theo ngày | by-date RESERVED on X, not X − 1; returns on the return day; month count has it |
| BF-DAY-06 | Quá ngày lấy | pickup planned yesterday → overduePickup, today 00:00 VN → atPickup |

## BF-RT — Ngày chọn lúc tạo đơn = ngày đọc lại ở mọi nơi (`date-roundtrip.e2e.test.js`, #573)

Owner: "lúc tạo đơn chọn ngày này nọ thì lúc load về, check calendar có chuẩn không". Every RENT order is created
with the pickup / return instants one client really sends, then read back on every endpoint; each read is compared
with the chosen Vietnam day keys P (pickup) and R (return). Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.

Clients (what `POST /api/orders` receives for VN days P..R):

| Client | pickupPlanAt | returnPlanAt | Source |
|---|---|---|---|
| `web` (Tạo đơn, JSON) | 00:00 VN of P (`P-1T17:00:00.000Z`) | 00:00 VN of R | `create-model.ts` `dayStartIso` |
| `ios` (multipart, sends `rentalDuration`) | start of P in the device zone, UTC ISO with ms | `R T16:59:59.000Z` (23:59:59 VN) | `RCExtentions.swift` `dateServerISOString`, `Cart.swift` |
| `android` (device zone Asia/Ho_Chi_Minh) | same as iOS | same as iOS | `OrderPlanDays.kt` |
| `oldAndroid` (cart before #413, still installed) | `P T00:00:00Z` | `R T23:59:00Z` | #413 |

Windows (one describe per client × window, product DAILY stock 1):

| ID | Window |
|---|---|
| BF-RT-01 | same day P = R (1 day) |
| BF-RT-02 | one night (2 days) |
| BF-RT-03 | cross-month 30/09/2027 → 02/10/2027 |
| BF-RT-04 | cross-year 31/12/2026 → 01/01/2027 |
| BF-RT-05 | 30 days |
| BF-RT-06 | in the past (today − 10 → today − 8) |
| BF-RT-07 | pickup today, return tomorrow |
| BF-RT-08 | pickup and return today |

Checks per case (`BF-RT-<nn>-<client> <check>`):

| Check | Expected |
|---|---|
| detail | `GET /api/orders/{id}`, `/by-number/{n}` and the create response: VN day of pickupPlanAt = P, of returnPlanAt = R; `rentalDuration` = item `rentalDays` = inclusive days |
| list | `GET /api/orders?customerId&dateField=pickupPlanAt&startDate=P&endDate=P` has it, P ± 1 not; same with `returnPlanAt` on R, R ± 1; `status=RESERVED` created today row carries P and R |
| calendar day | `GET /api/calendar/orders/by-date?date=P` (also `status=RESERVED`, `timeZone`) lists it; P − 1, P + 1 do not |
| calendar month | `GET /api/calendar/orders/count?month&year` (with and without `timeZone`): Δ only on P: count +1, pickups +1, returns 0 |
| availability | `POST /api/products/batch-availability` with the web day window: held on P..R (first 3 days and R), free on P − 1 and R + 1 |
| availability old iOS | same with the App Store iOS window `X T00:00:00.000Z … X T23:59:59.999Z` |
| availability old Android | same with the pre-#413 Android window `X T00:00:00Z … X T23:59:59Z` |
| today work (RT-07, RT-08) | `GET /api/analytics/outlet-operations` (with and without `timeZone`): `date` = today, pickupsToday +1 and lists it |
| edit | `PUT /api/orders/{id}` with the same instants + notes: days unchanged, still on by-date P |
| after hand-over | PICKUPED: by-date `kind=return` lists it on R, not R ± 1; month count Δ pickups −1 on P, returns +1 on R |

Extra cases:

| ID | Case | Expected |
|---|---|---|
| BF-RT-09a | pickup 00:30 VN, return 06:59 VN (both on the UTC day before) | VN days P, R; by-date P not P − 1; held P..R only |
| BF-RT-09b | the 17:00Z boundary | `P-1T17:00:00.000Z` → `R T16:59:59.999Z` is P..R; one ms earlier on both ends is P − 1..R − 1 |

Known bugs (`test.failing`):

- **#575** `availability old iOS` (all clients): the day before P reads busy (batch route uses `lte` on the exclusive civil-day end).
- **#576** `availability old Android` (web, ios, android orders): `T23:59:59Z` without ms is not read as a UTC-day window.
- **#577** `oldAndroid` detail, list, availability, edit, after hand-over: `R T23:59:00Z` is R + 1 in Vietnam, stored as is.

## WEB-RT — Shop web: chọn ngày ở Tạo đơn, đọc lại trên mọi màn hình (`tests/e2e/web/date-roundtrip.web.js`, #573)

Browser e2e (playwright-core, Chrome for Testing), run by `scripts/e2e/web-e2e.sh` against a local API + shop web, in
browser zones **Asia/Ho_Chi_Minh, UTC, America/Los_Angeles** (a device outside Vietnam must still see the shop's days),
light theme, 1440 × 900. A fresh product (FIXED, stock 3) and customer per run; every created order is cancelled.

| ID | Window |
|---|---|
| WEB-RT-01 | pickup today, return tomorrow |
| WEB-RT-02 | same day (today + 2) |
| WEB-RT-03 | pickup tomorrow, 3 days |
| WEB-RT-04 | cross-month (last day of the month → + 2) |
| WEB-RT-05 | no order: browser clock 2026-10-05T16:30Z (23:30 VN), `/dashboard`, fast-forward 1 h + focus (#589) |

| Check | Expected |
|---|---|
| create | click P then R in the range calendar (same day: P twice), summary "T5 08/10 → T7 10/10 · 3 ngày", add product, pick customer, Tạo đơn (accept a confirm dialog if any); POST body pickupPlanAt / returnPlanAt = 00:00 VN of P / R; saved VN days P, R |
| order page | progress "Giao đồ" = P label, "Trả đồ" = R label (`T5 08/10`, also with "Hôm nay · ") |
| edit | Sửa đơn opens with "Giao P → Trả R · N ngày" |
| list | `/orders?q=<n>` row "Giao P · trả R" |
| calendar month | `/calendar` cell aria "d/m, giao N": Δ +1 on P only (P ± 1, R, R + 1 unchanged) |
| calendar day | day panel P "Cần giao" lists `#n` with "trả R" (same day: "giao và trả trong ngày"); P ± 1 do not |
| availability | `/availability` (product picked in the search box), per-day "còn": stock − 1 on P..R, stock on P − 1 and R + 1 |
| availability deep link (first case of each zone, 5 loads) | `/availability?productId=` (product page button) opens the product on every load (#579, fixed in #589) |
| dashboard (WEB-RT-01, 03) | "Hôm nay" card label = today (VN); P = today: "Cần giao" total (done/total) +1 and lists `#n`; P = tomorrow: "Ngày mai · <label>" Giao +1, today +0 |
| today rolls over (WEB-RT-05) | dashboard subtitle "T2 05/10" at 23:30 VN; after 1 h + focus "T3 06/10" and `GET /api/analytics/period?startDate=2026-10-06` (#589, WEB-2) |
| after hand-over | PICKUPED via API: calendar Δ "trả" +1 on R only; R panel "Cần nhận trả" lists it, R + 1 does not |

## BF-SCOPE / BF-NUM — Phạm vi, quyền, mã đơn (`scope-roles.e2e.test.js`)

| ID | Case | Expected |
|---|---|---|
| BF-SCOPE-01 | Merchant khác không sửa được đơn | PUT, PUT status, PATCH status 403; by-number 403/404; order unchanged |
| BF-SCOPE-02 | Merchant khác không thấy | not in its search; product availability, product, customer orders 403/404 |
| BF-SCOPE-03 | Tổng quan merchant khác không đổi | Δ 0 there while this merchant sells 77.000 |
| BF-SCOPE-04 | OUTLET_STAFF không sửa giá | PUT product 403; price unchanged |
| BF-SCOPE-05 | OUTLET_STAFF chỉ chi nhánh mình | create at own outlet 200, other outlet 403; hand-over own order 200 |
| BF-SCOPE-06 | Không lộ CUID | no `c[a-z0-9]{24}` string in order, list row, product, period, availability, customer orders, operations, login user; ids are integers |
| BF-NUM-01 | Mã đơn 6 chữ số ngẫu nhiên | 12 orders: `^[1-9]\d{5}$`, unique; search and `/api/orders/by-number/{n}` find it |

## BF-STAFF — Quyền nhân viên chi nhánh (`staff-permissions.e2e.test.js`, #635)

Matrix = `ROLE_PERMISSIONS['OUTLET_STAFF']` (`packages/auth/src/permissions.ts`). Allowed calls return 2xx; denied
calls return 403 and the data read back as the merchant is unchanged. BF-SCOPE-04/05 cover price edit and own outlet.

| ID | Case | Calls (as staff) | Expected |
|---|---|---|---|
| BF-STAFF-01 | Xem chi nhánh mình | `GET /api/outlets` | 200, only its outlet |
| BF-STAFF-02 | Xem sản phẩm, không thấy giá vốn | `GET /api/products?search`, `GET /api/products/{id}` | 200; no `costPrice` |
| BF-STAFF-03 | Thêm sản phẩm không có giá | `POST /api/products` (name, stock at own outlet) | 200; rentPrice = salePrice = 0, stock 2 |
| BF-STAFF-04 | Không sửa sản phẩm | `PUT /api/products/{id}`, `PUT /api/merchants/{m}/products/{id}` (name, stock) | 403; name and stock unchanged |
| BF-STAFF-05 | Không xoá sản phẩm | `DELETE /api/products/{id}`, `POST /api/products/batch-delete` | 403; product still there |
| BF-STAFF-06 | Không xuất / nhập sản phẩm | `GET /api/products/export`, `POST /api/products/bulk-import` | 403; nothing imported |
| BF-STAFF-07 | Xem danh mục để chọn | `GET /api/categories` | 200, lists the merchant's category |
| BF-STAFF-08 | Không thêm danh mục | `POST /api/categories` | 403; not created |
| BF-STAFF-09 | Không đổi tên / xoá danh mục | `PUT`, `DELETE /api/categories/{id}` | 403; name unchanged, still listed |
| BF-STAFF-10 | Xem và sửa đơn chi nhánh mình | `GET /api/orders?search`, `GET /api/orders/{id}`, `PUT /api/orders/{id}` notes | 200; notes saved |
| BF-STAFF-11 | Không xoá đơn | `DELETE /api/orders/{id}`, `POST /api/orders/batch-delete` | 403; order still RESERVED |
| BF-STAFF-12 | Không xuất đơn | `GET /api/orders/export` | 403 |
| BF-STAFF-13 | Xem, thêm, sửa khách | `GET /api/customers?search`, `POST /api/customers`, `PUT /api/customers/{id}` | 200; edit saved |
| BF-STAFF-14 | Không xuất khách | `GET /api/customers/export` | 403 |
| BF-STAFF-15 | Tổng quan hôm nay, thu theo ngày | `today-metrics`, `dashboard`, `outlet-operations`, `income/daily` | 200 |
| BF-STAFF-16 | Không xem phân tích đầy đủ | `top-products`, `top-customers`, `period`, `income`, `growth-metrics`, `analytics/orders`, `recent-orders` | 403 |
| BF-STAFF-17 | Không quản lý nhân viên | `GET /api/users`, `POST /api/users` | 403; user not created |
| BF-STAFF-18 | Không sửa tài khoản ngân hàng | `POST`, `PUT`, `DELETE /api/merchants/{m}/outlets/{o}/bank-accounts[/{id}]` | 403; count and holder name unchanged |
| BF-STAFF-19 | Không đổi thông tin cửa hàng | `PUT /api/settings/merchant` name, `PUT /api/settings/currency`, `PUT /api/merchants/{m}` | 403; name, currency unchanged |
| BF-STAFF-20 | Không đổi "Cho tạo đơn khi trùng lịch" | `PUT /api/settings/merchant` `allowOverlappingOrders` | 403; setting unchanged |
| BF-STAFF-21 | Không sửa chi nhánh | `PUT /api/outlets?id=`, `PUT /api/merchants/{m}/outlets/{o}` | 403; name unchanged |
| BF-STAFF-22 | Không sửa chi nhánh qua cài đặt (#636) | `PUT /api/settings/outlet` name, address | 403; unchanged |
| BF-STAFF-23 | Xem gói dịch vụ | `GET /api/subscriptions/status` | 200 |
| BF-STAFF-24 | Không đổi gói | `PUT /api/merchants/{m}/plan`, `POST /api/subscriptions` | 403; planId unchanged |
| BF-STAFF-25 | Xem chương trình khách thân thiết | `GET /api/loyalty/program` | 200 |
| BF-STAFF-26 | Tìm bằng ảnh: không thấy giá vốn, chỉ sản phẩm chi nhánh mình (#653) | `POST /api/products/searchByImage` | 200; no `costPrice`; only products stocked at its outlet, also on a cache hit. Not run here (needs the Python embedding service): covered by unit test `tests/api/image-search-scope.test.ts` |

## Questions for the owner (current behaviour asserted)

- **Q1** No server-side stock check: POST and PUT `/api/orders` accept a booking or edit that overbooks (BF-DUP-04,
  BF-QTY-02, BF-EDIT-04). Only the apps' availability check stops it. Keep (shops may overbook on purpose) or reject?
- **Q2** A booking cancelled later still counts as a "new order" of its creation day (BF-CANC-02, #484 rule).
- **Q3** RETURNED, CANCELLED and COMPLETED orders accept any edit through PUT, including `totalAmount` (BF-EDIT-13).
- **Q4** The API stores the app's totals without re-pricing (BF-PRICE-08).
- **Q5** No order payment endpoint exists (only `payments[]` read on order detail), so partial payments and
  overpayment are not testable through the API; `amountDue` on `POST /api/orders` is `total − loyalty`, while list
  rows use `computeOrderBalance` (`total − deposit + collateral − paid`).
- **Q6** Seed account emails follow row ids (`merchant<id>@`), so they change on every reseed of the same database.
