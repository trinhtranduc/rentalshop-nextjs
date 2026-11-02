//
//  OrdersHomeViewModel.swift
//  POS ADBD
//
//  State of the redesigned orders tab (#371): "Việc cần làm", rent orders, sale orders and one search.
//  Its own instance (not OrderListViewModel.shared), so the old screen is untouched.
//

import Foundation
import UIKit
import Alamofire

enum OrdersSegment: Int, CaseIterable {
    case today, rent, sale
}

/// What the counter does with a "Việc cần làm" row
enum WorkKind {
    /// `collect` (#1231): a deposit stage due today or late
    case handOver, takeBack, collect
}

enum OrdersRow {
    case work(TodayWorkRow, kind: WorkKind)
    case order(Order, lateDays: Int)

    var orderId: Int {
        switch self {
        case .work(let row, _): return row.id
        case .order(let order, _): return order.id
        }
    }
}

struct OrdersSection {
    enum Style { case late, normal }
    /// What the band shows: TRỄ HẠN / HÔM NAY / NGÀY MAI of "Việc cần làm", a sale day, or no band
    enum Kind: Equatable {
        case late, today, tomorrow, day(Date), plain
    }
    let kind: Kind
    let rows: [OrdersRow]
    var style: Style { kind == .late ? .late : .normal }
}

/// Rent list query: the status chips plus the "Lọc & sắp xếp" sheet (board Loc).
/// #888: one date (Ngày lấy / Ngày trả / Ngày tạo) for both the order and the range; "Việc gần nhất" left the sheet
/// (the "Việc cần làm" tab keeps that order).
struct RentOrdersFilter: Equatable {
    enum SortDate: CaseIterable { case pickup, returnDate, created }
    /// `nearestFirst` = latest date first (`desc`), the meaning "Ngày giao gần nhất" had before #888
    enum Direction: CaseIterable { case nearestFirst, farthestFirst }
    enum DateRange: Equatable {
        case any, today, next7Days, thisMonth
        case custom(from: Date, to: Date)
    }

    var status: OrderStatus?
    var sortDate: SortDate = .pickup
    var direction: Direction = .nearestFirst
    var dateRange: DateRange = .any

    /// The sheet part (sort and dates) is untouched
    var isDefault: Bool { sortDate == .pickup && direction == .nearestFirst && dateRange == .any }

    var sortBy: String {
        switch sortDate {
        case .pickup: return "pickupPlanAt"
        case .returnDate: return "returnPlanAt"
        case .created: return "createdAt"
        }
    }

    var sortOrder: String { direction == .nearestFirst ? "desc" : "asc" }

    /// The range uses the sort date (#888)
    var dateField: String { sortBy }
}

/// One date of a "Tất cả đơn" row (#888): "Lấy 14/10/26", marked when the list is sorted by it
struct RowDatePart: Equatable {
    let text: String
    let marked: Bool
}

/// #891 (owner, option C): the date chip of an order row, "Lấy 14/10/26" / "Trả 16/10/26" / "Bán 15/10/26".
/// #1026 (owner): no colour; a grey icon then the date in dark text, no background. The date the list is
/// sorted by is only bolder text.
struct DateChip: Equatable {
    enum Kind: Equatable {
        case pickup, `return`
        /// #1026: the day of a sale ("Bán dd/mm/yy"), with the pickup icon
        case sale

        /// #1026 (owner): only the status badge keeps colour; every date chip is dark text on no fill
        var colors: DS.Pill { DS.Pill(text: DS.Color.text, fill: .clear) }

        /// #1026 (owner): the icon is grey
        var iconColor: UIColor { DateChip.iconColor }

        /// #1008 (owner): the SF Symbol shown in place of the word "Lấy" / "Trả" (#1026: "Bán" uses ↗)
        var symbolName: String {
            switch self {
            case .pickup, .sale: return "arrow.up.forward"
            case .return: return "arrow.uturn.backward"
            }
        }
    }

    /// #1026 (owner, mockup "Mọi màn đơn hàng: bớt màu"): the icon colour of every date chip
    static let iconColor = UIColor(hexString: "64748B")

    let kind: Kind
    let label: String
    let date: String
    let bold: Bool

    /// #1008: what VoiceOver reads, "Lấy 14/10/26" (the chip shows only the icon and the date)
    var accessibilityText: String { label + " " + date }

    static func == (lhs: DateChip, rhs: DateChip) -> Bool {
        lhs.kind == rhs.kind && lhs.label == rhs.label && lhs.date == rhs.date && lhs.bold == rhs.bold
    }
}

/// #1032 (owner, mockup "Mọi màn đơn hàng: cảnh báo gọn"): a warning on an order row ("Trễ N ngày",
/// "Chưa soạn đồ") is small coloured text with a small icon in front and no box, so the status badge stays the
/// strongest colour. Only order rows use it; `DS.Status.late` / `.waiting` keep their fills for other screens.
enum RowWarning: Equatable {
    case late, notPrepared

    /// Text and icon colour
    var color: UIColor {
        switch self {
        case .late: return UIColor(hexString: "B91C1C")
        case .notPrepared: return UIColor(hexString: "9A3412")
        }
    }

    /// No fill
    var colors: DS.Pill { DS.Pill(text: color, fill: .clear) }

    /// The SF Symbol before the text
    var symbolName: String {
        switch self {
        case .late: return "clock"
        case .notPrepared: return "shippingbox"
        }
    }

