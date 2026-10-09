import XCTest
@testable import POS_ADBD

/// #616 — redesigned Tổng quan: chip periods, chart range, Thực thu forecast, tile chips, compact money, chart bars,
/// detail sheet rows and the new optional fields of the period report (#609) and outlet operations (`tomorrow`).
///
/// Every case runs with the phone zone set to Asia/Ho_Chi_Minh, UTC and America/Los_Angeles (restored after): the
/// shop day comes from `DayFormatter.key` (shop zone), so the answers must not move.
final class OverviewDashLogicTests: XCTestCase {
    private static let zones = ["Asia/Ho_Chi_Minh", "UTC", "America/Los_Angeles"]
    private var savedZone: TimeZone!
    private var savedTZ: String?

    override func setUp() {
        super.setUp()
        savedZone = NSTimeZone.default
        savedTZ = ProcessInfo.processInfo.environment["TZ"]
    }

    override func tearDown() {
        restoreZone()
        super.tearDown()
    }

    private func setPhoneZone(_ zone: TimeZone) {
        setenv("TZ", zone.identifier, 1)
        tzset()
        NSTimeZone.resetSystemTimeZone()
        NSTimeZone.default = zone
    }

    private func restoreZone() {
        if let savedTZ { setenv("TZ", savedTZ, 1) } else { unsetenv("TZ") }
        tzset()
        NSTimeZone.resetSystemTimeZone()
        NSTimeZone.default = savedZone
    }

    private func inEachZone(_ body: (String) throws -> Void) rethrows {
        for id in Self.zones {
            setPhoneZone(TimeZone(identifier: id)!)
            try body(id)
        }
        restoreZone()
    }

    private func decode<T: Decodable>(_ type: T.Type, _ json: String) throws -> T {
        try JSONDecoder.shared.decode(type, from: json.data(using: .utf8)!)
    }

    private func at(_ text: String) -> Date { ISO8601DateFormatter().date(from: text)! }

    private func point(_ key: String, collected: Double = 0, expected: Double? = nil) -> OverviewReport.Point {
        OverviewReport.Point(dayKey: key, monthLabel: nil, realIncome: collected, expectedCollected: expected)
    }

    private func report(collected: Double = 0, series: [OverviewReport.Point] = [], orderValue: Double? = nil,
                        outstanding: OverviewReport.OutstandingBreakdown? = nil, flow: OverviewReport.CollateralFlow? = nil,
                        orderValueGrowth: Double? = nil, revenueGrowth: Double? = nil) -> OverviewReport {
        OverviewReport(netRevenue: collected, revenueGrowth: revenueGrowth, newOrders: 3, series: series, topProducts: [],
                       totalOrderValue: orderValue, outstanding: outstanding?.total, orderValueGrowth: orderValueGrowth,
                       collateralFlow: flow, outstandingBreakdown: outstanding)
    }

    // MARK: - Today key at the Vietnam midnight

    func testShopTodayIsTheVietnamDayInEveryPhoneZone() {
        inEachZone { zone in
            // 16:59:59Z is still 7 Oct in Vietnam; 17:00:00Z is 8 Oct
            XCTAssertEqual(DayFormatter.key(at("2026-10-07T16:59:59Z")), "2026-10-07", zone)
            XCTAssertEqual(DayFormatter.key(at("2026-10-07T17:00:00Z")), "2026-10-08", zone)
            let today = DayFormatter.key(at("2026-10-07T17:00:00Z"))
            XCTAssertEqual(OverviewDashLogic.range(of: .today, todayKey: today), DayKeyRange(start: "2026-10-08", end: "2026-10-08"), zone)
            XCTAssertEqual(OverviewDashLogic.chartRange(of: .today, range: OverviewDashLogic.range(of: .today, todayKey: today)),
                           DayKeyRange(start: "2026-10-02", end: "2026-10-15"), zone)
        }
    }

    // MARK: - Periods

