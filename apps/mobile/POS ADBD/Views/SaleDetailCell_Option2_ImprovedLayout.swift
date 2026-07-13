//
//  SaleDetailCell_Option2_ImprovedLayout.swift
//  POS ADBD
//
//  OPTION 2: Improved Layout - Dates không bị che, layout rõ ràng hơn
//  Design: Dates xếp vertical hoặc wrap, spacing tốt hơn
//

import UIKit
import SnapKit

class SaleDetailCell_Option2: UITableViewCell {
    // MARK: - UI Components
    private lazy var containerView: UIView = {
        let view = UIView()
        view.backgroundColor = .white
        return view
    }()
    
    // Main container stack - vertical để chứa main row và dates section
    private lazy var mainContainerStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 8
        stack.alignment = .fill
        stack.distribution = .fill
        return stack
    }()
    
    private lazy var mainStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 16
        stack.alignment = .top
        stack.distribution = .fill
        return stack
    }()
    
    // Left section: Order info
    private lazy var leftStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 4
        stack.alignment = .leading
        stack.distribution = .fill
        return stack
    }()
    
    // Header: Order number
    private lazy var orderNumberLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 16)
        label.textColor = .label
        return label
    }()
    
    // Customer info row: Name + Phone cùng một line
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
    
    // Dates section - 2 rows: titles row và values row (full width)
    private lazy var datesStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 4
        stack.alignment = .fill
        stack.distribution = .fill
        return stack
    }()
    
    // Titles row: [Book date] [Pickup date] [Return date]
    private lazy var datesTitlesStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 20
        stack.alignment = .leading
        stack.distribution = .fillEqually
        return stack
    }()
    
    // Values row: [date value] [date value] [date value]
    private lazy var datesValuesStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 20
        stack.alignment = .leading
        stack.distribution = .fillEqually
        return stack
    }()
    
    // Date labels - Store references để dễ update (font size lớn hơn)
    private lazy var createdDateTitleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 13)
        label.textColor = .secondaryLabel
        label.text = "Book date".localized()
        label.textAlignment = .left
        return label
    }()
    
    private lazy var createdDateLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 14)
        label.textColor = .label
        label.textAlignment = .left
        return label
    }()
    
    private lazy var pickupDateTitleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 13)
        label.textColor = .secondaryLabel
        label.text = "Pickup date".localized()
        label.textAlignment = .left
        return label
    }()
    
    private lazy var pickupDateLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 14)
        label.textColor = .label
        label.textAlignment = .left
        return label
    }()
    
    private lazy var returnDateTitleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 13)
        label.textColor = .secondaryLabel
        label.text = "Return date".localized()
        label.textAlignment = .left
        return label
    }()
    
    private lazy var returnDateLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 14)
        label.textColor = .label
        label.textAlignment = .left
        return label
    }()
    
    // Right section
    private lazy var rightStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 4
        stack.alignment = .trailing
        stack.distribution = .fill
        return stack
    }()
    
    // Item count và Total amount cùng một line
    private lazy var itemAndTotalStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .trailing
        stack.distribution = .fill
        return stack
    }()
    
    private lazy var itemCountLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 12)
        label.textColor = .secondaryLabel
        label.textAlignment = .right
        return label
    }()
    
    private lazy var totalAmountLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 17)
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
        containerView.addSubview(mainContainerStack)
        
        // Setup customer info (name + separator + phone cùng một line)
        customerInfoStackView.addArrangedSubview(customerNameLabel)
        customerInfoStackView.addArrangedSubview(customerPhoneSeparator)
        customerInfoStackView.addArrangedSubview(customerPhoneLabel)
        
        // Setup left stack
        leftStackView.addArrangedSubview(orderNumberLabel)
        leftStackView.addArrangedSubview(customerInfoStackView)
        
        // Setup item and total cùng một line
        itemAndTotalStackView.addArrangedSubview(itemCountLabel)
        itemAndTotalStackView.addArrangedSubview(totalAmountLabel)
        
        // Setup right stack - Status ở top, sau đó là items và total cùng một line
        rightStackView.addArrangedSubview(statusBadge)
        rightStackView.addArrangedSubview(itemAndTotalStackView)
        
        // Add to main stack (horizontal row)
        mainStackView.addArrangedSubview(leftStackView)
        mainStackView.addArrangedSubview(rightStackView)
        
        // Setup dates - Titles row và Values row (full width, dưới status)
        datesTitlesStackView.addArrangedSubview(createdDateTitleLabel)
        datesTitlesStackView.addArrangedSubview(pickupDateTitleLabel)
        datesTitlesStackView.addArrangedSubview(returnDateTitleLabel)
        
        datesValuesStackView.addArrangedSubview(createdDateLabel)
        datesValuesStackView.addArrangedSubview(pickupDateLabel)
        datesValuesStackView.addArrangedSubview(returnDateLabel)
        
        datesStackView.addArrangedSubview(datesTitlesStackView)
        datesStackView.addArrangedSubview(datesValuesStackView)
        
        // Add to main container (vertical)
        mainContainerStack.addArrangedSubview(mainStackView)
        mainContainerStack.addArrangedSubview(datesStackView)
        
        // Constraints
        let isIPad = traitCollection.horizontalSizeClass == .regular
        let padding: CGFloat = isIPad ? 16 : 12
        let statusBadgeWidth: CGFloat = isIPad ? 100 : 85
        
        containerView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        mainContainerStack.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(padding)
            make.leading.equalToSuperview().offset(padding)
            make.trailing.equalToSuperview().offset(-padding)
            make.bottom.equalToSuperview().offset(-padding)
        }
        
        // Dates section full width
        datesStackView.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview()
        }
        
        // Ensure date labels have proper width
        [createdDateTitleLabel, pickupDateTitleLabel, returnDateTitleLabel,
         createdDateLabel, pickupDateLabel, returnDateLabel].forEach { label in
            label.setContentHuggingPriority(.defaultLow, for: .horizontal)
            label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        }
        
        statusBadge.snp.makeConstraints { make in
            make.width.equalTo(statusBadgeWidth)
            make.height.equalTo(26)
        }
        
        // Hide phone separator nếu không có phone
        customerPhoneSeparator.setContentHuggingPriority(.required, for: .horizontal)
        
        // Content priorities
        leftStackView.setContentHuggingPriority(.defaultLow, for: .horizontal)
        leftStackView.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        rightStackView.setContentHuggingPriority(.required, for: .horizontal)
        rightStackView.setContentCompressionResistancePriority(.required, for: .horizontal)
        
        // Ensure proper vertical spacing
        orderNumberLabel.setContentHuggingPriority(.required, for: .vertical)
        customerPhoneLabel.setContentHuggingPriority(.required, for: .vertical)
        datesStackView.setContentHuggingPriority(.required, for: .vertical)
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
        
        // Update dates
        createdDateLabel.text = order.createdAt.dateInString() ?? "N/A"
        
        if order.orderType == .rent {
            if let pickupDate = order.pickupDate {
                pickupDateLabel.text = pickupDate.dateInString() ?? "N/A"
                pickupDateTitleLabel.isHidden = false
                pickupDateLabel.isHidden = false
            } else {
                pickupDateLabel.text = "N/A"
                pickupDateTitleLabel.isHidden = false
                pickupDateLabel.isHidden = false
            }
            
            if let returnDate = order.returnDate {
                returnDateLabel.text = returnDate.dateInString() ?? "N/A"
                returnDateTitleLabel.isHidden = false
                returnDateLabel.isHidden = false
            } else {
                returnDateLabel.text = "N/A"
                returnDateTitleLabel.isHidden = false
                returnDateLabel.isHidden = false
            }
        } else {
            pickupDateTitleLabel.isHidden = true
            pickupDateLabel.isHidden = true
            returnDateTitleLabel.isHidden = true
            returnDateLabel.isHidden = true
        }
        
        let itemText = order.itemCount == 1 ? "item".localized() : "items".localized()
        itemCountLabel.text = "\(order.itemCount) \(itemText)"
        totalAmountLabel.text = order.totalAmount.formatStringInCommon()
        
        setupStatusBadge(for: order)
        
        // Apply font styling
        applyDateStyling(sortType: sortType, orderType: order.orderType)
    }
    
    private func applyDateStyling(sortType: OrderSortType, orderType: OrderType) {
        // Reset all dates (font size lớn hơn)
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
                statusBadge.backgroundColor = APP_TONE_COLOR
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