    /// Pill size, medium weight
    static let fontSize: CGFloat = DS.TextSize.pill
    static var font: UIFont { Utils.mediumFont(size: fontSize) }
}

/// One `GET /api/orders` request of the tab
struct OrdersQuery: Equatable {
    var keyword: String?
    var orderType: OrderType?
    var status: OrderStatus?
    var sortBy = "createdAt"
    var sortOrder = "desc"
    var startDate: Date?
    var endDate: Date?
    var dateField: String?
    var page = 1
    /// Page size; a quiet refresh asks for every loaded page at once (#674)
    var limit = OrdersHomeViewModel.pageSize
}

/// Right-hand line under a row total (board Main). A fully paid order has none (#458).
enum PayLine: Equatable {
    case refund(Double), due(Double)
}

/// Date lines of an order row (#496): "#0053 · tạo T7 03/10" and the status line ("" when there is none)
struct OrderRowLines: Equatable {
    let meta: String
    let task: String
}

/// Tag colours and text of a row (boards Main, VL-tat-ca, VL-ban, VL-tim)
struct RowTag: Equatable {
    let text: String
    let colors: DS.Pill

    static func == (lhs: RowTag, rhs: RowTag) -> Bool {
        lhs.text == rhs.text && lhs.colors.text == rhs.colors.text && lhs.colors.fill == rhs.colors.fill
    }
}

// MARK: - Pure helpers (unit tested)

enum OrdersHomeLogic {
    static let minSearchLength = 2

