//
//  SettingsDetailV2.swift
//  POS ADBD
//
//  Pieces of the Settings detail pages in the new style (#459). The pages opened from Settings v2 set `v2 = true`
//  and build their layout from these; with `newSettings` off the same pages keep their old layout.
//  Same look as the redesigned customer screens (#387): ‹ + 20pt title, grey bands, thin dividers, 52pt fields,
//  14pt-radius buttons.
//

import UIKit
import SnapKit

enum SettingsDetailV2 {
    static func backButton() -> UIButton {
        CustomersV2UI.iconButton("chevron.left", label: "Back".localized(), size: DS.Icon.lg)
    }

    /// ‹ + title (+ trailing views) under the safe area, with a border line below. Returns the line: lay the content under it.
    @discardableResult
    static func installHeader(on view: UIView, title: String, back: UIButton, trailing: [UIView] = []) -> UIView {
        let titleLabel = V2.label(title, size: 20, weight: .bold)
        titleLabel.accessibilityTraits = UIAccessibilityTraitHeader
        titleLabel.setContentHuggingPriority(UILayoutPriority(1), for: .horizontal)
        titleLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        let header = UIStackView(arrangedSubviews: [back, titleLabel] + trailing)
        header.alignment = .center
        header.spacing = 4
        let line = V2.divider()
        line.backgroundColor = DS.Color.border
        [header, line].forEach(view.addSubview)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(8)
            make.leading.equalToSuperview().offset(8)
            make.trailing.equalToSuperview().offset(-8)
            make.height.equalTo(DS.touchTarget)
        }
        line.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom).offset(8)
            make.leading.trailing.equalToSuperview()
        }
        return line
    }

    /// White bar with a top border and the buttons side by side, above the safe area bottom. Returns the bar.
    @discardableResult
    static func installBottomBar(on view: UIView, buttons: [UIButton]) -> UIView {
        let bar = UIView()
        bar.backgroundColor = .white
        let line = V2.divider()
        line.backgroundColor = DS.Color.border
        let stack = UIStackView(arrangedSubviews: buttons)
        stack.spacing = 12
        [line, stack].forEach(bar.addSubview)
        view.addSubview(bar)
        bar.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(view.safeAreaLayoutGuide)
        }
        line.snp.makeConstraints { make in make.top.leading.trailing.equalToSuperview() }
        stack.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalToSuperview().offset(-12)
        }
        return bar
    }

    /// Plain white list with the v2 cell and band headers
    static func configureList(_ table: UITableView) {
        table.backgroundColor = .white
        table.separatorStyle = .none
        table.rowHeight = UITableViewAutomaticDimension
        table.estimatedRowHeight = 52
        table.sectionHeaderTopPadding = 0
        table.sectionHeaderHeight = UITableViewAutomaticDimension
        table.estimatedSectionHeaderHeight = 40
        table.sectionFooterHeight = 0
        table.register(SettingsDetailV2Cell.self, forCellReuseIdentifier: SettingsDetailV2Cell.reuseId)
    }

    /// Input look of the new customer / product forms: 16pt text, 1pt border, 12pt corners, 52pt high
    static func styleInput(_ input: UITextField, enabled: Bool = true) {
        input.font = Utils.regularFont(size: DS.TextSize.input)
        input.textColor = enabled ? DS.Color.text : DS.Color.textMuted
        input.textAlignment = .natural
        input.backgroundColor = enabled ? .white : V2.sectionFill
        input.layer.borderWidth = 1
        input.layer.borderColor = V2.border.cgColor
        input.layer.cornerRadius = 12
        if let padded = input as? RCSimpleTextField {
            // Drops the old leading icon; the field already pads its text by 16
            padded.setLeftIcon(nil)
        } else {
            input.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 14, height: 1))
            input.leftViewMode = .always
        }
        input.rightView = nil
        input.rightViewMode = .never
    }

    /// Bold label over an input. `chevron` marks a field that opens a picker.
    static func field(_ title: String, _ input: UITextField, enabled: Bool = true, chevron: Bool = false) -> UIStackView {
        styleInput(input, enabled: enabled)
        if chevron {
            let icon = UIImageView(image: DS.symbol("chevron.right", DS.Icon.sm))
            icon.tintColor = UIColor(hexString: "94A3B8")
            icon.contentMode = .center
            icon.frame = CGRect(x: 0, y: 0, width: 36, height: 20)
            input.rightView = icon
            input.rightViewMode = .always
        }
        input.accessibilityLabel = title
        // Old fields carry a fixed 50pt height; the new forms use 52
        input.constraints.filter { $0.firstAttribute == .height && $0.firstItem === input && $0.secondItem == nil }
            .forEach { $0.isActive = false }
        input.snp.makeConstraints { make in make.height.equalTo(52) }
        let stack = UIStackView(arrangedSubviews: [label(title), input])
        stack.axis = .vertical
        stack.spacing = 6
        return stack
    }

    /// Bold label over a bordered multi-line text view
    static func textArea(_ title: String, _ textView: UITextView, height: CGFloat = 120) -> UIStackView {
        textView.font = Utils.regularFont(size: DS.TextSize.input)
        textView.textColor = DS.Color.text
        textView.backgroundColor = .white
        textView.layer.borderWidth = 1
        textView.layer.borderColor = V2.border.cgColor
        textView.layer.cornerRadius = 12
        textView.textContainerInset = UIEdgeInsets(top: 12, left: 10, bottom: 12, right: 10)
        textView.accessibilityLabel = title
        textView.snp.makeConstraints { make in make.height.equalTo(height) }
        let stack = UIStackView(arrangedSubviews: [label(title), textView])
        stack.axis = .vertical
        stack.spacing = 6
        return stack
    }

    /// Field label; a `*` in the title is drawn in the danger colour
    static func label(_ title: String) -> UILabel {
        let label = V2.label(title, size: DS.TextSize.body, weight: .bold, lines: 0)
        if let star = title.range(of: "*") {
            let text = NSMutableAttributedString(string: title, attributes: [
                NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.body),
                NSAttributedString.Key.foregroundColor: DS.Color.text,
            ])
            text.addAttribute(NSAttributedString.Key.foregroundColor, value: V2.danger, range: NSRange(star, in: title))
            label.attributedText = text
        }
        return label
    }
}

