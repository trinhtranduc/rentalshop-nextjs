//
//  ProductsV2Views.swift
//  POS ADBD
//
//  Small views shared by the redesigned products and cart screens (#373).
//

import UIKit
import SnapKit
import Kingfisher

enum V2 {
    static let border = UIColor(hexString: "CBD5E1")
    static let chipFill = UIColor(hexString: "F1F5F9")
    static let sectionFill = UIColor(hexString: "F8FAFC")
    static let ok = UIColor(hexString: "047857")
    static let warn = UIColor(hexString: "9A3412")
    static let danger = UIColor(hexString: "B91C1C")

    static func label(_ text: String? = nil, size: CGFloat, weight: UIFont.Weight = .regular,
                      color: UIColor = DS.Color.text, lines: Int = 1) -> UILabel {
        let label = UILabel()
        label.text = text
        switch weight {
        case .bold, .semibold, .heavy, .black: label.font = Utils.boldFont(size: size)
        case .medium: label.font = Utils.mediumFont(size: size)
        default: label.font = Utils.regularFont(size: size)
        }
        label.textColor = color
        label.numberOfLines = lines
        return label
    }

    /// Grey band with an upper-case title ("GIÁ", "KHO", "TIỀN")
    static func sectionHeader(_ title: String, trailing: UIView? = nil) -> UIView {
        let view = UIView()
        view.backgroundColor = sectionFill
        let top = UIView()
        top.backgroundColor = DS.Color.background
        view.addSubview(top)
        top.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview()
            make.height.equalTo(8)
        }
        let label = V2.label(title.uppercased(), size: DS.TextSize.secondary, weight: .bold, color: DS.Color.textMuted)
        view.addSubview(label)
        label.snp.makeConstraints { make in
            make.top.equalTo(top.snp.bottom).offset(10)
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.bottom.equalToSuperview().offset(-6)
        }
        if let trailing {
            view.addSubview(trailing)
            trailing.snp.makeConstraints { make in
                make.centerY.equalTo(label)
                make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
            }
        }
        return view
    }

    static func divider() -> UIView {
        let view = UIView()
        view.backgroundColor = DS.Color.divider
        view.snp.makeConstraints { make in make.height.equalTo(1) }
        return view
    }

    static func primaryButton(_ title: String) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.setTitleColor(.white, for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        button.backgroundColor = DS.Color.primary
        button.layer.cornerRadius = 14
        button.contentEdgeInsets = UIEdgeInsets(top: 0, left: 24, bottom: 0, right: 24)
        button.snp.makeConstraints { make in make.height.equalTo(52) }
        return button
    }

    static func secondaryButton(_ title: String) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.setTitleColor(DS.Color.text, for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        button.layer.cornerRadius = 14
        button.layer.borderWidth = 1
        button.layer.borderColor = border.cgColor
        button.snp.makeConstraints { make in make.height.equalTo(52) }
        return button
    }

    static func setImage(_ imageView: UIImageView, url: String?) {
        imageView.kf.cancelDownloadTask()
        imageView.image = nil
        guard let url, let link = URL(string: url) else { return }
        imageView.kf.setImage(with: link, options: [.transition(.fade(0.1))])
    }

    /// Image well with a hanger glyph shown until a photo loads
    static func thumbnail(size: CGFloat, radius: CGFloat) -> UIImageView {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.layer.cornerRadius = radius
        imageView.backgroundColor = chipFill
        imageView.tintColor = DS.Color.textMuted
        imageView.snp.makeConstraints { make in make.width.height.equalTo(size) }
        return imageView
    }

    static let placeholder = UIImage(systemName: "tshirt")

    /// Full-screen form over the current screen. `.overFullScreen` keeps the presenter in place, so a pushed
    /// screen's hidden tab bar does not come back after the form closes.
    static func presentForm(_ controller: UIViewController, from presenter: UIViewController) {
        let nav = UINavigationController(rootViewController: controller)
        nav.setNavigationBarHidden(true, animated: false)
        nav.modalPresentationStyle = .overFullScreen
        presenter.present(nav, animated: true)
    }
}

/// Card-like pill toggle: "Theo lần | Theo ngày", "Thuê | Bán"
final class V2Segmented: UIControl {
    private let stack = UIStackView()
    private var buttons: [UIButton] = []
    private let compact: Bool
    private(set) var selectedIndex = 0

