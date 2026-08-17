//
//  OverviewRankingOrdersViewController.swift
//  POS ADBD
//

import UIKit
import SnapKit

enum OverviewSnapshotKind {
    case newOrders
    case pickup
    case returned
    case cancelled

    /// Snapshot tiles count events in the period, not the order's current status.
    var dateField: String {
        switch self {
        case .newOrders: return "createdAt"
        case .pickup: return "pickedUpAt"
        case .returned: return "returnedAt"
        case .cancelled: return "updatedAt"
        }
    }

    var status: OrderStatus? {
        switch self {
        case .cancelled: return .cancelled
        case .newOrders, .pickup, .returned: return nil
        }
    }

    /// GET /api/analytics/income/orders — same buckets as operational snapshot counts.
    var incomeOrdersStatus: String {
        switch self {
        case .newOrders: return "new"
        case .pickup: return "pickup"
        case .returned: return "return"
        case .cancelled: return "cancelled"
        }
    }
}

enum OverviewRankingOrdersFilter {
    case customer(id: Int, name: String)
    case product(id: Int, name: String)
    case snapshot(OverviewSnapshotKind, title: String)

    var navigationTitle: String {
        switch self {
        case .customer:
            return "Orders by customer".localized()
        case .product:
            return "Orders by product".localized()
        case .snapshot(_, let title):
            return title
        }
    }

    var entityName: String {
        switch self {
        case .customer(_, let name), .product(_, let name):
            return name
        case .snapshot(_, let title):
            return title
        }
    }

    var customerId: Int? {
        if case .customer(let id, _) = self { return id }
        return nil
    }
}

final class OverviewRankingOrdersViewController: BaseViewControler {

    private let filter: OverviewRankingOrdersFilter
    private let startDate: Date?
    private let endDate: Date?
    private let periodSubtitle: String

    /// Loyalty / name snapshot — seeded from Customer list, refreshed from dedicated API.
    private var customer: Customer?

    private var orders: [Order] = []
    private var currentPage = 1
    private var hasMorePages = true
    private var isLoading = false
    private var totalOrderCount = 0
    /// Prefer API `summary.totalAmount` (all matching orders); fall back to loaded pages.
    private var summaryAmountTotal: Double?
    private var loadedAmountTotal: Double = 0