    /// Days past the planned hand-over (RENT still RESERVED) or return (still PICKUPED), in civil days of `timeZone`.
    /// A note ("Trễ N ngày"), never a status. 0 when not late.
    static func lateDays(orderType: OrderType, status: OrderStatus, pickupPlanAt: Date?, returnPlanAt: Date?,
                         now: Date = Date(), timeZone: TimeZone = Date.shopTimeZone) -> Int {
        guard orderType == .rent else { return 0 }
        let planned: Date?
        switch status {
        case .reserved: planned = pickupPlanAt
        case .pickuped: planned = returnPlanAt
        default: planned = nil
        }
        guard let planned else { return 0 }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: planned),
                                           to: calendar.startOfDay(for: now)).day ?? 0
        return max(0, days)
    }

    /// TRỄ HẠN (late hand-overs + late returns, most late first), HÔM NAY, NGÀY MAI. Empty groups are left out;
    /// NGÀY MAI is left out when the API did not send it.
    static func todaySections(from work: TodayWork) -> [OrdersSection] {
        let late = (work.noShows.orders.map { OrdersRow.work($0, kind: .handOver) }
            + work.overdueReturns.orders.map { OrdersRow.work($0, kind: .takeBack) }
            + work.installmentsOverdue.map { OrdersRow.work(TodayWorkRow(stage: $0), kind: .collect) })
            .sorted { lateDays(of: $0) > lateDays(of: $1) }
        let today = work.pickupsToday.orders.map { OrdersRow.work($0, kind: .handOver) }
            + work.returnsToday.orders.map { OrdersRow.work($0, kind: .takeBack) }
            + work.installmentsDue.map { OrdersRow.work(TodayWorkRow(stage: $0), kind: .collect) }
        let tomorrow = (work.tomorrowPickups?.orders ?? []).map { OrdersRow.work($0, kind: .handOver) }
            + (work.tomorrowReturns?.orders ?? []).map { OrdersRow.work($0, kind: .takeBack) }

        return [
            OrdersSection(kind: .late, rows: late),
            OrdersSection(kind: .today, rows: today),
            OrdersSection(kind: .tomorrow, rows: tomorrow),
        ].filter { !$0.rows.isEmpty }
    }

    private static func lateDays(of row: OrdersRow) -> Int {
        if case .work(let work, _) = row { return work.lateDays }
        return 0
    }

    /// Items grouped by civil day of `date`, keeping the incoming order (newest first from the API)
    static func groupByDay<T>(_ items: [T], date: (T) -> Date, timeZone: TimeZone = Date.shopTimeZone) -> [(key: String, day: Date, items: [T])] {
        var groups: [(key: String, day: Date, items: [T])] = []
        for item in items {
            let day = date(item)
            let key = DayFormatter.key(day, timeZone: timeZone)
            if let index = groups.firstIndex(where: { $0.key == key }) {
                groups[index].items.append(item)
            } else {
                groups.append((key: key, day: day, items: [item]))
            }
        }
        return groups
    }

    // MARK: Board texts (#401)

    /// "0053" of "ORD-1-0053"; numbers without a dash stay whole
    static func shortNumber(_ orderNumber: String) -> String {
        guard let last = orderNumber.split(separator: "-").last, !last.isEmpty else { return orderNumber }
        return String(last)
    }

    /// Refund first (the counter hands money back), then what is still to collect. Nil when fully paid: a status
    /// change already guarantees the money is in, so no "đã thu đủ" line (#458)
    static func payLine(amountDue: Double, refundDue: Double) -> PayLine? {
        if refundDue > 0 { return .refund(refundDue) }
        if amountDue > 0 { return .due(amountDue) }
        return nil
    }

    /// Order rows with their late days, in the API order (Orders tab lists and overview drill-down lists, #458)
    static func orderRows(_ orders: [Order], now: Date = Date(), timeZone: TimeZone = Date.shopTimeZone) -> [OrdersRow] {
        orders.map { order in
            .order(order, lateDays: lateDays(orderType: order.orderType, status: order.status,
                                             pickupPlanAt: order.pickupPlanAt, returnPlanAt: order.returnPlanAt,
                                             now: now, timeZone: timeZone))
        }
    }

    /// Pay line of a "Tất cả đơn" / search row from the list balances (#390); nil when the API sent neither field
    /// (older server), the order is cancelled, or nothing is due (#458)
    static func listPayLine(_ order: Order) -> PayLine? {
        guard order.status != .cancelled else { return nil }
        guard order.listAmountDue != nil || order.listRefundDue != nil else { return nil }
        return payLine(amountDue: order.listAmountDue ?? 0, refundDue: order.listRefundDue ?? 0)
    }

    /// "giao N · trả M" of a band; `collect` (#1231) counts the deposit stages
    static func bandCounts(_ rows: [OrdersRow]) -> (handOver: Int, takeBack: Int, collect: Int) {
        rows.reduce(into: (handOver: 0, takeBack: 0, collect: 0)) { counts, row in
            guard case .work(_, let kind) = row else { return }
            switch kind {
            case .handOver: counts.handOver += 1
            case .takeBack: counts.takeBack += 1
            case .collect: counts.collect += 1
            }
        }
    }

    /// Red badge on "Việc cần làm": what is late plus what is due today (not tomorrow)
    static func badgeCount(_ sections: [OrdersSection]) -> Int {
        sections.filter { $0.kind == .late || $0.kind == .today }.reduce(0) { $0 + $1.rows.count }
    }

    /// Sale day band: orders and money of the day, cancelled orders left out
    static func saleDaySummary(_ rows: [OrdersRow]) -> (count: Int, amount: Double) {
        rows.reduce(into: (count: 0, amount: 0.0)) { sum, row in
            guard case .order(let order, _) = row, order.status != .cancelled else { return }
            sum.count += 1
            sum.amount += order.totalAmount
        }
    }

    static func dayMonth(_ date: Date, timeZone: TimeZone) -> String {
        DayFormatter.dmy(date, timeZone: timeZone) // #888 dd/mm/yy
    }

    private static func calendar(_ timeZone: TimeZone) -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        return calendar
    }

    /// Phone behind the call button of a "Việc cần làm" row; nil hides the button.
    /// Board Main (#468): no call button on any row, late or not; the customer is called from order detail.
    static func workCallPhone(_ row: TodayWorkRow, isLate: Bool) -> String? {
        nil
    }

    private static func isSameDay(_ a: Date, _ b: Date, timeZone: TimeZone) -> Bool {
        DayFormatter.key(a, timeZone: timeZone) == DayFormatter.key(b, timeZone: timeZone)
    }

    // MARK: Row date lines (#496)

    /// Language of the app's strings: "T7 03/10" in Vietnamese, "Sat 03/10" in English
    static var appLocale: Locale {
        Locale(identifier: Bundle.main.preferredLocalizations.first ?? "vi")
    }

    /// "T7 03/10": a civil day of the shop (Vietnam), whatever the device time zone
    static func rowDay(_ date: Date, timeZone: TimeZone = Date.shopTimeZone, locale: Locale = appLocale) -> String {
        DayFormatter.short(date, timeZone: timeZone, locale: locale)
    }

    /// The two lines under the customer name of every order row (#496, dd/mm/yy since #888):
    /// `meta` "#0053 · tạo 03/10/26" (muted) and `task` by status: "Lấy 05/10/26 · trả 07/10/26" (reserved),
    /// "Trả 07/10/26" / "Hạn trả 01/10/26" (rented out, late), "Đã trả 28/09/26", "Bán 02/10/26" (sale),
    /// "Huỷ 29/09/26". A missing date leaves its part out; `task` is empty when nothing is left.
    static func rowLines(code: String, orderType: OrderType, status: OrderStatus, createdAt: Date?,
                         pickupPlanAt: Date?, returnPlanAt: Date?, returnedAt: Date?, updatedAt: Date?,
                         isLate: Bool, timeZone: TimeZone = Date.shopTimeZone, locale: Locale = appLocale) -> OrderRowLines {
        // #888: dd/mm/yy (05/10/26), the Vietnam civil day
        let day: (Date) -> String = { DayFormatter.dmy($0, timeZone: timeZone) }
        let text: (String, Date?) -> String? = { key, date in date.map { String(format: key.localized(), day($0)) } }

        var meta = "#\(code)"
        // #888 (owner): the created day carries its time, "tạo 05/10/26 14:30" (Vietnam clock)
        if let createdAt { meta += " · " + String(format: "orders.row.created".localized(), DayFormatter.dmyTime(createdAt, timeZone: timeZone)) }

        let task: String?
        if status == .cancelled {
            task = text("orders.row.cancelled", updatedAt)
        } else if orderType == .sale {
            task = text("orders.row.sold", createdAt)
        } else {
            switch status {
            case .reserved:
                let pickup = text("orders.row.pickup", pickupPlanAt)
                let back = text(pickup == nil ? "orders.row.return" : "orders.row.returnAfter", returnPlanAt)
                let parts = [pickup, back].compactMap { $0 }
                task = parts.isEmpty ? nil : parts.joined(separator: " · ")
            case .pickuped:
                task = text(isLate ? "orders.row.dueBack" : "orders.row.return", returnPlanAt)
            case .returned:
                task = text("orders.row.returned", returnedAt)
            default:
                task = nil
            }
        }
        return OrderRowLines(meta: meta, task: task ?? "")
    }

    static func rowLines(_ order: Order, lateDays: Int, timeZone: TimeZone = Date.shopTimeZone,
                         locale: Locale = appLocale) -> OrderRowLines {
        rowLines(code: shortNumber(order.orderNumber), orderType: order.orderType, status: order.status,
                 createdAt: order.createdAt, pickupPlanAt: order.pickupPlanAt, returnPlanAt: order.returnPlanAt,
                 returnedAt: order.returnedAt, updatedAt: order.updatedAt, isLate: lateDays > 0,
                 timeZone: timeZone, locale: locale)
    }

    // MARK: "Tất cả đơn" (#888)

    /// "Lấy 14/10/26", "Trả 16/10/26" of a rent list row (planned days, any status); the sorted date is marked.
    /// Sorted by created date: nothing is marked (the created day is only in order detail).
    static func rentRowDates(pickupPlanAt: Date?, returnPlanAt: Date?, sortedBy: RentOrdersFilter.SortDate,
                             timeZone: TimeZone = Date.shopTimeZone) -> [RowDatePart] {
        let part: (String, Date?, Bool) -> RowDatePart? = { key, date, marked in
            date.map { RowDatePart(text: String(format: key.localized(), DayFormatter.dmy($0, timeZone: timeZone)), marked: marked) }
        }
        return [part("orders.row.pickup", pickupPlanAt, sortedBy == .pickup),
                part("orders.row.return", returnPlanAt, sortedBy == .returnDate)].compactMap { $0 }
    }

    static func rentRowDates(_ order: Order, sortedBy: RentOrdersFilter.SortDate,
                             timeZone: TimeZone = Date.shopTimeZone) -> [RowDatePart] {
        rentRowDates(pickupPlanAt: order.pickupPlanAt, returnPlanAt: order.returnPlanAt, sortedBy: sortedBy, timeZone: timeZone)
    }

    /// #893 (owner): one chip on line 2 of a lean Việc cần làm row
    struct WorkChip: Equatable {
        /// The full text ("Lấy 14/10/26"); for a date chip it is what VoiceOver reads
        let text: String
        let colors: DS.Pill
        /// #1008: a date chip shows the `dateKind` icon then `date` in place of `text`
        var dateKind: DateChip.Kind? = nil
        var date: String? = nil
        /// #1032: "Trễ N ngày" / "Chưa soạn đồ" are drawn as a soft row warning (icon + text, no fill)
        var warning: RowWarning? = nil
        static func == (lhs: WorkChip, rhs: WorkChip) -> Bool { lhs.text == rhs.text }
    }


    /// #893 (owner): Việc cần làm line 2: the task's own date (Lấy for a hand-over, Trả for a take-back), then
    /// "Trễ N ngày", then "Chưa soạn đồ" (hand-over rows only, never a return)
    static func workChips(_ work: TodayWorkRow, kind: WorkKind, timeZone: TimeZone = Date.shopTimeZone) -> [WorkChip] {
        var chips: [WorkChip] = []
        if kind == .collect {
            // #1231: "Cọc 2 · #0053", then "Trễ N ngày" when the stage is late
            let text = String(format: "overview.installments.row".localized(), work.stageLabel ?? "", shortNumber(work.orderNumber))
            chips.append(WorkChip(text: text, colors: DS.Status.waiting))
            if work.lateDays > 0 {
                chips.append(WorkChip(text: LateText.days(work.lateDays), colors: RowWarning.late.colors, warning: .late))
            }
            return chips
        }
        let date = kind == .handOver ? work.pickupPlanAt : work.returnPlanAt
        let chipKind: DateChip.Kind = kind == .handOver ? .pickup : .return
        if let date {
            let label = (kind == .handOver ? "orders.chip.pickup" : "orders.chip.return").localized()
            let day = DayFormatter.dmy(date, timeZone: timeZone)
            chips.append(WorkChip(text: label + " " + day, colors: chipKind.colors, dateKind: chipKind, date: day))
        }
        if work.lateDays > 0 {
            chips.append(WorkChip(text: LateText.days(work.lateDays), colors: RowWarning.late.colors, warning: .late))
        }
        if notPreparedApplies(kind: kind, isReadyToDeliver: work.isReadyToDeliver) {
            chips.append(WorkChip(text: "orders.v2.notPrepared".localized(), colors: RowWarning.notPrepared.colors,
                                  warning: .notPrepared))
        }
        return chips
    }

    /// #893 (owner, calendar lean row): the day task's date chip; a hand-over adds "Sẵn sàng giao" (ready) or
    /// "Chưa soạn đồ"; a return row has only its date
    static func calendarChips(_ row: CalendarDayRow, timeZone: TimeZone = Date.shopTimeZone) -> [WorkChip] {
        var chips: [WorkChip] = []
        let handOver = row.kind == .handOver
        if let date = handOver ? row.order.pickupPlanAt : row.order.returnPlanAt {
            let label = (handOver ? "orders.chip.pickup" : "orders.chip.return").localized()
            let chipKind: DateChip.Kind = handOver ? .pickup : .return
            let day = DayFormatter.dmy(date, timeZone: timeZone)
            chips.append(WorkChip(text: label + " " + day, colors: chipKind.colors, dateKind: chipKind, date: day))
        }
        if handOver {
            if row.order.isReadyToDeliver == true {
                chips.append(WorkChip(text: "calendar.v2.ready".localized(), colors: DS.Status.done))
            } else {
                chips.append(WorkChip(text: "orders.v2.notPrepared".localized(), colors: RowWarning.notPrepared.colors,
                                      warning: .notPrepared))
            }
        }
        return chips
    }

    /// #893 (owner): "Chưa soạn đồ" only on a hand-over (a RESERVED order waiting to be picked up) not prepared
    static func notPreparedApplies(kind: WorkKind, isReadyToDeliver: Bool) -> Bool {
        kind == .handOver && !isReadyToDeliver
    }

    /// #893 (owner): "còn thu N" under the total of a Việc cần làm row; nil when nothing is due
    static func workDue(_ work: TodayWorkRow) -> Double? {
        work.amountDue > 0 ? work.amountDue : nil
    }

    /// #891 (option C): the date chips of a rent row; `sortedBy` (Tất cả đơn only) makes that date bold
    static func dateChips(pickupPlanAt: Date?, returnPlanAt: Date?, sortedBy: RentOrdersFilter.SortDate?,
                          timeZone: TimeZone = Date.shopTimeZone) -> [DateChip] {
        [pickupPlanAt.map { DateChip(kind: .pickup, label: "orders.chip.pickup".localized(),
                                     date: DayFormatter.dmy($0, timeZone: timeZone), bold: sortedBy == .pickup) },
         returnPlanAt.map { DateChip(kind: .return, label: "orders.chip.return".localized(),
                                     date: DayFormatter.dmy($0, timeZone: timeZone), bold: sortedBy == .returnDate) }]
            .compactMap { $0 }
    }

    /// #1026 (owner): a sale row (not cancelled) shows "↗ dd/mm/yy" (its created day) in place of "Bán dd/mm/yy";
    /// VoiceOver still reads "Bán dd/mm/yy". Nil for a rent order, a cancelled sale ("Huỷ …" stays) or no date.
    static func saleChip(orderType: OrderType, status: OrderStatus, createdAt: Date?,
                         timeZone: TimeZone = Date.shopTimeZone) -> DateChip? {
        guard orderType == .sale, status != .cancelled, let createdAt else { return nil }
        return DateChip(kind: .sale, label: "orders.chip.sale".localized(),
                        date: DayFormatter.dmy(createdAt, timeZone: timeZone), bold: false)
    }

    /// #1041: the day a sale row shows in a product's sorted list (`sortedBy`): the pickup day when sorted by pickup,
    /// else the created day (return sort keeps the created day); the created day when the pickup day is missing
    static func saleChipDate(createdAt: Date?, pickupPlanAt: Date?, sortedBy: RentOrdersFilter.SortDate?) -> Date? {
        sortedBy == .pickup ? (pickupPlanAt ?? createdAt) : createdAt
    }

    /// #891 (option C): sorted by created date, "tạo dd/mm/yy HH:mm" on line 2 is bold dark text (no background)
    static func metaIsBold(sortedBy: RentOrdersFilter.SortDate?) -> Bool {
        sortedBy == .created
    }

    /// Line 1 of a "Tất cả đơn" row: "#0063 · tạo 05/10/26" (owner: the created day stays where it was)
    static func rentRowMeta(_ order: Order, timeZone: TimeZone = Date.shopTimeZone) -> String {
        rowLines(order, lateDays: 0, timeZone: timeZone).meta
    }

    /// "Ngày lấy", "Ngày trả", "Ngày tạo"
    static func sortDateTitle(_ date: RentOrdersFilter.SortDate) -> String {
        switch date {
        case .pickup: return "orders.v2.sortDate.pickup".localized()
        case .returnDate: return "orders.v2.sortDate.return".localized()
        case .created: return "orders.v2.sortDate.created".localized()
        }
    }

    /// #1056: "Mới nhất trước" (desc) / "Cũ nhất trước" (asc) for every date in Vietnamese; English pickup/return
    /// "Latest first" / "Earliest first", created "Newest first" / "Oldest first"
    static func directionTitle(_ date: RentOrdersFilter.SortDate, _ direction: RentOrdersFilter.Direction) -> String {
        let key: String
        switch (date, direction) {
        case (.created, .nearestFirst): key = "orders.v2.direction.newest"
        case (.created, .farthestFirst): key = "orders.v2.direction.oldest"
        case (_, .nearestFirst): key = "orders.v2.direction.nearest"
        case (_, .farthestFirst): key = "orders.v2.direction.farthest"
        }
        return key.localized()
    }

    /// The bar above the list: "Xếp theo ngày lấy · mới nhất trước"
    static func sortBarText(_ filter: RentOrdersFilter) -> String {
        String(format: "orders.v2.sortBar".localized(), sortDateTitle(filter.sortDate).lowercased(),
               directionTitle(filter.sortDate, filter.direction).lowercased())
    }

    /// Status tag in the board colours; a sale in search reads "Bán · Hoàn thành"
    static func statusTag(_ order: Order, inSearch: Bool = false) -> RowTag {
        let base = statusTag(order.status)
        guard inSearch, order.orderType == .sale else { return base }
        return RowTag(text: String(format: "orders.v2.tag.sale".localized(), base.text), colors: base.colors)
    }

    /// Status text and colours of a status: the list row tag and the order detail header tag (#482)
    static func statusTag(_ status: OrderStatus) -> RowTag {
        // #888 (owner): solid old-app colours for every status badge
        let colors = OrderStatusBadge.pill(for: status)
        switch status {
        case .reserved: return RowTag(text: "orders.v2.status.reserved".localized(), colors: colors)
        case .pickuped: return RowTag(text: "orders.v2.status.renting".localized(), colors: colors)
        case .returned: return RowTag(text: "orders.v2.status.returned".localized(), colors: colors)
        case .completed: return RowTag(text: "orders.v2.status.completed".localized(), colors: colors)
        case .cancelled: return RowTag(text: "orders.v2.status.cancelled".localized(), colors: colors)
        default: return RowTag(text: status.localizedDisplayName(), colors: colors)
        }
    }

    /// "TRỄ HẠN · 3", "HÔM NAY · T7 03/10", "NGÀY MAI · CN 04/10", "HÔM QUA · T6 02/10", "T5 01/10"
    static func sectionTitle(_ section: OrdersSection, now: Date = Date(), timeZone: TimeZone = Date.shopTimeZone,
                             locale: Locale = .current) -> String? {
        let calendar = calendar(timeZone)
        let short: (Date) -> String = { DayFormatter.short($0, timeZone: timeZone, locale: locale) }
        let title: String
        switch section.kind {
        case .plain:
            return nil
        case .late:
            title = "\("Late section".localized()) · \(section.rows.count)"
        case .today:
            title = "\("Today section".localized()) · \(short(now))"
        case .tomorrow:
            let tomorrow = calendar.date(byAdding: .day, value: 1, to: now) ?? now
            title = "\("Tomorrow section".localized()) · \(short(tomorrow))"
        case .day(let day):
            let yesterday = calendar.date(byAdding: .day, value: -1, to: now) ?? now
            if isSameDay(day, now, timeZone: timeZone) {
                title = "\("Today section".localized()) · \(short(day))"
            } else if isSameDay(day, yesterday, timeZone: timeZone) {
                title = "\("orders.v2.yesterday".localized()) · \(short(day))"
            } else {
                title = short(day)
            }
        }
        return title.uppercased(with: locale)
    }

    /// First and last civil day of a date range preset, as the start of each day in `timeZone`
    static func dayBounds(_ range: RentOrdersFilter.DateRange, now: Date = Date(),
                          timeZone: TimeZone = Date.shopTimeZone) -> (start: Date, end: Date)? {
        let calendar = calendar(timeZone)
        let today = calendar.startOfDay(for: now)
        switch range {
        case .any:
            return nil
        case .today:
            return (today, today)
        case .next7Days:
            return (today, calendar.date(byAdding: .day, value: 6, to: today) ?? today)
        case .thisMonth:
            let first = calendar.date(from: calendar.dateComponents([.year, .month], from: today)) ?? today
            let last = calendar.date(byAdding: DateComponents(month: 1, day: -1), to: first) ?? today
            return (first, last)
        case .custom(let from, let to):
            let a = calendar.startOfDay(for: from)
            let b = calendar.startOfDay(for: to)
            return (min(a, b), max(a, b))
        }
    }

    /// The rent list request for a filter
    static func rentQuery(_ filter: RentOrdersFilter, page: Int = 1, now: Date = Date(), timeZone: TimeZone = Date.shopTimeZone) -> OrdersQuery {
        var query = OrdersQuery(keyword: nil, orderType: .rent, status: filter.status, sortBy: filter.sortBy,
                                sortOrder: filter.sortOrder, page: page)
        if let bounds = dayBounds(filter.dateRange, now: now, timeZone: timeZone) {
            query.startDate = bounds.start
            query.endDate = bounds.end
            query.dateField = filter.dateField
        }
        return query
    }

    /// Money is hidden for outlet staff (and Nhân viên kho, #682) when the shop turned on "hide financial data for staff"
    static func hidesMoney(role: Role?, hideForStaff: Bool) -> Bool {
        (role?.isStaffLike ?? false) && hideForStaff
    }
}

