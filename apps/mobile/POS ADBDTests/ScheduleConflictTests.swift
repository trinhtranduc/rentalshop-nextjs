import XCTest
@testable import POS_ADBD

/// #518 "Cho tạo đơn khi trùng lịch": the setting, the cart lines booked out per Vietnam civil day, the CTA state,
/// the tag texts and the 409 ORDER_SCHEDULE_CONFLICT code
final class ScheduleConflictTests: XCTestCase {

    private let vn = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
    private let utc = TimeZone(identifier: "UTC")!

    private func at(_ iso: String) -> Date { ISOInstant.parse(iso)! }

    private func booking(_ number: String?, _ quantity: Int, _ pickup: String, _ back: String) -> ScheduleBooking {
        ScheduleBooking(orderNumber: number, quantity: quantity, pickup: at(pickup), returnDate: at(back))
    }

    /// Window 02/10 10:00 → 06/10 10:00 (Vietnam)
    private let windowPickup = "2026-10-02T03:00:00Z"
    private let windowReturn = "2026-10-06T03:00:00Z"

    private func conflict(requested: Int, stock: Int?, available: Int? = nil,
                          bookings: [ScheduleBooking]) -> CartScheduleConflict? {
        ScheduleConflictLogic.conflict(productId: 7, productName: "Vest đen slim fit", requested: requested, stock: stock,
                                       available: available, bookings: bookings, pickup: at(windowPickup),
                                       returnDate: at(windowReturn), timeZone: vn)
    }

    // MARK: Days

    func testDayKeysSplitAtVietnamMidnightNotUtc() {
        // 16:59:59Z is 23:59:59 on 02/10 in Vietnam; 17:00:00Z is already 03/10
        XCTAssertEqual(ScheduleConflictLogic.dayKeys(from: at("2026-10-02T16:59:59Z"), to: at("2026-10-02T17:00:00Z"), timeZone: vn),
                       ["2026-10-02", "2026-10-03"])
        // The same two instants are one UTC day
        XCTAssertEqual(ScheduleConflictLogic.dayKeys(from: at("2026-10-02T16:59:59Z"), to: at("2026-10-02T17:00:00Z"), timeZone: utc),
                       ["2026-10-02"])
    }

    func testSameDayRentalStillOccupiesThatDay() {
        XCTAssertEqual(ScheduleConflictLogic.dayKeys(from: at("2026-10-03T02:00:00Z"), to: at("2026-10-03T10:00:00Z"), timeZone: vn),
                       ["2026-10-03"])
    }

    func testDayKeysWithEndBeforeStartIsOneDay() {
        XCTAssertEqual(ScheduleConflictLogic.dayKeys(from: at("2026-10-05T02:00:00Z"), to: at("2026-10-03T02:00:00Z"), timeZone: vn),
                       ["2026-10-05"])
    }

    func testDayKeysCrossMonth() {
        XCTAssertEqual(ScheduleConflictLogic.dayKeys(from: at("2026-09-30T02:00:00Z"), to: at("2026-10-02T02:00:00Z"), timeZone: vn),
                       ["2026-09-30", "2026-10-01", "2026-10-02"])
    }

    // MARK: Conflict per day

    func testBookedOutDaysAndOrderNumber() {
        let result = conflict(requested: 1, stock: 2, bookings: [
            booking("ORD-1-482113", 2, "2026-10-03T02:00:00Z", "2026-10-05T10:00:00Z"),
        ])
        XCTAssertEqual(result, CartScheduleConflict(productId: 7, productName: "Vest đen slim fit", shortBy: 1,
                                                    dayKeys: ["2026-10-03", "2026-10-04", "2026-10-05"],
                                                    orderNumbers: ["482113"]))
    }

    func testPeakDayDecidesNotTheSumOfAllBookings() {
        // Stock 3: one unit out 03–04/10, two units out 04–05/10 → only 04/10 holds all three
        let result = conflict(requested: 1, stock: 3, bookings: [
            booking("ORD-1-0001", 1, "2026-10-03T02:00:00Z", "2026-10-04T02:00:00Z"),
            booking("ORD-1-0002", 2, "2026-10-04T02:00:00Z", "2026-10-05T02:00:00Z"),
        ])
        XCTAssertEqual(result?.dayKeys, ["2026-10-04"])
        XCTAssertEqual(result?.shortBy, 1)
        XCTAssertEqual(result?.orderNumbers, ["0001", "0002"])
    }