    init(titles: [String], compact: Bool = false) {
        self.compact = compact
        super.init(frame: .zero)
        backgroundColor = V2.chipFill
        layer.cornerRadius = compact ? 9 : 10
        stack.axis = .horizontal
        stack.distribution = .fillEqually
        stack.spacing = 0
        addSubview(stack)
        stack.snp.makeConstraints { make in make.edges.equalToSuperview().inset(3) }
        for (index, title) in titles.enumerated() {
            let button = UIButton(type: .custom)
            button.setTitle(title, for: .normal)
            button.titleLabel?.font = Utils.mediumFont(size: compact ? DS.TextSize.secondary : DS.TextSize.body)
            button.layer.cornerRadius = compact ? 7 : 8
            button.tag = index
            button.contentEdgeInsets = UIEdgeInsets(top: 0, left: compact ? 10 : 16, bottom: 0, right: compact ? 10 : 16)
            button.addTarget(self, action: #selector(tapped(_:)), for: .touchUpInside)
            button.snp.makeConstraints { make in make.height.equalTo(compact ? 30 : 36) }
            stack.addArrangedSubview(button)
            buttons.append(button)
        }
        select(0)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func select(_ index: Int) {
        selectedIndex = index
        for button in buttons {
            let on = button.tag == index
            button.backgroundColor = on ? .white : .clear
            button.setTitleColor(on ? DS.Color.text : DS.Color.textMuted, for: .normal)
            button.titleLabel?.font = on ? Utils.boldFont(size: compact ? DS.TextSize.secondary : DS.TextSize.body) : Utils.regularFont(size: compact ? DS.TextSize.secondary : DS.TextSize.body)
            button.layer.shadowColor = UIColor.black.cgColor
            button.layer.shadowOpacity = on ? 0.08 : 0
            button.layer.shadowRadius = 1
            button.layer.shadowOffset = CGSize(width: 0, height: 1)
            button.accessibilityTraits = on ? UIAccessibilityTraitButton | UIAccessibilityTraitSelected : UIAccessibilityTraitButton
        }
    }

    @objc private func tapped(_ sender: UIButton) {
        guard sender.tag != selectedIndex else { return }
        select(sender.tag)
        sendActions(for: .valueChanged)
    }
}

/// − n + stepper
final class V2Stepper: UIView {
    private let minus = UIButton(type: .system)
    private let plus = UIButton(type: .system)
    private let valueLabel = V2.label(size: DS.TextSize.name, weight: .bold)
    var minimum = 0
    var value = 1 { didSet { valueLabel.text = "\(value)"; minus.isEnabled = value > minimum } }
    var onChange: ((Int) -> Void)?

    init(compact: Bool = false) {
        super.init(frame: .zero)
        layer.cornerRadius = 10
        layer.borderWidth = 1
        layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        for (button, title, label) in [(minus, "−", "products.stepper.minus"), (plus, "+", "products.stepper.plus")] {
            button.setTitle(title, for: .normal)
            button.setTitleColor(DS.Color.text, for: .normal)
            button.titleLabel?.font = Utils.regularFont(size: 20)
            button.accessibilityLabel = label.localized()
        }
        valueLabel.textAlignment = .center
        let stack = UIStackView(arrangedSubviews: [minus, valueLabel, plus])
        stack.axis = .horizontal
        addSubview(stack)
        stack.snp.makeConstraints { make in make.edges.equalToSuperview() }
        minus.snp.makeConstraints { make in make.width.equalTo(44); make.height.equalTo(compact ? 36 : 40) }
        plus.snp.makeConstraints { make in make.width.equalTo(44) }
        valueLabel.snp.makeConstraints { make in make.width.greaterThanOrEqualTo(28) }
        minus.addTarget(self, action: #selector(step(_:)), for: .touchUpInside)
        plus.addTarget(self, action: #selector(step(_:)), for: .touchUpInside)
        value = 1
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    @objc private func step(_ sender: UIButton) {
        let next = sender === plus ? value + 1 : max(minimum, value - 1)
        guard next != value else { return }
        value = next
        onChange?(next)
    }
}

/// Tappable row "title ……… value ›"
final class V2ValueRow: UIControl {
    let titleLabel = V2.label(size: DS.TextSize.body)
    let valueLabel = V2.label(size: DS.TextSize.body, color: DS.Color.textMuted)

    init(title: String, chevron: Bool = true) {
        super.init(frame: .zero)
        titleLabel.text = title
        valueLabel.textAlignment = .right
        addSubview(titleLabel)
        addSubview(valueLabel)
        let arrow = UIImageView(image: DS.symbol("chevron.right", 16))
        arrow.tintColor = UIColor(hexString: "94A3B8")
        arrow.contentMode = .center
        arrow.isHidden = !chevron
        addSubview(arrow)
        snp.makeConstraints { make in make.height.greaterThanOrEqualTo(48) }
        titleLabel.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.centerY.equalToSuperview()
        }
        arrow.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(chevron ? 16 : 0)
        }
        valueLabel.snp.makeConstraints { make in
            make.leading.greaterThanOrEqualTo(titleLabel.snp.trailing).offset(DS.Spacing.sm)
            make.trailing.equalTo(arrow.snp.leading).offset(chevron ? -6 : 0)
            make.centerY.equalToSuperview()
        }
        titleLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        isAccessibilityElement = true
        accessibilityTraits = UIAccessibilityTraitButton
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override var accessibilityLabel: String? {
        get { [titleLabel.text, valueLabel.text].compactMap { $0 }.joined(separator: ", ") }
        set {}
    }

    override var isHighlighted: Bool {
        didSet { backgroundColor = isHighlighted ? V2.chipFill : .clear }
    }
}

/// Number and phone pads have no return key (#461): a "Xong" bar above the keyboard ends editing
enum KeyboardDoneBar {
    static func attach(_ fields: [UITextField]) {
        fields.forEach { field in
            let bar = UIToolbar(frame: CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: 44))
            let done = UIBarButtonItem(title: "Done".localized(), style: .done, target: field,
                                       action: #selector(UIResponder.resignFirstResponder))
            done.tintColor = DS.Color.primary
            bar.items = [UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil), done]
            bar.sizeToFit()
            field.inputAccessoryView = bar
        }
    }
}

// MARK: - Create order sheets (#476, boards Gio-hang-xac-nhan, Gio-hang-da-tao)

/// Bottom sheet as tall as its content: grabber, 24pt top radius
class V2FittingSheet: UIViewController {
    let stack = UIStackView()

    init() {
        super.init(nibName: nil, bundle: nil)
        if let sheet = sheetPresentationController {
            sheet.detents = [.medium()]
            if #available(iOS 16.0, *) {
                sheet.detents = [.custom { [weak self] context in
                    guard let self else { return nil }
                    return min(context.maximumDetentValue, self.fittingHeight())
                }]
            }
            sheet.prefersGrabberVisible = true
            sheet.preferredCornerRadius = 24
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface
        stack.axis = .vertical
        stack.spacing = 14
        view.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(28)
            make.leading.trailing.equalToSuperview().inset(20)
        }
    }

    private func fittingHeight() -> CGFloat {
        loadViewIfNeeded()
        let width = (view.bounds.width > 0 ? view.bounds.width : UIScreen.main.bounds.width) - 40
        let size = stack.systemLayoutSizeFitting(CGSize(width: width, height: 0),
                                                 withHorizontalFittingPriority: .required,
                                                 verticalFittingPriority: .fittingSizeLevel)
        return 28 + size.height + 24
    }

    static func buttons(cancel: UIButton, confirm: UIButton, confirmRatio: CGFloat) -> UIStackView {
        [cancel, confirm].forEach { button in button.snp.remakeConstraints { make in make.height.equalTo(50) } }
        let row = UIStackView(arrangedSubviews: [cancel, confirm])
        row.spacing = 10
        // After both are in the row: a width constraint needs a common ancestor
        confirm.snp.makeConstraints { make in make.width.equalTo(cancel).multipliedBy(confirmRatio) }
        return row
    }
}

/// "Tạo đơn thuê?" / "Bán & thu tiền?" — Hủy / Tạo đơn
final class CreateOrderConfirmSheet: V2FittingSheet {
    var onConfirm: (() -> Void)?
    private let confirm: CreateOrderConfirm
    private let confirmButton: UIButton

    init(confirm: CreateOrderConfirm) {
        self.confirm = confirm
        confirmButton = V2.primaryButton((confirm.isSale ? "products.cart.sellAndCollect" : "products.cart.create").localized())
        super.init()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        stack.addArrangedSubview(V2.label(confirm.titleKey.localized(), size: 20, weight: .bold, lines: 0))

        let rows = UIStackView()
        rows.axis = .vertical
        rows.spacing = 2
        rows.addArrangedSubview(row("products.cart.confirm.customer".localized(), confirm.customer))
        if let range = confirm.range, let days = confirm.days {
            rows.addArrangedSubview(row("products.cart.confirm.dates".localized(),
                                        range + " · " + PluralText.format("products.cart.days", count: days, days)))
        }
        rows.addArrangedSubview(row("products.cart.confirm.items".localized(), confirm.items))
        rows.addArrangedSubview(row("products.cart.total".localized(), MoneyFormatter.format(confirm.total), bold: true))
        stack.addArrangedSubview(rows)

        let collect = UIView()
        collect.backgroundColor = UIColor(hexString: "EFF6FF")
        collect.layer.cornerRadius = 14
        let navy = UIColor(hexString: "1E3A8A")
        let collectLabel = V2.label(confirm.collectKey.localized(), size: DS.TextSize.body, color: navy)
        let collectAmount = V2.label(MoneyFormatter.format(confirm.collect), size: 22, weight: .bold, color: navy)
        collectAmount.setContentCompressionResistancePriority(.required, for: .horizontal)
        [collectLabel, collectAmount].forEach(collect.addSubview)
        collectLabel.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(14)
            make.centerY.equalToSuperview()
        }
        collectAmount.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-14)
            make.top.bottom.equalToSuperview().inset(12)
            make.leading.greaterThanOrEqualTo(collectLabel.snp.trailing).offset(8)
        }
        collect.isAccessibilityElement = true
        collect.accessibilityLabel = [collectLabel.text, collectAmount.text].compactMap { $0 }.joined(separator: " ")
        stack.addArrangedSubview(collect)

