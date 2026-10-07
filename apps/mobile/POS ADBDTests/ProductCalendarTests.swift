import XCTest
@testable import POS_ADBD

/// #642 — "Lịch trống" month screen: grid, cell state, range rules, lowest free count, orders holding the product
final class ProductCalendarTests: XCTestCase {
    private let vietnam = TimeZone(identifier: "Asia/Ho_Chi_Minh")!

    private func order(id: Int, status: String = "RESERVED", pickup: String, returns: String,
                       productId: Int = 7, quantity: Int = 1) throws -> Order {
        let items = #"[{"id":1,"productId":\#(productId),"quantity":\#(quantity),"unitPrice":1,"totalPrice":1},{"id":2,"productId":99,"quantity":5,"unitPrice":1,"totalPrice":1}]"#
        let json = #"{"id":\#(id),"orderNumber":"48211\#(id)","orderType":"RENT","status":"\#(status)","createdAt":"2026-10-01T03:00:00.000Z","updatedAt":"2026-10-01T03:00:00.000Z","pickupPlanAt":"\#(pickup)","returnPlanAt":"\#(returns)","customerName":"Mai","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B","totalAmount":1,"orderItems":\#(items)}"#
        return try JSONDecoder.shared.decode(Order.self, from: Data(json.utf8))
    }

    // MARK: Grid

    func testOctober2026StartsThursdayWithThreeLeadingBlanks() {
        XCTAssertEqual(ProductCalendarLogic.leadingBlanks(year: 2026, month: 10), 3)
        let cells = ProductCalendarLogic.monthCells(year: 2026, month: 10)
        XCTAssertEqual(Array(cells.prefix(4)), [nil, nil, nil, "2026-10-01"])
        XCTAssertEqual(cells.count % 7, 0)
        XCTAssertEqual(cells.compactMap { $0 }.count, 31)
        XCTAssertEqual(cells.compactMap { $0 }.last, "2026-10-31")
        // 3 blanks + 31 days = 34 → one trailing blank
        XCTAssertEqual(cells.count, 35)
    }

    func testMondayFirstMonthHasNoLeadingBlankAndBoundsCoverTheMonth() {
        // 1 Jun 2026 is a Monday
        XCTAssertEqual(ProductCalendarLogic.leadingBlanks(year: 2026, month: 6), 0)
        // 1 Nov 2026 is a Sunday → 6 blanks
        XCTAssertEqual(ProductCalendarLogic.leadingBlanks(year: 2026, month: 11), 6)
        let bounds = ProductCalendarLogic.monthBounds(year: 2026, month: 2)
        XCTAssertEqual(bounds.from, "2026-02-01")
        XCTAssertEqual(bounds.to, "2026-02-28")
    }

    func testPreviousMonthStopsAtCurrentMonth() {
        XCTAssertFalse(ProductCalendarLogic.canGoBack(year: 2026, month: 10, todayKey: "2026-10-07"))
        XCTAssertTrue(ProductCalendarLogic.canGoBack(year: 2026, month: 11, todayKey: "2026-10-07"))
        XCTAssertTrue(ProductCalendarLogic.canGoBack(year: 2027, month: 1, todayKey: "2026-12-31"))
    }

    // MARK: Cell state

    func testCellToneByAvailableStockAndPast() {
        XCTAssertEqual(ProductCalendarLogic.tone(available: 3, stock: 3, isPast: false), .full)
        XCTAssertEqual(ProductCalendarLogic.tone(available: 1, stock: 3, isPast: false), .low)
        XCTAssertEqual(ProductCalendarLogic.tone(available: 0, stock: 3, isPast: false), .out)
        XCTAssertEqual(ProductCalendarLogic.tone(available: 3, stock: 3, isPast: true), .past)
        XCTAssertEqual(ProductCalendarLogic.tone(available: nil, stock: 3, isPast: false), .unknown)
        XCTAssertTrue(ProductCalendarLogic.isPast("2026-10-06", todayKey: "2026-10-07"))
        XCTAssertFalse(ProductCalendarLogic.isPast("2026-10-07", todayKey: "2026-10-07"))
    }

