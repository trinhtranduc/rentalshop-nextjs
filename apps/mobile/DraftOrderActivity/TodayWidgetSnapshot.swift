import Foundation

// "Việc cần làm" home-screen widget (#1375, epic #1372).
//
// The app writes ONE small JSON file into the App Group; the widget extension only reads it. The file never holds a
// token, a phone number or an amount of money, and the extension never calls the API (the refresh token changes on
// every refresh, so a second process refreshing it could sign the whole phone out).
//
// This file is Swift 5 and lives in the static library shared by the app (Swift 4) and the extension.

/// Texts the app writes in its own language, so the extension needs no string file.
/// `vietnamese` / `english` are only the fallback for a phone that never opened the app (no file yet).
public struct TodayWidgetLabels: Codable, Equatable {
    public var locale: String
    public var appName: String
    public var today: String
    /// The counters and the chips (the chip is the same word in capitals): Trễ, Giao, Trả
    public var late: String
    public var pickup: String
    public var returnTask: String
    public var notPrepared: String
    /// "+%d việc khác"
    public var moreFormat: String
    /// "cập nhật %@"
    public var updatedFormat: String
    /// "xong %d/%d" (the footer of the medium widget)
    public var doneFormat: String
    /// "đã xong hôm nay" (under the ring of the small widget)
    public var doneCaption: String
    /// "Xong hết %d/%d"
    public var allDoneFormat: String
    /// "Hôm nay · %@" (the time of the job)
    public var todayAtFormat: String
    public var empty: String
    /// "Mai có %d giao, %d trả"
    public var tomorrowFormat: String
    public var loggedOut: String
    public var loggedOutHint: String
    public var noAccess: String
    public var stale: String
    /// "Danh sách lần cuối: %@"
    public var staleFormat: String
    public var yesterday: String
    /// Shown in place of the customer name when the owner turned names off
    public var hiddenName: String
    public var displayName: String
    public var displayDescription: String

    public init(locale: String, appName: String, today: String, late: String, pickup: String, returnTask: String,
                notPrepared: String, moreFormat: String, updatedFormat: String, doneFormat: String, doneCaption: String,
                allDoneFormat: String, todayAtFormat: String, empty: String, tomorrowFormat: String, loggedOut: String,
                loggedOutHint: String, noAccess: String, stale: String, staleFormat: String, yesterday: String,
                hiddenName: String, displayName: String, displayDescription: String) {
        self.locale = locale
        self.appName = appName
        self.today = today
        self.late = late
        self.pickup = pickup
        self.returnTask = returnTask
        self.notPrepared = notPrepared
        self.moreFormat = moreFormat
        self.updatedFormat = updatedFormat
        self.doneFormat = doneFormat
        self.doneCaption = doneCaption
        self.allDoneFormat = allDoneFormat
        self.todayAtFormat = todayAtFormat
        self.empty = empty
        self.tomorrowFormat = tomorrowFormat
        self.loggedOut = loggedOut
        self.loggedOutHint = loggedOutHint
        self.noAccess = noAccess
        self.stale = stale
        self.staleFormat = staleFormat
        self.yesterday = yesterday
        self.hiddenName = hiddenName
        self.displayName = displayName
        self.displayDescription = displayDescription
    }

    public static let vietnamese = TodayWidgetLabels(
        locale: "vi", appName: "AnyRent", today: "Hôm nay", late: "Trễ", pickup: "Giao", returnTask: "Trả",
        notPrepared: "Chưa soạn đồ", moreFormat: "+%d việc khác", updatedFormat: "cập nhật %@", doneFormat: "xong %d/%d",
        doneCaption: "đã xong hôm nay", allDoneFormat: "Xong hết %d/%d", todayAtFormat: "Hôm nay · %@",
        empty: "Hôm nay chưa có việc", tomorrowFormat: "Mai có %d giao, %d trả", loggedOut: "Mở AnyRent để đăng nhập",
        loggedOutHint: "Việc cần làm sẽ hiện ở đây", noAccess: "Tài khoản này không có Việc cần làm",
        stale: "Mở app để cập nhật", staleFormat: "Danh sách lần cuối: %@", yesterday: "hôm qua",
        hiddenName: "chạm để mở", displayName: "Việc cần làm",
        displayDescription: "Giao đồ, nhận trả và đơn trễ của hôm nay.")

