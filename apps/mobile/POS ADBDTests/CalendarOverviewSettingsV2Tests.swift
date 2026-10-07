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
        XCTAssertNil(orders[0].pickupPlanAt, "#496: dates are optional (an older API sends none)")
        XCTAssertNil(orders[1].customerName)
        XCTAssertEqual(orders[1].totalAmount, 0)

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

    // MARK: - #492 Thực thu breakdown

    func testReportParsingOfCollectedBreakdown() throws {
        let report = try decode(OverviewReport.self, """
        {"revenue":{"collected":12450000,"totalOrderValue":15800000,"outstanding":3350000,
                    "collectedBreakdown":{"deposits":4000000,"pickupAndSale":8200000,"fees":550000,"refunds":300000}}}
        """)
        XCTAssertEqual(report.netRevenue, 12_450_000)
        XCTAssertEqual(report.collectedBreakdown,
                       OverviewReport.CollectedBreakdown(deposits: 4_000_000, pickupAndSale: 8_200_000, fees: 550_000, refunds: 300_000))
        // deposits + pickupAndSale + fees − refunds = collected
        XCTAssertEqual(report.collectedBreakdown?.total, report.netRevenue)
        XCTAssertEqual(OverviewReport.CollectedBreakdown(deposits: 0, pickupAndSale: 0, fees: 0, refunds: 120).total, -120)
    }

    func testReportParsingOfOrderValueGrowth() throws {
        let report = try decode(OverviewReport.self, """
        {"revenue":{"collected":12450000,"totalOrderValue":15800000},
         "growth":{"collected":{"current":12450000,"previous":10000000,"growth":24.5},
                   "orderValue":{"current":15800000,"previous":20000000,"growth":-21}}}
        """)
        XCTAssertEqual(report.orderValueGrowth, -21)
        XCTAssertEqual(report.revenueGrowth, 24.5)
        XCTAssertEqual(report.totalOrderValue, 15_800_000)

        // Older API: no growth.orderValue, the hero shows no % part
        let old = try decode(OverviewReport.self, #"{"growth":{"revenue":{"growth":5}}}"#)
        XCTAssertNil(old.orderValueGrowth)
        XCTAssertEqual(old.revenueGrowth, 5)
        XCTAssertNil(try decode(OverviewReport.self, #"{"growth":{"orderValue":null}}"#).orderValueGrowth)
        XCTAssertNil(try decode(OverviewReport.self, "{}").orderValueGrowth)
    }

    func testReportParsingWithoutBreakdown() throws {
        // Older API: no breakdown, so the sheet shows only the total
        let old = try decode(OverviewReport.self, #"{"revenue":{"collected":500,"totalOrderValue":800,"outstanding":300}}"#)
        XCTAssertNil(old.collectedBreakdown)
        XCTAssertEqual(old.netRevenue, 500)
        let nulls = try decode(OverviewReport.self, #"{"revenue":{"collected":500,"collectedBreakdown":null}}"#)
        XCTAssertNil(nulls.collectedBreakdown)
        // A partial breakdown counts a missing part as 0
        let partial = try decode(OverviewReport.self, #"{"revenue":{"collected":700,"collectedBreakdown":{"deposits":200,"pickupAndSale":500}}}"#)
        XCTAssertEqual(partial.collectedBreakdown,
                       OverviewReport.CollectedBreakdown(deposits: 200, pickupAndSale: 500, fees: 0, refunds: 0))
        XCTAssertEqual(partial.collectedBreakdown?.total, 700)
        let empty = try decode(OverviewReport.self, "{}")
        XCTAssertNil(empty.collectedBreakdown)
    }

    func testVietnameseCopyOfTheCollectedDetails() throws {
        let vi = try XCTUnwrap(Bundle(path: try XCTUnwrap(Bundle.main.path(forResource: "vi-VN", ofType: "lproj"))))
        let en = try XCTUnwrap(Bundle(path: try XCTUnwrap(Bundle.main.path(forResource: "en", ofType: "lproj"))))
        let expected: [String: String] = [
            "overview.v2.collected": "Thực thu",
            "overview.v2.chart.money": "Thực thu",
            "overview.v2.newOrderValue": "Tổng giá trị đơn mới",
            "overview.v2.vsPreviousPeriod": "so với kỳ trước",
            "overview.v2.excludesCollateral": "Không gồm thế chân",
            "overview.v2.outstanding": "Còn phải thu",
            "overview.v2.outstandingNote": "Của các đơn mới",
            "overview.v2.seeDetails": "xem chi tiết",
            "overview.v2.depositsAtOrder": "Cọc khi tạo đơn",
            "overview.v2.collateralHeld": "Thế chân đang giữ",
            "overview.v2.detail.body": "Tiền khách thực trả cho cửa hàng, tính theo ngày nhận tiền.",
            "overview.v2.detail.pickupAndSale": "Thu khi giao đồ, bán hàng",
            "overview.v2.detail.fees": "Phí hư hỏng, trễ hạn",
            "overview.v2.detail.refunds": "Hoàn tiền đơn huỷ",
            "overview.v2.detail.collateralNote": "Không tính vào thực thu vì sẽ trả lại khách.",
            "overview.v2.detail.note": "Tổng giá trị đơn là tiền các đơn tạo trong kỳ, kể cả phần chưa trả; Còn phải thu là phần chưa trả đó.",
            "overview.v2.detail.close": "Đóng",
            // #494
            "overview.v2.collateral": "Thế chân",
            "overview.v2.received.title": "Tiền thực nhận",
            "overview.v2.received.caption": "Tổng tiền đã nhận, gồm thế chân",
            "overview.v2.received.collectedNote": "Tiền của tiệm",
            "overview.v2.received.collateralNote": "Giữ hộ, sẽ trả lại khách",
            "overview.v2.received.collateralIn": "Đã nhận khi giao đồ",
            "overview.v2.received.collateralOut": "Đã trả lại khi khách trả đồ",
            "overview.v2.received.upcoming": "THẾ CHÂN SẮP TỚI",
            "overview.v2.received.upcomingNote": "chưa tính vào số nào",
            "overview.v2.received.toReturn": "Sẽ trả lại khách",
            "overview.v2.received.toReturnOrders": "%d đơn đang thuê",
            "overview.v2.received.toReturnOrders.one": "%d đơn đang thuê",
            "overview.v2.received.toCollect": "Sẽ nhận khi giao đồ",
            "overview.v2.received.toCollectOrders": "%d đơn chưa lấy",
            "overview.v2.received.toCollectOrders.one": "%d đơn chưa lấy",
            "overview.v2.outstandingDetail.body": "Phần chưa trả của các đơn tạo trong kỳ. Thế chân không tính ở đây.",
            "overview.v2.outstandingDetail.atPickup": "Sẽ thu khi khách lấy đồ",
            "overview.v2.outstandingDetail.atPickupOrders": "%d đơn · ngày lấy từ hôm nay",
            "overview.v2.outstandingDetail.atPickupOrders.one": "%d đơn · ngày lấy từ hôm nay",
            "overview.v2.outstandingDetail.overdue": "Quá ngày lấy, chưa thu",
            "overview.v2.outstandingDetail.overdueOrders": "%d đơn · nên gọi khách",
            "overview.v2.outstandingDetail.overdueOrders.one": "%d đơn · nên gọi khách",
        ]
        for (key, text) in expected {
            XCTAssertEqual(vi.localizedString(forKey: key, value: "∅", table: nil), text, key)
            XCTAssertNotEqual(en.localizedString(forKey: key, value: "∅", table: nil), "∅", "en: \(key)")
        }
        // #494: the Thực thu tile no longer says "Tiền đã vào tiệm"
        XCTAssertEqual(vi.localizedString(forKey: "overview.v2.collectedNote", value: "∅", table: nil), "∅")
        // "thế chân", never "thế chấp", for the security deposit
        let path = try XCTUnwrap(vi.path(forResource: "Localizable", ofType: "strings"))
        let table = try XCTUnwrap(NSDictionary(contentsOfFile: path) as? [String: String])
        XCTAssertFalse(table.isEmpty)
        for (key, value) in table {
            XCTAssertFalse(value.lowercased().contains("thế chấp"), key)
        }
    }

    private func sheetTexts(_ report: OverviewReport, held: Double?) -> [String] {
        let sheet = OverviewCollectedDetailsSheet(report: report, periodTitle: "7 ngày qua", collateralHeld: held)
        sheet.loadViewIfNeeded()
        return labels(sheet.view).compactMap(\.text)
    }

    func testCollectedDetailsSheetRows() {
        let parts = OverviewReport.CollectedBreakdown(deposits: 4_000_000, pickupAndSale: 8_200_000, fees: 550_000, refunds: 300_000)
        let full = OverviewReport(netRevenue: parts.total, revenueGrowth: nil, newOrders: nil, series: [], topProducts: [],
                                  collectedBreakdown: parts)
        let texts = sheetTexts(full, held: 3_500_000)
        XCTAssertTrue(texts.contains("\("overview.v2.collected".localized()) · 7 ngày qua"))
        XCTAssertTrue(texts.contains("+" + MoneyFormatter.format(4_000_000)))
        XCTAssertTrue(texts.contains("+" + MoneyFormatter.format(8_200_000)))
        XCTAssertTrue(texts.contains("+" + MoneyFormatter.format(550_000)))
        XCTAssertTrue(texts.contains("−" + MoneyFormatter.format(300_000)))
        XCTAssertTrue(texts.contains(MoneyFormatter.format(12_450_000)))
        XCTAssertTrue(texts.contains("overview.v2.depositsAtOrder".localized()))
        XCTAssertTrue(texts.contains("overview.v2.collateralHeld".localized()))
        XCTAssertTrue(texts.contains(MoneyFormatter.format(3_500_000)))
        XCTAssertTrue(texts.contains("overview.v2.detail.collateralNote".localized()))

        // No refunds: no refunds row
        let noRefunds = OverviewReport(netRevenue: 100, revenueGrowth: nil, newOrders: nil, series: [], topProducts: [],
                                       collectedBreakdown: .init(deposits: 100, pickupAndSale: 0, fees: 0, refunds: 0))
        XCTAssertFalse(sheetTexts(noRefunds, held: nil).contains("overview.v2.detail.refunds".localized()))

        // Older API: only the total row and the texts
        let old = OverviewReport(netRevenue: 500, revenueGrowth: nil, newOrders: nil, series: [], topProducts: [])
        let oldTexts = sheetTexts(old, held: nil)
        XCTAssertTrue(oldTexts.contains(MoneyFormatter.format(500)))
        XCTAssertFalse(oldTexts.contains("overview.v2.depositsAtOrder".localized()))
        // No collateral held known: no bordered box
        XCTAssertFalse(oldTexts.contains("overview.v2.detail.collateralNote".localized()))
        XCTAssertTrue(oldTexts.contains("overview.v2.detail.note".localized()))
    }

    /// The label and every view above it are shown
    private func isShown(_ view: UIView, in root: UIView) -> Bool {
        var current: UIView? = view
        while let v = current, v !== root {
            if v.isHidden { return false }
            current = v.superview
        }
        return true
    }

    private func allViews(_ view: UIView) -> [UIView] {
        view.subviews.flatMap { [$0] + allViews($0) }
    }

    private func shownTexts(_ root: UIView) -> [String] {
        labels(root).filter { isShown($0, in: root) }.compactMap(\.text)
    }

    func testReportParsingCollateralFlowAndOutstandingBreakdown() throws {
        let report = try decode(OverviewReport.self, """
        {"revenue":{"collected":12450000,"totalOrderValue":20000000,"outstanding":5000000,
          "collateralFlow":{"received":5000000,"returned":1500000},
          "outstandingBreakdown":{"atPickup":{"amount":3800000,"orders":4},"overduePickup":{"amount":1200000,"orders":2}}}}
        """)
        XCTAssertEqual(report.collateralFlow, OverviewReport.CollateralFlow(received: 5_000_000, returned: 1_500_000))
        XCTAssertEqual(report.collateralFlow?.net, 3_500_000)
        XCTAssertEqual(report.outstandingBreakdown,
                       OverviewReport.OutstandingBreakdown(atPickup: .init(amount: 3_800_000, orders: 4),
                                                           overduePickup: .init(amount: 1_200_000, orders: 2)))
        XCTAssertEqual(report.outstandingBreakdown?.total, 5_000_000)

        // Older API: neither field, the rest still decodes
        let old = try decode(OverviewReport.self, #"{"revenue":{"collected":500,"totalOrderValue":800,"outstanding":300}}"#)
        XCTAssertNil(old.collateralFlow)
        XCTAssertNil(old.outstandingBreakdown)
        XCTAssertEqual(old.netRevenue, 500)
        XCTAssertEqual(old.outstanding, 300)
        let nulls = try decode(OverviewReport.self, #"{"revenue":{"collected":1,"collateralFlow":null,"outstandingBreakdown":null}}"#)
        XCTAssertNil(nulls.collateralFlow)
        XCTAssertNil(nulls.outstandingBreakdown)
        // Partial objects count a missing part as 0
        let partial = try decode(OverviewReport.self,
                                 #"{"revenue":{"collateralFlow":{"received":200},"outstandingBreakdown":{"atPickup":{"amount":50}}}}"#)
        XCTAssertEqual(partial.collateralFlow, OverviewReport.CollateralFlow(received: 200, returned: 0))
        XCTAssertEqual(partial.outstandingBreakdown,
                       OverviewReport.OutstandingBreakdown(atPickup: .init(amount: 50, orders: 0),
                                                           overduePickup: .init(amount: 0, orders: 0)))
    }

    func testOperationsParsingUpcomingCollateral() throws {
        let now = try decode(OverviewNow.self, """
        {"overdueReturns":{"count":1},
         "cash":{"depositsHeld":{"securityDeposit":3500000,"orders":9},
                 "collateralToCollect":{"securityDeposit":2000000,"orders":3},
                 "collateralToReturn":{"securityDeposit":3000000,"orders":7}}}
        """)
        XCTAssertEqual(now.collateralHeld, 3_500_000)
        XCTAssertEqual(now.collateralToCollect, OverviewNow.Collateral(amount: 2_000_000, orders: 3))
        XCTAssertEqual(now.collateralToReturn, OverviewNow.Collateral(amount: 3_000_000, orders: 7))

        // Older API: no collateralToCollect; collateralToReturn falls back to the collateral held, with no count
        let old = try decode(OverviewNow.self, #"{"cash":{"depositsHeld":{"securityDeposit":3500000,"orders":9}}}"#)
        XCTAssertNil(old.collateralToCollect)
        XCTAssertEqual(old.collateralToReturn, OverviewNow.Collateral(amount: 3_500_000, orders: nil))
        // No cash (staff): nothing
        let staff = try decode(OverviewNow.self, #"{"cash":null}"#)
        XCTAssertNil(staff.collateralToCollect)
        XCTAssertNil(staff.collateralToReturn)
    }

    func testReceivedSheetWithCollateralFlow() throws {
        let parts = OverviewReport.CollectedBreakdown(deposits: 4_000_000, pickupAndSale: 8_200_000, fees: 550_000, refunds: 300_000)
        let report = OverviewReport(netRevenue: parts.total, revenueGrowth: nil, newOrders: nil, series: [], topProducts: [],
                                    collectedBreakdown: parts,
                                    collateralFlow: .init(received: 5_000_000, returned: 1_500_000))
        let sheet = OverviewCollectedDetailsSheet(report: report, periodTitle: "7 ngày qua", collateralHeld: 3_500_000,
                                                  collateralToReturn: .init(amount: 3_000_000, orders: 7),
                                                  collateralToCollect: .init(amount: 2_000_000, orders: 3))
        sheet.loadViewIfNeeded()
        let root = sheet.view!
        let shown = shownTexts(root)
        XCTAssertTrue(shown.contains("\("overview.v2.received.title".localized()) · 7 ngày qua"))
        XCTAssertTrue(shown.contains("overview.v2.received.caption".localized()))
        XCTAssertTrue(shown.contains(MoneyFormatter.format(12_450_000 + 3_500_000)))
        XCTAssertTrue(shown.contains(MoneyFormatter.format(12_450_000)))
        XCTAssertTrue(shown.contains("+" + MoneyFormatter.format(3_500_000)))
        XCTAssertTrue(shown.contains("overview.v2.received.collectedNote".localized()))
        XCTAssertTrue(shown.contains("overview.v2.received.collateralNote".localized()))
        XCTAssertTrue(shown.contains("\("overview.v2.received.upcoming".localized()) · \("overview.v2.received.upcomingNote".localized())"))
        XCTAssertTrue(shown.contains("overview.v2.received.toReturn".localized()))
        XCTAssertTrue(shown.contains(PluralText.format("overview.v2.received.toReturnOrders", count: 7, 7)))
        XCTAssertTrue(shown.contains(MoneyFormatter.format(3_000_000)))
        XCTAssertTrue(shown.contains("overview.v2.received.toCollect".localized()))
        XCTAssertTrue(shown.contains(PluralText.format("overview.v2.received.toCollectOrders", count: 3, 3)))
        // The old "Thế chân đang giữ" box is gone
        XCTAssertFalse(shown.contains("overview.v2.collateralHeld".localized()))
        XCTAssertFalse(shown.contains("overview.v2.detail.collateralNote".localized()))

        // Collapsed at first: the lines are there but hidden
        XCTAssertFalse(shown.contains("overview.v2.depositsAtOrder".localized()))
        XCTAssertFalse(shown.contains("overview.v2.received.collateralIn".localized()))
        let sections = allViews(root).compactMap { $0 as? OverviewDisclosureSection }
        XCTAssertEqual(sections.count, 2)
        sections.forEach { $0.toggle() }
        let expanded = shownTexts(root)
        XCTAssertTrue(expanded.contains("overview.v2.depositsAtOrder".localized()))
        XCTAssertTrue(expanded.contains("+" + MoneyFormatter.format(8_200_000)))
        XCTAssertTrue(expanded.contains("+" + MoneyFormatter.format(550_000)))
        XCTAssertTrue(expanded.contains("−" + MoneyFormatter.format(300_000)))
        XCTAssertTrue(expanded.contains("+" + MoneyFormatter.format(5_000_000)))
        XCTAssertTrue(expanded.contains("−" + MoneyFormatter.format(1_500_000)))
        XCTAssertTrue(expanded.contains("overview.v2.received.collateralOut".localized()))
        sections[0].toggle()
        XCTAssertFalse(shownTexts(root).contains("overview.v2.depositsAtOrder".localized()))

        // Older outlet-operations: "Sẽ trả lại khách" from the collateral held, no count; no "Sẽ nhận" row
        let older = OverviewCollectedDetailsSheet(report: report, periodTitle: "7 ngày qua", collateralHeld: 3_500_000)
        older.loadViewIfNeeded()
        let olderTexts = shownTexts(older.view)
        XCTAssertTrue(olderTexts.contains("overview.v2.received.toReturn".localized()))
        XCTAssertFalse(olderTexts.contains("overview.v2.received.toCollect".localized()))
        XCTAssertFalse(olderTexts.contains(PluralText.format("overview.v2.received.toReturnOrders", count: 7, 7)))
        // Nothing known about upcoming collateral: no gray box
        let none = OverviewCollectedDetailsSheet(report: report, periodTitle: "7 ngày qua", collateralHeld: nil)
        none.loadViewIfNeeded()
        XCTAssertFalse(shownTexts(none.view).contains("overview.v2.received.toReturn".localized()))
        XCTAssertFalse(shownTexts(none.view).contains { $0.hasPrefix("overview.v2.received.upcoming".localized()) })
    }

    func testSignedCollateralAmount() {
        XCTAssertEqual(OverviewCollectedDetailsSheet.signed(3_500_000), "+" + MoneyFormatter.format(3_500_000))
        XCTAssertEqual(OverviewCollectedDetailsSheet.signed(-200), "−" + MoneyFormatter.format(200))
        XCTAssertEqual(OverviewCollectedDetailsSheet.signed(0), MoneyFormatter.format(0))
    }

    func testOutstandingSheetRows() {
        let parts = OverviewReport.OutstandingBreakdown(atPickup: .init(amount: 3_800_000, orders: 4),
                                                        overduePickup: .init(amount: 1_200_000, orders: 2))
        let sheet = OverviewOutstandingDetailsSheet(breakdown: parts, total: 5_000_000, periodTitle: "7 ngày qua")
        sheet.loadViewIfNeeded()
        let texts = shownTexts(sheet.view)
        XCTAssertTrue(texts.contains("\("overview.v2.outstanding".localized()) · 7 ngày qua"))
        XCTAssertTrue(texts.contains("overview.v2.outstandingDetail.body".localized()))
        XCTAssertTrue(texts.contains("overview.v2.outstandingDetail.atPickup".localized()))
        XCTAssertTrue(texts.contains(PluralText.format("overview.v2.outstandingDetail.atPickupOrders", count: 4, 4)))
        XCTAssertTrue(texts.contains(MoneyFormatter.format(3_800_000)))
        XCTAssertTrue(texts.contains("overview.v2.outstandingDetail.overdue".localized()))
        XCTAssertTrue(texts.contains(PluralText.format("overview.v2.outstandingDetail.overdueOrders", count: 2, 2)))
        XCTAssertTrue(texts.contains(MoneyFormatter.format(1_200_000)))
        XCTAssertTrue(texts.contains("overview.v2.outstanding".localized()))
        XCTAssertTrue(texts.contains(MoneyFormatter.format(5_000_000)))

        // No overdue orders: no overdue row
        let onTime = OverviewOutstandingDetailsSheet(
            breakdown: .init(atPickup: .init(amount: 300, orders: 1), overduePickup: .init(amount: 0, orders: 0)),
            total: 300, periodTitle: "Hôm nay")
        onTime.loadViewIfNeeded()
        XCTAssertFalse(shownTexts(onTime.view).contains("overview.v2.outstandingDetail.overdue".localized()))
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
        XCTAssertEqual(merchant[0].items, [.storeInfo, .receiptNote, .printer, .bankAccounts])
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