    func testChipRanges() {
        inEachZone { zone in
            let today = "2026-10-07"
            XCTAssertEqual(OverviewDashLogic.range(of: .today, todayKey: today), DayKeyRange(start: today, end: today), zone)
            XCTAssertEqual(OverviewDashLogic.range(of: .last7, todayKey: today), DayKeyRange(start: "2026-10-01", end: today), zone)
            // Tháng này is the whole month (web), so its forecast reaches the month end
            XCTAssertEqual(OverviewDashLogic.range(of: .thisMonth, todayKey: today), DayKeyRange(start: "2026-10-01", end: "2026-10-31"), zone)
            XCTAssertEqual(OverviewDashLogic.range(of: .thisMonth, todayKey: "2028-02-10"), DayKeyRange(start: "2028-02-01", end: "2028-02-29"), zone)
            XCTAssertEqual(OverviewDashLogic.range(of: .last7, todayKey: "2027-01-03"), DayKeyRange(start: "2026-12-28", end: "2027-01-03"), zone)
            // Custom: reversed is swapped, missing falls back to today, the future is allowed (#612)
            XCTAssertEqual(OverviewDashLogic.range(of: .custom, todayKey: today, custom: DayKeyRange(start: "2026-10-20", end: "2026-10-10")),
                           DayKeyRange(start: "2026-10-10", end: "2026-10-20"), zone)
            XCTAssertEqual(OverviewDashLogic.range(of: .custom, todayKey: today), DayKeyRange(start: today, end: today), zone)
            XCTAssertEqual(OverviewDashLogic.customMaxKey(todayKey: today), "2027-10-07", zone)
        }
    }

    func testChartRange() {
        inEachZone { zone in
            let today = DayKeyRange(start: "2026-10-07", end: "2026-10-07")
            let chart = OverviewDashLogic.chartRange(of: .today, range: today)
            XCTAssertEqual(chart, DayKeyRange(start: "2026-10-01", end: "2026-10-14"), zone)
            XCTAssertEqual(chart.dayCount, 14, zone)
            // A one-day custom range: the 7 days up to it
            XCTAssertEqual(OverviewDashLogic.chartRange(of: .custom, range: DayKeyRange(start: "2026-10-20", end: "2026-10-20")),
                           DayKeyRange(start: "2026-10-14", end: "2026-10-20"), zone)
            // Longer ranges chart themselves
            let week = DayKeyRange(start: "2026-10-01", end: "2026-10-07")
            XCTAssertEqual(OverviewDashLogic.chartRange(of: .last7, range: week), week, zone)
            // Across the year end
            XCTAssertEqual(OverviewDashLogic.chartRange(of: .today, range: DayKeyRange(start: "2026-12-28", end: "2026-12-28")),
                           DayKeyRange(start: "2026-12-22", end: "2027-01-04"), zone)
        }
    }

    // MARK: - Forecast

    func testForecastSumsFromTodayToTheEndOfThePeriod() {
        inEachZone { zone in
            let series = [
                point("2026-10-06", collected: 2_000_000, expected: 900_000), // past: not expected money
                point("2026-10-07", collected: 12_420_000, expected: 1_500_000),
                point("2026-10-08", expected: 0),
                point("2026-10-10", expected: 2_800_000),
                point("2026-10-31", expected: nil),
            ]
            let forecast = OverviewDashLogic.forecast(collected: 12_420_000, series: series, todayKey: "2026-10-07")
            XCTAssertEqual(forecast?.forecast, 4_300_000, zone)
            XCTAssertEqual(forecast?.until, "2026-10-10", zone)
            XCTAssertEqual(forecast?.collectedShare ?? 0, 12_420_000 / 16_720_000, accuracy: 1e-9, zone)
            // Only today: "hôm nay"
            let todayOnly = OverviewDashLogic.forecast(collected: 0, series: [point("2026-10-07", expected: 500_000)], todayKey: "2026-10-07")
            XCTAssertEqual(todayOnly?.until, "2026-10-07", zone)
            XCTAssertEqual(todayOnly?.collectedShare, 0, zone)
            // A negative collected (refunds) draws as 0 collected
            XCTAssertEqual(OverviewDashLogic.forecast(collected: -100, series: [point("2026-10-07", expected: 500)], todayKey: "2026-10-07")?.collectedShare, 0, zone)
            // Nothing expected, a past period, or an older API: no bar
            XCTAssertNil(OverviewDashLogic.forecast(collected: 1, series: [point("2026-10-07", expected: 0)], todayKey: "2026-10-07"), zone)
            XCTAssertNil(OverviewDashLogic.forecast(collected: 1, series: [point("2026-10-01", expected: 10)], todayKey: "2026-10-07"), zone)
            XCTAssertNil(OverviewDashLogic.forecast(collected: 1, series: [point("2026-10-07")], todayKey: "2026-10-07"), zone)
            XCTAssertNil(OverviewDashLogic.forecast(collected: nil, series: [point("2026-10-07", expected: 10)], todayKey: "2026-10-07"), zone)
        }
    }

