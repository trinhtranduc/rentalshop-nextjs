import XCTest
@testable import POS_ADBD

/// #371 — orders tab: today's work, late days, sale day groups, stale search
final class OrdersHomeTests: XCTestCase {
    private let vietnam = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
    private let utc = TimeZone(identifier: "UTC")!
    private let iso = ISO8601DateFormatter()

    private func decodeWork(_ json: String) throws -> TodayWork {
        try JSONDecoder.shared.decode(TodayWork.self, from: Data(json.utf8))
    }

    private func row(_ id: Int, lateDays: Int = 0) -> String {
        """
        {"id":\(id),"orderNumber":"ORD-1-\(id)","customerName":"Lan","customerPhone":"0901234099",
         "pickupPlanAt":"2026-10-03T02:00:00.000Z","returnPlanAt":"2026-10-05T02:00:00.000Z",
         "isReadyToDeliver":false,"productNames":"Áo dài","amountDue":500000,"refundDue":0,"lateDays":\(lateDays),
         "items":[{"name":"Áo dài đỏ","quantity":2}]}
        """
    }

    // MARK: Decoding and sections

    func testTodayWorkGroupsLateFirstThenTodayThenTomorrow() throws {
        let work = try decodeWork("""
        {"date":"2026-10-04",
         "pickupsToday":{"count":1,"orders":[\(row(1))]},
         "returnsToday":{"count":0,"orders":[]},
         "overdueReturns":{"count":1,"orders":[\(row(2, lateDays: 1))]},
         "noShows":{"count":1,"orders":[\(row(3, lateDays: 4))]},
         "tomorrowPickups":{"count":0,"orders":[]},
         "tomorrowReturns":{"count":1,"orders":[\(row(4))]}}
        """)
        let sections = OrdersHomeLogic.todaySections(from: work)
        XCTAssertEqual(sections.count, 3)
        XCTAssertEqual(sections[0].style, .late)
        // Most late first: the late hand-over (4 days) before the late return (1 day)
        XCTAssertEqual(sections[0].rows.map(\.orderId), [3, 2])
        XCTAssertEqual(sections[1].rows.map(\.orderId), [1])
        XCTAssertEqual(sections[2].rows.map(\.orderId), [4])
        if case .work(let first, let kind) = sections[0].rows[0] {
            XCTAssertEqual(kind, .handOver)
            XCTAssertEqual(first.productNames, "Áo dài đỏ x2")
            XCTAssertEqual(first.amountDue, 500000)
        } else {
            XCTFail("expected a work row")
        }
    }

    func testOlderApiWithoutTomorrowHidesTheGroup() throws {
        let work = try decodeWork("""
        {"pickupsToday":{"count":0,"orders":[]},"returnsToday":{"count":1,"orders":[\(row(5))]},
         "overdueReturns":{"count":0,"orders":[]},"noShows":{"count":0,"orders":[]}}
        """)
        XCTAssertNil(work.tomorrowPickups)
        let sections = OrdersHomeLogic.todaySections(from: work)
        XCTAssertEqual(sections.count, 1)
        XCTAssertEqual(sections[0].rows.map(\.orderId), [5])
    }

    func testRowWithoutItemsKeepsProductNames() throws {
        let json = #"{"id":9,"orderNumber":"ORD-1-9","isReadyToDeliver":true,"productNames":"Vest, Áo dài"}"#
        let decoded = try JSONDecoder.shared.decode(TodayWorkRow.self, from: Data(json.utf8))
        XCTAssertEqual(decoded.productNames, "Vest, Áo dài")
        XCTAssertEqual(decoded.lateDays, 0)
        XCTAssertNil(decoded.customerPhone)
    }

    // MARK: Late days

    func testLateDaysUseCivilDaysOfTheZone() {
        let now = iso.date(from: "2026-10-04T01:00:00Z")! // 08:00 on 04/10 in Vietnam, 01:00 in UTC
        let pickup = iso.date(from: "2026-10-03T18:00:00Z")! // 01:00 on 04/10 in Vietnam, 18:00 on 03/10 in UTC
        XCTAssertEqual(OrdersHomeLogic.lateDays(orderType: .rent, status: .reserved, pickupPlanAt: pickup,
                                                returnPlanAt: nil, now: now, timeZone: vietnam), 0)
        XCTAssertEqual(OrdersHomeLogic.lateDays(orderType: .rent, status: .reserved, pickupPlanAt: pickup,
                                                returnPlanAt: nil, now: now, timeZone: utc), 1)
    }

    func testLateOnlyForOpenRentSteps() {
        let now = iso.date(from: "2026-10-04T05:00:00Z")!
        let past = iso.date(from: "2026-10-01T05:00:00Z")!
        let future = iso.date(from: "2026-10-06T05:00:00Z")!
        XCTAssertEqual(OrdersHomeLogic.lateDays(orderType: .rent, status: .pickuped, pickupPlanAt: past,
                                                returnPlanAt: past, now: now, timeZone: vietnam), 3)
        XCTAssertEqual(OrdersHomeLogic.lateDays(orderType: .rent, status: .pickuped, pickupPlanAt: past,
                                                returnPlanAt: future, now: now, timeZone: vietnam), 0)
        XCTAssertEqual(OrdersHomeLogic.lateDays(orderType: .rent, status: .returned, pickupPlanAt: past,
                                                returnPlanAt: past, now: now, timeZone: vietnam), 0)
        XCTAssertEqual(OrdersHomeLogic.lateDays(orderType: .rent, status: .cancelled, pickupPlanAt: past,
                                                returnPlanAt: past, now: now, timeZone: vietnam), 0)
        XCTAssertEqual(OrdersHomeLogic.lateDays(orderType: .sale, status: .reserved, pickupPlanAt: past,
                                                returnPlanAt: nil, now: now, timeZone: vietnam), 0)
    }

