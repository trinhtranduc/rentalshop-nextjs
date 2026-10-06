//
//  OverviewV2.swift
//  POS ADBD
//
//  Redesigned overview (#374): period presets in the device time zone, GET /api/analytics/period, and the
//  "now" figures of GET /api/analytics/outlet-operations (`overdueReturns.count`, `cash.depositsHeld`).
//  #492: `revenue.collectedBreakdown` and `growth.orderValue` (optional, newer API).
//

import Foundation

// MARK: - Periods

enum OverviewPreset: CaseIterable, Equatable {
    case today, yesterday, last7, last30, thisMonth, lastMonth

    var title: String {
        switch self {
        case .today: return "overview.v2.period.today".localized()
        case .yesterday: return "overview.v2.period.yesterday".localized()
        case .last7: return "overview.v2.period.last7".localized()
        case .last30: return "overview.v2.period.last30".localized()
        case .thisMonth: return "overview.v2.period.thisMonth".localized()
        case .lastMonth: return "overview.v2.period.lastMonth".localized()
        }
    }
}

/// Inclusive range of `yyyy-MM-dd` keys
struct DayKeyRange: Equatable {
    let start: String
    let end: String

    var dayCount: Int { CalendarV2Logic.days(from: start, to: end) + 1 }
}

enum OverviewPeriod: Equatable {
    case preset(OverviewPreset)
    case custom(DayKeyRange)
}

enum OverviewLogic {
    /// Ranges longer than this are charted per month (same rule as the API)
    static let maxDailyBars = 45

    /// Range of a preset, `todayKey` being today in the device time zone
    static func range(of preset: OverviewPreset, todayKey: String) -> DayKeyRange {
        let t = CalendarV2Logic.parts(of: todayKey)!
        switch preset {
        case .today:
            return DayKeyRange(start: todayKey, end: todayKey)
        case .yesterday:
            let y = CalendarV2Logic.shift(todayKey, days: -1)
            return DayKeyRange(start: y, end: y)
        case .last7:
            return DayKeyRange(start: CalendarV2Logic.shift(todayKey, days: -6), end: todayKey)
        case .last30:
            return DayKeyRange(start: CalendarV2Logic.shift(todayKey, days: -29), end: todayKey)
        case .thisMonth:
            return DayKeyRange(start: CalendarV2Logic.key(year: t.year, month: t.month, day: 1), end: todayKey)
        case .lastMonth:
            let p = CalendarV2Logic.addMonths(year: t.year, month: t.month, delta: -1)
            return DayKeyRange(start: CalendarV2Logic.key(year: p.year, month: p.month, day: 1),
                               end: CalendarV2Logic.key(year: p.year, month: p.month,
                                                        day: CalendarV2Logic.daysInMonth(year: p.year, month: p.month)))
        }
    }

    static func range(of period: OverviewPeriod, todayKey: String) -> DayKeyRange {
        switch period {
        case .preset(let preset): return range(of: preset, todayKey: todayKey)
        case .custom(let range): return range
        }
    }

    /// Same number of days right before the start
    static func previous(_ range: DayKeyRange) -> DayKeyRange {
        let end = CalendarV2Logic.shift(range.start, days: -1)
        return DayKeyRange(start: CalendarV2Logic.shift(end, days: -(range.dayCount - 1)), end: end)
    }

    static func groupBy(_ range: DayKeyRange) -> String {
        range.dayCount <= maxDailyBars ? "day" : "month"
    }

    /// "03/10" from a key
    static func dayMonth(_ key: String) -> String {
        guard let p = CalendarV2Logic.parts(of: key) else { return key }
        return String(format: "%02d/%02d", p.day, p.month)
    }

    /// "27/09 – 03/10", or one day "03/10"
    static func shortRange(_ range: DayKeyRange) -> String {
        range.start == range.end ? dayMonth(range.start) : "\(dayMonth(range.start)) – \(dayMonth(range.end))"
    }

    /// Noon of a key in `timeZone`, for weekday labels
    static func date(of key: String, timeZone: TimeZone = .current) -> Date? {
        guard let p = CalendarV2Logic.parts(of: key) else { return nil }
        return CalendarV2Logic.gregorian(timeZone).date(from: DateComponents(year: p.year, month: p.month, day: p.day, hour: 12))
    }

    /// "CN 27/09 – T7 03/10" (one day: "T7 03/10")
    static func longRange(_ range: DayKeyRange, timeZone: TimeZone = .current, locale: Locale = .current) -> String {
        func label(_ key: String) -> String {
            guard let date = date(of: key, timeZone: timeZone) else { return key }
            return DayFormatter.short(date, timeZone: timeZone, locale: locale)
        }
        return range.start == range.end ? label(range.start) : "\(label(range.start)) – \(label(range.end))"
    }