    // MARK: - Tiles

    func testTileChips() {
        inEachZone { zone in
            let overdue = OverviewReport.OutstandingBreakdown(atPickup: .init(amount: 9_000_000, orders: 4),
                                                              overduePickup: .init(amount: 2_590_000, orders: 1))
            let now = OverviewNow(lateReturns: 1, rentedOut: 11, collateralHeld: 6_000_000)
            let tiles = OverviewDashLogic.tiles(report: report(collected: 12_420_000, orderValue: 18_650_000, outstanding: overdue,
                                                               flow: .init(received: 7_390_000, returned: 1_000_000),
                                                               orderValueGrowth: 12.4, revenueGrowth: -3.6), now: now)
            XCTAssertEqual(tiles.map(\.kind), [.orderValue, .collected, .outstanding, .collateral], zone)
            XCTAssertEqual(tiles[0].chip, OverviewTileChip(tone: .up, key: "overview.dash.chip.up", count: 12), zone)
            XCTAssertEqual(tiles[1].chip, OverviewTileChip(tone: .down, key: "overview.dash.chip.down", count: 4), zone)
            XCTAssertEqual(tiles[2].chip, OverviewTileChip(tone: .warn, key: "overview.dash.chip.overdue", count: 1), zone)
            XCTAssertEqual(tiles[2].value, 11_590_000, zone)
            XCTAssertEqual(tiles[3].value, 6_390_000, zone)
            XCTAssertTrue(tiles[3].signed, zone)
            XCTAssertEqual(tiles[3].chip, OverviewTileChip(tone: .info, key: "overview.dash.chip.held", count: 11), zone)
            XCTAssertEqual(OverviewDashLogic.tileText(tiles[3], vietnamese: true), "+6,39 tr", zone)
            XCTAssertEqual(OverviewDashLogic.tileText(tiles[3], vietnamese: true, compact: false), "+6.390.000", zone)

            // No overdue: waiting; nothing waiting either: no chip
            let waiting = OverviewReport.OutstandingBreakdown(atPickup: .init(amount: 1, orders: 2), overduePickup: .init(amount: 0, orders: 0))
            XCTAssertEqual(OverviewDashLogic.tiles(report: report(outstanding: waiting), now: nil)[2].chip,
                           OverviewTileChip(tone: .info, key: "overview.dash.chip.waiting", count: 2), zone)
            let none = OverviewReport.OutstandingBreakdown(atPickup: .init(amount: 0, orders: 0), overduePickup: .init(amount: 0, orders: 0))
            XCTAssertNil(OverviewDashLogic.tiles(report: report(outstanding: none), now: nil)[2].chip, zone)

            // An older API: no values, no chips, "—"
            let older = OverviewDashLogic.tiles(report: nil, now: nil)
            XCTAssertEqual(older.map(\.value), [nil, nil, nil, nil], zone)
            XCTAssertTrue(older.allSatisfy { $0.chip == nil }, zone)
            XCTAssertEqual(OverviewDashLogic.tileText(older[0], vietnamese: true), "—", zone)
        }
    }

    // MARK: - Related orders

