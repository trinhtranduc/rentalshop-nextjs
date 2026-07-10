//
//  CalendarHeaderCell.swift
//  POS ADBD
//
//  Created by Trinh Tran on 11/29/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit

final class CalendarDateInfoView: UIView {
    private let iconImageView = UIImageView()
    private let titleLabel = UILabel()
    private let valueLabel = UILabel()
    private let textStackView = UIStackView()
    private let rowStackView = UIStackView()

    init(symbolName: String) {
        super.init(frame: .zero)
        iconImageView.image = UIImage(systemName: symbolName)?.withRenderingMode(.alwaysTemplate)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        backgroundColor = .clear

        iconImageView.contentMode = .scaleAspectFit
        iconImageView.translatesAutoresizingMaskIntoConstraints = false
        iconImageView.setContentHuggingPriority(.required, for: .horizontal)

        titleLabel.font = .captionMedium(size: 11)
        titleLabel.textColor = .textSecondary
        titleLabel.numberOfLines = 1

        valueLabel.font = .bodyRegular(size: 13)
        valueLabel.textColor = .textPrimary
        valueLabel.numberOfLines = 2

        textStackView.axis = .vertical
        textStackView.spacing = 2
        textStackView.alignment = .leading
        textStackView.translatesAutoresizingMaskIntoConstraints = false
        textStackView.addArrangedSubview(titleLabel)
        textStackView.addArrangedSubview(valueLabel)

        rowStackView.axis = .horizontal
        rowStackView.spacing = 6
        rowStackView.alignment = .top
        rowStackView.translatesAutoresizingMaskIntoConstraints = false
        rowStackView.addArrangedSubview(iconImageView)
        rowStackView.addArrangedSubview(textStackView)

        addSubview(rowStackView)

        NSLayoutConstraint.activate([
            rowStackView.topAnchor.constraint(equalTo: topAnchor),
            rowStackView.leadingAnchor.constraint(equalTo: leadingAnchor),
            rowStackView.trailingAnchor.constraint(equalTo: trailingAnchor),
            rowStackView.bottomAnchor.constraint(equalTo: bottomAnchor),

            iconImageView.widthAnchor.constraint(equalToConstant: 14),
            iconImageView.heightAnchor.constraint(equalToConstant: 14),
            iconImageView.topAnchor.constraint(equalTo: rowStackView.topAnchor, constant: 1)
        ])
    }

    func configure(title: String, value: String) {
        titleLabel.text = title
        valueLabel.text = value
        iconImageView.tintColor = titleLabel.textColor
    }
}

class CalendarHeaderCell: UITableViewHeaderFooterView, UIGestureRecognizerDelegate {
    private enum Metrics {
        static let cardCornerRadius: CGFloat = 12
        static let cardPadding: CGFloat = 10
        static let cardHorizontalInset: CGFloat = 12
        static let cardTopInset: CGFloat = 4
    }

    private lazy var cardView: UIView = {
        let view = UIView()
        view.backgroundColor = .backgroundCard
        view.layer.cornerRadius = Metrics.cardCornerRadius
        view.layer.borderWidth = 1
        view.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.55).cgColor
        view.layer.shadowColor = UIColor.black.cgColor
        view.layer.shadowOpacity = 0.03
        view.layer.shadowRadius = 8
        view.layer.shadowOffset = CGSize(width: 0, height: 3)
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private lazy var contentStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()

