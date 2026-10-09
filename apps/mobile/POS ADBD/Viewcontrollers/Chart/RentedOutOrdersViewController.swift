//
//  RentedOutOrdersViewController.swift
//  POS ADBD
//
//  "Đang cho thuê" (#484, board DT-dang-thue), opened from the overview figures Đang cho thuê, Đang thuê · trễ hạn
//  trả and Thế chấp đang giữ. No header card: back + "Đang cho thuê · N", then TRỄ HẠN TRẢ · n (red band) and
//  CÒN HẠN · n, each by return day, nearest first. Rows are the Orders tab row; a tap opens the order.
//  Data: GET /api/orders?status=PICKUPED&orderType=RENT sorted by returnPlanAt, every page.
//  #496: the same screen lists "Chưa lấy đồ · N" (board DT-chua-lay): RESERVED rentals sorted by pickupPlanAt,
//  QUÁ NGÀY LẤY, CHƯA THU · n (red band, pickup day before today) and SẼ THU KHI KHÁCH LẤY ĐỒ · n.
//

import UIKit
import SnapKit

/// Rent orders out now, split by their return day against today (Vietnam civil days)
enum RentedOutLogic {
    /// Late (return day before today) and not late, each by return day ascending (no return day last)
    static func groups(_ orders: [Order], now: Date = Date(),
                       timeZone: TimeZone = Date.shopTimeZone) -> (late: [Order], onTime: [Order]) {
        let out = orders.filter { $0.orderType == .rent && $0.status == .pickuped }
        let sorted = out.enumerated().sorted { a, b in
            switch (a.element.returnPlanAt, b.element.returnPlanAt) {
            case let (x?, y?) where x != y: return x < y
            case (nil, _?): return false
            case (_?, nil): return true
            default: return a.offset < b.offset
            }
        }.map(\.element)
        var late: [Order] = []
        var onTime: [Order] = []
        for order in sorted {
            let days = OrdersHomeLogic.lateDays(orderType: order.orderType, status: order.status,
                                                pickupPlanAt: order.pickupPlanAt, returnPlanAt: order.returnPlanAt,
                                                now: now, timeZone: timeZone)
            if days > 0 { late.append(order) } else { onTime.append(order) }
        }
        return (late, onTime)
    }
}

/// Rent orders still reserved (#496 "Chưa lấy đồ"), split at the start of today's Vietnam civil day
enum NotPickedUpLogic {
    /// What the order still owes, as the Overview tile counts it (packages/utils/src/analytics/order-value.ts):
    /// rent RESERVED owes total - deposit, a sale not COMPLETED owes its total, anything else owes nothing
    static func owed(_ order: Order) -> Double {
        switch (order.orderType, order.status) {
        case (.rent, .reserved): return max(0, order.totalAmount - order.depositAmount)
        case (.sale, let status) where status != .completed && status != .cancelled: return order.totalAmount
        default: return 0
        }
    }

    /// Pickup day before today (overdue, with its days) and the others, each by pickup day ascending
    /// (no pickup day last, with the others)
    static func groups(_ orders: [Order], now: Date = Date(),
                       timeZone: TimeZone = Date.shopTimeZone) -> (overdue: [Order], upcoming: [Order]) {
        let reserved = orders.filter { $0.orderType == .rent && $0.status == .reserved }
        let sorted = reserved.enumerated().sorted { a, b in
            switch (a.element.pickupPlanAt, b.element.pickupPlanAt) {
            case let (x?, y?) where x != y: return x < y
            case (nil, _?): return false
            case (_?, nil): return true
            default: return a.offset < b.offset
            }
        }.map(\.element)
        var overdue: [Order] = []
        var upcoming: [Order] = []
        for order in sorted {
            if overdueDays(order, now: now, timeZone: timeZone) > 0 { overdue.append(order) } else { upcoming.append(order) }
        }
        return (overdue, upcoming)
    }

    /// Civil days from the pickup day to today (0 when the pickup day is today, later, or unknown)
    static func overdueDays(_ order: Order, now: Date = Date(), timeZone: TimeZone = Date.shopTimeZone) -> Int {
        OrdersHomeLogic.lateDays(orderType: order.orderType, status: order.status, pickupPlanAt: order.pickupPlanAt,
                                 returnPlanAt: order.returnPlanAt, now: now, timeZone: timeZone)
    }
}