    private lazy var ordersTableView: UITableView = {
        let isIPad = UIDevice.current.userInterfaceIdiom == .pad
        let table = UITableView(frame: .zero, style: .plain)
        table.delegate = self
        table.dataSource = self
        // Same order card cell as the main Orders tab (SaleDetailCell_Option5).
        table.register(SaleDetailCell_Option5.self, forCellReuseIdentifier: "SaleDetailCell")
        table.backgroundColor = .backgroundPrimary
        table.separatorStyle = .none
        table.rowHeight = UITableViewAutomaticDimension
        table.estimatedRowHeight = isIPad ? 132 : 118
        table.contentInset = UIEdgeInsets(top: 4, left: 0, bottom: 18, right: 0)
        table.tableFooterView = UIView(frame: .zero)
        if #available(iOS 15.0, *) {
            table.sectionHeaderTopPadding = 0
        }
        return table
    }()

    private let headerCard = UIView()
    private let entityLabel = UILabel()
    private let periodLabel = UILabel()
    private let summaryLabel = UILabel()
    private let emptyStateLabel = UILabel()

    private lazy var tierIconImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.setContentHuggingPriority(.required, for: .horizontal)
        return imageView
    }()

    private lazy var tierNameLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 12)
        label.numberOfLines = 1
        label.setContentHuggingPriority(.required, for: .horizontal)
        return label
    }()

    private lazy var tierPillStack: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [tierIconImageView, tierNameLabel])
        stack.axis = .horizontal
        stack.spacing = 4
        stack.alignment = .center
        stack.isLayoutMarginsRelativeArrangement = true
        stack.layoutMargins = UIEdgeInsets(top: 2, left: 8, bottom: 2, right: 8)
        return stack
    }()

    private lazy var tierPillView: UIView = {
        let view = UIView()
        view.layer.cornerRadius = 11
        view.layer.masksToBounds = true
        view.layer.borderWidth = 1
        view.isHidden = true
        view.setContentHuggingPriority(.required, for: .horizontal)
        view.setContentCompressionResistancePriority(.required, for: .horizontal)
        return view
    }()

    private lazy var pointsBadgeView: UIView = {
        let view = UIView()
        view.layer.cornerRadius = 11
        view.layer.masksToBounds = true
        view.isHidden = true
        view.setContentHuggingPriority(.required, for: .horizontal)
        return view
    }()

    private lazy var pointsLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 12)
        label.textColor = .systemBlue
        label.numberOfLines = 1
        return label
    }()

    private lazy var loyaltyRowStack: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [tierPillView, pointsBadgeView, UIView()])
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .center
        stack.isHidden = true
        return stack
    }()

    /// Period-scoped list (Overview insights). Pass `nil` dates for all-time history.
    init(
        filter: OverviewRankingOrdersFilter,
        startDate: Date?,
        endDate: Date?,
        periodSubtitle: String,
        customer: Customer? = nil
    ) {
        self.filter = filter
        self.startDate = startDate
        self.endDate = endDate
        self.periodSubtitle = periodSubtitle
        self.customer = customer
        super.init(nibName: nil, bundle: nil)
    }

    /// All-time customer order history (Customer page → View orders).
    convenience init(customerId: Int, customerName: String, customer: Customer? = nil) {
        self.init(
            filter: .customer(id: customerId, name: customerName),
            startDate: nil,
            endDate: nil,
            periodSubtitle: "All time".localized(),
            customer: customer
        )
    }

    /// Prefer this when opening from Customer list — keeps loyalty tier for the header immediately.
    convenience init(customer: Customer) {
        let customerId = customer.id ?? customer.customer_id
        let name = customer.full_name?.trimmingCharacters(in: .whitespacesAndNewlines)
        let displayName = (name?.isEmpty == false) ? name! : "Customer".localized()
        self.init(customerId: customerId, customerName: displayName, customer: customer)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupNavigationBar()
        setupUI()
        applyLoyaltyHeader()
        loadOrders(reset: true)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    override func setupUI() {
        super.setupUI()
        view.backgroundColor = .backgroundPrimary

        // Match Overview insight / order-card surface language.
        headerCard.backgroundColor = .backgroundCard
        headerCard.layer.cornerRadius = 14
        headerCard.layer.borderWidth = 1
        headerCard.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.88).cgColor
        headerCard.layer.shadowColor = UIColor.black.cgColor
        headerCard.layer.shadowOpacity = 0.05
        headerCard.layer.shadowRadius = 12
        headerCard.layer.shadowOffset = CGSize(width: 0, height: 5)

        entityLabel.font = .bodyBold(size: 15)
        entityLabel.textColor = .textPrimary
        entityLabel.numberOfLines = 2
        entityLabel.text = filter.entityName

        periodLabel.font = .captionMedium(size: 12)
        periodLabel.textColor = .textSecondary
        periodLabel.numberOfLines = 2
        periodLabel.text = periodSubtitle

        summaryLabel.font = .bodyMedium(size: 13)
        summaryLabel.textColor = .brandPrimary
        summaryLabel.numberOfLines = 2
        summaryLabel.text = "—"

        pointsBadgeView.addSubview(pointsLabel)
        pointsLabel.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 2, left: 8, bottom: 2, right: 8))
        }

        tierPillView.addSubview(tierPillStack)
        tierPillStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }

        let headerStack = UIStackView(arrangedSubviews: [
            entityLabel,
            loyaltyRowStack,
            periodLabel,
            summaryLabel
        ])
        headerStack.axis = .vertical
        headerStack.spacing = 6
        headerStack.alignment = .fill
        headerCard.addSubview(headerStack)
        headerStack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12))
        }

        emptyStateLabel.font = .bodyRegular(size: 14)
        emptyStateLabel.textColor = .textSecondary
        emptyStateLabel.textAlignment = .center
        emptyStateLabel.numberOfLines = 0
        emptyStateLabel.text = (startDate == nil && endDate == nil)
            ? "No orders found".localized()
            : "No orders found for this period".localized()
        emptyStateLabel.isHidden = true

        guard let customNavBar = customNavBar else { return }

        view.addSubview(headerCard)
        view.addSubview(ordersTableView)
        view.addSubview(emptyStateLabel)

        headerCard.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom).offset(12)
            make.leading.trailing.equalToSuperview().inset(16)
        }

        ordersTableView.snp.makeConstraints { make in
            make.top.equalTo(headerCard.snp.bottom).offset(12)
            make.leading.trailing.bottom.equalToSuperview()
        }

        emptyStateLabel.snp.makeConstraints { make in
            make.center.equalTo(ordersTableView)
            make.leading.trailing.equalToSuperview().inset(32)
        }
    }

    private func setupNavigationBar() {
        setupCustomNavigationBar(
            title: filter.navigationTitle,
            statusBarBackgroundColor: .backgroundCard,
            titleCentered: true,
            hideBackButton: false,
            backAction: .pop
        )
    }

    /// Same tier pill language as CustomerCell (Kim Cương, points, …).
    private func applyLoyaltyHeader() {
        guard case .customer = filter, let customer = customer else {
            loyaltyRowStack.isHidden = true
            return
        }

        guard customer.shouldDisplayLoyaltyBadges, let levelName = customer.loyaltyDisplayLevelName else {
            loyaltyRowStack.isHidden = true
            return
        }

        loyaltyRowStack.isHidden = false
        let accent = customer.loyaltyDisplayAccentColor ?? .systemBlue

        tierPillView.isHidden = false
        tierNameLabel.text = levelName
        tierNameLabel.textColor = accent
        tierPillView.backgroundColor = accent.withAlphaComponent(0.10)
        tierPillView.layer.borderColor = accent.withAlphaComponent(0.22).cgColor

        let iconName = customer.loyaltyDisplayIconName ?? "person.fill"
        let config = UIImage.SymbolConfiguration(pointSize: 11, weight: .semibold)
        tierIconImageView.image = UIImage(systemName: iconName, withConfiguration: config)
        tierIconImageView.tintColor = accent

        if let points = customer.loyaltyDisplayPoints {
            pointsBadgeView.isHidden = false
            pointsBadgeView.backgroundColor = accent.withAlphaComponent(0.08)
            pointsBadgeView.layer.borderWidth = 1
            pointsBadgeView.layer.borderColor = accent.withAlphaComponent(0.18).cgColor
            pointsLabel.textColor = accent
            let pointsText = NumberFormatter.localizedString(from: NSNumber(value: points), number: .decimal)
            pointsLabel.text = String(
                format: "loyalty.points.compactFormat".localized(),
                pointsText
            )
        } else {
            pointsBadgeView.isHidden = true
        }
    }

    private func loadOrders(reset: Bool) {
        guard !isLoading else { return }
        if reset {
            currentPage = 1
            hasMorePages = true
            orders.removeAll()
            loadedAmountTotal = 0
            summaryAmountTotal = nil
            totalOrderCount = 0
            updateSummaryHeader()
            ordersTableView.reloadData()
        } else {
            guard hasMorePages else { return }
        }

        isLoading = true
        if reset {
            showProgressText(text: "Loading...".localized(), navigationController: navigationController)
        }

        // Customer filter → dedicated API (always scoped to that customer + loyalty header).
        // Product filter → general orders search.
        switch filter {
        case .customer(let id, _):
            OrderService.shared.loadCustomerOrders(
                customerId: id,
                startDate: startDate,
                endDate: endDate,
                page: currentPage,
                limit: 20,
                sortBy: "createdAt",
                sortOrder: "desc"
            ) { [weak self] response, error in
                self?.handleOrdersResponse(response, error: error, reset: reset)
            }
        case .product(let id, _):
            OrderService.shared.loadOrders(
                productIds: nil,
                productId: id,
                customerId: nil,
                startDate: startDate,
                endDate: endDate,
                keyword: nil,
                page: currentPage,
                limit: 20,
                orderType: nil,
                sortBy: "createdAt",
                sortOrder: "desc",
                status: nil
            ) { [weak self] response, error in
                self?.handleOrdersResponse(response, error: error, reset: reset)
            }
        case .snapshot(let kind, _):
            AnalyticsAPIService.shared.loadIncomeOrders(
                startDate: startDate,
                endDate: endDate,
                status: kind.incomeOrdersStatus,
                plan: false,
                limit: 20,
                offset: (currentPage - 1) * 20
            ) { [weak self] data, error in
                self?.handleIncomeOrders(data, error: error, reset: reset)
            }
        }
    }

    private func handleIncomeOrders(_ data: IncomeOrdersData?, error: NSError?, reset: Bool) {
        let mapped: [Order] = {
            var seen = Set<Int>()
            var result: [Order] = []
            for item in data?.days?.flatMap({ $0.orders ?? [] }) ?? [] {
                guard let id = item.id, seen.insert(id).inserted,
                      let order = item.toListOrder() else { continue }
                result.append(order)
            }
            return result
        }()
        let total = data?.pagination?.total ?? mapped.count
        let hasMore = data?.pagination?.hasMore ?? false
        handleMappedOrders(mapped, total: total, hasMore: hasMore, error: error, reset: reset)
    }

    private func handleMappedOrders(
        _ newOrders: [Order],
        total: Int,
        hasMore: Bool,
        error: NSError?,
        reset: Bool
    ) {
        DispatchQueue.main.async {
            self.isLoading = false
            if reset {
                self.hideProgress(navigationController: self.navigationController)
            }

            if let error = error, newOrders.isEmpty {
                UIAlertController.errorAlert(parent: self, error: error)
                self.updateEmptyState()
                return
            }

            if reset {
                self.orders = newOrders
                self.loadedAmountTotal = newOrders.reduce(0) { $0 + $1.totalAmount }
            } else {
                self.orders.append(contentsOf: newOrders)
                self.loadedAmountTotal += newOrders.reduce(0) { $0 + $1.totalAmount }
            }

            self.totalOrderCount = total
            self.hasMorePages = hasMore
            if !newOrders.isEmpty {
                self.currentPage += 1
            }

            self.updateSummaryHeader()
            self.ordersTableView.reloadData()
            self.updateEmptyState()
        }
    }

    private func handleOrdersResponse(_ response: OrdersResponse?, error: NSError?, reset: Bool) {
        DispatchQueue.main.async {
            self.isLoading = false
            if reset {
                self.hideProgress(navigationController: self.navigationController)
            }

            if let error = error, response == nil {
                UIAlertController.errorAlert(parent: self, error: error)
                self.updateEmptyState()
                return
            }

            let data = response?.data
            let newOrders = data?.orders ?? []

            // Refresh name + loyalty tier from dedicated customer-orders API.
            if let apiCustomer = data?.customer {
                self.customer = apiCustomer
                if let name = apiCustomer.full_name?.trimmingCharacters(in: .whitespacesAndNewlines),
                   !name.isEmpty {
                    self.entityLabel.text = name
                }
                self.applyLoyaltyHeader()
            }

            if reset {
                self.orders = newOrders
                self.loadedAmountTotal = newOrders.reduce(0) { $0 + $1.totalAmount }
            } else {
                self.orders.append(contentsOf: newOrders)
                self.loadedAmountTotal += newOrders.reduce(0) { $0 + $1.totalAmount }
            }

            self.totalOrderCount = data?.summary?.totalOrders ?? data?.total ?? self.orders.count
            if let totalAmount = data?.summary?.totalAmount {
                self.summaryAmountTotal = totalAmount
            }
            self.hasMorePages = data?.hasMore ?? false
            if !newOrders.isEmpty {
                self.currentPage += 1
            }

            self.updateSummaryHeader()
            self.ordersTableView.reloadData()
            self.updateEmptyState()
        }
    }

    private func updateSummaryHeader() {
        let countText = "\(totalOrderCount.formatStringInCommon()) " + "Overview_Orders_Count".localized()
        if let summaryAmount = summaryAmountTotal {
            // Accurate all-matching total from dedicated API — no "+" needed.
            summaryLabel.text = "\(countText) · \(summaryAmount.formatStringInCommon())"
        } else {
            let moneyText = loadedAmountTotal.formatStringInCommon()
            if hasMorePages && !orders.isEmpty {
                // Money is a running total of loaded pages until the user scrolls further.
                summaryLabel.text = "\(countText) · \(moneyText)+"
            } else {
                summaryLabel.text = "\(countText) · \(moneyText)"
            }
        }
    }

    private func updateEmptyState() {
        let isEmpty = orders.isEmpty
        emptyStateLabel.isHidden = !isEmpty
        ordersTableView.isHidden = isEmpty
    }
}

