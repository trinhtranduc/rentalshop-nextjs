//
//  RentedOutOrdersViewController.swift
//  POS ADBD
//
//  "Đang cho thuê" (#484, board DT-dang-thue), opened from the overview figures Đang cho thuê, Đang thuê · trễ hạn
//  trả and Thế chấp đang giữ. No header card: back + "Đang cho thuê · N", then TRỄ HẠN TRẢ · n (red band) and
//  CÒN HẠN · n, each by return day, nearest first. Rows are the Orders tab row; a tap opens the order.
//  Data: GET /api/orders?status=PICKUPED&orderType=RENT sorted by returnPlanAt, every page.
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

final class RentedOutOrdersViewController: BaseViewControler {
    private enum SectionKind { case late, onTime }

    private static let pageSize = 100
    /// Safety stop: 20 pages of 100 rentals
    private static let maxPages = 20

    private let startsAtLate: Bool
    private var orders: [Order] = []
    private var sections: [(kind: SectionKind, orders: [Order])] = []
    private var isLoading = false
    private var didInitialScroll = false
    private var generation = 0

    private let titleLabel = V2.label("overview.v2.rentedOut".localized(), size: 20, weight: .bold)
    private let emptyLabel = V2.label("rentedOut.empty".localized(), size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
    private let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)
    private let refresh = UIRefreshControl()
    private var hidesMoney: Bool {
        OrdersHomeLogic.hidesMoney(role: User.current()?.role, hideForStaff: Utils.shouldHideFinancialDataForStaff())
    }

    private lazy var tableView: UITableView = {
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
        self.startsAtLate = startsAtLate
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        load()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    override func setupUI() {
        view.backgroundColor = DS.Color.surface
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

        [header, headerLine, tableView, emptyLabel, spinner].forEach(view.addSubview)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(8)
            make.leading.trailing.equalToSuperview().inset(8)
        }
        headerLine.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom).offset(4)
            make.leading.trailing.equalToSuperview()
        }
        tableView.snp.makeConstraints { make in
            make.top.equalTo(headerLine.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
        emptyLabel.snp.makeConstraints { make in
            make.center.equalTo(tableView)
            make.leading.trailing.equalToSuperview().inset(32)
        }
        spinner.snp.makeConstraints { make in make.center.equalTo(tableView) }
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

    private func load() {
        generation += 1
        let token = generation
        isLoading = true
        if orders.isEmpty && !refresh.isRefreshing { spinner.startAnimating() }
        emptyLabel.isHidden = true
        loadPage(1, collected: [], token: token)
    }

    private func loadPage(_ page: Int, collected: [Order], token: Int) {
        OrderService.shared.loadOrders(
            productIds: nil,
            keyword: nil,
            page: page,
            limit: RentedOutOrdersViewController.pageSize,
            orderType: .rent,
            sortBy: "returnPlanAt",
            sortOrder: "asc",
            status: .pickuped
        ) { [weak self] response, error in
            DispatchQueue.main.async {
                guard let self, token == self.generation else { return }
                if let error, response == nil {
                    self.finish(collected, error: collected.isEmpty ? error : nil)
                    return
                }
                let pageOrders = response?.data?.orders ?? []
                let all = collected + pageOrders
                if response?.data?.hasMore == true, !pageOrders.isEmpty, page < RentedOutOrdersViewController.maxPages {
                    self.loadPage(page + 1, collected: all, token: token)
                } else {
                    self.finish(all, error: nil)
                }
            }
        }
    }

    private func finish(_ loaded: [Order], error: NSError?) {
        isLoading = false
        spinner.stopAnimating()
        refresh.endRefreshing()
        if let error {
            UIAlertController.errorAlert(parent: self, error: error)
        } else {
            orders = loaded
        }
        render()
    }

    private func render() {
        let groups = RentedOutLogic.groups(orders)
        sections = []
        if !groups.late.isEmpty { sections.append((.late, groups.late)) }
        if !groups.onTime.isEmpty { sections.append((.onTime, groups.onTime)) }
        let total = groups.late.count + groups.onTime.count
        titleLabel.text = String(format: "rentedOut.title".localized(), total)
        emptyLabel.isHidden = total > 0 || isLoading
        tableView.reloadData()

        // From "trễ hạn trả": open at the late group (it comes first, so this keeps the top in view)
        if startsAtLate, !didInitialScroll, let index = sections.firstIndex(where: { $0.kind == .late }) {
            didInitialScroll = true
            tableView.layoutIfNeeded()
            tableView.scrollToRow(at: IndexPath(row: 0, section: index), at: .top, animated: false)
        }
    }

    private func headerTitle(_ section: (kind: SectionKind, orders: [Order])) -> String {
        switch section.kind {
        case .late: return String(format: "rentedOut.section.late".localized(), section.orders.count)
        case .onTime: return String(format: "rentedOut.section.onTime".localized(), section.orders.count)
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
        cell.configure(row, context: .list, hidesMoney: hidesMoney)
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