    // MARK: Range

    func testRangeFirstTapStartSecondTapEnd() {
        var range = ProductCalendarRange.empty
        range = ProductCalendarLogic.tap("2026-10-07", range: range, todayKey: "2026-10-07")
        XCTAssertEqual(range, ProductCalendarRange(start: "2026-10-07", end: nil))
        range = ProductCalendarLogic.tap("2026-10-16", range: range, todayKey: "2026-10-07")
        XCTAssertEqual(range, ProductCalendarRange(start: "2026-10-07", end: "2026-10-16"))
        XCTAssertEqual(ProductCalendarLogic.dayCount(range), 10)
        XCTAssertEqual(ProductCalendarLogic.selection("2026-10-07", range: range), .start)
        XCTAssertEqual(ProductCalendarLogic.selection("2026-10-10", range: range), .between)
        XCTAssertEqual(ProductCalendarLogic.selection("2026-10-16", range: range), .end)
        XCTAssertEqual(ProductCalendarLogic.selection("2026-10-17", range: range), .none)
        // A third tap starts again
        range = ProductCalendarLogic.tap("2026-10-20", range: range, todayKey: "2026-10-07")
        XCTAssertEqual(range, ProductCalendarRange(start: "2026-10-20", end: nil))
    }

    func testTapBeforeStartRestartsAndSameDayIsOneDay() {
        var range = ProductCalendarRange(start: "2026-10-12", end: nil)
        range = ProductCalendarLogic.tap("2026-10-09", range: range, todayKey: "2026-10-07")
        XCTAssertEqual(range, ProductCalendarRange(start: "2026-10-09", end: nil))
        range = ProductCalendarLogic.tap("2026-10-09", range: range, todayKey: "2026-10-07")
        XCTAssertEqual(range, ProductCalendarRange(start: "2026-10-09", end: "2026-10-09"))
        XCTAssertEqual(ProductCalendarLogic.dayCount(range), 1)
    }

    func testPastDaysCannotBePicked() {
        let range = ProductCalendarRange(start: "2026-10-08", end: nil)
        XCTAssertEqual(ProductCalendarLogic.tap("2026-10-06", range: range, todayKey: "2026-10-07"), range)
        XCTAssertEqual(ProductCalendarLogic.tap("2026-10-06", range: .empty, todayKey: "2026-10-07"), .empty)
    }

