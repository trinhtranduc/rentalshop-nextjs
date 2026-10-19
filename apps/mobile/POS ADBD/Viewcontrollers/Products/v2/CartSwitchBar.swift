//
//  CartSwitchBar.swift
//  POS ADBD
//
//  #1079 several carts: the bar above the tab bar on Home while 2+ carts are open (avatar, cart name, "N món · total",
//  "Xem giỏ ›"), the round avatar, and the "Giỏ · name · i/n · Đổi ⌄" row on the cart screen.
//

import UIKit
import SnapKit

/// Round avatar of a cart: first letters of the customer, else the cart number (grey)
final class CartAvatarView: UILabel {
    private static let palette = ["1D4ED8", "7C3AED", "0F766E", "EA580C"]

    init(size: CGFloat = 34) {
        super.init(frame: .zero)
        textAlignment = .center
        textColor = .white
        font = Utils.boldFont(size: size * 0.35)
        layer.cornerRadius = size / 2
        clipsToBounds = true
        snp.makeConstraints { make in make.width.height.equalTo(size) }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func configure(cart: Cart) {
        text = CartStore.avatarText(of: cart)
        backgroundColor = cart.customer == nil
            ? UIColor(hexString: "94A3B8")
            : UIColor(hexString: Self.palette[(cart.number - 1) % Self.palette.count])
    }
}

enum CartSwitchText {
    /// "2 món · 520.000"
    static func summary(of cart: Cart) -> String {
        String(format: "cart.multi.summary".localized(), cart.itemCount, MoneyFormatter.format(cart.totalAmount))
    }
}

final class CartSwitchBar: UIView {
    /// #1079: the bar shows with 2+ carts, or with 1 cart that has items (that is how a second cart is started). Never while editing an order.
    static func shouldShow(cartCount: Int, itemCount: Int, isEditMode: Bool) -> Bool {
        !isEditMode && (cartCount > 1 || itemCount > 0)
    }

    var onSwitch: (() -> Void)?
    var onOpen: (() -> Void)?

    private let avatar = CartAvatarView()
    private let nameLabel = V2.label(size: DS.TextSize.body, weight: .bold)
    private let summaryLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted)
    private let openButton = UIButton(type: .system)

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .white
        layer.cornerRadius = 16
        layer.borderWidth = 1
        layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        layer.shadowColor = UIColor(hexString: "0F172A").cgColor
        layer.shadowOpacity = 0.2
        layer.shadowRadius = 9
        layer.shadowOffset = CGSize(width: 0, height: 4)
        accessibilityIdentifier = "cart.switchBar"

        let chevron = UIImageView(image: DS.symbol("chevron.down", 11, weight: .semibold))
        chevron.tintColor = DS.Color.textMuted
        chevron.setContentHuggingPriority(.required, for: .horizontal)
        nameLabel.lineBreakMode = .byTruncatingTail
        let nameRow = UIStackView(arrangedSubviews: [nameLabel, chevron])
        nameRow.spacing = 4
        nameRow.alignment = .center
        let texts = UIStackView(arrangedSubviews: [nameRow, summaryLabel])
        texts.axis = .vertical
        texts.spacing = 2
        texts.isUserInteractionEnabled = false

        let switchArea = UIControl()
        switchArea.accessibilityIdentifier = "cart.switchBar.switch"
        switchArea.addTarget(self, action: #selector(switchTapped), for: .touchUpInside)
        [avatar, texts].forEach(switchArea.addSubview)
        avatar.isUserInteractionEnabled = false
        avatar.snp.makeConstraints { make in
            make.leading.centerY.equalToSuperview()
        }
        texts.snp.makeConstraints { make in
            make.leading.equalTo(avatar.snp.trailing).offset(9)
            make.trailing.lessThanOrEqualToSuperview()
            make.top.bottom.equalToSuperview()
        }

        openButton.setTitle("cart.multi.view".localized() + " ›", for: .normal)
        openButton.setTitleColor(.white, for: .normal)
        openButton.titleLabel?.font = Utils.boldFont(size: 13.5)
        openButton.backgroundColor = DS.Color.primary
        openButton.layer.cornerRadius = 11
        openButton.contentEdgeInsets = UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12)
        openButton.setContentHuggingPriority(.required, for: .horizontal)
        openButton.setContentCompressionResistancePriority(.required, for: .horizontal)
        openButton.accessibilityIdentifier = "cart.switchBar.open"
        openButton.addTarget(self, action: #selector(openTapped), for: .touchUpInside)

        [switchArea, openButton].forEach(addSubview)
        openButton.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-8)
            make.centerY.equalToSuperview()
        }
        switchArea.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(10)
            make.top.bottom.equalToSuperview().inset(8)
            make.trailing.equalTo(openButton.snp.leading).offset(-9)
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func configure(cart: Cart) {
        avatar.configure(cart: cart)
        nameLabel.text = CartStore.title(of: cart)
        summaryLabel.text = CartSwitchText.summary(of: cart)
        accessibilityLabel = CartStore.title(of: cart)
    }

    @objc private func switchTapped() { onSwitch?() }
    @objc private func openTapped() { onOpen?() }
}

/// Top row of the cart screen while 2+ carts are open: "Giỏ  Nguyễn Thị Mai  1/3  Đổi ⌄"
final class CartSwitchRow: UIControl {
    init(cart: Cart, position: Int, total: Int) {
        super.init(frame: .zero)
        backgroundColor = V2.sectionFill
        accessibilityIdentifier = "cart.switchRow"
        let caption = V2.label("cart.multi.row.label".localized(), size: DS.TextSize.secondary, color: DS.Color.textMuted)
        let name = V2.label(CartStore.title(of: cart), size: DS.TextSize.body, weight: .bold)
        name.lineBreakMode = .byTruncatingTail
        name.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        let count = V2.label("\(position)/\(total)", size: DS.TextSize.secondary, color: DS.Color.textMuted)
        let change = V2.label("cart.multi.change".localized() + " ⌄", size: DS.TextSize.body, weight: .bold, color: DS.Color.primary)
        let row = UIStackView(arrangedSubviews: [caption, name, UIView(), count, change])
        row.spacing = 8
        row.alignment = .center
        row.isUserInteractionEnabled = false
        addSubview(row)
        row.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.top.bottom.equalToSuperview().inset(8)
            make.height.greaterThanOrEqualTo(28)
        }
        accessibilityLabel = CartStore.title(of: cart)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}
