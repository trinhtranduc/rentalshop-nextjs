import XCTest
@testable import POS_ADBD

/// #370 — a status this build does not know must not break decoding
final class OrderStatusTests: XCTestCase {
    private struct Row: Decodable { let status: OrderStatus }

    func testKnownStatusesDecode() throws {
        let rows = try JSONDecoder.shared.decode([Row].self, from: #"[{"status":"RESERVED"},{"status":"PICKED_UP"},{"status":"cancelled"}]"#.data(using: .utf8)!)
        XCTAssertEqual(rows.map(\.status), [.reserved, .pickuped, .cancelled])
    }

    func testUnknownStatusKeepsTheList() throws {
        let rows = try JSONDecoder.shared.decode([Row].self, from: #"[{"status":"RESERVED"},{"status":"ON_HOLD"}]"#.data(using: .utf8)!)
        XCTAssertEqual(rows.map(\.status), [.reserved, .unknown])
    }

    func testStringMapper() {
        XCTAssertEqual(OrderStatus.from(apiString: "ON_HOLD"), .unknown)
        XCTAssertNil(OrderStatus.from(apiString: ""))
        XCTAssertEqual("ON_HOLD".localizedStatus(), "ON_HOLD")
        XCTAssertEqual("PICKUPED".localizedStatus(), OrderStatus.pickuped.inString())
    }
}
