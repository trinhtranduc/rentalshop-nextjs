//
//  SaleDetailCell.swift
//  POS ADBD
//
//  Created by Assistant on 12/15/25.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import UIKit
import SnapKit
import Kingfisher

class SaleDetailCell: UITableViewCell {
    // MARK: - UI Components
    private lazy var containerView: UIView = {
        let view = UIView()
        view.isUserInteractionEnabled = true
        return view
    }()
    
    // Main horizontal stack for all info
    private lazy var mainStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 12
        stack.alignment = .center
        stack.distribution = .fill
        return stack
    }()
    
    // Status badge (leftmost, larger)
    private lazy var statusBadge: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 12)
        label.textColor = .white
        label.textAlignment = .center
        label.layer.cornerRadius = 4
        label.clipsToBounds = true
        label.numberOfLines = 1
        return label
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
    
    // Order number (bold, top)
    private lazy var orderNumberLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 15)
        label.textColor = .label
        label.numberOfLines = 1
        return label
    }()
    
    // Customer info row (name + phone)
    private lazy var customerInfoStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .center
        stack.distribution = .fill
        return stack
    }()
    
    private lazy var customerNameLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 13)
        label.textColor = .label
        label.numberOfLines = 1
        return label
    }()
    
    private lazy var customerPhoneLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 12)
        label.textColor = .secondaryLabel
        label.numberOfLines = 1
        return label
    }()
    
    // Dates row with titles (Created, Pickup, Return) - Vertical layout để không bị che
    private lazy var datesStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 4
        stack.alignment = .leading
        stack.distribution = .fill
        return stack
    }()
    
    // Created date (ngày tạo) - Horizontal row
    private lazy var createdDateContainer: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 4
        stack.alignment = .leading
        stack.distribution = .fill
        return stack
    }()
    
    private lazy var createdDateTitleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 11)
        label.textColor = .secondaryLabel
        label.text = "Book date".localized() + ":"
        return label
    }()
    
    private lazy var createdDateLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 11)
        label.textColor = .label
        label.numberOfLines = 1
        return label
    }()
    
    // Pickup date (ngày thuê) - Horizontal row
    private lazy var pickupDateContainer: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 4
        stack.alignment = .leading
        stack.distribution = .fill
        return stack
    }()
    
    private lazy var pickupDateTitleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 11)
        label.textColor = .secondaryLabel
        label.text = "Pickup date".localized() + ":"
        return label
    }()
    
    private lazy var pickupDateLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 11)
        label.textColor = .label
        label.numberOfLines = 1
        return label
    }()
    
    // Return date (ngày trả) - Horizontal row
    private lazy var returnDateContainer: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 4
        stack.alignment = .leading
        stack.distribution = .fill
        return stack
    }()
    
    private lazy var returnDateTitleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 11)
        label.textColor = .secondaryLabel
        label.text = "Return date".localized() + ":"
        return label
    }()
    
    private lazy var returnDateLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 11)
        label.textColor = .label
        label.numberOfLines = 1
        return label
    }()
    
    // Middle section: Item count
    private lazy var itemCountLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 11)
        label.textColor = .secondaryLabel
        label.numberOfLines = 1
        return label
    }()
    
    // Right section: Total amount
    private lazy var totalAmountLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 15)
        label.textColor = .label
        label.textAlignment = .right
        label.numberOfLines = 1
        return label
    }()
    
    // MARK: - Properties
    private var order: Order?
    
    // MARK: - Initialization
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
        selectionStyle = .default
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Setup
    private func setupUI() {
        backgroundColor = .white
        
        contentView.addSubview(containerView)
        containerView.addSubview(mainStackView)
        
        // Setup left stack
        leftStackView.addArrangedSubview(orderNumberLabel)
        
        // Customer info
        customerInfoStack.addArrangedSubview(customerNameLabel)
        customerInfoStack.addArrangedSubview(customerPhoneLabel)
        leftStackView.addArrangedSubview(customerInfoStack)
        
        // Dates with titles (Created, Pickup, Return)
        createdDateContainer.addArrangedSubview(createdDateTitleLabel)
        createdDateContainer.addArrangedSubview(createdDateLabel)
        
        pickupDateContainer.addArrangedSubview(pickupDateTitleLabel)
        pickupDateContainer.addArrangedSubview(pickupDateLabel)
        
        returnDateContainer.addArrangedSubview(returnDateTitleLabel)
        returnDateContainer.addArrangedSubview(returnDateLabel)
        
        // Dates xếp vertical để không bị che
        datesStackView.addArrangedSubview(createdDateContainer)
        datesStackView.addArrangedSubview(pickupDateContainer)
        datesStackView.addArrangedSubview(returnDateContainer)
        leftStackView.addArrangedSubview(datesStackView)
        
        // Set fixed width cho date titles để alignment đẹp
        [createdDateTitleLabel, pickupDateTitleLabel, returnDateTitleLabel].forEach { label in
            label.snp.makeConstraints { make in
                make.width.equalTo(75) // Fixed width cho title
            }
        }
        
        // Add to main stack (status badge is rightmost)
        mainStackView.addArrangedSubview(leftStackView)
        mainStackView.addArrangedSubview(itemCountLabel)
        mainStackView.addArrangedSubview(totalAmountLabel)
        mainStackView.addArrangedSubview(statusBadge)
        
        // Adjust sizes based on device
        let isIPad = traitCollection.horizontalSizeClass == .regular
        let horizontalSpacing: CGFloat = isIPad ? 16 : 12
        let verticalSpacing: CGFloat = isIPad ? 10 : 8
        let statusBadgeWidth: CGFloat = isIPad ? 100 : 85
        let statusBadgeHeight: CGFloat = isIPad ? 28 : 24
        
        // Container view constraints
        containerView.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(verticalSpacing)
            make.leading.equalToSuperview().offset(horizontalSpacing)
            make.trailing.equalToSuperview().offset(-horizontalSpacing)
            make.bottom.equalToSuperview().offset(-verticalSpacing)
        }
        
        // Main stack constraints
        mainStackView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        // Status badge constraints (rightmost, larger)
        statusBadge.snp.makeConstraints { make in
            make.width.equalTo(statusBadgeWidth)
            make.height.equalTo(statusBadgeHeight)
        }
        
        // Left stack - flexible, takes most space
        leftStackView.setContentHuggingPriority(.defaultLow, for: .horizontal)
        leftStackView.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        
        // Item count - fixed width
        itemCountLabel.setContentHuggingPriority(.required, for: .horizontal)
        itemCountLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        itemCountLabel.snp.makeConstraints { make in
            make.width.greaterThanOrEqualTo(30)
        }
        
        // Total amount - fixed width
        totalAmountLabel.setContentHuggingPriority(.required, for: .horizontal)
        totalAmountLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        totalAmountLabel.snp.makeConstraints { make in
            make.width.greaterThanOrEqualTo(80)
        }
        
        // Set content priorities for proper layout
        orderNumberLabel.setContentHuggingPriority(.required, for: .vertical)
        customerInfoStack.setContentHuggingPriority(.required, for: .vertical)
        datesStackView.setContentHuggingPriority(.required, for: .vertical)
        itemCountLabel.setContentHuggingPriority(.required, for: .vertical)
        statusBadge.setContentHuggingPriority(.required, for: .vertical)
        totalAmountLabel.setContentHuggingPriority(.required, for: .vertical)
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        contentView.frame = bounds
    }
    
    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        
        // Update constraints and font sizes when device orientation or size class changes
        if traitCollection.horizontalSizeClass != previousTraitCollection?.horizontalSizeClass {
            setupUI()
        }
    }
    
    // MARK: - Public Methods
    func bind(order: Order, sortType: OrderSortType = .book_date) {
        self.order = order
        
        // Order number
        orderNumberLabel.text = order.orderNumber
        
        // Customer name
        customerNameLabel.text = order.customerName.isEmpty ? "N/A" : order.customerName
        
        // Customer phone
        customerPhoneLabel.text = ((order.customerPhone?.isEmpty) != nil) ? "N/A" : "• \(order.customerPhone ?? "N/A")"
        
        // Dates with titles
        // Created date (ngày tạo)
        createdDateLabel.text = order.createdAt.dateInString() ?? "N/A"
        
        if order.orderType == .rent {
            // Pickup date (ngày thuê)
            if let pickupDate = order.pickupDate {
                pickupDateLabel.text = pickupDate.dateInString() ?? "N/A"
                pickupDateContainer.isHidden = false
            } else {
                pickupDateLabel.text = "N/A"
                pickupDateContainer.isHidden = false
            }
            
            // Return date (ngày trả)
            if let returnDate = order.returnDate {
                returnDateLabel.text = returnDate.dateInString() ?? "N/A"
                returnDateContainer.isHidden = false
            } else {
                returnDateLabel.text = "N/A"
                returnDateContainer.isHidden = false
            }
        } else {
            // For sale orders, hide pickup and return dates
            pickupDateContainer.isHidden = true
            returnDateContainer.isHidden = true
        }
        
        // Item count (compact)
        let itemCount = order.itemCount
        itemCountLabel.text = "\(itemCount)"
        
        // Total amount
        totalAmountLabel.text = order.totalAmount.formatStringInCommon()
        
        // Status badge
        setupStatusBadge(for: order)
        
        // Apply font styling based on sort type (for rent orders)
        if order.orderType == .rent {
            if sortType == .book_date {
                createdDateLabel.font = Utils.boldFont(size: 11)
                createdDateTitleLabel.font = Utils.boldFont(size: 11)
                pickupDateLabel.font = Utils.regularFont(size: 11)
                pickupDateTitleLabel.font = Utils.regularFont(size: 11)
                returnDateLabel.font = Utils.regularFont(size: 11)
                returnDateTitleLabel.font = Utils.regularFont(size: 11)
            } else if sortType == .get_date {
                createdDateLabel.font = Utils.regularFont(size: 11)
                createdDateTitleLabel.font = Utils.regularFont(size: 11)
                pickupDateLabel.font = Utils.boldFont(size: 11)
                pickupDateTitleLabel.font = Utils.boldFont(size: 11)
                returnDateLabel.font = Utils.regularFont(size: 11)
                returnDateTitleLabel.font = Utils.regularFont(size: 11)
            }
        } else {
            // For sale orders, always highlight created date
            createdDateLabel.font = Utils.boldFont(size: 11)
            createdDateTitleLabel.font = Utils.boldFont(size: 11)
            pickupDateLabel.font = Utils.regularFont(size: 11)
            pickupDateTitleLabel.font = Utils.regularFont(size: 11)
            returnDateLabel.font = Utils.regularFont(size: 11)
            returnDateTitleLabel.font = Utils.regularFont(size: 11)
        }
    }
    
    private func setupStatusBadge(for order: Order) {
        statusBadge.text = order.status.inString()
        statusBadge.backgroundColor = order.status.badgeColor
        statusBadge.textColor = order.status.badgeTextColor
    }
}