    func testShortByIsTheWorstDay() {
        let result = conflict(requested: 3, stock: 3, bookings: [
            booking("ORD-1-0001", 1, "2026-10-03T02:00:00Z", "2026-10-03T05:00:00Z"),
            booking("ORD-1-0002", 2, "2026-10-04T02:00:00Z", "2026-10-04T05:00:00Z"),
        ])
        XCTAssertEqual(result?.dayKeys, ["2026-10-03", "2026-10-04"])
        XCTAssertEqual(result?.shortBy, 2)
    }

    func testBookingOutsideTheShortDaysIsNotListed() {
        // 0009 is out on 02/10 only, which still has a free unit; 0010 fills 05/10
        let result = conflict(requested: 1, stock: 1, bookings: [
            booking("ORD-1-0009", 0, "2026-10-02T02:00:00Z", "2026-10-02T05:00:00Z"),
            booking("ORD-1-0010", 1, "2026-10-05T02:00:00Z", "2026-10-05T05:00:00Z"),
        ])
        XCTAssertEqual(result?.dayKeys, ["2026-10-05"])
        XCTAssertEqual(result?.orderNumbers, ["0010"])
    }

    func testReturnBeforeVietnamMidnightDoesNotTouchTheNextDay() {
        let pickup = at("2026-10-02T17:00:00Z") // 00:00 on 03/10 in Vietnam
        let back = at("2026-10-03T10:00:00Z")
        let early = ScheduleConflictLogic.conflict(productId: 1, productName: "A", requested: 1, stock: 1, available: nil,
                                                   bookings: [booking("ORD-1-1", 1, "2026-10-02T02:00:00Z", "2026-10-02T16:59:59Z")],
                                                   pickup: pickup, returnDate: back, timeZone: vn)
        XCTAssertNil(early)
        let late = ScheduleConflictLogic.conflict(productId: 1, productName: "A", requested: 1, stock: 1, available: nil,
                                                  bookings: [booking("ORD-1-1", 1, "2026-10-02T02:00:00Z", "2026-10-02T17:00:00Z")],
                                                  pickup: pickup, returnDate: back, timeZone: vn)
        XCTAssertEqual(late?.dayKeys, ["2026-10-03"])
    }

    func testEnoughStockOrNothingRequestedIsNoConflict() {
        let held = [booking("ORD-1-482113", 2, "2026-10-03T02:00:00Z", "2026-10-05T10:00:00Z")]
        XCTAssertNil(conflict(requested: 1, stock: 3, bookings: held))
        XCTAssertNil(conflict(requested: 0, stock: 0, bookings: held))
    }

    func testWithoutStockTheAvailableFigureDecidesForTheWholeWindow() {
        let result = conflict(requested: 2, stock: nil, available: 0, bookings: [])
        XCTAssertEqual(result?.dayKeys, ["2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06"])
        XCTAssertEqual(result?.shortBy, 2)
        XCTAssertEqual(result?.orderNumbers, [])
        XCTAssertNil(conflict(requested: 2, stock: nil, available: 2, bookings: []))
        XCTAssertNil(conflict(requested: 2, stock: nil, available: nil, bookings: []))
    }

    func testDuplicateAndBlankOrderNumbersAreDropped() {
        let result = conflict(requested: 1, stock: 2, bookings: [
            booking("ORD-1-482113", 1, "2026-10-03T02:00:00Z", "2026-10-04T02:00:00Z"),
            booking("ORD-1-482113", 1, "2026-10-03T02:00:00Z", "2026-10-04T02:00:00Z"),
            booking(" ", 1, "2026-10-03T02:00:00Z", "2026-10-04T02:00:00Z"),
            booking(nil, 1, "2026-10-03T02:00:00Z", "2026-10-04T02:00:00Z"),
        ])
        XCTAssertEqual(result?.orderNumbers, ["482113"])
    }

    // MARK: From the batch availability call

    private func batch(_ json: String) throws -> BatchProductAvailabilityResult {
        try JSONDecoder().decode(BatchProductAvailabilityResult.self, from: Data(json.utf8))
    }

