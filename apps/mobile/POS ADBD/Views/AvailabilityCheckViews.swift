//
//  AvailabilityCheckViews.swift
//  POS ADBD
//

import UIKit
import SnapKit
import FSCalendar

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

    private let headlineLabel: UILabel = {
        let label = UILabel()
        label.font = .bodyRegular(size: 18)
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

        rowStackView.alignment = .center

        iconImageView.snp.makeConstraints { make in
            make.center.equalToSuperview()
            make.width.height.equalTo(18)
        }

        rowStackView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(16)
        }
    }

    private func availableHeadline(countText: String, checkDate: String, accentColor: UIColor) -> NSAttributedString {
        let text = String(
            format: "availability_verdict_available".localized(),
            countText,
            checkDate
        )
        let attributed = NSMutableAttributedString(
            string: text,
            attributes: [
                .font: UIFont.bodyRegular(size: 18),
                .foregroundColor: accentColor
            ]
        )
        for highlight in [countText, checkDate] {
            let range = (text as NSString).range(of: highlight)
            if range.location != NSNotFound {
                attributed.addAttributes(
                    [
                        .font: UIFont.bodyBold(size: 22),
                        .foregroundColor: accentColor
                    ],
                    range: range
                )
            }
        }
        return attributed
    }

    private func datedHeadline(formatKey: String, checkDate: String, color: UIColor) -> NSAttributedString {
        let text = String(format: formatKey.localized(), checkDate)
        let attributed = NSMutableAttributedString(
            string: text,
            attributes: [
                .font: UIFont.bodyRegular(size: 18),
                .foregroundColor: color
            ]
        )
        let range = (text as NSString).range(of: checkDate)
        if range.location != NSNotFound {
            attributed.addAttributes(
                [
                    .font: UIFont.bodyBold(size: 22),
                    .foregroundColor: color
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
            let accentColor = UIColor(hexString: "16A34A")
            headlineLabel.textColor = accentColor
            let countText = availableCount.formatStringInCommon()
            headlineLabel.attributedText = availableHeadline(
                countText: countText,
                checkDate: checkDate,
                accentColor: accentColor
            )
        case .outOfStock:
            backgroundColor = UIColor.actionDanger.withAlphaComponent(0.08)
            layer.borderColor = UIColor.actionDanger.withAlphaComponent(0.18).cgColor
            iconContainerView.backgroundColor = .actionDanger
            iconImageView.image = UIImage(systemName: "xmark")
            headlineLabel.textColor = .actionDanger
            headlineLabel.attributedText = datedHeadline(
                formatKey: "availability_verdict_out_of_stock",
                checkDate: checkDate,
                color: .actionDanger
            )
        case .conflictWarning:
            backgroundColor = APP_ORANGE_COLOR.withAlphaComponent(0.10)
            layer.borderColor = APP_ORANGE_COLOR.withAlphaComponent(0.22).cgColor
            iconContainerView.backgroundColor = APP_ORANGE_COLOR
            iconImageView.image = UIImage(systemName: "exclamationmark.triangle.fill")
            headlineLabel.textColor = APP_ORANGE_COLOR
            headlineLabel.attributedText = datedHeadline(
                formatKey: "availability_verdict_conflict",
                checkDate: checkDate,
                color: APP_ORANGE_COLOR
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
        let availableGreen = UIColor(hexString: "16A34A")
        let available = makeColumn(
            title: "Available".localized(),
            accentColor: UIColor(hexString: "22C55E"),
            valueLabel: availableValueLabel,
            valueColor: availableGreen
        )
        let renting = makeColumn(
            title: "Renting".localized(),
            accentColor: APP_ORANGE_COLOR,
            valueLabel: rentingValueLabel,
            valueColor: APP_ORANGE_COLOR
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

        valueLabel.font = .bodyBold(size: 28)
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
            make.width.equalTo(24)
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
        availableValueLabel.textColor = available > 0 ? UIColor(hexString: "16A34A") : .actionDanger
    }
}

// MARK: - Order summary banner

final class AvailabilityOrderSummaryBannerView: UIView {

    private enum Metrics {
        static let cornerRadius: CGFloat = 12
    }

    private let containerView: UIView = {
        let view = UIView()
        view.layer.cornerRadius = Metrics.cornerRadius
        view.layer.borderWidth = 1
        view.clipsToBounds = true
        return view
    }()

    private let iconImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.setContentHuggingPriority(.required, for: .horizontal)
        return imageView
    }()

    private let primaryLabel: UILabel = {
        let label = UILabel()
        label.font = .bodyBold(size: 16)
        label.numberOfLines = 2
        label.textAlignment = .left
        return label
    }()

    private let secondaryLabel: UILabel = {
        let label = UILabel()
        label.font = .captionMedium(size: 13)
        label.numberOfLines = 1
        label.textAlignment = .left
        return label
    }()

    private lazy var textStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [primaryLabel, secondaryLabel])
        stack.axis = .vertical
        stack.spacing = 3
        stack.alignment = .leading
        return stack
    }()

    private lazy var rowStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [iconImageView, textStackView])
        stack.axis = .horizontal
        stack.spacing = 10
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
        addSubview(containerView)
        containerView.addSubview(rowStackView)

        containerView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }

        iconImageView.snp.makeConstraints { make in
            make.width.height.equalTo(22)
        }

        rowStackView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 14, bottom: 12, right: 14))
        }
    }

    private func attributedPrimary(
        countText: String,
        suffix: String,
        accentColor: UIColor
    ) -> NSAttributedString {
        let full = "\(countText) \(suffix)"
        let attributed = NSMutableAttributedString(
            string: full,
            attributes: [
                .font: UIFont.bodyMedium(size: 15),
                .foregroundColor: accentColor,
            ]
        )
        let range = (full as NSString).range(of: countText)
        if range.location != NSNotFound {
            attributed.addAttributes(
                [
                    .font: UIFont.bodyBold(size: 22),
                    .foregroundColor: accentColor,
                ],
                range: range
            )
        }
        return attributed
    }

    func configure(totalOrderCount: Int, conflictOrderCount: Int, checkDate: String) {
        guard totalOrderCount > 0 else {
            isHidden = true
            primaryLabel.text = nil
            secondaryLabel.text = nil
            return
        }

        isHidden = false
        secondaryLabel.isHidden = false

        if conflictOrderCount > 0 {
            containerView.backgroundColor = APP_ORANGE_COLOR.withAlphaComponent(0.14)
            containerView.layer.borderColor = APP_ORANGE_COLOR.withAlphaComponent(0.45).cgColor
            iconImageView.image = UIImage(systemName: "exclamationmark.triangle.fill")
            iconImageView.tintColor = APP_ORANGE_COLOR

            let countText = conflictOrderCount.formatStringInCommon()
            primaryLabel.attributedText = attributedPrimary(
                countText: countText,
                suffix: String(format: "availability_header_conflict_suffix".localized(), checkDate),
                accentColor: APP_ORANGE_COLOR
            )
            secondaryLabel.text = String(
                format: "availability_header_total_rental_subtitle".localized(),
                totalOrderCount.formatStringInCommon()
            )
            secondaryLabel.textColor = APP_ORANGE_COLOR.withAlphaComponent(0.88)
        } else {
            containerView.backgroundColor = UIColor.brandPrimary.withAlphaComponent(0.08)
            containerView.layer.borderColor = UIColor.brandPrimary.withAlphaComponent(0.22).cgColor
            iconImageView.image = UIImage(systemName: "doc.text.fill")
            iconImageView.tintColor = .brandPrimary

            let countText = totalOrderCount.formatStringInCommon()
            primaryLabel.attributedText = attributedPrimary(
                countText: countText,
                suffix: String(format: "availability_header_orders_suffix".localized(), checkDate),
                accentColor: .brandPrimary
            )
            secondaryLabel.isHidden = true
        }
    }
}

