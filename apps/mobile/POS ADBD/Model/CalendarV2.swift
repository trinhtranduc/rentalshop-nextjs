//
//  CalendarV2.swift
//  POS ADBD
//
//  Redesigned calendar (#374): month marks from GET /api/calendar/orders/count (`byDate`, `lateReturns`) and the
//  day list from GET /api/calendar/orders/by-date. Days are `yyyy-MM-dd` keys in the device time zone.
//

import Foundation

// MARK: - API models

/// Hand-overs (RESERVED by pickup plan) and returns (PICKUPED by return plan) of one day
struct CalendarDayCount: Equatable {
    let pickups: Int
    let returns: Int
}

/// `data` of GET /api/calendar/orders/count?month&year&timeZone
struct CalendarMonthCounts: Decodable, Equatable {
    let byDate: [String: CalendarDayCount]
    let lateReturns: Int

    enum CodingKeys: String, CodingKey { case byDate, lateReturns }

    private struct RawDay: Decodable {
        let pickups: Int?
        let returns: Int?
    }

    init(byDate: [String: CalendarDayCount], lateReturns: Int) {
        self.byDate = byDate
        self.lateReturns = lateReturns
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let raw = ((try? c.decodeIfPresent([String: RawDay].self, forKey: .byDate)) ?? nil) ?? [:]
        byDate = raw.mapValues { CalendarDayCount(pickups: $0.pickups ?? 0, returns: $0.returns ?? 0) }
        lateReturns = ((try? c.decodeIfPresent(Int.self, forKey: .lateReturns)) ?? nil) ?? 0
    }
}

struct CalendarMonthCountsResponse: Decodable {
    let success: Bool
    let code: String?
    let message: String?
    let error: String?
    let data: CalendarMonthCounts?
}

/// One order of GET /api/calendar/orders/by-date
struct CalendarDayOrder: Decodable, Equatable {
    struct Item: Decodable, Equatable {
        let productName: String?
        let quantity: Int?
    }

    let id: Int
    let orderNumber: String
    let customerName: String?
    let status: String?
    let orderType: String?
    let totalAmount: Double
    let orderItems: [Item]
    /// Balances and the stored late fee (#389); nil on an older API
    let amountDue: Double?
    let refundDue: Double?
    let lateFee: Double?

    enum CodingKeys: String, CodingKey {
        case id, orderNumber, customerName, status, orderType, totalAmount, orderItems, amountDue, refundDue, lateFee
    }

    init(id: Int, orderNumber: String, customerName: String?, status: String?, orderType: String?,
         totalAmount: Double, orderItems: [Item], amountDue: Double? = nil, refundDue: Double? = nil,
         lateFee: Double? = nil) {
        self.amountDue = amountDue
        self.refundDue = refundDue
        self.lateFee = lateFee
        self.id = id
        self.orderNumber = orderNumber
        self.customerName = customerName
        self.status = status
        self.orderType = orderType
        self.totalAmount = totalAmount
        self.orderItems = orderItems
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        orderNumber = ((try? c.decodeIfPresent(String.self, forKey: .orderNumber)) ?? nil) ?? ""
        customerName = (try? c.decodeIfPresent(String.self, forKey: .customerName)) ?? nil
        status = (try? c.decodeIfPresent(String.self, forKey: .status)) ?? nil
        orderType = (try? c.decodeIfPresent(String.self, forKey: .orderType)) ?? nil
        totalAmount = ((try? c.decodeIfPresent(Double.self, forKey: .totalAmount)) ?? nil) ?? 0
        orderItems = ((try? c.decodeIfPresent([Item].self, forKey: .orderItems)) ?? nil) ?? []
        amountDue = (try? c.decodeIfPresent(Double.self, forKey: .amountDue)) ?? nil
        refundDue = (try? c.decodeIfPresent(Double.self, forKey: .refundDue)) ?? nil
        lateFee = (try? c.decodeIfPresent(Double.self, forKey: .lateFee)) ?? nil
    }

