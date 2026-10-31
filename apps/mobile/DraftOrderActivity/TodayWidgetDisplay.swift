import Foundation

/// What the widget draws at a given instant. Pure: the same snapshot gives "Cũ" after the Vietnam midnight with no
/// network and no app launch. The widget never shows yesterday's list as today's.
public struct TodayWidgetDisplay: Equatable {
    public enum Kind: Equatable {
        /// No file, an unreadable file, or sign-out
        case loggedOut
        case noAccess
        /// The list is from an earlier Vietnam day: "Mở app để cập nhật"
        case stale
        /// A fresh list with nothing to do
        case empty
        case work
    }

    public enum Trailing: Equatable {
        /// "Trễ 2 ngày" (red)
        case late(String)
        /// "Chưa soạn đồ" (orange, hand-over rows only)
        case notPrepared(String)
        /// The first product (grey)
        case product(String)
        case none
    }

    public struct Line: Equatable {
        public let orderId: Int
        public let tag: String
        public let isReturn: Bool
        /// Empty when the owner turned names off: the widget draws `labels.hiddenName` instead
        public let name: String
        public let trailing: Trailing
        /// `anyrent://order/<id>`
        public let url: URL
    }

    public let kind: Kind
    public let labels: TodayWidgetLabels
    /// Left of the header: "Hôm nay", or "AnyRent" while signed out
    public let title: String
    /// Right of the header, today's Vietnam day: "31/10" (medium adds the weekday in the view)
    public let dayText: String
    public let counts: TodayWidgetCounts
    public let lines: [Line]
    /// "+3 việc khác"; nil when every job is shown
    public let moreText: String?
    /// "cập nhật 08:12"
    public let updatedText: String?
    /// "Mai có 2 giao, 1 trả" on the empty state
    public let tomorrowText: String?
    /// "Danh sách lần cuối: hôm qua 17:40" on the stale state
    public let staleDetail: String?
    public let hidesNames: Bool

    /// Tapping the header (counts) opens Việc cần làm; signed out, the app opens on its sign-in screen
    public var headerURL: URL { TodayWidgetLink.todoURL }

    /// - rowLimit: 0 for the small widget (three numbers only), 3 for the medium one
    public static func make(snapshot: TodayWidgetSnapshot?, now: Date, rowLimit: Int) -> TodayWidgetDisplay {
        let todayText = TodayWidgetClock.dayMonthText(now)
        guard let snapshot = snapshot, snapshot.state != .loggedOut else {
            let labels = snapshot?.labels ?? TodayWidgetLabels.fallback()
            return TodayWidgetDisplay(kind: .loggedOut, labels: labels, title: labels.appName, dayText: "",
                                      counts: TodayWidgetCounts(late: 0, pickup: 0, returns: 0), lines: [], moreText: nil,
                                      updatedText: nil, tomorrowText: nil, staleDetail: nil, hidesNames: false)
        }
        let labels = snapshot.labels
        func plain(_ kind: Kind, staleDetail: String? = nil) -> TodayWidgetDisplay {
            TodayWidgetDisplay(kind: kind, labels: labels, title: labels.today, dayText: todayText, counts: snapshot.counts,
                               lines: [], moreText: nil, updatedText: nil, tomorrowText: nil, staleDetail: staleDetail,
                               hidesNames: snapshot.hideNames)
        }
        if snapshot.state == .noAccess { return plain(.noAccess) }
        guard snapshot.isFresh(now: now) else {
            return plain(.stale, staleDetail: String(format: labels.staleFormat, lastUpdatedText(snapshot.savedAt, now: now, labels: labels)))
        }
        let updated = String(format: labels.updatedFormat, TodayWidgetClock.timeText(snapshot.savedAt))
        let counts = snapshot.counts
        if counts.total == 0 {
            return TodayWidgetDisplay(kind: .empty, labels: labels, title: labels.today, dayText: todayText, counts: counts,
                                      lines: [], moreText: nil, updatedText: updated,
                                      tomorrowText: tomorrowText(counts, labels: labels), staleDetail: nil,
                                      hidesNames: snapshot.hideNames)
        }
        let shown = snapshot.rows.prefix(max(0, rowLimit)).map { row -> Line in
            Line(orderId: row.orderId, tag: row.kind == .pickup ? labels.pickup : labels.returnTask,
                 isReturn: row.kind == .returnTask, name: snapshot.hideNames ? "" : row.name,
                 trailing: trailing(row, labels: labels), url: TodayWidgetLink.orderURL(row.orderId))
        }
        let more = max(0, counts.total - shown.count)
        return TodayWidgetDisplay(kind: .work, labels: labels, title: labels.today, dayText: todayText, counts: counts,
                                  lines: Array(shown), moreText: more > 0 && rowLimit > 0 ? String(format: labels.moreFormat, more) : nil,
                                  updatedText: updated, tomorrowText: nil, staleDetail: nil, hidesNames: snapshot.hideNames)
    }

    /// Late first (red), then "Chưa soạn đồ" on a hand-over (orange), else the first product
    public static func trailing(_ row: TodayWidgetRow, labels: TodayWidgetLabels) -> Trailing {
        if row.isLate || row.lateDays > 0, !row.lateText.isEmpty { return .late(row.lateText) }
        if row.kind == .pickup && row.notPrepared { return .notPrepared(labels.notPrepared) }
        return row.product.isEmpty ? .none : .product(row.product)
    }

    public static func tomorrowText(_ counts: TodayWidgetCounts, labels: TodayWidgetLabels) -> String? {
        guard counts.tomorrowPickup != nil || counts.tomorrowReturn != nil else { return nil }
        let pickups = counts.tomorrowPickup ?? 0
        let returns = counts.tomorrowReturn ?? 0
        guard pickups + returns > 0 else { return nil }
        return String(format: labels.tomorrowFormat, pickups, returns)
    }

    /// "08:12" on the same Vietnam day, "hôm qua 17:40" the day before, "29/10 17:40" earlier
    public static func lastUpdatedText(_ savedAt: Date, now: Date, labels: TodayWidgetLabels) -> String {
        let time = TodayWidgetClock.timeText(savedAt)
        let savedKey = TodayWidgetClock.dayKey(savedAt)
        if savedKey == TodayWidgetClock.dayKey(now) { return time }
        let calendar = TodayWidgetClock.calendar
        if let yesterday = calendar.date(byAdding: .day, value: -1, to: now), savedKey == TodayWidgetClock.dayKey(yesterday) {
            return labels.yesterday + " " + time
        }
        return TodayWidgetClock.dayMonthText(savedAt) + " " + time
    }
}

/// `anyrent://order/<id>` opens that order, `anyrent://todo` opens Đơn hàng on Việc cần làm. Any other `anyrent://` link
/// keeps its old meaning: the draft cart of the Live Activity.
public enum TodayWidgetLink: Equatable {
    case order(Int)
    case todo
    case draftCart

    public static let scheme = "anyrent"
    public static let todoURL = URL(string: "anyrent://todo")!

    public static func orderURL(_ id: Int) -> URL {
        URL(string: "anyrent://order/\(id)")!
    }

    /// nil for a URL that is not `anyrent://`
    public static func parse(_ url: URL) -> TodayWidgetLink? {
        guard url.scheme?.lowercased() == scheme else { return nil }
        switch url.host?.lowercased() ?? "" {
        case "order":
            // A bad id falls back to the old behaviour rather than opening nothing
            if let id = Int(url.lastPathComponent), id > 0, url.pathComponents.count == 2 { return .order(id) }
            return .draftCart
        case "todo":
            return .todo
        default:
            return .draftCart
        }
    }
}