// MARK: - Summary Header (verdict + order summary + metrics)

final class AvailabilitySummaryHeaderView: UIView {

    private let verdictView = AvailabilityVerdictView()
    private let metricsCardView = AvailabilityMetricsCardView()
    private let orderSummaryBanner = AvailabilityOrderSummaryBannerView()

    private let contentStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 12
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
        backgroundColor = .backgroundPrimary

        contentStackView.addArrangedSubview(verdictView)
        contentStackView.addArrangedSubview(orderSummaryBanner)
        contentStackView.addArrangedSubview(metricsCardView)
        addSubview(contentStackView)

        contentStackView.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(4)
            make.leading.trailing.equalToSuperview().inset(16)
            make.bottom.equalToSuperview()
        }
    }

    func configure(
        stock: Int,
        shelfAvailable: Int,
        effectiveAvailable: Int,
        renting: Int,
        conflicts: Int,
        checkDate: String,
        totalOrderCount: Int,
        conflictOrderCount: Int
    ) {
        if effectiveAvailable > 0 {
            verdictView.configure(
                style: .available,
                availableCount: effectiveAvailable,
                checkDate: checkDate
            )
        } else if conflicts > 0 {
            verdictView.configure(
                style: .conflictWarning,
                availableCount: 0,
                checkDate: checkDate
            )
        } else {
            verdictView.configure(
                style: .outOfStock,
                availableCount: 0,
                checkDate: checkDate
            )
        }

        metricsCardView.configure(stock: stock, available: shelfAvailable, renting: renting)
        orderSummaryBanner.configure(
            totalOrderCount: totalOrderCount,
            conflictOrderCount: conflictOrderCount,
            checkDate: checkDate
        )
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
        view.clipsToBounds = true
        return view
    }()

    private let conflictAccentView: UIView = {
        let view = UIView()
        view.backgroundColor = APP_ORANGE_COLOR
        view.isHidden = true
        return view
    }()

    private let conflictBadgeLabel: UILabel = {
        let label = UILabel()
        label.font = .captionMedium(size: 11)
        label.textAlignment = .center
        label.numberOfLines = 1
        label.text = "availability_conflict_badge".localized()
        label.textColor = .white
        return label
    }()

    private lazy var conflictBadgeContainer: UIView = {
        let view = UIView()
        view.backgroundColor = APP_ORANGE_COLOR
        view.layer.cornerRadius = 10
        view.clipsToBounds = true
        view.isHidden = true
        view.addSubview(conflictBadgeLabel)
        conflictBadgeLabel.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 3, left: 8, bottom: 3, right: 8))
        }
        view.setContentHuggingPriority(.required, for: .horizontal)
        view.setContentCompressionResistancePriority(.required, for: .horizontal)
        return view
    }()

    private let orderNumberLabel: UILabel = {
        let label = UILabel()
        label.font = .bodyRegular(size: 15)
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
        let stack = UIStackView(arrangedSubviews: [
            orderNumberLabel,
            orderTypeBadgeContainer,
            conflictBadgeContainer,
            UIView()
        ])
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

        cardView.addSubview(conflictAccentView)
        cardView.addSubview(contentStackView)
        contentView.addSubview(cardView)

        conflictAccentView.snp.makeConstraints { make in
            make.leading.top.bottom.equalToSuperview()
            make.width.equalTo(4)
        }

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

        pickupValueLabel.text = order.pickupPlanAt?.toDate()?.shopDateInString() ?? "N/A".localized()
        returnValueLabel.text = order.returnPlanAt?.toDate()?.shopDateInString() ?? "N/A".localized()
        createdValueLabel.text = order.createdAt?.toDate()?.dateInString() ?? "N/A".localized()
        quantityValueLabel.text = (order.quantity ?? 0).formatStringInCommon()

        if let status = OrderStatus.from(apiString: order.status) {
            status.applySolidBadge(to: statusPillLabel)
        } else {
            statusPillLabel.text = (order.status ?? "").localizedStatus()
            statusPillLabel.textColor = .textSecondary
            statusPillLabel.backgroundColor = .backgroundTertiary
        }

        let isConflict = order.isConflict == true
        conflictAccentView.isHidden = !isConflict
        conflictBadgeContainer.isHidden = !isConflict
        if isConflict {
            cardView.backgroundColor = APP_ORANGE_COLOR.withAlphaComponent(0.14)
            cardView.layer.borderWidth = 1.5
            cardView.layer.borderColor = APP_ORANGE_COLOR.withAlphaComponent(0.65).cgColor
            quantityValueLabel.textColor = APP_ORANGE_COLOR
            pickupValueLabel.textColor = APP_ORANGE_COLOR
            returnValueLabel.textColor = APP_ORANGE_COLOR
        } else {
            cardView.backgroundColor = .backgroundCard
            cardView.layer.borderWidth = 1
            cardView.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.55).cgColor
            quantityValueLabel.textColor = .brandPrimary
            pickupValueLabel.textColor = .textPrimary
            returnValueLabel.textColor = .textPrimary
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

// MARK: - Availability calendar colors (soft inventory wash)

private extension UIColor {
    /// Soft pastel washes — readable without overpowering the day number.
    static let availabilityOpenFill = UIColor(red: 0.93, green: 0.98, blue: 0.95, alpha: 1)
    static let availabilityOpenText = UIColor(red: 0.09, green: 0.55, blue: 0.34, alpha: 1)
    static let availabilityLowFill = UIColor(red: 1.0, green: 0.98, blue: 0.92, alpha: 1)
    static let availabilityLowText = UIColor(red: 0.72, green: 0.48, blue: 0.05, alpha: 1)
    static let availabilityFullFill = UIColor(red: 1.0, green: 0.95, blue: 0.95, alpha: 1)
    static let availabilityFullText = UIColor(red: 0.78, green: 0.20, blue: 0.20, alpha: 1)
}

private enum AvailabilityHeatLevel {
    case plenty
    case low
    case none

    static func from(remaining: Int, stock: Int) -> AvailabilityHeatLevel {
        if remaining <= 0 { return .none }
        if stock > 0 {
            return Double(remaining) / Double(stock) > 0.5 ? .plenty : .low
        }
        return remaining >= 3 ? .plenty : .low
    }

    var fillColor: UIColor {
        switch self {
        case .plenty: return .availabilityOpenFill
        case .low: return .availabilityLowFill
        case .none: return .availabilityFullFill
        }
    }

    var textColor: UIColor {
        switch self {
        case .plenty: return .availabilityOpenText
        case .low: return .availabilityLowText
        case .none: return .availabilityFullText
        }
    }
}

// MARK: - Day cell
//
// Expert inventory-calendar pattern (PMS / Booking-style):
// - Soft heat wash = status at a glance
// - Day number top (identity), qty bottom (decision metric)
// - No nested pills / dots / chrome stacks
// - Selected = brand ring; Today = brand day number + slim top accent

final class AvailabilityCalendarDayCell: FSCalendarCell {

    static let reuseId = "AvailabilityCalendarDayCell"

    private enum Metrics {
        static let cornerRadius: CGFloat = 12
        static let inset: CGFloat = 2.5
        static let topAccentHeight: CGFloat = 2.5
        static let contentInset: CGFloat = 6
    }

    private let tileView: UIView = {
        let view = UIView()
        view.layer.cornerRadius = Metrics.cornerRadius
        view.clipsToBounds = true
        return view
    }()

    /// Slim brand bar — only for “today” (doesn’t fight heat fill).
    private let todayAccentView: UIView = {
        let view = UIView()
        view.backgroundColor = .brandPrimary
        view.isHidden = true
        return view
    }()

    private let dayLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 11)
        label.textAlignment = .center
        label.textColor = .textSecondary
        return label
    }()

    private let qtyLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 16)
        label.textAlignment = .center
        label.adjustsFontSizeToFitWidth = true
        label.minimumScaleFactor = 0.7
        return label
    }()

    override init!(frame: CGRect) {
        super.init(frame: frame)
        setupTile()
    }

    required init!(coder: NSCoder!) {
        super.init(coder: coder)
        setupTile()
    }

    private func setupTile() {
        titleLabel.isHidden = true
        subtitleLabel.isHidden = true
        imageView.isHidden = true
        eventIndicator.isHidden = true

        tileView.addSubview(todayAccentView)
        tileView.addSubview(dayLabel)
        tileView.addSubview(qtyLabel)
        contentView.addSubview(tileView)

        tileView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(Metrics.inset)
        }
        todayAccentView.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview()
            make.height.equalTo(Metrics.topAccentHeight)
        }
        dayLabel.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(Metrics.contentInset + 2)
            make.leading.trailing.equalToSuperview().inset(2)
        }
        qtyLabel.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(3)
            make.bottom.equalToSuperview().offset(-(Metrics.contentInset + 2))
            make.top.greaterThanOrEqualTo(dayLabel.snp.bottom).offset(2)
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        titleLabel.isHidden = true
        subtitleLabel.isHidden = true
        imageView.isHidden = true
        eventIndicator.isHidden = true
    }

    func configure(
        day: Int,
        remaining: Int?,
        occupancyLoaded: Bool,
        stock: Int,
        isSelected: Bool,
        isToday: Bool,
        isPlaceholder: Bool,
        isEnabled: Bool = true
    ) {
        dayLabel.text = "\(day)"

        if isPlaceholder {
            tileView.isHidden = true
            return
        }
        tileView.isHidden = false
        tileView.alpha = isEnabled ? 1 : 0.32

        let hasQty = occupancyLoaded && remaining != nil && isEnabled
        todayAccentView.isHidden = !isToday

        // Day identity — secondary; today uses brand (no filled circle).
        if isToday {
            dayLabel.font = Utils.mediumFont(size: 11)
            dayLabel.textColor = .brandPrimary
        } else {
            dayLabel.font = Utils.regularFont(size: 11)
            dayLabel.textColor = isEnabled ? .textSecondary : .textTertiary
        }

        // Qty = primary decision metric.
        if hasQty, let remaining {
            qtyLabel.isHidden = false
            qtyLabel.text = "\(remaining)"
            let level = AvailabilityHeatLevel.from(remaining: remaining, stock: stock)
            tileView.backgroundColor = level.fillColor
            qtyLabel.textColor = level.textColor
            qtyLabel.font = remaining == 0
                ? Utils.mediumFont(size: 15)
                : Utils.mediumFont(size: 16)
        } else {
            qtyLabel.isHidden = true
            qtyLabel.text = nil
            tileView.backgroundColor = UIColor.backgroundTertiary.withAlphaComponent(0.28)
        }

        // Selection = brand ring only (keeps heat readable).
        if isSelected {
            tileView.layer.borderWidth = 2
            tileView.layer.borderColor = UIColor.brandPrimary.cgColor
        } else {
            tileView.layer.borderWidth = 0
            tileView.layer.borderColor = UIColor.clear.cgColor
        }
    }

    override func prepareForReuse() {
        super.prepareForReuse()
        tileView.alpha = 1
        tileView.isHidden = false
        tileView.layer.borderWidth = 0
        tileView.layer.borderColor = UIColor.clear.cgColor
        todayAccentView.isHidden = true
        qtyLabel.isHidden = true
        qtyLabel.text = nil
        titleLabel.isHidden = true
        subtitleLabel.isHidden = true
    }
}