    /// "Áo dài ×2, Cà vạt lụa"
    var itemsSummary: String {
        orderItems.compactMap { item -> String? in
            guard let name = item.productName, !name.isEmpty else { return nil }
            let quantity = item.quantity ?? 1
            return quantity > 1 ? "\(name) ×\(quantity)" : name
        }.joined(separator: ", ")
    }
}

struct CalendarDayOrdersResponse: Decodable {
    struct DataBody: Decodable {
        let orders: [CalendarDayOrder]

        enum CodingKeys: String, CodingKey { case orders }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            orders = ((try? c.decodeIfPresent([CalendarDayOrder].self, forKey: .orders)) ?? nil) ?? []
        }
    }

    let success: Bool
    let code: String?
    let message: String?
    let error: String?
    let data: DataBody?
}

// MARK: - Pure logic (unit tested)

/// Marks of one day cell
struct CalendarDayMarks: Equatable {
    var handOver = false
    var returning = false
    var lateReturn = false

    static let none = CalendarDayMarks()
}

struct CalendarCell: Equatable {
    let key: String
    let day: Int
    let inMonth: Bool
    let isToday: Bool
}

enum CalendarRowKind: Equatable {
    case handOver, takeBack
}

/// Note under a day row's total (board Lich, #390)
enum CalendarNote: Equatable {
    /// "Trễ N ngày", plus " · phí X" when a fee is stored
    case late(days: Int, fee: Double?)
    case refund(Double)
    case due(Double)
    case none
}

struct CalendarDayRow: Equatable {
    let kind: CalendarRowKind
    let order: CalendarDayOrder
    /// Days past the planned day (0 for today or later)
    let lateDays: Int
}

