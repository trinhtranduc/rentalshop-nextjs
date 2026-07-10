//
//  AvailabilityCheckViews.swift
//  POS ADBD
//

import UIKit
import SnapKit

// MARK: - Verdict Card

final class AvailabilityVerdictView: UIView {

    enum Style {
        case available
        case outOfStock
        case conflictWarning
    }

    private enum Metrics {
        static let cornerRadius: CGFloat = 14
        static let iconSize: CGFloat = 32
    }

    private let iconContainerView: UIView = {
        let view = UIView()
        view.layer.cornerRadius = Metrics.iconSize / 2
        view.clipsToBounds = true
        return view
    }()

    private let iconImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.tintColor = .white
        return imageView
    }()

    private let eyebrowLabel: UILabel = {
        let label = UILabel()
        label.font = .bodyRegular(size: 13)
        label.textColor = .textSecondary
        label.numberOfLines = 1
        return label
    }()

    private let headlineLabel: UILabel = {
        let label = UILabel()
        label.font = .bodyBold(size: 18)
        label.numberOfLines = 2
        return label
    }()

    private let textStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 4
        stack.alignment = .leading
        return stack
    }()

    private let rowStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 12
        stack.alignment = .center
        return stack
    }()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }

    private func setupUI() {
        layer.cornerRadius = Metrics.cornerRadius
        layer.borderWidth = 1

        iconContainerView.addSubview(iconImageView)
        textStackView.addArrangedSubview(eyebrowLabel)
        textStackView.addArrangedSubview(headlineLabel)
        rowStackView.addArrangedSubview(iconContainerView)
        rowStackView.addArrangedSubview(textStackView)

        addSubview(rowStackView)

        iconContainerView.snp.makeConstraints { make in
            make.width.height.equalTo(Metrics.iconSize).priority(.high)
        }
        iconContainerView.setContentHuggingPriority(.required, for: .horizontal)
        iconContainerView.setContentCompressionResistancePriority(.required, for: .horizontal)

        textStackView.setContentHuggingPriority(.defaultLow, for: .horizontal)
        textStackView.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        headlineLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        rowStackView.alignment = .top

        iconImageView.snp.makeConstraints { make in
            make.center.equalToSuperview()
            make.width.height.equalTo(18)
        }

        rowStackView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(16)
        }

        eyebrowLabel.isHidden = true
    }

    private func headline(
        text: String,
        highlight: String,
        baseColor: UIColor,
        highlightColor: UIColor = .brandPrimary
    ) -> NSAttributedString {
        let attributed = NSMutableAttributedString(
            string: text,
            attributes: [
                .font: UIFont.bodyBold(size: 18),
                .foregroundColor: baseColor
            ]
        )
        let range = (text as NSString).range(of: highlight)
        if range.location != NSNotFound {
            attributed.addAttributes(
                [
                    .font: UIFont.bodyBold(size: 18),
                    .foregroundColor: highlightColor
                ],
                range: range
            )
        }
        return attributed
    }

    func configure(style: Style, availableCount: Int, checkDate: String) {
        switch style {
        case .available:
            backgroundColor = UIColor(hexString: "22C55E").withAlphaComponent(0.08)
            layer.borderColor = UIColor(hexString: "22C55E").withAlphaComponent(0.18).cgColor
            iconContainerView.backgroundColor = UIColor(hexString: "22C55E")
            iconImageView.image = UIImage(systemName: "checkmark")
            headlineLabel.textColor = UIColor(hexString: "16A34A")
            let text = String(
                format: "availability_verdict_available".localized(),
                availableCount.formatStringInCommon(),
                checkDate
            )
            headlineLabel.attributedText = headline(
                text: text,
                highlight: checkDate,
                baseColor: UIColor(hexString: "16A34A")
            )
        case .outOfStock:
            backgroundColor = UIColor.actionDanger.withAlphaComponent(0.08)
            layer.borderColor = UIColor.actionDanger.withAlphaComponent(0.18).cgColor
            iconContainerView.backgroundColor = .actionDanger
            iconImageView.image = UIImage(systemName: "xmark")
            headlineLabel.textColor = .actionDanger
            let text = String(
                format: "availability_verdict_out_of_stock".localized(),
                checkDate
            )
            headlineLabel.attributedText = headline(
                text: text,
                highlight: checkDate,
                baseColor: .actionDanger
            )
        case .conflictWarning:
            backgroundColor = APP_ORANGE_COLOR.withAlphaComponent(0.10)
            layer.borderColor = APP_ORANGE_COLOR.withAlphaComponent(0.22).cgColor
            iconContainerView.backgroundColor = APP_ORANGE_COLOR
            iconImageView.image = UIImage(systemName: "exclamationmark.triangle.fill")
            headlineLabel.textColor = APP_ORANGE_COLOR
            let text = String(
                format: "availability_verdict_conflict".localized(),
                checkDate
            )
            headlineLabel.attributedText = headline(
                text: text,
                highlight: checkDate,
                baseColor: APP_ORANGE_COLOR
            )
        }
    }
}

