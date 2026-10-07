//
//  OverviewV2ViewController.swift
//  POS ADBD
//
//  Redesigned overview tab (#374, boards Tong-quan, Tong-quan-chon), shown when `newOverview` is on: one period
//  (sheet), net money with per-day bars and the change against the previous period, order figures, top rented.
//  #484: "Tiền đã thu" with an explanation sheet, Tổng giá trị đơn / Còn phải thu tiles, a Tiền thu | Số đơn chart
//  toggle, and the rented-out figures open the grouped rented-out list.
//  #492: the hero is "Tổng giá trị đơn mới" with its change; Thực thu (opens the breakdown sheet) and Còn phải thu
//  tiles under it; collateral held leaves the ĐƠN rows for the breakdown sheet.
//  #494: with `collateralFlow` the Thực thu sheet becomes "Tiền thực nhận" (money and collateral apart, upcoming
//  collateral); with `outstandingBreakdown` the Còn phải thu tile opens its own sheet.
//  #496: "VIỆC HÔM NAY · <today>" above ĐƠN (hand-overs / returns of today, open the Orders tab), the red row
//  "Quá ngày lấy, khách chưa đến" and both Còn phải thu sheet rows open "Chưa lấy đồ".
//  #616: redrawn after the canvas phone boards (web #608 #611 #612 #613): period chips, four KPI tiles that open a
//  detail sheet, "Thực thu theo ngày" with the hatched forecast, and the "Hôm nay" counters. The sheets and rows
//  below (#484–#496) stay for their tests; the screen no longer uses them.
//

import UIKit
import SnapKit
import Kingfisher
import Alamofire

final class OverviewV2ViewController: BaseViewControler {
    private var chip: OverviewChip = .today
    private var customRange: DayKeyRange?
    private var report: OverviewReport?
    private var chartReport: OverviewReport?
    private var now: OverviewNow?
    private var reportFailed: String?
    private var loading = false
    private var generation = 0
    private var requests: [DataRequest] = []

    private let scrollView = UIScrollView()
    private let contentStack = UIStackView()
    private let dateLabel = OVFont.label(nil, DS.TextSize.secondary, color: OVColor.muted)
    private let chipsRow = UIStackView()
    private var chipButtons: [OverviewChipButton] = []
    private let refresh = UIRefreshControl()

    private var permissions: [String] { User.current()?.permissions ?? User.account()?.permissions ?? [] }
    private var showsRevenue: Bool { OverviewLogic.showsRevenue(permissions: permissions) }
    private var showsOperations: Bool { OverviewLogic.showsOperations(permissions: permissions) }
    private var todayKey: String { DayFormatter.key(Date()) }
    private var range: DayKeyRange { OverviewDashLogic.range(of: chip, todayKey: todayKey, custom: customRange) }
    private var chartRange: DayKeyRange { OverviewDashLogic.chartRange(of: chip, range: range) }
    private var vietnamese: Bool { OrdersHomeLogic.appLocale.languageCode == "vi" }