    private lazy var topRowStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.alignment = .top
        stack.spacing = 10
        return stack
    }()

    private lazy var customerRowStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.alignment = .center
        stack.spacing = 8
        return stack
    }()

    private lazy var datesRowStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.alignment = .top
        stack.distribution = .fillEqually
        stack.spacing = 8
        return stack
    }()

    private lazy var orderNumberLabel: UILabel = {
        let label = UILabel()
        // Match SaleViewController's order code style (SaleDetailCell_Option5):
        // modest regular font, not a large bold title.
        label.font = Utils.regularFont(size: 15)
        label.textColor = .textPrimary
        label.numberOfLines = 1
        return label
    }()

    private lazy var statusBadge: OrderStatusPillLabel = {
        let label = OrderStatusPillLabel()
        return label
    }()

    private lazy var expandButton: UIButton = {
        let button = UIButton(type: .system)
        button.setImage(UIImage(systemName: "chevron.down"), for: .normal)
        button.tintColor = .textSecondary
        button.backgroundColor = .backgroundPrimary
        button.layer.cornerRadius = 12
        button.addTarget(self, action: #selector(expandButtonTapped), for: .touchUpInside)
        button.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            button.widthAnchor.constraint(equalToConstant: 28),
            button.heightAnchor.constraint(equalToConstant: 28)
        ])
        return button
    }()

    private lazy var customerNameLabel: UILabel = {
        let label = UILabel()
        // Match the today-orders cell (SaleCell .chart) customer name size:
        // medium 15 on iPad / 14 on iPhone, primary colour.
        label.font = Utils.mediumFont(size: UIDevice.current.userInterfaceIdiom == .pad ? 15 : 14)
        label.textColor = .textPrimary
        label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        return label
    }()

    private lazy var dotLabel: UILabel = {
        let label = UILabel()
        label.text = "•"
        label.font = .bodyRegular(size: 14)
        label.textColor = .textSecondary
        return label
    }()

    private lazy var phoneLabel: UILabel = {
        let label = UILabel()
        label.font = .bodyRegular(size: 15)
        label.textColor = .textSecondary // gray, non-tappable — same as the sale order cell
        label.numberOfLines = 1
        return label
    }()

    private lazy var phoneRevealButton: UIButton = {
        let button = UIButton(type: .system)
        button.setImage(UIImage.revealEye(revealed: false), for: .normal)
        button.tintColor = .textSecondary
        button.setContentHuggingPriority(.required, for: .horizontal)
        button.setContentCompressionResistancePriority(.required, for: .horizontal)
        button.addTarget(self, action: #selector(togglePhoneReveal), for: .touchUpInside)
        button.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            button.widthAnchor.constraint(equalToConstant: 24),
            button.heightAnchor.constraint(equalToConstant: 24)
        ])
        return button
    }()

    private var isCalendarPhoneRevealed = false
    private var customerPhoneRaw: String?

    lazy var preparedButton: UIButton = {
        let button = UIButton(type: .custom)
        button.setImage(UIImage(systemName: "square"), for: .normal)
        button.setImage(UIImage(systemName: "checkmark.square.fill"), for: .selected)
        button.tintColor = .brandPrimary
        button.addTarget(self, action: #selector(preparedButtonTapped), for: .touchUpInside)
        button.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            button.widthAnchor.constraint(equalToConstant: 22),
            button.heightAnchor.constraint(equalToConstant: 22)
        ])
        return button
    }()

    private lazy var readyToDeliverLabel: UILabel = {
        let label = UILabel()
        label.text = "Ready Deliver".localized()
        label.font = .bodyMedium(size: 14)
        label.textColor = .brandPrimary
        return label
    }()

    private lazy var preparedStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [preparedButton, readyToDeliverLabel])
        stack.axis = .horizontal
        stack.alignment = .center
        stack.spacing = 8
        return stack
    }()

    private lazy var orderDateInfoView = CalendarDateInfoView(symbolName: "calendar.badge.clock")
    private lazy var pickupDateInfoView = CalendarDateInfoView(symbolName: "arrow.up.circle")
    private lazy var returnDateInfoView = CalendarDateInfoView(symbolName: "arrow.down.circle")

    var onExpandTapped: (() -> Void)?
    var onReadyToDeliverTapped: ((Bool, Int) -> Void)?

    private var order: Order?
    private var calendarOrder: CalendarOrder?
    private var isExpanded = false
    private var showsProductRows = false

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }

    override init(reuseIdentifier: String?) {
        super.init(reuseIdentifier: reuseIdentifier)
        setupUI()
    }

    private func setupUI() {
        backgroundView = UIView()
        backgroundView?.backgroundColor = .clear
        contentView.backgroundColor = .clear

        contentView.addSubview(cardView)
        cardView.addSubview(contentStackView)

        contentStackView.addArrangedSubview(topRowStackView)
        contentStackView.addArrangedSubview(customerRowStackView)
        contentStackView.addArrangedSubview(datesRowStackView)

        let topSpacer = UIView()
        topSpacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
        topSpacer.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        let topTrailingStackView = UIStackView(arrangedSubviews: [statusBadge, expandButton])
        topTrailingStackView.axis = .horizontal
        topTrailingStackView.alignment = .center
        topTrailingStackView.spacing = 8
        topTrailingStackView.setContentHuggingPriority(.required, for: .horizontal)

        topRowStackView.addArrangedSubview(orderNumberLabel)
        topRowStackView.addArrangedSubview(topSpacer)
        topRowStackView.addArrangedSubview(topTrailingStackView)

        // Customer name • phone on the left, the "Ready to deliver" control pinned
        // to the right — all on the same line.
        let customerSpacer = UIView()
        customerSpacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
        customerSpacer.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        preparedStackView.setContentHuggingPriority(.required, for: .horizontal)
        preparedStackView.setContentCompressionResistancePriority(.required, for: .horizontal)

        customerRowStackView.addArrangedSubview(customerNameLabel)
        customerRowStackView.addArrangedSubview(dotLabel)
        customerRowStackView.addArrangedSubview(phoneLabel)
        customerRowStackView.addArrangedSubview(phoneRevealButton)
        customerRowStackView.addArrangedSubview(customerSpacer)
        customerRowStackView.addArrangedSubview(preparedStackView)

        datesRowStackView.addArrangedSubview(orderDateInfoView)
        datesRowStackView.addArrangedSubview(pickupDateInfoView)
        datesRowStackView.addArrangedSubview(returnDateInfoView)

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: Metrics.cardTopInset),
            cardView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: Metrics.cardHorizontalInset),
            cardView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -Metrics.cardHorizontalInset),
            cardView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor),

            contentStackView.topAnchor.constraint(equalTo: cardView.topAnchor, constant: Metrics.cardPadding),
            contentStackView.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: Metrics.cardPadding),
            contentStackView.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -Metrics.cardPadding),
            contentStackView.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -Metrics.cardPadding)
        ])

        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(headerTapped))
        tapGesture.delegate = self
        cardView.addGestureRecognizer(tapGesture)
    }

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
        !(touch.view is UIControl)
    }

    func bind(calendarOrder: CalendarOrder, isExpanded: Bool = false, showsProductRows: Bool = true) {
        self.calendarOrder = calendarOrder
        self.order = nil
        self.isExpanded = isExpanded
        self.showsProductRows = showsProductRows

        orderNumberLabel.text = formattedOrderIdentifier(calendarOrder.orderNumber)
        customerNameLabel.text = calendarOrder.customerName ?? "N/A"
        configurePhone(calendarOrder.customerPhone)
        preparedButton.isSelected = calendarOrder.isReadyToDeliver ?? false

        setupStatusBadge(statusString: calendarOrder.status, orderType: .rent)

        let orderDate = parseCalendarDate(calendarOrder.createdAt)
        let pickupDate = parseCalendarDate(calendarOrder.pickupPlanAt)
        let returnDate = parseCalendarDate(calendarOrder.returnPlanAt)

        orderDateInfoView.configure(
            title: "Order date".localized(),
            value: formattedDate(orderDate, includeTime: true)
        )
        pickupDateInfoView.configure(
            title: "Pickup date".localized(),
            value: formattedDate(pickupDate)
        )
        returnDateInfoView.configure(
            title: "Return date".localized(),
            value: formattedDate(returnDate)
        )

        let statusString = calendarOrder.status?.uppercased() ?? ""
        preparedStackView.isHidden = !(statusString == "RESERVED" || statusString == "PENDING" || statusString == "DRAFT")

        applyCardShape()
        updateExpandState(animated: false)
    }

    func bind(order: Order, isExpanded: Bool = false, showsProductRows: Bool = true) {
        self.order = order
        self.calendarOrder = nil
        self.isExpanded = isExpanded
        self.showsProductRows = showsProductRows

        orderNumberLabel.text = formattedOrderIdentifier(order.orderNumber)
        customerNameLabel.text = order.customerName
        configurePhone(order.customerPhone)
        preparedButton.isSelected = order.isReadyToDeliver

        setupStatusBadge(status: order.status, orderType: order.orderType)
        orderDateInfoView.configure(
            title: "Order date".localized(),
            value: order.createdAt.dateTimeInString() ?? "N/A"
        )
        pickupDateInfoView.configure(
            title: "Pickup date".localized(),
            value: formattedDate(order.pickupDate)
        )
        returnDateInfoView.configure(
            title: "Return date".localized(),
            value: formattedDate(order.returnDate)
        )

        preparedStackView.isHidden = order.orderType == .sale

        applyCardShape()
        updateExpandState(animated: false)
    }

    override func prepareForReuse() {
        super.prepareForReuse()
        order = nil
        calendarOrder = nil
        onExpandTapped = nil
        onReadyToDeliverTapped = nil
        preparedButton.isSelected = false
        isCalendarPhoneRevealed = false
        customerPhoneRaw = nil
        phoneRevealButton.setImage(UIImage.revealEye(revealed: false), for: .normal)
    }

    /// Configures the phone display: masked by default, tappable-to-call button
    /// title plus an eye toggle. Hides the phone/dot/eye when there's no number.
    private func configurePhone(_ phone: String?) {
        customerPhoneRaw = phone
        isCalendarPhoneRevealed = false
        phoneRevealButton.setImage(UIImage.revealEye(revealed: false), for: .normal)
        let isEmpty = (phone ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        dotLabel.isHidden = isEmpty
        phoneLabel.isHidden = isEmpty
        phoneRevealButton.isHidden = isEmpty
        updatePhoneLabel()
    }

    private func updatePhoneLabel() {
        let phone = (customerPhoneRaw ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        phoneLabel.text = isCalendarPhoneRevealed ? phone : phone.maskedPhoneNumber
    }

    @objc private func togglePhoneReveal() {
        isCalendarPhoneRevealed.toggle()
        phoneRevealButton.setImage(UIImage.revealEye(revealed: isCalendarPhoneRevealed), for: .normal)
        updatePhoneLabel()
    }

    @objc private func preparedButtonTapped() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()

        let newState = !preparedButton.isSelected
        preparedButton.isSelected = newState

        var orderId: Int?
        var isRentOrder = false

        if let order = order {
            orderId = order.id
            isRentOrder = order.orderType == .rent
        } else if let calendarOrder = calendarOrder {
            orderId = calendarOrder.id
            let status = calendarOrder.status?.uppercased() ?? ""
            isRentOrder = (status == "RESERVED" || status == "PENDING" || status == "DRAFT")
        }

        if let orderId = orderId, orderId > 0, isRentOrder {
            onReadyToDeliverTapped?(newState, orderId)
        } else {
            preparedButton.isSelected = !newState
        }
    }

    @objc private func expandButtonTapped() {
        requestExpandToggle()
    }

    @objc private func headerTapped() {
        requestExpandToggle()
    }

    private func requestExpandToggle() {
        guard showsProductRows else { return }
        onExpandTapped?()
    }

    private func applyCardShape() {
        let radius = Metrics.cardCornerRadius
        if isExpanded && showsProductRows {
            cardView.layer.cornerRadius = radius
            cardView.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
        } else {
            cardView.layer.cornerRadius = radius
            cardView.layer.maskedCorners = [
                .layerMinXMinYCorner,
                .layerMaxXMinYCorner,
                .layerMinXMaxYCorner,
                .layerMaxXMaxYCorner
            ]
        }
    }

    func updateExpandState(animated: Bool) {
        let transform = (isExpanded && showsProductRows) ? CGAffineTransform(rotationAngle: .pi) : .identity
        let updates = {
            self.expandButton.transform = transform
        }

        if animated {
            UIView.animate(withDuration: 0.24, animations: updates)
        } else {
            updates()
        }

        expandButton.isHidden = !showsProductRows
    }

    /// Same format as SaleViewController (SaleDetailCell_Option5): trim, and only
    /// prepend "#" when it isn't already present so codes don't end up as "##123".
    private func formattedOrderIdentifier(_ rawValue: String?) -> String {
        let trimmed = (rawValue ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return "#N/A".localized() }
        return trimmed.hasPrefix("#") ? trimmed : "#\(trimmed)"
    }

    private func parseCalendarDate(_ rawValue: String?) -> Date? {
        guard let rawValue, !rawValue.isEmpty else { return nil }

        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.timeZone = TimeZone(abbreviation: "UTC")
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        if let date = isoFormatter.date(from: rawValue) {
            return date
        }

        isoFormatter.formatOptions = [.withInternetDateTime]
        if let date = isoFormatter.date(from: rawValue) {
            return date
        }

        let fallbackFormatter = DateFormatter()
        fallbackFormatter.locale = Locale(identifier: "en_US_POSIX")
        fallbackFormatter.timeZone = TimeZone(abbreviation: "UTC")
        fallbackFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss'Z'"
        return fallbackFormatter.date(from: rawValue)
    }

    private func formattedDate(_ date: Date?, includeTime: Bool = false) -> String {
        guard let date else { return "N/A" }
        if includeTime {
            return date.dateTimeInString() ?? "N/A"
        }
        return date.dateInString() ?? "N/A"
    }

    private func setupStatusBadge(status: OrderStatus, orderType: OrderType) {
        statusBadge.apply(status: status)
    }

    private func setupStatusBadge(statusString: String?, orderType: OrderType) {
        guard let statusString, let status = OrderStatus.from(apiString: statusString) else {
            statusBadge.clearBadge()
            return
        }
        statusBadge.apply(status: status)
    }
}