// MARK: - Metrics Card

final class AvailabilityMetricsCardView: UIView {

    private let storageValueLabel = UILabel()
    private let availableValueLabel = UILabel()
    private let rentingValueLabel = UILabel()

    private let columnsStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.distribution = .fillEqually
        stack.alignment = .fill
        return stack
    }()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }

    private func setupUI() {
        backgroundColor = .backgroundCard
        layer.cornerRadius = 14
        layer.borderWidth = 1
        layer.borderColor = UIColor.borderColor.withAlphaComponent(0.6).cgColor

        let storage = makeColumn(
            title: "Storage".localized(),
            accentColor: .textTertiary,
            valueLabel: storageValueLabel,
            valueColor: .textPrimary
        )
        let available = makeColumn(
            title: "Available".localized(),
            accentColor: .brandPrimary,
            valueLabel: availableValueLabel,
            valueColor: .brandPrimary
        )
        let renting = makeColumn(
            title: "Renting".localized(),
            accentColor: APP_ORANGE_COLOR,
            valueLabel: rentingValueLabel,
            valueColor: .textPrimary
        )

        [storage, available, renting].enumerated().forEach { index, column in
            columnsStackView.addArrangedSubview(column)
            if index > 0 {
                let divider = UIView()
                divider.backgroundColor = UIColor.borderColor.withAlphaComponent(0.75)
                column.addSubview(divider)
                divider.snp.makeConstraints { make in
                    make.leading.equalToSuperview()
                    make.top.bottom.equalToSuperview().inset(14)
                    make.width.equalTo(1)
                }
            }
        }

        addSubview(columnsStackView)
        columnsStackView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 16, left: 8, bottom: 16, right: 8))
        }
    }

    private func makeColumn(
        title: String,
        accentColor: UIColor,
        valueLabel: UILabel,
        valueColor: UIColor
    ) -> UIView {
        let container = UIView()

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .captionMedium(size: 11)
        titleLabel.textColor = .textSecondary
        titleLabel.textAlignment = .center
        titleLabel.numberOfLines = 2
        titleLabel.lineBreakMode = .byWordWrapping
        titleLabel.adjustsFontSizeToFitWidth = true
        titleLabel.minimumScaleFactor = 0.85

        let accentBar = UIView()
        accentBar.backgroundColor = accentColor
        accentBar.layer.cornerRadius = 1.5

        valueLabel.font = .bodyBold(size: 26)
        valueLabel.textColor = valueColor
        valueLabel.textAlignment = .center
        valueLabel.text = "0"
        valueLabel.adjustsFontSizeToFitWidth = true
        valueLabel.minimumScaleFactor = 0.65

        let stack = UIStackView(arrangedSubviews: [titleLabel, accentBar, valueLabel])
        stack.axis = .vertical
        stack.spacing = 6
        stack.alignment = .center

        container.addSubview(stack)
        accentBar.snp.makeConstraints { make in
            make.width.equalTo(22).priority(.high)
            make.height.equalTo(3)
        }
        stack.snp.makeConstraints { make in
            make.top.bottom.equalToSuperview().inset(4)
            make.leading.trailing.equalToSuperview().inset(6)
        }

        return container
    }

    func configure(stock: Int, available: Int, renting: Int) {
        storageValueLabel.text = stock.formatStringInCommon()
        availableValueLabel.text = available.formatStringInCommon()
        rentingValueLabel.text = renting.formatStringInCommon()
        availableValueLabel.textColor = available > 0 ? .brandPrimary : .actionDanger
    }
}