    override func viewDidLoad() {
        super.viewDidLoad()
        #if DEBUG
        // Review only: the app is Light-only (Info.plist); `-OverviewForceDark YES` shows this screen dark
        if UserDefaults.standard.bool(forKey: "OverviewForceDark") {
            navigationController?.overrideUserInterfaceStyle = .dark
            overrideUserInterfaceStyle = .dark
        }
        #endif
        setupUI()
        load()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    override func setupUI() {
        view.backgroundColor = OVColor.page
        let title = OVFont.label("overview.v2.title".localized(), DS.TextSize.title, .bold)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        dateLabel.textAlignment = .right
        dateLabel.adjustsFontSizeToFitWidth = true
        dateLabel.minimumScaleFactor = 0.8
        let header = UIStackView(arrangedSubviews: [title, dateLabel])
        header.alignment = .firstBaseline
        header.spacing = DS.Spacing.sm
        title.setContentHuggingPriority(.required, for: .horizontal)
        title.setContentCompressionResistancePriority(.required, for: .horizontal)

        chipsRow.spacing = 6
        chipsRow.alignment = .center
        for item in OverviewChip.allCases {
            let button = OverviewChipButton(title: item.title)
            button.addTarget(self, action: #selector(chipTapped(_:)), for: .touchUpInside)
            chipButtons.append(button)
            chipsRow.addArrangedSubview(button)
        }
        let chipsScroll = UIScrollView()
        chipsScroll.showsHorizontalScrollIndicator = false
        chipsScroll.clipsToBounds = false
        chipsScroll.addSubview(chipsRow)
        chipsRow.snp.makeConstraints { make in
            make.edges.equalTo(chipsScroll.contentLayoutGuide)
            make.height.equalTo(chipsScroll.frameLayoutGuide)
        }
        chipsScroll.snp.makeConstraints { make in make.height.equalTo(DS.touchTarget) }
        chipsScroll.isHidden = !showsRevenue

        contentStack.axis = .vertical
        contentStack.spacing = 14
        scrollView.alwaysBounceVertical = true
        scrollView.refreshControl = refresh
        refresh.addTarget(self, action: #selector(pulled), for: .valueChanged)
        view.addSubview(scrollView)
        scrollView.addSubview(contentStack)
        scrollView.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.bottom.equalToSuperview()
        }
        contentStack.snp.makeConstraints { make in
            make.top.equalTo(scrollView.contentLayoutGuide).offset(DS.Spacing.lg)
            make.bottom.equalTo(scrollView.contentLayoutGuide).offset(-DS.Spacing.xl)
            make.leading.trailing.equalTo(scrollView.frameLayoutGuide).inset(DS.Spacing.lg)
        }
        contentStack.addArrangedSubview(header)
        contentStack.addArrangedSubview(chipsScroll)
        contentStack.setCustomSpacing(10, after: chipsScroll)
        render()
    }

    @objc private func pulled() { load() }

    // MARK: - Data

    private func load() {
        requests.forEach { $0.cancel() }
        requests = []
        generation += 1
        let token = generation
        let range = self.range
        let chartRange = self.chartRange
        loading = true
        reportFailed = nil
        render()

        let group = DispatchGroup()
        var newReport: OverviewReport?
        var newChart: OverviewReport?
        var newNow: OverviewNow?
        var failure: NSError?
        if showsRevenue {
            group.enter()
            requests.append(TabsV2APIService.shared.overviewReport(range) { report, error in
                newReport = report
                failure = error
                group.leave()
            })
            if chartRange != range {
                group.enter()
                requests.append(TabsV2APIService.shared.overviewReport(chartRange) { report, _ in
                    newChart = report
                    group.leave()
                })
            }
        }
        if showsOperations {
            group.enter()
            requests.append(TabsV2APIService.shared.overviewNow { now, _ in
                newNow = now
                group.leave()
            })
        }
        group.notify(queue: .main) { [weak self] in
            guard let self, token == self.generation else { return }
            self.refresh.endRefreshing()
            self.loading = false
            self.report = newReport
            self.chartReport = chartRange == range ? newReport : newChart
            if let newNow { self.now = newNow }
            if self.showsRevenue, newReport == nil {
                self.reportFailed = failure?.localizedDescription ?? ""
            }
            self.render()
        }
    }

    // MARK: - Render

    private func render() {
        let range = self.range
        dateLabel.text = OverviewLogic.longRange(range, locale: OrdersHomeLogic.appLocale)
        for (index, button) in chipButtons.enumerated() {
            let item = OverviewChip.allCases[index]
            button.isOn = item == chip
            if item == .custom, chip == .custom {
                button.setTitle(OverviewLogic.shortRange(range))
            } else {
                button.setTitle(item.title)
            }
        }
        // Keep the header and the chips (the first two views)
        contentStack.arrangedSubviews.dropFirst(2).forEach { $0.removeFromSuperview() }

        if showsRevenue {
            contentStack.addArrangedSubview(tilesGrid())
            contentStack.addArrangedSubview(chartCard())
        }
        if showsOperations {
            contentStack.addArrangedSubview(todayCard())
        }
        if showsRevenue, reportFailed == nil {
            contentStack.addArrangedSubview(topCard(products: true))
            contentStack.addArrangedSubview(topCard(products: false))
        }
        if !showsRevenue && !showsOperations {
            let label = OVFont.label("overview.v2.noAccess".localized(), DS.TextSize.body, color: OVColor.muted, lines: 0)
            label.textAlignment = .center
            contentStack.addArrangedSubview(label)
        }
    }

    private func card(_ views: [UIView], spacing: CGFloat = 10) -> UIView {
        let box = UIView()
        box.backgroundColor = OVColor.surface
        box.layer.cornerRadius = 14
        box.layer.borderWidth = 1
        box.layer.borderColor = OVColor.line.resolvedColor(with: traitCollection).cgColor
        let stack = UIStackView(arrangedSubviews: views)
        stack.axis = .vertical
        stack.spacing = spacing
        box.addSubview(stack)
        stack.snp.makeConstraints { make in make.edges.equalToSuperview().inset(14) }
        return box
    }

    private func periodTitle() -> String {
        chip == .custom ? OverviewLogic.shortRange(range) : chip.title
    }

    // MARK: Tiles

    private func tilesGrid() -> UIView {
        if let failed = reportFailed, !loading {
            let label = OVFont.label((failed.isEmpty ? "Something went wrong".localized() : failed) + " · " + "Retry".localized(),
                                     DS.TextSize.secondary, color: OVColor.red, lines: 0)
            label.isUserInteractionEnabled = true
            label.accessibilityTraits = UIAccessibilityTraitButton
            label.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(pulled)))
            return card([label])
        }
        let tiles = OverviewDashLogic.tiles(report: report, now: now)
        let forecast = OverviewDashLogic.forecast(collected: report?.netRevenue, series: report?.series ?? [], todayKey: todayKey)
        let views: [UIView] = tiles.map { tile in
            var forecastText: String?
            if tile.kind == .collected, let forecast {
                let amount = OverviewDashLogic.compact(forecast.forecast, vietnamese: vietnamese)
                forecastText = forecast.until == todayKey
                    ? String(format: "overview.dash.forecast.today".localized(), amount)
                    : String(format: "overview.dash.forecast.until".localized(), amount, OverviewLogic.dayMonth(forecast.until))
            }
            let view = OverviewTileView(tile: tile, valueText: OverviewDashLogic.tileText(tile, vietnamese: vietnamese),
                                        forecast: tile.kind == .collected ? forecast : nil, forecastText: forecastText,
                                        loading: loading || report == nil)
            view.addTarget(self, action: #selector(tileTapped(_:)), for: .touchUpInside)
            return view
        }
        let rows = stride(from: 0, to: views.count, by: 2).map { start -> UIView in
            let row = UIStackView(arrangedSubviews: Array(views[start..<min(start + 2, views.count)]))
            row.distribution = .fillEqually
            row.alignment = .fill
            row.spacing = 10
            return row
        }
        let grid = UIStackView(arrangedSubviews: rows)
        grid.axis = .vertical
        grid.spacing = 10
        return grid
    }

    @objc private func tileTapped(_ sender: OverviewTileView) {
        guard let report, !loading else { return }
        let tile = OverviewDashLogic.tiles(report: report, now: now).first { $0.kind == sender.kind }
        let valueText = tile.map { OverviewDashLogic.tileText($0, vietnamese: vietnamese, compact: false) } ?? "—"
        let sheet = OverviewDetailSheet(OverviewDetailContent(kind: sender.kind, periodTitle: periodTitle(), valueText: valueText,
                                                              report: report, now: now))
        let kind = sender.kind
        sheet.onOpenOrders = { [weak self] in self?.openOrders(for: kind) }
        sheet.overrideUserInterfaceStyle = overrideUserInterfaceStyle
        sheet.modalPresentationStyle = .pageSheet
        if let controller = sheet.sheetPresentationController {
            controller.detents = [.medium(), .large()]
            controller.prefersGrabberVisible = true
            controller.preferredCornerRadius = DS.Radius.sheet
        }
        present(sheet, animated: true)
    }

    /// "Xem các đơn liên quan": orders created in the period, "Chưa lấy đồ", or the rentals out now
    private func openOrders(for kind: OverviewTileKind) {
        let controller: UIViewController
        switch kind {
        case .orderValue, .collected:
            let title = "overview.v2.newOrders".localized()
            controller = OverviewRankingOrdersViewController(
                filter: .snapshot(.newOrders, title: title),
                startDate: OverviewLogic.date(of: range.start),
                endDate: OverviewLogic.date(of: range.end),
                periodSubtitle: OverviewLogic.longRange(range))
        case .outstanding:
            controller = RentedOutOrdersViewController(mode: .notPickedUp)
        case .collateral:
            controller = RentedOutOrdersViewController(startsAtLate: false)
        }
        controller.hidesBottomBarWhenPushed = true
        navigationController?.pushViewController(controller, animated: true)
    }

    // MARK: Chart

    private func chartCard() -> UIView {
        let title = OVFont.label("overview.dash.chart.title".localized(), DS.TextSize.body, .semibold)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        let head = UIStackView(arrangedSubviews: [title, UIView()])
        head.alignment = .center
        head.spacing = DS.Spacing.sm

        let chart = OverviewDayChartView()
        chart.snp.makeConstraints { make in make.height.equalTo(190) }
        var views: [UIView] = [head]
        if let source = chartReport, !loading {
            let bars = OverviewDashLogic.chartBars(report: source, range: chartRange, todayKey: todayKey)
            if bars.contains(where: { $0.forecast > 0 }) {
                head.addArrangedSubview(legend(OVColor.blue, hatched: false, "overview.dash.chart.collected".localized()))
                head.addArrangedSubview(legend(OVColor.blue, hatched: true, "overview.dash.chart.forecast".localized()))
            }
            if bars.allSatisfy({ $0.value == 0 && $0.forecast == 0 }) {
                let empty = OVFont.label("overview.dash.chart.empty".localized(), DS.TextSize.secondary, color: OVColor.muted, lines: 0)
                empty.textAlignment = .center
                empty.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(120) }
                views.append(empty)
            } else {
                let locale = OrdersHomeLogic.appLocale
                chart.configure(bars, label: { bar in
                    guard bar.isDay, let date = OverviewLogic.date(of: bar.key) else { return bar.key }
                    return DayFormatter.short(date, locale: locale)
                }, axis: { bar in bar.isDay ? OverviewLogic.dayMonth(bar.key) : bar.key })
                views.append(chart)
            }
        } else if reportFailed != nil {
            return card(views + [OVFont.label("—", DS.TextSize.body, color: OVColor.muted)])
        } else {
            let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)
            spinner.startAnimating()
            spinner.snp.makeConstraints { make in make.height.equalTo(190) }
            views.append(spinner)
        }
        return card(views)
    }

    private func legend(_ color: UIColor, hatched: Bool, _ text: String) -> UIView {
        let swatch = OverviewTrackBar()
        swatch.showsTrack = false
        swatch.color = color
        swatch.width = 1
        swatch.hatched = hatched
        swatch.snp.makeConstraints { make in make.width.height.equalTo(10) }
        let label = OVFont.label(text, DS.TextSize.pill, color: OVColor.ink2)
        let row = UIStackView(arrangedSubviews: [swatch, label])
        row.spacing = 4
        row.alignment = .center
        row.isAccessibilityElement = false
        return row
    }

    // MARK: Top sản phẩm / Top khách hàng (#620)

    private func topCard(products: Bool) -> UIView {
        let title = OVFont.label((products ? "overview.dash.top.products" : "overview.dash.top.customers").localized(),
                                 DS.TextSize.body, .semibold)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        guard let report, !loading else {
            let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)
            spinner.startAnimating()
            return card([title, spinner])
        }
        let rows = products ? OverviewDashLogic.topProductRows(report.topProducts)
                            : OverviewDashLogic.topCustomerRows(report.topCustomers)
        guard !rows.isEmpty else {
            return card([title, OVFont.label("overview.dash.top.empty".localized(), DS.TextSize.secondary, color: OVColor.muted, lines: 0)])
        }
        let views: [UIView] = rows.map { row in
            let subtitle = products ? PluralText.format("overview.dash.top.rentals", count: row.count, row.count)
                                    : PluralText.format("overview.dash.orders", count: row.count, row.count)
            let view = OverviewTopRowView(row: row, amountText: OverviewDashLogic.compact(row.amount, vietnamese: vietnamese),
                                          subtitle: subtitle, color: products ? OVColor.blue : OVColor.violet)
            if row.id != nil {
                view.accessibilityTraits = UIAccessibilityTraitButton
                view.addTarget(self, action: products ? #selector(topProductTapped(_:)) : #selector(topCustomerTapped(_:)),
                               for: .touchUpInside)
            } else {
                view.isUserInteractionEnabled = false
            }
            return view
        }
        return card([title] + views, spacing: 4)
    }

    @objc private func topProductTapped(_ sender: OverviewTopRowView) {
        guard let id = sender.row.id else { return }
        openRanking(.product(id: id, name: sender.row.name))
    }

    @objc private func topCustomerTapped(_ sender: OverviewTopRowView) {
        guard let id = sender.row.id else { return }
        openRanking(.customer(id: id, name: sender.row.name))
    }

    /// The product's / customer's orders in the period; its header opens the product or customer detail
    private func openRanking(_ filter: OverviewRankingOrdersFilter) {
        let controller = OverviewRankingOrdersViewController(
            filter: filter,
            startDate: OverviewLogic.date(of: range.start),
            endDate: OverviewLogic.date(of: range.end),
            periodSubtitle: OverviewLogic.longRange(range))
        controller.hidesBottomBarWhenPushed = true
        navigationController?.pushViewController(controller, animated: true)
    }

    // MARK: Hôm nay

    private func todayCard() -> UIView {
        let title = OVFont.label("overview.dash.today.title".localized(), DS.TextSize.body, .semibold)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        guard let now, let today = now.today else {
            let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)
            if loading { spinner.startAnimating() }
            return card([title, loading ? spinner : OVFont.label("—", DS.TextSize.body, color: OVColor.muted)])
        }
        let pickups = OverviewDashLogic.doneOfTotal(today.pickups)
        let returns = OverviewDashLogic.doneOfTotal(today.returns)
        let late = now.lateReturns
        let noShows = now.noShows ?? 0
        let pickupTitle = "overview.dash.today.pickups".localized()
        let returnTitle = "overview.dash.today.returns".localized()
        let lateTitle = "overview.dash.today.overdue".localized()
        let noShowTitle = "overview.dash.today.noShows".localized()
        let counters: [(OverviewCounterView, Selector)] = [
            (OverviewCounterView(title: pickupTitle, value: pickups, valueColor: OVColor.ink, dot: OVColor.blue,
                                 accessibility: "\(pickupTitle): " + String(format: "overview.v2.todayWork.pickupsDone".localized(),
                                                                            today.pickups.done, today.pickups.total)),
             #selector(openOrdersTab)),
            (OverviewCounterView(title: returnTitle, value: returns, valueColor: OVColor.ink, dot: OVColor.violet,
                                 accessibility: "\(returnTitle): " + String(format: "overview.v2.todayWork.returnsDone".localized(),
                                                                            today.returns.done, today.returns.total)),
             #selector(openOrdersTab)),
            (OverviewCounterView(title: lateTitle, value: "\(late)", valueColor: late > 0 ? OVColor.red : OVColor.ink, dot: OVColor.red,
                                 accessibility: "\(lateTitle): \(late)"), #selector(openLateReturns)),
            (OverviewCounterView(title: noShowTitle, value: "\(noShows)", valueColor: noShows > 0 ? OVColor.amber : OVColor.ink,
                                 dot: OVColor.amber, accessibility: "\(noShowTitle): \(noShows)"), #selector(openNotPickedUp)),
        ]
        counters.forEach { $0.0.addTarget(self, action: $0.1, for: .touchUpInside) }
        let rows = [Array(counters[0..<2]), Array(counters[2..<4])].map { pair -> UIView in
            let row = UIStackView(arrangedSubviews: pair.map(\.0))
            row.distribution = .fillEqually
            row.spacing = 8
            return row
        }
        let grid = UIStackView(arrangedSubviews: rows)
        grid.axis = .vertical
        grid.spacing = 8
        var views: [UIView] = [title, grid]
        if let tomorrow = now.tomorrow {
            let line = OVFont.label(String(format: "overview.dash.today.tomorrow".localized(), tomorrow.pickups, tomorrow.returns),
                                    DS.TextSize.pill, color: OVColor.muted, lines: 0)
            views.append(line)
        }
        return card(views)
    }

    /// The Orders tab (its "Việc cần làm" lists today's hand-overs and returns)
    @objc private func openOrdersTab() {
        guard let tabs = tabBarController ?? (appDelegate.window?.rootViewController as? UITabBarController) else { return }
        let index = tabs.viewControllers?.firstIndex { controller in
            let root = (controller as? UINavigationController)?.viewControllers.first ?? controller
            return root is OrdersViewController || root is SaleViewController
        }
        guard let index else { return }
        tabs.selectedIndex = index
    }

    @objc private func openLateReturns() {
        let list = RentedOutOrdersViewController(startsAtLate: true)
        list.hidesBottomBarWhenPushed = true
        navigationController?.pushViewController(list, animated: true)
    }

    /// "Chưa lấy đồ": reserved rentals, overdue pickups first
    @objc private func openNotPickedUp() {
        let list = RentedOutOrdersViewController(mode: .notPickedUp)
        list.hidesBottomBarWhenPushed = true
        navigationController?.pushViewController(list, animated: true)
    }

    // MARK: - Periods

    @objc private func chipTapped(_ sender: OverviewChipButton) {
        guard let index = chipButtons.firstIndex(of: sender) else { return }
        let item = OverviewChip.allCases[index]
        if item == .custom {
            pickCustomRange()
            return
        }
        guard item != chip else { return }
        chip = item
        load()
    }

    private func pickCustomRange() {
        let picker = DatePickerViewController.instance()
        picker.delegate = self
        let current = range
        let maxKey = OverviewDashLogic.customMaxKey(todayKey: todayKey)
        // FSCalendar draws the phone's days: select the range's shop days there (#596); #612: up to a year ahead
        picker.configureForDateRange(startDate: OverviewLogic.date(of: current.start)?.devicePickFromShopDay(),
                                     endDate: OverviewLogic.date(of: current.end)?.devicePickFromShopDay(),
                                     minimumDate: Calendar.current.date(byAdding: .year, value: -10, to: Date()),
                                     maximumDate: OverviewLogic.date(of: maxKey)?.devicePickFromShopDay())
        present(picker, animated: true)
    }
}

extension OverviewV2ViewController: DatePickerViewControllerDelegate {
    func didSelectDate(_ date: Date, sender: DatePickerViewController) {
        // The tapped day (FSCalendar, phone zone) as a shop-day key (#596)
        let key = DayFormatter.key(date.shopDayFromDevicePick())
        chip = .custom
        customRange = DayKeyRange(start: key, end: key)
        load()
    }

    func didSelectDateRange(start: Date, end: Date, sender: DatePickerViewController) {
        let keys = [DayFormatter.key(start.shopDayFromDevicePick()), DayFormatter.key(end.shopDayFromDevicePick())].sorted()
        chip = .custom
        customRange = DayKeyRange(start: keys[0], end: keys[1])
        load()
    }
}


private extension UIView {
    static func v2Spacer(height: CGFloat) -> UIView {
        let view = UIView()
        view.snp.makeConstraints { make in make.height.equalTo(height) }
        return view
    }
}

/// A tappable overview row that knows which list it opens
final class OverviewLinkRow: UIControl {
    var filter: OverviewRankingOrdersFilter?
    /// #496: what a row without a list filter does (open a tab or another screen)
    var action: (() -> Void)?

    override var isHighlighted: Bool {
        didSet { backgroundColor = isHighlighted && (filter != nil || action != nil) ? V2.chipFill : .clear }
    }
}

/// Bars with a label under each (the last one highlighted)
final class OverviewBarsView: UIView {
    func configure(_ bars: [OverviewBar], mode: OverviewChartMode = .money) {
        subviews.forEach { $0.removeFromSuperview() }
        let ratios = OverviewLogic.barRatios(bars)
        let labelEvery = bars.count <= 7 ? 1 : max(1, Int((Double(bars.count) / 6).rounded(.up)))
        let columns = UIStackView()
        columns.distribution = .fillEqually
        columns.alignment = .fill
        columns.spacing = bars.count <= 7 ? 8 : (bars.count <= 14 ? 4 : 2)
        for (index, bar) in bars.enumerated() {
            let isLast = index == bars.count - 1
            let column = UIView()
            let fill = UIView()
            fill.backgroundColor = isLast ? DS.Color.primary : UIColor(hexString: "BFDBFE")
            fill.layer.cornerRadius = bars.count <= 14 ? 5 : 2
            fill.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
            let showsLabel = isLast || (index % labelEvery == 0 && bars.count - 1 - index >= (labelEvery + 1) / 2)
            let label = V2.label(showsLabel ? bar.label : "", size: DS.TextSize.pill,
                                 weight: isLast ? .bold : .regular, color: isLast ? DS.Color.text : DS.Color.textMuted)
            label.textAlignment = .center
            column.addSubview(fill)
            column.addSubview(label)
            // Centred under its bar and free to run over the unlabelled neighbours ("01/09" under a thin bar)
            label.snp.makeConstraints { make in
                make.centerX.bottom.equalToSuperview()
                make.height.equalTo(16)
            }
            fill.snp.makeConstraints { make in
                make.leading.trailing.equalToSuperview()
                make.bottom.equalTo(label.snp.top).offset(-6)
                let ratio = max(ratios[index], 0.02)
                make.height.equalTo(column.snp.height).multipliedBy(ratio).offset(-20 * ratio)
            }
            column.isAccessibilityElement = true
            switch mode {
            case .money:
                column.accessibilityLabel = "\(bar.label): \(MoneyFormatter.format(bar.value))"
            case .orders:
                let count = Int(bar.value)
                column.accessibilityLabel = "\(bar.label): \(PluralText.format("overview.v2.barOrders", count: count, count))"
            }
            columns.addArrangedSubview(column)
        }
        addSubview(columns)
        columns.snp.makeConstraints { make in make.edges.equalToSuperview() }
        accessibilityLabel = (mode == .money ? "overview.v2.bars" : "overview.v2.barsOrders").localized()
    }
}

/// "Thực thu" breakdown (#492, board Tong-quan-giai-thich): the parts of the money collected, the collateral kept
/// apart, and what the other two tiles mean. An older API sends no breakdown: only the total and the texts.
/// #494: with `collateralFlow` it is "Tiền thực nhận": the store's money and the collateral as two rows that open
/// their lines, their sum on top, and the collateral to come in a gray box.
final class OverviewCollectedDetailsSheet: UIViewController {
    /// Còn phải thu, on the tile and in its sheet
    static let outstandingColor = UIColor(hexString: "B45309")

    private let report: OverviewReport
    private let periodTitle: String
    private let collateralHeld: Double?
    private let collateralToReturn: OverviewNow.Collateral?
    private let collateralToCollect: OverviewNow.Collateral?

    /// `collateralToReturn` defaults to `collateralHeld` without an order count
    init(report: OverviewReport, periodTitle: String, collateralHeld: Double?,
         collateralToReturn: OverviewNow.Collateral? = nil, collateralToCollect: OverviewNow.Collateral? = nil) {
        self.report = report
        self.periodTitle = periodTitle
        self.collateralHeld = collateralHeld
        self.collateralToReturn = collateralToReturn ?? collateralHeld.map { OverviewNow.Collateral(amount: $0, orders: nil) }
        self.collateralToCollect = collateralToCollect
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface
        let views: [UIView]
        if let flow = report.collateralFlow {
            views = receivedViews(flow)
        } else {
            views = collectedViews()
        }
        let close: UIView = Self.closeButton(target: self, action: #selector(doneTapped))
        Self.layout(views + [close], in: self)
    }

    // MARK: Thực thu (older API)

    private func collectedViews() -> [UIView] {
        let title = Self.sheetTitle("\("overview.v2.collected".localized()) · \(periodTitle)")
        let body = V2.label("overview.v2.detail.body".localized(), size: DS.TextSize.body,
                            color: UIColor(hexString: "334155"), lines: 0)

        let list = UIStackView()
        list.axis = .vertical
        if let parts = report.collectedBreakdown {
            Self.collectedLines(parts).forEach { list.addArrangedSubview($0) }
        }
        list.addArrangedSubview(Self.row("overview.v2.collected".localized(), MoneyFormatter.format(report.netRevenue),
                                         bold: true, divider: false))

        var views: [UIView] = [title, body, list]
        if let box = collateralBox() { views.append(box) }

        let note = V2.label("overview.v2.detail.note".localized(), size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
        let noteBox = Self.grayBox(note)
        views.append(noteBox)
        return views
    }

    /// Deposits, hand-over and sales, fees, and refunds when there are any
    private static func collectedLines(_ parts: OverviewReport.CollectedBreakdown, indent: CGFloat = 0) -> [UIView] {
        let divider = indent == 0
        var lines = [
            row("overview.v2.depositsAtOrder".localized(), "+" + MoneyFormatter.format(parts.deposits), divider: divider, indent: indent),
            row("overview.v2.detail.pickupAndSale".localized(), "+" + MoneyFormatter.format(parts.pickupAndSale),
                divider: divider, indent: indent),
            row("overview.v2.detail.fees".localized(), "+" + MoneyFormatter.format(parts.fees), divider: divider, indent: indent),
        ]
        if parts.refunds > 0 {
            lines.append(row("overview.v2.detail.refunds".localized(), "−" + MoneyFormatter.format(parts.refunds),
                             color: indent == 0 ? outstandingColor : V2.danger, divider: divider, indent: indent))
        }
        return lines
    }

    /// Thế chân đang giữ, kept apart from the money collected; nil when unknown
    private func collateralBox() -> UIView? {
        guard let held = collateralHeld else { return nil }
        var rows: [UIView] = []
        rows.append(Self.row("overview.v2.collateralHeld".localized(), MoneyFormatter.format(held), divider: false, vertical: 6))
        rows.append(V2.label("overview.v2.detail.collateralNote".localized(), size: DS.TextSize.pill, color: DS.Color.textMuted, lines: 0))
        let column = UIStackView(arrangedSubviews: rows)
        column.axis = .vertical
        column.spacing = 2
        let box = UIView()
        box.layer.cornerRadius = DS.Radius.card
        box.layer.borderWidth = 1
        box.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        box.addSubview(column)
        column.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 8, left: 12, bottom: 10, right: 12)) }
        return box
    }

    // MARK: Tiền thực nhận (#494)

    private func receivedViews(_ flow: OverviewReport.CollateralFlow) -> [UIView] {
        let title = Self.sheetTitle("\("overview.v2.received.title".localized()) · \(periodTitle)")
        let caption = V2.label("overview.v2.received.caption".localized(), size: DS.TextSize.secondary,
                               color: DS.Color.textMuted, lines: 0)
        let total = V2.label(MoneyFormatter.format(report.netRevenue + flow.net), size: 28, weight: .bold)
        total.font = UIFont.monospacedDigitSystemFont(ofSize: 28, weight: .bold)
        total.adjustsFontSizeToFitWidth = true
        total.minimumScaleFactor = 0.6
        let head = UIStackView(arrangedSubviews: [caption, total])
        head.axis = .vertical
        head.spacing = 2
        head.isAccessibilityElement = true
        head.accessibilityLabel = "\(caption.text ?? ""), \(total.text ?? "")"

        let indent = DS.Spacing.lg
        let money = OverviewDisclosureSection(
            name: "overview.v2.collected".localized(), note: "overview.v2.received.collectedNote".localized(),
            value: MoneyFormatter.format(report.netRevenue),
            lines: report.collectedBreakdown.map { Self.collectedLines($0, indent: indent) } ?? [])
        let collateral = OverviewDisclosureSection(
            name: "overview.v2.collateral".localized(), note: "overview.v2.received.collateralNote".localized(),
            value: Self.signed(flow.net),
            lines: [
                Self.row("overview.v2.received.collateralIn".localized(), "+" + MoneyFormatter.format(flow.received),
                         divider: false, indent: indent),
                Self.row("overview.v2.received.collateralOut".localized(), "−" + MoneyFormatter.format(flow.returned),
                         color: V2.danger, divider: false, indent: indent),
            ])
        let list = UIStackView(arrangedSubviews: [money, collateral])
        list.axis = .vertical

        var views: [UIView] = [title, head, list]
        if let box = upcomingBox() { views.append(box) }
        return views
    }

    /// "THẾ CHÂN SẮP TỚI · chưa tính vào số nào": collateral to hand back and to receive; nil when neither is known
    private func upcomingBox() -> UIView? {
        var rows: [UIView] = []
        if let toReturn = collateralToReturn {
            rows.append(Self.noteRow("overview.v2.received.toReturn".localized(),
                                     note: toReturn.orders.map { PluralText.format("overview.v2.received.toReturnOrders", count: $0, $0) },
                                     value: MoneyFormatter.format(toReturn.amount)))
        }
        if let toCollect = collateralToCollect {
            rows.append(Self.noteRow("overview.v2.received.toCollect".localized(),
                                     note: toCollect.orders.map { PluralText.format("overview.v2.received.toCollectOrders", count: $0, $0) },
                                     value: MoneyFormatter.format(toCollect.amount)))
        }
        guard !rows.isEmpty else { return nil }
        let heading = UILabel()
        heading.numberOfLines = 0
        let text = NSMutableAttributedString(string: "overview.v2.received.upcoming".localized(),
                                             attributes: [.font: Utils.boldFont(size: DS.TextSize.pill),
                                                          .foregroundColor: DS.Color.textMuted])
        text.append(NSAttributedString(string: " · " + "overview.v2.received.upcomingNote".localized(),
                                       attributes: [.font: Utils.regularFont(size: DS.TextSize.pill),
                                                    .foregroundColor: DS.Color.textMuted]))
        heading.attributedText = text
        heading.accessibilityTraits = UIAccessibilityTraitHeader
        let column = UIStackView(arrangedSubviews: [heading] + rows)
        column.axis = .vertical
        column.spacing = 2
        column.setCustomSpacing(DS.Spacing.sm, after: heading)
        return Self.grayBox(column)
    }

    /// "+3.500.000đ" / "−500.000đ" / "0đ"
    static func signed(_ amount: Double) -> String {
        if amount > 0 { return "+" + MoneyFormatter.format(amount) }
        if amount < 0 { return "−" + MoneyFormatter.format(-amount) }
        return MoneyFormatter.format(0)
    }

    // MARK: Parts shared with the Còn phải thu sheet

    static func sheetTitle(_ text: String) -> UILabel {
        let title = V2.label(text, size: 18, weight: .bold, lines: 0)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        return title
    }

    static func grayBox(_ content: UIView) -> UIView {
        let box = UIView()
        box.backgroundColor = V2.sectionFill
        box.layer.cornerRadius = DS.Radius.card
        box.addSubview(content)
        content.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12)) }
        return box
    }

    static func closeButton(target: Any, action: Selector) -> UIButton {
        let done = UIButton(type: .system)
        done.setTitle("overview.v2.detail.close".localized(), for: .normal)
        done.setTitleColor(.white, for: .normal)
        done.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        done.backgroundColor = DS.Color.text
        done.layer.cornerRadius = DS.Radius.card
        done.addTarget(target, action: action, for: .touchUpInside)
        done.snp.makeConstraints { make in make.height.equalTo(48) }
        return done
    }

    /// The views one under the other in a scroll view, the last (the close button) a bit further down
    static func layout(_ views: [UIView], in controller: UIViewController) {
        let stack = UIStackView(arrangedSubviews: views)
        stack.axis = .vertical
        stack.spacing = DS.Spacing.md
        if views.count > 1 { stack.setCustomSpacing(DS.Spacing.md + 4, after: views[views.count - 2]) }

        let scroll = UIScrollView()
        scroll.alwaysBounceVertical = false
        controller.view.addSubview(scroll)
        scroll.addSubview(stack)
        scroll.snp.makeConstraints { make in make.edges.equalTo(controller.view.safeAreaLayoutGuide) }
        stack.snp.makeConstraints { make in
            make.top.equalTo(scroll.contentLayoutGuide).offset(DS.Spacing.xl)
            make.bottom.equalTo(scroll.contentLayoutGuide).offset(-DS.Spacing.lg)
            make.leading.trailing.equalTo(scroll.frameLayoutGuide).inset(20)
        }
    }

    /// Name on the left, amount right-aligned with tabular digits
    static func row(_ name: String, _ value: String, color: UIColor = DS.Color.text, bold: Bool = false,
                    divider: Bool = true, vertical: CGFloat = 10, indent: CGFloat = 0) -> UIView {
        let nameLabel = V2.label(name, size: DS.TextSize.body, weight: bold ? .bold : .regular,
                                 color: indent > 0 ? UIColor(hexString: "334155") : DS.Color.text, lines: 0)
        let valueLabel = V2.label(value, size: DS.TextSize.body, weight: bold ? .bold : .regular, color: color)
        valueLabel.font = UIFont.monospacedDigitSystemFont(ofSize: bold ? DS.TextSize.name : DS.TextSize.body,
                                                           weight: bold ? .bold : .regular)
        valueLabel.textAlignment = .right
        valueLabel.setContentHuggingPriority(.required, for: .horizontal)
        valueLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        let line = UIStackView(arrangedSubviews: [nameLabel, valueLabel])
        line.spacing = DS.Spacing.md
        line.alignment = .center
        let row = UIView()
        row.addSubview(line)
        line.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: indent > 0 ? 6 : vertical, left: indent,
                                                             bottom: indent > 0 ? 6 : vertical, right: 0))
        }
        if divider {
            let rule = V2.divider()
            row.addSubview(rule)
            rule.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        }
        row.isAccessibilityElement = true
        row.accessibilityLabel = "\(name), \(value)"
        return row
    }

    /// Name with a muted note under it (left), amount right-aligned
    static func noteRow(_ name: String, note: String?, value: String, color: UIColor = DS.Color.text,
                        bold: Bool = false, divider: Bool = false) -> UIView {
        let nameLabel = V2.label(name, size: DS.TextSize.body, weight: bold ? .bold : .medium, lines: 0)
        let texts = UIStackView(arrangedSubviews: [nameLabel])
        texts.axis = .vertical
        texts.spacing = 2
        if let note {
            texts.addArrangedSubview(V2.label(note, size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0))
        }
        let valueLabel = V2.label(value, size: DS.TextSize.body, weight: .bold, color: color)
        valueLabel.font = UIFont.monospacedDigitSystemFont(ofSize: bold ? DS.TextSize.name : DS.TextSize.body, weight: .bold)
        valueLabel.textAlignment = .right
        valueLabel.setContentHuggingPriority(.required, for: .horizontal)
        valueLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        let line = UIStackView(arrangedSubviews: [texts, valueLabel])
        line.spacing = DS.Spacing.md
        line.alignment = .center
        let row = UIView()
        row.addSubview(line)
        line.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 8, left: 0, bottom: 8, right: 0)) }
        if divider {
            let rule = V2.divider()
            row.addSubview(rule)
            rule.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        }
        row.isAccessibilityElement = true
        row.accessibilityLabel = [name, note, value].compactMap { $0 }.joined(separator: ", ")
        return row
    }

    @objc private func doneTapped() { dismiss(animated: true) }
}

