import XCTest
import DraftOrderActivity
@testable import POS_ADBD

/// #1375 (epic #1372): from the "Việc cần làm" answer of the API to the widget file, and the app-side rules around it
/// (what an error does, when the one-time hint shows, where the Settings rows sit).
final class TodayWidgetDataTests: XCTestCase {
    private let vi = TodayWidgetLabels.vietnamese
    private func at(_ text: String) -> Date { ISO8601DateFormatter().date(from: text)! }

    private func order(_ id: Int, _ name: String, phone: String = "0912345678", products: String = "Áo dài gấm đỏ",
                       ready: Bool = false, late: Int = 0) -> String {
        """
        {"id": \(id), "orderNumber": "49\(id)", "customerName": "\(name)", "customerPhone": "\(phone)",
         "isReadyToDeliver": \(ready), "productNames": "\(products)", "totalAmount": 1234567, "amountDue": 654321,
         "refundDue": 0, "lateDays": \(late), "securityDeposit": 500000}
        """
    }

    private func group(_ count: Int, _ orders: [String]) -> String {
        "{\"count\": \(count), \"orders\": [\(orders.joined(separator: ","))]}"
    }

    private func work(date: String? = "2026-10-31", extra: String = "", tomorrow: Bool = true,
                      pickups: String? = nil) throws -> TodayWork {
        let dateField = date.map { "\"date\": \"\($0)\"," } ?? ""
        let tomorrowFields = tomorrow ? ", \"tomorrowPickups\": \(group(2, [])), \"tomorrowReturns\": \(group(1, []))" : ""
        let json = """
        {\(dateField)
         "noShows": \(group(1, [order(101, "Hà Gia Bảo", late: 2)])),
         "overdueReturns": \(group(1, [order(102, "Lê Ngọc Lan", products: "Khăn đóng nhung, Áo dài", ready: true, late: 4)])),
         "pickupsToday": \(pickups ?? group(3, [order(103, "Mai Quốc Huy"), order(104, "Phạm Văn An", ready: true)])),
         "returnsToday": \(group(2, [order(105, "Bùi Thanh Tâm")]))\(tomorrowFields)\(extra)}
        """
        return try JSONDecoder.shared.decode(TodayWork.self, from: Data(json.utf8))
    }

    private func build(_ work: TodayWork, hideNames: Bool = false, now: String = "2026-10-31T01:12:00Z") -> TodayWidgetSnapshot {
        TodayWidgetData.snapshot(from: work, userId: 7, outletId: 5, hideNames: hideNames, now: at(now), labels: vi)
    }

    // MARK: Snapshot from the API answer

    func testRowsAreLateThenHandOverThenReturn() throws {
        let file = build(try work())
        XCTAssertEqual(file.state, .ok)
        // Late first (most late first, like the tab), then the hand-overs, then the returns
        XCTAssertEqual(file.rows.map { $0.orderId }, [102, 101, 103, 104, 105])
        XCTAssertEqual(file.rows.map { $0.kind }, [.returnTask, .pickup, .pickup, .pickup, .returnTask])
        XCTAssertEqual(file.rows.map { $0.isLate }, [true, true, false, false, false])
        XCTAssertEqual(file.rows[0].lateDays, 4)
        XCTAssertEqual(file.rows[0].lateText, LateText.days(4))
        XCTAssertEqual(file.rows[1].lateText, LateText.days(2))
        XCTAssertEqual(file.rows[2].lateText, "")
    }

    func testCountsAreTheApiCountsNotTheCutRows() throws {
        let file = build(try work())
        // 3 hand-overs today but only 2 rows came; 1 + 1 late
        XCTAssertEqual(file.counts.late, 2)
        XCTAssertEqual(file.counts.pickup, 3)
        XCTAssertEqual(file.counts.returns, 2)
        XCTAssertEqual(file.counts.total, 7)
        XCTAssertEqual(file.counts.tomorrowPickup, 2)
        XCTAssertEqual(file.counts.tomorrowReturn, 1)
    }

    func testAnOlderApiHasNoTomorrow() throws {
        let file = build(try work(tomorrow: false))
        XCTAssertNil(file.counts.tomorrowPickup)
        XCTAssertNil(file.counts.tomorrowReturn)
        let display = TodayWidgetDisplay.make(snapshot: file, now: at("2026-10-31T01:12:00Z"), rowLimit: 3)
        XCTAssertNil(display.tomorrowText)
    }

    func testOnlyAHandOverCanBeNotPreparedAndOnlyWhenNotReady() throws {
        let file = build(try work())
        let byId = Dictionary(uniqueKeysWithValues: file.rows.map { ($0.orderId, $0) })
        XCTAssertTrue(byId[103]!.notPrepared)   // hand-over, not ready
        XCTAssertFalse(byId[104]!.notPrepared)  // hand-over, ready
        XCTAssertFalse(byId[105]!.notPrepared)  // a return
        XCTAssertFalse(byId[102]!.notPrepared)  // a late return
    }

