//
//  OrdersViewController.swift
//  POS ADBD
//
//  Redesigned orders tab (#371), shown when the `newOrders` feature is on:
//  "Việc cần làm" | "Tất cả đơn" (rent) | "Đơn bán", and one search across rent and sale.
//

import UIKit
import SnapKit

final class OrdersViewController: BaseViewControler {
    private let viewModel = OrdersHomeViewModel()
    private var visibleSegments: [OrdersSegment] = OrdersSegment.allCases
    private var needsReloadOnAppear = false
    private var isPullRefreshing = false

    private let listView = UITableView(frame: .zero, style: .grouped)
    private let searchBar = UISearchBar()
    private let segmentedControl = UISegmentedControl()
    private let filterButton = UIButton(type: .system)
    private let stateView = OrdersStateView()

    private var hidesMoney: Bool {
        OrdersHomeLogic.hidesMoney(role: User.current()?.role, hideForStaff: Utils.shouldHideFinancialDataForStaff())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupCustomNavigationBar(title: "My Order".localized())
        setupUI()
        viewModel.onChange = { [weak self] in self?.render() }
        viewModel.reload()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        if needsReloadOnAppear {
            needsReloadOnAppear = false
            viewModel.reload()
        }
    }

    override func setupUI() {
        view.backgroundColor = DS.Color.background

        searchBar.searchBarStyle = .minimal
        searchBar.placeholder = "Order number, name, phone number...".localized()
        searchBar.delegate = self
        searchBar.searchTextField.autocorrectionType = .no
        searchBar.searchTextField.autocapitalizationType = .none
        searchBar.searchTextField.backgroundColor = DS.Color.surface
        searchBar.searchTextField.font = Utils.regularFont(size: 16)

        filterButton.setImage(UIImage(systemName: "line.3.horizontal.decrease"), for: .normal)
        filterButton.tintColor = DS.Color.text
        filterButton.accessibilityLabel = "Order Filter".localized()
        filterButton.addTarget(self, action: #selector(filterTapped), for: .touchUpInside)
        filterButton.snp.makeConstraints { make in make.size.equalTo(DS.touchTarget) }

        let searchRow = UIStackView(arrangedSubviews: [searchBar, filterButton])
        searchRow.alignment = .center
        searchRow.spacing = 0

        rebuildSegments()
        segmentedControl.selectedSegmentTintColor = DS.Color.surface
        segmentedControl.setTitleTextAttributes([NSAttributedString.Key.font: Utils.mediumFont(size: 14), NSAttributedString.Key.foregroundColor: DS.Color.textMuted], for: .normal)
        segmentedControl.setTitleTextAttributes([NSAttributedString.Key.font: Utils.boldFont(size: 14), NSAttributedString.Key.foregroundColor: DS.Color.text], for: .selected)
        segmentedControl.addTarget(self, action: #selector(segmentChanged), for: .valueChanged)

        let header = UIStackView(arrangedSubviews: [searchRow, segmentedControl])
        header.axis = .vertical
        header.spacing = DS.Spacing.sm
        header.isLayoutMarginsRelativeArrangement = true
        header.layoutMargins = UIEdgeInsets(top: DS.Spacing.sm, left: DS.Spacing.sm, bottom: DS.Spacing.sm, right: DS.Spacing.sm)
        segmentedControl.snp.makeConstraints { make in make.height.equalTo(36) }

        listView.backgroundColor = DS.Color.background
        listView.separatorStyle = .none
        listView.rowHeight = UITableViewAutomaticDimension
        listView.estimatedRowHeight = 150
        listView.sectionFooterHeight = 0
        listView.keyboardDismissMode = .onDrag
        listView.dataSource = self
        listView.delegate = self
        listView.register(OrderRowCell.self, forCellReuseIdentifier: OrderRowCell.reuseId)
        listView.register(OrdersSectionHeaderView.self, forHeaderFooterViewReuseIdentifier: OrdersSectionHeaderView.reuseId)
        listView.contentInset.bottom = DS.Spacing.lg
        stateView.onRetry = { [weak self] in self?.viewModel.reload() }

        view.addSubview(header)
        view.addSubview(listView)
        header.snp.makeConstraints { make in
            if let navBar = customNavBar {
                make.top.equalTo(navBar.snp.bottom)
            } else {
                make.top.equalTo(view.safeAreaLayoutGuide)
            }
            make.leading.trailing.equalToSuperview()
        }
        listView.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
        configPullToRefresh(tableview: listView)
    }

    override func startRefresh(_ sender: Any) {
        isPullRefreshing = true
        viewModel.reload()
    }

    private func rebuildSegments() {
        visibleSegments = OrdersSegment.allCases.filter { $0 != .today || viewModel.todayAvailable }
        segmentedControl.removeAllSegments()
        for (index, segment) in visibleSegments.enumerated() {
            segmentedControl.insertSegment(withTitle: title(of: segment), at: index, animated: false)
        }
        segmentedControl.selectedSegmentIndex = visibleSegments.firstIndex(of: viewModel.segment) ?? 0
    }

    private func title(of segment: OrdersSegment) -> String {
        switch segment {
        case .today: return "To do".localized()
        case .rent: return "All orders".localized()
        case .sale: return "Sale".localized()
        }
    }

    // MARK: - Render

    private func render() {
        if visibleSegments.contains(.today) != viewModel.todayAvailable {
            rebuildSegments()
        }
        segmentedControl.isEnabled = !viewModel.isSearching
        segmentedControl.alpha = viewModel.isSearching ? 0.5 : 1
        filterButton.isHidden = viewModel.isSearching || viewModel.segment != .rent
        filterButton.tintColor = viewModel.filter.isDefault ? DS.Color.text : DS.Color.primary

        listView.reloadData()
        switch viewModel.state {
        case .loading where !isPullRefreshing:
            stateView.show(.loading)
            listView.backgroundView = stateView
        case .failed(let message):
            stopPullRefresh()
            stateView.show(.error(message))
            listView.backgroundView = stateView
        case .loaded where viewModel.sections.isEmpty:
            stopPullRefresh()
            let empty = viewModel.isSearching || viewModel.segment != .today ? "No orders found" : "Nothing to do today"
            stateView.show(.empty(empty.localized()))
            listView.backgroundView = stateView
        case .loading:
            break
        default:
            stopPullRefresh()
            listView.backgroundView = nil
        }
    }

    private func stopPullRefresh() {
        isPullRefreshing = false
        endRefresh()
    }

    // MARK: - Actions

    @objc private func segmentChanged() {
        let index = segmentedControl.selectedSegmentIndex
        guard visibleSegments.indices.contains(index) else { return }
        viewModel.select(visibleSegments[index])
        listView.setContentOffset(.zero, animated: false)
    }

    @objc private func filterTapped() {
        let sheet = OrdersFilterSheet(filter: viewModel.filter)
        sheet.onApply = { [weak self] filter in self?.viewModel.applyFilter(filter) }
        present(sheet, animated: true)
    }

    private func call(_ phone: String) {
        guard let url = URL(string: "tel://\(phone)"), UIApplication.shared.canOpenURL(url) else { return }
        UIApplication.shared.open(url)
    }

    /// Same flow as a push notification: load the detail by numeric id, then the current detail screen
    private func openOrder(id: Int) {
        showProgressText(text: "Loading...".localized())
        OrderService.shared.loadOrderDetail(orderId: id) { [weak self] detail, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                guard let detail else { return }
                let preview = PreviewViewController(order: Order.from(detail: detail))
                preview.hidesBottomBarWhenPushed = true
                preview.delegate = self
                self.needsReloadOnAppear = true
                self.navigationController?.pushViewController(preview, animated: true)
            }
        }
    }
}

// MARK: - Table

extension OrdersViewController: UITableViewDataSource, UITableViewDelegate {
    func numberOfSections(in tableView: UITableView) -> Int {
        viewModel.sections.count
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        viewModel.sections[section].rows.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = listView.dequeueReusableCell(withIdentifier: OrderRowCell.reuseId, for: indexPath) as! OrderRowCell
        cell.configure(viewModel.sections[indexPath.section].rows[indexPath.row],
                       showsType: viewModel.isSearching, hidesMoney: hidesMoney)
        cell.onCall = { [weak self] phone in self?.call(phone) }
        return cell
    }

    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? {
        let data = viewModel.sections[section]
        guard let title = data.title else { return nil }
        let header = listView.dequeueReusableHeaderFooterView(withIdentifier: OrdersSectionHeaderView.reuseId) as? OrdersSectionHeaderView
        header?.configure(title: title, count: data.rows.count, style: data.style)
        return header
    }

