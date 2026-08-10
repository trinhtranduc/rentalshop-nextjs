//
//  SaleDetailCell_Option5_CleanBorder.swift
//  POS ADBD
//
//  Order list card — layout parity with Android `OrderListCard`:
//  1) order # + status
//  2) customer name + masked phone | total + item count
//  3) date metrics only (no total column)
//

import UIKit
import SnapKit

private final class SaleOrderMetaView: UIView {
    let iconImageView = UIImageView()
    let titleLabel = UILabel()
    let valueLabel = UILabel()

    private let stackView = UIStackView()
    private let titleRowStackView = UIStackView()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        iconImageView.contentMode = .scaleAspectFit
        iconImageView.tintColor = .textTertiary
        iconImageView.setContentHuggingPriority(.required, for: .horizontal)
        iconImageView.setContentCompressionResistancePriority(.required, for: .horizontal)

        titleLabel.textColor = .textTertiary
        titleLabel.numberOfLines = 1

        valueLabel.textColor = .textPrimary
        valueLabel.numberOfLines = 1

        titleRowStackView.axis = .horizontal
        titleRowStackView.spacing = 4
        titleRowStackView.alignment = .center
        titleRowStackView.addArrangedSubview(iconImageView)
        titleRowStackView.addArrangedSubview(titleLabel)

        stackView.axis = .vertical
        stackView.spacing = 3
        stackView.alignment = .leading
        stackView.addArrangedSubview(titleRowStackView)
        stackView.addArrangedSubview(valueLabel)

        addSubview(stackView)
        stackView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }

        iconImageView.snp.makeConstraints { make in
            make.width.height.equalTo(13)
        }
    }

    func apply(title: String, value: String, symbolName: String, emphasized: Bool, isRegularWidth: Bool) {
        titleLabel.text = title
        valueLabel.text = value
        iconImageView.image = UIImage(
            systemName: symbolName,
            withConfiguration: UIImage.SymbolConfiguration(pointSize: isRegularWidth ? 12 : 11, weight: .medium)
        )

        titleLabel.font = Utils.regularFont(size: isRegularWidth ? 12 : 11)
        valueLabel.font = emphasized
            ? Utils.boldFont(size: isRegularWidth ? 15 : 14)
            : Utils.mediumFont(size: isRegularWidth ? 14 : 13)

        titleLabel.textColor = emphasized ? UIColor.brandPrimary.withAlphaComponent(0.9) : .textTertiary
        iconImageView.tintColor = emphasized ? UIColor.brandPrimary.withAlphaComponent(0.9) : .textTertiary
        valueLabel.textColor = emphasized ? .brandPrimary : .textPrimary
    }
}

class SaleDetailCell_Option5: UITableViewCell {
    private var order: Order?
    private var currentSortType: OrderSortType = .rentDefault

    private var isRegularWidth: Bool {
        traitCollection.horizontalSizeClass == .regular
    }