    /// Bars of the chart: one per day of the range (missing days are 0) or, per month, the API points as sent.
    /// `.orders` plots `newOrderCount` (0 when an older API leaves it out, #484)
    static func bars(report: OverviewReport, range: DayKeyRange, timeZone: TimeZone = .current,
                     locale: Locale = .current, mode: OverviewChartMode = .money) -> [OverviewBar] {
        func value(_ point: OverviewReport.Point) -> Double {
            switch mode {
            case .money: return point.realIncome
            case .orders: return Double(point.newOrderCount ?? 0)
            }
        }
        if groupBy(range) == "month" {
            return report.series.map { OverviewBar(key: $0.monthLabel ?? "", label: $0.monthLabel ?? "", value: value($0)) }
        }
        var byKey: [String: Double] = [:]
        for point in report.series {
            if let key = point.dayKey { byKey[key, default: 0] += value(point) }
        }
        return (0..<range.dayCount).map { offset in
            let key = CalendarV2Logic.shift(range.start, days: offset)
            let label: String
            if range.dayCount <= 7, let date = date(of: key, timeZone: timeZone) {
                label = String(DayFormatter.short(date, timeZone: timeZone, locale: locale).split(separator: " ").first ?? "")
            } else {
                label = dayMonth(key)
            }
            return OverviewBar(key: key, label: label, value: byKey[key] ?? 0)
        }
    }

    /// Bar heights from 0 to 1 against the highest bar; a loss (refunds) draws as 0
    static func barRatios(_ bars: [OverviewBar]) -> [Double] {
        let top = bars.map { max(0, $0.value) }.max() ?? 0
        guard top > 0 else { return bars.map { _ in 0 } }
        return bars.map { max(0, $0.value) / top }
    }

    /// "▲ 8%" / "▼ 12,5%" / "0%"
    static func changeText(_ growth: Double) -> String {
        let rounded = (growth * 10).rounded() / 10
        let magnitude = abs(rounded)
        let number = magnitude == magnitude.rounded() ? String(Int(magnitude)) : String(format: "%.1f", magnitude).replacingOccurrences(of: ".", with: ",")
        if rounded > 0 { return "▲ \(number)%" }
        if rounded < 0 { return "▼ \(number)%" }
        return "0%"
    }

    /// What the role can see (API rules: period needs `analytics.view.revenue`, outlet-operations
    /// `analytics.view.dashboard`, `cash` again revenue)
    static func showsRevenue(permissions: [String]) -> Bool {
        permissions.contains("analytics.view.revenue") || permissions.contains("analytics.view")
    }

    static func showsOperations(permissions: [String]) -> Bool {
        permissions.contains("analytics.view.dashboard") || permissions.contains("analytics.view")
    }
}

/// What the overview bars plot (#484): money collected or orders created per day / month
enum OverviewChartMode: Equatable {
    case money, orders
}

struct OverviewBar: Equatable {
    let key: String
    let label: String
    let value: Double
}

// MARK: - API models

/// `data` of GET /api/analytics/period (only what the overview shows)
struct OverviewReport: Decodable, Equatable {
    struct Point: Decodable, Equatable {
        /// `yyyy-MM-dd` (the API sends `yyyy/MM/dd` in `date`)
        let dayKey: String?
        /// "10/26" for monthly points
        let monthLabel: String?
        let realIncome: Double
        /// Orders created that day / month (#484); nil on an older API
        let newOrderCount: Int?

        enum CodingKeys: String, CodingKey { case date, month, realIncome, collected, monthNumber, newOrderCount }

        init(dayKey: String?, monthLabel: String?, realIncome: Double, newOrderCount: Int? = nil) {
            self.dayKey = dayKey
            self.monthLabel = monthLabel
            self.realIncome = realIncome
            self.newOrderCount = newOrderCount
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            let date = (try? c.decodeIfPresent(String.self, forKey: .date)) ?? nil
            dayKey = date.map { String($0.prefix(10)).replacingOccurrences(of: "/", with: "-") }
            let isMonthly = ((try? c.decodeIfPresent(Int.self, forKey: .monthNumber)) ?? nil) != nil
            monthLabel = isMonthly || date == nil ? ((try? c.decodeIfPresent(String.self, forKey: .month)) ?? nil) : nil
            // `collected` leaves collateral out (#484); an older API only sends `realIncome`
            realIncome = ((try? c.decodeIfPresent(Double.self, forKey: .collected)) ?? nil)
                ?? ((try? c.decodeIfPresent(Double.self, forKey: .realIncome)) ?? nil) ?? 0
            newOrderCount = (try? c.decodeIfPresent(Int.self, forKey: .newOrderCount)) ?? nil
        }
    }

