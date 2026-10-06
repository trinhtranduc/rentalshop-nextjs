import XCTest
@testable import POS_ADBD

/// #388 — product detail strip and chips, overview late list, plural, settings counts, app-config cache
final class Phase7GapsTests: XCTestCase {
    private let vietnam = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
    private let utc = TimeZone(identifier: "UTC")!
    private let iso = ISO8601DateFormatter()

    private func order(id: Int = 1, status: String, type: String = "RENT", created: String = "2026-10-02T03:00:00.000Z",
                       pickup: String = "2026-10-04T02:00:00.000Z", returns: String = "2026-10-05T02:00:00.000Z",
                       items: String = #"[{"id":1,"productId":7,"quantity":2,"unitPrice":1,"totalPrice":2},{"id":2,"productId":8,"quantity":1,"unitPrice":1,"totalPrice":1}]"#) throws -> Order {
        let json = #"{"id":\#(id),"orderNumber":"0057","orderType":"\#(type)","status":"\#(status)","createdAt":"\#(created)","updatedAt":"\#(created)","pickupPlanAt":"\#(pickup)","returnPlanAt":"\#(returns)","customerName":"Minh","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B","totalAmount":1,"orderItems":\#(items)}"#
        return try JSONDecoder.shared.decode(Order.self, from: Data(json.utf8))
    }

    // MARK: Strip

