import XCTest
@testable import POS_ADBD

/// #373 — role rules, product prices, form validation, cart totals, error mapping, barcode match, list paging
final class ProductsV2Tests: XCTestCase {

    // MARK: - Helpers

    private func product(_ json: String) throws -> Product {
        try JSONDecoder.shared.decode(Product.self, from: json.data(using: .utf8)!)
    }

    private func item(price: Double, qty: Int = 1, deposit: Double = 0, options: [PricingOption]? = nil) -> CartItem {
        var item = CartItem(productId: 1, productName: "Áo dài", barcode: nil, quantity: qty, price: price, deposit: deposit,
                            originalRentPrice: price, originalSalePrice: 900_000)
        item.pricingOptions = options
        item.pricingType = "FIXED"
        return item
    }

    private let fixed = PricingOption(id: 1, type: "FIXED", price: 300_000, isDefault: true, isActive: true)
    private let daily = PricingOption(id: 2, type: "DAILY", price: 120_000, isDefault: false, isActive: true)

    // MARK: - Roles

    func testOutletStaffSeesNoPriceFieldsAndCannotEdit() {
        let staffPerms = ["products.view", "products.create", "orders.view"]
        XCTAssertFalse(ProductAccess.showsPriceFields(role: .outletStaff, permissions: staffPerms))
        XCTAssertFalse(ProductAccess.canEdit(role: .outletStaff, permissions: staffPerms))
        XCTAssertTrue(ProductAccess.canCreate(role: .outletStaff, permissions: staffPerms))
        // Even a stray permission does not give staff the price fields or edit
        XCTAssertFalse(ProductAccess.showsPriceFields(role: .outletStaff, permissions: ["products.manage"]))
        XCTAssertFalse(ProductAccess.canEdit(role: .outletStaff, permissions: ["products.manage"]))
    }

    func testMerchantAndOutletAdminManagePrices() {
        for role in [Role.merchant, .outletAdmin] {
            XCTAssertTrue(ProductAccess.showsPriceFields(role: role, permissions: ["products.manage"]))
            XCTAssertTrue(ProductAccess.canEdit(role: role, permissions: ["products.manage"]))
            XCTAssertTrue(ProductAccess.canCreate(role: role, permissions: ["products.manage"]))
        }
        XCTAssertFalse(ProductAccess.showsPriceFields(role: .merchant, permissions: ["products.view"]))
        XCTAssertFalse(ProductAccess.canCreate(role: .merchant, permissions: ["products.view"]))
    }

    // MARK: - Prices and stock