final class RentedOutOrdersViewController: BaseViewControler {
    /// What the screen lists: rentals out now (#484) or rentals not picked up yet (#496)
    enum Mode: Equatable {
        case rentedOut(startsAtLate: Bool)
        case notPickedUp
    }

    /// `late` is TRỄ HẠN TRẢ / QUÁ NGÀY LẤY, `onTime` CÒN HẠN / SẼ THU KHI KHÁCH LẤY ĐỒ
    private enum SectionKind { case late, onTime }

    private static let pageSize = 100
    /// Safety stop: 20 pages of 100 rentals
    private static let maxPages = 20

    private let mode: Mode
    private var startsAtLate: Bool {
        if case .rentedOut(let startsAtLate) = mode { return startsAtLate }
        return false
    }
    private var orders: [Order] = []
    private var sections: [(kind: SectionKind, orders: [Order])] = []
    private var isLoading = false
    private var didInitialScroll = false
    private var generation = 0
    /// #674: back from a detail reloads (quietly) only when an order changed or the list is 5 minutes old
    private var freshness = RefreshTracker()
    private var loadVersion = 0
    private var isQuietLoad = false

    private let titleLabel = V2.label("overview.v2.rentedOut".localized(), size: 20, weight: .bold)
    private let emptyLabel = V2.label("rentedOut.empty".localized(), size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
    private let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)
    private let refresh = UIRefreshControl()
    private var hidesMoney: Bool {
        OrdersHomeLogic.hidesMoney(role: User.current()?.role, hideForStaff: Utils.shouldHideFinancialDataForStaff())
    }

