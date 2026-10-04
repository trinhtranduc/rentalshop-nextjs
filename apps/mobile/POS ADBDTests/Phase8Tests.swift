import XCTest
@testable import POS_ADBD

/// #390 — balances on rows, nearest-task sort, planned ranges, calendar notes, product delete, extend rental
final class Phase8Tests: XCTestCase {
    private let vietnam = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
    private let utc = TimeZone(identifier: "UTC")!
    private let iso: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private func order(status: String = "RESERVED", balances: String = "") throws -> Order {
        let json = #"{"id":1,"orderNumber":"ORD-1-0063","orderType":"RENT","status":"\#(status)","createdAt":"2026-10-02T03:00:00.000Z","updatedAt":"2026-10-02T03:00:00.000Z","customerName":"Huy","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B","totalAmount":300000\#(balances)}"#
        return try JSONDecoder.shared.decode(Order.self, from: Data(json.utf8))
    }

    // MARK: 1. Row pay line

    func testRowPayLineFollowsListBalances() throws {
        XCTAssertEqual(OrdersHomeLogic.listPayLine(try order(balances: #","amountDue":300000,"refundDue":0"#)), .due(300000))
        XCTAssertEqual(OrdersHomeLogic.listPayLine(try order(status: "PICKUPED", balances: #","amountDue":0,"refundDue":500000"#)), .refund(500000))
        XCTAssertEqual(OrdersHomeLogic.listPayLine(try order(balances: #","amountDue":5,"refundDue":10"#)), .refund(10))
        XCTAssertEqual(OrdersHomeLogic.listPayLine(try order(status: "RETURNED", balances: #","amountDue":0,"refundDue":0"#)), .paid)
        // One field alone is enough
        XCTAssertEqual(OrdersHomeLogic.listPayLine(try order(balances: #","amountDue":7"#)), .due(7))
    }

    func testNoPayLineWithoutBalancesOrWhenCancelled() throws {
        XCTAssertNil(OrdersHomeLogic.listPayLine(try order()))
        XCTAssertNil(OrdersHomeLogic.listPayLine(try order(balances: #","amountDue":null,"refundDue":null"#)))
        XCTAssertNil(OrdersHomeLogic.listPayLine(try order(status: "CANCELLED", balances: #","amountDue":0,"refundDue":0"#)))
        // The computed `amountDue` of older screens is unchanged by the list field
        let decoded = try order(balances: #","amountDue":1,"refundDue":0"#)
        XCTAssertEqual(decoded.amountDue, 300000)
    }

    // MARK: 2. Filter sheet

    func testNearestTaskSortAndPlannedBasis() {
        XCTAssertEqual(RentOrdersFilter.Sort.allCases.first, .nearestTask)
        var filter = RentOrdersFilter()
        XCTAssertEqual(filter.sort, .createdDate)
        XCTAssertTrue(filter.isDefault)
        filter.sort = .nearestTask
        XCTAssertEqual(filter.sortBy, "nearestTask")
        XCTAssertFalse(filter.isDefault)
        XCTAssertEqual(RentOrdersFilter.DateBasis.allCases.map { basis -> String in
            var f = RentOrdersFilter()
            f.dateBasis = basis
            return f.dateField
        }, ["createdAt", "pickupPlanAt", "returnPlanAt"])
    }

    func testPlannedRangeQueryUsesDeviceDays() throws {
        let now = iso.date(from: "2026-10-03T18:30:00.000Z")! // 04/10 01:30 in Vietnam
        var filter = RentOrdersFilter()
        filter.sort = .nearestTask
        filter.dateBasis = .pickupPlan
        filter.dateRange = .next7Days
        let query = OrdersHomeLogic.rentQuery(filter, now: now, timeZone: vietnam)
        XCTAssertEqual(query.sortBy, "nearestTask")
        XCTAssertEqual(query.dateField, "pickupPlanAt")
        XCTAssertEqual(query.startDate.map { iso.string(from: $0) }, "2026-10-03T17:00:00.000Z")
        XCTAssertEqual(query.endDate.map { iso.string(from: $0) }, "2026-10-09T17:00:00.000Z")
    }

    // MARK: 3. Calendar note

    private func dayOrder(_ money: String = "") throws -> CalendarDayOrder {
        let json = #"{"id":5,"orderNumber":"ORD-1-5","customerName":"Lan","totalAmount":600000\#(money)}"#
        return try JSONDecoder().decode(CalendarDayOrder.self, from: Data(json.utf8))
    }

    func testCalendarNote() throws {
        let late = CalendarDayRow(kind: .takeBack, order: try dayOrder(#","lateFee":150000"#), lateDays: 2)
        XCTAssertEqual(CalendarV2Logic.note(late, hidesMoney: false), .late(days: 2, fee: 150000))
        XCTAssertEqual(CalendarV2Logic.note(late, hidesMoney: true), .late(days: 2, fee: nil))
        let lateNoFee = CalendarDayRow(kind: .takeBack, order: try dayOrder(#","lateFee":0"#), lateDays: 1)
        XCTAssertEqual(CalendarV2Logic.note(lateNoFee, hidesMoney: false), .late(days: 1, fee: nil))
        let due = CalendarDayRow(kind: .handOver, order: try dayOrder(#","amountDue":700000,"refundDue":0"#), lateDays: 0)
        XCTAssertEqual(CalendarV2Logic.note(due, hidesMoney: false), .due(700000))
        XCTAssertEqual(CalendarV2Logic.note(due, hidesMoney: true), CalendarNote.none)
        let refund = CalendarDayRow(kind: .takeBack, order: try dayOrder(#","amountDue":0,"refundDue":500000"#), lateDays: 0)
        XCTAssertEqual(CalendarV2Logic.note(refund, hidesMoney: false), .refund(500000))
        let paid = CalendarDayRow(kind: .handOver, order: try dayOrder(#","amountDue":0,"refundDue":0"#), lateDays: 0)
        XCTAssertEqual(CalendarV2Logic.note(paid, hidesMoney: false), CalendarNote.none)
        // Older API: no money fields
        let old = CalendarDayRow(kind: .handOver, order: try dayOrder(), lateDays: 0)
        XCTAssertNil(old.order.amountDue)
        XCTAssertEqual(CalendarV2Logic.note(old, hidesMoney: false), CalendarNote.none)
    }

    // MARK: 4. Product delete

    func testOnlyProductsManageDeletes() {
        XCTAssertTrue(ProductAccess.canDelete(role: .merchant, permissions: ["products.manage"]))
        XCTAssertTrue(ProductAccess.canDelete(role: .outletAdmin, permissions: ["products.manage"]))
        XCTAssertFalse(ProductAccess.canDelete(role: .outletStaff, permissions: ["products.manage"]))
        XCTAssertFalse(ProductAccess.canDelete(role: .outletStaff, permissions: ["products.create"]))
        XCTAssertFalse(ProductAccess.canDelete(role: .merchant, permissions: ["products.update"]))
    }

    func testOpenOrdersConflictShowsReadableMessage() throws {
        let json = #"{"success":false,"code":"PRODUCT_HAS_OPEN_ORDERS","message":"Product has open orders"}"#
        let response = try JSONDecoder().decode(APIErrorResponse.self, from: Data(json.utf8))
        let error = response.toNSError(httpStatusCode: 409)
        XCTAssertEqual(error.code, 409)
        XCTAssertEqual(response.errorCode, .productHasOpenOrders)
        XCTAssertEqual(error.localizedDescription, "PRODUCT_HAS_OPEN_ORDERS".localized())
        XCTAssertNotEqual(error.localizedDescription, "PRODUCT_HAS_OPEN_ORDERS")
        XCTAssertNotEqual(error.localizedDescription, "Product has open orders")
    }

    // MARK: 5. Extend rental

    func testExtendOnlyOpenRentalsWithOrdersUpdate() {
        XCTAssertTrue(RentalExtension.canExtend(orderType: .rent, status: .reserved, canUpdateOrders: true))
        XCTAssertTrue(RentalExtension.canExtend(orderType: .rent, status: .pickuped, canUpdateOrders: true))
        XCTAssertFalse(RentalExtension.canExtend(orderType: .rent, status: .returned, canUpdateOrders: true))
        XCTAssertFalse(RentalExtension.canExtend(orderType: .rent, status: .cancelled, canUpdateOrders: true))
        XCTAssertFalse(RentalExtension.canExtend(orderType: .sale, status: .reserved, canUpdateOrders: true))
        XCTAssertFalse(RentalExtension.canExtend(orderType: .rent, status: .pickuped, canUpdateOrders: false))
    }

    func testWindowCoversOnlyTheAddedDays() {
        // Current return 05/10 23:59:59 in Vietnam, as the cart sends it
        let current = iso.date(from: "2026-10-05T16:59:59.000Z")!
        let first = RentalExtension.firstSelectableDay(after: current, timeZone: vietnam)
        XCTAssertEqual(iso.string(from: first), "2026-10-05T17:00:00.000Z") // 06/10 00:00
        XCTAssertNil(RentalExtension.window(currentReturn: current, newDay: current, timeZone: vietnam))
        // Picking any time of 08/10
        let newDay = iso.date(from: "2026-10-08T03:00:00.000Z")!
        let window = RentalExtension.window(currentReturn: current, newDay: newDay, timeZone: vietnam)
        XCTAssertEqual(window.map { iso.string(from: $0.start) }, "2026-10-05T17:00:00.000Z")
        XCTAssertEqual(window.map { iso.string(from: $0.end) }, "2026-10-08T16:59:59.000Z")
        XCTAssertEqual(RentalExtension.extraDays(currentReturn: current, newDay: newDay, timeZone: vietnam), 3)
        // One added day still occupies that day
        let next = iso.date(from: "2026-10-06T10:00:00.000Z")!
        let one = RentalExtension.window(currentReturn: current, newDay: next, timeZone: vietnam)
        XCTAssertEqual(one.map { iso.string(from: $0.start) }, "2026-10-05T17:00:00.000Z")
        XCTAssertEqual(one.map { iso.string(from: $0.end) }, "2026-10-06T16:59:59.000Z")
        XCTAssertEqual(iso.string(from: RentalExtension.returnPlanAt(newDay, timeZone: vietnam)), "2026-10-08T16:59:59.000Z")
    }

    func testWindowInUtcAndAcrossMonths() {
        let current = iso.date(from: "2026-10-31T23:59:59.000Z")!
        let newDay = iso.date(from: "2026-11-02T08:00:00.000Z")!
        let window = RentalExtension.window(currentReturn: current, newDay: newDay, timeZone: utc)
        XCTAssertEqual(window.map { iso.string(from: $0.start) }, "2026-11-01T00:00:00.000Z")
        XCTAssertEqual(window.map { iso.string(from: $0.end) }, "2026-11-02T23:59:59.000Z")
        XCTAssertEqual(RentalExtension.extraDays(currentReturn: current, newDay: newDay, timeZone: utc), 2)
    }

    /// A conflict's overlap comes with fractional hours; decoding must not fail (it hid every conflict before)
    func testBatchAvailabilityWithConflictDecodes() throws {
        let json = #"{"success":true,"code":"BATCH_AVAILABILITY_CHECKED","data":{"results":[{"productId":6,"productName":"Product 6","totalStock":2,"totalAvailableStock":0,"totalRenting":3,"requestedQuantity":1,"isAvailable":false,"stockAvailable":true,"hasNoConflicts":false,"availabilityByOutlet":[{"outletId":1,"stock":2,"available":5,"renting":3,"conflictingQuantity":2,"effectivelyAvailable":0,"canFulfillRequest":false,"conflicts":[{"orderNumber":"ORD-001-0013","quantity":2,"conflictDuration":95646934,"conflictHours":26.57,"conflictType":"period_overlap"}]}],"bestOutlet":{"outletId":1,"effectivelyAvailable":0},"totalConflictsFound":1}],"summary":{"totalProducts":1,"availableProducts":0,"unavailableProducts":1,"errorProducts":0}}}"#
        let response = try JSONDecoder().decode(BatchAvailabilityResponse.self, from: Data(json.utf8))
        let results = try XCTUnwrap(response.data?.results)
        XCTAssertEqual(results.first?.availabilityByOutlet?.first?.conflicts?.first?.conflictHours, 26.57)
        XCTAssertEqual(RentalExtension.unavailableNames(results, items: []), ["Product 6"])
    }

    func testAvailabilityRequestsAndVerdict() throws {
        let items = #"[{"id":1,"productId":1,"productName":"Vest","quantity":1,"unitPrice":1,"totalPrice":1},{"id":2,"productId":2,"productName":"Áo dài","quantity":2,"unitPrice":1,"totalPrice":2},{"id":3,"productId":1,"productName":"Vest","quantity":2,"unitPrice":1,"totalPrice":2}]"#
        let decoded = try JSONDecoder.shared.decode([OrderItem].self, from: Data(items.utf8))
        let requests = RentalExtension.requests(decoded)
        XCTAssertEqual(requests.map(\.productId), [1, 2])
        XCTAssertEqual(requests.map(\.quantity), [3, 2])

        let results = #"[{"productId":1,"productName":"Vest","requestedQuantity":3,"isAvailable":false,"stockAvailable":true,"hasNoConflicts":false,"totalAvailableStock":1},{"productId":2,"productName":"Áo dài","requestedQuantity":2,"isAvailable":true,"stockAvailable":true,"hasNoConflicts":true,"totalAvailableStock":5}]"#
        let parsed = try JSONDecoder().decode([BatchProductAvailabilityResult].self, from: Data(results.utf8))
        XCTAssertEqual(RentalExtension.unavailableNames(parsed, items: decoded), ["Vest"])
        XCTAssertEqual(RentalExtension.unavailableNames(Array(parsed.suffix(1)), items: decoded), [])
    }
}
