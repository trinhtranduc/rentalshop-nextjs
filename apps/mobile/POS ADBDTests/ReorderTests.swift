import XCTest
@testable import POS_ADBD

/// #1515 — "Đặt lại" an order: the new cart has the same type, customer, notes and lines, at today's prices, and none of
/// the money or the dates; unloadable products are dropped; the cart opens like an online booking (new beside a draft).
final class ReorderTests: XCTestCase {
    private var store: CartStore { CartStore.shared }

    override func setUp() {
        super.setUp()
        store.resetAllCarts(notify: false, persistToDisk: false)
    }

    override func tearDown() {
        store.resetAllCarts(notify: false, persistToDisk: false)
        super.tearDown()
    }

    private func product(_ json: String) throws -> Product {
        try JSONDecoder().decode(Product.self, from: Data(json.utf8))
    }

    /// An order with discount, deposit, collateral and notes; `items` is the JSON of `orderItems`
    private func order(type: String = "RENT", status: String = "RETURNED", items: String, notes: String = "Giao trước 8h") throws -> OrderDetail {
        let payload = #"""
        {"success":true,"data":{"id":501,"orderNumber":"482913","orderType":"\#(type)","status":"\#(status)","totalAmount":550000,"depositAmount":300000,"securityDeposit":500000,"damageFee":0,"lateFee":0,"discountType":"amount","discountValue":36000,"discountAmount":36000,"pickupPlanAt":"2026-10-10T02:00:00.000Z","returnPlanAt":"2026-10-12T16:59:59.000Z","pickedUpAt":"2026-10-10T03:00:00.000Z","returnedAt":null,"rentalDuration":null,"isReadyToDeliver":false,"collateralType":"ID_CARD","collateralDetails":"CCCD","notes":"\#(notes)","notesImages":["https://x/a.jpg"],"pickupNotes":null,"pickupNotesImages":null,"returnNotes":null,"returnNotesImages":null,"damageNotes":null,"damageNotesImages":null,"createdAt":"2026-10-05T22:24:51.027Z","updatedAt":"2026-10-05T22:24:51.027Z","outletId":1,"customerId":11,"createdById":null,"customer":{"id":11,"firstName":"Chị","lastName":"Diệu","phone":"0912345678","email":null,"address":null,"city":null,"state":null,"zipCode":null,"country":null,"dateOfBirth":null,"notes":null,"createdAt":"2026-10-08T15:22:24.976Z","updatedAt":"2026-10-08T15:22:24.976Z"},"outlet":{"id":1,"name":"Main","address":"1","phone":"1","city":"A","state":"B","zipCode":"1","country":"VN","isActive":true,"printNote":null,"printBankQr":false,"merchant":{"id":1,"name":"Shop","email":"a@b.c","phone":"1","address":"1","city":"A","state":"B","zipCode":"1","country":"VN","businessType":"EQUIPMENT","pricingType":"DAILY","taxId":"1","currency":"VND"}},"createdBy":null,"orderItems":\#(items),"payments":[],"itemCount":2,"paymentCount":0,"totalPaid":0,"timeline":[]},"code":"ORDER_RETRIEVED_SUCCESS","message":"ok"}
        """#
        return try XCTUnwrap(JSONDecoder.shared.decode(APIResponse<OrderDetail>.self, from: Data(payload.utf8)).data)
    }

    private func line(_ id: Int, product productId: Int?, qty: Int, price: Double, note: String? = nil) -> String {
        let pid = productId.map(String.init) ?? "null"
        let n = note.map { "\"\($0)\"" } ?? "null"
        return #"{"id":\#(id),"productId":\#(pid),"productName":"Món \#(id)","productBarcode":null,"productImages":[],"quantity":\#(qty),"unitPrice":\#(price),"totalPrice":\#(price * Double(qty)),"deposit":0,"notes":\#(n),"rentalDays":null,"pricingType":null,"pricingOptionId":null}"#
    }

    private func items(_ lines: String...) -> String { "[" + lines.joined(separator: ",") + "]" }

    private func products() throws -> [Int: Product] {
        [11: try product(#"{"id":11,"name":"Váy A","rentPrice":250000,"salePrice":900000}"#),
         12: try product(#"{"id":12,"name":"Áo B","rentPrice":80000,"salePrice":300000}"#)]
    }

    // Case 1: a rent order → same type, customer, notes, lines; today's price; nothing else
    func testRentOrderGivesTypeCustomerNotesAndLinesAtTodaysPrice() throws {
        let o = try order(items: items(line(1, product: 11, qty: 1, price: 200000, note: "Đã sửa gấu"), line(2, product: 12, qty: 2, price: 80000)))
        let built = ReorderCartBuilder.cart(from: o, products: try products())
        let cart = try XCTUnwrap(built.cart)
        XCTAssertEqual(built.skipped, 0)
        XCTAssertEqual(cart.orderType, .rent)
        XCTAssertEqual(cart.customer?.customer_id, 11)
        XCTAssertEqual(cart.customer?.full_name ?? "\(cart.customer?.firstName ?? "") \(cart.customer?.lastName ?? "")", "Chị Diệu")
        XCTAssertEqual(cart.notes, "Giao trước 8h")
        XCTAssertEqual(cart.items.map(\.productId), [11, 12])
        XCTAssertEqual(cart.items.map(\.quantity), [1, 2])
        XCTAssertEqual(cart.items[0].price, 250000, "today's price, not the 200.000 of the old order")
        XCTAssertEqual(cart.items[1].price, 80000)
        XCTAssertEqual(cart.items[0].note, "Đã sửa gấu")
        XCTAssertNil(cart.items[1].note)
    }

    // Case 2: no dates, discount, deposit, collateral, order id
    func testNothingFromTheMoneyOrTheDatesIsCopied() throws {
        let o = try order(items: items(line(1, product: 11, qty: 1, price: 200000)))
        let cart = try XCTUnwrap(ReorderCartBuilder.cart(from: o, products: try products()).cart)
        XCTAssertNil(cart.pickupPlanAt)
        XCTAssertNil(cart.returnPlanAt)
        XCTAssertEqual(cart.discount, 0)
        XCTAssertNil(cart.orderId)
        XCTAssertNil(cart.manualSecurityDeposit)
        XCTAssertTrue((cart.collateralDetails ?? "").isEmpty)
        XCTAssertNil(cart.bookingRequestId)
        let body = try JSONSerialization.jsonObject(with: JSONEncoder().encode(cart.toCreateOrderRequest())) as? [String: Any]
        XCTAssertNil(body?["pickupPlanAt"] as? String)
    }

    // Case 3: a sale order → sale cart at the sale price
    func testSaleOrderGivesASaleCartAtTheSalePrice() throws {
        let o = try order(type: "SALE", status: "COMPLETED", items: items(line(1, product: 12, qty: 3, price: 250000)))
        let cart = try XCTUnwrap(ReorderCartBuilder.cart(from: o, products: try products()).cart)
        XCTAssertEqual(cart.orderType, .sale)
        XCTAssertEqual(cart.items[0].quantity, 3)
        XCTAssertEqual(cart.items[0].price, 300000)
    }

    // Case 4: a product that is gone is dropped and counted; the rest stays
    func testADeletedProductIsDroppedAndCounted() throws {
        let o = try order(items: items(line(1, product: 99, qty: 1, price: 1), line(2, product: 12, qty: 2, price: 80000)))
        let built = ReorderCartBuilder.cart(from: o, products: try products())
        XCTAssertEqual(built.skipped, 1)
        XCTAssertEqual(try XCTUnwrap(built.cart).items.map(\.productId), [12])
    }

    // Case 5: no product left → no cart
    func testNoProductLeftGivesNoCart() throws {
        let o = try order(items: items(line(1, product: 98, qty: 1, price: 1), line(2, product: nil, qty: 1, price: 1)))
        let built = ReorderCartBuilder.cart(from: o, products: try products())
        XCTAssertNil(built.cart)
        XCTAssertEqual(built.skipped, 2)
    }

    // A line without productId (the product was deleted) is skipped even when others load
    func testALineWithoutProductIdIsSkipped() throws {
        let o = try order(items: items(line(1, product: nil, qty: 1, price: 1), line(2, product: 11, qty: 1, price: 200000)))
        let built = ReorderCartBuilder.cart(from: o, products: try products())
        XCTAssertEqual(built.skipped, 1)
        XCTAssertEqual(try XCTUnwrap(built.cart).items.map(\.productId), [11])
    }

    // Two lines of one product stay two lines, each with its own note
    func testTwoLinesOfOneProductStayTwoLines() throws {
        let o = try order(items: items(line(1, product: 11, qty: 1, price: 200000, note: "Size M"), line(2, product: 11, qty: 1, price: 0, note: "Tặng")))
        let cart = try XCTUnwrap(ReorderCartBuilder.cart(from: o, products: try products()).cart)
        XCTAssertEqual(cart.items.count, 2)
        XCTAssertEqual(cart.items.map { $0.note ?? "" }, ["Size M", "Tặng"])
    }

    func testAQuantityBelowOneBecomesOne() throws {
        let o = try order(items: items(line(1, product: 12, qty: 0, price: 80000)))
        XCTAssertEqual(try XCTUnwrap(ReorderCartBuilder.cart(from: o, products: try products()).cart).items[0].quantity, 1)
    }

    // Case 6/7/8: opening the cart, like an online booking
    private func reorderCart() throws -> Cart {
        let o = try order(items: items(line(1, product: 12, qty: 1, price: 80000)))
        return try XCTUnwrap(ReorderCartBuilder.cart(from: o, products: try products()).cart)
    }

    func testReorderCartOpensBesideADraftAndReturnsToItAfterTheOrder() throws {
        var mai = Customer()
        mai.customer_id = 1
        mai.full_name = "Khách đang chọn"
        store.setCustomer(mai)
        XCTAssertTrue(store.startReorderCart(try reorderCart(), notify: false))
        XCTAssertEqual(store.carts.count, 2)
        XCTAssertEqual(store.cart.customer?.customer_id, 11)
        store.resetCart(notify: false) // order created
        XCTAssertEqual(store.carts.count, 1)
        XCTAssertEqual(store.cart.customer?.full_name, "Khách đang chọn")
    }

    func testReorderCartReplacesAnEmptyCart() throws {
        XCTAssertTrue(store.startReorderCart(try reorderCart(), notify: false))
        XCTAssertEqual(store.carts.count, 1)
        XCTAssertEqual(store.cart.items.map(\.productId), [12])
    }

    func testReorderIsRefusedAtTheCartLimit() throws {
        for _ in 0..<(CartStore.maxCarts - 1) {
            store.addItem(CartItem(productId: 1, productName: "x", barcode: nil, quantity: 1, price: 1, deposit: 0,
                                   originalRentPrice: 1, originalSalePrice: 1))
            XCTAssertTrue(store.startReorderCart(try reorderCart(), notify: false))
        }
        store.addItem(CartItem(productId: 1, productName: "x", barcode: nil, quantity: 1, price: 1, deposit: 0,
                               originalRentPrice: 1, originalSalePrice: 1))
        XCTAssertEqual(store.carts.count, CartStore.maxCarts)
        XCTAssertFalse(store.startReorderCart(try reorderCart(), notify: false))
        XCTAssertEqual(store.carts.count, CartStore.maxCarts)
    }
}