// MARK: - Inline occupancy calendar (remaining qty per day)

final class AvailabilityOccupancyCalendarView: UIView {

    var onSelectDate: ((Date) -> Void)?
    var onVisibleMonthChange: ((Date) -> Void)?

    private static let businessTimeZone = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
    private static var businessCalendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = Locale(identifier: "en_US_POSIX")
        calendar.timeZone = businessTimeZone
        return calendar
    }
    private static let dayKeyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = businessCalendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = businessTimeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private var minimumDate = AvailabilityOccupancyCalendarView.businessCalendar.startOfDay(for: Date())
    private var maximumDate = AvailabilityOccupancyCalendarView.businessCalendar.date(
        byAdding: .year,
        value: 1,
        to: Date()
    ) ?? Date()
    private var occupancyLoaded = false
    private var stockCapacity = 0
    private var availableByDate: [String: Int] = [:]
    /// Month the current `availableByDate` belongs to — heat/qty only when this matches the visible page.
    private var loadedOccupancyMonth: DateComponents?
    private var calendarHeightConstraint: Constraint?
    /// Tracks last tapped day so we can refresh only old/new selection — not the whole grid.
    private var lastSelectedDate: Date?
    /// Source of truth for the custom selection ring. Do not derive the ring from
    /// FSCalendar.selectedDates because that state changes during reload/transitions.
    private var selectedDayKey: String?

    /// Total stack height: legend + calendar (6 rows) + tap hint + padding — fixed so hint never clips.
    static var fixedBlockHeight: CGFloat {
        let hintEstimate: CGFloat = 36
        return 20 + 24 + 8 + preferredCalendarGridHeight + 8 + hintEstimate + 10
    }

    private lazy var legendView: UIView = {
        let view = UIView()

        func legendItem(accent: UIColor, title: String) -> UIView {
            let dot = UIView()
            dot.backgroundColor = accent
            dot.layer.cornerRadius = 4

            let label = UILabel()
            label.text = title
            label.font = Utils.mediumFont(size: 14)
            label.textColor = .textSecondary

            let row = UIStackView(arrangedSubviews: [dot, label])
            row.axis = .horizontal
            row.spacing = 6
            row.alignment = .center

            dot.snp.makeConstraints { make in
                make.width.height.equalTo(8)
            }
            return row
        }

        let stack = UIStackView(arrangedSubviews: [
            legendItem(accent: .availabilityOpenText, title: "availability_calendar_plenty".localized()),
            legendItem(accent: .availabilityLowText, title: "availability_calendar_low".localized()),
            legendItem(accent: .availabilityFullText, title: "availability_calendar_none".localized()),
        ])
        stack.axis = .horizontal
        stack.spacing = 16
        stack.distribution = .equalCentering
        view.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.centerX.equalToSuperview()
            make.top.bottom.equalToSuperview()
        }
        return view
    }()

    private lazy var calendar: FSCalendar = {
        let calendar = FSCalendar()
        calendar.delegate = self
        calendar.dataSource = self
        calendar.locale = Locale.langCode == LangCode.vi.rawValue
            ? Locale(identifier: "vi_VN")
            : Locale(identifier: "en_US")
        calendar.placeholderType = .fillHeadTail
        calendar.scrollEnabled = true
        calendar.scrollDirection = .horizontal
        // A slight finger drag must not move the selection to a neighbouring day.
        calendar.swipeToChooseGesture.isEnabled = false
        calendar.backgroundColor = .backgroundCard
        calendar.appearance.titleDefaultColor = .textPrimary
        calendar.appearance.headerTitleColor = .textPrimary
        calendar.appearance.weekdayTextColor = .textSecondary
        calendar.appearance.todayColor = .clear
        calendar.appearance.titleTodayColor = .clear
        calendar.appearance.todaySelectionColor = .clear
        calendar.appearance.selectionColor = .clear
        calendar.appearance.borderSelectionColor = .clear
        calendar.appearance.titleSelectionColor = .clear
        calendar.appearance.titleDefaultColor = .clear
        calendar.appearance.subtitleDefaultColor = .clear
        calendar.appearance.subtitleSelectionColor = .clear
        calendar.appearance.subtitleTodayColor = .clear
        calendar.appearance.headerTitleFont = Utils.boldFont(size: 15)
        calendar.appearance.titleFont = Utils.regularFont(size: 10)
        calendar.appearance.weekdayFont = Utils.mediumFont(size: 11)
        calendar.appearance.titlePlaceholderColor = .clear
        calendar.appearance.borderRadius = 0
        calendar.appearance.headerDateFormat = "MMMM yyyy"
        calendar.appearance.headerMinimumDissolvedAlpha = 0.15
        calendar.appearance.caseOptions = [.headerUsesCapitalized]
        // Keep header/weekday compact so rowHeight can stay tall without clipping.
        calendar.headerHeight = 40
        calendar.weekdayHeight = 22
        calendar.rowHeight = Self.dayRowHeight
        calendar.adjustsBoundingRectWhenChangingMonths = false
        calendar.allowsMultipleSelection = false
        calendar.register(
            AvailabilityCalendarDayCell.self,
            forCellReuseIdentifier: AvailabilityCalendarDayCell.reuseId
        )
        return calendar
    }()

    static var dayRowHeight: CGFloat {
        UIDevice.current.userInterfaceIdiom == .pad ? 74 : 68
    }

    /// header + weekday + up to 6 rows (FSCalendar may use 5–6).
    static var preferredCalendarGridHeight: CGFloat {
        40 + 22 + (dayRowHeight * 6)
    }

    static func weekRowCount(for month: Date, calendar cal: Calendar = .current) -> Int {
        guard let startOfMonth = cal.date(from: cal.dateComponents([.year, .month], from: month)),
              let dayRange = cal.range(of: .day, in: .month, for: startOfMonth) else {
            return 6
        }
        let daysInMonth = dayRange.count
        let weekdayOfFirst = cal.component(.weekday, from: startOfMonth)
        let startOffset = (weekdayOfFirst - cal.firstWeekday + 7) % 7
        return (startOffset + daysInMonth + 6) / 7
    }

    static func gridHeight(for month: Date, rowHeight: CGFloat = dayRowHeight) -> CGFloat {
        let weeks = CGFloat(weekRowCount(for: month))
        return 40 + 22 + (rowHeight * weeks)
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        calendar.layoutIfNeeded()
    }

    private func setupUI() {
        backgroundColor = .clear

        let cardView = UIView()
        cardView.backgroundColor = .backgroundCard
        cardView.layer.cornerRadius = 12
        cardView.layer.borderWidth = 1
        cardView.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.45).cgColor
        cardView.clipsToBounds = true

        let stack = UIStackView(arrangedSubviews: [legendView, calendar, tapHintLabel])
        stack.axis = .vertical
        stack.spacing = 8
        cardView.addSubview(stack)
        addSubview(cardView)

        cardView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: 8, bottom: 10, right: 8))
        }
        legendView.snp.makeConstraints { make in
            make.height.equalTo(24)
        }
        calendar.snp.makeConstraints { make in
            calendarHeightConstraint = make.height.equalTo(Self.preferredCalendarGridHeight).constraint
        }
        calendar.backgroundColor = .clear
    }

    private lazy var tapHintLabel: UILabel = {
        let label = UILabel()
        label.text = "availability_calendar_tap_hint".localized()
        label.font = Utils.regularFont(size: 13)
        label.textColor = .textTertiary
        label.textAlignment = .center
        label.numberOfLines = 2
        label.setContentCompressionResistancePriority(.required, for: .vertical)
        label.setContentHuggingPriority(.required, for: .vertical)
        return label
    }()

    private var initialCalendarHeight: CGFloat {
        Self.preferredCalendarGridHeight
    }

    func configure(selectedDate: Date, minimumDate: Date? = nil, maximumDate: Date? = nil) {
        if let minimumDate {
            self.minimumDate = Self.businessCalendar.startOfDay(for: minimumDate)
        }
        if let maximumDate {
            self.maximumDate = Self.businessCalendar.startOfDay(for: maximumDate)
        }
        let day = Self.businessCalendar.startOfDay(for: selectedDate)
        let selectedMonth = Self.businessCalendar.dateComponents([.year, .month], from: day)
        let visibleMonth = Self.businessCalendar.dateComponents([.year, .month], from: calendar.currentPage)
        let needsFullReload = selectedMonth != visibleMonth
        if needsFullReload {
            calendar.setCurrentPage(day, animated: false)
        }

        let previousSelections = calendar.selectedDates
        let previousHighlightedDate = lastSelectedDate
        selectedDayKey = Self.dayKeyFormatter.string(from: day)
        let alreadySelected = previousSelections.contains { Self.businessCalendar.isDate($0, inSameDayAs: day) }
        if !alreadySelected {
            previousSelections.forEach { calendar.deselect($0) }
            calendar.select(day)
        }
        lastSelectedDate = day

        calendar.rowHeight = Self.dayRowHeight
        if needsFullReload {
            reloadCalendarWithoutAnimation()
        } else {
            refreshSelectionAppearance(
                previousDates: [previousHighlightedDate].compactMap { $0 },
                newDate: day
            )
        }
        syncCalendarHeight()
        onVisibleMonthChange?(calendar.currentPage)
    }

    /// First day of the month currently shown in the calendar pager.
    var visibleMonthStart: Date {
        Self.businessCalendar.date(
            from: Self.businessCalendar.dateComponents([.year, .month], from: calendar.currentPage)
        ) ?? calendar.currentPage
    }

    func setDayAvailability(_ availableByDate: [String: Int], stock: Int, forVisibleMonth month: Date) {
        loadedOccupancyMonth = Self.businessCalendar.dateComponents([.year, .month], from: month)
        occupancyLoaded = true
        stockCapacity = max(0, stock)
        self.availableByDate = availableByDate
        calendar.rowHeight = Self.dayRowHeight
        reloadCalendarWithoutAnimation()
        syncCalendarHeight()
    }

    /// Neutral cells while fetching a new month — no stale heat or red "0".
    func clearDayAvailabilityPendingLoad() {
        occupancyLoaded = false
        loadedOccupancyMonth = nil
        availableByDate = [:]
        reloadCalendarWithoutAnimation()
    }

    private func reloadCalendarWithoutAnimation() {
        UIView.performWithoutAnimation {
            calendar.reloadData()
            calendar.layoutIfNeeded()
        }
    }

    private func refreshSelectionAppearance(previousDates: [Date], newDate: Date) {
        var datesToRefresh = previousDates
        datesToRefresh.append(newDate)
        refreshVisibleDayCells(for: datesToRefresh)
    }

    private func refreshVisibleDayCells(for dates: [Date]) {
        let positions: [FSCalendarMonthPosition] = [.previous, .current, .next]
        UIView.performWithoutAnimation {
            for date in dates {
                for position in positions {
                    guard let cell = calendar.cell(for: date, at: position) else { continue }
                    configureDayCell(cell, for: date, at: position)
                }
            }
        }
    }

    private func syncCalendarHeight() {
        calendarHeightConstraint?.update(offset: Self.preferredCalendarGridHeight)
    }

    private var visiblePageMonth: DateComponents {
        Self.businessCalendar.dateComponents([.year, .month], from: calendar.currentPage)
    }

    private func isOccupancyVisible(for date: Date, at monthPosition: FSCalendarMonthPosition) -> Bool {
        guard occupancyLoaded, monthPosition == .current else { return false }
        guard let loadedOccupancyMonth else { return false }
        let cellMonth = Self.businessCalendar.dateComponents([.year, .month], from: date)
        // Keep current-month UI while swiping; only paint cells that belong to the loaded month.
        guard cellMonth == loadedOccupancyMonth, cellMonth == visiblePageMonth else { return false }
        let day = Self.businessCalendar.startOfDay(for: date)
        return day >= minimumDate && day <= maximumDate
    }

    private func remainingQuantity(for date: Date) -> Int? {
        guard isOccupancyVisible(for: date, at: .current) else { return nil }
        let key = Self.dayKeyFormatter.string(from: date)
        return availableByDate[key] ?? 0
    }

    private func configureDayCell(_ cell: FSCalendarCell, for date: Date, at monthPosition: FSCalendarMonthPosition) {
        guard let dayCell = cell as? AvailabilityCalendarDayCell else { return }
        let day = Self.businessCalendar.component(.day, from: date)
        let inCurrentMonth = monthPosition == .current
        let showOccupancy = isOccupancyVisible(for: date, at: monthPosition)
        let remaining = showOccupancy ? remainingQuantity(for: date) : nil
        let isSelected = selectedDayKey == Self.dayKeyFormatter.string(from: date)
        let dayStart = Self.businessCalendar.startOfDay(for: date)
        let isEnabled = inCurrentMonth && dayStart >= minimumDate && dayStart <= maximumDate
        dayCell.configure(
            day: day,
            remaining: remaining,
            occupancyLoaded: showOccupancy,
            stock: stockCapacity,
            isSelected: isSelected,
            isToday: Self.businessCalendar.isDateInToday(date),
            isPlaceholder: !inCurrentMonth,
            isEnabled: isEnabled
        )
    }
}

