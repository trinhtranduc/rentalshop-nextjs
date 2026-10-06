# Timezone audit findings (2026-10-06, origin/dev @283986796, read-only)

## api

API-1 Critical products/availability/route.ts:73-79,170-174,297 UTC-day window + return stretched to 23:59Z → double booking / false busy. iOS order check. Fix getAvailabilityCivilDayBounds.
API-2 Critical batch-availability/route.ts:298-316 lte on next VN midnight → pickup next day counts as conflict on 10/10 (web Tạo đơn, availability page, mobile carts). Fix lt/gte.
API-3 High analytics/today-metrics:18-26 server-midnight "today" (mobile home today revenue). 
API-4 High analytics/dashboard:30-37 same, lte drops 999ms.
API-5 High growth-metrics:33-51,91-92 UTC start, server-local end, month via getMonth.
API-6 High top-products, top-outlets :37-38 normalize UTC days (also admin ADM-2).
API-7 High top-customers:31-42 setHours server.
API-8 High analytics/overview:70-77 → order.ts:2606 getStatistics UTC days and totalRevenue includes CANCELLED; two totals in one response.
API-9 High orders/customers/products/users export → parseDateRangeFromQuery UTC days; formatDateForExcel server-local → cells UTC time (WEB-1).
API-10 High customers/[id]/orders:147-150, merchants/[id]/orders:79, orders/cursor:24, orders/statistics:21 list UTC day vs aggregate end 00:00Z → totals disagree.
API-11 Med loyalty expiry.ts:21-22 yearly reset server-local date.
API-12 Med overdue has 3 meanings: today-metrics (< now), orders/stats (< 00:00Z), calendar count (< VN start).
API-13 Med enhanced-dashboard:146-155 todayPickups no upper bound.
API-14 Low calendar/orders:274-275,308-309 meta.dateRange via toISOString().split → previous day.
API-15 Med analytics/system, recent-orders (end day empty), audit.ts:306 server-local buckets/labels (also ADM-3).
API-16 Low calendar/orders/count:179 default year = server year.
API-17 Med subscriptions status/proration/payments manual/extend/renew/revenuecat: daysRemaining ceil hours; setMonth(+n) on 31st overflows (Jan31+1m=Mar3).
API-18 Info fixed +7h in getLocalDateKey, availability-calendar-days, outlet-operations-day, rental-days (blocks #567).
Verified OK: orders list, countRentalDays, analytics income*/period/orders/enhanced-dashboard ranges, calendar by-date/count/orders, products/[id]/availability, calendarDayAvailability, outlet-operations, expiry reminders cron, change timeline.

## pkg

PKG-1 High date-range.ts:94-112,383-395,453-483 normalize*/getDateRangeFromPeriod/parseDateRangeFromQuery UTC days (exports, top-products/outlets, order.ts search/cursor/statistics, subscription, audit) = root of API-6/9/10.
PKG-2 High excel.ts:101-120,161-165 formatDateForExcel machine zone → UTC times in exports.
PKG-3 High packages/ui CreateOrderForm OrderInfoSection.tsx:519-524 + date-range-picker.tsx:363: admin create/edit order for merchant — Tokyo/Seoul/SG browser saves day −1; LA highlights wrong day.
PKG-4 Med-High OrderDateRangeFilter.tsx, OrderQuickFilters.tsx:36-80, ExportDialog.tsx:56-209 browser-day presets, custom shift in LA, max/default via toISOString().split (= ADM-4).
PKG-5 Med date.ts formatDate/formatDateTime/…ByLocale/formatDateLong… no timeZone (~55 files, receipts old, admin tables).
PKG-6 Med email.ts:871-1324 subscription emails print day before at boundary.
PKG-7 Med loyalty expiry.ts:13-23 (= API-11).
PKG-8 Med hooks useProductAvailability.ts:50-150 instant compare not civil day → admin create order misses same-day conflicts.
PKG-9 Low dead/legacy: utils/api/calendar.ts:175-233 (unused, delete), order-number-generator today stats, order.ts searchOrders (unused), getUTCDateKey trap (used by calendar/orders), usePaymentsData:114, date-range-picker:148.
Standard helpers: formatDateKeyInTimeZone, toDateKeyInTimeZone, getUtcRangeForDateKeys, getCalendarDayRangeInTimeZone, addDaysToDateKey, listCivilDays/Months, civilDayBucket, countRentalDays, applyOrderDateRange(exact=true). Gap: no shared formatInShopZone.

## admin

ADM-1 High ranking-period.ts:30-47 today/month/year from browser day (LA/UTC browser at VN 00:30 → yesterday). Fix formatDateKeyInTimeZone(now,SHOP_TIMEZONE).
ADM-2 High (API) analytics/top-outlets, top-products route.ts:37-38 normalizeStart/EndDate UTC days. Fix getUtcRangeForDateKeys.
ADM-3 High (API) analytics/system route.ts:29-31 new Date('YYYY-MM-DD') both ends; Today = zero-length window; month loses last day.
ADM-4 High packages/ui OrderDateRangeFilter.tsx:130-133 + admin orders/page.tsx:210-215 custom range shifts −1 day in LA browser.
ADM-5 High SubscriptionExtendDialogEnhanced.tsx:151-159,170-172,290,468 extension end day off (VN loses a day; LA gains ~15h); min uses UTC day.
ADM-6 High SubscriptionForm.tsx:430-497 datetime-local shows UTC, reads local → each save shifts start/end/nextBilling by −7h (VN) / +7..8h (LA).
ADM-7 Med admin dashboard/page.tsx:281-670 charts & totalRevenue bucket by browser zone; sortKey UTC vs local label mis-merge even in VN.
ADM-8 Med (API) analytics/growth-metrics route.ts:31-55,96 UTC start + server-time end.
ADM-9 Low display: packages/ui lib/utils.ts:14 formatDate, subscriptions/[id]:265, SubscriptionList:107, merchants/.../orders:131, dashboard:1108, posts, system-users:438, plan-variants:629, logs toLocaleString. Also OrderDateRangeFilter max = UTC day (VN admin can't pick today 00:00-06:59), getLastNDays browser day, export filenames UTC.
Verified OK: dashboard apiRange keys; analytics/income, analytics/orders; orders route keys; expiry checks (instant compare); payments stats.

## web

(web shop day logic is browser-zone independent: all today/day keys use SHOP_TIMEZONE)
WEB-1 High orders/page.tsx:212-218 → /api/orders/export uses parseDateRangeFromQuery (UTC days, date-range.ts:94-112) while list uses VN days → Excel rows differ from list. Fix in API export route.
WEB-2 Med-High todayKey useMemo([]) never refreshes (dashboard:76, orders:122, orders/[id]:95, OrderEditor:219, calendar:151, availability:369, customers:93, customers/[id]:78, customers/[id]/orders:96, products/[id]/orders:117) → tab open past VN midnight: wrong Hôm nay, late badges, quick pick books past day. Fix useShopToday() refresh on focus/visibility/next-midnight timer.
WEB-3 Med OrderEditor.tsx:470-489 + create-model.ts:515-516 Sửa đơn always rewrites pickupPlanAt/returnPlanAt to VN 00:00 even when days unchanged → loses clock time (dashboard "Giao lúc 00:00"). Fix: keep original instant when day key unchanged.
WEB-4 Low SubscriptionRenewalBottomBar.tsx:101-106 "expired N days ago" in 24h blocks, not civil days.
Verified OK: range-model/RangeCalendar, Tạo đơn quickDays/dayRangeIso/countRentalDays/batch availability tz, schedule-model, orders list createdRange/rows, order page models, receipt, dashboard ranges/series/ops panel, calendar, availability, notifications grouping, staff lastSeen, subscription model, created stamps, export filenames.

## ios

(only wrong when phone is outside VN; root causes: startOfDay/endOfDay RCExtentions.swift:916-930, DayFormatter DesignTokens.swift:120,140, timeZone .current defaults; DeviceTimeZone.identifier DesignTokens.swift:113-115 honoured by API)
IOS-1 Critical cart instants CartV2ViewController.swift:765-767, Cart.swift:836-837,963 device day bounds (Tokyo holds extra day before; LA/UTC spills next day); rentalDuration Calendar.current; batch-availability window 486-499 + conflict keys same.
IOS-2 Critical RentalExtension.swift:25-88, OrderExtendSheetViewController.swift:51-54 extension returnPlanAt device zone.
IOS-3 High OrdersHomeViewModel.swift:357-386,465 + OrderService.swift:260-265 rent list Today/custom range device-day ISO → yesterday (Tokyo/LA). OrdersFilterSheet.swift:345.
IOS-4 High timeZone=device on calendar/overview/today-work TabsV2APIService.swift:56-88, AnalyticsAPIService.swift:908; todayKey CalendarV2VC:35,42, OverviewV2VC:39,578,584 → revenue/day differs from web.
IOS-5 High ProductDetailViewController.swift:503 7-day strip todayKey device.
IOS-6 Med OrdersHomeViewModel.swift:122,162,193,327,465 lateDays/groupByDay/sectionTitle .current; ProductDetailV2Logic.page:136; OverviewRankingOrdersVC:943.
IOS-7 Med rental-day count ProductsV2.swift:457,520, OrderDetailLogic.swift:229 (Tokyo: VN 10→10 shows 2 ngày).
IOS-8 Low DayFormatter.short device zone in OrderDetailVC:326,334,712; CartV2VC:309; OrderExtendSheetVC:48,118; CustomersV2:237; ProductsV2:555; OrderDetailLogic:209; OrdersFilterSheet:176; OverviewV2VC:541; OverviewV2.swift:101-117.
IOS-9 Low legacy flagged-off screens + dateServerInString + OrderService.loadCalendarOrders:671-677, loadOverviewOrder:421, DraftOrderReminder:184, DraftOrderNotificationCard:400.
Verified OK: Order Check/availability (VN zone), ScheduleConflictLogic, NotificationsLogic, ChangeHistoryLogic, RentedOut, ProductDetailV2Logic.rowState/meta, OrdersHomeLogic.rowDay/rowLines, createdStamp, key arithmetic, dateServerISOString encoder, export range keys.

## android

(only wrong when phone is outside VN; paths under apps/mobile-android/app/src/main/java/com/anyrent/pos/)
AND-1 Critical domain/orders/OrderPlanDays.kt:21-25 (CartStore.kt:592-593, CartOrderSubmit.kt:41, CartCheckoutScreen.kt:242) create instants from device zone: Tokyo pickup 03/10 22:00 VN (extra day held); LA return lands 06/10; UTC = #413 again. iOS same (RCExtentions.swift:916-934 TimeZone.current). Fix shop zone default.
AND-2 Critical CartStore.kt:346-347, RentalExtension.kt:35-74, OrderExtendSheet.kt:71-73 edit/extend load+save in device zone → silently moves dates (LA starts a day earlier; Tokyo return pushed). iOS same (RentalExtension.swift .current).
AND-3 High DefaultAvailabilityRepository.kt:76-110, AvailabilityViewModel.kt:23,212-215, CartV2Screen.kt:182 availability windows in device zone → false conflicts (iOS sends date+timeZone=VN, correct). AvailabilityScreen.kt:296,702 today from phone.
AND-4 High OrdersBoardLogic.kt:159-178 today/7d/month keys from device day → LA asks yesterday, Tokyo 00-02 asks tomorrow. iOS same (dayBounds .current).
AND-5 Med late-by-N days device zone: OrdersHomeViewModel.kt:95-135, OverviewLinks.kt:42, OrderDetailV2Screen.kt:462, OrderDetailV2Sheets.kt:123, EntityOrdersScreen.kt:295 vs RentedOut (VN) disagree. iOS same split.
AND-6 Med calendar/overview/today-work send device timeZone (DefaultTodayWorkRepository.kt:18, CalendarV2ViewModel.kt:40-104, OverviewV2ViewModel.kt:43-90) and API honours it → shop days shifted; Overview heading VN vs data device. iOS same (TabsV2APIService.swift:56-88).
AND-7 Med OrderDetailV2Screen.kt:108,411,579-583 schedule row/day count device zone.
AND-8 Low receipts ThermalPrinter.kt:221,231, OrderReceiptShare.kt:112, CustomersV2Screens.kt:686, UiHelpers.kt:79,165,182 device zone.
AND-9 Low CartStore.kt:50,53,324,520 + CartV2Screen.kt:182 default cart day = phone today.
Verified OK: OrderRowDates, ChangeHistory, OverlapWarnings, RentedOutLogic, NotPickedUpLogic, NotificationsLogic, OrderDetailLogic.createdStamp, ProductDetailLogic.rowState, CalendarLogic.lateDays, OrderPlanDays.wire UTC formatting, date pickers, export day keys.