// MARK: - Data source (replaceable in tests)

protocol OrdersHomeDataSource {
    func loadTodayWork(completion: @escaping (TodayWork?, NSError?) -> Void)
    func loadOrders(_ query: OrdersQuery, completion: @escaping (OrdersData?, NSError?) -> Void)
}

struct LiveOrdersHomeDataSource: OrdersHomeDataSource {
    func loadTodayWork(completion: @escaping (TodayWork?, NSError?) -> Void) {
        _ = AnalyticsAPIService.shared.loadOutletOperations(completion: completion)
    }

    func loadOrders(_ query: OrdersQuery, completion: @escaping (OrdersData?, NSError?) -> Void) {
        OrderService.shared.loadOrders(productIds: nil, startDate: query.startDate, endDate: query.endDate,
                                       keyword: query.keyword, page: query.page, limit: query.limit,
                                       orderType: query.orderType, sortBy: query.sortBy, sortOrder: query.sortOrder,
                                       status: query.status, dateField: query.dateField) { response, error in
            if let data = response?.data {
                completion(data, nil)
            } else {
                completion(nil, error ?? NSError(domain: "RC", code: -1,
                                                 userInfo: [NSLocalizedDescriptionKey: response?.message ?? "Error"]))
            }
        }
    }
}

// MARK: - View model

