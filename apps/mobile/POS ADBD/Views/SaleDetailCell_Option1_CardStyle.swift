//
//  SaleDetailCell_Option1_CardStyle.swift
//  POS ADBD
//
//  OPTION 1: Modern Card Style với Shadow
//  Design: Card container với shadow, rounded corners, clear visual hierarchy
//

import UIKit
import SnapKit

class SaleDetailCell_Option1: UITableViewCell {
    // MARK: - UI Components
    private lazy var cardContainer: UIView = {
        let view = UIView()
        view.backgroundColor = .white
        view.layer.cornerRadius = 12
        view.layer.shadowColor = UIColor.black.cgColor
        view.layer.shadowOffset = CGSize(width: 0, height: 2)
        view.layer.shadowRadius = 4
        view.layer.shadowOpacity = 0.1
        view.clipsToBounds = false
        return view
    }()
    
    private lazy var contentStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 16
        stack.alignment = .center
        stack.distribution = .fill
        return stack
    }()
    
    // Left section: Order info
    private lazy var infoStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 8
        stack.alignment = .leading
        stack.distribution = .fill
        return stack
    }()
    
    // Header row: Order number + Customer
    private lazy var headerStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 12
        stack.alignment = .center
        stack.distribution = .fill
        return stack
    }()
    
    private lazy var orderNumberLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 16)
        label.textColor = .label
        return label
    }()
    
    private lazy var customerNameLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 14)
        label.textColor = .secondaryLabel
        return label
    }()
    
    private lazy var customerPhoneLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 12)
        label.textColor = .secondaryLabel
        return label
    }()
    
    // Dates section với background - Vertical layout để không bị che
    private lazy var datesContainer: UIView = {
        let view = UIView()
        view.backgroundColor = UIColor.systemGray6.withAlphaComponent(0.5)
        view.layer.cornerRadius = 8
        return view
    }()
    
    private lazy var datesStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 6
        stack.alignment = .leading
        stack.distribution = .fill
        return stack
    }()
    
    private lazy var createdDateView: UIView = {
        let view = UIView()
        return view
    }()
    
    private lazy var createdDateTitleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 10)
        label.textColor = .secondaryLabel
        label.text = "Book date".localized()
        return label
    }()
    
    private lazy var createdDateLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 12)
        label.textColor = .label
        return label
    }()
    
    private lazy var pickupDateView: UIView = {
        let view = UIView()
        return view
    }()
    
    private lazy var pickupDateTitleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 10)
        label.textColor = .secondaryLabel
        label.text = "Pickup date".localized()
        return label
    }()
    
    private lazy var pickupDateLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 12)
        label.textColor = .label
        return label
    }()
    
    private lazy var returnDateView: UIView = {
        let view = UIView()
        return view
    }()
    
    private lazy var returnDateTitleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 10)
        label.textColor = .secondaryLabel
        label.text = "Return date".localized()
        return label
    }()
    
    private lazy var returnDateLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 12)
        label.textColor = .label
        return label
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
        label.layer.cornerRadius = 12 // Pill shape
        label.clipsToBounds = true
        return label
    }()
    
    private var order: Order?
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
        selectionStyle = .none
        backgroundColor = .clear
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupUI() {
        contentView.addSubview(cardContainer)
        cardContainer.addSubview(contentStackView)
        
        // Setup header
        headerStackView.addArrangedSubview(orderNumberLabel)
        headerStackView.addArrangedSubview(customerNameLabel)
        
        // Setup dates - Horizontal layout (title: date) cho mỗi row
        let createdStack = UIStackView()
        createdStack.axis = .horizontal
        createdStack.spacing = 4
        createdStack.alignment = .leading
        createdStack.addArrangedSubview(createdDateTitleLabel)
        createdStack.addArrangedSubview(createdDateLabel)
        createdDateView.addSubview(createdStack)
        createdStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        let pickupStack = UIStackView()
        pickupStack.axis = .horizontal
        pickupStack.spacing = 4
        pickupStack.alignment = .leading
        pickupStack.addArrangedSubview(pickupDateTitleLabel)
        pickupStack.addArrangedSubview(pickupDateLabel)
        pickupDateView.addSubview(pickupStack)
        pickupStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        let returnStack = UIStackView()
        returnStack.axis = .horizontal
        returnStack.spacing = 4
        returnStack.alignment = .leading
        returnStack.addArrangedSubview(returnDateTitleLabel)
        returnStack.addArrangedSubview(returnDateLabel)
        returnDateView.addSubview(returnStack)
        returnStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        datesStackView.addArrangedSubview(createdDateView)
        datesStackView.addArrangedSubview(pickupDateView)
        datesStackView.addArrangedSubview(returnDateView)
        
        datesContainer.addSubview(datesStackView)
        
        // Setup info stack
        infoStackView.addArrangedSubview(headerStackView)
        infoStackView.addArrangedSubview(customerPhoneLabel)
        infoStackView.addArrangedSubview(datesContainer)
        
        // Setup right stack
        rightStackView.addArrangedSubview(itemCountLabel)
        rightStackView.addArrangedSubview(totalAmountLabel)
        rightStackView.addArrangedSubview(statusBadge)
        
        // Add to content stack
        contentStackView.addArrangedSubview(infoStackView)
        contentStackView.addArrangedSubview(rightStackView)
        
        // Constraints
        let isIPad = traitCollection.horizontalSizeClass == .regular
        let padding: CGFloat = isIPad ? 20 : 16
        let statusBadgeWidth: CGFloat = isIPad ? 100 : 85
        
        cardContainer.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(8)
            make.leading.equalToSuperview().offset(16)
            make.trailing.equalToSuperview().offset(-16)
            make.bottom.equalToSuperview().offset(-8)
        }
        
        contentStackView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(padding)
        }
        
        datesContainer.snp.makeConstraints { make in
            make.height.greaterThanOrEqualTo(60) // Flexible height cho vertical dates
        }
        
        datesStackView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(12)
        }
        
        // Set fixed width cho date titles để alignment đẹp
        [createdDateTitleLabel, pickupDateTitleLabel, returnDateTitleLabel].forEach { label in
            label.snp.makeConstraints { make in
                make.width.equalTo(75) // Fixed width cho title
            }
        }
        
        statusBadge.snp.makeConstraints { make in
            make.width.equalTo(statusBadgeWidth)
            make.height.equalTo(24)
        }
        
        infoStackView.setContentHuggingPriority(.defaultLow, for: .horizontal)
        rightStackView.setContentHuggingPriority(.required, for: .horizontal)
    }
    
    func bind(order: Order, sortType: OrderSortType = .book_date) {
        self.order = order
        
        orderNumberLabel.text = order.orderNumber
        customerNameLabel.text = order.customerName.isEmpty ? "N/A" : order.customerName
        customerPhoneLabel.text = ((order.customerPhone?.isEmpty) != nil) ? "N/A" : order.customerPhone
        
        createdDateLabel.text = order.createdAt.dateInString() ?? "N/A"
        
        if order.orderType == .rent {
            if let pickupDate = order.pickupDate {
                pickupDateLabel.text = pickupDate.dateInString() ?? "N/A"
                pickupDateView.isHidden = false
            } else {
                pickupDateLabel.text = "N/A"
                pickupDateView.isHidden = false
            }
            
            if let returnDate = order.returnDate {
                returnDateLabel.text = returnDate.dateInString() ?? "N/A"
                returnDateView.isHidden = false
            } else {
                returnDateLabel.text = "N/A"
                returnDateView.isHidden = false
            }
        } else {
            pickupDateView.isHidden = true
            returnDateView.isHidden = true
        }
        
        itemCountLabel.text = "\(order.itemCount) items"
        totalAmountLabel.text = order.totalAmount.formatStringInCommon()
        
        setupStatusBadge(for: order)
    }
    
    private func setupStatusBadge(for order: Order) {
        if order.orderType == .rent {
            statusBadge.text = order.status.inString()
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
            statusBadge.text = order.status.inString()
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