extension OverviewRankingOrdersViewController: UITableViewDataSource, UITableViewDelegate {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        orders.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "SaleDetailCell", for: indexPath) as! SaleDetailCell_Option5
        cell.bind(order: orders[indexPath.row])
        cell.backgroundColor = .clear
        return cell
    }

    func tableView(_ tableView: UITableView, heightForRowAt indexPath: IndexPath) -> CGFloat {
        UITableViewAutomaticDimension
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        guard indexPath.row < orders.count else { return }

        let order = orders[indexPath.row]
        showProgressText(text: "Loading...".localized(), navigationController: navigationController)
        OrderService.shared.loadOrderDetail(orderId: order.id) { [weak self] orderDetail, error in
            DispatchQueue.main.async {
                self?.hideProgress(navigationController: self?.navigationController)
                if let error = error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                guard let detail = orderDetail else { return }
                let preview = PreviewViewController(order: Order.from(detail: detail))
                preview.hidesBottomBarWhenPushed = true
                self?.navigationController?.pushViewController(preview, animated: true)
            }
        }
    }

    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        let offsetY = scrollView.contentOffset.y
        let contentHeight = scrollView.contentSize.height
        let frameHeight = scrollView.frame.size.height
        guard contentHeight > frameHeight else { return }

        if offsetY > contentHeight - frameHeight - 120 {
            loadOrders(reset: false)
        }
    }
}