    private lazy var containerView: UIView = {
        let view = UIView()
        view.backgroundColor = .backgroundCard
        view.layer.cornerRadius = 10
        view.layer.borderWidth = 1
        view.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.88).cgColor
        view.layer.shadowColor = UIColor.black.cgColor
        view.layer.shadowOpacity = 0.05
        view.layer.shadowRadius = 12
        view.layer.shadowOffset = CGSize(width: 0, height: 5)
        return view
    }()

    private lazy var rootStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 10
        stack.alignment = .fill
        return stack
    }()

    /// Android row 1: order # … status
    private lazy var identityRowStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 12
        stack.alignment = .center
        return stack
    }()

    /// Android row 2: customer block | total + items
    private lazy var customerSummaryRowStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 12
        stack.alignment = .top
        return stack
    }()

    private lazy var customerColumnStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 2
        stack.alignment = .leading
        return stack
    }()

    private lazy var phoneRowStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 4
        stack.alignment = .center
        return stack
    }()

    private lazy var summaryStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 2
        stack.alignment = .trailing
        return stack
    }()

    private lazy var orderNumberLabel: UILabel = {
        let label = UILabel()
        label.textColor = .textPrimary
        label.numberOfLines = 1
        label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        return label
    }()

    private lazy var customerNameLabel: UILabel = {
        let label = UILabel()
        label.textColor = .textPrimary
        label.numberOfLines = 2
        label.lineBreakMode = .byTruncatingTail
        return label
    }()

    private lazy var customerPhoneLabel: UILabel = {
        let label = UILabel()
        label.textColor = .textSecondary
        label.numberOfLines = 1
        label.lineBreakMode = .byTruncatingTail
        label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        return label
    }()

    private lazy var revealPhoneButton: UIButton = {
        let button = UIButton(type: .system)
        button.setImage(UIImage.revealEye(revealed: false), for: .normal)
        button.tintColor = .textSecondary
        button.setContentHuggingPriority(.required, for: .horizontal)
        button.setContentCompressionResistancePriority(.required, for: .horizontal)
        button.addTarget(self, action: #selector(togglePhoneReveal), for: .touchUpInside)
        button.snp.makeConstraints { make in
            make.width.height.equalTo(18)
        }
        return button
    }()

    private var isPhoneRevealed = false

    private lazy var statusBadge: OrderStatusPillLabel = {
        let label = OrderStatusPillLabel()
        label.setContentCompressionResistancePriority(.required, for: .horizontal)
        label.setContentHuggingPriority(.required, for: .horizontal)
        return label
    }()

    private lazy var totalAmountLabel: UILabel = {
        let label = UILabel()
        label.textColor = .brandPrimary
        label.textAlignment = .right
        label.numberOfLines = 1
        label.setContentHuggingPriority(.required, for: .horizontal)
        label.setContentCompressionResistancePriority(.required, for: .horizontal)
        return label
    }()

    private lazy var itemCountLabel: UILabel = {
        let label = UILabel()
        label.textColor = .textSecondary
        label.textAlignment = .right
        label.numberOfLines = 1
        label.setContentHuggingPriority(.required, for: .horizontal)
        label.setContentCompressionResistancePriority(.required, for: .horizontal)
        return label
    }()

    private lazy var dividerView: UIView = {
        let view = UIView()
        view.backgroundColor = UIColor.borderColor.withAlphaComponent(0.8)
        return view
    }()

    private lazy var metaPanelView: UIView = {
        let view = UIView()
        view.backgroundColor = .clear
        return view
    }()

    private lazy var datesStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .top
        stack.distribution = .fillEqually
        return stack
    }()

    private lazy var createdDateView = SaleOrderMetaView()
    private lazy var pickupDateView = SaleOrderMetaView()
    private lazy var returnDateView = SaleOrderMetaView()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
        updateFonts()
        selectionStyle = .none
        backgroundColor = .clear
        contentView.backgroundColor = .clear
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func prepareForReuse() {
        super.prepareForReuse()
        order = nil
        currentSortType = .rentDefault
        isPhoneRevealed = false
        revealPhoneButton.setImage(UIImage.revealEye(revealed: false), for: .normal)
        phoneRowStackView.isHidden = false
        pickupDateView.isHidden = false
        returnDateView.isHidden = false
        containerView.transform = .identity
        containerView.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.88).cgColor
        containerView.layer.shadowOpacity = 0.05
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        containerView.layer.shadowPath = UIBezierPath(
            roundedRect: containerView.bounds,
            cornerRadius: containerView.layer.cornerRadius
        ).cgPath
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)

        guard traitCollection.horizontalSizeClass != previousTraitCollection?.horizontalSizeClass else {
            return
        }

        updateFonts()

        if let order {
            bind(order: order, sortType: currentSortType)
        }
    }

    override func setHighlighted(_ highlighted: Bool, animated: Bool) {
        super.setHighlighted(highlighted, animated: animated)
        applyPressedState(isPressed: highlighted, animated: animated)
    }

    private func setupUI() {
        contentView.addSubview(containerView)
        containerView.addSubview(rootStackView)
        metaPanelView.addSubview(datesStackView)

        phoneRowStackView.addArrangedSubview(customerPhoneLabel)
        phoneRowStackView.addArrangedSubview(revealPhoneButton)

        // Left column: name, then phone under it (Android OrderListCard).
        customerColumnStackView.axis = .vertical
        customerColumnStackView.spacing = 2
        customerColumnStackView.alignment = .fill
        customerColumnStackView.addArrangedSubview(customerNameLabel)
        customerColumnStackView.addArrangedSubview(phoneRowStackView)

        // Right column: total ABOVE item count (Android OrderListCard).
        summaryStackView.axis = .vertical
        summaryStackView.spacing = 2
        summaryStackView.alignment = .trailing
        summaryStackView.addArrangedSubview(totalAmountLabel)
        summaryStackView.addArrangedSubview(itemCountLabel)

        identityRowStackView.addArrangedSubview(orderNumberLabel)
        identityRowStackView.addArrangedSubview(UIView()) // spacer
        identityRowStackView.addArrangedSubview(statusBadge)

        customerSummaryRowStackView.axis = .horizontal
        customerSummaryRowStackView.alignment = .top
        customerSummaryRowStackView.distribution = .fill
        customerSummaryRowStackView.addArrangedSubview(customerColumnStackView)
        customerSummaryRowStackView.addArrangedSubview(summaryStackView)

        datesStackView.addArrangedSubview(createdDateView)
        datesStackView.addArrangedSubview(pickupDateView)
        datesStackView.addArrangedSubview(returnDateView)

        rootStackView.addArrangedSubview(identityRowStackView)
        rootStackView.addArrangedSubview(customerSummaryRowStackView)
        rootStackView.addArrangedSubview(dividerView)
        rootStackView.addArrangedSubview(metaPanelView)

        let horizontalInset: CGFloat = isRegularWidth ? 18 : 12
        let cardSpacing: CGFloat = isRegularWidth ? 8 : 6
        let contentPadding: CGFloat = isRegularWidth ? 14 : 12

        containerView.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(cardSpacing)
            make.leading.equalToSuperview().offset(horizontalInset)
            make.trailing.equalToSuperview().offset(-horizontalInset)
            make.bottom.equalToSuperview().offset(-cardSpacing)
        }

        rootStackView.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(contentPadding)
            make.leading.equalToSuperview().offset(contentPadding)
            make.trailing.equalToSuperview().offset(-contentPadding)
            make.bottom.equalToSuperview().offset(-contentPadding)
        }

        dividerView.snp.makeConstraints { make in
            make.height.equalTo(1 / UIScreen.main.scale)
        }

        datesStackView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }

        statusBadge.snp.makeConstraints { make in
            make.height.greaterThanOrEqualTo(OrderStatusBadgeMetrics.minimumHeight)
        }

        customerColumnStackView.setContentHuggingPriority(.defaultLow, for: .horizontal)
        customerColumnStackView.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        summaryStackView.setContentHuggingPriority(.required, for: .horizontal)
        summaryStackView.setContentCompressionResistancePriority(.required, for: .horizontal)
    }

    private func updateFonts() {
        orderNumberLabel.font = Utils.regularFont(size: isRegularWidth ? 16 : 15)
        customerNameLabel.font = Utils.mediumFont(size: isRegularWidth ? 16 : 15)
        customerPhoneLabel.font = Utils.regularFont(size: isRegularWidth ? 13 : 12)
        totalAmountLabel.font = Utils.boldFont(size: isRegularWidth ? 16 : 15)
        itemCountLabel.font = Utils.regularFont(size: isRegularWidth ? 13 : 12)
    }

    private func applyPressedState(isPressed: Bool, animated: Bool) {
        let changes = {
            self.containerView.transform = isPressed ? CGAffineTransform(scaleX: 0.988, y: 0.988) : .identity
            self.containerView.layer.borderColor = isPressed
                ? UIColor.brandPrimary.withAlphaComponent(0.24).cgColor
                : UIColor.borderColor.withAlphaComponent(0.88).cgColor
            self.containerView.layer.shadowOpacity = isPressed ? 0.08 : 0.05
        }

        if animated {
            UIView.animate(withDuration: 0.18, delay: 0, options: [.curveEaseOut, .allowUserInteraction], animations: changes)
        } else {
            changes()
        }
    }

    private func formattedOrderIdentifier(_ rawValue: String?) -> String {
        let trimmed = (rawValue ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return "#N/A".localized() }
        return trimmed.hasPrefix("#") ? trimmed : "#\(trimmed)"
    }

    private func applyCustomerPhone(phone: String?, revealed: Bool) {
        let trimmed = phone?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let hasPhone = !trimmed.isEmpty
        phoneRowStackView.isHidden = !hasPhone
        revealPhoneButton.isHidden = !hasPhone
        guard hasPhone else {
            customerPhoneLabel.text = nil
            return
        }
        customerPhoneLabel.text = revealed ? trimmed : trimmed.maskedPhoneNumber
    }

    @objc private func togglePhoneReveal() {
        isPhoneRevealed.toggle()
        revealPhoneButton.setImage(UIImage.revealEye(revealed: isPhoneRevealed), for: .normal)
        applyCustomerPhone(phone: order?.customerPhone, revealed: isPhoneRevealed)
    }

    func bind(order: Order, sortType: OrderSortType = .rentDefault) {
        self.order = order
        currentSortType = sortType

        orderNumberLabel.text = formattedOrderIdentifier(order.orderNumber)

        let displayName = order.customerName.trimmingCharacters(in: .whitespacesAndNewlines)
        customerNameLabel.text = displayName.isEmpty ? "N/A".localized() : displayName

        isPhoneRevealed = false
        revealPhoneButton.setImage(UIImage.revealEye(revealed: false), for: .normal)
        applyCustomerPhone(phone: order.customerPhone, revealed: false)

        totalAmountLabel.text = order.totalAmount.formatStringInCommon()
        let itemText = order.itemCount == 1 ? "item".localized() : "items".localized()
        itemCountLabel.text = "\(order.itemCount) \(itemText)"

        createdDateView.apply(
            title: "Book date".localized(),
            value: order.createdAt.dateInString() ?? "N/A".localized(),
            symbolName: "calendar",
            emphasized: order.orderType == .sale || sortType == .book_date,
            isRegularWidth: isRegularWidth
        )

        if order.orderType == .rent {
            pickupDateView.isHidden = false
            returnDateView.isHidden = false

            pickupDateView.apply(
                title: "Pickup date".localized(),
                value: order.pickupDate?.dateInString() ?? "N/A".localized(),
                symbolName: "arrow.up.right.circle",
                emphasized: sortType == .get_date,
                isRegularWidth: isRegularWidth
            )

            returnDateView.apply(
                title: "Return date".localized(),
                value: order.returnDate?.dateInString() ?? "N/A".localized(),
                symbolName: "arrow.down.right.circle",
                emphasized: false,
                isRegularWidth: isRegularWidth
            )
        } else {
            pickupDateView.isHidden = true
            returnDateView.isHidden = true
        }

        setupStatusBadge(for: order)
    }

    private func setupStatusBadge(for order: Order) {
        statusBadge.apply(status: order.status, isRegularWidth: isRegularWidth)
    }
}
