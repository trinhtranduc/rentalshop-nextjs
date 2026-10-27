import UIKit
import XCTest
@testable import POS_ADBD

/// #1189 day-block pricing: the port of `calculateBlockRent` against the shared golden file, the Codable models, the
/// cart line, the product save payload, and the request header
final class BlockPricingTests: XCTestCase {

    // MARK: - Golden (one source of truth: tests/fixtures/block-pricing-golden.json, read from the repo)

    private struct Golden: Decodable {
        struct Table: Decodable {
            let tiers: [Double]
            let startDay: Int
            let extraMode: String
            let extraPrice: Double?
            let currency: String
        }
        struct Case: Decodable {
            let table: String
            let days: Int
            let total: Double
        }
        let tables: [String: Table]
        let cases: [Case]
    }

    private func golden() throws -> Golden {
        // .../apps/mobile/POS ADBDTests/BlockPricingTests.swift -> repo root is four levels up
        var url = URL(fileURLWithPath: #filePath)
        for _ in 0..<4 { url.deleteLastPathComponent() }
        url.appendPathComponent("tests/fixtures/block-pricing-golden.json")
        return try JSONDecoder().decode(Golden.self, from: try Data(contentsOf: url))
    }

    func testEveryGoldenCaseMatches() throws {
        let golden = try golden()
        XCTAssertGreaterThanOrEqual(golden.cases.count, 20)
        for item in golden.cases {
            let table = try XCTUnwrap(golden.tables[item.table], item.table)
            let total = BlockPricing.calculateBlockRent(tiers: table.tiers, startDay: table.startDay, extraMode: table.extraMode,
                                                        extraPrice: table.extraPrice, days: item.days,
                                                        minorUnit: BlockPricing.minorUnit(currency: table.currency))
            XCTAssertEqual(total ?? -1, item.total, accuracy: 0.0001, "\(item.table) \(item.days) days")
        }
    }

    func testInvalidTablesAreRefused() {
        XCTAssertNil(BlockPricing.rent(BlockTable(tiers: [], startDay: 1), days: 1))
        XCTAssertNil(BlockPricing.rent(BlockTable(tiers: [-1], startDay: 1), days: 1))
        XCTAssertNil(BlockPricing.rent(BlockTable(tiers: Array(repeating: 1, count: 32), startDay: 1), days: 1))
        XCTAssertNil(BlockPricing.rent(BlockTable(tiers: [1], startDay: 0), days: 1))
        XCTAssertNil(BlockPricing.rent(BlockTable(tiers: [1], startDay: 1, extraMode: "WEEKLY"), days: 1))
    }

    // MARK: - The owner's example: 80 / 100 / 120 then +20 a day

    private let table = BlockTable(tiers: [80_000, 100_000, 120_000], startDay: 1, extraMode: BlockTable.extraPerDay, extraPrice: 20_000)

    /// The tests run in the simulator's language: the expected text is built from the same strings
    private func days(_ n: Int) -> String { PluralText.format("products.cart.days", count: n, n) }
    private func block(_ n: Int) -> String { String(format: "block.summary.block".localized(), n) }

    func testDetailTextForFiveDays() throws {
        let detail = try XCTUnwrap(BlockPricing.detail(table, days: 5))
        XCTAssertEqual(detail.total, 160_000)
        XCTAssertEqual(detail.extraDays, 2)
        XCTAssertEqual(detail.tierDay, 3)
        XCTAssertEqual(BlockPricing.summary(detail), block(3) + " " + String(format: "block.summary.extra".localized(), 2))
        XCTAssertEqual(BlockPricing.formula(detail, currency: .vnd), "120.000 (\(days(3))) + 2 × 20.000 = 160.000")
        let inside = try XCTUnwrap(BlockPricing.detail(table, days: 2))
        XCTAssertEqual(BlockPricing.summary(inside), block(2))
        XCTAssertEqual(BlockPricing.formula(inside, currency: .vnd), "100.000 (\(days(2)))")
    }

    func testRowSummary() {
        XCTAssertEqual(BlockPricing.rowSummary(table, currency: .vnd),
                       String(format: "block.row.tiers".localized(), 3) + " · " + String(format: "block.row.extra".localized(), "20.000đ"))
        XCTAssertEqual(BlockPricing.rowSummary(BlockTable(tiers: [1, 2], extraMode: BlockTable.holdLast), currency: .vnd),
                       String(format: "block.row.tiers".localized(), 2) + " · " + "block.row.hold".localized())
        XCTAssertEqual(BlockPricing.rangeSummary(table, currency: .vnd), days(1) + " 80.000 · " + days(3) + " 120.000")
    }

    // MARK: - Models decode old and new payloads

    private func product(_ json: String) throws -> Product {
        try JSONDecoder.shared.decode(Product.self, from: json.data(using: .utf8)!)
    }

    private let blockProductJSON = #"{"id":7,"name":"Áo cưới","rentPrice":80000,"pricingOptions":[{"id":1,"type":"FIXED","price":150000,"isDefault":false,"isActive":true},{"id":9,"type":"BLOCK","price":80000,"isDefault":true,"isActive":true,"blockTiers":[80000,100000,120000],"blockStartDay":1,"blockExtraMode":"EXTRA_PER_DAY","blockExtraPrice":20000}]}"#

    func testPricingOptionWithoutBlockFieldsStillDecodes() throws {
        let old = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"pricingOptions":[{"id":1,"type":"FIXED","price":300000,"isDefault":true}]}"#)
        XCTAssertNil(old.pricingOptions?.first?.blockTable)
        XCTAssertNil(ProductPricing.block(old))
        XCTAssertEqual(ProductPricing.defaultMode(old), .perRental)
    }