extension AvailabilityOccupancyCalendarView: FSCalendarDelegate, FSCalendarDataSource, FSCalendarDelegateAppearance {
    func minimumDate(for calendar: FSCalendar) -> Date { minimumDate }
    func maximumDate(for calendar: FSCalendar) -> Date { maximumDate }

    func calendar(_ calendar: FSCalendar, boundingRectWillChange bounds: CGRect, animated: Bool) {
        calendarHeightConstraint?.update(offset: Self.preferredCalendarGridHeight)
    }

    func calendar(_ calendar: FSCalendar, cellFor date: Date, at position: FSCalendarMonthPosition) -> FSCalendarCell {
        calendar.dequeueReusableCell(
            withIdentifier: AvailabilityCalendarDayCell.reuseId,
            for: date,
            at: position
        )
    }

    func calendar(_ calendar: FSCalendar, willDisplay cell: FSCalendarCell, for date: Date, at monthPosition: FSCalendarMonthPosition) {
        configureDayCell(cell, for: date, at: monthPosition)
    }

    func calendarCurrentPageDidChange(_ calendar: FSCalendar) {
        syncCalendarHeight()
        onVisibleMonthChange?(calendar.currentPage)
    }

    func calendar(_ calendar: FSCalendar, shouldSelect date: Date, at monthPosition: FSCalendarMonthPosition) -> Bool {
        guard monthPosition == .current else { return false }
        let day = Self.businessCalendar.startOfDay(for: date)
        return day >= minimumDate && day <= maximumDate
    }