enum CalendarV2Logic {
    static func gregorian(_ timeZone: TimeZone = .current) -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        return calendar
    }

    /// `yyyy-MM-dd`
    static func key(year: Int, month: Int, day: Int) -> String {
        String(format: "%04d-%02d-%02d", year, month, day)
    }

    /// (year, month, day) of a key; nil when it is not `yyyy-MM-dd`
    static func parts(of key: String) -> (year: Int, month: Int, day: Int)? {
        let pieces = key.split(separator: "-").compactMap { Int($0) }
        guard pieces.count == 3 else { return nil }
        return (pieces[0], pieces[1], pieces[2])
    }

    /// Number of days in a month (no time zone involved)
    static func daysInMonth(year: Int, month: Int) -> Int {
        let calendar = gregorian(TimeZone(identifier: "UTC")!)
        let date = calendar.date(from: DateComponents(year: year, month: month, day: 1))!
        return calendar.range(of: .day, in: .month, for: date)?.count ?? 30
    }

    /// Key `days` after `key` (negative goes back), on the civil calendar
    static func shift(_ key: String, days: Int) -> String {
        guard let p = parts(of: key) else { return key }
        let calendar = gregorian(TimeZone(identifier: "UTC")!)
        let date = calendar.date(from: DateComponents(year: p.year, month: p.month, day: p.day))!
        let moved = calendar.date(byAdding: .day, value: days, to: date)!
        let c = calendar.dateComponents([.year, .month, .day], from: moved)
        return CalendarV2Logic.key(year: c.year!, month: c.month!, day: c.day!)
    }

    /// Whole days from `from` to `to` (both keys)
    static func days(from: String, to: String) -> Int {
        guard let a = parts(of: from), let b = parts(of: to) else { return 0 }
        let calendar = gregorian(TimeZone(identifier: "UTC")!)
        let d1 = calendar.date(from: DateComponents(year: a.year, month: a.month, day: a.day))!
        let d2 = calendar.date(from: DateComponents(year: b.year, month: b.month, day: b.day))!
        return calendar.dateComponents([.day], from: d1, to: d2).day ?? 0
    }

    /// Month grid, weeks starting on Monday, whole weeks only (35 or 42 cells, 28 for a February that fits)
    static func monthGrid(year: Int, month: Int, todayKey: String) -> [CalendarCell] {
        let first = key(year: year, month: month, day: 1)
        let calendar = gregorian(TimeZone(identifier: "UTC")!)
        let firstDate = calendar.date(from: DateComponents(year: year, month: month, day: 1))!
        // weekday: 1 = Sunday … 7 = Saturday → Monday-first offset 0…6
        let weekday = calendar.component(.weekday, from: firstDate)
        let leading = (weekday + 5) % 7
        let count = daysInMonth(year: year, month: month)
        let total = Int((Double(leading + count) / 7).rounded(.up)) * 7

        return (0..<total).map { index in
            let cellKey = shift(first, days: index - leading)
            let p = parts(of: cellKey)!
            let inMonth = p.year == year && p.month == month
            return CalendarCell(key: cellKey, day: p.day, inMonth: inMonth, isToday: cellKey == todayKey)
        }
    }

    /// Dot for hand-overs; ring for returns due today or later; red square for returns due before today
    /// (those rentals are still out, so they are late)
    static func marks(for key: String, counts: CalendarMonthCounts?, todayKey: String) -> CalendarDayMarks {
        guard let day = counts?.byDate[key] else { return .none }
        let isPast = key < todayKey
        return CalendarDayMarks(handOver: day.pickups > 0,
                                returning: day.returns > 0 && !isPast,
                                lateReturn: day.returns > 0 && isPast)
    }

    /// Days a hand-over or return planned on `dayKey` is late on `todayKey`
    static func lateDays(dayKey: String, todayKey: String) -> Int {
        max(0, days(from: dayKey, to: todayKey))
    }

    /// Hand-overs first, then returns, in the API order
    static func rows(dayKey: String, todayKey: String, pickups: [CalendarDayOrder],
                     returns: [CalendarDayOrder]) -> [CalendarDayRow] {
        let late = lateDays(dayKey: dayKey, todayKey: todayKey)
        return pickups.map { CalendarDayRow(kind: .handOver, order: $0, lateDays: late) }
            + returns.map { CalendarDayRow(kind: .takeBack, order: $0, lateDays: late) }
    }

    /// Late days first (with the fee), then what to give back, then what is still to collect; else nothing.
    /// With money hidden only the late days show.
    static func note(_ row: CalendarDayRow, hidesMoney: Bool) -> CalendarNote {
        if row.lateDays > 0 {
            let fee = row.order.lateFee.flatMap { $0 > 0 && !hidesMoney ? $0 : nil }
            return .late(days: row.lateDays, fee: fee)
        }
        guard !hidesMoney else { return .none }
        if let refund = row.order.refundDue, refund > 0 { return .refund(refund) }
        if let due = row.order.amountDue, due > 0 { return .due(due) }
        return .none
    }

    /// Day selected when a month opens: today in its own month, else the first day
    static func defaultSelection(year: Int, month: Int, todayKey: String) -> String {
        if let t = parts(of: todayKey), t.year == year, t.month == month { return todayKey }
        return CalendarV2Logic.key(year: year, month: month, day: 1)
    }

    /// (year, month) moved by `delta` months
    static func addMonths(year: Int, month: Int, delta: Int) -> (year: Int, month: Int) {
        let index = year * 12 + (month - 1) + delta
        return (index / 12, index % 12 + 1)
    }

    /// Right side of the day header: "2 trễ · giao 3 · trả 2" ("N trễ" on today only)
    static func headerSummary(isToday: Bool, lateReturns: Int, pickups: Int, returns: Int)
        -> (late: String?, rest: String) {
        let late = isToday && lateReturns > 0 ? String(format: "calendar.v2.lateCount".localized(), lateReturns) : nil
        let rest = String(format: "calendar.v2.dayCounts".localized(), pickups, returns)
        return (late, rest)
    }
}