/// "title ……… value" row with an optional leading icon and a chevron or a check
final class SettingsDetailV2Cell: UITableViewCell {
    enum Accessory { case none, chevron, check }

    static let reuseId = "SettingsDetailV2Cell"
    private let iconView = UIImageView()
    private let titleLabel = V2.label(size: DS.TextSize.body)
    private let valueLabel = V2.label(size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
    private let accessoryIcon = UIImageView()
    private let line = V2.divider()

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        iconView.tintColor = DS.Color.textMuted
        iconView.contentMode = .center
        iconView.snp.makeConstraints { make in make.width.height.equalTo(DS.Icon.md) }
        valueLabel.textAlignment = .right
        titleLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        titleLabel.setContentHuggingPriority(.required, for: .horizontal)
        valueLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        accessoryIcon.contentMode = .center
        accessoryIcon.snp.makeConstraints { make in make.width.height.equalTo(DS.Icon.md) }

        let spacer = UIView()
        spacer.setContentHuggingPriority(UILayoutPriority(1), for: .horizontal)
        let row = UIStackView(arrangedSubviews: [iconView, titleLabel, spacer, valueLabel, accessoryIcon])
        row.spacing = DS.Spacing.md
        row.alignment = .center
        contentView.addSubview(row)
        row.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 8, left: DS.Spacing.lg, bottom: 8, right: DS.Spacing.lg))
            make.height.greaterThanOrEqualTo(36)
        }
        contentView.addSubview(line)
        line.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.trailing.bottom.equalToSuperview()
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func configure(title: String, value: String? = nil, icon: UIImage? = nil, accessory: Accessory = .none, selectable: Bool = false) {
        titleLabel.text = title
        valueLabel.text = value
        valueLabel.isHidden = (value ?? "").isEmpty
        iconView.image = icon
        iconView.isHidden = icon == nil
        switch accessory {
        case .none:
            accessoryIcon.isHidden = true
        case .chevron:
            accessoryIcon.isHidden = false
            accessoryIcon.image = DS.symbol("chevron.right", DS.Icon.sm)
            accessoryIcon.tintColor = UIColor(hexString: "94A3B8")
        case .check:
            accessoryIcon.isHidden = false
            accessoryIcon.image = DS.symbol("checkmark", DS.Icon.md, weight: .semibold)
            accessoryIcon.tintColor = DS.Color.primary
        }
        let tappable = selectable || accessory != .none
        selectionStyle = tappable ? .default : .none
        var traits = tappable ? UIAccessibilityTraitButton : UIAccessibilityTraitStaticText
        if accessory == .check { traits |= UIAccessibilityTraitSelected }
        accessibilityTraits = traits
    }
}

