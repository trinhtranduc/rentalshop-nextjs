//
//  OverviewRankingOrdersViewController.swift
//  POS ADBD
//

import UIKit
import SnapKit

enum OverviewRankingOrdersFilter {
    case customer(id: Int, name: String)
    case product(id: Int, name: String)

    var navigationTitle: String {
        switch self {
        case .customer:
            return "Orders by customer".localized()
        case .product:
            return "Orders by product".localized()
        }
    }

    var entityName: String {
        switch self {
        case .customer(_, let name), .product(_, let name):
            return name
        }
    }
}

final class OverviewRankingOrdersViewController: BaseViewControler {

    private let filter: OverviewRankingOrdersFilter
    private let startDate: Date
    private let endDate: Date
    private let periodSubtitle: String

    private var orders: [Order] = []
    private var currentPage = 1
    private var hasMorePages = true
    private var isLoading = false

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
    private let emptyStateLabel = UILabel()

    init(
        filter: OverviewRankingOrdersFilter,
        startDate: Date,
        endDate: Date,
        periodSubtitle: String
    ) {
        self.filter = filter
        self.startDate = startDate
        self.endDate = endDate
        self.periodSubtitle = periodSubtitle
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupNavigationBar()
        setupUI()
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

        let headerStack = UIStackView(arrangedSubviews: [entityLabel, periodLabel])
        headerStack.axis = .vertical
        headerStack.spacing = 4
        headerCard.addSubview(headerStack)
        headerStack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12))
        }

        emptyStateLabel.font = .bodyRegular(size: 14)
        emptyStateLabel.textColor = .textSecondary
        emptyStateLabel.textAlignment = .center
        emptyStateLabel.numberOfLines = 0
        emptyStateLabel.text = "No orders found for this period".localized()
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

    private func loadOrders(reset: Bool) {
        guard !isLoading else { return }
        if reset {
            currentPage = 1
            hasMorePages = true
            orders.removeAll()
            ordersTableView.reloadData()
        } else {
            guard hasMorePages else { return }
        }

        isLoading = true
        if reset {
            showProgressText(text: "Loading...".localized(), navigationController: navigationController)
        }

        let customerId: Int?
        let productId: Int?
        switch filter {
        case .customer(let id, _):
            customerId = id
            productId = nil
        case .product(let id, _):
            customerId = nil
            productId = id
        }

        OrderService.shared.loadOrders(
            productIds: nil,
            productId: productId,
            customerId: customerId,
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
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.isLoading = false
                if reset {
                    self.hideProgress(navigationController: self.navigationController)
                }

                if let error = error, response == nil {
                    UIAlertController.errorAlert(parent: self, error: error)
                    self.updateEmptyState()
                    return
                }

                let newOrders = response?.data?.orders ?? []
                if reset {
                    self.orders = newOrders
                } else {
                    self.orders.append(contentsOf: newOrders)
                }

                self.hasMorePages = response?.data?.hasMore ?? false
                if !newOrders.isEmpty {
                    self.currentPage += 1
                }

                self.ordersTableView.reloadData()
                self.updateEmptyState()
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