    func testConflictFromBatchResultUsesOutletStockAndConflicts() throws {
        let result = try batch("""
        {"productId": 7, "productName": "Vest đen slim fit", "totalStock": 1, "totalAvailableStock": 0,
         "requestedQuantity": 1, "isAvailable": false, "stockAvailable": true, "hasNoConflicts": false,
         "availabilityByOutlet": [{"outletId": 1, "outletName": "Chi nhánh chính", "stock": 1, "available": 1,
           "effectivelyAvailable": 0, "canFulfillRequest": false,
           "conflicts": [{"orderNumber": "ORD-1-482113", "pickupDate": "2026-10-03T02:00:00.000Z",
                          "returnDate": "2026-10-05T10:00:00Z", "quantity": 1, "conflictDuration": 26.57}]}]}
        """)
        let conflict = ScheduleConflictLogic.conflict(from: result, productName: nil, pickup: at(windowPickup),
                                                      returnDate: at(windowReturn), timeZone: vn)
        XCTAssertEqual(conflict, CartScheduleConflict(productId: 7, productName: "Vest đen slim fit", shortBy: 1,
                                                      dayKeys: ["2026-10-03", "2026-10-04", "2026-10-05"],
                                                      orderNumbers: ["482113"]))
        XCTAssertEqual(ScheduleConflictLogic.conflict(from: result, productName: "Vest (cart)", pickup: at(windowPickup),
                                                      returnDate: at(windowReturn), timeZone: vn)?.productName, "Vest (cart)")
    }

    func testAvailableBatchResultIsNoConflict() throws {
        let result = try batch("""
        {"productId": 7, "requestedQuantity": 1, "isAvailable": true, "stockAvailable": true, "hasNoConflicts": true,
         "availabilityByOutlet": [{"outletId": 1, "stock": 2, "effectivelyAvailable": 1, "canFulfillRequest": true, "conflicts": []}]}
        """)
        XCTAssertNil(ScheduleConflictLogic.conflict(from: result, productName: "Vest", pickup: at(windowPickup),
                                                    returnDate: at(windowReturn), timeZone: vn))
    }

    func testBatchConflictWithUnreadableDatesFallsBackToAvailable() throws {
        let result = try batch("""
        {"productId": 7, "requestedQuantity": 2, "isAvailable": false, "stockAvailable": false, "hasNoConflicts": false,
         "totalAvailableStock": 1,
         "availabilityByOutlet": [{"outletId": 1, "canFulfillRequest": false,
           "conflicts": [{"orderNumber": "ORD-1-9", "pickupDate": "not a date", "returnDate": null, "quantity": 1}]}]}
        """)
        let conflict = ScheduleConflictLogic.conflict(from: result, productName: "Vest", pickup: at(windowPickup),
                                                      returnDate: at(windowReturn), timeZone: vn)
        XCTAssertEqual(conflict?.shortBy, 1)
        XCTAssertEqual(conflict?.dayKeys.count, 5)
        XCTAssertEqual(conflict?.orderNumbers, [])
    }

    // MARK: Texts

    func testDayRangeTexts() {
        XCTAssertEqual(ScheduleConflictLogic.dayRange(["2026-10-03", "2026-10-04", "2026-10-05"]), "03–05/10")
        XCTAssertEqual(ScheduleConflictLogic.dayRange(["2026-10-03"]), "03/10")
        XCTAssertEqual(ScheduleConflictLogic.dayRange(["2026-09-30", "2026-10-01", "2026-10-02"]), "30/09–02/10")
        XCTAssertEqual(ScheduleConflictLogic.dayRange([]), "")
    }