// MARK: - Summary Header (verdict + metrics)

final class AvailabilitySummaryHeaderView: UIView {

    private let verdictView = AvailabilityVerdictView()
    private let metricsCardView = AvailabilityMetricsCardView()

    private let contentStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 12
        return stack
    }()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }

    private func setupUI() {
        backgroundColor = .backgroundPrimary

        contentStackView.addArrangedSubview(verdictView)
        contentStackView.addArrangedSubview(metricsCardView)
        addSubview(contentStackView)

        contentStackView.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(8)
            make.leading.trailing.equalToSuperview().inset(16)
            make.bottom.equalToSuperview().offset(-12)
        }
    }

    func configure(
        stock: Int,
        shelfAvailable: Int,
        effectiveAvailable: Int,
        renting: Int,
        conflicts: Int,
        checkDate: String
    ) {
        if effectiveAvailable > 0 {
            verdictView.configure(style: .available, availableCount: effectiveAvailable, checkDate: checkDate)
        } else if conflicts > 0 {
            verdictView.configure(style: .conflictWarning, availableCount: 0, checkDate: checkDate)
        } else {
            verdictView.configure(style: .outOfStock, availableCount: 0, checkDate: checkDate)
        }

        metricsCardView.configure(stock: stock, available: shelfAvailable, renting: renting)
    }
}

// MARK: - History Section Header

final class AvailabilityHistorySectionHeaderView: UIView {

    var onToggle: (() -> Void)?

    private let titleLabel: UILabel = {
        let label = UILabel()
        label.font = .captionMedium(size: 11)
        label.textColor = .textTertiary
        label.text = "Rental history".localized().uppercased()
        return label
    }()

    private let countPillView: UIView = {
        let view = UIView()
        view.backgroundColor = .backgroundTertiary
        view.layer.cornerRadius = 10
        return view
    }()

    private let countLabel: UILabel = {
        let label = UILabel()
        label.font = .captionMedium(size: 12)
        label.textColor = .textSecondary
        return label
    }()

    private lazy var toggleButton: UIButton = {
        let button = UIButton(type: .system)
        button.tintColor = .textSecondary
        button.addTarget(self, action: #selector(toggleTapped), for: .touchUpInside)
        return button
    }()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }

    private func setupUI() {
        backgroundColor = .backgroundPrimary

        countPillView.addSubview(countLabel)
        addSubview(titleLabel)
        addSubview(countPillView)
        addSubview(toggleButton)

        titleLabel.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(16)
            make.centerY.equalToSuperview()
        }

        toggleButton.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-12)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(32)
        }

        countPillView.snp.makeConstraints { make in
            make.trailing.equalTo(toggleButton.snp.leading).offset(-4)
            make.centerY.equalToSuperview()
        }

        countLabel.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 4, left: 8, bottom: 4, right: 8))
        }
    }

    func configure(orderCount: Int, isExpanded: Bool) {
        countLabel.text = String(format: "availability_order_count".localized(), orderCount)
        let chevron = isExpanded ? "chevron.up" : "chevron.down"
        toggleButton.setImage(UIImage(systemName: chevron), for: .normal)
    }

    @objc private func toggleTapped() {
        onToggle?()
    }
}

// MARK: - History Cell

final class AvailabilityHistoryCell: UITableViewCell {

    static let reuseIdentifier = "AvailabilityHistoryCell"

    private enum Metrics {
        static let cardCornerRadius: CGFloat = 12
        static let horizontalInset: CGFloat = 16
        static let verticalInset: CGFloat = 4
    }

