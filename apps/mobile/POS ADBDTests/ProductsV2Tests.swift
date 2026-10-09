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

    // MARK: - Home row price line (#681)

    func testRowPriceShowsTheDefaultOptionFirstAndTheOtherSecond() throws {
        let rentalDefault = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"pricingOptions":[{"id":1,"type":"FIXED","price":300000,"isDefault":true},{"id":2,"type":"DAILY","price":120000,"isDefault":false}]}"#)
        XCTAssertEqual(ProductRowLogic.price(rentalDefault),
                       ProductRowPrice(main: 300_000, mainMode: .perRental, second: 120_000, secondMode: .perDay))
        let dayDefault = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"pricingOptions":[{"id":1,"type":"FIXED","price":300000,"isDefault":false},{"id":2,"type":"DAILY","price":120000,"isDefault":true}]}"#)
        XCTAssertEqual(ProductRowLogic.price(dayDefault),
                       ProductRowPrice(main: 120_000, mainMode: .perDay, second: 300_000, secondMode: .perRental))
    }

    func testRowPriceWithOneOptionHasNoSecondAndSaleOnlyHasNoMode() throws {
        let rentalOnly = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"salePrice":900000}"#)
        XCTAssertEqual(ProductRowLogic.price(rentalOnly), ProductRowPrice(main: 300_000, mainMode: .perRental, second: nil, secondMode: nil))
        let dayOnly = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"pricingOptions":[{"id":2,"type":"DAILY","price":120000,"isDefault":true}]}"#)
        XCTAssertEqual(ProductRowLogic.price(dayOnly), ProductRowPrice(main: 120_000, mainMode: .perDay, second: nil, secondMode: nil))
        let saleOnly = try product(#"{"id":1,"name":"Áo dài","rentPrice":0,"salePrice":900000}"#)
        XCTAssertEqual(ProductRowLogic.price(saleOnly), ProductRowPrice(main: 900_000, mainMode: nil, second: nil, secondMode: nil))
        let none = try product(#"{"id":1,"name":"Áo dài","rentPrice":0}"#)
        XCTAssertNil(ProductRowLogic.price(none))
    }

    // MARK: - Full-screen photos (#472)

    func testViewerUrlsUseImagesWithoutBlanksElseImageUrl() throws {
        var p = try product(#"{"id":1,"name":"Áo dài","images":["https://x/a.jpg"," ","https://x/b.jpg"]}"#)
        XCTAssertEqual(ProductImages.viewerUrls(p), ["https://x/a.jpg", "https://x/b.jpg"])
        p.images = ["", "  "]
        p.image_url = "https://x/avatar.jpg"
        XCTAssertEqual(ProductImages.viewerUrls(p), ["https://x/avatar.jpg"])
        p.image_url = " "
        XCTAssertEqual(ProductImages.viewerUrls(p), [])
    }

    func testThumbnailTapOpensViewerAtTheThumbnailPhoto() throws {
        var p = try product(#"{"id":1,"name":"Áo dài","images":["https://x/a.jpg","https://x/b.jpg"]}"#)
        XCTAssertEqual(ProductImages.thumbnailTap(p), ProductImageViewerRequest(urls: ["https://x/a.jpg", "https://x/b.jpg"], startIndex: 0))
        p.image_url = "https://x/b.jpg"
        XCTAssertEqual(ProductImages.thumbnailTap(p)?.startIndex, 1)
        // A thumbnail URL outside the list still opens the viewer, at the first photo
        p.image_url = "https://x/other.jpg"
        XCTAssertEqual(ProductImages.thumbnailTap(p)?.startIndex, 0)
    }

    func testThumbnailTapWithoutPhotoFallsBackToRow() throws {
        var p = try product(#"{"id":1,"name":"Áo dài"}"#)
        XCTAssertNil(ProductImages.thumbnailUrl(p))
        XCTAssertNil(ProductImages.thumbnailTap(p))
        p.image_url = ""
        XCTAssertNil(ProductImages.thumbnailTap(p))
    }

    func testDetailTapStartsAtTheVisiblePageClamped() throws {
        let p = try product(#"{"id":1,"name":"Áo dài","images":["https://x/a.jpg","https://x/b.jpg","https://x/c.jpg"]}"#)
        XCTAssertEqual(ProductImages.detailTap(p, page: 1)?.startIndex, 1)
        XCTAssertEqual(ProductImages.detailTap(p, page: 9)?.startIndex, 2)
        XCTAssertEqual(ProductImages.detailTap(p, page: -1)?.startIndex, 0)
        XCTAssertNil(ProductImages.detailTap(try product(#"{"id":2,"name":"Váy"}"#), page: 0))
    }

    func testImageViewerShowsOnePagePerPhotoAndClampsStart() {
        let viewer = ImageViewerViewController(urls: ["https://x/a.jpg", "https://x/b.jpg"], startIndex: 5)
        viewer.loadViewIfNeeded()
        let pager = viewer.view.subviews.compactMap { $0 as? UIScrollView }.first
        XCTAssertEqual(pager?.subviews.filter { $0 is UIScrollView }.count, 2)
        XCTAssertEqual(viewer.modalPresentationStyle, .overFullScreen)
        let counter = viewer.view.subviews.compactMap { $0 as? UILabel }.first
        XCTAssertEqual(counter?.text?.trimmingCharacters(in: .whitespaces), "2/2")
        XCTAssertEqual(counter?.isHidden, false)
    }

    func testOutletStaffSeesNoPriceFieldsAndCannotEdit() {
        let staffPerms = ["products.view", "products.create", "orders.view"]
        XCTAssertFalse(ProductAccess.showsPriceFields(role: .outletStaff, permissions: staffPerms))
        XCTAssertFalse(ProductAccess.canEdit(role: .outletStaff, permissions: staffPerms))
        XCTAssertTrue(ProductAccess.canCreate(role: .outletStaff, permissions: staffPerms))
        // Even a stray permission does not give staff the price fields or edit
        XCTAssertFalse(ProductAccess.showsPriceFields(role: .outletStaff, permissions: ["products.manage"]))
        XCTAssertFalse(ProductAccess.canEdit(role: .outletStaff, permissions: ["products.manage"]))
    }

    // MARK: - Nhân viên kho (#682)

    func testInventoryStaffManagesProductsAndCategoriesButHidesMoneyLikeStaff() throws {
        let perms = ["outlet.view", "products.view", "products.create", "products.update", "products.manage",
                     "products.export", "orders.create", "orders.view", "orders.update", "customers.view", "customers.manage"]
        XCTAssertEqual(Role(rawValue: "OUTLET_INVENTORY"), .outletInventory)
        XCTAssertTrue(ProductAccess.canCreate(role: .outletInventory, permissions: perms))
        XCTAssertTrue(ProductAccess.canEdit(role: .outletInventory, permissions: perms))
        XCTAssertTrue(ProductAccess.canDelete(role: .outletInventory, permissions: perms))
        XCTAssertTrue(ProductAccess.showsPriceFields(role: .outletInventory, permissions: perms))
        XCTAssertTrue(CategoryRules.canAdd(role: .outletInventory, permissions: perms))
        XCTAssertTrue(CategoryRules.canManage(role: .outletInventory))
        XCTAssertFalse(CategoryRules.canManage(role: .outletAdmin))
        XCTAssertTrue(Role.outletInventory.isStaffLike)
        XCTAssertFalse(Role.outletAdmin.isStaffLike)
        XCTAssertTrue(OrdersHomeLogic.hidesMoney(role: .outletInventory, hideForStaff: true))
        XCTAssertFalse(OrdersHomeLogic.hidesMoney(role: .outletInventory, hideForStaff: false))
        XCTAssertTrue(ChangeHistoryLogic.isStaff("OUTLET_INVENTORY"))
        XCTAssertFalse(ChangeHistoryLogic.canView("OUTLET_INVENTORY"))
    }

    func testInventoryRoleIsPickedOnlyWhenTheApiAllowsIt() throws {
        XCTAssertEqual(UserFormRoles.choices(inventoryRole: false, currentRole: nil), [.outletStaff, .outletAdmin])
        XCTAssertEqual(UserFormRoles.choices(inventoryRole: true, currentRole: nil), [.outletStaff, .outletAdmin, .outletInventory])
        XCTAssertEqual(UserFormRoles.choices(inventoryRole: false, currentRole: .outletInventory).last, .outletInventory)
        // #684: an item note is trimmed; a blank one clears it
        XCTAssertNil(CartV2Logic.noteText(nil))
        XCTAssertNil(CartV2Logic.noteText("  \n "))
        XCTAssertEqual(CartV2Logic.noteText("  Sửa eo 2cm \n"), "Sửa eo 2cm")
        // #684: no role until one is picked; every pickable role has a one-line explanation
        XCTAssertFalse(UserFormRoles.isComplete(nil))
        XCTAssertTrue(UserFormRoles.isComplete(.outletStaff))
        for role in UserFormRoles.choices(inventoryRole: true, currentRole: nil) {
            XCTAssertFalse(UserFormRoles.help(role).isEmpty, "\(role) has a help line")
            XCTAssertNotEqual(UserFormRoles.help(role), "users.role.help.\(role)", "\(role) help is localized")
        }
        let on = try JSONDecoder().decode(AppConfig.self, from: Data(#"{"features":{},"inventoryRole":true}"#.utf8))
        XCTAssertTrue(on.inventoryRole)
        let old = try JSONDecoder().decode(AppConfig.self, from: Data(#"{"features":{}}"#.utf8))
        XCTAssertFalse(old.inventoryRole)
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
        XCTAssertEqual(MoneyInput.display(0), "0")
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

    /// #433: "+ Add" in the cart opens the product list, not the customer page the cart came from
    func testCartAddMoreOpensProductsHome() {
        XCTAssertEqual(CartV2Logic.addMoreRoute(previousIsProductsHome: true), .pop)
        XCTAssertEqual(CartV2Logic.addMoreRoute(previousIsProductsHome: false), .openHomeTab)
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

    // MARK: - Home row (#383)

    func testCartCountSumsTheLinesOfOneProduct() throws {
        let other = CartItem(productId: 7, productName: "Vest", barcode: nil, quantity: 3, price: 100, deposit: 0,
                             originalRentPrice: 100, originalSalePrice: 0)
        let items = [item(price: 100, qty: 2), other]
        XCTAssertEqual(ProductRowLogic.cartCount(productId: 1, in: items), 2)
        XCTAssertEqual(ProductRowLogic.cartCount(productId: 7, in: items), 3)
        XCTAssertEqual(ProductRowLogic.cartCount(productId: 99, in: items), 0)
        XCTAssertEqual(ProductRowLogic.cartCount(productId: 1, in: []), 0)
        XCTAssertEqual(ProductRowLogic.cartId(try product(#"{"id":12,"name":"A"}"#)), 12)
    }

    func testRowSubtitleIsCodeAndStockWithoutCategory() throws {
        let withCode = try product(#"{"id":1,"name":"Áo dài","barcode":" AD-012 ","category":{"id":3,"name":"Áo dài"},"available":3,"stock":3}"#)
        let subtitle = ProductRowLogic.subtitle(withCode)
        XCTAssertEqual(subtitle, ProductRowSubtitle(code: "AD-012", free: 3))
        XCTAssertNil(ProductRowLogic.subtitle(try product(#"{"id":2,"name":"B","barcode":"  ","available":0}"#)).code)
        XCTAssertNil(ProductRowLogic.subtitle(try product(#"{"id":3,"name":"C","barcode":"null"}"#)).code)
        XCTAssertEqual(ProductRowLogic.subtitle(try product(#"{"id":4,"name":"D","available":0}"#)).free, 0)
    }

    func testAddButtonState() {
        XCTAssertEqual(ProductRowLogic.addState(free: 3, inCart: 0), .add)
        XCTAssertEqual(ProductRowLogic.addState(free: 3, inCart: 2), .inCart(2))
        XCTAssertEqual(ProductRowLogic.addState(free: 0, inCart: 0), .out)
        XCTAssertEqual(ProductRowLogic.addState(free: 0, inCart: 2), .inCart(2)) // #677: in-cart wins
    }

    // MARK: - List paging

    private final class FakeSource: ProductsHomeDataSource {
        var calls: [(query: String?, page: Int, completion: (ProductsPage?, NSError?) -> Void)] = []
        func loadProducts(query: String?, page: Int, limit: Int,
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

        model.refreshQuietly() // nothing loaded yet: no call
        XCTAssertTrue(source.calls.isEmpty)
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

    /// #677 — after an order changed, the loaded rows take the new stock in place (same rows, same order)
    func testQuietRefreshUpdatesRowsInPlace() throws {
        let source = FakeSource()
        let model = ProductsHomeViewModel(dataSource: source)
        model.reload()
        source.calls[0].completion(ProductsPage(products: [try product(#"{"id":1,"name":"A","available":5}"#),
                                                           try product(#"{"id":2,"name":"B","available":3}"#)],
                                                hasMore: true), nil)
        waitMain()

        model.refreshQuietly()
        XCTAssertEqual(source.calls.count, 2)
        XCTAssertEqual(source.calls[1].page, 1)
        // The answer has B with less stock and a product not on screen: only B changes
        source.calls[1].completion(ProductsPage(products: [try product(#"{"id":3,"name":"C"}"#),
                                                           try product(#"{"id":2,"name":"B2","available":1}"#)],
                                                hasMore: true), nil)
        waitMain()
        XCTAssertEqual(model.products.map { $0.id }, [1, 2])
        XCTAssertEqual(model.products.map { $0.name }, ["A", "B2"])
        XCTAssertTrue(model.hasMore)
    }

    /// #468 — board "Danh sách sản phẩm": the "● Còn N" / "● Hết hôm nay" label is 14pt regular
    func testStockLabelIsRegularWeight() throws {
        let cell = ProductRowV2Cell(style: .default, reuseIdentifier: ProductRowV2Cell.reuseId)
        cell.bind(try product(#"{"id":1,"name":"Áo dài"}"#), inCart: 0)
        func labels(_ view: UIView) -> [UILabel] {
            ((view as? UILabel).map { [$0] } ?? []) + view.subviews.flatMap(labels)
        }
        let stock = try XCTUnwrap(labels(cell.contentView).first { $0.text?.hasPrefix("● ") == true })
        XCTAssertEqual(stock.font, Utils.regularFont(size: DS.TextSize.secondary))
    }
}

/// #461 — the number pad covered "Lưu sản phẩm" and had no Done key
final class ProductFormKeyboardTests: XCTestCase {
    override func tearDown() {
        User.reset()
        super.tearDown()
    }

    /// Price fields only show for a user with `products.manage` who is not `OUTLET_STAFF`
    private func merchantForm() throws -> ProductFormViewController {
        let json = #"{"id":1,"role":"MERCHANT","permissions":["products.manage"]}"#
        User.save(user: try JSONDecoder.shared.decode(User.self, from: Data(json.utf8)))
        let form = ProductFormViewController(product: nil)
        form.loadViewIfNeeded()
        return form
    }

    private func allViews(_ view: UIView) -> [UIView] {
        [view] + view.subviews.flatMap { allViews($0) }
    }

    private func fields(_ view: UIView) -> [UITextField] {
        allViews(view).compactMap { $0 as? UITextField }
    }

    private func assertDoneBar(_ field: UITextField?, file: StaticString = #filePath, line: UInt = #line) {
        guard let field else { return XCTFail("field not found", file: file, line: line) }
        let bar = field.inputAccessoryView as? UIToolbar
        let done = bar?.items?.last
        XCTAssertNotNil(bar, "\(field.accessibilityLabel ?? "field") has no Done bar", file: file, line: line)
        XCTAssertEqual(done?.title, "Done".localized(), file: file, line: line)
        XCTAssertTrue(done?.target === field, "Done must end editing on its own field", file: file, line: line)
        XCTAssertEqual(done?.action, #selector(UIResponder.resignFirstResponder), file: file, line: line)
    }

    func testEveryPriceFieldHasADoneBar() throws {
        let numeric = fields(try merchantForm().view).filter { $0.keyboardType == .numberPad }
        XCTAssertEqual(numeric.count, 4, "per rental, per day, sale, deposit")
        numeric.forEach { assertDoneBar($0) }
    }

    func testSaveButtonRidesOnTheKeyboard() throws {
        let form = try merchantForm()
        let guide = form.view.keyboardLayoutGuide
        let save = try XCTUnwrap(allViews(form.view).compactMap { $0 as? UIButton }
            .first { $0.title(for: .normal) == "products.form.save".localized() })
        let tied = allViews(form.view).flatMap { $0.constraints }.contains { constraint in
            constraint.isActive && ((constraint.firstItem === save && constraint.secondItem === guide)
                || (constraint.firstItem === guide && constraint.secondItem === save))
        }
        XCTAssertTrue(tied, "the save button must sit on the keyboard while it is up")
    }

    /// A Maestro run showed "300" after typing "30": the next tap on the covered save button hit the pad's "0"
    func testTypingDigitsKeepsExactlyThoseDigits() throws {
        let form = try merchantForm()
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = form
        window.makeKeyAndVisible()
        defer { window.isHidden = true }
        let perDay = try XCTUnwrap(fields(form.view).first { $0.accessibilityLabel == "products.form.perDay".localized() })
        XCTAssertTrue(perDay.becomeFirstResponder())

        perDay.insertText("3")
        perDay.insertText("0")
        XCTAssertEqual(perDay.text, "30")
        ["0", "0", "0"].forEach { perDay.insertText($0) }
        XCTAssertEqual(perDay.text, "30.000")
        perDay.resignFirstResponder()
    }

    func testCustomerPhoneHasADoneBar() {
        let screen = NewCustomerViewController(mode: .pick)
        screen.loadViewIfNeeded()
        assertDoneBar(fields(screen.view).first { $0.keyboardType == .phonePad })

        let edit = EditCustomerViewController(customerId: 1)
        edit.loadViewIfNeeded()
        assertDoneBar(fields(edit.view).first { $0.keyboardType == .phonePad })
    }
}

/// #473 — the cart's "Theo lần / Theo ngày" toggle for a product that has both prices
extension ProductsV2Tests {
    /// One row of `GET /api/products?page=1&limit=20&sortBy=createdAt&sortOrder=desc&outletId=17` (local stack, 2026-10-05)
    private func homeRow(options: String) throws -> Product {
        try product("""
        {"id":301,"name":"Cart toggle probe both prices","description":null,"barcode":null,"totalStock":3,"stock":3,
         "renting":0,"available":3,"effectiveAvailableToday":3,"rentPrice":150000,"salePrice":0,"costPrice":0,"deposit":0,
         "images":[],"isActive":true,"embeddingGeneratedAt":null,"pricingType":"FIXED","durationConfig":null,
         "pricingOptions":\(options),
         "createdAt":"2026-10-05T13:03:54.566Z","updatedAt":"2026-10-05T13:03:54.566Z","deletedAt":null,"categoryId":1,
         "category":{"id":1,"name":"Electronics"},"merchant":{"id":9,"name":"Rental Shop Demo"},"merchantId":9,
         "outletStock":[{"id":601,"stock":3,"available":3,"renting":0,"productId":301,"outletId":17,
                         "outlet":{"id":17,"name":"Rental Shop Demo - Main Branch","address":"123 Main Street"}}]}
        """)
    }

    private var bothOptions: String {
        """
        [{"id":1,"productId":301,"type":"FIXED","price":150000,"unit":null,"blockSize":null,"isDefault":true,"isActive":true,
          "sortOrder":0,"createdAt":"2026-10-05T13:03:54.566Z","updatedAt":"2026-10-05T13:03:54.566Z"},
         {"id":2,"productId":301,"type":"DAILY","price":50000,"unit":null,"blockSize":null,"isDefault":false,"isActive":true,
          "sortOrder":1,"createdAt":"2026-10-05T13:03:54.566Z","updatedAt":"2026-10-05T13:03:54.566Z"}]
        """
    }

    func testHomeRowWithBothPricesOffersBothModes() throws {
        let row = try homeRow(options: bothOptions)
        let line = CartItem(from: row, quantity: 1, price: row.rentPrice ?? row.rent)
        XCTAssertTrue(CartV2Logic.offersBothModes(line))
        XCTAssertEqual(line.pricingType, "FIXED")
        XCTAssertEqual(line.price, 150_000)
    }

    func testOnePriceProductShowsNoToggle() throws {
        let onePrice = try homeRow(options: "[]")
        let cart = Cart()
        cart.orderType = .rent
        cart.addItem(CartItem(from: onePrice, quantity: 1, price: 150_000))
        cart.addItem(CartItem(from: onePrice, quantity: 1, price: 150_000))
        cart.refreshPricing(from: onePrice)
        XCTAssertEqual(cart.items.count, 1)
        XCTAssertFalse(CartV2Logic.offersBothModes(cart.items[0]))
    }

    func testStaleLineGetsTheToggleWhenTheProductIsAddedAgain() throws {
        // Put in the cart while it had one price; then the per-day price was added and it is added again
        let cart = Cart()
        cart.orderType = .rent
        cart.addItem(CartItem(from: try homeRow(options: "[]"), quantity: 1, price: 150_000))
        XCTAssertFalse(CartV2Logic.offersBothModes(cart.items[0]))

        cart.addItem(CartItem(from: try homeRow(options: bothOptions), quantity: 1, price: 150_000))
        XCTAssertEqual(cart.items.count, 1)
        XCTAssertEqual(cart.items[0].quantity, 2)
        XCTAssertTrue(CartV2Logic.offersBothModes(cart.items[0]))
        XCTAssertEqual(cart.items[0].pricingType, "FIXED")
        XCTAssertEqual(cart.items[0].price, 150_000)

        cart.selectPricingType(at: 0, type: "DAILY")
        XCTAssertEqual(cart.items[0].price, 50_000)
    }

    func testRestoredOrEditedLineGetsTheToggleAfterARefresh() throws {
        // A line of an edited order: no options, the order's own unit price
        var edited = CartItem(productId: 301, productName: "Cart toggle probe both prices", barcode: nil, quantity: 1,
                              price: 140_000, deposit: 0, originalRentPrice: 140_000, originalSalePrice: 140_000,
                              customRentPrice: 140_000)
        edited.pricingType = "FIXED"
        let cart = Cart()
        cart.orderType = .rent
        cart.addItem(edited)
        XCTAssertFalse(CartV2Logic.offersBothModes(cart.items[0]))

        cart.refreshPricing(from: try homeRow(options: bothOptions))
        XCTAssertTrue(CartV2Logic.offersBothModes(cart.items[0]))
        XCTAssertEqual(cart.items[0].price, 140_000, "the order's unit price stays until the mode changes")
        XCTAssertEqual(cart.items[0].pricingType, "FIXED")

        // A cart saved to disk and restored keeps the refreshed options
        let restored = try JSONDecoder().decode(CartItem.self, from: JSONEncoder().encode(cart.items[0]))
        XCTAssertTrue(CartV2Logic.offersBothModes(restored))
    }

    // MARK: Owner decision 2026-10-05: both modes on every rent line, the line price is editable

    private func onePriceRentCart() throws -> Cart {
        let cart = Cart()
        cart.orderType = .rent
        cart.customer = try JSONDecoder.shared.decode(Customer.self, from: Data(#"{"id":5,"firstName":"Minh","phone":"0912"}"#.utf8))
        cart.addItem(CartItem(from: try homeRow(options: "[]"), quantity: 2, price: 150_000))
        let pickup = ISO8601DateFormatter().date(from: "2026-10-02T17:00:00Z")!
        cart.pickupPlanAt = pickup
        cart.returnPlanAt = ISO8601DateFormatter().date(from: "2026-10-05T16:59:59Z")!
        return cart
    }

    func testEveryRentLineShowsTheToggleEvenWithOnePrice() throws {
        let cart = try onePriceRentCart()
        XCTAssertFalse(CartV2Logic.offersBothModes(cart.items[0]))
        XCTAssertTrue(CartV2Logic.showsPricingToggle(orderType: .rent))
        XCTAssertFalse(CartV2Logic.showsPricingToggle(orderType: .sale))
    }

    func testAModeWithoutAPriceStartsAtZeroAsksForAPriceAndBlocksCreate() throws {
        let cart = try onePriceRentCart()
        XCTAssertFalse(CartV2Logic.needsPrice(cart.items[0], orderType: .rent))
        XCTAssertTrue(CartV2Logic.missingPrices(cart).isEmpty)

        cart.selectPricingType(at: 0, type: "DAILY")
        XCTAssertEqual(cart.items[0].price, 0)
        XCTAssertTrue(CartV2Logic.needsPrice(cart.items[0], orderType: .rent), "the cart opens the price editor")
        XCTAssertEqual(CartV2Logic.missingPrices(cart), [String(format: "products.cart.needPrice".localized(), "Cart toggle probe both prices")])

        // Back to per rental: the product's own price again
        cart.selectPricingType(at: 0, type: "FIXED")
        XCTAssertEqual(cart.items[0].price, 150_000)
        XCTAssertTrue(CartV2Logic.missingPrices(cart).isEmpty)
    }

    func testTheEditedLinePriceIsUsedInTotalsAndTheCreateRequest() throws {
        let cart = try onePriceRentCart()
        cart.selectPricingType(at: 0, type: "DAILY")
        cart.updatePrice(at: 0, price: 60_000)
        cart.syncRentalDaysFromDates()
        let days = Double(cart.items[0].rentalDays)
        XCTAssertGreaterThanOrEqual(days, 3)
        XCTAssertEqual(CartV2Logic.calc(cart.items[0], orderType: .rent).total, 60_000 * 2 * days)
        XCTAssertTrue(CartV2Logic.missingPrices(cart).isEmpty)

        let item = try XCTUnwrap(cart.toCreateOrderRequest().orderItems.first)
        XCTAssertEqual(item.unitPrice, 60_000)
        XCTAssertEqual(item.pricingType, "DAILY")
        XCTAssertEqual(item.rentDays, cart.items[0].rentalDays)
        XCTAssertEqual(item.totalPrice, 60_000 * 2 * days)

        // Per rental keeps its own price; the edit never touches the product
        cart.selectPricingType(at: 0, type: "FIXED")
        cart.updatePrice(at: 0, price: 120_000)
        XCTAssertEqual(CartV2Logic.calc(cart.items[0], orderType: .rent).total, 240_000)
        XCTAssertEqual(cart.items[0].originalRentPrice, 150_000)
    }
}

/// #482 — one pricing chip per cart line and the "Cách tính giá" sheet (board Gio-hang-chon-gia)
extension ProductsV2Tests {
    private var threeOptions: String {
        """
        [{"id":1,"type":"FIXED","price":350000,"isDefault":true,"isActive":true},
         {"id":2,"type":"DAILY","price":150000,"isDefault":false,"isActive":true},
         {"id":3,"type":"BLOCK","price":0,"isDefault":false,"isActive":true},
         {"id":4,"type":"HOURLY","price":20000,"isDefault":false,"isActive":false}]
        """
    }

    private func pricingCart() throws -> Cart {
        let cart = Cart()
        cart.orderType = .rent
        cart.customer = try JSONDecoder.shared.decode(Customer.self, from: Data(#"{"id":5,"firstName":"Minh","phone":"0912"}"#.utf8))
        cart.addItem(CartItem(from: try homeRow(options: threeOptions), quantity: 1, price: 350_000))
        cart.pickupPlanAt = ISO8601DateFormatter().date(from: "2026-10-02T17:00:00Z")!
        cart.returnPlanAt = ISO8601DateFormatter().date(from: "2026-10-05T16:59:59Z")!
        return cart
    }

    func testSheetListsBothModesThenOtherActiveOptionTypes() throws {
        let line = try pricingCart().items[0]
        XCTAssertEqual(CartV2Logic.pricingChoices(line), [
            CartPricingChoice(type: "FIXED", catalogPrice: 350_000),
            CartPricingChoice(type: "DAILY", catalogPrice: 150_000),
            CartPricingChoice(type: "BLOCK", catalogPrice: nil),
        ], "an inactive option is left out; a priceless one reads Nhập giá")
        // A one-price product still offers both modes
        let onePrice = CartItem(from: try homeRow(options: "[]"), quantity: 1, price: 150_000)
        XCTAssertEqual(CartV2Logic.pricingChoices(onePrice).map(\.type), ["FIXED", "DAILY"])
        XCTAssertNil(CartV2Logic.pricingChoices(onePrice)[1].catalogPrice)
        XCTAssertEqual(CartV2Logic.pricingLabel("BLOCK"), "products.cart.pricing.block".localized())
    }

    func testFieldStartsAtTheLinePriceThenTheCatalogPrice() throws {
        let cart = try pricingCart()
        cart.updatePrice(at: 0, price: 320_000)
        let line = cart.items[0]
        XCTAssertEqual(CartV2Logic.startPrice(line, type: "FIXED"), 320_000, "the line's own mode shows the line price")
        XCTAssertEqual(CartV2Logic.startPrice(line, type: "DAILY"), 150_000)
        XCTAssertEqual(CartV2Logic.startPrice(line, type: "BLOCK"), 0)
    }

    func testChipAndPreviewTexts() throws {
        let cart = try pricingCart()
        // #684: the cart link reads price first
        XCTAssertEqual(CartV2Logic.link(cart.items[0], orderType: .rent).amount, "350.000đ")
        XCTAssertEqual(CartV2Logic.link(cart.items[0], orderType: .rent).unit,
                       "products.price.perRental".localized().lowercased(with: Locale(identifier: "vi_VN")))
        XCTAssertEqual(CartV2Logic.chip(cart.items[0], orderType: .rent).label, "products.price.perRental".localized())
        XCTAssertEqual(CartV2Logic.chip(cart.items[0], orderType: .rent).price, "350.000đ")
        cart.selectPricingType(at: 0, type: "DAILY")
        cart.updatePrice(at: 0, price: 130_000)
        XCTAssertEqual(CartV2Logic.chip(cart.items[0], orderType: .rent).price,
                       String(format: "products.cart.pricing.perDaySuffix".localized(), "130.000đ"))
        cart.selectPricingType(at: 0, type: "BLOCK")
        XCTAssertNil(CartV2Logic.chip(cart.items[0], orderType: .rent).price, "no price yet: Nhập giá")
        XCTAssertEqual(CartV2Logic.chip(cart.items[0], orderType: .sale).label, "products.cart.pricing.sale".localized())

        let daily = CartV2Logic.pricePreview(type: "DAILY", price: 130_000, days: 3, quantity: 1, orderType: .rent)
        XCTAssertEqual(daily.text, "130.000đ × " + PluralText.format("products.cart.days", count: 3, 3) + " × 1")
        XCTAssertEqual(daily.total, 390_000)
        let fixed = CartV2Logic.pricePreview(type: "FIXED", price: 350_000, days: 3, quantity: 2, orderType: .rent)
        XCTAssertEqual(fixed.text, "350.000đ × 2")
        XCTAssertEqual(fixed.total, 700_000)
        XCTAssertEqual(CartV2Logic.pricePreview(type: "DAILY", price: 300_000, days: 3, quantity: 2, orderType: .sale).total, 600_000)
    }

    func testApplyingAThirdOptionChangesOnlyTheLineAndKeepsThePayloadValid() throws {
        let cart = try pricingCart()
        cart.selectPricingType(at: 0, type: "BLOCK")
        cart.updatePrice(at: 0, price: 400_000)
        XCTAssertEqual(cart.items[0].pricingType, "BLOCK")
        XCTAssertEqual(CartV2Logic.calc(cart.items[0], orderType: .rent).total, 400_000)
        XCTAssertNil(cart.items[0].customFixedPrice, "the per-rental price typed earlier is not overwritten")
        let request = try XCTUnwrap(cart.toCreateOrderRequest().orderItems.first)
        XCTAssertEqual(request.unitPrice, 400_000)
        XCTAssertEqual(request.pricingType, "FIXED", "the order API takes FIXED / HOURLY / DAILY; a block price is unit × quantity")
        XCTAssertNil(request.pricingOptionId)
        XCTAssertEqual(request.totalPrice, 400_000)
        // Back to per rental: the catalog price, the product never changed
        cart.selectPricingType(at: 0, type: "FIXED")
        XCTAssertEqual(cart.items[0].price, 350_000)
        XCTAssertEqual(cart.items[0].originalRentPrice, 150_000)
    }
}

/// #476 — "Tạo đơn" opens a confirm sheet on the cart, then a "Đã tạo đơn" sheet
extension ProductsV2Tests {
    private var vn: TimeZone { TimeZone(identifier: "Asia/Ho_Chi_Minh")! }

    private func rentCart() throws -> Cart {
        let cart = Cart()
        cart.orderType = .rent
        cart.customer = try JSONDecoder.shared.decode(Customer.self, from: Data(#"{"id":5,"firstName":"Trần Văn","lastName":"Minh","phone":"0912555018"}"#.utf8))
        let vest = CartItem(productId: 1, productName: "Vest đen slim fit", barcode: nil, quantity: 1, price: 150_000, deposit: 100_000,
                            originalRentPrice: 150_000, originalSalePrice: 0)
        let aoDai = CartItem(productId: 2, productName: "Áo dài lụa đỏ", barcode: nil, quantity: 2, price: 300_000, deposit: 100_000,
                             originalRentPrice: 300_000, originalSalePrice: 0)
        cart.addItem(vest)
        cart.addItem(aoDai)
        // T7 03/10 → T2 05/10 in Vietnam
        cart.pickupPlanAt = ISO8601DateFormatter().date(from: "2026-10-02T17:00:00Z")
        cart.returnPlanAt = ISO8601DateFormatter().date(from: "2026-10-05T16:59:59Z")
        return cart
    }

    func testRentConfirmSheetSummarisesTheCart() throws {
        let cart = try rentCart()
        let confirm = CreateOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertFalse(confirm.isSale)
        XCTAssertEqual(confirm.customer, "Trần Văn Minh")
        XCTAssertEqual(confirm.range, "03/10 → 05/10")
        XCTAssertEqual(confirm.days, 3)
        XCTAssertEqual(confirm.items, "Vest đen slim fit, Áo dài lụa đỏ ×2")
        XCTAssertEqual(confirm.total, cart.totalAmount)
        XCTAssertEqual(confirm.total, 750_000)
        XCTAssertEqual(confirm.collect, cart.depositAmount, "rent collects the prepaid deposit")
        XCTAssertEqual(confirm.titleKey, "products.cart.confirm.rentTitle")
        XCTAssertEqual(confirm.collectKey, "products.cart.confirm.collectDeposit")
    }

    func testSaleConfirmSheetCollectsTheAmountDue() throws {
        let cart = try rentCart()
        cart.orderType = .sale
        cart.discount = 10_000
        let confirm = CreateOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertTrue(confirm.isSale)
        XCTAssertNil(confirm.range, "a sale has no rental dates")
        XCTAssertEqual(confirm.collect, cart.amountDue)
        XCTAssertEqual(confirm.titleKey, "products.cart.confirm.saleTitle")
        XCTAssertEqual(confirm.collectKey, "products.cart.confirm.collectSale")
    }

    func testCreatedSheetUsesTheShortOrderNumber() throws {
        let confirm = CreateOrderSheetLogic.confirm(try rentCart(), timeZone: vn)
        let created = CreateOrderSheetLogic.created(orderNumber: "ORD-17-0063", confirm: confirm)
        XCTAssertEqual(created.shortNumber, "0063")
        XCTAssertEqual(created.subtitle, "Trần Văn Minh · 03/10 → 05/10")
        XCTAssertEqual(created.paid, confirm.collect)
        XCTAssertEqual(created.paidKey, "products.cart.created.paidDeposit")

        let saleCart = try rentCart()
        saleCart.orderType = .sale
        let sale = CreateOrderSheetLogic.created(orderNumber: "ORD-17-0064", confirm: CreateOrderSheetLogic.confirm(saleCart, timeZone: vn))
        XCTAssertEqual(sale.subtitle, "Trần Văn Minh")
        XCTAssertEqual(sale.paidKey, "products.cart.created.paidSale")
    }

    func testBothSheetsLayOutWithTheBoardButtons() throws {
        // Laying the buttons out used to throw "no common ancestor" (width constraint before the row existed)
        let confirm = CreateOrderSheetLogic.confirm(try rentCart(), timeZone: vn)
        let sheets: [V2FittingSheet] = [
            CreateOrderConfirmSheet(confirm: confirm),
            OrderCreatedSheet(summary: CreateOrderSheetLogic.created(orderNumber: "ORD-17-0063", confirm: confirm)),
        ]
        for sheet in sheets {
            sheet.loadViewIfNeeded()
            sheet.view.frame = CGRect(x: 0, y: 0, width: 390, height: 460)
            sheet.view.layoutIfNeeded()
            let buttons = sheet.stack.arrangedSubviews.last as? UIStackView
            let widths = buttons?.arrangedSubviews.map { $0.frame.width } ?? []
            XCTAssertEqual(widths.count, 2)
            XCTAssertEqual(buttons?.arrangedSubviews.first?.frame.height, 50)
            let ratio: CGFloat = sheet is CreateOrderConfirmSheet ? 1.6 : 1
            XCTAssertEqual(widths[1] / widths[0], ratio, accuracy: 0.02)
        }
    }

    func testOnlyANewOrderUsesTheSheet() {
        XCTAssertEqual(CartV2Logic.ctaRoute(isEditMode: false), .confirmSheet)
        XCTAssertEqual(CartV2Logic.ctaRoute(isEditMode: true), .editSheet, "#676: an edit saves from its own sheet, not the review screen")
    }

    func testOneCreateAtATimeAndTheKeyIsReusedOnRetry() {
        let submission = CreateOrderSubmission()
        let key = submission.idempotencyKey
        XCTAssertTrue(submission.begin())
        XCTAssertFalse(submission.begin(), "a double tap must not send a second create (#341)")
        submission.failed()
        XCTAssertEqual(submission.idempotencyKey, key, "a retry after an error reuses the key")
        XCTAssertTrue(submission.begin())
        submission.succeeded()
        XCTAssertNotEqual(submission.idempotencyKey, key, "the next cart is a new checkout")
        XCTAssertFalse(submission.inFlight)
    }


    // MARK: - Categories from the product form (#632)

    func testCategoryAddFollowsProductsManageNeverStaff() {
        XCTAssertTrue(CategoryRules.canAdd(role: .merchant, permissions: ["products.manage"]))
        XCTAssertTrue(CategoryRules.canAdd(role: .outletAdmin, permissions: ["products.manage", "products.view"]))
        XCTAssertFalse(CategoryRules.canAdd(role: .outletStaff, permissions: ["products.view", "products.create"]))
        XCTAssertFalse(CategoryRules.canAdd(role: .outletStaff, permissions: ["products.manage"]), "staff never, whatever the list says")
        XCTAssertFalse(CategoryRules.canAdd(role: nil, permissions: []))
    }

    func testCategoryRenameAndDeleteOnlyMerchant() {
        XCTAssertTrue(CategoryRules.canManage(role: .merchant))
        XCTAssertTrue(CategoryRules.canManage(role: .admin))
        XCTAssertFalse(CategoryRules.canManage(role: .outletAdmin), "PUT/DELETE /api/categories/{id} reject OUTLET_ADMIN")
        XCTAssertFalse(CategoryRules.canManage(role: .outletStaff))
        XCTAssertFalse(CategoryRules.canManage(role: nil))
    }

    func testDefaultCategoryIsNeverDeletable() {
        var category = Category()
        XCTAssertTrue(CategoryRules.canDelete(category))
        category.isDefault = false
        XCTAssertTrue(CategoryRules.canDelete(category))
        category.isDefault = true
        XCTAssertFalse(CategoryRules.canDelete(category))
    }

    func testCategorySearchIgnoresAccentsAndCase() {
        XCTAssertTrue(CategoryRules.matches("Áo cưới", query: "ao cuoi"))
        XCTAssertTrue(CategoryRules.matches("Đầm dạ hội", query: "dam"))
        XCTAssertTrue(CategoryRules.matches("Váy", query: "  "))
        XCTAssertFalse(CategoryRules.matches("Áo dài", query: "vay"))
        XCTAssertFalse(CategoryRules.matches(nil, query: "a"))
    }

    func testCategoryNameIsTrimmedAndTwoToFiftyCharacters() {
        XCTAssertEqual(CategoryRules.validateName("   "), .required)
        XCTAssertEqual(CategoryRules.validateName(" Á "), .tooShort)
        XCTAssertNil(CategoryRules.validateName(" Áo "))
        XCTAssertNil(CategoryRules.validateName(String(repeating: "đ", count: 50)))
        XCTAssertEqual(CategoryRules.validateName(String(repeating: "đ", count: 51)), .tooLong)
    }
}

/// #676 — editing an order: "Lưu thay đổi" on the cart and a sheet that tags the rows changed since the order loaded
extension ProductsV2Tests {
    private func editCart(paid: Double = 200_000) throws -> Cart {
        let cart = try rentCart()
        cart.orderId = 42
        cart.editOriginal = CartEditOriginal.capture(cart, orderNumber: "482913", paid: paid)
        return cart
    }

    func testEditCartSaysSaveChanges() {
        XCTAssertEqual(CartV2Logic.ctaTitleKey(isEditMode: true, isRent: true), "products.cart.edit.save")
        XCTAssertEqual(CartV2Logic.ctaTitleKey(isEditMode: true, isRent: false), "products.cart.edit.save")
        XCTAssertEqual(CartV2Logic.ctaTitleKey(isEditMode: false, isRent: true), "products.cart.create")
        XCTAssertEqual(CartV2Logic.ctaTitleKey(isEditMode: false, isRent: false), "products.cart.sellAndCollect")
    }

    func testEditHeaderNamesTheOrderTheCustomerAndTheType() throws {
        XCTAssertNil(EditOrderSheetLogic.header(try rentCart()), "a new order keeps the cart title")
        let header = try XCTUnwrap(EditOrderSheetLogic.header(try editCart()))
        XCTAssertEqual(header.number, "482913")
        XCTAssertEqual(header.subtitle, "Trần Văn Minh · " + "products.cart.edit.rentType".localized())

        let legacy = try rentCart()
        legacy.orderId = 42 // a draft saved before #676 has no snapshot
        XCTAssertNil(EditOrderSheetLogic.header(legacy)?.number)
    }

    func testUnchangedEditSheetHasNoTags() throws {
        let cart = try editCart()
        let confirm = EditOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertEqual(confirm.number, "482913")
        XCTAssertFalse(confirm.isSale)
        XCTAssertEqual(confirm.range, "03/10 → 05/10", "same date format as the create sheet")
        XCTAssertEqual(confirm.days, 3)
        XCTAssertEqual(confirm.itemCount, 3)
        XCTAssertEqual(confirm.total, cart.totalAmount)
        // #677: a draft without payment notes: the 300.000đ booking deposit + its payments
        XCTAssertEqual(confirm.paid, 500_000)
        XCTAssertNil(confirm.collectAtHandOver, "status unknown: no Thu khi giao")
        XCTAssertEqual(confirm.itemsKey, "products.cart.edit.rentItems")
        XCTAssertFalse(confirm.datesChanged)
        XCTAssertFalse(confirm.itemsChanged)
    }

    func testNewDatesTagTheDatesRowOnly() throws {
        let cart = try editCart()
        cart.returnPlanAt = ISO8601DateFormatter().date(from: "2026-10-06T16:59:59Z") // T3 06/10
        let confirm = EditOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertTrue(confirm.datesChanged)
        XCTAssertFalse(confirm.itemsChanged)
    }

    func testAnotherTimeOnTheSameShopDayIsNotAChange() throws {
        let cart = try editCart()
        cart.pickupPlanAt = ISO8601DateFormatter().date(from: "2026-10-03T03:00:00Z") // 10:00 on 03/10 in Vietnam
        XCTAssertFalse(EditOrderSheetLogic.confirm(cart, timeZone: vn).datesChanged)
    }

    func testQuantityPriceAndLineChangesTagTheItemsRow() throws {
        let quantity = try editCart()
        quantity.updateQuantity(at: 0, quantity: 2)
        XCTAssertTrue(EditOrderSheetLogic.confirm(quantity, timeZone: vn).itemsChanged)
        XCTAssertFalse(EditOrderSheetLogic.confirm(quantity, timeZone: vn).datesChanged)

        let price = try editCart()
        price.updatePrice(at: 1, price: 280_000)
        XCTAssertTrue(EditOrderSheetLogic.confirm(price, timeZone: vn).itemsChanged)

        let removed = try editCart()
        removed.removeItem(at: 0)
        XCTAssertTrue(EditOrderSheetLogic.confirm(removed, timeZone: vn).itemsChanged)
    }

    func testBackToTheLoadedQuantityClearsTheTag() throws {
        let cart = try editCart()
        cart.updateQuantity(at: 0, quantity: 3)
        cart.updateQuantity(at: 0, quantity: 1)
        XCTAssertFalse(EditOrderSheetLogic.confirm(cart, timeZone: vn).itemsChanged)
    }

    func testNothingCollectedHidesThePaidRow() throws {
        let cart = try editCart(paid: 0)
        cart.setManualDepositAmount(0)
        XCTAssertNil(EditOrderSheetLogic.confirm(cart, timeZone: vn).paid)
    }

    // MARK: #677 — "Đã thu" and "Thu khi giao" on the save sheet

    private func bookedCart(payments: [OrderPaymentLine]) throws -> Cart {
        let cart = try rentCart()
        cart.orderId = 42
        cart.editOriginal = CartEditOriginal.capture(cart, orderNumber: "482913", paid: payments.reduce(0) { $0 + $1.amount },
                                                     status: .reserved, payments: payments)
        return cart
    }

    func testDepositOnlyOrderShowsTheDepositAsCollected() throws {
        let cart = try bookedCart(payments: [])
        let confirm = EditOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertEqual(confirm.paid, 300_000, "bug B: a booking deposit alone shows Đã thu")
        XCTAssertEqual(confirm.collectAtHandOver, cart.totalAmount - 300_000)
    }

    func testDepositAndPaymentsCountOnlyCompletedPickupPayments() throws {
        let cart = try bookedCart(payments: [
            OrderPaymentLine(amount: 100_000, status: "COMPLETED", notes: "PICKUP"),
            OrderPaymentLine(amount: 50_000, status: "PENDING", notes: "PICKUP"),
            OrderPaymentLine(amount: 20_000, status: "COMPLETED", notes: "RETURN_ADJUSTMENT"),
        ])
        cart.updateQuantity(at: 0, quantity: 2) // the new total counts
        cart.setManualDepositAmount(300_000) // the order's booking deposit
        let confirm = EditOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertEqual(confirm.paid, 400_000)
        XCTAssertEqual(confirm.collectAtHandOver,
                       OrderDetailLogic.handOver(total: cart.totalAmount, deposit: 300_000, securityDeposit: 0,
                                                 payments: cart.editOriginal?.payments ?? []).due)
        XCTAssertEqual(confirm.collectAtHandOver, cart.totalAmount - 300_000 - 100_000)
    }

    func testTheChanIsNeverCollectedButIsAskedAtHandOver() throws {
        let cart = try bookedCart(payments: [OrderPaymentLine(amount: 100_000, status: "COMPLETED", notes: "PICKUP")])
        cart.manualSecurityDeposit = 500_000
        let confirm = EditOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertEqual(confirm.paid, 400_000, "thế chân is not in Đã thu")
        XCTAssertEqual(confirm.collectAtHandOver, cart.totalAmount - 400_000 + 500_000)
    }

    func testSaleOrderCountsSalePaymentsAndHasNoHandOver() throws {
        let cart = try rentCart()
        cart.orderType = .sale
        cart.orderId = 43
        cart.editOriginal = CartEditOriginal.capture(cart, orderNumber: "482914", paid: 0, status: .reserved, payments: [
            OrderPaymentLine(amount: 200_000, status: "COMPLETED", notes: "SALE"),
            OrderPaymentLine(amount: 70_000, status: "COMPLETED", notes: "PICKUP"),
        ])
        let confirm = EditOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertEqual(confirm.paid, 200_000)
        XCTAssertNil(confirm.collectAtHandOver)
    }

    func testPickedUpRentalHasNoHandOverRow() throws {
        let cart = try bookedCart(payments: [])
        cart.editOriginal?.status = .pickuped
        XCTAssertNil(EditOrderSheetLogic.confirm(cart, timeZone: vn).collectAtHandOver)
    }

    func testPaymentsSurviveTheSavedDraft() throws {
        let cart = try bookedCart(payments: [OrderPaymentLine(amount: 100_000, status: "COMPLETED", notes: "PICKUP")])
        let data = try JSONEncoder().encode(cart.makeDiskSnapshot())
        let restored = Cart()
        restored.applyDiskSnapshot(try JSONDecoder().decode(Cart.DiskSnapshot.self, from: data))
        XCTAssertEqual(restored.editOriginal, cart.editOriginal)
        XCTAssertEqual(restored.editOriginal?.status, .reserved)
    }

    // MARK: #677 — the Home cart bar and "Huỷ sửa"

    func testCartBarSaysEditOrderWhileEditing() throws {
        XCTAssertEqual(CartV2Logic.cartBarAction(isEditMode: false, number: nil), "products.cart.create".localized())
        XCTAssertEqual(CartV2Logic.cartBarAction(isEditMode: true, number: "482913"),
                       String(format: "products.cart.edit.title".localized(), "482913"))
        XCTAssertEqual(CartV2Logic.cartBarAction(isEditMode: true, number: nil), "products.cart.editTitle".localized())
        let cart = try editCart()
        XCTAssertEqual(CartV2Logic.cartBarAction(isEditMode: cart.isEditMode, number: EditOrderSheetLogic.number(cart)),
                       String(format: "products.cart.edit.title".localized(), "482913"))
    }

    func testCancelEditReturnsTheOrderAndTitle() throws {
        XCTAssertNil(EditOrderSheetLogic.cancelEdit(try rentCart()), "a new order has nothing to cancel")
        XCTAssertEqual(EditOrderSheetLogic.cancelEdit(try editCart()), 42)
        XCTAssertEqual(EditOrderSheetLogic.cancelTitle(number: "482913"),
                       String(format: "products.cart.edit.cancelTitle".localized(), "482913"))
        XCTAssertEqual(EditOrderSheetLogic.cancelTitle(number: nil), "products.cart.edit.cancelTitleNoNumber".localized())
    }

    func testSaleEditHasNoDatesRow() throws {
        let cart = try editCart()
        cart.orderType = .sale
        cart.editOriginal = CartEditOriginal.capture(cart, orderNumber: "482914", paid: 0)
        let confirm = EditOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertNil(confirm.range)
        XCTAssertFalse(confirm.datesChanged)
        XCTAssertEqual(confirm.itemsKey, "products.cart.edit.saleItems")
        XCTAssertEqual(EditOrderSheetLogic.header(cart)?.subtitle, "Trần Văn Minh · " + "products.cart.edit.saleType".localized())
    }

    func testEditSnapshotSurvivesTheSavedDraftAndClears() throws {
        let cart = try editCart()
        let data = try JSONEncoder().encode(cart.makeDiskSnapshot())
        let restored = Cart()
        restored.applyDiskSnapshot(try JSONDecoder().decode(Cart.DiskSnapshot.self, from: data))
        XCTAssertEqual(restored.editOriginal, cart.editOriginal)

        // A draft saved before #676 still loads, without a snapshot
        var json = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        json.removeValue(forKey: "editOriginal")
        let old = Cart()
        old.applyDiskSnapshot(try JSONDecoder().decode(Cart.DiskSnapshot.self, from: JSONSerialization.data(withJSONObject: json)))
        XCTAssertEqual(old.orderId, 42)
        XCTAssertNil(old.editOriginal)

        cart.clear()
        XCTAssertNil(cart.editOriginal)
    }

    func testEditSheetTagsOnlyTheChangedRows() throws {
        let cart = try editCart()
        cart.updateQuantity(at: 0, quantity: 2)
        let sheet = EditOrderConfirmSheet(confirm: EditOrderSheetLogic.confirm(cart, timeZone: vn))
        sheet.loadViewIfNeeded()
        sheet.view.frame = CGRect(x: 0, y: 0, width: 390, height: 520)
        sheet.view.layoutIfNeeded()
        func tags(in view: UIView) -> Int {
            (view.accessibilityIdentifier == "cart.edit.changed" ? 1 : 0) + view.subviews.reduce(0) { $0 + tags(in: $1) }
        }
        XCTAssertEqual(tags(in: sheet.view), 1, "only Đồ thuê changed")
        XCTAssertEqual(sheet.saveButton.title(for: .normal), "products.cart.edit.save".localized())
    }
}
