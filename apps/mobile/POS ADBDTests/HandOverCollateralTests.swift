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