        let cancel = V2.secondaryButton("Cancel".localized())
        cancel.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        confirmButton.addTarget(self, action: #selector(confirmTapped), for: .touchUpInside)
        confirmButton.accessibilityIdentifier = "cart.confirm.create"
        let buttons = V2FittingSheet.buttons(cancel: cancel, confirm: confirmButton, confirmRatio: 1.6)
        stack.setCustomSpacing(16, after: collect)
        stack.addArrangedSubview(buttons)
    }

    /// Greyed while the create is on its way; swipe-down is blocked too
    func setBusy(_ busy: Bool) {
        confirmButton.isEnabled = !busy
        confirmButton.alpha = busy ? 0.6 : 1
        isModalInPresentation = busy
    }

    private func row(_ title: String, _ value: String, bold: Bool = false) -> UIView {
        let titleLabel = V2.label(title, size: DS.TextSize.body, color: DS.Color.textMuted)
        titleLabel.setContentHuggingPriority(.required, for: .horizontal)
        titleLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        let valueLabel = V2.label(value, size: DS.TextSize.body, weight: bold ? .semibold : .regular, lines: 0)
        valueLabel.textAlignment = .right
        let row = UIStackView(arrangedSubviews: [titleLabel, valueLabel])
        row.alignment = .firstBaseline
        row.spacing = 12
        row.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(30) }
        row.isAccessibilityElement = true
        row.accessibilityLabel = title + ", " + value
        return row
    }

    @objc private func cancelTapped() {
        dismiss(animated: true)
    }

    @objc private func confirmTapped() {
        onConfirm?()
    }
}