final class OrdersHomeViewModel {
    static let pageSize = 20
    /// A quiet refresh reloads at most this many pages in one request (API `limit` ≤ 100)
    static let maxQuietPages = 5

    enum LoadState: Equatable {
        case idle, loading, loaded, failed(String)
    }

    /// One list of the tab: a segment, or the search (#674 freshness)
    enum ListKey: Hashable {
        case segment(OrdersSegment), search
    }

    // Output
    private(set) var segment: OrdersSegment = .today
    private(set) var sections: [OrdersSection] = []
    private(set) var state: LoadState = .idle
    private(set) var todayAvailable = true
    private(set) var filter = RentOrdersFilter()
    private(set) var searchText = ""
    /// Orders matching the current list or search (API `total`); nil for "Việc cần làm"
    private(set) var total: Int?
    /// Red badge of "Việc cần làm", kept while another list shows
    private(set) var todayBadge = 0
    var isSearching: Bool { searchText.count >= OrdersHomeLogic.minSearchLength }
    var onChange: (() -> Void)?

    // Paging of the current list (rent, sale or search)
    private var orders: [Order] = []
    private var page = 1
    private var hasMore = false
    private var isLoadingMore = false
    private var todayWork: TodayWork?
    /// #1375 what the "Thêm widget" card says: the API counts of today's hand-overs, returns and late jobs
    var widgetCounts: (pickup: Int, returns: Int, late: Int)? {
        todayWork.map { ($0.pickupsToday.count, $0.returnsToday.count, $0.noShows.count + $0.overdueReturns.count) }
    }

