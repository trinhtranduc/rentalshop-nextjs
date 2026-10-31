import XCTest
import DraftOrderActivity
@testable import POS_ADBD

/// #1375 (epic #1372): the "Việc cần làm" widget. What the extension draws comes from one pure function of the file the
/// app wrote and the instant, so the Vietnam-midnight rule, the states and the links are checked here without a phone.
///
/// Day cases run with the phone set to UTC, Vietnam, Tokyo and Los Angeles (restored after), at the Vietnam midnight
/// 16:59:59Z / 17:00:00Z (skill timezone-dates).
final class TodayWidgetDisplayTests: XCTestCase {
    private static let zones = ["UTC", "Asia/Ho_Chi_Minh", "Asia/Tokyo", "America/Los_Angeles"]
    private var savedZone: TimeZone!
    private var savedTZ: String?
    private let vi = TodayWidgetLabels.vietnamese

    override func setUp() {
        super.setUp()
        savedZone = NSTimeZone.default
        savedTZ = ProcessInfo.processInfo.environment["TZ"]
    }

    override func tearDown() {
        restoreZone()
        super.tearDown()
    }

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

    private func inEachZone(_ body: (String) -> Void) {
        for id in Self.zones {
            setPhoneZone(TimeZone(identifier: id)!)
            body(id)
        }
        restoreZone()
    }

    private func at(_ text: String) -> Date { ISO8601DateFormatter().date(from: text)! }

    private func row(_ id: Int, _ kind: TodayWidgetRow.Kind, late: Int = 0, name: String? = nil, product: String = "Áo dài",
                     notPrepared: Bool = false) -> TodayWidgetRow {
        TodayWidgetRow(orderId: id, kind: kind, isLate: late > 0, name: name ?? "Khách \(id)", product: product,
                       lateDays: late, lateText: late > 0 ? "Trễ \(late) ngày" : "", notPrepared: notPrepared)
    }

    private func snapshot(date: String = "2026-10-31", savedAt: String = "2026-10-31T01:12:00Z",
                          state: TodayWidgetSnapshot.State = .ok, hideNames: Bool = false,
                          counts: TodayWidgetCounts = TodayWidgetCounts(late: 1, pickup: 3, returns: 2, tomorrowPickup: 2, tomorrowReturn: 1),
                          rows: [TodayWidgetRow]? = nil) -> TodayWidgetSnapshot {
        let list = rows ?? [row(1, .pickup, late: 2), row(2, .pickup, notPrepared: true), row(3, .returnTask), row(4, .returnTask)]
        return TodayWidgetSnapshot(userId: 7, outletId: 5, date: date, savedAt: at(savedAt), state: state, hideNames: hideNames,
                                   counts: counts, rows: list, labels: vi)
    }

    // MARK: Vietnam day

    func testDayKeyIsTheVietnamDayAtTheMidnightBoundary() {
        inEachZone { zone in
            XCTAssertEqual(TodayWidgetClock.dayKey(at("2026-10-31T16:59:59Z")), "2026-10-31", zone)
            XCTAssertEqual(TodayWidgetClock.dayKey(at("2026-10-31T17:00:00Z")), "2026-11-01", zone)
            XCTAssertEqual(TodayWidgetClock.dayKey(at("2026-12-31T17:00:00Z")), "2027-01-01", zone)
        }
    }

    func testSnapshotIsFreshOnlyOnItsVietnamDay() {
        inEachZone { zone in
            let list = snapshot(date: "2026-10-31")
            XCTAssertTrue(list.isFresh(now: at("2026-10-30T17:00:00Z")), zone) // first second of 31/10 in Vietnam
            XCTAssertTrue(list.isFresh(now: at("2026-10-31T16:59:59Z")), zone)
            XCTAssertFalse(list.isFresh(now: at("2026-10-31T17:00:00Z")), zone) // 01/11 in Vietnam
            XCTAssertFalse(list.isFresh(now: at("2026-10-30T16:59:59Z")), zone) // 30/10 in Vietnam: not yet
        }
    }

