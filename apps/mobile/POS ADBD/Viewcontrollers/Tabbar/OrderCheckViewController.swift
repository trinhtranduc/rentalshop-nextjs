//
//  OrderCheckViewController.swift
//  POS ADBD
//
//  Created by Trinh Tran on 12/15/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import ObjectMapper
import SnapKit

protocol OrderCheckViewControllerDelegate {
    func didSelectOrder(order: Order, sender: OrderCheckViewController)
}

class OrderCheckViewController: BaseViewControler {
    private struct AvailabilityMetrics {
        let stock: Int
        let shelfAvailable: Int
        let effectiveAvailable: Int
        let renting: Int
        let conflicts: Int
        let outletName: String?
    }

    // MARK: - Properties
    private var availabilityOrders: [NewAvailabilityOrder] = [] {
        didSet {
            updateHistorySection()
            orderTableView.reloadData()
        }
    }

    private var date: Date = Date() {
        didSet {
            updateNavigationTitle()
        }
    }

    private var product: Product? {
        didSet {
            updateNavigationTitle()
        }
    }

    private var isHistoryExpanded = true
    private var hasLaidOutTableHeader = false

    private var currentOutletId: Int? {
        User.current()?.outlet?.id ?? User.current()?.outletId
    }

    var delegate: OrderCheckViewControllerDelegate?

    // MARK: - UI Components
    private lazy var summaryHeaderView = AvailabilitySummaryHeaderView()

    private lazy var historyEmptyView = AvailabilityHistoryEmptyView()

