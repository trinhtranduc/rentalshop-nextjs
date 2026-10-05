//
//  OverviewRankingOrdersViewController.swift
//  POS ADBD
//

import UIKit
import SnapKit
import Kingfisher

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

// MARK: - #482 Đơn theo sản phẩm / khách hàng (boards DT-don-theo-sp, DT-don-theo-kh)

/// One of the three tiles under the header
struct EntityOrdersTile: Equatable {
    let title: String
    let value: String
    var accent: Bool = false
}

/// Header figures of the orders-by-product / by-customer screen, from what the list endpoints return
enum EntityOrdersLogic {
    /// Non-cancelled rent orders among the loaded ones ("Lượt thuê")
    static func rentals(_ orders: [Order]) -> Int {
        orders.filter { $0.orderType == .rent && $0.status != .cancelled }.count
    }

    /// The product's line totals in the loaded non-cancelled orders; the order total when a row has no items
    static func productRevenue(_ orders: [Order], productId: Int) -> Double {
        orders.filter { $0.status != .cancelled }.reduce(0) { sum, order in
            guard !order.orderItems.isEmpty else { return sum + order.totalAmount }
            return sum + order.orderItems.filter { $0.productId == productId }.reduce(0) { $0 + $1.totalPrice }
        }
    }

    /// Money of the loaded non-cancelled orders (customer "Đã chi" when the API sent no summary)
    static func spent(_ orders: [Order]) -> Double {
        orders.filter { $0.status != .cancelled }.reduce(0) { $0 + $1.totalAmount }
    }

    /// "2,1tr" from a million up (board), the full amount below
    static func compactMoney(_ amount: Double) -> String {
        guard amount >= 1_000_000 else { return MoneyFormatter.format(amount) }
        let tenths = Int((amount / 100_000).rounded())
        let whole = tenths / 10
        let tenth = tenths % 10
        return tenth == 0
            ? String(format: "orders.entity.millionWhole".localized(), whole)
            : String(format: "orders.entity.million".localized(), whole, tenth)
    }

    /// Số đơn (all matching orders), Lượt thuê and Doanh thu (loaded pages: "+" while more pages exist)
    static func productTiles(orders: [Order], productId: Int, total: Int, hasMore: Bool, hidesMoney: Bool) -> [EntityOrdersTile] {
        let more = hasMore ? "+" : ""
        return [
            EntityOrdersTile(title: "orders.entity.tile.orders".localized(), value: "\(total)"),
            EntityOrdersTile(title: "orders.entity.tile.rentals".localized(), value: "\(rentals(orders))" + more),
            EntityOrdersTile(title: "orders.entity.tile.revenue".localized(),
                             value: hidesMoney ? "—" : compactMoney(productRevenue(orders, productId: productId)) + more),
        ]
    }

    /// Số đơn and Đã chi (API summary, cancelled excluded), Đang thuê (orders out now; "—" until known)
    static func customerTiles(total: Int, spent: Double?, renting: Int?, hidesMoney: Bool) -> [EntityOrdersTile] {
        [
            EntityOrdersTile(title: "orders.entity.tile.orders".localized(), value: "\(total)"),
            EntityOrdersTile(title: "orders.entity.tile.spent".localized(),
                             value: hidesMoney ? "—" : spent.map(compactMoney) ?? "—"),
            EntityOrdersTile(title: "orders.entity.tile.renting".localized(), value: renting.map(String.init) ?? "—", accent: true),
        ]
    }

    /// "VS-004 · Còn 1 hôm nay"; the free part only when something is free
    static func productSubtitle(code: String?, freeToday: Int?) -> String {
        let free = freeToday.flatMap { $0 > 0 ? String(format: "orders.entity.free".localized(), $0) : nil }
        return [code, free].compactMap { $0 }.joined(separator: " · ")
    }
}

enum OverviewRankingOrdersFilter {
    case customer(id: Int, name: String)
    case product(id: Int, name: String)
    case snapshot(OverviewSnapshotKind, title: String)
    /// #388 overview: orders out now (PICKUPED)
    case rentedOut(title: String)
    /// #388 overview: rentals past their return day
    case lateReturns(title: String)

    var navigationTitle: String {
        switch self {
        case .customer:
            return "Orders by customer".localized()
        case .product:
            return "Orders by product".localized()
        case .snapshot(_, let title), .rentedOut(let title), .lateReturns(let title):
            return title
        }
    }

    var entityName: String {
        switch self {
        case .customer(_, let name), .product(_, let name):
            return name
        case .snapshot(_, let title), .rentedOut(let title), .lateReturns(let title):
            return title
        }
    }

    var customerId: Int? {
        if case .customer(let id, _) = self { return id }
        return nil
    }

