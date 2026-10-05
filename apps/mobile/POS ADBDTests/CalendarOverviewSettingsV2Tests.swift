import XCTest
@testable import POS_ADBD

/// #374 — calendar marks and grid, overview periods and parsing, settings rows by role
final class CalendarOverviewSettingsV2Tests: XCTestCase {

    private func decode<T: Decodable>(_ type: T.Type, _ json: String) throws -> T {
        try JSONDecoder.shared.decode(type, from: json.data(using: .utf8)!)
    }

    // MARK: - Calendar grid

    func testOctober2026GridStartsOnMonday() {
        // 1 Oct 2026 is a Thursday: Mon 28, Tue 29, Wed 30 Sep come first
        let grid = CalendarV2Logic.monthGrid(year: 2026, month: 10, todayKey: "2026-10-03")
        XCTAssertEqual(grid.count, 35)
        XCTAssertEqual(grid.prefix(4).map(\.key), ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"])
        XCTAssertFalse(grid[0].inMonth)
        XCTAssertTrue(grid[3].inMonth)
        XCTAssertEqual(grid.filter(\.inMonth).count, 31)
        XCTAssertEqual(grid.filter(\.isToday).map(\.key), ["2026-10-03"])
        XCTAssertEqual(grid.last?.key, "2026-11-01")
    }

    func testGridAcrossYearAndLeapFebruary() {
        // Feb 2027 starts on a Monday and has 28 days: exactly four weeks
        let feb2027 = CalendarV2Logic.monthGrid(year: 2027, month: 2, todayKey: "2027-02-10")
        XCTAssertEqual(feb2027.count, 28)
        XCTAssertEqual(feb2027.first?.key, "2027-02-01")
        // Feb 2028 is a leap month starting on a Tuesday
        let feb2028 = CalendarV2Logic.monthGrid(year: 2028, month: 2, todayKey: "2028-02-29")
        XCTAssertEqual(feb2028.filter(\.inMonth).count, 29)
        XCTAssertEqual(feb2028.first?.key, "2028-01-31")
        // January opens after December of the year before
        let jan = CalendarV2Logic.monthGrid(year: 2027, month: 1, todayKey: "2026-12-31")
        XCTAssertEqual(jan.first?.key, "2026-12-28")
        XCTAssertTrue(jan.filter(\.isToday).map(\.key) == ["2026-12-31"])
    }

    func testMonthNavigationAndDefaultSelection() {
        XCTAssertTrue(CalendarV2Logic.addMonths(year: 2026, month: 12, delta: 1) == (2027, 1))
        XCTAssertTrue(CalendarV2Logic.addMonths(year: 2026, month: 1, delta: -1) == (2025, 12))
        XCTAssertEqual(CalendarV2Logic.defaultSelection(year: 2026, month: 10, todayKey: "2026-10-03"), "2026-10-03")
        XCTAssertEqual(CalendarV2Logic.defaultSelection(year: 2026, month: 11, todayKey: "2026-10-03"), "2026-11-01")
    }

    // MARK: - Calendar marks

    func testMarksFromByDate() throws {
        let counts = try decode(CalendarMonthCounts.self, """
        {"countByDate":{"2026-10-01":1},"total":1,
         "byDate":{"2026-10-01":{"pickups":0,"returns":1},"2026-10-03":{"pickups":2,"returns":1},
                   "2026-10-05":{"pickups":3,"returns":0},"2026-10-06":{"pickups":0,"returns":0}},
         "lateReturns":4}
        """)
        XCTAssertEqual(counts.lateReturns, 4)
        let today = "2026-10-03"
        // Return due before today and still out → late (red square), no ring
        XCTAssertEqual(CalendarV2Logic.marks(for: "2026-10-01", counts: counts, todayKey: today),
                       CalendarDayMarks(handOver: false, returning: false, lateReturn: true))
        // Today: dot + ring
        XCTAssertEqual(CalendarV2Logic.marks(for: today, counts: counts, todayKey: today),
                       CalendarDayMarks(handOver: true, returning: true, lateReturn: false))
        XCTAssertEqual(CalendarV2Logic.marks(for: "2026-10-05", counts: counts, todayKey: today),
                       CalendarDayMarks(handOver: true, returning: false, lateReturn: false))
        XCTAssertEqual(CalendarV2Logic.marks(for: "2026-10-06", counts: counts, todayKey: today), .none)
        XCTAssertEqual(CalendarV2Logic.marks(for: "2026-10-31", counts: counts, todayKey: today), .none)
        XCTAssertEqual(CalendarV2Logic.marks(for: today, counts: nil, todayKey: today), .none)
    }

    func testCountsParsingWithoutNewFields() throws {
        // An older API sends only countByDate: no marks, no late count, no failure
        let old = try decode(CalendarMonthCounts.self, #"{"countByDate":{"2026-10-01":3},"total":3}"#)
        XCTAssertTrue(old.byDate.isEmpty)
        XCTAssertEqual(old.lateReturns, 0)
        let partial = try decode(CalendarMonthCounts.self, #"{"byDate":{"2026-10-02":{"pickups":2}}}"#)
        XCTAssertEqual(partial.byDate["2026-10-02"], CalendarDayCount(pickups: 2, returns: 0))
    }

    func testDayRowsAndLateDays() throws {
        let response = try decode(CalendarDayOrdersResponse.self, """
        {"success":true,"data":{"date":"2026-10-01","orders":[
          {"id":5,"orderNumber":"ORD-001-0005","customerName":"James Miller","status":"PICKUPED","orderType":"RENT",
           "totalAmount":323,"orderItems":[{"productName":"Áo dài","quantity":2},{"productName":"Cà vạt","quantity":1},{"quantity":1}]},
          {"id":6,"customerName":null,"totalAmount":null}
        ]}}
        """)
        let orders = response.data?.orders ?? []
        XCTAssertEqual(orders.count, 2)
        XCTAssertEqual(orders[0].itemsSummary, "Áo dài ×2, Cà vạt")
        XCTAssertNil(orders[1].customerName)
        XCTAssertEqual(orders[1].totalAmount, 0)
        XCTAssertEqual(orders[1].itemsSummary, "")

        let rows = CalendarV2Logic.rows(dayKey: "2026-10-01", todayKey: "2026-10-03", pickups: [orders[1]], returns: [orders[0]])
        XCTAssertEqual(rows.map(\.kind), [.handOver, .takeBack])
        XCTAssertEqual(rows.map(\.lateDays), [2, 2])
        XCTAssertEqual(CalendarV2Logic.lateDays(dayKey: "2026-10-05", todayKey: "2026-10-03"), 0)
        XCTAssertEqual(CalendarV2Logic.lateDays(dayKey: "2026-09-30", todayKey: "2026-10-01"), 1)
    }

    // MARK: - Overview periods

    func testPresetRangesInsideAMonth() {
        let today = "2026-10-03"
        XCTAssertEqual(OverviewLogic.range(of: .today, todayKey: today), DayKeyRange(start: today, end: today))
        XCTAssertEqual(OverviewLogic.range(of: .yesterday, todayKey: today), DayKeyRange(start: "2026-10-02", end: "2026-10-02"))
        XCTAssertEqual(OverviewLogic.range(of: .last7, todayKey: today), DayKeyRange(start: "2026-09-27", end: today))
        XCTAssertEqual(OverviewLogic.range(of: .last30, todayKey: today), DayKeyRange(start: "2026-09-04", end: today))
        XCTAssertEqual(OverviewLogic.range(of: .thisMonth, todayKey: today), DayKeyRange(start: "2026-10-01", end: today))
        XCTAssertEqual(OverviewLogic.range(of: .lastMonth, todayKey: today), DayKeyRange(start: "2026-09-01", end: "2026-09-30"))
        XCTAssertEqual(OverviewLogic.range(of: .last7, todayKey: today).dayCount, 7)
        XCTAssertEqual(OverviewLogic.range(of: .last30, todayKey: today).dayCount, 30)
    }

    func testPresetRangesAcrossMonthAndYearEdges() {
        // First of the month
        XCTAssertEqual(OverviewLogic.range(of: .yesterday, todayKey: "2026-03-01"), DayKeyRange(start: "2026-02-28", end: "2026-02-28"))
        XCTAssertEqual(OverviewLogic.range(of: .thisMonth, todayKey: "2026-03-01"), DayKeyRange(start: "2026-03-01", end: "2026-03-01"))
        XCTAssertEqual(OverviewLogic.range(of: .lastMonth, todayKey: "2026-03-31"), DayKeyRange(start: "2026-02-01", end: "2026-02-28"))
        XCTAssertEqual(OverviewLogic.range(of: .lastMonth, todayKey: "2028-03-15"), DayKeyRange(start: "2028-02-01", end: "2028-02-29"))
        // New year
        XCTAssertEqual(OverviewLogic.range(of: .yesterday, todayKey: "2027-01-01"), DayKeyRange(start: "2026-12-31", end: "2026-12-31"))
        XCTAssertEqual(OverviewLogic.range(of: .last7, todayKey: "2027-01-03"), DayKeyRange(start: "2026-12-28", end: "2027-01-03"))
        XCTAssertEqual(OverviewLogic.range(of: .lastMonth, todayKey: "2027-01-10"), DayKeyRange(start: "2026-12-01", end: "2026-12-31"))
        XCTAssertEqual(OverviewLogic.range(of: .last30, todayKey: "2027-01-10"), DayKeyRange(start: "2026-12-12", end: "2027-01-10"))
    }

    func testTodayKeyFollowsTheDeviceZone() {
        // 2026-10-02 18:30 UTC is already 3 Oct in Vietnam, still 2 Oct in UTC
        let instant = Date(timeIntervalSince1970: 1_790_965_800)
        let vn = DayFormatter.key(instant, timeZone: TimeZone(identifier: "Asia/Ho_Chi_Minh")!)
        let utc = DayFormatter.key(instant, timeZone: TimeZone(identifier: "UTC")!)
        XCTAssertEqual(vn, "2026-10-03")
        XCTAssertEqual(utc, "2026-10-02")
        XCTAssertEqual(OverviewLogic.range(of: .today, todayKey: vn).start, "2026-10-03")
        XCTAssertEqual(OverviewLogic.range(of: .yesterday, todayKey: utc).start, "2026-10-01")
    }

    func testPreviousPeriod() {
        XCTAssertEqual(OverviewLogic.previous(DayKeyRange(start: "2026-09-27", end: "2026-10-03")),
                       DayKeyRange(start: "2026-09-20", end: "2026-09-26"))
        XCTAssertEqual(OverviewLogic.previous(DayKeyRange(start: "2026-10-03", end: "2026-10-03")),
                       DayKeyRange(start: "2026-10-02", end: "2026-10-02"))
        // A whole month compares with the same number of days before it (as the API does)
        XCTAssertEqual(OverviewLogic.previous(DayKeyRange(start: "2026-03-01", end: "2026-03-31")),
                       DayKeyRange(start: "2026-01-29", end: "2026-02-28"))
        XCTAssertEqual(OverviewLogic.previous(DayKeyRange(start: "2027-01-01", end: "2027-01-03")),
                       DayKeyRange(start: "2026-12-29", end: "2026-12-31"))
    }

    func testRangeLabelsAndGrouping() {
        let vi = Locale(identifier: "vi_VN")
        let vn = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
        let range = DayKeyRange(start: "2026-09-27", end: "2026-10-03")
        XCTAssertEqual(OverviewLogic.shortRange(range), "27/09 – 03/10")
        XCTAssertEqual(OverviewLogic.longRange(range, timeZone: vn, locale: vi), "CN 27/09 – T7 03/10")
        XCTAssertEqual(OverviewLogic.shortRange(DayKeyRange(start: "2026-10-03", end: "2026-10-03")), "03/10")
        XCTAssertEqual(OverviewLogic.groupBy(range), "day")
        XCTAssertEqual(OverviewLogic.groupBy(DayKeyRange(start: "2026-01-01", end: "2026-03-31")), "month")
        XCTAssertEqual(OverviewLogic.changeText(8), "▲ 8%")
        XCTAssertEqual(OverviewLogic.changeText(-12.46), "▼ 12,5%")
        XCTAssertEqual(OverviewLogic.changeText(0.01), "0%")
    }

    func testReportParsingAndBars() throws {
        let report = try decode(OverviewReport.self, """
        {"startDate":"2026-09-28","endDate":"2026-10-04","groupBy":"day",
         "operational":{"orderCounts":{"new":24,"pickup":11,"return":4,"cancelled":21},"totalRevenue":106232,"totalActualRevenue":105342},
         "revenue":{"totalRevenue":106232,"totalActualRevenue":105342,"totalOrders":60},
         "growth":{"orders":{"current":25,"previous":5,"growth":400},"revenue":{"current":106232,"previous":2696,"growth":3840.36}},
         "series":[{"month":"28/09/26","date":"2026/09/28","realIncome":1440},{"month":"29/09/26","date":"2026/09/29","realIncome":708},
                   {"month":"04/10/26","date":"2026/10/04","realIncome":-420}],
         "topProducts":[{"id":12,"name":"Garden Tools","rentalCount":3,"totalRevenue":80148,"image":null},{"name":"No id"}],
         "topCustomers":[],"topOutlets":[]}
        """)
        XCTAssertEqual(report.netRevenue, 105342)
        XCTAssertEqual(report.revenueGrowth, 3840.36)
        XCTAssertEqual(report.newOrders, 24)
        XCTAssertEqual(report.topProducts.count, 2)
        XCTAssertEqual(report.topProducts[1], OverviewReport.TopProduct(id: nil, name: "No id", rentalCount: 0, totalRevenue: 0, image: nil))

        let vi = Locale(identifier: "vi_VN")
        let vn = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
        let bars = OverviewLogic.bars(report: report, range: DayKeyRange(start: "2026-09-28", end: "2026-10-04"), timeZone: vn, locale: vi)
        XCTAssertEqual(bars.map(\.value), [1440, 708, 0, 0, 0, 0, -420])
        XCTAssertEqual(bars.map(\.label), ["T2", "T3", "T4", "T5", "T6", "T7", "CN"])
        XCTAssertEqual(OverviewLogic.barRatios(bars), [1, 708.0 / 1440, 0, 0, 0, 0, 0])
    }

    func testReportParsingWithMissingSectionsAndMonthlySeries() throws {
        let empty = try decode(OverviewReport.self, #"{"startDate":"2026-01-01","endDate":"2026-03-31","operational":null}"#)
        XCTAssertEqual(empty, OverviewReport(netRevenue: 0, revenueGrowth: nil, newOrders: nil, series: [], topProducts: []))

        let monthly = try decode(OverviewReport.self, """
        {"revenue":{"totalRevenue":500},"series":[{"month":"01/26","year":2026,"monthNumber":1,"realIncome":200},
                                                    {"month":"02/26","year":2026,"monthNumber":2,"realIncome":300}]}
        """)
        XCTAssertEqual(monthly.netRevenue, 500)
        let bars = OverviewLogic.bars(report: monthly, range: DayKeyRange(start: "2026-01-01", end: "2026-02-28"))
        XCTAssertEqual(bars.map(\.label), ["01/26", "02/26"])
        XCTAssertEqual(bars.map(\.value), [200, 300])
    }

    // MARK: - #484 money tiles, orders chart, rented-out groups

    func testReportParsingOfOrderValueOutstandingAndOrderCounts() throws {
        let report = try decode(OverviewReport.self, """
        {"revenue":{"totalActualRevenue":12450000,"totalOrderValue":15800000,"outstanding":3350000},
         "series":[{"date":"2026/09/28","realIncome":1440,"newOrderCount":3},{"date":"2026/09/29","realIncome":708}]}
        """)
        XCTAssertEqual(report.netRevenue, 12_450_000)
        XCTAssertEqual(report.totalOrderValue, 15_800_000)
        XCTAssertEqual(report.outstanding, 3_350_000)
        XCTAssertEqual(report.series.map(\.newOrderCount), [3, nil])
        let range = DayKeyRange(start: "2026-09-28", end: "2026-09-30")
        XCTAssertEqual(OverviewLogic.bars(report: report, range: range, mode: .orders).map(\.value), [3, 0, 0])
        XCTAssertEqual(OverviewLogic.bars(report: report, range: range).map(\.value), [1440, 708, 0])

        // Older API: no new fields, tiles hidden
        let old = try decode(OverviewReport.self, #"{"revenue":{"totalRevenue":500}}"#)
        XCTAssertNil(old.totalOrderValue)
        XCTAssertNil(old.outstanding)
    }

    private func rental(id: Int, status: String = "PICKUPED", returns: String) throws -> Order {
        let json = #"{"id":\#(id),"orderNumber":"000\#(id)","orderType":"RENT","status":"\#(status)","createdAt":"2026-09-20T03:00:00.000Z","updatedAt":"2026-09-20T03:00:00.000Z","pickupPlanAt":"2026-09-25T02:00:00.000Z","returnPlanAt":"\#(returns)","customerName":"Minh","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B","totalAmount":1,"orderItems":[]}"#
        return try JSONDecoder.shared.decode(Order.self, from: Data(json.utf8))
    }

    func testRentedOutGroupsUseVietnamDays() throws {
        let vn = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
        // 2026-10-03 00:30 in Vietnam (17:30Z the day before)
        let now = ISO8601DateFormatter().date(from: "2026-10-02T17:30:00Z")!
        let orders = [
            try rental(id: 1, returns: "2026-10-05T02:00:00.000Z"),
            try rental(id: 2, returns: "2026-10-02T16:59:59.000Z"), // 23:59:59 on 02/10 in Vietnam: late
            try rental(id: 3, returns: "2026-10-02T17:00:00.000Z"), // 00:00 on 03/10 in Vietnam: due today
            try rental(id: 4, returns: "2026-09-30T02:00:00.000Z"),
            try rental(id: 5, status: "RESERVED", returns: "2026-09-30T02:00:00.000Z"),
        ]
        let groups = RentedOutLogic.groups(orders, now: now, timeZone: vn)
        XCTAssertEqual(groups.late.map(\.id), [4, 2])
        XCTAssertEqual(groups.onTime.map(\.id), [3, 1])
    }

    func testOperationsParsingWithAndWithoutCash() throws {
        let merchant = try decode(OverviewNow.self, """
        {"overdueReturns":{"count":4,"orders":[]},
         "cash":{"depositsHeld":{"depositAmount":1236,"securityDeposit":3500000,"orders":9}}}
        """)
        XCTAssertEqual(merchant, OverviewNow(lateReturns: 4, rentedOut: 9, collateralHeld: 3_500_000))
        // OUTLET_STAFF: `cash` is null
        let staff = try decode(OverviewNow.self, #"{"overdueReturns":{"count":2},"cash":null}"#)
        XCTAssertEqual(staff, OverviewNow(lateReturns: 2, rentedOut: nil, collateralHeld: nil))
        XCTAssertEqual(try decode(OverviewNow.self, "{}"), OverviewNow(lateReturns: 0, rentedOut: nil, collateralHeld: nil))
    }

    func testOverviewVisibilityByPermission() {
        let staff = ["orders.view", "analytics.view.dashboard"]
        XCTAssertFalse(OverviewLogic.showsRevenue(permissions: staff))
        XCTAssertTrue(OverviewLogic.showsOperations(permissions: staff))
        XCTAssertTrue(OverviewLogic.showsRevenue(permissions: ["analytics.view.revenue"]))
        XCTAssertTrue(OverviewLogic.showsRevenue(permissions: ["analytics.view"]))
        XCTAssertFalse(OverviewLogic.showsOperations(permissions: ["orders.view"]))
    }

    // MARK: - Settings

    private let merchantPerms = ["users.manage", "products.manage", "orders.manage", "customers.manage", "analytics.view", "billing.view"]
    private let outletAdminPerms = ["users.manage", "products.manage", "orders.manage", "orders.export", "analytics.export"]
    private let staffPerms = ["products.view", "orders.view", "orders.create", "customers.view", "analytics.view.dashboard"]

    func testSettingsRowsByRole() {
        let merchant = SettingsV2Logic.sections(role: .merchant, permissions: merchantPerms, hasPlan: true)
        XCTAssertEqual(merchant.map(\.group), [.store, .management, .account])
        XCTAssertEqual(merchant[0].items, [.storeInfo, .receiptNote, .printer])
        XCTAssertEqual(merchant[1].items, [.users, .export])
        XCTAssertEqual(merchant[2].items, [.plan, .language, .password, .appInfo, .deleteAccount])

        let outletAdmin = SettingsV2Logic.sections(role: .outletAdmin, permissions: outletAdminPerms, hasPlan: false)
        XCTAssertEqual(outletAdmin[1].items, [.users, .export])
        XCTAssertEqual(outletAdmin[2].items, [.language, .password, .appInfo, .deleteAccount])

        // Staff: no users, no export (even with an export right), so no QUẢN LÝ group at all
        let staff = SettingsV2Logic.sections(role: .outletStaff, permissions: staffPerms + ["orders.export"], hasPlan: true)
        XCTAssertEqual(staff.map(\.group), [.store, .account])
        XCTAssertFalse(staff.flatMap(\.items).contains(.users))
        XCTAssertFalse(staff.flatMap(\.items).contains(.export))
    }

    func testPlanParsingAndText() throws {
        let trial = try decode(SettingsPlanResponse.self, """
        {"success":true,"data":{"status":"ACTIVE","planName":"Trial","daysRemaining":43,"dbStatus":"TRIAL"}}
        """).data!
        XCTAssertEqual(trial, SettingsPlan(name: "Trial", isTrial: true, isExpired: false, daysRemaining: 43))
        let expired = try decode(SettingsPlan.self, #"{"status":"EXPIRED","planName":"Basic","daysRemaining":null}"#)
        XCTAssertEqual(expired, SettingsPlan(name: "Basic", isTrial: false, isExpired: true, daysRemaining: nil))
        let bare = try decode(SettingsPlan.self, "{}")
        XCTAssertEqual(bare.name, "—")
        XCTAssertEqual(SettingsV2Logic.planText(SettingsPlan(name: "Basic", isTrial: false, isExpired: false, daysRemaining: nil)), "Basic")
        XCTAssertTrue(SettingsV2Logic.planText(expired).hasPrefix("Basic · "))
    }

    func testInitialsAndPasswordRules() {
        XCTAssertEqual(SettingsV2Logic.initials("Merchant Tran"), "MT")
        XCTAssertEqual(SettingsV2Logic.initials("Nguyễn Thị Lan"), "NL")
        XCTAssertEqual(SettingsV2Logic.initials("lan"), "L")
        XCTAssertEqual(SettingsV2Logic.initials("  "), "?")
        XCTAssertEqual(SettingsV2Logic.validatePassword(current: "", new: "abcdef", confirm: "abcdef"), .missingCurrent)
        XCTAssertEqual(SettingsV2Logic.validatePassword(current: "old", new: "abc", confirm: "abc"), .tooShort)
        XCTAssertEqual(SettingsV2Logic.validatePassword(current: "old", new: "abcdef", confirm: "abcdeg"), .mismatch)
        XCTAssertNil(SettingsV2Logic.validatePassword(current: "old", new: "abcdef", confirm: "abcdef"))
    }

    // MARK: Change password sheet (#482, board DMK-doi-mat-khau)

    private func textFields(_ view: UIView) -> [UITextField] {
        view.subviews.flatMap { ($0 as? UITextField).map { [$0] } ?? textFields($0) }
    }

    private func labels(_ view: UIView) -> [UILabel] {
        view.subviews.flatMap { sub -> [UILabel] in ((sub as? UILabel).map { [$0] } ?? []) + labels(sub) }
    }

    func testPasswordSheetShowsTheErrorUnderTheFieldAndSubmitsOnlyValidInput() throws {
        let sheet = ChangePasswordSheetViewController()
        var submitted: (String, String)?
        sheet.onSubmit = { submitted = ($0, $1) }
        sheet.loadViewIfNeeded()
        let fields = textFields(sheet.view)
        XCTAssertEqual(fields.count, 3)
        XCTAssertTrue(fields.allSatisfy(\.isSecureTextEntry))
        let hint = String(format: "settings.v2.password.hint".localized(), SettingsV2Logic.minPasswordLength)
        XCTAssertTrue(labels(sheet.view).contains { $0.text == hint && !$0.isHidden }, "length hint under the new password")

        fields[0].text = "old"
        fields[1].text = "abcdef"
        fields[2].text = "abcdeg"
        _ = sheet.textFieldShouldReturn(fields[2])
        XCTAssertNil(submitted)
        XCTAssertTrue(labels(sheet.view).contains { $0.text == "settings.v2.password.mismatch".localized() && !$0.isHidden })

        fields[2].text = "abcdef"
        _ = sheet.textFieldShouldReturn(fields[2])
        XCTAssertEqual(submitted?.0, "old")
        XCTAssertEqual(submitted?.1, "abcdef")
    }
}