/// "Đã tạo đơn #0063" — Tạo đơn mới / Xem đơn
final class OrderCreatedSheet: V2FittingSheet {
    var onNewOrder: (() -> Void)?
    var onViewOrder: (() -> Void)?
    private let summary: CreatedOrderSummary

    init(summary: CreatedOrderSummary) {
        self.summary = summary
        super.init()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        stack.alignment = .center
        stack.spacing = 12

        let check = UIImageView(image: DS.symbol("checkmark", 28, weight: .bold))
        check.tintColor = V2.ok
        check.contentMode = .center
        check.backgroundColor = UIColor(hexString: "D1FAE5")
        check.layer.cornerRadius = 28
        check.snp.makeConstraints { make in make.width.height.equalTo(56) }
        stack.addArrangedSubview(check)

        let title = V2.label(String(format: "products.cart.created.title".localized(), summary.shortNumber), size: 20, weight: .bold, lines: 0)
        title.textAlignment = .center
        stack.addArrangedSubview(title)

        let paid = String(format: summary.paidKey.localized(), MoneyFormatter.format(summary.paid))
        let detail = V2.label(summary.subtitle + "\n" + paid, size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
        detail.textAlignment = .center
        stack.addArrangedSubview(detail)

        let newOrder = V2.secondaryButton("products.cart.created.newOrder".localized())
        newOrder.addTarget(self, action: #selector(newOrderTapped), for: .touchUpInside)
        let viewOrder = V2.primaryButton("products.cart.created.viewOrder".localized())
        viewOrder.addTarget(self, action: #selector(viewOrderTapped), for: .touchUpInside)
        let buttons = V2FittingSheet.buttons(cancel: newOrder, confirm: viewOrder, confirmRatio: 1)
        stack.setCustomSpacing(18, after: detail)
        stack.addArrangedSubview(buttons)
        buttons.snp.makeConstraints { make in make.width.equalTo(stack) }
    }

    @objc private func newOrderTapped() {
        dismiss(animated: true) { [onNewOrder] in onNewOrder?() }
    }

    @objc private func viewOrderTapped() {
        dismiss(animated: true) { [onViewOrder] in onViewOrder?() }
    }
}
