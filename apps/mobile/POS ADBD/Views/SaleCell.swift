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
        // Compact list-row radius (was 12 — read as a large panel).
        view.layer.cornerRadius = 8
        view.layer.borderWidth = 1
        view.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.92).cgColor
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
        contentView.viewWithTag(9_901)?.removeFromSuperview()
    }
    
    // MARK: - Setup
    func setupUI(for layout: CellLayout = .sale) {
        contentView.backgroundColor = .clear
        backgroundColor = .clear
        rowSurfaceView.removeFromSuperview()
        containerStackView.removeFromSuperview()
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
            // Compact card row: keep surface chrome (users found plain rows odd),
            // but denser than the old 3-block layout.
            selectionStyle = .default
            let statusContainerWidth: CGFloat = isIPad ? 90 : 78
            let statusHeight: CGFloat = isIPad ? 24 : 20
            let outerInset: CGFloat = isIPad ? 20 : 16

            contentView.addSubview(rowSurfaceView)
            rowSurfaceView.addSubview(containerStackView)

            containerStackView.axis = .horizontal
            containerStackView.spacing = 10
            containerStackView.alignment = .center
            containerStackView.distribution = .fill

            let leftStack = UIStackView(arrangedSubviews: [orderIdLabel, nameLabel])
            leftStack.axis = .vertical
            leftStack.spacing = 2
            leftStack.alignment = .leading

            let rightStack = UIStackView(arrangedSubviews: [getDateLabel, bookDateLabel])
            rightStack.axis = .vertical
            rightStack.spacing = 2
            rightStack.alignment = .trailing

            nameLabel.setContentHuggingPriority(.defaultLow, for: .horizontal)
            nameLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
            getDateLabel.setContentHuggingPriority(.required, for: .horizontal)
            getDateLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
            bookDateLabel.setContentHuggingPriority(.required, for: .horizontal)

            containerStackView.addArrangedSubview(leftStack)
            containerStackView.addArrangedSubview(rightStack)
            containerStackView.addArrangedSubview(statusContainer)

            rowSurfaceView.snp.makeConstraints { make in
                make.top.equalToSuperview().offset(4)
                make.leading.equalToSuperview().offset(outerInset)
                make.trailing.equalToSuperview().offset(-outerInset)
                make.bottom.equalToSuperview().offset(-4)
            }

            containerStackView.snp.makeConstraints { make in
                make.top.equalToSuperview().offset(isIPad ? 12 : 10)
                make.leading.equalToSuperview().offset(isIPad ? 14 : 12)
                make.trailing.equalToSuperview().offset(isIPad ? -14 : -12)
                make.bottom.equalToSuperview().offset(isIPad ? -12 : -10)
            }

            statusContainer.snp.makeConstraints { make in
                make.width.equalTo(statusContainerWidth)
            }

            statusLabel.snp.makeConstraints { make in
                make.center.equalToSuperview()
                make.width.equalToSuperview()
                make.height.equalTo(statusHeight)
            }
            statusLabel.layer.cornerRadius = statusHeight / 2

            orderIdLabel.font = Utils.boldFont(size: isIPad ? 15 : 14)
            orderIdLabel.textColor = .textPrimary

            nameLabel.font = Utils.regularFont(size: isIPad ? 13 : 12)
            nameLabel.textColor = .textSecondary
            nameLabel.numberOfLines = 1
            nameLabel.lineBreakMode = .byTruncatingTail

            bookDateLabel.font = Utils.regularFont(size: isIPad ? 12 : 11)
            bookDateLabel.textColor = .textTertiary
            bookDateLabel.textAlignment = .right
            getDateLabel.font = Utils.boldFont(size: isIPad ? 15 : 14)
            getDateLabel.textColor = .textPrimary
            getDateLabel.textAlignment = .right

        case .order:
            selectionStyle = .default
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
        // Compact overview row: name only (phone is on order detail).
        let trimmed = name?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        nameLabel.attributedText = nil
        nameLabel.text = trimmed.isEmpty ? "N/A".localized() : trimmed
        nameLabel.numberOfLines = 1
        nameLabel.lineBreakMode = .byTruncatingTail
    }

    private func chartRevenueTextColor(for amount: Double) -> UIColor {
        amount < 0 ? .statusCancelledText : .textPrimary
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
        statusLabel.backgroundColor = status?.badgeColor ?? .statusDraftFill
        statusLabel.textColor = status?.badgeTextColor ?? .statusDraftText
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
    
    private func setupStatus(for dailyOrder: DailyIncomeOrder) {
        guard let statusString = dailyOrder.status else {
            statusLabel.text = "N/A".localized()
            statusLabel.backgroundColor = .clear
            return
        }
        
        // Localize status string
        statusLabel.text = statusString.localizedStatus()

        // Map status string to colors via the shared badge palette
        let status = OrderStatus.from(apiString: statusString)
        statusLabel.backgroundColor = status?.badgeColor ?? .statusDraftFill
        statusLabel.textColor = status?.badgeTextColor ?? .statusDraftText
    }
    
    private func setupStatus(for order: Order) {
        statusLabel.text = order.status.inString()
        statusLabel.backgroundColor = order.status.badgeColor
        statusLabel.textColor = order.status.badgeTextColor
    }
    
}