    func tableView(_ tableView: UITableView, heightForHeaderInSection section: Int) -> CGFloat {
        viewModel.sections[section].title == nil ? DS.Spacing.sm : UITableViewAutomaticDimension
    }

    func tableView(_ tableView: UITableView, viewForFooterInSection section: Int) -> UIView? {
        nil
    }

    func tableView(_ tableView: UITableView, heightForFooterInSection section: Int) -> CGFloat {
        .leastNormalMagnitude
    }

    func tableView(_ tableView: UITableView, willDisplay cell: UITableViewCell, forRowAt indexPath: IndexPath) {
        let before = viewModel.sections[..<indexPath.section].reduce(0) { $0 + $1.rows.count }
        let total = viewModel.sections.reduce(0) { $0 + $1.rows.count }
        viewModel.loadMoreIfNeeded(displayedIndex: before + indexPath.row, total: total)
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        openOrder(id: viewModel.sections[indexPath.section].rows[indexPath.row].orderId)
    }
}

// MARK: - Search

extension OrdersViewController: UISearchBarDelegate {
    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        viewModel.updateSearch(searchText)
    }

    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
    }
}

// MARK: - Detail

extension OrdersViewController: PreviewViewControllerDelegate {
    func didCompleteOrder(sender: PreviewViewController, updatedOrder: Order?) {
        needsReloadOnAppear = true
    }
}

