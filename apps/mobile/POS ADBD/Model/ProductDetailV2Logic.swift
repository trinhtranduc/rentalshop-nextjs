//
//  ProductDetailV2Logic.swift
//  POS ADBD
//
//  Phase 7 (#388): pure helpers of the product detail strip and order chips (board SP-chi-tiet), the overview
//  "Trễ hạn" list, and the English plural of "N days late".
//

import Foundation

/// One cell of the 7-day free strip
struct FreeStripDay: Equatable {
    enum Tone: Equatable { case none, low, ok }
    let key: String
    /// "03"
    let day: String
    let free: Int
    let isToday: Bool

    /// 0 red, 1 orange, 2 or more green
    var tone: Tone { free <= 0 ? .none : (free == 1 ? .low : .ok) }
}

/// "Sắp tới / Đang thuê / Đã xong"
enum ProductOrdersChip: Int, CaseIterable {
    case upcoming, renting, done

    /// One `GET /api/orders?status=` call per status; cancelled orders are in no chip
    var statuses: [OrderStatus] {
        switch self {
        case .upcoming: return [.reserved]
        case .renting: return [.pickuped]
        case .done: return [.returned, .completed]
        }
    }

    var sortBy: String {
        switch self {
        case .upcoming: return "pickupPlanAt"
        case .renting: return "returnPlanAt"
        case .done: return "createdAt"
        }
    }

    var sortOrder: String { self == .done ? "desc" : "asc" }

    var titleKey: String {
        switch self {
        case .upcoming: return "products.detail.chip.upcoming"
        case .renting: return "products.detail.chip.renting"
        case .done: return "products.detail.chip.done"
        }
    }
}

/// Right-hand text of a product order row
enum ProductOrderRowState: Equatable {
    case pickupToday
    case pickupOn(String)
    case late(Int)
    case returnToday
    case returnOn(String)
    /// Đã xong: the status pill
    case status
}

enum ProductDetailV2Logic {
    static let stripLength = 7

    /// `count` day keys from `todayKey` (pure calendar arithmetic on the key, no time zone)
    static func weekKeys(from todayKey: String, count: Int = stripLength) -> [String] {
        guard let p = CalendarV2Logic.parts(of: todayKey) else { return [] }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        guard let start = calendar.date(from: DateComponents(year: p.year, month: p.month, day: p.day)) else { return [] }
        return (0..<count).compactMap { offset in
            guard let date = calendar.date(byAdding: .day, value: offset, to: start) else { return nil }
            return DayFormatter.key(date, timeZone: calendar.timeZone)
        }
    }

    /// Cells for the strip; a day missing from the answer counts as 0 free
    static func strip(todayKey: String, available: [String: Int]) -> [FreeStripDay] {
        weekKeys(from: todayKey).map { key in
            FreeStripDay(key: key, day: String(key.suffix(2)), free: max(0, available[key] ?? 0), isToday: key == todayKey)
        }
    }

    /// Đã xong = RETURNED + COMPLETED, newest first, at most `limit`
    static func mergeDone(_ lists: [[Order]], limit: Int = 20) -> [Order] {
        var seen = Set<Int>()
        return lists.flatMap { $0 }
            .filter { seen.insert($0.id).inserted }
            .sorted { $0.createdAt > $1.createdAt }
            .prefix(limit)
            .map { $0 }
    }

    /// Units of `productId` in the order (1 when the row carries no items)
    static func quantity(of productId: Int, in order: Order) -> Int {
        let total = order.orderItems.filter { $0.productId == productId }.reduce(0) { $0 + $1.quantity }
        return total > 0 ? total : 1
    }

    /// "03/10"
    static func dayMonth(_ date: Date, timeZone: TimeZone = .current) -> String {
        let key = DayFormatter.key(date, timeZone: timeZone)
        guard let p = CalendarV2Logic.parts(of: key) else { return "" }
        return String(format: "%02d/%02d", p.day, p.month)
    }

    /// "03/10 → 05/10 · × 1 · #0057"; a sale (or a rent without plan dates) shows its created day
    static func meta(_ order: Order, productId: Int, timeZone: TimeZone = .current) -> String {
        let dates: String
        if order.orderType == .rent, let pickup = order.pickupPlanAt, let ret = order.returnPlanAt {
            dates = dayMonth(pickup, timeZone: timeZone) + " → " + dayMonth(ret, timeZone: timeZone)
        } else {
            dates = dayMonth(order.createdAt, timeZone: timeZone)
        }
        return "\(dates) · × \(quantity(of: productId, in: order)) · #\(order.orderNumber)"
    }

    static func rowState(_ order: Order, chip: ProductOrdersChip, now: Date = Date(), timeZone: TimeZone = .current) -> ProductOrderRowState {
        let todayKey = DayFormatter.key(now, timeZone: timeZone)
        switch chip {
        case .upcoming:
            guard let pickup = order.pickupPlanAt else { return .status }
            return DayFormatter.key(pickup, timeZone: timeZone) == todayKey ? .pickupToday : .pickupOn(dayMonth(pickup, timeZone: timeZone))
        case .renting:
            guard let ret = order.returnPlanAt else { return .status }
            let late = OrdersHomeLogic.lateDays(orderType: order.orderType, status: order.status, pickupPlanAt: order.pickupPlanAt,
                                                returnPlanAt: ret, now: now, timeZone: timeZone)
            if late > 0 { return .late(late) }
            return DayFormatter.key(ret, timeZone: timeZone) == todayKey ? .returnToday : .returnOn(dayMonth(ret, timeZone: timeZone))
        case .done:
            return .status
        }
    }
}

/// Overview "Trễ hạn" list: PICKUPED rent orders sorted by return day ascending, cut at the first one not late
enum OverviewLateFilter {
    /// The late rows of a page and whether the next page can still hold late rows
    static func page(_ orders: [Order], hasMore: Bool, now: Date = Date(), timeZone: TimeZone = .current) -> (orders: [Order], hasMore: Bool) {
        let late = orders.prefix { order in
            OrdersHomeLogic.lateDays(orderType: order.orderType, status: order.status, pickupPlanAt: order.pickupPlanAt,
                                     returnPlanAt: order.returnPlanAt, now: now, timeZone: timeZone) > 0
        }
        return (Array(late), hasMore && late.count == orders.count)
    }
}

/// "1 day late" / "N days late" (Vietnamese "Trễ N ngày" for both keys)
enum LateText {
    static func key(_ days: Int) -> String { days == 1 ? "Late 1 day" : "Late %d days" }
    static func returnedKey(_ days: Int) -> String { days == 1 ? "Returned 1 day late" : "Returned %d days late" }

    static func days(_ days: Int) -> String {
        days == 1 ? key(1).localized() : String(format: key(days).localized(), days)
    }

    static func returned(_ days: Int) -> String {
        days == 1 ? returnedKey(1).localized() : String(format: returnedKey(days).localized(), days)
    }
}
