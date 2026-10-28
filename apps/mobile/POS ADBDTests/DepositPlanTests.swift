import XCTest
@testable import POS_ADBD

/// #1199 "Thu cọc theo giai đoạn": the preview of the stages (golden numbers of the API), the payloads, the roles
final class DepositPlanTests: XCTestCase {

    private func drafts(_ percents: [Double]) -> [DepositStageDraft] {
        percents.enumerated().map { DepositStageDraft(label: "S\($0.offset + 1)", percent: $0.element, dueRule: .onCreate) }
    }

    // MARK: Golden numbers (tests/fixtures of the API: 12.000.000 → 3.600.000 / 4.800.000 / 3.600.000)

    func testGoldenThreeStages() {
        let stages = DepositPlanMath.stages(drafts([30, 40]), total: 12_000_000, createdKey: "2026-10-25", pickupKey: "2026-11-14", currency: .vnd)
        XCTAssertEqual(stages.map(\.amount), [3_600_000, 4_800_000, 3_600_000])
        XCTAssertEqual(stages.map(\.key), ["i1", "i2", "rest"])
        XCTAssertEqual(stages.last?.isRest, true)
        XCTAssertEqual(stages.reduce(0) { $0 + $1.amount }, 12_000_000)
        XCTAssertEqual(stages.map(\.percent), [30, 40, 30])
    }

    /// #1245: 30% of 128đ is 38đ; the cart shows the template's 30%, not 38/128 = 29.69%. An edited amount shows its own %.
    func testPercentIsTemplateUntilAmountEdited() {
        var d = drafts([30])
        var stages = DepositPlanMath.stages(d, total: 128, createdKey: "2026-10-25", pickupKey: "2026-10-30", currency: .vnd)
        XCTAssertEqual(stages[0].amount, 38)
        XCTAssertEqual(stages[0].percent, 30)
        d[0].amountOverride = 38
        stages = DepositPlanMath.stages(d, total: 128, createdKey: "2026-10-25", pickupKey: "2026-10-30", currency: .vnd)
        XCTAssertEqual(stages[0].percent, 29.7)
    }

    func testRestAbsorbsRounding() {
        // 3 stages of 33.33% of 100.001: the stages always add up to the total
        let stages = DepositPlanMath.stages(drafts([33.33, 33.33]), total: 100_001, createdKey: "2026-10-25", pickupKey: "2026-10-30", currency: .vnd)
        XCTAssertEqual(stages.reduce(0) { $0 + $1.amount }, 100_001)
        XCTAssertEqual(stages[0].amount, 33_330)
    }

    func testUsdUsesCents() {
        XCTAssertEqual(DepositPlanMath.percentOf(100.01, percent: 30, currency: .usd), 30.00)
        XCTAssertEqual(DepositPlanMath.percentOf(1_000, percent: 33.33, currency: .vnd), 333)
    }

    func testAmountOverrideAndExceeds() {
        var list = drafts([30, 40])
        list[0].amountOverride = 13_000_000
        let stages = DepositPlanMath.stages(list, total: 12_000_000, createdKey: "2026-10-25", pickupKey: "2026-11-14", currency: .vnd)
        XCTAssertTrue(DepositPlanMath.exceedsTotal(stages, total: 12_000_000))
        XCTAssertEqual(stages.last?.amount, 0)
        XCTAssertFalse(DepositPlanMath.exceedsTotal(DepositPlanMath.stages(drafts([30, 40]), total: 12_000_000, createdKey: "2026-10-25",
                                                                           pickupKey: "2026-11-14", currency: .vnd), total: 12_000_000))
    }

    // MARK: Due days

