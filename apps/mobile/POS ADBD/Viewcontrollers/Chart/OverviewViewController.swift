//
//  OverviewViewController.swift
//  POS ADBD
//
//  Created by Trinh Tran on 11/28/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import DGCharts
import SnapKit

// MARK: - OverviewViewController
class OverviewViewController: DemoBaseViewController {
    
    // MARK: - Properties
    private var selectedMode: ViewMode = .dailyReport {
        didSet {
            guard oldValue != selectedMode else { return }
            updateViewForMode()
        }
    }
    
    // Chart data
    private var xValues: [String] = []
    private var yRValues: [Double] = []
    private var yEValues: [Double] = []
    private var yOValues: [Double] = []
    
    // Order data
    private var orders: [Order] = []
    private var dailyIncomeOrders: [DailyIncomeOrder] = []
    private var dailyIncomeData: DailyIncomeAnalyticsResponse?
    private var overviewTopCustomers: [TopCustomer] = []
    private var overviewTopProducts: [TopProduct] = []
    private var overviewGrowthMetrics: GrowthMetricsResponse?
    private var overviewOrderStatistics: OrderStatisticsResponse?
    
    // Date selection
    private let years: [Int] = {
        let currentYear = Date().getYear()
        return [currentYear - 1, currentYear, currentYear + 1]
    }()
    
    private var yearSelectedIndex: Int = 1 {
        didSet { updateDateButtonTitle() }
    }
    
    private var todayDate: Date = Date() {
        didSet { updateDateButtonTitle() }
    }
    
    // Stats
    private var totalOrder: Double = 0 {
        didSet { summaryCard.ordersLabel.text = totalOrder.formatStringInCommon() }
    }

    private var realIncome: Double = 0 {
        didSet {
            summaryCard.incomeLabel.text = realIncome.formatStringInCommon()
            summaryCard.applyIncomeColor(for: realIncome)
        }
    }

    private var expectedIncome: Double = 0

    private var isIPad: Bool {
        traitCollection.horizontalSizeClass == .regular
    }

