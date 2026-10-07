import XCTest
@testable import POS_ADBD

/// #596 (timezone batch F, part of #578): every business day is a shop-zone (Vietnam) day whatever zone the phone is
/// set to, and a phone set to Vietnam sends the same bytes as the build before the fix.
///
/// Each case runs with `NSTimeZone.default` set to Tokyo, Los Angeles, UTC and Vietnam (restored after), at the
/// Vietnam midnight boundary 16:59:59Z / 17:00:00Z.
final class ShopTimeZoneTests: XCTestCase {
    private static let zones = ["Asia/Tokyo", "America/Los_Angeles", "UTC", "Asia/Ho_Chi_Minh"]
    private let vi = Locale(identifier: "vi")
    private var savedZone: TimeZone!

    private var savedTZ: String?

    override func setUp() {
        super.setUp()
        savedZone = NSTimeZone.default
        savedTZ = ProcessInfo.processInfo.environment["TZ"]
    }

    override func tearDown() {
        restoreZone()
        super.tearDown()
    }

    /// Sets the phone zone: on iOS 17+ `NSTimeZone.default` alone does not move `TimeZone.current`, so the process
    /// `TZ` is set too and the cached system zone reset (what a phone does when the user changes zone).
    private func setPhoneZone(_ zone: TimeZone) {
        setenv("TZ", zone.identifier, 1)
        tzset()
        NSTimeZone.resetSystemTimeZone()
        NSTimeZone.default = zone
    }

    private func restoreZone() {
        if let savedTZ { setenv("TZ", savedTZ, 1) } else { unsetenv("TZ") }
        tzset()
        NSTimeZone.resetSystemTimeZone()
        NSTimeZone.default = savedZone
    }

    private func inEachZone(_ zones: [String] = ShopTimeZoneTests.zones, _ body: (String) throws -> Void) rethrows {
        for id in zones {
            setPhoneZone(TimeZone(identifier: id)!)
            // TZ=UTC reads back as "GMT"
            XCTAssertEqual(TimeZone.current.identifier, id == "UTC" ? "GMT" : id, "the phone zone must reach TimeZone.current")
            try body(id)
        }
        restoreZone()
    }