    func testDueDays() {
        XCTAssertEqual(DepositPlanMath.addDays("2026-11-14", -4), "2026-11-10")
        XCTAssertEqual(DepositPlanMath.addDays("2026-10-30", 3), "2026-11-02")
        XCTAssertEqual(DepositPlanMath.addDays("2026-12-31", 1), "2027-01-01")
        var draft = DepositStageDraft(label: "x", percent: 40, dueRule: .beforePickup(4))
        XCTAssertEqual(DepositPlanMath.dueKey(draft, createdKey: "2026-10-25", pickupKey: "2026-11-14"), "2026-11-10")
        draft.dueRule = .afterCreate(2)
        XCTAssertEqual(DepositPlanMath.dueKey(draft, createdKey: "2026-10-25", pickupKey: "2026-11-14"), "2026-10-27")
        draft.dueRule = .onCreate
        XCTAssertEqual(DepositPlanMath.dueKey(draft, createdKey: "2026-10-25", pickupKey: "2026-11-14"), "2026-10-25")
        draft.dueDateKey = "2026-11-01"
        XCTAssertEqual(DepositPlanMath.dueKey(draft, createdKey: "2026-10-25", pickupKey: "2026-11-14"), "2026-11-01")
    }

    func testPercentText() {
        XCTAssertEqual(DepositPlanMath.percentText(30), "30")
        XCTAssertEqual(DepositPlanMath.percentText(33.33), "33.33")
    }

    // MARK: Decoding: new fields are optional

    func testOrderWithoutPlanDecodesAsBefore() throws {
        let json = """
        {"id":5,"orderNumber":"100001","orderType":"RENT","status":"RESERVED","totalAmount":1000,"depositAmount":200,
         "createdAt":"2026-10-25T01:00:00.000Z","updatedAt":"2026-10-25T01:00:00.000Z"}
        """.data(using: .utf8)!
        let order = try JSONDecoder.shared.decode(Order.self, from: json)
        XCTAssertNil(order.installmentPercentCollected)
        XCTAssertNil(order.hasDepositPlan)
        XCTAssertNil(DepositPlanLogic.badge(percentCollected: order.installmentPercentCollected))
    }

    func testOrderWithPlanReadsPercentAndFlag() throws {
        let json = """
        {"id":5,"orderNumber":"100001","orderType":"RENT","status":"RESERVED","totalAmount":12000000,"depositAmount":3600000,
         "createdAt":"2026-10-25T01:00:00.000Z","updatedAt":"2026-10-25T01:00:00.000Z",
         "hasDepositPlan":true,"installmentSummary":{"planned":12000000,"collected":3600000,"remaining":8400000,"percentCollected":30,"nextDue":null},
         "cancelKeptAmount":null}
        """.data(using: .utf8)!
        let order = try JSONDecoder.shared.decode(Order.self, from: json)
        XCTAssertEqual(order.installmentPercentCollected, 30)
        XCTAssertEqual(order.hasDepositPlan, true)
        XCTAssertEqual(DepositPlanLogic.badge(percentCollected: 30), String(format: "deposit.badge.collected".localized(), "30"))
    }

    // MARK: #1213 the day a stage was collected is the Vietnam civil day, never the UTC day

    func testPaidDayIsTheVietnamDay() {
        // 00:12 VN 26/10 = 17:12Z 25/10; 06:53 VN 26/10 = 23:53Z 25/10; 23:59 VN 25/10 = 16:59Z 25/10
        XCTAssertEqual(InstallmentCardView.paidDay("2026-10-25T17:12:00.000Z"), "26/10")
        XCTAssertEqual(InstallmentCardView.paidDay("2026-10-25T23:53:00.000Z"), "26/10")
        XCTAssertEqual(InstallmentCardView.paidDay("2026-10-25T16:59:59.000Z"), "25/10")
        XCTAssertEqual(InstallmentCardView.paidDay("2026-10-25T17:12:00Z"), "26/10", "no fraction")
        XCTAssertEqual(InstallmentCardView.paidDay(nil), "")
    }

    func testPaidSubtitleUsesTheVietnamDay() {
        let stage = OrderInstallment(key: "i1", label: "Booking deposit", percent: 30, amount: 3_600_000, dueDateKey: "2026-10-25",
                                     status: "PAID", collectedAt: "2026-10-25T23:53:00.000Z", paidAmount: 3_600_000)
        XCTAssertTrue(InstallmentCardView.subtitle(stage).hasSuffix("26/10"), InstallmentCardView.subtitle(stage))
        // the due day is already a key: used as it is
        let unpaid = OrderInstallment(key: "i2", label: "b", percent: 40, amount: 1, dueDateKey: "2026-11-10", status: "UPCOMING")
        XCTAssertTrue(InstallmentCardView.subtitle(unpaid).hasSuffix("10/11"), InstallmentCardView.subtitle(unpaid))
    }

