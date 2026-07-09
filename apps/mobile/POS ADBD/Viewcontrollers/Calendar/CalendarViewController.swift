//
//  CalendarViewController.swift
//  POS ADBD
//
//  Created by Trinh Tran on 11/28/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import FSCalendar

class CalendarViewController: BaseViewControler {
    private var isMonthView = false {
        didSet {
            updateCalendarScope()
        }
    }

    private var selectedDate = Calendar.current.startOfDay(for: Date()) {
        didSet {
            updateSelectedDateSummary()
        }
    }

    private lazy var calendarToggleButton: UIButton = {
        let button = UIButton(type: .system)
        button.setImage(UIImage(systemName: "chevron.up"), for: .normal)
        button.tintColor = .textPrimary
        button.addTarget(self, action: #selector(toggleCalendarView), for: .touchUpInside)
        return button
    }()

    private lazy var refreshButton: UIButton = {
        let button = UIButton(type: .system)
        button.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        button.tintColor = .textPrimary
        button.addTarget(self, action: #selector(refreshData), for: .touchUpInside)
        return button
    }()

    private lazy var calendarSurfaceView: UIView = {
        let view = UIView()
        view.backgroundColor = .backgroundCard
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private lazy var selectedDateSummaryView: UIView = {
        let view = UIView()
        view.backgroundColor = .backgroundCard
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private lazy var selectedDateDividerView: UIView = {
        let view = UIView()
        view.backgroundColor = UIColor.borderColor.withAlphaComponent(0.75)
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private lazy var selectedDateValueLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 20)
        label.textColor = .textPrimary
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()

    private lazy var selectedDateMetaLabel: UILabel = {
        let label = UILabel()
        label.font = .captionLarge(size: 13)
        label.textColor = .textSecondary
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()

    private lazy var selectedDateCountPillView: UIView = {
        let view = UIView()
        view.backgroundColor = .brandPrimary.withAlphaComponent(0.10)
        view.layer.cornerRadius = 12
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private lazy var selectedDateCountLabel: UILabel = {
        let label = UILabel()
        label.font = .bodyMedium(size: 13)
        label.textColor = .brandPrimary
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()

    private lazy var emptyStateIconView: UIImageView = {
        let imageView = UIImageView(image: UIImage(systemName: "calendar"))
        imageView.tintColor = .textTertiary
        imageView.contentMode = .scaleAspectFit
        imageView.translatesAutoresizingMaskIntoConstraints = false
        return imageView
    }()

    private lazy var emptyStateMessageLabel: UILabel = {
        let label = UILabel()
        label.font = .bodyRegular(size: 14)
        label.textColor = .textSecondary
        label.textAlignment = .center
        label.numberOfLines = 0
        label.text = Locale.langCode == LangCode.vi.rawValue
            ? "Chưa có đơn thuê trong ngày này.\nChọn ngày khác trên lịch để xem đơn thuê."
            : "No rental orders on this day.\nChoose another day on the calendar to view orders."
        return label
    }()

    private lazy var emptyStateContainerView: UIView = {
        let container = UIView()
        container.backgroundColor = .clear

        let stack = UIStackView(arrangedSubviews: [emptyStateIconView, emptyStateMessageLabel])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: container.centerYAnchor, constant: -28),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: container.leadingAnchor, constant: 32),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: container.trailingAnchor, constant: -32),
            emptyStateIconView.widthAnchor.constraint(equalToConstant: 32),
            emptyStateIconView.heightAnchor.constraint(equalToConstant: 32)
        ])

        return container
    }()

    private lazy var calendar: FSCalendar = {
        let calendar = FSCalendar()
        calendar.backgroundColor = .backgroundCard
        calendar.delegate = self
        calendar.dataSource = self
        // Scope is left at the default (.month) here so the initial month->week
        // switch in setupUI() triggers a real transition -> boundingRectWillChange,
        // which sets the correct week height. It also lets FSCalendar seed its
        // `cachedMonthSize` from a month-sized frame on first layout.
        calendar.translatesAutoresizingMaskIntoConstraints = false
        calendar.locale = Locale.langCode == LangCode.vi.rawValue ? Locale(identifier: "vi_VN") : Locale(identifier: "en_US")
        calendar.placeholderType = .fillHeadTail
        calendar.appearance.caseOptions = []
        calendar.appearance.headerTitleColor = .textPrimary
        calendar.appearance.weekdayTextColor = .textSecondary
        calendar.appearance.titleDefaultColor = .textPrimary
        calendar.appearance.titlePlaceholderColor = .neutralGray.withAlphaComponent(0.55)
        calendar.appearance.titleSelectionColor = .textInverted
        calendar.appearance.selectionColor = .brandPrimary
        calendar.appearance.borderSelectionColor = .brandPrimary
        calendar.appearance.todayColor = .surfaceAccentSoft
        calendar.appearance.titleTodayColor = .brandPrimary
        calendar.appearance.todaySelectionColor = .brandPrimary
        calendar.appearance.eventDefaultColor = .brandPrimary.withAlphaComponent(0.55)
        calendar.appearance.eventSelectionColor = .textInverted
        calendar.appearance.eventOffset = CGPoint(x: 0, y: 2)
        calendar.appearance.subtitleDefaultColor = .clear
        calendar.appearance.headerTitleFont = Utils.mediumFont(size: UIDevice.current.userInterfaceIdiom == .pad ? 17 : 16)
        calendar.appearance.weekdayFont = Utils.regularFont(size: 12)
        calendar.appearance.titleFont = Utils.regularFont(size: UIDevice.current.userInterfaceIdiom == .pad ? 16 : 15)
        calendar.appearance.subtitleFont = Utils.regularFont(size: 10)
        calendar.appearance.borderRadius = 0.42
        calendar.allowsMultipleSelection = false
        calendar.swipeToChooseGesture.isEnabled = true
        calendar.scrollEnabled = true
        calendar.scrollDirection = .horizontal
        return calendar
    }()

    private lazy var orderTableView: UITableView = {
        let table = UITableView(frame: .zero, style: .plain)
        table.delegate = self
        table.dataSource = self
        table.backgroundColor = .backgroundPrimary
        table.separatorStyle = .none
        table.register(CalendarHeaderCell.self, forHeaderFooterViewReuseIdentifier: "CalendarHeaderCell")
        table.register(CalendarProductCell.self, forCellReuseIdentifier: String(describing: CalendarProductCell.self))
        table.tableHeaderView = UIView()
        table.tableFooterView = UIView()
        table.translatesAutoresizingMaskIntoConstraints = false
        table.rowHeight = UITableViewAutomaticDimension
        table.estimatedRowHeight = 80
        table.sectionHeaderHeight = UITableViewAutomaticDimension
        table.estimatedSectionHeaderHeight = 170
        table.sectionFooterHeight = UITableViewAutomaticDimension
        // iOS 15+ adds ~22pt padding above every section header by default. Each
        // order card is a section header, so this stacks on top of the footer gap
        // and the card's own top inset — making the space between cards too large.
        if #available(iOS 15.0, *) {
            table.sectionHeaderTopPadding = 0
        }
        table.contentInset = UIEdgeInsets(top: 6, left: 0, bottom: 10, right: 0)
        return table
    }()

    private var calendarData: [String: CalendarDayData] = [:]
    private var dates: [String: Int] = [:]
    private var ordersForSelectedDate: [CalendarOrder] = [] {
        didSet {
            expandedSections.removeAll()
            updateSelectedDateSummary()
            updateEmptyStateVisibility()
            orderTableView.reloadData()
        }
    }
    private var expandedSections: Set<Int> = []

    private var countCache: [String: [String: Int]] = [:]
    private var ordersByDateCache: [String: [CalendarOrderByDate]] = [:]
    private var shouldUseCache = true

    private lazy var dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "dd/MM/yy"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }()