    /// What each segment showed last (#674): a segment switch shows it at once, then refreshes only when needed
    private struct Snapshot {
        let sections: [OrdersSection]
        let orders: [Order]
        let page: Int
        let hasMore: Bool
        let total: Int?
        let filter: RentOrdersFilter
    }
    private var snapshots: [OrdersSegment: Snapshot] = [:]
    /// Dirty flag and last load time of every list (#674)
    private var trackers: [ListKey: RefreshTracker] = Dictionary(
        uniqueKeysWithValues: (OrdersSegment.allCases.map { ListKey.segment($0) } + [.search]).map { ($0, RefreshTracker()) })

    /// Bumped whenever the list changes meaning (segment, filter, search, refresh). A response carrying an older
    /// generation is dropped, so a slow answer never overwrites the current list.
    private var generation = 0
    private var countGeneration = 0
    private var searchWorkItem: DispatchWorkItem?

    private let dataSource: OrdersHomeDataSource
    private let now: () -> Date
    private let timeZone: () -> TimeZone
    private let searchDelay: TimeInterval

    init(dataSource: OrdersHomeDataSource = LiveOrdersHomeDataSource(),
         now: @escaping () -> Date = Date.init,
         timeZone: @escaping () -> TimeZone = { Date.shopTimeZone },
         searchDelay: TimeInterval = 0.3) {
        self.dataSource = dataSource
        self.now = now
        self.timeZone = timeZone
        self.searchDelay = searchDelay
    }

