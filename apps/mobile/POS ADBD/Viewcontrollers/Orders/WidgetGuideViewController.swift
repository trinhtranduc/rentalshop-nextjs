//
//  WidgetGuideViewController.swift
//  POS ADBD
//
//  #1375 (epic #1372, W11): "Thêm vào widget". iOS has no API for an app to add a widget, so this is a guide of three
//  steps with a preview, opened from the one-time card in the Đơn tab ("Cách thêm") or from Cài đặt > Widget. It never
//  opens by itself. The card is `WidgetHintCardView`.
//

import UIKit
import SnapKit
import DraftOrderActivity

/// The small card above "Việc cần làm": shown once, "Không hỏi lại" ends it for good
final class WidgetHintCardView: UIView {
    var onHowTapped: (() -> Void)?
    var onDismissTapped: (() -> Void)?

    private let titleLabel = V2.label("widget.hint.title".localized(), size: DS.TextSize.body, weight: .bold, lines: 0)
    private let bodyLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
    private let howButton = UIButton(type: .system)
    private let dismissButton = UIButton(type: .system)

    override init(frame: CGRect) {
        super.init(frame: frame)
        accessibilityIdentifier = "orders.widgetHint"
        backgroundColor = UIColor(hexString: "EFF6FF")
        layer.cornerRadius = DS.Radius.card
        howButton.setTitle("widget.hint.how".localized(), for: .normal)
        howButton.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        howButton.setTitleColor(.white, for: .normal)
        howButton.backgroundColor = DS.Color.primary
        howButton.layer.cornerRadius = 10
        howButton.contentEdgeInsets = UIEdgeInsets(top: 0, left: 14, bottom: 0, right: 14)
        howButton.accessibilityIdentifier = "orders.widgetHint.how"
        howButton.addTarget(self, action: #selector(howTapped), for: .touchUpInside)
        dismissButton.setTitle("widget.dismiss".localized(), for: .normal)
        dismissButton.titleLabel?.font = Utils.mediumFont(size: DS.TextSize.body)
        dismissButton.setTitleColor(DS.Color.textMuted, for: .normal)
        dismissButton.contentEdgeInsets = UIEdgeInsets(top: 0, left: 8, bottom: 0, right: 8)
        dismissButton.accessibilityIdentifier = "orders.widgetHint.dismiss"
        dismissButton.addTarget(self, action: #selector(dismissTapped), for: .touchUpInside)
        let buttons = UIStackView(arrangedSubviews: [howButton, dismissButton, UIView()])
        buttons.spacing = DS.Spacing.sm
        buttons.alignment = .center
        howButton.snp.makeConstraints { make in make.height.equalTo(36) }
        dismissButton.snp.makeConstraints { make in make.height.equalTo(36) }
        let column = UIStackView(arrangedSubviews: [titleLabel, bodyLabel, buttons])
        column.axis = .vertical
        column.spacing = DS.Spacing.sm
        addSubview(column)
        column.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: DS.Spacing.md, left: DS.Spacing.md, bottom: DS.Spacing.md, right: DS.Spacing.md))
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    /// "3 giao, 2 trả, 1 trễ sẽ hiện không cần mở app."
    func configure(pickup: Int, returns: Int, late: Int) {
        bodyLabel.text = String(format: "widget.hint.body".localized(), pickup, returns, late)
    }

    @objc private func howTapped() { onHowTapped?() }
    @objc private func dismissTapped() { onDismissTapped?() }
}

/// The three-step guide (bottom sheet)
final class WidgetGuideViewController: UIViewController {
    /// "Không hỏi lại" ends the one-time card; only the card offers it
    var onNeverAsk: (() -> Void)?
    private let offersNeverAsk: Bool

