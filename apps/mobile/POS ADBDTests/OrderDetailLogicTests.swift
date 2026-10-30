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
        XCTAssertEqual(OrderDetailLogic.dayMonth(to, timeZone: vietnam), "05/10/26")
        XCTAssertEqual(OrderDetailLogic.dayMonth(to, timeZone: TimeZone(identifier: "UTC")!), "05/10/26")
        XCTAssertEqual(OrderDetailLogic.dayMonth(iso.date(from: "2026-10-05T17:30:00Z")!, timeZone: vietnam), "06/10/26")
    }

    // MARK: Created time (#482)

    func testCreatedStampShowsShopTimeAndYearOnlyWhenNotThisYear() {
        let vietnam = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
        let iso = ISO8601DateFormatter()
        let now = iso.date(from: "2026-10-05T03:00:00Z")!
        XCTAssertEqual(OrderDetailLogic.createdStamp(iso.date(from: "2026-09-28T07:32:00Z")!, now: now, timeZone: vietnam), "28/09/26 14:32")
        XCTAssertEqual(OrderDetailLogic.createdStamp(iso.date(from: "2025-12-28T07:32:00Z")!, now: now, timeZone: vietnam), "28/12/25 14:32")
        // Vietnam midnight boundary: 16:59:59Z is still 28/09, 17:00Z is 29/09 00:00
        XCTAssertEqual(OrderDetailLogic.createdStamp(iso.date(from: "2026-09-28T16:59:59Z")!, now: now, timeZone: vietnam), "28/09/26 23:59")
        XCTAssertEqual(OrderDetailLogic.createdStamp(iso.date(from: "2026-09-28T17:00:00Z")!, now: now, timeZone: vietnam), "29/09/26 00:00")
        // New year in Vietnam while UTC is still in the old year
        let newYear = iso.date(from: "2025-12-31T17:30:00Z")!
        XCTAssertEqual(OrderDetailLogic.createdStamp(newYear, now: iso.date(from: "2026-01-02T03:00:00Z")!, timeZone: vietnam), "01/01/26 00:30")
        // Default zone is the shop zone, whatever the device zone
        XCTAssertEqual(OrderDetailLogic.createdStamp(iso.date(from: "2026-09-28T07:32:00Z")!, now: now), "28/09/26 14:32")
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
        XCTAssertEqual(label, "01/10/26")
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
        // #891 (owner): no "trả sau N ngày" countdown either
        XCTAssertEqual(OrderDetailLogic.headerSummary(days: 7, remainder: .returnIn(2)), days7)
        XCTAssertEqual(OrderDetailLogic.headerSummary(days: 7, remainder: .returnToday),
                       days7 + " · " + "order.header.returnToday".localized())
        // #891 (owner): no "lấy sau N ngày" countdown in the detail header
        XCTAssertEqual(OrderDetailLogic.headerSummary(days: 7, remainder: .handOverIn(1)), days7)
        XCTAssertEqual(OrderDetailLogic.headerSummary(days: 7, remainder: .handOverToday),
                       days7 + " · " + "order.header.handOverToday".localized())
        // #893 (owner): no overdue text in the detail; lateness shows only in Việc cần làm
        XCTAssertEqual(OrderDetailLogic.headerSummary(days: 7, remainder: .pickupOverdue(3)), days7)
        XCTAssertFalse(OrderDetailLogic.showsLateBanner, "no overdue banner in the detail")
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

    // MARK: #1350 "Thu khi giao" of the order detail follows the plan

    /// 20% / 30% / rest of 1.150.000: stage 1 collected with the booking, stage 2 not yet, the rest at hand-over
    private func planStages(second: String = "UPCOMING", secondPaid: Double = 0, total: Double = 1_150_000) -> [OrderInstallment] {
        let first = (total * 0.2).rounded(), middle = (total * 0.3).rounded()
        return [OrderInstallment(key: "i1", label: "Cọc giữ chỗ", percent: 20, amount: first, dueDateKey: "2026-10-05", status: "PAID",
                                 collectedAt: "2026-10-05T07:00:00.000Z", paidAmount: first),
                OrderInstallment(key: "i2", label: "Cọc trước ngày lấy", percent: 30, amount: middle, dueDateKey: "2026-10-06",
                                 status: second, paidAmount: secondPaid),
                OrderInstallment(key: "rest", label: "rest", percent: 50, amount: total - first - middle, dueDateKey: "2026-10-16", status: "UPCOMING")]
    }

    private func shown(total: Double = 1_150_000, deposit: Double, collateral: Double = 0, payments: [OrderPaymentLine] = [],
                       plan: Bool? = true, stages: [OrderInstallment]?, currency: ShopCurrency = .vnd) -> Double {
        OrderDetailLogic.collectOnDeliveryShown(total: total, deposit: deposit, securityDeposit: collateral, payments: payments,
                                                hasPlan: plan, stages: stages, currency: currency)
    }

    func testCollectOnDeliveryShownIsWhatTheCustomerAddsAtHandOverNotWhatIsStillOwed() {
        // the example of #1350: stage 1 collected 230.000, stage 2 (345.000) not, rest 575.000
        XCTAssertEqual(shown(deposit: 230_000, stages: planStages()), 575_000)
        // and the hand-over suggestion (collectNow) is untouched by this display rule
        XCTAssertEqual(OrderDetailLogic.handOver(total: 1_150_000, deposit: 230_000, securityDeposit: 0, payments: []).due, 920_000)
    }

    func testCollectOnDeliveryShownIsTheSameOnceTheStagesAreCollected() {
        // stage 2 collected: the displayed number does not move, and it equals the hand-over suggestion
        let stages = planStages(second: "PAID", secondPaid: 345_000)
        XCTAssertEqual(shown(deposit: 575_000, stages: stages), 575_000)
        XCTAssertEqual(OrderDetailLogic.handOver(total: 1_150_000, deposit: 575_000, securityDeposit: 0, payments: []).due, 575_000)
    }

    func testCollectOnDeliveryShownEqualsHandOverWhenEveryStageIsCollected() {
        for total in [100_000.0, 900_000, 1_150_000, 2_333_333] {
            let stages = planStages(second: "PAID", secondPaid: (total * 0.3).rounded(), total: total)
            let deposit = stages.filter { !$0.isRest }.reduce(0) { $0 + $1.paidAmount }
            let due = OrderDetailLogic.handOver(total: total, deposit: deposit, securityDeposit: 0, payments: []).due
            XCTAssertEqual(shown(total: total, deposit: deposit, stages: stages), due, "total \(total)")
        }
        // thế chân or a PICKUP payment already taken: the hand-over suggestion keeps them, the display too (nothing blocks)
        let paid = planStages(second: "PAID", secondPaid: 345_000)
        let held = OrderDetailLogic.handOver(total: 1_150_000, deposit: 575_000, securityDeposit: 500_000, payments: [pickupPaid]).due
        XCTAssertEqual(shown(deposit: 575_000, collateral: 500_000, payments: [pickupPaid], stages: paid), held)
    }

    func testCollectOnDeliveryShownOfAOneTimeDepositOrNoDepositIsUnchanged() {
        XCTAssertEqual(shown(deposit: 300_000, plan: false, stages: nil), 850_000)
        XCTAssertEqual(shown(deposit: 300_000, plan: nil, stages: nil), 850_000)
        XCTAssertEqual(shown(deposit: 0, plan: nil, stages: nil), 1_150_000)
        XCTAssertEqual(shown(deposit: 2_000_000, plan: nil, stages: nil), 0, "never below zero")
        XCTAssertEqual(shown(deposit: 300_000, plan: true, stages: []), 850_000, "a plan with no stage in the answer")
        XCTAssertEqual(shown(deposit: 300_000, plan: false, stages: planStages()), 850_000, "stages without the plan flag")
    }

    func testCollectOnDeliveryShownWithADiscountUsesTheDiscountedTotal() {
        // total 900.000 after a discount: 20% = 180.000 collected, 30% = 270.000 not yet, rest 450.000
        XCTAssertEqual(shown(total: 900_000, deposit: 180_000, stages: planStages(total: 900_000)), 450_000)
    }

    func testCollectOnDeliveryShownDoesNotAddCollateral() {
        XCTAssertEqual(shown(deposit: 230_000, collateral: 500_000, stages: planStages()), 575_000)
    }

    func testCollectOnDeliveryShownLeavesAVoidStageOut() {
        var stages = planStages()
        // stage 2 voided, a new stage 3 of 100.000 not collected: the plan is 230.000 + 100.000
        stages[1] = OrderInstallment(key: "i2", label: "Huỷ", percent: 30, amount: 345_000, dueDateKey: "2026-10-06", status: "VOID")
        stages.insert(OrderInstallment(key: "i3", label: "Cọc 3", percent: 9, amount: 100_000, dueDateKey: "2026-10-08", status: "UPCOMING"), at: 2)
        XCTAssertEqual(shown(deposit: 230_000, stages: stages), 820_000)
        // only a void stage left unpaid: nothing blocks, the number is the hand-over suggestion
        stages.remove(at: 2)
        XCTAssertEqual(shown(deposit: 230_000, stages: stages), OrderDetailLogic.handOver(total: 1_150_000, deposit: 230_000,
                                                                                        securityDeposit: 0, payments: []).due)
    }

    func testCollectOnDeliveryShownOfADollarShopRoundsToCents() {
        let total = 1_150.30
        let first = 230.06, middle = 345.09
        let stages = [OrderInstallment(key: "i1", label: "A", percent: 20, amount: first, dueDateKey: "2026-10-05", status: "PAID", paidAmount: first),
                      OrderInstallment(key: "i2", label: "B", percent: 30, amount: middle, dueDateKey: "2026-10-06", status: "UPCOMING"),
                      OrderInstallment(key: "rest", label: "rest", percent: 50, amount: total - first - middle, dueDateKey: "2026-10-16", status: "UPCOMING")]
        XCTAssertEqual(shown(total: total, deposit: first, stages: stages, currency: .usd), 575.15, accuracy: 0.0001)
    }

    func testTheOrderStatusDoesNotChangeTheHandOverSuggestionOrTheReturnMoney() {
        // balance(): RESERVED keeps asking total - collected, PICKUPED is the return money; neither reads the display rule
        let reserved = OrderDetailLogic.balance(orderType: .rent, status: .reserved, total: 1_150_000, deposit: 230_000,
                                                securityDeposit: 0, lateFee: 0, damageFee: 0, payments: [])
        XCTAssertEqual(reserved.amountDue, 920_000)
        let pickuped = OrderDetailLogic.balance(orderType: .rent, status: .pickuped, total: 1_150_000, deposit: 575_000,
                                                securityDeposit: 0, lateFee: 0, damageFee: 0, payments: [])
        XCTAssertEqual(pickuped.amountDue, 0)
        XCTAssertEqual(shown(deposit: 230_000, stages: planStages()), 575_000, "the rule does not take the status")
        let sale = OrderDetailLogic.balance(orderType: .sale, status: .reserved, total: 500_000, deposit: 0,
                                            securityDeposit: 0, lateFee: 0, damageFee: 0, payments: [])
        XCTAssertEqual(sale.amountDue, 500_000)
    }

    // MARK: #1368 money collateral: rental left, collateral, what the customer hands over

    /// total 1.000.000: stage 1 200.000 collected, stage 2 300.000 (collected or not), rest 500.000
    private func plan1M(secondPaid: Bool) -> [OrderInstallment] {
        [OrderInstallment(key: "i1", label: "Cọc giữ chỗ", percent: 20, amount: 200_000, dueDateKey: "2026-10-05", status: "PAID",
                          collectedAt: "2026-10-05T07:00:00.000Z", paidAmount: 200_000),
         OrderInstallment(key: "i2", label: "Cọc trước ngày lấy", percent: 30, amount: 300_000, dueDateKey: "2026-10-06",
                          status: secondPaid ? "PAID" : "UPCOMING", collectedAt: secondPaid ? "2026-10-06T03:00:00.000Z" : nil,
                          paidAmount: secondPaid ? 300_000 : 0),
         OrderInstallment(key: "rest", label: "rest", percent: 50, amount: 500_000, dueDateKey: "2026-10-16", status: "UPCOMING")]
    }

    private func cash(type: OrderType = .rent, status: OrderStatus = .reserved, total: Double = 1_000_000, deposit: Double,
                      collateral: Double = 300_000, payments: [OrderPaymentLine] = [], plan: Bool? = true,
                      stages: [OrderInstallment]?, currency: ShopCurrency = .vnd) -> HandOverCashLines? {
        OrderDetailLogic.handOverCash(orderType: type, status: status, total: total, deposit: deposit, securityDeposit: collateral,
                                      payments: payments, hasPlan: plan, stages: stages, currency: currency)
    }

    func testHandOverCashOfTheExample() {
        // stage 2 not collected: the number does not wait for it
        XCTAssertEqual(cash(deposit: 200_000, stages: plan1M(secondPaid: false)),
                       HandOverCashLines(rentalLeft: 500_000, collateral: 300_000, cash: 800_000))
        // stage 2 collected: the three numbers do not move
        XCTAssertEqual(cash(deposit: 500_000, stages: plan1M(secondPaid: true)),
                       HandOverCashLines(rentalLeft: 500_000, collateral: 300_000, cash: 800_000))
    }

    func testHandOverCashIsTheSameFunctionAsTheShareImage() {
        let stages = plan1M(secondPaid: false)
        guard let lines = cash(deposit: 200_000, stages: stages) else { return XCTFail("no hand-over cash lines") }
        let rest = ShareMoneyRule.collectOnDelivery(total: 1_000_000, deposit: 200_000, hasPlan: true, stages: stages, currency: .vnd)
        XCTAssertEqual(lines.rentalLeft, rest)
        XCTAssertEqual(lines.cash, ShareMoneyRule.cashAtHandover(collectOnDelivery: rest, collateralMoney: 300_000, currency: .vnd))
        // and the image says the same numbers
        var source = OrderShareImageTests.rent()
        source.total = 1_000_000
        source.deposit = 200_000
        source.collateralPapers = nil
        source.collateralMoney = 300_000
        source.hasDepositPlan = true
        source.stages = stages
        let model = OrderShareModel.make(source, language: ShareLanguage.make(code: "vi-VN"), now: Date(), currency: .vnd)
        var seen: [String] = []
        for entry in model.money {
            switch entry {
            case .collect(_, let value), .cash(_, let value): seen.append(value)
            case .row(let row) where row.label == "Thế chân, thu khi giao": seen.append(row.value)
            default: break
            }
        }
        XCTAssertEqual(seen, [OrderShareModel.money(lines.rentalLeft, currency: .vnd), OrderShareModel.money(lines.collateral, currency: .vnd),
                              OrderShareModel.money(lines.cash, currency: .vnd)])
    }

    func testHandOverCashEqualsTheHandOverButtonOnceEveryStageIsCollected() {
        for total in [100_000.0, 900_000, 1_000_000, 2_333_333] {
            let first = (total * 0.2).rounded(), middle = (total * 0.3).rounded()
            let stages = [OrderInstallment(key: "i1", label: "A", percent: 20, amount: first, dueDateKey: "2026-10-05", status: "PAID", paidAmount: first),
                          OrderInstallment(key: "i2", label: "B", percent: 30, amount: middle, dueDateKey: "2026-10-06", status: "PAID", paidAmount: middle),
                          OrderInstallment(key: "rest", label: "rest", percent: 50, amount: total - first - middle, dueDateKey: "2026-10-16", status: "UPCOMING")]
            let deposit = first + middle
            let button = OrderDetailLogic.handOver(total: total, deposit: deposit, securityDeposit: 300_000, payments: []).due
            XCTAssertEqual(cash(total: total, deposit: deposit, stages: stages)?.cash, button, "total \(total)")
        }
        // a one-time deposit: the same
        let button = OrderDetailLogic.handOver(total: 1_150_000, deposit: 300_000, securityDeposit: 500_000, payments: []).due
        XCTAssertEqual(cash(total: 1_150_000, deposit: 300_000, collateral: 500_000, plan: false, stages: nil)?.cash, button)
        XCTAssertEqual(cash(total: 1_150_000, deposit: 0, collateral: 500_000, plan: nil, stages: nil)?.cash,
                       OrderDetailLogic.handOver(total: 1_150_000, deposit: 0, securityDeposit: 500_000, payments: []).due)
    }

    func testTheHandOverButtonStaysWhatItWasWhileAStageIsUncollected() {
        // not changed here: it asks total - collected + collateral (1.100.000), not the 800.000 of the new line
        let money = OrderDetailLogic.handOver(total: 1_000_000, deposit: 200_000, securityDeposit: 300_000, payments: [])
        XCTAssertEqual(money.due, 1_100_000)
        XCTAssertEqual(OrderDetailLogic.balance(orderType: .rent, status: .reserved, total: 1_000_000, deposit: 200_000,
                                                securityDeposit: 300_000, lateFee: 0, damageFee: 0, payments: []).amountDue, 1_100_000)
        // and the old display rule, kept for the other cases
        XCTAssertEqual(shown(total: 1_000_000, deposit: 200_000, collateral: 300_000, stages: plan1M(secondPaid: false)), 500_000)
        XCTAssertEqual(shown(total: 1_000_000, deposit: 500_000, collateral: 300_000, stages: plan1M(secondPaid: true)), 800_000)
    }

    func testHandOverCashNeedsMoneyCollateral() {
        XCTAssertNil(cash(deposit: 200_000, collateral: 0, stages: plan1M(secondPaid: false)), "papers only or none: the old lines")
        XCTAssertNil(cash(deposit: 200_000, collateral: -5, stages: plan1M(secondPaid: false)))
    }

    func testHandOverCashIsOnlyForARentalWaitingForPickUp() {
        let stages = plan1M(secondPaid: true)
        for status in [OrderStatus.pickuped, .returned, .cancelled] {
            XCTAssertNil(cash(status: status, deposit: 500_000, stages: stages), "\(status)")
        }
        XCTAssertNil(cash(type: .sale, status: .completed, deposit: 0, stages: nil))
        XCTAssertNil(cash(type: .sale, status: .reserved, deposit: 0, stages: nil))
        XCTAssertNotNil(cash(deposit: 500_000, stages: stages))
    }

    func testHandOverCashStepsAsideWhenAPickUpPaymentWasAlreadyTaken() {
        let taken = OrderPaymentLine(amount: 200_000, status: "COMPLETED", notes: "PICKUP")
        XCTAssertNil(cash(deposit: 500_000, payments: [taken], stages: plan1M(secondPaid: true)),
                     "the detail keeps its 'Đã thu' row and the old number")
        // a pending or another kind of payment does not count
        let other = [OrderPaymentLine(amount: 100_000, status: "PENDING", notes: "PICKUP"),
                     OrderPaymentLine(amount: 100_000, status: "COMPLETED", notes: "DEPOSIT")]
        XCTAssertNotNil(cash(deposit: 500_000, payments: other, stages: plan1M(secondPaid: true)))
    }

    func testHandOverCashOfOneDepositNoDepositAndDiscount() {
        XCTAssertEqual(cash(total: 1_150_000, deposit: 300_000, collateral: 500_000, plan: nil, stages: nil),
                       HandOverCashLines(rentalLeft: 850_000, collateral: 500_000, cash: 1_350_000))
        XCTAssertEqual(cash(total: 1_150_000, deposit: 0, collateral: 500_000, plan: nil, stages: nil),
                       HandOverCashLines(rentalLeft: 1_150_000, collateral: 500_000, cash: 1_650_000))
        // total 900.000 after a discount: 20% = 180.000, 30% = 270.000, rest 450.000
        let first = 180_000.0, middle = 270_000.0
        let stages = [OrderInstallment(key: "i1", label: "A", percent: 20, amount: first, dueDateKey: "2026-10-05", status: "PAID", paidAmount: first),
                      OrderInstallment(key: "i2", label: "B", percent: 30, amount: middle, dueDateKey: "2026-10-06", status: "UPCOMING"),
                      OrderInstallment(key: "rest", label: "rest", percent: 50, amount: 450_000, dueDateKey: "2026-10-16", status: "UPCOMING")]
        XCTAssertEqual(cash(total: 900_000, deposit: first, stages: stages), HandOverCashLines(rentalLeft: 450_000, collateral: 300_000, cash: 750_000))
    }

    func testHandOverCashOfADollarShopRoundsToCents() {
        let lines = cash(total: 1_150.30, deposit: 300.10, collateral: 100.15, plan: nil, stages: nil, currency: .usd)
        XCTAssertEqual(try XCTUnwrap(lines).rentalLeft, 850.2, accuracy: 0.0001)
        XCTAssertEqual(try XCTUnwrap(lines).cash, 950.35, accuracy: 0.0001)
    }

    func testTheNewLabelsResolveInBothLanguages() {
        for key in ["share.collect.rentalLeft", "share.collateral.collect", "share.cashAtHandover"] {
            XCTAssertNotEqual(key.localized(), key, key)
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
        XCTAssertNil(OrderDetailLogic.creatorName(detail), "#891: no creator → no Người tạo line")
    }

    /// #891 (owner): order detail shows "Người tạo: <name>" from the nested `createdBy` or the flat `createdByName`
    func testCreatorName() throws {
        func detail(_ creator: String) throws -> OrderDetail {
            let json = payload.replacingOccurrences(of: #""createdBy":null"#, with: creator)
            return try XCTUnwrap(JSONDecoder.shared.decode(APIResponse<OrderDetail>.self, from: Data(json.utf8)).data)
        }
        XCTAssertEqual(OrderDetailLogic.creatorName(try detail(#""createdBy":{"id":3,"firstName":"Merchant","lastName":"1"}"#)), "Merchant 1")
        XCTAssertEqual(OrderDetailLogic.creatorName(try detail(#""createdBy":null,"createdByName":"Lan Nguyễn""#)), "Lan Nguyễn")
        XCTAssertNil(OrderDetailLogic.creatorName(try detail(#""createdBy":{"id":3,"firstName":" ","lastName":""}"#)))
        XCTAssertNil(OrderDetailLogic.creatorName(try detail(#""createdBy":null,"createdByName":"  ""#)))
        let vi = Bundle(for: OrderRowCell.self).path(forResource: "vi-VN", ofType: "lproj").flatMap(Bundle.init(path:))
        XCTAssertEqual(vi?.localizedString(forKey: "order.detail.createdBy", value: nil, table: nil), "Người tạo: %@")
    }

    // MARK: Sale subtotal (#939)

    /// "Tiền hàng" of a sale = the item lines, as the web and the printed bill; never `totalAmount`
    func testSaleSubtotalIsTheItemSum() {
        XCTAssertEqual(OrderDetailLogic.saleSubtotal(itemTotals: [396, 396]), 792)
        XCTAssertEqual(OrderDetailLogic.saleSubtotal(itemTotals: []), 0)
    }

    // MARK: #1279 edit papers and collateral after pick-up

    func testEditCollateralOnlyForPickupedRentWithUpdatePermission() {
        XCTAssertTrue(OrderDetailLogic.canEditCollateral(orderType: .rent, status: .pickuped, canUpdateOrders: true))
        XCTAssertFalse(OrderDetailLogic.canEditCollateral(orderType: .rent, status: .pickuped, canUpdateOrders: false))
        for status in [OrderStatus.reserved, .returned, .cancelled, .completed] {
            XCTAssertFalse(OrderDetailLogic.canEditCollateral(orderType: .rent, status: status, canUpdateOrders: true))
        }
        XCTAssertFalse(OrderDetailLogic.canEditCollateral(orderType: .sale, status: .pickuped, canUpdateOrders: true))
    }

    func testCollateralSummaryJoinsPapersAndDeposit() {
        let fmt: (Double) -> String = { String(Int($0)) }
        XCTAssertEqual(OrderDetailLogic.collateralSummary(papers: " CCCD ", securityDeposit: 500_000, format: fmt), "CCCD · 500000")
        XCTAssertEqual(OrderDetailLogic.collateralSummary(papers: "CCCD", securityDeposit: 0, format: fmt), "CCCD")
        XCTAssertEqual(OrderDetailLogic.collateralSummary(papers: nil, securityDeposit: 500_000, format: fmt), "500000")
        XCTAssertNil(OrderDetailLogic.collateralSummary(papers: "  ", securityDeposit: 0, format: fmt))
    }

    func testCollateralEditRequestKeepsStatusAndSendsOnlyThreeFields() {
        let request = OrderDetailLogic.collateralEditRequest(papers: "CCCD", securityDeposit: 500_000,
                                                             currentPapers: nil, currentDeposit: 0)
        XCTAssertNil(request.status)
        XCTAssertEqual(request.collateralDetails, "CCCD")
        XCTAssertEqual(request.collateralType, "ID_CARD")
        XCTAssertEqual(request.securityDeposit, 500_000)
        XCTAssertNil(request.totalAmount)
        XCTAssertNil(request.orderItems)
        // Clearing a saved value is sent empty / 0
        let cleared = OrderDetailLogic.collateralEditRequest(papers: "", securityDeposit: 0,
                                                             currentPapers: "CCCD", currentDeposit: 500_000)
        XCTAssertEqual(cleared.collateralDetails, "")
        XCTAssertEqual(cleared.securityDeposit, 0)
    }

    func testReturnMoneyFollowsEditedCollateral() {
        // Before: 500k held, 200k fees -> give back 300k. After raising it to 700k -> give back 500k.
        XCTAssertEqual(OrderDetailLogic.returnMoney(lateFee: 150_000, damageFee: 50_000, securityDeposit: 500_000, payments: []).refund, 300_000)
        XCTAssertEqual(OrderDetailLogic.returnMoney(lateFee: 150_000, damageFee: 50_000, securityDeposit: 700_000, payments: []).refund, 500_000)
        let none = OrderDetailLogic.balance(orderType: .rent, status: .pickuped, total: 1_000_000, deposit: 300_000,
                                            securityDeposit: 0, lateFee: 0, damageFee: 0, payments: [])
        let held = OrderDetailLogic.balance(orderType: .rent, status: .pickuped, total: 1_000_000, deposit: 300_000,
                                            securityDeposit: 500_000, lateFee: 0, damageFee: 0, payments: [])
        XCTAssertEqual(none.refundDue, 0)
        XCTAssertEqual(held.refundDue, 500_000)
    }
}
