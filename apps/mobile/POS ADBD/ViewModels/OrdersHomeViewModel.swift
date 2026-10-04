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
    let title: String?
    let style: Style
    let rows: [OrdersRow]
}

/// Rent list filter (sheet)
struct RentOrdersFilter: Equatable {
    enum Sort: Equatable { case pickupDate, createdDate }
    var status: OrderStatus?
    var sort: Sort = .pickupDate

    var isDefault: Bool { status == nil && sort == .pickupDate }
    var sortBy: String { sort == .pickupDate ? "pickupPlanAt" : "createdAt" }
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
            OrdersSection(title: "Late section".localized(), style: .late, rows: late),
            OrdersSection(title: "Today section".localized(), style: .normal, rows: today),
            OrdersSection(title: "Tomorrow section".localized(), style: .normal, rows: tomorrow),
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

    /// Money is hidden for outlet staff when the shop turned on "hide financial data for staff"
    static func hidesMoney(role: Role?, hideForStaff: Bool) -> Bool {
        role == .outletStaff && hideForStaff
    }
}

// MARK: - Data source (replaceable in tests)

protocol OrdersHomeDataSource {
    func loadTodayWork(completion: @escaping (TodayWork?, NSError?) -> Void)
    func loadOrders(keyword: String?, orderType: OrderType?, status: OrderStatus?, sortBy: String, page: Int,
                    completion: @escaping (OrdersData?, NSError?) -> Void)
}

struct LiveOrdersHomeDataSource: OrdersHomeDataSource {
    func loadTodayWork(completion: @escaping (TodayWork?, NSError?) -> Void) {
        _ = AnalyticsAPIService.shared.loadOutletOperations(completion: completion)
    }

    func loadOrders(keyword: String?, orderType: OrderType?, status: OrderStatus?, sortBy: String, page: Int,
                    completion: @escaping (OrdersData?, NSError?) -> Void) {
        OrderService.shared.loadOrders(productIds: nil, keyword: keyword, page: page, limit: OrdersHomeViewModel.pageSize,
                                       orderType: orderType, sortBy: sortBy, sortOrder: "desc", status: status) { response, error in
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
        filter = newFilter
        if segment == .rent && !isSearching { reload() }
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
        state = .loading
        onChange?()

        if !isSearching && segment == .today {
            dataSource.loadTodayWork { [weak self] work, error in
                guard let self, current == self.generation else { return }
                if let work {
                    self.todayWork = work
                    self.sections = OrdersHomeLogic.todaySections(from: work)
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

    private func loadPage(_ pageToLoad: Int, generation current: Int) {
        let keyword = isSearching ? searchText : nil
        let orderType: OrderType? = isSearching ? nil : (segment == .sale ? .sale : .rent)
        let status = (!isSearching && segment == .rent) ? filter.status : nil
        let sortBy = (!isSearching && segment == .rent) ? filter.sortBy : "createdAt"

        dataSource.loadOrders(keyword: keyword, orderType: orderType, status: status, sortBy: sortBy, page: pageToLoad) { [weak self] data, error in
            guard let self, current == self.generation else { return }
            self.isLoadingMore = false
            if let data {
                let known = Set(self.orders.map(\.id))
                self.orders += data.orders.filter { !known.contains($0.id) }
                self.page = pageToLoad
                self.hasMore = data.hasMore
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
            return orders.isEmpty ? [] : [OrdersSection(title: nil, style: .normal, rows: orders.map(rows))]
        }
        return OrdersHomeLogic.groupByDay(orders, date: { $0.createdAt }, timeZone: tz).map { group in
            OrdersSection(title: DayFormatter.short(group.day, timeZone: tz), style: .normal, rows: group.items.map(rows))
        }
    }
}