    private lazy var ordersTableView: UITableView = {
        let table = UITableView(frame: .zero, style: .plain)
        table.delegate = self
        table.dataSource = self
        table.register(OrderRowCell.self, forCellReuseIdentifier: OrderRowCell.reuseId)
        table.backgroundColor = DS.Color.surface
        table.separatorStyle = .none
        table.rowHeight = UITableViewAutomaticDimension
        table.estimatedRowHeight = 118
        table.tableFooterView = UIView(frame: .zero)
        if #available(iOS 15.0, *) {
            table.sectionHeaderTopPadding = 0
        }
        table.refreshControl = refresh
        return table
    }()

    /// `startsAtLate`: opened from "Đang thuê · trễ hạn trả"; the list opens at the late group (the whole list stays)
    init(startsAtLate: Bool = false) {
        self.mode = .rentedOut(startsAtLate: startsAtLate)
        self.outstandingPeriod = nil
        super.init(nibName: nil, bundle: nil)
    }

    /// "Còn phải thu" of a period: the orders created on its days that still owe money (the same orders as the tile)
    private let outstandingPeriod: (start: Date?, end: Date?)?

    init(mode: Mode, outstandingPeriod: (start: Date?, end: Date?)? = nil) {
        self.mode = mode
        self.outstandingPeriod = outstandingPeriod
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        NotificationCenter.default.addObserver(self, selector: #selector(ordersChanged), name: OrdersChangeSignal.name, object: nil)
        load()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        refreshIfNeeded()
    }

    private func refreshIfNeeded() {
        guard !isLoading, freshness.shouldReload(now: Date(), ttl: RefreshPolicy.listTTL) else { return }
        load(quiet: true)
    }

    @objc private func ordersChanged() {
        freshness.markDirty()
        if isViewLoaded, view.window != nil { refreshIfNeeded() }
    }

    override func setupUI() {
        view.backgroundColor = DS.Color.surface
        if mode == .notPickedUp {
            titleLabel.text = "notPickedUp.title.plain".localized()
            emptyLabel.text = "notPickedUp.empty".localized()
        }
        let back = CustomersV2UI.iconButton("chevron.left", label: "Back".localized(), size: DS.Icon.lg)
        back.addTarget(self, action: #selector(close), for: .touchUpInside)
        titleLabel.accessibilityTraits = UIAccessibilityTraitHeader
        let header = UIStackView(arrangedSubviews: [back, titleLabel])
        header.alignment = .center
        header.spacing = 4
        let headerLine = V2.divider()
        headerLine.backgroundColor = DS.Color.border

        emptyLabel.textAlignment = .center
        emptyLabel.isHidden = true
        refresh.addTarget(self, action: #selector(pulled), for: .valueChanged)

        [header, headerLine, ordersTableView, emptyLabel, spinner].forEach(view.addSubview)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(8)
            make.leading.trailing.equalToSuperview().inset(8)
        }
        headerLine.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom).offset(4)
            make.leading.trailing.equalToSuperview()
        }
        ordersTableView.snp.makeConstraints { make in
            make.top.equalTo(headerLine.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
        emptyLabel.snp.makeConstraints { make in
            make.center.equalTo(ordersTableView)
            make.leading.trailing.equalToSuperview().inset(32)
        }
        spinner.snp.makeConstraints { make in make.center.equalTo(ordersTableView) }
    }

    @objc private func close() {
        if let nav = navigationController, nav.viewControllers.count > 1 {
            nav.popViewController(animated: true)
        } else {
            dismiss(animated: true)
        }
    }

    @objc private func pulled() { load() }

    // MARK: - Data

    /// The spinner shows only while the list is empty; `quiet` (appear, pull) also hides a failure while rows stay
    private func load(quiet: Bool = false) {
        generation += 1
        let token = generation
        loadVersion = freshness.begin()
        isQuietLoad = quiet && !orders.isEmpty
        isLoading = true
        if orders.isEmpty && !refresh.isRefreshing { spinner.startAnimating() }
        emptyLabel.isHidden = true
        loadPage(1, collected: [], token: token)
    }

    private func loadPage(_ page: Int, collected: [Order], token: Int) {
        let completion: (OrdersResponse?, NSError?) -> Void = { [weak self] response, error in
            DispatchQueue.main.async {
                guard let self, token == self.generation else { return }
                if let error, response == nil {
                    self.finish(collected, error: collected.isEmpty ? error : nil)
                    return
                }
                // "Còn phải thu" keeps only the orders that still owe money, as the tile counts them
                let rawOrders = response?.data?.orders ?? []
                let pageOrders = rawOrders.filter { self.outstandingPeriod == nil || NotPickedUpLogic.owed($0) > 0 }
                let all = collected + pageOrders
                // Paging follows the server's pages, not the filtered rows (a page can be all paid)
                if response?.data?.hasMore == true, !rawOrders.isEmpty, page < RentedOutOrdersViewController.maxPages {
                    self.loadPage(page + 1, collected: all, token: token)
                } else {
                    self.finish(all, error: nil)
                }
            }
        }
        if let period = outstandingPeriod {
            OrderService.shared.loadOrders(
                from: nil, productIds: nil, productId: nil, customerId: nil,
                startDate: period.start, endDate: period.end, keyword: nil,
                page: page, limit: RentedOutOrdersViewController.pageSize,
                orderType: nil, sortBy: "pickupPlanAt", sortOrder: "asc",
                status: .reserved, dateField: "createdAt", completion: completion)
        } else {
            OrderService.shared.loadOrders(
                productIds: nil,
                keyword: nil,
                page: page,
                limit: RentedOutOrdersViewController.pageSize,
                orderType: .rent,
                sortBy: mode == .notPickedUp ? "pickupPlanAt" : "returnPlanAt",
                sortOrder: "asc",
                status: mode == .notPickedUp ? .reserved : .pickuped,
                completion: completion)
        }
    }

    private func finish(_ loaded: [Order], error: NSError?) {
        isLoading = false
        spinner.stopAnimating()
        refresh.endRefreshing()
        if let error {
            if !isQuietLoad { UIAlertController.errorAlert(parent: self, error: error) }
        } else {
            orders = loaded
            freshness.loaded(version: loadVersion, at: Date())
        }
        render()
    }

    private func render() {
        let groups: (late: [Order], onTime: [Order])
        if mode == .notPickedUp {
            let split = NotPickedUpLogic.groups(orders)
            groups = (split.overdue, split.upcoming)
        } else {
            groups = RentedOutLogic.groups(orders)
        }
        sections = []
        if !groups.late.isEmpty { sections.append((.late, groups.late)) }
        if !groups.onTime.isEmpty { sections.append((.onTime, groups.onTime)) }
        let total = groups.late.count + groups.onTime.count
        titleLabel.text = String(format: (mode == .notPickedUp ? "notPickedUp.title" : "rentedOut.title").localized(), total)
        emptyLabel.isHidden = total > 0 || isLoading
        ordersTableView.reloadData()

        // From "trễ hạn trả": open at the late group (it comes first, so this keeps the top in view)
        if startsAtLate, !didInitialScroll, let index = sections.firstIndex(where: { $0.kind == .late }) {
            didInitialScroll = true
            ordersTableView.layoutIfNeeded()
            ordersTableView.scrollToRow(at: IndexPath(row: 0, section: index), at: .top, animated: false)
        }
    }

    private func headerTitle(_ section: (kind: SectionKind, orders: [Order])) -> String {
        let notPickedUp = mode == .notPickedUp
        switch section.kind {
        case .late:
            return String(format: (notPickedUp ? "notPickedUp.section.overdue" : "rentedOut.section.late").localized(),
                          section.orders.count)
        case .onTime:
            return String(format: (notPickedUp ? "notPickedUp.section.upcoming" : "rentedOut.section.onTime").localized(),
                          section.orders.count)
        }
    }
}

extension RentedOutOrdersViewController: UITableViewDataSource, UITableViewDelegate {
    func numberOfSections(in tableView: UITableView) -> Int {
        sections.count
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        sections[section].orders.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: OrderRowCell.reuseId, for: indexPath) as! OrderRowCell
        let order = sections[indexPath.section].orders[indexPath.row]
        let row = OrdersHomeLogic.orderRows([order], timeZone: Date.shopTimeZone)[0]
        cell.configure(row, context: mode == .notPickedUp ? .notPickedUp : .list, hidesMoney: hidesMoney)
        return cell
    }

    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? {
        let item = sections[section]
        let isLate = item.kind == .late
        let band = UIView()
        band.backgroundColor = isLate ? UIColor(hexString: "FEF2F2") : V2.sectionFill
        let label = UILabel()
        label.attributedText = NSAttributedString(string: headerTitle(item).uppercased(), attributes: [
            NSAttributedString.Key.kern: 0.56,
            NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.secondary),
            NSAttributedString.Key.foregroundColor: isLate ? V2.danger : UIColor(hexString: "334155"),
        ])
        label.accessibilityTraits = UIAccessibilityTraitHeader
        band.addSubview(label)
        label.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(10)
            make.bottom.equalToSuperview().offset(-6)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
        let line = V2.divider()
        band.addSubview(line)
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        return band
    }

    func tableView(_ tableView: UITableView, heightForHeaderInSection section: Int) -> CGFloat {
        UITableViewAutomaticDimension
    }

    func tableView(_ tableView: UITableView, estimatedHeightForHeaderInSection section: Int) -> CGFloat {
        36
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let order = sections[indexPath.section].orders[indexPath.row]
        showProgressText(text: "Loading...".localized(), navigationController: navigationController)
        OrderService.shared.loadOrderDetail(orderId: order.id) { [weak self] orderDetail, error in
            DispatchQueue.main.async {
                self?.hideProgress(navigationController: self?.navigationController)
                if let error = error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                guard let detail = orderDetail else { return }
                let preview = OrderDetailRouter.detailController(for: Order.from(detail: detail), delegate: nil)
                self?.navigationController?.pushViewController(preview, animated: true)
            }
        }
    }
}