    // MARK: - UI Components
    private lazy var refreshButton: UIButton = {
        let button = UIButton(type: .system)
        button.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        button.tintColor = .brandPrimary
        button.addTarget(self, action: #selector(refreshData), for: .touchUpInside)
        return button
    }()

    private lazy var modeSegmentedControl: UISegmentedControl = {
        let control = UISegmentedControl(items: ViewMode.allCases.map { $0.title })
        control.selectedSegmentIndex = ViewMode.dailyReport.rawValue
        control.addTarget(self, action: #selector(modeSegmentChanged(_:)), for: .valueChanged)
        control.selectedSegmentTintColor = .brandPrimary
        control.setTitleTextAttributes(
            [NSAttributedString.Key.font: UIFont.bodyMedium(size: 14), NSAttributedString.Key.foregroundColor: UIColor.textPrimary],
            for: .normal
        )
        control.setTitleTextAttributes(
            [NSAttributedString.Key.font: UIFont.bodyMedium(size: 14), NSAttributedString.Key.foregroundColor: UIColor.white],
            for: .selected
        )
        control.backgroundColor = .backgroundCard
        return control
    }()

    private lazy var emptyStateView: UIView = {
        let container = UIView()
        container.backgroundColor = .backgroundPrimary
        container.isHidden = true

        let iconConfig = UIImage.SymbolConfiguration(pointSize: 56, weight: .light)
        let iconImage = UIImage(systemName: "doc.text.magnifyingglass", withConfiguration: iconConfig)
        let iconView = UIImageView(image: iconImage)
        iconView.tintColor = .tertiaryLabel
        iconView.contentMode = .scaleAspectFit

        let label = UILabel()
        label.text = "No orders for this day".localized()
        label.font = .bodyRegular(size: 16)
        label.textColor = .textSecondary
        label.textAlignment = .center
        label.numberOfLines = 0
        label.tag = 100

        let button = UIButton(type: .system)
        button.setTitle("Try another date".localized(), for: .normal)
        button.titleLabel?.font = .bodyMedium(size: 16)
        button.tintColor = .brandPrimary
        button.addTarget(self, action: #selector(emptyStateTryAnotherDateTapped), for: .touchUpInside)
        button.tag = 101

        container.addSubview(iconView)
        container.addSubview(label)
        container.addSubview(button)

        iconView.snp.makeConstraints { make in
            make.centerX.equalToSuperview()
            make.top.equalToSuperview().offset(48)
        }
        label.snp.makeConstraints { make in
            make.centerX.equalToSuperview()
            make.top.equalTo(iconView.snp.bottom).offset(20)
            make.leading.greaterThanOrEqualToSuperview().offset(24)
            make.trailing.lessThanOrEqualToSuperview().offset(-24)
        }
        button.snp.makeConstraints { make in
            make.centerX.equalToSuperview()
            make.top.equalTo(label.snp.bottom).offset(24)
            make.bottom.lessThanOrEqualToSuperview().offset(-32)
        }
        return container
    }()

    private lazy var summaryCard: OverviewSummaryCardView = {
        OverviewSummaryCardView(
            isIPad: isIPad,
            dateTarget: self,
            dateAction: #selector(dateButtonTapped),
            infoTarget: self,
            infoAction: #selector(overviewInfoButtonTapped(_:))
        )
    }()

    private lazy var ordersSectionTitleLabel: UILabel = {
        let label = UILabel()
        label.numberOfLines = 2
        label.textColor = .textPrimary
        label.adjustsFontSizeToFitWidth = true
        label.minimumScaleFactor = 0.78
        return label
    }()

    private lazy var ordersSectionSubtitleLabel: UILabel = {
        let label = UILabel()
        label.font = .bodyRegular(size: 13)
        label.textColor = .textTertiary
        label.numberOfLines = 1
        return label
    }()

    private lazy var ordersSectionView: UIView = {
        let container = UIView()
        container.isHidden = true

        let stack = UIStackView(arrangedSubviews: [ordersSectionTitleLabel, ordersSectionSubtitleLabel])
        stack.axis = .vertical
        stack.spacing = 2
        stack.alignment = .leading

        container.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }

        return container
    }()

    private lazy var chartScrollView: UIScrollView = {
        let sv = UIScrollView()
        sv.showsVerticalScrollIndicator = true
        sv.alwaysBounceVertical = true
        sv.isHidden = true
        return sv
    }()

    private lazy var chartScrollContentView: UIView = {
        let v = UIView()
        return v
    }()

    private lazy var chartStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 14
        return stack
    }()

    private lazy var chartsSection: OverviewChartsSectionView = {
        OverviewChartsSectionView(isIPad: isIPad)
    }()

    private lazy var insightsPanel: OverviewInsightsPanelView = {
        OverviewInsightsPanelView(isIPad: isIPad)
    }()

    private lazy var createOrderFab: UIButton = {
        var config = UIButton.Configuration.filled()
        config.title = "Create Order".localized()
        config.image = UIImage(systemName: "plus")
        config.imagePadding = 8
        config.imagePlacement = .leading
        config.baseBackgroundColor = .brandPrimary
        config.baseForegroundColor = .white
        config.cornerStyle = .capsule
        config.contentInsets = NSDirectionalEdgeInsets(top: 14, leading: 18, bottom: 14, trailing: 20)
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = Utils.boldFont(size: 16)
            return outgoing
        }

        let button = UIButton(configuration: config)
        button.layer.shadowColor = UIColor.brandPrimary.withAlphaComponent(0.35).cgColor
        button.layer.shadowOpacity = 1
        button.layer.shadowRadius = 12
        button.layer.shadowOffset = CGSize(width: 0, height: 6)
        button.addTarget(self, action: #selector(createOrderFabTapped), for: .touchUpInside)
        button.isHidden = true
        return button
    }()

    private lazy var orderTableView: UITableView = {
        let table = UITableView()
        table.delegate = self
        table.dataSource = self
        table.isHidden = true
        table.register(SaleCell.self, forCellReuseIdentifier: "SaleCell")
        table.backgroundColor = .clear
        table.separatorStyle = .none
        table.rowHeight = UITableViewAutomaticDimension
        table.estimatedRowHeight = 108
        table.contentInset = UIEdgeInsets(top: 0, left: 0, bottom: 16, right: 0)
        if #available(iOS 15.0, *) {
            table.sectionHeaderTopPadding = 0
        }
        return table
    }()

    private var chartTopToSummaryConstraint: Constraint?
    private var listHeaderTopToSegmentConstraint: Constraint?
    private var listHeaderTopToNavConstraint: Constraint?

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupNavigationBar()
        setupUI()
        setupCharts()
        
        // Set initial view state for daily report mode (before setting selectedMode)
        chartScrollView.isHidden = true
        chartStackView.isHidden = true
        orderTableView.isHidden = false
        ordersSectionView.isHidden = false
        