    // MARK: Sale day groups

    func testSaleGroupsSplitAtVietnamMidnight() {
        let dates = ["2026-10-03T17:30:00Z", "2026-10-03T16:30:00Z", "2026-10-02T05:00:00Z"].map { iso.date(from: $0)! }
        let vietnamGroups = OrdersHomeLogic.groupByDay(dates, date: { $0 }, timeZone: vietnam)
        XCTAssertEqual(vietnamGroups.map(\.key), ["2026-10-04", "2026-10-03", "2026-10-02"])
        let utcGroups = OrdersHomeLogic.groupByDay(dates, date: { $0 }, timeZone: utc)
        XCTAssertEqual(utcGroups.map(\.key), ["2026-10-03", "2026-10-02"])
        XCTAssertEqual(utcGroups[0].items.count, 2)
    }

    func testMoneyHiddenOnlyForStaffWithTheSetting() {
        XCTAssertTrue(OrdersHomeLogic.hidesMoney(role: .outletStaff, hideForStaff: true))
        XCTAssertFalse(OrdersHomeLogic.hidesMoney(role: .outletStaff, hideForStaff: false))
        XCTAssertFalse(OrdersHomeLogic.hidesMoney(role: .outletAdmin, hideForStaff: true))
    }

    // MARK: View model

    func testStaleSearchAnswerIsDropped() {
        let source = FakeSource()
        let model = OrdersHomeViewModel(dataSource: source, searchDelay: 0)
        model.select(.rent)
        source.completeOrders(at: 0, ids: [1])

        model.updateSearch("la")
        drainMain()
        model.updateSearch("lan")
        drainMain()
        XCTAssertEqual(source.orderCalls.suffix(2).map(\.keyword), ["la", "lan"])
        // The answer for "lan" lands first, then the slow answer for "la"
        source.completeOrders(at: source.orderCalls.count - 1, ids: [30])
        source.completeOrders(at: source.orderCalls.count - 2, ids: [20])
        XCTAssertEqual(model.sections.flatMap(\.rows).map(\.orderId), [30])
        XCTAssertNil(source.orderCalls.last?.orderType, "search covers rent and sale")
    }

    func testForbiddenTodayFallsBackToRentList() {
        let source = FakeSource()
        let model = OrdersHomeViewModel(dataSource: source)
        model.reload()
        source.todayCompletion?(nil, NSError(domain: "RC", code: 403))
        XCTAssertFalse(model.todayAvailable)
        XCTAssertEqual(model.segment, .rent)
        XCTAssertEqual(source.orderCalls.last?.orderType, .rent)
    }

    func testSwitchingSegmentDropsTheOldList() {
        let source = FakeSource()
        let model = OrdersHomeViewModel(dataSource: source)
        model.select(.rent)
        model.select(.sale)
        // The rent answer arrives after the switch: ignored
        source.completeOrders(at: 0, ids: [1, 2])
        XCTAssertTrue(model.sections.isEmpty)
        XCTAssertEqual(model.state, .loading)
        source.completeOrders(at: 1, ids: [7])
        XCTAssertEqual(model.sections.flatMap(\.rows).map(\.orderId), [7])
        XCTAssertEqual(source.orderCalls[1].orderType, .sale)
        XCTAssertEqual(source.orderCalls[1].page, 1)
    }

    private func drainMain() {
        let done = expectation(description: "main queue")
        DispatchQueue.main.async { done.fulfill() }
        wait(for: [done], timeout: 1)
    }
}

private final class FakeSource: OrdersHomeDataSource {
    struct Call {
        let keyword: String?
        let orderType: OrderType?
        let page: Int
        let completion: (OrdersData?, NSError?) -> Void
    }

    var todayCompletion: ((TodayWork?, NSError?) -> Void)?
    var orderCalls: [Call] = []

    func loadTodayWork(completion: @escaping (TodayWork?, NSError?) -> Void) {
        todayCompletion = completion
    }

    func loadOrders(keyword: String?, orderType: OrderType?, status: OrderStatus?, sortBy: String, page: Int,
                    completion: @escaping (OrdersData?, NSError?) -> Void) {
        orderCalls.append(Call(keyword: keyword, orderType: orderType, page: page, completion: completion))
    }

    func completeOrders(at index: Int, ids: [Int]) {
        let orders = ids.map { id in
            #"{"id":\#(id),"orderNumber":"ORD-1-\#(id)","orderType":"RENT","status":"RESERVED","createdAt":"2026-10-03T02:00:00.000Z","updatedAt":"2026-10-03T02:00:00.000Z","customerName":"Lan","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B"}"#
        }.joined(separator: ",")
        let json = #"{"orders":[\#(orders)],"total":\#(ids.count),"page":1,"limit":20,"offset":0,"hasMore":false,"totalPages":1}"#
        do {
            let data = try JSONDecoder.shared.decode(OrdersData.self, from: Data(json.utf8))
            orderCalls[index].completion(data, nil)
        } catch {
            XCTFail("fixture did not decode: \(error)")
        }
    }
}