    func testNextMidnightIsTheNextVietnamMidnight() {
        inEachZone { zone in
            XCTAssertEqual(TodayWidgetClock.nextMidnight(after: at("2026-10-31T03:00:00Z")), at("2026-10-31T17:00:00Z"), zone)
            XCTAssertEqual(TodayWidgetClock.nextMidnight(after: at("2026-10-31T16:59:59Z")), at("2026-10-31T17:00:00Z"), zone)
            XCTAssertEqual(TodayWidgetClock.nextMidnight(after: at("2026-10-31T17:00:00Z")), at("2026-11-01T17:00:00Z"), zone)
        }
    }

    func testAListFromYesterdayIsNeverShownAsToday() {
        inEachZone { zone in
            let list = snapshot(date: "2026-10-30", savedAt: "2026-10-30T10:40:00Z")
            let display = TodayWidgetDisplay.make(snapshot: list, now: at("2026-10-30T17:00:00Z"), rowLimit: 3)
            XCTAssertEqual(display.kind, .stale, zone)
            XCTAssertTrue(display.lines.isEmpty, zone)
            XCTAssertNil(display.moreText, zone)
            XCTAssertEqual(display.title, "Hôm nay", zone)
            XCTAssertEqual(display.dayText, "31/10", zone) // the header is today's Vietnam day, not the list's
            XCTAssertEqual(display.staleDetail, "Danh sách lần cuối: hôm qua 17:40", zone)
            XCTAssertEqual(display.labels.stale, "Mở app để cập nhật", zone)
        }
    }

    func testTheListTurnsStaleAtTheVietnamMidnightWithoutTheApp() {
        let list = snapshot(date: "2026-10-31")
        XCTAssertEqual(TodayWidgetDisplay.make(snapshot: list, now: at("2026-10-31T16:59:59Z"), rowLimit: 3).kind, .work)
        XCTAssertEqual(TodayWidgetDisplay.make(snapshot: list, now: at("2026-10-31T17:00:00Z"), rowLimit: 3).kind, .stale)
    }

    func testLastUpdatedText() {
        let now = at("2026-10-31T03:00:00Z")
        XCTAssertEqual(TodayWidgetDisplay.lastUpdatedText(at("2026-10-31T01:12:00Z"), now: now, labels: vi), "08:12")
        XCTAssertEqual(TodayWidgetDisplay.lastUpdatedText(at("2026-10-30T10:40:00Z"), now: now, labels: vi), "hôm qua 17:40")
        XCTAssertEqual(TodayWidgetDisplay.lastUpdatedText(at("2026-10-28T10:40:00Z"), now: now, labels: vi), "28/10 17:40")
        // 16:59 UTC on 30/10 is 23:59 that day in Vietnam, still "hôm qua"; 17:00 UTC is already today
        XCTAssertEqual(TodayWidgetDisplay.lastUpdatedText(at("2026-10-30T16:59:59Z"), now: now, labels: vi), "hôm qua 23:59")
        XCTAssertEqual(TodayWidgetDisplay.lastUpdatedText(at("2026-10-30T17:00:00Z"), now: now, labels: vi), "00:00")
    }

    // MARK: States

    func testNoFileMeansSignedOut() {
        let display = TodayWidgetDisplay.make(snapshot: nil, now: at("2026-10-31T03:00:00Z"), rowLimit: 3)
        XCTAssertEqual(display.kind, .loggedOut)
        XCTAssertTrue(display.lines.isEmpty)
        XCTAssertEqual(display.title, "AnyRent")
        XCTAssertEqual(display.labels, TodayWidgetLabels.fallback())
    }

    func testFallbackLabelsFollowThePhoneLanguage() {
        XCTAssertEqual(TodayWidgetLabels.fallback(preferredLanguages: ["vi-VN"]), .vietnamese)
        XCTAssertEqual(TodayWidgetLabels.fallback(preferredLanguages: ["en-US", "vi"]), .english)
        XCTAssertEqual(TodayWidgetLabels.fallback(preferredLanguages: []), .vietnamese)
        XCTAssertEqual(TodayWidgetLabels.vietnamese.loggedOut, "Mở AnyRent để đăng nhập")
    }