    // MARK: Freshness (#674)

    var currentKey: ListKey { isSearching ? .search : .segment(segment) }

    /// The current list changed on the server (an order was created or changed) since it was loaded
    var isDirty: Bool { trackers[currentKey]?.isDirty ?? true }

    /// The current list should be reloaded when the screen shows again: dirty, never loaded, or older than 5 minutes
    var needsRefresh: Bool {
        trackers[currentKey]?.shouldReload(now: now(), ttl: RefreshPolicy.listTTL) ?? true
    }

    /// "Orders changed" signal: every list (all segments and the search) is dirty
    func markDirty() {
        for key in trackers.keys { trackers[key]?.markDirty() }
    }

    /// Screen shows again (back from a detail, tab re-selected): reload quietly, keeping rows and scroll, only
    /// when the list is dirty or stale. A failed list retries with its spinner.
    func refreshIfNeeded() {
        switch state {
        case .loading, .idle:
            return
        case .failed:
            reload()
        case .loaded:
            if needsRefresh { reload(quiet: true) }
        }
    }

    // MARK: Input

    func select(_ newSegment: OrdersSegment) {
        guard newSegment != segment || sections.isEmpty else { return }
        segment = newSegment
        showSegment()
    }

    /// The segment's last result at once when there is one, then a quiet refresh if it is dirty or stale;
    /// otherwise a load with the spinner
    private func showSegment() {
        guard !isSearching, let snapshot = snapshots[segment], segment != .rent || snapshot.filter == filter else {
            reload()
            return
        }
        generation += 1 // drop any answer for the list shown before
        searchWorkItem?.cancel()
        sections = snapshot.sections
        orders = snapshot.orders
        page = snapshot.page
        hasMore = snapshot.hasMore
        isLoadingMore = false
        total = snapshot.total
        state = .loaded
        onChange?()
        if needsRefresh { reload(quiet: true) }
    }

    func applyFilter(_ newFilter: RentOrdersFilter) {
        guard newFilter != filter else { return }
        filter = newFilter
        if segment == .rent && !isSearching { reload() }
    }

    /// Status chip of "Tất cả đơn"
    func selectStatus(_ status: OrderStatus?) {
        var next = filter
        next.status = status
        applyFilter(next)
    }

