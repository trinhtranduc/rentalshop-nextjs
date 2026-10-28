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
        // #458: fully paid → no line
        XCTAssertNil(OrdersHomeLogic.listPayLine(try order(status: "RETURNED", balances: #","amountDue":0,"refundDue":0"#)))
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

    /// #888: one date for sort and range; default Ngày lấy, gần nhất trước; "Việc gần nhất" left the sheet
    func testOneDateForSortAndRange() {
        XCTAssertEqual(RentOrdersFilter.SortDate.allCases, [.pickup, .returnDate, .created])
        var filter = RentOrdersFilter()
        XCTAssertEqual(filter.sortDate, .pickup)
        XCTAssertEqual(filter.direction, .nearestFirst)
        XCTAssertTrue(filter.isDefault)
        filter.direction = .farthestFirst
        XCTAssertFalse(filter.isDefault)
        XCTAssertEqual(RentOrdersFilter.SortDate.allCases.map { date -> [String] in
            var f = RentOrdersFilter()
            f.sortDate = date
            return [f.sortBy, f.dateField]
        }, [["pickupPlanAt", "pickupPlanAt"], ["returnPlanAt", "returnPlanAt"], ["createdAt", "createdAt"]])
        XCTAssertEqual(RentOrdersFilter.Direction.allCases.map { direction -> String in
            var f = RentOrdersFilter()
            f.direction = direction
            return f.sortOrder
        }, ["desc", "asc"])
    }

    func testPlannedRangeQueryUsesDeviceDays() throws {
        let now = iso.date(from: "2026-10-03T18:30:00.000Z")! // 04/10 01:30 in Vietnam
        var filter = RentOrdersFilter()
        filter.sortDate = .pickup
        filter.dateRange = .next7Days
        let query = OrdersHomeLogic.rentQuery(filter, now: now, timeZone: vietnam)
        XCTAssertEqual(query.sortBy, "pickupPlanAt")
        XCTAssertEqual(query.sortOrder, "desc")
        XCTAssertEqual(query.dateField, "pickupPlanAt")
        XCTAssertEqual(query.startDate.map { iso.string(from: $0) }, "2026-10-03T17:00:00.000Z")
        XCTAssertEqual(query.endDate.map { iso.string(from: $0) }, "2026-10-09T17:00:00.000Z")
    }

    // MARK: 3. Calendar note

    private func dayOrder(_ money: String = "") throws -> CalendarDayOrder {
        let json = #"{"id":5,"orderNumber":"ORD-1-5","customerName":"Lan","totalAmount":600000\#(money)}"#
        return try JSONDecoder().decode(CalendarDayOrder.self, from: Data(json.utf8))
    }

    /// Owner rule (#893): under the total only "Trễ N ngày" for a late order; never "còn thu" or a refund note.
    func testCalendarNote() throws {
        let late = CalendarDayRow(kind: .takeBack, order: try dayOrder(#","lateFee":150000,"amountDue":150000"#), lateDays: 2)
        XCTAssertEqual(CalendarV2Logic.note(late, hidesMoney: false), .late(days: 2, fee: 150000), "late wins over money due")
        XCTAssertEqual(CalendarV2Logic.note(late, hidesMoney: true), .late(days: 2, fee: nil))
        let lateNoFee = CalendarDayRow(kind: .takeBack, order: try dayOrder(#","lateFee":0"#), lateDays: 1)
        XCTAssertEqual(CalendarV2Logic.note(lateNoFee, hidesMoney: false), .late(days: 1, fee: nil))
        let due = CalendarDayRow(kind: .handOver, order: try dayOrder(#","amountDue":700000,"refundDue":0"#), lateDays: 0)
        XCTAssertEqual(CalendarV2Logic.note(due, hidesMoney: false), CalendarNote.none, "no còn thu")
        let refund = CalendarDayRow(kind: .takeBack, order: try dayOrder(#","amountDue":0,"refundDue":500000"#), lateDays: 0)
        XCTAssertEqual(CalendarV2Logic.note(refund, hidesMoney: false), CalendarNote.none)
        let old = CalendarDayRow(kind: .handOver, order: try dayOrder(), lateDays: 0)
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

    // MARK: 4b. Branch error codes (#859)

    private func branchError(_ code: String, data: String = "") throws -> APIErrorResponse {
        let json = #"{"success":false,"code":"\#(code)","message":"English API text"\#(data)}"#
        return try JSONDecoder().decode(APIErrorResponse.self, from: Data(json.utf8))
    }

    /// The sentence in one locale's Localizable.strings of the app bundle.
    private func sentence(_ key: String, _ localization: String) -> String? {
        guard let path = Bundle.main.path(forResource: "Localizable", ofType: "strings", inDirectory: nil, forLocalization: localization),
              let table = NSDictionary(contentsOfFile: path) as? [String: String] else { return nil }
        return table[key]
    }

    func testBranchCodesShowTheLocalizedSentence() throws {
        let expected: [(String, APIErrorCode, Int)] = [
            ("OUTLET_DEACTIVATED", .outletDeactivated, 403),
            ("PRODUCT_SHARED_FIELDS_MERCHANT_ONLY", .productSharedFieldsMerchantOnly, 403),
            ("PRODUCT_DELETE_MERCHANT_ONLY", .productDeleteMerchantOnly, 403),
            ("OUTLET_HAS_OPEN_ORDERS", .outletHasOpenOrders, 409),
        ]
        for (code, errorCode, status) in expected {
            let response = try branchError(code)
            XCTAssertEqual(response.errorCode, errorCode, code)
            XCTAssertEqual(errorCode.httpStatusCode, status, code)
            let error = response.toNSError()
            XCTAssertEqual(error.code, status, code)
            XCTAssertEqual(error.localizedDescription, code.localized(), code)
            XCTAssertNotEqual(error.localizedDescription, code)
            XCTAssertNotEqual(error.localizedDescription, "English API text", code)
        }
    }

    func testBranchCodeTextsMatchTheWeb() {
        let vi: [String: String] = [
            "OUTLET_DEACTIVATED": "Chi nhánh đã ngừng hoạt động, liên hệ chủ shop.",
            "PRODUCT_SHARED_FIELDS_MERCHANT_ONLY": "Nhân viên không sửa được tên, giá, ảnh, danh mục và thông tin chung của sản phẩm; hãy nhờ chủ shop, quản lý chi nhánh hoặc nhân viên kho. Bạn chỉ sửa được tồn kho của chi nhánh mình.",
            "PRODUCT_DELETE_MERCHANT_ONLY": "Nhân viên không xóa được sản phẩm; hãy nhờ chủ shop, quản lý chi nhánh hoặc nhân viên kho.",
            "PRODUCT_HELD_BY_OTHER_OUTLETS": "{outlets} còn sản phẩm này; chỉ chủ shop xóa được. Muốn ngừng bán ở chi nhánh mình, hãy đặt tồn về 0.",
            "PRODUCT_HELD_BY_OTHER_OUTLETS_NO_PARAMS": "Chi nhánh khác còn sản phẩm này; chỉ chủ shop xóa được. Muốn ngừng bán ở chi nhánh mình, hãy đặt tồn về 0.",
            "OUTLET_HAS_OPEN_ORDERS": "Chi nhánh còn đơn đã đặt hoặc đang thuê. Hãy hoàn tất hoặc huỷ các đơn đó trước khi tắt chi nhánh.",
        ]
        let en: [String: String] = [
            "OUTLET_DEACTIVATED": "This branch has been deactivated. Please contact the shop owner.",
            "PRODUCT_SHARED_FIELDS_MERCHANT_ONLY": "Staff cannot change the name, prices, photos, category or other shared details of a product; ask the shop owner, the branch manager or the warehouse staff. You can update your branch's stock.",
            "PRODUCT_DELETE_MERCHANT_ONLY": "Staff cannot delete products; ask the shop owner, the branch manager or the warehouse staff.",
            "PRODUCT_HELD_BY_OTHER_OUTLETS": "{outlets} still has this product; only the shop owner can delete it. To stop selling it at your branch, set your stock to 0.",
            "PRODUCT_HELD_BY_OTHER_OUTLETS_NO_PARAMS": "Another branch still has this product; only the shop owner can delete it. To stop selling it at your branch, set your stock to 0.",
            "OUTLET_HAS_OPEN_ORDERS": "This branch still has orders that are reserved or being rented. Complete or cancel them before turning the branch off.",
        ]
        for (key, text) in vi { XCTAssertEqual(sentence(key, "vi-VN"), text, key) }
        for (key, text) in en { XCTAssertEqual(sentence(key, "en"), text, key) }
    }

    func testHeldByOtherOutletsNamesTheBranches() throws {
        let data = #","data":{"outlets":[{"id":1,"name":"Main","stock":3},{"id":2,"name":"Kho","stock":0}],"messageParams":{"outlets":"Main (3), Kho (0)"}}"#
        let response = try branchError("PRODUCT_HELD_BY_OTHER_OUTLETS", data: data)
        XCTAssertEqual(response.errorCode, .productHeldByOtherOutlets)
        let error = response.toNSError(httpStatusCode: 409)
        XCTAssertEqual(error.code, 409)
        let expected = "PRODUCT_HELD_BY_OTHER_OUTLETS".localized().replacingOccurrences(of: "{outlets}", with: "Main (3), Kho (0)")
        XCTAssertEqual(error.localizedDescription, expected)
        XCTAssertTrue(error.localizedDescription.hasPrefix("Main (3), Kho (0) "))
        XCTAssertFalse(error.localizedDescription.contains("{outlets}"))
    }

    func testHeldByOtherOutletsWithoutNamesUsesTheGeneralSentence() throws {
        for data in ["", #","data":null"#, #","data":{"outlets":[]}"#, #","data":{"messageParams":{"outlets":""}}"#, #","data":[1,2]"#] {
            let response = try branchError("PRODUCT_HELD_BY_OTHER_OUTLETS", data: data)
            XCTAssertEqual(response.toNSError().localizedDescription, "PRODUCT_HELD_BY_OTHER_OUTLETS_NO_PARAMS".localized(), data)
            XCTAssertFalse(response.toNSError().localizedDescription.contains("{"), data)
        }
    }

    func testPlaceholderFillUsesTheLookup() {
        let table = ["X": "{outlets} has it", "X_NO_PARAMS": "Another has it"]
        let lookup: (String) -> String = { table[$0] ?? $0 }
        XCTAssertEqual(APIErrorText.message(forCode: "X", params: ["outlets": "A (1)"], lookup: lookup), "A (1) has it")
        XCTAssertEqual(APIErrorText.message(forCode: "X", params: [:], lookup: lookup), "Another has it")
        XCTAssertNil(APIErrorText.message(forCode: "UNKNOWN_CODE", params: ["outlets": "A"], lookup: lookup))
    }

    // MARK: 5. Extend rental

    func testExtendOnlyRentingOrdersWithOrdersUpdate() {
        XCTAssertFalse(RentalExtension.canExtend(orderType: .rent, status: .reserved, canUpdateOrders: true), "booked: no Gia hạn")
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

    // MARK: #425 — extra rent on Gia hạn

    private func json(_ request: UpdateOrderRequest) throws -> [String: Any] {
        let data = try JSONEncoder().encode(request)
        return try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
    }

    func testNewTotalOnlyWhenExtraAboveZero() {
        XCTAssertNil(RentalExtension.newTotal(oldTotal: 300_000, extra: nil))
        XCTAssertNil(RentalExtension.newTotal(oldTotal: 300_000, extra: 0))
        XCTAssertEqual(RentalExtension.newTotal(oldTotal: 300_000, extra: 50), 300_050)
    }

    func testRentalDurationCountsPickupToNewDayInclusive() {
        // Pickup 04/10 00:00 Vietnam, new return day 08/10 → 5 days
        let pickup = iso.date(from: "2026-10-03T17:00:00.000Z")!
        let newDay = iso.date(from: "2026-10-08T03:00:00.000Z")!
        XCTAssertEqual(RentalExtension.rentalDuration(pickup: pickup, newDay: newDay, timeZone: vietnam), 5)
        // Same instants in UTC: pickup is 03/10 there → 6 days
        XCTAssertEqual(RentalExtension.rentalDuration(pickup: pickup, newDay: newDay, timeZone: utc), 6)
        XCTAssertNil(RentalExtension.rentalDuration(pickup: nil, newDay: newDay, timeZone: vietnam))
    }

    func testUpdateWithoutExtraSendsNoTotal() throws {
        let pickup = iso.date(from: "2026-10-03T17:00:00.000Z")!
        let newDay = iso.date(from: "2026-10-08T03:00:00.000Z")!
        let body = try json(RentalExtension.updateRequest(pickup: pickup, newDay: newDay, oldTotal: 300_000,
                                                          extra: 0, timeZone: vietnam))
        XCTAssertEqual(body["returnPlanAt"] as? String, "2026-10-08T16:59:59.000Z")
        XCTAssertEqual(body["rentalDuration"] as? Int, 5)
        XCTAssertNil(body["totalAmount"])
        XCTAssertEqual(Set(body.keys), ["returnPlanAt", "rentalDuration"])
    }

    func testUpdateWithExtraAddsItToTheTotal() throws {
        let pickup = iso.date(from: "2026-10-03T17:00:00.000Z")!
        let newDay = iso.date(from: "2026-10-06T03:00:00.000Z")!
        let body = try json(RentalExtension.updateRequest(pickup: pickup, newDay: newDay, oldTotal: 300_000,
                                                          extra: 50, timeZone: vietnam))
        XCTAssertEqual(body["totalAmount"] as? Double, 300_050)
        XCTAssertEqual(body["rentalDuration"] as? Int, 3)
        XCTAssertEqual(Set(body.keys), ["returnPlanAt", "rentalDuration", "totalAmount"])
        // No pickup day: only the return day and the total
        let noPickup = try json(RentalExtension.updateRequest(pickup: nil, newDay: newDay, oldTotal: 300_000,
                                                              extra: 100, timeZone: vietnam))
        XCTAssertEqual(Set(noPickup.keys), ["returnPlanAt", "totalAmount"])
    }
}
