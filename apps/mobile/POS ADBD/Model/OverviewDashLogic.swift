//
//  OverviewDashLogic.swift
//  POS ADBD
//
//  #616: the redesigned Tổng quan (canvas phone boards, web #608 #611 #612 #613). Pure mapping from
//  GET /api/analytics/period and GET /api/analytics/outlet-operations to what the screen draws. No clock and no
//  device zone: callers pass the shop's today key (`DayFormatter.key(Date())`, shop zone).
//

import Foundation

/// Period chips of the board: Hôm nay / 7 ngày / Tháng này / Tuỳ chọn
enum OverviewChip: CaseIterable, Equatable {
    case today, last7, thisMonth, custom

    var title: String {
        switch self {
        case .today: return "overview.dash.period.today".localized()
        case .last7: return "overview.dash.period.last7".localized()
        case .thisMonth: return "overview.dash.period.thisMonth".localized()
        case .custom: return "overview.dash.period.custom".localized()
        }
    }
}

/// The four tiles, in display order
enum OverviewTileKind: CaseIterable, Equatable {
    case orderValue, collected, outstanding, collateral

    /// The rule behind the number, shown first in the tile's detail sheet (key, localized there)
    var rule: String {
        switch self {
        case .orderValue: return "overview.dash.rule.orderValue"
        case .collected: return "overview.dash.rule.collected"
        case .outstanding: return "overview.dash.rule.outstanding"
        case .collateral: return "overview.dash.rule.collateral"
        }
    }

    var title: String {
        switch self {
        case .orderValue: return "overview.dash.kpi.orderValue".localized()
        case .collected: return "overview.dash.kpi.collected".localized()
        case .outstanding: return "overview.dash.kpi.outstanding".localized()
        case .collateral: return "overview.dash.kpi.collateral".localized()
        }
    }
}

enum OverviewChipTone: Equatable {
    case up, down, warn, info
}

/// One status chip: a string key, its count (if any) and a tone
struct OverviewTileChip: Equatable {
    let tone: OverviewChipTone
    let key: String
    let count: Int?

    var text: String {
        guard let count else { return key.localized() }
        return String(format: key.localized(), count)
    }
}

struct OverviewTile: Equatable {
    let kind: OverviewTileKind
    let value: Double?
    /// "+" before a positive value (net collateral)
    let signed: Bool
    let chip: OverviewTileChip?
    /// #719: a second chip, e.g. "13 đơn mới" on Giá trị đơn mới
    var count: OverviewTileChip? = nil
}

/// Thực thu against what is still expected from today to the end of the period (web `forecastBar`, #612)
struct OverviewForecast: Equatable {
    let collected: Double
    let forecast: Double
    /// Collected share of collected + forecast, 0…1
    let collectedShare: Double
    /// Last day with an expected amount (`yyyy-MM-dd`)
    let until: String
}

struct OverviewDashBar: Equatable {
    /// `yyyy-MM-dd`, or the month label of a monthly point
    let key: String
    let value: Double
    let forecast: Double
    /// Height of value + forecast against the tallest bar, 0…1
    let ratio: Double
    /// Height of the forecast part alone, 0…1
    let forecastRatio: Double
    let isToday: Bool
    /// A day bar (false: a month)
    let isDay: Bool
}

struct OverviewWaterfallRow: Equatable {
    enum Key: Equatable { case deposits, pickupAndSale, fees, refunds, collateral, total }
    let key: Key
    /// Signed contribution; the total row carries the total
    let amount: Double
    /// Bar start and width, 0…1 of the track
    let left: Double
    let width: Double
    let isTotal: Bool
}

struct OverviewCollateralRow: Equatable {
    enum Key: Equatable { case received, returned, toCollect, toReturn }
    let key: Key
    let amount: Double
    let orders: Int?
    /// Hatched: not in the period's numbers yet
    let upcoming: Bool
    /// 0…1 of the largest row
    let width: Double
}

/// One part of a stacked bar
struct OverviewSplitPart: Equatable {
    let amount: Double
    let orders: Int
    /// Share of the bar, 0…1
    let share: Double
}