// MARK: - Loading / empty / error

final class OrdersStateView: UIView {
    enum State {
        case loading
        case empty(String)
        case error(String)
    }

    var onRetry: (() -> Void)?
    private let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)
    private let messageLabel = UILabel()
    private let retryButton = UIButton(type: .system)

    override init(frame: CGRect) {
        super.init(frame: frame)
        messageLabel.font = Utils.regularFont(size: 15)
        messageLabel.textColor = DS.Color.textMuted
        messageLabel.textAlignment = .center
        messageLabel.numberOfLines = 0
        retryButton.setTitle("Retry".localized(), for: .normal)
        retryButton.titleLabel?.font = Utils.boldFont(size: 15)
        retryButton.tintColor = DS.Color.primary
        retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)
        retryButton.snp.makeConstraints { make in make.height.equalTo(DS.touchTarget) }
        let stack = UIStackView(arrangedSubviews: [spinner, messageLabel, retryButton])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = DS.Spacing.sm
        addSubview(stack)
        stack.snp.makeConstraints { make in
            make.centerY.equalToSuperview().offset(-60)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.xl)
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func show(_ state: State) {
        switch state {
        case .loading:
            spinner.startAnimating()
            messageLabel.isHidden = true
            retryButton.isHidden = true
        case .empty(let message):
            spinner.stopAnimating()
            messageLabel.text = message
            messageLabel.isHidden = false
            retryButton.isHidden = true
        case .error(let message):
            spinner.stopAnimating()
            messageLabel.text = message.isEmpty ? "Something went wrong".localized() : message
            messageLabel.isHidden = false
            retryButton.isHidden = false
        }
    }

    @objc private func retryTapped() {
        onRetry?()
    }
}