    func testWeekKeysCrossMonthEnd() {
        XCTAssertEqual(ProductDetailV2Logic.weekKeys(from: "2026-09-29"),
                       ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"])
        XCTAssertEqual(ProductDetailV2Logic.weekKeys(from: "bad"), [])
    }

    func testStripTonesTodayAndMissingDays() {
        let strip = ProductDetailV2Logic.strip(todayKey: "2026-10-03",
                                               available: ["2026-10-03": 3, "2026-10-04": 1, "2026-10-05": 0, "2026-10-06": -2])
        XCTAssertEqual(strip.count, 7)
        XCTAssertEqual(strip.map(\.day), ["03", "04", "05", "06", "07", "08", "09"])
        XCTAssertEqual(strip.map(\.free), [3, 1, 0, 0, 0, 0, 0])
        XCTAssertEqual(strip.map(\.tone), [.ok, .low, .none, .none, .none, .none, .none])
        XCTAssertEqual(strip.filter(\.isToday).map(\.key), ["2026-10-03"])
    }

    // MARK: Chips

    func testChipStatuses() {
        XCTAssertEqual(ProductOrdersChip.upcoming.statuses, [.reserved])
        XCTAssertEqual(ProductOrdersChip.renting.statuses, [.pickuped])
        XCTAssertEqual(ProductOrdersChip.done.statuses, [.returned, .completed])
        XCTAssertFalse(ProductOrdersChip.allCases.flatMap(\.statuses).contains(.cancelled))
        XCTAssertEqual(ProductOrdersChip.upcoming.sortBy, "pickupPlanAt")
        XCTAssertEqual(ProductOrdersChip.upcoming.sortOrder, "asc")
        XCTAssertEqual(ProductOrdersChip.renting.sortBy, "returnPlanAt")
        XCTAssertEqual(ProductOrdersChip.done.sortOrder, "desc")
    }

    func testMergeDoneNewestFirstWithoutDuplicates() throws {
        let returned = [try order(id: 1, status: "RETURNED", created: "2026-09-01T03:00:00.000Z"),
                        try order(id: 2, status: "RETURNED", created: "2026-09-20T03:00:00.000Z")]
        let completed = [try order(id: 3, status: "COMPLETED", type: "SALE", created: "2026-09-10T03:00:00.000Z"),
                         try order(id: 2, status: "RETURNED", created: "2026-09-20T03:00:00.000Z")]
        XCTAssertEqual(ProductDetailV2Logic.mergeDone([returned, completed]).map(\.id), [2, 3, 1])
        XCTAssertEqual(ProductDetailV2Logic.mergeDone([returned, completed], limit: 2).map(\.id), [2, 3])
    }

    /// #496: "#code · trả T? dd/mm", no quantity; days are Vietnam civil days
    func testMetaShowsNumberAndReturnDay() throws {
        let vi = Locale(identifier: "vi")
        let rent = try order(status: "RESERVED", pickup: "2026-10-02T17:00:00.000Z", returns: "2026-10-04T17:00:00.000Z")
        XCTAssertEqual(ProductDetailV2Logic.meta(rent, timeZone: vietnam, locale: vi),
                       "#0057 · " + String(format: "orders.row.returnAfter".localized(), "T2 05/10"))
        XCTAssertEqual(ProductDetailV2Logic.meta(rent, timeZone: utc, locale: vi),
                       "#0057 · " + String(format: "orders.row.returnAfter".localized(), "CN 04/10"))
        XCTAssertFalse(ProductDetailV2Logic.meta(rent, timeZone: vietnam, locale: vi).contains("×"))
    }

    func testRowStatePerChip() throws {
        let now = iso.date(from: "2026-10-03T05:00:00Z")!
        // Pickup 03/10 07:00 VN = today in Vietnam
        let today = try order(status: "RESERVED", pickup: "2026-10-03T00:00:00.000Z")
        XCTAssertEqual(ProductDetailV2Logic.rowState(today, chip: .upcoming, now: now, timeZone: vietnam), .pickupToday)
        let later = try order(status: "RESERVED", pickup: "2026-10-05T02:00:00.000Z")
        XCTAssertEqual(ProductDetailV2Logic.rowState(later, chip: .upcoming, now: now, timeZone: vietnam, locale: Locale(identifier: "vi")),
                       .pickupOn("T2 05/10"))
        let noShow = try order(status: "RESERVED", pickup: "2026-10-01T02:00:00.000Z")
        XCTAssertEqual(ProductDetailV2Logic.rowState(noShow, chip: .upcoming, now: now, timeZone: vietnam), .late(2))
        // 02/10 18:00 UTC is 03/10 in Vietnam but 02/10 in UTC
        let edge = try order(status: "PICKUPED", returns: "2026-10-02T18:00:00.000Z")
        XCTAssertEqual(ProductDetailV2Logic.rowState(edge, chip: .renting, now: now, timeZone: vietnam), .returnToday)
        XCTAssertEqual(ProductDetailV2Logic.rowState(edge, chip: .renting, now: now, timeZone: utc), .late(1))
        let due = try order(status: "PICKUPED", returns: "2026-10-07T02:00:00.000Z")
        XCTAssertEqual(ProductDetailV2Logic.rowState(due, chip: .renting, now: now, timeZone: vietnam, locale: Locale(identifier: "vi")),
                       .returnOn("T4 07/10"))
        let done = try order(status: "RETURNED")
        XCTAssertEqual(ProductDetailV2Logic.rowState(done, chip: .done, now: now, timeZone: vietnam), .status)
    }

    // MARK: Overview late list

    func testLatePageStopsAtFirstNotLate() throws {
        let now = iso.date(from: "2026-10-03T05:00:00Z")!
        let rows = [try order(id: 1, status: "PICKUPED", returns: "2026-09-30T02:00:00.000Z"),
                    try order(id: 2, status: "PICKUPED", returns: "2026-10-02T02:00:00.000Z"),
                    try order(id: 3, status: "PICKUPED", returns: "2026-10-03T02:00:00.000Z"),
                    try order(id: 4, status: "PICKUPED", returns: "2026-10-05T02:00:00.000Z")]
        let cut = OverviewLateFilter.page(rows, hasMore: true, now: now, timeZone: vietnam)
        XCTAssertEqual(cut.orders.map(\.id), [1, 2])
        XCTAssertFalse(cut.hasMore)
        let allLate = OverviewLateFilter.page(Array(rows.prefix(2)), hasMore: true, now: now, timeZone: vietnam)
        XCTAssertEqual(allLate.orders.count, 2)
        XCTAssertTrue(allLate.hasMore)
    }

    // MARK: Plural, counts, app config

    func testLatePluralKeys() {
        XCTAssertEqual(LateText.key(1), "Late 1 day")
        XCTAssertEqual(LateText.key(2), "Late %d days")
        XCTAssertEqual(LateText.key(0), "Late %d days")
        XCTAssertEqual(LateText.returnedKey(1), "Returned 1 day late")
        XCTAssertEqual(LateText.returnedKey(3), "Returned %d days late")
        // Both keys exist in both languages
        for language in ["en", "vi-VN"] {
            guard let path = Bundle.main.path(forResource: language, ofType: "lproj"), let bundle = Bundle(path: path) else {
                return XCTFail("missing \(language)")
            }
            for key in ["Late 1 day", "Late %d days", "Returned 1 day late", "Returned %d days late"] {
                XCTAssertNotEqual(bundle.localizedString(forKey: key, value: "∅", table: nil), "∅", "\(language): \(key)")
            }
        }
        let en = Bundle(path: Bundle.main.path(forResource: "en", ofType: "lproj")!)!
        XCTAssertEqual(en.localizedString(forKey: "Late 1 day", value: nil, table: nil), "1 day late")
        XCTAssertEqual(String(format: en.localizedString(forKey: "Late %d days", value: nil, table: nil), 3), "3 days late")
    }

    func testListTotalReadsCustomersAndUsersShapes() throws {
        let customers = #"{"success":true,"data":{"customers":[],"total":31,"page":1}}"#
        let users = #"{"success":true,"data":[{"id":1}],"pagination":{"page":1,"limit":1,"total":4}}"#
        let broken = #"{"success":false}"#
        XCTAssertEqual(try JSONDecoder().decode(SettingsListTotal.self, from: Data(customers.utf8)).total, 31)
        XCTAssertEqual(try JSONDecoder().decode(SettingsListTotal.self, from: Data(users.utf8)).total, 4)
        XCTAssertNil(try JSONDecoder().decode(SettingsListTotal.self, from: Data(broken.utf8)).total)
        XCTAssertEqual(SettingsListTotal.path(for: .customers), "/api/customers")
        XCTAssertEqual(SettingsListTotal.path(for: .users), "/api/users")
        XCTAssertNil(SettingsListTotal.path(for: .export))
    }

    func testAppConfigSkipsLocalCache() {
        XCTAssertEqual(AppConfigService.cachePolicy, .reloadIgnoringLocalCacheData)
    }
}