    func calendar(_ calendar: FSCalendar, didSelect date: Date, at monthPosition: FSCalendarMonthPosition) {
        let day = Self.businessCalendar.startOfDay(for: date)
        var previousDates: [Date] = []
        if let lastSelectedDate,
           !Self.businessCalendar.isDate(lastSelectedDate, inSameDayAs: day) {
            previousDates.append(lastSelectedDate)
        }
        lastSelectedDate = day
        selectedDayKey = Self.dayKeyFormatter.string(from: day)
        refreshSelectionAppearance(previousDates: previousDates, newDate: day)
        onSelectDate?(day)
    }

    func calendar(_ calendar: FSCalendar, appearance: FSCalendarAppearance, fillDefaultColorFor date: Date) -> UIColor? {
        .clear
    }

    func calendar(_ calendar: FSCalendar, appearance: FSCalendarAppearance, fillSelectionColorFor date: Date) -> UIColor? {
        .clear
    }
}

// MARK: - Order history sheet (Order Check)

final class AvailabilityOrderHistorySheetViewController: UIViewController {

    var onSelectOrder: ((NewAvailabilityOrder) -> Void)?

    private let orders: [NewAvailabilityOrder]
    private let dateTitle: String
    private let stock: Int
    private let available: Int
    private let renting: Int
    private let conflictOrderCount: Int

