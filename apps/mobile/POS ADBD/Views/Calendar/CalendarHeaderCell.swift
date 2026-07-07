//
//  CalendarHeaderCell.swift
//  POS ADBD
//
//  Created by Trinh Tran on 11/29/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import RealmSwift

class CalendarHeaderCell: UITableViewHeaderFooterView {
    
    // MARK: - UI Components
    private lazy var containerStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()
    
    private lazy var topRowStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .center
        return stack
    }()
    
    private lazy var middleRowStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .center
        return stack
    }()
    
    private lazy var bottomRowStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .center
        stack.distribution = .fill
        return stack
    }()
    
    private lazy var orderNumberLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 16) // Match AccountViewController text chính
        return label
    }()
    
    private lazy var nameLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 16) // Match AccountViewController text chính
        return label
    }()
    
    private lazy var orderDateTitleLabel: UILabel = {
        let label = UILabel()
        label.text = "Order date".localized()
        label.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
        label.textColor = .secondaryLabel
        return label
    }()
    
    private lazy var orderDateLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 16) // Match AccountViewController text chính
        label.textColor = .label
        return label
    }()
    
    private lazy var getDateTitleLabel: UILabel = {
        let label = UILabel()
        label.text = "Pickup date".localized()
        label.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
        label.textColor = .secondaryLabel
        return label
    }()
    
    private lazy var getDateLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 16) // Match AccountViewController text chính
        label.textColor = .label
        return label
    }()
    
    private lazy var getTimeLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
        label.textColor = .secondaryLabel
        return label
    }()
    
    private lazy var returnDateTitleLabel: UILabel = {
        let label = UILabel()
        label.text = "Return date".localized()
        label.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
        label.textColor = .secondaryLabel
        return label
    }()
    
    private lazy var returnDateLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 16) // Match AccountViewController text chính
        label.textColor = .label
        return label
    }()
    
    private lazy var returnTimeLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
        label.textColor = .secondaryLabel
        return label
    }()
    
    private lazy var noteLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
        label.textColor = .systemGray
        label.numberOfLines = 0
        return label
    }()
    
    private lazy var statusBadge: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 11)
        label.textColor = .white
        label.textAlignment = .center
        label.layer.cornerRadius = 12
        label.clipsToBounds = true
        label.setContentHuggingPriority(.required, for: .horizontal)
        label.setContentCompressionResistancePriority(.required, for: .horizontal)
        return label
    }()
    
    private lazy var _preparedButton: UIButton = {
        let button = UIButton(type: .custom)
        button.setImage(UIImage(systemName: "square"), for: .normal)
        button.setImage(UIImage(systemName: "checkmark.square.fill"), for: .selected)
        button.tintColor = APP_TONE_COLOR
        button.contentMode = .scaleAspectFit
        button.imageView?.contentMode = .scaleAspectFit
        
        button.widthAnchor.constraint(equalToConstant: 24).isActive = true
        button.heightAnchor.constraint(equalToConstant: 24).isActive = true
        
        button.addTarget(self, action: #selector(preparedButtonTapped), for: .touchUpInside)
        return button
    }()
    
    // Expose preparedButton for external access (e.g., to revert state on error)
    var preparedButton: UIButton {
        return _preparedButton
    }
    
    private lazy var phoneButton: UIButton = {
        let button = UIButton(type: .system)
        button.titleLabel?.font = Utils.regularFont(size: 16) // Match AccountViewController text chính
        button.setTitleColor(.label, for: .normal)
        button.addTarget(self, action: #selector(phoneButtonTapped), for: .touchUpInside)
        return button
    }()
    
    // Add expand button
    private lazy var expandButton: UIButton = {
        let button = UIButton(type: .system)
        button.setImage(UIImage(systemName: "chevron.down"), for: .normal)
        button.tintColor = .systemGray
        button.addTarget(self, action: #selector(expandButtonTapped), for: .touchUpInside)
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }()

    // Add expand indicator view
    private lazy var expandIndicatorView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        
        // Add expand icon only
        let imageView = UIImageView(image: UIImage(systemName: "chevron.down"))
        imageView.tintColor = .label
        imageView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(imageView)
        
        NSLayoutConstraint.activate([
            imageView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            imageView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            imageView.widthAnchor.constraint(equalToConstant: 16),
            imageView.heightAnchor.constraint(equalToConstant: 16)
        ])
        
        return view
    }()
    
    // MARK: - Properties
    var onExpandTapped: (() -> Void)?
    var onReadyToDeliverTapped: ((Bool, Int) -> Void)? // isReady, orderId
    private var order: Order?
    private var calendarOrder: CalendarOrder?
    private var isExpanded: Bool = false
    
    // MARK: - Initialization
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    override init(reuseIdentifier: String?) {
        super.init(reuseIdentifier: reuseIdentifier)
        setupUI()
    }
    
    // MARK: - Setup
    private func setupUI() {
        contentView.backgroundColor = .white
        
        // Add subviews
        contentView.addSubview(containerStackView)
        contentView.addSubview(expandIndicatorView)
        
        // Setup stacks with proper spacing and alignment
        containerStackView.spacing = 12
        containerStackView.addArrangedSubview(topRowStack)
        containerStackView.addArrangedSubview(middleRowStack)
        containerStackView.addArrangedSubview(bottomRowStack)
        
        // Top row setup
        topRowStack.spacing = 8
        topRowStack.alignment = .center
        topRowStack.distribution = .fill
        
        let readyToDeliverLabel = UILabel()
        readyToDeliverLabel.text = "Ready Deliver".localized()
        readyToDeliverLabel.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
        readyToDeliverLabel.textColor = APP_TONE_COLOR
        
        // Icon bên trái, text bên phải
        let preparedStack = UIStackView(arrangedSubviews: [preparedButton, readyToDeliverLabel])
        preparedStack.axis = .horizontal
        preparedStack.spacing = 8
        preparedStack.alignment = .center
        
        // Add fixed width for preparedStack
        preparedStack.widthAnchor.constraint(equalToConstant: 140).isActive = true
        
        // Customer name and phone stack (will be moved to bottom row)
        let customerStack = UIStackView(arrangedSubviews: [nameLabel, phoneButton])
        customerStack.axis = .horizontal
        customerStack.spacing = 8
        customerStack.alignment = .center
        customerStack.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        
        // Top row: Order number | Empty spacer | Status badge (right-center)
        let spacerLabel = UILabel()
        spacerLabel.setContentHuggingPriority(.defaultLow, for: .horizontal)
        spacerLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        
        topRowStack.addArrangedSubview(orderNumberLabel)
        topRowStack.addArrangedSubview(spacerLabel)
        topRowStack.addArrangedSubview(statusBadge)
        
        // Middle row setup with dates (Order date, Pickup date, Return date)
        middleRowStack.spacing = 16
        middleRowStack.alignment = .center
        
        let orderDateStack = UIStackView()
        orderDateStack.axis = .vertical
        orderDateStack.spacing = 4
        orderDateStack.alignment = .leading
        orderDateStack.addArrangedSubview(orderDateTitleLabel)
        orderDateStack.addArrangedSubview(orderDateLabel)
        
        let pickupStack = UIStackView()
        pickupStack.axis = .vertical
        pickupStack.spacing = 4
        pickupStack.alignment = .leading
        pickupStack.addArrangedSubview(getDateTitleLabel)
        pickupStack.addArrangedSubview(getDateLabel)
        
        let returnStack = UIStackView()
        returnStack.axis = .vertical
        returnStack.spacing = 4
        returnStack.alignment = .leading
        returnStack.addArrangedSubview(returnDateTitleLabel)
        returnStack.addArrangedSubview(returnDateLabel)
        
        let datesStack = UIStackView(arrangedSubviews: [orderDateStack, pickupStack, returnStack])
        datesStack.axis = .horizontal
        datesStack.spacing = 16
        datesStack.distribution = .fillEqually
        
        middleRowStack.addArrangedSubview(datesStack)
        
        // Bottom row with customer name, phone, and ready deliver (right)
        bottomRowStack.addArrangedSubview(customerStack)
        bottomRowStack.addArrangedSubview(preparedStack)
        
        // Determine status badge width based on device type
        let isIPad = traitCollection.horizontalSizeClass == .regular
        let statusBadgeWidth: CGFloat = isIPad ? 100 : 85
        
        NSLayoutConstraint.activate([
            // Container constraints
            containerStackView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            containerStackView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            containerStackView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            
            // Fixed widths
            orderNumberLabel.widthAnchor.constraint(equalToConstant: 80),
            statusBadge.widthAnchor.constraint(equalToConstant: statusBadgeWidth),
            statusBadge.heightAnchor.constraint(equalToConstant: 26),
            preparedButton.widthAnchor.constraint(equalToConstant: 24),
            preparedButton.heightAnchor.constraint(equalToConstant: 24),
            
            // Ensure dates stack takes proper width
            datesStack.widthAnchor.constraint(greaterThanOrEqualTo: containerStackView.widthAnchor, multiplier: 0.6),
            
            // Expand indicator - align with container content
            expandIndicatorView.topAnchor.constraint(equalTo: containerStackView.bottomAnchor, constant: 8),
            expandIndicatorView.leadingAnchor.constraint(equalTo: containerStackView.leadingAnchor),
            expandIndicatorView.trailingAnchor.constraint(equalTo: containerStackView.trailingAnchor),
            expandIndicatorView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -12),
            expandIndicatorView.heightAnchor.constraint(equalToConstant: 28)
        ])
        
        // Set content hugging and compression resistance priorities for auto height
        containerStackView.setContentHuggingPriority(.required, for: .vertical)
        containerStackView.setContentCompressionResistancePriority(.required, for: .vertical)
        
        // Content priorities
        nameLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        phoneButton.setContentCompressionResistancePriority(.required, for: .horizontal)
        customerStack.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        preparedStack.setContentHuggingPriority(.required, for: .horizontal)
        preparedStack.setContentCompressionResistancePriority(.required, for: .horizontal)
        statusBadge.setContentHuggingPriority(.required, for: .horizontal)
        statusBadge.setContentCompressionResistancePriority(.required, for: .horizontal)
        
        // Visual styling
        contentView.layer.shadowColor = UIColor.black.cgColor
        contentView.layer.shadowOffset = CGSize(width: 0, height: 1)
        contentView.layer.shadowRadius = 2
        contentView.layer.shadowOpacity = 0.1
        
        // Add tap gesture
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(headerTapped))
        contentView.addGestureRecognizer(tapGesture)
    }
    
    // MARK: - Public Methods
    func bind(calendarOrder: CalendarOrder, isExpanded: Bool = false) {
        self.calendarOrder = calendarOrder
        self.isExpanded = isExpanded
        
        // Update UI with CalendarOrder data
        orderNumberLabel.text = "#\(calendarOrder.orderNumber ?? "N/A")"
        nameLabel.text = calendarOrder.customerName ?? "N/A"
        phoneButton.setTitle(calendarOrder.customerPhone ?? "N/A", for: .normal)
        
        // Order date - use createdAt if available (with time)
        if let createdAt = calendarOrder.createdAt {
            let dateFormatter = ISO8601DateFormatter()
            dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            dateFormatter.timeZone = TimeZone(abbreviation: "UTC")
            
            if let createdDate = dateFormatter.date(from: createdAt) {
                // Use dateTimeInString() to display with time: "dd/MM/yy HH:mm"
                orderDateLabel.text = createdDate.dateTimeInString() ?? "N/A"
            } else {
                // Try alternative format without fractional seconds
                dateFormatter.formatOptions = [.withInternetDateTime]
                if let createdDate = dateFormatter.date(from: createdAt) {
                    orderDateLabel.text = createdDate.dateTimeInString() ?? "N/A"
                } else {
                    // Try standard DateFormatter as fallback
                    let fallbackFormatter = DateFormatter()
                    fallbackFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss'Z'"
                    fallbackFormatter.timeZone = TimeZone(abbreviation: "UTC")
                    if let createdDate = fallbackFormatter.date(from: createdAt) {
                        orderDateLabel.text = createdDate.dateTimeInString() ?? "N/A"
                } else {
                    orderDateLabel.text = "N/A"
                    }
                }
            }
        } else {
            orderDateLabel.text = "N/A"
        }
        
        // Get status for use throughout the method
        let status = calendarOrder.status?.uppercased() ?? ""
        
        // Set prepared button state from isReadyToDeliver field
        // If isReadyToDeliver is not available from API, default to false
        // (We can't infer ready to deliver status from order status alone)
        if let isReadyToDeliver = calendarOrder.isReadyToDeliver {
            preparedButton.isSelected = isReadyToDeliver
        } else {
            // Default to false if API doesn't provide isReadyToDeliver
            // This ensures consistency - if API doesn't return the field, we assume it's not ready
            preparedButton.isSelected = false
        }
        
        // Setup status badge
        setupStatusBadge(statusString: calendarOrder.status, orderType: .rent) // Calendar orders are typically rent orders
        
        // Hide note label (item count removed)
        noteLabel.text = nil
        
        // Show "ready to deliver" section based on status
        let shouldShowPrepared = (status == "RESERVED" || status == "PENDING")
        for subview in topRowStack.arrangedSubviews {
            if let stack = subview as? UIStackView, stack.arrangedSubviews.contains(preparedButton) {
                stack.isHidden = !shouldShowPrepared
                break
            }
        }
        
        // Update dates from API strings
        if let pickupPlanAt = calendarOrder.pickupPlanAt {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
            dateFormatter.timeZone = TimeZone(abbreviation: "UTC")
            
            if let pickupDate = dateFormatter.date(from: pickupPlanAt) {
                let displayFormatter = DateFormatter()
                displayFormatter.dateFormat = "dd/MM/yy"
                getDateLabel.text = displayFormatter.string(from: pickupDate)
            } else {
                getDateLabel.text = "INVALID_DATE".localized()
            }
        } else {
            getDateLabel.text = "N/A"
        }
        
        if let returnPlanAt = calendarOrder.returnPlanAt {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
            dateFormatter.timeZone = TimeZone(abbreviation: "UTC")
            
            if let returnDate = dateFormatter.date(from: returnPlanAt) {
                let displayFormatter = DateFormatter()
                displayFormatter.dateFormat = "dd/MM/yy"
                returnDateLabel.text = displayFormatter.string(from: returnDate)
            } else {
                returnDateLabel.text = "INVALID_DATE".localized()
            }
        } else {
            returnDateLabel.text = "N/A"
        }
        
        // Update expand indicator - only rotate, don't hide
        UIView.animate(withDuration: 0.3) {
            if let chevron = self.expandIndicatorView.subviews.first as? UIImageView {
                chevron.transform = isExpanded ? 
                    CGAffineTransform(rotationAngle: .pi) : 
                    .identity
            }
        }
    }
    
    // MARK: - Legacy Support
    func bind(order: Order, isExpanded: Bool = false) {
        self.order = order
        self.isExpanded = isExpanded
        
        // Update UI
        orderNumberLabel.text = order.orderNumber
        nameLabel.text = order.customerName
        phoneButton.setTitle(order.customerPhone, for: .normal)
        preparedButton.isSelected = order.isReadyToDeliver
        
        // Setup status badge
        setupStatusBadge(status: order.status, orderType: order.orderType)
        
        // Hide note label (item count removed)
        noteLabel.text = nil
        
        // Update order date (createdAt)
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "dd/MM/yy"
        orderDateLabel.text = dateFormatter.string(from: order.createdAt)
        
        // Hide "ready to deliver" section for sale orders
        if order.orderType == .sale {
            // Find the preparedStack in topRowStack and hide it
            for subview in topRowStack.arrangedSubviews {
                if let stack = subview as? UIStackView, stack.arrangedSubviews.contains(preparedButton) {
                    stack.isHidden = true
                    break
                }
            }
        } else {
            // Show "ready to deliver" section for rent orders
            for subview in topRowStack.arrangedSubviews {
                if let stack = subview as? UIStackView, stack.arrangedSubviews.contains(preparedButton) {
                    stack.isHidden = false
                    break
                }
            }
        }
        
        // Update dates (date only)
        if let pickupDate = order.pickupDate {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "dd/MM/yy"
            getDateLabel.text = dateFormatter.string(from: pickupDate)
        }
        
        if let returnDate = order.returnDate {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "dd/MM/yy"
            returnDateLabel.text = dateFormatter.string(from: returnDate)
        }
        
        // Update expand indicator - only rotate, don't hide
        UIView.animate(withDuration: 0.3) {
            if let chevron = self.expandIndicatorView.subviews.first as? UIImageView {
                chevron.transform = isExpanded ? 
                    CGAffineTransform(rotationAngle: .pi) : 
                    .identity
            }
        }
    }
    
    // MARK: - Actions
    @objc private func preparedButtonTapped() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
        
        // Toggle button state optimistically
        let newState = !preparedButton.isSelected
        preparedButton.isSelected = newState
        
        // Get order ID and call delegate
        var orderId: Int?
        var isRentOrder = false
        
        if let order = order {
            orderId = order.id
            isRentOrder = order.orderType == .rent
        } else if let calendarOrder = calendarOrder {
            // CalendarOrder uses 'id' not 'orderId'
            orderId = calendarOrder.id
            // Calendar typically only shows rent orders, but check status to be safe
            // Only allow update for RESERVED or PENDING status (rent orders)
            let status = calendarOrder.status?.uppercased() ?? ""
            isRentOrder = (status == "RESERVED" || status == "PENDING" || status == "DRAFT")
        }
        
        // Only proceed if it's a rent order and we have an order ID
        if let orderId = orderId, orderId > 0, isRentOrder {
            // Call delegate to handle API update
            onReadyToDeliverTapped?(newState, orderId)
        } else {
            // Revert button state if conditions not met
            preparedButton.isSelected = !newState
        }
    }
    
    @objc private func phoneButtonTapped() {
        let phone: String?
        
        if let order = order {
            phone = order.customerPhone
        } else if let pickupItem = calendarOrder {
            phone = pickupItem.customerPhone
        } else {
            phone = nil
        }
        
        if let phone = phone, !phone.isEmpty {
            let phoneNumber = "tel://\(phone)"
            if let url = URL(string: phoneNumber), !url.absoluteString.isEmpty {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }
    }
    
    @objc private func expandButtonTapped() {
        toggleExpand()
    }
    
    @objc private func headerTapped() {
        toggleExpand()
    }
    
    private func toggleExpand() {
        isExpanded.toggle()
        
        // Only rotate chevron, don't change alpha
        UIView.animate(withDuration: 0.3) {
            if let chevron = self.expandIndicatorView.subviews.first as? UIImageView {
                chevron.transform = self.isExpanded ? 
                    CGAffineTransform(rotationAngle: .pi) : 
                    .identity
            }
        }
        
        onExpandTapped?()
    }
    
    // MARK: - Status Badge
    private func formatStatusText(_ status: OrderStatus) -> String {
        switch status {
        case .draft:
            return "Draft".localized().uppercased()
        case .reserved:
            return "Reserved".localized().uppercased()
        case .pickuped:
            return "Picked Up".localized().uppercased()
        case .returned:
            return "Returned".localized().uppercased()
        case .completed:
            return "Completed".localized().uppercased()
        case .cancelled:
            return "Cancelled".localized().uppercased()
        }
    }
    
    private func formatStatusText(from statusString: String) -> String {
        let upperStatus = statusString.uppercased()
        switch upperStatus {
        case "DRAFT":
            return "Draft".localized().uppercased()
        case "RESERVED":
            return "Reserved".localized().uppercased()
        case "PICKUPED", "PICKED_UP":
            return "Picked Up".localized().uppercased()
        case "RETURNED":
            return "Returned".localized().uppercased()
        case "COMPLETED":
            return "Completed".localized().uppercased()
        case "CANCELLED":
            return "Cancelled".localized().uppercased()
        default:
            return statusString.localizedStatus().uppercased()
        }
    }
    
    private func setupStatusBadge(status: OrderStatus, orderType: OrderType) {
        statusBadge.text = formatStatusText(status)
        statusBadge.backgroundColor = status.badgeColor
        statusBadge.textColor = status.badgeTextColor
    }

    private func setupStatusBadge(statusString: String?, orderType: OrderType) {
        guard let statusString = statusString else {
            statusBadge.text = ""
            statusBadge.backgroundColor = .clear
            return
        }

        statusBadge.text = formatStatusText(from: statusString)
        let status = OrderStatus.from(apiString: statusString)
        statusBadge.backgroundColor = status?.badgeColor ?? .statusInactive
        statusBadge.textColor = status?.badgeTextColor ?? .textInverted
    }
}

// MARK: - Helper Extension
extension UIView {
    func findViewController() -> UIViewController? {
        if let nextResponder = self.next as? UIViewController {
            return nextResponder
        } else if let nextResponder = self.next as? UIView {
            return nextResponder.findViewController()
        } else {
            return nil
        }
    }
}