/// User row: initials, name + status pill, email, "role · outlet", ⋯ menu
final class UserV2Cell: UITableViewCell {
    static let reuseId = "UserV2Cell"
    private let avatar = CustomersV2UI.avatar(size: 44, fontSize: DS.TextSize.body)
    private let nameLabel = V2.label(size: DS.TextSize.name, weight: .bold)
    private let statusPill = OrderStatusPillLabel()
    private let emailLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted)
    private let roleLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 2)
    let moreButton = CustomersV2UI.iconButton("ellipsis", label: "More".localized(), size: DS.Icon.md)

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        statusPill.font = Utils.boldFont(size: DS.TextSize.pill)
        statusPill.contentInsets = UIEdgeInsets(top: 2, left: 8, bottom: 2, right: 8)
        statusPill.layer.cornerRadius = 10
        statusPill.clipsToBounds = true
        statusPill.setContentCompressionResistancePriority(.required, for: .horizontal)
        statusPill.setContentHuggingPriority(.required, for: .horizontal)
        nameLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        moreButton.tintColor = DS.Color.textMuted
        moreButton.showsMenuAsPrimaryAction = true

        let nameRow = UIStackView(arrangedSubviews: [nameLabel, statusPill, UIView()])
        nameRow.spacing = 8
        nameRow.alignment = .center
        let texts = UIStackView(arrangedSubviews: [nameRow, emailLabel, roleLabel])
        texts.axis = .vertical
        texts.spacing = DS.Gap.lineTight
        let row = UIStackView(arrangedSubviews: [avatar, texts, moreButton])
        row.spacing = DS.Spacing.md
        row.alignment = .center
        contentView.addSubview(row)
        row.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: DS.Spacing.lg, bottom: 12, right: 4))
        }
        let line = V2.divider()
        contentView.addSubview(line)
        line.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.trailing.bottom.equalToSuperview()
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func bind(user: User, menu: UIMenu) {
        let name = user.fullName ?? user.email ?? "Unknown"
        avatar.text = SettingsV2Logic.initials(name)
        nameLabel.text = name
        nameLabel.textColor = user.isActive ? DS.Color.text : DS.Color.textMuted
        let pill = user.isActive ? DS.Status.done : DS.Status.late
        statusPill.text = user.isActive ? "Active".localized() : "Disabled".localized()
        statusPill.textColor = pill.text
        statusPill.backgroundColor = pill.fill
        emailLabel.text = user.email
        emailLabel.isHidden = (user.email ?? "").isEmpty
        let outlet = (user.outlet?.name).map { String(format: "Outlet: %@".localized(), $0) }
        roleLabel.text = [user.role.displayName, outlet].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ")
        moreButton.menu = menu
    }
}
