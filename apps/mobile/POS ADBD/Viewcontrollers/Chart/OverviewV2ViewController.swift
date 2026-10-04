//
//  OverviewV2ViewController.swift
//  POS ADBD
//
//  Redesigned overview tab (#374, boards Tong-quan, Tong-quan-chon), shown when `newOverview` is on: one period
//  (sheet), net money with per-day bars and the change against the previous period, order figures, top rented.
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
        let title = V2.label("overview.v2.title".localized(), size: 24, weight: .bold)

        periodButton.titleLabel?.font = Utils.boldFont(size: 14)
        periodButton.setTitleColor(DS.Color.text, for: .normal)
        periodButton.setImage(UIImage(systemName: "chevron.down", withConfiguration: UIImage.SymbolConfiguration(pointSize: 12, weight: .semibold)), for: .normal)
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

        var stats: [(String, String, UIColor)] = []
        if showsRevenue, let newOrders = report?.newOrders {
            stats.append(("overview.v2.newOrders".localized(), "\(newOrders)", DS.Color.text))
        }
        if let rentedOut = now?.rentedOut {
            stats.append(("overview.v2.rentedOut".localized(), "\(rentedOut)", DS.Color.text))
        }
        if showsOperations, let now {
            stats.append(("overview.v2.lateReturns".localized(), "\(now.lateReturns)", now.lateReturns > 0 ? V2.danger : DS.Color.text))
        }
        if let held = now?.collateralHeld {
            stats.append(("overview.v2.collateralHeld".localized(), MoneyFormatter.format(held), DS.Color.text))
        }
        if !stats.isEmpty {
            contentStack.addArrangedSubview(V2.sectionHeader("overview.v2.orders".localized()))
            stats.forEach { contentStack.addArrangedSubview(statRow($0.0, value: $0.1, color: $0.2)) }
        }

        if showsRevenue, let top = report?.topProducts, !top.isEmpty {
            contentStack.addArrangedSubview(V2.sectionHeader("overview.v2.topRented".localized()))
            top.forEach { contentStack.addArrangedSubview(topRow($0)) }
        }
        if !showsRevenue && !showsOperations {
            let label = V2.label("overview.v2.noAccess".localized(), size: 15, color: DS.Color.textMuted, lines: 0)
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
        let caption = V2.label("\("overview.v2.netRevenue".localized()) · \(OverviewLogic.longRange(range))",
                               size: 13, color: DS.Color.textMuted, lines: 0)
        let amount = V2.label(size: 30, weight: .bold)
        let change = V2.label(size: 13, color: DS.Color.textMuted, lines: 0)
        let stack = UIStackView(arrangedSubviews: [caption, amount, change])
        stack.axis = .vertical
        stack.spacing = 2

        if let report {
            amount.text = MoneyFormatter.format(report.netRevenue)
            let previous = OverviewLogic.shortRange(OverviewLogic.previous(range))
            let cancelled = "overview.v2.excludesCancelled".localized()
            if let growth = report.revenueGrowth {
                change.text = "\(OverviewLogic.changeText(growth)) \(String(format: "overview.v2.vsPrevious".localized(), previous)) · \(cancelled)"
                change.textColor = growth > 0.05 ? V2.ok : (growth < -0.05 ? V2.danger : DS.Color.textMuted)
            } else {
                change.text = cancelled
            }
            let bars = OverviewBarsView()
            bars.configure(OverviewLogic.bars(report: report, range: range))
            stack.setCustomSpacing(DS.Spacing.md, after: change)
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
        return padded(stack)
    }

    private func statRow(_ label: String, value: String, color: UIColor) -> UIView {
        let title = V2.label(label, size: 15)
        let number = V2.label(value, size: 16, weight: .bold, color: color)
        number.textAlignment = .right
        let row = UIStackView(arrangedSubviews: [title, number])
        row.alignment = .center
        let wrapper = UIView()
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
        let name = V2.label(product.name, size: 15, weight: .medium)
        let times = V2.label(String(format: "overview.v2.rentals".localized(), product.rentalCount), size: 13, color: DS.Color.textMuted)
        let texts = UIStackView(arrangedSubviews: [name, times])
        texts.axis = .vertical
        let revenue = V2.label(MoneyFormatter.format(product.totalRevenue), size: 15, weight: .bold)
        revenue.setContentCompressionResistancePriority(.required, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [thumb, texts, revenue])
        row.spacing = DS.Spacing.md
        row.alignment = .center
        let wrapper = UIView()
        wrapper.addSubview(row)
        row.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 8, left: DS.Spacing.lg, bottom: 8, right: DS.Spacing.lg))
        }
        let line = V2.divider()
        wrapper.addSubview(line)
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        return wrapper
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

/// Bars with a label under each (the last one highlighted)
final class OverviewBarsView: UIView {
    func configure(_ bars: [OverviewBar]) {
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
            let label = V2.label(index % labelEvery == 0 || isLast ? bar.label : "", size: 11,
                                 weight: isLast ? .bold : .regular, color: isLast ? DS.Color.text : DS.Color.textMuted)
            label.textAlignment = .center
            label.adjustsFontSizeToFitWidth = true
            label.minimumScaleFactor = 0.7
            column.addSubview(fill)
            column.addSubview(label)
            label.snp.makeConstraints { make in
                make.leading.trailing.bottom.equalToSuperview()
                make.height.equalTo(14)
            }
            fill.snp.makeConstraints { make in
                make.leading.trailing.equalToSuperview()
                make.bottom.equalTo(label.snp.top).offset(-6)
                let ratio = max(ratios[index], 0.02)
                make.height.equalTo(column.snp.height).multipliedBy(ratio).offset(-20 * ratio)
            }
            column.isAccessibilityElement = true
            column.accessibilityLabel = "\(bar.label): \(MoneyFormatter.format(bar.value))"
            columns.addArrangedSubview(column)
        }
        // Columns wider than the labels need room: let labels overflow into neighbours
        addSubview(columns)
        columns.snp.makeConstraints { make in make.edges.equalToSuperview() }
        accessibilityLabel = "overview.v2.bars".localized()
    }
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
        close.setImage(UIImage(systemName: "xmark"), for: .normal)
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
        custom.setImage(UIImage(systemName: "calendar"), for: .normal)
        custom.titleLabel?.font = Utils.boldFont(size: 15)
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
            let titleLabel = V2.label(title, size: 15, weight: checked ? .bold : .regular)
            let subtitleLabel = V2.label(subtitle, size: 13, color: DS.Color.textMuted)
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