    func testSignOutFileHoldsOnlyTheTexts() throws {
        let file = TodayWidgetSnapshot.loggedOut(labels: vi, now: at("2026-10-31T03:00:00Z"))
        XCTAssertEqual(file.state, .loggedOut)
        XCTAssertEqual(file.userId, 0)
        XCTAssertEqual(file.outletId, 0)
        XCTAssertTrue(file.rows.isEmpty)
        XCTAssertEqual(file.counts.total, 0)
        let display = TodayWidgetDisplay.make(snapshot: file, now: at("2026-10-31T03:00:00Z"), rowLimit: 3)
        XCTAssertEqual(display.kind, .loggedOut)
        XCTAssertEqual(display.labels.loggedOut, "Mở AnyRent để đăng nhập")
        XCTAssertEqual(display.labels.loggedOutHint, "Việc cần làm sẽ hiện ở đây")
    }

    func testNoAccessIsKeptWhateverTheDay() {
        let file = TodayWidgetSnapshot.noAccess(userId: 7, outletId: 5, labels: vi, now: at("2026-10-31T03:00:00Z"))
        for now in ["2026-10-31T03:00:00Z", "2026-11-05T03:00:00Z"] {
            let display = TodayWidgetDisplay.make(snapshot: file, now: at(now), rowLimit: 3)
            XCTAssertEqual(display.kind, .noAccess)
            XCTAssertEqual(display.labels.noAccess, "Tài khoản này không có Việc cần làm")
            XCTAssertTrue(display.lines.isEmpty)
        }
    }

    func testEmptyDayAndTomorrowLine() {
        let counts = TodayWidgetCounts(late: 0, pickup: 0, returns: 0, tomorrowPickup: 2, tomorrowReturn: 1)
        let display = TodayWidgetDisplay.make(snapshot: snapshot(counts: counts, rows: []), now: at("2026-10-31T03:00:00Z"), rowLimit: 3)
        XCTAssertEqual(display.kind, .empty)
        XCTAssertEqual(display.labels.empty, "Hôm nay chưa có việc")
        XCTAssertEqual(display.tomorrowText, "Mai có 2 giao, 1 trả")
        XCTAssertEqual(display.updatedText, "cập nhật 08:12")
    }

    func testEmptyDayWithoutTomorrowFromAnOlderApi() {
        let older = TodayWidgetCounts(late: 0, pickup: 0, returns: 0)
        XCTAssertNil(TodayWidgetDisplay.make(snapshot: snapshot(counts: older, rows: []), now: at("2026-10-31T03:00:00Z"), rowLimit: 3).tomorrowText)
        let none = TodayWidgetCounts(late: 0, pickup: 0, returns: 0, tomorrowPickup: 0, tomorrowReturn: 0)
        XCTAssertNil(TodayWidgetDisplay.make(snapshot: snapshot(counts: none, rows: []), now: at("2026-10-31T03:00:00Z"), rowLimit: 3).tomorrowText)
    }

    // MARK: Rows

    func testMediumShowsThreeRowsAndTheRestAsMore() {
        let rows = (1...6).map { row($0, $0 <= 2 ? .pickup : .returnTask) }
        let counts = TodayWidgetCounts(late: 1, pickup: 3, returns: 5) // the API counts more than the file keeps
        let display = TodayWidgetDisplay.make(snapshot: snapshot(counts: counts, rows: rows), now: at("2026-10-31T03:00:00Z"), rowLimit: 3)
        XCTAssertEqual(display.kind, .work)
        XCTAssertEqual(display.lines.map { $0.orderId }, [1, 2, 3])
        XCTAssertEqual(display.moreText, "+6 việc khác") // 9 jobs, 3 shown
        XCTAssertEqual(display.counts.pickup, 3)
        XCTAssertEqual(display.counts.late, 1)
        XCTAssertEqual(display.counts.returns, 5)
    }