    func testRangeAcrossMonthEnd() {
        let range = ProductCalendarRange(start: "2026-10-30", end: "2026-11-02")
        XCTAssertEqual(ProductCalendarLogic.keys(in: range), ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"])
    }

    // MARK: Lowest free count

    func testMinAvailableOverRange() {
        let available = ["2026-10-07": 2, "2026-10-08": 1, "2026-10-09": 3]
        let range = ProductCalendarRange(start: "2026-10-07", end: "2026-10-09")
        XCTAssertEqual(ProductCalendarLogic.minAvailable(range, available: available), 1)
        XCTAssertTrue(ProductCalendarLogic.canAdd(range: range, minAvailable: 1, overlapAllowed: false))
        // A day not loaded yet → unknown, listed as missing
        let longer = ProductCalendarRange(start: "2026-10-07", end: "2026-10-10")
        XCTAssertNil(ProductCalendarLogic.minAvailable(longer, available: available))
        XCTAssertEqual(ProductCalendarLogic.missingKeys(longer, available: available), ["2026-10-10"])
        // Incomplete range → nil, cannot add
        XCTAssertNil(ProductCalendarLogic.minAvailable(ProductCalendarRange(start: "2026-10-07", end: nil), available: available))
        XCTAssertFalse(ProductCalendarLogic.canAdd(range: ProductCalendarRange(start: "2026-10-07", end: nil), minAvailable: nil, overlapAllowed: true))
    }

    func testBookedOutRangeNeedsOverlapAllowed() {
        let range = ProductCalendarRange(start: "2026-10-16", end: "2026-10-18")
        let available = ["2026-10-16": 1, "2026-10-17": 0, "2026-10-18": 0]
        XCTAssertEqual(ProductCalendarLogic.minAvailable(range, available: available), 0)
        XCTAssertFalse(ProductCalendarLogic.canAdd(range: range, minAvailable: 0, overlapAllowed: false))
        XCTAssertTrue(ProductCalendarLogic.canAdd(range: range, minAvailable: 0, overlapAllowed: true))
    }

    // MARK: Orders covering a day

    func testOrdersCoveringDayAreInclusiveVietnamDays() throws {
        // Pickup 07/10 09:00 VN, return 09/10 09:00 VN
        let a = try order(id: 1, pickup: "2026-10-07T02:00:00.000Z", returns: "2026-10-09T02:00:00.000Z")
        // Pickup 06/10 00:30 VN (= 05/10 17:30Z), return 16/10
        let b = try order(id: 2, status: "PICKUPED", pickup: "2026-10-05T17:30:00.000Z", returns: "2026-10-16T02:00:00.000Z", quantity: 2)
        // Done or cancelled orders do not hold the product
        let c = try order(id: 3, status: "RETURNED", pickup: "2026-10-07T02:00:00.000Z", returns: "2026-10-09T02:00:00.000Z")
        let d = try order(id: 4, status: "CANCELLED", pickup: "2026-10-07T02:00:00.000Z", returns: "2026-10-09T02:00:00.000Z")
        let all = [a, b, c, d]
        XCTAssertEqual(ProductCalendarLogic.orders(all, covering: "2026-10-08", timeZone: vietnam).map(\.id), [2, 1])
        XCTAssertEqual(ProductCalendarLogic.orders(all, covering: "2026-10-09", timeZone: vietnam).map(\.id), [2, 1])
        XCTAssertEqual(ProductCalendarLogic.orders(all, covering: "2026-10-06", timeZone: vietnam).map(\.id), [2])
        XCTAssertEqual(ProductCalendarLogic.orders(all, covering: "2026-10-05", timeZone: vietnam).map(\.id), [])
        XCTAssertEqual(ProductCalendarLogic.orders(all, covering: "2026-10-17", timeZone: vietnam).map(\.id), [])
        XCTAssertEqual(ProductCalendarLogic.quantity(b, productId: 7), 2)
    }

    func testSameDayOrderCoversThatDay() throws {
        // Pickup 10/10 08:00 VN and return 10/10 20:00 VN
        let same = try order(id: 5, pickup: "2026-10-10T01:00:00.000Z", returns: "2026-10-10T13:00:00.000Z")
        XCTAssertEqual(ProductCalendarLogic.orders([same], covering: "2026-10-10", timeZone: vietnam).map(\.id), [5])
        XCTAssertEqual(ProductCalendarLogic.orders([same], covering: "2026-10-11", timeZone: vietnam).map(\.id), [])
        XCTAssertEqual(ProductCalendarLogic.orders([same], covering: "2026-10-09", timeZone: vietnam).map(\.id), [])
    }

    // MARK: Cart days

    func testCartBoundsAreTheShopDaysOfTheRange() {
        let bounds = ProductCalendarLogic.cartBounds(ProductCalendarRange(start: "2026-10-07", end: "2026-10-16"), timeZone: vietnam)
        let iso = ISO8601DateFormatter()
        XCTAssertEqual(bounds.map { iso.string(from: $0.pickup) }, "2026-10-06T17:00:00Z")
        XCTAssertEqual(bounds.map { iso.string(from: $0.return) }, "2026-10-16T16:59:59Z")
        XCTAssertNil(ProductCalendarLogic.cartBounds(ProductCalendarRange(start: "2026-10-07", end: nil), timeZone: vietnam))
    }
}
