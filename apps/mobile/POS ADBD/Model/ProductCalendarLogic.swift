//
//  ProductCalendarLogic.swift
//  POS ADBD
//
//  #642 "Lịch trống" month screen of a product: pure helpers (month grid with Monday first, cell state, range rules,
//  lowest free count of a range, orders holding the product on a day). Days are Vietnam civil day keys `yyyy-MM-dd`.
//

import Foundation

/// Colour of a day cell
enum ProductCalendarTone: Equatable {
    /// available ≥ stock (green)
    case full
    /// 0 < available < stock (orange)
    case low
    /// available 0 (red)
    case out
    /// Before today: grey, no count
    case past
    /// Not answered yet
    case unknown
}

/// Place of a day in the chosen range
enum ProductCalendarSelection: Equatable {
    case none, start, end, between
}

/// First tap = start, second tap ≥ start = end; a tap before the start, or after a whole range, starts again
struct ProductCalendarRange: Equatable {
    var start: String?
    var end: String?

    static let empty = ProductCalendarRange()

    var isComplete: Bool { start != nil && end != nil }
}

enum ProductCalendarLogic {
    /// Blank cells before day 1 in a Monday-first week (1 Oct 2026 is a Thursday → 3)
    static func leadingBlanks(year: Int, month: Int) -> Int {
        let calendar = CalendarV2Logic.gregorian(TimeZone(identifier: "UTC")!)
        guard let first = calendar.date(from: DateComponents(year: year, month: month, day: 1)) else { return 0 }
        // weekday: 1 = Sunday … 7 = Saturday → Monday 0 … Sunday 6
        return (calendar.component(.weekday, from: first) + 5) % 7
    }

    /// The month's day keys with nil blanks before day 1 and after the last day (whole weeks)
    static func monthCells(year: Int, month: Int) -> [String?] {
        let leading = leadingBlanks(year: year, month: month)
        let count = CalendarV2Logic.daysInMonth(year: year, month: month)
        var cells: [String?] = Array(repeating: nil, count: leading)
        cells += (1...count).map { CalendarV2Logic.key(year: year, month: month, day: $0) }
        while cells.count % 7 != 0 { cells.append(nil) }
        return cells
    }

    /// First and last key of a month (the `from` / `to` of the availability call)
    static func monthBounds(year: Int, month: Int) -> (from: String, to: String) {
        (CalendarV2Logic.key(year: year, month: month, day: 1),
         CalendarV2Logic.key(year: year, month: month, day: CalendarV2Logic.daysInMonth(year: year, month: month)))
    }

    /// Keys compare as strings because they are zero-padded `yyyy-MM-dd`
    static func isPast(_ key: String, todayKey: String) -> Bool { key < todayKey }

    static func tone(available: Int?, stock: Int, isPast: Bool) -> ProductCalendarTone {
        if isPast { return .past }
        guard let available else { return .unknown }
        if available <= 0 { return .out }
        return available >= stock ? .full : .low
    }

    /// Range after a tap; past days cannot be picked (the range stays as it was)
    static func tap(_ key: String, range: ProductCalendarRange, todayKey: String) -> ProductCalendarRange {
        guard !isPast(key, todayKey: todayKey) else { return range }
        guard let start = range.start, range.end == nil, key >= start else {
            return ProductCalendarRange(start: key, end: nil)
        }
        return ProductCalendarRange(start: start, end: key)
    }

    static func selection(_ key: String, range: ProductCalendarRange) -> ProductCalendarSelection {
        guard let start = range.start else { return .none }
        if key == start { return .start }
        guard let end = range.end else { return .none }
        if key == end { return .end }
        return key > start && key < end ? .between : .none
    }

    /// Every key from start to end inclusive; empty until the range is complete
    static func keys(in range: ProductCalendarRange) -> [String] {
        guard let start = range.start, let end = range.end, end >= start else { return [] }
        let count = CalendarV2Logic.days(from: start, to: end)
        return (0...count).map { CalendarV2Logic.shift(start, days: $0) }
    }

    /// Inclusive day count of a complete range (a same-day range is 1)
    static func dayCount(_ range: ProductCalendarRange) -> Int { keys(in: range).count }

    /// Keys of the range whose free count is not loaded yet
    static func missingKeys(_ range: ProductCalendarRange, available: [String: Int]) -> [String] {
        keys(in: range).filter { available[$0] == nil }
    }

    /// Lowest free count over the range; nil until the range is complete and every day is loaded
    static func minAvailable(_ range: ProductCalendarRange, available: [String: Int]) -> Int? {
        let keys = keys(in: range)
        guard !keys.isEmpty else { return nil }
        var lowest = Int.max
        for key in keys {
            guard let value = available[key] else { return nil }
            lowest = min(lowest, max(0, value))
        }
        return lowest
    }

    /// "Thêm vào giỏ với ngày này": a complete range with at least one free unit each day, or the shop allows
    /// overlapping orders
    static func canAdd(range: ProductCalendarRange, minAvailable: Int?, overlapAllowed: Bool) -> Bool {
        guard range.isComplete, let minAvailable else { return false }
        return minAvailable > 0 || overlapAllowed
    }

    /// The previous-month arrow stops at the current month
    static func canGoBack(year: Int, month: Int, todayKey: String) -> Bool {
        guard let today = CalendarV2Logic.parts(of: todayKey) else { return true }
        return (year, month) > (today.year, today.month)
    }

    /// Units of this product in the order
    static func quantity(_ order: Order, productId: Int) -> Int {
        order.orderItems.filter { $0.productId == productId }.reduce(0) { $0 + $1.quantity }
    }

    /// Open rentals (RESERVED / PICKUPED) whose days from pickup to return (inclusive, shop days) cover `key`,
    /// by pickup day. A same-day pickup and return covers that day.
    static func orders(_ orders: [Order], covering key: String, timeZone: TimeZone = Date.shopTimeZone) -> [Order] {
        var seen = Set<Int>()
        return orders
            .filter { $0.status == .reserved || $0.status == .pickuped }
            .filter { seen.insert($0.id).inserted }
            .filter { order in
                guard let pickup = order.pickupPlanAt ?? order.returnPlanAt else { return false }
                let from = DayFormatter.key(pickup, timeZone: timeZone)
                let to = DayFormatter.key(order.returnPlanAt ?? pickup, timeZone: timeZone)
                return from <= key && key <= max(from, to)
            }
            .sorted { ($0.pickupPlanAt ?? .distantPast) < ($1.pickupPlanAt ?? .distantPast) }
    }

    /// Instant of a key's shop day midnight (for labels and the cart's pickup / return)
    static func date(of key: String, timeZone: TimeZone = Date.shopTimeZone) -> Date? {
        guard let p = CalendarV2Logic.parts(of: key) else { return nil }
        return CalendarV2Logic.gregorian(timeZone).date(from: DateComponents(year: p.year, month: p.month, day: p.day))
    }

    /// The cart's pickup (first second of the start day) and return (last second of the end day)
    static func cartBounds(_ range: ProductCalendarRange, timeZone: TimeZone = Date.shopTimeZone) -> (pickup: Date, return: Date)? {
        guard let start = range.start, let end = range.end,
              let first = date(of: start, timeZone: timeZone), let last = date(of: end, timeZone: timeZone) else { return nil }
        let calendar = CalendarV2Logic.gregorian(timeZone)
        let returnAt = calendar.date(byAdding: DateComponents(day: 1, second: -1), to: last) ?? last
        return (first, returnAt)
    }
}