    /// Còn phải thu lists what the tile counts: rent not picked up owes total − deposit, a sale not completed owes its
    /// total, nothing else (the old not-picked-up list showed 3 orders under "6 đơn chờ lấy")
    func testOutstandingRelatedRowsFollowTheTileRule() throws {
        let json = """
        [{"id":1,"orderNumber":"100001","orderType":"RENT","status":"RESERVED","totalAmount":500,"depositAmount":200},
         {"id":2,"orderNumber":"100002","orderType":"RENT","status":"RESERVED","totalAmount":300,"depositAmount":300},
         {"id":3,"orderNumber":"100003","orderType":"RENT","status":"PICKUPED","totalAmount":900,"depositAmount":0},
         {"id":4,"orderNumber":"100004","orderType":"SALE","status":"RESERVED","totalAmount":250,"depositAmount":0},
         {"id":5,"orderNumber":"100005","orderType":"SALE","status":"COMPLETED","totalAmount":400,"depositAmount":0},
         {"id":6,"orderNumber":"100006","orderType":"RENT","status":"CANCELLED","totalAmount":700,"depositAmount":0}]
        """
        let items = try JSONDecoder().decode([DailyIncomeOrder].self, from: Data(json.utf8))
        let rows = OverviewDashLogic.relatedRows(.outstanding, bucket: "new", items: items)
        XCTAssertEqual(rows.map(\.orderNumber), ["100001", "100004"])
        XCTAssertEqual(rows.map(\.amount), [300, 250])
        XCTAssertEqual(OverviewDashLogic.relatedTotal(rows), 550)
        XCTAssertEqual(OverviewRelatedKind.outstanding.buckets, ["new"])
    }

    func testGrowthRule() {
        XCTAssertEqual(OverviewDashLogic.growth(nil), .none)
        XCTAssertEqual(OverviewDashLogic.growth(0), .none)
        XCTAssertEqual(OverviewDashLogic.growth(0.3), .none)
        XCTAssertEqual(OverviewDashLogic.growth(12.5), .pct(13, up: true))
        XCTAssertEqual(OverviewDashLogic.growth(-12.4), .pct(12, up: false))
        XCTAssertEqual(OverviewDashLogic.growth(1000), .new)
        XCTAssertEqual(OverviewDashLogic.growthChip(1500), OverviewTileChip(tone: .up, key: "overview.dash.chip.new", count: nil))
    }

    func testCompactMoney() {
        XCTAssertEqual(OverviewDashLogic.compact(18_650_000, vietnamese: true), "18,65 tr")
        XCTAssertEqual(OverviewDashLogic.compact(12_420_000, vietnamese: true), "12,42 tr")
        XCTAssertEqual(OverviewDashLogic.compact(4_300_000, vietnamese: true), "4,3 tr")
        XCTAssertEqual(OverviewDashLogic.compact(2_000_000, vietnamese: true), "2 tr")
        XCTAssertEqual(OverviewDashLogic.compact(1_234_500_000, vietnamese: true), "1,23 tỷ")
        XCTAssertEqual(OverviewDashLogic.compact(450_000, vietnamese: true), "450.000")
        XCTAssertEqual(OverviewDashLogic.compact(-1_200_000, vietnamese: true), "−1,2 tr")
        XCTAssertEqual(OverviewDashLogic.compact(18_650_000, vietnamese: false), "18.65M")
        XCTAssertEqual(OverviewDashLogic.compact(2_500_000_000, vietnamese: false), "2.5B")
        // Rounds up across a unit boundary without "1000 tr"
        XCTAssertEqual(OverviewDashLogic.compact(999_999_999, vietnamese: true), "1000 tr")
    }

    // MARK: - Chart

    func testChartBarsFillTheRangeAndMarkToday() {
        inEachZone { zone in
            let range = DayKeyRange(start: "2026-10-01", end: "2026-10-14")
            let source = report(series: [
                point("2026-10-01", collected: 6_200_000),
                point("2026-10-07", collected: 12_400_000, expected: 4_300_000),
                point("2026-10-10", expected: 16_700_000),
            ])
            let bars = OverviewDashLogic.chartBars(report: source, range: range, todayKey: "2026-10-07")
            XCTAssertEqual(bars.count, 14, zone)
            XCTAssertEqual(bars.first?.key, "2026-10-01", zone)
            XCTAssertEqual(bars.last?.key, "2026-10-14", zone)
            XCTAssertEqual(bars.filter(\.isToday).map(\.key), ["2026-10-07"], zone)
            let today = bars[6]
            XCTAssertEqual(today.value, 12_400_000, zone)
            XCTAssertEqual(today.forecast, 4_300_000, zone)
            XCTAssertEqual(today.ratio, 1, accuracy: 1e-9, zone)
            XCTAssertEqual(today.forecastRatio, 4_300_000 / 16_700_000, accuracy: 1e-9, zone)
            XCTAssertEqual(bars[9].ratio, 1, accuracy: 1e-9, zone)
            XCTAssertEqual(bars[1].ratio, 0, zone)
            XCTAssertEqual(OverviewDashLogic.axisLabelIndexes(bars), [0, 6, 13], zone)
        }
    }

