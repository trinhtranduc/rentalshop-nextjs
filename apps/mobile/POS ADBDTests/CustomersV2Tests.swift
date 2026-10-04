import XCTest
@testable import POS_ADBD

/// #387 — phone duplicate, name split / payload, search stale-drop, list + detail parsing, initials, row and tiles
final class CustomersV2Tests: XCTestCase {

    private func customer(_ json: String) throws -> Customer {
        try JSONDecoder.shared.decode(Customer.self, from: json.data(using: .utf8)!)
    }

    // MARK: - Initials and names

    func testInitialsUseTheLastTwoWords() {
        XCTAssertEqual(CustomersV2Logic.initials("Nguyễn Thị Lan"), "TL")
        XCTAssertEqual(CustomersV2Logic.initials("Trần Minh"), "TM")
        XCTAssertEqual(CustomersV2Logic.initials("minh"), "M")
        XCTAssertEqual(CustomersV2Logic.initials("  "), "?")
        XCTAssertEqual(CustomersV2Logic.initials("—"), "?")
    }

    func testDisplayNameFallsBackToPhone() throws {
        XCTAssertEqual(CustomersV2Logic.displayName(try customer(#"{"id":1,"firstName":"Nguyễn","lastName":"Thị Lan"}"#)), "Nguyễn Thị Lan")
        XCTAssertEqual(CustomersV2Logic.displayName(try customer(#"{"id":2,"firstName":" ","phone":"0901"}"#)), "0901")
    }

    // MARK: - Name split and payload

    func testNameSplitMatchesTheCurrentForm() {
        XCTAssertEqual(CustomersV2Logic.splitName("Nguyễn Thị Lan").firstName, "Nguyễn")
        XCTAssertEqual(CustomersV2Logic.splitName("Nguyễn Thị Lan").lastName, "Thị Lan")
        XCTAssertEqual(CustomersV2Logic.splitName("  Lan  ").firstName, "Lan")
        XCTAssertEqual(CustomersV2Logic.splitName("  Lan  ").lastName, "")
        XCTAssertEqual(CustomersV2Logic.splitName("Trần   Văn  Minh").lastName, "Văn Minh")
    }

    func testCreatePayloadSendsOnlyFilledFields() {
        let full = CustomersV2Logic.createPayload(name: "Nguyễn Thị Lan", phone: " 0901 234 567 ", note: "size M")
        XCTAssertEqual(full["firstName"] as? String, "Nguyễn")
        XCTAssertEqual(full["lastName"] as? String, "Thị Lan")
        XCTAssertEqual(full["phone"] as? String, "0901 234 567")
        XCTAssertEqual(full["notes"] as? String, "size M")
        XCTAssertEqual(full.count, 4)

        let short = CustomersV2Logic.createPayload(name: "Lan", phone: "0901234567", note: "  ")
        XCTAssertEqual(Set(short.keys), ["firstName", "phone"])
    }

    func testValidationNeedsPhoneThenName() {
        XCTAssertEqual(CustomersV2Logic.validate(name: "Lan", phone: " - "), .missingPhone)
        XCTAssertEqual(CustomersV2Logic.validate(name: " ", phone: "0901"), .missingName)
        XCTAssertNil(CustomersV2Logic.validate(name: "Lan", phone: "0901"))
    }

    // MARK: - Phone duplicate

    func testDuplicateMatchesSameDigitsOnly() throws {
        let spaced = try customer(#"{"id":7,"firstName":"Lan","phone":"0901 234 567"}"#)
        let longer = try customer(#"{"id":8,"firstName":"Minh","phone":"0901234567 8"}"#)
        let none = try customer(#"{"id":9,"firstName":"Huy"}"#)
        // The search matches substrings; only the same digits count as the same phone
        XCTAssertEqual(CustomersV2Logic.duplicate(of: "0901-234-567", in: [longer, none, spaced])?.id, 7)
        XCTAssertNil(CustomersV2Logic.duplicate(of: "090123456", in: [spaced, longer]))
        XCTAssertNil(CustomersV2Logic.duplicate(of: "", in: [none]))
    }

    func testNewCustomerFlowOffersTheExistingCustomer() throws {
        let source = FakeSource()
        source.pages["0901234567"] = CustomersV2Page(customers: [try customer(#"{"id":7,"firstName":"Lan","phone":"0901 234 567"}"#)], total: 1, hasMore: false)
        let flow = NewCustomerFlow(dataSource: source)
        let done = expectation(description: "outcome")
        flow.submit(name: "Lan B", phone: "0901 234 567", note: nil) { outcome in
            if case .existing(let found) = outcome { XCTAssertEqual(found.id, 7) } else { XCTFail("expected existing") }
            done.fulfill()
        }
        wait(for: [done], timeout: 1)
        XCTAssertTrue(source.created.isEmpty, "no duplicate is created")
    }

    func testNewCustomerFlowCreatesWhenThePhoneIsFree() {
        let source = FakeSource()
        let flow = NewCustomerFlow(dataSource: source)
        let done = expectation(description: "outcome")
        flow.submit(name: "Nguyễn Thị Lan", phone: "0909", note: "VIP") { outcome in
            if case .created(let created) = outcome { XCTAssertEqual(created.firstName, "Nguyễn") } else { XCTFail("expected created") }
            done.fulfill()
        }
        wait(for: [done], timeout: 1)
        XCTAssertEqual(source.queries, ["0909"])
        XCTAssertEqual(source.created.first?["lastName"] as? String, "Thị Lan")
        XCTAssertEqual(source.created.first?["notes"] as? String, "VIP")
    }

    // MARK: - Search stale-drop

    func testAnOlderSearchAnswerIsDropped() throws {
        let source = FakeSource()
        source.holdAnswers = true
        let viewModel = CustomersV2ListViewModel(dataSource: source)
        viewModel.setQuery("lan")
        viewModel.setQuery("minh")
        XCTAssertEqual(source.pending.count, 2)
        // Newer answer first, then the older one: the list keeps the newer
        source.pending[1](CustomersV2Page(customers: [try customer(#"{"id":2,"firstName":"Minh"}"#)], total: 1, hasMore: false))
        source.pending[0](CustomersV2Page(customers: [try customer(#"{"id":1,"firstName":"Lan"}"#)], total: 9, hasMore: true))
        let settled = expectation(description: "main queue")
        DispatchQueue.main.async { settled.fulfill() }
        wait(for: [settled], timeout: 1)
        XCTAssertEqual(viewModel.customers.map { $0.id }, [2])
        XCTAssertEqual(viewModel.total, 1)
        XCTAssertFalse(viewModel.hasMore)
    }

    // MARK: - Parsing

    func testListPageParsesWithMissingOptionalFields() throws {
        let json = """
        {"success":true,"data":{"customers":[
          {"id":60,"firstName":"Heather","lastName":"Robinson","phone":"+1-555-1029","orderCount":2,
           "loyaltyStatus":"active","loyalty":{"points":10,"totalEarned":10,"totalRedeemed":0,"totalSpent":5,"totalOrders":2,
           "tier":{"id":1,"name":"Vàng","color":null,"icon":null,"multiplier":1}}},
          {"id":61,"firstName":"Bare"}
        ]}}
        """
        let response = try JSONDecoder.shared.decode(CustomersV2PageResponse.self, from: json.data(using: .utf8)!)
        let page = try XCTUnwrap(response.data)
        XCTAssertEqual(page.customers.count, 2)
        XCTAssertEqual(page.total, 2, "missing total falls back to the row count")
        XCTAssertFalse(page.hasMore)
        XCTAssertEqual(CustomersV2Logic.tierName(page.customers[0]), "Vàng")
        XCTAssertEqual(page.customers[0].orderCount, 2)
        XCTAssertNil(CustomersV2Logic.tierName(page.customers[1]))
        XCTAssertEqual(page.customers[1].orderCount, 0)
    }

    func testTierHiddenWhenLoyaltyIsOff() throws {
        let off = try customer(#"{"id":1,"firstName":"A","loyaltyStatus":"inactive","loyalty":{"points":0,"totalEarned":0,"totalRedeemed":0,"totalSpent":0,"totalOrders":0,"tier":{"id":1,"name":"Bạc"}}}"#)
        XCTAssertNil(CustomersV2Logic.tierName(off))
    }

    func testDetailParsesSummaryAndRows() throws {
        let json = """
        {"success":true,"data":{"orders":[
          {"id":126,"orderNumber":"148148","orderType":"RENT","status":"PICKUPED","totalAmount":700000,
           "pickupPlanAt":"2026-10-03T03:00:00.000Z","returnPlanAt":"2026-10-05T10:00:00.000Z",
           "createdAt":"2026-10-01T03:08:06.097Z","_count":{"orderItems":2}},
          {"id":127,"status":"SOMETHING_NEW"}
        ],"total":12,"summary":{"totalOrders":12,"totalAmount":8450000},
        "customer":{"id":60,"firstName":"Lan","phone":"0901234567","loyaltyStatus":"inactive","loyalty":null}}}
        """
        let data = try XCTUnwrap(try JSONDecoder.shared.decode(CustomerOrdersV2Response.self, from: json.data(using: .utf8)!).data)
        XCTAssertEqual(data.totalOrders, 12)
        XCTAssertEqual(data.totalAmount, 8_450_000)
        XCTAssertEqual(data.customer?.phone, "0901234567")
        XCTAssertEqual(data.orders.count, 2)
        let first = data.orders[0]
        XCTAssertEqual(first.status, .pickuped)
        XCTAssertEqual(first.orderType, .rent)
        XCTAssertEqual(first.itemCount, 2)
        XCTAssertNotNil(first.pickupPlanAt)
        let bare = data.orders[1]
        XCTAssertEqual(bare.orderNumber, "127")
        XCTAssertEqual(bare.status, .unknown)
        XCTAssertEqual(bare.totalAmount, 0)
        XCTAssertEqual(bare.itemCount, 0)
        XCTAssertNil(bare.pickupPlanAt)
    }

    func testDetailWithoutSummaryUsesTotal() throws {
        let json = #"{"success":true,"data":{"orders":[],"total":3}}"#
        let data = try XCTUnwrap(try JSONDecoder.shared.decode(CustomerOrdersV2Response.self, from: json.data(using: .utf8)!).data)
        XCTAssertEqual(data.totalOrders, 3)
        XCTAssertEqual(data.totalAmount, 0)
        XCTAssertNil(data.customer)
    }

    // MARK: - Row and tile formatting

    func testRowSubtitleMasksThePhone() {
        let orders = String(format: "customers.v2.orders".localized(), 12)
        XCTAssertEqual(CustomersV2Logic.subtitle(phone: "0901234099", orderCount: 12), "09xxxx099 · \(orders)")
        XCTAssertEqual(CustomersV2Logic.subtitle(phone: nil, orderCount: 12), orders)
        XCTAssertEqual(CustomersV2Logic.subtitle(phone: "  ", orderCount: 12), orders)
    }

    func testTilesFormatMoneyAndHideItForStaff() {
        let tiles = CustomersV2Logic.tiles(totalOrders: 12, totalAmount: 8_450_000, renting: 1, hidesMoney: false)
        XCTAssertEqual(tiles.map(\.value), ["12", MoneyFormatter.format(8_450_000), "1"])
        let hidden = CustomersV2Logic.tiles(totalOrders: 12, totalAmount: 8_450_000, renting: nil, hidesMoney: true)
        XCTAssertEqual(hidden.map(\.value), ["12", "—", "—"])
    }

    func testOrderRowTitleAndDates() {
        let utc = TimeZone(identifier: "UTC")!
        let vn = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
        let pickup = CustomersV2Logic.date("2026-10-03T03:00:00.000Z")!
        let ret = CustomersV2Logic.date("2026-10-05T10:00:00.000Z")!
        let rent = CustomerOrderRow(id: 1, orderNumber: "ORD-1-57", orderType: .rent, status: .pickuped, totalAmount: 1,
                                    pickupPlanAt: pickup, returnPlanAt: ret, createdAt: nil, itemCount: 2)
        XCTAssertEqual(CustomersV2Logic.orderTitle(rent), "#ORD-1-57 · " + String(format: "customers.v2.items".localized(), 2))
        XCTAssertEqual(CustomersV2Logic.orderDates(rent, timeZone: vn),
                       DayFormatter.short(pickup, timeZone: vn) + " → " + DayFormatter.short(ret, timeZone: vn))
        // Same civil day: one date. 16:59Z is 23:59 in Vietnam, still 3 Oct; in UTC it is 3 Oct too.
        let sameDay = CustomerOrderRow(id: 2, orderNumber: "2", orderType: .rent, status: .reserved, totalAmount: 0,
                                       pickupPlanAt: pickup, returnPlanAt: CustomersV2Logic.date("2026-10-03T16:59:59Z"),
                                       createdAt: nil, itemCount: 1)
        XCTAssertEqual(CustomersV2Logic.orderDates(sameDay, timeZone: vn), DayFormatter.short(pickup, timeZone: vn))
        XCTAssertEqual(CustomersV2Logic.orderDates(sameDay, timeZone: utc), DayFormatter.short(pickup, timeZone: utc))
        let sale = CustomerOrderRow(id: 3, orderNumber: "3", orderType: .sale, status: .completed, totalAmount: 0,
                                    pickupPlanAt: nil, returnPlanAt: nil, createdAt: ret, itemCount: 1)
        XCTAssertEqual(CustomersV2Logic.orderDates(sale, timeZone: vn), DayFormatter.short(ret, timeZone: vn))
    }

    // MARK: - Fake

    private final class FakeSource: CustomersV2DataSource {
        var pages: [String: CustomersV2Page] = [:]
        var queries: [String?] = []
        var created: [[String: Any]] = []
        var holdAnswers = false
        var pending: [(CustomersV2Page) -> Void] = []

        func loadCustomers(query: String?, page: Int, limit: Int, completion: @escaping (CustomersV2Page?, NSError?) -> Void) {
            queries.append(query)
            if holdAnswers {
                pending.append { completion($0, nil) }
                return
            }
            completion(pages[query ?? ""] ?? CustomersV2Page(customers: [], total: 0, hasMore: false), nil)
        }

        func createCustomer(_ params: [String: Any], completion: @escaping (Customer?, NSError?) -> Void) {
            created.append(params)
            var customer = Customer()
            customer.id = 99
            customer.firstName = params["firstName"] as? String
            completion(customer, nil)
        }

        func loadOrders(customerId: Int, limit: Int, completion: @escaping (CustomerOrdersV2?, NSError?) -> Void) {
            completion(nil, nil)
        }

        func countRenting(customerId: Int, completion: @escaping (Int?) -> Void) {
            completion(nil)
        }
    }
}