/// A row (name, note under it, amount, chevron) whose tap shows or hides its indented lines; collapsed at first.
/// Without lines it is a plain row with no chevron.
final class OverviewDisclosureSection: UIView {
    private let header = UIControl()
    private let chevron = UIImageView(image: DS.symbol("chevron.right", 14, weight: .semibold))
    private let details: UIStackView
    private(set) var isExpanded = false

    init(name: String, note: String, value: String, lines: [UIView]) {
        details = UIStackView(arrangedSubviews: lines)
        super.init(frame: .zero)
        let nameLabel = V2.label(name, size: DS.TextSize.body, weight: .bold, lines: 0)
        let noteLabel = V2.label(note, size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
        let texts = UIStackView(arrangedSubviews: [nameLabel, noteLabel])
        texts.axis = .vertical
        texts.spacing = 2
        let valueLabel = V2.label(value, size: DS.TextSize.name, weight: .bold)
        valueLabel.font = UIFont.monospacedDigitSystemFont(ofSize: DS.TextSize.name, weight: .bold)
        valueLabel.textAlignment = .right
        valueLabel.setContentHuggingPriority(.required, for: .horizontal)
        valueLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        chevron.tintColor = UIColor(hexString: "94A3B8")
        chevron.contentMode = .center
        chevron.setContentHuggingPriority(.required, for: .horizontal)
        chevron.snp.makeConstraints { make in make.width.equalTo(16) }
        chevron.isHidden = lines.isEmpty
        let line = UIStackView(arrangedSubviews: [texts, valueLabel, chevron])
        line.spacing = DS.Spacing.sm
        line.alignment = .center
        line.isUserInteractionEnabled = false
        header.addSubview(line)
        line.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: 0, bottom: 10, right: 0))
            make.height.greaterThanOrEqualTo(28)
        }
        header.isAccessibilityElement = true
        header.accessibilityLabel = "\(name), \(note), \(value)"
        if !lines.isEmpty {
            header.addTarget(self, action: #selector(toggle), for: .touchUpInside)
            header.accessibilityTraits = UIAccessibilityTraitButton
        }

        details.axis = .vertical
        details.isHidden = true
        let column = UIStackView(arrangedSubviews: [header, details])
        column.axis = .vertical
        column.setCustomSpacing(0, after: header)
        let rule = V2.divider()
        addSubview(column)
        addSubview(rule)
        column.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview()
            make.bottom.equalToSuperview().offset(-4)
        }
        rule.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    @objc func toggle() {
        isExpanded.toggle()
        details.isHidden = !isExpanded
        UIView.animate(withDuration: 0.2) {
            self.chevron.transform = self.isExpanded ? CGAffineTransform(rotationAngle: .pi / 2) : .identity
        }
    }
}