/// #620: one row of Top sản phẩm / Top khách hàng
struct OverviewTopRow: Equatable {
    /// Public numeric id (product or customer); nil: the row does not open anything
    let id: Int?
    let name: String
    let amount: Double
    /// Rentals of a product, orders of a customer
    let count: Int
    /// Bar width against the first (largest) row, 0…1
    let ratio: Double
}

enum OverviewDashLogic {
    // MARK: Periods

    /// Civil-day range of a chip. Tháng này is the whole month (as web), so its forecast reaches the month end.
    /// A custom chip without a range falls back to today.
    static func range(of chip: OverviewChip, todayKey: String, custom: DayKeyRange? = nil) -> DayKeyRange {
        switch chip {
        case .today:
            return DayKeyRange(start: todayKey, end: todayKey)
        case .last7:
            return DayKeyRange(start: CalendarV2Logic.shift(todayKey, days: -6), end: todayKey)
        case .thisMonth:
            guard let t = CalendarV2Logic.parts(of: todayKey) else { return DayKeyRange(start: todayKey, end: todayKey) }
            return DayKeyRange(start: CalendarV2Logic.key(year: t.year, month: t.month, day: 1),
                               end: CalendarV2Logic.key(year: t.year, month: t.month,
                                                        day: CalendarV2Logic.daysInMonth(year: t.year, month: t.month)))
        case .custom:
            guard let custom else { return DayKeyRange(start: todayKey, end: todayKey) }
            return custom.start <= custom.end ? custom : DayKeyRange(start: custom.end, end: custom.start)
        }
    }

    /// The chart needs more than one bar: Hôm nay charts the 7 days up to today and the 7 days after it (14 bars,
    /// web #610 `chartRange` and the canvas: 01/10 … 07/10 … 14/10); another one-day range charts the 7 days up to it
    static func chartRange(of chip: OverviewChip, range: DayKeyRange) -> DayKeyRange {
        guard range.start == range.end else { return range }
        if chip == .today {
            return DayKeyRange(start: CalendarV2Logic.shift(range.end, days: -6), end: CalendarV2Logic.shift(range.end, days: 7))
        }
        return DayKeyRange(start: CalendarV2Logic.shift(range.end, days: -6), end: range.end)
    }

    /// Latest day the custom picker allows (web #612: a year ahead)
    static func customMaxKey(todayKey: String) -> String { CalendarV2Logic.shift(todayKey, days: 365) }

    // MARK: Tiles

    enum Growth: Equatable {
        case none, new
        case pct(Int, up: Bool)
    }

    /// Same rule as web: 1000 %+ means the previous period was (almost) empty; 0 / unknown shows nothing
    static func growth(_ value: Double?) -> Growth {
        guard let value, value.isFinite, value != 0 else { return .none }
        if abs(value) >= 1000 { return .new }
        let pct = Int(abs(value).rounded())
        return pct == 0 ? .none : .pct(pct, up: value > 0)
    }

    static func growthChip(_ value: Double?) -> OverviewTileChip? {
        switch growth(value) {
        case .none: return nil
        case .new: return OverviewTileChip(tone: .up, key: "overview.dash.chip.new", count: nil)
        case .pct(let pct, let up):
            return OverviewTileChip(tone: up ? .up : .down, key: up ? "overview.dash.chip.up" : "overview.dash.chip.down", count: pct)
        }
    }

