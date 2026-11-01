//
//  FirstRunGuideCardView.swift
//  POS ADBD
//
//  #1393, #1410: the card "Bắt đầu: 3 việc" (tab "★ Cầm tay: đơn đầu tiên"): rows that tick from real data, one blue button on the
//  current step, Để sau, the slim row, and the one-time "Xong đơn đầu tiên". The same view sits on Home and in the sheet from Cài đặt.
//

import UIKit
import SnapKit

final class FirstRunGuideCardView: UIView {
    /// What sits under the rows: Để sau on Home, Đóng and maybe Ẩn hướng dẫn in the sheet from Cài đặt
    enum Foot: Equatable {
        case home
        case sheet(canHide: Bool)
    }

    var onStep: ((FirstRunGuideStep) -> Void)?
    /// Để sau
    var onLater: (() -> Void)?
    /// A tap on the slim row
    var onExpand: (() -> Void)?
    /// Đóng in the sheet
    var onDismiss: (() -> Void)?
    /// Ẩn hướng dẫn in the sheet
    var onHide: (() -> Void)?
    var onCloseFinish: (() -> Void)?

    private let column = UIStackView()
    private let foot: Foot
    private weak var goButton: UIButton?
    private var didBounce = false
    private static let ok = UIColor(hexString: "059669")
    private static let tint = UIColor(hexString: "EFF6FF")

    init(foot: Foot = .home) {
        self.foot = foot
        super.init(frame: .zero)
        accessibilityIdentifier = "guide.card"
        layer.cornerRadius = 16
        column.axis = .vertical
        addSubview(column)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func show(_ card: FirstRunGuideCard) {
        column.arrangedSubviews.forEach { $0.removeFromSuperview() }
        goButton = nil
        switch card {
        case .hidden: break
        case .steps(let done): showSteps(done)
        case .collapsed(let done): showSlim(done)
        case .finished: showFinish()
        }
    }

    /// One light bounce of the blue button, the first time the card is really on screen (#1410)
    func bounceOnce() {
        guard let goButton, FirstRunGuide.bounces(reduceMotion: UIAccessibilityIsReduceMotionEnabled(), alreadyBounced: didBounce) else { return }
        didBounce = true
        let bounce = CAKeyframeAnimation(keyPath: "transform.translation.y")
        bounce.values = [0, -5, 1, 0]
        bounce.keyTimes = [0, 0.45, 0.75, 1]
        bounce.duration = 0.5
        bounce.beginTime = CACurrentMediaTime() + 0.25
        goButton.layer.add(bounce, forKey: "guide.bounce")
    }

    private func showSteps(_ done: Set<FirstRunGuideStep>) {
        backgroundColor = Self.tint
        accessibilityIdentifier = "guide.card"
        layer.cornerRadius = 16
        column.snp.remakeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.bottom.equalToSuperview().offset(-4)
            make.leading.trailing.equalToSuperview().inset(14)
        }
        let title = V2.label("firstRunGuide.title".localized(), size: DS.TextSize.name, weight: .bold, lines: 0)
        let count = V2.label(Self.countText(done), size: 13, weight: .bold, color: DS.Color.primary)
        count.accessibilityIdentifier = "guide.count"
        count.setContentHuggingPriority(.required, for: .horizontal)
        count.setContentCompressionResistancePriority(.required, for: .horizontal)
        let header = UIStackView(arrangedSubviews: [title, count])
        header.alignment = .center
        column.addArrangedSubview(header)
        column.setCustomSpacing(4, after: header)

        let current = FirstRunGuide.current(done: done)
        for step in FirstRunGuideStep.allCases {
            column.addArrangedSubview(step == current ? currentRow(step) : row(step, isDone: done.contains(step)))
        }
        column.addArrangedSubview(footer())
    }