    func testNoMoreLineWhenEverythingIsShown() {
        let counts = TodayWidgetCounts(late: 0, pickup: 1, returns: 1)
        let rows = [row(1, .pickup), row(2, .returnTask)]
        XCTAssertNil(TodayWidgetDisplay.make(snapshot: snapshot(counts: counts, rows: rows), now: at("2026-10-31T03:00:00Z"), rowLimit: 3).moreText)
    }

    func testSmallShowsOnlyTheThreeNumbers() {
        let display = TodayWidgetDisplay.make(snapshot: snapshot(), now: at("2026-10-31T03:00:00Z"), rowLimit: 0)
        XCTAssertEqual(display.kind, .work)
        XCTAssertTrue(display.lines.isEmpty)
        XCTAssertNil(display.moreText)
        XCTAssertEqual(display.counts, TodayWidgetCounts(late: 1, pickup: 3, returns: 2, tomorrowPickup: 2, tomorrowReturn: 1))
    }

    func testTheFileKeepsAtMostEightRows() {
        let rows = (1...12).map { row($0, .pickup) }
        let file = snapshot(counts: TodayWidgetCounts(late: 0, pickup: 12, returns: 0), rows: rows)
        XCTAssertEqual(file.rows.count, 8)
        XCTAssertEqual(file.rows.map { $0.orderId }, Array(1...8))
    }

    func testRowTextLateThenNotPreparedThenProduct() {
        let late = row(1, .pickup, late: 2, product: "Vest", notPrepared: true)
        let waiting = row(2, .pickup, product: "Vest", notPrepared: true)
        let product = row(3, .pickup, product: "Vest")
        let giveBack = row(4, .returnTask, product: "Khăn", notPrepared: true) // a return is never "chưa soạn đồ"
        let bare = row(5, .returnTask, product: "")
        XCTAssertEqual(TodayWidgetDisplay.trailing(late, labels: vi), .late("Trễ 2 ngày"))
        XCTAssertEqual(TodayWidgetDisplay.trailing(waiting, labels: vi), .notPrepared("Chưa soạn đồ"))
        XCTAssertEqual(TodayWidgetDisplay.trailing(product, labels: vi), .product("Vest"))
        XCTAssertEqual(TodayWidgetDisplay.trailing(giveBack, labels: vi), .product("Khăn"))
        XCTAssertEqual(TodayWidgetDisplay.trailing(bare, labels: vi), .none)
    }

    func testRowTagsAndLinks() {
        let display = TodayWidgetDisplay.make(snapshot: snapshot(), now: at("2026-10-31T03:00:00Z"), rowLimit: 4)
        XCTAssertEqual(display.lines.map { $0.tag }, ["Giao", "Giao", "Trả", "Trả"])
        XCTAssertEqual(display.lines.map { $0.isReturn }, [false, false, true, true])
        XCTAssertEqual(display.lines[0].url.absoluteString, "anyrent://order/1")
        XCTAssertEqual(display.headerURL.absoluteString, "anyrent://todo")
    }

    func testHiddenNamesLeaveNoNameOnTheScreen() {
        let display = TodayWidgetDisplay.make(snapshot: snapshot(hideNames: true, rows: [row(1, .pickup, name: "")]),
                                              now: at("2026-10-31T03:00:00Z"), rowLimit: 3)
        XCTAssertTrue(display.hidesNames)
        XCTAssertEqual(display.lines.first?.name, "")
        // Even a file that still carried a name would not show it
        let leaky = TodayWidgetDisplay.make(snapshot: snapshot(hideNames: true, rows: [row(1, .pickup, name: "Hà Gia Bảo")]),
                                            now: at("2026-10-31T03:00:00Z"), rowLimit: 3)
        XCTAssertEqual(leaky.lines.first?.name, "")
        XCTAssertEqual(leaky.labels.hiddenName, "chạm để mở")
    }

    // MARK: Links