    /// #482: product and customer lists get the flat header of the DT boards
    var hasEntityHeader: Bool {
        switch self {
        case .customer, .product: return true
        default: return false
        }
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
    /// #458: with the new orders UI the rows are the Orders tab row (search context), else the old order card
    private let usesOrderRows = FeatureFlags.shared.isOn(.newOrders)
    private var hidesMoney: Bool {
        OrdersHomeLogic.hidesMoney(role: User.current()?.role, hideForStaff: Utils.shouldHideFinancialDataForStaff())
    }

    private lazy var ordersTableView: UITableView = {
        let isIPad = UIDevice.current.userInterfaceIdiom == .pad
        let table = UITableView(frame: .zero, style: .plain)
        table.delegate = self
        table.dataSource = self
        // Same row as the main Orders tab: OrderRowCell with the new orders UI (#458), else SaleDetailCell_Option5.
        table.register(SaleDetailCell_Option5.self, forCellReuseIdentifier: "SaleDetailCell")
        table.register(OrderRowCell.self, forCellReuseIdentifier: OrderRowCell.reuseId)
        table.backgroundColor = usesOrderRows ? DS.Color.surface : .backgroundPrimary
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

    /// #482 flat header (product / customer)
    private let entityHeader = UIView()
    private let entityThumb = V2.thumbnail(size: 56, radius: 12)
    private let entityAvatar = CustomersV2UI.avatar(size: 52, fontSize: 17)
    private let entityName = V2.label(size: DS.TextSize.name, weight: .bold, lines: 2)
    private let entitySub = V2.label(size: DS.TextSize.secondary, color: UIColor(hexString: "64748B"), lines: 2)
    private let entityCall = UIButton(type: .system)
    private let entityIdentity = UIControl()
    private let periodChip = UIButton(type: .system)
    private let tilesRow = UIStackView()
    private let ordersBand = UIView()
    private var product: Product?
    private var renting: Int?
    private var phone: String?

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
        loadEntityHeader()
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

        if filter.hasEntityHeader {
            buildEntityHeader()
            view.backgroundColor = DS.Color.surface
            ordersTableView.backgroundColor = DS.Color.surface
            ordersTableView.contentInset = UIEdgeInsets(top: 0, left: 0, bottom: 18, right: 0)
            view.addSubview(entityHeader)
            view.addSubview(ordersBand)
            view.addSubview(ordersTableView)
            view.addSubview(emptyStateLabel)
            entityHeader.snp.makeConstraints { make in
                make.top.equalTo(customNavBar.snp.bottom)
                make.leading.trailing.equalToSuperview()
            }
            ordersBand.snp.makeConstraints { make in
                make.top.equalTo(entityHeader.snp.bottom)
                make.leading.trailing.equalToSuperview()
            }
            ordersTableView.snp.makeConstraints { make in
                make.top.equalTo(ordersBand.snp.bottom)
                make.leading.trailing.bottom.equalToSuperview()
            }
            emptyStateLabel.snp.makeConstraints { make in
                make.center.equalTo(ordersTableView)
                make.leading.trailing.equalToSuperview().inset(32)
            }
            return
        }

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

    // MARK: - #482 Flat header

    private func buildEntityHeader() {
        entityHeader.backgroundColor = DS.Color.surface
        let isProduct: Bool
        if case .product = filter { isProduct = true } else { isProduct = false }

        entityThumb.image = V2.placeholder
        entityThumb.contentMode = .center
        entityThumb.isHidden = !isProduct
        entityAvatar.isHidden = isProduct
        entityAvatar.text = CustomersV2Logic.initials(filter.entityName)
        entityName.text = filter.entityName
        entitySub.font = UIFont.monospacedDigitSystemFont(ofSize: DS.TextSize.secondary, weight: .regular)
        entitySub.isHidden = true

        let texts = UIStackView(arrangedSubviews: [entityName, entitySub])
        texts.axis = .vertical
        texts.spacing = 2
        texts.setContentHuggingPriority(.defaultLow, for: .horizontal)

        // The name block opens the product / customer detail
        let identity = entityIdentity
        identity.addTarget(self, action: #selector(entityTapped), for: .touchUpInside)
        identity.isAccessibilityElement = true
        identity.accessibilityTraits = UIAccessibilityTraitButton
        let chevron = UIImageView(image: DS.symbol("chevron.right", DS.Icon.sm, weight: .semibold))
        chevron.tintColor = UIColor(hexString: "94A3B8")
        chevron.setContentHuggingPriority(.required, for: .horizontal)
        chevron.isHidden = !isProduct
        let inner = UIStackView(arrangedSubviews: [entityThumb, entityAvatar, texts, chevron])
        inner.spacing = DS.Spacing.md
        inner.alignment = .center
        inner.isUserInteractionEnabled = false
        identity.addSubview(inner)
        inner.snp.makeConstraints { make in make.edges.equalToSuperview() }

        entityCall.setImage(DS.symbol("phone", DS.Icon.sm), for: .normal)
        entityCall.tintColor = DS.Color.text
        entityCall.layer.cornerRadius = 10
        entityCall.layer.borderWidth = 1
        entityCall.layer.borderColor = UIColor(hexString: "CBD5E1").cgColor
        entityCall.accessibilityLabel = "Call customer".localized()
        entityCall.addTarget(self, action: #selector(callTapped), for: .touchUpInside)
        entityCall.snp.makeConstraints { make in make.size.equalTo(40) }
        entityCall.isHidden = true
        let identityRow = UIStackView(arrangedSubviews: [identity, entityCall])
        identityRow.spacing = DS.Spacing.md
        identityRow.alignment = .center

        periodChip.setTitle(" " + periodSubtitle, for: .normal)
        periodChip.setImage(DS.symbol("calendar", 14, weight: .semibold), for: .normal)
        periodChip.tintColor = UIColor(hexString: "1E40AF")
        periodChip.setTitleColor(UIColor(hexString: "1E40AF"), for: .normal)
        periodChip.titleLabel?.font = Utils.boldFont(size: DS.TextSize.secondary)
        periodChip.backgroundColor = UIColor(hexString: "EFF6FF")
        periodChip.layer.cornerRadius = 16
        periodChip.contentEdgeInsets = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 12)
        periodChip.isUserInteractionEnabled = false
        periodChip.snp.makeConstraints { make in make.height.equalTo(32) }
        let chipRow = UIStackView(arrangedSubviews: [periodChip, UIView()])

        tilesRow.axis = .horizontal
        tilesRow.spacing = DS.Spacing.sm
        tilesRow.distribution = .fillEqually

        let stack = UIStackView(arrangedSubviews: [identityRow, chipRow, tilesRow])
        stack.axis = .vertical
        stack.spacing = DS.Spacing.md
        entityHeader.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(DS.Spacing.sm)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
        let gap = UIView()
        gap.backgroundColor = DS.Color.background
        entityHeader.addSubview(gap)
        gap.snp.makeConstraints { make in
            make.top.equalTo(stack.snp.bottom).offset(DS.Spacing.lg)
            make.leading.trailing.bottom.equalToSuperview()
            make.height.equalTo(8)
        }

        // "ĐƠN HÀNG" band over the rows
        ordersBand.backgroundColor = V2.sectionFill
        let bandTitle = V2.label("orders.entity.section".localized(), size: DS.TextSize.secondary, weight: .bold, color: DS.Color.textMuted)
        bandTitle.attributedText = NSAttributedString(string: "orders.entity.section".localized(), attributes: [
            NSAttributedString.Key.kern: 0.56,
            NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.secondary),
            NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
        ])
        ordersBand.addSubview(bandTitle)
        bandTitle.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(10)
            make.bottom.equalToSuperview().offset(-6)
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
        }
        let bandLine = V2.divider()
        ordersBand.addSubview(bandLine)
        bandLine.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }

        renderEntityHeader()
    }