    public static let english = TodayWidgetLabels(
        locale: "en", appName: "AnyRent", today: "Today", late: "Late", pickup: "Out", returnTask: "Back",
        notPrepared: "Not prepared", moreFormat: "+%d more", updatedFormat: "updated %@", doneFormat: "done %d/%d",
        doneCaption: "done today", allDoneFormat: "All done %d/%d", todayAtFormat: "Today · %@",
        empty: "Nothing to do today", tomorrowFormat: "Tomorrow: %d out, %d back", loggedOut: "Open AnyRent to sign in",
        loggedOutHint: "Your to-do list will show here", noAccess: "This account has no To do list",
        stale: "Open the app to update", staleFormat: "Last list: %@", yesterday: "yesterday",
        hiddenName: "tap to open", displayName: "To do",
        displayDescription: "Today's hand-overs, returns and late orders.")

    /// The fallback for a phone with no file yet: Vietnamese unless the phone is set to another language
    public static func fallback(preferredLanguages: [String] = Locale.preferredLanguages) -> TodayWidgetLabels {
        let first = preferredLanguages.first?.lowercased() ?? "vi"
        return first.hasPrefix("vi") ? .vietnamese : .english
    }
}

public struct TodayWidgetCounts: Codable, Equatable {
    public var late: Int
    public var pickup: Int
    public var returns: Int
    /// nil when the API did not send tomorrow's groups (older API)
    public var tomorrowPickup: Int?
    public var tomorrowReturn: Int?

    public init(late: Int, pickup: Int, returns: Int, tomorrowPickup: Int? = nil, tomorrowReturn: Int? = nil) {
        self.late = late
        self.pickup = pickup
        self.returns = returns
        self.tomorrowPickup = tomorrowPickup
        self.tomorrowReturn = tomorrowReturn
    }

    public var total: Int { late + pickup + returns }
}

/// One job of the day. No phone, no money, no photo. `name` is empty when the owner turned customer names off.
public struct TodayWidgetRow: Codable, Equatable {
    public enum Kind: String, Codable { case pickup, returnTask = "return" }

    /// Public numeric order id (never the database id): `anyrent://order/<orderId>`
    public var orderId: Int
    public var kind: Kind
    public var isLate: Bool
    public var name: String
    /// First item name (no quantity)
    public var product: String
    /// How many other items the order has ("Áo dài gấm đỏ +1")
    public var moreCount: Int
    public var lateDays: Int
    /// "Trễ 2 ngày", written by the app (the plural is the app's rule); empty when not late
    public var lateText: String
    /// Hand-over rows only
    public var notPrepared: Bool
    /// "14:00" in Vietnam time, only when the order really has a time (not the Vietnam midnight); else empty
    public var planTime: String
    /// The planned day of the job with its word, "Lấy 28/10/26" (hand-over) or "Trả 29/10/26" (return)
    public var planDay: String

    public init(orderId: Int, kind: Kind, isLate: Bool, name: String, product: String, moreCount: Int, lateDays: Int,
                lateText: String, notPrepared: Bool, planTime: String, planDay: String) {
        self.orderId = orderId
        self.kind = kind
        self.isLate = isLate
        self.name = name
        self.product = product
        self.moreCount = moreCount
        self.lateDays = lateDays
        self.lateText = lateText
        self.notPrepared = notPrepared
        self.planTime = planTime
        self.planDay = planDay
    }
}

public struct TodayWidgetSnapshot: Codable, Equatable {
    public enum State: String, Codable {
        case ok
        /// 403: the account has no "Việc cần làm"
        case noAccess
        /// Written at sign-out: no data, only the texts
        case loggedOut
    }

    public static let currentVersion = 2
    /// The most rows the file keeps (the medium widget shows 3)
    public static let maxRows = 8

