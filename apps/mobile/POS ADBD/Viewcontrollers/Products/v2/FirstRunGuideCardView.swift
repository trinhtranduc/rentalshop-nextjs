//
//  FirstRunGuideCardView.swift
//  POS ADBD
//
//  #1393: the card "Bắt đầu: 3 việc" (tab "★ Cầm tay: đơn đầu tiên"): three rows that tick from real data, Bỏ qua, and the
//  one-time "Xong đơn đầu tiên". The same view sits at the top of Home and in the sheet from Cài đặt.
//

import UIKit
import SnapKit

final class FirstRunGuideCardView: UIView {
    var onStep: ((FirstRunGuideStep) -> Void)?
    /// Bỏ qua on Home, Đóng in the sheet
    var onDismiss: (() -> Void)?
    var onCloseFinish: (() -> Void)?

    private let column = UIStackView()
    private let dismissTitle: String
    private static let ok = UIColor(hexString: "059669")

    /// - dismissTitle: "Bỏ qua" on Home, "Đóng" in the sheet
    init(dismissTitle: String = "firstRunGuide.skip".localized()) {
        self.dismissTitle = dismissTitle
        super.init(frame: .zero)
        accessibilityIdentifier = "guide.card"
        layer.cornerRadius = 16
        column.axis = .vertical
        addSubview(column)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func show(_ card: FirstRunGuideCard) {
        column.arrangedSubviews.forEach { $0.removeFromSuperview() }
        switch card {
        case .hidden: break
        case .steps(let done): showSteps(done)
        case .finished: showFinish()
        }
    }

    private func showSteps(_ done: Set<FirstRunGuideStep>) {
        backgroundColor = UIColor(hexString: "EFF6FF")
        accessibilityIdentifier = "guide.card"
        column.snp.remakeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.bottom.equalToSuperview().offset(-6)
            make.leading.trailing.equalToSuperview().inset(14)
        }
        let title = V2.label("firstRunGuide.title".localized(), size: DS.TextSize.name, weight: .bold, lines: 0)
        let count = V2.label("\(done.count)/\(FirstRunGuideStep.allCases.count)", size: 13, weight: .bold, color: DS.Color.primary)
        count.accessibilityIdentifier = "guide.count"
        count.setContentHuggingPriority(.required, for: .horizontal)
        count.setContentCompressionResistancePriority(.required, for: .horizontal)
        let header = UIStackView(arrangedSubviews: [title, count])
        header.alignment = .center
        column.addArrangedSubview(header)
        column.setCustomSpacing(4, after: header)

        let current = FirstRunGuide.current(done: done)
        for (index, step) in FirstRunGuideStep.allCases.enumerated() {
            if index > 0 { column.addArrangedSubview(line()) }
            column.addArrangedSubview(row(step, isDone: done.contains(step), isCurrent: step == current))
        }

        let dismiss = UIButton(type: .system)
        dismiss.setTitle(dismissTitle, for: .normal)
        dismiss.titleLabel?.font = Utils.mediumFont(size: DS.TextSize.secondary)
        dismiss.setTitleColor(DS.Color.textMuted, for: .normal)
        dismiss.contentHorizontalAlignment = .leading
        dismiss.accessibilityIdentifier = "guide.dismiss"
        dismiss.addTarget(self, action: #selector(dismissTapped), for: .touchUpInside)
        dismiss.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(36) }
        column.addArrangedSubview(dismiss)
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

    private func row(_ step: FirstRunGuideStep, isDone: Bool, isCurrent: Bool) -> UIView {
        let button = UIControl()
        button.tag = step.rawValue
        button.accessibilityIdentifier = Self.rowIdentifier(step)
        button.isAccessibilityElement = true
        button.accessibilityTraits = UIAccessibilityTraitButton
        let text = Self.title(of: step)
        button.accessibilityLabel = text
        button.accessibilityValue = isDone ? "firstRunGuide.done".localized() : nil
        button.addTarget(self, action: #selector(rowTapped(_:)), for: .touchUpInside)

        let check = UIImageView(image: isDone ? DS.symbol("checkmark", 12, weight: .bold) : nil)
        check.tintColor = .white
        check.contentMode = .center
        check.layer.cornerRadius = 11
        check.layer.borderWidth = isDone ? 0 : 2
        check.layer.borderColor = (isCurrent ? DS.Color.primary : UIColor(hexString: "94A3B8")).cgColor
        check.backgroundColor = isDone ? Self.ok : .clear
        check.snp.makeConstraints { make in make.width.height.equalTo(22) }

        let weight: UIFont.Weight = isCurrent ? .bold : (isDone ? .regular : .medium)
        let label = V2.label(size: DS.TextSize.body, weight: weight, color: isCurrent ? DS.Color.text : DS.Color.textMuted, lines: 0)
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

        let chevron = UIImageView(image: DS.symbol("chevron.right", 12, weight: .semibold))
        chevron.tintColor = isCurrent ? DS.Color.primary : DS.Color.textMuted
        chevron.setContentHuggingPriority(.required, for: .horizontal)
        chevron.setContentCompressionResistancePriority(.required, for: .horizontal)

        let stack = UIStackView(arrangedSubviews: [check, label, chevron])
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

    private func line() -> UIView {
        let view = UIView()
        view.backgroundColor = UIColor(hexString: "E2E8F0")
        view.snp.makeConstraints { make in make.height.equalTo(1) }
        return view
    }

    static func rowIdentifier(_ step: FirstRunGuideStep) -> String {
        switch step {
        case .product: return "guide.row.product"
        case .customer: return "guide.row.customer"
        case .order: return "guide.row.order"
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

    @objc private func dismissTapped() { onDismiss?() }
    @objc private func closeFinishTapped() { onCloseFinish?() }
}

/// Cài đặt › Hướng dẫn bắt đầu: the card in a sheet, Đóng in place of Bỏ qua
final class FirstRunGuideSheetViewController: UIViewController {
    var onStep: ((FirstRunGuideStep) -> Void)?
    private let card = FirstRunGuideCardView(dismissTitle: "firstRunGuide.close".localized())
    private let done: Set<FirstRunGuideStep>
    private static let sheetHeight: CGFloat = 300

    init(done: Set<FirstRunGuideStep>) {
        self.done = done
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .pageSheet
        if #available(iOS 15.0, *), let sheet = sheetPresentationController {
            // Hugs the card; a small phone keeps it whole
            if #available(iOS 16.0, *) {
                sheet.detents = [.custom { _ in Self.sheetHeight }]
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
        card.show(.steps(done: done))
        card.onStep = { [weak self] step in self?.onStep?(step) }
        card.onDismiss = { [weak self] in self?.dismiss(animated: true) }
        view.addSubview(card)
        card.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(DS.Spacing.lg + 8)
            make.leading.trailing.equalTo(view.readableColumn()).inset(DS.Spacing.lg)
        }
    }
}