    func testPricesFromOptionsAndLegacyFields() throws {
        let withOptions = try product("""
        {"id":7,"name":"Vest","rentPrice":300000,"salePrice":2500000,"totalStock":3,"available":2,
         "pricingOptions":[{"id":1,"type":"FIXED","price":300000,"isDefault":false},{"id":2,"type":"DAILY","price":150000,"isDefault":true}]}
        """)
        XCTAssertEqual(ProductPricing.perRental(withOptions), 300_000)
        XCTAssertEqual(ProductPricing.perDay(withOptions), 150_000)
        XCTAssertEqual(ProductPricing.sale(withOptions), 2_500_000)
        XCTAssertEqual(ProductPricing.defaultMode(withOptions), .perDay)
        XCTAssertEqual(ProductStock.counts(withOptions), ProductStockCounts(total: 3, rented: 1, free: 2))

        let legacyDaily = try product(#"{"id":8,"name":"Váy","rentPrice":90000,"pricingType":"DAILY","salePrice":0}"#)
        XCTAssertNil(ProductPricing.perRental(legacyDaily))
        XCTAssertEqual(ProductPricing.perDay(legacyDaily), 90_000)
        XCTAssertNil(ProductPricing.sale(legacyDaily))
    }

    func testStockOfOneOutletRow() throws {
        let p = try product("""
        {"id":9,"name":"Giày","totalStock":7,"outletStock":[
          {"outletId":2,"stock":5,"renting":2,"available":3,"outlet":{"id":2,"name":"A"}},
          {"stock":2,"renting":0,"available":2,"outlet":{"id":4,"name":"B"}}]}
        """)
        XCTAssertEqual(ProductStock.counts(p, outletId: 2), ProductStockCounts(total: 5, rented: 2, free: 3))
        XCTAssertEqual(ProductStock.counts(p, outletId: 4), ProductStockCounts(total: 2, rented: 0, free: 2))
        XCTAssertEqual(ProductOutletChoice.outletId(userOutletId: nil, product: p, merchantOutlets: []), 2)
        XCTAssertEqual(ProductOutletChoice.outletId(userOutletId: 4, product: p, merchantOutlets: []), 4)
        XCTAssertEqual(ProductOutletChoice.outletId(userOutletId: nil, product: nil,
                                                    merchantOutlets: [(id: 2, isDefault: false), (id: 4, isDefault: true)]), 4)
    }

    func testPricingOptionsSentOnSave() {
        let both = ProductPricing.options(perRental: 300_000, perDay: 120_000, defaultMode: .perDay)
        XCTAssertEqual(both.map { $0.type }, ["FIXED", "DAILY"])
        XCTAssertEqual(both.filter { $0.isDefault }.map { $0.type }, ["DAILY"])
        // A default without a price falls back to the mode that has one
        let onlyFixed = ProductPricing.options(perRental: 300_000, perDay: nil, defaultMode: .perDay)
        XCTAssertEqual(onlyFixed.map { $0.type }, ["FIXED"])
        XCTAssertTrue(onlyFixed[0].isDefault)
        XCTAssertTrue(ProductPricing.options(perRental: 0, perDay: nil, defaultMode: .perRental).isEmpty)
    }

    // MARK: - Form validation

    private func input(name: String = "Áo", perRental: Double? = 100_000, perDay: Double? = nil, mode: ProductPricingMode = .perRental,
                       deposit: Double? = nil, quantity: Int = 1, rented: Int = 0, photos: Int = 0, showsPrices: Bool = true) -> ProductFormInput {
        ProductFormInput(name: name, perRental: perRental, perDay: perDay, defaultMode: mode, salePrice: nil, deposit: deposit,
                         quantity: quantity, rented: rented, photoCount: photos, showsPrices: showsPrices)
    }

    func testFormValidation() {
        XCTAssertEqual(ProductFormValidator.validate(input()), [])
        XCTAssertEqual(ProductFormValidator.validate(input(name: "   ")), [.nameRequired])
        XCTAssertEqual(ProductFormValidator.validate(input(mode: .perDay)), [.perDayDefaultNeedsPrice])
        XCTAssertEqual(ProductFormValidator.validate(input(perDay: 50_000, mode: .perDay)), [])
        XCTAssertEqual(ProductFormValidator.validate(input(deposit: -1)), [.negativeAmount])
        XCTAssertEqual(ProductFormValidator.validate(input(quantity: -1)), [.negativeQuantity])
        XCTAssertEqual(ProductFormValidator.validate(input(quantity: 2, rented: 3)), [.quantityBelowRented(3)])
        XCTAssertEqual(ProductFormValidator.validate(input(quantity: 3, rented: 3)), [])
        XCTAssertEqual(ProductFormValidator.validate(input(photos: 6)), [.tooManyPhotos(5)])
        // Staff: price rules do not apply (no price fields)
        XCTAssertEqual(ProductFormValidator.validate(input(perRental: nil, mode: .perDay, showsPrices: false)), [])
    }

    func testMoneyInput() {
        XCTAssertEqual(MoneyInput.parse("1.250.000"), 1_250_000)
        XCTAssertNil(MoneyInput.parse(""))
        XCTAssertNil(MoneyInput.parse(nil))
        XCTAssertEqual(MoneyInput.display(1_250_000), "1.250.000")
        XCTAssertEqual(MoneyInput.display(nil), "")
    }

    // MARK: - Cart totals

    func testRentPerRentalVersusPerDay() {
        let cart = Cart()
        cart.orderType = .rent
        cart.addItem(item(price: 300_000, qty: 2, deposit: 100_000, options: [fixed, daily]))
        let pickup = ISO8601DateFormatter().date(from: "2026-10-03T00:00:00Z")!
        cart.pickupPlanAt = pickup
        cart.returnPlanAt = pickup.addingTimeInterval(2 * 86_400 + 3_600) // 3 civil days in UTC/VN

        var line = CartV2Logic.calc(cart.items[0], orderType: .rent)
        XCTAssertEqual(line.unit, .perRental)
        XCTAssertEqual(line.total, 600_000)
        XCTAssertEqual(cart.subtotalAmount, 600_000)
        XCTAssertTrue(CartV2Logic.offersBothModes(cart.items[0]))

        cart.selectPricingType(at: 0, type: "DAILY")
        cart.syncRentalDaysFromDates()
        line = CartV2Logic.calc(cart.items[0], orderType: .rent)
        XCTAssertEqual(line.unit, .perDay(days: cart.items[0].rentalDays))
        XCTAssertEqual(line.unitPrice, 120_000)
        XCTAssertEqual(line.total, 120_000 * 2 * Double(cart.items[0].rentalDays))
        XCTAssertEqual(cart.subtotalAmount, line.total)

        // Rent collects the prepaid deposit now; discount lowers the order total
        XCTAssertEqual(CartV2Logic.collectNow(cart), 200_000)
        cart.discount = 50_000
        XCTAssertEqual(cart.totalAmount, line.total - 50_000)
        XCTAssertEqual(CartV2Logic.collectNow(cart), 200_000)
    }

    func testSaleCollectsTheTotal() {
        let cart = Cart()
        cart.orderType = .sale
        var sold = item(price: 850_000, qty: 2, deposit: 100_000, options: [fixed])
        sold.pricingType = "DAILY" // ignored for a sale
        cart.addItem(sold)
        let line = CartV2Logic.calc(cart.items[0], orderType: .sale)
        XCTAssertEqual(line.unit, .sale)
        XCTAssertEqual(line.total, 1_700_000)
        XCTAssertFalse(CartV2Logic.offersBothModes(cart.items[0]))
        cart.discount = 10
        cart.discountType = .percentage
        XCTAssertEqual(CartV2Logic.collectNow(cart), 1_530_000)
    }

    func testShortageAndRentalDays() {
        var line = item(price: 1, qty: 2)
        XCTAssertNil(CartV2Logic.shortage(line))
        line.availabilityStatus = AvailabilityStatus(isAvailable: false, available: 1)
        XCTAssertEqual(CartV2Logic.shortage(line), 1)
        line.availabilityStatus = AvailabilityStatus(isAvailable: true, available: 2)
        XCTAssertNil(CartV2Logic.shortage(line))

        let vietnam = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
        let iso = ISO8601DateFormatter()
        // Same civil day still counts one day; 23:30 VN on 03/10 to 00:30 VN on 05/10 is 3 days (03, 04, 05)
        XCTAssertEqual(CartV2Logic.rentalDays(pickup: iso.date(from: "2026-10-03T01:00:00Z")!,
                                              return: iso.date(from: "2026-10-03T10:00:00Z")!, timeZone: vietnam), 1)
        XCTAssertEqual(CartV2Logic.rentalDays(pickup: iso.date(from: "2026-10-03T16:30:00Z")!,
                                              return: iso.date(from: "2026-10-04T17:30:00Z")!, timeZone: vietnam), 3)
        XCTAssertEqual(CartV2Logic.rentalDays(pickup: iso.date(from: "2026-10-03T16:30:00Z")!,
                                              return: iso.date(from: "2026-10-04T17:30:00Z")!,
                                              timeZone: TimeZone(identifier: "UTC")!), 2)
    }

    // MARK: - Errors and barcode

    func testStockBelowRentedMapsToItsOwnMessage() {
        let response = APIErrorResponse(success: false, code: "STOCK_BELOW_RENTED",
                                        message: "Stock cannot be lower than the number of units currently rented out.", error: nil)
        XCTAssertEqual(response.errorCode, .stockBelowRented)
        XCTAssertEqual(response.httpStatusCode, 400)
        XCTAssertEqual(response.localizedMessage, "STOCK_BELOW_RENTED".localized())
        XCTAssertNotEqual(response.localizedMessage, "STOCK_BELOW_RENTED")
        XCTAssertEqual(response.toNSError().localizedDescription, response.localizedMessage)
    }

    func testBarcodeKeepsOnlyAnExactMatch() throws {
        let byName = try product(#"{"id":1,"name":"AD-0123 áo","barcode":"XYZ"}"#)
        let exact = try product(#"{"id":2,"name":"Áo dài","barcode":" ad-012 "}"#)
        XCTAssertEqual(BarcodeMatch.exact("AD-012", in: [byName, exact])?.id, 2)
        XCTAssertNil(BarcodeMatch.exact("AD-01", in: [byName, exact]))
        XCTAssertNil(BarcodeMatch.exact("  ", in: [exact]))
    }

    // MARK: - List paging

    private final class FakeSource: ProductsHomeDataSource {
        var calls: [(query: String?, page: Int, completion: (ProductsPage?, NSError?) -> Void)] = []
        func loadProducts(query: String?, categoryId: Int?, page: Int, limit: Int,
                          completion: @escaping (ProductsPage?, NSError?) -> Void) {
            calls.append((query, page, completion))
        }
    }

    private func waitMain() {
        let done = expectation(description: "main")
        DispatchQueue.main.async { done.fulfill() }
        wait(for: [done], timeout: 1)
    }

    func testStaleSearchIsDroppedAndPagesDedupe() throws {
        let source = FakeSource()
        let model = ProductsHomeViewModel(dataSource: source)
        let a = try product(#"{"id":1,"name":"A"}"#)
        let b = try product(#"{"id":2,"name":"B"}"#)

        model.setQuery("ao")
        model.setQuery("vest")
        source.calls[1].completion(ProductsPage(products: [b], hasMore: true), nil)
        source.calls[0].completion(ProductsPage(products: [a], hasMore: false), nil) // old answer, dropped
        waitMain()
        XCTAssertEqual(model.products.map { $0.id }, [2])
        XCTAssertTrue(model.hasMore)

        model.loadMore()
        XCTAssertEqual(source.calls.last?.page, 2)
        source.calls.last?.completion(ProductsPage(products: [b, a], hasMore: false), nil)
        waitMain()
        XCTAssertEqual(model.products.map { $0.id }, [2, 1])
        XCTAssertFalse(model.hasMore)
    }
}