    private lazy var selectedDateValueFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale.langCode == LangCode.vi.rawValue ? Locale(identifier: "vi_VN") : Locale(identifier: "en_US")
        formatter.dateFormat = Locale.langCode == LangCode.vi.rawValue ? "d 'Th' M" : "MMM d"
        return formatter
    }()

    private lazy var selectedDateMetaFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale.langCode == LangCode.vi.rawValue ? Locale(identifier: "vi_VN") : Locale(identifier: "en_US")
        formatter.dateFormat = Locale.langCode == LangCode.vi.rawValue ? "EEEE, dd/MM/yyyy" : "EEEE, MMM d, yyyy"
        return formatter
    }()

    private var calendarHeightConstraint: NSLayoutConstraint!

    /// Hard-coded initial (month) height, matching FSCalendar's official scope
    /// example. It only needs to be a sensible month height: the exact per-scope
    /// height is set by `boundingRectWillChange` on every scope transition.
    private var initialCalendarHeight: CGFloat {
        UIDevice.current.userInterfaceIdiom == .pad ? 400 : 300
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupNavigationBar()
        setupUI()
        setupData()
    }

    override func setupUI() {
        view.backgroundColor = .backgroundPrimary

        guard let customNavBar = customNavBar else { return }

        setupSelectedDateSummaryView()

        view.addSubview(calendarSurfaceView)
        calendarSurfaceView.addSubview(calendar)
        calendarSurfaceView.addSubview(selectedDateSummaryView)
        calendarSurfaceView.addSubview(selectedDateDividerView)

        view.addSubview(orderTableView)

        calendarHeightConstraint = calendar.heightAnchor.constraint(equalToConstant: initialCalendarHeight)

        NSLayoutConstraint.activate([
            calendarSurfaceView.topAnchor.constraint(equalTo: customNavBar.bottomAnchor),
            calendarSurfaceView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            calendarSurfaceView.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            calendar.topAnchor.constraint(equalTo: calendarSurfaceView.topAnchor),
            calendar.leadingAnchor.constraint(equalTo: calendarSurfaceView.leadingAnchor),
            calendar.trailingAnchor.constraint(equalTo: calendarSurfaceView.trailingAnchor),
            calendarHeightConstraint,

            selectedDateDividerView.topAnchor.constraint(equalTo: calendar.bottomAnchor),
            selectedDateDividerView.leadingAnchor.constraint(equalTo: calendarSurfaceView.leadingAnchor, constant: 16),
            selectedDateDividerView.trailingAnchor.constraint(equalTo: calendarSurfaceView.trailingAnchor, constant: -16),
            selectedDateDividerView.heightAnchor.constraint(equalToConstant: 1),

            selectedDateSummaryView.topAnchor.constraint(equalTo: selectedDateDividerView.bottomAnchor),
            selectedDateSummaryView.leadingAnchor.constraint(equalTo: calendarSurfaceView.leadingAnchor),
            selectedDateSummaryView.trailingAnchor.constraint(equalTo: calendarSurfaceView.trailingAnchor),
            selectedDateSummaryView.bottomAnchor.constraint(equalTo: calendarSurfaceView.bottomAnchor),
            selectedDateSummaryView.heightAnchor.constraint(greaterThanOrEqualToConstant: 74),

            orderTableView.topAnchor.constraint(equalTo: calendarSurfaceView.bottomAnchor),
            orderTableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            orderTableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            orderTableView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        updateEmptyStateVisibility()
        calendarToggleButton.transform = isMonthView ? .identity : CGAffineTransform(rotationAngle: .pi)

        // Collapse to week AFTER the (month) height constraint is in place. This is
        // a real month->week transition, so FSCalendar reports the correct week
        // height through boundingRectWillChange. (See FSCalendar's official scope
        // example — height is hard-coded initially, then driven by the callback.)
        calendar.setScope(.week, animated: false)
    }

    private func setupSelectedDateSummaryView() {
        let leftStackView = UIStackView(arrangedSubviews: [selectedDateValueLabel, selectedDateMetaLabel])
        leftStackView.axis = .vertical
        leftStackView.spacing = 4
        leftStackView.alignment = .leading
        leftStackView.translatesAutoresizingMaskIntoConstraints = false

        selectedDateSummaryView.addSubview(leftStackView)
        selectedDateSummaryView.addSubview(selectedDateCountPillView)
        selectedDateCountPillView.addSubview(selectedDateCountLabel)

        NSLayoutConstraint.activate([
            leftStackView.topAnchor.constraint(equalTo: selectedDateSummaryView.topAnchor, constant: 14),
            leftStackView.leadingAnchor.constraint(equalTo: selectedDateSummaryView.leadingAnchor, constant: 16),
            leftStackView.bottomAnchor.constraint(equalTo: selectedDateSummaryView.bottomAnchor, constant: -14),

            selectedDateCountPillView.centerYAnchor.constraint(equalTo: selectedDateSummaryView.centerYAnchor),
            selectedDateCountPillView.trailingAnchor.constraint(equalTo: selectedDateSummaryView.trailingAnchor, constant: -16),
            selectedDateCountPillView.leadingAnchor.constraint(greaterThanOrEqualTo: leftStackView.trailingAnchor, constant: 12),

            selectedDateCountLabel.topAnchor.constraint(equalTo: selectedDateCountPillView.topAnchor, constant: 8),
            selectedDateCountLabel.leadingAnchor.constraint(equalTo: selectedDateCountPillView.leadingAnchor, constant: 12),
            selectedDateCountLabel.trailingAnchor.constraint(equalTo: selectedDateCountPillView.trailingAnchor, constant: -12),
            selectedDateCountLabel.bottomAnchor.constraint(equalTo: selectedDateCountPillView.bottomAnchor, constant: -8)
        ])
    }

    private func setupNavigationBar() {
        let navBar = setupCustomNavigationBar(
            title: "Calendar".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: true,
            backAction: .pop
        )
        navBar.addRightButton(refreshButton)
        navBar.addRightButton(calendarToggleButton)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    override func setupData() {
        calendar.select(selectedDate)
        calendar.setCurrentPage(selectedDate, animated: false)
        updateSelectedDateSummary()
        loadCalendarData(for: selectedDate)
        loadOrdersForSelectedDate(selectedDate)
    }

    private func updateReadyToDeliver(orderId: Int, isReady: Bool, headerView: CalendarHeaderCell) {
        showProgressText(text: "Updating order...".localized(), navigationController: navigationController)

        let updateRequest = UpdateOrderRequest.updateReadyToDeliver(isReady)

        OrderService.shared.updateOrder(orderId: orderId, request: updateRequest) { [weak self] updatedOrder, error in
            DispatchQueue.main.async {
                self?.hideProgress(navigationController: self?.navigationController)

                if let error = error {
                    headerView.preparedButton.isSelected = !isReady
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }

                if updatedOrder != nil {
                    self?.loadCalendarData(for: self?.calendar.selectedDate ?? Date())
                    self?.loadOrdersForSelectedDate(self?.selectedDate ?? Date())
                }
            }
        }
    }

    @objc private func refreshData() {
        clearCache()
        loadCalendarData(for: calendar.currentPage)
        loadOrdersForSelectedDate(selectedDate)
    }

    private func clearCache() {
        countCache.removeAll()
        ordersByDateCache.removeAll()
        shouldUseCache = false
    }

    private func countCacheKey(month: Int, year: Int) -> String {
        "\(month)-\(year)"
    }

    private func ordersCacheKey(date: String) -> String {
        date
    }

    private var activeCalendarScope: FSCalendarScope {
        isMonthView ? .month : .week
    }

    @objc private func toggleCalendarView() {
        isMonthView.toggle()

        UIView.animate(withDuration: 0.3) {
            self.calendarToggleButton.transform = self.isMonthView ? .identity : CGAffineTransform(rotationAngle: .pi)
        }
    }

    private func updateCalendarScope(animated: Bool = true) {
        // FSCalendar reports the target height via boundingRectWillChange, which
        // updates calendarHeightConstraint. No manual height math needed.
        calendar.setScope(activeCalendarScope, animated: animated)
    }

    private func loadCalendarData(for date: Date) {
        let calendarRef = Calendar.current
        let month = calendarRef.component(.month, from: date)
        let year = calendarRef.component(.year, from: date)
        let cacheKey = countCacheKey(month: month, year: year)

        if shouldUseCache, let cachedCounts = countCache[cacheKey] {
            updateDatesForMonth(date: date, countByDate: cachedCounts)
            calendar.reloadData()
            updateSelectedDateSummary()
            return
        }

        showProgressText(text: "Loading...".localized())

        let outletId = User.account()?.outletId

        OrderService.shared.loadCalendarOrdersCount(
            month: month,
            year: year,
            status: "RESERVED",
            outletId: outletId
        ) { [weak self] countByDate, total, error in
            DispatchQueue.main.async {
                self?.hideProgress()

                if let error = error {
                    UIAlertController.errorAlert(parent: self, error: error)
                } else if let countByDate = countByDate {
                    self?.countCache[cacheKey] = countByDate
                    self?.shouldUseCache = true
                    self?.updateDatesForMonth(date: date, countByDate: countByDate)
                    self?.calendar.reloadData()
                    self?.updateSelectedDateSummary()

                    print("📅 Calendar count data loaded successfully:")
                    print("   Month: \(month), Year: \(year)")
                    print("   Total: \(total ?? 0)")
                    print("   Days with orders: \(countByDate.count)")
                    print("   ✅ Cached for future use")
                }
            }
        }
    }

    private func updateDatesForMonth(date: Date, countByDate: [String: Int]) {
        dates.removeAll()

        let apiDateFormatter = DateFormatter()
        apiDateFormatter.dateFormat = "yyyy-MM-dd"
        apiDateFormatter.locale = Locale(identifier: "en_US_POSIX")

        for (dateString, count) in countByDate {
            if let apiDate = apiDateFormatter.date(from: dateString) {
                let displayDateString = dateFormatter.string(from: apiDate)
                dates[displayDateString] = count
            }
        }
    }

    private func loadOrdersForSelectedDate(_ date: Date) {
        let apiDateFormatter = DateFormatter()
        apiDateFormatter.dateFormat = "yyyy-MM-dd"
        apiDateFormatter.locale = Locale(identifier: "en_US_POSIX")

        let apiDateString = apiDateFormatter.string(from: date)
        let cacheKey = ordersCacheKey(date: apiDateString)

        if shouldUseCache, let cachedOrders = ordersByDateCache[cacheKey] {
            ordersForSelectedDate = convertCalendarOrdersByDateToCalendarOrders(cachedOrders)
            return
        }

        let outletId = User.account()?.outletId
        showProgressText(text: "Loading orders...".localized())

        OrderService.shared.loadCalendarOrdersByDate(
            date: apiDateString,
            status: "RESERVED",
            outletId: outletId,
            page: 1,
            limit: 500
        ) { [weak self] orders, summary, pagination, error in
            DispatchQueue.main.async {
                self?.hideProgress()

                if let error = error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    self?.ordersForSelectedDate = []
                } else if let orders = orders {
                    self?.ordersByDateCache[cacheKey] = orders
                    self?.shouldUseCache = true
                    self?.ordersForSelectedDate = self?.convertCalendarOrdersByDateToCalendarOrders(orders) ?? []

                    print("📅 Orders loaded for date \(apiDateString):")
                    print("   Orders count: \(orders.count)")
                    if let summary = summary {
                        print("   Total Orders: \(summary.totalOrders ?? 0)")
                        print("   Total Revenue: \(summary.totalRevenue ?? 0)")
                    }
                    if let pagination = pagination {
                        print("   Page: \(pagination.page ?? 1) / \(pagination.totalPages ?? 1)")
                    }
                    print("   ✅ Cached for future use")
                } else {
                    self?.ordersForSelectedDate = []
                }
            }
        }
    }

    private func convertCalendarOrdersByDateToCalendarOrders(_ orders: [CalendarOrderByDate]) -> [CalendarOrder] {
        orders.map { order in
            let dateFormatter = ISO8601DateFormatter()
            dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            dateFormatter.timeZone = TimeZone(abbreviation: "UTC")

            let pickupPlanAtString = order.pickupPlanAt != nil ? dateFormatter.string(from: order.pickupPlanAt!) : nil
            let returnPlanAtString = order.returnPlanAt != nil ? dateFormatter.string(from: order.returnPlanAt!) : nil
            let createdAtString = order.createdAt != nil ? dateFormatter.string(from: order.createdAt!) : nil

            return CalendarOrder(
                id: order.id,
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                customerPhone: order.customerPhone,
                status: order.status,
                totalAmount: order.totalAmount,
                outletName: order.outletName,
                pickupPlanAt: pickupPlanAtString,
                returnPlanAt: returnPlanAtString,
                productName: order.productName,
                productCount: order.productCount,
                orderItems: order.orderItems.map { item in
                    CalendarOrderItem(
                        id: item.id,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                        notes: item.notes,
                        productId: item.productId,
                        productName: item.productName,
                        productBarcode: item.productBarcode,
                        productImages: item.productImages,
                        productRentPrice: item.productRentPrice,
                        productDeposit: item.productDeposit
                    )
                },
                isReadyToDeliver: order.isReadyToDeliver,
                createdAt: createdAtString
            )
        }
    }

    private func updateSelectedDateSummary() {
        selectedDateValueLabel.text = selectedDateValueFormatter.string(from: selectedDate)
        selectedDateMetaLabel.text = selectedDateMetaFormatter.string(from: selectedDate)

        let orderCount = selectedOrderCount(for: selectedDate)
        selectedDateCountLabel.text = selectedCountText(for: orderCount)
        selectedDateCountPillView.backgroundColor = orderCount > 0 ? .brandPrimary.withAlphaComponent(0.10) : .backgroundTertiary
        selectedDateCountLabel.textColor = orderCount > 0 ? .brandPrimary : .textSecondary
    }

    private func selectedOrderCount(for date: Date) -> Int {
        let displayDateString = dateFormatter.string(from: date)
        if let count = dates[displayDateString] {
            return count
        }
        return Calendar.current.isDate(date, inSameDayAs: selectedDate) ? ordersForSelectedDate.count : 0
    }

    private func selectedCountText(for count: Int) -> String {
        if Locale.langCode == LangCode.vi.rawValue {
            return "\(count) đơn thuê"
        }

        let orderText = count == 1 ? "order".localized() : "orders".localized()
        return "\(count) \(orderText)"
    }

    private func updateEmptyStateVisibility() {
        orderTableView.backgroundView = ordersForSelectedDate.isEmpty ? emptyStateContainerView : nil
    }
}

extension CalendarViewController: FSCalendarDelegate, FSCalendarDataSource, FSCalendarDelegateAppearance {
    func calendarCurrentPageDidChange(_ calendar: FSCalendar) {
        loadCalendarData(for: calendar.currentPage)
    }

    func calendar(_ calendar: FSCalendar, boundingRectWillChange bounds: CGRect, animated: Bool) {
        // FSCalendar's official scope example: the callback is the single source of
        // truth for the calendar's height. Update the constraint and lay out in the
        // same transaction (no nested UIView.animate block).
        calendarHeightConstraint.constant = bounds.height
        view.layoutIfNeeded()
    }

    func calendar(_ calendar: FSCalendar, didSelect date: Date, at monthPosition: FSCalendarMonthPosition) {
        selectedDate = Calendar.current.startOfDay(for: date)
        loadOrdersForSelectedDate(selectedDate)

        if monthPosition == .next || monthPosition == .previous {
            calendar.setCurrentPage(date, animated: true)
        }
    }

    func calendar(_ calendar: FSCalendar, numberOfEventsFor date: Date) -> Int {
        let currentDateInString = dateFormatter.string(from: date)
        guard let numberOfOrder = dates[currentDateInString], numberOfOrder > 0 else { return 0 }
        return min(numberOfOrder, 3)
    }

    func calendar(_ calendar: FSCalendar, subtitleFor date: Date) -> String? {
        nil
    }

    func calendar(_ calendar: FSCalendar, appearance: FSCalendarAppearance, fillSelectionColorFor date: Date) -> UIColor? {
        .brandPrimary
    }

    func calendar(_ calendar: FSCalendar, appearance: FSCalendarAppearance, titleSelectionColorFor date: Date) -> UIColor? {
        .textInverted
    }

    func calendar(_ calendar: FSCalendar, appearance: FSCalendarAppearance, fillDefaultColorFor date: Date) -> UIColor? {
        if Calendar.current.isDateInToday(date) {
            return .surfaceAccentSoft
        }
        return nil
    }

    func calendar(_ calendar: FSCalendar, appearance: FSCalendarAppearance, titleDefaultColorFor date: Date) -> UIColor? {
        if Calendar.current.isDateInToday(date) {
            return .brandPrimary
        }
        return .textPrimary
    }

    func minimumDate(for calendar: FSCalendar) -> Date {
        Calendar.current.date(byAdding: .year, value: -1, to: Date())!
    }

    func maximumDate(for calendar: FSCalendar) -> Date {
        Calendar.current.date(byAdding: .year, value: 1, to: Date())!
    }
}

extension CalendarViewController: UITableViewDataSource, UITableViewDelegate {
    func numberOfSections(in tableView: UITableView) -> Int {
        ordersForSelectedDate.count
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        guard expandedSections.contains(section) else { return 0 }
        return ordersForSelectedDate[section].orderItems?.count ?? 0
    }

    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? {
        guard let headerView = tableView.dequeueReusableHeaderFooterView(
            withIdentifier: "CalendarHeaderCell"
        ) as? CalendarHeaderCell else {
            return nil
        }

        let calendarOrder = ordersForSelectedDate[section]
        let itemCount = calendarOrder.orderItems?.count ?? 0

        headerView.bind(
            calendarOrder: calendarOrder,
            isExpanded: expandedSections.contains(section),
            showsProductRows: itemCount > 0
        )

        headerView.onExpandTapped = { [weak self] in
            self?.toggleSection(section)
        }

        headerView.onReadyToDeliverTapped = { [weak self] isReady, orderId in
            self?.updateReadyToDeliver(orderId: orderId, isReady: isReady, headerView: headerView)
        }

        return headerView
    }

    func tableView(_ tableView: UITableView, heightForHeaderInSection section: Int) -> CGFloat {
        UITableViewAutomaticDimension
    }

    func tableView(_ tableView: UITableView, estimatedHeightForHeaderInSection section: Int) -> CGFloat {
        170
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        guard let cell = tableView.dequeueReusableCell(
            withIdentifier: String(describing: CalendarProductCell.self),
            for: indexPath
        ) as? CalendarProductCell else {
            return UITableViewCell()
        }

        let order = ordersForSelectedDate[indexPath.section]
        if let orderItems = order.orderItems, indexPath.row < orderItems.count {
            let orderItem = orderItems[indexPath.row]
            let isLastInSection = indexPath.row == orderItems.count - 1
            cell.bind(orderItem: orderItem, isLastInSection: isLastInSection)
        }

        return cell
    }

    func tableView(_ tableView: UITableView, heightForRowAt indexPath: IndexPath) -> CGFloat {
        UITableViewAutomaticDimension
    }

    func tableView(_ tableView: UITableView, estimatedHeightForRowAt indexPath: IndexPath) -> CGFloat {
        80
    }

    func tableView(_ tableView: UITableView, heightForFooterInSection section: Int) -> CGFloat {
        8
    }

    func tableView(_ tableView: UITableView, viewForFooterInSection section: Int) -> UIView? {
        let view = UIView()
        view.backgroundColor = .clear
        return view
    }

    private func toggleSection(_ section: Int) {
        let wasExpanded = expandedSections.contains(section)
        let order = ordersForSelectedDate[section]
        let itemCount = order.orderItems?.count ?? 0

        guard itemCount > 0 else { return }

        if wasExpanded {
            expandedSections.remove(section)
        } else {
            expandedSections.insert(section)
        }

        orderTableView.beginUpdates()

        let indexPaths = (0..<itemCount).map { IndexPath(row: $0, section: section) }
        if wasExpanded {
            orderTableView.deleteRows(at: indexPaths, with: .fade)
        } else {
            orderTableView.insertRows(at: indexPaths, with: .fade)
        }

        if let headerView = orderTableView.headerView(forSection: section) as? CalendarHeaderCell {
            headerView.bind(
                calendarOrder: order,
                isExpanded: expandedSections.contains(section),
                showsProductRows: itemCount > 0
            )
            headerView.updateExpandState(animated: true)
        }

        orderTableView.endUpdates()
    }
}