    // MARK: #1222 the list badge only for an order that has a deposit plan; the percent comes from the API

    private func listOrder(type: String = "RENT", status: String = "RESERVED", plan: Bool?, percent: Double? = nil, paid: Double = 4_800_000) throws -> Order {
        let planJSON = plan.map { ",\"hasDepositPlan\":\($0)" } ?? ""
        let summary = percent.map { ",\"installmentSummary\":{\"collected\":1,\"percentCollected\":\($0)}" } ?? ""
        let json = """
        {"id":5,"orderNumber":"100001","orderType":"\(type)","status":"\(status)","totalAmount":12000000,"depositAmount":\(paid),
         "createdAt":"2026-10-25T01:00:00.000Z","updatedAt":"2026-10-25T01:00:00.000Z"\(planJSON)\(summary)}
        """.data(using: .utf8)!
        return try JSONDecoder.shared.decode(Order.self, from: json)
    }

    func testListBadgeOnlyForAnOrderWithAPlan() throws {
        XCTAssertEqual(DepositPlanLogic.listBadgePercent(try listOrder(plan: true, percent: 40)), 40)
        XCTAssertEqual(DepositPlanLogic.listBadgePercent(try listOrder(plan: true, percent: 33.33)), 33)
        XCTAssertEqual(DepositPlanLogic.listBadgePercent(try listOrder(plan: true, percent: 250)), 100)
    }

    func testOneTimeDepositOrderHasNoBadgeEvenWithMoneyCollected() throws {
        // depositAmount 4.8M of 12M = 40%, but there is no plan: no badge (shop STAGED or not)
        XCTAssertNil(DepositPlanLogic.listBadgePercent(try listOrder(plan: false)))
        XCTAssertNil(DepositPlanLogic.listBadgePercent(try listOrder(plan: false, percent: 40)))
        XCTAssertNil(DepositPlanLogic.listBadgePercent(try listOrder(plan: nil)), "an older API sends no flag")
    }

    func testNoListBadgeWithoutPercentAfterPickupOrOnASale() throws {
        XCTAssertNil(DepositPlanLogic.listBadgePercent(try listOrder(plan: true, percent: 0)))
        XCTAssertNil(DepositPlanLogic.listBadgePercent(try listOrder(plan: true)))
        XCTAssertNil(DepositPlanLogic.listBadgePercent(try listOrder(status: "PICKUPED", plan: true, percent: 40)))
        XCTAssertNil(DepositPlanLogic.listBadgePercent(try listOrder(type: "SALE", plan: true, percent: 40)))
    }

    func testStageAndSummaryDecode() throws {
        let json = """
        [{"key":"i1","label":"Cọc giữ chỗ","percent":30,"amount":3600000,"plannedAmount":3600000,"remaining":0,"dueDateKey":"2026-10-25",
          "status":"PAID","collectedAt":"2026-10-25T03:00:00.000Z","paidAmount":3600000},
         {"key":"rest","label":"Phần còn lại, thu khi giao","percent":70,"amount":8400000,"plannedAmount":8400000,"remaining":8400000,
          "dueDateKey":"2026-11-14","status":"UPCOMING","collectedAt":null,"paidAmount":0,"unknownField":1}]
        """.data(using: .utf8)!
        let stages = try JSONDecoder.shared.decode([OrderInstallment].self, from: json)
        XCTAssertEqual(stages.count, 2)
        XCTAssertTrue(stages[0].isPaid)
        XCTAssertTrue(stages[1].isRest)
        XCTAssertEqual(DepositPlanLogic.nextToCollect(stages, status: .reserved)?.key, nil, "rest is collected at hand-over")
        XCTAssertTrue(DepositPlanLogic.unpaidBeforePickup(stages).isEmpty)
    }