    init(offersNeverAsk: Bool) {
        self.offersNeverAsk = offersNeverAsk
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .pageSheet
        if #available(iOS 15.0, *), let sheet = sheetPresentationController {
            sheet.detents = [.large()]
            sheet.prefersGrabberVisible = true
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface
        view.accessibilityIdentifier = "widget.guide"

        let title = V2.label("widget.guide.title".localized(), size: DS.TextSize.title, weight: .bold, lines: 0)
        let subtitle = V2.label("widget.guide.subtitle".localized(), size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
        let steps = UIStackView(arrangedSubviews: [
            step(1, "widget.guide.step1".localized()),
            step(2, "widget.guide.step2".localized()),
            step(3, "widget.guide.step3".localized()),
        ])
        steps.axis = .vertical
        steps.spacing = DS.Spacing.md

        let ok = UIButton(type: .system)
        ok.setTitle("widget.guide.ok".localized(), for: .normal)
        ok.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        ok.setTitleColor(.white, for: .normal)
        ok.backgroundColor = DS.Color.primary
        ok.layer.cornerRadius = 12
        ok.accessibilityIdentifier = "widget.guide.ok"
        ok.addTarget(self, action: #selector(okTapped), for: .touchUpInside)
        ok.snp.makeConstraints { make in make.height.equalTo(48) }
        var buttons: [UIView] = [ok]
        if offersNeverAsk {
            let never = UIButton(type: .system)
            never.setTitle("widget.dismiss".localized(), for: .normal)
            never.titleLabel?.font = Utils.mediumFont(size: DS.TextSize.body)
            never.setTitleColor(DS.Color.textMuted, for: .normal)
            never.accessibilityIdentifier = "widget.guide.never"
            never.addTarget(self, action: #selector(neverTapped), for: .touchUpInside)
            never.snp.makeConstraints { make in make.height.equalTo(40) }
            buttons.append(never)
        }

        let column = UIStackView(arrangedSubviews: [title, subtitle, previewCard(), steps] + buttons)
        column.axis = .vertical
        column.spacing = DS.Spacing.lg
        column.setCustomSpacing(DS.Spacing.sm, after: title)
        let scroll = UIScrollView()
        view.addSubview(scroll)
        scroll.addSubview(column)
        scroll.snp.makeConstraints { make in make.edges.equalTo(view.safeAreaLayoutGuide) }
        column.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: DS.Spacing.xl, left: DS.Spacing.lg, bottom: DS.Spacing.lg, right: DS.Spacing.lg))
            make.width.equalTo(scroll).offset(-2 * DS.Spacing.lg)
        }
    }

    /// A drawing of the small widget (the P2 look: ring text and three coloured counters), like the mockup
    private func previewCard() -> UIView {
        let card = UIView()
        card.backgroundColor = UIColor(hexString: "F8FAFC")
        card.layer.cornerRadius = 22
        card.layer.borderWidth = 1
        card.layer.borderColor = DS.Color.border.cgColor
        let labels = TodayWidgetData.labels()
        let head = V2.label(String(format: labels.doneFormat, 4, 10), size: DS.TextSize.secondary, weight: .bold)
        let caption = V2.label(labels.doneCaption, size: DS.TextSize.pill, color: DS.Color.textMuted)
        let headRow = UIStackView(arrangedSubviews: [head, caption, UIView()])
        headRow.spacing = DS.Spacing.sm
        headRow.alignment = .firstBaseline
        let counts = UIStackView(arrangedSubviews: [
            tile(1, labels.late, "B91C1C"), tile(3, labels.pickup, "1D4ED8"), tile(2, labels.returnTask, "C2410C"),
        ])
        counts.spacing = DS.Spacing.sm
        counts.distribution = .fillEqually
        let inner = UIStackView(arrangedSubviews: [headRow, counts])
        inner.axis = .vertical
        inner.spacing = DS.Spacing.md
        card.addSubview(inner)
        inner.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 14, left: 16, bottom: 14, right: 16)) }
        card.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(84) }
        card.isAccessibilityElement = false
        return card
    }

    private func tile(_ number: Int, _ word: String, _ hex: String) -> UIView {
        let value = V2.label("\(number)", size: 22, weight: .bold, color: .white)
        let caption = V2.label(word, size: DS.TextSize.pill, weight: .bold, color: .white)
        let stack = UIStackView(arrangedSubviews: [value, caption])
        stack.axis = .vertical
        stack.isLayoutMarginsRelativeArrangement = true
        stack.layoutMargins = UIEdgeInsets(top: 4, left: 8, bottom: 4, right: 8)
        stack.backgroundColor = UIColor(hexString: hex)
        stack.layer.cornerRadius = 10
        stack.layer.masksToBounds = true
        return stack
    }

    private func step(_ number: Int, _ text: String) -> UIView {
        let badge = V2.label("\(number)", size: DS.TextSize.body, weight: .bold, color: .white)
        badge.textAlignment = .center
        badge.backgroundColor = DS.Color.primary
        badge.layer.cornerRadius = 14
        badge.layer.masksToBounds = true
        badge.snp.makeConstraints { make in make.size.equalTo(28) }
        let label = V2.label(text, size: DS.TextSize.body, lines: 0)
        let row = UIStackView(arrangedSubviews: [badge, label])
        row.alignment = .top
        row.spacing = DS.Spacing.md
        return row
    }

    @objc private func okTapped() {
        dismiss(animated: true)
    }

    @objc private func neverTapped() {
        onNeverAsk?()
        dismiss(animated: true)
    }
}