    private lazy var orderTableView: UITableView = {
        let table = UITableView(frame: .zero, style: .plain)
        table.delegate = self
        table.dataSource = self
        table.register(
            AvailabilityHistoryCell.self,
            forCellReuseIdentifier: AvailabilityHistoryCell.reuseIdentifier
        )
        table.separatorStyle = .none
        table.backgroundColor = .backgroundPrimary
        table.tableHeaderView = summaryHeaderView
        table.tableFooterView = UIView()
        table.rowHeight = UITableViewAutomaticDimension
        table.estimatedRowHeight = 112
        table.sectionHeaderHeight = UITableViewAutomaticDimension
        table.estimatedSectionHeaderHeight = 44
        if #available(iOS 15.0, *) {
            table.sectionHeaderTopPadding = 0
        }
        return table
    }()

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupData()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        resizeTableHeaderIfNeeded()
    }

    // MARK: - Setup
    override func setupUI() {
        view.backgroundColor = .backgroundPrimary
        setupNavigationBar()

        guard customNavBar != nil else { return }

        view.addSubview(orderTableView)
        orderTableView.snp.makeConstraints { make in
            make.top.equalTo(customNavBar!.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
    }

    private func resizeTableHeaderIfNeeded() {
        let width = orderTableView.bounds.width
        guard width > 0 else { return }

        summaryHeaderView.frame = CGRect(x: 0, y: 0, width: width, height: 1)
        summaryHeaderView.setNeedsLayout()
        summaryHeaderView.layoutIfNeeded()

        let height = summaryHeaderView.systemLayoutSizeFitting(
            CGSize(width: width, height: UILayoutFittingCompressedSize.height),
            withHorizontalFittingPriority: .required,
            verticalFittingPriority: .fittingSizeLevel
        ).height

        guard height > 0 else { return }

        if !hasLaidOutTableHeader || abs(summaryHeaderView.frame.height - height) > 0.5 {
            summaryHeaderView.frame.size.height = height
            orderTableView.tableHeaderView = summaryHeaderView
            hasLaidOutTableHeader = true
        }
    }

    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        let customTitleView = createCustomTitleView()

        let navBar = RCCustomNavigationBar()
        setupCustomNavigationBar(
            navBar,
            title: "",
            statusBarBackgroundColor: .white,
            titleCentered: true,
            customTitleView: customTitleView,
            hideBackButton: false,
            backAction: .custom { [weak self] in
                self?.navigationController?.dismiss(animated: true)
            }
        )
        navBar.setDismissButton()
//        navBar.setPreferredBarHeight(76, customTitleMaxHeight: 68)
    }

    private func createCustomTitleView() -> UIView {
        let containerView = UIView()

        let titleLabel = UILabel()
        titleLabel.font = Utils.boldFont(size: 17)
        titleLabel.textColor = .textPrimary
        titleLabel.textAlignment = .center
        titleLabel.numberOfLines = 2
        titleLabel.text = product?.name ?? ""

        let dateButton = UIButton(type: .system)
        dateButton.addTarget(self, action: #selector(dateButtonTapped), for: .touchUpInside)
        styleDateChip(dateButton)
        updateDateChip(dateButton)

        self.titleLabel = titleLabel
        self.dateButton = dateButton

        let mainStackView = UIStackView(arrangedSubviews: [titleLabel, dateButton])
        mainStackView.axis = .vertical
        mainStackView.spacing = 6
        mainStackView.alignment = .center

        containerView.addSubview(mainStackView)
        mainStackView.snp.makeConstraints { make in
            make.top.bottom.equalToSuperview()
            make.centerX.equalToSuperview()
            make.leading.greaterThanOrEqualToSuperview()
            make.trailing.lessThanOrEqualToSuperview()
        }

        containerView.snp.makeConstraints { make in
            make.height.greaterThanOrEqualTo(64)
        }

        return containerView
    }

    private var titleLabel: UILabel?
    private var dateButton: UIButton?

    private func styleDateChip(_ button: UIButton) {
        button.titleLabel?.font = .bodyRegular(size: 14)
        button.setTitleColor(.brandPrimary, for: .normal)
        button.tintColor = .brandPrimary
        button.backgroundColor = .clear
        button.setImage(UIImage(systemName: "calendar"), for: .normal)
        button.semanticContentAttribute = .forceLeftToRight
        if #available(iOS 15.0, *) {
            var config = UIButton.Configuration.plain()
            config.image = UIImage(systemName: "calendar")
            config.imagePadding = 4
            config.baseForegroundColor = .brandPrimary
            config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
                var outgoing = incoming
                outgoing.font = .bodyRegular(size: 14)
                return outgoing
            }
            button.configuration = config
        } else {
            button.imageEdgeInsets = UIEdgeInsets(top: 0, left: -2, bottom: 0, right: 4)
        }
    }

    private func updateDateChip(_ button: UIButton) {
        let title = formatDateString(date)
        if #available(iOS 15.0, *) {
            button.configuration?.title = title
        } else {
            button.setTitle(title, for: .normal)
        }
    }

    private func formatDateString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "dd/MM/yyyy"
        return formatter.string(from: date)
    }

    @objc private func dateButtonTapped() {
        let controller = DatePickerViewController.instance()
        controller.delegate = self

        let calendar = Calendar.current
        let today = Date()
        let minDate = calendar.startOfDay(for: today)
        let maxDate = calendar.date(byAdding: .year, value: 1, to: today) ?? today

        controller.configure(selectedDate: date, minimumDate: minDate, maximumDate: maxDate)
        present(controller, animated: true)
    }

    private func updateNavigationTitle() {
        titleLabel?.text = product?.name ?? ""
        if let dateButton {
            updateDateChip(dateButton)
        }
    }

    override func setupData() {
        if let product = self.product {
            showProgressText(text: "Loading...".localized())
            loadOrdersForProduct(productId: product.product_id)
        }
    }

    // MARK: - API Methods
    private func loadOrdersForProduct(productId: Int) {
        loadProductAvailabilityV2(productId: productId, date: date)
    }

    private func loadProductAvailabilityV2(productId: Int, date: Date) {
        OrderService.shared.loadProductAvailabilityV2(
            productId: productId,
            date: date,
            outletId: currentOutletId
        ) { [weak self] response, error in
            self?.hideProgress()

            if let err = error {
                UIAlertController.errorAlert(parent: self, error: err)
            } else if let availabilityResponse = response {
                self?.handleNewAvailabilityResponse(availabilityResponse)
            }
        }
    }

    private func handleNewAvailabilityResponse(_ response: NewAvailabilityResponse) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            if response.success, let data = response.data {
                let metrics = self.resolveAvailabilityMetrics(from: data)

                let headerWidth = self.orderTableView.bounds.width
                if headerWidth > 0 {
                    self.summaryHeaderView.frame = CGRect(
                        x: 0,
                        y: 0,
                        width: headerWidth,
                        height: self.summaryHeaderView.frame.height
                    )
                }

                self.summaryHeaderView.configure(
                    stock: metrics.stock,
                    shelfAvailable: metrics.shelfAvailable,
                    effectiveAvailable: metrics.effectiveAvailable,
                    renting: metrics.renting,
                    conflicts: metrics.conflicts,
                    checkDate: self.formatDateString(self.date)
                )
                self.orderTableView.setNeedsLayout()
                self.orderTableView.layoutIfNeeded()
                self.resizeTableHeaderIfNeeded()

                self.availabilityOrders = self.sortedAvailabilityOrders(data.orders ?? [])

                print("📊 New Availability Response:")
                print("   Product: \(data.productName ?? "Unknown")")
                if let outletName = metrics.outletName {
                    print("   Outlet: \(outletName)")
                }
                print("   Stock: \(metrics.stock), Shelf: \(metrics.shelfAvailable), Renting: \(metrics.renting), Conflicts: \(metrics.conflicts), Effective: \(metrics.effectiveAvailable)")
                print("   Orders: \(self.availabilityOrders.count)")
            } else {
                let errorMessage = response.message ?? "Failed to load product availability"
                let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "OrderCheckViewController")
                UIAlertController.errorAlert(parent: self, error: error)
            }
        }
    }

    private func resolveAvailabilityMetrics(from data: NewAvailabilityData) -> AvailabilityMetrics {
        let outletData = selectedOutletData(from: data)
        let conflicts = resolvedConflictQuantity(outletData: outletData, data: data)

        let rawStock = outletData?.stock
            ?? data.totalStock
            ?? derivedStock(outletData: outletData, data: data, conflicts: conflicts)
            ?? fallbackStockFromProduct()

        let stock = normalizedMetric(rawStock)
        let stockUpperBound = stock > 0 ? stock : nil

        let rawRenting = outletData?.renting
            ?? data.totalRenting
            ?? derivedRenting(outletData: outletData, data: data, stock: stock, conflicts: conflicts)

        let renting = normalizedMetric(rawRenting, upperBound: stockUpperBound)

        // Có sẵn: current shelf count (not date-specific). SALE is reflected in outlet.available.
        let rawShelfAvailable = outletData?.available
            ?? data.totalAvailableStock
            ?? derivedShelfAvailable(stock: stock, renting: renting)

        let shelfAvailable = normalizedMetric(rawShelfAvailable, upperBound: stockUpperBound)

        // Verdict: units free for the checked rental day (date-specific).
        let rawEffective = outletData?.effectivelyAvailable
            ?? derivedEffectiveAvailability(outletData: outletData, conflicts: conflicts)
            ?? max(0, shelfAvailable - max(0, conflicts))

        let effectiveAvailable = normalizedMetric(rawEffective, upperBound: stockUpperBound)

        return AvailabilityMetrics(
            stock: stock,
            shelfAvailable: shelfAvailable,
            effectiveAvailable: effectiveAvailable,
            renting: renting,
            conflicts: normalizedMetric(conflicts, upperBound: stockUpperBound),
            outletName: outletData?.outletName
        )
    }

    private func selectedOutletData(from data: NewAvailabilityData) -> NewAvailabilityOutlet? {
        if let outletId = currentOutletId,
           let matchedOutlet = data.availabilityByOutlet?.first(where: { $0.outletId == outletId }) {
            return matchedOutlet
        }

        return data.availabilityByOutlet?.first
    }

    private func resolvedConflictQuantity(outletData: NewAvailabilityOutlet?, data: NewAvailabilityData) -> Int {
        if let conflictQuantity = outletData?.conflictingQuantity, conflictQuantity > 0 {
            return conflictQuantity
        }

        let outletConflictTotal = outletData?.conflicts?.reduce(0) { partial, conflict in
            partial + max(0, conflict.quantity ?? 0)
        } ?? 0
        if outletConflictTotal > 0 {
            return outletConflictTotal
        }

        let orderConflictTotal = data.orders?.reduce(0) { partial, order in
            guard order.isConflict == true else { return partial }
            return partial + max(0, order.quantity ?? 0)
        } ?? 0
        if orderConflictTotal > 0 {
            return orderConflictTotal
        }

        return max(0, data.totalConflictsFound ?? 0)
    }

    private func derivedStock(outletData: NewAvailabilityOutlet?, data: NewAvailabilityData, conflicts: Int) -> Int? {
        if let outletAvailable = outletData?.available {
            return max(0, outletAvailable) + max(0, outletData?.renting ?? 0)
        }

        if let effectiveAvailable = outletData?.effectivelyAvailable {
            return max(0, effectiveAvailable) + max(0, outletData?.renting ?? 0) + max(0, conflicts)
        }

        if let totalAvailable = data.totalAvailableStock {
            return max(0, totalAvailable) + max(0, data.totalRenting ?? 0) + max(0, conflicts)
        }

        return nil
    }

    private func derivedRenting(outletData: NewAvailabilityOutlet?, data: NewAvailabilityData, stock: Int, conflicts: Int) -> Int? {
        if let outletAvailable = outletData?.available {
            return max(0, stock - max(0, outletAvailable))
        }

        if let effectiveAvailable = outletData?.effectivelyAvailable {
            return max(0, stock - max(0, effectiveAvailable) - max(0, conflicts))
        }

        if let totalAvailable = data.totalAvailableStock {
            return max(0, stock - max(0, totalAvailable) - max(0, conflicts))
        }

        return nil
    }

    private func derivedShelfAvailable(stock: Int, renting: Int) -> Int? {
        guard stock > 0 else { return nil }
        return max(0, stock - renting)
    }

    private func derivedEffectiveAvailability(outletData: NewAvailabilityOutlet?, conflicts: Int) -> Int? {
        guard let outletAvailable = outletData?.available else { return nil }
        return max(0, outletAvailable - max(0, conflicts))
    }

    private func fallbackStockFromProduct() -> Int? {
        guard let product = product else { return nil }

        if let totalStock = product.totalStock, totalStock >= 0 {
            return totalStock
        }

        if let available = product.available, available >= 0 {
            return available + max(0, product.renting ?? 0)
        }

        return nil
    }

    private func normalizedMetric(_ value: Int?, upperBound: Int? = nil) -> Int {
        let nonNegativeValue = max(0, value ?? 0)

        if let upperBound = upperBound, upperBound >= 0 {
            return min(nonNegativeValue, upperBound)
        }

        return nonNegativeValue
    }

    private func sortedAvailabilityOrders(_ orders: [NewAvailabilityOrder]) -> [NewAvailabilityOrder] {
        orders.sorted { lhs, rhs in
            let leftPickup = lhs.pickupPlanAt?.toDate() ?? .distantPast
            let rightPickup = rhs.pickupPlanAt?.toDate() ?? .distantPast
            return leftPickup > rightPickup
        }
    }

    private func updateHistorySection() {
        if isHistoryExpanded && availabilityOrders.isEmpty {
            historyEmptyView.frame = CGRect(x: 0, y: 0, width: orderTableView.bounds.width, height: 120)
            orderTableView.tableFooterView = historyEmptyView
        } else {
            orderTableView.tableFooterView = UIView()
        }
    }

    private func toggleHistorySection() {
        isHistoryExpanded.toggle()
        updateHistorySection()
        orderTableView.reloadSections(IndexSet(integer: 0), with: .fade)
    }

    // MARK: - Helper Methods
    func processDate(date: Date) {
        guard let product = self.product else { return }
        self.date = date
        loadProductAvailabilityV2(productId: product.product_id, date: date)
    }

    // MARK: - Public Methods
    func loadProduct(_ product: Product) {
        self.product = product
        self.date = Date()
    }
}