    func testUnpaidStagesBlockHandOver() {
        let stages = [
            OrderInstallment(key: "i1", label: "a", percent: 30, amount: 3_600_000, dueDateKey: "2026-10-25", status: "PAID", paidAmount: 3_600_000),
            OrderInstallment(key: "i2", label: "b", percent: 40, amount: 4_800_000, dueDateKey: "2026-11-10", status: "UPCOMING"),
            OrderInstallment(key: "rest", label: "r", percent: 30, amount: 3_600_000, dueDateKey: "2026-11-14", status: "UPCOMING"),
        ]
        XCTAssertEqual(DepositPlanLogic.unpaidBeforePickup(stages).map(\.key), ["i2"])
        XCTAssertEqual(DepositPlanLogic.nextToCollect(stages, status: .reserved)?.key, "i2")
        XCTAssertNil(DepositPlanLogic.nextToCollect(stages, status: .pickuped))
        XCTAssertEqual(DepositPlanLogic.stageNumber(stages, key: "i2"), 2)
    }

    func testSettingsDecodeIsLenient() throws {
        let json = """
        {"depositMode":"STAGED","cancellationPolicy":"Huỷ: không hoàn cọc","templates":[{"id":"t1","name":"Áo cưới","isDefault":true,
         "items":[{"label":"Giữ chỗ","type":"PERCENT","value":30,"dueRule":{"kind":"ON_CREATE"}},
                  {"label":"Trước lấy","type":"PERCENT","value":40,"dueRule":{"kind":"BEFORE_PICKUP","days":4}}]}],
         "defaultTemplate":{"id":"default","name":"Cọc 30%","isDefault":true,"items":[{"label":"Cọc giữ chỗ","type":"PERCENT","value":30,"dueRule":{"kind":"ON_CREATE"}}]}}
        """.data(using: .utf8)!
        let settings = try JSONDecoder.shared.decode(DepositSettings.self, from: json)
        XCTAssertEqual(settings.depositMode, .staged)
        XCTAssertEqual(settings.startTemplate?.id, "t1")
        XCTAssertEqual(settings.templates[0].items[1].dueRule.days, 4)
        let empty = try JSONDecoder.shared.decode(DepositSettings.self, from: "{}".data(using: .utf8)!)
        XCTAssertEqual(empty.depositMode, .oneTime)
        XCTAssertNil(empty.startTemplate)
        XCTAssertEqual(DepositMode.from("weird"), .oneTime)
    }

    func testStartTemplateFallsBackToTheBuiltInOne() throws {
        let built = DepositTemplate(id: "default", name: "d", isDefault: true, items: [])
        XCTAssertEqual(DepositSettings(depositMode: .staged, templates: [], defaultTemplate: built).startTemplate?.id, "default")
        let own = DepositTemplate(id: "t2", name: "own", isDefault: nil, items: [])
        XCTAssertEqual(DepositSettings(depositMode: .staged, templates: [own], defaultTemplate: built).startTemplate?.id, "t2")
    }

    func testMerchantFlagIsOptional() throws {
        let json = """
        {"id":1,"name":"Shop"}
        """.data(using: .utf8)!
        let merchant = try JSONDecoder.shared.decode(Merchant.self, from: json)
        XCTAssertNil(merchant.depositMode)
    }