    public var v: Int
    public var userId: Int
    public var outletId: Int
    /// Vietnam civil day (`YYYY-MM-DD`) the list belongs to
    public var date: String
    public var savedAt: Date
    public var state: State
    public var hideNames: Bool
    /// Hand-overs and returns already done today (`doneToday.pickups + doneToday.returns` of the API)
    public var done: Int
    public var counts: TodayWidgetCounts
    public var rows: [TodayWidgetRow]
    public var labels: TodayWidgetLabels

    public init(userId: Int, outletId: Int, date: String, savedAt: Date, state: State, hideNames: Bool, done: Int,
                counts: TodayWidgetCounts, rows: [TodayWidgetRow], labels: TodayWidgetLabels) {
        self.v = TodayWidgetSnapshot.currentVersion
        self.userId = userId
        self.outletId = outletId
        self.date = date
        self.savedAt = savedAt
        self.state = state
        self.hideNames = hideNames
        self.done = done
        self.counts = counts
        self.rows = Array(rows.prefix(TodayWidgetSnapshot.maxRows))
        self.labels = labels
    }

    /// Sign-out: nothing of the shop, only the texts, so the widget can say "Mở AnyRent để đăng nhập" in the app's language
    public static func loggedOut(labels: TodayWidgetLabels, now: Date = Date()) -> TodayWidgetSnapshot {
        TodayWidgetSnapshot(userId: 0, outletId: 0, date: TodayWidgetClock.dayKey(now), savedAt: now, state: .loggedOut,
                            hideNames: false, done: 0, counts: TodayWidgetCounts(late: 0, pickup: 0, returns: 0), rows: [],
                            labels: labels)
    }

    /// 403: the account has no "Việc cần làm"
    public static func noAccess(userId: Int, outletId: Int, labels: TodayWidgetLabels, now: Date = Date()) -> TodayWidgetSnapshot {
        TodayWidgetSnapshot(userId: userId, outletId: outletId, date: TodayWidgetClock.dayKey(now), savedAt: now,
                            state: .noAccess, hideNames: false, done: 0, counts: TodayWidgetCounts(late: 0, pickup: 0, returns: 0),
                            rows: [], labels: labels)
    }

    /// The list is only today's while its Vietnam day is the Vietnam day of `now` (never the UTC day)
    public func isFresh(now: Date) -> Bool {
        date == TodayWidgetClock.dayKey(now)
    }

    public static func encoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.sortedKeys]
        return encoder
    }

    public static func decoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}

/// Vietnam civil days (`Asia/Ho_Chi_Minh`, UTC+7, no daylight saving), whatever zone the phone is set to
public enum TodayWidgetClock {
    public static let timeZone = TimeZone(identifier: "Asia/Ho_Chi_Minh") ?? TimeZone(secondsFromGMT: 7 * 3600)!

    public static var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        return calendar
    }

    /// `YYYY-MM-DD` of the Vietnam day containing `date`
    public static func dayKey(_ date: Date) -> String {
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }

    /// The first instant of the next Vietnam day (17:00:00Z)
    public static func nextMidnight(after date: Date) -> Date {
        let calendar = self.calendar
        let start = calendar.startOfDay(for: date)
        return calendar.date(byAdding: .day, value: 1, to: start) ?? date.addingTimeInterval(24 * 3600)
    }

    /// "08:12" in Vietnam time
    public static func timeText(_ date: Date) -> String {
        let parts = calendar.dateComponents([.hour, .minute], from: date)
        return String(format: "%02d:%02d", parts.hour ?? 0, parts.minute ?? 0)
    }

    /// "14:00" in Vietnam time; empty at the Vietnam midnight (00:00 exactly), which is how an order that has only a day is stored
    public static func timeOfDayText(_ date: Date) -> String {
        let parts = calendar.dateComponents([.hour, .minute, .second], from: date)
        if parts.hour == 0, parts.minute == 0, (parts.second ?? 0) == 0 { return "" }
        return String(format: "%02d:%02d", parts.hour ?? 0, parts.minute ?? 0)
    }

    /// "31/10" in Vietnam time
    public static func dayMonthText(_ date: Date) -> String {
        let parts = calendar.dateComponents([.day, .month], from: date)
        return String(format: "%02d/%02d", parts.day ?? 0, parts.month ?? 0)
    }
}
