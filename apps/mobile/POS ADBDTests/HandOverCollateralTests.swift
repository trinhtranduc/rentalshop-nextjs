import XCTest
@testable import POS_ADBD

/// #427 — hand-over asks for papers and a security deposit but does not require them
final class HandOverCollateralTests: XCTestCase {
    private func order(collateral: String? = nil, securityDeposit: Double = 0) throws -> Order {
        var extra = ",\"securityDeposit\":\(securityDeposit)"
        if let collateral { extra += ",\"collateralDetails\":\"\(collateral)\"" }
        let json = #"{"id":9,"orderNumber":"ORD-1-0009","orderType":"RENT","status":"RESERVED","createdAt":"2026-10-05T03:00:00.000Z","updatedAt":"2026-10-05T03:00:00.000Z","customerName":"Huy","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B","totalAmount":300000\#(extra)}"#
        return try JSONDecoder.shared.decode(Order.self, from: Data(json.utf8))
    }

    private func body(_ request: UpdateOrderRequest) throws -> [String: Any] {
        let data = try JSONEncoder().encode(request)
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    /// Runs `handOver` with a fake updater and returns the request sent and the result
    private func handOver(_ order: Order, papers: String, deposit: Double) -> (UpdateOrderRequest?, Result<Void, Error>?) {
        let viewModel = OrderViewModel(order: order)
        var sent: UpdateOrderRequest?
        var outcome: Result<Void, Error>?
        viewModel.orderUpdater = { id, request, completion in
            XCTAssertEqual(id, 9)
            sent = request
            completion(nil, nil)
        }
        viewModel.handOver(papers: papers, securityDeposit: deposit) { outcome = $0 }
        return (sent, outcome)
    }

    func testEmptyPapersAndNoDepositStillHandOver() throws {
        let (sent, outcome) = handOver(try order(), papers: "  ", deposit: 0)

        let request = try XCTUnwrap(sent, "the hand-over must reach the API")
        XCTAssertNoThrow(try outcome?.get())
        XCTAssertNotNil(outcome)
        let json = try body(request)
        XCTAssertEqual(json["status"] as? String, "PICKUPED")
        XCTAssertEqual(Set(json.keys), ["status"])
        XCTAssertTrue(request.validate().isValid)
    }

    func testPapersAndDepositTravelWithTheStatus() throws {
        let (sent, _) = handOver(try order(), papers: " CCCD ", deposit: 500)

        let json = try body(try XCTUnwrap(sent))
        XCTAssertEqual(json["status"] as? String, "PICKUPED")
        XCTAssertEqual(json["collateralType"] as? String, "ID_CARD")
        XCTAssertEqual(json["collateralDetails"] as? String, "CCCD")
        XCTAssertEqual(json["securityDeposit"] as? Double, 500)
        XCTAssertTrue(try XCTUnwrap(sent).validate().isValid)
    }

    func testClearingPrefilledPapersAndDepositClearsThem() throws {
        let (sent, _) = handOver(try order(collateral: "GPLX", securityDeposit: 300), papers: "", deposit: 0)

        let json = try body(try XCTUnwrap(sent))
        XCTAssertEqual(json["collateralDetails"] as? String, "")
        XCTAssertNil(json["collateralType"])
        XCTAssertEqual(json["securityDeposit"] as? Double, 0)
    }

    func testOldScreenCheckUsesTheLocalizedKey() {
        let key = "You can make a deposit using identification documents (ID card, driver's license, or vehicle registration) or pay a cash deposit."
        XCTAssertEqual(OrderViewModel.pickupBlockMessage(orderType: .rent, papers: "", securityDeposit: 0), key.localized())
        XCTAssertNil(OrderViewModel.pickupBlockMessage(orderType: .rent, papers: "CCCD", securityDeposit: 0))
        XCTAssertNil(OrderViewModel.pickupBlockMessage(orderType: .rent, papers: "", securityDeposit: 500))
        XCTAssertNil(OrderViewModel.pickupBlockMessage(orderType: .sale, papers: "", securityDeposit: 0))
    }
}

/// #1287 — the pickup sheet has no item list; the return sheet still shows the items
final class PickupSheetNoItemsTests: XCTestCase {
    private let payload = #"""
{"success":true,"data":{"id":132,"orderNumber":"968112","orderType":"RENT","status":"RESERVED","totalAmount":300000,"depositAmount":100000,"securityDeposit":0,"damageFee":0,"lateFee":0,"discountType":null,"discountValue":0,"discountAmount":0,"pickupPlanAt":"2026-10-07T01:00:00.000Z","returnPlanAt":"2026-10-10T05:00:00.000Z","pickedUpAt":null,"returnedAt":null,"rentalDuration":null,"isReadyToDeliver":false,"collateralType":null,"collateralDetails":null,"notes":null,"notesImages":null,"pickupNotes":null,"pickupNotesImages":null,"returnNotes":null,"returnNotesImages":null,"damageNotes":null,"damageNotesImages":null,"createdAt":"2026-10-05T22:24:51.027Z","updatedAt":"2026-10-05T22:24:51.027Z","outletId":1,"customerId":11,"createdById":null,"customer":{"id":11,"firstName":"Chị","lastName":"Diệu","phone":"0912345678","email":null,"address":null,"city":null,"state":null,"zipCode":null,"country":null,"dateOfBirth":null,"notes":null,"createdAt":"2026-10-08T15:22:24.976Z","updatedAt":"2026-10-08T15:22:24.976Z"},"outlet":{"id":1,"name":"Main","address":"1","phone":"1","city":"A","state":"B","zipCode":"1","country":"VN","isActive":true,"printNote":null,"printBankQr":false,"merchant":{"id":1,"name":"Shop","email":"a@b.c","phone":"1","address":"1","city":"A","state":"B","zipCode":"1","country":"VN","businessType":"EQUIPMENT","pricingType":"DAILY","taxId":"1","currency":"VND"}},"createdBy":null,"orderItems":[{"id":265,"productId":28,"productName":"Ao dai gam do","productBarcode":"B1","productImages":[],"quantity":1,"unitPrice":100000,"totalPrice":100000,"deposit":0,"notes":null,"rentalDays":null,"pricingType":null,"pricingOptionId":null,"product":{"id":28,"name":"Ao dai gam do","barcode":"B1","images":[],"rentPrice":1,"deposit":1}},{"id":266,"productId":29,"productName":"Khan dong nhung","productBarcode":"B2","productImages":[],"quantity":2,"unitPrice":100000,"totalPrice":200000,"deposit":0,"notes":null,"rentalDays":null,"pricingType":null,"pricingOptionId":null,"product":{"id":29,"name":"Khan dong nhung","barcode":"B2","images":[],"rentPrice":1,"deposit":1}}],"payments":[],"itemCount":2,"paymentCount":0,"totalPaid":0,"timeline":[]},"code":"ORDER_RETRIEVED_SUCCESS","message":"ok"}
"""#

    private func labels(_ view: UIView) -> [String] {
        var texts: [String] = []
        if let label = view as? UILabel, let text = label.text { texts.append(text) }
        for sub in view.subviews { texts += labels(sub) }
        return texts
    }

    private func sheetTexts(_ mode: OrderHandOverSheetViewController.Mode) throws -> [String] {
        let detail = try XCTUnwrap(JSONDecoder.shared.decode(APIResponse<OrderDetail>.self, from: Data(payload.utf8)).data)
        let sheet = OrderHandOverSheetViewController(mode: mode, detail: detail, lateDays: 0)
        sheet.loadViewIfNeeded()
        sheet.view.frame = CGRect(x: 0, y: 0, width: 390, height: 700)
        sheet.view.layoutIfNeeded()
        return labels(sheet.view)
    }

    func testPickupSheetHasNoItemRows() throws {
        let texts = try sheetTexts(.handOver)
        XCTAssertFalse(texts.contains("Ao dai gam do"))
        XCTAssertFalse(texts.contains("Khan dong nhung"))
        XCTAssertFalse(texts.contains("× 2"))
        XCTAssertTrue(texts.contains("order.handOver.papers".localized()), "papers field stays")
        XCTAssertTrue(texts.contains("order.handOver.deposit".localized()), "security deposit field stays")
    }

    func testReturnSheetStillShowsItems() throws {
        let texts = try sheetTexts(.takeReturn)
        XCTAssertTrue(texts.contains("Ao dai gam do"))
        XCTAssertTrue(texts.contains("× 2"))
    }
}
