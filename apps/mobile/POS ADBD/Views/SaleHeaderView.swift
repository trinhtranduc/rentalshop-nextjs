import UIKit
import SnapKit

class SaleHeaderView: UIView {
    enum HeaderLayout {
        case sale    // Book, Pickup, #, Name, Status
        case chart   // #, Name, Created, Income, Status
        case order   // Pickup, Return, #, Quantity, Status
    }
    
    // MARK: - Properties
    var sortType: OrderSortType? {
        didSet {
            updateHeaderStyle()
        }
    }
    
    private lazy var containerStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 5
        stack.alignment = .fill
        stack.distribution = .fill
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()
    
    private lazy var datesStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 8
        stack.distribution = .fillEqually
        return stack
    }()
    
    private lazy var bookDateLabel: UILabel = createHeaderLabel(text: "Created_Header".localized().uppercased())
    private lazy var pickupDateLabel: UILabel = createHeaderLabel(text: "Income_Header".localized().uppercased())
    private lazy var orderNumberLabel: UILabel = createHeaderLabel(text: "#".localized())
    private lazy var nameLabel: UILabel = createHeaderLabel(text: "Name_Header".localized().uppercased())
    
    // Add new labels for order layout
    private lazy var returnDateLabel: UILabel = createHeaderLabel(text: "Return_Header".localized().uppercased())
    private lazy var quantityLabel: UILabel = createHeaderLabel(text: "Quantity_Header".localized().uppercased())
    
    private lazy var statusContainer: UIView = {
        let view = UIView()
        view.setContentHuggingPriority(.required, for: .horizontal)
        return view
    }()
    
    private lazy var statusLabel: UILabel = createHeaderLabel(text: "Status_Header".localized().uppercased())
    
    private func createHeaderLabel(text: String) -> UILabel {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.regularFont(size: isIPad ? 14 : 11)
        label.text = text
        label.minimumScaleFactor = 0.5
        label.adjustsFontSizeToFitWidth = true
        label.textColor = .black
        return label
    }
    
    init(frame: CGRect, layout: HeaderLayout, sortable: Bool = false) {
        super.init(frame: frame)
        setupUI(for: layout)
        if !sortable {
            let isIPad = traitCollection.horizontalSizeClass == .regular
            let fontSize: CGFloat = isIPad ? 14 : 11
            
            // Update font size for all labels
            bookDateLabel.font = Utils.regularFont(size: fontSize)
            pickupDateLabel.font = Utils.regularFont(size: fontSize)
            returnDateLabel.font = Utils.regularFont(size: fontSize)
            orderNumberLabel.font = Utils.regularFont(size: fontSize)
            nameLabel.font = Utils.regularFont(size: fontSize)
            quantityLabel.font = Utils.regularFont(size: fontSize)
            statusLabel.font = Utils.regularFont(size: fontSize)
        }
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupUI(for layout: HeaderLayout) {
        backgroundColor = APP_TONE_LINE_BG_COLOR
        
        addSubview(containerStackView)
        
        // Remove any existing arranged subviews
        containerStackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
        datesStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        
        // Configure stack view
        containerStackView.alignment = .fill
        containerStackView.distribution = .fill
        
        // Configure all labels
        [orderNumberLabel, nameLabel, bookDateLabel, pickupDateLabel, statusLabel].forEach {
            $0.setContentHuggingPriority(.required, for: .vertical)
            $0.setContentCompressionResistancePriority(.required, for: .vertical)
            $0.setContentHuggingPriority(.defaultLow, for: .horizontal)
        }
        
        // Setup status container
        statusContainer.addSubview(statusLabel)
        
        // Adjust sizes for iPad
        let isIPad = traitCollection.horizontalSizeClass == .regular
        let statusContainerWidth: CGFloat = isIPad ? 100 : 80
        
        switch layout {
        case .sale:
            bookDateLabel.text = "Book_Header".localized().uppercased()
            pickupDateLabel.text = "Pickup_Header".localized().uppercased()
            
            // Create a stack for # and Name
            let infoStack = UIStackView()
            infoStack.axis = .horizontal
            infoStack.spacing = 5
            infoStack.distribution = .fillEqually
            infoStack.addArrangedSubview(orderNumberLabel)
            infoStack.addArrangedSubview(nameLabel)
            
            // Add dates to dates stack
            datesStack.addArrangedSubview(bookDateLabel)
            datesStack.addArrangedSubview(pickupDateLabel)
            
            // Add to container in correct order
            containerStackView.addArrangedSubview(datesStack)
            containerStackView.addArrangedSubview(infoStack)
            containerStackView.addArrangedSubview(statusContainer)
            
            // Setup constraints using SnapKit
            containerStackView.snp.makeConstraints { make in
                make.edges.equalToSuperview().inset(UIEdgeInsets(top: 0,
                                                                 left: isIPad ? 24 : 16,
                                                                 bottom: 0,
                                                                 right: isIPad ? 24 : 16))
            }
            
            statusContainer.snp.makeConstraints { make in
                make.width.equalTo(statusContainerWidth)
            }
            
            datesStack.snp.makeConstraints { make in
                make.width.equalTo(infoStack)
            }
            
            statusLabel.snp.makeConstraints { make in
                make.center.equalToSuperview()
                make.width.equalToSuperview()
            }
            
            // Configure datesStack to fill height
            datesStack.alignment = .fill
            datesStack.distribution = .fillEqually
            
        case .chart:
            backgroundColor = .backgroundSecondary
            bookDateLabel.text = "Created_Header".localized().uppercased()
            bookDateLabel.textAlignment = .left
            bookDateLabel.font = Utils.mediumFont(size: isIPad ? 14 : 11)
            pickupDateLabel.text = "Income_Header".localized().uppercased()
            pickupDateLabel.textAlignment = .right
            pickupDateLabel.font = Utils.mediumFont(size: isIPad ? 14 : 11)
            orderNumberLabel.font = Utils.mediumFont(size: isIPad ? 14 : 11)
            nameLabel.font = Utils.mediumFont(size: isIPad ? 14 : 11)
            statusLabel.font = Utils.mediumFont(size: isIPad ? 14 : 11)

            // Create a stack for # and Name
            let infoStack = UIStackView()
            infoStack.axis = .horizontal
            infoStack.spacing = 5
            infoStack.distribution = .fillEqually
            infoStack.addArrangedSubview(orderNumberLabel)
            infoStack.addArrangedSubview(nameLabel)
            
            // Add dates to dates stack
            datesStack.addArrangedSubview(bookDateLabel)
            datesStack.addArrangedSubview(pickupDateLabel)
            
            // Add to container in correct order
            containerStackView.addArrangedSubview(datesStack)
            containerStackView.addArrangedSubview(infoStack)
            containerStackView.addArrangedSubview(statusContainer)
            
            // Setup constraints using SnapKit
            containerStackView.snp.makeConstraints { make in
                make.edges.equalToSuperview().inset(UIEdgeInsets(top: 0,
                                                                 left: isIPad ? 24 : 16,
                                                                 bottom: 0,
                                                                 right: isIPad ? 24 : 16))
            }
            
            statusContainer.snp.makeConstraints { make in
                make.width.equalTo(statusContainerWidth)
            }
            
            datesStack.snp.makeConstraints { make in
                make.width.equalTo(infoStack)
            }
            
            statusLabel.snp.makeConstraints { make in
                make.center.equalToSuperview()
                make.width.equalToSuperview()
            }

            let bottomLine = UIView()
            bottomLine.backgroundColor = .separator
            addSubview(bottomLine)
            bottomLine.snp.makeConstraints { make in
                make.leading.trailing.bottom.equalToSuperview()
                make.height.equalTo(1)
            }
            
            // Configure datesStack to fill height
            datesStack.alignment = .fill
            datesStack.distribution = .fillEqually
            
        case .order:
            bookDateLabel.text = "Pickup_Header".localized().uppercased()
            returnDateLabel.text = "Return_Header".localized().uppercased()
            
            // Create a stack for # and QTY
            let infoStack = UIStackView()
            infoStack.axis = .horizontal
            infoStack.spacing = 5
            infoStack.distribution = .fillEqually
            infoStack.addArrangedSubview(orderNumberLabel)
            infoStack.addArrangedSubview(quantityLabel)
            
            // Add dates to dates stack
            datesStack.addArrangedSubview(bookDateLabel)
            datesStack.addArrangedSubview(returnDateLabel)
            
            containerStackView.addArrangedSubview(datesStack)
            containerStackView.addArrangedSubview(infoStack)
            containerStackView.addArrangedSubview(statusContainer)
            
            // Setup constraints using SnapKit
            containerStackView.snp.makeConstraints { make in
                make.edges.equalToSuperview().inset(UIEdgeInsets(top: 0,
                                                                 left: isIPad ? 24 : 16,
                                                                 bottom: 0,
                                                                 right: isIPad ? 24 : 16))
            }
            
            statusContainer.snp.makeConstraints { make in
                make.width.equalTo(statusContainerWidth)
            }
            
            datesStack.snp.makeConstraints { make in
                make.width.equalTo(infoStack)
            }
            
            statusLabel.snp.makeConstraints { make in
                make.center.equalToSuperview()
                make.width.equalToSuperview()
            }
            
            // Configure datesStack to fill height
            datesStack.alignment = .fill
            datesStack.distribution = .fillEqually
        }
    }
    
    private func updateHeaderStyle() {
        guard let sortType = sortType else { return }
        
        let isIPad = traitCollection.horizontalSizeClass == .regular
        let regularFontSize: CGFloat = isIPad ? 14 : 11
        let boldFontSize: CGFloat = isIPad ? 15 : 12
        
        // Reset all to regular font
        bookDateLabel.font = Utils.regularFont(size: regularFontSize)
        pickupDateLabel.font = Utils.regularFont(size: regularFontSize)
        returnDateLabel.font = Utils.regularFont(size: regularFontSize)
        
        // Bold the active sort column
        switch sortType {
        case .book_date:
            bookDateLabel.font = Utils.boldFont(size: boldFontSize)
        case .get_date:
            pickupDateLabel.font = Utils.boldFont(size: boldFontSize)
        }
    }
} 
