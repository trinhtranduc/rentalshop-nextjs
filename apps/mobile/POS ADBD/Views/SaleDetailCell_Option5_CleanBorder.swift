//
//  SaleDetailCell_Option5_CleanBorder.swift
//  POS ADBD
//
//  Refined rental order card with clearer hierarchy and softer surfaces.
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
        titleRowStackView.spacing = 6
        titleRowStackView.alignment = .center
        titleRowStackView.addArrangedSubview(iconImageView)
        titleRowStackView.addArrangedSubview(titleLabel)

        stackView.axis = .vertical
        stackView.spacing = 6
        stackView.alignment = .leading
        stackView.addArrangedSubview(titleRowStackView)
        stackView.addArrangedSubview(valueLabel)

        addSubview(stackView)
        stackView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }

        iconImageView.snp.makeConstraints { make in
            make.width.height.equalTo(14)
        }
    }

    func apply(title: String, value: String, symbolName: String, emphasized: Bool, isRegularWidth: Bool) {
        titleLabel.text = title
        valueLabel.text = value
        iconImageView.image = UIImage(
            systemName: symbolName,
            withConfiguration: UIImage.SymbolConfiguration(pointSize: isRegularWidth ? 12 : 11, weight: .medium)
        )

        titleLabel.font = Utils.regularFont(size: isRegularWidth ? 13 : 12)
        valueLabel.font = emphasized
            ? Utils.boldFont(size: isRegularWidth ? 16 : 15)
            : Utils.mediumFont(size: isRegularWidth ? 15 : 14)

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
        view.layer.cornerRadius = 14
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

    private lazy var headerRowStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 12
        stack.alignment = .top
        return stack
    }()

    private lazy var leftHeaderStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 8
        stack.alignment = .leading
        return stack
    }()

    private lazy var summaryStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 4
        stack.alignment = .trailing
        return stack
    }()

    private lazy var orderNumberLabel: UILabel = {
        let label = UILabel()
        label.textColor = .textPrimary
        label.numberOfLines = 1
        return label
    }()

    private lazy var customerInfoLabel: UILabel = {
        let label = UILabel()
        label.textColor = .textSecondary
        label.numberOfLines = 1
        label.lineBreakMode = .byTruncatingTail
        return label
    }()

    private lazy var revealPhoneButton: UIButton = {
        let button = UIButton(type: .system)
        button.setImage(UIImage.revealEye(revealed: false), for: .normal)
        button.tintColor = .textSecondary // same grey as the phone text
        button.setContentHuggingPriority(.required, for: .horizontal)
        button.setContentCompressionResistancePriority(.required, for: .horizontal)
        button.addTarget(self, action: #selector(togglePhoneReveal), for: .touchUpInside)
        button.snp.makeConstraints { make in
            make.width.height.equalTo(24)
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
        stack.spacing = 12
        stack.alignment = .top
        stack.distribution = .fillEqually
        return stack
    }()

    private lazy var createdDateView = SaleOrderMetaView()
    private lazy var pickupDateView = SaleOrderMetaView()
    private lazy var returnDateView = SaleOrderMetaView()
    private lazy var totalAmountView = SaleOrderMetaView()

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

        let customerRow = UIStackView(arrangedSubviews: [customerInfoLabel, revealPhoneButton, UIView()])
        customerRow.axis = .horizontal
        customerRow.spacing = 4
        customerRow.alignment = .center
        customerInfoLabel.setContentHuggingPriority(.defaultLow, for: .horizontal)
        customerInfoLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        leftHeaderStackView.addArrangedSubview(orderNumberLabel)
        leftHeaderStackView.addArrangedSubview(customerRow)

        summaryStackView.addArrangedSubview(statusBadge)
        summaryStackView.addArrangedSubview(itemCountLabel)

        headerRowStackView.addArrangedSubview(leftHeaderStackView)
        headerRowStackView.addArrangedSubview(summaryStackView)

        datesStackView.addArrangedSubview(createdDateView)
        datesStackView.addArrangedSubview(pickupDateView)
        datesStackView.addArrangedSubview(returnDateView)
        datesStackView.addArrangedSubview(totalAmountView)

        rootStackView.addArrangedSubview(headerRowStackView)
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

        leftHeaderStackView.setContentHuggingPriority(.defaultLow, for: .horizontal)
        leftHeaderStackView.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        summaryStackView.setContentHuggingPriority(.required, for: .horizontal)
        summaryStackView.setContentCompressionResistancePriority(.required, for: .horizontal)
    }

    private func updateFonts() {
        orderNumberLabel.font = Utils.regularFont(size: isRegularWidth ? 15 : 14)
        customerInfoLabel.font = Utils.regularFont(size: isRegularWidth ? 15 : 14)
        itemCountLabel.font = Utils.regularFont(size: isRegularWidth ? 14 : 13)
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

    private func customerInfoText(name: String, phone: String?, revealed: Bool = false) -> NSAttributedString {
        let displayName = name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "N/A".localized() : name
        let attributed = NSMutableAttributedString(
            string: displayName,
            attributes: [
                .font: Utils.mediumFont(size: isRegularWidth ? 16 : 15),
                .foregroundColor: UIColor.textPrimary
            ]
        )

        let trimmedPhone = phone?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !trimmedPhone.isEmpty {
            let displayPhone = revealed ? trimmedPhone : trimmedPhone.maskedPhoneNumber
            attributed.append(
                NSAttributedString(
                    string: "  •  \(displayPhone)",
                    attributes: [
                        .font: Utils.regularFont(size: isRegularWidth ? 15 : 14),
                        .foregroundColor: UIColor.textSecondary
                    ]
                )
            )
        }

        return attributed
    }

    @objc private func togglePhoneReveal() {
        isPhoneRevealed.toggle()
        revealPhoneButton.setImage(UIImage.revealEye(revealed: isPhoneRevealed), for: .normal)
        guard let order = order else { return }
        customerInfoLabel.attributedText = customerInfoText(
            name: order.customerName,
            phone: order.customerPhone,
            revealed: isPhoneRevealed
        )
    }

    func bind(order: Order, sortType: OrderSortType = .rentDefault) {
        self.order = order
        currentSortType = sortType

        orderNumberLabel.text = formattedOrderIdentifier(order.orderNumber)

        isPhoneRevealed = false
        revealPhoneButton.setImage(UIImage.revealEye(revealed: false), for: .normal)
        let hasPhone = !(order.customerPhone?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "").isEmpty
        revealPhoneButton.isHidden = !hasPhone
        customerInfoLabel.attributedText = customerInfoText(
            name: order.customerName,
            phone: order.customerPhone,
            revealed: false
        )

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

        totalAmountView.isHidden = false
        totalAmountView.apply(
            title: "Total".localized(),
            value: order.totalAmount.formatStringInCommon(),
            symbolName: "banknote",
            emphasized: true,
            isRegularWidth: isRegularWidth
        )

        setupStatusBadge(for: order)
    }

    private func setupStatusBadge(for order: Order) {
        statusBadge.apply(status: order.status, isRegularWidth: isRegularWidth)
    }
}
