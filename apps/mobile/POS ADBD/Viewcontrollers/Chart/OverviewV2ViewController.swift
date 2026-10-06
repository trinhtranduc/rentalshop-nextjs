//
//  OverviewV2ViewController.swift
//  POS ADBD
//
//  Redesigned overview tab (#374, boards Tong-quan, Tong-quan-chon), shown when `newOverview` is on: one period
//  (sheet), net money with per-day bars and the change against the previous period, order figures, top rented.
//  #484: "Tiền đã thu" with an explanation sheet, Tổng giá trị đơn / Còn phải thu tiles, a Tiền thu | Số đơn chart
//  toggle, and the rented-out figures open the grouped rented-out list.
//  #492: "Thực thu" with a "Chi tiết" link to the breakdown sheet, Cọc khi tạo đơn / Thế chân đang giữ tiles
//  (collateral held moves from the ĐƠN rows into its tile).
//

import UIKit
import SnapKit
import Kingfisher
import Alamofire

final class OverviewV2ViewController: BaseViewControler {
    private var period: OverviewPeriod = .preset(.last7)
    private var report: OverviewReport?
    private var now: OverviewNow?
    private var reportFailed: String?
    private var chartMode: OverviewChartMode = .money
    private var generation = 0
    private var requests: [DataRequest] = []

    private let scrollView = UIScrollView()
    private let contentStack = UIStackView()
    private let periodButton = UIButton(type: .system)
    private let refresh = UIRefreshControl()

    private var permissions: [String] { User.current()?.permissions ?? User.account()?.permissions ?? [] }
    private var showsRevenue: Bool { OverviewLogic.showsRevenue(permissions: permissions) }
    private var showsOperations: Bool { OverviewLogic.showsOperations(permissions: permissions) }
    private var todayKey: String { DayFormatter.key(Date()) }
    private var range: DayKeyRange { OverviewLogic.range(of: period, todayKey: todayKey) }

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
        let title = V2.label("overview.v2.title".localized(), size: DS.TextSize.title, weight: .bold)

        periodButton.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        periodButton.setTitleColor(DS.Color.text, for: .normal)
        periodButton.setImage(DS.symbol("chevron.down", 16, weight: .semibold), for: .normal)
        periodButton.tintColor = DS.Color.textMuted
        periodButton.semanticContentAttribute = .forceRightToLeft
        periodButton.imageEdgeInsets = UIEdgeInsets(top: 0, left: 6, bottom: 0, right: -6)
        periodButton.contentEdgeInsets = UIEdgeInsets(top: 0, left: 14, bottom: 0, right: 18)
        periodButton.layer.cornerRadius = 20
        periodButton.layer.borderWidth = 1
        periodButton.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        periodButton.addTarget(self, action: #selector(openPeriods), for: .touchUpInside)
        periodButton.snp.makeConstraints { make in make.height.equalTo(DS.touchTarget) }
        periodButton.isHidden = !showsRevenue

        let header = UIStackView(arrangedSubviews: [title, UIView(), periodButton])
        header.alignment = .center
        view.addSubview(header)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(DS.Spacing.md)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }

        contentStack.axis = .vertical
        scrollView.alwaysBounceVertical = true
        scrollView.refreshControl = refresh
        refresh.addTarget(self, action: #selector(pulled), for: .valueChanged)
        view.addSubview(scrollView)
        scrollView.addSubview(contentStack)
        scrollView.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom).offset(DS.Spacing.md)
            make.leading.trailing.bottom.equalToSuperview()
        }
        contentStack.snp.makeConstraints { make in
            make.edges.equalTo(scrollView.contentLayoutGuide)
            make.width.equalTo(scrollView.frameLayoutGuide)
        }
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
        report = nil
        reportFailed = nil
        render()

        let group = DispatchGroup()
        var newReport: OverviewReport?
        var newNow: OverviewNow?
        var failure: NSError?
        if showsRevenue {
            group.enter()
            requests.append(TabsV2APIService.shared.overviewReport(range) { report, error in
                newReport = report
                failure = error
                group.leave()
            })
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
            self.report = newReport
            if let newNow { self.now = newNow }
            if self.showsRevenue, newReport == nil {
                self.reportFailed = failure?.localizedDescription ?? ""
            }
            self.render()
        }
    }

    // MARK: - Render

    private func render() {
        let title = periodTitle(period)
        periodButton.setTitle(title, for: .normal)
        periodButton.accessibilityLabel = String(format: "overview.v2.period.accessibility".localized(), title)
        contentStack.arrangedSubviews.forEach { $0.removeFromSuperview() }

        if showsRevenue {
            contentStack.addArrangedSubview(band())
            contentStack.addArrangedSubview(revenueSection())
        }

        // #388: each figure opens its list
        var stats: [(String, String, UIColor, OverviewRankingOrdersFilter?)] = []
        if showsRevenue, let newOrders = report?.newOrders {
            let title = "overview.v2.newOrders".localized()
            stats.append((title, "\(newOrders)", DS.Color.text, .snapshot(.newOrders, title: title)))
        }
        if let rentedOut = now?.rentedOut {
            let title = "overview.v2.rentedOut".localized()
            stats.append((title, "\(rentedOut)", DS.Color.text, .rentedOut(title: title)))
        }
        if showsOperations, let now {
            let title = "overview.v2.lateReturns".localized()
            stats.append((title, "\(now.lateReturns)", now.lateReturns > 0 ? V2.danger : DS.Color.text, .lateReturns(title: title)))
        }
        if !stats.isEmpty {
            contentStack.addArrangedSubview(V2.sectionHeader("overview.v2.orders".localized()))
            stats.forEach { contentStack.addArrangedSubview(statRow($0.0, value: $0.1, color: $0.2, opens: $0.3)) }
        }

        if showsRevenue, let top = report?.topProducts, !top.isEmpty {
            contentStack.addArrangedSubview(V2.sectionHeader("overview.v2.topRentedByValue".localized()))
            top.forEach { contentStack.addArrangedSubview(topRow($0)) }
        }
        if !showsRevenue && !showsOperations {
            let label = V2.label("overview.v2.noAccess".localized(), size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
            label.textAlignment = .center
            contentStack.addArrangedSubview(padded(label, top: 40))
        }
        contentStack.addArrangedSubview(UIView.v2Spacer(height: DS.Spacing.xl))
    }

    private func periodTitle(_ period: OverviewPeriod) -> String {
        switch period {
        case .preset(let preset): return preset.title
        case .custom(let range): return OverviewLogic.shortRange(range)
        }
    }

    private func band() -> UIView {
        let view = UIView()
        view.backgroundColor = DS.Color.background
        view.snp.makeConstraints { make in make.height.equalTo(8) }
        return view
    }

    private func padded(_ content: UIView, top: CGFloat = 14, bottom: CGFloat = 16) -> UIView {
        let wrapper = UIView()
        wrapper.addSubview(content)
        content.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(top)
            make.bottom.equalToSuperview().offset(-bottom)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
        return wrapper
    }

    private func revenueSection() -> UIView {
        let range = self.range
        let caption = V2.label("\("overview.v2.collected".localized()) · \(OverviewLogic.longRange(range))",
                               size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
        let amount = V2.label(size: 30, weight: .bold)
        amount.adjustsFontSizeToFitWidth = true
        amount.minimumScaleFactor = 0.6
        amount.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        // #492: "Chi tiết ›" on the amount row; the amount opens the same sheet
        let details = UIButton(type: .system)
        details.setTitle("overview.v2.details".localized(), for: .normal)
        details.setTitleColor(DS.Color.primary, for: .normal)
        details.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        details.setImage(DS.symbol("chevron.right", 14, weight: .semibold), for: .normal)
        details.tintColor = DS.Color.primary
        details.semanticContentAttribute = .forceRightToLeft
        details.imageEdgeInsets = UIEdgeInsets(top: 0, left: 4, bottom: 0, right: -4)
        details.contentEdgeInsets = UIEdgeInsets(top: 0, left: 8, bottom: 0, right: 4)
        details.addTarget(self, action: #selector(openCollectedDetails), for: .touchUpInside)
        details.setContentHuggingPriority(.required, for: .horizontal)
        details.setContentCompressionResistancePriority(.required, for: .horizontal)
        details.snp.makeConstraints { make in
            make.height.greaterThanOrEqualTo(DS.touchTarget)
            make.width.greaterThanOrEqualTo(DS.touchTarget)
        }
        // Added once the figures are in (a hidden arranged view would fight its 44pt minimum)
        let amountRow = UIStackView(arrangedSubviews: [amount])
        amountRow.alignment = .center
        amountRow.spacing = DS.Spacing.sm
        let change = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
        let stack = UIStackView(arrangedSubviews: [caption, amountRow, change])
        stack.axis = .vertical
        stack.spacing = DS.Gap.lineTight
        stack.setCustomSpacing(0, after: caption)
        stack.setCustomSpacing(0, after: amountRow)

        if let report {
            amount.text = MoneyFormatter.format(report.netRevenue)
            amount.isUserInteractionEnabled = true
            amount.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(openCollectedDetails)))
            amountRow.addArrangedSubview(details)
            details.accessibilityLabel = "\("overview.v2.details".localized()), \("overview.v2.collected".localized())"
            let previous = OverviewLogic.shortRange(OverviewLogic.previous(range))
            let cancelled = "overview.v2.excludesCancelled".localized()
            if let growth = report.revenueGrowth {
                change.text = "\(OverviewLogic.changeText(growth)) \(String(format: "overview.v2.vsPrevious".localized(), previous)) · \(cancelled)"
                change.textColor = growth > 0.05 ? V2.ok : (growth < -0.05 ? V2.danger : DS.Color.textMuted)
            } else {
                change.text = cancelled
            }
            stack.setCustomSpacing(DS.Spacing.md, after: change)
            if let tiles = moneyTiles(report) {
                stack.addArrangedSubview(tiles)
                stack.setCustomSpacing(DS.Spacing.md, after: tiles)
            }
            // "Số đơn" needs `series[].newOrderCount`; an older API sends none, so only money is charted
            let hasOrderCounts = report.series.contains { $0.newOrderCount != nil }
            if !hasOrderCounts { chartMode = .money }
            if hasOrderCounts {
                let toggle = V2Segmented(titles: ["overview.v2.chart.money".localized(), "overview.v2.chart.orders".localized()])
                toggle.select(chartMode == .money ? 0 : 1)
                toggle.addTarget(self, action: #selector(chartModeChanged(_:)), for: .valueChanged)
                let toggleRow = UIStackView(arrangedSubviews: [toggle, UIView()])
                stack.addArrangedSubview(toggleRow)
                stack.setCustomSpacing(DS.Spacing.md, after: toggleRow)
            }
            let bars = OverviewBarsView()
            bars.configure(OverviewLogic.bars(report: report, range: range, mode: chartMode), mode: chartMode)
            stack.addArrangedSubview(bars)
            bars.snp.makeConstraints { make in make.height.equalTo(110) }
        } else if let failed = reportFailed {
            amount.text = "—"
            change.text = (failed.isEmpty ? "Something went wrong".localized() : failed) + " · " + "Retry".localized()
            change.textColor = V2.danger
            change.isUserInteractionEnabled = true
            change.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(pulled)))
        } else {
            amount.text = " "
            let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)
            spinner.startAnimating()
            stack.addArrangedSubview(spinner)
            spinner.snp.makeConstraints { make in make.height.equalTo(110) }
        }
        return padded(stack, top: 2)
    }

    /// 2×2 tiles (#492): Cọc khi tạo đơn, Thế chân đang giữ (now, from outlet-operations), Tổng giá trị đơn,
    /// Còn phải thu, each only when the API sent its figure; nil when it sent none
    private func moneyTiles(_ report: OverviewReport) -> UIView? {
        var tiles: [UIView] = []
        if let breakdown = report.collectedBreakdown {
            tiles.append(moneyTile("overview.v2.depositsAtOrder".localized(), MoneyFormatter.format(breakdown.deposits),
                                   color: DS.Color.text))
        }
        if let held = now?.collateralHeld {
            let tile = moneyTile("overview.v2.collateralHeld".localized(), MoneyFormatter.format(held),
                                 color: DS.Color.text, note: "overview.v2.collateralHeldNote".localized())
            // The collateral is held by the orders out now: the same list as Đang cho thuê
            tile.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(openRentedOut)))
            tile.accessibilityTraits = UIAccessibilityTraitButton
            tiles.append(tile)
        }
        if let total = report.totalOrderValue {
            tiles.append(moneyTile("overview.v2.totalOrderValue".localized(), MoneyFormatter.format(total), color: DS.Color.text))
        }
        if let outstanding = report.outstanding {
            tiles.append(moneyTile("overview.v2.outstanding".localized(), MoneyFormatter.format(outstanding),
                                   color: UIColor(hexString: "B45309")))
        }
        guard !tiles.isEmpty else { return nil }
        let grid = UIStackView()
        grid.axis = .vertical
        grid.spacing = DS.Spacing.sm
        var index = 0
        while index < tiles.count {
            let pair = Array(tiles[index..<min(index + 2, tiles.count)])
            let row = UIStackView(arrangedSubviews: pair.count == 2 ? pair : pair + [UIView()])
            row.distribution = .fillEqually
            row.alignment = .fill
            row.spacing = DS.Spacing.sm
            grid.addArrangedSubview(row)
            index += 2
        }
        return grid
    }

    private func moneyTile(_ title: String, _ value: String, color: UIColor, note: String? = nil) -> UIView {
        let box = UIView()
        box.backgroundColor = V2.sectionFill
        box.layer.cornerRadius = DS.Radius.card
        let titleLabel = V2.label(title, size: DS.TextSize.secondary, color: DS.Color.textMuted)
        titleLabel.adjustsFontSizeToFitWidth = true
        titleLabel.minimumScaleFactor = 0.8
        let valueLabel = V2.label(value, size: DS.TextSize.name, weight: .bold, color: color)
        valueLabel.font = UIFont.monospacedDigitSystemFont(ofSize: DS.TextSize.name, weight: .bold)
        valueLabel.adjustsFontSizeToFitWidth = true
        valueLabel.minimumScaleFactor = 0.6
        let column = UIStackView(arrangedSubviews: [titleLabel, valueLabel])
        column.axis = .vertical
        column.spacing = 2
        if let note {
            column.addArrangedSubview(V2.label(note, size: DS.TextSize.pill, color: DS.Color.textMuted, lines: 0))
        }
        box.addSubview(column)
        // Top-aligned: a tile next to a taller one (with a note) keeps its text at the top
        column.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(10)
            make.leading.trailing.equalToSuperview().inset(12)
            make.bottom.lessThanOrEqualToSuperview().offset(-10)
            make.bottom.equalToSuperview().offset(-10).priority(.low)
        }
        box.isAccessibilityElement = true
        box.accessibilityLabel = [title, value, note].compactMap { $0 }.joined(separator: ", ")
        return box
    }

    @objc private func chartModeChanged(_ sender: V2Segmented) {
        chartMode = sender.selectedIndex == 1 ? .orders : .money
        render()
    }

    @objc private func openRentedOut() {
        let list = RentedOutOrdersViewController(startsAtLate: false)
        list.hidesBottomBarWhenPushed = true
        navigationController?.pushViewController(list, animated: true)
    }

    @objc private func openCollectedDetails() {
        guard let report else { return }
        let sheet = OverviewCollectedDetailsSheet(report: report, periodTitle: periodTitle(period),
                                                  collateralHeld: now?.collateralHeld)
        sheet.modalPresentationStyle = .pageSheet
        if let controller = sheet.sheetPresentationController {
            controller.detents = [.medium(), .large()]
            controller.prefersGrabberVisible = true
            controller.preferredCornerRadius = DS.Radius.sheet
        }
        present(sheet, animated: true)
    }

    private func statRow(_ label: String, value: String, color: UIColor, opens filter: OverviewRankingOrdersFilter?) -> UIView {
        let title = V2.label(label, size: DS.TextSize.body)
        let number = V2.label(value, size: DS.TextSize.name, weight: .bold, color: color)
        number.textAlignment = .right
        let row = UIStackView(arrangedSubviews: [title, number])
        row.alignment = .center
        row.spacing = DS.Spacing.md
        row.isUserInteractionEnabled = false
        let wrapper = OverviewLinkRow()
        if let filter {
            row.addArrangedSubview(chevron())
            wrapper.filter = filter
            wrapper.addTarget(self, action: #selector(linkTapped(_:)), for: .touchUpInside)
            wrapper.accessibilityTraits = UIAccessibilityTraitButton
        }
        wrapper.addSubview(row)
        row.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.top.bottom.equalToSuperview()
            make.height.greaterThanOrEqualTo(48)
        }
        let line = V2.divider()
        wrapper.addSubview(line)
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        wrapper.isAccessibilityElement = true
        wrapper.accessibilityLabel = "\(label): \(value)"
        return wrapper
    }

    private func topRow(_ product: OverviewReport.TopProduct) -> UIView {
        let thumb = UIImageView()
        thumb.backgroundColor = V2.chipFill
        thumb.layer.cornerRadius = 10
        thumb.layer.borderWidth = 1
        thumb.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        thumb.clipsToBounds = true
        thumb.tintColor = DS.Color.textMuted
        thumb.snp.makeConstraints { make in make.width.height.equalTo(44) }
        if let image = product.image, let url = URL(string: image) {
            thumb.contentMode = .scaleAspectFill
            thumb.kf.setImage(with: url, placeholder: UIImage(systemName: "tshirt"))
        } else {
            thumb.contentMode = .center
            thumb.image = UIImage(systemName: "tshirt")
        }
        let name = V2.label(product.name, size: DS.TextSize.body, weight: .medium)
        let times = V2.label(String(format: "overview.v2.rentals".localized(), product.rentalCount), size: DS.TextSize.secondary, color: DS.Color.textMuted)
        let texts = UIStackView(arrangedSubviews: [name, times])
        texts.axis = .vertical
        texts.setContentHuggingPriority(.defaultLow, for: .horizontal)
        let revenue = V2.label(MoneyFormatter.format(product.totalRevenue), size: DS.TextSize.name, weight: .bold)
        revenue.textAlignment = .right
        revenue.setContentHuggingPriority(.required, for: .horizontal)
        revenue.setContentCompressionResistancePriority(.required, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [thumb, texts, revenue])
        row.spacing = DS.Spacing.md
        row.alignment = .center
        row.isUserInteractionEnabled = false
        let wrapper = OverviewLinkRow()
        if let id = product.id {
            wrapper.filter = .product(id: id, name: product.name)
            wrapper.addTarget(self, action: #selector(linkTapped(_:)), for: .touchUpInside)
            wrapper.isAccessibilityElement = true
            wrapper.accessibilityTraits = UIAccessibilityTraitButton
            wrapper.accessibilityLabel = [product.name, times.text, revenue.text].compactMap { $0 }.joined(separator: ", ")
        }
        wrapper.addSubview(row)
        row.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 8, left: DS.Spacing.lg, bottom: 8, right: DS.Spacing.lg))
        }
        let line = V2.divider()
        wrapper.addSubview(line)
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        return wrapper
    }

    private func chevron() -> UIView {
        let image = UIImageView(image: DS.symbol("chevron.right", 14, weight: .semibold))
        image.tintColor = UIColor(hexString: "94A3B8")
        image.setContentHuggingPriority(.required, for: .horizontal)
        return image
    }

    /// The same period as the figures for Đơn mới and a top product; "now" for the others
    @objc private func linkTapped(_ sender: OverviewLinkRow) {
        guard let filter = sender.filter else { return }
        // #484: rented out, late returns and collateral open the grouped rented-out list (late group first)
        switch filter {
        case .rentedOut, .lateReturns:
            var startsAtLate = false
            if case .lateReturns = filter { startsAtLate = true }
            let list = RentedOutOrdersViewController(startsAtLate: startsAtLate)
            list.hidesBottomBarWhenPushed = true
            navigationController?.pushViewController(list, animated: true)
            return
        default:
            break
        }
        let range = self.range
        let dated: Bool
        switch filter {
        case .snapshot, .product: dated = true
        default: dated = false
        }
        let list = OverviewRankingOrdersViewController(
            filter: filter,
            startDate: dated ? OverviewLogic.date(of: range.start) : nil,
            endDate: dated ? OverviewLogic.date(of: range.end) : nil,
            periodSubtitle: dated ? OverviewLogic.longRange(range) : DayFormatter.short(Date())
        )
        list.hidesBottomBarWhenPushed = true
        navigationController?.pushViewController(list, animated: true)
    }

    // MARK: - Period sheet

    @objc private func openPeriods() {
        let sheet = OverviewPeriodSheet(selected: period, todayKey: todayKey)
        sheet.onSelect = { [weak self] period in
            guard let self else { return }
            self.period = period
            self.load()
        }
        sheet.onCustom = { [weak self] in self?.pickCustomRange() }
        sheet.modalPresentationStyle = .pageSheet
        if let controller = sheet.sheetPresentationController {
            controller.detents = [.medium(), .large()]
            controller.prefersGrabberVisible = true
        }
        present(sheet, animated: true)
    }

    private func pickCustomRange() {
        let picker = DatePickerViewController.instance()
        picker.delegate = self
        let current = range
        picker.configureForDateRange(startDate: OverviewLogic.date(of: current.start), endDate: OverviewLogic.date(of: current.end),
                                     minimumDate: Calendar.current.date(byAdding: .year, value: -10, to: Date()),
                                     maximumDate: Date())
        present(picker, animated: true)
    }
}

