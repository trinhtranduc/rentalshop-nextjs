//
//  CustomersV2Views.swift
//  POS ADBD
//
//  Small views shared by the redesigned customer screens (#387).
//

import UIKit
import SnapKit

enum CustomersV2UI {
    static let avatarText = UIColor(hexString: "1E40AF")
    static let avatarFill = UIColor(hexString: "DBEAFE")

    /// Round initials badge
    static func avatar(size: CGFloat, fontSize: CGFloat) -> UILabel {
        let label = V2.label(size: fontSize, weight: .bold, color: avatarText)
        label.textAlignment = .center
        label.backgroundColor = avatarFill
        label.layer.cornerRadius = size / 2
        label.clipsToBounds = true
        label.isAccessibilityElement = false
        label.snp.makeConstraints { make in make.width.height.equalTo(size) }
        return label
    }

    /// Orange tier pill ("Vàng"); hidden when there is no tier
    static func tierPill() -> OrderStatusPillLabel {
        let pill = OrderStatusPillLabel()
        pill.font = Utils.boldFont(size: 12)
        pill.contentInsets = UIEdgeInsets(top: 2, left: 8, bottom: 2, right: 8)
        pill.textColor = DS.Status.waiting.text
        pill.backgroundColor = DS.Status.waiting.fill
        pill.layer.cornerRadius = 10
        pill.setContentCompressionResistancePriority(.required, for: .horizontal)
        return pill
    }

    static func setTier(_ pill: OrderStatusPillLabel, _ tier: String?) {
        pill.text = tier
        pill.isHidden = tier == nil
    }

    /// Grey rounded search field with a magnifier, 48pt high
    static func searchBox(_ field: UITextField, placeholder: String) -> UIView {
        let box = UIView()
        box.backgroundColor = V2.chipFill
        box.layer.cornerRadius = 12
        let glass = UIImageView(image: UIImage(systemName: "magnifyingglass"))
        glass.tintColor = DS.Color.textMuted
        field.placeholder = placeholder
        field.font = Utils.regularFont(size: 16)
        field.clearButtonMode = .whileEditing
        field.returnKeyType = .search
        field.autocorrectionType = .no
        field.accessibilityLabel = "customers.v2.search".localized()
        [glass, field].forEach(box.addSubview)
        glass.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(12)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(18)
        }
        field.snp.makeConstraints { make in
            make.leading.equalTo(glass.snp.trailing).offset(8)
            make.trailing.equalToSuperview().offset(-8)
            make.top.bottom.equalToSuperview()
        }
        box.snp.makeConstraints { make in make.height.equalTo(48) }
        return box
    }

    static func iconButton(_ systemName: String, label: String, pointSize: CGFloat = 18) -> UIButton {
        let button = UIButton(type: .system)
        button.setImage(UIImage(systemName: systemName, withConfiguration: UIImage.SymbolConfiguration(pointSize: pointSize, weight: .bold)), for: .normal)
        button.tintColor = DS.Color.text
        button.accessibilityLabel = label
        button.snp.makeConstraints { make in make.width.height.equalTo(DS.touchTarget) }
        return button
    }

    static func textButton(_ title: String, color: UIColor = DS.Color.textMuted) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.setTitleColor(color, for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: 15)
        button.contentEdgeInsets = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 12)
        button.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(DS.touchTarget) }
        return button
    }
}

