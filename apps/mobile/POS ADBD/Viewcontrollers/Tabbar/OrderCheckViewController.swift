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
    private var availabilityOrders: [NewAvailabilityOrder] = []

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

    private var isLoadingAvailability = false
    private var hasRevealedContent = false
    private var productStock = 0
    private var lastAvailabilityMetrics: AvailabilityMetrics?
    private var shouldPresentHistoryOnNextLoad = false
    private weak var presentedHistorySheet: AvailabilityOrderHistorySheetViewController?
    private var occupancyLoadGeneration = 0
    /// Cached occupancy per month (key `yyyy-MM`) for the current product — no re-fetch when scrolling back.
    private var occupancyCacheByMonth: [String: [String: Int]] = [:]
    private var occupancyCacheProductId: Int?
    private var occupancyLoadingMonthKey: String?

    private var currentOutletId: Int? {
        User.current()?.outlet?.id ?? User.current()?.outletId
    }

    var delegate: OrderCheckViewControllerDelegate?

    // MARK: - UI Components
    private lazy var occupancyCalendarView: AvailabilityOccupancyCalendarView = {
        let calendarView = AvailabilityOccupancyCalendarView()
        calendarView.onSelectDate = { [weak self] selected in
            self?.handleCalendarDaySelection(selected)
        }
        calendarView.onVisibleMonthChange = { [weak self] page in
            self?.loadOccupancyCalendar(for: page)
        }
        return calendarView
    }()

    private var occupancyCalendarHeightConstraint: Constraint?
    private var summaryHeightConstraint: Constraint?
    private var lastOccupancyCalendarHeight: CGFloat = 0
    private var lastSummaryHeight: CGFloat = 0

    private lazy var scrollView: UIScrollView = {
        let scroll = UIScrollView()
        scroll.alwaysBounceVertical = true
        scroll.showsVerticalScrollIndicator = false
        scroll.keyboardDismissMode = .onDrag
        scroll.contentInsetAdjustmentBehavior = .never
        return scroll
    }()

    private lazy var calendarSurfaceView: UIView = {
        let view = UIView()
        view.backgroundColor = .clear
        return view
    }()

    private lazy var summaryView = AvailabilitySummaryHeaderView()

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
        resizeSummaryIfNeeded()
    }

    private func updateOccupancyCalendarHeightIfNeeded() {
        let fixedHeight = AvailabilityOccupancyCalendarView.fixedBlockHeight
        guard abs(lastOccupancyCalendarHeight - fixedHeight) > 0.5 else { return }
        lastOccupancyCalendarHeight = fixedHeight
        occupancyCalendarHeightConstraint?.update(offset: fixedHeight)
    }

    // MARK: - Setup
    override func setupUI() {
        view.backgroundColor = .backgroundPrimary
        setupNavigationBar()

        guard customNavBar != nil else { return }

        view.addSubview(scrollView)
        scrollView.addSubview(summaryView)
        scrollView.addSubview(calendarSurfaceView)
        calendarSurfaceView.addSubview(occupancyCalendarView)

        summaryView.alpha = 0
        summaryView.isHidden = true

        scrollView.snp.makeConstraints { make in
            make.top.equalTo(customNavBar!.snp.bottom)
            make.leading.trailing.bottom.equalTo(view.safeAreaLayoutGuide)
        }

        summaryView.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(6)
            make.leading.trailing.equalTo(scrollView.frameLayoutGuide)
            summaryHeightConstraint = make.height.equalTo(0).constraint
        }

        let initialCalendarHeight = AvailabilityOccupancyCalendarView.fixedBlockHeight
        calendarSurfaceView.snp.makeConstraints { make in
            make.top.equalTo(summaryView.snp.bottom).offset(12)
            make.leading.trailing.equalTo(scrollView.frameLayoutGuide).inset(16)
            make.bottom.equalToSuperview().offset(-16)
        }

        occupancyCalendarView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            occupancyCalendarHeightConstraint = make.height.equalTo(initialCalendarHeight).constraint
        }

        configureOccupancyCalendar()
        updateOccupancyCalendarHeightIfNeeded()
        if product != nil {
            loadOccupancyCalendar(for: date)
        }
    }

    private func configureOccupancyCalendar() {
        let today = Calendar.current.startOfDay(for: Date())
        let maxDate = Calendar.current.date(byAdding: .year, value: 1, to: today) ?? today
        occupancyCalendarView.configure(
            selectedDate: date,
            minimumDate: today,
            maximumDate: maxDate
        )
    }

    private func updateOccupancyCalendarHeight() {
        updateOccupancyCalendarHeightIfNeeded()
    }

    private func resizeSummaryIfNeeded() {
        let width = view.bounds.width
        guard width > 0, !summaryView.isHidden else {
            if summaryHeightConstraint?.layoutConstraints.first?.constant != 0 {
                summaryHeightConstraint?.update(offset: 0)
            }
            return
        }

        summaryView.frame = CGRect(x: 0, y: 0, width: width, height: 1)
        summaryView.setNeedsLayout()
        summaryView.layoutIfNeeded()

        let height = summaryView.systemLayoutSizeFitting(
            CGSize(width: width, height: UILayoutFittingCompressedSize.height),
            withHorizontalFittingPriority: .required,
            verticalFittingPriority: .fittingSizeLevel
        ).height

        guard height > 0 else { return }

        if abs(lastSummaryHeight - height) > 0.5 {
            lastSummaryHeight = height
            summaryHeightConstraint?.update(offset: height)
            view.layoutIfNeeded()
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
        navBar.setPreferredBarHeight(56, customTitleMaxHeight: 44)
    }

    private func createCustomTitleView() -> UIView {
        let containerView = UIView()

        let titleLabel = UILabel()
        titleLabel.font = Utils.boldFont(size: 17)
        titleLabel.textColor = .textPrimary
        titleLabel.textAlignment = .center
        titleLabel.numberOfLines = 2
        titleLabel.text = product?.name ?? ""
        self.titleLabel = titleLabel

        containerView.addSubview(titleLabel)
        titleLabel.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }

        containerView.snp.makeConstraints { make in
            make.height.greaterThanOrEqualTo(44)
        }

        return containerView
    }

    private var titleLabel: UILabel?

    private func formatDateString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "dd/MM/yyyy"
        return formatter.string(from: date)
    }

    private func occupancyMonthCacheKey(for date: Date) -> String {
        let components = Calendar.current.dateComponents([.year, .month], from: date)
        return String(format: "%04d-%02d", components.year ?? 0, components.month ?? 0)
    }

    private func startOfMonth(for date: Date) -> Date {
        Calendar.current.date(from: Calendar.current.dateComponents([.year, .month], from: date)) ?? date
    }

    private func loadOccupancyCalendar(for visibleMonth: Date) {
        guard let product else { return }
        let calendar = Calendar.current
        let monthStart = startOfMonth(for: visibleMonth)
        let cacheKey = occupancyMonthCacheKey(for: monthStart)

        // Already loaded for this product — show cached heat/qty immediately, no API call.
        if occupancyCacheProductId == product.product_id,
           let cached = occupancyCacheByMonth[cacheKey] {
            occupancyCalendarView.setDayAvailability(
                cached,
                stock: productStock,
                forVisibleMonth: monthStart
            )
            updateOccupancyCalendarHeight()
            return
        }

        // New month — neutral tiles until API succeeds.
        occupancyCalendarView.clearDayAvailabilityPendingLoad()

        if occupancyLoadingMonthKey == cacheKey { return }
        occupancyLoadingMonthKey = cacheKey

        let from = calendar.date(byAdding: .day, value: -7, to: monthStart) ?? monthStart
        let endOfMonth = calendar.date(byAdding: DateComponents(month: 1, day: -1), to: monthStart) ?? monthStart
        let to = calendar.date(byAdding: .day, value: 7, to: endOfMonth) ?? endOfMonth

        occupancyLoadGeneration += 1
        let generation = occupancyLoadGeneration

        OrderService.shared.loadProductAvailabilityCalendar(
            productId: product.product_id,
            from: from,
            to: to,
            outletId: currentOutletId
        ) { [weak self] availableByDate, _ in
            DispatchQueue.main.async {
                guard let self else { return }
                self.occupancyLoadingMonthKey = nil
                guard generation == self.occupancyLoadGeneration else { return }

                self.occupancyCacheByMonth[cacheKey] = availableByDate
                self.occupancyCacheProductId = product.product_id

                // Paint only if user is still on this month page.
                let visibleKey = self.occupancyMonthCacheKey(
                    for: self.occupancyCalendarView.visibleMonthStart
                )
                guard visibleKey == cacheKey else { return }

                self.occupancyCalendarView.setDayAvailability(
                    availableByDate,
                    stock: self.productStock,
                    forVisibleMonth: monthStart
                )
                self.updateOccupancyCalendarHeight()
            }
        }
    }

    private func resetOccupancyCache() {
        occupancyCacheByMonth = [:]
        occupancyCacheProductId = nil
        occupancyLoadingMonthKey = nil
        occupancyLoadGeneration += 1
        occupancyCalendarView.clearDayAvailabilityPendingLoad()
    }

    private func updateNavigationTitle() {
        titleLabel?.text = product?.name ?? ""
    }

    override func setupData() {
        if let product = self.product {
            loadOrdersForProduct(productId: product.product_id)
        }
    }

    // MARK: - API Methods
    private func loadOrdersForProduct(productId: Int) {
        loadProductAvailabilityV2(productId: productId, date: date)
    }

    private func loadProductAvailabilityV2(productId: Int, date: Date) {
        beginAvailabilityLoading()
        OrderService.shared.loadProductAvailabilityV2(
            productId: productId,
            date: date,
            outletId: currentOutletId
        ) { [weak self] response, error in
            if let err = error {
                self?.hideProgress()
                self?.shouldPresentHistoryOnNextLoad = false
                UIAlertController.errorAlert(parent: self, error: err)
            } else if let availabilityResponse = response {
                self?.handleNewAvailabilityResponse(availabilityResponse)
            } else {
                self?.hideProgress()
                self?.shouldPresentHistoryOnNextLoad = false
            }
        }
    }

    private func beginAvailabilityLoading() {
        if hasRevealedContent {
            showProgressText(text: "Loading...".localized())
            return
        }
        isLoadingAvailability = true
        showProgressText(text: "Loading...".localized())
    }

    private func revealAvailabilityContent() {
        hideProgress()
        hasRevealedContent = true
        if isLoadingAvailability {
            isLoadingAvailability = false
            summaryView.isHidden = false
            UIView.animate(withDuration: 0.2) {
                self.summaryView.alpha = 1
            }
            resizeSummaryIfNeeded()
        }
    }

    private func handleNewAvailabilityResponse(_ response: NewAvailabilityResponse) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            if response.success, let data = response.data {
                let metrics = self.resolveAvailabilityMetrics(from: data)
                self.productStock = metrics.stock
                self.lastAvailabilityMetrics = metrics

                self.summaryView.configure(
                    stock: metrics.stock,
                    shelfAvailable: metrics.shelfAvailable,
                    effectiveAvailable: metrics.effectiveAvailable,
                    renting: metrics.renting,
                    conflicts: metrics.conflicts,
                    checkDate: self.formatDateString(self.date)
                )
                self.configureOccupancyCalendar()
                self.resizeSummaryIfNeeded()

                self.availabilityOrders = self.sortedAvailabilityOrders(data.orders ?? [])
                self.revealAvailabilityContent()
                self.loadOccupancyCalendar(for: self.date)

                if self.shouldPresentHistoryOnNextLoad {
                    self.shouldPresentHistoryOnNextLoad = false
                    self.presentOrderHistorySheetIfNeeded()
                }
            } else {
                self.shouldPresentHistoryOnNextLoad = false
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

        let rawShelfAvailable = outletData?.available
            ?? data.totalAvailableStock
            ?? derivedShelfAvailable(stock: stock, renting: renting)

        let shelfAvailable = normalizedMetric(rawShelfAvailable, upperBound: stockUpperBound)

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

    // MARK: - Calendar + history sheet (option B)
    private func handleCalendarDaySelection(_ selected: Date) {
        guard let product else { return }
        let day = Calendar.current.startOfDay(for: selected)
        let isSameDay = day == Calendar.current.startOfDay(for: date)

        if isSameDay {
            presentOrderHistorySheetIfNeeded()
            return
        }

        shouldPresentHistoryOnNextLoad = true
        date = day
        configureOccupancyCalendar()
        loadProductAvailabilityV2(productId: product.product_id, date: day)
    }

    private func presentOrderHistorySheetIfNeeded() {
        guard !availabilityOrders.isEmpty else { return }
        if presentedHistorySheet != nil { return }

        let metrics = lastAvailabilityMetrics
        let sheet = AvailabilityOrderHistorySheetViewController(
            orders: availabilityOrders,
            dateTitle: formatDateString(date),
            stock: metrics?.stock ?? productStock,
            available: metrics?.shelfAvailable ?? metrics?.effectiveAvailable ?? 0,
            renting: metrics?.renting ?? 0
        )
        sheet.onSelectOrder = { [weak self, weak sheet] order in
            self?.openOrderDetail(from: order, dismissing: sheet)
        }
        sheet.modalPresentationStyle = .pageSheet
        presentedHistorySheet = sheet
        present(sheet, animated: true)
    }

    private func openOrderDetail(from availOrder: NewAvailabilityOrder, dismissing sheet: AvailabilityOrderHistorySheetViewController?) {
        guard let orderId = availOrder.id else { return }

        showProgressText(text: "Loading...".localized())
        OrderService.shared.loadOrderDetail(orderId: orderId) { [weak self] detail, error in
            self?.hideProgress()
            guard let self else { return }

            if let error = error {
                UIAlertController.errorAlert(parent: sheet ?? self, error: error)
                return
            }

            guard let detail = detail else { return }
            let fullOrder = Order.from(detail: detail)

            sheet?.dismiss(animated: true) {
                self.presentedHistorySheet = nil
                self.dismiss(animated: true) {
                    self.delegate?.didSelectOrder(order: fullOrder, sender: self)
                }
            }
        }
    }

    // MARK: - Public Methods
    func loadProduct(_ product: Product) {
        self.product = product
        self.date = Date()
        hasRevealedContent = false
        shouldPresentHistoryOnNextLoad = false
        presentedHistorySheet = nil
        availabilityOrders = []
        lastAvailabilityMetrics = nil
        summaryView.alpha = 0
        summaryView.isHidden = true
        lastSummaryHeight = 0
        summaryHeightConstraint?.update(offset: 0)
        if isViewLoaded {
            resetOccupancyCache()
            configureOccupancyCalendar()
            loadOccupancyCalendar(for: date)
            loadOrdersForProduct(productId: product.product_id)
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