    private func renderEntityHeader() {
        guard filter.hasEntityHeader else { return }
        let tiles: [EntityOrdersTile]
        switch filter {
        case .product(let id, _):
            if let product {
                entityName.text = product.name ?? filter.entityName
                let subtitle = ProductRowLogic.subtitle(product)
                let text = EntityOrdersLogic.productSubtitle(code: subtitle.code, freeToday: subtitle.free)
                entitySub.text = text
                entitySub.isHidden = text.isEmpty
                if let url = ProductImages.thumbnailUrl(product), let link = URL(string: url) {
                    entityThumb.kf.setImage(with: link, placeholder: V2.placeholder) { [weak self] result in
                        if case .success = result { self?.entityThumb.contentMode = .scaleAspectFill }
                    }
                }
            }
            tiles = EntityOrdersLogic.productTiles(orders: orders, productId: id, total: totalOrderCount,
                                                   hasMore: hasMorePages && !orders.isEmpty, hidesMoney: hidesMoney)
        default:
            let name = customer.map(CustomersV2Logic.displayName) ?? filter.entityName
            entityName.text = name
            entityAvatar.text = CustomersV2Logic.initials(name)
            phone = customer?.phone?.nilIfEmpty
            entitySub.text = phone
            entitySub.isHidden = phone == nil
            entityCall.isHidden = CustomersV2Logic.phoneDigits(phone).isEmpty
            let spent = summaryAmountTotal ?? (orders.isEmpty && isLoading ? nil : EntityOrdersLogic.spent(orders))
            tiles = EntityOrdersLogic.customerTiles(total: totalOrderCount, spent: spent, renting: renting, hidesMoney: hidesMoney)
        }
        entityIdentity.accessibilityLabel = [entityName.text, entitySub.text].compactMap { $0 }.joined(separator: ", ")
        tilesRow.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for tile in tiles {
            let box = UIView()
            box.backgroundColor = V2.sectionFill
            box.layer.cornerRadius = DS.Radius.card
            let title = V2.label(tile.title, size: DS.TextSize.secondary, color: DS.Color.textMuted)
            title.adjustsFontSizeToFitWidth = true
            title.minimumScaleFactor = 0.8
            let value = V2.label(tile.value, size: 18, weight: .bold, color: tile.accent ? DS.Status.returning.text : DS.Color.text)
            value.font = UIFont.monospacedDigitSystemFont(ofSize: 18, weight: .bold)
            value.adjustsFontSizeToFitWidth = true
            value.minimumScaleFactor = 0.6
            let column = UIStackView(arrangedSubviews: [title, value])
            column.axis = .vertical
            column.spacing = 2
            box.addSubview(column)
            column.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12)) }
            box.isAccessibilityElement = true
            box.accessibilityLabel = "\(tile.title), \(tile.value)"
            tilesRow.addArrangedSubview(box)
        }
    }

    /// Product photo, code and free units (`GET /api/products/{id}`); the customer's renting count
    private func loadEntityHeader() {
        switch filter {
        case .product(let id, _):
            ProductService.shared.loadProduct(productId: id) { [weak self] product, _ in
                DispatchQueue.main.async {
                    guard let self, let product else { return }
                    self.product = product
                    self.renderEntityHeader()
                }
            }
        case .customer(let id, _):
            LiveCustomersV2DataSource().countRenting(customerId: id) { [weak self] count in
                DispatchQueue.main.async {
                    guard let self else { return }
                    self.renting = count
                    self.renderEntityHeader()
                }
            }
        default:
            break
        }
    }

    @objc private func entityTapped() {
        switch filter {
        case .product:
            // The detail needs the loaded product (photo, prices); until then the tap waits
            guard let item = product else { return }
            let detail = ProductDetailViewController(product: item)
            detail.hidesBottomBarWhenPushed = true
            navigationController?.pushViewController(detail, animated: true)
        case .customer:
            guard let item = customer else { return }
            let detail = CustomerDetailV2ViewController(customer: item)
            detail.hidesBottomBarWhenPushed = true
            navigationController?.pushViewController(detail, animated: true)
        default:
            break
        }
    }

    @objc private func callTapped() {
        let digits = CustomersV2Logic.phoneDigits(phone)
        guard !digits.isEmpty, let url = URL(string: "tel://\(digits)") else { return }
        UIApplication.shared.open(url)
    }

    private func setupNavigationBar() {
        let navBar = setupCustomNavigationBar(
            title: filter.navigationTitle,
            statusBarBackgroundColor: .backgroundCard,
            titleCentered: true,
            hideBackButton: false,
            backAction: .custom { [weak self] in
                guard let self else { return }
                if let nav = self.navigationController, nav.viewControllers.count > 1 {
                    nav.popViewController(animated: true)
                } else {
                    self.dismiss(animated: true)
                }
            }
        )
        // Customer history is presented (picker / Settings), not a stack page.
        if case .customer = filter {
            navBar.setDismissButton()
        }
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
        case .rentedOut, .lateReturns:
            let lateOnly: Bool
            if case .lateReturns = filter { lateOnly = true } else { lateOnly = false }
            OrderService.shared.loadOrders(
                productIds: nil,
                keyword: nil,
                page: currentPage,
                limit: 20,
                orderType: lateOnly ? .rent : nil,
                sortBy: "returnPlanAt",
                sortOrder: "asc",
                status: .pickuped
            ) { [weak self] response, error in
                guard let self else { return }
                guard lateOnly else {
                    self.handleOrdersResponse(response, error: error, reset: reset)
                    return
                }
                let page = OverviewLateFilter.page(response?.data?.orders ?? [], hasMore: response?.data?.hasMore ?? false)
                DispatchQueue.main.async {
                    let loaded = reset ? 0 : self.orders.count
                    self.handleMappedOrders(page.orders, total: loaded + page.orders.count, hasMore: page.hasMore,
                                            error: error, reset: reset)
                }
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
        renderEntityHeader()
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
        if usesOrderRows || filter.hasEntityHeader {
            let rowCell = tableView.dequeueReusableCell(withIdentifier: OrderRowCell.reuseId, for: indexPath) as! OrderRowCell
            let row = OrdersHomeLogic.orderRows([orders[indexPath.row]])[0]
            // #482: product / customer lists use the Orders tab "Tất cả" row
            rowCell.configure(row, context: filter.hasEntityHeader ? .list : .search, hidesMoney: hidesMoney)
            return rowCell
        }
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
                let preview = OrderDetailRouter.detailController(for: Order.from(detail: detail), delegate: nil)
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
