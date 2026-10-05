//
//  OrdersHomeViewModel.swift
//  POS ADBD
//
//  State of the redesigned orders tab (#371): "Việc cần làm", rent orders, sale orders and one search.
//  Its own instance (not OrderListViewModel.shared), so the old screen is untouched.
//

import Foundation
import Alamofire

enum OrdersSegment: Int, CaseIterable {
    case today, rent, sale
}

/// What the counter does with a "Việc cần làm" row
enum WorkKind {
    case handOver, takeBack
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

/// Rent list query: the status chips plus the "Lọc & sắp xếp" sheet (board Loc)
struct RentOrdersFilter: Equatable {
    /// `nearestTask` (#389): late tasks first, then the nearest planned hand-over or return, then closed orders
    enum Sort: CaseIterable { case nearestTask, createdDate, pickupDate, returnDate }
    /// Which date the range applies to: created, or the planned hand-over / return day (#389)
    enum DateBasis: CaseIterable { case created, pickupPlan, returnPlan }
    enum DateRange: Equatable {
        case any, today, next7Days, thisMonth
        case custom(from: Date, to: Date)
    }

    var status: OrderStatus?
    var sort: Sort = .createdDate
    var dateBasis: DateBasis = .created
    var dateRange: DateRange = .any

    /// The sheet part (sort and dates) is untouched
    var isDefault: Bool { sort == .createdDate && dateRange == .any }

    var sortBy: String {
        switch sort {
        case .nearestTask: return "nearestTask"
        case .createdDate: return "createdAt"
        case .pickupDate: return "pickupPlanAt"
        case .returnDate: return "returnPlanAt"
        }
    }

