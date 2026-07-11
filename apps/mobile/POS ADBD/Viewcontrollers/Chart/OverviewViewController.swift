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
    private var selectedPeriod: ReportPeriod = .today {
        didSet {
            guard oldValue != selectedPeriod else { return }
            updateViewForPeriod()
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
    /// Period totals from `/api/analytics/income/summary` (7d / 30d / year operational + deposit metrics).
    private var rangeIncomeSummary: DailyIncomeSummary?
    
    // Date selection
    private let years: [Int] = {
        let currentYear = Date().getYear()
        return [currentYear - 1, currentYear, currentYear + 1]
    }()
    
    private var yearSelectedIndex: Int = 1 {
        didSet { updateDateFilterTitle() }
    }
    
    private var todayDate: Date = Date() {
        didSet { updateDateFilterTitle() }
    }
    
    // Stats
    private var totalOrder: Double = 0 {
        didSet {
            let value = totalOrder.formatStringInCommon()
            summaryCard.ordersLabel.text = value
            summaryCard.changeMetricLabel.text = value
        }
    }

    private var realIncome: Double = 0 {
        didSet {
            summaryCard.incomeLabel.text = realIncome.formatStringInCommon()
            summaryCard.applyIncomeColor(for: realIncome)
        }
    }

    private var averageDailyIncome: Double = 0 {
        didSet {
            summaryCard.averageLabel.text = averageDailyIncome.formatStringInCommon()
        }
    }

    private var expectedIncome: Double = 0

    private var isIPad: Bool {
        traitCollection.horizontalSizeClass == .regular
    }

    // MARK: - UI Components
    private lazy var periodFilterView: OverviewPeriodFilterView = {
        let view = OverviewPeriodFilterView()
        view.onPeriodSelected = { [weak self] period in
            self?.selectedPeriod = period
        }
        view.onDateTapped = { [weak self] in
            self?.dateButtonTapped()
        }
        view.onRefreshTapped = { [weak self] in
            self?.refreshData()
        }
        return view
    }()

    private lazy var summaryCard: OverviewSummaryCardView = {
        OverviewSummaryCardView(
            isIPad: isIPad,
            infoTarget: self,
            infoAction: #selector(overviewInfoButtonTapped(_:))
        )
    }()

    private lazy var snapshotSectionView: OverviewSnapshotSectionView = {
        OverviewSnapshotSectionView(isIPad: isIPad)
    }()

    private lazy var todayOrdersCountLabel: UILabel = {
        let label = UILabel()
        label.numberOfLines = 1
        return label
    }()

    private lazy var todayOrdersDateLabel: UILabel = {
        let label = UILabel()
        return label
    }()

    private lazy var todayOrdersInlineEmptyView: UIView = {
        let container = OverviewUIBuilder.makeInlineSectionEmptyView(text: "No orders for this day".localized())
        let button = UIButton(type: .system)
        button.setTitle("Try another date".localized(), for: .normal)
        button.titleLabel?.font = .bodyMedium(size: 14)
        button.tintColor = .brandPrimary
        button.tag = 101
        button.addTarget(self, action: #selector(emptyStateTryAnotherDateTapped), for: .touchUpInside)
        container.addSubview(button)
        button.snp.makeConstraints { make in
            make.top.equalTo(container.viewWithTag(100)!.snp.bottom).offset(12)
            make.centerX.equalToSuperview()
            make.bottom.equalToSuperview().inset(16)
        }
        return container
    }()

    private lazy var todayOrdersContentStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 0
        stack.addArrangedSubview(orderTableContainerView)
        stack.addArrangedSubview(todayOrdersInlineEmptyView)
        return stack
    }()

    private lazy var todayOrdersSectionCard: UIView = {
        OverviewUIBuilder.makeGroupedListSectionCard(
            title: "Report_Today_Orders_Title".localized(),
            subtitleLabel: todayOrdersCountLabel,
            dateLabel: todayOrdersDateLabel,
            iconSystemName: "list.bullet.rectangle",
            contentView: todayOrdersContentStack,
            isIPad: isIPad
        )
    }()

    private lazy var chartScrollView: UIScrollView = {
        let sv = UIScrollView()
        sv.showsVerticalScrollIndicator = true
        sv.alwaysBounceVertical = true
        sv.isDirectionalLockEnabled = true
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
        stack.isLayoutMarginsRelativeArrangement = true
        stack.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 8, leading: 16, bottom: 24, trailing: 16)
        return stack
    }()

    private lazy var chartsSection: OverviewChartsSectionView = {
        OverviewChartsSectionView(isIPad: isIPad)
    }()

    private lazy var insightsPanel: OverviewInsightsPanelView = {
        let view = OverviewInsightsPanelView(isIPad: isIPad)
        view.onTopProductsTapped = { [weak self] in
            self?.presentOverviewRankingList(mode: .products)
        }
        view.onTopCustomersTapped = { [weak self] in
            self?.presentOverviewRankingList(mode: .customers)
        }
        return view
    }()

    private lazy var orderTableView: UITableView = {
        let table = UITableView()
        table.delegate = self
        table.dataSource = self
        table.isHidden = false
        table.isScrollEnabled = false
        table.register(SaleCell.self, forCellReuseIdentifier: "SaleCell")
        table.backgroundColor = .clear
        table.separatorStyle = .none
        table.rowHeight = UITableViewAutomaticDimension
        table.estimatedRowHeight = 96
        table.contentInset = .zero
        if #available(iOS 15.0, *) {
            table.sectionHeaderTopPadding = 0
        }
        return table
    }()

    private lazy var orderTableContainerView: UIView = {
        let view = UIView()
        view.addSubview(orderTableView)
        orderTableView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            orderTableHeightConstraint = make.height.equalTo(1).constraint
        }
        return view
    }()

    private var chartTopToSummaryConstraint: Constraint?
    private var listHeaderTopToFilterConstraint: Constraint?
    private var listHeaderTopToNavConstraint: Constraint?
    private var orderTableHeightConstraint: Constraint?

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupNavigationBar()
        setupUI()
        setupCharts()
        
        // Set initial view state for today mode (before setting selectedPeriod)
        chartScrollView.isHidden = false
        chartStackView.isHidden = false
        chartsSection.isHidden = true
        insightsPanel.isHidden = true
        orderTableContainerView.isHidden = false
        todayOrdersSectionCard.isHidden = false
        
        // Initialize period selection and load data
        initializePeriodSelection()
        enforceStaffReportRestrictions()
        chartsSection.configureInitialExpansion(isIPad: isIPad)
        updateDateFilterTitle()
        applySummaryLayout()
        loadData()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        enforceStaffReportRestrictions()
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
        navigationController?.setNavigationBarHidden(true, animated: false)
        refreshPeriodFilter()
    }

    private func refreshPeriodFilter() {
        enforceStaffReportRestrictions()
        let periods = ReportPeriod.availablePeriods(canViewRevenueAnalytics: canViewChartAnalytics())
        let showsDate = (selectedPeriod == .today || selectedPeriod == .thisYear) && !isOutletStaff
        periodFilterView.configure(
            periods: periods,
            selected: selectedPeriod,
            dateTitle: dateFilterTitle(),
            showsDateButton: showsDate
        )
        todayOrdersInlineEmptyView.viewWithTag(101)?.isHidden = isOutletStaff
        listHeaderTopToFilterConstraint?.activate()
        listHeaderTopToNavConstraint?.deactivate()
    }

    /// Outlet staff may only view today's daily report — no past dates or period chips beyond today.
    private func enforceStaffReportRestrictions() {
        guard isOutletStaff else { return }
        let calendar = Calendar.current
        if !calendar.isDateInToday(todayDate) {
            todayDate = Date()
        }
        if selectedPeriod != .today {
            selectedPeriod = .today
        }
    }

    private func dateFilterTitle() -> String {
        if selectedPeriod == .thisYear {
            return years[yearSelectedIndex].inString()
        }
        return todayDate.dateInString() ?? ""
    }

    private func applySummaryLayout() {
        let isToday = selectedPeriod == .today

        summaryCard.setMode(isToday ? .today : .range)
        summaryCard.setContextText(nil)
        summaryCard.revenueInfoButton.isHidden = false
        summaryCard.growthPillView.isHidden = true

        refreshPeriodFilter()
        if isToday {
            reloadList()
        } else {
            syncSummaryLabelsForRangeMode()
            refreshOverviewInsightSections()
        }
    }

    private func syncSummaryLabelsForRangeMode() {
        summaryCard.incomeLabel.text = realIncome.formatStringInCommon()
        summaryCard.ordersLabel.text = totalOrder.formatStringInCommon()
        summaryCard.applyIncomeColor(for: realIncome)
    }

    private func averageIncome(total: Double, for period: ReportPeriod) -> Double {
        guard period != .today else { return total }
        let range = period.dateRange(todayDate: todayDate, year: years[yearSelectedIndex])
        let calendar = Calendar.current
        let dayCount = max((calendar.dateComponents([.day], from: calendar.startOfDay(for: range.start), to: calendar.startOfDay(for: range.end)).day ?? 0) + 1, 1)
        return total / Double(dayCount)
    }

    private func setupHeaderView() {
        view.addSubview(periodFilterView)
        view.addSubview(chartScrollView)
        chartScrollView.addSubview(chartScrollContentView)
        chartScrollContentView.addSubview(chartStackView)
        chartStackView.addArrangedSubview(summaryCard)
        chartStackView.addArrangedSubview(snapshotSectionView)
        chartStackView.addArrangedSubview(chartsSection)
        chartStackView.addArrangedSubview(insightsPanel)
        chartStackView.addArrangedSubview(todayOrdersSectionCard)
    }
    
    private func setupConstraints() {
        if let customNavBar = customNavBar {
            periodFilterView.snp.makeConstraints { make in
                make.top.equalTo(customNavBar.snp.bottom).offset(10)
                make.leading.trailing.equalToSuperview().inset(16)
            }
        } else {
            periodFilterView.snp.makeConstraints { make in
                make.top.equalTo(view.safeAreaLayoutGuide.snp.top).offset(8)
                make.leading.trailing.equalToSuperview().inset(16)
            }
        }

        chartScrollView.snp.makeConstraints { make in
            make.top.equalTo(periodFilterView.snp.bottom).offset(8)
            make.leading.trailing.bottom.equalToSuperview()
        }

        chartScrollContentView.snp.makeConstraints { make in
            make.edges.equalTo(chartScrollView.contentLayoutGuide)
            make.width.equalTo(chartScrollView.frameLayoutGuide)
        }
        chartStackView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
    }
    
    private func setupCharts() {
        let chart = chartsSection.revenueChartView
        setup(barLineChartView: chart)
        configureOverviewChartInteraction(chart)
        configureRevenueChartStyle(chart)
        configureXAxis(chart.xAxis)

        // Order-count chart shares the same base style; only the series colour and
        // an integer y-axis (whole orders) differ.
        let ordersChart = chartsSection.ordersChartView
        setup(barLineChartView: ordersChart)
        configureOverviewChartInteraction(ordersChart)
        configureRevenueChartStyle(ordersChart)
        ordersChart.leftAxis.granularity = 1
        ordersChart.leftAxis.granularityEnabled = true
        configureXAxis(ordersChart.xAxis)

        applyChartPanMode(for: selectedPeriod)
    }

    private func configureRevenueChartStyle(_ chartView: LineChartView) {
        chartView.legend.enabled = false
        chartView.drawGridBackgroundEnabled = false
        chartView.setExtraOffsets(left: 4, top: 8, right: 12, bottom: 4)

        let leftAxis = chartView.leftAxis
        leftAxis.labelFont = .captionMedium(size: 11)
        leftAxis.labelTextColor = .textTertiary
        leftAxis.axisMinimum = 0
        leftAxis.drawAxisLineEnabled = false
        leftAxis.gridColor = UIColor.borderColor.withAlphaComponent(0.9)
        leftAxis.gridLineDashLengths = [4, 4]
        leftAxis.gridLineWidth = 0.8
        leftAxis.spaceTop = 0.12

        let xAxis = chartView.xAxis
        xAxis.labelFont = .captionMedium(size: 11)
        xAxis.labelTextColor = .textTertiary
        xAxis.drawGridLinesEnabled = false
        xAxis.drawAxisLineEnabled = false
        xAxis.labelPosition = .bottom
        xAxis.granularity = 1
        xAxis.avoidFirstLastClippingEnabled = true
    }

    private func configureOverviewChartInteraction(_ chartView: BarLineChartViewBase) {
        // Scale/pinch stay off; horizontal drag is toggled per period via applyChartPanMode.
        chartView.setScaleEnabled(false)
        chartView.pinchZoomEnabled = false
        chartView.doubleTapToZoomEnabled = false
        chartView.highlightPerTapEnabled = true
        chartView.dragDecelerationEnabled = true
        chartView.dragDecelerationFrictionCoef = 0.92
    }

    /// Year (and long day ranges) need horizontal pan so revenue points stay readable.
    /// Nested inside a vertical `UIScrollView`; DGCharts coordinates with the parent scroll view.
    private func applyChartPanMode(for period: ReportPeriod) {
        let allowHorizontalDrag = period == .thisYear || period == .last30Days || period == .last7Days
        for chart in [chartsSection.revenueChartView, chartsSection.ordersChartView] {
            chart.dragEnabled = allowHorizontalDrag
            chart.dragXEnabled = allowHorizontalDrag
            chart.dragYEnabled = false
            // Highlight-on-drag fights horizontal pan when the chart is zoomed to a window.
            chart.highlightPerDragEnabled = !allowHorizontalDrag
        }
        chartsSection.setShowsHorizontalHint(allowHorizontalDrag)
    }

    private func chartVisibleWindowSize(for period: ReportPeriod, pointCount: Int) -> Double? {
        guard pointCount > 1 else { return nil }
        switch period {
        case .thisYear:
            return min(6, Double(pointCount))
        case .last30Days:
            return min(7, Double(pointCount))
        case .last7Days:
            return min(5, Double(pointCount))
        case .today:
            return nil
        }
    }

    private func applyChartVisibleRangeIfNeeded() {
        let count = max(xValues.count, 1)
        let charts = [chartsSection.revenueChartView, chartsSection.ordersChartView]
        guard let visibleCount = chartVisibleWindowSize(for: selectedPeriod, pointCount: count),
              visibleCount > 0,
              Double(count) > visibleCount else {
            charts.forEach { $0.fitScreen() }
            return
        }

        // `moveViewToX` aligns the left edge — offset so the latest days/months stay in view.
        let latestIndex = Double(count - 1)
        let leftIndex = max(0, latestIndex - visibleCount + 1)
        charts.forEach { chart in
            chart.setVisibleXRange(minXRange: visibleCount, maxXRange: visibleCount)
            chart.moveViewToX(leftIndex)
        }
    }
    
    private func configureXAxis(_ axis: XAxis) {
        axis.labelPosition = XAxis.LabelPosition.bottom
        axis.valueFormatter = DefaultAxisValueFormatter(block: { [weak self] index, _ in
            // Charts can ask for negative X values (e.g. after groupBars(fromX: -0.5)).
            // Bound both sides so we never crash on Int(index).
            let i = Int(index)
            guard let self = self, i >= 0, i < self.xValues.count else { return "" }
            return self.xValues[i]
        })
    }
    
    private func initializePeriodSelection() {
        selectedPeriod = .today
        refreshPeriodFilter()
    }

    private func updateViewForPeriod() {
        if (isOutletStaff || !canViewChartAnalytics()) && selectedPeriod != .today {
            selectedPeriod = .today
            return
        }

        applySummaryLayout()
        applyChartPanMode(for: selectedPeriod)

        let showOrderList = selectedPeriod.showsOrderList
        let showCharts = selectedPeriod.showsChartsAndInsights
        UIView.animate(withDuration: 0.25) {
            self.chartScrollView.isHidden = false
            self.chartStackView.isHidden = false
            self.chartsSection.isHidden = !showCharts
            self.insightsPanel.isHidden = !showCharts
            self.todayOrdersSectionCard.isHidden = !showOrderList
            if !showOrderList {
                self.todayOrdersInlineEmptyView.isHidden = true
            }
        } completion: { _ in
            self.loadData()
        }
    }
    
    // MARK: - Permission Check
    /// Yearly / range overview requires full revenue analytics.
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
        guard !isOutletStaff else { return }
        showDatePicker()
    }

    @objc private func dateButtonTapped() {
        // Outlet staff: disable date selection
        guard !isOutletStaff else { return }
        
        if selectedPeriod == .thisYear {
            showYearSelection()
        } else if selectedPeriod == .today {
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
            popover.sourceView = periodFilterView
            popover.sourceRect = periodFilterView.bounds
        }
        
        present(alert, animated: true)
    }
    
    private func showDatePicker() {
        guard !isOutletStaff else { return }

        let controller = DatePickerViewController.instance()
        controller.delegate = self
        
        let calendar = Calendar.current
        let minimumDate = calendar.date(byAdding: .year, value: -1, to: Date()) ?? Date()
        
        controller.configure(selectedDate: todayDate, minimumDate: minimumDate, maximumDate: Date())
        present(controller, animated: true)
    }
    
    private func updateDateFilterTitle() {
        periodFilterView.setDateTitle(dateFilterTitle())
    }
    
    // MARK: - Data Loading
    private func loadData() {
        summaryCard.isHidden = false
        periodFilterView.isHidden = false
        snapshotSectionView.isHidden = false
        chartScrollView.isHidden = false
        chartStackView.isHidden = false
        view.viewWithTag(9090)?.removeFromSuperview()
        rangeIncomeSummary = nil
        setSummaryPlaceholder(placeholder: "—")
        snapshotSectionView.update(
            reserved: 0,
            active: 0,
            completed: 0,
            cancelled: 0,
            hasData: false,
            depositHeldText: "—",
            depositDueText: "—",
            showsDepositMetrics: showsDepositMetricsForSelectedPeriod
        )
        if selectedPeriod == .today {
            orderTableContainerView.isHidden = true
            todayOrdersInlineEmptyView.isHidden = true
            orderTableHeightConstraint?.update(offset: 1)
        }
        if selectedPeriod.showsChartsAndInsights {
            resetOverviewInsightState()
            refreshOverviewInsightSections()
        } else {
            refreshOverviewGrowthPill()
        }
        switch selectedPeriod {
        case .today:
            if canViewDailyReport() {
                loadOrder(date: todayDate)
            } else {
                showNoPermissionMessage()
            }
        case .last7Days, .last30Days:
            if canViewChartAnalytics() {
                loadRangeReport(period: selectedPeriod)
            } else {
                showNoPermissionMessage()
            }
        case .thisYear:
            if canViewChartAnalytics() {
                loadOverview(year: years[yearSelectedIndex])
            } else {
                showNoPermissionMessage()
            }
        }
    }
    
    private func loadOrder(date: Date) {
        showProgressText(text: "Loading...".localized(), navigationController: navigationController)

        AnalyticsAPIService.shared.loadDailyIncomeAnalytics(startDate: date, endDate: date) { [weak self] response, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.hideProgress(navigationController: self.navigationController)

                if let error = error {
                    self.overviewGrowthMetrics = nil
                    self.refreshOverviewGrowthPill()
                    UIAlertController.errorAlert(parent: self, error: error)
                    self.reloadList()
                    return
                }

                guard let response = response else {
                    self.dailyIncomeOrders = []
                    self.dailyIncomeData = nil
                    self.overviewGrowthMetrics = nil
                    self.refreshOverviewGrowthPill()
                    self.reloadList()
                    return
                }

                self.dailyIncomeData = response
                self.dailyIncomeOrders = response.days?.flatMap { $0.orders ?? [] } ?? []
                self.overviewGrowthMetrics = nil
                self.reloadList()
                self.loadTodayGrowthComparison(for: date)
            }
        }
    }

    /// Growth vs previous day — from `/api/analytics/period` (same duration logic as 7d/30d).
    private func loadTodayGrowthComparison(for date: Date) {
        AnalyticsAPIService.shared.loadAnalyticsPeriod(
            startDate: date,
            endDate: date,
            groupBy: "day",
            limit: 3
        ) { [weak self] periodResponse, _ in
            DispatchQueue.main.async {
                guard let self = self else { return }
                guard self.selectedPeriod == .today else { return }
                guard Calendar.current.isDate(self.todayDate, inSameDayAs: date) else { return }
                self.overviewGrowthMetrics = periodResponse?.growth
                self.refreshOverviewGrowthPill()
            }
        }
    }
    
    private func applyPeriodReport(_ report: AnalyticsPeriodResponse?, period: ReportPeriod) {
        overviewGrowthMetrics = report?.growth
        overviewOrderStatistics = nil
        rangeIncomeSummary = report?.operational
        overviewTopProducts = report?.topProducts ?? []
        overviewTopCustomers = report?.topCustomers ?? []

        processIncomeChartData(incomeData: report?.series, period: period)

        if (report?.series ?? []).isEmpty, let revenue = report?.revenue {
            totalOrder = Double(revenue.totalOrders ?? 0)
            realIncome = revenue.totalRevenue ?? 0
            averageDailyIncome = averageIncome(total: realIncome, for: period)
            syncSummaryLabelsForRangeMode()
        }

        refreshOverviewInsightSections()
    }

    private func loadRangeReport(period: ReportPeriod) {
        guard canViewChartAnalytics() else {
            clearChart()
            return
        }

        let year = years[yearSelectedIndex]
        let range = period.dateRange(todayDate: todayDate, year: year)
        showProgressText(text: "Loading...".localized(), navigationController: navigationController)

        AnalyticsAPIService.shared.loadAnalyticsPeriod(
            startDate: range.start,
            endDate: range.end,
            groupBy: period.incomeGroupBy,
            limit: 3
        ) { [weak self] periodResponse, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.hideProgress(navigationController: self.navigationController)

                if let error = error, periodResponse == nil {
                    print("Error loading period report: \(error.localizedDescription)")
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                } else if let error = error {
                    print("Warning: period report partial failure: \(error.localizedDescription)")
                }

                guard self.selectedPeriod == period else { return }
                self.applyPeriodReport(periodResponse, period: period)
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

        AnalyticsAPIService.shared.loadAnalyticsPeriod(
            startDate: startDate,
            endDate: endDate,
            groupBy: ReportPeriod.thisYear.incomeGroupBy,
            limit: 3
        ) { [weak self] periodResponse, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.hideProgress(navigationController: self.navigationController)

                if let error = error, periodResponse == nil {
                    print("Error loading yearly period report: \(error.localizedDescription)")
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }

                guard self.selectedPeriod == .thisYear, self.years[self.yearSelectedIndex] == year else { return }
                self.applyPeriodReport(periodResponse, period: .thisYear)
            }
        }
    }
    
    // MARK: - Data Processing
    private func processIncomeChartData(incomeData: [IncomeAnalyticsItem]?, period: ReportPeriod) {
        clearChartData()

        guard let incomeData = incomeData, !incomeData.isEmpty else {
            initializeEmptyChartData(for: period)
            totalOrder = Double(overviewGrowthMetrics?.orders?.current ?? 0)
            realIncome = overviewGrowthMetrics?.revenue?.current ?? 0
            averageDailyIncome = averageIncome(total: realIncome, for: period)
            expectedIncome = 0
            reloadChart()
            syncSummaryLabelsForRangeMode()
            return
        }

        if period == .thisYear {
            processYearlyIncomeData(incomeData)
        } else {
            processDailyIncomeSeries(incomeData, period: period)
        }
    }

    private func processYearlyIncomeData(_ incomeData: [IncomeAnalyticsItem]) {
        var monthlyData: [Int: (realIncome: Double, futureIncome: Double, orderCount: Int)] = [:]
        var totalOrderCount = 0.0
        var totalRealIncome = 0.0

        for item in incomeData {
            guard let monthString = item.month,
                  let monthNum = Int(monthString.split(separator: "/").first ?? "") else { continue }

            let real = item.realIncome ?? 0
            let future = item.futureIncome ?? 0
            let orderCount = item.orderCount ?? 0
            let existing = monthlyData[monthNum] ?? (0, 0, 0)
            monthlyData[monthNum] = (
                realIncome: existing.realIncome + real,
                futureIncome: existing.futureIncome + future,
                orderCount: existing.orderCount + orderCount
            )
            totalRealIncome += real
            totalOrderCount += Double(orderCount)
        }

        for month in 1...12 {
            xValues.append("T\(month)")
            if let monthData = monthlyData[month] {
                yRValues.append(monthData.realIncome)
                yEValues.append(monthData.futureIncome)
                yOValues.append(Double(monthData.orderCount))
            } else {
                yRValues.append(0)
                yEValues.append(0)
                yOValues.append(0)
            }
        }

        totalOrder = totalOrderCount
        realIncome = totalRealIncome
        averageDailyIncome = averageIncome(total: totalRealIncome, for: .thisYear)
        reloadChart()
        DispatchQueue.main.async { [weak self] in
            self?.syncSummaryLabelsForRangeMode()
        }
    }

    private func processDailyIncomeSeries(_ incomeData: [IncomeAnalyticsItem], period: ReportPeriod) {
        let sorted = incomeData.sorted { lhs, rhs in
            daySortKey(lhs) < daySortKey(rhs)
        }

        var totalOrderCount = 0.0
        var totalRealIncome = 0.0

        for item in sorted {
            let label = chartDayLabel(for: item)
            xValues.append(label)
            let real = item.realIncome ?? 0
            let future = item.futureIncome ?? 0
            let orderCount = item.orderCount ?? 0
            yRValues.append(real)
            yEValues.append(future)
            yOValues.append(Double(orderCount))
            totalRealIncome += real
            totalOrderCount += Double(orderCount)
        }

        if xValues.isEmpty {
            initializeEmptyChartData(for: period)
        }

        totalOrder = totalOrderCount
        realIncome = totalRealIncome
        averageDailyIncome = averageIncome(total: totalRealIncome, for: period)
        reloadChart()
        DispatchQueue.main.async { [weak self] in
            self?.syncSummaryLabelsForRangeMode()
        }
    }

    private func daySortKey(_ item: IncomeAnalyticsItem) -> String {
        // Prefer ISO-friendly date ("2026/07/02") so lexical sort == chronological.
        if let date = item.date { return date }
        if let day = item.day { return day }
        return item.month ?? ""
    }

    private func chartDayLabel(for item: IncomeAnalyticsItem) -> String {
        // Daily payload uses month="DD/MM/YY" and date="YYYY/MM/DD".
        if let date = item.date {
            let parts = date.split(separator: "/")
            if parts.count >= 3 {
                return "\(parts[2])/\(parts[1])" // DD/MM
            }
            return date
        }
        if let day = item.day {
            let parts = day.split(separator: "/")
            if parts.count >= 2 {
                return "\(parts[0])/\(parts[1])"
            }
            return day
        }
        if let month = item.month {
            let parts = month.split(separator: "/")
            if parts.count >= 2 {
                return "\(parts[0])/\(parts[1])"
            }
            return month
        }
        return ""
    }

    private func initializeEmptyChartData(for period: ReportPeriod) {
        switch period {
        case .thisYear:
            for i in 1...12 {
                xValues.append("T\(i)")
                yRValues.append(0)
                yEValues.append(0)
                yOValues.append(0)
            }
        case .last7Days:
            for i in 1...7 {
                xValues.append("D\(i)")
                yRValues.append(0)
                yEValues.append(0)
                yOValues.append(0)
            }
        case .last30Days:
            for i in 1...30 {
                xValues.append("D\(i)")
                yRValues.append(0)
                yEValues.append(0)
                yOValues.append(0)
            }
        case .today:
            break
        }
    }
    private func clearChartData() {
        xValues.removeAll()
        yRValues.removeAll()
        yEValues.removeAll()
        yOValues.removeAll()
    }
    
    private func initializeEmptyChartData() {
        initializeEmptyChartData(for: selectedPeriod)
    }
    
    // MARK: - Chart Updates
    override func updateChartData() {
        guard !shouldHideData && (selectedPeriod == .today || canViewChartAnalytics()) else {
            chartsSection.revenueChartView.data = nil
            chartsSection.ordersChartView.data = nil
            return
        }

        setRevenueChartData()
        setOrdersChartData()
    }

    private func setRevenueChartData() {
        let entries = yRValues.enumerated().map { ChartDataEntry(x: Double($0.offset), y: $0.element) }

        let set = LineChartDataSet(entries: entries, label: "Revenue".localized())
        set.axisDependency = .left
        set.setColor(.brandPrimary)
        set.lineWidth = 2.5
        set.circleRadius = 4
        set.setCircleColor(.brandPrimary)
        set.drawCircleHoleEnabled = false
        set.drawValuesEnabled = false
        set.mode = .linear
        set.drawFilledEnabled = true
        set.highlightColor = .brandPrimary
        set.highlightLineWidth = 1.5

        let topColor = UIColor.brandPrimary.withAlphaComponent(0.28).cgColor
        let bottomColor = UIColor.brandPrimary.withAlphaComponent(0.02).cgColor
        if let gradient = CGGradient(
            colorsSpace: CGColorSpaceCreateDeviceRGB(),
            colors: [topColor, bottomColor] as CFArray,
            locations: [0.0, 1.0]
        ) {
            set.fill = LinearGradientFill(gradient: gradient, angle: 90)
        } else {
            set.fillColor = UIColor.brandPrimary.withAlphaComponent(0.12)
        }

        let data = LineChartData(dataSet: set)
        let chart = chartsSection.revenueChartView
        chart.data = data
        chart.notifyDataSetChanged()
        applyChartPanMode(for: selectedPeriod)
        applyChartVisibleRangeIfNeeded()
        chart.setNeedsDisplay()
    }

    private func setOrdersChartData() {
        let entries = yOValues.enumerated().map { ChartDataEntry(x: Double($0.offset), y: $0.element) }

        let set = LineChartDataSet(entries: entries, label: "Overview_Charts_OrderCount".localized())
        set.axisDependency = .left
        set.setColor(.accentOrange)
        set.lineWidth = 2.5
        set.circleRadius = 4
        set.setCircleColor(.accentOrange)
        set.drawCircleHoleEnabled = false
        set.drawValuesEnabled = false
        set.mode = .linear
        set.drawFilledEnabled = true
        set.highlightColor = .accentOrange
        set.highlightLineWidth = 1.5

        let topColor = UIColor.accentOrange.withAlphaComponent(0.24).cgColor
        let bottomColor = UIColor.accentOrange.withAlphaComponent(0.02).cgColor
        if let gradient = CGGradient(
            colorsSpace: CGColorSpaceCreateDeviceRGB(),
            colors: [topColor, bottomColor] as CFArray,
            locations: [0.0, 1.0]
        ) {
            set.fill = LinearGradientFill(gradient: gradient, angle: 90)
        } else {
            set.fillColor = UIColor.accentOrange.withAlphaComponent(0.12)
        }

        let data = LineChartData(dataSet: set)
        let chart = chartsSection.ordersChartView
        chart.data = data
        chart.notifyDataSetChanged()
        applyChartPanMode(for: selectedPeriod)
        applyChartVisibleRangeIfNeeded()
        chart.setNeedsDisplay()
    }

    private func clearChart() {
        chartsSection.revenueChartView.data = nil
        chartsSection.ordersChartView.data = nil
        totalOrder = 0
        realIncome = 0
        averageDailyIncome = 0
        expectedIncome = 0
        resetOverviewInsightState()
        if selectedPeriod.showsChartsAndInsights {
            syncSummaryLabelsForRangeMode()
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

        refreshOverviewSnapshotSection()

        let isEmpty = dailyIncomeOrders.isEmpty && orders.isEmpty
        let orderCount = dailyIncomeOrders.isEmpty ? orders.count : dailyIncomeOrders.count
        updateOrdersSectionHeader(orderCount: orderCount)
        orderTableContainerView.isHidden = isEmpty
        todayOrdersInlineEmptyView.isHidden = !isEmpty
        if isEmpty && selectedPeriod == .today {
            (todayOrdersInlineEmptyView.viewWithTag(100) as? UILabel)?.text =
                "No orders for this day".localized() + "\n" + (todayDate.dateInString() ?? "")
        }

        orderTableView.reloadData()
        DispatchQueue.main.async { [weak self] in
            self?.updateOrderTableHeight()
        }
    }

    private func updateOrderTableHeight() {
        guard selectedPeriod == .today else {
            orderTableHeightConstraint?.update(offset: 1)
            view.layoutIfNeeded()
            return
        }

        let rowCount = orderTableView.numberOfRows(inSection: 0)
        guard rowCount > 0 else {
            orderTableHeightConstraint?.update(offset: 1)
            view.layoutIfNeeded()
            return
        }

        // The constraint may currently be collapsed to 1pt, which stops the
        // self-sizing cells from laying out — reading contentSize there gives a
        // wrong (shrunk) height. Give the table a generous height first so every
        // cell lays out, then read the real contentSize.
        orderTableHeightConstraint?.update(offset: CGFloat(rowCount) * max(orderTableView.estimatedRowHeight, 1))
        orderTableView.layoutIfNeeded()

        let height = max(orderTableView.contentSize.height, 1)
        orderTableHeightConstraint?.update(offset: height)
        view.layoutIfNeeded()
    }

    private func setSummaryPlaceholder(placeholder: String) {
        [summaryCard.ordersLabel, summaryCard.incomeLabel, summaryCard.collateralLabel, summaryCard.collateralPlanLabel]
            .forEach { $0.text = placeholder }
        summaryCard.averageLabel.text = placeholder
        summaryCard.changeMetricLabel.text = placeholder
        setOrdersSectionPlaceholder(placeholder)
        summaryCard.setContextText(nil)
        summaryCard.growthPillView.isHidden = true
    }

    // MARK: - Insight refresh
    private func resetOverviewInsightState() {
        overviewTopCustomers = []
        overviewTopProducts = []
        overviewGrowthMetrics = nil
        overviewOrderStatistics = nil
        rangeIncomeSummary = nil
    }

    /// Deposit rows in Operational Snapshot: today + rolling windows (API: income/summary).
    private var showsDepositMetricsForSelectedPeriod: Bool {
        switch selectedPeriod {
        case .today, .last7Days, .last30Days:
            return true
        case .thisYear:
            return false
        }
    }

    private func operationalSummaryForSnapshot() -> DailyIncomeSummary? {
        switch selectedPeriod {
        case .today:
            return dailyIncomeData?.summary
        case .last7Days, .last30Days, .thisYear:
            return rangeIncomeSummary
        }
    }

    private func refreshOverviewInsightSections() {
        refreshOverviewGrowthPill()
        refreshOverviewSnapshotSection()
        insightsPanel.updateTopProducts(overviewTopProducts)
        insightsPanel.updateTopCustomers(overviewTopCustomers)
    }

    private func refreshOverviewGrowthPill() {
        let revenueGrowth = overviewGrowthMetrics?.revenue?.growth
        let ordersGrowth = overviewGrowthMetrics?.orders?.growth

        guard revenueGrowth != nil || ordersGrowth != nil else {
            summaryCard.growthPillView.isHidden = true
            return
        }

        var segments: [String] = []
        if let revenueGrowth = revenueGrowth {
            segments.append(OverviewUIBuilder.growthText(revenueGrowth))
        } else if let ordersGrowth = ordersGrowth {
            segments.append("Orders".localized() + " " + OverviewUIBuilder.growthText(ordersGrowth))
        }

        let primaryGrowth = revenueGrowth ?? ordersGrowth ?? 0
        // Text + symbol only — no filled chip background (was too loud under Cash Strip).
        summaryCard.growthPillView.backgroundColor = .clear
        if primaryGrowth > 0 {
            summaryCard.growthPillLabel.textColor = .actionSuccess
        } else if primaryGrowth < 0 {
            summaryCard.growthPillLabel.textColor = .actionDanger
        } else {
            summaryCard.growthPillLabel.textColor = .textSecondary
        }

        summaryCard.growthPillLabel.text = segments.joined(separator: "  ") + "  " + "vs previous period".localized()
        summaryCard.growthPillView.isHidden = false
    }

    private func refreshOverviewSnapshotSection() {
        if let summary = operationalSummaryForSnapshot() {
            let orderCounts = summary.orderCounts
            let days = dailyIncomeData?.days ?? []
            let reserved = orderCounts?.new ?? days.reduce(0) { $0 + ($1.newOrderCount ?? 0) }
            let active = orderCounts?.pickup ?? days.reduce(0) { $0 + ($1.pickupOrderCount ?? 0) }
            let completed = orderCounts?.return ?? days.reduce(0) { $0 + ($1.returnOrderCount ?? 0) }
            let cancelled = orderCounts?.cancelled ?? days.reduce(0) { $0 + ($1.cancelledOrderCount ?? 0) }
            let hasSnapshot = (orderCounts != nil) || !days.isEmpty || (summary.totalDays ?? 0) > 0
            snapshotSectionView.update(
                reserved: reserved,
                active: active,
                completed: completed,
                cancelled: cancelled,
                hasData: hasSnapshot,
                depositHeldText: (summary.totalCollateral ?? 0).formatStringInCommon(),
                depositDueText: (summary.totalCollateralPlanExpectedToRefund ?? summary.totalCollateralPlan ?? 0).formatStringInCommon(),
                showsDepositMetrics: showsDepositMetricsForSelectedPeriod
            )
            return
        }

        // Fallback when income summary is unavailable (e.g. API error).
        let statusBreakdown = overviewOrderStatistics?.statusBreakdown
        let hasSnapshot = statusBreakdown != nil
        snapshotSectionView.update(
            reserved: statusBreakdown?.RESERVED ?? 0,
            active: statusBreakdown?.PICKUPED ?? 0,
            completed: (statusBreakdown?.RETURNED ?? 0) + (statusBreakdown?.COMPLETED ?? 0),
            cancelled: statusBreakdown?.CANCELLED ?? 0,
            hasData: hasSnapshot,
            depositHeldText: "—",
            depositDueText: "—",
            showsDepositMetrics: showsDepositMetricsForSelectedPeriod
        )
    }

    private func presentOverviewRankingList(mode: OverviewRankingListMode) {
        guard selectedPeriod.showsChartsAndInsights else { return }
        guard let navigationController = navigationController else { return }

        let range = selectedPeriod.dateRange(todayDate: todayDate, year: years[yearSelectedIndex])
        let controller = OverviewRankingListViewController(
            mode: mode,
            startDate: range.start,
            endDate: range.end,
            periodSubtitle: selectedPeriod.periodSubtitle(todayDate: todayDate, year: years[yearSelectedIndex])
        )
        controller.hidesBottomBarWhenPushed = true
        navigationController.pushViewController(controller, animated: true)
    }

    private func updateOrdersSectionHeader(orderCount: Int) {
        let countText = orderCount.formatStringInCommon()
        todayOrdersCountLabel.text = "\(countText) " + "Overview_Orders_Count".localized()
        todayOrdersDateLabel.text = selectedPeriod.periodSubtitle(todayDate: todayDate, year: years[yearSelectedIndex])
    }

    private func setOrdersSectionPlaceholder(_ placeholder: String) {
        todayOrdersCountLabel.text = placeholder
        todayOrdersDateLabel.text = selectedPeriod.periodSubtitle(todayDate: todayDate, year: years[yearSelectedIndex])
    }

    @objc private func overviewInfoButtonTapped(_ sender: UIButton) {
        guard let metric = OverviewMetric(rawValue: sender.tag) else { return }
        OverviewMetricInfoPresenter.present(metric: metric, from: self)
    }

    private func showNoPermissionMessage() {
        chartScrollView.isHidden = true
        chartStackView.isHidden = true
        summaryCard.isHidden = true
        snapshotSectionView.isHidden = true
        periodFilterView.isHidden = true
        todayOrdersSectionCard.isHidden = true
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

    func tableView(_ tableView: UITableView, willDisplay cell: UITableViewCell, forRowAt indexPath: IndexPath) {
        let isLast = indexPath.row >= tableView.numberOfRows(inSection: indexPath.section) - 1
        cell.contentView.viewWithTag(9_901)?.isHidden = isLast
    }
    
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

private enum OverviewRankingListMode {
    case products
    case customers

    var title: String {
        switch self {
        case .products:
            return "Top Products".localized()
        case .customers:
            return "Top Customers".localized()
        }
    }

    var emptyText: String {
        switch self {
        case .products:
            return "No product performance for this period".localized()
        case .customers:
            return "No customer performance for this period".localized()
        }
    }
}

private final class OverviewRankingListViewController: BaseViewControler {

    private let mode: OverviewRankingListMode
    private let startDate: Date
    private let endDate: Date
    private let periodSubtitle: String

    private let scrollView = UIScrollView()
    private let contentView = UIView()
    private let rowsStackView = UIStackView()
    private let periodLabel = UILabel()

    private var isIPad: Bool {
        traitCollection.horizontalSizeClass == .regular
    }

    init(
        mode: OverviewRankingListMode,
        startDate: Date,
        endDate: Date,
        periodSubtitle: String
    ) {
        self.mode = mode
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
        loadData()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    override func setupUI() {
        super.setupUI()
        view.backgroundColor = .backgroundPrimary

        scrollView.showsVerticalScrollIndicator = false
        scrollView.alwaysBounceVertical = true
        scrollView.backgroundColor = .backgroundPrimary

        periodLabel.text = periodSubtitle
        periodLabel.font = .captionMedium(size: 12)
        periodLabel.textColor = .textSecondary
        periodLabel.textAlignment = .left

        let periodCard = UIView()
        periodCard.backgroundColor = .backgroundCard
        periodCard.layer.cornerRadius = 10
        periodCard.layer.borderWidth = 1
        periodCard.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.55).cgColor
        periodCard.addSubview(periodLabel)
        periodLabel.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 9, left: 12, bottom: 9, right: 12))
        }

        rowsStackView.axis = .vertical
        rowsStackView.spacing = 8

        guard let customNavBar = customNavBar else { return }

        view.addSubview(scrollView)
        scrollView.addSubview(contentView)
        contentView.backgroundColor = .backgroundPrimary
        contentView.addSubview(periodCard)
        contentView.addSubview(rowsStackView)

        scrollView.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
        contentView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.width.equalToSuperview()
        }
        periodCard.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.trailing.equalToSuperview().inset(16)
        }
        rowsStackView.snp.makeConstraints { make in
            make.top.equalTo(periodCard.snp.bottom).offset(12)
            make.leading.trailing.equalToSuperview().inset(16)
            make.bottom.equalToSuperview().offset(-20)
        }
    }

    private func setupNavigationBar() {
        setupCustomNavigationBar(
            title: mode.title,
            statusBarBackgroundColor: .backgroundCard,
            titleCentered: true,
            hideBackButton: false,
            backAction: .pop
        )
    }

    private func loadData() {
        showProgressText(text: "Loading...".localized(), navigationController: navigationController)
        rowsStackView.isHidden = true

        AnalyticsAPIService.shared.loadAnalyticsPeriod(
            startDate: startDate,
            endDate: endDate,
            groupBy: nil,
            limit: 20
        ) { [weak self] response, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.hideProgress(navigationController: self.navigationController)

                if let error = error, response == nil {
                    UIAlertController.errorAlert(parent: self, error: error)
                }

                switch self.mode {
                case .products:
                    self.renderProducts(response?.topProducts ?? [])
                case .customers:
                    self.renderCustomers(response?.topCustomers ?? [])
                }
            }
        }
    }

    private func renderProducts(_ products: [TopProduct]) {
        rowsStackView.isHidden = false

        let rows = products.prefix(20).enumerated().map { index, product -> UIView in
            let trimmedName = product.name?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let title = trimmedName.isEmpty ? "Unnamed product".localized() : trimmedName

            var subtitleParts: [String] = []
            if let category = product.category?.trimmingCharacters(in: .whitespacesAndNewlines), !category.isEmpty {
                subtitleParts.append(category)
            }
            subtitleParts.append("\((product.rentalCount ?? 0).formatStringInCommon()) " + "rentals".localized())

            return OverviewUIBuilder.makeRankingRow(
                rank: index + 1,
                title: title,
                subtitle: subtitleParts.joined(separator: " • "),
                value: (product.totalRevenue ?? 0).formatStringInCommon(),
                accentColor: .brandPrimary,
                isIPad: isIPad
            )
        }

        OverviewUIBuilder.populateRows(in: rowsStackView, rows: rows, emptyText: mode.emptyText, emptyCornerRadius: 10)
    }

    private func renderCustomers(_ customers: [TopCustomer]) {
        rowsStackView.isHidden = false

        let rows = customers.prefix(20).enumerated().map { index, customer -> UIView in
            let trimmedName = customer.name?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let title = trimmedName.isEmpty ? "Walk-in customer".localized() : trimmedName

            var trailingParts: [String] = []
            let orderCount = customer.orderCount ?? customer.rentalCount ?? customer.saleCount ?? 0
            if orderCount > 0 {
                trailingParts.append("\(orderCount.formatStringInCommon()) " + "orders".localized())
            } else if let location = customer.location?.trimmingCharacters(in: .whitespacesAndNewlines), !location.isEmpty {
                trailingParts.append(location)
            }

            return OverviewUIBuilder.makeCustomerRankingRow(
                rank: index + 1,
                title: title,
                phone: customer.phone,
                trailingSubtitle: trailingParts.isEmpty ? nil : trailingParts.joined(separator: " • "),
                value: (customer.totalSpent ?? 0).formatStringInCommon(),
                accentColor: .accentOrange,
                isIPad: isIPad
            )
        }

        OverviewUIBuilder.populateRows(in: rowsStackView, rows: rows, emptyText: mode.emptyText, emptyCornerRadius: 10)
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
        guard !isOutletStaff else { return }
        todayDate = date
        loadData()
    }
}
