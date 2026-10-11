//
//  OutletHeaderButton.swift
//  POS ADBD
//
//  #828: the small line above the Home title. A merchant with two or more active branches gets "🏬 <branch> ▾"
//  (soft blue pill when not the default branch) that opens the branch sheet; everyone else sees the branch name,
//  not tappable. The only place the app shows and changes the branch (owner: Home only; Orders, Calendar and
//  Overview just follow the choice).
//

import UIKit
import SnapKit

final class OutletHeaderButton: UIControl {
    static let accessibilityId = "outlet.header.button"

    private static let pillFill = UIColor(hexString: "EFF6FF")
    private static let plainColor = UIColor(hexString: "64748B")
    private static let pillHeight: CGFloat = 32

    /// Shows the sheet; set by the screen that hosts the button
    weak var presenter: UIViewController?

    private let pill = UIView()
    private let icon = UIImageView()
    private let nameLabel = UILabel()
    private let chevron = UIImageView()
    private var leadingInset: Constraint?
    private(set) var mode: OutletHeaderMode = .hidden

    override init(frame: CGRect) {
        super.init(frame: frame)
        pill.isUserInteractionEnabled = false
        pill.layer.cornerRadius = Self.pillHeight / 2
        icon.image = DS.symbol("storefront", 16, weight: .semibold)
        icon.contentMode = .center
        chevron.image = DS.symbol("chevron.down", 14, weight: .bold)
        chevron.contentMode = .center
        nameLabel.lineBreakMode = .byTruncatingTail
        nameLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [icon, nameLabel, chevron])
        row.spacing = 4
        row.alignment = .center
        row.isUserInteractionEnabled = false
        addSubview(pill)
        pill.addSubview(row)
        icon.snp.makeConstraints { make in make.size.equalTo(16) }
        chevron.snp.makeConstraints { make in make.size.equalTo(16) }
        // Board: 32 pt pill; the control is 44 pt tall so the touch target meets the 44 pt minimum
        snp.makeConstraints { make in make.height.equalTo(DS.touchTarget) }
        pill.snp.makeConstraints { make in
            make.leading.equalToSuperview()
            make.trailing.lessThanOrEqualToSuperview()
            make.centerY.equalToSuperview()
            make.height.equalTo(Self.pillHeight)
        }
        row.snp.makeConstraints { make in
            leadingInset = make.leading.equalToSuperview().constraint
            make.trailing.equalToSuperview().offset(-10)
            make.centerY.equalToSuperview()
        }
        accessibilityIdentifier = Self.accessibilityId
        isAccessibilityElement = true
        addTarget(self, action: #selector(tapped), for: .touchUpInside)
        NotificationCenter.default.addObserver(self, selector: #selector(refresh), name: .currentOutletDidChange, object: nil)
        refresh()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    /// Re-reads the current branch (also called by hosts on appear)
    @objc func refresh() {
        apply(CurrentOutlet.shared.headerMode)
    }

    func apply(_ mode: OutletHeaderMode) {
        self.mode = mode
        switch mode {
        case .hidden:
            isHidden = true
            isEnabled = false
        case .plain(let name):
            isHidden = false
            isEnabled = false
            nameLabel.text = name
            nameLabel.font = Utils.regularFont(size: DS.TextSize.secondary)
            nameLabel.textColor = Self.plainColor
            icon.tintColor = Self.plainColor
            chevron.isHidden = true
            pill.backgroundColor = .clear
            leadingInset?.update(offset: 0)
            accessibilityLabel = String(format: "outlet.header.accessibility".localized(), name)
            accessibilityTraits = UIAccessibilityTraitStaticText
            accessibilityHint = nil
        case .button(let name, let highlighted):
            isHidden = false
            isEnabled = true
            nameLabel.text = name
            nameLabel.font = Utils.boldFont(size: DS.TextSize.secondary)
            nameLabel.textColor = DS.Color.primary
            icon.tintColor = DS.Color.primary
            chevron.isHidden = false
            chevron.tintColor = DS.Color.primary
            pill.backgroundColor = highlighted ? Self.pillFill : .clear
            leadingInset?.update(offset: highlighted ? 10 : 0)
            accessibilityLabel = String(format: "outlet.header.accessibility".localized(), name)
            accessibilityTraits = UIAccessibilityTraitButton
            accessibilityHint = "outlet.header.hint".localized()
        }
    }

    override var isHighlighted: Bool {
        didSet { pill.alpha = isHighlighted ? 0.6 : 1 }
    }

    @objc private func tapped() {
        guard case .button = mode, let presenter else { return }
        OutletSwitcher.presentPicker(from: presenter)
    }
}

/// Opens the branch sheet and applies the choice (asks before it drops a cart with lines)
enum OutletSwitcher {
    static func presentPicker(from presenter: UIViewController) {
        let current = CurrentOutlet.shared
        guard current.canSwitch, let currentId = current.id else { return }
        let sheet = OutletPickerSheet(outlets: current.outlets, currentId: currentId)
        sheet.onChoose = { [weak presenter] outlet in
            guard let presenter else { return }
            choose(outlet, from: presenter)
        }
        presenter.present(sheet, animated: true)
        // The list may have changed on the web; the sheet shows the cached one meanwhile
        current.refresh(onFallback: { name in showFallback(name, from: presenter) })
    }

    static func choose(_ outlet: Outlet, from presenter: UIViewController) {
        let current = CurrentOutlet.shared
        guard outlet.id != current.id else { return }
        let cart = CartStore.shared.cart
        guard CurrentOutletLogic.needsCartConfirm(itemCount: cart.itemCount) else {
            current.select(outlet.id)
            return
        }
        let title = String(format: "outlet.switch.confirm.title".localized(), outlet.name)
        let message = PluralText.format("outlet.switch.confirm.message", count: cart.itemCount,
                                        cart.itemCount, current.name ?? "")
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "outlet.switch.confirm.cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "outlet.switch.confirm.ok".localized(), style: .destructive) { _ in
            CartStore.shared.resetCart()
            current.select(outlet.id)
        })
        alert.view.accessibilityIdentifier = "outlet.switch.confirm"
        presenter.present(alert, animated: true)
    }

    /// The remembered branch was turned off: the app is back on the default; told once
    static func showFallback(_ defaultName: String, from presenter: UIViewController) {
        var top: UIViewController = presenter
        while let presented = top.presentedViewController, !presented.isBeingDismissed { top = presented }
        let alert = UIAlertController(title: "outlet.fallback.title".localized(),
                                      message: String(format: "outlet.fallback.message".localized(), defaultName),
                                      preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
        top.present(alert, animated: true)
    }
}