/// "Còn phải thu" split (#494): what is collected at pickup from today on, what is past its pickup day, and the total
final class OverviewOutstandingDetailsSheet: UIViewController {
    /// #496: both rows open "Chưa lấy đồ" (run after the sheet is dismissed)
    var onOpenOrders: (() -> Void)?
    private let breakdown: OverviewReport.OutstandingBreakdown
    private let total: Double
    private let periodTitle: String

    init(breakdown: OverviewReport.OutstandingBreakdown, total: Double, periodTitle: String) {
        self.breakdown = breakdown
        self.total = total
        self.periodTitle = periodTitle
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface
        typealias Parts = OverviewCollectedDetailsSheet
        let title = Parts.sheetTitle("\("overview.v2.outstanding".localized()) · \(periodTitle)")
        let body = V2.label("overview.v2.outstandingDetail.body".localized(), size: DS.TextSize.body,
                            color: UIColor(hexString: "334155"), lines: 0)

        let list = UIStackView()
        list.axis = .vertical
        let atPickup = breakdown.atPickup
        list.addArrangedSubview(opening(Parts.noteRow(
            "overview.v2.outstandingDetail.atPickup".localized(),
            note: PluralText.format("overview.v2.outstandingDetail.atPickupOrders", count: atPickup.orders, atPickup.orders),
            value: MoneyFormatter.format(atPickup.amount), divider: true)))
        let overdue = breakdown.overduePickup
        if overdue.orders > 0 {
            list.addArrangedSubview(opening(Parts.noteRow(
                "overview.v2.outstandingDetail.overdue".localized(),
                note: PluralText.format("overview.v2.outstandingDetail.overdueOrders", count: overdue.orders, overdue.orders),
                value: MoneyFormatter.format(overdue.amount), color: V2.danger, divider: true)))
        }
        list.addArrangedSubview(Parts.row("overview.v2.outstanding".localized(), MoneyFormatter.format(total),
                                          color: Parts.outstandingColor, bold: true, divider: false))

        Parts.layout([title, body, list, Parts.closeButton(target: self, action: #selector(doneTapped))], in: self)
    }

    /// #496: a row that opens "Chưa lấy đồ" when the overview gave a target
    private func opening(_ row: UIView) -> UIView {
        guard onOpenOrders != nil else { return row }
        row.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(rowTapped)))
        row.accessibilityTraits = UIAccessibilityTraitButton
        return row
    }

    @objc private func rowTapped() {
        let open = onOpenOrders
        dismiss(animated: true) { open?() }
    }

    @objc private func doneTapped() { dismiss(animated: true) }
}

/// "Khoảng thời gian" sheet: six presets with their dates, then "Chọn khoảng ngày…"
final class OverviewPeriodSheet: UIViewController {
    var onSelect: ((OverviewPeriod) -> Void)?
    var onCustom: (() -> Void)?
    private let selected: OverviewPeriod
    private let todayKey: String

