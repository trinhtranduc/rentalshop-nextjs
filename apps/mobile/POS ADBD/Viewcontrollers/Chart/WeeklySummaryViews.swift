//
//  WeeklySummaryViews.swift
//  POS ADBD
//
//  #1612 AI summary of last week on Tổng quan (mockup variant D): the floating "✦ Tóm tắt tuần" button with its red
//  dot, and the sheet it opens (loading, the three groups, no orders, error with Retry). Rules in `WeeklySummaryLogic`.
//

import UIKit
import SnapKit
import Alamofire

/// Colours of the mockup that `OVColor` has no token for (light / dark)
private enum WSColor {
    private static func dynamic(_ light: String, _ dark: String) -> UIColor {
        let l = UIColor(hexString: light)
        let d = UIColor(hexString: dark)
        return UIColor { $0.userInterfaceStyle == .dark ? d : l }
    }

    /// The app's primary blue (button, numbered circles, top bar)
    static let primary = dynamic("1D4ED8", "2563EB")
    /// Soft blue of the summary box and the "AI" tag
    static let soft = dynamic("EFF6FF", "172554")
    /// "✦" and the "AI" tag text
    static let ai = dynamic("1D4ED8", "60A5FA")
    /// Grey of the figure tiles and branch rows
    static let band = dynamic("F1F5F9", "1E293B")
    static let good = dynamic("047857", "6EE7B7")
    static let bad = dynamic("B91C1C", "FCA5A5")
    /// The other days' bars
    static let barLight = dynamic("BFDBFE", "1E3A8A")
    static let dot = UIColor(hexString: "EF4444")
}

// MARK: - Button

/// "✦ Tóm tắt tuần": small blue pill at the end of the Tổng quan title row (#1618, was floating bottom right);
/// red dot while last week's summary is unopened
final class WeeklySummaryButton: UIControl {
    private let dot = UIView()
    private let sparkle = OVFont.label("✦", DS.TextSize.secondary, .bold, color: .white)
    private static let twinkleKey = "weeklySummary.twinkle"

    var showsDot = false {
        didSet {
            dot.isHidden = !showsDot
            accessibilityValue = showsDot ? "weeklySummary.unread".localized() : nil
        }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = WSColor.primary

        let title = OVFont.label("weeklySummary.title".localized(), DS.TextSize.secondary, .bold, color: .white)
        // The pill keeps its whole text; the title row gives way elsewhere (#1618)
        for label in [sparkle, title] {
            label.setContentCompressionResistancePriority(.required, for: .horizontal)
            label.setContentHuggingPriority(.required, for: .horizontal)
        }
        let row = UIStackView(arrangedSubviews: [sparkle, title])
        row.spacing = 5
        row.alignment = .center
        row.isUserInteractionEnabled = false
        addSubview(row)
        row.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 7, left: 12, bottom: 7, right: 12))
        }
        snp.makeConstraints { make in make.height.greaterThanOrEqualTo(34) }

        dot.backgroundColor = WSColor.dot
        dot.layer.cornerRadius = 6
        dot.layer.borderWidth = 2
        dot.layer.borderColor = UIColor.white.cgColor
        dot.isUserInteractionEnabled = false
        dot.isHidden = true
        dot.accessibilityIdentifier = "weeklySummary.dot"
        addSubview(dot)
        dot.snp.makeConstraints { make in
            make.width.height.equalTo(12)
            make.top.equalToSuperview().offset(-3)
            make.trailing.equalToSuperview().offset(2)
        }

        isAccessibilityElement = true
        accessibilityTraits = UIAccessibilityTraitButton
        accessibilityLabel = "weeklySummary.title".localized()
        accessibilityIdentifier = "weeklySummary.button"
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func layoutSubviews() {
        super.layoutSubviews()
        layer.cornerRadius = bounds.height / 2
    }

    override var isHighlighted: Bool {
        didSet { alpha = isHighlighted ? 0.8 : 1 }
    }

    override func didMoveToWindow() {
        super.didMoveToWindow()
        updateTwinkle()
    }

    /// #1618 (owner): the ✦ twinkles while the button is on screen (`WeeklySummaryTwinkle`); none with Reduce Motion
    private func updateTwinkle() {
        let layer = sparkle.layer
        guard window != nil, WeeklySummaryTwinkle.runs(reduceMotion: UIAccessibilityIsReduceMotionEnabled()) else {
            layer.removeAnimation(forKey: Self.twinkleKey)
            return
        }
        guard layer.animation(forKey: Self.twinkleKey) == nil else { return }
        let keyTimes = WeeklySummaryTwinkle.keyTimes.map { NSNumber(value: $0) }
        let ease = Array(repeating: CAMediaTimingFunction(name: kCAMediaTimingFunctionEaseInEaseOut),
                         count: keyTimes.count - 1)
        let scale = CAKeyframeAnimation(keyPath: "transform.scale")
        scale.values = WeeklySummaryTwinkle.scales
        scale.keyTimes = keyTimes
        scale.timingFunctions = ease
        let turn = CAKeyframeAnimation(keyPath: "transform.rotation.z")
        turn.values = WeeklySummaryTwinkle.turns
        turn.keyTimes = keyTimes
        turn.timingFunctions = ease
        let group = CAAnimationGroup()
        group.animations = [scale, turn]
        group.duration = WeeklySummaryTwinkle.duration
        group.repeatCount = .infinity
        group.isRemovedOnCompletion = false // keeps running after the app comes back from the background
        layer.add(group, forKey: Self.twinkleKey)
    }

    /// The pill is 34pt tall; taps within 5pt around it still count (44pt target)
    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        bounds.insetBy(dx: -5, dy: -5).contains(point)
    }
}