/// Customer row: initials, name + tier, "masked phone · N đơn", optional chevron
final class CustomerV2Cell: UITableViewCell {
    static let reuseId = "CustomerV2Cell"
    private let avatar = CustomersV2UI.avatar(size: 44, fontSize: 15)
    private let nameLabel = V2.label(size: 16, weight: .bold)
    private let tierPill = CustomersV2UI.tierPill()
    private let subtitleLabel = V2.label(size: 13, color: DS.Color.textMuted)
    private let chevron = UIImageView(image: UIImage(systemName: "chevron.right", withConfiguration: UIImage.SymbolConfiguration(pointSize: 13, weight: .semibold)))

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .default
        chevron.tintColor = UIColor(hexString: "94A3B8")
        chevron.setContentHuggingPriority(.required, for: .horizontal)
        nameLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        let nameRow = UIStackView(arrangedSubviews: [nameLabel, tierPill])
        nameRow.spacing = 6
        nameRow.alignment = .center
        let texts = UIStackView(arrangedSubviews: [nameRow, subtitleLabel])
        texts.axis = .vertical
        texts.spacing = 2
        texts.alignment = .leading
        let row = UIStackView(arrangedSubviews: [avatar, texts, chevron])
        row.spacing = 12
        row.alignment = .center
        contentView.addSubview(row)
        row.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.top.bottom.equalToSuperview().inset(10)
        }
        let line = V2.divider()
        contentView.addSubview(line)
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        contentView.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(64) }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func configure(_ customer: Customer, showsChevron: Bool) {
        let name = CustomersV2Logic.displayName(customer)
        avatar.text = CustomersV2Logic.initials(name)
        nameLabel.text = name
        let tier = CustomersV2Logic.tierName(customer)
        CustomersV2UI.setTier(tierPill, tier)
        let subtitle = CustomersV2Logic.subtitle(phone: customer.phone, orderCount: customer.orderCount)
        subtitleLabel.text = subtitle
        chevron.isHidden = !showsChevron
        isAccessibilityElement = true
        accessibilityTraits = UIAccessibilityTraitButton
        accessibilityLabel = [name, tier, subtitle].compactMap { $0 }.joined(separator: ", ")
    }
}

/// "Khách mới" row of the picker: dashed blue circle with +
final class NewCustomerRowCell: UITableViewCell {
    static let reuseId = "NewCustomerRowCell"
    private let circle = UIView()
    private let dash = CAShapeLayer()

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        dash.strokeColor = DS.Color.primary.cgColor
        dash.fillColor = UIColor.clear.cgColor
        dash.lineWidth = 1.5
        dash.lineDashPattern = [4, 3]
        circle.layer.addSublayer(dash)
        let plus = UIImageView(image: UIImage(systemName: "plus", withConfiguration: UIImage.SymbolConfiguration(pointSize: 16, weight: .bold)))
        plus.tintColor = DS.Color.primary
        circle.addSubview(plus)
        plus.snp.makeConstraints { make in make.center.equalToSuperview() }
        let title = V2.label("customers.v2.new".localized(), size: 16, weight: .bold, color: DS.Color.primary)
        let band = UIView()
        band.backgroundColor = DS.Color.background
        [circle, title, band].forEach(contentView.addSubview)
        circle.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.top.equalToSuperview().offset(8)
            make.width.height.equalTo(44)
        }
        title.snp.makeConstraints { make in
            make.leading.equalTo(circle.snp.trailing).offset(12)
            make.centerY.equalTo(circle)
        }
        band.snp.makeConstraints { make in
            make.top.equalTo(circle.snp.bottom).offset(8)
            make.leading.trailing.bottom.equalToSuperview()
            make.height.equalTo(8)
        }
        isAccessibilityElement = true
        accessibilityTraits = UIAccessibilityTraitButton
        accessibilityLabel = "customers.v2.new".localized()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        dash.frame = circle.bounds
        dash.path = UIBezierPath(ovalIn: circle.bounds.insetBy(dx: 0.75, dy: 0.75)).cgPath
    }
}

/// Upper-case muted label on white ("GẦN ĐÂY")
final class CustomersV2SectionLabel: UITableViewHeaderFooterView {
    static let reuseId = "CustomersV2SectionLabel"
    let titleLabel = V2.label(size: 13, weight: .bold, color: DS.Color.textMuted)

    override init(reuseIdentifier: String?) {
        super.init(reuseIdentifier: reuseIdentifier)
        var background = UIBackgroundConfiguration.clear()
        background.backgroundColor = .white
        backgroundConfiguration = background
        contentView.addSubview(titleLabel)
        titleLabel.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.top.equalToSuperview().offset(12)
            make.bottom.equalToSuperview().offset(-4)
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