private extension DailyIncomeOrder {
    func toListOrder() -> Order? {
        guard let id = id, let orderNumber = orderNumber, !orderNumber.isEmpty else { return nil }
        let type: OrderType = (orderType ?? "").uppercased() == "SALE" ? .sale : .rent
        let st = OrderStatus.from(apiString: status) ?? .reserved
        let created = createdAt ?? Date()
        let nameParts = (customerName ?? "")
            .split(separator: " ")
            .map(String.init)
        return Order(
            id: id,
            orderNumber: orderNumber,
            orderType: type,
            status: st,
            totalAmount: totalAmount ?? 0,
            depositAmount: depositAmount ?? 0,
            securityDeposit: securityDeposit ?? 0,
            damageFee: damageFee ?? 0,
            lateFee: 0,
            discountType: nil,
            discountValue: 0,
            discountAmount: 0,
            pickupPlanAt: pickupPlanAt,
            returnPlanAt: returnPlanAt,
            pickedUpAt: nil,
            returnedAt: nil,
            rentalDuration: nil,
            isReadyToDeliver: false,
            collateralType: nil,
            collateralDetails: nil,
            notes: nil,
            pickupNotes: nil,
            pickupNotesImages: nil,
            returnNotes: nil,
            returnNotesImages: nil,
            damageNotes: nil,
            damageNotesImages: nil,
            createdAt: created,
            updatedAt: created,
            customerId: customerId ?? 0,
            customerFirstName: nameParts.first,
            customerLastName: nameParts.dropFirst().joined(separator: " "),
            customerName: customerName ?? "",
            customerPhone: customerPhone,
            customerEmail: nil,
            outletId: outletId ?? 0,
            outletName: outletName ?? "",
            merchantId: nil,
            merchantName: nil,
            createdById: 0,
            createdByName: "",
            orderItems: [],
            itemCount: 0,
            paymentCount: 0,
            totalPaid: 0
        )
    }
}