    private lazy var tableView: UITableView = {
        let table = UITableView(frame: .zero, style: .plain)
        table.delegate = self
        table.dataSource = self
        table.register(
            AvailabilityHistoryCell.self,
            forCellReuseIdentifier: AvailabilityHistoryCell.reuseIdentifier
        )
        table.separatorStyle = .none
        table.backgroundColor = .backgroundPrimary
        table.rowHeight = UITableViewAutomaticDimension
        table.estimatedRowHeight = 112
        table.contentInset = UIEdgeInsets(top: 0, left: 0, bottom: 16, right: 0)
        if orders.isEmpty {
            let emptyLabel = UILabel()
            emptyLabel.text = "No orders for this day".localized()
            emptyLabel.font = Utils.regularFont(size: 15)
            emptyLabel.textColor = .textSecondary
            emptyLabel.textAlignment = .center
            emptyLabel.numberOfLines = 0
            table.backgroundView = emptyLabel
        }
        return table
    }()

    init(
        orders: [NewAvailabilityOrder],
        dateTitle: String,
        stock: Int,
        available: Int,
        renting: Int,
        conflictOrderCount: Int = 0
    ) {
        self.orders = orders
        self.dateTitle = dateTitle
        self.stock = stock
        self.available = available
        self.renting = renting
        self.conflictOrderCount = conflictOrderCount
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .backgroundPrimary

        let titleLabel = UILabel()
        titleLabel.font = Utils.boldFont(size: 17)
        titleLabel.textColor = .textPrimary
        titleLabel.textAlignment = .center
        titleLabel.numberOfLines = 2
        titleLabel.text = String(format: "availability_orders_sheet_title".localized(), dateTitle)

        let metricsCard = makeMetricsHeader()
        let orderSummaryBanner = AvailabilityOrderSummaryBannerView()

        let headerStack: UIStackView
        if orders.isEmpty {
            let emptyLabel = UILabel()
            emptyLabel.text = "availability_history_empty".localized()
            emptyLabel.font = .captionMedium(size: 13)
            emptyLabel.textColor = .textSecondary
            emptyLabel.textAlignment = .center
            emptyLabel.numberOfLines = 0
            headerStack = UIStackView(arrangedSubviews: [titleLabel, emptyLabel, metricsCard])
        } else {
            orderSummaryBanner.configure(
                totalOrderCount: orders.count,
                conflictOrderCount: conflictOrderCount,
                checkDate: dateTitle
            )
            headerStack = UIStackView(arrangedSubviews: [titleLabel, orderSummaryBanner, metricsCard])
        }

        headerStack.axis = .vertical
        headerStack.spacing = 10
        headerStack.alignment = .fill
        headerStack.setCustomSpacing(4, after: titleLabel)

        view.addSubview(headerStack)
        view.addSubview(tableView)

        headerStack.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(8)
            make.leading.trailing.equalToSuperview().inset(16)
        }
        tableView.snp.makeConstraints { make in
            make.top.equalTo(headerStack.snp.bottom).offset(12)
            make.leading.trailing.bottom.equalToSuperview()
        }

