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
        XCTAssertEqual(ProductRowLogic.addState(free: 0, inCart: 2), .out)
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
}