    /// The four tiles. Chips only say what the data supports (web `buildTiles`)
    static func tiles(report: OverviewReport?, now: OverviewNow?) -> [OverviewTile] {
        var outstandingChip: OverviewTileChip?
        if let parts = report?.outstandingBreakdown {
            if parts.overduePickup.orders > 0 {
                outstandingChip = OverviewTileChip(tone: .warn, key: "overview.dash.chip.overdue", count: parts.overduePickup.orders)
            } else if parts.atPickup.orders > 0 {
                outstandingChip = OverviewTileChip(tone: .info, key: "overview.dash.chip.waiting", count: parts.atPickup.orders)
            }
        }
        var collateralChip: OverviewTileChip?
        if let held = now?.rentedOut, held > 0 {
            collateralChip = OverviewTileChip(tone: .info, key: "overview.dash.chip.held", count: held)
        }
        return [
            // #719: the orders behind the money (rent + sale, cancelled left out); none on an API without orderValueByType
            OverviewTile(kind: .orderValue, value: report?.totalOrderValue, signed: false,
                         chip: growthChip(report?.orderValueGrowth),
                         count: report?.orderValueByType.map {
                             OverviewTileChip(tone: .info, key: "overview.dash.chip.newOrders", count: $0.rent.orders + $0.sale.orders)
                         }),
            // #708: Thực thu is the money held, collateral included (cashCollected); older APIs keep collected
            OverviewTile(kind: .collected, value: report?.cashCollected ?? report?.netRevenue, signed: false,
                         chip: growthChip(report?.revenueGrowth)),
            OverviewTile(kind: .outstanding, value: report?.outstanding, signed: false, chip: outstandingChip),
            OverviewTile(kind: .collateral, value: report?.collateralFlow?.net, signed: true, chip: collateralChip),
        ]
    }

    /// Σ `expectedCollected` of the period's days from today on; nil without a forecast (or on an older API)
    static func forecast(collected: Double?, series: [OverviewReport.Point], todayKey: String) -> OverviewForecast? {
        var total = 0.0
        var until = ""
        for point in series {
            guard let key = point.dayKey, key >= todayKey else { continue }
            let value = max(0, point.expectedCollected ?? 0)
            if value > 0 {
                total += value
                if key > until { until = key }
            }
        }
        guard let collected, total > 0 else { return nil }
        let done = max(0, collected)
        return OverviewForecast(collected: collected, forecast: total, collectedShare: done / (done + total), until: until)
    }

    // MARK: Money text

    /// Tile value: full below a million ("450.000"), else "18,65 tr" / "1,2 tỷ" (en "18.65M" / "1.2B");
    /// two decimals at most, trailing zeros dropped
    static func compact(_ amount: Double, vietnamese: Bool) -> String {
        let magnitude = abs(amount)
        guard magnitude >= 1_000_000 else { return MoneyFormatter.format(amount) }
        let billion = magnitude >= 1_000_000_000
        var scaled = magnitude / (billion ? 1_000_000_000 : 1_000_000)
        scaled = (scaled * 100).rounded() / 100
        var text = String(format: "%.2f", scaled)
        while text.hasSuffix("0") { text.removeLast() }
        if text.hasSuffix(".") { text.removeLast() }
        if vietnamese { text = text.replacingOccurrences(of: ".", with: ",") }
        let unit = vietnamese ? (billion ? " tỷ" : " tr") : (billion ? "B" : "M")
        return (amount < 0 ? "−" : "") + text + unit
    }

    /// Value of a tile: "—" when unknown, "+" before a positive signed value
    static func tileText(_ tile: OverviewTile, vietnamese: Bool, compact useCompact: Bool = true) -> String {
        guard let value = tile.value else { return "—" }
        let text = useCompact ? compact(value, vietnamese: vietnamese) : MoneyFormatter.format(value)
        return tile.signed && value > 0 ? "+" + text : text
    }

    // MARK: Chart

    /// One bar per day of `range` (missing days are 0) or, past 45 days, the API's monthly points
    static func chartBars(report: OverviewReport, range: DayKeyRange, todayKey: String) -> [OverviewDashBar] {
        var raw: [(key: String, value: Double, forecast: Double, isDay: Bool)] = []
        if OverviewLogic.groupBy(range) == "month" {
            raw = report.series.map { ($0.monthLabel ?? "", $0.realIncome, max(0, $0.expectedCollected ?? 0), false) }
        } else {
            var values: [String: Double] = [:]
            var forecasts: [String: Double] = [:]
            for point in report.series {
                guard let key = point.dayKey else { continue }
                values[key, default: 0] += point.realIncome
                forecasts[key, default: 0] += max(0, point.expectedCollected ?? 0)
            }
            raw = (0..<range.dayCount).map { offset in
                let key = CalendarV2Logic.shift(range.start, days: offset)
                return (key, values[key] ?? 0, forecasts[key] ?? 0, true)
            }
        }
        let top = raw.map { max(0, $0.value) + $0.forecast }.max() ?? 0
        return raw.map { bar in
            let total = max(0, bar.value) + bar.forecast
            return OverviewDashBar(key: bar.key, value: bar.value, forecast: bar.forecast,
                                   ratio: top > 0 ? total / top : 0, forecastRatio: top > 0 ? bar.forecast / top : 0,
                                   isToday: bar.isDay && bar.key == todayKey, isDay: bar.isDay)
        }
    }