    /// "Xem N đơn" of the filter sheet: the size of the rent list with `candidate`. A newer request drops older answers.
    func count(for candidate: RentOrdersFilter, completion: @escaping (Int?) -> Void) {
        countGeneration += 1
        let current = countGeneration
        dataSource.loadOrders(OrdersHomeLogic.rentQuery(candidate, now: now(), timeZone: timeZone())) { [weak self] data, _ in
            guard let self, current == self.countGeneration else { return }
            completion(data?.total)
        }
    }

    /// Search as you type; waits `searchDelay` after the last change
    func updateSearch(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed != searchText else { return }
        let wasSearching = isSearching
        searchText = trimmed
        searchWorkItem?.cancel()
        if isSearching {
            generation += 1 // drop any answer for the previous text right away
            let work = DispatchWorkItem { [weak self] in self?.reload() }
            searchWorkItem = work
            DispatchQueue.main.asyncAfter(deadline: .now() + searchDelay, execute: work)
        } else if wasSearching {
            showSegment() // back to the segment
        }
    }

    /// Retry, filter or search change, first load: rows cleared and the spinner shows.
    /// `quiet` (pull to refresh, back from a detail, #674): the rows and scroll stay and no spinner shows; the new
    /// answer replaces them, and a failure keeps them. Quiet only applies while a list is on screen.
    func reload(quiet: Bool = false) {
        let keepRows = quiet && state == .loaded
        generation += 1
        let current = generation
        let key = currentKey
        let version = trackers[key]?.begin() ?? 0
        isLoadingMore = false
        if !keepRows {
            orders = []
            page = 1
            hasMore = false
            sections = []
            total = nil
            state = .loading
            onChange?()
        }

        if !isSearching && segment == .today {
            dataSource.loadTodayWork { [weak self] work, error in
                guard let self, current == self.generation else { return }
                if let work {
                    self.todayWork = work
                    self.sections = OrdersHomeLogic.todaySections(from: work)
                    self.todayBadge = OrdersHomeLogic.badgeCount(self.sections)
                    self.state = .loaded
                    self.markLoaded(key, version: version)
                } else if error?.code == 403 {
                    // No dashboard permission: the tab works without "Việc cần làm"
                    self.todayAvailable = false
                    self.segment = .rent
                    self.reload()
                    return
                } else if !keepRows {
                    self.state = .failed(error?.localizedDescription ?? "")
                }
                self.onChange?()
            }
            return
        }
        let pages = keepRows ? min(max(page, 1), Self.maxQuietPages) : 1
        loadPage(1, generation: current, pages: pages, quiet: keepRows, version: version)
    }

    func loadMoreIfNeeded(displayedIndex: Int, total: Int) {
        guard hasMore, !isLoadingMore, state == .loaded, displayedIndex >= total - 5 else { return }
        isLoadingMore = true
        loadPage(page + 1, generation: generation)
    }

    // MARK: Private

    private func query(page: Int) -> OrdersQuery {
        if isSearching {
            return OrdersQuery(keyword: searchText, orderType: nil, status: nil, sortBy: "createdAt", page: page)
        }
        if segment == .sale {
            return OrdersQuery(keyword: nil, orderType: .sale, status: nil, sortBy: "createdAt", page: page)
        }
        return OrdersHomeLogic.rentQuery(filter, page: page, now: now(), timeZone: timeZone())
    }

    /// `pages` > 1 (quiet refresh): page 1 with room for every page already loaded, so the list keeps its length
    private func loadPage(_ pageToLoad: Int, generation current: Int, pages: Int = 1, quiet: Bool = false, version: Int? = nil) {
        var request = query(page: pageToLoad)
        request.limit = Self.pageSize * pages
        let key = currentKey
        dataSource.loadOrders(request) { [weak self] data, error in
            guard let self, current == self.generation else { return }
            self.isLoadingMore = false
            if let data {
                if pageToLoad == 1 {
                    self.orders = data.orders
                } else {
                    let known = Set(self.orders.map(\.id))
                    self.orders += data.orders.filter { !known.contains($0.id) }
                }
                self.page = pageToLoad == 1 ? pages : pageToLoad
                self.hasMore = data.hasMore
                self.total = data.total
                self.sections = self.buildOrderSections()
                self.state = .loaded
                if let version { self.markLoaded(key, version: version) } else { self.saveSnapshot() }
            } else if pageToLoad == 1 && !quiet {
                self.state = .failed(error?.localizedDescription ?? "")
            }
            self.onChange?()
        }
    }

    private func markLoaded(_ key: ListKey, version: Int) {
        trackers[key]?.loaded(version: version, at: now())
        saveSnapshot()
    }

    private func saveSnapshot() {
        guard !isSearching, state == .loaded else { return }
        snapshots[segment] = Snapshot(sections: sections, orders: orders, page: page, hasMore: hasMore, total: total,
                                      filter: filter)
    }

    private func buildOrderSections() -> [OrdersSection] {
        let tz = timeZone()
        let today = now()
        let rows: ([Order]) -> [OrdersRow] = { OrdersHomeLogic.orderRows($0, now: today, timeZone: tz) }
        guard !isSearching, segment == .sale else {
            return orders.isEmpty ? [] : [OrdersSection(kind: .plain, rows: rows(orders))]
        }
        return OrdersHomeLogic.groupByDay(orders, date: { $0.createdAt }, timeZone: tz).map { group in
            OrdersSection(kind: .day(group.day), rows: rows(group.items))
        }
    }
}

