import XCTest
@testable import POS_ADBD

/// #1621 "Theo khối giờ": the money examples the owner confirmed (Váy 2 giờ 150.000 · 4 giờ 250.000 · 8 giờ 400.000,
/// Vest 2 giờ 80.000 · 8 giờ 200.000), the product payload, the cart sheet rows, the order line and the edit flow
final class HourBlocksTests: XCTestCase {

    private func product(_ json: String) throws -> Product {
        try JSONDecoder.shared.decode(Product.self, from: Data(json.utf8))
    }

    /// Blocks arrive in any order; a block is never the default
    private let vayJSON = #"{"id":7,"name":"Váy cưới trắng","rentPrice":500000,"pricingType":"FIXED","pricingOptions":[{"id":11,"type":"FIXED","price":500000,"isDefault":true,"isActive":true},{"id":12,"type":"HOURLY","price":250000,"unit":"HOUR","blockSize":4,"isDefault":false,"isActive":true},{"id":13,"type":"HOURLY","price":150000,"unit":"HOUR","blockSize":2,"isDefault":false,"isActive":true},{"id":14,"type":"HOURLY","price":400000,"unit":"HOUR","blockSize":8,"isDefault":false,"isActive":true}]}"#
    private let vestJSON = #"{"id":8,"name":"Vest nam đen","rentPrice":250000,"pricingType":"FIXED","pricingOptions":[{"id":21,"type":"FIXED","price":250000,"isDefault":true,"isActive":true},{"id":22,"type":"HOURLY","price":80000,"unit":"HOUR","blockSize":2,"isDefault":false,"isActive":true},{"id":23,"type":"HOURLY","price":200000,"unit":"HOUR","blockSize":8,"isDefault":false,"isActive":true}]}"#

    private func line(_ json: String, qty: Int = 1) throws -> CartItem {
        let p = try product(json)
        return CartItem(from: p, quantity: qty, price: p.rentPrice ?? 0)
    }

    private func onBlock(_ json: String, optionId: Int, qty: Int = 1) throws -> CartItem {
        var item = try line(json, qty: qty)
        item.selectPricingType(CartPricingChoice.hourKey(optionId: optionId, hours: 0))
        return item
    }

    // MARK: - Product