    func testBlockOptionDecodesAndDrivesTheRowAndDefault() throws {
        let p = try product(blockProductJSON)
        XCTAssertEqual(ProductPricing.block(p), table)
        XCTAssertEqual(ProductPricing.defaultMode(p), .block)
        XCTAssertEqual(ProductPricing.perRental(p), 150_000)
        XCTAssertEqual(ProductRowLogic.price(p), ProductRowPrice(main: 80_000, mainMode: .block, second: 150_000, secondMode: .perRental))
    }

    func testBlockNumbersMayArriveAsStrings() throws {
        let p = try product(#"{"id":7,"name":"X","rentPrice":1,"pricingOptions":[{"id":9,"type":"BLOCK","price":80000,"isDefault":true,"blockTiers":["80000","100000"],"blockStartDay":1,"blockExtraMode":"HOLD_LAST","blockExtraPrice":"0"}]}"#)
        XCTAssertEqual(ProductPricing.block(p)?.tiers, [80_000, 100_000])
    }

    func testOrderItemKeepsItsSnapshotAndOldItemsHaveNone() throws {
        let json = #"{"id":1,"quantity":1,"unitPrice":160000,"totalPrice":160000,"rentalDays":5,"pricingType":"BLOCK","pricingOptionId":9,"productName":"Áo","pricingSnapshot":{"version":1,"type":"BLOCK","optionId":9,"tiers":[80000,100000,120000],"startDay":1,"extraMode":"EXTRA_PER_DAY","extraPrice":20000,"currency":"VND","days":5,"quantity":1,"unitPrice":160000,"totalPrice":160000,"basePrice":120000,"extraDays":2,"extraAmount":40000}}"#
        let item = try JSONDecoder.shared.decode(OrderItem.self, from: json.data(using: .utf8)!)
        let lines = try XCTUnwrap(item.blockLines)
        XCTAssertEqual(lines.summary, block(3) + " " + String(format: "block.summary.extra".localized(), 2))
        XCTAssertEqual(lines.formula, "120.000 (\(days(3))) + 2 × 20.000 = 160.000")
        let old = try JSONDecoder.shared.decode(OrderItem.self, from: #"{"id":1,"quantity":1,"unitPrice":1,"totalPrice":1,"productName":"Áo"}"#.data(using: .utf8)!)
        XCTAssertNil(old.pricingSnapshot)
        XCTAssertNil(old.blockLines)
        // a snapshot this app cannot read never fails the order
        let odd = try JSONDecoder.shared.decode(OrderItem.self, from: #"{"id":1,"quantity":1,"unitPrice":1,"totalPrice":1,"productName":"Áo","pricingSnapshot":{"x":1}}"#.data(using: .utf8)!)
        XCTAssertNil(odd.pricingSnapshot)
    }

    // MARK: - Cart line

    /// Noon of a November 2026 day in Vietnam
    private func vnDay(_ day: Int) -> Date {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
        return calendar.date(from: DateComponents(year: 2026, month: 11, day: day, hour: 12))!
    }

    private func blockLine(qty: Int = 1) throws -> CartItem {
        let p = try product(blockProductJSON)
        return CartItem(from: p, quantity: qty, price: 0)
    }

    func testCartLineIsPricedFromTheTableForOneThreeAndFiveDays() throws {
        var line = try blockLine()
        XCTAssertTrue(line.isBlockPricing)
        XCTAssertEqual(line.price, 80_000)
        for (days, total) in [(1, 80_000.0), (3, 120_000), (5, 160_000)] {
            line.rentalDays = days
            XCTAssertEqual(line.price, total, "\(days) days")
            XCTAssertEqual(line.subTotal(for: .rent), total)
            XCTAssertEqual(line.effectivePrice(for: .rent), total)
        }
        XCTAssertEqual(line.requestPricingType, "BLOCK")
        XCTAssertEqual(line.requestPricingOptionId, 9)
        var two = try blockLine(qty: 2)
        two.rentalDays = 5
        XCTAssertEqual(two.subTotal(for: .rent), 320_000)
    }

    func testCartSyncsBlockLinesWithTheDatesAndSendsBlockFields() throws {
        let cart = Cart()
        cart.orderType = .rent
        cart.addItem(try blockLine())
        let pickup = vnDay(13)
        cart.pickupPlanAt = pickup.startOfShopDay()
        cart.returnPlanAt = vnDay(17).endOfShopDay()
        cart.syncRentalDaysFromDates()
        XCTAssertEqual(cart.items[0].rentalDays, 5)
        XCTAssertEqual(cart.totalAmount, 160_000)
        cart.customer = Customer()
        cart.customer?.customer_id = 3
        let request = cart.toCreateOrderRequest()
        let sent = try XCTUnwrap(request.orderItems.first)
        XCTAssertEqual(sent.pricingType, "BLOCK")
        XCTAssertEqual(sent.pricingOptionId, 9)
        XCTAssertEqual(sent.unitPrice, 160_000)
        XCTAssertEqual(sent.totalPrice, 160_000)
        XCTAssertEqual(sent.rentDays, 5)
    }

    func testTypingAPriceOnABlockLineIsIgnored() throws {
        let cart = Cart()
        cart.orderType = .rent
        cart.addItem(try blockLine())
        cart.updateRentalDays(at: 0, days: 3)
        cart.updatePrice(at: 0, price: 1)
        XCTAssertEqual(cart.items[0].price, 120_000)
        cart.clearPrice(at: 0)
        XCTAssertEqual(cart.items[0].price, 120_000)
    }

    func testSavedCartAndOldSavedCartDecode() throws {
        let line = try blockLine()
        let data = try JSONEncoder().encode(line)
        let back = try JSONDecoder().decode(CartItem.self, from: data)
        XCTAssertEqual(back.blockTable, table)
        // a saved cart from before #1189 has no block keys
        var dict = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        dict.removeValue(forKey: "blockTable")
        dict.removeValue(forKey: "blockCurrency")
        let old = try JSONDecoder().decode(CartItem.self, from: JSONSerialization.data(withJSONObject: dict))
        XCTAssertNil(old.blockTable)
        XCTAssertFalse(old.isBlockPricing)
    }

    func testEditedOrderLineKeepsItsStoredPriceUntilTheDaysChange() throws {
        let snapshot = try JSONDecoder().decode(BlockSnapshot.self, from: #"{"type":"BLOCK","tiers":[80000,100000,120000],"startDay":1,"extraMode":"EXTRA_PER_DAY","extraPrice":20000,"currency":"VND","days":5}"#.data(using: .utf8)!)
        var line = CartItem(productId: 7, productName: "Áo", barcode: nil, quantity: 1, price: 999, deposit: 0,
                            originalRentPrice: 999, originalSalePrice: 0)
        line.pricingType = "BLOCK"
        line.rentalDays = 5
        line.adoptSnapshot(snapshot)
        XCTAssertEqual(line.price, 999)
        line.rentalDays = 2
        XCTAssertEqual(line.price, 100_000)
        // a hand-typed price in the snapshot stays a plain price
        var typed = line
        typed.blockTable = nil
        var overridden = snapshot
        overridden.overridden = true
        typed.adoptSnapshot(overridden)
        XCTAssertFalse(typed.isBlockPricing)
    }

    func testSameDayPickupAndReturnIsOneVietnamDay() {
        let pickup = vnDay(13).startOfShopDay()
        let back = vnDay(13).endOfShopDay()
        XCTAssertEqual(CartV2Logic.rentalDays(pickup: pickup, return: back), 1)
        XCTAssertEqual(BlockPricing.rent(table, days: CartV2Logic.rentalDays(pickup: pickup, return: back)), 80_000)
        // 16:59:59Z and 17:00:00Z are two different Vietnam days
        let iso = ISO8601DateFormatter()
        let a = iso.date(from: "2026-11-09T16:59:59Z")!
        let b = iso.date(from: "2026-11-09T17:00:00Z")!
        XCTAssertEqual(CartV2Logic.rentalDays(pickup: a, return: b, timeZone: TimeZone(identifier: "Asia/Ho_Chi_Minh")!), 2)
    }

    // MARK: - Product save

    func testOptionsCarryTheBlockTableAndTheDefault() {
        let options = ProductPricing.options(perRental: 150_000, perDay: nil, defaultMode: .block, block: table)
        XCTAssertEqual(options.map { $0.type }, ["FIXED", "BLOCK"])
        XCTAssertEqual(options.map { $0.isDefault }, [false, true])
        let block = options[1]
        XCTAssertEqual(block.price, 80_000)
        XCTAssertEqual(block.blockTiers ?? [], [80_000, 100_000, 120_000])
        XCTAssertEqual(block.blockExtraMode, "EXTRA_PER_DAY")
        XCTAssertEqual(block.blockExtraPrice, 20_000)
        XCTAssertNil(options[0].blockTiers)
        // a default without a price falls to a mode that has one
        XCTAssertEqual(ProductPricing.options(perRental: nil, perDay: 5, defaultMode: .block, block: nil).map { $0.isDefault }, [true])
    }

    func testFormDataSendsSchemaVersionOnlyFromTheNewForm() throws {
        let options = ProductPricing.options(perRental: 1, perDay: nil, defaultMode: .block, block: table)
        func request(version: Int?) -> UpdateProductRequest {
            UpdateProductRequest(name: "X", description: nil, barcode: nil, rentPrice: 80_000, salePrice: nil, costPrice: nil, deposit: nil,
                                 totalStock: nil, categoryId: nil, merchantId: nil, outletStock: nil, images: nil, isActive: nil,
                                 pricingOptions: options, pricingSchemaVersion: version)
        }
        let v2 = request(version: ProductPricingSchema.version).toFormData()
        XCTAssertEqual(v2["pricingSchemaVersion"] as? Int, 2)
        let sent = try XCTUnwrap(v2["pricingOptions"] as? [[String: Any]])
        let block = try XCTUnwrap(sent.first { $0["type"] as? String == "BLOCK" })
        XCTAssertEqual(block["blockTiers"] as? [Double], [80_000, 100_000, 120_000])
        XCTAssertEqual(block["blockStartDay"] as? Int, 1)
        XCTAssertEqual(block["blockExtraMode"] as? String, "EXTRA_PER_DAY")
        XCTAssertEqual(block["blockExtraPrice"] as? Double, 20_000)
        XCTAssertNil(sent.first { $0["type"] as? String == "FIXED" }?["blockTiers"])
        XCTAssertNil(request(version: nil).toFormData()["pricingSchemaVersion"])
    }

    func testPriceScreenInputIsParsed() {
        XCTAssertEqual(BlockPricing.parse(tierTexts: ["80.000", "100.000", "120.000"], extraMode: "EXTRA_PER_DAY", extraText: "20.000"), .table(table))
        XCTAssertEqual(BlockPricing.parse(tierTexts: [""], extraMode: "EXTRA_PER_DAY", extraText: ""), .empty)
        XCTAssertEqual(BlockPricing.parse(tierTexts: ["80.000", ""], extraMode: "HOLD_LAST", extraText: ""), .invalid)
        XCTAssertEqual(BlockPricing.parse(tierTexts: ["80.000"], extraMode: "EXTRA_PER_DAY", extraText: ""), .invalid)
        XCTAssertEqual(BlockPricing.parse(tierTexts: ["80.000"], extraMode: "HOLD_LAST", extraText: "5"),
                       .table(BlockTable(tiers: [80_000], startDay: 1, extraMode: "HOLD_LAST", extraPrice: nil)))
    }

    // MARK: - #1249 Thuê theo lần + one of (Thuê theo ngày | Giá theo khối ngày), the owner's mockup

    private let oldDaily = #"{"id":1,"name":"X","rentPrice":200000,"pricingType":"DAILY","pricingOptions":[{"id":1,"type":"FIXED","price":150000,"isDefault":false,"isActive":true},{"id":2,"type":"DAILY","price":200000,"isDefault":true,"isActive":true}]}"#
    private let onlyFixed = #"{"id":1,"name":"X","rentPrice":150000,"pricingOptions":[{"id":1,"type":"FIXED","price":150000,"isDefault":true,"isActive":true}]}"#

    func testNewProductStartsOnTheDayPriceWithEmptyBoxes() {
        let draft = ProductPriceDraft(product: nil)
        XCTAssertEqual(draft.kind, .perDay)
        XCTAssertNil(draft.perRental)
        XCTAssertNil(draft.perDay)
        XCTAssertNil(draft.block)
        XCTAssertTrue(draft.options.isEmpty)
    }

    func testOpeningAProductPicksTheRightRadio() throws {
        // a table: Giá theo khối ngày
        let withTable = ProductPriceDraft(product: try product(blockProductJSON))
        XCTAssertEqual(withTable.kind, .block)
        XCTAssertEqual(withTable.block, table)
        // an old DAILY product: Thuê theo ngày with its price, never turned into a table
        let daily = ProductPriceDraft(product: try product(oldDaily))
        XCTAssertEqual(daily.kind, .perDay)
        XCTAssertEqual(daily.perDay, 200_000)
        XCTAssertEqual(daily.perRental, 150_000)
        XCTAssertNil(daily.block)
        // only Theo lần: Thuê theo ngày with an empty day box
        let once = ProductPriceDraft(product: try product(onlyFixed))
        XCTAssertEqual(once.kind, .perDay)
        XCTAssertNil(once.perDay)
        XCTAssertEqual(once.perRental, 150_000)
    }

    func testThueTheoNgaySendsFixedAndDailyAndNoBlock() {
        var draft = ProductPriceDraft(product: nil)
        draft.perRental = 150_000
        draft.perDay = 80_000
        draft.block = table
        XCTAssertEqual(draft.options.map { $0.type }, ["FIXED", "DAILY"])
        XCTAssertEqual(draft.options.map { $0.isDefault }, [true, false])
        XCTAssertEqual(draft.rentPrice, 150_000)
    }

    func testGiaTheoKhoiSendsFixedAndBlockAndNoFlatDaily() {
        var draft = ProductPriceDraft(product: nil)
        draft.perRental = 150_000
        draft.perDay = 80_000
        draft.saveTable(table)
        XCTAssertEqual(draft.kind, .block)
        XCTAssertEqual(draft.options.map { $0.type }, ["FIXED", "BLOCK"])
        XCTAssertEqual(draft.options.map { $0.isDefault }, [true, false])
        XCTAssertEqual(draft.options.last?.price, 80_000)
        XCTAssertEqual(draft.rentPrice, 150_000)
        // no Theo lần price: the table is the default and rentPrice is day 1
        draft.perRental = nil
        XCTAssertEqual(draft.options.map { $0.type }, ["BLOCK"])
        XCTAssertEqual(draft.options.map { $0.isDefault }, [true])
        XCTAssertEqual(draft.rentPrice, 80_000)
    }

    func testTheDefaultIsAlwaysTheoLanWhenItHasAPrice() {
        var draft = ProductPriceDraft(product: nil)
        draft.perRental = 0
        draft.perDay = 5
        XCTAssertEqual(draft.options.first { $0.isDefault }?.type, "FIXED")
        draft.perRental = nil
        XCTAssertEqual(draft.options.first { $0.isDefault }?.type, "DAILY")
    }

    func testSwitchingBackAndForthKeepsWhatWasTyped() {
        var draft = ProductPriceDraft(product: nil)
        draft.perDay = 80_000
        draft.saveTable(table)
        XCTAssertEqual(draft.choose(.perDay), .selected)
        XCTAssertEqual(draft.kind, .perDay)
        XCTAssertEqual(draft.perDay, 80_000)
        XCTAssertEqual(draft.block, table)
        XCTAssertEqual(draft.choose(.block), .selected)
        XCTAssertEqual(draft.kind, .block)
        XCTAssertEqual(draft.block, table)
    }

    func testChoosingBlockWithoutATableOpensSetupAndKeepsThePreviousChoice() {
        var draft = ProductPriceDraft(product: nil)
        draft.perDay = 80_000
        let before = draft
        XCTAssertEqual(draft.choose(.block), .needsSetup)
        XCTAssertEqual(draft, before)
        // saving the setup selects it; cancelling changes nothing
        draft.saveTable(table)
        XCTAssertEqual(draft.kind, .block)
    }

    func testTurningTheTableOffGoesBackToTheDayPrice() {
        var draft = ProductPriceDraft(product: nil)
        draft.perDay = 80_000
        draft.saveTable(table)
        draft.turnOffTable()
        XCTAssertEqual(draft.kind, .perDay)
        XCTAssertNil(draft.block)
        XCTAssertEqual(draft.perDay, 80_000)
        XCTAssertEqual(draft.options.map { $0.type }, ["DAILY"])
    }

    func testQuickTableBuildsRowsFromTheFirstDayAndTheExtraDay() throws {
        let quick = try XCTUnwrap(BlockPricing.quickTable(firstDay: 80_000, extraPerDay: 20_000, days: 3))
        XCTAssertEqual(quick, table)
        XCTAssertEqual(BlockPricing.rent(quick, days: 5), 160_000)
        XCTAssertNil(BlockPricing.quickTable(firstDay: 80_000, extraPerDay: 20_000, days: 0))
        XCTAssertNil(BlockPricing.quickTable(firstDay: 80_000, extraPerDay: 20_000, days: 32))
        XCTAssertNil(BlockPricing.quickTable(firstDay: -1, extraPerDay: 20_000, days: 3))
    }

    func testCopyTakesOnlyTheTableOfAnotherProduct() throws {
        XCTAssertEqual(ProductPricing.block(try product(blockProductJSON)), table)
        XCTAssertNil(ProductPricing.block(try product(oldDaily)))
    }

    // MARK: - Header and errors

    func testEveryRequestHeaderSetSaysBlockPricing() {
        XCTAssertEqual(BaseService.jsonHeader.value(for: "X-Client-Capabilities"), "installments, block-pricing")
        XCTAssertEqual(BaseService.formHeader.value(for: "X-Client-Capabilities"), "installments, block-pricing")
    }

    func testPriceMismatchKeepsItsCodeAndShowsASentence() throws {
        let response = try JSONDecoder.shared.decode(APIErrorResponse.self, from: #"{"success":false,"code":"BLOCK_PRICE_MISMATCH","message":"x"}"#.data(using: .utf8)!)
        let error = response.toNSError(httpStatusCode: 400)
        XCTAssertTrue(BlockPricingError.isPriceMismatch(error))
        XCTAssertNotEqual(error.localizedDescription, "BLOCK_PRICE_MISMATCH")
        XCTAssertFalse(error.localizedDescription.isEmpty)
        for code in ["BLOCK_TABLE_INVALID", "PRICING_TYPE_REQUIRES_UPDATE", "BLOCK_PRICE_MISMATCH"] {
            XCTAssertNotNil(APIErrorText.message(forCode: code), code)
        }
    }
}