// MARK: - UITableViewDataSource, UITableViewDelegate
extension OrderCheckViewController: UITableViewDataSource, UITableViewDelegate {
    func numberOfSections(in tableView: UITableView) -> Int {
        1
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        guard isHistoryExpanded else { return 0 }
        return availabilityOrders.count
    }

    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? {
        let header = AvailabilityHistorySectionHeaderView(
            frame: CGRect(x: 0, y: 0, width: tableView.bounds.width, height: 44)
        )
        header.configure(orderCount: availabilityOrders.count, isExpanded: isHistoryExpanded)
        header.onToggle = { [weak self] in
            self?.toggleHistorySection()
        }
        return header
    }

    func tableView(_ tableView: UITableView, heightForHeaderInSection section: Int) -> CGFloat {
        44
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        guard let cell = tableView.dequeueReusableCell(
            withIdentifier: AvailabilityHistoryCell.reuseIdentifier,
            for: indexPath
        ) as? AvailabilityHistoryCell else {
            return UITableViewCell()
        }

        cell.bind(order: availabilityOrders[indexPath.row])
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)

        let availOrder = availabilityOrders[indexPath.row]
        guard let orderId = availOrder.id else { return }

        showProgressText(text: "Loading...".localized())
        OrderService.shared.loadOrderDetail(orderId: orderId) { [weak self] detail, error in
            self?.hideProgress()
            guard let self = self else { return }

            if let error = error {
                UIAlertController.errorAlert(parent: self, error: error)
                return
            }

            guard let detail = detail else { return }
            let fullOrder = Order.from(detail: detail)

            self.dismiss(animated: true) {
                self.delegate?.didSelectOrder(order: fullOrder, sender: self)
            }
        }
    }
}

// MARK: - DatePickerViewControllerDelegate
extension OrderCheckViewController: DatePickerViewControllerDelegate {
    func didSelectDate(_ date: Date, sender: DatePickerViewController) {
        self.date = date
        if let product = self.product {
            showProgressText(text: "Loading...".localized())
            loadProductAvailabilityV2(productId: product.product_id, date: date)
        }
    }
}

// MARK: - String Extension for Date Conversion
extension String {
    func toDate() -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
        formatter.timeZone = TimeZone(abbreviation: "UTC")
        return formatter.date(from: self)
    }
}
