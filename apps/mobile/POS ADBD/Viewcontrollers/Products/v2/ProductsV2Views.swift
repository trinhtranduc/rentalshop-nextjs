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