// MARK: - Sheet

/// The summary sheet. It shows the summary the overview already has, else asks the API to write it (POST) with a
/// spinner; NO_ORDERS shows the empty state, a failure "Chưa tạo được tóm tắt." with Retry.
final class WeeklySummarySheet: UIViewController {
    /// The API's answer (the overview drops the red dot)
    var onUpdate: ((WeeklySummaryData) -> Void)?

    private var data: WeeklySummaryData?
    private let subtitle = OVFont.label(nil, DS.TextSize.secondary, color: OVColor.muted, lines: 0)
    private let host = UIView()
    private var shown: UIView?
    private var locale: Locale { OrdersHomeLogic.appLocale }

    init(data: WeeklySummaryData?) {
        self.data = data
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = OVColor.surface
        view.accessibilityIdentifier = "weeklySummary.sheet"

        let title = OVFont.label("weeklySummary.title".localized(), DS.TextSize.name, .bold)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        let titles = UIStackView(arrangedSubviews: [title, subtitle])
        titles.axis = .vertical
        titles.spacing = 2

        let close = UIButton(type: .system)
        close.setImage(DS.symbol("xmark", 15, weight: .semibold), for: .normal)
        close.tintColor = OVColor.ink2
        close.accessibilityLabel = "overview.v2.detail.close".localized()
        close.accessibilityIdentifier = "weeklySummary.close"
        close.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        // ✕ on a 30 pt grey circle, 44 pt to tap
        let circle = UIView()
        circle.backgroundColor = WSColor.band
        circle.layer.cornerRadius = 15
        circle.isUserInteractionEnabled = false
        let closeBox = UIView()
        closeBox.addSubview(circle)
        closeBox.addSubview(close)
        circle.snp.makeConstraints { make in
            make.center.equalToSuperview()
            make.width.height.equalTo(30)
        }
        close.snp.makeConstraints { make in make.edges.equalToSuperview() }
        closeBox.snp.makeConstraints { make in make.width.height.equalTo(DS.touchTarget) }
        closeBox.setContentHuggingPriority(.required, for: .horizontal)

        let header = UIStackView(arrangedSubviews: [titles, closeBox])
        header.alignment = .center
        header.spacing = DS.Spacing.sm
        let rule = UIView()
        rule.backgroundColor = OVColor.line

        view.addSubview(header)
        view.addSubview(rule)
        view.addSubview(host)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(18)
            make.leading.equalTo(view.safeAreaLayoutGuide).offset(18)
            make.trailing.equalTo(view.safeAreaLayoutGuide).offset(-8)
        }
        rule.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom).offset(4)
            make.leading.trailing.equalToSuperview()
            make.height.equalTo(1)
        }
        host.snp.makeConstraints { make in
            make.top.equalTo(rule.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }

        if Self.hasSummary(data) {
            showSummary()
            write(quiet: true)
        } else {
            write(quiet: false)
        }
    }

    private static func hasSummary(_ data: WeeklySummaryData?) -> Bool {
        let state = WeeklySummaryLogic.state(data)
        return data?.summary != nil && (state == .ready || state == .noOrders)
    }

    @objc private func closeTapped() { dismiss(animated: true) }

    // MARK: Data

    /// POST: the stored summary, or written now. `quiet` keeps what is on screen and ignores a failure.
    private func write(quiet: Bool) {
        if !quiet { show(loadingView(), fullSubtitle: false) }
        let onUpdate = self.onUpdate
        TabsV2APIService.shared.weeklySummary(write: true) { [weak self] answer, _ in
            // Even when the sheet was closed while the AI wrote: the overview drops the dot
            if let answer, Self.hasSummary(answer) { onUpdate?(answer) }
            guard let self else { return }
            if let answer, Self.hasSummary(answer) {
                guard answer != self.data || !quiet else { return }
                self.data = answer
                self.showSummary()
            } else if !quiet {
                self.show(self.errorView(), fullSubtitle: false)
            }
        }
    }

    @objc private func retryTapped() { write(quiet: false) }

    // MARK: States

    private func show(_ content: UIView, fullSubtitle: Bool) {
        subtitle.text = fullSubtitle
            ? WeeklySummaryLogic.subtitle(data, wholeShop: "weeklySummary.wholeShop".localized(), locale: locale)
            : WeeklySummaryLogic.weekRange(data?.week, locale: locale)
        subtitle.isHidden = subtitle.text?.isEmpty ?? true
        shown?.removeFromSuperview()
        shown = content
        host.addSubview(content)
        content.snp.makeConstraints { make in make.edges.equalToSuperview() }
    }

    private func showSummary() {
        if WeeklySummaryLogic.state(data) == .noOrders {
            show(noOrdersView(), fullSubtitle: false)
        } else {
            show(readyView(), fullSubtitle: true)
        }
    }

    /// Centred lines in the free space under the header
    private func centered(_ views: [UIView], identifier: String) -> UIView {
        let stack = UIStackView(arrangedSubviews: views)
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 10
        let box = UIView()
        box.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.centerY.equalToSuperview().offset(-40)
            make.leading.trailing.equalToSuperview().inset(28)
        }
        box.accessibilityIdentifier = identifier
        return box
    }

    private func centeredText(_ text: String, size: CGFloat = DS.TextSize.body, color: UIColor = OVColor.ink2) -> UILabel {
        let label = OVFont.label(text, size, color: color, lines: 0)
        label.textAlignment = .center
        return label
    }

    private func loadingView() -> UIView {
        let spinner = UIActivityIndicatorView(activityIndicatorStyle: .large)
        spinner.color = WSColor.ai
        spinner.startAnimating()
        return centered([spinner, centeredText("weeklySummary.loading".localized()),
                         centeredText("weeklySummary.loadingHint".localized(), size: DS.TextSize.secondary, color: OVColor.muted)],
                        identifier: "weeklySummary.loading")
    }

    private func noOrdersView() -> UIView {
        let icon = OVFont.label("🗓️", 34)
        icon.isAccessibilityElement = false
        return centered([icon, centeredText("weeklySummary.noOrders".localized())], identifier: "weeklySummary.noOrders")
    }

    private func errorView() -> UIView {
        let retry = UIButton(type: .system)
        retry.setTitle("Retry".localized(), for: .normal)
        retry.setTitleColor(.white, for: .normal)
        retry.titleLabel?.font = OVFont.make(DS.TextSize.body, .bold)
        retry.backgroundColor = WSColor.primary
        retry.layer.cornerRadius = 10
        retry.contentEdgeInsets = UIEdgeInsets(top: 0, left: 24, bottom: 0, right: 24)
        retry.accessibilityIdentifier = "weeklySummary.retry"
        retry.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)
        retry.snp.makeConstraints { make in make.height.equalTo(DS.touchTarget) }
        return centered([centeredText("weeklySummary.error".localized()), retry], identifier: "weeklySummary.error")
    }

    // MARK: Ready

    private func readyView() -> UIView {
        let content = data?.summary?.content
        let numbers = data?.summary?.numbers
        var views: [UIView] = []
        if let summary = WeeklySummaryLogic.text(content?.summary) {
            views.append(ledeBox(summary))
        }
        let actions = WeeklySummaryLogic.actions(content)
        if !actions.isEmpty {
            views.append(section([actionsLabel(), todoList(actions)]))
        }
        if let numbers {
            views.append(section(revenueViews(numbers, note: content?.revenueNote)))
            views.append(section(ordersViews(numbers, note: content?.ordersNote)))
            views.append(section(productsViews(numbers, note: content?.productsNote)))
        }
        views.append(footer())

        let stack = UIStackView(arrangedSubviews: views)
        stack.axis = .vertical
        stack.spacing = 14
        let scroll = UIScrollView()
        scroll.alwaysBounceVertical = true
        scroll.accessibilityIdentifier = "weeklySummary.scroll"
        scroll.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.top.equalTo(scroll.contentLayoutGuide).offset(14)
            make.bottom.equalTo(scroll.contentLayoutGuide).offset(-DS.Spacing.xl)
            make.leading.trailing.equalTo(scroll.frameLayoutGuide).inset(18)
        }
        return scroll
    }

    /// Soft blue box: "✦ " + the two sentences
    private func ledeBox(_ text: String) -> UIView {
        let label = OVFont.label("✦ " + text, DS.TextSize.body, color: OVColor.ink, lines: 0)
        label.accessibilityIdentifier = "weeklySummary.lede"
        let box = UIView()
        box.backgroundColor = WSColor.soft
        box.layer.cornerRadius = 10
        box.addSubview(label)
        label.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12)) }
        return box
    }

    /// A group under a hairline
    private func section(_ views: [UIView]) -> UIView {
        let rule = UIView()
        rule.backgroundColor = OVColor.line
        let stack = UIStackView(arrangedSubviews: views)
        stack.axis = .vertical
        stack.spacing = 10
        let box = UIView()
        box.addSubview(rule)
        box.addSubview(stack)
        rule.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview()
            make.height.equalTo(1)
        }
        stack.snp.makeConstraints { make in
            make.top.equalTo(rule.snp.bottom).offset(12)
            make.leading.trailing.bottom.equalToSuperview()
        }
        return box
    }

    private func sectionTitle(_ text: String) -> UILabel {
        let label = OVFont.label(text, DS.TextSize.name, .bold, lines: 0)
        label.accessibilityTraits = UIAccessibilityTraitHeader
        return label
    }

    /// "NÊN LÀM TUẦN NÀY" + the small "AI" tag
    private func actionsLabel() -> UIView {
        let label = UILabel()
        label.adjustsFontForContentSizeCategory = true
        label.numberOfLines = 0
        label.attributedText = NSAttributedString(
            string: "weeklySummary.actions".localized().uppercased(with: locale),
            attributes: [.font: OVFont.make(DS.TextSize.pill, .bold), .foregroundColor: OVColor.muted, .kern: 0.6])
        label.accessibilityTraits = UIAccessibilityTraitHeader
        let tag = PaddedTagLabel()
        tag.text = "weeklySummary.aiTag".localized()
        tag.font = OVFont.make(DS.TextSize.pill, .bold)
        tag.textColor = WSColor.ai
        tag.backgroundColor = WSColor.soft
        tag.layer.cornerRadius = 6
        tag.layer.masksToBounds = true
        tag.setContentHuggingPriority(.required, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [label, tag, UIView()])
        row.spacing = 8
        row.alignment = .center
        return row
    }

    /// 1 2 3 in blue circles
    private func todoList(_ actions: [String]) -> UIView {
        let rows: [UIView] = actions.enumerated().map { index, text in
            let number = OVFont.label("\(index + 1)", DS.TextSize.pill, .bold, color: .white)
            number.textAlignment = .center
            number.backgroundColor = WSColor.primary
            number.layer.cornerRadius = 11
            number.layer.masksToBounds = true
            number.snp.makeConstraints { make in make.width.height.equalTo(22) }
            let label = OVFont.label(text, DS.TextSize.body, color: OVColor.ink, lines: 0)
            let holder = UIView()
            holder.addSubview(number)
            number.snp.makeConstraints { make in
                make.top.leading.trailing.equalToSuperview()
                make.bottom.lessThanOrEqualToSuperview()
                make.bottom.equalToSuperview().priority(.low)
            }
            let row = UIStackView(arrangedSubviews: [holder, label])
            row.spacing = 10
            row.alignment = .top
            row.isAccessibilityElement = true
            row.accessibilityLabel = "\(index + 1). \(text)"
            return row
        }
        let list = UIStackView(arrangedSubviews: rows)
        list.axis = .vertical
        list.spacing = 8
        return list
    }

    /// "✦ " + one line of the AI, in blue then ink
    private func aiNote(_ text: String?) -> UIView? {
        guard let text = WeeklySummaryLogic.text(text) else { return nil }
        let mark = OVFont.label("✦", DS.TextSize.secondary, color: WSColor.ai)
        mark.setContentHuggingPriority(.required, for: .horizontal)
        mark.isAccessibilityElement = false
        let label = OVFont.label(text, DS.TextSize.secondary, color: OVColor.ink, lines: 0)
        let row = UIStackView(arrangedSubviews: [mark, label])
        row.spacing = 6
        row.alignment = .firstBaseline
        return row
    }

    // MARK: Tiles

    private enum Part {
        case value(String)
        case change(WeeklySummaryChange?)
    }

    /// Grey tile: label (small, grey) over the value with its change
    private func tile(_ name: String, _ parts: [Part]) -> UIView {
        let nameLabel = OVFont.label(name, DS.TextSize.pill, color: OVColor.muted, lines: 0)
        let value = UILabel()
        value.adjustsFontForContentSizeCategory = true
        value.numberOfLines = 0
        value.attributedText = attributed(parts)
        let stack = UIStackView(arrangedSubviews: [nameLabel, value])
        stack.axis = .vertical
        stack.spacing = 2
        let box = UIView()
        box.backgroundColor = WSColor.band
        box.layer.cornerRadius = 8
        box.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview().inset(UIEdgeInsets(top: 7, left: 10, bottom: 0, right: 10))
            // the taller tile of a row sets its height; the other keeps its text at the top
            make.bottom.lessThanOrEqualToSuperview().offset(-7)
            make.bottom.equalToSuperview().offset(-7).priority(.high)
        }
        box.isAccessibilityElement = true
        box.accessibilityLabel = "\(name), \(value.attributedText?.string ?? "")"
        return box
    }

    private func attributed(_ parts: [Part], size: CGFloat = DS.TextSize.body) -> NSAttributedString {
        let text = NSMutableAttributedString()
        for part in parts {
            switch part {
            case .value(let string):
                text.append(NSAttributedString(string: string, attributes: [
                    .font: OVFont.make(size, .bold, digits: true), .foregroundColor: OVColor.ink]))
            case .change(let change):
                guard let change else { continue }
                text.append(NSAttributedString(string: " " + change.text, attributes: [
                    .font: OVFont.make(DS.TextSize.pill, .bold), .foregroundColor: change.good ? WSColor.good : WSColor.bad]))
            }
        }
        return text
    }

    /// Two tiles per row
    private func grid(_ tiles: [UIView]) -> UIView {
        let rows = stride(from: 0, to: tiles.count, by: 2).map { start -> UIView in
            var pair = Array(tiles[start..<min(start + 2, tiles.count)])
            if pair.count == 1 { pair.append(UIView()) }
            let row = UIStackView(arrangedSubviews: pair)
            row.distribution = .fillEqually
            row.alignment = .fill
            row.spacing = 8
            return row
        }
        let stack = UIStackView(arrangedSubviews: rows)
        stack.axis = .vertical
        stack.spacing = 8
        return stack
    }

    private func money(_ amount: Double?) -> String { MoneyFormatter.suffixed(amount ?? 0) }

    // MARK: Groups

    private func revenueViews(_ numbers: WeeklySummaryData.Numbers, note: String?) -> [UIView] {
        let revenue = numbers.revenue
        var views: [UIView] = [sectionTitle("Revenue".localized())]
        views.append(grid([
            tile("overview.dash.kpi.orderValue".localized(),
                 [.value(money(revenue?.orderValue?.current)), .change(WeeklySummaryLogic.percentChange(revenue?.orderValue?.growth))]),
            tile("overview.dash.kpi.collected".localized(),
                 [.value(money(revenue?.collected?.current)), .change(WeeklySummaryLogic.percentChange(revenue?.collected?.growth))]),
            tile("overview.dash.kpi.outstanding".localized(), [.value(money(revenue?.outstanding))]),
            tile("Late + damage fees".localized(), [.value(money(revenue?.fees))]), // #1433 "Phí trễ + phụ phí"
        ]))
        let branches = numbers.branches ?? []
        if !branches.isEmpty {
            let list = UIStackView(arrangedSubviews: branches.map(branchRow))
            list.axis = .vertical
            list.spacing = 6
            views.append(list)
        }
        if let line = aiNote(note) { views.append(line) }
        return views
    }

    /// Branch name, "21 đơn" under it; its new order value and change on the right
    private func branchRow(_ branch: WeeklySummaryData.Branch) -> UIView {
        let orders = WeeklySummaryLogic.count(branch.newOrders)
        let name = OVFont.label(branch.name ?? "—", DS.TextSize.body, .semibold, lines: 2)
        let count = OVFont.label(PluralText.format("overview.dash.orders", count: orders, orders), DS.TextSize.pill, color: OVColor.muted)
        let texts = UIStackView(arrangedSubviews: [name, count])
        texts.axis = .vertical
        texts.spacing = 1
        let value = UILabel()
        value.adjustsFontForContentSizeCategory = true
        value.attributedText = attributed([.value(money(branch.orderValue?.current)),
                                           .change(WeeklySummaryLogic.percentChange(branch.orderValue?.growth))])
        value.textAlignment = .right
        value.setContentHuggingPriority(.required, for: .horizontal)
        value.setContentCompressionResistancePriority(.required, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [texts, value])
        row.spacing = 8
        row.alignment = .center
        let box = UIView()
        box.backgroundColor = WSColor.band
        box.layer.cornerRadius = 8
        box.addSubview(row)
        row.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 7, left: 10, bottom: 7, right: 10)) }
        box.isAccessibilityElement = true
        box.accessibilityLabel = "\(name.text ?? ""), \(count.text ?? ""), \(value.attributedText?.string ?? "")"
        box.accessibilityIdentifier = "weeklySummary.branch"
        return box
    }

    private func ordersViews(_ numbers: WeeklySummaryData.Numbers, note: String?) -> [UIView] {
        let orders = numbers.orders
        let rentals = numbers.rentals
        let late = WeeklySummaryLogic.count(rentals?.late?.current)
        var views: [UIView] = [sectionTitle("weeklySummary.ordersGroup".localized())]
        views.append(grid([
            tile("overview.dash.detail.newOrders".localized(),
                 [.value("\(WeeklySummaryLogic.count(orders?.new?.current))"), .change(WeeklySummaryLogic.countChange(orders?.new))]),
            tile("weeklySummary.rentSaleCancel".localized(),
                 [.value(WeeklySummaryLogic.joined([orders?.rent, orders?.sale, orders?.cancelled]))]),
            tile("weeklySummary.outBack".localized(), [.value(WeeklySummaryLogic.joined([rentals?.pickedUp, rentals?.returned]))]),
            tile("weeklySummary.lateNotPicked".localized(),
                 [.value("\(late)"), .change(WeeklySummaryLogic.countChange(rentals?.late, upIsGood: false)),
                  .value(" · \(WeeklySummaryLogic.count(rentals?.notPickedUp))")]),
        ]))
        let bars = WeeklySummaryLogic.bars(orders?.byDay, locale: locale)
        if !bars.isEmpty { views.append(barsView(bars)) }
        if let line = aiNote(note) { views.append(line) }
        return views
    }

    /// New orders per day, Monday first; the busiest day solid blue
    private func barsView(_ bars: [WeeklySummaryBar]) -> UIView {
        let height: CGFloat = 76
        let labelHeight: CGFloat = 16
        let room = height - labelHeight - 4
        let columns = UIStackView()
        columns.distribution = .fillEqually
        columns.spacing = 6
        for (index, bar) in bars.enumerated() {
            let column = UIView()
            let fill = UIView()
            fill.backgroundColor = bar.isTop ? WSColor.primary : WSColor.barLight
            fill.layer.cornerRadius = 4
            fill.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
            let label = OVFont.label(bar.label, DS.TextSize.pill, bar.isTop ? .bold : .regular,
                                     color: bar.isTop ? OVColor.ink : OVColor.muted)
            label.textAlignment = .center
            label.adjustsFontSizeToFitWidth = true
            label.minimumScaleFactor = 0.7
            column.addSubview(fill)
            column.addSubview(label)
            label.snp.makeConstraints { make in
                make.leading.trailing.bottom.equalToSuperview()
                make.height.equalTo(labelHeight)
            }
            fill.snp.makeConstraints { make in
                make.leading.trailing.equalToSuperview()
                make.bottom.equalTo(label.snp.top).offset(-4)
                make.height.equalTo(max(3, (room * bar.ratio).rounded()))
            }
            column.isAccessibilityElement = true
            let day = "\(bar.label): " + PluralText.format("overview.dash.orders", count: bar.count, bar.count)
            column.accessibilityLabel = index == 0 ? "weeklySummary.byDay".localized() + ", " + day : day
            columns.addArrangedSubview(column)
        }
        columns.snp.makeConstraints { make in make.height.equalTo(height) }
        columns.accessibilityIdentifier = "weeklySummary.bars"
        return columns
    }

    private func productsViews(_ numbers: WeeklySummaryData.Numbers, note: String?) -> [UIView] {
        var views: [UIView] = [sectionTitle("weeklySummary.productsGroup".localized())]
        let hot = numbers.products?.hot ?? []
        if !hot.isEmpty {
            let list = UIStackView(arrangedSubviews: hot.prefix(3).enumerated().map { hotRow($0.element, rank: $0.offset + 1) })
            list.axis = .vertical
            list.spacing = 8
            views.append(list)
        }
        let customers = numbers.customers
        views.append(grid([
            tile("weeklySummary.customers".localized(), [.value("\(WeeklySummaryLogic.count(customers?.total))")]),
            tile("weeklySummary.newReturning".localized(), [.value(WeeklySummaryLogic.joined([customers?.new, customers?.returning]))]),
        ]))
        if let line = aiNote(note) { views.append(line) }
        return views
    }

    /// "1  Áo dài cưới đỏ     9 lượt · 3.600.000đ" (lượt = rentals + sales: a sold-only item is not "0 lượt")
    private func hotRow(_ product: WeeklySummaryData.HotProduct, rank: Int) -> UIView {
        let number = OVFont.label("\(rank)", DS.TextSize.body, .bold, color: WSColor.ai)
        number.snp.makeConstraints { make in make.width.equalTo(14) }
        let name = OVFont.label(product.name ?? "—", DS.TextSize.body, color: OVColor.ink, lines: 2)
        let times = WeeklySummaryLogic.times(product)
        let detail = OVFont.label(PluralText.format("weeklySummary.times", count: times, times) + " · " + money(product.revenue),
                                  DS.TextSize.secondary, color: OVColor.muted)
        detail.setContentHuggingPriority(.required, for: .horizontal)
        detail.setContentCompressionResistancePriority(.required, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [number, name, detail])
        row.spacing = 8
        row.alignment = .firstBaseline
        row.isAccessibilityElement = true
        row.accessibilityLabel = "\(rank). \(name.text ?? ""), \(detail.text ?? "")"
        return row
    }

    /// "Số do AnyRent tính. Dòng có dấu ✦ do AI viết, có thể chưa đúng. Viết lúc T2 16/11 08:12 · bản mới vào T2 23/11"
    private func footer() -> UIView {
        var text = "weeklySummary.footer.figures".localized()
        if let parts = WeeklySummaryLogic.writtenParts(data, locale: locale) {
            text += " " + String(format: "weeklySummary.footer.written".localized(), parts.written, parts.next)
        }
        let label = OVFont.label(text, DS.TextSize.pill, color: OVColor.muted, lines: 0)
        label.accessibilityIdentifier = "weeklySummary.footer"
        let rule = UIView()
        rule.backgroundColor = OVColor.line
        let box = UIView()
        box.addSubview(rule)
        box.addSubview(label)
        rule.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview()
            make.height.equalTo(1)
        }
        label.snp.makeConstraints { make in
            make.top.equalTo(rule.snp.bottom).offset(10)
            make.leading.trailing.bottom.equalToSuperview()
        }
        return box
    }
}

/// A small label with side padding ("AI" tag)
private final class PaddedTagLabel: UILabel {
    private let insets = UIEdgeInsets(top: 1, left: 6, bottom: 1, right: 6)

    override func drawText(in rect: CGRect) { super.drawText(in: UIEdgeInsetsInsetRect(rect, insets)) }

    override var intrinsicContentSize: CGSize {
        let size = super.intrinsicContentSize
        return CGSize(width: size.width + insets.left + insets.right, height: size.height + insets.top + insets.bottom)
    }
}
