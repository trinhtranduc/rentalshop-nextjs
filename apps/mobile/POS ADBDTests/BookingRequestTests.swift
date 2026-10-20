import XCTest
@testable import POS_ADBD

/// #1124 — "Đặt online": booking requests the shop confirms into an order (list, detail, prepare → cart, gating)
final class BookingRequestTests: XCTestCase {
    private var store: CartStore { CartStore.shared }

    override func setUp() {
        super.setUp()
        store.resetAllCarts(notify: false, persistToDisk: false)
    }

    override func tearDown() {
        store.resetAllCarts(notify: false, persistToDisk: false)
        super.tearDown()
    }

    private let rowJSON = #"""
    {"id":12,"code":"A7K3Q","status":"PENDING","customerName":"Nguyễn Thị Mai","customerPhone":"0912345678",
     "note":"Size M","outlet":{"id":3,"name":"Thủ Đức"},"pickupDate":"2026-10-21","returnDate":"2026-10-24",
     "pickupPlanAt":"2026-10-21T02:00:00.000Z","returnPlanAt":"2026-10-24T10:00:00.000Z","itemCount":2,
     "items":[{"productId":7,"productName":"Áo dài gấm đỏ","quantity":1,"unitPrice":250000},
              {"productId":8,"productName":"Khăn đóng","quantity":1,"unitPrice":null}],
     "orderId":null,"rejectReason":null,"rejectNote":null,
     "expiresAt":"2026-10-21T07:05:00.000Z","createdAt":"2026-10-20T07:05:00.000Z"}
    """#

    private func decode<T: Decodable>(_ type: T.Type, _ json: String) throws -> T {
        try JSONDecoder().decode(T.self, from: Data(json.utf8))
    }

    private func product(_ json: String) throws -> Product {
        try JSONDecoder().decode(Product.self, from: Data(json.utf8))
    }

    // MARK: - Decoding

    func testListDecodesRowsAndCounts() throws {
        let list = try decode(BookingRequestList.self, #"{"requests":[\#(rowJSON)],"counts":{"PENDING":2,"CONFIRMED":1},"total":1,"page":1,"limit":20,"hasMore":false}"#)
        XCTAssertEqual(list.requests.count, 1)
        XCTAssertEqual(list.pendingCount, 2)
        let row = list.requests[0]
        XCTAssertEqual(row.id, 12)
        XCTAssertEqual(row.code, "A7K3Q")
        XCTAssertEqual(row.bookingStatus, .pending)
        XCTAssertEqual(row.outlet.name, "Thủ Đức")
        XCTAssertEqual(row.itemCount, 2)
        XCTAssertEqual(row.items[1].unitPrice, nil)
    }

    func testDetailDecodesShortDayAndKnownCustomer() throws {
        let json = #"""
        {"id":12,"code":"A7K3Q","status":"PENDING","customerName":"Mai","customerPhone":"0912345678","note":null,
         "outlet":{"id":3,"name":null},"pickupDate":"2026-10-21","returnDate":"2026-10-24",
         "pickupPlanAt":"2026-10-21T02:00:00.000Z","returnPlanAt":"2026-10-24T10:00:00.000Z","itemCount":1,
         "items":[{"productId":7,"productName":"Áo dài","quantity":2,"unitPrice":null,"shortDay":"2026-10-23"}],
         "orderId":null,"rejectReason":null,"rejectNote":null,"expiresAt":"2026-10-21T07:05:00.000Z",
         "createdAt":"2026-10-20T07:05:00.000Z","customer":{"id":40,"firstName":"Mai","lastName":null,"phone":"0912345678"}}
        """#
        let detail = try decode(BookingRequest.self, json)
        XCTAssertEqual(detail.items[0].shortDay, "2026-10-23")
        XCTAssertEqual(detail.customer?.id, 40)
        XCTAssertTrue(BookingLogic.hasShortItem(detail.items))
    }

    func testUnknownStatusDoesNotFailTheRow() throws {
        let row = try decode(BookingRequest.self, rowJSON.replacingOccurrences(of: "\"PENDING\"", with: "\"SOMETHING_NEW\""))
        XCTAssertEqual(row.bookingStatus, .unknown)
    }

    // MARK: - Gating

    func testChipNeedsTheFeatureTheShopSwitchAndThePermission() {
        XCTAssertTrue(BookingLogic.isAvailable(featureOn: true, merchantEnabled: true, permissions: ["bookings.view"]))
        XCTAssertFalse(BookingLogic.isAvailable(featureOn: false, merchantEnabled: true, permissions: ["bookings.view"]))
        XCTAssertFalse(BookingLogic.isAvailable(featureOn: true, merchantEnabled: false, permissions: ["bookings.view"]))
        XCTAssertFalse(BookingLogic.isAvailable(featureOn: true, merchantEnabled: true, permissions: ["orders.view", "orders.create"]))
        XCTAssertTrue(BookingLogic.canManage(permissions: ["bookings.view", "bookings.manage"]))
        XCTAssertFalse(BookingLogic.canManage(permissions: ["bookings.view"]))
    }

    func testFeatureKeyIsKnownToTheAppConfig() throws {
        let config = try decode(AppConfig.self, #"{"features":{"onlineBooking":false}}"#)
        XCTAssertFalse(config.features.contains(.onlineBooking))
        let on = try decode(AppConfig.self, #"{"features":{"onlineBooking":true}}"#)
        XCTAssertTrue(on.features.contains(.onlineBooking))
    }

    // MARK: - Texts

    func testDateRangeIsDayMonth() {
        XCTAssertEqual(BookingLogic.dateRange(pickup: "2026-10-21", return: "2026-10-24"), "21/10 → 24/10")
        XCTAssertEqual(BookingLogic.dateRange(pickup: "2026-10-21", return: "2026-10-21"), "21/10")
    }

    func testHoursLeftRoundsUpAndStopsAtZero() {
        let now = Date(timeIntervalSince1970: 1_000_000)
        XCTAssertEqual(BookingLogic.hoursLeft(expiresAt: now.addingTimeInterval(22.5 * 3600), now: now), 23)
        XCTAssertEqual(BookingLogic.hoursLeft(expiresAt: now.addingTimeInterval(-60), now: now), 0)
    }

    // MARK: - Confirm: prepare → a cart

    private func prepare() throws -> BookingPrepare {
        try decode(BookingPrepare.self, #"""
        {"bookingRequestId":12,"orderType":"RENT","outletId":3,
         "customer":{"id":40,"firstName":"Nguyễn","lastName":"Thị Mai","phone":"0912345678"},"customerCreated":false,
         "pickupPlanAt":"2026-10-21T02:00:00.000Z","returnPlanAt":"2026-10-24T10:00:00.000Z","notes":"Size M",
         "items":[{"productId":7,"quantity":2,"productName":"Áo dài gấm đỏ"},{"productId":8,"quantity":1,"productName":"Khăn đóng"}]}
        """#)
    }

    func testPrepareBuildsARentCartWithCustomerDatesItemsAndTheRequest() throws {
        let products = [7: try product(#"{"id":7,"name":"Áo dài gấm đỏ","rentPrice":250000,"salePrice":0}"#)]
        let cart = BookingCartBuilder.cart(from: try prepare(), products: products)
        XCTAssertEqual(cart.orderType, .rent)
        XCTAssertEqual(cart.customer?.customer_id, 40)
        XCTAssertEqual(cart.customer?.full_name, "Nguyễn Thị Mai")
        XCTAssertNotNil(cart.pickupPlanAt)
        XCTAssertNotNil(cart.returnPlanAt)
        XCTAssertEqual(cart.notes, "Size M")
        XCTAssertEqual(cart.bookingRequestId, 12)
        XCTAssertEqual(cart.bookingOutletId, 3)
        XCTAssertEqual(cart.items.map(\.productId), [7, 8])
        XCTAssertEqual(cart.items[0].quantity, 2)
        XCTAssertEqual(cart.items[0].price, 250000)
        // a product the app could not load still keeps its line (name and quantity), to be priced in the cart
        XCTAssertEqual(cart.items[1].productName, "Khăn đóng")
        XCTAssertEqual(cart.items[1].quantity, 1)
    }

    func testCreateRequestCarriesTheBookingRequestId() throws {
        let cart = BookingCartBuilder.cart(from: try prepare(), products: [:])
        let body = try JSONSerialization.jsonObject(with: JSONEncoder().encode(cart.toCreateOrderRequest())) as? [String: Any]
        XCTAssertEqual(body?["bookingRequestId"] as? Int, 12)
        let plain = try JSONSerialization.jsonObject(with: JSONEncoder().encode(Cart().toCreateOrderRequest())) as? [String: Any]
        XCTAssertNil(plain?["bookingRequestId"])
    }

    func testBookingCartOpensBesideADraftAndReturnsToItAfterTheOrder() throws {
        var mai = Customer()
        mai.customer_id = 1
        mai.full_name = "Khách đang chọn"
        store.setCustomer(mai)
        XCTAssertTrue(store.startBookingCart(BookingCartBuilder.cart(from: try prepare(), products: [:]), notify: false))
        XCTAssertEqual(store.carts.count, 2)
        XCTAssertEqual(store.cart.bookingRequestId, 12)
        store.resetCart(notify: false) // order created
        XCTAssertEqual(store.carts.count, 1)
        XCTAssertEqual(store.cart.customer?.full_name, "Khách đang chọn")
    }

    func testBookingCartReplacesAnEmptyCart() throws {
        XCTAssertTrue(store.startBookingCart(BookingCartBuilder.cart(from: try prepare(), products: [:]), notify: false))
        XCTAssertEqual(store.carts.count, 1)
        XCTAssertEqual(store.cart.bookingRequestId, 12)
    }

    func testBookingRequestSurvivesTheDraftOnDisk() throws {
        let cart = BookingCartBuilder.cart(from: try prepare(), products: [:])
        let restored = Cart()
        restored.applyDiskSnapshot(try JSONDecoder().decode(Cart.DiskSnapshot.self,
                                                            from: JSONEncoder().encode(cart.makeDiskSnapshot())))
        XCTAssertEqual(restored.bookingRequestId, 12)
        XCTAssertEqual(restored.bookingOutletId, 3)
        restored.clear()
        XCTAssertNil(restored.bookingRequestId)
    }

    func testPushTypeIsRecognised() {
        XCTAssertEqual(BookingLogic.requestId(fromPush: ["type": "BOOKING_REQUEST", "bookingRequestId": "12"]), 12)
        XCTAssertNil(BookingLogic.requestId(fromPush: ["type": "ORDER_CREATED", "orderId": "3"]))
    }
}