    private let cardView: UIView = {
        let view = UIView()
        view.backgroundColor = .backgroundCard
        view.layer.cornerRadius = Metrics.cardCornerRadius
        view.layer.borderWidth = 1
        view.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.55).cgColor
        return view
    }()

    private let orderNumberLabel: UILabel = {
        let label = UILabel()
        label.font = .bodyBold(size: 15)
        label.textColor = .textPrimary
        label.numberOfLines = 1
        return label
    }()

    private let customerLabel: UILabel = {
        let label = UILabel()
        label.font = .bodyRegular(size: 13)
        label.textColor = .textSecondary
        label.numberOfLines = 1
        return label
    }()

    private let statusPillLabel = OrderStatusPillLabel()

    private let orderTypeBadgeLabel: UILabel = {
        let label = UILabel()
        label.font = .captionMedium(size: 12)
        label.textAlignment = .center
        label.numberOfLines = 1
        return label
    }()

    private lazy var orderTypeBadgeContainer: UIView = {
        let view = UIView()
        view.layer.cornerRadius = 10
        view.clipsToBounds = true
        view.addSubview(orderTypeBadgeLabel)
        orderTypeBadgeLabel.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 3, left: 8, bottom: 3, right: 8))
        }
        view.setContentHuggingPriority(.required, for: .horizontal)
        view.setContentCompressionResistancePriority(.required, for: .horizontal)
        return view
    }()

    private lazy var orderTitleRowStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [orderNumberLabel, orderTypeBadgeContainer, UIView()])
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .center
        return stack
    }()

    private let dividerView: UIView = {
        let view = UIView()
        view.backgroundColor = UIColor.borderColor.withAlphaComponent(0.65)
        return view
    }()

    private let createdValueLabel = UILabel()
    private let pickupValueLabel = UILabel()
    private let returnValueLabel = UILabel()
    private let quantityValueLabel = UILabel()

    private lazy var createdColumn = makeMetricColumn(
        title: "Create date".localized(),
        valueLabel: createdValueLabel,
        valueColor: .textPrimary,
        valueFont: .bodyBold(size: 13)
    )

    private lazy var pickupColumn = makeMetricColumn(
        title: "Pickup date".localized(),
        valueLabel: pickupValueLabel,
        valueColor: .textPrimary,
        valueFont: .bodyBold(size: 13)
    )

    private lazy var returnColumn = makeMetricColumn(
        title: "Return date".localized(),
        valueLabel: returnValueLabel,
        valueColor: .textPrimary,
        valueFont: .bodyBold(size: 13)
    )

    private lazy var quantityColumn = makeMetricColumn(
        title: "Quantity".localized(),
        valueLabel: quantityValueLabel,
        valueColor: .brandPrimary,
        valueFont: .bodyBold(size: 15)
    )

    private lazy var metricsRowStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [createdColumn, pickupColumn, returnColumn, quantityColumn])
        stack.axis = .horizontal
        stack.distribution = .fillEqually
        stack.alignment = .top
        stack.spacing = 0
        return stack
    }()

    private lazy var headerRowStackView: UIStackView = {
        let textStack = UIStackView(arrangedSubviews: [orderTitleRowStackView, customerLabel])
        textStack.axis = .vertical
        textStack.spacing = 2
        textStack.alignment = .leading

        let stack = UIStackView(arrangedSubviews: [textStack, statusPillLabel])
        stack.axis = .horizontal
        stack.alignment = .center
        stack.spacing = 10
        return stack
    }()

    private lazy var contentStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [headerRowStackView, dividerView, metricsRowStackView])
        stack.axis = .vertical
        stack.spacing = 12
        stack.alignment = .fill
        return stack
    }()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }

    private func makeMetricColumn(
        title: String,
        valueLabel: UILabel,
        valueColor: UIColor,
        valueFont: UIFont
    ) -> UIView {
        let container = UIView()

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .captionMedium(size: 11)
        titleLabel.textColor = .textTertiary
        titleLabel.numberOfLines = 1
        titleLabel.adjustsFontSizeToFitWidth = true
        titleLabel.minimumScaleFactor = 0.85

        valueLabel.font = valueFont
        valueLabel.textColor = valueColor
        valueLabel.numberOfLines = 1
        valueLabel.adjustsFontSizeToFitWidth = true
        valueLabel.minimumScaleFactor = 0.8

        let stack = UIStackView(arrangedSubviews: [titleLabel, valueLabel])
        stack.axis = .vertical
        stack.spacing = 4
        stack.alignment = .leading

        container.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.top.bottom.equalToSuperview()
            make.leading.trailing.equalToSuperview().inset(2)
        }

        return container
    }

    private func setupUI() {
        selectionStyle = .none
        backgroundColor = .clear
        contentView.backgroundColor = .clear

        orderNumberLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        cardView.addSubview(contentStackView)
        contentView.addSubview(cardView)

        dividerView.snp.makeConstraints { make in
            make.height.equalTo(1)
        }

        cardView.snp.makeConstraints { make in
            make.top.bottom.equalToSuperview().inset(Metrics.verticalInset)
            make.leading.trailing.equalToSuperview().inset(Metrics.horizontalInset)
        }

        contentStackView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(14)
        }
    }

    func bind(order: NewAvailabilityOrder) {
        orderNumberLabel.text = "#\(order.orderNumber ?? "—")"
        applyOrderTypeBadge(orderType: order.orderType)

        if let customer = order.customerName?.trimmingCharacters(in: .whitespacesAndNewlines), !customer.isEmpty {
            customerLabel.text = customer
            customerLabel.isHidden = false
        } else {
            customerLabel.text = nil
            customerLabel.isHidden = true
        }

        pickupValueLabel.text = order.pickupPlanAt?.toDate()?.dateInString() ?? "N/A".localized()
        returnValueLabel.text = order.returnPlanAt?.toDate()?.dateInString() ?? "N/A".localized()
        createdValueLabel.text = order.createdAt?.toDate()?.dateInString() ?? "N/A".localized()
        quantityValueLabel.text = (order.quantity ?? 0).formatStringInCommon()

        if let status = OrderStatus.from(apiString: order.status) {
            status.applySolidBadge(to: statusPillLabel)
        } else {
            statusPillLabel.text = (order.status ?? "").localizedStatus()
            statusPillLabel.textColor = .textSecondary
            statusPillLabel.backgroundColor = .backgroundTertiary
        }

        if order.isConflict == true {
            cardView.backgroundColor = APP_ORANGE_COLOR.withAlphaComponent(0.06)
            cardView.layer.borderColor = APP_ORANGE_COLOR.withAlphaComponent(0.22).cgColor
            quantityValueLabel.textColor = APP_ORANGE_COLOR
        } else {
            cardView.backgroundColor = .backgroundCard
            cardView.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.55).cgColor
            quantityValueLabel.textColor = .brandPrimary
        }
    }

    private func applyOrderTypeBadge(orderType: String?) {
        guard let rawType = orderType?.trimmingCharacters(in: .whitespacesAndNewlines), !rawType.isEmpty else {
            orderTypeBadgeContainer.isHidden = true
            return
        }

        let isRent = rawType.uppercased() == OrderType.rent.rawValue.uppercased()
        if isRent {
            orderTypeBadgeLabel.text = "Order_Type_Rent".localized()
            orderTypeBadgeLabel.textColor = .brandPrimary
            orderTypeBadgeContainer.backgroundColor = UIColor.brandPrimary.withAlphaComponent(0.12)
        } else {
            orderTypeBadgeLabel.text = "Order_Type_Sale".localized()
            orderTypeBadgeLabel.textColor = .accentOrange
            orderTypeBadgeContainer.backgroundColor = UIColor.accentOrange.withAlphaComponent(0.15)
        }
        orderTypeBadgeContainer.isHidden = false
    }
}

// MARK: - History Empty State

final class AvailabilityHistoryEmptyView: UIView {

    private let iconImageView: UIImageView = {
        let imageView = UIImageView(image: UIImage(systemName: "calendar"))
        imageView.tintColor = .textTertiary
        imageView.contentMode = .scaleAspectFit
        return imageView
    }()

    private let messageLabel: UILabel = {
        let label = UILabel()
        label.font = .bodyRegular(size: 14)
        label.textColor = .textSecondary
        label.textAlignment = .center
        label.numberOfLines = 0
        label.text = "availability_history_empty".localized()
        return label
    }()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }

    private func setupUI() {
        backgroundColor = .clear

        let stack = UIStackView(arrangedSubviews: [iconImageView, messageLabel])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 10

        addSubview(stack)
        iconImageView.snp.makeConstraints { make in
            make.width.height.equalTo(28)
        }
        stack.snp.makeConstraints { make in
            make.centerX.equalToSuperview()
            make.top.equalToSuperview().offset(24)
            make.leading.trailing.equalToSuperview().inset(32)
            make.bottom.lessThanOrEqualToSuperview().offset(-16)
        }
    }
}
