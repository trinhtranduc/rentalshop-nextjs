import XCTest
@testable import POS_ADBD

/// #372 — order detail: allowed actions, hand-over and return money, notes payload, status errors
final class OrderDetailLogicTests: XCTestCase {

    // MARK: Actions per type and status

    private func actions(_ type: OrderType, _ status: OrderStatus, manage: Bool = true,
                         deleteCancelled: Bool = true) -> OrderDetailActions {
        OrderDetailLogic.actions(orderType: type, status: status, canManageOrders: manage, canDeleteCancelled: deleteCancelled)
    }

    func testRentReservedHandsOverAndCanEditAndCancel() {
        let result = actions(.rent, .reserved)
        XCTAssertEqual(result.primary, .handOver)
        XCTAssertTrue(result.canEdit)
        XCTAssertTrue(result.canCancel)
        XCTAssertFalse(result.canDelete)
    }

    func testRentPickupedTakesBackAndCanCancelButNotEdit() {
        let result = actions(.rent, .pickuped)
        XCTAssertEqual(result.primary, .takeReturn)
        XCTAssertFalse(result.canEdit)
        XCTAssertTrue(result.canCancel)
    }

    func testRentReturnedAndCancelledHaveNoPrimaryAction() {
        for status in [OrderStatus.returned, .cancelled] {
            let result = actions(.rent, status)
            XCTAssertEqual(result.primary, .none)
            XCTAssertFalse(result.canEdit)
            XCTAssertFalse(result.canCancel)
        }
        XCTAssertTrue(actions(.rent, .cancelled).canDelete)
        XCTAssertFalse(actions(.rent, .cancelled, deleteCancelled: false).canDelete)
    }

    func testSaleCompletedCanCancelAndEditButHasNoPrimary() {
        let result = actions(.sale, .completed)
        XCTAssertEqual(result.primary, .none)
        XCTAssertTrue(result.canCancel)
        XCTAssertTrue(result.canEdit)
        XCTAssertFalse(actions(.sale, .cancelled).canCancel)
    }

    func testWithoutManagePermissionNothingChangesTheOrder() {
        for status in [OrderStatus.reserved, .pickuped] {
            let result = actions(.rent, status, manage: false)
            XCTAssertFalse(result.canEdit)
            XCTAssertFalse(result.canCancel)
        }
        // Hand-over and return stay available to staff
        XCTAssertEqual(actions(.rent, .reserved, manage: false).primary, .handOver)
        XCTAssertFalse(actions(.sale, .completed, manage: false).canCancel)
    }

    // MARK: Money (apps/api/lib/order-balance.ts)

    private let pickupPaid = OrderPaymentLine(amount: 200_000, status: "COMPLETED", notes: "PICKUP")
    private let pendingPickup = OrderPaymentLine(amount: 999_000, status: "PENDING", notes: "PICKUP")
    private let returnPaid = OrderPaymentLine(amount: 50_000, status: "COMPLETED", notes: "RETURN_ADJUSTMENT")

    func testHandOverCollectsTotalMinusDepositPlusCollateralMinusPickupPayments() {
        let money = OrderDetailLogic.handOver(total: 1_000_000, deposit: 300_000, securityDeposit: 500_000,
                                              payments: [pickupPaid, pendingPickup, returnPaid])
        XCTAssertEqual(money.paidBefore, 200_000)
        XCTAssertEqual(money.due, 1_000_000)
        XCTAssertEqual(OrderDetailLogic.handOver(total: 100_000, deposit: 300_000, securityDeposit: 0, payments: []).due, 0)
    }

    func testReturnGivesBackCollateralMinusFees() {
        let money = OrderDetailLogic.returnMoney(lateFee: 150_000, damageFee: 50_000, securityDeposit: 500_000, payments: [])
        XCTAssertEqual(money.fees, 200_000)
        XCTAssertEqual(money.refund, 300_000)
        XCTAssertEqual(money.collect, 0)
    }