extension OverviewV2ViewController: DatePickerViewControllerDelegate {
    func didSelectDate(_ date: Date, sender: DatePickerViewController) {
        let key = DayFormatter.key(date)
        period = .custom(DayKeyRange(start: key, end: key))
        load()
    }

    func didSelectDateRange(start: Date, end: Date, sender: DatePickerViewController) {
        let keys = [DayFormatter.key(start), DayFormatter.key(end)].sorted()
        period = .custom(DayKeyRange(start: keys[0], end: keys[1]))
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

    override var isHighlighted: Bool {
        didSet { backgroundColor = isHighlighted && filter != nil ? V2.chipFill : .clear }
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
final class OverviewCollectedDetailsSheet: UIViewController {
    private let report: OverviewReport
    private let periodTitle: String
    private let collateralHeld: Double?

    init(report: OverviewReport, periodTitle: String, collateralHeld: Double?) {
        self.report = report
        self.periodTitle = periodTitle
        self.collateralHeld = collateralHeld
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface

        let title = V2.label("\("overview.v2.collected".localized()) · \(periodTitle)", size: 18, weight: .bold, lines: 0)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        let body = V2.label("overview.v2.detail.body".localized(), size: DS.TextSize.body,
                            color: UIColor(hexString: "334155"), lines: 0)

        let list = UIStackView()
        list.axis = .vertical
        if let parts = report.collectedBreakdown {
            list.addArrangedSubview(Self.row("overview.v2.depositsAtOrder".localized(), "+" + MoneyFormatter.format(parts.deposits)))
            list.addArrangedSubview(Self.row("overview.v2.detail.pickupAndSale".localized(), "+" + MoneyFormatter.format(parts.pickupAndSale)))
            list.addArrangedSubview(Self.row("overview.v2.detail.fees".localized(), "+" + MoneyFormatter.format(parts.fees)))
            if parts.refunds > 0 {
                list.addArrangedSubview(Self.row("overview.v2.detail.refunds".localized(), "−" + MoneyFormatter.format(parts.refunds),
                                                 color: UIColor(hexString: "B45309")))
            }
        }
        list.addArrangedSubview(Self.row("overview.v2.collected".localized(), MoneyFormatter.format(report.netRevenue),
                                         bold: true, divider: false))

        var views: [UIView] = [title, body, list]
        if let box = collateralBox() { views.append(box) }

        let note = V2.label("overview.v2.detail.note".localized(), size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
        let noteBox = UIView()
        noteBox.backgroundColor = V2.sectionFill
        noteBox.layer.cornerRadius = DS.Radius.card
        noteBox.addSubview(note)
        note.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12)) }
        views.append(noteBox)

        let done = UIButton(type: .system)
        done.setTitle("overview.v2.detail.close".localized(), for: .normal)
        done.setTitleColor(.white, for: .normal)
        done.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        done.backgroundColor = DS.Color.text
        done.layer.cornerRadius = DS.Radius.card
        done.addTarget(self, action: #selector(doneTapped), for: .touchUpInside)
        done.snp.makeConstraints { make in make.height.equalTo(48) }
        views.append(done)

        let stack = UIStackView(arrangedSubviews: views)
        stack.axis = .vertical
        stack.spacing = DS.Spacing.md
        stack.setCustomSpacing(DS.Spacing.md + 4, after: noteBox)

        let scroll = UIScrollView()
        scroll.alwaysBounceVertical = false
        view.addSubview(scroll)
        scroll.addSubview(stack)
        scroll.snp.makeConstraints { make in make.edges.equalTo(view.safeAreaLayoutGuide) }
        stack.snp.makeConstraints { make in
            make.top.equalTo(scroll.contentLayoutGuide).offset(DS.Spacing.xl)
            make.bottom.equalTo(scroll.contentLayoutGuide).offset(-DS.Spacing.lg)
            make.leading.trailing.equalTo(scroll.frameLayoutGuide).inset(20)
        }
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

    /// Name on the left, amount right-aligned with tabular digits
    private static func row(_ name: String, _ value: String, color: UIColor = DS.Color.text, bold: Bool = false,
                            divider: Bool = true, vertical: CGFloat = 10) -> UIView {
        let nameLabel = V2.label(name, size: DS.TextSize.body, weight: bold ? .bold : .regular, lines: 0)
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
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: vertical, left: 0, bottom: vertical, right: 0))
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