    struct TopProduct: Decodable, Equatable {
        let id: Int?
        let name: String
        let rentalCount: Int
        let totalRevenue: Double
        let image: String?

        enum CodingKeys: String, CodingKey { case id, name, rentalCount, totalRevenue, image }

        init(id: Int?, name: String, rentalCount: Int, totalRevenue: Double, image: String?) {
            self.id = id
            self.name = name
            self.rentalCount = rentalCount
            self.totalRevenue = totalRevenue
            self.image = image
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = (try? c.decodeIfPresent(Int.self, forKey: .id)) ?? nil
            name = ((try? c.decodeIfPresent(String.self, forKey: .name)) ?? nil) ?? ""
            rentalCount = ((try? c.decodeIfPresent(Int.self, forKey: .rentalCount)) ?? nil) ?? 0
            totalRevenue = ((try? c.decodeIfPresent(Double.self, forKey: .totalRevenue)) ?? nil) ?? 0
            image = (try? c.decodeIfPresent(String.self, forKey: .image)) ?? nil
        }
    }

    /// Parts of `revenue.collected` (#492): deposits + pickupAndSale + fees − refunds = collected
    struct CollectedBreakdown: Decodable, Equatable {
        /// Deposits paid when booking
        let deposits: Double
        /// Paid at hand-over and sales
        let pickupAndSale: Double
        /// Damage and late fees
        let fees: Double
        /// Refunds of cancelled orders (a positive amount, subtracted)
        let refunds: Double

        var total: Double { deposits + pickupAndSale + fees - refunds }

        enum CodingKeys: String, CodingKey { case deposits, pickupAndSale, fees, refunds }

        init(deposits: Double, pickupAndSale: Double, fees: Double, refunds: Double) {
            self.deposits = deposits
            self.pickupAndSale = pickupAndSale
            self.fees = fees
            self.refunds = refunds
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            let amount: (CodingKeys) -> Double = { key in ((try? c.decodeIfPresent(Double.self, forKey: key)) ?? nil) ?? 0 }
            deposits = amount(.deposits)
            pickupAndSale = amount(.pickupAndSale)
            fees = amount(.fees)
            refunds = amount(.refunds)
        }
    }

    /// Money collected in the period without collateral (`revenue.collected`, #484), else `totalActualRevenue`, else `totalRevenue`
    let netRevenue: Double
    /// Total of the orders created in the period, cancelled left out (`revenue.totalOrderValue`, #484); nil on an older API
    let totalOrderValue: Double?
    /// Part of those orders not collected yet (`revenue.outstanding`, #484); nil on an older API
    let outstanding: Double?
    /// Parts of `netRevenue` (`revenue.collectedBreakdown`, #492); nil on an older API
    let collectedBreakdown: CollectedBreakdown?
    /// % change of revenue against the previous period of the same length
    let revenueGrowth: Double?
    /// % change of the new orders' value against the previous period (`growth.orderValue.growth`, #492); nil on an older API
    let orderValueGrowth: Double?
    /// Orders created in the period (`operational.orderCounts.new`)
    let newOrders: Int?
    let series: [Point]
    let topProducts: [TopProduct]

    private enum CodingKeys: String, CodingKey { case revenue, growth, operational, series, topProducts }
    private enum RevenueKeys: String, CodingKey { case collected, totalActualRevenue, totalRevenue, totalOrderValue, outstanding,
                                                         collectedBreakdown }
    private enum GrowthKeys: String, CodingKey { case collected, revenue, orderValue }
    private enum ChangeKeys: String, CodingKey { case growth }
    private enum OperationalKeys: String, CodingKey { case orderCounts }
    private enum CountKeys: String, CodingKey { case new }