// MARK: - #708 Xem các đơn liên quan

/// The orders behind an Overview tile, each with the money it adds to the tile, and their total at the bottom
/// (it equals the tile). Rows come from GET /api/analytics/income/orders for the tile's buckets.
final class OverviewRelatedOrdersViewController: UIViewController, UITableViewDataSource, UITableViewDelegate {
    private static let pageSize = 200
    private static let maxPages = 25

    private let kind: OverviewRelatedKind
    private let titleText: String
    private let periodText: String
    private let startDate: Date?
    private let endDate: Date?
    private var rows: [OverviewRelatedRow] = []
    private let table = UITableView(frame: .zero, style: .plain)
    private let totalLabel = UILabel()
    private let spinner = UIActivityIndicatorView(activityIndicatorStyle: .gray)
    private let emptyLabel = UILabel()

    init(kind: OverviewRelatedKind, title: String, period: String, startDate: Date?, endDate: Date?) {
        self.kind = kind
        self.titleText = title
        self.periodText = period
        self.startDate = startDate
        self.endDate = endDate
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface
        let back = CustomersV2UI.iconButton("chevron.left", label: "Back".localized(), size: DS.Icon.lg)
        back.addTarget(self, action: #selector(close), for: .touchUpInside)
        let title = V2.label(titleText, size: DS.TextSize.name, weight: .bold)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        let period = V2.label(periodText, size: DS.TextSize.secondary, color: DS.Color.textMuted)
        let titles = UIStackView(arrangedSubviews: [title, period])
        titles.axis = .vertical
        let header = UIStackView(arrangedSubviews: [back, titles])
        header.alignment = .center
        header.spacing = 4

        totalLabel.font = Utils.boldFont(size: DS.TextSize.body)
        totalLabel.textColor = DS.Color.text
        totalLabel.numberOfLines = 0
        totalLabel.accessibilityIdentifier = "related.total"
        let footer = UIView()
        footer.backgroundColor = V2.sectionFill
        footer.addSubview(totalLabel)
        totalLabel.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16)) }

        table.dataSource = self
        table.delegate = self
        table.rowHeight = UITableViewAutomaticDimension
        table.estimatedRowHeight = 64
        table.tableFooterView = UIView()
        emptyLabel.text = "overview.related.empty".localized()
        emptyLabel.textColor = DS.Color.textMuted
        emptyLabel.textAlignment = .center
        emptyLabel.isHidden = true

        [header, table, footer, emptyLabel, spinner].forEach(view.addSubview)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(8)
            make.leading.trailing.equalToSuperview().inset(8)
        }
        footer.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(view.safeAreaLayoutGuide)
        }
        table.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom).offset(8)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(footer.snp.top)
        }
        emptyLabel.snp.makeConstraints { make in make.center.equalTo(table) }
        spinner.snp.makeConstraints { make in make.center.equalTo(table) }
        load()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    @objc private func close() { navigationController?.popViewController(animated: true) }

    private func load() {
        spinner.startAnimating()
        var collected: [OverviewRelatedRow] = []
        let group = DispatchGroup()
        for bucket in kind.buckets {
            group.enter()
            loadBucket(bucket, offset: 0, page: 1) { rows in
                collected += rows
                group.leave()
            }
        }
        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            self.spinner.stopAnimating()
            self.rows = collected
            self.emptyLabel.isHidden = !collected.isEmpty
            let total = MoneyFormatter.format(OverviewDashLogic.relatedTotal(collected))
            self.totalLabel.text = "\("overview.related.total".localized()) · \(collected.count): \(total)"
            self.table.reloadData()
        }
    }

    /// Every page of one bucket (the list total must equal the tile, so nothing is left unloaded)
    private func loadBucket(_ bucket: String, offset: Int, page: Int, done: @escaping ([OverviewRelatedRow]) -> Void) {
        AnalyticsAPIService.shared.loadIncomeOrders(startDate: startDate, endDate: endDate, status: bucket, plan: false,
                                                    limit: Self.pageSize, offset: offset) { [weak self] data, _ in
            guard let self else { return done([]) }
            let items = data?.days?.flatMap { $0.orders ?? [] } ?? []
            let rows = OverviewDashLogic.relatedRows(self.kind, bucket: bucket, items: items)
            if data?.pagination?.hasMore == true, !items.isEmpty, page < Self.maxPages {
                self.loadBucket(bucket, offset: offset + Self.pageSize, page: page + 1) { more in done(rows + more) }
            } else {
                done(rows)
            }
        }
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { rows.count }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "related") ?? UITableViewCell(style: .subtitle, reuseIdentifier: "related")
        let row = rows[indexPath.row]
        cell.textLabel?.text = [row.orderNumber, row.customer].filter { !$0.isEmpty }.joined(separator: " · ")
        cell.textLabel?.font = Utils.mediumFont(size: DS.TextSize.body)
        cell.detailTextLabel?.text = row.detail
        cell.detailTextLabel?.textColor = DS.Color.textMuted
        let amount = UILabel()
        amount.font = Utils.boldFont(size: DS.TextSize.body)
        amount.textColor = row.amount < 0 ? V2.danger : DS.Color.text
        amount.text = (row.amount > 0 && kind != .orderValue ? "+" : "") + MoneyFormatter.format(row.amount)
        amount.sizeToFit()
        cell.accessoryView = amount
        cell.accessibilityLabel = "\(row.orderNumber), \(row.detail), \(amount.text ?? "")"
        cell.accessibilityIdentifier = "related.row"
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let detail = OrderDetailViewController(orderId: rows[indexPath.row].orderId)
        detail.hidesBottomBarWhenPushed = true
        navigationController?.pushViewController(detail, animated: true)
    }
}