    func testHourOptionsDecodeAsBlocksShortestFirstAndNeverDefault() throws {
        let p = try product(vayJSON)
        XCTAssertEqual(ProductPricing.hourBlocks(p), [HourBlock(hours: 2, price: 150_000), HourBlock(hours: 4, price: 250_000),
                                                      HourBlock(hours: 8, price: 400_000)])
        XCTAssertEqual(ProductPricing.defaultMode(p), .perRental)
        XCTAssertEqual(ProductPricing.perRental(p), 500_000)
        XCTAssertNil(ProductPricing.perDay(p))
        XCTAssertEqual(ProductRowLogic.price(p)?.main, 500_000)
        // an old "per hour" price (HOURLY without hours) is not a block, and an app without blocks decodes as before
        let old = try product(#"{"id":1,"name":"Áo","pricingOptions":[{"id":1,"type":"FIXED","price":1,"isDefault":true},{"id":2,"type":"HOURLY","price":50000,"isDefault":false}]}"#)
        XCTAssertTrue(ProductPricing.hourBlocks(old).isEmpty)
        let off = try product(#"{"id":1,"name":"Áo","pricingOptions":[{"id":2,"type":"HOURLY","price":5,"blockSize":4,"isActive":false},{"id":3,"type":"HOURLY","price":5,"blockSize":25}]}"#)
        XCTAssertTrue(ProductPricing.hourBlocks(off).isEmpty, "inactive or more than 24 hours")
    }

    func testFormSendsEveryBlockAfterTheOtherPricesNeverAsDefault() throws {
        var draft = ProductPriceDraft(product: try product(vayJSON))
        XCTAssertEqual(draft.hourBlocks.map(\.hours), [2, 4, 8])
        let sent = draft.options
        XCTAssertEqual(sent.map(\.type), ["FIXED", "HOURLY", "HOURLY", "HOURLY"])
        XCTAssertEqual(sent.filter(\.isDefault).map(\.type), ["FIXED"])
        XCTAssertEqual(sent.compactMap(\.blockSize), [2, 4, 8])
        XCTAssertEqual(sent.dropFirst().map(\.price), [150_000, 250_000, 400_000])
        let dict = sent[2].formDictionary
        XCTAssertEqual(dict["type"] as? String, "HOURLY")
        XCTAssertEqual(dict["unit"] as? String, "HOUR")
        XCTAssertEqual(dict["blockSize"] as? Int, 4)
        XCTAssertEqual(dict["isDefault"] as? Bool, false)
        XCTAssertNil(sent[0].formDictionary["blockSize"], "no block fields on FIXED")
        XCTAssertEqual(draft.rentPrice, 500_000)

        draft.saveHourBlocks([HourBlock(hours: 8, price: 1), HourBlock(hours: 3, price: 0)])
        XCTAssertEqual(draft.options.compactMap(\.blockSize), [3, 8], "sorted; 0đ is a price")
        draft.turnOffHourBlocks()
        XCTAssertEqual(draft.options.map(\.type), ["FIXED"], "turned off: no HOURLY row, the API drops the stored ones")
    }

    func testBlocksNeedAnotherPrice() {
        func issues(perRental: Double?, perDay: Double?, block: BlockTable? = nil, showsPrices: Bool = true) -> [ProductFormIssue] {
            ProductFormValidator.validate(ProductFormInput(name: "Váy", perRental: perRental, perDay: perDay, defaultMode: .perRental,
                                                           block: block, hourBlocks: [HourBlock(hours: 2, price: 150_000)],
                                                           salePrice: nil, deposit: nil, quantity: 1, rented: 0, photoCount: 0,
                                                           showsPrices: showsPrices))
        }
        XCTAssertEqual(issues(perRental: nil, perDay: nil), [.hourBlocksNeedPrice])
        XCTAssertEqual(issues(perRental: 500_000, perDay: nil), [])
        XCTAssertEqual(issues(perRental: nil, perDay: 0), [], "0đ per day is a price")
        XCTAssertEqual(issues(perRental: nil, perDay: nil, block: BlockTable(tiers: [80_000])), [])
        XCTAssertEqual(issues(perRental: nil, perDay: nil, showsPrices: false), [], "staff never see prices")
        XCTAssertFalse(ProductFormIssue.hourBlocksNeedPrice.message.contains("products.form"))
    }

    func testSetupScreenRows() {
        XCTAssertEqual(HourBlocks.parse(rows: [("8", "400.000"), ("", ""), ("2", "150.000"), ("4", "250.000")]),
                       .blocks([HourBlock(hours: 2, price: 150_000), HourBlock(hours: 4, price: 250_000), HourBlock(hours: 8, price: 400_000)]))
        XCTAssertEqual(HourBlocks.parse(rows: [("", ""), ("", "")]), .empty)
        XCTAssertEqual(HourBlocks.parse(rows: [("1", "0"), ("24", "1")]), .blocks([HourBlock(hours: 1, price: 0), HourBlock(hours: 24, price: 1)]))
        for bad in ["0", "25", "x", "1.5"] {
            XCTAssertEqual(HourBlocks.parse(rows: [(bad, "100")]), .invalid(.hours), bad)
        }
        XCTAssertEqual(HourBlocks.parse(rows: [("", "100.000")]), .invalid(.hours))
        XCTAssertEqual(HourBlocks.parse(rows: [("4", "")]), .invalid(.price))
        XCTAssertEqual(HourBlocks.parse(rows: [("4", "1"), ("4", "2")]), .invalid(.repeated))
        XCTAssertEqual(HourBlocks.parse(rows: (1...11).map { (String($0), "1") }), .invalid(.tooMany))
        for issue in [HourBlocksIssue.hours, .repeated, .price, .tooMany] {
            XCTAssertFalse(issue.message.hasPrefix("hourBlock."), "\(issue) has its text")
        }
    }

    func testTexts() {
        let blocks = [HourBlock(hours: 2, price: 150_000), HourBlock(hours: 4, price: 250_000), HourBlock(hours: 8, price: 400_000)]
        XCTAssertEqual(HourBlocks.label(hours: 4), String(format: "hourBlock.label".localized(), 4))
        XCTAssertTrue(HourBlocks.label(hours: 4).contains("4"))
        XCTAssertEqual(HourBlocks.rowSummary(blocks), String(format: "hourBlock.summary".localized(), 3, "2 · 4 · 8"))
        XCTAssertEqual(HourBlocks.rowSummary([blocks[0]]), String(format: "hourBlock.summary.one".localized(), 1, "2"))
        XCTAssertEqual(HourBlocks.rangeSummary(blocks, currency: .vnd), "150.000 – 400.000")
        XCTAssertEqual(HourBlocks.rangeSummary([blocks[1]], currency: .vnd), "250.000")
        XCTAssertEqual(HourBlocks.detailSummary(Array(blocks.prefix(2)), currency: .vnd),
                       String(format: "hourBlock.detail".localized(), 2, "150.000đ") + " · " + String(format: "hourBlock.detail".localized(), 4, "250.000đ"))
        for key in ["products.form.perHourBlock", "hourBlock.title", "hourBlock.save", "hourBlock.turnOff", "hourBlock.add"] {
            XCTAssertNotEqual(key.localized(), key, key)
        }
    }

    // MARK: - Cart (owner's money examples)

    func testSheetListsEachBlockByOptionId() throws {
        let item = try line(vayJSON)
        let choices = CartV2Logic.pricingChoices(item)
        XCTAssertEqual(choices.map(\.key), ["FIXED", "DAILY", "HOURLY:13", "HOURLY:12", "HOURLY:14"])
        XCTAssertEqual(choices.map(\.catalogPrice), [500_000, nil, 150_000, 250_000, 400_000])
        XCTAssertEqual(choices.map { CartV2Logic.choiceLabel($0) }.suffix(3), [2, 4, 8].map { HourBlocks.label(hours: $0) })
        XCTAssertEqual(CartV2Logic.currentChoiceKey(item), "FIXED", "a new line takes the product's default, never a block")
        XCTAssertEqual(CartV2Logic.startPrice(item, type: "HOURLY:12"), 250_000)
        // a product without blocks: the sheet as before
        let plain = try line(#"{"id":1,"name":"Áo","pricingOptions":[{"id":1,"type":"FIXED","price":300000,"isDefault":true}]}"#)
        XCTAssertEqual(CartV2Logic.pricingChoices(plain).map(\.key), ["FIXED", "DAILY"])
    }

    func testABlockIsChargedOnceWhateverTheDays() throws {
        var vay = try onBlock(vayJSON, optionId: 12)
        XCTAssertTrue(vay.isHourBlock)
        XCTAssertEqual(vay.pricingType, "HOURLY")
        XCTAssertEqual(vay.hourBlockHours, 4)
        XCTAssertEqual(vay.price, 250_000)
        XCTAssertEqual(CartV2Logic.currentChoiceKey(vay), "HOURLY:12")
        XCTAssertEqual(vay.requestPricingType, "HOURLY")
        XCTAssertEqual(vay.requestPricingOptionId, 12)
        vay.rentalDays = 3
        XCTAssertEqual(vay.subTotal(for: .rent), 250_000, "3-day order on Khối 4 giờ = 250.000")
        XCTAssertEqual(CartV2Logic.chip(vay, orderType: .rent).label, HourBlocks.label(hours: 4))
        XCTAssertEqual(CartV2Logic.chip(vay, orderType: .rent).price, "250.000đ")
        XCTAssertEqual(try onBlock(vayJSON, optionId: 13).subTotal(for: .rent), 150_000)
        XCTAssertEqual(try onBlock(vestJSON, optionId: 22, qty: 2).subTotal(for: .rent), 160_000, "Vest 2 giờ × 2")
        let preview = CartV2Logic.pricePreview(type: "HOURLY:12", price: 250_000, days: 3, quantity: 1, orderType: .rent, hours: 4)
        XCTAssertEqual(preview.text, HourBlocks.label(hours: 4) + " × 1")
        XCTAssertEqual(preview.total, 250_000)
    }

    func testCartOfVayAndVestIs330000AndSendsTheBlocks() throws {
        let cart = Cart()
        cart.orderType = .rent
        cart.addItem(try line(vayJSON))
        cart.addItem(try line(vestJSON))
        // what "Áp dụng" of the sheet does (CartStore.applyLinePricing): the row's key, then the price in the box
        cart.selectPricingType(at: 0, type: "HOURLY:12")
        cart.updatePrice(at: 0, price: 250_000)
        cart.selectPricingType(at: 1, type: "HOURLY:22")
        cart.updatePrice(at: 1, price: 80_000)
        XCTAssertEqual(cart.items.map { $0.subTotal(for: .rent) }, [250_000, 80_000])
        XCTAssertEqual(cart.totalAmount, 330_000)
        cart.customer = Customer()
        cart.customer?.customer_id = 3
        let sent = cart.toCreateOrderRequest().orderItems
        XCTAssertEqual(sent.map(\.pricingType), ["HOURLY", "HOURLY"])
        XCTAssertEqual(sent.map(\.pricingOptionId), [12, 22])
        XCTAssertEqual(sent.map(\.unitPrice), [250_000, 80_000])
        XCTAssertEqual(sent.map(\.totalPrice), [250_000, 80_000])
    }

    func testPriceForThisOrderAndSwitchingBack() throws {
        var vay = try onBlock(vayJSON, optionId: 12)
        vay.setCustomRentalPrice(200_000)
        XCTAssertEqual(vay.subTotal(for: .rent), 200_000, "Giá cho đơn này")
        XCTAssertEqual(CartV2Logic.startPrice(vay, type: "HOURLY:12"), 200_000)
        vay.clearCustomRentalPrice()
        XCTAssertEqual(vay.price, 250_000, "an empty box goes back to the block's price")
        vay.selectPricingType("HOURLY:14")
        XCTAssertEqual(vay.hourBlockHours, 8)
        XCTAssertEqual(vay.price, 400_000)
        vay.selectPricingType("FIXED")
        XCTAssertFalse(vay.isHourBlock)
        XCTAssertNil(vay.hourBlockHours)
        XCTAssertEqual(vay.price, 500_000)
        XCTAssertEqual(vay.requestPricingOptionId, 11)
        XCTAssertEqual(CartV2Logic.pricingChoices(vay).count, 5, "no extra row for the way back")
        let restored = try JSONDecoder().decode(CartItem.self, from: JSONEncoder().encode(try onBlock(vayJSON, optionId: 12)))
        XCTAssertEqual(restored.hourBlockHours, 4, "a saved cart keeps its block")
        XCTAssertTrue(restored.isHourBlock)
    }

    // MARK: - Order lines and editing

    private func orderJSON(items: String) -> String {
        #"{"id":1,"orderNumber":"482913","orderType":"RENT","status":"RESERVED","createdAt":"2026-11-14T03:00:00.000Z","updatedAt":"2026-11-14T03:00:00.000Z","customerName":"Lan","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B","totalAmount":330000,"orderItems":["# + items + #"]}"#
    }

    private let vayLine = #"{"id":1,"quantity":1,"unitPrice":250000,"totalPrice":250000,"productId":7,"productName":"Váy cưới trắng","rentalDays":1,"pricingType":"HOURLY","pricingOptionId":12,"pricingSnapshot":{"type":"HOURLY","hours":4,"price":250000}}"#

    func testOrderLineReadsItsBlock() throws {
        let item = try JSONDecoder.shared.decode(OrderItem.self, from: Data(vayLine.utf8))
        XCTAssertEqual(item.hourBlockSnapshot, HourBlockSnapshot(hours: 4, price: 250_000))
        XCTAssertNil(item.pricingSnapshot, "not a day-block table")
        XCTAssertEqual(item.hourBlockLabel, HourBlocks.label(hours: 4))
        XCTAssertEqual(item.pricingLines?.summary, HourBlocks.label(hours: 4))
        XCTAssertNil(item.pricingLines?.formula)
        XCTAssertEqual(item.detailLines(orderType: .rent).line, HourBlocks.label(hours: 4) + " · 1 × 250.000đ")
        let again = try JSONDecoder.shared.decode(OrderItem.self, from: JSONEncoder().encode(item))
        XCTAssertEqual(again.hourBlockSnapshot, item.hourBlockSnapshot)
        // an old "per hour" line or an odd snapshot reads as before
        for odd in [#"{"type":"HOURLY","hours":30,"price":1}"#, #"{"type":"BLOCK","hours":4,"price":1}"#, #"{"x":1}"#] {
            let json = #"{"id":1,"quantity":1,"unitPrice":1,"totalPrice":1,"productName":"Áo","pricingType":"HOURLY","pricingSnapshot":"# + odd + "}"
            let decoded = try JSONDecoder.shared.decode(OrderItem.self, from: Data(json.utf8))
            XCTAssertNil(decoded.hourBlockLabel, odd)
            XCTAssertEqual(decoded.detailLines(orderType: .rent).line, "1 × 1đ")
        }
    }

    func testEditingAnOrderKeepsTheBlock() throws {
        let order = try JSONDecoder.shared.decode(Order.self, from: Data(orderJSON(items: vayLine).utf8))
        let cart = Cart.fromOrder(order)
        let vay = cart.items[0]
        XCTAssertTrue(vay.isHourBlock)
        XCTAssertEqual(CartV2Logic.currentChoiceKey(vay), "HOURLY:12")
        XCTAssertEqual(CartV2Logic.pricingChoices(vay).map(\.key), ["FIXED", "DAILY", "HOURLY:12"], "its own block before the product loads")
        let sent = try XCTUnwrap(cart.toUpdateOrderRequest().orderItems?.first)
        XCTAssertEqual(sent.pricingType, "HOURLY")
        XCTAssertEqual(sent.pricingOptionId, 12)
        XCTAssertEqual(sent.unitPrice, 250_000)
        XCTAssertEqual(sent.totalPrice, 250_000)
        // the product loads: every block becomes a row, the line stays on its own
        cart.refreshPricing(from: try product(vayJSON))
        XCTAssertEqual(CartV2Logic.pricingChoices(cart.items[0]).map(\.key), ["FIXED", "DAILY", "HOURLY:13", "HOURLY:12", "HOURLY:14"])
        XCTAssertEqual(CartV2Logic.currentChoiceKey(cart.items[0]), "HOURLY:12")
    }

    func testABlockGoneFromTheProductStaysOnItsLine() throws {
        // the option was deleted (the API set `pricingOptionId` to null); the snapshot keeps "Khối 4 giờ"
        let gone = vayLine.replacingOccurrences(of: #""pricingOptionId":12,"#, with: "")
        var vay = Cart.fromOrder(try JSONDecoder.shared.decode(Order.self, from: Data(orderJSON(items: gone).utf8))).items[0]
        XCTAssertEqual(CartV2Logic.currentChoiceKey(vay), "HOURLY:H4")
        XCTAssertEqual(CartV2Logic.pricingChoices(vay).last?.key, "HOURLY:H4")
        vay.selectPricingType("FIXED")
        XCTAssertFalse(vay.isHourBlock)
        vay.selectPricingType("HOURLY:H4")
        XCTAssertTrue(vay.isHourBlock, "and back")
        XCTAssertEqual(vay.price, 250_000)
        XCTAssertNil(vay.requestPricingOptionId, "the API keeps the stored snapshot")
    }

    // MARK: - Header and errors

    func testEveryRequestSaysHourBlocks() {
        for header in [BaseService.jsonHeader, BaseService.formHeader] {
            let tokens = (header.value(for: "X-Client-Capabilities") ?? "")
                .components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces) }
            XCTAssertTrue(tokens.contains("hour-blocks"), "hour-blocks is in \(tokens)")
        }
        XCTAssertNotNil(APIErrorText.message(forCode: "HOUR_BLOCKS_INVALID"))
    }
}