    func testChartBarsWithoutTodayAndMonthly() {
        let week = DayKeyRange(start: "2026-09-01", end: "2026-09-07")
        let bars = OverviewDashLogic.chartBars(report: report(series: [point("2026-09-03", collected: 5)]), range: week, todayKey: "2026-10-07")
        XCTAssertFalse(bars.contains(where: \.isToday))
        XCTAssertEqual(OverviewDashLogic.axisLabelIndexes(bars), [0, 6])
        let year = DayKeyRange(start: "2026-01-01", end: "2026-12-31")
        let months = OverviewDashLogic.chartBars(
            report: report(series: [OverviewReport.Point(dayKey: nil, monthLabel: "10/26", realIncome: 7, expectedCollected: 3)]),
            range: year, todayKey: "2026-10-07")
        XCTAssertEqual(months.map(\.key), ["10/26"])
        XCTAssertEqual(months.first?.forecast, 3)
        XCTAssertFalse(months.first?.isDay ?? true)
    }

    // MARK: - Detail sheets

    func testWaterfallAndNegativeTotal() {
        let parts = OverviewReport.CollectedBreakdown(deposits: 2_810_000, pickupAndSale: 10_360_000, fees: 450_000, refunds: 1_200_000)
        let rows = OverviewDashLogic.waterfall(parts, total: 12_420_000)
        XCTAssertEqual(rows.map(\.key), [.deposits, .pickupAndSale, .fees, .refunds, .total])
        XCTAssertEqual(rows[1].left, 2_810_000 / 13_620_000, accuracy: 1e-9)
        XCTAssertEqual(rows[3].amount, -1_200_000)
        XCTAssertEqual(rows[3].left + rows[3].width, 1, accuracy: 1e-9)
        XCTAssertTrue(rows[4].isTotal)
        XCTAssertEqual(rows[4].width, 12_420_000 / 13_620_000, accuracy: 1e-9)
        // Refunds larger than the money in: the track starts below 0
        let negative = OverviewDashLogic.waterfall(.init(deposits: 0, pickupAndSale: 100, fees: 0, refunds: 300), total: -200)
        XCTAssertEqual(negative[4].left, 0, accuracy: 1e-9)
        XCTAssertEqual(negative[4].width, 200.0 / 300.0, accuracy: 1e-9)
        XCTAssertEqual(negative[1].left, 200.0 / 300.0, accuracy: 1e-9)
    }

    func testSplitsAndCollateralRows() {
        let (a, b) = OverviewDashLogic.split(.init(amount: 9_000_000, orders: 4), .init(amount: 3_000_000, orders: 1))
        XCTAssertEqual(a.share, 0.75, accuracy: 1e-9)
        XCTAssertEqual(b.share, 0.25, accuracy: 1e-9)
        XCTAssertEqual(OverviewDashLogic.split(.init(amount: 0, orders: 0), .init(amount: 0, orders: 0)).0.share, 0)

        let now = OverviewNow(lateReturns: 0, rentedOut: 11, collateralHeld: nil,
                              collateralToCollect: .init(amount: 2_000_000, orders: 3),
                              collateralToReturn: .init(amount: 8_000_000, orders: 11))
        let rows = OverviewDashLogic.collateralRows(flow: .init(received: 4_000_000, returned: 1_000_000), now: now)
        XCTAssertEqual(rows.map(\.key), [.received, .returned, .toCollect, .toReturn])
        XCTAssertEqual(rows.map(\.upcoming), [false, false, true, true])
        XCTAssertEqual(rows.map(\.width), [0.5, 0.125, 0.25, 1])
        XCTAssertEqual(rows[3].orders, 11)
        XCTAssertTrue(OverviewDashLogic.collateralRows(flow: nil, now: nil).isEmpty)
    }

    func testTodayCounters() {
        XCTAssertEqual(OverviewDashLogic.doneOfTotal(.init(remaining: 1, done: 2)), "2/3")
        XCTAssertEqual(OverviewDashLogic.doneOfTotal(.init(remaining: 0, done: 0)), "0/0")
    }