    func testTagAndWarningTexts() {
        let withOrder = CartScheduleConflict(productId: 1, productName: "Vest", shortBy: 1,
                                             dayKeys: ["2026-10-03", "2026-10-05"], orderNumbers: ["482113"])
        XCTAssertEqual(ScheduleConflictLogic.tagText(withOrder),
                       String(format: "cart.overlap.tag".localized(), "03–05/10", "#482113"))
        XCTAssertEqual(ScheduleConflictLogic.warningLine(withOrder),
                       String(format: "cart.overlap.line".localized(), "Vest", 1, "03–05/10", "#482113"))

        let noOrder = CartScheduleConflict(productId: 1, productName: "Vest", shortBy: 2,
                                           dayKeys: ["2026-10-03"], orderNumbers: [])
        XCTAssertEqual(ScheduleConflictLogic.tagText(noOrder),
                       String(format: "cart.overlap.tag.noOrders".localized(), "03/10"))
        XCTAssertEqual(ScheduleConflictLogic.warningLine(noOrder),
                       String(format: "cart.overlap.line.noOrders".localized(), "Vest", 2, "03/10"))
        XCTAssertEqual(ScheduleConflictLogic.orderList(["482113", "0057"]), "#482113, #0057")
    }

    // MARK: CTA and setting

    func testCtaState() {
        let one = [CartScheduleConflict(productId: 1, productName: "A", shortBy: 1, dayKeys: ["2026-10-03"], orderNumbers: [])]
        XCTAssertEqual(ScheduleConflictLogic.ctaState(isRent: true, conflicts: [], allowOverlap: false), .normal)
        XCTAssertEqual(ScheduleConflictLogic.ctaState(isRent: false, conflicts: one, allowOverlap: false), .normal)
        XCTAssertEqual(ScheduleConflictLogic.ctaState(isRent: true, conflicts: one, allowOverlap: true), .warnBeforeCreate)
        XCTAssertEqual(ScheduleConflictLogic.ctaState(isRent: true, conflicts: one, allowOverlap: false), .blocked)
    }

    private func merchant(_ extra: String) throws -> Merchant {
        try JSONDecoder().decode(Merchant.self, from: Data("{\"id\": 1, \"name\": \"Shop\"\(extra)}".utf8))
    }

    func testSettingMissingMeansAllowedLikeBefore() throws {
        XCTAssertTrue(ScheduleConflictLogic.allowsOverlap(nil))
        let old = try merchant("")
        XCTAssertNil(old.allowOverlappingOrders)
        XCTAssertTrue(ScheduleConflictLogic.allowsOverlap(old))
        XCTAssertTrue(ScheduleConflictLogic.allowsOverlap(try merchant(", \"allowOverlappingOrders\": null")))
    }

    func testSettingDecodedFromMerchant() throws {
        XCTAssertFalse(ScheduleConflictLogic.allowsOverlap(try merchant(", \"allowOverlappingOrders\": false")))
        XCTAssertTrue(ScheduleConflictLogic.allowsOverlap(try merchant(", \"allowOverlappingOrders\": true")))
    }

    func testMerchantRoundTripKeepsSetting() throws {
        let decoded = try merchant(", \"allowOverlappingOrders\": false")
        let again = try JSONDecoder().decode(Merchant.self, from: try JSONEncoder().encode(decoded))
        XCTAssertEqual(again.allowOverlappingOrders, false)
    }

    func testOnlyTheMerchantEditsTheSetting() {
        XCTAssertTrue(ScheduleConflictLogic.canEditSetting(role: .merchant))
        for role in [Role.admin, .outletAdmin, .outletStaff] {
            XCTAssertFalse(ScheduleConflictLogic.canEditSetting(role: role))
        }
        XCTAssertFalse(ScheduleConflictLogic.canEditSetting(role: nil))
    }

    // MARK: 409 code

    func testScheduleConflictErrorCode() throws {
        XCTAssertEqual(APIErrorCode(from: "ORDER_SCHEDULE_CONFLICT"), .orderScheduleConflict)
        XCTAssertEqual(APIErrorCode(from: "order_schedule_conflict"), .orderScheduleConflict)
        XCTAssertEqual(APIErrorCode.orderScheduleConflict.httpStatusCode, 409)

        let body = """
        {"success": false, "code": "ORDER_SCHEDULE_CONFLICT", "message": "Items are booked out",
         "data": {"conflicts": [{"productId": 7, "orderNumber": "ORD-1-482113"}]}}
        """
        let response = try JSONDecoder().decode(APIErrorResponse.self, from: Data(body.utf8))
        XCTAssertEqual(response.errorCode, .orderScheduleConflict)
        XCTAssertEqual(response.localizedMessage, APIErrorCode.orderScheduleConflict.defaultMessage)
        XCTAssertEqual(response.toNSError(httpStatusCode: 409).code, 409)
    }
}
