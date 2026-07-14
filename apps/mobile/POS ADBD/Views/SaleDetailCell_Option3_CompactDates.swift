//
//  SaleDetailCell_Option3_CompactDates.swift
//  POS ADBD
//
//  OPTION 3: Compact Dates Layout - Dates hiển thị gọn, không bị che
//  Design: Dates dạng compact với icon, wrap nếu cần
//

import UIKit
import SnapKit

class SaleDetailCell_Option3: UITableViewCell {
    // MARK: - UI Components
    private lazy var containerView: UIView = {
        let view = UIView()
        view.backgroundColor = .white
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
        stack.spacing = 6
        stack.alignment = .leading
        stack.distribution = .fill
        return stack
    }()
    
    // Row 1: Order number
    private lazy var orderNumberLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 16)
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
        label.font = Utils.mediumFont(size: 14)
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
    
    // Row 3: Dates - Compact format với icon
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
    
    // Date views - Bỏ icon, chỉ có title và date
    private lazy var createdDateTitleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 13)
        label.textColor = .secondaryLabel
        label.text = "Book date".localized()
        return label
    }()
    
    private lazy var createdDateLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 14)
        label.textColor = .label
        return label
    }()
    
    private lazy var pickupDateTitleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 13)
        label.textColor = .secondaryLabel
        label.text = "Pickup date".localized()
        return label
    }()
    
    private lazy var pickupDateLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 14)
        label.textColor = .label
        return label
    }()
    
    private lazy var returnDateTitleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 13)
        label.textColor = .secondaryLabel
        label.text = "Return date".localized()
        return label
    }()
    
    private lazy var returnDateLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 14)
        label.textColor = .label
        return label
    }()
    
    // Date containers - Vertical layout (title trên, date dưới)
    private lazy var createdDateView: UIView = {
        let container = UIView()
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 2
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
        stack.spacing = 2
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
        stack.spacing = 2
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
        label.font = Utils.regularFont(size: 11)
        label.textColor = .secondaryLabel
        return label
    }()
    
    private lazy var totalAmountLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 16)
        label.textColor = .label
        label.textAlignment = .right
        return label
    }()
    
    private lazy var statusBadge: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 11)
        label.textColor = .white
        label.textAlignment = .center
        label.layer.cornerRadius = 12 // Pill shape - improved corner radius
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
    
    private func setupUI() {
        contentView.addSubview(containerView)
        containerView.addSubview(mainStackView)
        
        // Setup customer info (name + separator + phone cùng một line)
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
        
        // Setup right stack - Status ở top-right
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
            make.edges.equalToSuperview()
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
            make.height.equalTo(26) // Slightly taller for better appearance
        }
        
        // Hide phone separator nếu không có phone
        customerPhoneSeparator.setContentHuggingPriority(.required, for: .horizontal)
        
        leftStackView.setContentHuggingPriority(.defaultLow, for: .horizontal)
        rightStackView.setContentHuggingPriority(.required, for: .horizontal)
    }
    
    func bind(order: Order, sortType: OrderSortType = .book_date) {
        self.order = order
        
        orderNumberLabel.text = order.orderNumber
        customerNameLabel.text = order.customerName.isEmpty ? "N/A" : order.customerName
        
        // Show/hide phone separator và phone label
        if ((order.customerPhone?.isEmpty) != nil) {
            customerPhoneSeparator.isHidden = true
            customerPhoneLabel.isHidden = true
        } else {
            customerPhoneSeparator.isHidden = false
            customerPhoneLabel.isHidden = false
            customerPhoneLabel.text = order.customerPhone
        }
        
        // Update dates - Direct access to labels
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
        
        // Apply date styling based on sort type
        applyDateStyling(sortType: sortType, orderType: order.orderType)
    }
    
    private func applyDateStyling(sortType: OrderSortType, orderType: OrderType) {
        // Reset all dates
        createdDateLabel.font = Utils.mediumFont(size: 14)
        pickupDateLabel.font = Utils.mediumFont(size: 14)
        returnDateLabel.font = Utils.mediumFont(size: 14)
        
        createdDateTitleLabel.font = Utils.regularFont(size: 13)
        pickupDateTitleLabel.font = Utils.regularFont(size: 13)
        returnDateTitleLabel.font = Utils.regularFont(size: 13)
        
        if orderType == .rent {
            if sortType == .book_date {
                createdDateLabel.font = Utils.boldFont(size: 14)
                createdDateTitleLabel.font = Utils.boldFont(size: 13)
            } else if sortType == .get_date {
                pickupDateLabel.font = Utils.boldFont(size: 14)
                pickupDateTitleLabel.font = Utils.boldFont(size: 13)
            }
        } else {
            createdDateLabel.font = Utils.boldFont(size: 14)
            createdDateTitleLabel.font = Utils.boldFont(size: 13)
        }
    }
    
    // Helper function để format status text không uppercase
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
        // Format status text không uppercase
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

