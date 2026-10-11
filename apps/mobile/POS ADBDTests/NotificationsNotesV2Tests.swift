import XCTest
@testable import POS_ADBD

/// #477 — new inbox (Vietnam day groups, type tiles, unread style) and note editor photo rules
final class NotificationsNotesV2Tests: XCTestCase {
    private let vi = Locale(identifier: "vi_VN")

    private func date(_ iso: String) -> Date {
        ISO8601DateFormatter().date(from: iso)!
    }

    private func item(_ id: Int, _ createdAt: String, type: String = "ORDER_CREATED", status: String? = nil,
                      isRead: Bool = false) -> InboxNotification {
        InboxNotification(
            id: id, type: type, title: "T\(id)", message: nil, body: "B\(id)", isRead: isRead, readAt: nil,
            createdAt: createdAt,
            data: InboxNotificationPayload(type: type, orderId: "\(id)", orderNumber: nil, status: status,
                                           outletId: nil, orderType: nil, previousStatus: nil)
        )
    }

    // MARK: Paging (#751)

    func testAppendPageSkipsRowsAlreadyInTheList() {
        // a notification arrived while the list was open: page 2 starts with the last row of page 1
        let page1 = (11...30).reversed().map { item($0, "2026-10-05T02:00:00Z") }
        let page2 = (1...11).reversed().map { item($0, "2026-10-05T02:00:00Z") }
        let merged = NotificationsLogic.appendPage(page1, page2)
        XCTAssertEqual(merged.map { $0.id }, Array((1...30).reversed()))
        XCTAssertEqual(Set(merged.map { $0.id }).count, merged.count)
    }

    func testAppendPageKeepsOrderAndHandlesEmptyPages() {
        let first = [item(5, "2026-10-05T02:00:00Z"), item(4, "2026-10-05T02:00:00Z")]
        XCTAssertEqual(NotificationsLogic.appendPage(first, []).map { $0.id }, [5, 4])
        XCTAssertEqual(NotificationsLogic.appendPage([], first).map { $0.id }, [5, 4])
        let page = [item(4, "2026-10-05T02:00:00Z"), item(3, "2026-10-05T02:00:00Z"), item(3, "2026-10-05T02:00:00Z")]
        XCTAssertEqual(NotificationsLogic.appendPage(first, page).map { $0.id }, [5, 4, 3])
    }

    // MARK: Day groups on Vietnam civil days

    func testVietnamMidnightSplitsGroupsAt17UTC() {
        // 16:59:59Z = 23:59:59 on 04/10 in Vietnam; 17:00:00Z = 00:00 on 05/10
        let items = [item(2, "2026-10-04T17:00:00Z"), item(1, "2026-10-04T16:59:59Z")]
        let groups = NotificationsLogic.groups(items, now: date("2026-10-05T03:00:00Z"), locale: vi)
        XCTAssertEqual(groups.map { $0.key }, ["2026-10-05", "2026-10-04"])
        XCTAssertEqual(groups.map { $0.items.map { $0.id } }, [[2], [1]])
    }

    func testTodayYesterdayAndOlderTitles() {
        let now = date("2026-10-05T03:00:00Z") // Mon 05/10 10:00 in Vietnam
        let items = [
            item(3, "2026-10-05T02:12:00Z"),
            item(2, "2026-10-04T11:30:00Z"),
            item(1, "2026-10-02T09:00:00.000Z"),
        ]
        let titles = NotificationsLogic.groups(items, now: now, locale: vi).map { $0.title }
        let today = "notifications.v2.today".localized().uppercased(with: vi)
        let yesterday = "notifications.v2.yesterday".localized().uppercased(with: vi)
        XCTAssertEqual(titles, ["\(today) · T2 05/10", "\(yesterday) · CN 04/10", "T6 02/10"])
    }

    func testTodayFollowsVietnamDayNotUTC() {
        // 18:00Z on 04/10 is already 01:00 on 05/10 in Vietnam: an item at 17:30Z is "today"
        let now = date("2026-10-04T18:00:00Z")
        let groups = NotificationsLogic.groups([item(1, "2026-10-04T17:30:00Z")], now: now, locale: vi)
        XCTAssertEqual(groups.first?.key, "2026-10-05")
        XCTAssertTrue(groups.first?.title.hasPrefix("notifications.v2.today".localized().uppercased(with: vi)) == true)
    }

    func testTimeIsVietnamClock() {
        XCTAssertEqual(NotificationsLogic.time(date("2026-10-05T02:12:00Z")), "09:12")
        XCTAssertEqual(NotificationsLogic.time(date("2026-10-04T16:59:59Z")), "23:59")
        XCTAssertEqual(NotificationsLogic.time(nil), "")
    }

    func testUnreadableDateJoinsPreviousGroup() {
        let items = [item(2, "2026-10-05T02:00:00Z"), item(1, "not-a-date")]
        let groups = NotificationsLogic.groups(items, now: date("2026-10-05T03:00:00Z"), locale: vi)
        XCTAssertEqual(groups.count, 1)
        XCTAssertEqual(groups[0].items.map { $0.id }, [2, 1])
    }

    // MARK: Type → tile

