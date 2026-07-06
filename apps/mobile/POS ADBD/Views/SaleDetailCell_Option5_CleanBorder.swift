//
//  SaleDetailCell_Option5_CleanBorder.swift
//  POS ADBD
//
//  OPTION 5: Clean với Subtle Border
//  Design: Border mỏng, rounded corners, spacing tốt, dễ phân biệt
//

import UIKit
import SnapKit

class SaleDetailCell_Option5: UITableViewCell {
    // MARK: - UI Components
    private lazy var containerView: UIView = {
        let view = UIView()
        view.backgroundColor = .white
        view.layer.cornerRadius = 10
        view.layer.borderWidth = 0.5
        view.layer.borderColor = UIColor.separator.withAlphaComponent(0.25).cgColor
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
        label.font = Utils.regularFont(size: isIPad ? 17 : 16)
        label.textColor = .secondaryLabel
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
        label.adjustsFontSizeToFitWidth = true

        label.font = Utils.regularFont(size: 14)
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
        label.adjustsFontSizeToFitWidth = true

        label.font = Utils.regularFont(size: 12)
        label.textColor = .secondaryLabel
        return label
    }()
    
    // Staff name (nhân viên tạo đơn)
    private lazy var staffNameLabel: UILabel = {
        let label = UILabel()
        label.adjustsFontSizeToFitWidth = true

        label.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
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
        label.adjustsFontSizeToFitWidth = true
        label.font = Utils.lightFont(size: 14) // Match AccountViewController text phụ
        label.textColor = .tertiaryLabel // Lighter color for date titles
        label.text = "Book date".localized()
        return label
    }()
    
    private lazy var createdDateLabel: UILabel = {
        let label = UILabel()
        label.adjustsFontSizeToFitWidth = true
        label.font = Utils.regularFont(size: 14) // Match AccountViewController text chính
        label.textColor = .label
        return label
    }()
    
    private lazy var pickupDateTitleLabel: UILabel = {
        let label = UILabel()
        label.adjustsFontSizeToFitWidth = true

        label.font = Utils.lightFont(size: 14) // Match AccountViewController text phụ
        label.textColor = .tertiaryLabel // Lighter color for date titles
        label.text = "Pickup date".localized()
        return label
    }()
    
    private lazy var pickupDateLabel: UILabel = {
        let label = UILabel()
        label.adjustsFontSizeToFitWidth = true

        label.font = Utils.regularFont(size: 14) // Match AccountViewController text chính
        label.textColor = .label
        return label
    }()
    
    private lazy var returnDateTitleLabel: UILabel = {
        let label = UILabel()
        label.adjustsFontSizeToFitWidth = true

        label.font = Utils.lightFont(size: 14) // Match AccountViewController text phụ
        label.textColor = .tertiaryLabel // Lighter color for date titles
        label.text = "Return date".localized()
        return label
    }()
    
    private lazy var returnDateLabel: UILabel = {
        let label = UILabel()
        label.adjustsFontSizeToFitWidth = true

        label.font = Utils.regularFont(size: 14) // Match AccountViewController text chính
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
        label.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
        label.textColor = .secondaryLabel
        return label
    }()
    
    private lazy var totalAmountLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.regularFont(size: isIPad ? 17 : 16)
        label.textColor = .textPrimary
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
            orderNumberLabel.font = Utils.boldFont(size: isIPad ? 17 : 14) // Giữ nguyên vì là tiêu đề chính
            customerNameLabel.font = Utils.regularFont(size: 14) // Bold to highlight customer name
            staffNameLabel.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
            itemCountLabel.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
            totalAmountLabel.font = Utils.boldFont(size: isIPad ? 17 : 14) // Giữ nguyên vì là tổng tiền
            statusBadge.font = Utils.mediumFont(size: isIPad ? 12 : 11) // Giữ nguyên vì là badge nhỏ
            
            // Update date labels - Match AccountViewController
            createdDateLabel.font = Utils.regularFont(size: 14) // Match AccountViewController text chính
            pickupDateLabel.font = Utils.regularFont(size: 14) // Match AccountViewController text chính
            returnDateLabel.font = Utils.regularFont(size: 14) // Match AccountViewController text chính
            createdDateTitleLabel.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
            pickupDateTitleLabel.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
            returnDateTitleLabel.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
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
        // staffNameLabel is hidden - removed from stack
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
        
        orderNumberLabel.text = "#\(order.orderNumber)"
        customerNameLabel.text = order.customerName.isEmpty ? "N/A" : order.customerName
        
        // Show/hide phone separator and phone label
        if let phone = order.customerPhone, !phone.isEmpty {
            customerPhoneSeparator.isHidden = false
            customerPhoneLabel.isHidden = false
            customerPhoneLabel.text = phone
        } else {
            customerPhoneSeparator.isHidden = true
            customerPhoneLabel.isHidden = true
        }
        
        // Hiển thị tên nhân viên tạo đơn - Always hidden
            staffNameLabel.isHidden = true
        
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
        
        let itemText = order.itemCount == 1 ? "item".localized() : "items".localized()
        itemCountLabel.text = "\(order.itemCount) \(itemText)"
        totalAmountLabel.text = order.totalAmount.formatStringInCommon()
        
        setupStatusBadge(for: order)
        applyDateStyling(sortType: sortType, orderType: order.orderType)
    }
    
    private func applyDateStyling(sortType: OrderSortType, orderType: OrderType) {
        // Match AccountViewController font sizes
        let baseDateSize: CGFloat = 16 // Match AccountViewController text chính
        let baseTitleSize: CGFloat = 14 // Match AccountViewController text phụ
        
        // Set default fonts
        createdDateLabel.font = Utils.regularFont(size: baseDateSize)
        pickupDateLabel.font = Utils.regularFont(size: baseDateSize)
        returnDateLabel.font = Utils.regularFont(size: baseDateSize)
        
        createdDateTitleLabel.font = Utils.regularFont(size: baseTitleSize)
        pickupDateTitleLabel.font = Utils.regularFont(size: baseTitleSize)
        returnDateTitleLabel.font = Utils.regularFont(size: baseTitleSize)
        
        // Apply bold for sorted date (highlight the active sort)
        if orderType == .rent {
            if sortType == .book_date {
                createdDateLabel.font = Utils.boldFont(size: baseDateSize)
//                createdDateTitleLabel.font = Utils.boldFont(size: baseTitleSize)
            } else if sortType == .get_date {
                pickupDateLabel.font = Utils.boldFont(size: baseDateSize)
//                pickupDateTitleLabel.font = Utils.boldFont(size: baseTitleSize)
            }
        } else {
            createdDateLabel.font = Utils.regularFont(size: baseDateSize)
            createdDateTitleLabel.font = Utils.regularFont(size: baseTitleSize)
        }
    }
    
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

