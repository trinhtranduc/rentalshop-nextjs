import UIKit
import SnapKit
import Network

class SaleCell: UITableViewCell {
    // MARK: - UI Components
    private lazy var containerStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 4 // Reduced from 5 for more compact display
        stack.alignment = .leading
        stack.distribution = .fill
        return stack
    }()
    
    private lazy var orderIdLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 14) // Reduced from 16 for more compact display
        label.setContentHuggingPriority(.required, for: .horizontal)
        return label
    }()
    
    private lazy var statusContainer: UIView = {
        let view = UIView()
        view.setContentHuggingPriority(.required, for: .horizontal)
        return view
    }()
    
    private lazy var statusLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.mediumFont(size: isIPad ? 12 : 11) // Match SaleDetailCell_Option5
        label.textColor = .white
        label.textAlignment = .center
        label.layer.cornerRadius = 12 // Match SaleDetailCell_Option5 (was 4)
        label.clipsToBounds = true
        // Horizontal padding so long status labels aren't flush against rounded ends.
        label.setContentHuggingPriority(.required, for: .horizontal)
        label.setContentCompressionResistancePriority(.required, for: .horizontal)
        return label
    }()
    
    private lazy var nameLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 14) // Bold to make customer name stand out
        label.textColor = .textPrimary
        label.numberOfLines = 2
        label.minimumScaleFactor = 0.8
        return label
    }()

    private lazy var rowSurfaceView: UIView = {
        let view = UIView()
        view.backgroundColor = .backgroundCard
        view.layer.cornerRadius = 16
        view.layer.borderWidth = 1
        view.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.55).cgColor
        view.layer.shadowColor = UIColor.black.withAlphaComponent(0.03).cgColor
        view.layer.shadowOpacity = 1
        view.layer.shadowRadius = 10
        view.layer.shadowOffset = CGSize(width: 0, height: 4)
        return view
    }()
    
    private lazy var datesStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 8
        stack.distribution = .fillEqually
        return stack
    }()
    
    lazy var bookDateLabel: UILabel = createDateLabel()
    lazy var getDateLabel: UILabel = createDateLabel()
    
    private var order: Order?
    private var activeLayout: CellLayout = .sale
    
    enum CellLayout {
        case sale    // Book, Pickup, #, Name, Status
        case chart   // #, Name, Created, Income, Status
        case order   // Pickup, Return, #, QTY, Status
    }
    
    // Add quantity label for order layout
    private lazy var quantityLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 14) // Reduced from 16 for more compact display
        label.setContentHuggingPriority(.required, for: .horizontal)
        return label
    }()
    
    // MARK: - Initialization
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        // Don't call setupUI here - it will be called in bind methods
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func prepareForReuse() {
        super.prepareForReuse()
        // Remove all constraints and subviews to prevent duplicates
        containerStackView.snp.removeConstraints()
        rowSurfaceView.snp.removeConstraints()
        statusContainer.snp.removeConstraints()
        statusLabel.snp.removeConstraints()
        datesStack.snp.removeConstraints()
        rowSurfaceView.removeFromSuperview()
        containerStackView.removeFromSuperview()
        statusContainer.removeFromSuperview()
        contentView.viewWithTag(9_901)?.removeFromSuperview()
    }
    
    // MARK: - Setup
    func setupUI(for layout: CellLayout = .sale) {
        activeLayout = layout
        contentView.backgroundColor = .clear
        backgroundColor = .clear
        rowSurfaceView.removeFromSuperview()
        containerStackView.removeFromSuperview()
        statusContainer.removeFromSuperview()
        contentView.viewWithTag(9_901)?.removeFromSuperview()
        contentView.addSubview(containerStackView)
        
        // Remove any existing arranged subviews
        containerStackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
        datesStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        
        // Configure stack view
        containerStackView.axis = .horizontal
        containerStackView.spacing = 4
        containerStackView.alignment = .center
        containerStackView.distribution = .fill
        datesStack.axis = .horizontal
        datesStack.spacing = 8
        datesStack.distribution = .fillEqually
        
        // Configure all labels
        [orderIdLabel, nameLabel, bookDateLabel, getDateLabel].forEach {
            $0.setContentHuggingPriority(.required, for: .vertical)
            $0.setContentCompressionResistancePriority(.required, for: .vertical)
            $0.setContentHuggingPriority(.defaultLow, for: .horizontal)
        }
        
        // Setup status container
        statusContainer.addSubview(statusLabel)
        
        // Adjust font sizes for iPad - Update statusLabel font to match device
        let isIPad = traitCollection.horizontalSizeClass == .regular
        statusLabel.font = Utils.mediumFont(size: isIPad ? 12 : 11) // Match SaleDetailCell_Option5
        
        switch layout {
        case .sale:
            selectionStyle = .default
            contentView.backgroundColor = .clear
            let statusContainerWidth: CGFloat = isIPad ? 100 : 80
            let statusHeight: CGFloat = isIPad ? 28 : 24
            orderIdLabel.font = Utils.regularFont(size: 14)
            orderIdLabel.textColor = .textPrimary
            nameLabel.font = Utils.boldFont(size: 14)
            nameLabel.textColor = .textPrimary
            nameLabel.numberOfLines = 2
            bookDateLabel.font = Utils.regularFont(size: 13)
            bookDateLabel.textColor = .textPrimary
            getDateLabel.font = Utils.regularFont(size: 13)
            getDateLabel.textColor = .textPrimary
            // Create a stack for # and Name
            let infoStack = UIStackView()
            infoStack.axis = .horizontal
            infoStack.spacing = 5
            infoStack.distribution = .fillEqually
            infoStack.addArrangedSubview(orderIdLabel)
            infoStack.addArrangedSubview(nameLabel)
            
            // Add dates to dates stack
            datesStack.addArrangedSubview(bookDateLabel)
            datesStack.addArrangedSubview(getDateLabel)
            
            // Add to container in correct order
            containerStackView.addArrangedSubview(datesStack)
            containerStackView.addArrangedSubview(infoStack)
            containerStackView.addArrangedSubview(statusContainer)
            
            // Setup constraints with SnapKit
            containerStackView.snp.makeConstraints { make in
                make.top.equalToSuperview().offset(isIPad ? 16 : 12)
                make.leading.equalToSuperview().offset(isIPad ? 24 : 16)
                make.trailing.equalToSuperview().offset(isIPad ? -24 : -16)
                make.bottom.equalToSuperview().offset(isIPad ? -16 : -12)
            }
            
            statusContainer.snp.makeConstraints { make in
                make.width.equalTo(statusContainerWidth)
            }
            
            statusLabel.snp.makeConstraints { make in
                make.center.equalToSuperview()
                make.width.equalToSuperview()
                make.height.equalTo(statusHeight)
            }
            
            // Set equal widths for date stack and info stack
            datesStack.snp.makeConstraints { make in
                make.width.equalTo(infoStack)
            }
            
        case .chart:
            // Flat row inside grouped today-orders card.
            // Trailing column: badge (top-right) + revenue + date stacked vertically
            // so money aligns in one column across rows.
            selectionStyle = .default
            let statusHeight: CGFloat = isIPad ? 24 : 22
            contentView.addSubview(containerStackView)
            contentView.addSubview(statusContainer)

            let leftStack = UIStackView(arrangedSubviews: [orderIdLabel, nameLabel])
            leftStack.axis = .vertical
            leftStack.spacing = 3
            leftStack.alignment = .leading

            let moneyStack = UIStackView(arrangedSubviews: [getDateLabel, bookDateLabel])
            moneyStack.axis = .vertical
            moneyStack.spacing = 2
            moneyStack.alignment = .trailing

            nameLabel.setContentHuggingPriority(.defaultLow, for: .horizontal)
            nameLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
            getDateLabel.setContentHuggingPriority(.required, for: .horizontal)
            getDateLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
            bookDateLabel.setContentHuggingPriority(.required, for: .horizontal)
            bookDateLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
            moneyStack.setContentHuggingPriority(.required, for: .horizontal)
            moneyStack.setContentCompressionResistancePriority(.required, for: .horizontal)

            containerStackView.axis = .horizontal
            containerStackView.spacing = 12
            containerStackView.alignment = .center
            containerStackView.distribution = .fill
            containerStackView.addArrangedSubview(leftStack)
            containerStackView.addArrangedSubview(moneyStack)

            containerStackView.snp.makeConstraints { make in
                make.leading.equalToSuperview()
                make.trailing.equalToSuperview()
                make.bottom.equalToSuperview().offset(isIPad ? -10 : -8)
                // Leave headroom for the status chip pinned to the top-trailing corner.
                make.top.equalToSuperview().offset(isIPad ? 30 : 28)
            }

            moneyStack.snp.makeConstraints { make in
                make.width.greaterThanOrEqualTo(isIPad ? 108 : 96)
            }

            statusContainer.clipsToBounds = true
            statusContainer.layer.cornerRadius = statusHeight / 2
            statusLabel.backgroundColor = .clear
            statusContainer.snp.makeConstraints { make in
                make.top.equalToSuperview().offset(isIPad ? 8 : 6)
                make.trailing.equalToSuperview()
            }
            statusLabel.snp.makeConstraints { make in
                make.edges.equalToSuperview().inset(UIEdgeInsets(top: 0, left: 8, bottom: 0, right: 8))
                make.height.equalTo(statusHeight)
            }
            statusLabel.layer.cornerRadius = 0
            statusLabel.font = Utils.mediumFont(size: isIPad ? 10 : 9)

            let separator = UIView()
            separator.tag = 9_901
            separator.backgroundColor = UIColor.borderColor.withAlphaComponent(0.65)
            contentView.addSubview(separator)
            separator.snp.makeConstraints { make in
                make.leading.trailing.bottom.equalToSuperview()
                make.height.equalTo(1 / UIScreen.main.scale)
            }

            orderIdLabel.font = Utils.boldFont(size: isIPad ? 16 : 15)
            orderIdLabel.textColor = .textPrimary

            nameLabel.font = Utils.regularFont(size: isIPad ? 13 : 12)
            nameLabel.textColor = .textSecondary
            nameLabel.numberOfLines = 1
            nameLabel.lineBreakMode = .byTruncatingTail

            bookDateLabel.font = Utils.regularFont(size: isIPad ? 12 : 11)
            bookDateLabel.textColor = .textTertiary
            bookDateLabel.textAlignment = .right
            getDateLabel.font = Utils.boldFont(size: isIPad ? 16 : 15)
            getDateLabel.textColor = .textPrimary
            getDateLabel.textAlignment = .right

        case .order:
            selectionStyle = .default
            contentView.backgroundColor = .clear
            orderIdLabel.font = Utils.regularFont(size: 14)
            orderIdLabel.textColor = .textPrimary
            bookDateLabel.font = Utils.regularFont(size: 13)
            bookDateLabel.textColor = .textPrimary
            getDateLabel.font = Utils.regularFont(size: 13)
            getDateLabel.textColor = .textPrimary
            // Create a stack for # and QTY
            let infoStack = UIStackView()
            infoStack.axis = .horizontal
            infoStack.spacing = 4 // Reduced from 5
            infoStack.distribution = .fillEqually
            infoStack.addArrangedSubview(orderIdLabel)
            infoStack.addArrangedSubview(quantityLabel)
            
            // Add dates to dates stack
            datesStack.spacing = 6 // Reduced from 8 for more compact display
            datesStack.addArrangedSubview(bookDateLabel)
            datesStack.addArrangedSubview(getDateLabel)
            
            containerStackView.addArrangedSubview(datesStack)
            containerStackView.addArrangedSubview(infoStack)
            containerStackView.addArrangedSubview(statusContainer)
            
            // Setup constraints with SnapKit - Reduced padding and height for more compact display
            containerStackView.snp.makeConstraints { make in
                make.top.equalToSuperview().offset(isIPad ? 10 : 6)
                make.leading.equalToSuperview().offset(isIPad ? 16 : 12)
                make.trailing.equalToSuperview().offset(isIPad ? -16 : -12)
                make.bottom.equalToSuperview().offset(isIPad ? -10 : -6)
                make.height.equalTo(isIPad ? 44 : 40) // Reduced from 60:50
            }
            
            statusContainer.snp.makeConstraints { make in
                make.width.equalTo(isIPad ? 100 : 85) // Match SaleDetailCell_Option5
            }
            
            statusLabel.snp.makeConstraints { make in
                make.center.equalToSuperview()
                make.width.equalToSuperview()
                make.height.equalTo(26) // Match SaleDetailCell_Option5
            }
            
            // Set equal widths for date stack and info stack
            datesStack.snp.makeConstraints { make in
                make.width.equalTo(infoStack)
            }
        }
    }
    
    private func createDateLabel() -> UILabel {
        let label = UILabel()
        label.font = Utils.regularFont(size: 13) // Reduced from 16 for more compact display
        label.textColor = .textPrimary
        label.minimumScaleFactor = 0.5
        label.contentScaleFactor = 0.5
        return label
    }

    private func formattedOrderIdentifier(_ rawValue: String?) -> String {
        let trimmed = (rawValue ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return "#N/A".localized() }
        return trimmed.hasPrefix("#") ? trimmed : "#\(trimmed)"
    }

    private func setChartCustomerInfo(name: String?, phone: String?) {
        let trimmed = name?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let phoneText = phone?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let displayName = trimmed.isEmpty ? "N/A".localized() : trimmed

        let attributed = NSMutableAttributedString(
            string: displayName,
            attributes: [
                .font: Utils.mediumFont(size: 15),
                .foregroundColor: UIColor.textPrimary
            ]
        )

        if !phoneText.isEmpty {
            attributed.append(
                NSAttributedString(
                    string: "\n\(phoneText)",
                    attributes: [
                        .font: Utils.regularFont(size: 12),
                        .foregroundColor: UIColor.textSecondary
                    ]
                )
            )
        }

        nameLabel.attributedText = attributed
        nameLabel.numberOfLines = phoneText.isEmpty ? 1 : 2
        nameLabel.lineBreakMode = .byTruncatingTail
    }

    private func chartRevenueTextColor(for amount: Double) -> UIColor {
        if amount < 0 {
            return .actionDanger
        }
        if amount > 0 {
            return .brandPrimary
        }
        return .textPrimary
    }

    /// Income amount stays right-aligned in the compact overview meta row.
    private func setChartIncomeAlignment() {
        bookDateLabel.textAlignment = .right
        getDateLabel.textAlignment = .right
    }
    
    // MARK: - Public Methods
    func bind(order: Order, product: Product? = nil, layout: CellLayout = .sale) {
        setupUI(for: layout)
        
        self.order = order
        
        switch layout {
        case .sale:
            // Order ID and Status
            orderIdLabel.text = order.orderNumber
            setupStatus(for: order)
            
            // Customer Name
            nameLabel.text = order.customerName
            
            // Dates
            bookDateLabel.text = order.createdAt.dateInString()
            
            // Debug pickup date parsing
            if let pickupDate = order.pickupDate {
                print("📅 Pickup Date: \(pickupDate)")
                getDateLabel.text = pickupDate.dateInString()
            } else {
                print("❌ Pickup Date is nil")
                getDateLabel.text = order.createdAt.dateInString()
            }
            
        case .chart:
            orderIdLabel.text = formattedOrderIdentifier(order.orderNumber)
            setChartCustomerInfo(name: order.customerName, phone: order.customerPhone)
            bookDateLabel.text = order.createdAt.dateInString()
            getDateLabel.text = order.totalAmount.formatStringInCommon()
            getDateLabel.textColor = chartRevenueTextColor(for: order.totalAmount)
            setChartIncomeAlignment()
            setupStatus(for: order)
            
        case .order:
            // Order ID
            orderIdLabel.text = order.orderNumber
            
            // Dates
            // Debug pickup date parsing
            if let pickupDate = order.pickupDate {
                print("📅 Order Pickup Date: \(pickupDate)")
                bookDateLabel.text = pickupDate.dateInString()
            } else {
                print("❌ Order Pickup Date is nil")
                bookDateLabel.text = "N/A".localized()
            }
            
            // Debug return date parsing
            if let returnDate = order.returnDate {
                print("📅 Order Return Date: \(returnDate)")
                getDateLabel.text = returnDate.dateInString()
            } else {
                print("❌ Order Return Date is nil")
                getDateLabel.text = "N/A".localized()
            }
            
            // Quantity
            if let product = product {
                let orderItems = order.orderItems ?? []
                let productItems = orderItems.filter { $0.productId == product.product_id }
                let totalQuantity = productItems.reduce(0) { $0 + $1.quantity }
                quantityLabel.text = "\(totalQuantity)"
            }
            
            // Status
            setupStatus(for: order)
        }
    }
    
    
    // MARK: - Bind NewAvailabilityOrder (for Order Check with new API)
    func bindAvailabilityOrder(_ order: NewAvailabilityOrder) {
        setupUI(for: .order)
        
        // Order ID
        orderIdLabel.text = order.orderNumber ?? ""
        
        // Customer Name
        nameLabel.text = order.customerName ?? ""
        
        // Pickup Date
        if let pickupStr = order.pickupPlanAt {
            bookDateLabel.text = pickupStr.toDate()?.dateInString() ?? "N/A".localized()
        } else {
            bookDateLabel.text = "N/A".localized()
        }
        
        // Return Date
        if let returnStr = order.returnPlanAt {
            getDateLabel.text = returnStr.toDate()?.dateInString() ?? "N/A".localized()
        } else {
            getDateLabel.text = "N/A".localized()
        }
        
        // Quantity
        quantityLabel.text = "\(order.quantity ?? 0)"
        
        // Status
        let statusString = order.status ?? ""
        statusLabel.text = statusString.localizedStatus()
        let status = OrderStatus.from(apiString: statusString)
        applyStatusStyle(
            fill: status?.badgeColor ?? .statusDraftFill,
            text: status?.badgeTextColor ?? .statusDraftText
        )
    }
    
    
    // MARK: - Bind DailyIncomeOrder (for daily income analytics)
    func bind(dailyOrder: DailyIncomeOrder, layout: CellLayout = .chart) {
        setupUI(for: layout)
        
        switch layout {
        case .chart:
            orderIdLabel.text = formattedOrderIdentifier(dailyOrder.orderNumber)
            setChartCustomerInfo(name: dailyOrder.customerName, phone: dailyOrder.customerPhone)
            if let revenueDate = dailyOrder.revenueDate {
                bookDateLabel.text = revenueDate.dateInString()
            } else {
                bookDateLabel.text = "N/A".localized()
            }
            let revenueValue = dailyOrder.revenue ?? dailyOrder.totalAmount ?? 0.0
            getDateLabel.text = revenueValue.formatStringInCommon()
            getDateLabel.textColor = chartRevenueTextColor(for: revenueValue)
            setChartIncomeAlignment()
            setupStatus(for: dailyOrder)
        default:
            // For other layouts, use chart layout as default
            bind(dailyOrder: dailyOrder, layout: .chart)
        }
    }
    
    private func applyStatusStyle(fill: UIColor, text: UIColor) {
        statusLabel.textColor = text
        if activeLayout == .chart {
            // Chip fill lives on the padded container so long labels get breathing room.
            statusContainer.backgroundColor = fill
            statusLabel.backgroundColor = .clear
        } else {
            statusLabel.backgroundColor = fill
            statusContainer.backgroundColor = .clear
        }
    }

    private func setupStatus(for dailyOrder: DailyIncomeOrder) {
        guard let statusString = dailyOrder.status else {
            statusLabel.text = "N/A".localized()
            applyStatusStyle(fill: .clear, text: .textSecondary)
            return
        }
        
        statusLabel.text = statusString.localizedStatus()
        let status = OrderStatus.from(apiString: statusString)
        applyStatusStyle(
            fill: status?.badgeColor ?? .statusDraftFill,
            text: status?.badgeTextColor ?? .statusDraftText
        )
    }
    
    private func setupStatus(for order: Order) {
        statusLabel.text = order.status.inString()
        applyStatusStyle(fill: order.status.badgeColor, text: order.status.badgeTextColor)
    }
    
}