        // Initialize mode selection and load data
        initializeModeSelection()
        chartsSection.configureInitialExpansion(isIPad: isIPad)
        updateDateButtonTitle()
        applySummaryLayout()
        updateCreateOrderFabVisibility()
        loadData()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        updateCreateOrderFabVisibility()
        view.bringSubview(toFront: createOrderFab)
    }
    
    // MARK: - Setup
    override func setupUI() {
        super.setupUI()
        view.backgroundColor = .backgroundPrimary
        
        setupHeaderView()
        setupConstraints()
    }
    
    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        let navBar = setupCustomNavigationBar(
            title: "Overview".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: true,
            backAction: .pop
        )

        navBar.addRightButton(refreshButton)
        updateModeSegmentVisibility()
    }

    private func updateModeSegmentVisibility() {
        // Hide the mode switch when the user can only see the daily report:
        // outlet staff by role, or anyone lacking full revenue analytics permission.
        let hideSegment = isOutletStaff || !canViewChartAnalytics()
        modeSegmentedControl.isHidden = hideSegment

        if hideSegment {
            listHeaderTopToSegmentConstraint?.deactivate()
            listHeaderTopToNavConstraint?.activate()
        } else {
            listHeaderTopToSegmentConstraint?.activate()
            listHeaderTopToNavConstraint?.deactivate()
        }
    }

    private func applySummaryLayout() {
        let hideCollateral = (selectedMode == .overview)
        summaryCard.revenueInfoButton.isHidden = (selectedMode == .dailyReport)
        summaryCard.growthPillView.isHidden = (selectedMode != .overview)
        summaryCard.setCollateralMetricsVisible(!hideCollateral)

        updateDateButtonTitle()
        if selectedMode == .dailyReport {
            reloadList()
        } else {
            syncSummaryLabelsForYearMode()
            refreshOverviewInsightSections()
        }
    }

    private func syncSummaryLabelsForYearMode() {
        summaryCard.incomeLabel.text = realIncome.formatStringInCommon()
        summaryCard.ordersLabel.text = totalOrder.formatStringInCommon()
        summaryCard.collateralLabel.text = "—"
        summaryCard.collateralPlanLabel.text = "—"
        summaryCard.applyIncomeColor(for: realIncome)
    }

    private func setupHeaderView() {
        view.addSubview(modeSegmentedControl)
        view.addSubview(summaryCard)
        view.addSubview(chartScrollView)
        chartScrollView.addSubview(chartScrollContentView)
        chartScrollContentView.addSubview(chartStackView)
        view.addSubview(ordersSectionView)
        view.addSubview(orderTableView)
        view.addSubview(emptyStateView)
        view.addSubview(createOrderFab)
        
        chartStackView.addArrangedSubview(chartsSection)
        chartStackView.addArrangedSubview(insightsPanel)
        
        if isOutletStaff {
            summaryCard.dateButton.isUserInteractionEnabled = false
        }
    }
    
    private func setupConstraints() {
        guard let customNavBar = customNavBar else { return }

        modeSegmentedControl.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom).offset(12)
            make.leading.trailing.equalToSuperview().inset(16)
            make.height.equalTo(36)
        }

        summaryCard.snp.makeConstraints { make in
            listHeaderTopToSegmentConstraint = make.top.equalTo(modeSegmentedControl.snp.bottom).offset(12).constraint
            listHeaderTopToNavConstraint = make.top.equalTo(customNavBar.snp.bottom).offset(16).constraint
            make.leading.trailing.equalToSuperview().inset(16)
        }
        listHeaderTopToSegmentConstraint?.activate()
        listHeaderTopToNavConstraint?.deactivate()

        chartScrollView.snp.makeConstraints { make in
            make.leading.trailing.bottom.equalToSuperview()
            chartTopToSummaryConstraint = make.top.equalTo(summaryCard.snp.bottom).offset(18).constraint
        }
        chartTopToSummaryConstraint?.activate()

        chartScrollContentView.snp.makeConstraints { make in
            make.edges.equalTo(chartScrollView.contentLayoutGuide)
            make.width.equalTo(chartScrollView.frameLayoutGuide)
        }
        chartStackView.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview().inset(UIEdgeInsets(top: 0, left: 16, bottom: 0, right: 16))
            make.bottom.equalToSuperview().offset(-24)
        }

        ordersSectionView.snp.makeConstraints { make in
            make.top.equalTo(summaryCard.snp.bottom).offset(18)
            make.leading.trailing.equalToSuperview().inset(16)
        }
        
        orderTableView.snp.makeConstraints { make in
            make.top.equalTo(ordersSectionView.snp.bottom).offset(8)
            make.leading.trailing.bottom.equalToSuperview()
        }

        emptyStateView.snp.makeConstraints { make in
            make.top.equalTo(ordersSectionView.snp.bottom).offset(8)
            make.leading.trailing.bottom.equalToSuperview()
        }

        createOrderFab.snp.makeConstraints { make in
            make.trailing.equalToSuperview().inset(20)
            make.bottom.equalTo(view.safeAreaLayoutGuide).inset(16)
        }
    }
    
    private func setupCharts() {
        setup(barLineChartView: chartsSection.barChartView)
        setup(barLineChartView: chartsSection.lineChartView)
        configureOverviewChartInteraction(chartsSection.barChartView)
        configureOverviewChartInteraction(chartsSection.lineChartView)
        
        chartsSection.barChartView.drawBarShadowEnabled = false
        chartsSection.barChartView.drawValueAboveBarEnabled = true
        chartsSection.barChartView.maxVisibleCount = 60
        
        configureXAxis(chartsSection.barChartView.xAxis)
        configureXAxis(chartsSection.lineChartView.xAxis)
        
        let lineLeftAxis = chartsSection.lineChartView.leftAxis
        lineLeftAxis.valueFormatter = MarketAxisValueFormatter() as? AxisValueFormatter
        lineLeftAxis.axisMinimum = 0
        lineLeftAxis.granularity = 2.0
        lineLeftAxis.forceLabelsEnabled = true
    }

    private func configureOverviewChartInteraction(_ chartView: BarLineChartViewBase) {
        chartView.dragEnabled = false
        chartView.setScaleEnabled(false)
        chartView.pinchZoomEnabled = false
        chartView.doubleTapToZoomEnabled = false
        chartView.highlightPerDragEnabled = false
    }
    
    private func configureXAxis(_ axis: XAxis) {
        axis.labelPosition = XAxis.LabelPosition.bottom
        axis.valueFormatter = DefaultAxisValueFormatter(block: { [weak self] index, _ in
            guard let self = self, Int(index) < self.xValues.count else { return "" }
            return self.xValues[Int(index)]
        })
    }
    
    private func initializeModeSelection() {
        modeSegmentedControl.selectedSegmentIndex = selectedMode.rawValue
        updateModeSegmentVisibility()
        selectedMode = .dailyReport
    }

    @objc private func modeSegmentChanged(_ sender: UISegmentedControl) {
        guard let mode = ViewMode(rawValue: sender.selectedSegmentIndex) else { return }
        selectedMode = mode
    }
    
    private func updateViewForMode() {
        // Force daily report for users who cannot access yearly analytics.
        if (isOutletStaff || !canViewChartAnalytics()) && selectedMode != .dailyReport {
            selectedMode = .dailyReport
            return
        }

        modeSegmentedControl.selectedSegmentIndex = selectedMode.rawValue

        let isOverviewMode = selectedMode == .overview
        let isDailyReportMode = selectedMode == .dailyReport

        applySummaryLayout()

        // List order (bảng đơn hàng): chỉ hiện khi xem theo ngày. Xem theo năm chỉ hiện chart.
        let showOrderList = isDailyReportMode
        UIView.animate(withDuration: 0.3) {
            self.chartScrollView.isHidden = !isOverviewMode
            self.chartStackView.isHidden = !isOverviewMode
            self.ordersSectionView.isHidden = !showOrderList
            self.orderTableView.isHidden = !showOrderList
            if !showOrderList {
                self.emptyStateView.isHidden = true
            }
        } completion: { _ in
            self.loadData()
        }
        
        updateDateButtonTitle()
        updateCreateOrderFabVisibility()
    }

    private func updateCreateOrderFabVisibility() {
        let canCreate = PermissionManager.shared.canCreateOrders()
        let showFab = selectedMode == .dailyReport && canCreate
        createOrderFab.isHidden = !showFab
        let bottomInset: CGFloat = showFab ? 88 : 16
        orderTableView.contentInset.bottom = bottomInset
        orderTableView.scrollIndicatorInsets.bottom = bottomInset
    }

    @objc private func createOrderFabTapped() {
        guard PermissionManager.shared.canCreateOrders() else { return }

        tabBarController?.selectedIndex = 0

        guard let homeNav = tabBarController?.viewControllers?.first as? UINavigationController,
              let mainVC = homeNav.viewControllers.first as? MainViewController else {
            return
        }

        homeNav.popToRootViewController(animated: false)

        if !CartStore.shared.cart.items.isEmpty,
           let cartVC = mainVC.cartViewController {
            homeNav.pushViewController(cartVC, animated: true)
        }
    }
    
    // MARK: - Permission Check
    /// Yearly overview (income chart, growth, top lists) requires full revenue analytics.
    /// Backend gates these endpoints on `analytics.view.revenue`, so `analytics.view.dashboard`
    /// alone (OUTLET_STAFF) must NOT unlock yearly mode.
    private func canViewChartAnalytics() -> Bool {
        return PermissionManager.shared.canViewRevenueAnalytics()
    }
    
    /// Check if user can view daily report (list of orders by date)
    /// Daily report can be viewed if user has orders.view (outlet staff) or analytics.view permission
    private func canViewDailyReport() -> Bool {
        // Outlet staff can view daily report (they have orders.view)
        // Users with analytics permission can also view it
        return PermissionManager.shared.canViewOrders() || 
               PermissionManager.shared.canViewAnalytics()
    }
    
    /// Check if current user is outlet staff by role
    /// Outlet staff should only see Daily Report mode and cannot change date
    private var isOutletStaff: Bool {
        return User.account()?.role == .outletStaff
    }
    
    // MARK: - Actions
    @objc private func refreshData() {
        loadData()
    }

    @objc private func emptyStateTryAnotherDateTapped() {
        showDatePicker()
    }

    @objc private func dateButtonTapped() {
        // Outlet staff: disable date selection
        guard !isOutletStaff else { return }
        
        if selectedMode == .overview {
            showYearSelection()
        } else {
            showDatePicker()
        }
    }
    
    private func showYearSelection() {
        let alert = UIAlertController(title: "Select Year".localized(), message: nil, preferredStyle: .actionSheet)
        
        years.enumerated().forEach { index, year in
            let action = UIAlertAction(title: year.inString(), style: .default) { [weak self] _ in
                self?.yearSelectedIndex = index
                self?.loadData()
            }
            if index == yearSelectedIndex {
                action.setValue(true, forKey: "checked")
            }
            alert.addAction(action)
        }
        
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        
        if let popover = alert.popoverPresentationController {
            popover.sourceView = summaryCard.dateButton
            popover.sourceRect = summaryCard.dateButton.bounds
        }
        
        present(alert, animated: true)
    }
    
    private func showDatePicker() {
        let controller = DatePickerViewController.instance()
        controller.delegate = self
        
        let calendar = Calendar.current
        let minimumDate = calendar.date(byAdding: .year, value: -1, to: Date()) ?? Date()
        
        controller.configure(selectedDate: todayDate, minimumDate: minimumDate, maximumDate: Date())
        present(controller, animated: true)
    }
    
    private func updateDateButtonTitle() {
        guard summaryCard.dateButton.superview != nil else { return }

        let title = selectedMode == .overview
            ? years[yearSelectedIndex].inString()
            : todayDate.dateInString()
        summaryCard.dateButton.setTitle(title, for: .normal)
    }
    
    // MARK: - Data Loading
    private func loadData() {
        view.viewWithTag(9090)?.removeFromSuperview()
        setSummaryPlaceholder(placeholder: "—")
        if selectedMode == .overview {
            resetOverviewInsightState()
            refreshOverviewInsightSections()
        }
        switch selectedMode {
        case .overview:
            if canViewChartAnalytics() {
                loadOverview(year: years[yearSelectedIndex])
            } else {
                showNoPermissionMessage()
            }
        case .dailyReport:
            if canViewDailyReport() {
                loadOrder(date: todayDate)
            } else {
                showNoPermissionMessage()
            }
        }
    }
    
    private func loadOrder(date: Date) {
        showProgressText(text: "Loading...".localized(), navigationController: navigationController)

        AnalyticsAPIService.shared.loadDailyIncomeAnalytics(startDate: date, endDate: date) { [weak self] response, error in
            DispatchQueue.main.async {
                self?.hideProgress(navigationController: self?.navigationController)

                if let error = error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    self?.reloadList()
                    return
                }

                guard let response = response else {
                    self?.dailyIncomeOrders = []
                    self?.dailyIncomeData = nil
                    self?.reloadList()
                    return
                }

                self?.dailyIncomeData = response
                self?.dailyIncomeOrders = response.days?.flatMap { $0.orders ?? [] } ?? []
                self?.reloadList()
            }
        }
    }
    
    private func loadOverview(year: Int) {
        guard canViewChartAnalytics() else {
            clearChart()
            return
        }
        
        let calendar = Calendar.current
        let startDate = calendar.date(from: DateComponents(year: year, month: 1, day: 1)) ?? Date()
        let endDate = calendar.date(from: DateComponents(year: year, month: 12, day: 31)) ?? Date()

        showProgressText(text: "Loading...".localized(), navigationController: navigationController)

        // Single aggregated request replaces the previous 5 parallel calls
        // (income + growth + statistics + top products/customers).
        AnalyticsAPIService.shared.loadAnalyticsOverview(startDate: startDate, endDate: endDate, limit: 3) { [weak self] response, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.hideProgress(navigationController: self.navigationController)

                if let error = error {
                    print("Error loading analytics overview: \(error.localizedDescription)")
                }

                self.overviewGrowthMetrics = response?.growth
                self.overviewOrderStatistics = response?.statistics
                self.overviewTopProducts = response?.topProducts ?? []
                self.overviewTopCustomers = response?.topCustomers ?? []
                self.processAnalyticsData(incomeData: response?.income, year: year)
                self.refreshOverviewInsightSections()
            }
        }
    }
    
    // MARK: - Data Processing
    private func processAnalyticsData(incomeData: [IncomeAnalyticsItem]?, year: Int) {
        clearChartData()
        
        guard let incomeData = incomeData, !incomeData.isEmpty else {
            initializeEmptyChartData()
            // Order count can safely fall back to the statistics endpoint (a plain count).
            totalOrder = Double(overviewGrowthMetrics?.orders?.current ?? overviewOrderStatistics?.totalOrders ?? 0)
            // Revenue must only come from the revenue-calculator source (growth-metrics).
            // Do NOT fall back to statistics.totalRevenue: that is sum(totalAmount), a different
            // definition than realIncome, and would show an inconsistent hero number.
            realIncome = overviewGrowthMetrics?.revenue?.current ?? 0
            expectedIncome = 0
            reloadChart()
            syncSummaryLabelsForYearMode()
            return
        }
        
        var monthlyData: [Int: (realIncome: Double, futureIncome: Double, orderCount: Int)] = [:]
        var totalOrder = Double(0)
        var totalRealIncome = 0.0
        
        // Process income data
        for item in incomeData {
            guard let monthString = item.month,
                  let monthNum = Int(monthString.split(separator: "/").first ?? "") else { continue }
            
            let realIncome = item.realIncome ?? 0.0
            let futureIncome = item.futureIncome ?? 0.0
            let orderCount = item.orderCount ?? 0
            
            let existing = monthlyData[monthNum] ?? (0.0, 0.0, 0)
            monthlyData[monthNum] = (
                realIncome: existing.realIncome + realIncome,
                futureIncome: existing.futureIncome + futureIncome,
                orderCount: existing.orderCount + orderCount
            )
            
            totalRealIncome += realIncome
            totalOrder += Double(orderCount)
        }
        
        // Create 12 months of data
        for month in 1...12 {
            xValues.append("T\(month)")
            
            if let monthData = monthlyData[month] {
                yRValues.append(monthData.realIncome)
                yEValues.append(monthData.futureIncome)
                yOValues.append(Double(monthData.orderCount))
            } else {
                yRValues.append(0.0)
                yEValues.append(0.0)
                yOValues.append(0.0)
            }
        }
        
        self.totalOrder = totalOrder
        self.realIncome = totalRealIncome
        reloadChart()
        DispatchQueue.main.async { [weak self] in
            self?.syncSummaryLabelsForYearMode()
        }
    }

    private func clearChartData() {
        xValues.removeAll()
        yRValues.removeAll()
        yEValues.removeAll()
        yOValues.removeAll()
    }
    
    private func initializeEmptyChartData() {
        for i in 1...12 {
            xValues.append("T\(i)")
            yRValues.append(0.0)
            yEValues.append(0.0)
            yOValues.append(0.0)
        }
    }
    
    // MARK: - Chart Updates
    override func updateChartData() {
        guard !shouldHideData && (selectedMode != .overview || canViewChartAnalytics()) else {
            chartsSection.barChartView.data = nil
            chartsSection.lineChartView.data = nil
            return
        }
        
        setBarChartData()
        setLineChartData()
    }
    
    private func setBarChartData() {
        let realEntries = yRValues.enumerated().map { BarChartDataEntry(x: Double($0.offset), y: $0.element) }
        let futureEntries = yEValues.enumerated().map { BarChartDataEntry(x: Double($0.offset), y: $0.element) }
        
        let realSet = BarChartDataSet(entries: realEntries, label: "Real income".localized().uppercased())
        realSet.setColor(.actionWarning)
        realSet.axisDependency = .left
        realSet.drawValuesEnabled = false
        
        let futureSet = BarChartDataSet(entries: futureEntries, label: "Plan income".localized().uppercased())
        futureSet.setColor(.neutralGray)
        futureSet.axisDependency = .left
        futureSet.drawValuesEnabled = false
        
        let data = BarChartData(dataSets: [realSet, futureSet])
        data.barWidth = 0.45
        data.setValueFont(.bodyRegular(size: 10))
        data.groupBars(fromX: -0.5, groupSpace: 0.06, barSpace: 0.02)
        
        chartsSection.barChartView.data = data
        chartsSection.barChartView.setNeedsDisplay()
    }
    
    private func setLineChartData() {
        let entries = yOValues.enumerated().map { ChartDataEntry(x: Double($0.offset), y: $0.element) }
        
        let set = LineChartDataSet(entries: entries, label: "Order total".localized().uppercased())
        set.axisDependency = .left
        set.valueFormatter = MarketAxisValueFormatter()
        set.setColor(.accentOrange)
        set.lineDashLengths = [5, 2.5]
        set.highlightLineDashLengths = [5, 2.5]
        set.setCircleColor(.accentOrange)
        set.lineWidth = 2
        set.circleRadius = 5
        set.fillAlpha = 50 / 255
        set.drawFilledEnabled = true
        set.fillColor = .accentOrange
        set.highlightColor = .actionDanger
        set.drawCircleHoleEnabled = false
        
        let data = LineChartData(dataSet: set)
        data.setValueTextColor(.textPrimary)
        data.setValueFont(.bodyRegular(size: isIPad ? 14 : 12))
        
        chartsSection.lineChartView.data = data
        chartsSection.lineChartView.setNeedsDisplay()
    }
    
    private func clearChart() {
        chartsSection.barChartView.data = nil
        chartsSection.lineChartView.data = nil
        totalOrder = 0
        realIncome = 0
        expectedIncome = 0
        resetOverviewInsightState()
        if selectedMode == .overview {
            syncSummaryLabelsForYearMode()
            refreshOverviewInsightSections()
        }
    }
    
    private func reloadChart() {
        updateChartData()
    }
    
    private func reloadList() {
        if let summary = dailyIncomeData?.summary {
            totalOrder = Double(summary.totalOrders ?? 0)
            realIncome = summary.totalRevenue ?? 0
            summaryCard.collateralLabel.text = (summary.totalCollateral ?? 0).formatStringInCommon()
            summaryCard.collateralPlanLabel.text = (summary.totalCollateralPlanExpectedToRefund ?? summary.totalCollateralPlan ?? 0).formatStringInCommon()
        } else {
            let orderCount = dailyIncomeOrders.isEmpty ? orders.count : dailyIncomeOrders.count
            let total = dailyIncomeOrders.isEmpty
                ? orders.reduce(0) { $0 + $1.totalAmount }
                : dailyIncomeOrders.reduce(0) { $0 + ($1.revenue ?? $1.totalAmount ?? 0.0) }
            totalOrder = Double(orderCount)
            realIncome = total
            summaryCard.collateralLabel.text = "0"
            summaryCard.collateralPlanLabel.text = "0"
        }

        let isEmpty = dailyIncomeOrders.isEmpty && orders.isEmpty
        let orderCount = dailyIncomeOrders.isEmpty ? orders.count : dailyIncomeOrders.count
        updateOrdersSectionHeader(orderCount: orderCount)
        emptyStateView.isHidden = !isEmpty || selectedMode != .dailyReport
        orderTableView.isHidden = isEmpty && selectedMode == .dailyReport
        if isEmpty && selectedMode == .dailyReport {
            (emptyStateView.viewWithTag(100) as? UILabel)?.text = "No orders for this day".localized() + "\n" + (todayDate.dateInString() ?? "")
        }

        orderTableView.reloadData()
    }

    private func setSummaryPlaceholder(placeholder: String) {
        [summaryCard.ordersLabel, summaryCard.incomeLabel, summaryCard.collateralLabel, summaryCard.collateralPlanLabel]
            .forEach { $0.text = placeholder }
        setOrdersSectionPlaceholder(placeholder)
        summaryCard.growthPillView.isHidden = true
    }

    // MARK: - Insight refresh
    private func resetOverviewInsightState() {
        overviewTopCustomers = []
        overviewTopProducts = []
        overviewGrowthMetrics = nil
        overviewOrderStatistics = nil
    }

    private func refreshOverviewInsightSections() {
        refreshOverviewGrowthPill()
        refreshOverviewSnapshotSection()
        insightsPanel.updateTopProducts(overviewTopProducts)
        insightsPanel.updateTopCustomers(overviewTopCustomers)
    }

    private func refreshOverviewGrowthPill() {
        guard selectedMode == .overview else {
            summaryCard.growthPillView.isHidden = true
            return
        }

        let revenueGrowth = overviewGrowthMetrics?.revenue?.growth
        let ordersGrowth = overviewGrowthMetrics?.orders?.growth

        guard revenueGrowth != nil || ordersGrowth != nil else {
            summaryCard.growthPillView.isHidden = true
            return
        }

        var segments: [String] = []
        if let revenueGrowth = revenueGrowth {
            segments.append("Revenue".localized() + " " + OverviewUIBuilder.growthText(revenueGrowth))
        }
        if let ordersGrowth = ordersGrowth {
            segments.append("Orders".localized() + " " + OverviewUIBuilder.growthText(ordersGrowth))
        }

        let primaryGrowth = revenueGrowth ?? ordersGrowth ?? 0
        if primaryGrowth > 0 {
            summaryCard.growthPillView.backgroundColor = UIColor.brandPrimary.withAlphaComponent(0.12)
            summaryCard.growthPillLabel.textColor = .brandPrimary
        } else if primaryGrowth < 0 {
            summaryCard.growthPillView.backgroundColor = .statusCancelledFill
            summaryCard.growthPillLabel.textColor = .statusCancelledText
        } else {
            summaryCard.growthPillView.backgroundColor = UIColor.surfaceAuthChrome
            summaryCard.growthPillLabel.textColor = .textSecondary
        }

        summaryCard.growthPillLabel.text = segments.joined(separator: "  •  ") + "  " + "vs previous period".localized()
        summaryCard.growthPillView.isHidden = false
    }

    private func refreshOverviewSnapshotSection() {
        let statusBreakdown = overviewOrderStatistics?.statusBreakdown
        let hasSnapshot = (statusBreakdown != nil)
        insightsPanel.updateSnapshot(
            reserved: statusBreakdown?.RESERVED ?? 0,
            active: (statusBreakdown?.PICKUPED ?? 0) + (statusBreakdown?.RETURNED ?? 0),
            completed: statusBreakdown?.COMPLETED ?? 0,
            cancelled: statusBreakdown?.CANCELLED ?? 0,
            hasData: hasSnapshot
        )
    }

    private func updateOrdersSectionHeader(orderCount: Int) {
        let countText = orderCount.formatStringInCommon()
        let title = NSMutableAttributedString(
            string: "\(countText) ",
            attributes: [
                .font: UIFont.bodyBold(size: isIPad ? 24 : 22),
                .foregroundColor: UIColor.textPrimary
            ]
        )
        title.append(
            NSAttributedString(
                string: "Overview_Orders_Count".localized(),
                attributes: [
                    .font: UIFont.bodyMedium(size: isIPad ? 20 : 18),
                    .foregroundColor: UIColor.textSecondary
                ]
            )
        )
        ordersSectionTitleLabel.attributedText = title
        ordersSectionSubtitleLabel.text = todayDate.dateInString() ?? ""
    }

    private func setOrdersSectionPlaceholder(_ placeholder: String) {
        ordersSectionTitleLabel.attributedText = NSAttributedString(
            string: placeholder,
            attributes: [
                .font: UIFont.bodyBold(size: isIPad ? 24 : 22),
                .foregroundColor: UIColor.textPrimary
            ]
        )
        ordersSectionSubtitleLabel.text = todayDate.dateInString() ?? ""
    }

    @objc private func overviewInfoButtonTapped(_ sender: UIButton) {
        guard let metric = OverviewMetric(rawValue: sender.tag) else { return }
        OverviewMetricInfoPresenter.present(metric: metric, from: self)
    }

    private func showNoPermissionMessage() {
        chartScrollView.isHidden = true
        chartStackView.isHidden = true
        summaryCard.isHidden = true
        modeSegmentedControl.isHidden = true
        ordersSectionView.isHidden = true
        view.viewWithTag(9090)?.removeFromSuperview()
        
        let messageLabel = UILabel()
        messageLabel.tag = 9090
        messageLabel.text = "You don't have permission to view analytics".localized()
        messageLabel.textAlignment = .center
        messageLabel.textColor = .textSecondary
        messageLabel.font = Utils.regularFont(size: 16)
        messageLabel.numberOfLines = 0
        
        view.addSubview(messageLabel)
        messageLabel.snp.makeConstraints { make in
            make.center.equalToSuperview()
            make.leading.trailing.equalToSuperview().inset(32)
        }
    }
}

