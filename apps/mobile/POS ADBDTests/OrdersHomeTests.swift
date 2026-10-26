import XCTest
@testable import POS_ADBD

/// #371 — orders tab: today's work, late days, sale day groups, stale search; #401 — board texts
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
         "isReadyToDeliver":false,"productNames":"Áo dài","totalAmount":800000,"amountDue":500000,"refundDue":0,"lateDays":\(lateDays),
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
            XCTAssertEqual(first.productNames, "Áo dài đỏ ×2")
            XCTAssertEqual(first.totalAmount, 800000)
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

    // MARK: Board texts (#401)

    private let vi = Locale(identifier: "vi")

    private func work(_ id: Int, kind: WorkKind) -> OrdersRow {
        .work(TodayWorkRow(id: id, orderNumber: "ORD-1-\(id)"), kind: kind)
    }

    private func order(status: String, type: String = "RENT", created: String = "2026-10-02T03:00:00.000Z",
                       updated: String = "2026-10-02T03:00:00.000Z", pickup: String = "2026-10-04T02:00:00.000Z",
                       returns: String = "2026-10-05T02:00:00.000Z") throws -> Order {
        let json = #"{"id":1,"orderNumber":"ORD-1-0062","orderType":"\#(type)","status":"\#(status)","createdAt":"\#(created)","updatedAt":"\#(updated)","pickupPlanAt":"\#(pickup)","returnPlanAt":"\#(returns)","customerName":"Tâm","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B","totalAmount":380000,"orderItems":[{"id":1,"quantity":2,"unitPrice":1,"totalPrice":2,"productName":"Vest xám kẻ"},{"id":2,"quantity":1,"unitPrice":1,"totalPrice":1,"productName":"Cà vạt lụa"}]}"#
        return try JSONDecoder.shared.decode(Order.self, from: Data(json.utf8))
    }

    func testBandCountsAndBadge() {
        let sections = [
            OrdersSection(kind: .late, rows: [work(1, kind: .handOver), work(2, kind: .takeBack), work(3, kind: .takeBack)]),
            OrdersSection(kind: .today, rows: [work(4, kind: .handOver), work(5, kind: .handOver)]),
            OrdersSection(kind: .tomorrow, rows: [work(6, kind: .takeBack)]),
        ]
        let late = OrdersHomeLogic.bandCounts(sections[0].rows)
        XCTAssertEqual(late.handOver, 1)
        XCTAssertEqual(late.takeBack, 2)
        // Badge: late + today, not tomorrow
        XCTAssertEqual(OrdersHomeLogic.badgeCount(sections), 5)
    }

    // MARK: Deposit stages in To do (#1231)

    private func stage(_ orderId: Int, _ key: String, label: String, due: String, late: Int = 0, remaining: Int = 4800000) -> String {
        """
        {"orderId":\(orderId),"orderNumber":"10\(orderId)","customerName":"Hoa","key":"\(key)","label":"\(label)",
         "amount":\(remaining),"remaining":\(remaining),"dueDateKey":"\(due)","lateDays":\(late)}
        """
    }

    private func workWithStages() throws -> TodayWork {
        try decodeWork("""
        {"date":"2026-10-04",
         "pickupsToday":{"count":1,"orders":[\(row(1))]},
         "returnsToday":{"count":0,"orders":[]},
         "overdueReturns":{"count":1,"orders":[\(row(2, lateDays: 1))]},
         "noShows":{"count":0,"orders":[]},
         "installmentsDue":{"count":1,"orders":[\(stage(11, "i2", label: "Cọc 2", due: "2026-10-04"))]},
         "installmentsOverdue":{"count":2,"orders":[
            \(stage(12, "i1", label: "Cọc 1", due: "2026-10-03", late: 1)),
            \(stage(13, "i2", label: "Cọc 2", due: "2026-10-01", late: 3))]},
         "installmentsDueTomorrow":{"count":1,"orders":[\(stage(14, "i2", label: "Cọc 2", due: "2026-10-05"))]}}
        """)
    }

    func testStagesDueTodayAndLateAreRowsAndTomorrowIsNot() throws {
        let sections = OrdersHomeLogic.todaySections(from: try workWithStages())
        XCTAssertEqual(sections.map(\.kind), [.late, .today])
        // Late: the stage 3 days late, the stage 1 day late and the return 1 day late; most late first
        XCTAssertEqual(sections[0].rows.first?.orderId, 13)
        XCTAssertEqual(Set(sections[0].rows.map(\.orderId)), [13, 2, 12])
        XCTAssertEqual(sections[1].rows.map(\.orderId), [1, 11])
        XCTAssertFalse(sections.flatMap(\.rows).contains { $0.orderId == 14 }, "tomorrow's stage is not To do")
        if case .work(let stageRow, let kind) = sections[0].rows[0] {
            XCTAssertEqual(kind, .collect)
            XCTAssertEqual(stageRow.stageLabel, "Cọc 2")
            XCTAssertEqual(stageRow.amountDue, 4800000)
            XCTAssertEqual(stageRow.lateDays, 3)
        } else {
            XCTFail("expected a work row")
        }
    }

    func testStageRowsCountInBandAndBadge() throws {
        let sections = OrdersHomeLogic.todaySections(from: try workWithStages())
        // late: 1 return + 2 stages; today: 1 hand-over + 1 stage
        XCTAssertEqual(OrdersHomeLogic.bandCounts(sections[0].rows).collect, 2)
        XCTAssertEqual(OrdersHomeLogic.bandCounts(sections[1].rows).collect, 1)
        XCTAssertEqual(OrdersHomeLogic.badgeCount(sections), 5)
    }

    func testNoStageGroupsLeavesTodoAsBefore() throws {
        let work = try decodeWork("""
        {"pickupsToday":{"count":1,"orders":[\(row(1))]},"returnsToday":{"count":0,"orders":[]},
         "overdueReturns":{"count":0,"orders":[]},"noShows":{"count":0,"orders":[]}}
        """)
        let sections = OrdersHomeLogic.todaySections(from: work)
        XCTAssertEqual(sections.map(\.kind), [.today])
        XCTAssertEqual(OrdersHomeLogic.badgeCount(sections), 1)
    }

    func testStageChipsShowLabelAndLateDays() throws {
        let sections = OrdersHomeLogic.todaySections(from: try workWithStages())
        guard case .work(let late, let kind) = sections[0].rows[0] else { return XCTFail("expected a work row") }
        let chips = OrdersHomeLogic.workChips(late, kind: kind)
        XCTAssertEqual(chips.count, 2)
        XCTAssertEqual(chips[0].text, "Cọc 2 · #\(late.orderNumber)")
        XCTAssertNotNil(chips[1].warning, "late days read as the late warning")
        guard case .work(let today, let todayKind) = sections[1].rows[1] else { return XCTFail("expected a work row") }
        XCTAssertEqual(OrdersHomeLogic.workChips(today, kind: todayKind).count, 1, "due today: no late chip")
        XCTAssertFalse(OrdersHomeLogic.notPreparedApplies(kind: .collect, isReadyToDeliver: false))
    }

    func testPayLineChoice() {
        XCTAssertEqual(OrdersHomeLogic.payLine(amountDue: 600000, refundDue: 0), .due(600000))
        XCTAssertEqual(OrdersHomeLogic.payLine(amountDue: 0, refundDue: 200000), .refund(200000))
        XCTAssertEqual(OrdersHomeLogic.payLine(amountDue: 50000, refundDue: 200000), .refund(200000), "a refund wins")
        // #458: a fully paid order shows no pay line ("đã thu đủ" is not shown)
        XCTAssertNil(OrdersHomeLogic.payLine(amountDue: 0, refundDue: 0))
    }

    func testShortNumber() {
        XCTAssertEqual(OrdersHomeLogic.shortNumber("ORD-1-0053"), "0053")
        XCTAssertEqual(OrdersHomeLogic.shortNumber("ORD-001-20250115-0001"), "0001")
        XCTAssertEqual(OrdersHomeLogic.shortNumber("ORD00112345"), "ORD00112345")
        XCTAssertEqual(OrdersHomeLogic.shortNumber("702293"), "702293")
    }

    // MARK: Orders by product / customer (#482)

    private func productOrder(id: Int, status: String, type: String = "RENT", total: Double,
                              lines: [(productId: Int, total: Double)]) throws -> Order {
        let items = lines.enumerated().map { index, line in
            #"{"id":\#(index + 1),"quantity":1,"unitPrice":\#(line.total),"totalPrice":\#(line.total),"productId":\#(line.productId),"productName":"P\#(line.productId)"}"#
        }.joined(separator: ",")
        let json = #"{"id":\#(id),"orderNumber":"ORD-1-\#(id)","orderType":"\#(type)","status":"\#(status)","createdAt":"2026-10-02T03:00:00.000Z","updatedAt":"2026-10-02T03:00:00.000Z","customerName":"Tâm","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B","totalAmount":\#(total),"orderItems":[\#(items)]}"#
        return try JSONDecoder.shared.decode(Order.self, from: Data(json.utf8))
    }

    func testProductTilesCountRentalsAndRevenueWithoutCancelled() throws {
        let orders = [
            try productOrder(id: 1, status: "PICKUPED", total: 450_000, lines: [(4, 450_000)]),
            try productOrder(id: 2, status: "RESERVED", total: 1_000_000, lines: [(4, 300_000), (9, 700_000)]),
            try productOrder(id: 3, status: "RETURNED", total: 450_000, lines: [(4, 450_000)]),
            try productOrder(id: 4, status: "CANCELLED", total: 700_000, lines: [(4, 700_000)]),
            try productOrder(id: 5, status: "COMPLETED", type: "SALE", total: 900_000, lines: [(4, 900_000)]),
        ]
        XCTAssertEqual(EntityOrdersLogic.rentals(orders), 3, "cancelled and sale orders are not rentals")
        // #658: Số đơn and Lượt thuê only (no money tile)
        let tiles = EntityOrdersLogic.productTiles(orders: orders, total: 6, hasMore: false)
        XCTAssertEqual(tiles.map(\.title), ["orders.entity.tile.orders".localized(), "orders.entity.tile.rentals".localized()])
        XCTAssertEqual(tiles.map(\.value), ["6", "3"])
        // More pages to load: the loaded figures read "N+"
        let partial = EntityOrdersLogic.productTiles(orders: orders, total: 40, hasMore: true)
        XCTAssertEqual(partial.map(\.value), ["40", "3+"])
    }

    func testCustomerTilesAndCompactMoney() throws {
        let tiles = EntityOrdersLogic.customerTiles(total: 4, spent: 3_200_000, renting: 1, hidesMoney: false)
        XCTAssertEqual(tiles.map(\.value), ["4", String(format: "orders.entity.million".localized(), 3, 2), "1"])
        XCTAssertEqual(tiles.map(\.accent), [false, false, true])
        XCTAssertEqual(EntityOrdersLogic.customerTiles(total: 4, spent: nil, renting: nil, hidesMoney: false).map(\.value), ["4", "—", "—"])
        XCTAssertEqual(EntityOrdersLogic.compactMoney(450_000), "450.000")
        XCTAssertEqual(EntityOrdersLogic.compactMoney(2_000_000), String(format: "orders.entity.millionWhole".localized(), 2))
        XCTAssertEqual(EntityOrdersLogic.compactMoney(2_049_000), String(format: "orders.entity.millionWhole".localized(), 2))
        let spent = EntityOrdersLogic.spent([
            try productOrder(id: 1, status: "RETURNED", total: 500_000, lines: []),
            try productOrder(id: 2, status: "CANCELLED", total: 900_000, lines: []),
        ])
        XCTAssertEqual(spent, 500_000)
        XCTAssertEqual(EntityOrdersLogic.productSubtitle(code: "VS-004", freeToday: 1),
                       "VS-004 · " + String(format: "orders.entity.free".localized(), 1))
        XCTAssertEqual(EntityOrdersLogic.productSubtitle(code: "VS-004", freeToday: 0), "VS-004")
        XCTAssertEqual(EntityOrdersLogic.productSubtitle(code: nil, freeToday: 2), String(format: "orders.entity.free".localized(), 2))
    }

    /// #482: the order detail header tag reads the list row tag for every status; task tags say what to do
    func testDetailStatusTagMatchesListTag() throws {
        let statuses: [(String, String)] = [("RESERVED", "RENT"), ("PICKUPED", "RENT"), ("RETURNED", "RENT"),
                                            ("COMPLETED", "SALE"), ("CANCELLED", "RENT")]
        for (status, type) in statuses {
            let listed = try order(status: status, type: type)
            XCTAssertEqual(OrdersHomeLogic.statusTag(listed.status), OrdersHomeLogic.statusTag(listed), status)
        }
        XCTAssertEqual(OrdersHomeLogic.statusTag(.reserved).text, "orders.v2.status.reserved".localized())
        XCTAssertEqual(OrdersHomeLogic.statusTag(.cancelled).text, "orders.v2.status.cancelled".localized())
        let bundle = Bundle(for: OrderRowCell.self)
        let vi = bundle.path(forResource: "vi-VN", ofType: "lproj").flatMap(Bundle.init(path:))
        if let vi {
            XCTAssertEqual(vi.localizedString(forKey: "orders.v2.status.reserved", value: nil, table: nil), "Đã đặt")
            XCTAssertEqual(vi.localizedString(forKey: "orders.v2.status.cancelled", value: nil, table: nil), "Đã huỷ")
            XCTAssertEqual(vi.localizedString(forKey: "Cancelled", value: nil, table: nil), "Đã huỷ")
            XCTAssertEqual(vi.localizedString(forKey: "orders.v2.tag.handOver", value: nil, table: nil), "Cần giao")
            XCTAssertEqual(vi.localizedString(forKey: "orders.v2.tag.takeBack", value: nil, table: nil), "Cần trả")
        } else {
            XCTFail("vi-VN.lproj missing")
        }
    }

    func testStatusTags() throws {
        let booked = try order(status: "RESERVED")
        XCTAssertEqual(OrdersHomeLogic.statusTag(booked), RowTag(text: "orders.v2.status.reserved".localized(),
                                                             colors: OrderStatusBadge.pill(for: .reserved)))
        let sale = try order(status: "COMPLETED", type: "SALE")
        XCTAssertEqual(OrdersHomeLogic.statusTag(sale, inSearch: true).text,
                       String(format: "orders.v2.tag.sale".localized(), "orders.v2.status.completed".localized()))
    }

    // MARK: Row date lines (#496)

    private func text(_ key: String, _ day: String) -> String {
        String(format: key.localized(), day)
    }

    private func lines(_ order: Order, lateDays: Int = 0, timeZone: TimeZone? = nil) -> OrderRowLines {
        OrdersHomeLogic.rowLines(order, lateDays: lateDays, timeZone: timeZone ?? vietnam, locale: vi)
    }

    func testRowLinesPerStatus() throws {
        // created 02/10 (Fri), pickup 04/10 (Sun), return 05/10 (Mon), Vietnam days
        let booked = try order(status: "RESERVED")
        XCTAssertEqual(lines(booked), OrderRowLines(
            meta: "#0062 · " + text("orders.row.created", "02/10/26 10:00"),
            task: text("orders.row.pickup", "04/10/26") + " · " + text("orders.row.returnAfter", "05/10/26")))

        let out = try order(status: "PICKUPED")
        XCTAssertEqual(lines(out).task, text("orders.row.return", "05/10/26"))
        let late = try order(status: "PICKUPED", returns: "2026-10-01T02:00:00.000Z")
        XCTAssertEqual(lines(late, lateDays: 3).task, text("orders.row.dueBack", "01/10/26"))

        let cancelled = try order(status: "CANCELLED", updated: "2026-09-29T03:00:00.000Z")
        XCTAssertEqual(lines(cancelled).task, text("orders.row.cancelled", "29/09/26"))
        let sale = try order(status: "COMPLETED", type: "SALE")
        XCTAssertEqual(lines(sale).task, text("orders.row.sold", "02/10/26"))
        let reservedSale = try order(status: "RESERVED", type: "SALE")
        XCTAssertEqual(lines(reservedSale).task, text("orders.row.sold", "02/10/26"), "any sale that is not cancelled")
        let cancelledSale = try order(status: "CANCELLED", type: "SALE", updated: "2026-09-29T03:00:00.000Z")
        XCTAssertEqual(lines(cancelledSale).task, text("orders.row.cancelled", "29/09/26"))

        let returned = OrdersHomeLogic.rowLines(code: "0062", orderType: .rent, status: .returned,
                                                createdAt: iso.date(from: "2026-09-25T03:00:00Z"),
                                                pickupPlanAt: nil, returnPlanAt: nil,
                                                returnedAt: iso.date(from: "2026-09-28T03:00:00Z"), updatedAt: nil,
                                                isLate: false, timeZone: vietnam, locale: vi)
        XCTAssertEqual(returned, OrderRowLines(meta: "#0062 · " + text("orders.row.created", "25/09/26 10:00"),
                                               task: text("orders.row.returned", "28/09/26")))
    }

    func testRowLinesLeaveMissingDatesOut() {
        let noPickup = OrdersHomeLogic.rowLines(code: "7", orderType: .rent, status: .reserved, createdAt: nil,
                                                pickupPlanAt: nil, returnPlanAt: iso.date(from: "2026-10-05T02:00:00Z"),
                                                returnedAt: nil, updatedAt: nil, isLate: false, timeZone: vietnam, locale: vi)
        XCTAssertEqual(noPickup, OrderRowLines(meta: "#7", task: text("orders.row.return", "05/10/26")))
        let noReturn = OrdersHomeLogic.rowLines(code: "7", orderType: .rent, status: .reserved, createdAt: nil,
                                                pickupPlanAt: iso.date(from: "2026-10-04T02:00:00Z"), returnPlanAt: nil,
                                                returnedAt: nil, updatedAt: nil, isLate: false, timeZone: vietnam, locale: vi)
        XCTAssertEqual(noReturn.task, text("orders.row.pickup", "04/10/26"))
        let none = OrdersHomeLogic.rowLines(code: "7", orderType: .rent, status: .pickuped, createdAt: nil,
                                            pickupPlanAt: nil, returnPlanAt: nil, returnedAt: nil, updatedAt: nil,
                                            isLate: true, timeZone: vietnam, locale: vi)
        XCTAssertEqual(none, OrderRowLines(meta: "#7", task: ""))
        let returned = OrdersHomeLogic.rowLines(code: "7", orderType: .rent, status: .returned, createdAt: nil,
                                                pickupPlanAt: nil, returnPlanAt: nil, returnedAt: nil, updatedAt: nil,
                                                isLate: false, timeZone: vietnam, locale: vi)
        XCTAssertEqual(returned.task, "")
    }

    /// Days are Vietnam civil days whatever zone the device is in
    func testRowLinesUseTheVietnamDay() throws {
        // 03/10 18:00 UTC is Sunday 04/10 01:00 in Vietnam
        let late = try order(status: "RESERVED", created: "2026-10-03T18:00:00.000Z")
        XCTAssertEqual(lines(late).meta, "#0062 · " + text("orders.row.created", "04/10/26 01:00"))
        XCTAssertEqual(lines(late, timeZone: utc).meta, "#0062 · " + text("orders.row.created", "03/10/26 18:00"))
        // The default zone is the shop's, not the device's
        XCTAssertEqual(OrdersHomeLogic.rowLines(late, lateDays: 0, locale: vi).meta,
                       "#0062 · " + text("orders.row.created", "04/10/26 01:00"))
    }

    func testRowDayWeekdayNames() {
        // Monday 28/09 … Sunday 04/10 (noon in Vietnam)
        let days = (0..<7).map { iso.date(from: "2026-09-28T05:00:00Z")!.addingTimeInterval(Double($0) * 86_400) }
        XCTAssertEqual(days.map { OrdersHomeLogic.rowDay($0, timeZone: vietnam, locale: vi) },
                       ["28/09/26", "29/09/26", "30/09/26", "01/10/26", "02/10/26", "03/10/26", "04/10/26"])
    }

    func testRowLineCopyInVietnamese() {
        let bundle = Bundle(for: OrderRowCell.self)
        guard let vi = bundle.path(forResource: "vi-VN", ofType: "lproj").flatMap(Bundle.init(path:)) else {
            return XCTFail("vi-VN.lproj missing")
        }
        let copy: (String) -> String = { vi.localizedString(forKey: $0, value: nil, table: nil) }
        XCTAssertEqual(copy("orders.row.created"), "tạo %@")
        XCTAssertEqual(copy("orders.row.pickup"), "Lấy %@")
        XCTAssertEqual(copy("orders.row.returnAfter"), "trả %@")
        XCTAssertEqual(copy("orders.row.return"), "Trả %@")
        XCTAssertEqual(copy("orders.row.dueBack"), "Hạn trả %@")
        XCTAssertEqual(copy("orders.row.returned"), "Đã trả %@")
        XCTAssertEqual(copy("orders.row.sold"), "Bán %@")
        XCTAssertEqual(copy("orders.chip.sale"), "Bán", "#1026: spoken word of the sale date chip")
        XCTAssertEqual(copy("orders.row.cancelled"), "Huỷ %@")
        XCTAssertEqual(copy("overview.v2.todayWork"), "Việc hôm nay · %@")
        XCTAssertEqual(copy("overview.v2.todayWork.pickups"), "Cần giao hôm nay")
        XCTAssertEqual(copy("overview.v2.todayWork.pickupsDone"), "Đã giao %d/%d")
        XCTAssertEqual(copy("overview.v2.todayWork.returns"), "Cần nhận trả hôm nay")
        XCTAssertEqual(copy("overview.v2.todayWork.returnsDone"), "Đã nhận %d/%d")
        XCTAssertEqual(copy("overview.v2.noShows"), "Quá ngày lấy, khách chưa đến")
        XCTAssertEqual(copy("notPickedUp.title"), "Chưa lấy đồ · %d")
        XCTAssertEqual(copy("notPickedUp.section.overdue"), "Quá ngày lấy, chưa thu · %d")
        XCTAssertEqual(copy("notPickedUp.section.upcoming"), "Sẽ thu khi khách lấy đồ · %d")
        XCTAssertEqual(copy("notPickedUp.chip"), "Quá %d ngày · nên gọi khách")
    }

    // MARK: Chưa lấy đồ (#496)

    private func reserved(_ id: Int, pickup: String?, status: String = "RESERVED") throws -> Order {
        let pickupJSON = pickup.map { "\"\($0)\"" } ?? "null"
        let json = #"{"id":\#(id),"orderNumber":"ORD-1-\#(id)","orderType":"RENT","status":"\#(status)","createdAt":"2026-09-20T03:00:00.000Z","updatedAt":"2026-09-20T03:00:00.000Z","pickupPlanAt":\#(pickupJSON),"returnPlanAt":"2026-10-09T02:00:00.000Z","customerName":"Tâm","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B","totalAmount":500000,"amountDue":300000,"orderItems":[]}"#
        return try JSONDecoder.shared.decode(Order.self, from: Data(json.utf8))
    }

    func testNotPickedUpGroupsSplitAtTheVietnamDay() throws {
        // Now: 05/10 00:30 in Vietnam (still 04/10 in UTC)
        let now = iso.date(from: "2026-10-04T17:30:00Z")!
        let orders = [
            try reserved(1, pickup: nil),
            try reserved(2, pickup: "2026-10-04T17:10:00.000Z"), // 05/10 00:10 Vietnam: today
            try reserved(3, pickup: "2026-10-04T16:00:00.000Z"), // 04/10 23:00 Vietnam: yesterday
            try reserved(4, pickup: "2026-10-01T02:00:00.000Z"), // 01/10: 4 days ago
            try reserved(5, pickup: "2026-10-07T02:00:00.000Z"),
            try reserved(6, pickup: "2026-10-01T02:00:00.000Z", status: "PICKUPED"),
        ]
        let groups = NotPickedUpLogic.groups(orders, now: now, timeZone: vietnam)
        XCTAssertEqual(groups.overdue.map(\.id), [4, 3])
        XCTAssertEqual(groups.upcoming.map(\.id), [2, 5, 1], "by pickup day, no pickup day last; rented out left out")
        XCTAssertEqual(NotPickedUpLogic.overdueDays(orders[3], now: now, timeZone: vietnam), 4)
        XCTAssertEqual(NotPickedUpLogic.overdueDays(orders[2], now: now, timeZone: vietnam), 1)
        XCTAssertEqual(NotPickedUpLogic.overdueDays(orders[0], now: now, timeZone: vietnam), 0)
        XCTAssertEqual(orders[1].listAmountDue, 300000)
        // In UTC the 23:00 pickup would still be today
        XCTAssertEqual(NotPickedUpLogic.groups(orders, now: now, timeZone: utc).overdue.map(\.id), [4])
    }

    // MARK: Overview operations counts (#496)

    func testOverviewNowDecodesTodayCounts() throws {
        let now = try JSONDecoder.shared.decode(OverviewNow.self, from: Data("""
        {"overdueReturns":{"count":1,"orders":[]},
         "pickupsToday":{"count":3,"orders":[]},"returnsToday":{"count":2,"orders":[]},
         "doneToday":{"pickups":4,"returns":1},"noShows":{"count":5,"orders":[]}}
        """.utf8))
        XCTAssertEqual(now.today?.pickups, OverviewNow.TodayTask(remaining: 3, done: 4))
        XCTAssertEqual(now.today?.pickups.total, 7)
        XCTAssertEqual(now.today?.returns, OverviewNow.TodayTask(remaining: 2, done: 1))
        XCTAssertEqual(now.noShows, 5)
        XCTAssertEqual(now.lateReturns, 1)

        // Without doneToday nothing is done yet; without the lists the section is hidden
        let noDone = try JSONDecoder.shared.decode(OverviewNow.self, from: Data("""
        {"pickupsToday":{"count":1},"returnsToday":{"count":0}}
        """.utf8))
        XCTAssertEqual(noDone.today?.pickups, OverviewNow.TodayTask(remaining: 1, done: 0))
        XCTAssertNil(noDone.noShows)
        let old = try JSONDecoder.shared.decode(OverviewNow.self, from: Data(#"{"overdueReturns":{"count":2}}"#.utf8))
        XCTAssertNil(old.today)
        XCTAssertNil(old.noShows)
    }

    func testSectionTitlesAndSaleSums() throws {
        let now = iso.date(from: "2026-10-03T05:00:00Z")! // Saturday 03/10
        let late = OrdersSection(kind: .late, rows: [work(1, kind: .handOver), work(2, kind: .takeBack)])
        XCTAssertEqual(OrdersHomeLogic.sectionTitle(late, now: now, timeZone: vietnam, locale: vi),
                       "\("Late section".localized()) · 2".uppercased(with: vi))
        XCTAssertEqual(OrdersHomeLogic.sectionTitle(OrdersSection(kind: .tomorrow, rows: []), now: now, timeZone: vietnam, locale: vi),
                       "\("Tomorrow section".localized()) · 04/10/26".uppercased(with: vi))
        let yesterday = OrdersSection(kind: .day(iso.date(from: "2026-10-02T05:00:00Z")!), rows: [])
        XCTAssertEqual(OrdersHomeLogic.sectionTitle(yesterday, now: now, timeZone: vietnam, locale: vi),
                       "\("orders.v2.yesterday".localized()) · 02/10/26".uppercased(with: vi))
        XCTAssertNil(OrdersHomeLogic.sectionTitle(OrdersSection(kind: .plain, rows: [])))

        let rows: [OrdersRow] = [.order(try order(status: "COMPLETED", type: "SALE"), lateDays: 0),
                                 .order(try order(status: "CANCELLED", type: "SALE"), lateDays: 0)]
        let sum = OrdersHomeLogic.saleDaySummary(rows)
        XCTAssertEqual(sum.count, 1, "cancelled orders are not counted")
        XCTAssertEqual(sum.amount, 380000)
    }

    func testDateRangePresetsAndQuery() {
        let now = iso.date(from: "2026-10-03T18:30:00Z")! // 04/10 01:30 in Vietnam
        let key: (Date) -> String = { DayFormatter.key($0, timeZone: self.vietnam) }
        XCTAssertNil(OrdersHomeLogic.dayBounds(.any, now: now, timeZone: vietnam))
        let today = OrdersHomeLogic.dayBounds(.today, now: now, timeZone: vietnam)!
        XCTAssertEqual([key(today.start), key(today.end)], ["2026-10-04", "2026-10-04"])
        let week = OrdersHomeLogic.dayBounds(.next7Days, now: now, timeZone: vietnam)!
        XCTAssertEqual([key(week.start), key(week.end)], ["2026-10-04", "2026-10-10"])
        let month = OrdersHomeLogic.dayBounds(.thisMonth, now: now, timeZone: vietnam)!
        XCTAssertEqual([key(month.start), key(month.end)], ["2026-10-01", "2026-10-31"])

        var filter = RentOrdersFilter()
        XCTAssertEqual(OrdersHomeLogic.rentQuery(filter, now: now, timeZone: vietnam).sortBy, "pickupPlanAt")
        XCTAssertNil(OrdersHomeLogic.rentQuery(filter, now: now, timeZone: vietnam).startDate)
        filter.status = .pickuped
        filter.sortDate = .returnDate
        filter.direction = .farthestFirst
        filter.dateRange = .today
        let query = OrdersHomeLogic.rentQuery(filter, page: 2, now: now, timeZone: vietnam)
        XCTAssertEqual(query.orderType, .rent)
        XCTAssertEqual(query.status, .pickuped)
        XCTAssertEqual(query.sortBy, "returnPlanAt")
        XCTAssertEqual(query.sortOrder, "asc")
        XCTAssertEqual(query.dateField, "returnPlanAt", "#888: the range uses the sort date")
        XCTAssertEqual(query.page, 2)
        XCTAssertEqual(query.startDate.map(key), "2026-10-04")
    }

    // MARK: #888 — one sort date, Lấy · Trả rows, dd/mm/yy

    func testDayMonthYearIsTheVietnamDay() {
        // 16:59:59Z is still 02/10 in Vietnam; 17:00:00Z is 03/10
        XCTAssertEqual(DayFormatter.dmy(iso.date(from: "2026-10-02T16:59:59Z")!, timeZone: vietnam), "02/10/26")
        XCTAssertEqual(DayFormatter.dmy(iso.date(from: "2026-10-02T17:00:00Z")!, timeZone: vietnam), "03/10/26")
        XCTAssertEqual(DayFormatter.dmy(iso.date(from: "2026-10-02T17:00:00Z")!, timeZone: utc), "02/10/26")
        // Default zone is the shop's, whatever the device zone
        XCTAssertEqual(DayFormatter.dmy(iso.date(from: "2026-12-31T17:00:00Z")!), "01/01/27")
    }

    func testRentRowShowsPickupAndReturnWithTheSortedDateMarked() throws {
        let booked = try order(status: "RESERVED", pickup: "2026-10-13T17:30:00.000Z", returns: "2026-10-16T02:00:00.000Z")
        let pickup = text("orders.row.pickup", "14/10/26")
        let back = text("orders.row.return", "16/10/26")
        XCTAssertEqual(OrdersHomeLogic.rentRowDates(booked, sortedBy: .pickup, timeZone: vietnam),
                       [RowDatePart(text: pickup, marked: true), RowDatePart(text: back, marked: false)])
        XCTAssertEqual(OrdersHomeLogic.rentRowDates(booked, sortedBy: .returnDate, timeZone: vietnam),
                       [RowDatePart(text: pickup, marked: false), RowDatePart(text: back, marked: true)])
        XCTAssertEqual(OrdersHomeLogic.rentRowDates(booked, sortedBy: .created, timeZone: vietnam).map(\.marked), [false, false],
                       "the created day is on the meta line, not marked")
        // Owner (#888): the created day stays where it was, "#0062 · tạo 02/10/26"
        XCTAssertEqual(OrdersHomeLogic.rentRowMeta(booked, timeZone: vietnam), "#0062 · " + text("orders.row.created", "02/10/26 10:00"))
        // Same dates whatever the status (returned rows too); a missing date is left out
        let returned = try order(status: "RETURNED", pickup: "2026-09-30T02:00:00.000Z", returns: "2026-10-02T02:00:00.000Z")
        XCTAssertEqual(OrdersHomeLogic.rentRowDates(returned, sortedBy: .pickup, timeZone: vietnam).map(\.text),
                       [text("orders.row.pickup", "30/09/26"), text("orders.row.return", "02/10/26")])
        let noPickup = OrdersHomeLogic.rentRowDates(pickupPlanAt: nil, returnPlanAt: iso.date(from: "2026-10-05T02:00:00Z"),
                                                    sortedBy: .pickup, timeZone: vietnam)
        XCTAssertEqual(noPickup, [RowDatePart(text: text("orders.row.return", "05/10/26"), marked: false)])
    }

    func testSortBarSaysHowTheListIsSorted() {
        var filter = RentOrdersFilter()
        let name: (String) -> String = { $0.localized().lowercased() }
        XCTAssertEqual(OrdersHomeLogic.sortBarText(filter),
                       String(format: "orders.v2.sortBar".localized(), name("orders.v2.sortDate.pickup"), name("orders.v2.direction.nearest")))
        filter.sortDate = .created
        filter.direction = .farthestFirst
        XCTAssertEqual(OrdersHomeLogic.sortBarText(filter),
                       String(format: "orders.v2.sortBar".localized(), name("orders.v2.sortDate.created"), name("orders.v2.direction.oldest")))
        XCTAssertEqual(OrdersHomeLogic.directionTitle(.returnDate, .nearestFirst), "orders.v2.direction.nearest".localized())
        XCTAssertEqual(OrdersHomeLogic.directionTitle(.created, .nearestFirst), "orders.v2.direction.newest".localized())
    }

    func testSortCopyInVietnamese() {
        let bundle = Bundle(for: OrderRowCell.self)
        guard let vi = bundle.path(forResource: "vi-VN", ofType: "lproj").flatMap(Bundle.init(path:)) else {
            return XCTFail("vi-VN.lproj missing")
        }
        let copy: (String) -> String = { vi.localizedString(forKey: $0, value: nil, table: nil) }
        XCTAssertEqual(copy("orders.v2.sortDate.pickup"), "Ngày lấy")
        XCTAssertEqual(copy("orders.v2.sortDate.return"), "Ngày trả")
        XCTAssertEqual(copy("orders.v2.sortDate.created"), "Ngày tạo")
        // #1056: `desc` puts the latest date first, `asc` the earliest
        XCTAssertEqual(copy("orders.v2.direction.nearest"), "Mới nhất trước")
        XCTAssertEqual(copy("orders.v2.direction.farthest"), "Cũ nhất trước")
        XCTAssertEqual(copy("orders.v2.direction.newest"), "Mới nhất trước")
        XCTAssertEqual(copy("orders.v2.direction.oldest"), "Cũ nhất trước")
        let en = bundle.path(forResource: "en", ofType: "lproj").flatMap(Bundle.init(path:))
        XCTAssertEqual(en?.localizedString(forKey: "orders.v2.direction.nearest", value: nil, table: nil), "Latest first")
        XCTAssertEqual(en?.localizedString(forKey: "orders.v2.direction.farthest", value: nil, table: nil), "Earliest first")
        XCTAssertEqual(String(format: copy("orders.v2.sortBar"), "ngày lấy", "mới nhất trước"), "Xếp theo ngày lấy · mới nhất trước")
        XCTAssertEqual(String(format: copy("orders.v2.filter.rangeOf"), "ngày lấy"), "Khoảng ngày lấy")
        XCTAssertEqual(copy("order.header.step.handOver"), "Lấy")
        XCTAssertEqual(copy("order.header.step.handedOver"), "Đã lấy")
    }

    // MARK: #888 — status badge colours (owner: old app colours by default)

    private func hex(_ color: UIColor) -> String {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        color.getRed(&r, green: &g, blue: &b, alpha: &a)
        return String(format: "%02X%02X%02X", Int(round(r * 255)), Int(round(g * 255)), Int(round(b * 255)))
    }

    /// #888 (owner): every status badge is the old app's solid colour with white text; no other palette
    func testStatusBadgesAreTheOldAppSolidColours() {
        let solid: [(OrderStatus, String)] = [(.reserved, "EF4444"), (.pickuped, "F19920"), (.returned, "16A34A"),
                                              (.completed, "16A34A"), (.cancelled, "991B1B")]
        for (status, fill) in solid {
            let pill = OrderStatusBadge.pill(for: status)
            XCTAssertEqual(hex(pill.fill), fill, "\(status)")
            XCTAssertEqual(hex(pill.text), "FFFFFF", "white text on \(status)")
            XCTAssertEqual(hex(OrdersHomeLogic.statusTag(status).colors.fill), fill, "row tag \(status)")
        }
    }

    // MARK: #674 — segment cache, dirty flag, quiet refresh

    private final class Clock {
        var now = Date(timeIntervalSince1970: 1_790_000_000)
    }

    private func ids(_ model: OrdersHomeViewModel) -> [Int] {
        model.sections.flatMap(\.rows).map(\.orderId)
    }

    func testSegmentSwitchShowsTheCachedListWithoutReloading() {
        let source = FakeSource()
        let clock = Clock()
        let model = OrdersHomeViewModel(dataSource: source, now: { clock.now })
        model.select(.rent)
        source.completeOrders(at: 0, ids: [1, 2])
        model.select(.sale)
        source.completeOrders(at: 1, ids: [7])
        clock.now += 60

        model.select(.rent)
        XCTAssertEqual(ids(model), [1, 2], "the rent list shows at once")
        XCTAssertEqual(model.state, .loaded)
        XCTAssertEqual(model.total, 2)
        XCTAssertEqual(source.orderCalls.count, 2, "fresh and clean: no request")
    }

    func testDirtySegmentShowsCacheThenRefreshesQuietly() {
        let source = FakeSource()
        let model = OrdersHomeViewModel(dataSource: source)
        model.select(.rent)
        source.completeOrders(at: 0, ids: [1, 2])
        model.select(.sale)
        source.completeOrders(at: 1, ids: [7])

        model.markDirty()
        model.select(.rent)
        XCTAssertEqual(ids(model), [1, 2], "cached rows stay while the refresh runs")
        XCTAssertEqual(model.state, .loaded, "no spinner")
        XCTAssertEqual(source.orderCalls.count, 3)
        XCTAssertEqual(source.orderCalls[2].orderType, .rent)
        source.completeOrders(at: 2, ids: [3, 1, 2])
        XCTAssertEqual(ids(model), [3, 1, 2])
        XCTAssertFalse(model.isDirty)
    }

    func testAppearReloadsOnlyWhenDirtyOrStale() {
        let source = FakeSource()
        let clock = Clock()
        let model = OrdersHomeViewModel(dataSource: source, now: { clock.now })
        model.select(.rent)
        source.completeOrders(at: 0, ids: [1])

        model.refreshIfNeeded()
        XCTAssertEqual(source.orderCalls.count, 1, "view and back: no reload")

        clock.now += RefreshPolicy.listTTL - 1
        model.refreshIfNeeded()
        XCTAssertEqual(source.orderCalls.count, 1)

        clock.now += 2
        model.refreshIfNeeded()
        XCTAssertEqual(source.orderCalls.count, 2, "5 minutes old: reload")
        XCTAssertEqual(ids(model), [1], "quiet: rows stay")
        XCTAssertEqual(model.state, .loaded)
        source.completeOrders(at: 1, ids: [1, 4])

        model.markDirty()
        model.refreshIfNeeded()
        XCTAssertEqual(source.orderCalls.count, 3, "orders changed: reload")
    }

    func testQuietRefreshFailureKeepsTheRows() {
        let source = FakeSource()
        let model = OrdersHomeViewModel(dataSource: source)
        model.select(.rent)
        source.completeOrders(at: 0, ids: [1, 2])
        model.markDirty()
        model.refreshIfNeeded()
        source.orderCalls[1].completion(nil, NSError(domain: "RC", code: -1))
        XCTAssertEqual(ids(model), [1, 2])
        XCTAssertEqual(model.state, .loaded)
        XCTAssertTrue(model.isDirty, "still dirty: the next appear tries again")
    }

    func testChangeDuringALoadLeavesTheListDirty() {
        let source = FakeSource()
        let model = OrdersHomeViewModel(dataSource: source)
        model.select(.rent)
        model.markDirty() // an order changed while the request was in flight
        source.completeOrders(at: 0, ids: [1])
        XCTAssertTrue(model.isDirty)
        XCTAssertTrue(model.needsRefresh)
    }

    func testQuietRefreshKeepsEveryLoadedPage() {
        let source = FakeSource()
        let model = OrdersHomeViewModel(dataSource: source)
        model.select(.rent)
        source.completeOrders(at: 0, ids: Array(1...20), hasMore: true)
        model.loadMoreIfNeeded(displayedIndex: 19, total: 20)
        XCTAssertEqual(source.orderCalls[1].page, 2)
        source.completeOrders(at: 1, ids: Array(21...30))

        model.markDirty()
        model.refreshIfNeeded()
        XCTAssertEqual(source.orderCalls[2].page, 1)
        XCTAssertEqual(source.orderCalls[2].query.limit, 40, "both pages in one request")
        XCTAssertEqual(ids(model).count, 30, "rows stay while it runs")
    }

    func testPullToRefreshKeepsRowsAndRetryShowsSpinner() {
        let source = FakeSource()
        let model = OrdersHomeViewModel(dataSource: source)
        model.select(.rent)
        source.completeOrders(at: 0, ids: [1])
        model.reload(quiet: true)
        XCTAssertEqual(model.state, .loaded)
        XCTAssertEqual(ids(model), [1])
        model.reload()
        XCTAssertEqual(model.state, .loading)
        XCTAssertTrue(model.sections.isEmpty)
    }

    func testFilterChangeStillShowsTheSpinner() {
        let source = FakeSource()
        let model = OrdersHomeViewModel(dataSource: source)
        model.select(.rent)
        source.completeOrders(at: 0, ids: [1])
        model.selectStatus(.reserved)
        XCTAssertEqual(model.state, .loading)
        XCTAssertTrue(model.sections.isEmpty)
    }

    func testStatusChipReloadsTheRentList() {
        let source = FakeSource()
        let model = OrdersHomeViewModel(dataSource: source)
        model.select(.rent)
        model.selectStatus(.cancelled)
        XCTAssertEqual(source.orderCalls.map(\.query.status), [nil, .cancelled])
        source.completeOrders(at: 1, ids: [3])
        XCTAssertEqual(model.total, 1)
    }

    func testFilterCountDropsOlderAnswers() {
        let source = FakeSource()
        let model = OrdersHomeViewModel(dataSource: source)
        var counts: [Int?] = []
        var first = RentOrdersFilter()
        first.dateRange = .today
        model.count(for: first) { counts.append($0) }
        model.count(for: RentOrdersFilter()) { counts.append($0) }
        source.completeOrders(at: 1, ids: [1, 2])
        source.completeOrders(at: 0, ids: [1])
        XCTAssertEqual(counts, [2])
    }

    private func drainMain() {
        let done = expectation(description: "main queue")
        DispatchQueue.main.async { done.fulfill() }
        wait(for: [done], timeout: 1)
    }
    // MARK: #458 — no "đã thu đủ" line; overview drill-down lists use the Orders tab row

    private func listOrder(_ id: Int, status: String, returnPlanAt: String = "2026-10-08T02:00:00.000Z",
                           balances: String = "") throws -> Order {
        let json = #"{"id":\#(id),"orderNumber":"ORD-19-000\#(id)","orderType":"RENT","status":"\#(status)","createdAt":"2026-10-01T03:00:00.000Z","updatedAt":"2026-10-01T03:00:00.000Z","pickupPlanAt":"2026-10-01T02:00:00.000Z","returnPlanAt":"\#(returnPlanAt)","customerName":"Huy","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B","totalAmount":300000\#(balances)}"#
        return try JSONDecoder.shared.decode(Order.self, from: Data(json.utf8))
    }

    /// Texts of the labels a user can see in the cell (the label and every parent up to the cell are shown)
    /// #1008: a date chip as shown: the icon (a text attachment) then the date
    private func iconChip(_ date: String) -> String { "\u{FFFC} " + date }

    /// #1032: a row warning shows its icon, a space, then the text
    private func warningChip(_ text: String) -> String { "\u{FFFC} " + text }

    private func visibleTexts(_ cell: UITableViewCell) -> [String] {
        func isShown(_ view: UIView) -> Bool {
            var current: UIView? = view
            while let v = current, v !== cell {
                if v.isHidden { return false }
                current = v.superview
            }
            return true
        }
        func walk(_ view: UIView) -> [String] {
            var texts: [String] = []
            if let label = view as? UILabel, isShown(label), let text = label.text ?? label.attributedText?.string, !text.isEmpty {
                texts.append(text)
            }
            return texts + view.subviews.flatMap(walk)
        }
        return walk(cell.contentView)
    }

    func testOrderRowsCarryLateDaysForOverviewLists() throws {
        let now = iso.date(from: "2026-10-05T03:00:00Z")!
        let late = try listOrder(1, status: "PICKUPED", returnPlanAt: "2026-10-03T02:00:00.000Z")
        let onTime = try listOrder(2, status: "PICKUPED")
        let rows = OrdersHomeLogic.orderRows([late, onTime], now: now, timeZone: vietnam)
        XCTAssertEqual(rows.map(\.orderId), [1, 2], "keeps the API order")
        guard case .order(_, let lateDays) = rows[0], case .order(_, let onTimeDays) = rows[1] else {
            return XCTFail("overview rows are order rows")
        }
        XCTAssertEqual(lateDays, 2)
        XCTAssertEqual(onTimeDays, 0)
    }

    func testRowCellShowsOnlyTheTotalWhenFullyPaid() throws {
        let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
        let due = try listOrder(1, status: "PICKUPED", balances: #","amountDue":120000,"refundDue":0"#)
        let paid = try listOrder(2, status: "PICKUPED", balances: #","amountDue":0,"refundDue":0"#)
        cell.configure(.order(due, lateDays: 0), context: .search, hidesMoney: false)
        let dueTexts = visibleTexts(cell)
        XCTAssertTrue(dueTexts.contains(String(format: "orders.v2.pay.due".localized(), MoneyFormatter.format(120000))))
        // Reused cell: the pay line of the previous row must not stay behind
        cell.configure(.order(paid, lateDays: 0), context: .search, hidesMoney: false)
        let paidTexts = visibleTexts(cell)
        XCTAssertEqual(paidTexts.count, dueTexts.count - 1, "fully paid: the total only, no second line")
        XCTAssertFalse(paidTexts.contains { $0.contains("✓") })
        XCTAssertTrue(paidTexts.contains(MoneyFormatter.format(300000)))
    }

    /// #1037: product / customer detail put the row in a stack view, not a table view: it must get its content height
    func testStandaloneRowHasItsContentHeightInAStackView() throws {
        let order = try listOrder(1, status: "RESERVED")
        func stackedHeight(_ cell: OrderRowCell) -> CGFloat {
            cell.configure(.order(order, lateDays: 0), context: .productOrders(quantity: 1), hidesMoney: false)
            let control = UIControl()
            control.addSubview(cell)
            cell.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                cell.topAnchor.constraint(equalTo: control.topAnchor), cell.bottomAnchor.constraint(equalTo: control.bottomAnchor),
                cell.leadingAnchor.constraint(equalTo: control.leadingAnchor), cell.trailingAnchor.constraint(equalTo: control.trailingAnchor),
            ])
            let stack = UIStackView(arrangedSubviews: [control])
            stack.axis = .vertical
            let host = UIView(frame: CGRect(x: 0, y: 0, width: 390, height: 800))
            host.addSubview(stack)
            stack.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                stack.topAnchor.constraint(equalTo: host.topAnchor), stack.leadingAnchor.constraint(equalTo: host.leadingAnchor),
                stack.trailingAnchor.constraint(equalTo: host.trailingAnchor),
            ])
            host.layoutIfNeeded()
            return control.frame.height
        }
        XCTAssertGreaterThanOrEqual(stackedHeight(OrderRowCell.standalone()), 44, "the row shows its lines")
    }

    /// #888 (owner): Tất cả đơn rows have no "Trễ N ngày" chip; other lists keep it; the name stays on one line
    func testRentListRowHasNoLateChip() throws {
        let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
        let late = try listOrder(1, status: "PICKUPED", balances: "")
        cell.configure(.order(late, lateDays: 3), context: .rentList(sortedBy: .returnDate), hidesMoney: false)
        XCTAssertFalse(visibleTexts(cell).contains(warningChip(LateText.days(3))))
        cell.configure(.order(late, lateDays: 3), context: .search, hidesMoney: false)
        XCTAssertTrue(visibleTexts(cell).contains(warningChip(LateText.days(3))))
        func labels(_ view: UIView) -> [UILabel] { (view as? UILabel).map { [$0] } ?? [] + view.subviews.flatMap(labels) }
        let name = labels(cell.contentView).first { $0.text == late.customerName }
        XCTAssertEqual(name?.numberOfLines, 1)
    }

    /// #891 (owner): the order detail badge is the list badge: same fill, text colour, font, radius and padding
    func testDetailBadgeMatchesTheListBadge() throws {
        func labels(_ view: UIView) -> [UIView] { [view] + view.subviews.flatMap(labels) }
        for status in ["RESERVED", "PICKUPED", "RETURNED", "COMPLETED", "CANCELLED"] {
            let order = try listOrder(1, status: status, balances: "")
            let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
            cell.configure(.order(order, lateDays: 0), context: .list, hidesMoney: false)
            guard let row = labels(cell.contentView).compactMap({ $0 as? RowTagLabel })
                .first(where: { $0.text == OrdersHomeLogic.statusTag(order).text }) else { return XCTFail(status) }
            let detail = RowTagLabel.statusBadge(OrdersHomeLogic.statusTag(order.status))
            XCTAssertEqual(row.text, detail.text, status)
            XCTAssertEqual(hex(row.backgroundColor!), hex(detail.backgroundColor!), status)
            XCTAssertEqual(hex(row.textColor), hex(detail.textColor), status)
            XCTAssertEqual(hex(detail.textColor), "FFFFFF", status)
            XCTAssertEqual(row.font, detail.font, status)
            XCTAssertEqual(row.layer.cornerRadius, detail.layer.cornerRadius, status)
            XCTAssertEqual(row.insets, detail.insets, status)
        }
    }

    // MARK: #891 — date chips (option C), product and customer order rows

    func testDateChipsEmphasiseOnlyTheSortedDateByWeight() {
        let pickup = iso.date(from: "2026-10-13T17:30:00Z")! // 14/10 in Vietnam
        let back = iso.date(from: "2026-10-16T02:00:00Z")!
        let byPickup = OrdersHomeLogic.dateChips(pickupPlanAt: pickup, returnPlanAt: back, sortedBy: .pickup, timeZone: vietnam)
        XCTAssertEqual(byPickup, [DateChip(kind: .pickup, label: "orders.chip.pickup".localized(), date: "14/10/26", bold: true),
                                  DateChip(kind: .return, label: "orders.chip.return".localized(), date: "16/10/26", bold: false)])
        XCTAssertEqual(OrdersHomeLogic.dateChips(pickupPlanAt: pickup, returnPlanAt: back, sortedBy: .returnDate, timeZone: vietnam).map(\.bold),
                       [false, true])
        XCTAssertEqual(OrdersHomeLogic.dateChips(pickupPlanAt: pickup, returnPlanAt: back, sortedBy: nil, timeZone: vietnam).map(\.bold),
                       [false, false], "other lists: no emphasis")
        XCTAssertEqual(OrdersHomeLogic.dateChips(pickupPlanAt: nil, returnPlanAt: back, sortedBy: .pickup, timeZone: vietnam).map(\.kind), [.return])
        XCTAssertTrue(OrdersHomeLogic.metaIsBold(sortedBy: .created))
        XCTAssertFalse(OrdersHomeLogic.metaIsBold(sortedBy: .pickup))
        XCTAssertFalse(OrdersHomeLogic.metaIsBold(sortedBy: nil))
        // #1026 (owner, intentional change from #891 blue / purple): no colour, dark text on no fill
        for kind in [DateChip.Kind.pickup, .return, .sale] {
            XCTAssertEqual(kind.colors.fill.cgColor.alpha, 0, "\(kind): no fill")
            XCTAssertEqual(hex(kind.colors.text), "0F172A", "\(kind): dark text")
        }
    }

    func testRowCellShowsChipsQuantityAndBoldCreatedDay() throws {
        func labels(_ view: UIView) -> [UILabel] { (view as? UILabel).map { [$0] } ?? [] + view.subviews.flatMap(labels) }
        let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
        let order = try listOrder(1, status: "RESERVED", balances: "")
        cell.configure(.order(order, lateDays: 0), context: .rentList(sortedBy: .created), hidesMoney: false)
        let texts = visibleTexts(cell)
        XCTAssertTrue(texts.contains(iconChip("01/10/26")), "#1008: icon then date: \(texts)")
        let meta = labels(cell.contentView).first { $0.text?.hasPrefix("#") == true }
        XCTAssertEqual(meta?.font, Utils.mediumFont(size: 13), "sorted by created: the created day is medium")
        cell.configure(.order(order, lateDays: 0), context: .rentList(sortedBy: .pickup), hidesMoney: false)
        XCTAssertEqual(labels(cell.contentView).first { $0.text?.hasPrefix("#") == true }?.font, Utils.regularFont(size: 13))
        cell.configure(.order(order, lateDays: 0), context: .productOrders(quantity: 2), hidesMoney: false)
        XCTAssertTrue(visibleTexts(cell).contains("× 2"))
        cell.configure(.order(order, lateDays: 0), context: .search, hidesMoney: false)
        XCTAssertFalse(visibleTexts(cell).contains("× 2"), "reused cell drops the quantity")
    }

    /// #893 (owner on device): the sorted chip must read clearly bold; the other chip regular; a sort change updates it
    func testSortChangeUpdatesChipEmphasis() throws {
        func views(_ view: UIView) -> [UIView] { [view] + view.subviews.flatMap(views) }
        func dateFont(_ cell: OrderRowCell, prefix: String) -> UIFont? {
            guard let label = views(cell.contentView).compactMap({ $0 as? InsetLabel })
                .first(where: { $0.accessibilityLabel?.hasPrefix(prefix) == true }), // #1008: the word is spoken, not shown
                  let text = label.attributedText else { return nil }
            return text.attribute(.font, at: text.length - 1, effectiveRange: nil) as? UIFont
        }
        let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
        let order = try listOrder(1, status: "RESERVED", balances: "")
        let pickup = "orders.chip.pickup".localized(), back = "orders.chip.return".localized()
        cell.configure(.order(order, lateDays: 0), context: .rentList(sortedBy: .pickup), hidesMoney: false)
        XCTAssertEqual(dateFont(cell, prefix: pickup), Utils.mediumFont(size: DS.TextSize.body))
        XCTAssertEqual(dateFont(cell, prefix: back), Utils.regularFont(size: DS.TextSize.body))
        cell.configure(.order(order, lateDays: 0), context: .rentList(sortedBy: .returnDate), hidesMoney: false)
        XCTAssertEqual(dateFont(cell, prefix: pickup), Utils.regularFont(size: DS.TextSize.body))
        XCTAssertEqual(dateFont(cell, prefix: back), Utils.mediumFont(size: DS.TextSize.body))
        cell.configure(.order(order, lateDays: 0), context: .rentList(sortedBy: .created), hidesMoney: false)
        XCTAssertEqual(dateFont(cell, prefix: pickup), Utils.regularFont(size: DS.TextSize.body))
        XCTAssertEqual(dateFont(cell, prefix: back), Utils.regularFont(size: DS.TextSize.body))
    }

    // MARK: #1025 — a product's orders sort like Tất cả đơn

    func testProductOrdersDefaultSortIsPickupNearestFirst() {
        let sort = EntityOrdersLogic.defaultProductSort
        XCTAssertEqual(sort.sortDate, .pickup)
        XCTAssertEqual(sort.direction, .nearestFirst)
        let query = EntityOrdersLogic.productOrdersQuery(sort)
        XCTAssertEqual(query.sortBy, "pickupPlanAt")
        XCTAssertEqual(query.sortOrder, "desc", "nearest first means desc, as on Tất cả đơn (#888)")
        XCTAssertEqual(OrdersHomeLogic.sortBarText(sort), OrdersHomeLogic.sortBarText(RentOrdersFilter()))
    }

    func testProductOrdersQueryPerChoice() {
        let expected: [(RentOrdersFilter.SortDate, RentOrdersFilter.Direction, String, String)] = [
            (.pickup, .nearestFirst, "pickupPlanAt", "desc"), (.pickup, .farthestFirst, "pickupPlanAt", "asc"),
            (.returnDate, .nearestFirst, "returnPlanAt", "desc"), (.returnDate, .farthestFirst, "returnPlanAt", "asc"),
            (.created, .nearestFirst, "createdAt", "desc"), (.created, .farthestFirst, "createdAt", "asc"),
        ]
        for (date, direction, sortBy, sortOrder) in expected {
            var sort = RentOrdersFilter()
            sort.sortDate = date
            sort.direction = direction
            let query = EntityOrdersLogic.productOrdersQuery(sort)
            XCTAssertEqual(query.sortBy, sortBy, "\(date) \(direction)")
            XCTAssertEqual(query.sortOrder, sortOrder, "\(date) \(direction)")
        }
    }

    func testOnlyProductOrdersGetTheSortControl() {
        XCTAssertTrue(OverviewRankingOrdersFilter.product(id: 1, name: "Áo").hasSortControl)
        XCTAssertFalse(OverviewRankingOrdersFilter.customer(id: 1, name: "An").hasSortControl)
        XCTAssertFalse(OverviewRankingOrdersFilter.rentedOut(title: "x").hasSortControl)
        XCTAssertFalse(OverviewRankingOrdersFilter.lateReturns(title: "x").hasSortControl)
        XCTAssertFalse(OverviewRankingOrdersFilter.snapshot(.pickup, title: "x").hasSortControl)
        var sort = RentOrdersFilter()
        sort.sortDate = .returnDate
        if case .sortedList(let date) = EntityOrdersLogic.rowContext(.product(id: 1, name: "Áo"), sort: sort) {
            XCTAssertEqual(date, .returnDate)
        } else {
            XCTFail("product rows carry the sort date")
        }
        if case .list = EntityOrdersLogic.rowContext(.customer(id: 1, name: "An"), sort: sort) {} else {
            XCTFail("the customer list keeps the plain list row")
        }
    }

    /// #1025: the product list row bolds the sorted date (rule #891/#893)
    func testProductOrdersRowBoldsSortedDate() throws {
        func views(_ view: UIView) -> [UIView] { [view] + view.subviews.flatMap(views) }
        func labels(_ view: UIView) -> [UILabel] { (view as? UILabel).map { [$0] } ?? [] + view.subviews.flatMap(labels) }
        func dateFont(_ cell: OrderRowCell, prefix: String) -> UIFont? {
            guard let label = views(cell.contentView).compactMap({ $0 as? InsetLabel })
                .first(where: { $0.accessibilityLabel?.hasPrefix(prefix) == true }),
                  let text = label.attributedText else { return nil }
            return text.attribute(.font, at: text.length - 1, effectiveRange: nil) as? UIFont
        }
        let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
        let order = try listOrder(1, status: "RESERVED", balances: "")
        let pickup = "orders.chip.pickup".localized(), back = "orders.chip.return".localized()
        let product = OverviewRankingOrdersFilter.product(id: 1, name: "Áo")
        // Default sort: the pickup chip is bold
        cell.configure(.order(order, lateDays: 0), context: EntityOrdersLogic.rowContext(product, sort: EntityOrdersLogic.defaultProductSort),
                       hidesMoney: false)
        XCTAssertEqual(dateFont(cell, prefix: pickup), Utils.mediumFont(size: DS.TextSize.body))
        XCTAssertEqual(dateFont(cell, prefix: back), Utils.regularFont(size: DS.TextSize.body))
        cell.configure(.order(order, lateDays: 0), context: .sortedList(sortedBy: .returnDate), hidesMoney: false)
        XCTAssertEqual(dateFont(cell, prefix: pickup), Utils.regularFont(size: DS.TextSize.body))
        XCTAssertEqual(dateFont(cell, prefix: back), Utils.mediumFont(size: DS.TextSize.body))
        cell.configure(.order(order, lateDays: 0), context: .sortedList(sortedBy: .created), hidesMoney: false)
        XCTAssertEqual(dateFont(cell, prefix: pickup), Utils.regularFont(size: DS.TextSize.body))
        XCTAssertEqual(dateFont(cell, prefix: back), Utils.regularFont(size: DS.TextSize.body))
        XCTAssertEqual(labels(cell.contentView).first { $0.text?.hasPrefix("#") == true }?.font, Utils.mediumFont(size: 13),
                       "sorted by created: the created day is bold")
        // The plain list row (customer orders) bolds nothing
        cell.configure(.order(order, lateDays: 0), context: .list, hidesMoney: false)
        XCTAssertEqual(dateFont(cell, prefix: pickup), Utils.regularFont(size: DS.TextSize.body))
        XCTAssertEqual(dateFont(cell, prefix: back), Utils.regularFont(size: DS.TextSize.body))
    }

    // MARK: #1008 — date chips show an icon in place of "Lấy" / "Trả"

    func testDateChipIconsAndSpokenText() {
        XCTAssertEqual(DateChip.Kind.pickup.symbolName, "arrow.up.forward")
        XCTAssertEqual(DateChip.Kind.return.symbolName, "arrow.uturn.backward")
        XCTAssertNotNil(UIImage(systemName: DateChip.Kind.pickup.symbolName))
        XCTAssertNotNil(UIImage(systemName: DateChip.Kind.return.symbolName))
        let pickup = iso.date(from: "2026-10-13T17:30:00Z")! // 14/10 in Vietnam
        let back = iso.date(from: "2026-10-16T02:00:00Z")!
        let chips = OrdersHomeLogic.dateChips(pickupPlanAt: pickup, returnPlanAt: back, sortedBy: .pickup, timeZone: vietnam)
        XCTAssertEqual(chips.map(\.accessibilityText), ["orders.chip.pickup".localized() + " 14/10/26",
                                                        "orders.chip.return".localized() + " 16/10/26"])

        // The chip view: icon + " " + date, no word; VoiceOver reads the word and the date; #1026: no fill
        let stack = DateChipStack()
        stack.show(chips)
        let labels = stack.arrangedSubviews.compactMap { $0 as? InsetLabel }
        XCTAssertEqual(labels.count, 2)
        XCTAssertEqual(labels.map(\.accessibilityLabel), chips.map(\.accessibilityText))
        for (label, chip) in zip(labels, chips) {
            let text = label.attributedText!
            XCTAssertFalse(text.string.contains(chip.label), "the word is gone")
            XCTAssertTrue(text.string.hasSuffix(" " + chip.date))
            XCTAssertNotNil(text.attribute(.attachment, at: 0, effectiveRange: nil) as? NSTextAttachment, "icon first")
            XCTAssertEqual(label.backgroundColor?.cgColor.alpha ?? 0, 0, "#1026: no fill")
        }

        // Việc cần làm / calendar date chips carry the icon kind and the date; their text stays the spoken text
        let work = TodayWorkRow(id: 1, orderNumber: "1", pickupPlanAt: pickup, returnPlanAt: back,
                                isReadyToDeliver: false, totalAmount: 0, amountDue: 0, lateDays: 1)
        let workChips = OrdersHomeLogic.workChips(work, kind: .handOver, timeZone: vietnam)
        XCTAssertEqual(workChips.map(\.dateKind), [.pickup, nil, nil], "only the date chip gets an icon")
        XCTAssertEqual(workChips[0].date, "14/10/26")
        XCTAssertEqual(OrdersHomeLogic.workChips(work, kind: .takeBack, timeZone: vietnam).first?.dateKind, .return)
        let lines = UIStackView()
        OrderRowCell.fillChipLines(lines, chips: workChips, width: 1000)
        let shown = lines.arrangedSubviews.flatMap { ($0 as? UIStackView)?.arrangedSubviews ?? [] }.compactMap { $0 as? InsetLabel }
        XCTAssertEqual(shown.first?.accessibilityLabel, "orders.chip.pickup".localized() + " 14/10/26")
        XCTAssertEqual(shown.first?.attributedText?.string.hasSuffix(" 14/10/26"), true)
        XCTAssertFalse(shown.first?.attributedText?.string.contains("orders.chip.pickup".localized()) ?? true)
        XCTAssertEqual(shown[1].accessibilityLabel, LateText.days(1), "other chips keep their spoken text")
    }

    // MARK: #1026 — only the status badge keeps colour

    /// Every date chip (order rows, Việc cần làm, calendar): no fill, grey icon, dark text; the spoken text keeps the word
    func testDateChipsHaveNoFillAndAGreyIcon() throws {
        func views(_ view: UIView) -> [UIView] { [view] + view.subviews.flatMap(views) }
        XCTAssertEqual(hex(DateChip.iconColor), "64748B")
        for kind in [DateChip.Kind.pickup, .return, .sale] { XCTAssertEqual(hex(kind.iconColor), "64748B") }

        let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
        let order = try listOrder(1, status: "RESERVED", balances: "")
        cell.configure(.order(order, lateDays: 0), context: .rentList(sortedBy: .pickup), hidesMoney: false)
        let chips = views(cell.contentView).compactMap { $0 as? InsetLabel }.filter { $0.accessibilityLabel != nil && !$0.isHidden }
        XCTAssertEqual(chips.map(\.accessibilityLabel), ["orders.chip.pickup".localized() + " 01/10/26",
                                                         "orders.chip.return".localized() + " 08/10/26"], "spoken text unchanged")
        for chip in chips {
            XCTAssertEqual(chip.backgroundColor?.cgColor.alpha ?? 0, 0, "no fill")
            XCTAssertEqual(chip.insets.left, 0, "no fill, no left padding")
            let text = chip.attributedText!
            let dateColor = text.attribute(.foregroundColor, at: text.length - 1, effectiveRange: nil) as? UIColor
            XCTAssertEqual(dateColor.map(hex), "0F172A", "dark date")
            XCTAssertNotNil(text.attribute(.attachment, at: 0, effectiveRange: nil) as? NSTextAttachment, "icon first")
        }
        // The status badge keeps its solid colour
        let badge = views(cell.contentView).compactMap { $0 as? RowTagLabel }.first { $0.text == OrdersHomeLogic.statusTag(.reserved).text }
        XCTAssertEqual(badge?.backgroundColor.map(hex), "EF4444")

        // Việc cần làm: the date chip has no fill; #1032 (intentional change): "Trễ N ngày" and "Chưa soạn đồ"
        // lost their box too (see testRowWarningsHaveNoBox)
        let work = TodayWorkRow(id: 1, orderNumber: "1", pickupPlanAt: iso.date(from: "2026-10-13T17:30:00Z"),
                                returnPlanAt: iso.date(from: "2026-10-16T02:00:00Z"), isReadyToDeliver: false,
                                totalAmount: 0, amountDue: 0, lateDays: 1)
        let lines = UIStackView()
        OrderRowCell.fillChipLines(lines, chips: OrdersHomeLogic.workChips(work, kind: .handOver, timeZone: vietnam), width: 1000)
        let shown = lines.arrangedSubviews.flatMap { ($0 as? UIStackView)?.arrangedSubviews ?? [] }.compactMap { $0 as? InsetLabel }
        XCTAssertEqual(shown.count, 3)
        XCTAssertEqual(shown[0].backgroundColor?.cgColor.alpha ?? 0, 0)
        XCTAssertEqual(shown[0].accessibilityLabel, "orders.chip.pickup".localized() + " 14/10/26")
        XCTAssertEqual(shown[1].backgroundColor?.cgColor.alpha ?? 0, 0, "#1032: Trễ N ngày has no box")
        XCTAssertEqual(shown[2].backgroundColor?.cgColor.alpha ?? 0, 0, "#1032: Chưa soạn đồ has no box")

        // Product calendar day orders: "↗ 05/10/26   ↩ 07/10/26", no words (VoiceOver keeps products.calendar.orderDays)
        let font = Utils.regularFont(size: DS.TextSize.secondary)
        let dates = ProductCalendarViewController.iconDates(pickup: "05/10/26", ret: "07/10/26", font: font, color: DS.Color.textMuted)
        XCTAssertEqual(dates.string, "\u{FFFC} 05/10/26   \u{FFFC} 07/10/26")
    }

    /// A sale row: "↗ dd/mm/yy" (the created day) in place of "Bán dd/mm/yy"; VoiceOver reads "Bán dd/mm/yy"
    func testSaleRowShowsTheSaleDateChip() throws {
        let created = iso.date(from: "2026-10-14T18:00:00Z")! // 15/10 in Vietnam
        let chip = OrdersHomeLogic.saleChip(orderType: .sale, status: .completed, createdAt: created, timeZone: vietnam)
        XCTAssertEqual(chip, DateChip(kind: .sale, label: "orders.chip.sale".localized(), date: "15/10/26", bold: false))
        XCTAssertEqual(chip?.accessibilityText, String(format: "orders.row.sold".localized(), "15/10/26"), "spoken as before")
        XCTAssertEqual(DateChip.Kind.sale.symbolName, "arrow.up.forward")
        XCTAssertNil(OrdersHomeLogic.saleChip(orderType: .sale, status: .cancelled, createdAt: created), "a cancelled sale keeps Huỷ")
        XCTAssertNil(OrdersHomeLogic.saleChip(orderType: .rent, status: .reserved, createdAt: created))

        let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
        let sale = try order(status: "COMPLETED", type: "SALE")
        cell.configure(.order(sale, lateDays: 0), context: .list, hidesMoney: false)
        let texts = visibleTexts(cell)
        XCTAssertTrue(texts.contains(iconChip("02/10/26")), "\(texts)")
        XCTAssertFalse(texts.contains { $0.hasPrefix("orders.chip.sale".localized() + " ") }, "no word: \(texts)")
        let cancelled = try order(status: "CANCELLED", type: "SALE", updated: "2026-09-29T03:00:00.000Z")
        cell.configure(.order(cancelled, lateDays: 0), context: .list, hidesMoney: false)
        XCTAssertTrue(visibleTexts(cell).contains(String(format: "orders.row.cancelled".localized(), "29/09/26")))

        // Customer detail: a sale order shows the same chip
        let row = CustomerOrderRow(id: 3, orderNumber: "3", orderType: .sale, status: .completed, totalAmount: 0,
                                   pickupPlanAt: nil, returnPlanAt: nil, createdAt: created, itemCount: 1, items: [CustomerOrderRow.Item(productName: "Áo", quantity: 1)])
        cell.configure(customerOrder: row, hidesMoney: false)
        XCTAssertTrue(visibleTexts(cell).contains(iconChip("15/10/26")), "\(visibleTexts(cell))")
    }

    /// #1025: in the sorted product list a sale row shows the day the list is sorted by (pickup sort → pickup day,
    /// created sort → created day; return sort keeps the created day). Other lists keep the created day.
    func testSortedProductListSaleRowShowsTheSortedDay() throws {
        let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
        // created 02/10/26, pickup 04/10/26 (Vietnam)
        let sale = try order(status: "COMPLETED", type: "SALE")
        func shows(_ context: OrderRowContext, _ date: String, _ other: String, file: StaticString = #filePath, line: UInt = #line) {
            cell.configure(.order(sale, lateDays: 0), context: context, hidesMoney: false)
            let texts = visibleTexts(cell)
            XCTAssertTrue(texts.contains(iconChip(date)), "\(context): \(texts)", file: file, line: line)
            XCTAssertFalse(texts.contains(iconChip(other)), "\(context): \(texts)", file: file, line: line)
        }
        shows(.sortedList(sortedBy: .pickup), "04/10/26", "02/10/26")
        shows(.sortedList(sortedBy: .created), "02/10/26", "04/10/26")
        shows(.sortedList(sortedBy: .returnDate), "02/10/26", "04/10/26")
        shows(.list, "02/10/26", "04/10/26")

        // No pickup day on the sale: falls back to the created day
        let json = #"{"id":2,"orderNumber":"ORD-1-0063","orderType":"SALE","status":"COMPLETED","createdAt":"2026-10-02T03:00:00.000Z","updatedAt":"2026-10-02T03:00:00.000Z","customerName":"Tâm","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B","totalAmount":1,"orderItems":[]}"#
        let noPickup = try JSONDecoder.shared.decode(Order.self, from: Data(json.utf8))
        cell.configure(.order(noPickup, lateDays: 0), context: .sortedList(sortedBy: .pickup), hidesMoney: false)
        XCTAssertTrue(visibleTexts(cell).contains(iconChip("02/10/26")), "\(visibleTexts(cell))")

        // VoiceOver reads the shown day ("Bán 04/10/26")
        cell.configure(.order(sale, lateDays: 0), context: .sortedList(sortedBy: .pickup), hidesMoney: false)
        func views(_ view: UIView) -> [UIView] { [view] + view.subviews.flatMap(views) }
        XCTAssertTrue(views(cell.contentView).contains { $0.accessibilityLabel == String(format: "orders.row.sold".localized(), "04/10/26") })
    }

    // MARK: #1032 — late and not-prepared warnings without a box

    /// "Trễ N ngày" (red, clock) and "Chưa soạn đồ" (orange, box): icon then text, no fill; spoken text unchanged;
    /// the status badge stays solid. Order rows, Việc cần làm, Chưa lấy đồ and the calendar day rows.
    func testRowWarningsHaveNoBox() throws {
        func views(_ view: UIView) -> [UIView] { [view] + view.subviews.flatMap(views) }
        XCTAssertEqual(hex(RowWarning.late.color), "B91C1C")
        XCTAssertEqual(hex(RowWarning.notPrepared.color), "9A3412")
        XCTAssertEqual(RowWarning.late.symbolName, "clock")
        XCTAssertEqual(RowWarning.notPrepared.symbolName, "shippingbox")
        XCTAssertEqual(RowWarning.fontSize, DS.TextSize.pill)
        XCTAssertEqual(RowWarning.font, Utils.mediumFont(size: DS.TextSize.pill))
        XCTAssertNotNil(UIImage(systemName: RowWarning.late.symbolName))
        XCTAssertNotNil(UIImage(systemName: RowWarning.notPrepared.symbolName))
        // The DS tokens other screens use keep their fills
        XCTAssertEqual(hex(DS.Status.late.fill), "FEE2E2")
        XCTAssertEqual(hex(DS.Status.waiting.fill), "FFEDD5")

        func assertWarning(_ label: InsetLabel?, _ text: String, _ warning: RowWarning, line: UInt = #line) {
            guard let label else { return XCTFail("no warning \(text)", line: line) }
            XCTAssertEqual(label.backgroundColor?.cgColor.alpha ?? 0, 0, "no fill", line: line)
            XCTAssertEqual(label.insets.left, 0, "no box, no left padding", line: line)
            XCTAssertEqual(label.accessibilityLabel, text, "spoken text unchanged", line: line)
            guard let attributed = label.attributedText else { return XCTFail("no text", line: line) }
            XCTAssertNotNil(attributed.attribute(.attachment, at: 0, effectiveRange: nil) as? NSTextAttachment, "icon first", line: line)
            XCTAssertEqual(attributed.string, "\u{FFFC} " + text, line: line)
            let color = attributed.attribute(.foregroundColor, at: attributed.length - 1, effectiveRange: nil) as? UIColor
            XCTAssertEqual(color.map(hex), hex(warning.color), line: line)
            let font = attributed.attribute(.font, at: attributed.length - 1, effectiveRange: nil) as? UIFont
            XCTAssertEqual(font, RowWarning.font, line: line)
        }

        // Order list / search row: "Trễ 3 ngày"; the status badge keeps its solid fill
        let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
        let late = try listOrder(1, status: "PICKUPED", balances: "")
        cell.configure(.order(late, lateDays: 3), context: .search, hidesMoney: false)
        let insetLabels = views(cell.contentView).compactMap { $0 as? InsetLabel }
        assertWarning(insetLabels.first { $0.accessibilityLabel == LateText.days(3) }, LateText.days(3), .late)
        let badge = views(cell.contentView).compactMap { $0 as? RowTagLabel }.first { !$0.isHidden && $0.text != nil && $0.text != "" }
        XCTAssertNotEqual(badge?.backgroundColor?.cgColor.alpha ?? 0, 0, "status badge stays solid")
        XCTAssertNil(views(cell.contentView).compactMap { $0 as? RowTagLabel }.first { $0.text == LateText.days(3) },
                     "no boxed late tag")

        // Chưa lấy đồ: "Quá 3 ngày · nên gọi khách"
        let reserved = try listOrder(2, status: "RESERVED", balances: "")
        cell.configure(.order(reserved, lateDays: 3), context: .notPickedUp, hidesMoney: false)
        let overdue = PluralText.format("notPickedUp.chip", count: 3, 3)
        assertWarning(views(cell.contentView).compactMap { $0 as? InsetLabel }.first { $0.accessibilityLabel == overdue }, overdue, .late)

        // Việc cần làm: "Trễ 1 ngày", "Chưa soạn đồ"
        let work = TodayWorkRow(id: 1, orderNumber: "1", pickupPlanAt: iso.date(from: "2026-10-13T17:30:00Z"),
                                returnPlanAt: iso.date(from: "2026-10-16T02:00:00Z"), isReadyToDeliver: false,
                                totalAmount: 0, amountDue: 0, lateDays: 1)
        let lines = UIStackView()
        OrderRowCell.fillChipLines(lines, chips: OrdersHomeLogic.workChips(work, kind: .handOver, timeZone: vietnam), width: 1000)
        let shown = lines.arrangedSubviews.flatMap { ($0 as? UIStackView)?.arrangedSubviews ?? [] }.compactMap { $0 as? InsetLabel }
        XCTAssertEqual(shown.count, 3)
        assertWarning(shown[1], LateText.days(1), .late)
        assertWarning(shown[2], "orders.v2.notPrepared".localized(), .notPrepared)
    }

    /// #1032 (owner, mockup "Lịch › đơn trễ: icon"): the calendar late note is the order-row late warning (clock,
    /// small red text, not bold, no box), then "· phí N" in grey regular; VoiceOver reads the same text as before
    func testCalendarLateNoteUsesTheLateWarning() throws {
        let fee = " · " + String(format: "calendar.v2.fee".localized(), MoneyFormatter.format(50000))
        let withFee = CalendarDayRowCell.lateNote(days: 2, fee: 50000)
        XCTAssertEqual(withFee.spoken, LateText.days(2) + fee, "spoken text unchanged")
        XCTAssertEqual(withFee.text.string, "\u{FFFC} " + LateText.days(2) + fee)
        XCTAssertNotNil(withFee.text.attribute(.attachment, at: 0, effectiveRange: nil) as? NSTextAttachment, "clock first")
        let lateAt = (withFee.text.string as NSString).range(of: LateText.days(2)).location
        XCTAssertEqual((withFee.text.attribute(.foregroundColor, at: lateAt, effectiveRange: nil) as? UIColor).map(hex), "B91C1C")
        XCTAssertEqual(withFee.text.attribute(.font, at: lateAt, effectiveRange: nil) as? UIFont, RowWarning.font, "small, not bold")
        let feeAt = withFee.text.length - 1
        XCTAssertEqual((withFee.text.attribute(.foregroundColor, at: feeAt, effectiveRange: nil) as? UIColor).map(hex), "64748B")
        XCTAssertEqual(withFee.text.attribute(.font, at: feeAt, effectiveRange: nil) as? UIFont,
                       Utils.regularFont(size: DS.TextSize.pill))
        let noFee = CalendarDayRowCell.lateNote(days: 1, fee: nil)
        XCTAssertEqual(noFee.spoken, LateText.days(1))
        XCTAssertEqual(noFee.text.string, "\u{FFFC} " + LateText.days(1))

        // The cell: a late return row shows it with no fill; VoiceOver keeps the old text
        let json = #"{"id":3,"orderNumber":"ORD-1-0063","customerName":"Huy","status":"PICKUPED","orderType":"RENT","totalAmount":300000,"lateFee":50000,"orderItems":[],"createdAt":"2026-10-05T07:30:00.000Z","pickupPlanAt":"2026-10-13T17:30:00.000Z","returnPlanAt":"2026-10-16T02:00:00.000Z"}"#
        let order = try JSONDecoder.shared.decode(CalendarDayOrder.self, from: Data(json.utf8))
        let cell = CalendarDayRowCell(style: .default, reuseIdentifier: nil)
        cell.configure(CalendarDayRow(kind: .takeBack, order: order, lateDays: 2), hidesMoney: false)
        func labels(_ view: UIView) -> [UILabel] { ((view as? UILabel).map { [$0] } ?? []) + view.subviews.flatMap(labels) }
        let note = try XCTUnwrap(labels(cell.contentView).first { $0.accessibilityLabel == LateText.days(2) + fee })
        XCTAssertFalse(note.isHidden)
        XCTAssertEqual(note.attributedText?.string, withFee.text.string)
        XCTAssertEqual(note.backgroundColor?.cgColor.alpha ?? 0, 0, "no box")
        // Reused for a row with money due: the old 14pt bold orange note, no icon
        cell.configure(CalendarDayRow(kind: .takeBack, order: order, lateDays: 0), hidesMoney: false)
        XCTAssertFalse(labels(cell.contentView).contains { $0.accessibilityLabel == LateText.days(2) + fee })
    }

    // MARK: #893 — lean Việc cần làm rows

    /// Line 2 of a Việc cần làm row: the task's own date chip, then "Trễ N ngày", then "Chưa soạn đồ"
    func testWorkRowChips() {
        let pickup = iso.date(from: "2026-10-13T17:30:00Z")! // 14/10 in Vietnam
        let back = iso.date(from: "2026-10-16T02:00:00Z")!
        let handOver = TodayWorkRow(id: 1, orderNumber: "ORD-1-0063", pickupPlanAt: pickup, returnPlanAt: back,
                                    isReadyToDeliver: false, totalAmount: 300_000, amountDue: 200_000, lateDays: 2)
        let chips = OrdersHomeLogic.workChips(handOver, kind: .handOver, timeZone: vietnam)
        XCTAssertEqual(chips.map(\.text), ["orders.chip.pickup".localized() + " 14/10/26", LateText.days(2),
                                           "orders.v2.notPrepared".localized()])
        XCTAssertEqual(chips[0].colors.fill.cgColor.alpha, 0, "#1026: the date chip has no fill")
        // #1032 (intentional change from the #893 pink / orange boxes): coloured text, no fill
        XCTAssertEqual(chips[1].colors.fill.cgColor.alpha, 0)
        XCTAssertEqual(chips[2].colors.fill.cgColor.alpha, 0)
        XCTAssertEqual(chips.map(\.warning), [nil, .late, .notPrepared])
        let takeBack = TodayWorkRow(id: 2, orderNumber: "2", pickupPlanAt: pickup, returnPlanAt: back, isReadyToDeliver: true,
                                    totalAmount: 300_000)
        XCTAssertEqual(OrdersHomeLogic.workChips(takeBack, kind: .takeBack, timeZone: vietnam).map(\.text),
                       ["orders.chip.return".localized() + " 16/10/26"], "only the return date; ready, not late")
        // #893 (owner): "Chưa soạn đồ" only on hand-over rows, never on a return row
        let notReadyReturn = TodayWorkRow(id: 3, orderNumber: "3", pickupPlanAt: pickup, returnPlanAt: back, isReadyToDeliver: false)
        XCTAssertFalse(OrdersHomeLogic.workChips(notReadyReturn, kind: .takeBack, timeZone: vietnam).map(\.text)
            .contains("orders.v2.notPrepared".localized()))
        // Right side: always the total; "còn thu N" under it only when something is due
        XCTAssertEqual(OrdersHomeLogic.workDue(handOver), 200_000)
        XCTAssertNil(OrdersHomeLogic.workDue(takeBack))
    }

    func testWorkRowIsLean() {
        let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
        let row = TodayWorkRow(id: 1, orderNumber: "ORD-1-0063", customerName: "Huy",
                               pickupPlanAt: iso.date(from: "2026-10-13T17:30:00Z"), returnPlanAt: iso.date(from: "2026-10-16T02:00:00Z"),
                               isReadyToDeliver: true, totalAmount: 300_000, amountDue: 200_000)
        cell.configure(.work(row, kind: .handOver), context: .work(isLate: false), hidesMoney: false)
        let texts = visibleTexts(cell)
        XCTAssertFalse(texts.contains { $0.hasPrefix("#") }, "no #code · tạo line: \(texts)")
        XCTAssertFalse(texts.contains { $0.contains("16/10/26") }, "no other date")
        XCTAssertTrue(texts.contains(iconChip("14/10/26")))
        XCTAssertTrue(texts.contains(String(format: "orders.v2.pay.due".localized(), MoneyFormatter.format(200_000))))
        XCTAssertTrue(texts.contains(MoneyFormatter.format(300_000)), "the total always shows (owner)")
    }

    func testCustomerOrderRowShowsItemNamesAsTitle() {
        let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
        let row = CustomerOrderRow(id: 1, orderNumber: "0062", orderType: .rent, status: .reserved, totalAmount: 380000,
                                   pickupPlanAt: iso.date(from: "2026-10-14T02:00:00Z"), returnPlanAt: iso.date(from: "2026-10-15T02:00:00Z"),
                                   createdAt: iso.date(from: "2026-10-02T02:12:00Z"), itemCount: 1,
                                   items: [CustomerOrderRow.Item(productName: "Vest đen slim fit", quantity: 1)])
        cell.configure(customerOrder: row, hidesMoney: false)
        let texts = visibleTexts(cell)
        XCTAssertTrue(texts.contains("Vest đen slim fit"), "\(texts)")
        XCTAssertTrue(texts.contains("#0062 · " + String(format: "orders.row.created".localized(), "02/10/26 09:12")))
        XCTAssertTrue(texts.contains(iconChip("15/10/26")))
        XCTAssertTrue(texts.contains(MoneyFormatter.format(380000)))
        XCTAssertTrue(texts.contains(OrdersHomeLogic.statusTag(.reserved).text))
    }

    /// #891 (owner): the calendar day rows show both dates as the light chips (no emphasis); the rest stays
    func testCalendarRowShowsPickupAndReturnChips() throws {
        let json = #"{"id":3,"orderNumber":"ORD-1-0063","customerName":"Huy","status":"RESERVED","orderType":"RENT","totalAmount":300000,"orderItems":[],"createdAt":"2026-10-05T07:30:00.000Z","pickupPlanAt":"2026-10-14T02:00:00.000Z","returnPlanAt":"2026-10-16T02:00:00.000Z"}"#
        let order = try JSONDecoder.shared.decode(CalendarDayOrder.self, from: Data(json.utf8))
        let cell = CalendarDayRowCell(style: .default, reuseIdentifier: nil)
        cell.configure(CalendarDayRow(kind: .handOver, order: order, lateDays: 0), hidesMoney: false)
        let texts = visibleTexts(cell)
        XCTAssertTrue(texts.contains(iconChip("14/10/26")), "\(texts)")
        XCTAssertFalse(texts.contains { $0.contains("16/10/26") }, "#893 lean row: only the task's own date")
    }

    /// #893 (owner, calendar lean rows): the day task's date chip, then "Sẵn sàng giao" or "Chưa soạn đồ" (hand-overs only)
    func testCalendarRowChips() throws {
        func order(ready: String) throws -> CalendarDayOrder {
            let json = #"{"id":3,"orderNumber":"ORD-1-0063","customerName":"Huy","status":"RESERVED","orderType":"RENT","totalAmount":300000,"amountDue":200000,"orderItems":[],"createdAt":"2026-10-05T07:30:00.000Z","pickupPlanAt":"2026-10-13T17:30:00.000Z","returnPlanAt":"2026-10-16T02:00:00.000Z"\#(ready)}"#
            return try JSONDecoder.shared.decode(CalendarDayOrder.self, from: Data(json.utf8))
        }
        let ready = try order(ready: #","isReadyToDeliver":true"#)
        let notReady = try order(ready: #","isReadyToDeliver":false"#)
        let older = try order(ready: "")
        XCTAssertEqual(OrdersHomeLogic.calendarChips(CalendarDayRow(kind: .handOver, order: ready, lateDays: 0), timeZone: vietnam).map(\.text),
                       ["orders.chip.pickup".localized() + " 14/10/26", "calendar.v2.ready".localized()])
        let readyChip = OrdersHomeLogic.calendarChips(CalendarDayRow(kind: .handOver, order: ready, lateDays: 0), timeZone: vietnam)[1]
        XCTAssertEqual(hex(readyChip.colors.fill), "D1FAE5")
        XCTAssertEqual(hex(readyChip.colors.text), "047857")
        XCTAssertNil(readyChip.warning, "#1032: Sẵn sàng giao keeps its green box")
        let notReadyChip = OrdersHomeLogic.calendarChips(CalendarDayRow(kind: .handOver, order: notReady, lateDays: 0), timeZone: vietnam)[1]
        XCTAssertEqual(notReadyChip.warning, .notPrepared, "#1032: Chưa soạn đồ is a soft warning (no box)")
        XCTAssertEqual(notReadyChip.colors.fill.cgColor.alpha, 0)
        let calendarLines = UIStackView()
        OrderRowCell.fillChipLines(calendarLines, chips: [readyChip, notReadyChip], width: 1000)
        let calendarShown = calendarLines.arrangedSubviews.flatMap { ($0 as? UIStackView)?.arrangedSubviews ?? [] }
            .compactMap { $0 as? InsetLabel }
        XCTAssertEqual(calendarShown[0].backgroundColor.map(hex), "D1FAE5")
        XCTAssertEqual(calendarShown[1].backgroundColor?.cgColor.alpha ?? 0, 0)
        XCTAssertEqual(calendarShown[1].accessibilityLabel, "orders.v2.notPrepared".localized())
        XCTAssertEqual(OrdersHomeLogic.calendarChips(CalendarDayRow(kind: .handOver, order: notReady, lateDays: 0), timeZone: vietnam).map(\.text),
                       ["orders.chip.pickup".localized() + " 14/10/26", "orders.v2.notPrepared".localized()])
        XCTAssertEqual(OrdersHomeLogic.calendarChips(CalendarDayRow(kind: .handOver, order: older, lateDays: 0), timeZone: vietnam).count, 2,
                       "an older API without the flag counts as not prepared")
        XCTAssertEqual(OrdersHomeLogic.calendarChips(CalendarDayRow(kind: .takeBack, order: notReady, lateDays: 0), timeZone: vietnam).map(\.text),
                       ["orders.chip.return".localized() + " 16/10/26"], "a return row: only its date, no prepared chip")

        let cell = CalendarDayRowCell(style: .default, reuseIdentifier: nil)
        cell.configure(CalendarDayRow(kind: .handOver, order: ready, lateDays: 0), hidesMoney: false)
        let texts = visibleTexts(cell)
        XCTAssertFalse(texts.contains { $0.hasPrefix("#") }, "no #code · tạo: \(texts)")
        XCTAssertFalse(texts.contains { $0.contains("16/10/26") }, "no other date")
        XCTAssertTrue(texts.contains(MoneyFormatter.format(300000)))
        XCTAssertFalse(texts.contains(String(format: "orders.v2.pay.due".localized(), MoneyFormatter.format(200000))),
                       "#893 owner: no còn thu under the calendar total: \(texts)")
    }

    /// #891 (owner): order rows have no ">" chevron
    func testOrderRowHasNoChevron() throws {
        func views(_ view: UIView) -> [UIView] { [view] + view.subviews.flatMap(views) }
        let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
        cell.configure(.order(try listOrder(1, status: "RESERVED", balances: ""), lateDays: 0), context: .list, hidesMoney: false)
        let chevrons = views(cell.contentView).compactMap { $0 as? UIImageView }.filter { $0.window == nil && $0.superview != nil && !$0.isHidden }
        XCTAssertTrue(chevrons.isEmpty, "no chevron image in the row")
        XCTAssertEqual(cell.accessoryType, .none)
    }

    /// #891 (owner): Tất cả đơn rows have no pay line ("còn thu N"); search and the other lists keep it
    func testRentListRowHasNoPayLine() throws {
        let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
        let due = try listOrder(1, status: "PICKUPED", balances: #","amountDue":120000,"refundDue":0"#)
        let payText = String(format: "orders.v2.pay.due".localized(), MoneyFormatter.format(120000))
        cell.configure(.order(due, lateDays: 0), context: .rentList(sortedBy: .pickup), hidesMoney: false)
        XCTAssertFalse(visibleTexts(cell).contains(payText))
        XCTAssertTrue(visibleTexts(cell).contains(MoneyFormatter.format(300000)), "the total stays")
        cell.configure(.order(due, lateDays: 0), context: .search, hidesMoney: false)
        XCTAssertTrue(visibleTexts(cell).contains(payText))
    }

    /// #496 "Chưa lấy đồ": overdue chip instead of "Trễ N ngày", "còn thu" in the Còn phải thu orange, no item line
    func testNotPickedUpRowChipAndDueColour() throws {
        let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
        let order = try listOrder(1, status: "RESERVED", balances: #","amountDue":250000,"refundDue":0"#)
        cell.configure(.order(order, lateDays: 3), context: .notPickedUp, hidesMoney: false)
        let texts = visibleTexts(cell)
        XCTAssertTrue(texts.contains(warningChip(PluralText.format("notPickedUp.chip", count: 3, 3))), "\(texts)")
        XCTAssertFalse(texts.contains(warningChip(LateText.days(3))))
        func labels(_ view: UIView) -> [UILabel] {
            ((view as? UILabel).map { [$0] } ?? []) + view.subviews.flatMap(labels)
        }
        let due = try XCTUnwrap(labels(cell.contentView).first {
            $0.text == String(format: "orders.v2.pay.due".localized(), MoneyFormatter.format(250000))
        })
        XCTAssertEqual(due.textColor, OrderRowCell.dueColor)
        XCTAssertTrue(texts.contains(OrdersHomeLogic.rowLines(order, lateDays: 3).meta))
    }

    // MARK: #468 — no call button on "Việc cần làm" rows (call from order detail)

    func testWorkRowsHaveNoCallPhone() {
        let row = TodayWorkRow(id: 1, orderNumber: "ORD-1-0001", customerName: "Huy", customerPhone: "0901 234 567")
        XCTAssertNil(OrdersHomeLogic.workCallPhone(row, isLate: true))
        XCTAssertNil(OrdersHomeLogic.workCallPhone(row, isLate: false))
    }

    func testLateWorkCellShowsNoCallButton() {
        let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
        let row = TodayWorkRow(id: 1, orderNumber: "ORD-1-0001", customerName: "Huy", customerPhone: "0901234567",
                               returnPlanAt: iso.date(from: "2026-10-01T02:00:00Z"), lateDays: 2)
        cell.configure(.work(row, kind: .takeBack), context: .work(isLate: true), hidesMoney: false)
        func visibleButtons(_ view: UIView) -> [UIButton] {
            let own = (view as? UIButton).map { [$0] } ?? []
            return view.isHidden ? [] : own + view.subviews.flatMap(visibleButtons)
        }
        XCTAssertTrue(visibleButtons(cell.contentView).isEmpty, "late work row: no call button")
    }

    func testStatusTagIsBiggerAndNotesAreRegular() throws {
        let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
        let row = TodayWorkRow(id: 1, orderNumber: "ORD-1-0001", customerName: "Huy",
                               returnPlanAt: iso.date(from: "2026-10-01T02:00:00Z"), lateDays: 2)
        cell.configure(.work(row, kind: .handOver), context: .work(isLate: true), hidesMoney: false)
        func tags(_ view: UIView) -> [RowTagLabel] {
            ((view as? RowTagLabel).map { [$0] } ?? []) + view.subviews.flatMap(tags)
        }
        let all = tags(cell.contentView)
        let status = try XCTUnwrap(all.first { $0.text == "orders.v2.tag.handOver".localized() })
        XCTAssertEqual(status.font, Utils.boldFont(size: DS.TextSize.secondary))
        XCTAssertEqual(status.layer.cornerRadius, 7)
        XCTAssertEqual(status.intrinsicContentSize.width,
                       (status.text! as NSString).size(withAttributes: [.font: status.font!]).width + 16, accuracy: 1)
        // #893 (lean Việc cần làm row): the total bold, "còn thu N" smaller under it; the notes are chips on line 2
        func labels(_ view: UIView) -> [UILabel] {
            ((view as? UILabel).map { [$0] } ?? []) + view.subviews.flatMap(labels)
        }
        let due = TodayWorkRow(id: 2, orderNumber: "ORD-1-0002", customerName: "Lan", totalAmount: 300000, amountDue: 120000)
        cell.configure(.work(due, kind: .takeBack), context: .work(isLate: false), hidesMoney: false)
        let money = labels(cell.contentView)
        let pay = try XCTUnwrap(money.first { $0.text == String(format: "orders.v2.pay.due".localized(), MoneyFormatter.format(120000)) })
        XCTAssertEqual(pay.font, Utils.mediumFont(size: DS.TextSize.secondary))
        let total = try XCTUnwrap(money.first { $0.text == MoneyFormatter.format(300000) })
        XCTAssertEqual(total.font, Utils.mediumFont(size: DS.TextSize.name))
        cell.configure(.work(row, kind: .handOver), context: .work(isLate: true), hidesMoney: false)
        let chips = labels(cell.contentView).compactMap { $0 as? InsetLabel }.filter { !($0.superview?.isHidden ?? true) }
            .compactMap(\.accessibilityLabel)
        XCTAssertEqual(Set(chips), [LateText.days(2), "orders.v2.notPrepared".localized()], "late + not prepared")
    }
}

private final class FakeSource: OrdersHomeDataSource {
    struct Call {
        let query: OrdersQuery
        let completion: (OrdersData?, NSError?) -> Void
        var keyword: String? { query.keyword }
        var orderType: OrderType? { query.orderType }
        var page: Int { query.page }
    }

    var todayCompletion: ((TodayWork?, NSError?) -> Void)?
    var orderCalls: [Call] = []

    func loadTodayWork(completion: @escaping (TodayWork?, NSError?) -> Void) {
        todayCompletion = completion
    }

    func loadOrders(_ query: OrdersQuery, completion: @escaping (OrdersData?, NSError?) -> Void) {
        orderCalls.append(Call(query: query, completion: completion))
    }

    func completeOrders(at index: Int, ids: [Int], hasMore: Bool = false) {
        let orders = ids.map { id in
            #"{"id":\#(id),"orderNumber":"ORD-1-\#(id)","orderType":"RENT","status":"RESERVED","createdAt":"2026-10-03T02:00:00.000Z","updatedAt":"2026-10-03T02:00:00.000Z","customerName":"Lan","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B"}"#
        }.joined(separator: ",")
        let json = #"{"orders":[\#(orders)],"total":\#(ids.count),"page":1,"limit":20,"offset":0,"hasMore":\#(hasMore),"totalPages":1}"#
        do {
            let data = try JSONDecoder.shared.decode(OrdersData.self, from: Data(json.utf8))
            orderCalls[index].completion(data, nil)
        } catch {
            XCTFail("fixture did not decode: \(error)")
        }
    }
}