    init(selected: OverviewPeriod, todayKey: String) {
        self.selected = selected
        self.todayKey = todayKey
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface
        let title = V2.label("overview.v2.period.title".localized(), size: 18, weight: .bold)
        let close = UIButton(type: .system)
        close.setImage(DS.symbol("xmark", DS.Icon.md), for: .normal)
        close.tintColor = DS.Color.textMuted
        close.accessibilityLabel = "Close".localized()
        close.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        close.snp.makeConstraints { make in make.width.height.equalTo(DS.touchTarget) }
        let header = UIStackView(arrangedSubviews: [title, UIView(), close])
        header.alignment = .center

        let list = UIStackView()
        list.axis = .vertical
        list.addArrangedSubview(V2.divider())
        for (index, preset) in OverviewPreset.allCases.enumerated() {
            let range = OverviewLogic.range(of: preset, todayKey: todayKey)
            let dates = range.dayCount == 1 ? OverviewLogic.longRange(range) : OverviewLogic.shortRange(range)
            let row = PeriodRow(title: preset.title, subtitle: dates, checked: selected == .preset(preset))
            row.tag = index
            row.addTarget(self, action: #selector(presetTapped(_:)), for: .touchUpInside)
            list.addArrangedSubview(row)
            list.addArrangedSubview(V2.divider())
        }
        let custom = UIButton(type: .system)
        custom.setTitle("overview.v2.period.custom".localized(), for: .normal)
        custom.setImage(DS.symbol("calendar", DS.Icon.md), for: .normal)
        custom.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        custom.tintColor = DS.Color.primary
        custom.contentHorizontalAlignment = .leading
        custom.titleEdgeInsets = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: -12)
        custom.addTarget(self, action: #selector(customTapped), for: .touchUpInside)
        custom.snp.makeConstraints { make in make.height.equalTo(52) }
        if case .custom(let range) = selected {
            custom.setTitle("\("overview.v2.period.custom".localized())  \(OverviewLogic.shortRange(range))", for: .normal)
        }
        list.addArrangedSubview(custom)

        view.addSubview(header)
        view.addSubview(list)
        header.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(DS.Spacing.lg)
            make.leading.equalToSuperview().offset(20)
            make.trailing.equalToSuperview().offset(-8)
        }
        list.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom).offset(DS.Spacing.sm)
            make.leading.trailing.equalToSuperview()
        }
        custom.snp.makeConstraints { make in make.leading.equalToSuperview().offset(20) }
    }

    @objc private func closeTapped() { dismiss(animated: true) }

    @objc private func presetTapped(_ sender: UIControl) {
        let preset = OverviewPreset.allCases[sender.tag]
        dismiss(animated: true) { [onSelect] in onSelect?(.preset(preset)) }
    }

    @objc private func customTapped() {
        dismiss(animated: true) { [onCustom] in onCustom?() }
    }

    private final class PeriodRow: UIControl {
        init(title: String, subtitle: String, checked: Bool) {
            super.init(frame: .zero)
            let titleLabel = V2.label(title, size: checked ? DS.TextSize.name : DS.TextSize.body, weight: checked ? .bold : .regular)
            let subtitleLabel = V2.label(subtitle, size: DS.TextSize.secondary, color: DS.Color.textMuted)
            let texts = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
            texts.axis = .vertical
            texts.isUserInteractionEnabled = false
            let radio = UIView()
            radio.layer.cornerRadius = 11
            radio.layer.borderWidth = checked ? 7 : 2
            radio.layer.borderColor = (checked ? DS.Color.primary : V2.border).cgColor
            radio.isUserInteractionEnabled = false
            addSubview(texts)
            addSubview(radio)
            texts.snp.makeConstraints { make in
                make.leading.equalToSuperview().offset(20)
                make.top.bottom.equalToSuperview().inset(7)
            }
            radio.snp.makeConstraints { make in
                make.trailing.equalToSuperview().offset(-20)
                make.centerY.equalToSuperview()
                make.width.height.equalTo(22)
                make.leading.greaterThanOrEqualTo(texts.snp.trailing).offset(DS.Spacing.md)
            }
            snp.makeConstraints { make in make.height.greaterThanOrEqualTo(52) }
            isAccessibilityElement = true
            accessibilityLabel = "\(title), \(subtitle)"
            accessibilityTraits = checked ? UIAccessibilityTraitButton | UIAccessibilityTraitSelected : UIAccessibilityTraitButton
        }

        required init?(coder: NSCoder) {
            fatalError("init(coder:) has not been implemented")
        }
    }
}