    func testKindMapping() {
        XCTAssertEqual(NotificationsLogic.kind(type: "ORDER_CREATED", status: "RESERVED"), .order)
        XCTAssertEqual(NotificationsLogic.kind(type: "ORDER_STATUS_CHANGED", status: "PICKUPED"), .handOver)
        XCTAssertEqual(NotificationsLogic.kind(type: "ORDER_STATUS_CHANGED", status: "RETURNED"), .returned)
        XCTAssertEqual(NotificationsLogic.kind(type: "ORDER_STATUS_CHANGED", status: "COMPLETED"), .payment)
        XCTAssertEqual(NotificationsLogic.kind(type: "ORDER_STATUS_CHANGED", status: "CANCELLED"), .neutral)
        XCTAssertEqual(NotificationsLogic.kind(type: "ORDER_STATUS_CHANGED", status: "RESERVED"), .order)
        XCTAssertEqual(NotificationsLogic.kind(type: "ORDER_STATUS_CHANGED", status: nil), .order)
        XCTAssertEqual(NotificationsLogic.kind(type: "PAYMENT_RECEIVED", status: nil), .payment)
        XCTAssertEqual(NotificationsLogic.kind(type: "ORDER_OVERDUE", status: nil), .late)
        XCTAssertEqual(NotificationsLogic.kind(type: "RETURN_LATE", status: nil), .late)
        XCTAssertEqual(NotificationsLogic.kind(type: "HANDOVER_DUE", status: nil), .handOver)
        XCTAssertEqual(NotificationsLogic.kind(type: "SOMETHING_NEW", status: nil), .neutral)
        XCTAssertEqual(NotificationsLogic.kind(type: "", status: nil), .neutral)
    }

    func testKindColorsAndSymbols() {
        XCTAssertEqual(NotificationsLogic.colors(for: .order).fill, DS.Status.handOver.fill)
        XCTAssertEqual(NotificationsLogic.colors(for: .late).text, DS.Status.late.text)
        XCTAssertEqual(NotificationsLogic.colors(for: .returned).fill, DS.Status.returning.fill)
        XCTAssertEqual(NotificationsLogic.colors(for: .payment).fill, DS.Status.done.fill)
        XCTAssertEqual(NotificationsLogic.colors(for: .neutral).fill, DS.Status.cancelled.fill)
        for kind in [NotificationKind.order, .handOver, .late, .returned, .payment, .neutral] {
            XCTAssertNotNil(UIImage(systemName: NotificationsLogic.symbol(for: kind)), "\(kind)")
        }
    }

    // MARK: Unread styling

    func testUnreadAndReadRowStyle() {
        let unread = NotificationsLogic.rowStyle(isRead: false)
        XCTAssertTrue(unread.titleBold)
        XCTAssertEqual(unread.titleHex, "0F172A")
        XCTAssertEqual(unread.backgroundHex, "F8FBFF")
        XCTAssertTrue(unread.showsDot)

        let read = NotificationsLogic.rowStyle(isRead: true)
        XCTAssertFalse(read.titleBold)
        XCTAssertEqual(read.titleHex, "334155")
        XCTAssertEqual(read.backgroundHex, "FFFFFF")
        XCTAssertFalse(read.showsDot)
    }

    // MARK: Note editor photos

    func testPhotoLimitIsFive() {
        XCTAssertEqual(OrderDetailLogic.maxNotePhotos, 5)
        XCTAssertTrue(NoteEditorLogic.canAdd(count: 0))
        XCTAssertTrue(NoteEditorLogic.canAdd(count: 4))
        XCTAssertFalse(NoteEditorLogic.canAdd(count: 5))
        XCTAssertFalse(NoteEditorLogic.canAdd(count: 6))
        XCTAssertEqual(NoteEditorLogic.remaining(count: 2), 3)
        XCTAssertEqual(NoteEditorLogic.remaining(count: 7), 0)
    }

    func testCartEditorHasNoPhotos() {
        XCTAssertFalse(NoteEditorLogic.canAdd(count: 0, max: 0))
        XCTAssertEqual(NoteEditorLogic.remaining(count: 0, max: 0), 0)
    }

    func testCountLabelAndTitleSuffix() {
        XCTAssertEqual(NoteEditorLogic.countLabel(count: 2), String(format: "%d/%d photos".localized(), 2, 5))
        XCTAssertEqual(NoteEditorLogic.titleSuffix(orderNumber: "ORD-3-0057"), "#0057")
        XCTAssertEqual(NoteEditorLogic.titleSuffix(orderNumber: "1234"), "#1234")
        XCTAssertNil(NoteEditorLogic.titleSuffix(orderNumber: nil))
        XCTAssertNil(NoteEditorLogic.titleSuffix(orderNumber: ""))
    }

    func testSaveKeepsFivePhotoPlan() {
        // The editor never lets a 6th photo through; the save plan rejects it anyway
        XCTAssertNotNil(OrderDetailLogic.notesPlan(original: ["a", "b"], kept: ["a"], newCount: 4))
        XCTAssertNil(OrderDetailLogic.notesPlan(original: ["a", "b"], kept: ["a", "b"], newCount: 4))
    }
}