    /// Indexes of the bars that get an axis label: first, today, last
    static func axisLabelIndexes(_ bars: [OverviewDashBar]) -> [Int] {
        guard !bars.isEmpty else { return [] }
        var indexes = [0]
        if let today = bars.firstIndex(where: { $0.isToday }), today != 0, today != bars.count - 1 { indexes.append(today) }
        if bars.count > 1 { indexes.append(bars.count - 1) }
        return indexes
    }

    // MARK: Detail sheets

    /// Thực thu as a waterfall: three additions, minus refunds, = total. Handles a negative total (web `waterfallRows`)
    /// `collateral`: collateral received − handed back (#708), a step before the total when Thực thu includes it
    static func waterfall(_ parts: OverviewReport.CollectedBreakdown, total: Double, collateral: Double? = nil) -> [OverviewWaterfallRow] {
        var steps: [(OverviewWaterfallRow.Key, Double)] = [
            (.deposits, parts.deposits), (.pickupAndSale, parts.pickupAndSale), (.fees, parts.fees), (.refunds, -parts.refunds),
        ]
        if let collateral { steps.append((.collateral, collateral)) }
        var spans: [(key: OverviewWaterfallRow.Key, amount: Double, from: Double, to: Double, total: Bool)] = []
        var run = 0.0
        for (key, amount) in steps {
            spans.append((key, amount, run, run + amount, false))
            run += amount
        }
        spans.append((.total, total, 0, total, true))
        let lo = min(0, spans.map { min($0.from, $0.to) }.min() ?? 0)
        let hi = max(0, spans.map { max($0.from, $0.to) }.max() ?? 0)
        let width = hi - lo == 0 ? 1 : hi - lo
        return spans.map { span in
            OverviewWaterfallRow(key: span.key, amount: span.amount, left: (min(span.from, span.to) - lo) / width,
                                 width: abs(span.to - span.from) / width, isTotal: span.total)
        }
    }

    /// Two parts of one stacked bar (shares of their sum; negatives count as 0)
    static func split(_ a: OverviewReport.AmountPart, _ b: OverviewReport.AmountPart) -> (OverviewSplitPart, OverviewSplitPart) {
        let x = max(0, a.amount)
        let y = max(0, b.amount)
        let sum = x + y
        return (OverviewSplitPart(amount: a.amount, orders: a.orders, share: sum > 0 ? x / sum : 0),
                OverviewSplitPart(amount: b.amount, orders: b.orders, share: sum > 0 ? y / sum : 0))
    }

    /// Thế chân: received / returned in the period, then the upcoming ones from today's cash (web `collateralRows`)
    static func collateralRows(flow: OverviewReport.CollateralFlow?, now: OverviewNow?) -> [OverviewCollateralRow] {
        var rows: [(OverviewCollateralRow.Key, Double, Int?, Bool)] = []
        if let flow {
            rows.append((.received, flow.received, nil, false))
            rows.append((.returned, flow.returned, nil, false))
        }
        if let toCollect = now?.collateralToCollect { rows.append((.toCollect, toCollect.amount, toCollect.orders, true)) }
        if let toReturn = now?.collateralToReturn { rows.append((.toReturn, toReturn.amount, toReturn.orders, true)) }
        let top = rows.map { abs($0.1) }.max() ?? 0
        return rows.map { OverviewCollateralRow(key: $0.0, amount: $0.1, orders: $0.2, upcoming: $0.3, width: top > 0 ? abs($0.1) / top : 0) }
    }

    // MARK: Hôm nay

    /// "2/3": done of planned
    static func doneOfTotal(_ task: OverviewNow.TodayTask) -> String { "\(task.done)/\(task.total)" }