// MARK: - UITableViewDataSource & Delegate
extension OverviewViewController: UITableViewDelegate, UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return dailyIncomeOrders.isEmpty ? orders.count : dailyIncomeOrders.count
    }

    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? { nil }

    func tableView(_ tableView: UITableView, heightForHeaderInSection section: Int) -> CGFloat { 0 }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "SaleCell", for: indexPath) as! SaleCell
        
        if !dailyIncomeOrders.isEmpty {
            cell.bind(dailyOrder: dailyIncomeOrders[indexPath.row], layout: .chart)
        } else {
            cell.bind(order: orders[indexPath.row], layout: .chart)
        }
        
        cell.backgroundColor = .clear
        return cell
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)

        if !dailyIncomeOrders.isEmpty {
            guard indexPath.row < dailyIncomeOrders.count,
                  let orderId = dailyIncomeOrders[indexPath.row].id else { return }
            showProgressText(text: "Loading...".localized(), navigationController: navigationController)
            OrderService.shared.loadOrderDetail(orderId: orderId) { [weak self] orderDetail, error in
                DispatchQueue.main.async {
                    self?.hideProgress(navigationController: self?.navigationController)
                    if let error = error {
                        UIAlertController.errorAlert(parent: self, error: error)
                        return
                    }
                    guard let detail = orderDetail else { return }
                    let order = Order.from(detail: detail)
                    let preview = PreviewViewController(order: order)
                    preview.hidesBottomBarWhenPushed = true
                    preview.delegate = self
                    self?.navigationController?.pushViewController(preview, animated: true)
                }
            }
        } else {
            guard indexPath.row < orders.count else { return }
            let order = orders[indexPath.row]
            let preview = PreviewViewController(order: order)
            preview.hidesBottomBarWhenPushed = true
            preview.delegate = self
            navigationController?.pushViewController(preview, animated: true)
        }
    }
}

// MARK: - PreviewViewControllerDelegate
extension OverviewViewController: PreviewViewControllerDelegate {
    func didCompleteOrder(sender: PreviewViewController, updatedOrder: Order?) {
        loadData()
    }
}

// MARK: - DatePickerViewControllerDelegate
extension OverviewViewController: DatePickerViewControllerDelegate {
    func didSelectDateRange(start: Date, end: Date, sender: DatePickerViewController) {
        // Not used
    }
    
    func didSelectDate(_ date: Date, sender: DatePickerViewController) {
        todayDate = date
        loadData()
    }
}
