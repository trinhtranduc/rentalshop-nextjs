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
}