    // MARK: - Decoding (#609 fields and `tomorrow` are optional)

    func testDecodesTheNewOptionalFields() throws {
        let json = """
        {"revenue":{"collected":12420000,"totalOrderValue":18650000,
          "orderValueByType":{"rent":{"amount":15000000,"orders":7},"sale":{"amount":3650000,"orders":2}}},
         "series":[{"date":"2026/10/07","collected":12420000,"expectedCollected":1500000,"newOrderValue":3000000},
                   {"date":"2026/10/08","collected":0,"expectedCollected":2800000}]}
        """
        let report = try decode(OverviewReport.self, json)
        XCTAssertEqual(report.orderValueByType?.rent, OverviewReport.AmountPart(amount: 15_000_000, orders: 7))
        XCTAssertEqual(report.orderValueByType?.sale.orders, 2)
        XCTAssertEqual(report.series.map(\.expectedCollected), [1_500_000, 2_800_000])
        XCTAssertEqual(report.series.map(\.newOrderValue), [3_000_000, nil])
        XCTAssertEqual(report.series.first?.dayKey, "2026-10-07")

        let older = try decode(OverviewReport.self, #"{"revenue":{"collected":5},"series":[{"date":"2026/10/07","realIncome":5}]}"#)
        XCTAssertNil(older.orderValueByType)
        XCTAssertNil(older.series.first?.expectedCollected)
        XCTAssertNil(OverviewDashLogic.forecast(collected: older.netRevenue, series: older.series, todayKey: "2026-10-07"))

        let now = try decode(OverviewNow.self, """
        {"overdueReturns":{"count":1},"pickupsToday":{"count":1},"returnsToday":{"count":1},
         "doneToday":{"pickups":2,"returns":1},"noShows":{"count":1},"tomorrow":{"pickups":4,"returns":2}}
        """)
        XCTAssertEqual(now.tomorrow, OverviewNow.Tomorrow(pickups: 4, returns: 2))
        XCTAssertEqual(now.today.map { OverviewDashLogic.doneOfTotal($0.pickups) }, "2/3")
        XCTAssertNil(try decode(OverviewNow.self, #"{"overdueReturns":{"count":0},"tomorrow":null}"#).tomorrow)
    }

    // MARK: - Top lists and the Hôm nay card (#620)

    func testTopProductRowsKeepFiveAndScaleToTheFirst() {
        let products = (1...7).map { n in
            OverviewReport.TopProduct(id: n, name: "P\(n)", rentalCount: n, totalRevenue: Double(8 - n) * 1_000_000, image: nil)
        }
        let rows = OverviewDashLogic.topProductRows(products)
        XCTAssertEqual(rows.count, 5)
        XCTAssertEqual(rows.map(\.name), ["P1", "P2", "P3", "P4", "P5"])
        XCTAssertEqual(rows.map(\.count), [1, 2, 3, 4, 5])
        XCTAssertEqual(rows.map(\.ratio), [1, 6.0 / 7, 5.0 / 7, 4.0 / 7, 3.0 / 7])
        XCTAssertEqual(rows.first?.id, 1)
        XCTAssertTrue(OverviewDashLogic.topProductRows([]).isEmpty)
    }

    func testTopCustomerRowsCountAHiddenTotalAsZero() {
        let customers = [
            OverviewReport.TopCustomer(id: 11, name: "An", orderCount: 3, totalSpent: 4_000_000),
            OverviewReport.TopCustomer(id: 12, name: "Bình", orderCount: 2, totalSpent: nil),
            OverviewReport.TopCustomer(id: nil, name: "Chi", orderCount: 1, totalSpent: 1_000_000),
        ]
        let rows = OverviewDashLogic.topCustomerRows(customers)
        XCTAssertEqual(rows.map(\.amount), [4_000_000, 0, 1_000_000])
        XCTAssertEqual(rows.map(\.ratio), [1, 0, 0.25])
        XCTAssertEqual(rows.map(\.count), [3, 2, 1])
        XCTAssertNil(rows[2].id)

        // OUTLET_STAFF: every total hidden, no bar at all
        let hidden = OverviewDashLogic.topCustomerRows([OverviewReport.TopCustomer(id: 1, name: "A", orderCount: 1, totalSpent: nil)])
        XCTAssertEqual(hidden.map(\.ratio), [0])
    }

    func testDecodesTopCustomersAndToleratesAMissingOrBadList() throws {
        let report = try decode(OverviewReport.self, """
        {"revenue":{"collected":1},"topCustomers":[
          {"id":42,"name":"Lan","phone":"0901","orderCount":4,"rentalCount":3,"saleCount":1,"totalSpent":2500000},
          {"id":43,"name":"Minh","orderCount":1,"totalSpent":null}]}
        """)
        XCTAssertEqual(report.topCustomers, [
            OverviewReport.TopCustomer(id: 42, name: "Lan", phone: "0901", orderCount: 4, rentalCount: 3, saleCount: 1,
                                       totalSpent: 2_500_000),
            OverviewReport.TopCustomer(id: 43, name: "Minh", orderCount: 1, totalSpent: nil),
        ])
        XCTAssertTrue(try decode(OverviewReport.self, #"{"revenue":{"collected":1}}"#).topCustomers.isEmpty)
        XCTAssertTrue(try decode(OverviewReport.self, #"{"revenue":{"collected":1},"topCustomers":"x"}"#).topCustomers.isEmpty)
        XCTAssertTrue(try decode(OverviewReport.self, #"{"revenue":{"collected":1},"topCustomers":null}"#).topCustomers.isEmpty)
    }

    func testTodayCardOnlyForTheTodayPeriod() {
        inEachZone { zone in
            let today = "2026-10-07"
            func shows(_ chip: OverviewChip, custom: DayKeyRange? = nil) -> Bool {
                OverviewDashLogic.showsTodayCard(range: OverviewDashLogic.range(of: chip, todayKey: today, custom: custom),
                                                 todayKey: today)
            }
            XCTAssertTrue(shows(.today), zone)
            XCTAssertFalse(shows(.last7), zone)
            XCTAssertFalse(shows(.thisMonth), zone)
            XCTAssertFalse(shows(.custom, custom: DayKeyRange(start: CalendarV2Logic.shift(today, days: -3), end: today)), zone)
            let yesterday = CalendarV2Logic.shift(today, days: -1)
            XCTAssertFalse(shows(.custom, custom: DayKeyRange(start: yesterday, end: yesterday)), zone)
            // A custom range of just today is today
            XCTAssertTrue(shows(.custom, custom: DayKeyRange(start: today, end: today)), zone)
        }
    }

    func testPeriodRequestAsksForFiveTopRows() {
        let parameters = TabsV2APIService.overviewReportParameters(DayKeyRange(start: "2026-10-01", end: "2026-10-31"))
        XCTAssertEqual(parameters["limit"] as? Int, 5)
        XCTAssertEqual(OverviewDashLogic.topLimit, 5)
    }

    // MARK: Xem tất cả (#633)

    func testViewAllKeepsUpToFiftyRowsInTheApiOrder() {
        let products = (1...60).map { OverviewReport.TopProduct(id: $0, name: "SP \($0)", rentalCount: 1, totalRevenue: Double(1000 - $0), image: nil) }
        XCTAssertEqual(OverviewDashLogic.topProductRows(products).count, 5, "the card stays at five")
        let all = OverviewDashLogic.topProductRows(products, limit: OverviewDashLogic.topAllLimit)
        XCTAssertEqual(all.count, 50)
        XCTAssertEqual(all.first?.id, 1)
        XCTAssertEqual(all.last?.id, 50)
        XCTAssertEqual(all.first?.ratio, 1)
        let customers = (1...7).map { OverviewReport.TopCustomer(id: $0, name: "K \($0)", orderCount: 1, totalSpent: 100) }
        XCTAssertEqual(OverviewDashLogic.topCustomerRows(customers, limit: OverviewDashLogic.topAllLimit).count, 7)
    }

    func testViewAllRequestAsksForFiftyTopRows() {
        let parameters = TabsV2APIService.overviewReportParameters(DayKeyRange(start: "2026-10-01", end: "2026-10-31"),
                                                                   limit: OverviewDashLogic.topAllLimit)
        XCTAssertEqual(parameters["limit"] as? Int, 50)
        XCTAssertEqual(parameters["startDate"] as? String, "2026-10-01")
    }
}
