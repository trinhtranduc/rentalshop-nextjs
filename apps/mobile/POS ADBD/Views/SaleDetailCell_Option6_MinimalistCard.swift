//
//  SaleDetailCell_Option6_MinimalistCard.swift
//  POS ADBD
//
//  OPTION 6: Minimalist Card với Shadow
//  Design: Card style với shadow nhẹ, spacing tốt, background subtle
//

import UIKit
import SnapKit

class SaleDetailCell_Option6: UITableViewCell {
    // MARK: - UI Components
    private lazy var containerView: UIView = {
        let view = UIView()
        view.backgroundColor = .white
        view.layer.cornerRadius = 12
        view.layer.shadowColor = UIColor.black.cgColor
        view.layer.shadowOffset = CGSize(width: 0, height: 1)
        view.layer.shadowRadius = 3
        view.layer.shadowOpacity = 0.08
        view.clipsToBounds = false
        return view
    }()
    
    private lazy var mainStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 16
        stack.alignment = .top
        stack.distribution = .fill
        return stack
    }()
    
    // Left section
    private lazy var leftStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 8
        stack.alignment = .leading
        stack.distribution = .fill
        return stack
    }()
    
    // Row 1: Order number
    private lazy var orderNumberLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.boldFont(size: isIPad ? 17 : 16)
        label.textColor = .label
        return label
    }()
    
    // Row 2: Customer name + Phone cùng một line
    private lazy var customerInfoStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .center
        stack.distribution = .fill
        return stack
    }()
    
    private lazy var customerNameLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.mediumFont(size: isIPad ? 16 : 15)
        label.textColor = .label
        return label
    }()
    
    private lazy var customerPhoneSeparator: UILabel = {
        let label = UILabel()
        label.text = "•"
        label.font = Utils.regularFont(size: 12)
        label.textColor = .secondaryLabel
        return label
    }()
    
    private lazy var customerPhoneLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 12)
        label.textColor = .secondaryLabel
        return label
    }()
    
    // Row 3: Dates
    private lazy var datesContainer: UIView = {
        let view = UIView()
        return view
    }()
    
    private lazy var datesStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 16
        stack.alignment = .leading
        stack.distribution = .fill
        return stack
    }()
    
    // Date views
    private lazy var createdDateTitleLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.regularFont(size: isIPad ? 14 : 13)
        label.textColor = .secondaryLabel
        label.text = "Book date".localized()
        return label
    }()
    
    private lazy var createdDateLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.mediumFont(size: isIPad ? 15 : 14)
        label.textColor = .label
        return label
    }()
    
    private lazy var pickupDateTitleLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.regularFont(size: isIPad ? 14 : 13)
        label.textColor = .secondaryLabel
        label.text = "Pickup date".localized()
        return label
    }()
    
    private lazy var pickupDateLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.mediumFont(size: isIPad ? 15 : 14)
        label.textColor = .label
        return label
    }()
    
    private lazy var returnDateTitleLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.regularFont(size: isIPad ? 14 : 13)
        label.textColor = .secondaryLabel
        label.text = "Return date".localized()
        return label
    }()
    
    private lazy var returnDateLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.mediumFont(size: isIPad ? 15 : 14)
        label.textColor = .label
        return label
    }()
    
    // Date containers
    private lazy var createdDateView: UIView = {
        let container = UIView()
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 3
        stack.alignment = .leading
        
        stack.addArrangedSubview(createdDateTitleLabel)
        stack.addArrangedSubview(createdDateLabel)
        
        container.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        return container
    }()
    
    private lazy var pickupDateView: UIView = {
        let container = UIView()
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 3
        stack.alignment = .leading
        
        stack.addArrangedSubview(pickupDateTitleLabel)
        stack.addArrangedSubview(pickupDateLabel)
        
        container.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        return container
    }()
    
    private lazy var returnDateView: UIView = {
        let container = UIView()
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 3
        stack.alignment = .leading
        
        stack.addArrangedSubview(returnDateTitleLabel)
        stack.addArrangedSubview(returnDateLabel)
        
        container.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        return container
    }()
    
    // Right section
    private lazy var rightStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 8
        stack.alignment = .trailing
        stack.distribution = .fill
        return stack
    }()
    
    private lazy var itemCountLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.regularFont(size: isIPad ? 13 : 12)
        label.textColor = .secondaryLabel
        return label
    }()
    
    private lazy var totalAmountLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.boldFont(size: isIPad ? 17 : 16)
        label.textColor = .label
        label.textAlignment = .right
        return label
    }()
    
    private lazy var statusBadge: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.mediumFont(size: isIPad ? 12 : 11)
        label.textColor = .white
        label.textAlignment = .center
        label.layer.cornerRadius = 12
        label.clipsToBounds = true
        return label
    }()
    
    private var order: Order?
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
        selectionStyle = .default
        backgroundColor = .clear
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        
        // Update font sizes when device orientation or size class changes
        if traitCollection.horizontalSizeClass != previousTraitCollection?.horizontalSizeClass {
            let isIPad = traitCollection.horizontalSizeClass == .regular
            orderNumberLabel.font = Utils.boldFont(size: isIPad ? 17 : 16)
            customerNameLabel.font = Utils.mediumFont(size: isIPad ? 16 : 15)
            itemCountLabel.font = Utils.regularFont(size: isIPad ? 13 : 12)
            totalAmountLabel.font = Utils.boldFont(size: isIPad ? 17 : 16)
            statusBadge.font = Utils.mediumFont(size: isIPad ? 12 : 11)
            
            // Update date labels
            let baseDateSize: CGFloat = isIPad ? 15 : 14
            let baseTitleSize: CGFloat = isIPad ? 14 : 13
            createdDateLabel.font = Utils.mediumFont(size: baseDateSize)
            pickupDateLabel.font = Utils.mediumFont(size: baseDateSize)
            returnDateLabel.font = Utils.mediumFont(size: baseDateSize)
            createdDateTitleLabel.font = Utils.regularFont(size: baseTitleSize)
            pickupDateTitleLabel.font = Utils.regularFont(size: baseTitleSize)
            returnDateTitleLabel.font = Utils.regularFont(size: baseTitleSize)
        }
    }
    
    private func setupUI() {
        contentView.addSubview(containerView)
        containerView.addSubview(mainStackView)
        
        // Setup customer info
        customerInfoStackView.addArrangedSubview(customerNameLabel)
        customerInfoStackView.addArrangedSubview(customerPhoneSeparator)
        customerInfoStackView.addArrangedSubview(customerPhoneLabel)
        
        // Setup dates
        datesStackView.addArrangedSubview(createdDateView)
        datesStackView.addArrangedSubview(pickupDateView)
        datesStackView.addArrangedSubview(returnDateView)
        datesContainer.addSubview(datesStackView)
        
        // Setup left stack
        leftStackView.addArrangedSubview(orderNumberLabel)
        leftStackView.addArrangedSubview(customerInfoStackView)
        leftStackView.addArrangedSubview(datesContainer)
        
        // Setup right stack
        rightStackView.addArrangedSubview(statusBadge)
        rightStackView.addArrangedSubview(itemCountLabel)
        rightStackView.addArrangedSubview(totalAmountLabel)
        
        // Add to main stack
        mainStackView.addArrangedSubview(leftStackView)
        mainStackView.addArrangedSubview(rightStackView)
        
        // Constraints
        let isIPad = traitCollection.horizontalSizeClass == .regular
        let padding: CGFloat = isIPad ? 16 : 12
        let statusBadgeWidth: CGFloat = isIPad ? 100 : 85
        
        containerView.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(6)
            make.leading.equalToSuperview().offset(12)
            make.trailing.equalToSuperview().offset(-12)
            make.bottom.equalToSuperview().offset(-6)
        }
        
        mainStackView.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(padding)
            make.leading.equalToSuperview().offset(padding)
            make.trailing.equalToSuperview().offset(-padding)
            make.bottom.equalToSuperview().offset(-padding)
        }
        
        datesStackView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        statusBadge.snp.makeConstraints { make in
            make.width.equalTo(statusBadgeWidth)
            make.height.equalTo(26)
        }
        
        customerPhoneSeparator.setContentHuggingPriority(.required, for: .horizontal)
        leftStackView.setContentHuggingPriority(.defaultLow, for: .horizontal)
        rightStackView.setContentHuggingPriority(.required, for: .horizontal)
    }
    
    func bind(order: Order, sortType: OrderSortType = .book_date) {
        self.order = order
        
        orderNumberLabel.text = order.orderNumber
        customerNameLabel.text = order.customerName.isEmpty ? "N/A" : order.customerName
        
        if ((order.customerPhone?.isEmpty) != nil) {
            customerPhoneSeparator.isHidden = true
            customerPhoneLabel.isHidden = true
        } else {
            customerPhoneSeparator.isHidden = false
            customerPhoneLabel.isHidden = false
            customerPhoneLabel.text = order.customerPhone
        }
        
        createdDateLabel.text = order.createdAt.dateInString() ?? "N/A"
        
        if order.orderType == .rent {
            pickupDateLabel.text = order.pickupDate?.dateInString() ?? "N/A"
            pickupDateView.isHidden = false
            
            returnDateLabel.text = order.returnDate?.dateInString() ?? "N/A"
            returnDateView.isHidden = false
        } else {
            pickupDateView.isHidden = true
            returnDateView.isHidden = true
        }
        
        itemCountLabel.text = "\(order.itemCount)"
        totalAmountLabel.text = order.totalAmount.formatStringInCommon()
        
        setupStatusBadge(for: order)
        applyDateStyling(sortType: sortType, orderType: order.orderType)
    }
    
    private func applyDateStyling(sortType: OrderSortType, orderType: OrderType) {
        let isIPad = traitCollection.horizontalSizeClass == .regular
        let baseDateSize: CGFloat = isIPad ? 15 : 14
        let baseTitleSize: CGFloat = isIPad ? 14 : 13
        
        createdDateLabel.font = Utils.mediumFont(size: baseDateSize)
        pickupDateLabel.font = Utils.mediumFont(size: baseDateSize)
        returnDateLabel.font = Utils.mediumFont(size: baseDateSize)
        
        createdDateTitleLabel.font = Utils.regularFont(size: baseTitleSize)
        pickupDateTitleLabel.font = Utils.regularFont(size: baseTitleSize)
        returnDateTitleLabel.font = Utils.regularFont(size: baseTitleSize)
        
        if orderType == .rent {
            if sortType == .book_date {
                createdDateLabel.font = Utils.boldFont(size: baseDateSize)
                createdDateTitleLabel.font = Utils.boldFont(size: baseTitleSize)
            } else if sortType == .get_date {
                pickupDateLabel.font = Utils.boldFont(size: baseDateSize)
                pickupDateTitleLabel.font = Utils.boldFont(size: baseTitleSize)
            }
        } else {
            createdDateLabel.font = Utils.boldFont(size: baseDateSize)
            createdDateTitleLabel.font = Utils.boldFont(size: baseTitleSize)
        }
    }
    
    private func formatStatusText(_ status: OrderStatus) -> String {
        switch status {
        case .draft:
            return "Draft".localized()
        case .reserved:
            return "Reserved".localized()
        case .pickuped:
            return "Picked Up".localized()
        case .returned:
            return "Returned".localized()
        case .completed:
            return "Completed".localized()
        case .cancelled:
            return "Cancelled".localized()
        }
    }
    
    private func setupStatusBadge(for order: Order) {
        statusBadge.text = formatStatusText(order.status)
        
        if order.orderType == .rent {
            switch order.status {
            case .reserved:
                statusBadge.backgroundColor = .red
            case .pickuped:
                statusBadge.backgroundColor = APP_ORANGE_COLOR
            case .returned:
                statusBadge.backgroundColor = .actionSuccess
            case .cancelled:
                statusBadge.backgroundColor = UIColor(hexString: "b22222")
            default:
                statusBadge.backgroundColor = .clear
            }
        } else {
            switch order.status {
            case .completed:
                statusBadge.backgroundColor = .actionSuccess  // Green color like print button
            case .reserved:
                statusBadge.backgroundColor = APP_ORANGE_COLOR
            case .cancelled:
                statusBadge.backgroundColor = UIColor(hexString: "b22222")
            default:
                statusBadge.backgroundColor = .clear
            }
        }
    }
}