    func testLinks() {
        XCTAssertEqual(TodayWidgetLink.parse(URL(string: "anyrent://order/490268")!), .order(490268))
        XCTAssertEqual(TodayWidgetLink.parse(URL(string: "anyrent://todo")!), .todo)
        // The Live Activity link keeps opening the draft cart, and so does anything else
        XCTAssertEqual(TodayWidgetLink.parse(URL(string: "anyrent://draft-cart")!), .draftCart)
        XCTAssertEqual(TodayWidgetLink.parse(URL(string: "anyrent://")!), .draftCart)
        XCTAssertEqual(TodayWidgetLink.parse(URL(string: "anyrent://whatever/1")!), .draftCart)
        // A broken order link is not an order
        XCTAssertEqual(TodayWidgetLink.parse(URL(string: "anyrent://order")!), .draftCart)
        XCTAssertEqual(TodayWidgetLink.parse(URL(string: "anyrent://order/abc")!), .draftCart)
        XCTAssertEqual(TodayWidgetLink.parse(URL(string: "anyrent://order/0")!), .draftCart)
        XCTAssertEqual(TodayWidgetLink.parse(URL(string: "anyrent://order/12/extra")!), .draftCart)
        XCTAssertNil(TodayWidgetLink.parse(URL(string: "https://anyrent.shop/order/1")!))
        XCTAssertEqual(TodayWidgetLink.orderURL(5).absoluteString, "anyrent://order/5")
        XCTAssertEqual(TodayWidgetLink.parse(TodayWidgetLink.orderURL(5)), .order(5))
        XCTAssertEqual(TodayWidgetLink.parse(TodayWidgetLink.todoURL), .todo)
    }

    // MARK: File

    private func tempDirectory() -> URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("today-widget-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    func testTheFileRoundTripsAndIsRemoved() {
        let directory = tempDirectory()
        defer { try? FileManager.default.removeItem(at: directory) }
        let store = TodayWidgetStore(directory: directory)
        XCTAssertNil(store.read())
        let list = snapshot()
        XCTAssertTrue(store.write(list))
        XCTAssertEqual(store.read(), list)
        store.remove()
        XCTAssertNil(store.read())
    }

    func testAnUnreadableOrNewerFileCountsAsNoFile() throws {
        let directory = tempDirectory()
        defer { try? FileManager.default.removeItem(at: directory) }
        let store = TodayWidgetStore(directory: directory)
        let file = directory.appendingPathComponent(TodayWidgetStore.fileName)
        try Data("not json".utf8).write(to: file)
        XCTAssertNil(store.read())
        var newer = snapshot()
        newer.v = TodayWidgetSnapshot.currentVersion + 1
        try TodayWidgetSnapshot.encoder().encode(newer).write(to: file)
        XCTAssertNil(store.read())
    }

    func testAStoreWithoutAnAppGroupDoesNothing() {
        // A directory-less store (an unsigned build) neither crashes nor pretends to save
        let store = TodayWidgetStore(directory: URL(fileURLWithPath: "/nonexistent-\(UUID().uuidString)"))
        XCTAssertFalse(store.write(snapshot()))
        XCTAssertNil(store.read())
    }

    /// The file never holds money, a phone number or a token: only these keys exist
    func testTheFileHasNoMoneyPhoneOrTokenKeys() throws {
        let data = try TodayWidgetSnapshot.encoder().encode(snapshot())
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        XCTAssertEqual(Set(json.keys), ["v", "userId", "outletId", "date", "savedAt", "state", "hideNames", "counts", "rows", "labels"])
        let rows = json["rows"] as! [[String: Any]]
        XCTAssertEqual(Set(rows[0].keys), ["orderId", "kind", "isLate", "name", "product", "lateDays", "lateText", "notPrepared"])
        let counts = json["counts"] as! [String: Any]
        XCTAssertTrue(Set(counts.keys).isSubset(of: ["late", "pickup", "returns", "tomorrowPickup", "tomorrowReturn"]))
    }
}