    private func at(_ text: String) -> Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: text) { return date }
        return ISO8601DateFormatter().date(from: text)!
    }

    private func iso(_ date: Date?) -> String? { date?.dateServerISOString() }

    /// A day tapped in FSCalendar: midnight of that day in the phone's zone
    private func devicePick(_ year: Int, _ month: Int, _ day: Int) -> Date {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone.current
        return calendar.date(from: DateComponents(year: year, month: month, day: day))!
    }

    // MARK: - The one accessor

    func testShopTimeZoneIsVietnamWhateverThePhoneZone() {
        inEachZone { zone in
            XCTAssertEqual(Date.shopTimeZone.identifier, "Asia/Ho_Chi_Minh", zone)
            XCTAssertEqual(Date.shopCalendar.timeZone.identifier, "Asia/Ho_Chi_Minh", zone)
        }
    }

    func testShopDayBoundsAtTheVietnamMidnight() {
        inEachZone { zone in
            // 16:59:59Z is the last second of VN 09/10; 17:00:00Z is the first second of VN 10/10
            XCTAssertEqual(iso(at("2026-10-09T16:59:59Z").startOfShopDay()), "2026-10-08T17:00:00.000Z", zone)
            XCTAssertEqual(iso(at("2026-10-09T16:59:59Z").endOfShopDay()), "2026-10-09T16:59:59.000Z", zone)
            XCTAssertEqual(iso(at("2026-10-09T17:00:00Z").startOfShopDay()), "2026-10-09T17:00:00.000Z", zone)
            XCTAssertEqual(iso(at("2026-10-09T17:00:00Z").endOfShopDay()), "2026-10-10T16:59:59.000Z", zone)
            // Month and year ends
            XCTAssertEqual(iso(at("2026-10-31T17:00:00Z").startOfShopDay()), "2026-10-31T17:00:00.000Z", zone)
            XCTAssertEqual(iso(at("2026-12-31T16:59:59Z").endOfShopDay()), "2026-12-31T16:59:59.000Z", zone)
            XCTAssertEqual(iso(at("2026-12-31T17:00:00Z").startOfShopDay()), "2026-12-31T17:00:00.000Z", zone)
        }
    }

    func testDevicePickBridgesToTheSameShopDayAndBack() {
        inEachZone { zone in
            let picked = devicePick(2026, 10, 10)
            let shopDay = picked.shopDayFromDevicePick()
            XCTAssertEqual(iso(shopDay), "2026-10-09T17:00:00.000Z", zone)
            XCTAssertEqual(DayFormatter.key(shopDay), "2026-10-10", zone)
            // Back to the device calendar: a stored shop instant highlights the same day in FSCalendar
            let back = at("2026-10-10T16:59:59Z").devicePickFromShopDay()
            XCTAssertEqual(back, picked, zone)
            XCTAssertEqual(at("2026-10-09T17:00:00Z").devicePickFromShopDay(), picked, zone)
        }
    }

    // MARK: - IOS-8 DayFormatter

    func testDayFormatterDefaultsToTheShopDay() {
        inEachZone { zone in
            XCTAssertEqual(DayFormatter.key(at("2026-10-09T16:59:59Z")), "2026-10-09", zone)
            XCTAssertEqual(DayFormatter.key(at("2026-10-09T17:00:00Z")), "2026-10-10", zone)
            XCTAssertEqual(DayFormatter.short(at("2026-10-09T17:00:00Z"), locale: vi), "T7 10/10", zone)
            XCTAssertEqual(DayFormatter.short(at("2026-10-09T16:59:59Z"), locale: vi), "T6 09/10", zone)
            XCTAssertEqual(DayFormatter.key(at("2026-12-31T17:00:00Z")), "2027-01-01", zone)
        }
    }

    // MARK: - IOS-1 cart

    func testCartPickedDaysBecomeShopDayBounds() {
        inEachZone { zone in
            // Pick 10/10 → 12/10 in a device-zone calendar
            let bounds = CartV2Logic.rentalBounds(pickedStart: devicePick(2026, 10, 10), pickedEnd: devicePick(2026, 10, 12))
            XCTAssertEqual(iso(bounds.pickup), "2026-10-09T17:00:00.000Z", zone)
            XCTAssertEqual(iso(bounds.return), "2026-10-12T16:59:59.000Z", zone)
            // Same-day rental still occupies that day
            let same = CartV2Logic.rentalBounds(pickedStart: devicePick(2026, 10, 10), pickedEnd: devicePick(2026, 10, 10))
            XCTAssertEqual(iso(same.pickup), "2026-10-09T17:00:00.000Z", zone)
            XCTAssertEqual(iso(same.return), "2026-10-10T16:59:59.000Z", zone)
            // Reversed taps keep pickup ≤ return (the old `max(start, end)`)
            let reversed = CartV2Logic.rentalBounds(pickedStart: devicePick(2026, 10, 12), pickedEnd: devicePick(2026, 10, 10))
            XCTAssertEqual(iso(reversed.return), "2026-10-12T16:59:59.000Z", zone)
            // Year end
            let newYear = CartV2Logic.rentalBounds(pickedStart: devicePick(2026, 12, 31), pickedEnd: devicePick(2027, 1, 1))
            XCTAssertEqual(iso(newYear.pickup), "2026-12-30T17:00:00.000Z", zone)
            XCTAssertEqual(iso(newYear.return), "2027-01-01T16:59:59.000Z", zone)
        }
    }

    func testCartRequestCarriesShopInstantsAndShopRentalDays() {
        inEachZone { zone in
            let cart = Cart()
            cart.orderType = .rent
            var customer = Customer()
            customer.customer_id = 7 // without a customer the request leaves the dates out
            cart.customer = customer
            cart.pickupPlanAt = at("2026-10-09T17:00:00Z")   // VN 10/10 00:00
            cart.returnPlanAt = at("2026-10-10T16:59:59Z")   // VN 10/10 23:59:59
            let create = cart.toCreateOrderRequest()
            XCTAssertEqual(create.pickupPlanAt, "2026-10-09T17:00:00.000Z", zone)
            XCTAssertEqual(create.returnPlanAt, "2026-10-10T16:59:59.000Z", zone)
            XCTAssertEqual(create.rentalDuration, 1, zone)
            XCTAssertEqual(cart.toUpdateOrderRequest().rentalDuration, 1, zone)
            cart.returnPlanAt = at("2026-10-12T16:59:59Z")
            XCTAssertEqual(cart.toCreateOrderRequest().rentalDuration, 3, zone)
        }
    }

    // MARK: - IOS-7 rental-day counts

    func testRentalDayCountsUseShopDays() {
        inEachZone { zone in
            let pickup = at("2026-10-09T17:00:00Z")
            let sameDay = at("2026-10-10T16:59:59Z")
            XCTAssertEqual(CartV2Logic.rentalDays(pickup: pickup, return: sameDay), 1, zone)
            XCTAssertEqual(OrderDetailLogic.rentalDays(pickup: pickup, return: sameDay), 1, zone)
            XCTAssertEqual(CartV2Logic.rentalDays(pickup: pickup, return: at("2026-10-12T16:59:59Z")), 3, zone)
            XCTAssertEqual(CreateOrderSheetLogic.dayMonth(pickup), "10/10", zone)
            XCTAssertEqual(OrderDetailLogic.dayMonth(sameDay), "10/10", zone)
        }
    }

    // MARK: - IOS-2 extension

    func testExtensionUsesShopDays() throws {
        try inEachZone { zone in
            let pickup = at("2026-10-09T17:00:00Z")         // VN 10/10
            let currentReturn = at("2026-10-12T16:59:59Z")  // VN 12/10 end
            let newDay = at("2026-10-14T05:00:00Z")         // VN 14/10, as a shop-zone picker gives it
            XCTAssertEqual(iso(RentalExtension.firstSelectableDay(after: currentReturn)), "2026-10-12T17:00:00.000Z", zone)
            XCTAssertEqual(RentalExtension.extraDays(currentReturn: currentReturn, newDay: newDay), 2, zone)
            let window = try XCTUnwrap(RentalExtension.window(currentReturn: currentReturn, newDay: newDay))
            XCTAssertEqual(iso(window.start), "2026-10-12T17:00:00.000Z", zone)
            XCTAssertEqual(iso(window.end), "2026-10-14T16:59:59.000Z", zone)
            let body = RentalExtension.updateRequest(pickup: pickup, newDay: newDay, oldTotal: 300_000, extra: nil)
            XCTAssertEqual(body.returnPlanAt, "2026-10-14T16:59:59.000Z", zone)
            XCTAssertEqual(body.rentalDuration, 5, zone)
        }
    }

    // MARK: - IOS-3 rent list filters

    func testRentListFilterBoundsAreShopMidnights() {
        inEachZone { zone in
            let now = at("2026-10-09T17:30:00Z") // VN 10/10 00:30
            var filter = RentOrdersFilter()
            filter.dateRange = .today
            var query = OrdersHomeLogic.rentQuery(filter, now: now)
            XCTAssertEqual(iso(query.startDate), "2026-10-09T17:00:00.000Z", zone)
            XCTAssertEqual(iso(query.endDate), "2026-10-09T17:00:00.000Z", zone)

            filter.dateRange = .next7Days
            query = OrdersHomeLogic.rentQuery(filter, now: now)
            XCTAssertEqual(iso(query.endDate), "2026-10-15T17:00:00.000Z", zone)

            filter.dateRange = .thisMonth
            query = OrdersHomeLogic.rentQuery(filter, now: now)
            XCTAssertEqual(iso(query.startDate), "2026-09-30T17:00:00.000Z", zone)
            XCTAssertEqual(iso(query.endDate), "2026-10-30T17:00:00.000Z", zone)

            // Custom range from shop-zone pickers (noon VN of 03/10 and 05/10)
            filter.dateRange = .custom(from: at("2026-10-03T05:00:00Z"), to: at("2026-10-05T05:00:00Z"))
            query = OrdersHomeLogic.rentQuery(filter, now: now)
            XCTAssertEqual(iso(query.startDate), "2026-10-02T17:00:00.000Z", zone)
            XCTAssertEqual(iso(query.endDate), "2026-10-04T17:00:00.000Z", zone)
        }
    }

    // MARK: - IOS-6 late days, grouping, titles

    func testLateDaysGroupingAndTitlesUseShopDays() {
        inEachZone { zone in
            let now = at("2026-10-09T17:00:00Z") // first second of VN 10/10
            XCTAssertEqual(OrdersHomeLogic.lateDays(orderType: .rent, status: .pickuped, pickupPlanAt: nil,
                                                    returnPlanAt: at("2026-10-09T16:59:59Z"), now: now), 1, zone)
            XCTAssertEqual(OrdersHomeLogic.lateDays(orderType: .rent, status: .pickuped, pickupPlanAt: nil,
                                                    returnPlanAt: at("2026-10-10T16:59:59Z"), now: now), 0, zone)
            let groups = OrdersHomeLogic.groupByDay([at("2026-10-09T17:00:00Z"), at("2026-10-09T16:59:59Z")], date: { $0 })
            XCTAssertEqual(groups.map(\.key), ["2026-10-10", "2026-10-09"], zone)
            let title = OrdersHomeLogic.sectionTitle(OrdersSection(kind: .day(at("2026-10-09T16:59:59Z")), rows: []),
                                                     now: now, locale: vi)
            XCTAssertEqual(title, "\("orders.v2.yesterday".localized()) · T6 09/10".uppercased(with: vi), zone)
            XCTAssertEqual(OverviewLateFilter.page([], hasMore: false, now: now).orders.count, 0, zone)
        }
    }

    // MARK: - IOS-4 / IOS-5 today and the timeZone sent

    func testCalendarOverviewTodayWorkSendTheShopZone() {
        inEachZone { zone in
            XCTAssertEqual(TabsV2APIService.calendarMonthParameters(year: 2026, month: 10)["timeZone"] as? String,
                           "Asia/Ho_Chi_Minh", zone)
            XCTAssertEqual(TabsV2APIService.calendarDayParameters("2026-10-10", returns: true)["timeZone"] as? String,
                           "Asia/Ho_Chi_Minh", zone)
            XCTAssertEqual(TabsV2APIService.overviewReportParameters(DayKeyRange(start: "2026-10-01", end: "2026-10-10"))["timeZone"] as? String,
                           "Asia/Ho_Chi_Minh", zone)
            XCTAssertEqual(TabsV2APIService.outletOperationsParameters()["timeZone"] as? String, "Asia/Ho_Chi_Minh", zone)
            // Today key (calendar, overview, product strip) is the shop day
            let strip = ProductDetailV2Logic.weekKeys(from: DayFormatter.key(at("2026-10-09T17:00:00Z")))
            XCTAssertEqual(strip.first, "2026-10-10", zone)
            XCTAssertEqual(strip.last, "2026-10-16", zone)
            // A key reads back as the same shop day
            let noon = OverviewLogic.date(of: "2026-10-10")!
            XCTAssertEqual(DayFormatter.key(noon), "2026-10-10", zone)
            XCTAssertEqual(OverviewLogic.longRange(DayKeyRange(start: "2026-10-10", end: "2026-10-10"), locale: vi), "T7 10/10", zone)
        }
    }

    func testCustomerOrderDatesUseShopDays() {
        let row = CustomerOrderRow(id: 1, orderNumber: "148148", orderType: .rent, status: .reserved, totalAmount: 0,
                                   pickupPlanAt: at("2026-10-09T17:00:00Z"), returnPlanAt: at("2026-10-10T16:59:59Z"),
                                   createdAt: nil, itemCount: 1)
        inEachZone { zone in
            XCTAssertTrue(CustomersV2Logic.orderDates(row).hasSuffix("10/10"), zone)
            XCTAssertFalse(CustomersV2Logic.orderDates(row).contains("→"), zone)
        }
    }

    // MARK: - F4 a Vietnam phone sends the same bytes as the build before the fix

    func testVietnamPhoneSendsTheSameBytesAsBefore() throws {
        try inEachZone(["Asia/Ho_Chi_Minh"]) { _ in
            // Cart: before = `start.startOfDay()` / `max(start, end).endOfDay()` in the device zone
            let start = devicePick(2026, 10, 10)
            let end = devicePick(2026, 10, 12)
            let bounds = CartV2Logic.rentalBounds(pickedStart: start, pickedEnd: end)
            XCTAssertEqual(iso(bounds.pickup), iso(start.startOfDay()))
            XCTAssertEqual(iso(bounds.return), iso(max(start, end).endOfDay()))

            // Extension: before = device zone
            let currentReturn = at("2026-10-12T16:59:59Z")
            let newDay = at("2026-10-14T05:00:00Z")
            let pickup = at("2026-10-09T17:00:00Z")
            let after = RentalExtension.updateRequest(pickup: pickup, newDay: newDay, oldTotal: 1, extra: nil)
            let before = RentalExtension.updateRequest(pickup: pickup, newDay: newDay, oldTotal: 1, extra: nil, timeZone: .current)
            XCTAssertEqual(try JSONEncoder().encode(after), try JSONEncoder().encode(before))

            // Rent list: before = device zone
            for range: RentOrdersFilter.DateRange in [.today, .next7Days, .thisMonth,
                                                      .custom(from: at("2026-10-03T05:00:00Z"), to: at("2026-10-05T05:00:00Z"))] {
                var filter = RentOrdersFilter()
                filter.dateRange = range
                let now = at("2026-10-09T17:30:00Z")
                XCTAssertEqual(OrdersHomeLogic.rentQuery(filter, now: now),
                               OrdersHomeLogic.rentQuery(filter, now: now, timeZone: .current))
            }

            // timeZone parameter: before = `TimeZone.current.identifier`
            XCTAssertEqual(TabsV2APIService.calendarMonthParameters(year: 2026, month: 10)["timeZone"] as? String,
                           TimeZone.current.identifier)
            XCTAssertEqual(TabsV2APIService.outletOperationsParameters()["timeZone"] as? String, TimeZone.current.identifier)

            // Day keys and labels: before = device zone
            let instant = at("2026-10-09T17:00:00Z")
            XCTAssertEqual(DayFormatter.key(instant), DayFormatter.key(instant, timeZone: .current))
            XCTAssertEqual(DayFormatter.short(instant, locale: vi), DayFormatter.short(instant, timeZone: .current, locale: vi))
        }
    }
}
