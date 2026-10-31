import Foundation

/// What the widget draws at a given instant. Pure: the same snapshot gives "Cũ" after the Vietnam midnight with no
/// network and no app launch. The widget never shows yesterday's list as today's.
///
/// This is the data/logic side of the widget. The SwiftUI views (`AnyRentLiveActivity/TodayWorkWidget.swift`) only draw
/// what is here, so a new design changes the views and not these rules.
public struct TodayWidgetDisplay: Equatable {
    public enum Kind: Equatable {
        /// No file, an unreadable file, or sign-out
        case loggedOut
        case noAccess
        /// The list is from an earlier Vietnam day: "Mở app để cập nhật"
        case stale
        /// A fresh list with nothing to do and nothing done
        case empty
        /// Something was done today and nothing is left: "Xong hết 10/10"
        case allDone
        case work
    }

    /// The kind chip of a row: a late job is TRỄ whether it is a hand-over or a return
    public enum Chip: Equatable {
        case late, pickup, returnTask
    }

    public struct Line: Equatable {
        public let orderId: Int
        public let chip: Chip
        /// "TRỄ", "GIAO", "TRẢ"
        public let chipText: String
        /// Empty when the owner turned names off: the widget draws `labels.hiddenName` instead
        public let name: String
        /// Line 1, right: "Trễ 3 ngày" (late) or "Hôm nay · 14:00" / "Hôm nay"
        public let rightText: String
        public let rightIsLate: Bool
        /// Line 2, left: "Áo dài gấm đỏ +1"
        public let productText: String
        /// Line 2, right: "Chưa soạn đồ" (hand-over rows only), drawn as orange text with a warning icon
        public let warningText: String?
        /// Line 2, right, a late row without the warning: the day it was due, "Lấy 28/10/26"
        public let dayText: String?
        /// `anyrent://order/<id>`
        public let url: URL
    }

    public let kind: Kind
    public let labels: TodayWidgetLabels
    /// Left of the header: "Hôm nay", or "AnyRent" while signed out
    public let title: String
    /// Today's Vietnam day: "31/10"
    public let dayText: String
    public let counts: TodayWidgetCounts
    public let done: Int
    /// Done today plus what is left (late, hand-overs, returns)
    public let total: Int
    public let lines: [Line]
    /// "+4 việc khác"; nil when every job is shown
    public let moreText: String?
    /// "cập nhật 08:12"
    public let updatedText: String?
    /// "Mai có 2 giao, 1 trả" on the empty state
    public let tomorrowText: String?
    /// "Danh sách lần cuối: hôm qua 17:40" on the stale state
    public let staleDetail: String?
    public let hidesNames: Bool

    public var progressText: String { "\(done)/\(total)" }
    /// 0...1 for the ring
    public var progress: Double { total > 0 ? min(1, Double(done) / Double(total)) : 0 }
    /// "Xong hết 10/10" (the all-done state)
    public var allDoneText: String? {
        kind == .allDone ? String(format: labels.allDoneFormat, done, total) : nil
    }
    /// "xong 4/10 · +4 việc khác · cập nhật 08:12": the footer of the medium widget
    public var footerText: String {
        [String(format: labels.doneFormat, done, total), moreText, updatedText].compactMap { $0 }.joined(separator: " · ")
    }
    /// Tapping the header (counts) opens Việc cần làm; signed out, the app opens on its sign-in screen
    public var headerURL: URL { TodayWidgetLink.todoURL }

    /// - rowLimit: 0 for the small widget (ring and counters only), 2 for the medium one
    public static func make(snapshot: TodayWidgetSnapshot?, now: Date, rowLimit: Int) -> TodayWidgetDisplay {
        let todayText = TodayWidgetClock.dayMonthText(now)
        let none = TodayWidgetCounts(late: 0, pickup: 0, returns: 0)
        guard let snapshot = snapshot, snapshot.state != .loggedOut else {
            let labels = snapshot?.labels ?? TodayWidgetLabels.fallback()
            return TodayWidgetDisplay(kind: .loggedOut, labels: labels, title: labels.appName, dayText: "", counts: none, done: 0,
                                      total: 0, lines: [], moreText: nil, updatedText: nil, tomorrowText: nil, staleDetail: nil,
                                      hidesNames: false)
        }
        let labels = snapshot.labels
        let done = max(0, snapshot.done)
        let counts = snapshot.counts
        let total = done + counts.total
        func plain(_ kind: Kind, staleDetail: String? = nil) -> TodayWidgetDisplay {
            TodayWidgetDisplay(kind: kind, labels: labels, title: labels.today, dayText: todayText, counts: counts, done: done,
                               total: total, lines: [], moreText: nil, updatedText: nil, tomorrowText: nil,
                               staleDetail: staleDetail, hidesNames: snapshot.hideNames)
        }
        if snapshot.state == .noAccess { return plain(.noAccess) }
        guard snapshot.isFresh(now: now) else {
            return plain(.stale, staleDetail: String(format: labels.staleFormat, lastUpdatedText(snapshot.savedAt, now: now, labels: labels)))
        }
        let updated = String(format: labels.updatedFormat, TodayWidgetClock.timeText(snapshot.savedAt))
        if counts.total == 0 {
            let kind: Kind = done > 0 ? .allDone : .empty
            return TodayWidgetDisplay(kind: kind, labels: labels, title: labels.today, dayText: todayText, counts: counts, done: done,
                                      total: total, lines: [], moreText: nil, updatedText: updated,
                                      tomorrowText: tomorrowText(counts, labels: labels), staleDetail: nil, hidesNames: snapshot.hideNames)
        }
        let shown = snapshot.rows.prefix(max(0, rowLimit)).map { line($0, labels: labels, hideNames: snapshot.hideNames) }
        let more = max(0, counts.total - shown.count)
        return TodayWidgetDisplay(kind: .work, labels: labels, title: labels.today, dayText: todayText, counts: counts, done: done,
                                  total: total, lines: Array(shown),
                                  moreText: more > 0 && rowLimit > 0 ? String(format: labels.moreFormat, more) : nil,
                                  updatedText: updated, tomorrowText: nil, staleDetail: nil, hidesNames: snapshot.hideNames)
    }

    static func line(_ row: TodayWidgetRow, labels: TodayWidgetLabels, hideNames: Bool) -> Line {
        let late = row.isLate || row.lateDays > 0
        let chip: Chip = late ? .late : (row.kind == .pickup ? .pickup : .returnTask)
        let chipWord = late ? labels.late : (row.kind == .pickup ? labels.pickup : labels.returnTask)
        let locale = Locale(identifier: labels.locale)
        let right: String
        if late, !row.lateText.isEmpty {
            right = row.lateText
        } else {
            right = row.planTime.isEmpty ? labels.today : String(format: labels.todayAtFormat, row.planTime)
        }
        let warning = row.kind == .pickup && row.notPrepared ? labels.notPrepared : nil
        return Line(orderId: row.orderId, chip: chip, chipText: chipWord.uppercased(with: locale),
                    name: hideNames ? "" : row.name, rightText: right, rightIsLate: late && !row.lateText.isEmpty,
                    productText: productText(row), warningText: warning,
                    dayText: late && warning == nil && !row.planDay.isEmpty ? row.planDay : nil,
                    url: TodayWidgetLink.orderURL(row.orderId))
    }

    /// "Áo dài gấm đỏ +1"
    static func productText(_ row: TodayWidgetRow) -> String {
        guard !row.product.isEmpty else { return "" }
        return row.moreCount > 0 ? "\(row.product) +\(row.moreCount)" : row.product
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