    func testReturnCollectsWhenFeesExceedCollateralAndCountsSettledPayments() {
        let money = OrderDetailLogic.returnMoney(lateFee: 400_000, damageFee: 200_000, securityDeposit: 500_000,
                                                 payments: [returnPaid, pickupPaid])
        XCTAssertEqual(money.settledBefore, 50_000)
        XCTAssertEqual(money.collect, 50_000)
        XCTAssertEqual(money.refund, 0)
    }

    func testBalanceMatchesApiRulePerStatus() {
        func balance(_ type: OrderType, _ status: OrderStatus) -> (Double, Double) {
            let result = OrderDetailLogic.balance(orderType: type, status: status, total: 1_000_000, deposit: 300_000,
                                                  securityDeposit: 500_000, lateFee: 100_000, damageFee: 0,
                                                  payments: [OrderPaymentLine(amount: 400_000, status: "COMPLETED", notes: "SALE")])
            return (result.amountDue, result.refundDue)
        }
        XCTAssertTrue(balance(.rent, .reserved) == (1_200_000, 0))
        XCTAssertTrue(balance(.rent, .pickuped) == (0, 400_000))
        XCTAssertTrue(balance(.rent, .returned) == (0, 0))
        XCTAssertTrue(balance(.sale, .completed) == (600_000, 0))
    }

    // MARK: Notes payload

    func testNotesUnchangedPhotosSendOnlyNewFiles() {
        let plan = OrderDetailLogic.notesPlan(original: ["a", "b"], kept: ["a", "b"], newCount: 2)
        XCTAssertEqual(plan, NotesSavePlan(keptURLs: nil, newCount: 2))
    }

    func testNotesRemovedPhotoSendsKeptUrls() {
        let plan = OrderDetailLogic.notesPlan(original: ["a", "b", "c"], kept: ["a", "c"], newCount: 1)
        XCTAssertEqual(plan, NotesSavePlan(keptURLs: ["a", "c"], newCount: 1))
        XCTAssertEqual(OrderDetailLogic.notesPlan(original: ["a"], kept: [], newCount: 0), NotesSavePlan(keptURLs: [], newCount: 0))
    }

    func testNotesAllowAtMostFivePhotos() {
        XCTAssertEqual(OrderDetailLogic.maxNotePhotos, 5)
        XCTAssertNotNil(OrderDetailLogic.notesPlan(original: ["a", "b"], kept: ["a", "b"], newCount: 3))
        XCTAssertNil(OrderDetailLogic.notesPlan(original: ["a", "b"], kept: ["a", "b"], newCount: 4))
    }

    // MARK: Status change errors

    func testInvalidOrderStatusShowsMessageAndReloads() {
        // What OrderService builds from {"success":false,"code":"INVALID_ORDER_STATUS"}
        let error = APIErrorResponse(success: false, code: "INVALID_ORDER_STATUS", message: "This status change is not allowed for this order.", error: nil).toNSError()
        XCTAssertTrue((400..<500).contains(error.code))
        let outcome = OrderDetailLogic.statusErrorOutcome(error)
        XCTAssertTrue(outcome.reload)
        XCTAssertFalse(outcome.message.isEmpty)
    }