    /// "Bắt đầu n/3 ›": stays at the top of the list and reopens the card
    private func showSlim(_ done: Set<FirstRunGuideStep>) {
        backgroundColor = Self.tint
        accessibilityIdentifier = "guide.slim.box"
        column.snp.remakeConstraints { make in make.edges.equalToSuperview() }
        layer.cornerRadius = 12
        let title = V2.label("firstRunGuide.collapsed.title".localized(), size: DS.TextSize.body, weight: .semibold)
        let count = V2.label(Self.countText(done), size: DS.TextSize.body, weight: .bold, color: DS.Color.primary)
        let chevron = UIImageView(image: DS.symbol("chevron.right", 12, weight: .semibold))
        chevron.tintColor = DS.Color.primary
        chevron.setContentHuggingPriority(.required, for: .horizontal)
        let stack = UIStackView(arrangedSubviews: [title, count, UIView(), chevron])
        stack.alignment = .center
        stack.spacing = 6
        stack.isUserInteractionEnabled = false
        let slim = UIControl()
        slim.isAccessibilityElement = true
        slim.accessibilityTraits = UIAccessibilityTraitButton
        slim.accessibilityIdentifier = "guide.slim"
        slim.accessibilityLabel = "\(title.text ?? "") \(Self.countText(done))"
        slim.addTarget(self, action: #selector(slimTapped), for: .touchUpInside)
        slim.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(14)
            make.trailing.equalToSuperview().offset(-12)
            make.centerY.equalToSuperview()
        }
        slim.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(DS.touchTarget) }
        column.addArrangedSubview(slim)
    }

    private static func countText(_ done: Set<FirstRunGuideStep>) -> String {
        "\(done.count)/\(FirstRunGuideStep.allCases.count)"
    }

    private func footer() -> UIView {
        let foot = UIStackView()
        foot.alignment = .center
        switch self.foot {
        case .home:
            foot.addArrangedSubview(footButton("firstRunGuide.later".localized(), id: "guide.later", action: #selector(laterTapped)))
            foot.addArrangedSubview(UIView())
        case .sheet(let canHide):
            foot.addArrangedSubview(footButton("firstRunGuide.close".localized(), id: "guide.dismiss", action: #selector(dismissTapped)))
            foot.addArrangedSubview(UIView())
            if canHide {
                let hide = footButton("firstRunGuide.hide".localized(), id: "guide.hide", action: #selector(hideTapped))
                hide.setAttributedTitle(NSAttributedString(string: "firstRunGuide.hide".localized(), attributes: [
                    NSAttributedString.Key.font: Utils.mediumFont(size: DS.TextSize.secondary),
                    NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
                    NSAttributedString.Key.underlineStyle: NSUnderlineStyle.styleSingle.rawValue,
                ]), for: .normal)
                foot.addArrangedSubview(hide)
            }
        }
        return foot
    }

    private func footButton(_ title: String, id: String, action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = Utils.mediumFont(size: DS.TextSize.secondary)
        button.setTitleColor(DS.Color.textMuted, for: .normal)
        button.accessibilityIdentifier = id
        button.addTarget(self, action: action, for: .touchUpInside)
        button.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(DS.touchTarget) }
        return button
    }

    private func showFinish() {
        backgroundColor = UIColor(hexString: "ECFDF5")
        accessibilityIdentifier = "guide.finish"
        column.snp.remakeConstraints { make in
            make.edges.equalToSuperview().inset(14)
        }
        let big = UIImageView(image: DS.symbol("checkmark", 20, weight: .bold))
        big.tintColor = .white
        big.contentMode = .center
        big.backgroundColor = Self.ok
        big.layer.cornerRadius = 20
        big.snp.makeConstraints { make in make.width.height.equalTo(40) }
        let title = V2.label("firstRunGuide.finish.title".localized(), size: DS.TextSize.name, weight: .bold, lines: 0)
        let body = V2.label("firstRunGuide.finish.body".localized(), size: 13, color: DS.Color.textMuted, lines: 0)
        let texts = UIStackView(arrangedSubviews: [title, body])
        texts.axis = .vertical
        texts.spacing = 1
        let close = UIButton(type: .system)
        close.setTitle("firstRunGuide.close".localized(), for: .normal)
        close.titleLabel?.font = Utils.boldFont(size: DS.TextSize.secondary)
        close.setTitleColor(DS.Color.primary, for: .normal)
        close.accessibilityIdentifier = "guide.finish.close"
        close.addTarget(self, action: #selector(closeFinishTapped), for: .touchUpInside)
        close.setContentHuggingPriority(.required, for: .horizontal)
        close.setContentCompressionResistancePriority(.required, for: .horizontal)
        close.snp.makeConstraints { make in
            make.height.equalTo(DS.touchTarget)
            make.width.greaterThanOrEqualTo(DS.touchTarget)
        }
        let row = UIStackView(arrangedSubviews: [big, texts, close])
        row.alignment = .center
        row.spacing = 12
        column.addArrangedSubview(row)
    }

    /// The step to do now: a highlighted box with its number and one solid blue button
    private func currentRow(_ step: FirstRunGuideStep) -> UIView {
        let top = rowControl(step)
        let stack = UIStackView(arrangedSubviews: [badge(.number(step.rawValue + 1, filled: true)),
                                                   V2.label(Self.title(of: step), size: DS.TextSize.body, weight: .bold, lines: 0)])
        stack.alignment = .center
        stack.spacing = 10
        stack.isUserInteractionEnabled = false
        top.addSubview(stack)
        stack.snp.makeConstraints { make in make.edges.equalToSuperview() }
        top.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(DS.touchTarget - 12) }

        let go = UIButton(type: .system)
        go.setTitle(Self.buttonKey(of: step).localized(), for: .normal)
        go.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        go.setTitleColor(.white, for: .normal)
        go.backgroundColor = DS.Color.primary
        go.layer.cornerRadius = 12
        go.tag = step.rawValue
        go.accessibilityIdentifier = "guide.cta"
        go.addTarget(self, action: #selector(rowTapped(_:)), for: .touchUpInside)
        go.snp.makeConstraints { make in make.height.equalTo(46) }
        goButton = go

        let box = UIStackView(arrangedSubviews: [top, go])
        box.axis = .vertical
        box.spacing = 8
        box.isLayoutMarginsRelativeArrangement = true
        box.layoutMargins = UIEdgeInsets(top: 10, left: 10, bottom: 10, right: 10)
        box.backgroundColor = .white
        box.layer.cornerRadius = 12
        box.layer.borderWidth = 1.5
        box.layer.borderColor = DS.Color.primary.cgColor
        let wrap = UIStackView(arrangedSubviews: [box])
        wrap.isLayoutMarginsRelativeArrangement = true
        wrap.layoutMargins = UIEdgeInsets(top: 4, left: 0, bottom: 4, right: 0)
        return wrap
    }

    /// A row that is not the current one: dim but tappable, or ticked
    private func row(_ step: FirstRunGuideStep, isDone: Bool) -> UIView {
        let button = rowControl(step)
        let text = Self.title(of: step)
        button.accessibilityValue = isDone ? "firstRunGuide.done".localized() : nil

        let label = V2.label(size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
        if isDone {
            label.attributedText = NSAttributedString(string: text, attributes: [
                NSAttributedString.Key.font: label.font as Any,
                NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
                NSAttributedString.Key.strikethroughStyle: NSUnderlineStyle.styleSingle.rawValue,
                NSAttributedString.Key.strikethroughColor: DS.Color.textMuted,
            ])
        } else {
            label.text = text
        }

        let stack = UIStackView(arrangedSubviews: [badge(isDone ? .tick : .number(step.rawValue + 1, filled: false)), label])
        if !isDone {
            let chevron = UIImageView(image: DS.symbol("chevron.right", 12, weight: .semibold))
            chevron.tintColor = DS.Color.textMuted
            chevron.setContentHuggingPriority(.required, for: .horizontal)
            chevron.setContentCompressionResistancePriority(.required, for: .horizontal)
            stack.addArrangedSubview(chevron)
        }
        stack.alignment = .center
        stack.spacing = 10
        stack.isUserInteractionEnabled = false
        button.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview()
            make.top.equalToSuperview().offset(6)
            make.bottom.equalToSuperview().offset(-6)
        }
        button.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(DS.touchTarget) }
        return button
    }

    private func rowControl(_ step: FirstRunGuideStep) -> UIControl {
        let button = UIControl()
        button.tag = step.rawValue
        button.accessibilityIdentifier = Self.rowIdentifier(step)
        button.isAccessibilityElement = true
        button.accessibilityTraits = UIAccessibilityTraitButton
        button.accessibilityLabel = Self.title(of: step)
        button.addTarget(self, action: #selector(rowTapped(_:)), for: .touchUpInside)
        return button
    }

    private enum Badge {
        case tick
        case number(Int, filled: Bool)
    }

    private func badge(_ kind: Badge) -> UIView {
        let circle = UIView()
        circle.layer.cornerRadius = 12
        circle.snp.makeConstraints { make in make.width.height.equalTo(24) }
        switch kind {
        case .tick:
            circle.backgroundColor = Self.ok
            let tick = UIImageView(image: DS.symbol("checkmark", 12, weight: .bold))
            tick.tintColor = .white
            circle.addSubview(tick)
            tick.snp.makeConstraints { make in make.center.equalToSuperview() }
        case .number(let number, let filled):
            circle.backgroundColor = filled ? DS.Color.primary : .clear
            circle.layer.borderWidth = filled ? 0 : 1.5
            circle.layer.borderColor = UIColor(hexString: "94A3B8").cgColor
            let label = V2.label("\(number)", size: 13, weight: .bold, color: filled ? .white : DS.Color.textMuted)
            label.isAccessibilityElement = false
            circle.addSubview(label)
            label.snp.makeConstraints { make in make.center.equalToSuperview() }
        }
        return circle
    }

    static func rowIdentifier(_ step: FirstRunGuideStep) -> String {
        switch step {
        case .product: return "guide.row.product"
        case .customer: return "guide.row.customer"
        case .order: return "guide.row.order"
        }
    }

    /// The blue button of the current step
    static func buttonKey(of step: FirstRunGuideStep) -> String {
        switch step {
        case .product: return "firstRunGuide.go.product"
        case .customer: return "firstRunGuide.go.customer"
        case .order: return "firstRunGuide.go.order"
        }
    }

    static func title(of step: FirstRunGuideStep) -> String {
        switch step {
        case .product: return "firstRunGuide.step.product".localized()
        case .customer: return "firstRunGuide.step.customer".localized()
        case .order: return "firstRunGuide.step.order".localized()
        }
    }

    @objc private func rowTapped(_ sender: UIControl) {
        guard let step = FirstRunGuideStep(rawValue: sender.tag) else { return }
        onStep?(step)
    }

    @objc private func laterTapped() { onLater?() }
    @objc private func slimTapped() { onExpand?() }
    @objc private func dismissTapped() { onDismiss?() }
    @objc private func hideTapped() { onHide?() }
    @objc private func closeFinishTapped() { onCloseFinish?() }
}

/// Cài đặt › Hướng dẫn bắt đầu: the card in a sheet with Đóng, and "Ẩn hướng dẫn", the only way to hide the guide (#1410)
final class FirstRunGuideSheetViewController: UIViewController {
    var onStep: ((FirstRunGuideStep) -> Void)?
    private let card: FirstRunGuideCardView
    private let done: Set<FirstRunGuideStep>

    init(done: Set<FirstRunGuideStep>, canHide: Bool) {
        self.done = done
        card = FirstRunGuideCardView(foot: .sheet(canHide: canHide))
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .pageSheet
        card.show(.steps(done: done))
        if #available(iOS 15.0, *), let sheet = sheetPresentationController {
            // Hugs the card; a small phone keeps it whole
            if #available(iOS 16.0, *) {
                let width = UIScreen.main.bounds.width - 2 * DS.Spacing.lg
                let height = card.systemLayoutSizeFitting(CGSize(width: width, height: UILayoutFittingCompressedSize.height),
                                                          withHorizontalFittingPriority: .required,
                                                          verticalFittingPriority: .fittingSizeLevel).height
                sheet.detents = [.custom { _ in height + DS.Spacing.lg + 8 + 16 }]
            } else {
                sheet.detents = [.medium()]
            }
            sheet.prefersGrabberVisible = true
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface
        view.accessibilityIdentifier = "guide.sheet"
        card.onStep = { [weak self] step in self?.onStep?(step) }
        card.onDismiss = { [weak self] in self?.dismiss(animated: true) }
        card.onHide = { [weak self] in self?.confirmHide() }
        view.addSubview(card)
        card.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(DS.Spacing.lg + 8)
            make.leading.trailing.equalTo(view.readableColumn()).inset(DS.Spacing.lg)
        }
    }

    private func confirmHide() {
        let alert = UIAlertController(title: "firstRunGuide.hide.confirm".localized(), message: nil, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "firstRunGuide.hide.action".localized(), style: .destructive) { [weak self] _ in
            FirstRunGuideTracker.shared.skip()
            self?.dismiss(animated: true)
        })
        present(alert, animated: true)
    }
}