    func testTheFirstProductIsKept() throws {
        let file = build(try work())
        XCTAssertEqual(file.rows[0].product, "Khăn đóng nhung") // "Khăn đóng nhung, Áo dài"
        XCTAssertEqual(file.rows[2].product, "Áo dài gấm đỏ")
    }

    func testAtMostEightRowsWhateverTheApiSends() throws {
        let many = group(12, (200..<212).map { order($0, "Khách \($0)") })
        let file = build(try work(pickups: many))
        XCTAssertEqual(file.rows.count, 8)
        XCTAssertEqual(file.counts.pickup, 12)
    }

    func testTheDayIsTheApisVietnamDayElseTheVietnamDayOfNow() throws {
        XCTAssertEqual(build(try work(date: "2026-10-31")).date, "2026-10-31")
        // No `date` in the answer: the Vietnam day of now (16:59:59Z is still 31/10, 17:00:00Z is 01/11)
        XCTAssertEqual(build(try work(date: nil), now: "2026-10-31T16:59:59Z").date, "2026-10-31")
        XCTAssertEqual(build(try work(date: nil), now: "2026-10-31T17:00:00Z").date, "2026-11-01")
    }

    func testDepositStagesAreNotPartOfTheWidget() throws {
        let stage = """
        , "installmentsDue": {"orders": [{"orderId": 900, "orderNumber": "0053", "customerName": "Cọc Khách", "key": "s2", "label": "Cọc 2",
                                          "amount": 400000, "remaining": 400000, "lateDays": 0}]},
          "installmentsOverdue": {"orders": [{"orderId": 901, "orderNumber": "0054", "customerName": "Cọc Trễ", "key": "s1", "label": "Cọc 1",
                                              "amount": 100000, "remaining": 100000, "lateDays": 3}]}
        """
        let withStages = try work(extra: stage)
        XCTAssertEqual(withStages.installmentsDue.count, 1, "the fixture must carry deposit stages")
        let file = build(withStages)
        XCTAssertFalse(file.rows.contains { $0.orderId == 900 || $0.orderId == 901 })
        XCTAssertEqual(file.counts.total, 7)
    }

    func testCustomerNamesAreLeftOutWhenTheOwnerSaysSo() throws {
        let shown = build(try work(), hideNames: false)
        XCTAssertEqual(shown.rows.map { $0.name }, ["Lê Ngọc Lan", "Hà Gia Bảo", "Mai Quốc Huy", "Phạm Văn An", "Bùi Thanh Tâm"])
        let hidden = build(try work(), hideNames: true)
        XCTAssertTrue(hidden.hideNames)
        XCTAssertTrue(hidden.rows.allSatisfy { $0.name.isEmpty })
        let text = String(data: try TodayWidgetSnapshot.encoder().encode(hidden), encoding: .utf8)!
        XCTAssertFalse(text.contains("Gia Bảo"))
        XCTAssertFalse(text.contains("Ngọc Lan"))
    }

    /// The file holds no phone number and no money, whatever the API row carried
    func testTheFileHasNoPhoneAndNoMoney() throws {
        let text = String(data: try TodayWidgetSnapshot.encoder().encode(build(try work())), encoding: .utf8)!
        XCTAssertFalse(text.contains("0912345678"))
        for money in ["1234567", "654321", "500000"] { XCTAssertFalse(text.contains(money), money) }
        for key in ["phone", "Phone", "amount", "Amount", "total", "token", "Token", "deposit"] { XCTAssertFalse(text.contains(key), key) }
    }

    func testTheUserAndBranchAreRecordedWithoutLeakingThemToTheRows() throws {
        let file = build(try work())
        XCTAssertEqual(file.userId, 7)
        XCTAssertEqual(file.outletId, 5)
        XCTAssertEqual(file.savedAt, at("2026-10-31T01:12:00Z"))
    }

    // MARK: Words

    func testWordsAreTheAppsOwnStrings() {
        XCTAssertEqual(TodayWidgetData.labels().notPrepared, "orders.v2.notPrepared".localized())
        XCTAssertEqual(TodayWidgetData.labels().today, "Today section".localized())
    }

    func testTheFallbackWordsMatchTheAppsStringFiles() throws {
        for (folder, expected) in [("vi-VN", TodayWidgetLabels.vietnamese), ("en", TodayWidgetLabels.english)] {
            let path = try XCTUnwrap(Bundle.main.path(forResource: folder, ofType: "lproj"), folder)
            let bundle = try XCTUnwrap(Bundle(path: path))
            XCTAssertEqual(TodayWidgetData.labels(bundle: bundle), expected, folder)
        }
    }