    func testNetworkErrorDoesNotReload() {
        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorNotConnectedToInternet,
                            userInfo: [NSLocalizedDescriptionKey: "offline"])
        XCTAssertFalse(OrderDetailLogic.statusErrorOutcome(error).reload)
        let local = NSError(domain: "OrderViewModel", code: -1, userInfo: [NSLocalizedDescriptionKey: "collateral"])
        XCTAssertFalse(OrderDetailLogic.statusErrorOutcome(local).reload)
    }

    // MARK: Days

    func testRentalDaysAreInclusiveCivilDays() {
        let vietnam = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
        let iso = ISO8601DateFormatter()
        // 03/10 07:00 → 05/10 23:30 Vietnam time
        let from = iso.date(from: "2026-10-03T00:00:00Z")!
        let to = iso.date(from: "2026-10-05T16:30:00Z")!
        XCTAssertEqual(OrderDetailLogic.rentalDays(pickup: from, return: to, timeZone: vietnam), 3)
        XCTAssertEqual(OrderDetailLogic.rentalDays(pickup: from, return: from, timeZone: vietnam), 1)
        XCTAssertEqual(OrderDetailLogic.dayMonth(to, timeZone: vietnam), "05/10")
        XCTAssertEqual(OrderDetailLogic.dayMonth(to, timeZone: TimeZone(identifier: "UTC")!), "05/10")
        XCTAssertEqual(OrderDetailLogic.dayMonth(iso.date(from: "2026-10-05T17:30:00Z")!, timeZone: vietnam), "06/10")
    }

    // MARK: Created time (#482)

    func testCreatedStampShowsShopTimeAndYearOnlyWhenNotThisYear() {
        let vietnam = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
        let iso = ISO8601DateFormatter()
        let now = iso.date(from: "2026-10-05T03:00:00Z")!
        XCTAssertEqual(OrderDetailLogic.createdStamp(iso.date(from: "2026-09-28T07:32:00Z")!, now: now, timeZone: vietnam), "14:32 28/09")
        XCTAssertEqual(OrderDetailLogic.createdStamp(iso.date(from: "2025-12-28T07:32:00Z")!, now: now, timeZone: vietnam), "14:32 28/12/25")
        // Vietnam midnight boundary: 16:59:59Z is still 28/09, 17:00Z is 29/09 00:00
        XCTAssertEqual(OrderDetailLogic.createdStamp(iso.date(from: "2026-09-28T16:59:59Z")!, now: now, timeZone: vietnam), "23:59 28/09")
        XCTAssertEqual(OrderDetailLogic.createdStamp(iso.date(from: "2026-09-28T17:00:00Z")!, now: now, timeZone: vietnam), "00:00 29/09")
        // New year in Vietnam while UTC is still in the old year
        let newYear = iso.date(from: "2025-12-31T17:30:00Z")!
        XCTAssertEqual(OrderDetailLogic.createdStamp(newYear, now: iso.date(from: "2026-01-02T03:00:00Z")!, timeZone: vietnam), "00:30 01/01")
        // Default zone is the shop zone, whatever the device zone
        XCTAssertEqual(OrderDetailLogic.createdStamp(iso.date(from: "2026-09-28T07:32:00Z")!, now: now), "14:32 28/09")
    }

    // MARK: Sẵn sàng giao (#470)

    func testReadyToDeliverShowsOnlyForReservedRentals() {
        XCTAssertTrue(OrderDetailLogic.showsReadyToDeliver(orderType: .rent, status: .reserved, canUpdateOrders: true))
        for status in [OrderStatus.pickuped, .returned, .cancelled, .completed] {
            XCTAssertFalse(OrderDetailLogic.showsReadyToDeliver(orderType: .rent, status: status, canUpdateOrders: true), "\(status)")
        }
        for status in [OrderStatus.reserved, .completed, .cancelled] {
            XCTAssertFalse(OrderDetailLogic.showsReadyToDeliver(orderType: .sale, status: status, canUpdateOrders: true), "\(status)")
        }
        XCTAssertFalse(OrderDetailLogic.showsReadyToDeliver(orderType: .rent, status: .reserved, canUpdateOrders: false))
    }

    /// Same body as the old detail (PreviewViewController → OrderViewModel.updateReadyToDeliverStatus)
    func testReadyToDeliverToggleSendsOnlyTheFlag() throws {
        for value in [true, false] {
            let data = try JSONEncoder().encode(UpdateOrderRequest.updateReadyToDeliver(value))
            let json = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
            XCTAssertEqual(json.count, 1, "\(json)")
            XCTAssertEqual(json["isReadyToDeliver"] as? Bool, value)
        }
    }

    // MARK: Header (#643)

    private let vn = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
    private func at(_ text: String) -> Date { ISO8601DateFormatter().date(from: text)! }

    func testTitleNamesTheOrderType() {
        XCTAssertEqual(OrderDetailLogic.titleKey(orderType: .rent), "order.header.title.rent")
        XCTAssertEqual(OrderDetailLogic.titleKey(orderType: .sale), "order.header.title.sale")
    }

    func testCustomerWithoutNameIsWalkInAndWithoutPhoneHasNoCall() {
        XCTAssertEqual(OrderDetailLogic.headerCustomer(name: "Jessica Lopez", phone: "+1-555 1011"),
                       OrderHeaderCustomer(name: "Jessica Lopez", phone: "+1-5551011"))
        XCTAssertEqual(OrderDetailLogic.headerCustomer(name: "  ", phone: nil), OrderHeaderCustomer(name: nil, phone: nil))
        XCTAssertEqual(OrderDetailLogic.headerCustomer(name: "N/A", phone: ""), OrderHeaderCustomer(name: nil, phone: nil))
        XCTAssertNil(OrderDetailLogic.headerCustomer(name: "An", phone: "  ").phone)
    }

    func testStepsShowForOpenAndReturnedRentalsOnly() {
        for status in [OrderStatus.reserved, .pickuped, .returned] {
            XCTAssertTrue(OrderDetailLogic.showsSteps(orderType: .rent, status: status), "\(status)")
        }
        XCTAssertFalse(OrderDetailLogic.showsSteps(orderType: .rent, status: .cancelled))
        for status in [OrderStatus.completed, .reserved, .cancelled] {
            XCTAssertFalse(OrderDetailLogic.showsSteps(orderType: .sale, status: status), "\(status)")
        }
    }

    func testStepLabelsTurnPastTenseWhenDone() {
        let created = at("2026-09-14T07:33:00Z"), pickupPlan = at("2026-10-01T02:00:00Z")
        let picked = at("2026-10-01T03:00:00Z"), returnPlan = at("2026-10-07T02:00:00Z")
        let reserved = OrderDetailLogic.headerSteps(status: .reserved, createdAt: created, pickupPlanAt: pickupPlan,
                                                    pickedUpAt: nil, returnPlanAt: returnPlan, returnedAt: nil)
        XCTAssertEqual(reserved.map(\.labelKey), ["order.header.step.booked", "order.header.step.handOver", "order.header.step.return"])
        XCTAssertEqual(reserved.map(\.done), [true, false, false])
        XCTAssertEqual(reserved.map(\.date), [created, pickupPlan, returnPlan])

        let pickuped = OrderDetailLogic.headerSteps(status: .pickuped, createdAt: created, pickupPlanAt: pickupPlan,
                                                    pickedUpAt: picked, returnPlanAt: returnPlan, returnedAt: nil)
        XCTAssertEqual(pickuped.map(\.labelKey), ["order.header.step.booked", "order.header.step.handedOver", "order.header.step.return"])
        XCTAssertEqual(pickuped[1].date, picked)

        let returnedAt = at("2026-10-06T10:00:00Z")
        let returned = OrderDetailLogic.headerSteps(status: .returned, createdAt: created, pickupPlanAt: pickupPlan,
                                                    pickedUpAt: picked, returnPlanAt: returnPlan, returnedAt: returnedAt)
        XCTAssertEqual(returned.map(\.labelKey), ["order.header.step.booked", "order.header.step.handedOver", "order.header.step.returned"])
        XCTAssertEqual(returned.map(\.done), [true, true, true])
        XCTAssertEqual(returned[2].date, returnedAt)
    }

    func testStepDayLabelsUseVietnamDayWithWeekdayAndNoTime() {
        // 2026-09-30 18:00 UTC is Thursday 01/10 01:00 in Vietnam
        let label = DayFormatter.short(at("2026-09-30T18:00:00Z"), timeZone: vn, locale: Locale(identifier: "vi_VN"))
        XCTAssertEqual(label, "T5 01/10")
    }

    private func remainder(_ status: OrderStatus, now: String, pickup: Date? = nil, ret: Date? = nil) -> OrderHeaderRemainder {
        OrderDetailLogic.headerRemainder(status: status, pickupPlanAt: pickup, returnPlanAt: ret, now: at(now), timeZone: vn)
    }

    func testReservedCountsToTheHandOverVietnamDay() {
        let pickup = at("2026-10-01T02:00:00Z") // 01/10 09:00 in Vietnam
        let ret = at("2026-10-07T02:00:00Z")
        // 29/09 23:30 in Vietnam: two days, although less than 48 hours
        XCTAssertEqual(remainder(.reserved, now: "2026-09-29T16:30:00Z", pickup: pickup, ret: ret), .handOverIn(2))
        // 30/09 18:00 UTC is already 01/10 in Vietnam
        XCTAssertEqual(remainder(.reserved, now: "2026-09-30T18:00:00Z", pickup: pickup, ret: ret), .handOverToday)
        // Pickup day passed: "quá ngày lấy", never a late return
        XCTAssertEqual(remainder(.reserved, now: "2026-10-03T03:00:00Z", pickup: pickup, ret: ret), .pickupOverdue(2))
        XCTAssertEqual(remainder(.reserved, now: "2026-10-03T03:00:00Z", ret: ret), .none)
    }

    func testPickedUpCountsToTheReturnDayAndLateSaysNothing() {
        let ret = at("2026-10-07T02:00:00Z") // 07/10 09:00 in Vietnam
        XCTAssertEqual(remainder(.pickuped, now: "2026-10-05T16:30:00Z", ret: ret), .returnIn(2))
        XCTAssertEqual(remainder(.pickuped, now: "2026-10-06T18:00:00Z", ret: ret), .returnToday)
        XCTAssertEqual(remainder(.pickuped, now: "2026-10-07T16:59:00Z", ret: ret), .returnToday)
        // Late return: the red banner says it; the box keeps only the day count
        XCTAssertEqual(remainder(.pickuped, now: "2026-10-09T03:00:00Z", ret: ret), .none)
        XCTAssertEqual(remainder(.pickuped, now: "2026-10-05T03:00:00Z"), .none)
    }

    func testReturnedAndCancelledRemainders() {
        let ret = at("2026-10-07T02:00:00Z")
        XCTAssertEqual(remainder(.returned, now: "2026-10-09T03:00:00Z", ret: ret), .returned)
        XCTAssertEqual(remainder(.cancelled, now: "2026-10-05T03:00:00Z", ret: ret), .none)
    }

    func testSummaryJoinsDaysAndRemainder() {
        let days7 = PluralText.format("%d days", count: 7, 7)
        XCTAssertEqual(OrderDetailLogic.headerSummary(days: 7, remainder: .returnIn(2)),
                       days7 + " · " + PluralText.format("order.header.returnIn", count: 2, 2))
        XCTAssertEqual(OrderDetailLogic.headerSummary(days: 7, remainder: .returnToday),
                       days7 + " · " + "order.header.returnToday".localized())
        XCTAssertEqual(OrderDetailLogic.headerSummary(days: 7, remainder: .handOverIn(1)),
                       days7 + " · " + PluralText.format("order.header.handOverIn", count: 1, 1))
        XCTAssertEqual(OrderDetailLogic.headerSummary(days: 7, remainder: .handOverToday),
                       days7 + " · " + "order.header.handOverToday".localized())
        XCTAssertEqual(OrderDetailLogic.headerSummary(days: 7, remainder: .pickupOverdue(3)),
                       days7 + " · " + PluralText.format("order.header.pickupOverdue", count: 3, 3))
        XCTAssertEqual(OrderDetailLogic.headerSummary(days: 7, remainder: .returned),
                       days7 + " · " + "order.header.returned".localized())
        XCTAssertEqual(OrderDetailLogic.headerSummary(days: 7, remainder: .none), days7)
        XCTAssertNil(OrderDetailLogic.headerSummary(days: nil, remainder: .none))
        // Every key resolves in the bundle (no raw key on screen)
        for key in ["order.header.returnIn", "order.header.returnToday", "order.header.returned",
                    "order.header.handOverIn", "order.header.handOverToday", "order.header.pickupOverdue",
                    "order.header.title.rent", "order.header.title.sale", "order.header.walkIn", "order.header.call",
                    "order.header.step.booked", "order.header.step.handOver", "order.header.step.handedOver",
                    "order.header.step.return", "order.header.step.returned"] {
            XCTAssertNotEqual(key.localized(), key)
        }
    }
}

