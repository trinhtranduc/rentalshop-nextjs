//
//  CartPickerSheet.swift
//  POS ADBD
//
//  #1079 "Chọn giỏ": the open carts (avatar, name, type · items · total), ✓ on the one in use, "+ Giỏ mới",
//  swipe a row to delete it (always asks first). Opened from the Home bar and from the cart screen.
//

import UIKit
import SnapKit

final class CartPickerSheet: UIViewController, UITableViewDataSource, UITableViewDelegate {
    private let table = UITableView(frame: .zero, style: .plain)
    private let newButton = UIButton(type: .system)
    private let countLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted)

    private var store: CartStore { CartStore.shared }

    init() {
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .pageSheet
        if let sheet = sheetPresentationController {
            sheet.detents = [.medium(), .large()]
            sheet.prefersGrabberVisible = true
            sheet.preferredCornerRadius = DS.Radius.sheet
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface
        view.accessibilityIdentifier = "cart.picker"
        let title = V2.label("cart.multi.picker.title".localized(), size: 18, weight: .bold)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        let header = UIStackView(arrangedSubviews: [title, UIView(), countLabel])
        header.alignment = .center

        table.dataSource = self
        table.delegate = self
        table.separatorStyle = .none
        table.rowHeight = UITableViewAutomaticDimension
        table.estimatedRowHeight = 72
        table.register(CartPickerCell.self, forCellReuseIdentifier: CartPickerCell.reuseId)

        newButton.setTitle("cart.multi.new".localized(), for: .normal)
        newButton.setTitleColor(DS.Color.primary, for: .normal)
        newButton.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        newButton.layer.cornerRadius = 13
        newButton.layer.borderWidth = 1.5
        newButton.layer.borderColor = DS.Color.primary.cgColor
        newButton.accessibilityIdentifier = "cart.picker.new"
        newButton.addTarget(self, action: #selector(newTapped), for: .touchUpInside)

        [header, table, newButton].forEach(view.addSubview)
        header.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(DS.Spacing.xl)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
        newButton.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-DS.Spacing.lg)
            make.height.equalTo(48)
        }
        table.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom).offset(8)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(newButton.snp.top).offset(-10)
        }
        refresh()
    }

    private func refresh() {
        countLabel.text = String(format: "cart.multi.picker.count".localized(), store.carts.count)
        newButton.isHidden = store.carts.count >= CartStore.maxCarts
        table.reloadData()
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { store.carts.count }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: CartPickerCell.reuseId, for: indexPath) as! CartPickerCell
        cell.configure(cart: store.carts[indexPath.row], isActive: indexPath.row == store.activeIndex)
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: false)
        store.switchCart(to: indexPath.row)
        dismiss(animated: true)
    }

    func tableView(_ tableView: UITableView, trailingSwipeActionsConfigurationForRowAt indexPath: IndexPath) -> UISwipeActionsConfiguration? {
        let delete = UIContextualAction(style: .destructive, title: "cart.multi.delete".localized()) { [weak self] _, _, done in
            self?.confirmDelete(at: indexPath.row)
            done(true)
        }
        return UISwipeActionsConfiguration(actions: [delete])
    }

    private func confirmDelete(at index: Int) {
        guard store.carts.indices.contains(index) else { return }
        let cart = store.carts[index]
        let alert = UIAlertController(title: "cart.multi.delete.title".localized(),
                                      message: String(format: "cart.multi.delete.message".localized(), CartStore.title(of: cart), cart.itemCount),
                                      preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "cart.multi.delete".localized(), style: .destructive) { [weak self] _ in
            guard let self else { return }
            self.store.deleteCart(at: index)
            self.refresh()
            if self.store.carts.count < 2 { self.dismiss(animated: true) }
        })
        present(alert, animated: true)
    }

    @objc private func newTapped() {
        store.newCart()
        dismiss(animated: true)
    }
}

private final class CartPickerCell: UITableViewCell {
    static let reuseId = "CartPickerCell"
    private let avatar = CartAvatarView(size: 40)
    private let nameLabel = V2.label(size: DS.TextSize.input, weight: .bold)
    private let infoLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted)
    private let check = UIImageView(image: DS.symbol("checkmark", 17, weight: .bold))

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        nameLabel.lineBreakMode = .byTruncatingTail
        check.tintColor = DS.Color.primary
        check.setContentHuggingPriority(.required, for: .horizontal)
        let texts = UIStackView(arrangedSubviews: [nameLabel, infoLabel])
        texts.axis = .vertical
        texts.spacing = 3
        let row = UIStackView(arrangedSubviews: [avatar, texts, check])
        row.spacing = 11
        row.alignment = .center
        contentView.addSubview(row)
        row.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: DS.Spacing.lg, bottom: 10, right: DS.Spacing.lg))
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func configure(cart: Cart, isActive: Bool) {
        avatar.configure(cart: cart)
        nameLabel.text = CartStore.title(of: cart)
        let kind = (cart.orderType == .rent ? "products.cart.rent" : "products.cart.sale").localized()
        infoLabel.text = kind + " · " + CartSwitchText.summary(of: cart)
            + (cart.customer == nil ? " · " + "cart.multi.noCustomer".localized() : "")
        check.isHidden = !isActive
        contentView.backgroundColor = isActive ? UIColor(hexString: "EFF6FF") : .white
        accessibilityIdentifier = "cart.picker.row"
        accessibilityLabel = CartStore.title(of: cart)
        accessibilityTraits = isActive ? (UIAccessibilityTraitButton | UIAccessibilityTraitSelected) : UIAccessibilityTraitButton
    }
}