    var dateField: String {
        switch dateBasis {
        case .created: return "createdAt"
        case .pickupPlan: return "pickupPlanAt"
        case .returnPlan: return "returnPlanAt"
        }
    }
}

/// One `GET /api/orders` request of the tab
struct OrdersQuery: Equatable {
    var keyword: String?
    var orderType: OrderType?
    var status: OrderStatus?
    var sortBy = "createdAt"
    var startDate: Date?
    var endDate: Date?
    var dateField: String?
    var page = 1
}

/// Right-hand line under a row total (board Main)
enum PayLine: Equatable {
    case refund(Double), due(Double), paid
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
                         now: Date = Date(), timeZone: TimeZone = .current) -> Int {
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
            + work.overdueReturns.orders.map { OrdersRow.work($0, kind: .takeBack) })
            .sorted { lateDays(of: $0) > lateDays(of: $1) }
        let today = work.pickupsToday.orders.map { OrdersRow.work($0, kind: .handOver) }
            + work.returnsToday.orders.map { OrdersRow.work($0, kind: .takeBack) }
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
    static func groupByDay<T>(_ items: [T], date: (T) -> Date, timeZone: TimeZone = .current) -> [(key: String, day: Date, items: [T])] {
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

    /// Refund first (the counter hands money back), then what is still to collect, else paid in full
    static func payLine(amountDue: Double, refundDue: Double) -> PayLine {
        if refundDue > 0 { return .refund(refundDue) }
        if amountDue > 0 { return .due(amountDue) }
        return .paid
    }

    /// Pay line of a "Tất cả đơn" / search row from the list balances (#390); nil when the API sent neither field
    /// (older server) or the order is cancelled
    static func listPayLine(_ order: Order) -> PayLine? {
        guard order.status != .cancelled else { return nil }
        guard order.listAmountDue != nil || order.listRefundDue != nil else { return nil }
        return payLine(amountDue: order.listAmountDue ?? 0, refundDue: order.listRefundDue ?? 0)
    }

    /// "giao N · trả M" of a band
    static func bandCounts(_ rows: [OrdersRow]) -> (handOver: Int, takeBack: Int) {
        rows.reduce(into: (handOver: 0, takeBack: 0)) { counts, row in
            guard case .work(_, let kind) = row else { return }
            if kind == .handOver { counts.handOver += 1 } else { counts.takeBack += 1 }
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
        String(DayFormatter.short(date, timeZone: timeZone, locale: Locale(identifier: "vi")).suffix(5))
    }

    private static func calendar(_ timeZone: TimeZone) -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        return calendar
    }

    /// Civil days from `from` to `to`, both counted (a same-day rental is 1 day)
    static func inclusiveDays(from: Date, to: Date, timeZone: TimeZone) -> Int {
        let calendar = calendar(timeZone)
        let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: from), to: calendar.startOfDay(for: to)).day ?? 0
        return max(1, days + 1)
    }

    /// "03/10 → 05/10 · 3 ngày"; just the hand-over day without a return day
    static func span(from: Date?, to: Date?, withDays: Bool, timeZone: TimeZone) -> String {
        let start = from.map { dayMonth($0, timeZone: timeZone) } ?? "—"
        guard let to else { return start }
        var text = "\(start) → \(dayMonth(to, timeZone: timeZone))"
        if withDays, let from {
            let days = inclusiveDays(from: from, to: to, timeZone: timeZone)
            text += " · " + PluralText.format("orders.v2.when.days", count: days, days)
        }
        return text
    }

    /// Date line of a "Việc cần làm" row: the missed day on TRỄ HẠN, the rental span otherwise
    static func workWhen(_ row: TodayWorkRow, kind: WorkKind, isLate: Bool,
                         timeZone: TimeZone = .current, locale: Locale = .current) -> String {
        guard isLate else { return span(from: row.pickupPlanAt, to: row.returnPlanAt, withDays: true, timeZone: timeZone) }
        let planned = kind == .handOver ? row.pickupPlanAt : row.returnPlanAt
        let day = planned.map { DayFormatter.short($0, timeZone: timeZone, locale: locale) } ?? "—"
        return String(format: (kind == .handOver ? "orders.v2.when.handOverDue" : "orders.v2.when.returnDue").localized(), day)
    }

    private static func isSameDay(_ a: Date, _ b: Date, timeZone: TimeZone) -> Bool {
        DayFormatter.key(a, timeZone: timeZone) == DayFormatter.key(b, timeZone: timeZone)
    }

    /// Date line of a "Tất cả đơn" row: "tạo hôm nay · 05/10 → 07/10", "tạo 28/09 · hạn 02/10", "tạo 28/09 · huỷ 29/09"
    static func listWhen(_ order: Order, lateDays: Int, now: Date = Date(), timeZone: TimeZone = .current) -> String {
        let created = isSameDay(order.createdAt, now, timeZone: timeZone)
            ? "orders.v2.when.createdToday".localized()
            : String(format: "orders.v2.when.created".localized(), dayMonth(order.createdAt, timeZone: timeZone))
        let tail: String?
        if order.status == .cancelled {
            tail = String(format: "orders.v2.when.cancelled".localized(), dayMonth(order.updatedAt, timeZone: timeZone))
        } else if order.orderType == .rent && order.status == .pickuped && lateDays > 0, let due = order.returnPlanAt {
            tail = String(format: "orders.v2.when.due".localized(), dayMonth(due, timeZone: timeZone))
        } else if order.orderType == .rent {
            tail = span(from: order.pickupPlanAt, to: order.returnPlanAt, withDays: false, timeZone: timeZone)
        } else {
            tail = nil
        }
        return [created, tail].compactMap { $0 }.joined(separator: " · ")
    }

    /// Date line of a search result (board VL-tim): "hạn 01/10", "trả T3 06/10", "bán T6 02/10", "27/09 → 28/09"
    static func searchWhen(_ order: Order, lateDays: Int, timeZone: TimeZone = .current, locale: Locale = .current) -> String {
        if order.orderType == .sale {
            return String(format: "orders.v2.when.sold".localized(), DayFormatter.short(order.createdAt, timeZone: timeZone, locale: locale))
        }
        switch order.status {
        case .cancelled:
            return String(format: "orders.v2.when.cancelled".localized(), dayMonth(order.updatedAt, timeZone: timeZone))
        case .pickuped where lateDays > 0:
            return String(format: "orders.v2.when.due".localized(), order.returnPlanAt.map { dayMonth($0, timeZone: timeZone) } ?? "—")
        case .pickuped:
            return String(format: "orders.v2.when.returns".localized(),
                          order.returnPlanAt.map { DayFormatter.short($0, timeZone: timeZone, locale: locale) } ?? "—")
        default:
            return span(from: order.pickupPlanAt, to: order.returnPlanAt, withDays: false, timeZone: timeZone)
        }
    }

    /// Status tag in the board colours; a sale in search reads "Bán · Hoàn thành"
    static func statusTag(_ order: Order, inSearch: Bool = false) -> RowTag {
        let base: RowTag
        switch order.status {
        case .reserved: base = RowTag(text: "orders.v2.status.reserved".localized(), colors: DS.Status.handOver)
        case .pickuped: base = RowTag(text: "orders.v2.status.renting".localized(), colors: DS.Status.returning)
        case .returned: base = RowTag(text: "orders.v2.status.returned".localized(), colors: DS.Status.done)
        case .completed: base = RowTag(text: "orders.v2.status.completed".localized(), colors: DS.Status.done)
        case .cancelled: base = RowTag(text: "orders.v2.status.cancelled".localized(), colors: DS.Status.cancelled)
        default: base = RowTag(text: order.status.localizedDisplayName(), colors: DS.Status.cancelled)
        }
        guard inSearch, order.orderType == .sale else { return base }
        return RowTag(text: String(format: "orders.v2.tag.sale".localized(), base.text), colors: base.colors)
    }

    /// "TRỄ HẠN · 3", "HÔM NAY · T7 03/10", "NGÀY MAI · CN 04/10", "HÔM QUA · T6 02/10", "T5 01/10"
    static func sectionTitle(_ section: OrdersSection, now: Date = Date(), timeZone: TimeZone = .current,
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
                          timeZone: TimeZone = .current) -> (start: Date, end: Date)? {
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
    static func rentQuery(_ filter: RentOrdersFilter, page: Int = 1, now: Date = Date(), timeZone: TimeZone = .current) -> OrdersQuery {
        var query = OrdersQuery(keyword: nil, orderType: .rent, status: filter.status, sortBy: filter.sortBy, page: page)
        if let bounds = dayBounds(filter.dateRange, now: now, timeZone: timeZone) {
            query.startDate = bounds.start
            query.endDate = bounds.end
            query.dateField = filter.dateField
        }
        return query
    }

    /// Money is hidden for outlet staff when the shop turned on "hide financial data for staff"
    static func hidesMoney(role: Role?, hideForStaff: Bool) -> Bool {
        role == .outletStaff && hideForStaff
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
                                       keyword: query.keyword, page: query.page, limit: OrdersHomeViewModel.pageSize,
                                       orderType: query.orderType, sortBy: query.sortBy, sortOrder: "desc",
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

    enum LoadState: Equatable {
        case idle, loading, loaded, failed(String)
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
         timeZone: @escaping () -> TimeZone = { .current },
         searchDelay: TimeInterval = 0.3) {
        self.dataSource = dataSource
        self.now = now
        self.timeZone = timeZone
        self.searchDelay = searchDelay
    }

    // MARK: Input

    func select(_ newSegment: OrdersSegment) {
        guard newSegment != segment || sections.isEmpty else { return }
        segment = newSegment
        reload()
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
            reload() // back to the segment
        }
    }

    /// Pull to refresh, coming back from a detail, or retry
    func reload() {
        generation += 1
        let current = generation
        orders = []
        page = 1
        hasMore = false
        isLoadingMore = false
        sections = []
        total = nil
        state = .loading
        onChange?()

        if !isSearching && segment == .today {
            dataSource.loadTodayWork { [weak self] work, error in
                guard let self, current == self.generation else { return }
                if let work {
                    self.todayWork = work
                    self.sections = OrdersHomeLogic.todaySections(from: work)
                    self.todayBadge = OrdersHomeLogic.badgeCount(self.sections)
                    self.state = .loaded
                } else if error?.code == 403 {
                    // No dashboard permission: the tab works without "Việc cần làm"
                    self.todayAvailable = false
                    self.segment = .rent
                    self.reload()
                    return
                } else {
                    self.state = .failed(error?.localizedDescription ?? "")
                }
                self.onChange?()
            }
            return
        }
        loadPage(1, generation: current)
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

    private func loadPage(_ pageToLoad: Int, generation current: Int) {
        dataSource.loadOrders(query(page: pageToLoad)) { [weak self] data, error in
            guard let self, current == self.generation else { return }
            self.isLoadingMore = false
            if let data {
                let known = Set(self.orders.map(\.id))
                self.orders += data.orders.filter { !known.contains($0.id) }
                self.page = pageToLoad
                self.hasMore = data.hasMore
                self.total = data.total
                self.sections = self.buildOrderSections()
                self.state = .loaded
            } else if pageToLoad == 1 {
                self.state = .failed(error?.localizedDescription ?? "")
            }
            self.onChange?()
        }
    }

    private func buildOrderSections() -> [OrdersSection] {
        let tz = timeZone()
        let today = now()
        let rows: (Order) -> OrdersRow = { order in
            .order(order, lateDays: OrdersHomeLogic.lateDays(orderType: order.orderType, status: order.status,
                                                            pickupPlanAt: order.pickupPlanAt, returnPlanAt: order.returnPlanAt,
                                                            now: today, timeZone: tz))
        }
        guard !isSearching, segment == .sale else {
            return orders.isEmpty ? [] : [OrdersSection(kind: .plain, rows: orders.map(rows))]
        }
        return OrdersHomeLogic.groupByDay(orders, date: { $0.createdAt }, timeZone: tz).map { group in
            OrdersSection(kind: .day(group.day), rows: group.items.map(rows))
        }
    }
}

extension Order {
    /// "Áo dài trắng ×2, Cà vạt lụa" (board rows)
    var itemsSummary: String {
        orderItems.compactMap { item -> String? in
            guard !item.productName.isEmpty else { return nil }
            return item.quantity > 1 ? "\(item.productName) ×\(item.quantity)" : item.productName
        }.joined(separator: ", ")
    }
}
