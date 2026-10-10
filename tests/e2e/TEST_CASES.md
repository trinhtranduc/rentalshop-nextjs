<!-- CATALOGUE-V2 -->
# Danh mục test e2e — một nơi duy nhất (#498, #727)

Tài liệu này là danh mục đầy đủ của mọi test e2e của AnyRent: API, shop web, iOS, Android. Mỗi ca có ID, file chạy nó
và trạng thái. Khi thêm một luật hay một màn hình mới, thêm ca vào đây và vào file test cùng một PR.

**Trạng thái dùng trong tài liệu:** *tự động* (chạy được, có kết quả), *known bug #N* (test khẳng định luật đúng và
đang fail có chủ đích vì lỗi #N; `BIZ_E2E_SHOW_BUGS=1` cho thấy số thật), *đã viết, chưa chạy* (có code, chưa có kết
quả trên máy), *chưa viết* (còn thiếu, kèm lý do).

## Kết quả lần chạy gần nhất (2026-10-10, nhánh `test/full-e2e-cases` đã gộp `dev`)

| Tầng | Kết quả |
|---|---|
| API (`business-e2e.sh`, 18 suite, 655 ca) | UTC: 583 đạt, 0 lỗi, 71 known-bug. Asia/Ho_Chi_Minh: 583 đạt, 0 lỗi, 71 known-bug. 71 = 56 (#577) + #504, #505, #506 + #728 ×3 + #729 ×3 + #730..#732 (staff và kho, 6 ca) |
| Web: số liệu Tổng quan (`dashboard-stats.web.js`, 4 kỳ) | 156 đạt, 0 lỗi |
| Web: vai trò, gói, tồn, lịch, việc cần làm | roles 63 đạt / 4 known, plan 77 đạt / 11 known, stock 17/17 |
| Web: từng tính năng giao diện (`--ui`) | 632 đạt, 0 lỗi, 8 known |
| iOS | lượt đầy đủ trước đó: 25 đạt, 7 fail (xem mục iOS); các test mới và 7 ca fail đang được chạy lại, kết quả cập nhật ở mục MOB |
| Android | số liệu Báo cáo khớp API (kỳ 7 ngày); các luồng khác đang được chạy lại |

## Lệnh chạy

| Tầng | Lệnh | Ghi chú |
|---|---|---|
| API (nghiệp vụ, vai trò, gói, tồn, lịch, báo cáo) | `scripts/e2e/business-e2e.sh [--build] [--no-seed] [--tz "UTC Asia/Ho_Chi_Minh"] [-- <jest args>]` | Seed DB cục bộ `anyrent_business_e2e`, mở API cổng 3190, chạy hai múi giờ. Cần `tests/node_modules` và API đã build (`--build` hoặc `E2E_API_DIR`). In passed / failed / known-bug mỗi múi giờ. |
| Web: số liệu Tổng quan | `node tests/e2e/web/dashboard-stats.web.js` (env `WEB_E2E_*`) | 4 kỳ: hôm nay, 7 ngày, tháng này, tháng trước; thẻ, ngăn kéo, danh sách đơn liên quan. |
| Web: vai trò, gói, tồn, lịch, việc cần làm | `scripts/e2e/web-e2e.sh --roles \| --plan \| --stock \| --accounts [--only ID,ID] --headed` | Cần client chạy từ thư mục `.next` riêng (xem mục WEB). |
| Web: ngày chọn lúc tạo đơn | `scripts/e2e/web-e2e.sh` (WEB-RT) | |
| Web: giao diện từng tính năng | xem mục WEB-UI | |
| iOS | `scripts/mobile-e2e/ios-e2e.sh [--fresh] [--account merchant\|staff\|inventory] [--scenario <slug> --role owner\|staff\|kho] [--only <test>] [--lang vi\|en]` | Simulator hiện cửa sổ. Sau đó chạy các checker `tests/e2e/mobile/*-check.js` trên `merchant-xcodebuild.log`. |
| Android | `scripts/mobile-e2e/android-e2e.sh [--fresh]`, rồi `tests/e2e/mobile/android-overview.sh`, `android-flows.sh` | AVD riêng, cổng riêng. Chạy `android-overview-api.js` TRƯỚC (phiên đăng nhập duy nhất). |
| Unit test liên quan | `cd tests && yarn jest web-overview revenue-calculator error-codes-translated`; iOS `OverviewDashLogicTests`; Android `./gradlew :app:testDebugUnitTest --tests 'com.anyrent.pos.domain.overview.*'` | |

Quy tắc chung: tài nguyên riêng (DB, cổng, simulator, AVD) cho mỗi lượt chạy; không dùng `vm_pos`/`vm_kitchen` hay
cổng 5554/5556; đăng nhập một phiên mỗi tài khoản (đăng nhập ở nơi khác sẽ đá app ra, kể cả `curl`); đăng nhập bị
giới hạn khoảng 10 lần / 15 phút / IP.

## Bản đồ phủ: câu hỏi của chủ cửa hàng → ca test

| Câu hỏi | API | Web | iOS | Android |
|---|---|---|---|---|
| Sản phẩm còn lại bao nhiêu sau khi tạo đơn bán và thuê | BF-STOCK-01..14, BF-INV-10..17, BF-DUP, BF-QTY | WEB-STOCK-01..08 | `test1bHomeStockLines` + `home-stock-check.js`; MOB-STOCK-01..04 (đã viết, chưa chạy) | MOB-STOCK (chưa chạy) |
| Lịch còn trống có đúng không | BF-AV-01..07, BF-CAL-01..11, BF-DAY-04..05, BF-RT | WEB-CAL-01..05 | `test6Calendar`; MOB-CAL-01..03 (đã viết, chưa chạy) | MOB-CAL (script, chưa chạy) |
| Chi tiết đơn xem số lượng đúng | BF-DET-01..06, BF-QTY, BF-EDIT, BF-RT | WEB-STOCK-07 | `test5eDetailItemRows`; MOB-DETAIL-01 (đã viết, chưa chạy); MOB-DETAIL-02 chưa viết | chưa chạy |
| Việc cần làm đúng không | BF-TODO-01..13, BF-ROLE-05 | WEB-TODO-01..09, WEB-ROLE-04/05 | `test7jTodayWorkAndNotPickedUp` (đang fail, xem mục iOS), MOB-TODO-01..02 (đã viết, chưa chạy) | `android-overview.sh` (thẻ Hôm nay), MOB-TODO (script, chưa chạy) |
| Tạo đơn chỗ hết hàng, còn lại bao nhiêu | BF-CART-01..10, BF-DUP-01..10, BF-INV-13 | WEB-STOCK-04, -06 | `test7eOverlapSetting`, `test8cOverlapTagAndRoleSheet`, `test8dCartLines`; MOB-STOCK-05..08 | chưa chạy |
| Báo cáo chuẩn chưa | BF-OVR-01..09, BF-STAT-01..04, BF-CASH-01..05, BF-OUT-01..03 | `dashboard-stats.web.js` (4 kỳ), WEB-DASH-01..05 | `test7kOverviewTiles`, `test7lOverviewSheets` + `overview-sheets-check.js` | `android-overview-api.js` + `android-overview.sh` |
| Tài khoản hết hạn, hết gói, chạm giới hạn gói | BF-SUB-01..58 | WEB-SUB-01..27 | MOB-SUB-01..10 (đã viết, chưa chạy) | MOB-SUB: expired-trial, paused, past-due của owner chạy một phần |
| Tài khoản staff | BF-STAFF-01..26, BF-ROLE (-staff), BF-SCOPE | WEB-ROLE (staff) | `test8StaffRestrictions`, `test8bStaffNoHistory`, `test8eRoleScreens` | chưa chạy |
| Tài khoản kho | BF-INV-01..17, BF-ROLE (-kho) | WEB-ROLE (kho) | `test8bInventoryRole`, `test8eRoleScreens` | chưa chạy |
| Không hiện mã lỗi thô | `tests/error-codes-translated.test.ts` (PR #743) | bộ dò khoá thô trong WEB-ROLE, WEB-SUB, WEB-UI | `rawKeys` trong `test8e`, `test10*` | quan sát tay (không thấy mã thô) |
| Mọi tính năng giao diện web | — | WEB-UI | — | — |

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
| BF-CANC-03 | Huỷ sau khi giao cùng ngày (#503, fixed) | A 300.000, D 100.000, S 400.000; PICKUPED; CANCELLED | Δ collected 0, totalRevenue 0, held 0 (today: collected −300.000) |
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
| BF-OVR-04 | Top khách: thế chân không phải chi tiêu (#506, đã sửa) | totalSpent = A |
| BF-OVR-05 | Top khách: đếm đơn, bỏ đơn huỷ | orderCount 2, rentalCount 1, saleCount 1, totalSpent A + 1.000 |
| BF-OVR-06 | Tăng trưởng so với kỳ trước | yesterday vs today: growth.collected.previous = yesterday's collected, growth = percentChange; same for orderValue |
| BF-OVR-07 | Thu theo ngày = biểu đồ | pickup day Δ collected 130.000, return day 15.000, collateral 100.000 in/out; income/daily = series per day |
| BF-OVR-08 | Thế chân đang giữ / sẽ nhận | cash.collateralToCollect +250.000 (1), depositsHeld +400.000 (1); back after return/cancel |
| BF-OVR-09 | Dự kiến thu theo ngày giao, giá trị đơn mới (#605) | future RESERVED 140.000, D 50.000, S 300.000 → pickup day Δ expectedCollected 90.000 (no collateral), futureIncome 0; today Δ Σ newOrderValue 140.000 = totalOrderValue identity; orderValueByType.rent +140.000 (1), rent + sale = totalOrderValue; after cancel both back |

## BF-FIX — Sửa lỗi nhỏ của API (`small-fixes.e2e.test.js`, #739 #742)

| ID | Case | Expected |
|---|---|---|
| BF-FIX-01 | Đơn đã xoá (#739) | huỷ rồi `DELETE`: theo id 404 `ORDER_NOT_FOUND`, theo số 404, danh sách rỗng, `/qr-code` 404, xoá lần hai 404, đổi trạng thái 404 (trước đó theo id vẫn 200) |
| BF-FIX-02 | Đơn đã huỷ chưa xoá | theo id vẫn 200, status CANCELLED |
| BF-FIX-03 | Tạo sản phẩm với barcode `""`, `"   "`, `""` (#742) | cả ba tạo được, barcode đọc lại NULL |
| BF-FIX-04 | Sửa hai sản phẩm không mã vạch, gửi `barcode: ""` | cả hai 200 (trước đó cái thứ hai 409), barcode NULL |
| BF-FIX-05 | Mã vạch thật trùng | tạo và sửa trùng vẫn 409 `DUPLICATE_ENTRY`; gửi `""` đổi mã thành NULL |
| BF-FIX-06 | Migration dữ liệu `20261010100000_product_blank_barcode_to_null` | `''` và `'  '` thành NULL, mã thật giữ nguyên (cần `E2E_DATABASE_URL`) |

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

## BF-INV — Nhân viên kho OUTLET_INVENTORY (`inventory-role.e2e.test.js`, #682)

Kho = staff (own outlet, no revenue) + quản lý sản phẩm và danh mục. Matrix = `ROLE_PERMISSIONS['OUTLET_INVENTORY']`.

| ID | Case | Expected |
|---|---|---|
| BF-INV-01 | Đăng nhập | login carries the product keys and no revenue key |
| BF-INV-02 | Thêm sản phẩm có giá và giá vốn | created at its outlet; sees `costPrice` |
| BF-INV-03 | Sửa tên, giá, tồn; xoá sản phẩm của chi nhánh | all 2xx; changes read back |
| BF-INV-04 | Sản phẩm chi nhánh khác / chưa có tồn ở chi nhánh | cannot edit or delete |
| BF-INV-05 | Xuất và nhập hàng loạt | export and bulk-import work |
| BF-INV-06 | Danh mục | adds, renames, deletes a category of its merchant |
| BF-INV-07 | Báo cáo | no revenue analytics (403), like staff |
| BF-INV-08 | Người dùng, xoá đơn | cannot list or create users, cannot delete orders |
| BF-INV-09 | Gán vai trò kho | allowed unless `INVENTORY_ROLE_ENABLED=false`; app-config says which |
| BF-INV-10 | Tồn sau khi tạo sản phẩm | stock = available at its outlet, nothing renting |
| BF-INV-11 | Sửa tồn khi đang có đơn thuê | available = stock − renting, for kho and merchant alike |
| BF-INV-12 | Tồn trống | single and cart-batch availability read the same as for the merchant |
| BF-INV-13 | Trùng đơn | overlaps allowed: a second booking passes and both count; overlaps off: 409 |
| BF-INV-14 | Lấy và trả cùng ngày | holds that day only |
| BF-INV-15 | Giao và nhận lại | the slot and the stock come back |
| BF-INV-16 | Chi nhánh khác | cannot book at, or set stock of, another outlet |
| BF-INV-17 | Giảm tồn dưới số đơn đang thuê | same result for kho as for the merchant |

## BF-AV — Tồn trống theo ngày Việt Nam, mọi phiên bản app (`availability-vn-days.e2e.test.js`, #575 #576)

Each case runs for every client flavour: `web`, `app`, `appStoreIosOrderCheck`, `appStoreIosCart`, `currentApps`, `oldAndroid`, `adminUtcBrowser` (the date windows each build sends).

| ID | Case | Expected |
|---|---|---|
| BF-AV-01 | `GET /api/products/availability?date=k` (iOS App Store) | reads VN day k |
| BF-AV-02 | `?pickupDate&returnDate` | reads VN days |
| BF-AV-03 | `batch-availability`, windows of one day | read VN day k |
| BF-AV-04 | Windows of many days | next to an order: free; touching it: busy |
| BF-AV-05 | batch `date=k` | reads VN day k |
| BF-AV-06 | Ranh giới 17:00Z | 17:00:00.000Z is the next VN day, 16:59:59.999Z is not |
| BF-AV-07 | Hình dạng response | unchanged (fields old apps decode) |

## BF-CASH — Tiền trong tay gồm thế chân (`cash-on-hand.e2e.test.js`, #710 #711)

| ID | Case | Expected |
|---|---|---|
| BF-CASH-01 | Thực thu | `cashCollected` = collected + collateral received − returned |
| BF-CASH-02 | Dự kiến ngày giao | `expectedCash` adds the collateral to receive |
| BF-CASH-03 | Dự kiến ngày trả | `expectedCash` subtracts the collateral to hand back |
| BF-CASH-04 | Theo ngày | Σ `series[].cashCollected` = `revenue.cashCollected` |
| BF-CASH-05 | Giao hôm nay | adds its collateral to that day's cash |

## BF-OUT — Còn phải thu (`outstanding.e2e.test.js`)

| ID | Case | Expected |
|---|---|---|
| BF-OUT-01 | Đơn thuê đã đặt | owes total − deposit; fully deposited owes nothing |
| BF-OUT-02 | Thẻ = danh sách | the tile equals the money of the orders the tap lists (every page) |
| BF-OUT-03 | Ngày khác | orders created on other days are not in the tap |

## BF-STAT — Thẻ Tổng quan = các dòng khi bấm vào (`overview-stats.e2e.test.js`, #707 #721)

| ID | Case | Expected |
|---|---|---|
| BF-STAT-01 | Giá trị đơn mới | rows of status=new add up to `totalOrderValue`; a cancelled order is listed and adds 0 (#707, chủ cửa hàng quyết định ngày 2026-10-09) |
| BF-STAT-02 | Thế chân theo dòng | a hand-over adds its collateral; a same-day hand-over then cancel adds none |
| BF-STAT-03 | Thực thu | revenue of every event (status=all) = `cashCollected` |
| BF-STAT-04 | Thế chân | collateral of every event row = `collateralFlow` received − returned |

## BF-SUB — Tài khoản hết hạn, hết gói, chạm giới hạn gói (`subscription-plan.e2e.test.js`, #727)

Mỗi nhóm tạo riêng gói (Plan), cửa hàng, MERCHANT, OUTLET_STAFF và OUTLET_INVENTORY (kho) bằng psql; không dùng cửa hàng seed. Helper `tests/e2e/helpers/subscription.js` từ chối `E2E_DATABASE_URL` không phải 127.0.0.1/localhost; không có `E2E_DATABASE_URL` thì các nhóm này bị bỏ qua. Login dùng `x-forwarded-for` riêng cho mỗi lần (rate limiter theo header) và header `X-Client-Platform: mobile` như app.
"Mọi vai trò" = merchant, OUTLET_STAFF, kho. Với các dòng trạng thái (01–15): đọc = `GET /api/products`, `/api/orders`, `/api/customers`; ghi = merchant POST sản phẩm và khách, staff POST khách và đơn thuê, kho POST sản phẩm. Trạng thái được phép trả 200/201 và ghi dòng; trạng thái bị chặn trả 403 với mã dưới đây và không ghi gì.

### Trạng thái đăng ký × vai trò

| ID | Case | Expected |
|---|---|---|
| BF-SUB-01 | ACTIVE, còn 30 ngày | mọi vai trò đọc/ghi được; `GET /api/subscriptions/status`: ACTIVE, hasAccess true |
| BF-SUB-02 | TRIAL, còn 14 ngày | như trên, dbStatus TRIAL |
| BF-SUB-03 | ACTIVE, còn 1 giờ | được (tính theo thời điểm, không theo ngày VN), isExpiringSoon true |
| BF-SUB-04 | ACTIVE, hết hạn 1 phút trước | 403 `SUBSCRIPTION_EXPIRED` mọi lệnh, không ghi gì |
| BF-SUB-05 | TRIAL, hết hạn hôm qua | 403 `SUBSCRIPTION_EXPIRED` |
| BF-SUB-06 | ACTIVE, hết hạn 30 ngày trước | 403 `SUBSCRIPTION_EXPIRED` |
| BF-SUB-07 | Status EXPIRED nhưng kỳ còn hạn (status cũ) | được; status endpoint ACTIVE, dbStatus EXPIRED |
| BF-SUB-08 | Status EXPIRED, kỳ đã hết | 403 `SUBSCRIPTION_EXPIRED` |
| BF-SUB-09 | CANCELLED nhưng kỳ còn chạy | được, statusReason "Canceled but access until period end" |
| BF-SUB-10 | CANCELLED, kỳ đã hết | 403 `SUBSCRIPTION_CANCELLED` (không phải EXPIRED) |
| BF-SUB-11 | PAUSED, kỳ còn hạn | 403 `SUBSCRIPTION_PAUSED` |
| BF-SUB-12 | PAUSED, kỳ đã hết | 403 `SUBSCRIPTION_PAUSED` (tạm dừng được kiểm tra trước) |
| BF-SUB-13 | PAST_DUE, kỳ còn hạn | 403 `SUBSCRIPTION_PAST_DUE` |
| BF-SUB-14 | PAST_DUE, kỳ đã hết | 403 `SUBSCRIPTION_EXPIRED` (kỳ được kiểm tra trước nợ) |
| BF-SUB-15 | Không có dòng đăng ký | 403 `NO_SUBSCRIPTION`; thêm dòng đăng ký lại thì 200 |

### Vai trò hệ thống và đường gia hạn

| ID | Case | Expected |
|---|---|---|
| BF-SUB-16 | ADMIN và OPS không bị chặn khi cửa hàng hết hạn | 200; status: EXPIRED, hasAccess false |
| BF-SUB-17 | **Known bug #728** Cửa hàng hết hạn xem trạng thái gói | mong đợi 200 EXPIRED hasAccess false (hiện 403 `SUBSCRIPTION_EXPIRED`) |
| BF-SUB-18 | **Known bug #728** Cửa hàng hết hạn xem danh sách gói để gia hạn (`GET /api/plans`) | mong đợi 200 (hiện 403) |
| BF-SUB-19 | **Known bug #728** Đổi gói / checkout (`change-plan`, `lemonsqueezy/subscription-checkout`) | mã không được là `SUBSCRIPTION_EXPIRED` (hiện là) |

### Đăng nhập và phiên

| ID | Case | Expected |
|---|---|---|
| BF-SUB-20 | Đăng nhập mọi vai trò của cửa hàng hết hạn | 200; `user.merchant.subscription` có status và `currentPeriodEnd` đã qua |
| BF-SUB-21 | Đăng nhập khi PAUSED, CANCELLED (đã hết), PAST_DUE | 200, status nằm trong payload |
| BF-SUB-22 | Đăng nhập khi không có dòng đăng ký | 200, `subscription` null |
| BF-SUB-23 | Token cửa hàng hết hạn bị từ chối ở verify và profile (Q1) | 403 `SUBSCRIPTION_EXPIRED`; profile là 200 trước khi hết hạn |
| BF-SUB-24 | Đăng xuất khi hết hạn; đăng nhập lại sau gia hạn | `LOGOUT_SUCCESS` 200; token mới 200 |

### Phạm vi

| ID | Case | Expected |
|---|---|---|
| BF-SUB-25 | Cửa hàng A hết hạn / tạm dừng / nợ / huỷ; cửa hàng B bình thường | A nhận 403 đúng mã; B 200 trên cả bốn lệnh |
| BF-SUB-26 | Cửa hàng B hết hạn, A có gói riêng | B bị chặn, A được, dòng gói của A không đổi |

### Quyền truy cập theo nền tảng (web / mobile)

| ID | Case | Expected |
|---|---|---|
| BF-SUB-27 | Gói không có cờ nền tảng | web và mobile đều được (mặc định true) |
| BF-SUB-28 | `allowWebAccess` false | web: 403 `PLATFORM_ACCESS_DENIED`, `allowedPlatforms` ["mobile"]; mobile được |
| BF-SUB-29 | `allowMobileAccess` false | mobile: 403 `PLATFORM_ACCESS_DENIED`, không ghi dòng; web được |
| BF-SUB-30 | Cả hai cờ false | cả hai 403 `PLATFORM_ACCESS_DENIED` |
| BF-SUB-31 | Cách nhận biết nền tảng | `X-Client-Platform` thắng user agent; iPhone, okhttp, Android, Mobile là mobile; không dấu hiệu = web; `X-Device-Type` đứng một mình bị bỏ qua (Q5); `x-platform` do client gửi bị ghi đè; giá trị lạ quay về user agent |
| BF-SUB-32 | Đăng nhập không bị kiểm nền tảng | đăng nhập web với gói chỉ mobile: 200 |
| BF-SUB-33 | Mã đăng ký đứng trước mã nền tảng; đổi cờ có hiệu lực ngay | 403 EXPIRED → 403 PAUSED → 403 PLATFORM → ok với cùng token |

### Giới hạn gói (đặt giới hạn = số hiện có + chỗ cần thử)

| ID | Case | Expected |
|---|---|---|
| BF-SUB-34 | Khách hàng: merchant và staff dùng chung giới hạn | tạo đến giới hạn được; thêm 1 → 422 `PLAN_LIMIT_EXCEEDED` (body `{success:false, code, error}`), không ghi dòng |
| BF-SUB-35 | Sản phẩm: merchant, staff, kho | như trên |
| BF-SUB-36 | Đơn: staff, kho, merchant | như trên; tồn chi nhánh không đổi |
| BF-SUB-37 | Chi nhánh | merchant POST `/api/outlets`: như trên |
| BF-SUB-38 | Người dùng: hai route dùng chung giới hạn | `POST /api/users` và `/api/merchants/{id}/users`: như trên |
| BF-SUB-39 | Staff và kho không thêm chi nhánh / người dùng | 403 (quyền, không phải 422) |
| BF-SUB-40 | Giới hạn −1 là không giới hạn | tạo lặp lại đều được |
| BF-SUB-41 | Còn 1 chỗ thì được, hết chỗ thì từ chối, với mọi loại | được, rồi 422 |
| BF-SUB-42 | Giới hạn thấp hơn số hiện có | các dòng cũ vẫn xem được (200), tạo mới 422, số đếm không đổi |
| BF-SUB-43 | Add-on nâng giới hạn đúng bằng số của nó | add-on không hoạt động không đổi gì; +2 hoạt động cho đúng 2 chỗ nữa, chỗ thứ 3 là 422 |
| BF-SUB-44 | Add-on trên gói không giới hạn không đổi gì; xoá add-on thì mất chỗ | đúng như vậy |
| BF-SUB-45 | Giới hạn 0 tính là không giới hạn (Q2) | tạo được |
| BF-SUB-46 | Số đếm theo từng cửa hàng | cửa hàng đầy nhận 422; cửa hàng kia vẫn tạo đến số của nó |
| BF-SUB-47 | Sản phẩm / người dùng đã xoá nhả chỗ; người dùng bị khoá vẫn chiếm chỗ (Q3) | đúng như vậy |
| BF-SUB-48 | **Known bug #729** Khách đã xoá nhả chỗ | mong đợi tạo được (hiện 422) |
| BF-SUB-49 | **Known bug #729** Chi nhánh đã xoá nhả chỗ | mong đợi tạo được (hiện 422) |
| BF-SUB-50 | **Known bug #729** Đơn đã xoá nhả chỗ | mong đợi tạo được (hiện 422) |
| BF-SUB-51 | Đơn huỷ và đơn cũ vẫn tính (Q4) | 422 cả hai lần |
| BF-SUB-52 | ADMIN bỏ qua giới hạn gói | merchant 422, ADMIN 200 |
| BF-SUB-53 | Kiểm đăng ký trước kiểm giới hạn | hết hạn và đầy: 403 `SUBSCRIPTION_EXPIRED`, không phải 422 |

### Khôi phục

| ID | Case | Expected |
|---|---|---|
| BF-SUB-54 | Hết hạn rồi dời `currentPeriodEnd` | 3 token cũ: 403 EXPIRED rồi ok, không cần đăng nhập lại; dữ liệu cũ còn nguyên |
| BF-SUB-55 | Gia hạn chỉ dời ngày giữ status cũ | EXPIRED cũ chạy được; PAUSED và PAST_DUE vẫn bị chặn đến khi đổi status |
| BF-SUB-56 | CANCELLED đã hết, rồi ACTIVE lại | 403 CANCELLED rồi ok |
| BF-SUB-57 | Dòng đăng ký tạo sau | 403 `NO_SUBSCRIPTION` rồi ok |
| BF-SUB-58 | Đổi gói đổi giới hạn ngay | 422, ok, 422 với cùng token |

Kết quả (`BIZ_E2E_SHOW_BUGS=1` cho 6 ca known bug): 58 ca, 52 đạt, 0 lỗi, 6 known-bug ở cả TZ=UTC và TZ=Asia/Ho_Chi_Minh.
Không tự động được: `SUBSCRIPTION_PERIOD_ENDED` / `SUBSCRIPTION_PERIOD_MISSING` (không tới được, `core.ts` trả lời trước và `currentPeriodEnd` NOT NULL); `GET /api/subscription/limits` đang tắt; route add-on admin/merchant (add-on được chèn bằng psql); đăng ký thật (seed dữ liệu demo + cần xác thực email); gia hạn qua LemonSqueezy/webhook (kiểm hiệu ứng ở mức DB); đường nhập hàng loạt.

## BF-STOCK — Tồn còn lại sau đơn bán và đơn thuê (`work-stock-calendar.e2e.test.js`, #727)

Đọc qua các endpoint app dùng: `GET /api/products`, `/products/{id}`, `/availability`, `/availability-calendar`, `POST /products/batch-availability`.

| ID | Case | Expected |
|---|---|---|
| BF-STOCK-01 | Bán 2 từ tồn 5 | list `{hôm nay 3, available 3, stock 3}`, detail `{3,3,0}`, mọi ngày (hôm nay đến +60) trống 3; bán thêm 1 → 2 |
| BF-STOCK-02 | Bán hết | list và detail 0; check đơn lẻ và check giỏ: không còn, trống 0 |
| BF-STOCK-03 | Bán vượt tồn (Q7) | được nhận, `OutletStock.stock` −1, available 0, Home hiện 0 |
| BF-STOCK-04 | Huỷ đơn bán | tồn, list và mọi ngày về lại 4 |
| BF-STOCK-05 | Thuê 2 từ 5 ngày P..R (tương lai) | lưới ngày `[5,3,3,3,5]` cho P−1..R+1; check lẻ và giỏ khớp; detail `{5,5,0}`, list hôm nay 5 |
| BF-STOCK-06 | Khoảng thuê gồm hôm nay | "còn hôm nay" 3, available 3, detail `{5,5,0}`, lưới `[3,3,3,5]` |
| BF-STOCK-07 | PICKUPED / RETURNED | PICKUPED: detail `{5,3,2}`, khoảng thuê vẫn trống 3 (không tính hai lần); RETURNED: `{5,5,0}`, lưới 5 |
| BF-STOCK-08 | Huỷ đơn RESERVED và đơn PICKUPED | trả đủ; PICKUPED `{4,1,3}` → `{4,4,0}` |
| BF-STOCK-09 | Số lượng lẻ, hai đơn, theo ngày | A 2 (ngày 0..2), B 1 (ngày 2..4), tồn 5: lưới `[5,3,3,2,4,4,5]`; 3 đơn vị vừa ngày 0..1 nhưng không vừa 1..3; trống của khoảng = ngày tệ nhất |
| BF-STOCK-10 | 2 + 1 cùng ngày | tồn 4: còn 1; qty 1 ok, qty 2 từ chối; `conflictingQuantity` 3 |
| BF-STOCK-11 | Thuê và bán cùng lúc | tồn 3, bán 1, thuê 2: lưới `[2,0,0,2]` |
| BF-STOCK-12 | Hai chi nhánh | mỗi chi nhánh có số riêng; giao ở M chỉ đổi M; bán ở O chỉ đổi O; `totalStock` là tổng |
| BF-STOCK-13 | Tồn 0 | list 0; mọi check "không"; `occupiedDates` liệt kê mọi ngày; tăng tồn lên 2 thì mọi ngày mở ngay |
| BF-STOCK-14 | List, detail và check ngày khớp | RESERVED → PICKUPED → RETURNED: `{2,3,2}` → `{2,2,2}` → `{3,3,3}` |

## BF-CAL — Lịch (`work-stock-calendar.e2e.test.js`)

`calendar/orders/count` (`status=RESERVED`) và `calendar/orders/by-date`.

| ID | Case | Expected |
|---|---|---|
| BF-CAL-01 | RESERVED | ngày giao: `count` +1 và `pickups` +1; ngày trả Δ 0; dòng có items (số lượng, đơn giá, thành tiền), `productCount`, `amountDue`; P−1 và R không liệt kê |
| BF-CAL-02 | PICKUPED | pickups −1; ngày trả `returns` +1; `kind=return` chỉ liệt kê ở R; danh sách không lọc status vẫn thấy ở P |
| BF-CAL-03 | RETURNED | dấu hiệu về mức gốc; ngày P vẫn hiện dòng RETURNED |
| BF-CAL-04 | Giao và trả cùng ngày | cả hai dấu trong cùng ngày; D±1 trống |
| BF-CAL-05 | Huỷ | mất khỏi dấu và danh sách RESERVED; danh sách không lọc status vẫn nêu CANCELLED (Q8) |
| BF-CAL-06 | Đơn qua hai tháng | giao đếm ở tháng 1, trả ở tháng 2; lưới `[1,1,1]` qua ranh giới tháng |
| BF-CAL-07 | Trả trễ | `lateReturns` +1 và `returns` +1 ở ngày trả đã qua; RETURNED xoá cả hai |
| BF-CAL-08 | Chi nhánh khác, cửa hàng khác | merchant thấy khi không lọc và `outletId=O`, không thấy với `outletId=M`; staff của M và cửa hàng khác Δ 0, không dòng |
| BF-CAL-09 | Đơn bán | không nằm trong danh sách giao; danh sách COMPLETED của ngày tạo có nó với số lượng và tổng |
| BF-CAL-10 | Múi giờ thiết bị | `timeZone` VN như mặc định; 00:00 VN của P rơi vào P−1 ở Los Angeles; múi giờ lạ → 400 |
| BF-CAL-11 | Lưới và danh sách ngày khớp | lưới `[3,2,4]`; số đơn vị giữ trong ngày = số đơn vị của các đơn liệt kê |

## BF-TODO — Việc cần làm / thẻ Hôm nay (`work-stock-calendar.e2e.test.js`)

`GET /api/analytics/outlet-operations`; mỗi bước kiểm một vector chênh lệch chính xác.

| ID | Case | Expected |
|---|---|---|
| BF-TODO-01 | Giao hôm nay | tạo `{pickups +1, newToday +1}`; PICKUPED `{pickups −1, donePickups +1, soon +1}`; RETURNED `{soon −1, doneReturns +1}`; dòng có `itemCount`, `items`, `amountDue`; danh sách ops = `GET /api/orders?status=RESERVED&dateField=pickupPlanAt&startDate=today&endDate=today` |
| BF-TODO-02 | Huỷ | RESERVED huỷ `{pickups −1}`; PICKUPED huỷ `{donePickups −1, soon −1}` |
| BF-TODO-03 | Ranh giới ngày VN, giao | hôm nay 00:30 và 23:30 tính hôm nay; hôm qua 23:30 là no-show; ngày mai 00:30 và 23:30 là ngày mai; ngày kia không tính đâu cả |
| BF-TODO-04 | Ranh giới ngày VN, trả | trả hôm nay 00:30 / 23:30 → `returns`; hôm qua 23:30 → `late`; ngày mai 00:30 → `tomorrowReturns + soon` |
| BF-TODO-05 | Quá ngày lấy (no-show) | `noShows` 2 với `lateDays` 1 và 3; danh sách = danh sách đơn (`status=RESERVED`, `endDate` hôm qua); giao trễ `noShows −1, donePickups +1`; huỷ `noShows −1` |
| BF-TODO-06 | Cần nhận trả hôm nay | `returns +1`; RETURNED `{returns −1, doneReturns +1}`; danh sách = danh sách đơn (`status=PICKUPED&dateField=returnPlanAt`, hôm nay); huỷ `{returns −1, donePickups −1}` |
| BF-TODO-07 | Trễ hạn trả | `late` 2, `daysOverdue` 1 và 3, không nằm trong `returns`; RETURNED `{late −1, doneReturns +1}` |
| BF-TODO-08 | Ngày mai và nhìn trước | giao ngày mai, trả ngày mai (+ soon), trả +3 ngày (soon), trả +4 ngày (không gì) |
| BF-TODO-09 | Bộ đếm tiền (merchant) | sẽ thu, sẽ trả lại, đang giữ, đến hạn hôm nay, phí: đổi đúng số tiền; huỷ trước khi giao chỉ bỏ phần sẽ thu |
| BF-TODO-10 | Một ngày có 7 loại đơn | mỗi bộ đếm đúng một đơn (donePickups 3, newToday 7); mỗi `count` = độ dài danh sách; huỷ hết thì mọi bộ đếm về 0 |
| BF-TODO-11 | Múi giờ | có / không `timeZone` cho cùng số; `date` = ngày VN; múi giờ lạ → 400 |
| BF-TODO-12 | Chi nhánh không lẫn | đơn ở O chỉ đổi O; `outletIds` của người khác → 403 `CROSS_MERCHANT_ACCESS_DENIED`; không lọc thì liệt kê `[M,O]` |
| BF-TODO-13 | Đơn mới hôm nay | thuê và bán đều tính; huỷ không đổi gì (Q2) |

## BF-CART — Tạo đơn: hết hàng, còn lại bao nhiêu (`work-stock-calendar.e2e.test.js`)

| ID | Case | Expected |
|---|---|---|
| BF-CART-01 | Tồn 3, số lượng 1 đến 4 | 1–3 được, 4 bị từ chối (`stockAvailable` false); lẻ và giỏ khớp; trống 3 |
| BF-CART-02 | 2 trong 3 đã đặt | 1 được, 2 bị từ chối; câu trả lời nêu mã đơn và `quantity`; `conflictingQuantity` 2 |
| BF-CART-03 | Giỏ 3 dòng (đủ, thiếu, hết sạch) | trống `[3,1,0]`; tóm tắt `{3 tổng, 1 được, 2 không}`; sửa dòng thì hết cảnh báo |
| BF-CART-04 | `allowOverlappingOrders` BẬT | giỏ báo đầy nhưng server nhận (200, Q1); `conflictingQuantity` 2 |
| BF-CART-05 | TẮT | 409 `ORDER_SCHEDULE_CONFLICT` kèm `conflicts[]` (productId, requested, available, days, orderNumbers); check giỏ trả giống; 1 trong 2 đơn vị vừa; số lượng lớn hơn tồn trên cửa sổ trống được nhận (Q9) |
| BF-CART-06 | Hết hôm nay nhưng thêm cho ngày sau | list hôm nay 0, detail `{1,0,1}`; cửa sổ sau trống và đơn được nhận |
| BF-CART-07 | `excludeOrderId` khi sửa | giữ đơn vị của chính đơn đó, không của đơn khác |
| BF-CART-08 | Giỏ đơn bán | `orderType: SALE`, không ngày: qty ≤ tồn ok, +1 bị từ chối |
| BF-CART-09 | Khác biệt trường (Q10) | `effectivelyAvailable` là 3 ở check lẻ và giỏ; `available`/`renting` là 3/2 ở check lẻ nhưng 5/0 ở giỏ và detail |
| BF-CART-10 | Sản phẩm không có ở chi nhánh | giỏ `error: PRODUCT_OUTLET_NOT_FOUND`; check lẻ 404 |

## BF-DET — Chi tiết đơn hàng (`work-stock-calendar.e2e.test.js`)

| ID | Case | Expected |
|---|---|---|
| BF-DET-01 | 2 dòng (2 × 150.000 FIXED, 3 × 40.000 DAILY × 3 ngày), cọc 100.000, thế chân 200.000 | tổng dòng 660.000; by-number = detail; dòng list, lịch, đơn của khách khớp; `amountDue` 760.000 |
| BF-DET-02 | Tăng giảm số lượng khi RESERVED | detail, list, lịch và ngày trống đều theo (trống 4 → 2 → 5); `amountDue` = tổng − cọc |
| BF-DET-03 | Gia hạn 2 ngày | `rentalDuration` 5, dòng DAILY `rentalDays` 5, dòng FIXED không đổi; ngày trả và ngày trống dời theo |
| BF-DET-04 | Giao rồi trả | `amountDue/refundDue` `{A−D+S,0}` → `{0,S}` → `{0,0}`; `pickedUpAt` / `returnedAt` là ngày VN; tồn `{4,2,2}` → `{4,4,0}` |
| BF-DET-05 | Đơn bán | số lượng, thành tiền, giảm giá; cọc và thế chân 0 |
| BF-DET-06 | Đơn đã huỷ | số lượng và tổng vẫn đọc được; đơn vị trả lại |

## BF-ROLE — Staff và kho (`roles-flows.e2e.test.js`; 01–11 chạy cho cả staff và kho, `BF-ROLE-nn-staff` / `-kho`)

| ID | Case | Expected |
|---|---|---|
| BF-ROLE-01 | Bán ở chi nhánh mình | tồn khớp với merchant; `{3,3,0}`; dòng lịch COMPLETED |
| BF-ROLE-02 | Thuê ở chi nhánh mình | lưới, check lẻ, giỏ, list, detail, đơn, dòng list: deep-equal với merchant, tiền cũng khớp; `amountDue` hiển thị |
| BF-ROLE-03 | Giao, trả, huỷ bởi vai trò | `renting` rồi trống, đọc giống merchant |
| BF-ROLE-04 | Lịch | số chi nhánh mình = `outletId=M` của merchant; đơn chi nhánh khác không có; `outletId=O` không mở rộng |
| BF-ROLE-05 | Việc cần làm | bộ đếm và danh sách = `outletIds=M` của merchant; chênh lệch như merchant; `cash` null cho vai trò, có cho merchant; `outletIds=O` bị bỏ qua |
| BF-ROLE-06 | Chi nhánh khác (đang đúng) | tạo ở đó 403 `CANNOT_CREATE_ORDER_FOR_OTHER_OUTLET`; không thấy trong list hay tìm kiếm; đơn và tồn không đổi |
| BF-ROLE-07 | **Known bug #730** | PUT và đổi status đơn của chi nhánh khác phải 403; đơn ở yên chi nhánh O (hiện 200 và đơn bị chuyển sang chi nhánh của người gọi) |
| BF-ROLE-08 | **Known bug #731** | `GET /api/orders/{id}` và by-number của chi nhánh khác phải 403/404 (hiện trả đơn) |
| BF-ROLE-09 | **Known bug #732** | `availability`, `availability-calendar`, `batch-availability` với `outletId=O` phải 403 (hiện trả tồn và mã đơn, tên khách) |
| BF-ROLE-10 | Báo cáo | `period`, `income`, `top-products`, `top-customers`, `growth-metrics`, `analytics/orders`, `recent-orders`: 403 cho vai trò, 200 cho merchant; `today-metrics`, `dashboard`, `outlet-operations`, `income/daily`: 200 |
| BF-ROLE-11 | Tiền trong đơn không bị che | cọc, thế chân, còn thu hiển thị ở detail, dòng list, lịch; chỉ `cash` bị ẩn |
| BF-ROLE-12 | Giá vốn | kho và merchant thấy ở list và detail, staff không |
| BF-ROLE-13 | Kho sửa tồn | mọi đọc của merchant, kho, staff đổi ngay (2 → 6 → 1); staff sửa 403 và không gì đổi |
| BF-ROLE-14 | Sản phẩm do staff và kho tạo | cả hai có tồn ở chi nhánh; form của staff không giá lưu 0; staff gửi giá khi tạo vẫn được lưu (Q11); staff không sửa được sau đó (403); kho lưu giá và giá vốn; kho thuê được |
| BF-ROLE-15..41 | Ma trận quyền, hai chiều, 27 dòng (`-staff`, `-kho`) | mỗi dòng kiểm status mong đợi, dòng bị từ chối kiểm dữ liệu không đổi. Staff 403 / kho 2xx: sửa, xoá, xuất, nhập hàng loạt sản phẩm, tạo danh mục. Cả hai 2xx: tạo sản phẩm, tạo và sửa đơn, tạo khách, billing status, loyalty, today-metrics, income/daily, chi nhánh (của mình). Cả hai 403: xoá đơn (một và hàng loạt), xuất đơn, xuất khách, danh sách và tạo người dùng, cài đặt cửa hàng, cài đặt trùng lịch, cài đặt chi nhánh, tài khoản ngân hàng, đổi gói, `period`, sửa chi nhánh |

BF-INV-09 đã sửa: kiểm vai trò chạy trước kiểm gói, nên gói đã đầy trả 422 `PLAN_LIMIT_EXCEEDED` và test khẳng định đúng điều đó; nếu người dùng được tạo, test xoá nó.
Kết quả: 133 ca mới mỗi múi giờ (54 + 79); 3 file (work-stock, roles-flows, inventory-role) 144 đạt, 0 lỗi, 6 known-bug; cả bộ business (655 ca) lượt hai: 583 đạt, 0 lỗi, 71 known-bug, ở cả UTC và Asia/Ho_Chi_Minh.
Không tự động được ở mức API: giao một phần của đơn (không có API; chỉ có sửa số lượng trước khi giao, BF-DET-02); thanh toán đơn (Q5); chữ "N / M" và màu trên màn hình (chỉ chứng minh được bộ đếm và danh sách app đọc); qua nửa đêm thật (dùng 00:30 và 23:30 hai bên); đăng nhập staff / kho của chi nhánh khác (đăng nhập bị giới hạn 10 lần / 15 phút / IP).

## WEB (Playwright) — vai trò, gói, tồn, lịch, việc cần làm (`tests/e2e/web/{roles,plan,stock}.web.js`, #727)

Chạy: cần API cục bộ và client chạy từ thư mục `.next` RIÊNG (hai `next dev` trong cùng `apps/client` ghi đè bundle của nhau).
```
export E2E_DATABASE_URL=postgresql://postgres@127.0.0.1:54343/anyrent_e2e_web
export WEB_E2E_API_URL=http://localhost:3194 WEB_E2E_CLIENT_URL=http://localhost:3295
export WEB_E2E_CHROME="$HOME/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
scripts/e2e/web-e2e.sh --roles | --plan | --stock | --accounts [--only WEB-SUB-02,WEB-ROLE-04] --headed
```
Runner: exit 1 nếu fail hoặc "fixed?"; in bảng pass/fail/known mỗi suite; ghi `$WEB_E2E_OUT/web-{roles,plan,stock}-results.json`. Mỗi suite tự đăng ký cửa hàng riêng (kèm staff và kho) qua `POST /api/auth/register` và xác thực email bằng psql (từ chối host không phải 127.0.0.1/localhost); không đụng cửa hàng seed. Thời gian: roles ~4 phút, plan ~8, stock ~5.
Kết quả lần chạy đầy đủ `--accounts --headed`: roles 63 đạt / 0 lỗi / 4 known; plan 77 / 0 / 11; stock 17/17 (sau khi sửa ca 05a "Hết").

| ID | Case | Steps | Expected |
|---|---|---|---|
| WEB-ROLE-01..03 | Menu theo vai trò | đăng nhập merchant / staff / kho, đọc sidebar | merchant 11 mục gồm Nhân viên, Chi nhánh, Khách thân thiết; staff và kho 8 mục (không có ba mục đó), có Cài đặt cửa hàng |
| WEB-ROLE-04, 05 | Tổng quan của staff, kho (a..e) | mở /dashboard | không có thẻ tiền; bộ đếm Hôm nay, danh sách, huy hiệu = outlet-operations; không lộ key, không spinner, không request lỗi ngoài 403 mong đợi |
| WEB-ROLE-06, 07 | Tiền qua URL | mở `?detail=`, `?top=`, khoảng tuỳ chọn | không có số tiền; kỳ bị ép về hôm nay. 06b / 07b: `/dashboard/related` hiện tổng các đơn (hiện trạng, Q3) |
| WEB-ROLE-08, 09 | Trang quản trị qua URL | /users, /users/add, /users/permissions, /users/role-permissions, /outlets/:id/bank-accounts | thông báo không có quyền, không lộ email, không form; API GET và POST /api/users = 403 |
| WEB-ROLE-10, 11 | /outlets của staff, kho | mở /outlets, gọi API | chỉ chi nhánh mình; API 403 khi tạo / sửa; nút "Thêm chi nhánh" và "Sửa" phải ẩn (**known #736**: đang hiện) |
| WEB-ROLE-12 | Sản phẩm, staff (a..e) | danh sách, chi tiết, URL sửa, API | không Sửa/Xoá/Xuất/Nhập; PUT giá 403 và giá không đổi; URL sửa báo không có quyền; export 403; Thêm sản phẩm chạy |
| WEB-ROLE-13 | Sản phẩm, kho (a..c) | như trên | hiện Thêm/Nhập/Sửa/Xoá; PUT giá 200; export API 200 trong khi nút bị ẩn (Q1) |
| WEB-ROLE-14, 15 | Khách và danh mục, staff, kho (a, b) | nút so với API | Xoá khách, Sửa, Nhập chạy. Xuất Excel chỉ hiện nếu API cho xuất (export khách 403 cho cả hai). Danh mục: staff ẩn và 403, kho hiện và 200/201 |
| WEB-ROLE-16..18 | Danh sách và chi tiết đơn: staff, kho, merchant (a..c) | /orders, chi tiết, xuất | danh sách và huy hiệu Việc cần làm / Chưa lấy đồ = API; Xuất Excel chỉ merchant; chi tiết có số, dòng, tổng; menu "Thêm thao tác" chỉ merchant (API DELETE 403 cho staff và kho) |
| WEB-ROLE-19, 20 | Tạo đơn, staff, kho | Tạo đơn: ngày, sản phẩm, khách | đơn có trong API là RENT |
| WEB-ROLE-21, 22 | Lịch và tồn trống, staff, kho | mở hai trang | bảng ngày và tìm kiếm tải được, không lỗi |
| WEB-ROLE-23, 24 | Cài đặt, staff, kho (a, b) | `/dashboard?settings=subscription` | rơi về tab chi nhánh chỉ đọc, không có gói hay giá; API PUT chi nhánh và GET merchant bị từ chối |
| WEB-ROLE-25 | Cài đặt, merchant | mở cài đặt | thấy các tab và gói |
| WEB-ROLE-26, 27 | /loyalty khi gói không có loyalty (staff, merchant) | mở /loyalty | thẻ nâng cấp, không lộ key (**known #737**: đang hiện `errors.PLAN_UPGRADE_REQUIRED`) |
| WEB-ROLE-28..30 | Tiếng Anh, staff, kho, merchant | 5 trang chính ở en | chỉ chữ Anh, không lộ key |
| WEB-DASH-01 (hôm nay, 7 ngày, tháng) | Merchant chưa có đơn | mở từng kỳ | bốn thẻ 0, không NaN, không "không tải được" |
| WEB-DASH-02 | Cùng merchant | /dashboard | "Hôm nay không có đơn cần giao hay nhận trả", bộ đếm 0/0 |
| WEB-DASH-03..05 | Khoảng tuỳ chọn qua nhiều tháng | `?period=custom&from=ngày 20 tháng trước&to=hôm nay`, rồi tải lại | thẻ = `/api/analytics/period`; nhãn có hai đầu; sau khi tải lại vẫn cùng số |
| WEB-SUB-01..05 (-merchant/-staff/-kho, -a..-f) | Hết hạn trial, hết hạn active, huỷ đã hết, tạm dừng, nợ | đăng nhập mỗi vai trò, mở 7 trang (3 trang cho staff, kho) | ở lại /dashboard; toast nêu trạng thái; thẻ thử lại; không 404/500, không lộ key, không spinner; staff và kho không có nút gia hạn. Merchant -c và -d (trang Gói dịch vụ tải được, status và plans trả lời): **known #728**. -e: tạo sản phẩm, khách, đơn, người dùng bị từ chối 403 và không tạo gì. -f: gia hạn bằng SQL thì cùng phiên tải lại được |
| WEB-SUB-06 (active-ended, cancelled-ended) | Thông báo tiếng Anh | merchant ở en | "Subscription Error" và câu nêu trạng thái, không tiếng Việt hay key |
| WEB-SUB-07 | Không có dòng đăng ký | mở /orders | API 403 `NO_SUBSCRIPTION`; thông báo đã dịch |
| WEB-SUB-08 | Gói `allowWebAccess` false | mở /orders | thông báo đã dịch (**known #738**: đang hiện `errors.PLATFORM_ACCESS_DENIED` và không có lối đi tiếp) |
| WEB-SUB-20..24 | Giới hạn gói: sản phẩm, khách, đơn, người dùng, chi nhánh | a: còn chỗ cuối, tạo bằng giao diện web. b: đã đầy, tạo lại | a: tạo được. b: 422 `PLAN_LIMIT_EXCEEDED`, hiện "Vượt quá giới hạn gói", không tạo gì |
| WEB-SUB-25a, b | Giới hạn gói bằng tiếng Anh: sản phẩm, khách | tạo khi đầy ở en | "Plan limit exceeded", không tiếng Việt hay key |
| WEB-SUB-26, 27 | Giới hạn gói với staff (khách) và kho (sản phẩm) | tạo khi đầy | cùng thông báo đã dịch, không tạo gì |
| WEB-STOCK-01 | Sản phẩm mới | list, detail, picker | Còn 3/3; 3 / 3 / 0; picker 3/3 |
| WEB-STOCK-02a, b | Bán 1 qua Tạo đơn | tạo rồi đọc list, detail, picker | Hoàn thành / Đơn bán / 300,000; list, detail, picker = API (2/2) |
| WEB-STOCK-03a, b | Thuê 2 vào ngày tương lai qua Tạo đơn | tạo; picker cho 5 khoảng | hôm nay không đổi; picker = /availability; khoảng nằm trong hoặc chồng: "Hết trong lịch này"; trước và sau: 2/2 |
| WEB-STOCK-04a..c | Giỏ có sản phẩm đã hết vào ngày chọn | thêm; Tạo đơn khi cho trùng lịch bật, rồi tắt | dòng "Hết đồ <ngày> · đã thuê ở đơn …"; hộp "Vẫn tạo đơn"; đơn được tạo. Khi tắt: "Cửa hàng không cho tạo đơn trùng lịch…", nút bị khoá, không tạo đơn |
| WEB-STOCK-05a, b | Giao và trả đúng ngày dự kiến | giao, rồi trả qua API | list "Hết", detail 2 / 0 / 2, picker hết; sau khi trả 2/2 |
| WEB-STOCK-05c | Giao sớm 3 ngày | giao qua API | hiện trạng (Q4): detail 0 còn, list và picker vẫn 2 trống |
| WEB-STOCK-06a, b | Số lượng vượt phần còn lại | thuê khoảng còn 1/3; bán 4 | picker "Còn 1/3", dòng "Hết đồ … #đơn"; bán: picker 3/3, "Chỉ còn 3" |
| WEB-STOCK-07a..c | Số tiền trong chi tiết đơn | 2 × 100,000, giảm 20,000, cọc 50,000, thế chân 30,000; giao; bán | dòng, tổng, cọc, thế chân và "Thu khi giao 160,000" = API; số ngày; "Đang thuê"; đơn bán "Hoàn thành" 600,000 |
| WEB-STOCK-08 | Picker tiếng Anh | Tạo đơn ở en | chuỗi "left" / "out" của locale |
| WEB-CAL-01..04 | Ô tháng, "trễ", bảng ngày, bấm vào | 10 đơn các ngày khác nhau, gồm qua tháng, huỷ, bán, trễ | giao / trả mỗi ngày = mô hình; "trễ" chỉ hôm nay; bảng ngày liệt kê đúng các đơn (Cần nhận trả hôm nay gồm cả đơn trễ); bấm mở chi tiết cùng ngày |
| WEB-CAL-05 | Lịch tiếng Anh | mở /calendar ở en | chú giải và tiêu đề tiếng Anh, không lộ key |
| WEB-TODO-01..07 | Thẻ Hôm nay, danh sách việc cần làm, tab đơn | so với outlet-operations; giao một đơn rồi trả một đơn qua API | bộ đếm, 5 dòng đầu, "+n", liên kết Cần giao tới /orders?status=RESERVED, huy hiệu và dòng Việc cần làm / Chưa lấy đồ = API; sau khi giao và trả thì số "xong" +1 |
| WEB-TODO-08, 09 | Dashboard và đơn tiếng Anh | như trên ở en | = API; không tiếng Việt |

Không tự động được: thanh toán và gia hạn thật qua Lemon Squeezy / SePay (rời khỏi app, và giao diện gia hạn không tải được, #728); hộp thoại gia hạn (`SubscriptionRenewalBottomBar` không được gắn ở đâu); trang 404 ngoài những gì chế độ dev hiện; bị đá phiên khi thiết bị khác đăng nhập (luật một phiên, không đổi ở đây).

## WEB-UI — Từng tính năng của shop web, thao tác như người dùng (`tests/e2e/web/ui-{auth,public,orders,customers,products,settings,manage,layout}.web.js`, #727)

Mỗi ca lái đúng trang (bấm, gõ, lưu) bằng Playwright rồi đọc lại qua API để bắt lưu sai; đồng thời kiểm chữ vi / en, không lộ khoá thô (`errors.X`, `common.x`), không spinner mãi, không lỗi console, không request lỗi ngoài 4xx mong đợi. Dữ liệu tự tạo với tên riêng, không để lại thay đổi cài đặt. Helper: `ui-helpers.js`, `ui-order-flow.js`.
Lần chạy đầy đủ có cửa sổ (`WEB_E2E_HEADED=1 scripts/e2e/web-e2e.sh --ui`, dev server, không phải bản build production): **632 đạt, 0 lỗi, 8 known, 0 "fixed?"**.

| Khu vực | đạt | known | lỗi |
|---|---|---|---|
| auth | 54 | 0 | 0 |
| public | 126 | 4 (#733 ×2, #734, #735) | 0 |
| orders | 109 | 1 (#739) | 0 |
| customers | 55 | 0 | 0 |
| products | 55 | 2 (#741, #742) | 0 |
| settings | 63 | 1 (#744) | 0 |
| manage | 51 | 0 | 0 |
| layout | 119 | 0 | 0 |

Chạy:
```
export E2E_DATABASE_URL=postgresql://postgres@127.0.0.1:54343/anyrent_e2e_webui
export E2E_API_DIR=$PWD/apps/api E2E_API_PORT=3198
CORS_ORIGINS=http://localhost:3296 scripts/mobile-e2e/api-local.sh start     # không có CORS_ORIGINS thì form đăng nhập báo "Failed to fetch"
# client: next dev -p 3296, NEXT_PUBLIC_API_URL=http://localhost:3198, thư mục .next RIÊNG
WEB_E2E_API_URL=http://localhost:3198 WEB_E2E_CLIENT_URL=http://localhost:3296 WEB_E2E_EMAIL=merchant2@example.com WEB_E2E_PASSWORD=merchant123 \
WEB_E2E_HEADED=1 WEB_E2E_CHROME="$HOME/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" \
scripts/e2e/web-e2e.sh --ui          # hoặc --ui orders,customers (một khu vực)
```
`--ui` đi qua cổng của các suite tài khoản nên cần `E2E_DATABASE_URL` dù các suite này không dùng SQL. Merchant2 đã vượt giới hạn gói (chi nhánh 2/1, người dùng 7/2) nên thêm chi nhánh / người dùng bị từ chối và test khẳng định thông báo "Vượt quá giới hạn gói".

| ID | Case | Steps | Expected |
|---|---|---|---|
| WEB-UI-AUTH-01 | Trang đăng nhập | mở `/login` (vi) | nhãn, lang=vi, không khoá thô, không lỗi console |
| WEB-UI-AUTH-02 | Form rỗng | gửi form rỗng | có thông báo, không request, không token |
| WEB-UI-AUTH-03 | Sai mật khẩu (vi) | nhập sai | "Email hoặc mật khẩu không đúng", ở lại trang, thông báo mất khi gõ |
| WEB-UI-AUTH-04 | Email không tồn tại | nhập email lạ | cùng thông báo AUTH-03 |
| WEB-UI-AUTH-05 | Sai mật khẩu (en) | cookie en | "Invalid email or password", nhãn tiếng Anh |
| WEB-UI-AUTH-06 | Đổi ngôn ngữ ở trang đăng nhập | vi→en→vi, tải lại | trang và cookie `NEXT_LOCALE` theo, còn sau khi tải lại |
| WEB-UI-AUTH-07 | Đăng nhập | đúng mật khẩu | vào /dashboard, phiên là merchant, không lỗi console |
| WEB-UI-AUTH-08 | Đăng xuất | "Đăng xuất" | về /login, `authData` bị xoá, /orders chuyển về /login, nút Back không hiện đơn |
| WEB-UI-AUTH-09 | Trang cần đăng nhập | 10 màn hình khi chưa có phiên | đều chuyển về /login |
| WEB-UI-AUTH-10 | Phiên bị chỗ khác lấy | đăng nhập form, đăng nhập API cùng tài khoản, mở /orders | về /login và ở lại (không lặp), phiên cũ bị xoá, chỉ có 401 |
| WEB-UI-AUTH-11 | Quên mật khẩu | mở trang, gửi rỗng, liên kết quay lại | hiển thị, không có màn thành công, liên kết chạy |
| WEB-UI-AUTH-12 | Đặt lại mật khẩu | không token / token sai | "Liên kết không hợp lệ" + nút xin liên kết mới; token sai bị từ chối bằng chữ |
| WEB-UI-AUTH-13 | Trang đăng ký | /register, /register-merchant, mật khẩu không khớp | form bước 1/2 lành mạnh; không khớp thì ở bước 1 kèm thông báo |
| WEB-UI-PUB-01..13 (+en) | Trang công khai | /, features, pricing, download, privacy, terms, blog, 4 trang SEO, tim-san-pham-bang-hinh-anh, affiliate × vi/en | HTTP 200, title, h1, đúng ngôn ngữ, lành mạnh (known #733, #734, #735) |
| WEB-UI-ORD-01 | Danh sách đơn | mở /orders | tab, chip = số của API, lành mạnh |
| WEB-UI-ORD-02 | Tìm đơn | theo số, tên (không dấu, theo tiền tố từ), điện thoại, sản phẩm, không khớp, xoá | đúng dòng, "Kết quả cho", trạng thái rỗng, xoá chạy |
| WEB-UI-ORD-03 | Bộ lọc | chip trạng thái, loại, sắp xếp, ngày tạo | tập dòng đúng |
| WEB-UI-ORD-04 | Phân trang | trang sau/trước, cỡ trang | chân trang = tổng API, trang 2 khác, 50 dòng |
| WEB-UI-ORD-05 | Tab | Việc cần làm / Chưa lấy đồ | đơn giao hôm nay có, ngày mai không |
| WEB-UI-ORD-06 | Tạo đơn thuê | ngày, 2 sản phẩm, số lượng, đổi giá, giảm giá, cọc, ghi chú | API = nhập vào; hộp phiếu mở với số đơn; giá danh mục không đổi |
| WEB-UI-ORD-07 | Tạo đơn thuê, khách mới | thêm khách trong bộ chọn | tạo khách, thuê cùng ngày được |
| WEB-UI-ORD-08 | Tạo đơn bán | tab Bán | SALE, COMPLETED, không ngày trả |
| WEB-UI-ORD-09 | Kiểm tra khi tạo | giỏ rỗng, chưa chọn khách | có thông báo / nút khoá, không gửi gì |
| WEB-UI-ORD-10 | Trùng lịch | đặt món đã bị đặt | hộp "Trùng lịch"; Huỷ không tạo gì; "Vẫn tạo đơn" tạo |
| WEB-UI-ORD-11 | Trang đơn | đầu trang, dòng, thanh toán, "Xem khách", số không tồn tại | đúng; "Không tìm thấy đơn này." |
| WEB-UI-ORD-12 | Thế chân + Giao đồ | nhập thế chân, giao | API PICKUPED, dòng tiền 280.000, giấy tờ giữ nguyên |
| WEB-UI-ORD-13 | Nhận trả có phí | trễ 10.000, hư 30.000 | hoàn 160.000; API RETURNED kèm cả hai phí |
| WEB-UI-ORD-14 | Huỷ đơn | Giữ đơn, rồi Huỷ đơn | API CANCELLED, không còn nút Giao đồ |
| WEB-UI-ORD-15 | Ghi chú đơn | sửa và lưu | API lưu ghi chú, còn sau khi tải lại |
| WEB-UI-ORD-16 | Sửa đơn | đổi số lượng và giảm giá | PUT 200, API = nhập vào, ngày không đổi |
| WEB-UI-ORD-17 | In phiếu | mở phiếu | khách, dòng, cọc, tổng, ngày, Đóng |
| WEB-UI-ORD-18 | Xoá đơn (đã huỷ) | Giữ lại, rồi Xoá | mất theo số, theo id (404) và trong danh sách (#739, đã sửa) |
| WEB-UI-CUS-01..10 | Khách hàng | danh sách / số lượng, tìm, thêm có kiểm tra, trùng điện thoại, sửa, bảng chi tiết, hồ sơ + đơn, nhập Excel (CSV), xoá (có đơn mở bị từ chối / không đơn thì xoá), hộp xuất | danh sách = API; API = dữ liệu nhập; thông báo bằng chữ |
| WEB-UI-PRD-01..12 | Sản phẩm | danh sách / số lượng, tìm / danh mục / sắp xếp, thêm có kiểm tra, kiểm tra tồn và giá, sửa, trang chi tiết, đơn của sản phẩm, nhãn, nhập Excel, xoá (có và không có đơn), quy tắc giá của OUTLET_STAFF, hai lần sửa không mã vạch | API = nhập vào; giá của staff không đổi (known #741, #742) |
| WEB-UI-SET-01..10 | Cài đặt | 7 tab; lưu thông tin cửa hàng; tiền tệ so với ngôn ngữ; vi↔en; Tối/Sáng; hồ sơ; kiểm tra mật khẩu + hộp xác nhận xoá tài khoản; cài đặt in; tab gói = API; tắt trùng lịch rồi vào Tạo đơn | mọi thứ khôi phục cuối cùng (known #744) |
| WEB-UI-MAN-01..07 | Màn quản lý | dashboard các kỳ; danh mục thêm / đổi tên / tìm / xoá; chi nhánh danh sách / thêm / sửa / tắt / tài khoản ngân hàng; người dùng danh sách / tìm / kiểm tra / khoá / mở khoá / trang quyền; khách thân thiết và thông báo; lịch đổi tháng và bấm ngày; tồn trống | như mong đợi (thêm chi nhánh theo #745 sẽ không còn nút) |
| WEB-UI-LAY-01..04 | Bố cục | 13 màn tiếng Anh, giao diện tối, 390×844, trang công khai 390×844 | không khoá thô, đủ tương phản, không cuộn ngang |

Không tự động được: thêm / sửa / xoá người dùng và thêm chi nhánh (bị chặn bởi giới hạn gói của merchant seed: chỉ kiểm thông báo giới hạn và khoá / mở khoá một người dùng seed); thanh toán gia hạn gói thật; cấu hình khách thân thiết (chương trình tắt, chỉ Super Admin bật); tải ảnh lên và hộp thoại in của trình duyệt (in được giả lập); đổi mật khẩu và xoá tài khoản thật; email quên mật khẩu và token đặt lại hợp lệ; bài blog đơn (không có bài); bản build production (`next build`).

## MOB — Mobile (iOS XCUITest + Android adb) (#727)

**Trạng thái trung thực:** các test iOS đã viết và biên dịch được (kiểm bằng SDK iphonesimulator) nhưng **chưa chạy trên máy**: ổ đĩa đầy giữa chừng, cả hai lần build iOS chết vì hết chỗ. Android: chỉ chạy một phần luồng đăng ký. Kết quả pass/fail iOS sẽ có sau khi chạy lại (lệnh bên dưới).
Tài khoản thử trong DB riêng, tạo bằng `scripts/mobile-e2e/prepare-accounts.sh`: `<slug>.owner|staff|kho@e2e-sub.test` (mật khẩu merchant123 / staff123 / inventory123); slug: expired-trial, expired-active, cancelled-ended, paused, past-due, at-limit, healthy, stock, ops. Không đụng cửa hàng seed.

Chạy:
```
source <env>   # DB anyrent_e2e_mobile, API 3195, E2E_API_DIR=$PWD/apps/api, AVD anyrent_371 cổng 5570, một simulator riêng, DerivedData riêng
scripts/mobile-e2e/seed-local.sh && scripts/mobile-e2e/prepare-accounts.sh create && scripts/mobile-e2e/api-local.sh start
scripts/mobile-e2e/ios-e2e.sh --fresh --scenario stock --role owner --only test1dStockFlow --lang vi
node tests/e2e/mobile/stock-flow-check.js $E2E_OUT/ios/sub-stock-owner-xcodebuild.log
scripts/mobile-e2e/ios-e2e.sh --scenario ops --role owner --only test6bCalendarOps     # cũng test7mTodayCounters, test5gOrderDetailMoney; checker calendar-check.js / todo-check.js / detail-check.js
scripts/mobile-e2e/ios-e2e.sh --scenario ops --role staff --only test8eRoleScreens     # và --role kho
tests/e2e/mobile/subscription-flow.sh <slug> <owner|staff|kho> --lang vi              # test10a/test10b
scripts/mobile-e2e/ios-e2e.sh --scenario at-limit --role owner --only test10cPlanLimit # và staff, kho
tests/e2e/mobile/android-flows.sh login|tabs|sub|stock|calendar|todo <slug> <role>    # Android
```
Giới hạn đăng nhập ~10 lần / 15 phút / IP (trong bộ nhớ): khởi động lại API giữa các lượt.

| ID | Case | Steps | Expected | iOS | Android |
|---|---|---|---|---|---|
| MOB-STOCK-01 | Dòng tồn lúc đầu và màu | Home, tìm E2E | Con5 "Còn 5" xanh, Con1 "Còn 1" vàng, Het "Hết hôm nay" đỏ | đã viết | chưa chạy |
| MOB-STOCK-02 | Sau khi bán | bán 2 × Con5 qua giỏ | "Còn 3 hôm nay"; dòng giỏ bán "Còn 5 trong kho" | đã viết | chưa chạy |
| MOB-STOCK-03 | Sau khi thuê | thuê 1 × Con5 hôm nay | "Còn 2 hôm nay"; khớp API (stock-flow-check) | đã viết | chưa chạy |
| MOB-STOCK-04 | Chi tiết sản phẩm | mở Con5 | cùng số | đã viết (mềm) | chưa chạy |
| MOB-STOCK-05 | Hết hôm nay | dòng Het | nút + vẫn bấm được; nhìn xám kiểm bằng ảnh | đã viết | chưa chạy |
| MOB-STOCK-06 | Hết hôm nay, thuê hôm nay | Het trong giỏ cho hôm nay | thẻ "Hết hàng" | đã viết | chưa chạy |
| MOB-STOCK-07 | Hết hôm nay, thuê ngày mai | Het trong giỏ cho ngày mai | trống, không dòng thiếu | đã viết | chưa chạy |
| MOB-STOCK-08 | Không đủ cho các ngày | 2 × Het cho ngày mai | "Chỉ còn 1 trống trong ngày đã chọn" | đã viết | chưa chạy |
| MOB-CAL-01 | Mở đúng ngày Việt Nam | tab Lịch | tiêu đề HÔM NAY và dd/MM hôm nay | đã viết | chưa chạy |
| MOB-CAL-02 | Danh sách từng ngày | chọn ngày −5 đến +4 | đơn và "giao x · trả y" = API; đơn huỷ 710007 không có | đã viết | script viết, chưa chạy |
| MOB-CAL-03 | Dòng mở đúng đơn | bấm một dòng | mở chi tiết đơn | đã viết | chưa chạy |
| MOB-DETAIL-01 | Tiền trong chi tiết đơn | mở 710001–710009 | tổng, cọc, thế chân, còn thu và các dòng = API | đã viết | chưa chạy |
| MOB-DETAIL-02 | Sau khi sửa đơn | — | — | **chưa viết** | chưa viết |
| MOB-TODO-01 | Bộ đếm | Tổng quan, thẻ Hôm nay | Cần giao x/y, Cần nhận trả x/y, Trễ hạn trả, Quá ngày lấy, Ngày mai = outlet-operations | đã viết | script viết, chưa chạy |
| MOB-TODO-02 | Danh sách của từng bộ đếm | mở danh sách trễ, quá ngày lấy, và Đơn hàng → Việc cần làm | cùng các đơn như API | đã viết | chưa chạy |
| MOB-RPT-01 | Kỳ rỗng, khoảng tuỳ chọn, vai trò không có doanh thu | — | — | **chưa viết** (staff và kho không có thẻ tiền đã nằm trong MOB-ROLE-03) | — |
| MOB-ROLE-01 | Đơn hàng của staff / kho | Đơn hàng, Tất cả đơn | tải được; không có Xoá trong menu đơn | đã viết | chưa chạy |
| MOB-ROLE-02 | Lịch | tab Lịch | tải được, không lộ key | đã viết | chưa chạy |
| MOB-ROLE-03 | Tổng quan | tab Tổng quan | không có số doanh thu | đã viết | chưa chạy |
| MOB-ROLE-04 | Cài đặt | Cài đặt | không có Người dùng, Xuất, Tài khoản ngân hàng, Gói | đã viết (mềm) | chưa chạy |
| MOB-ROLE-05 | Ca sản phẩm của staff / kho có sẵn | chi tiết và form thêm sản phẩm | staff không sửa giá; kho có giá | `test8`/`test8b` có sẵn | chưa chạy |
| MOB-SUB-01..05 | Hết hạn trial, hết hạn active, huỷ đã hết, tạm dừng, nợ | đăng nhập, đi hết các tab, rồi sửa | thông báo đọc được, không lộ key, không tạo gì, dùng lại được sau khi sửa | đã viết (`test10a`/`test10b`) | owner của expired-trial, paused, past-due chạy một phần; còn lại chưa |
| MOB-SUB-06 | Staff và kho của cửa hàng hết hạn | cùng luồng | thông báo phù hợp | đã viết | chưa hợp lệ (script để app ở màn hình chính) |
| MOB-SUB-10 | at-limit: tạo khách, đơn, sản phẩm | tạo từng cái | thông báo đọc được, không tạo gì | đã viết (`test10c`) | chưa chạy |
| MOB-SUB-11 | Giới hạn người dùng / chi nhánh trên giao diện | — | — | **chưa viết** (chỉ có ở API) | — |

Android đã quan sát (tiếng Anh, owner): expired-trial, paused và past-due không tạo được gì (số dòng trước = sau); thông báo hiện như banner kèm Thử lại trên Home, Orders, Overview ("Your subscription has expired.", "Your subscription is paused. Please contact support to reactivate.", "Your payment is overdue…"); sau khi sửa thì Home hiện sản phẩm lại. Không thấy mã lỗi thô. Cài đặt của owner **không có mục Gói** nên không có đường gia hạn thấy được.
Không tự động được / chưa làm: phân loại màu xanh / vàng / đỏ dựa vào điểm ảnh (kiểm mềm); nút + xám cần xem ảnh; selector Android cho lịch, việc cần làm, tồn, giới hạn gói còn là đoán đến khi lái emulator thật.

## iOS UI test hiện có (`apps/mobile/POS ADBDUITests/AnyRentE2ETests.swift`)

Lượt chạy đầy đủ gần nhất (merchant1, API cục bộ, tiếng Việt, trên `dev` db5ce1377, 2026-10-10): 32 test có kết quả, 25 đạt, 7 fail; `test7eOverlapSetting` không có trong log (ổ đĩa đầy giữa lượt); 3 test staff / kho được bỏ qua ở tài khoản merchant.

| Test | Nội dung | Kết quả lần gần nhất |
|---|---|---|
| `test0AuthFlows` | đăng nhập, quên mật khẩu, đăng xuất | đạt |
| `test1HomeProducts`, `test1bHomeStockLines`, `test1cOutTodayAddButton`, `test1bImageSearch` | danh sách, tìm kiếm, dòng tồn "Còn N hôm nay", nút + khi hết hôm nay, tìm bằng ảnh | đạt |
| `test2CartRent`, `test3CartSale` | tạo đơn thuê và đơn bán từ giỏ | đạt |
| `test4OrdersTab`, `test5OrderDetailActions`, `test5bOrderExtendEditPrint`, `test5cOrderActionSheet`, `test5dOrderChangeHistory`, `test5eDetailItemRows`, `test5fOrdersQuietReload` | tab Đơn hàng, thao tác trên đơn, gia hạn, sửa, in, lịch sử, dòng chi tiết, tải lại nền | đạt |
| `test5eEditOrderSheet` | Sửa đơn → "Lưu thay đổi" | **fail**: thiếu toast "Đã lưu đơn #…" (chưa phân loại: lỗi app hay thời gian chờ) |
| `test6Calendar` | lịch tháng, ngày hôm nay, mở đơn | đạt |
| `test7Overview`, `test7kOverviewTiles`, `test7lOverviewSheets` | Tổng quan, bốn thẻ, bảng chi tiết, tổng danh sách đơn liên quan (+ checker 41 kiểm tra) | đạt |
| `test7aCustomers`, `test7cSettingsUsers`, `test7fCartPricingSheet`, `test7gChangePasswordSheet`, `test7iNotifications`, `test7kBankAccounts` | khách hàng, cài đặt, giá trong giỏ, đổi mật khẩu, thông báo, tài khoản ngân hàng | đạt |
| `test7bProductManage` | thêm / sửa / xoá sản phẩm | **fail**: "No product with open orders" (phụ thuộc dữ liệu seed) |
| `test7dProductChangeHistory` | lịch sử thay đổi sản phẩm | **fail**: "Product 25 - not found" (phụ thuộc dữ liệu seed) |
| `test7hOrdersByProductAndCustomer` | Đơn theo sản phẩm / khách | **fail**: không thấy thẻ "Doanh thu" |
| `test7jTodayWorkAndNotPickedUp` | thẻ việc hôm nay, Chưa lấy đồ | **fail**: không thấy mục "Việc hôm nay" (iOS nay dùng thẻ "Hôm nay"; test có thể cũ) |
| `test7eOverlapSetting` | "Cho tạo đơn khi trùng lịch" bật / tắt | không có trong log của lượt này (log có thể bị cắt vì ổ đĩa đầy giữa chừng): cần chạy lại |
| `test8StaffRestrictions`, `test8bStaffNoHistory`, `test8bInventoryRole` | staff và kho: hạn chế, không có lịch sử, quản lý sản phẩm | chạy riêng bằng `--account staff` / `inventory` |
| `test8cOverlapTagAndRoleSheet`, `test8dCartLines` | thẻ "Hết hàng" trong giỏ, dòng giỏ không thẻ | **fail**: cần sản phẩm riêng ("Váy cưới thuê theo ngày"…) mà seed cục bộ không có |
| `test9SettingsLogout` | cài đặt, đăng xuất | đạt |

Các ca fail phải được phân loại (dữ liệu seed, test cũ hay lỗi app) và sửa hoặc ghi known bug; chưa làm trong PR này.

## Lỗi đã biết mà test đang giữ (known bug)

| Issue | Lỗi | Ca test |
|---|---|---|
| #504 | sửa số lượng đơn đang thuê làm kẹt món ở "đang thuê" | BF-QTY-04 |
| #505 | gia hạn đơn đang thuê: tiền thuê thêm không được tính phải thu, đổi tiền ngày giao | BF-EDIT-11 |
| #577 | đơn từ giỏ Android cũ (trước #413) đọc lại thì ngày trả trễ 1 ngày | BF-RT-08-oldAndroid (56 ca) |
| #728 | tuyến `requireActiveSubscription:false` vẫn bị chặn với cửa hàng hết hạn: không xem được trạng thái, danh sách gói, đổi gói, checkout; web không có đường gia hạn | BF-SUB-17..19, WEB-SUB-01..05 (-c, -d) |
| #729 | khách, chi nhánh, đơn đã xoá vẫn tính vào giới hạn gói | BF-SUB-48..50 |
| #730 | staff / kho sửa đơn của chi nhánh khác thì đơn bị chuyển sang chi nhánh của họ | BF-ROLE-07 |
| #731 | staff / kho đọc được đơn của chi nhánh khác (`GET /api/orders/{id}`, by-number) | BF-ROLE-08 |
| #732 | staff / kho đọc được tồn và lịch đặt của chi nhánh khác qua các route availability | BF-ROLE-09 |
| #736 | staff / kho thấy "Thêm chi nhánh" và "Sửa" ở /outlets (API từ chối) | WEB-ROLE-10c, 11c |
| #737, #738 (sửa trong PR #743) | /loyalty và gói không có quyền web hiện khoá thô `errors.…` | WEB-ROLE-26, 27; WEB-SUB-08 |
| #740 (PR #743) | 118 mã lỗi API chưa dịch, `translateError` hiện `errors.<MÃ>` | `tests/error-codes-translated.test.ts` |
| #733 | thẻ gói trên trang chủ hiện khoá thô `plans.features.loyalty` (không có trong `locales/*/plans.json`) | WEB-UI-PUB (known) |
| #734 | `/pricing` viết cứng tiếng Anh, bỏ qua ngôn ngữ | WEB-UI-PUB (known) |
| #735 | `/pricing` lỗi hydration ("2,000" ở server, "2.000" ở client: `toLocaleString()` không có locale) | WEB-UI-PUB (known) |
| #741 | sửa sản phẩm chỉ cho thuê (giá bán 0, như app tạo) bị chặn "Nhập giá bán" | WEB-UI-PRD (known) |
| #744 | lưu "Tài khoản của tôi" xong, thanh bên và form vẫn hiện tên cũ đến lần đăng nhập sau | WEB-UI-SET (known) |

**Theo dõi chi nhánh (#745, PR #746):** web ẩn "Thêm chi nhánh" cho đến khi làm xong nhiều chi nhánh (`NEXT_PUBLIC_ENABLE_ADD_OUTLET=true` bật lại). Sau khi PR này merge, WEB-ROLE-10c / 11c (nút "Thêm chi nhánh" của staff và kho, #736) đạt phần nút thêm, WEB-SUB-24 (giới hạn gói chi nhánh qua giao diện) và WEB-UI-MAN (thêm chi nhánh) không còn nút để bấm: cần cập nhật theo.

## Câu hỏi cho chủ cửa hàng (hiện trạng đang được khẳng định)

- **Q1** No server-side stock check: POST and PUT `/api/orders` accept a booking or edit that overbooks (BF-DUP-04,
  BF-QTY-02, BF-EDIT-04). Only the apps' availability check stops it. Keep (shops may overbook on purpose) or reject?
- **Q2** A booking cancelled later still counts as a "new order" of its creation day (BF-CANC-02, #484 rule).
- **Q3** RETURNED, CANCELLED and COMPLETED orders accept any edit through PUT, including `totalAmount` (BF-EDIT-13).
- **Q4** The API stores the app's totals without re-pricing (BF-PRICE-08).
- **Q5** No order payment endpoint exists (only `payments[]` read on order detail), so partial payments and
  overpayment are not testable through the API; `amountDue` on `POST /api/orders` is `total − loyalty`, while list
  rows use `computeOrderBalance` (`total − deposit + collateral − paid`).
- **Q6** Seed account emails follow row ids (`merchant<id>@`), so they change on every reseed of the same database.
- **Q1 (BF-SUB-23)** Token của cửa hàng hết hạn nhận 403 ở `/api/auth/verify` và `/api/users/profile`, trong khi đăng nhập vẫn chạy và trả đối tượng subscription. App có cần gọi được verify và profile để hiện lý do không?
- **Q2 (BF-SUB-45)** Giới hạn gói 0 (hoặc tổng 0, `orders: 0`) tính là không giới hạn. Gói ghi "0 chi nhánh" thì thành không giới hạn. Đúng ý không?
- **Q3 (BF-SUB-47)** Người dùng bị khoá (`isActive` false) vẫn chiếm chỗ trong giới hạn người dùng. Đúng ý không?
- **Q4 (BF-SUB-51)** Giới hạn đơn đếm mọi đơn từ trước đến nay, kể cả đơn huỷ và đơn cũ, không theo kỳ. Đơn huỷ có nên tính, và giới hạn có nên reset theo kỳ?
- **Q5 (BF-SUB-31)** Nhận biết nền tảng bỏ qua `X-Device-Type` nếu không có `X-Client-Platform`. App gửi cả hai nên không ảnh hưởng.
- **Q6 (#728)** Cửa hàng PAUSED, CANCELLED (đã hết), PAST_DUE có nên vào được trang trạng thái, danh sách gói và checkout sau khi sửa #728? PAST_DUE ghi "cập nhật thanh toán" nên cần.
- **Q7 (BF-STOCK-03)** Bán vượt tồn vẫn được nhận và tồn thành −1. Giữ hay từ chối?
- **Q8 (BF-CAL-05)** Lịch (số đếm và danh sách) không có `status` vẫn gồm đơn CANCELLED. Android luôn gửi `RESERVED` nên không ảnh hưởng.
- **Q9 (BF-CART-05)** Ngày không ai giữ, một đơn lớn hơn tồn (kể cả tồn 0) vẫn được nhận dù tắt "cho trùng lịch". Theo thiết kế trong `schedule-conflict.ts` ("cài đặt này chỉ về đặt trùng"). Giữ?
- **Q10 (BF-CART-09)** Check lẻ báo `available`/`renting` là 3/2 cho đơn RESERVED, còn check giỏ và detail báo 5/0. `effectivelyAvailable` thì khớp. Hai check khác nhau ở 2 trường này có sao không?
- **Q11 (BF-ROLE-14)** Staff gửi giá khi tạo sản phẩm vẫn được lưu dù staff không được sửa giá. Có nên từ chối giá từ staff khi tạo?
- **Q12 (WEB-ROLE-13c)** Kho có `products.export` và API xuất được, nhưng web ẩn nút "Xuất Excel" của kho. Hiện trạng đang được khẳng định.
- **Q13 (WEB-SUB-0x-staff-d, -kho-d)** Với cửa hàng hết hạn / huỷ, staff và kho thấy cùng toast như chủ ("Vui lòng gia hạn", "Chọn gói mới"); họ không gia hạn được và toast không có gợi ý "hỏi chủ cửa hàng".
- **Q14 (WEB-ROLE-06b)** `/dashboard/related?kind=orderValue` mở bằng URL cho staff và kho thấy các đơn trong ngày và tổng của chúng, bằng đúng số tiền ở thẻ doanh thu mà họ không được thấy (nhưng `GET /api/orders` cho phép họ). Chấp nhận không?
- **Q15 (WEB-STOCK-05c)** Đơn thuê giao sớm vài ngày so với ngày dự kiến: chi tiết hiện 0 còn / 2 đang thuê, nhưng danh sách "Hôm nay" và picker hôm nay vẫn hiện "Còn 2/2" vì đếm theo ngày dự kiến.
- **Q16** Đăng nhập không bao giờ bị chặn với cửa hàng hết hạn, huỷ, tạm dừng hay nợ: họ vào dashboard với toast và các thẻ thử lại, không có chuyển hướng hay banner. Đúng ý không?
- **Q17 (mobile)** Android chỉ có chuỗi cho SUBSCRIPTION_EXPIRED và TRIAL_EXPIRED; PAUSED, PAST_DUE, CANCELLED, PERIOD_ENDED, NO_SUBSCRIPTION rơi về chữ tiếng Anh của API. iOS chỉ có PAST_DUE, NO_SUBSCRIPTION, PERIOD_ENDED, chưa có SUBSCRIPTION_EXPIRED, PAUSED, CANCELLED, PLAN_LIMIT_EXCEEDED. Có cần dịch đủ vi/en trên cả hai app không?
- **Q18** `/api/subscriptions/status` cũng trả 403 cho cửa hàng hết hạn nên app mobile không hiện được chi tiết gói hay nút gia hạn; Cài đặt không có mục Gói. Đường gia hạn dự kiến là gì? Staff và kho không gia hạn được, cần thông báo "hỏi chủ cửa hàng".
- **Q19** API lịch đếm đơn RESERVED chỉ ở ngày giao, và đơn đang trả chỉ khi PICKUPED. Đơn đặt nhiều ngày không hiện ở ngày trả của nó. Có đúng ý không?
- **Q20 (WEB-UI-SET-03)** Mở tab thông tin cửa hàng tự đổi tiền tệ cửa hàng theo ngôn ngữ giao diện (vi→VND, en→USD) và không có ô chọn tiền tệ. Đúng ý không?
- **Q21 (WEB-UI-AUTH-10)** Phiên bị đá do đăng nhập nơi khác chuyển về /login không có thông báo "đã đăng nhập ở thiết bị khác", dù `SESSION_REPLACED` đã có trong `errors.json`. Có nên hiện thông báo?
- **Q22** Liên kết "Kiểm tra còn hàng" (`/availability?productId=`) không chọn sẵn sản phẩm trên dev server. Bản production có ổn không?
- **Q23** Giỏ tạo đơn hiện "100,000" (dấu phẩy) ở giao diện vi, trong khi danh sách dùng dấu chấm (tiền seed là USD). Có chủ ý không?
- **Q24** Danh mục có hai mục mặc định "Chung" và "Default" (mục sau xuất hiện trong lúc test nhập / sửa).
- **Q25** Tiêu đề toast ở trang sản phẩm không tồn tại là "Error" (tiếng Anh) trong giao diện vi.
- **Q26** Trang đơn trên web chưa có "gia hạn thuê". Có kế hoạch làm không?
- **Q27** Ô "Tìm kiếm" ở thanh trên cần bấm Enter mới tìm theo số đơn.
- **Q28 (WEB-UI-PRD-11)** Staff đổi giá sản phẩm qua API bị bỏ qua im lặng (200, giá không đổi) thay vì từ chối 403. Có chủ ý không?