/// #700 — Tạo đơn prints only when a bill printer was saved
final class CreatedOrderAutoPrintTests: XCTestCase {
    func testPrintsOnlyWithASavedPrinter() {
        XCTAssertFalse(CreatedOrderAutoPrint.shouldPrint(savedPrinterIP: nil), "never set up: the 192.168.1.199 fallback is not a printer")
        XCTAssertFalse(CreatedOrderAutoPrint.shouldPrint(savedPrinterIP: "  "))
        XCTAssertTrue(CreatedOrderAutoPrint.shouldPrint(savedPrinterIP: "192.168.1.50"))
    }
}

/// #697 — an order whose creator was deleted (`createdById` SetNull) still opens on iOS
final class OrderDetailDeletedCreatorTests: XCTestCase {
    /// GET /api/orders/{id} for a local-seed rental after its creator was deleted (createdById/createdBy null)
    private let payload = #"""
{"success":true,"data":{"id":132,"orderNumber":"968112","orderType":"RENT","status":"PICKUPED","totalAmount":700000,"depositAmount":0,"securityDeposit":0,"damageFee":0,"lateFee":0,"discountType":null,"discountValue":0,"discountAmount":0,"pickupPlanAt":"2026-10-07T01:00:00.000Z","returnPlanAt":"2026-10-10T05:00:00.000Z","pickedUpAt":null,"returnedAt":null,"rentalDuration":null,"isReadyToDeliver":false,"collateralType":null,"collateralDetails":null,"notes":"e2e-681","notesImages":null,"pickupNotes":null,"pickupNotesImages":null,"returnNotes":null,"returnNotesImages":null,"damageNotes":null,"damageNotesImages":null,"createdAt":"2026-10-08T22:24:51.027Z","updatedAt":"2026-10-08T22:24:51.027Z","outletId":1,"customerId":11,"createdById":null,"customer":{"id":11,"firstName":"William","lastName":"Hernandez","phone":"+1-555-1010","email":"william.hernandez11@example.com","address":"Address 11 for Rental Shop Demo","city":"Example City","state":"Example State","zipCode":"12345","country":"USA","dateOfBirth":null,"notes":null,"createdAt":"2026-10-08T15:22:24.976Z","updatedAt":"2026-10-08T15:22:24.976Z"},"outlet":{"id":1,"name":"Rental Shop Demo - Main Branch","address":"123 Main Street","phone":"+1-555-0100","city":"New York","state":"NY","zipCode":"10001","country":"United States","isActive":true,"printNote":null,"printBankQr":false,"merchant":{"id":1,"name":"Rental Shop Demo","email":"merchant1@example.com","phone":"+1-555-0100","address":"123 Main Street","city":"New York","state":"NY","zipCode":"10001","country":"United States","businessType":"EQUIPMENT","pricingType":"DAILY","taxId":"12-3456789","currency":"USD"}},"createdBy":null,"orderItems":[{"id":265,"productId":28,"productName":"Product 28 - Art Supplies","productBarcode":"BAR000028","productImages":[],"quantity":7,"unitPrice":100000,"totalPrice":700000,"deposit":0,"notes":null,"rentalDays":null,"pricingType":null,"pricingOptionId":null,"product":{"id":28,"name":"Product 28 - Art Supplies","barcode":"BAR000028","images":[],"rentPrice":53,"deposit":33}}],"payments":[],"itemCount":1,"paymentCount":0,"totalPaid":0,"timeline":[]},"code":"ORDER_RETRIEVED_SUCCESS","message":"Order retrieved successfully"}
"""#

    func testOrderWithDeletedCreatorDecodes() throws {
        let response = try JSONDecoder.shared.decode(APIResponse<OrderDetail>.self, from: Data(payload.utf8))
        let detail = try XCTUnwrap(response.data)
        XCTAssertNil(detail.createdById)
        XCTAssertNil(detail.createdBy)
        let order = Order.from(detail: detail)
        XCTAssertEqual(order.createdById, 0, "list model keeps 0 for no creator, as its own decoder does")
        XCTAssertEqual(order.createdByName, "")
    }
}