    /// The Hôm nay card (today's counters and the Ngày mai line) belongs to today only (#620)
    static func showsTodayCard(range: DayKeyRange, todayKey: String) -> Bool {
        range.start == todayKey && range.end == todayKey
    }

    // MARK: Top lists (#620)

    static let topLimit = 5
    /// "Xem tất cả" (#633): the whole ranking of the period, like the web drawer (`TOP_ALL_LIMIT`) and the API cap
    static let topAllLimit = 50

    /// Top sản phẩm: the API's order (largest revenue first), five at most on the card
    static func topProductRows(_ products: [OverviewReport.TopProduct], limit: Int = topLimit) -> [OverviewTopRow] {
        topRows(products.map { ($0.id, $0.name, $0.totalRevenue, $0.rentalCount) }, limit: limit)
    }

    /// Top khách hàng: the API's order, five at most on the card; a hidden `totalSpent` (null) counts as 0
    static func topCustomerRows(_ customers: [OverviewReport.TopCustomer], limit: Int = topLimit) -> [OverviewTopRow] {
        topRows(customers.map { ($0.id, $0.name, $0.totalSpent ?? 0, $0.orderCount) }, limit: limit)
    }

    private static func topRows(_ items: [(id: Int?, name: String, amount: Double, count: Int)], limit: Int) -> [OverviewTopRow] {
        let kept = items.prefix(max(0, limit))
        let top = kept.map { max(0, $0.amount) }.max() ?? 0
        return kept.map { item in
            OverviewTopRow(id: item.id, name: item.name, amount: item.amount, count: item.count,
                           ratio: top > 0 ? max(0, item.amount) / top : 0)
        }
    }
}

// MARK: - #708 Xem các đơn liên quan: the rows behind a tile, each with the money it adds to the tile

/// Which tile the list explains. `Còn phải thu` keeps its own list (RentedOutOrdersViewController, #706).
enum OverviewRelatedKind: Equatable {
    /// Orders created in the period (GET income/orders status=new); a cancelled order is listed with 0
    case orderValue
    /// Every money event of the period (status=all); collateral in and out included, as the Thực thu tile (#710)
    case collected
    /// The collateral of each money event of the period (status=all, row `collateral`, #721): + received at hand-over,
    /// − handed back at return or cancel; a same-day hand-over then return or cancel moves none, as the tile
    case collateral
    /// Orders created in the period that still owe money (rent not picked up: total − deposit; sale not completed),
    /// the rule of `revenue.outstanding` (BF-OUT), so the count and the total equal the tile
    case outstanding

    /// The income/orders buckets to load
    var buckets: [String] {
        switch self {
        case .orderValue, .outstanding: return ["new"]
        case .collected, .collateral: return ["all"]
        }
    }
}

struct OverviewRelatedRow: Equatable {
    let orderId: Int
    let orderNumber: String
    let customer: String
    let detail: String
    let amount: Double
}

/// #757: the reason under a "Collected" row in the app's language. The API `description` is Vietnamese, so the
/// reason comes from `revenueType` (or the known API sentence, which also splits a `MULTIPLE` row); `description`
/// stays the fallback for a type this build does not know.
enum RelatedEventReason: String, CaseIterable {
    case saleCreated, saleCancelled, deposit, pickup, sameDay, damageFee, depositRefund, nothing
    case rentCancelled, returnCollected, futurePickup, futureDamageFee, futureRefund, futureNothing

    var localizedKey: String { "overview.related.event.\(rawValue)" }

    /// The API's own sentences (`revenue-calculator.ts`), so a `RENT_RETURN` or a `MULTIPLE` part maps exactly
    static let knownDescriptions: [String: RelatedEventReason] = [
        "Đơn bán được tạo": .saleCreated, "Đơn bán bị hủy (hoàn lại)": .saleCancelled, "Thu tiền cọc": .deposit,
        "Thu tiền khi lấy hàng": .pickup, "Thuê và trả trong cùng ngày": .sameDay, "Thu phí hư hỏng": .damageFee,
        "Hoàn tiền cọc": .depositRefund, "Không có phát sinh": .nothing, "Đơn hủy (hoàn lại)": .rentCancelled,
        "Doanh thu dự kiến khi lấy hàng": .futurePickup, "Ước tính thu phí hư hỏng khi trả hàng": .futureDamageFee,
        "Ước tính hoàn tiền cọc khi trả hàng": .futureRefund, "Ước tính không có phát sinh khi trả hàng": .futureNothing,
    ]