    init(netRevenue: Double, revenueGrowth: Double?, newOrders: Int?, series: [Point], topProducts: [TopProduct],
         totalOrderValue: Double? = nil, outstanding: Double? = nil,
         collectedBreakdown: CollectedBreakdown? = nil, orderValueGrowth: Double? = nil) {
        self.orderValueGrowth = orderValueGrowth
        self.netRevenue = netRevenue
        self.collectedBreakdown = collectedBreakdown
        self.totalOrderValue = totalOrderValue
        self.outstanding = outstanding
        self.revenueGrowth = revenueGrowth
        self.newOrders = newOrders
        self.series = series
        self.topProducts = topProducts
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let revenue = try? c.nestedContainer(keyedBy: RevenueKeys.self, forKey: .revenue) {
            let amount: (RevenueKeys) -> Double? = { key in (try? revenue.decodeIfPresent(Double.self, forKey: key)) ?? nil }
            netRevenue = amount(.collected) ?? amount(.totalActualRevenue) ?? amount(.totalRevenue) ?? 0
            totalOrderValue = (try? revenue.decodeIfPresent(Double.self, forKey: .totalOrderValue)) ?? nil
            outstanding = (try? revenue.decodeIfPresent(Double.self, forKey: .outstanding)) ?? nil
            collectedBreakdown = (try? revenue.decodeIfPresent(CollectedBreakdown.self, forKey: .collectedBreakdown)) ?? nil
        } else {
            netRevenue = 0
            totalOrderValue = nil
            outstanding = nil
            collectedBreakdown = nil
        }
        let growthGroup = try? c.nestedContainer(keyedBy: GrowthKeys.self, forKey: .growth)
        if let growthGroup, let orderValue = try? growthGroup.nestedContainer(keyedBy: ChangeKeys.self, forKey: .orderValue) {
            orderValueGrowth = (try? orderValue.decodeIfPresent(Double.self, forKey: .growth)) ?? nil
        } else {
            orderValueGrowth = nil
        }
        if let growth = growthGroup,
           let change = (try? growth.nestedContainer(keyedBy: ChangeKeys.self, forKey: .collected))
            ?? (try? growth.nestedContainer(keyedBy: ChangeKeys.self, forKey: .revenue)) {
            revenueGrowth = (try? change.decodeIfPresent(Double.self, forKey: .growth)) ?? nil
        } else {
            revenueGrowth = nil
        }
        if let operational = try? c.nestedContainer(keyedBy: OperationalKeys.self, forKey: .operational),
           let counts = try? operational.nestedContainer(keyedBy: CountKeys.self, forKey: .orderCounts) {
            newOrders = (try? counts.decodeIfPresent(Int.self, forKey: .new)) ?? nil
        } else {
            newOrders = nil
        }
        series = ((try? c.decodeIfPresent([Point].self, forKey: .series)) ?? nil) ?? []
        topProducts = ((try? c.decodeIfPresent([TopProduct].self, forKey: .topProducts)) ?? nil) ?? []
    }
}

struct OverviewReportResponse: Decodable {
    let success: Bool
    let code: String?
    let message: String?
    let error: String?
    let data: OverviewReport?
}

/// "Now" figures of GET /api/analytics/outlet-operations used by the overview
struct OverviewNow: Decodable, Equatable {
    /// Rentals past their return day
    let lateReturns: Int
    /// Rentals out now (`cash.depositsHeld.orders`); nil without the revenue permission
    let rentedOut: Int?
    /// Collateral held now (`cash.depositsHeld.securityDeposit`); nil without the revenue permission
    let collateralHeld: Double?

    private enum CodingKeys: String, CodingKey { case overdueReturns, cash }
    private enum GroupKeys: String, CodingKey { case count }
    private enum CashKeys: String, CodingKey { case depositsHeld }
    private enum HeldKeys: String, CodingKey { case securityDeposit, orders }

    init(lateReturns: Int, rentedOut: Int?, collateralHeld: Double?) {
        self.lateReturns = lateReturns
        self.rentedOut = rentedOut
        self.collateralHeld = collateralHeld
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let group = try? c.nestedContainer(keyedBy: GroupKeys.self, forKey: .overdueReturns) {
            lateReturns = ((try? group.decodeIfPresent(Int.self, forKey: .count)) ?? nil) ?? 0
        } else {
            lateReturns = 0
        }
        if let cash = try? c.nestedContainer(keyedBy: CashKeys.self, forKey: .cash),
           let held = try? cash.nestedContainer(keyedBy: HeldKeys.self, forKey: .depositsHeld) {
            rentedOut = (try? held.decodeIfPresent(Int.self, forKey: .orders)) ?? nil
            collateralHeld = (try? held.decodeIfPresent(Double.self, forKey: .securityDeposit)) ?? nil
        } else {
            rentedOut = nil
            collateralHeld = nil
        }
    }
}

struct OverviewNowResponse: Decodable {
    let success: Bool
    let code: String?
    let message: String?
    let error: String?
    let data: OverviewNow?
}