        if let sheet = sheetPresentationController {
            sheet.detents = [.medium(), .large()]
            sheet.prefersGrabberVisible = true
            sheet.preferredCornerRadius = 16
        }
    }

    private func makeMetricsHeader() -> UIView {
        let card = AvailabilityMetricsCardView()
        card.configure(stock: stock, available: available, renting: renting)
        return card
    }
}

extension AvailabilityOrderHistorySheetViewController: UITableViewDataSource, UITableViewDelegate {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        orders.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        guard let cell = tableView.dequeueReusableCell(
            withIdentifier: AvailabilityHistoryCell.reuseIdentifier,
            for: indexPath
        ) as? AvailabilityHistoryCell else {
            return UITableViewCell()
        }
        cell.bind(order: orders[indexPath.row])
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        onSelectOrder?(orders[indexPath.row])
    }
}

// MARK: - Order Check history toggle bar (legacy — unused in Order Check sheet flow)

final class AvailabilityOrderCheckHistoryBarView: UIView {

    var onHistoryTap: (() -> Void)?

    private lazy var historyButton: RCPrimaryButton = {
        let button = RCPrimaryButton(
            title: "View order history".localized(),
            borderStyle: true,
            borderColor: .brandPrimary
        )
        button.addTarget(self, action: #selector(historyTapped), for: .touchUpInside)
        return button
    }()

    private let countPillView: UIView = {
        let view = UIView()
        view.backgroundColor = .backgroundTertiary
        view.layer.cornerRadius = 10
        view.isHidden = true
        return view
    }()

    private let countLabel: UILabel = {
        let label = UILabel()
        label.font = .captionMedium(size: 12)
        label.textColor = .textSecondary
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
        backgroundColor = .backgroundPrimary

        countPillView.addSubview(countLabel)
        addSubview(historyButton)
        addSubview(countPillView)

        historyButton.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(4)
            make.leading.trailing.equalToSuperview().inset(16)
            make.height.equalTo(44)
            make.bottom.equalToSuperview().offset(-8)
        }

        countLabel.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 4, left: 8, bottom: 4, right: 8))
        }

        countPillView.snp.makeConstraints { make in
            make.trailing.equalTo(historyButton.snp.trailing).offset(-12)
            make.centerY.equalTo(historyButton)
        }
    }

    func configure(orderCount: Int, isExpanded: Bool) {
        let title = isExpanded
            ? "Hide order history".localized()
            : "View order history".localized()
        historyButton.setButtonTitle(title)

        if orderCount > 0 {
            countPillView.isHidden = false
            countLabel.text = String(format: "availability_order_count".localized(), orderCount)
        } else {
            countPillView.isHidden = true
        }
    }

    @objc private func historyTapped() {
        onHistoryTap?()
    }
}
