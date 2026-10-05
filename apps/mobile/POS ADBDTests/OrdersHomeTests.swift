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

    func testWorkDateLine() {
        let row = TodayWorkRow(id: 1, orderNumber: "ORD-1-0057",
                               pickupPlanAt: iso.date(from: "2026-10-02T17:30:00Z"), // 03/10 00:30 in Vietnam
                               returnPlanAt: iso.date(from: "2026-10-05T02:00:00Z"))
        // Today / tomorrow: span with inclusive days in the device zone
        XCTAssertEqual(OrdersHomeLogic.workWhen(row, kind: .handOver, isLate: false, timeZone: vietnam, locale: vi),
                       "03/10 → 05/10 · " + String(format: "orders.v2.when.days".localized(), 3))
        XCTAssertEqual(OrdersHomeLogic.workWhen(row, kind: .handOver, isLate: false, timeZone: utc, locale: vi),
                       "02/10 → 05/10 · " + String(format: "orders.v2.when.days".localized(), 4))
        // Late: the missed day with its weekday
        XCTAssertEqual(OrdersHomeLogic.workWhen(row, kind: .handOver, isLate: true, timeZone: vietnam, locale: vi),
                       String(format: "orders.v2.when.handOverDue".localized(), "T7 03/10"))
        XCTAssertEqual(OrdersHomeLogic.workWhen(row, kind: .takeBack, isLate: true, timeZone: vietnam, locale: vi),
                       String(format: "orders.v2.when.returnDue".localized(), "T2 05/10"))
        // Same-day rental is one day
        XCTAssertEqual(OrdersHomeLogic.inclusiveDays(from: iso.date(from: "2026-10-03T01:00:00Z")!,
                                                     to: iso.date(from: "2026-10-03T10:00:00Z")!, timeZone: vietnam), 1)
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

    /// #482: a row of another year shows the 2-digit year on every dd/MM of its date line
    func testListDateLineAddsYearWhenNotThisYear() throws {
        let now = iso.date(from: "2026-01-02T05:00:00Z")!
        let old = try order(status: "RESERVED", created: "2025-12-28T03:00:00.000Z",
                            pickup: "2025-12-30T02:00:00.000Z", returns: "2026-01-03T02:00:00.000Z")
        XCTAssertEqual(OrdersHomeLogic.listWhen(old, lateDays: 0, now: now, timeZone: vietnam),
                       String(format: "orders.v2.when.created".localized(), "28/12/25") + " · 30/12/25 → 03/01")
        let cancelled = try order(status: "CANCELLED", created: "2025-12-28T03:00:00.000Z", updated: "2025-12-29T03:00:00.000Z")
        XCTAssertEqual(OrdersHomeLogic.listWhen(cancelled, lateDays: 0, now: now, timeZone: vietnam),
                       String(format: "orders.v2.when.created".localized(), "28/12/25") + " · "
                       + String(format: "orders.v2.when.cancelled".localized(), "29/12/25"))
        // 31/12/2025 17:30Z is 01/01/2026 in Vietnam: this year there, last year in UTC
        let newYear = try order(status: "RESERVED", created: "2025-12-31T17:30:00.000Z",
                                pickup: "2026-01-04T02:00:00.000Z", returns: "2026-01-05T02:00:00.000Z")
        XCTAssertEqual(OrdersHomeLogic.listWhen(newYear, lateDays: 0, now: now, timeZone: vietnam),
                       String(format: "orders.v2.when.created".localized(), "01/01") + " · 04/01 → 05/01")
        XCTAssertEqual(OrdersHomeLogic.listWhen(newYear, lateDays: 0, now: now, timeZone: utc),
                       String(format: "orders.v2.when.created".localized(), "31/12/25") + " · 04/01 → 05/01")
    }

    func testListDateLine() throws {
        let now = iso.date(from: "2026-10-04T05:00:00Z")!
        let booked = try order(status: "RESERVED")
        XCTAssertEqual(OrdersHomeLogic.listWhen(booked, lateDays: 0, now: now, timeZone: vietnam),
                       String(format: "orders.v2.when.created".localized(), "02/10") + " · 04/10 → 05/10")
        let today = try order(status: "RESERVED", created: "2026-10-03T18:00:00.000Z")
        XCTAssertEqual(OrdersHomeLogic.listWhen(today, lateDays: 0, now: now, timeZone: vietnam),
                       "orders.v2.when.createdToday".localized() + " · 04/10 → 05/10")
        let late = try order(status: "PICKUPED", returns: "2026-10-02T02:00:00.000Z")
        XCTAssertEqual(OrdersHomeLogic.listWhen(late, lateDays: 2, now: now, timeZone: vietnam),
                       String(format: "orders.v2.when.created".localized(), "02/10") + " · "
                       + String(format: "orders.v2.when.due".localized(), "02/10"))
        let cancelled = try order(status: "CANCELLED", updated: "2026-10-03T03:00:00.000Z")
        XCTAssertEqual(OrdersHomeLogic.listWhen(cancelled, lateDays: 0, now: now, timeZone: vietnam),
                       String(format: "orders.v2.when.created".localized(), "02/10") + " · "
                       + String(format: "orders.v2.when.cancelled".localized(), "03/10"))
        XCTAssertEqual(booked.itemsSummary, "Vest xám kẻ ×2, Cà vạt lụa")
        XCTAssertEqual(OrdersHomeLogic.statusTag(booked), RowTag(text: "orders.v2.status.reserved".localized(), colors: DS.Status.handOver))
        let sale = try order(status: "COMPLETED", type: "SALE")
        XCTAssertEqual(OrdersHomeLogic.statusTag(sale, inSearch: true).text,
                       String(format: "orders.v2.tag.sale".localized(), "orders.v2.status.completed".localized()))
        XCTAssertEqual(OrdersHomeLogic.searchWhen(sale, lateDays: 0, timeZone: vietnam, locale: vi),
                       String(format: "orders.v2.when.sold".localized(), "T6 02/10"))
    }

    func testSectionTitlesAndSaleSums() throws {
        let now = iso.date(from: "2026-10-03T05:00:00Z")! // Saturday 03/10
        let late = OrdersSection(kind: .late, rows: [work(1, kind: .handOver), work(2, kind: .takeBack)])
        XCTAssertEqual(OrdersHomeLogic.sectionTitle(late, now: now, timeZone: vietnam, locale: vi),
                       "\("Late section".localized()) · 2".uppercased(with: vi))
        XCTAssertEqual(OrdersHomeLogic.sectionTitle(OrdersSection(kind: .tomorrow, rows: []), now: now, timeZone: vietnam, locale: vi),
                       "\("Tomorrow section".localized()) · CN 04/10".uppercased(with: vi))
        let yesterday = OrdersSection(kind: .day(iso.date(from: "2026-10-02T05:00:00Z")!), rows: [])
        XCTAssertEqual(OrdersHomeLogic.sectionTitle(yesterday, now: now, timeZone: vietnam, locale: vi),
                       "\("orders.v2.yesterday".localized()) · T6 02/10".uppercased(with: vi))
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
        XCTAssertEqual(OrdersHomeLogic.rentQuery(filter, now: now, timeZone: vietnam).sortBy, "createdAt")
        XCTAssertNil(OrdersHomeLogic.rentQuery(filter, now: now, timeZone: vietnam).startDate)
        filter.status = .pickuped
        filter.sort = .returnDate
        filter.dateBasis = .pickupPlan
        filter.dateRange = .today
        let query = OrdersHomeLogic.rentQuery(filter, page: 2, now: now, timeZone: vietnam)
        XCTAssertEqual(query.orderType, .rent)
        XCTAssertEqual(query.status, .pickuped)
        XCTAssertEqual(query.sortBy, "returnPlanAt")
        XCTAssertEqual(query.dateField, "pickupPlanAt")
        XCTAssertEqual(query.page, 2)
        XCTAssertEqual(query.startDate.map(key), "2026-10-04")
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
        // Money column: total bold, pay line ("còn thu N") regular
        func labels(_ view: UIView) -> [UILabel] {
            ((view as? UILabel).map { [$0] } ?? []) + view.subviews.flatMap(labels)
        }
        let due = TodayWorkRow(id: 2, orderNumber: "ORD-1-0002", customerName: "Lan", totalAmount: 300000, amountDue: 120000)
        cell.configure(.work(due, kind: .takeBack), context: .work(isLate: false), hidesMoney: false)
        let money = labels(cell.contentView)
        let pay = try XCTUnwrap(money.first { $0.text == String(format: "orders.v2.pay.due".localized(), MoneyFormatter.format(120000)) })
        XCTAssertEqual(pay.font, Utils.regularFont(size: DS.TextSize.secondary))
        let total = try XCTUnwrap(money.first { $0.text == MoneyFormatter.format(300000) })
        XCTAssertEqual(total.font, Utils.boldFont(size: DS.TextSize.name))
        cell.configure(.work(row, kind: .handOver), context: .work(isLate: true), hidesMoney: false)

        let notes = tags(cell.contentView).filter { $0 !== status }
        XCTAssertEqual(notes.count, 2, "not prepared + late")
        for note in notes {
            XCTAssertEqual(note.font, Utils.regularFont(size: DS.TextSize.pill), note.text ?? "")
            XCTAssertEqual(note.layer.cornerRadius, DS.Radius.chip)
        }
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