    static func forType(_ revenueType: String, revenue: Double) -> RelatedEventReason? {
        switch revenueType {
        case "SALE": return .saleCreated
        case "SALE_CANCELLED": return .saleCancelled
        case "RENT_DEPOSIT": return .deposit
        case "RENT_PICKUP": return .pickup
        case "RENT_CANCELLED": return .rentCancelled
        case "RENT_FUTURE_PICKUP": return .futurePickup
        case "RENT_RETURN": return revenue < 0 ? .depositRefund : (revenue > 0 ? .returnCollected : .nothing)
        case "RENT_FUTURE_RETURN": return revenue < 0 ? .futureRefund : (revenue > 0 ? .futureDamageFee : .futureNothing)
        default: return nil
        }
    }

    /// The reason of each event of a row: one for a single event, one per part of a `MULTIPLE` row ("a + b").
    /// `nil` reason = unknown, keep the API text of that part.
    static func parts(revenueType: String?, description: String?, revenue: Double) -> [(reason: RelatedEventReason?, text: String)] {
        let type = (revenueType ?? "").uppercased()
        let text = description ?? ""
        if type == "MULTIPLE" || (type.isEmpty && text.contains(" + ")) {
            return text.components(separatedBy: " + ").map { (knownDescriptions[$0], $0) }
        }
        return [(knownDescriptions[text] ?? forType(type, revenue: revenue), text)]
    }

    static func text(revenueType: String?, description: String?, revenue: Double,
                     localize: (String) -> String = { $0.localized() }) -> String {
        parts(revenueType: revenueType, description: description, revenue: revenue)
            .map { $0.reason.map { localize($0.localizedKey) } ?? $0.text }
            .joined(separator: " + ")
    }
}

extension OverviewDashLogic {
    /// One row per income/orders row, with the money it adds to the tile; Σ amount = the tile (BF-STAT)
    static func relatedRows(_ kind: OverviewRelatedKind, bucket: String, items: [DailyIncomeOrder]) -> [OverviewRelatedRow] {
        items.compactMap { item in
            guard let id = item.id else { return nil }
            let amount: Double
            let detail: String
            switch (kind, bucket) {
            case (.orderValue, _):
                let cancelled = item.status?.uppercased() == "CANCELLED"
                amount = cancelled ? 0 : (item.totalAmount ?? 0)
                detail = cancelled ? "overview.related.cancelled".localized() : "overview.related.created".localized()
            case (.collected, _):
                amount = item.revenue ?? 0
                detail = RelatedEventReason.text(revenueType: item.revenueType, description: item.description, revenue: amount)
            case (.outstanding, _):
                let type = item.orderType?.uppercased() ?? ""
                let status = item.status?.uppercased() ?? ""
                if type == "RENT" && status == "RESERVED" {
                    amount = max(0, (item.totalAmount ?? 0) - (item.depositAmount ?? 0))
                } else if type == "SALE" && status != "COMPLETED" && status != "CANCELLED" {
                    amount = item.totalAmount ?? 0
                } else {
                    amount = 0
                }
                detail = "overview.related.owes".localized()
            case (.collateral, _):
                amount = item.collateral ?? 0
                detail = (amount < 0 ? "overview.related.collateralOut" : "overview.related.collateralIn").localized()
            }
            if kind == .collateral && amount == 0 { return nil }
            if kind == .outstanding && amount <= 0 { return nil }
            return OverviewRelatedRow(orderId: id, orderNumber: item.orderNumber ?? "#\(id)",
                                      customer: item.customerName ?? "", detail: detail, amount: amount)
        }
    }

    static func relatedTotal(_ rows: [OverviewRelatedRow]) -> Double {
        rows.reduce(0) { $0 + $1.amount }
    }
}