    // MARK: What an answer does to the file

    func testOutcomeOfTheLoad() throws {
        XCTAssertEqual(TodayWidgetSync.outcome(work: try work(), error: nil), .write)
        XCTAssertEqual(TodayWidgetSync.outcome(work: nil, error: NSError(domain: "RC", code: 403)), .noAccess)
        // A network error or a server error keeps the last file: it is never turned into yesterday's list shown as today's
        XCTAssertEqual(TodayWidgetSync.outcome(work: nil, error: NSError(domain: NSURLErrorDomain, code: NSURLErrorNotConnectedToInternet)), .keep)
        XCTAssertEqual(TodayWidgetSync.outcome(work: nil, error: NSError(domain: "RC", code: 500)), .keep)
        XCTAssertEqual(TodayWidgetSync.outcome(work: nil, error: NSError(domain: "RC", code: 401)), .keep)
        XCTAssertEqual(TodayWidgetSync.outcome(work: nil, error: nil), .keep)
    }

    func testTheHideNamesSwitchIsOffByDefaultAndRemembered() {
        let suite = "widget-tests-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        XCTAssertFalse(TodayWidgetSync.hideNames(defaults: defaults))
        TodayWidgetSync.setHideNames(true, defaults: defaults)
        XCTAssertTrue(TodayWidgetSync.hideNames(defaults: defaults))
        TodayWidgetSync.setHideNames(false, defaults: defaults)
        XCTAssertFalse(TodayWidgetSync.hideNames(defaults: defaults))
    }

    // MARK: The one-time hint (W11)

    func testTheHintShowsOnlyWhenThereIsWorkAndNoWidgetYet() {
        let show = TodayWidgetHint.shouldShow(supported: true, todayAvailable: true, hasWork: true, hasWidget: false, dismissed: false)
        XCTAssertTrue(show)
        XCTAssertFalse(TodayWidgetHint.shouldShow(supported: true, todayAvailable: true, hasWork: false, hasWidget: false, dismissed: false), "nothing to do today")
        XCTAssertFalse(TodayWidgetHint.shouldShow(supported: true, todayAvailable: true, hasWork: true, hasWidget: true, dismissed: false), "the widget is there")
        XCTAssertFalse(TodayWidgetHint.shouldShow(supported: true, todayAvailable: true, hasWork: true, hasWidget: nil, dismissed: false), "not known yet")
        XCTAssertFalse(TodayWidgetHint.shouldShow(supported: true, todayAvailable: true, hasWork: true, hasWidget: false, dismissed: true), "Không hỏi lại")
        XCTAssertFalse(TodayWidgetHint.shouldShow(supported: true, todayAvailable: false, hasWork: true, hasWidget: false, dismissed: false), "403: no Việc cần làm")
        XCTAssertFalse(TodayWidgetHint.shouldShow(supported: false, todayAvailable: true, hasWork: true, hasWidget: false, dismissed: false), "iOS 15: no widget")
    }

    func testKhongHoiLaiNeverComesBack() {
        let suite = "widget-tests-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        XCTAssertFalse(TodayWidgetHint.isDismissed(defaults: defaults))
        TodayWidgetHint.dismiss(defaults: defaults)
        XCTAssertTrue(TodayWidgetHint.isDismissed(defaults: defaults))
        // New work, a new day, a relaunch: still gone
        XCTAssertFalse(TodayWidgetHint.shouldShow(supported: true, todayAvailable: true, hasWork: true, hasWidget: false,
                                                  dismissed: TodayWidgetHint.isDismissed(defaults: defaults)))
    }

    // MARK: Settings rows

    func testSettingsHasAWidgetRowOnlyWhereWidgetsWork() {
        let role: Role? = .merchant
        let permissions = ["analytics.view.dashboard"]
        let off = SettingsV2Logic.sections(role: role, permissions: permissions, hasPlan: true)
        XCTAssertFalse(off.contains { $0.items.contains(.widget) })
        let on = SettingsV2Logic.sections(role: role, permissions: permissions, hasPlan: true, supportsWidget: true)
        let account = on.first { $0.group == .account }
        XCTAssertEqual(account?.items.filter { $0 == .widget }.count, 1)
        // Right after Ngôn ngữ, before Nâng cao
        let items = account?.items ?? []
        if let widget = items.firstIndex(of: .widget), let language = items.firstIndex(of: .language), let advanced = items.firstIndex(of: .advanced) {
            XCTAssertEqual(widget, language + 1)
            XCTAssertEqual(advanced, widget + 1)
        } else {
            XCTFail("account rows: \(items)")
        }
    }
}