    func testReminderRowsDecodeFromOutletOperations() throws {
        let json = """
        {"overdueReturns":{"count":0},"installmentsDue":{"count":1,"orders":[{"orderId":7,"orderNumber":"589880","customerName":"Chị Lan","key":"i2","label":"Cọc 2","amount":4800000,"remaining":4800000,"dueDateKey":"2026-10-25","lateDays":0}]},
         "installmentsOverdue":{"count":1,"orders":[{"orderId":8,"orderNumber":"589881","customerName":"Chị My","key":"i2","label":"Cọc 2","amount":1000,"remaining":1000,"dueDateKey":"2026-10-23","lateDays":2}]},
         "installmentsDueTomorrow":{"count":0,"orders":[]}}
        """.data(using: .utf8)!
        let now = try JSONDecoder.shared.decode(OverviewNow.self, from: json)
        XCTAssertEqual(now.installments?.due.map(\.orderId), [7, 8])
        XCTAssertEqual(now.installments?.due.last?.lateDays, 2)
        let old = try JSONDecoder.shared.decode(OverviewNow.self, from: #"{"overdueReturns":{"count":2}}"#.data(using: .utf8)!)
        XCTAssertNil(old.installments)
    }

    func testFutureInstallmentsAreReadApartFromFutureIncome() throws {
        let json = """
        {"series":[{"date":"2026/11/10","realIncome":0,"expectedCollected":3600000,"futureInstallments":[{"dueDateKey":"2026-11-10","amount":4800000,"count":1}]},
                   {"date":"2026/11/11","realIncome":5}]}
        """.data(using: .utf8)!
        struct Body: Decodable { let series: [OverviewReport.Point] }
        let body = try JSONDecoder.shared.decode(Body.self, from: json)
        XCTAssertEqual(body.series[0].futureInstallments?.first?.amount, 4_800_000)
        XCTAssertEqual(body.series[0].expectedCollected, 3_600_000, "expectedCollected is not changed by the stages")
        XCTAssertNil(body.series[1].futureInstallments)
    }

    func testRentInstallmentEventHasItsOwnReason() {
        XCTAssertEqual(RelatedEventReason.forType("RENT_INSTALLMENT", revenue: 3_600_000), .installment)
        XCTAssertEqual(RelatedEventReason.text(revenueType: "RENT_INSTALLMENT", description: "x", revenue: 1, localize: { $0 }), "overview.related.event.installment")
    }

    // MARK: Requests

    func testHeaderCarriesInstallments() {
        XCTAssertEqual(ClientCapabilities.headerName, "X-Client-Capabilities")
        XCTAssertTrue(ClientCapabilities.tokens.contains("installments"))
        XCTAssertEqual(BaseService.jsonHeader.value(for: "X-Client-Capabilities"), ClientCapabilities.headerValue)
        XCTAssertEqual(BaseService.formHeader.value(for: "X-Client-Capabilities"), ClientCapabilities.headerValue)
    }

    func testPaymentPlanBody() throws {
        var plan = PaymentPlanRequest()
        plan.items = PaymentPlanRequest.items(from: drafts([30, 40]))
        plan.collectFirstNow = .init(method: "TRANSFER", reference: "ios-12345678")
        let data = try JSONEncoder().encode(plan)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let items = try XCTUnwrap(object["items"] as? [[String: Any]])
        XCTAssertEqual(items.count, 2)
        XCTAssertEqual(items[0]["value"] as? Double, 30)
        XCTAssertEqual(items[0]["type"] as? String, "PERCENT")
        XCTAssertEqual((items[0]["dueRule"] as? [String: Any])?["kind"] as? String, "ON_CREATE")
        XCTAssertEqual((object["collectFirstNow"] as? [String: Any])?["method"] as? String, "TRANSFER")
        // staff send an empty plan: the API picks the shop's default template
        let empty = try JSONSerialization.jsonObject(with: try JSONEncoder().encode(PaymentPlanRequest())) as? [String: Any]
        XCTAssertEqual(empty?.count, 0)
    }

    func testSettingsBodySendsOnlyWhatChanged() {
        XCTAssertEqual(DepositPlanAPIService.settingsBody(mode: .staged, cancellationPolicy: nil, templates: nil) as? [String: String], ["depositMode": "STAGED"])
        let template = DepositTemplate(id: "t1", name: "A", isDefault: true, items: [DepositStageTemplate(label: "g", value: 30, dueRule: .beforePickup(3))])
        let body = DepositPlanAPIService.settingsBody(mode: nil, cancellationPolicy: "p", templates: [template])
        XCTAssertEqual(body["cancellationPolicy"] as? String, "p")
        XCTAssertNil(body["depositMode"])
        let rows = body["templates"] as? [[String: Any]]
        XCTAssertEqual(rows?.first?["isDefault"] as? Bool, true)
    }

    func testPaths() {
        XCTAssertEqual(DepositPlanAPIService.collectPath(orderId: 9, key: "i2"), "/api/orders/9/installments/i2/collect")
        XCTAssertEqual(DepositPlanAPIService.voidPath(orderId: 9, key: "i1"), "/api/orders/9/installments/i1/void")
        XCTAssertEqual(DepositPlanAPIService.planPath(orderId: 9), "/api/orders/9/deposit-plan")
    }

    // MARK: Cancel

    func testCancelAmounts() {
        let none = DepositPlanLogic.CancelAmounts.keeping(0, of: 3_600_000)
        XCTAssertEqual(none.refund, 3_600_000)
        let half = DepositPlanLogic.CancelAmounts.keeping(1_800_000, of: 3_600_000)
        XCTAssertEqual(half.refund, 1_800_000)
        XCTAssertEqual(DepositPlanLogic.CancelAmounts.keeping(9_000_000, of: 3_600_000).kept, 3_600_000, "kept never above collected")
        XCTAssertEqual(DepositPlanLogic.CancelAmounts.refunding(600_000, of: 3_600_000).kept, 3_000_000)
        XCTAssertEqual(DepositPlanLogic.CancelAmounts.refunding(-5, of: 100).kept, 100)
    }

    func testCancelBody() {
        XCTAssertEqual(DepositPlanLogic.cancelBody(kept: 0, note: nil) as? [String: String], ["status": "CANCELLED"])
        let body = DepositPlanLogic.cancelBody(kept: 1_800_000, note: " khách đổi ý ")
        XCTAssertEqual(body["cancelKeptAmount"] as? Double, 1_800_000)
        XCTAssertEqual(body["cancelNote"] as? String, "khách đổi ý")
        var request = UpdateOrderRequest.updateStatus("CANCELLED")
        request.cancelKeptAmount = 5
        let object = try? JSONSerialization.jsonObject(with: JSONEncoder().encode(request)) as? [String: Any]
        XCTAssertEqual(object?["cancelKeptAmount"] as? Double, 5)
        XCTAssertEqual(object?["status"] as? String, "CANCELLED")
        let plain = try? JSONSerialization.jsonObject(with: JSONEncoder().encode(UpdateOrderRequest.updateStatus("CANCELLED"))) as? [String: Any]
        XCTAssertNil(plain?["cancelKeptAmount"], "an old-style cancel sends only the status")
    }

    // MARK: Roles

    func testRoles() {
        XCTAssertTrue(DepositPlanLogic.canEditPlan(role: .merchant))
        XCTAssertTrue(DepositPlanLogic.canEditPlan(role: .outletAdmin))
        XCTAssertFalse(DepositPlanLogic.canEditPlan(role: .outletStaff))
        XCTAssertTrue(DepositPlanLogic.canVoid(role: .merchant))
        XCTAssertFalse(DepositPlanLogic.canVoid(role: .outletAdmin))
        XCTAssertTrue(DepositPlanLogic.canKeepOnCancel(role: .outletAdmin))
        XCTAssertFalse(DepositPlanLogic.canKeepOnCancel(role: .outletInventory))
        XCTAssertEqual(DepositPlanLogic.collectMethods(role: .outletStaff), ["CASH", "TRANSFER"])
        XCTAssertTrue(DepositPlanLogic.collectMethods(role: .merchant).contains("CHECK"))
    }

    // MARK: Strings

    func testStringsExistInBothLanguages() throws {
        let keys = ["deposit.settings.title", "deposit.cart.createAndCollect", "deposit.card.collectStage",
                    "deposit.cancel.kept", "overview.installments.today", "INSTALLMENT_UNPAID_AT_PICKUP", "CANCEL_AMOUNTS_MISMATCH"]
        for language in ["en", "vi-VN"] {
            let path = try XCTUnwrap(Bundle.main.path(forResource: "Localizable", ofType: "strings", inDirectory: nil, forLocalization: language))
            let table = try XCTUnwrap(NSDictionary(contentsOfFile: path) as? [String: String])
            for key in keys { XCTAssertNotNil(table[key], "\(language) \(key)") }
        }
    }
}
