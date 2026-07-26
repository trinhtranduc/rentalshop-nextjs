//
//  PreviewCardCells.swift
//  POS ADBD
//
//  Custom cells for PreviewViewController with Card Style (Option 1)
//

import UIKit
import SnapKit

// MARK: - Card Style Options
enum CardStyle {
    case flat          // No shadow, no border, just background
    case bordered      // No shadow, thin border
    case minimal       // Minimal shadow, smaller radius
    case modern        // Standard shadow, medium radius
    case clean         // No shadow, border only
    case elevated      // Larger shadow, more depth
    
    var cornerRadius: CGFloat {
        switch self {
        case .flat: return 0
        case .bordered: return 8
        case .minimal: return 8
        case .modern: return 12
        case .clean: return 12
        case .elevated: return 16
        }
    }
    
    var shadowOpacity: Float {
        switch self {
        case .flat, .bordered: return 0
        case .minimal: return 0.05
        case .modern: return 0.1
        case .clean: return 0
        case .elevated: return 0.15
        }
    }
    
    var shadowRadius: CGFloat {
        switch self {
        case .flat, .bordered, .clean: return 0
        case .minimal: return 2
        case .modern: return 4
        case .elevated: return 8
        }
    }
    
    var shadowOffset: CGSize {
        switch self {
        case .flat, .bordered, .clean: return CGSize(width: 0, height: 0)
        case .minimal: return CGSize(width: 0, height: 1)
        case .modern: return CGSize(width: 0, height: 2)
        case .elevated: return CGSize(width: 0, height: 4)
        }
    }
    
    var borderWidth: CGFloat {
        switch self {
        case .bordered: return 1
        case .clean: return 0.5
        default: return 0
        }
    }
    
    var borderColor: UIColor {
        return .separator
    }
    
    var verticalSpacing: CGFloat {
        switch self {
        case .flat, .bordered: return 0  // No spacing between cards
        case .minimal: return 4
        case .modern: return 8
        case .clean: return 8
        case .elevated: return 12
        }
    }
}

// MARK: - Section Enum
enum PreviewSection: Int, CaseIterable {
    case customerInfo = 0
    case dates
    case products
    case depositInfo  // Deposit & Document (chỉ cho rent orders)
    case notes
    case loyalty
    case summary
    
    var title: String {
        switch self {
        case .customerInfo: return "Information".localized()
        case .dates: return "Date Information".localized()
        case .products: return "Products".localized()
        case .depositInfo: return "Deposit & Collateral Details".localized()
        case .notes: return "Notes".localized()
        case .loyalty: return "Loyalty Points".localized()
        case .summary: return "Summary".localized()
        }
    }
}

// MARK: - Global Card Style Setting
// Change this to switch between styles: .flat, .bordered, .minimal, .modern, .clean, .elevated
// Modern style recommended for better visual appeal with subtle shadows and rounded corners
var globalCardStyle: CardStyle = .modern

// MARK: - Card Style Helper
extension UIView {
    func applyCardStyle(_ style: CardStyle? = nil) {
        let cardStyle = style ?? globalCardStyle
        layer.cornerRadius = cardStyle.cornerRadius
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOffset = cardStyle.shadowOffset
        layer.shadowOpacity = cardStyle.shadowOpacity
        layer.shadowRadius = cardStyle.shadowRadius
        
        if cardStyle.borderWidth > 0 {
            layer.borderWidth = cardStyle.borderWidth
            layer.borderColor = cardStyle.borderColor.cgColor
        } else {
            layer.borderWidth = 0
        }
    }
}

// MARK: - Merged Info Card Cell (Customer + Outlet + Dates)
class MergedInfoCardCell: UITableViewCell {
    private let cardView = UIView()
    
    // Customer section
    private let customerNameLabel = UILabel()
    private let customerPhoneLabel = UILabel()
    
    // Outlet section
    private let outletNameLabel = UILabel()
    private let outletAddressLabel = UILabel()
    private let outletPhoneLabel = UILabel()
    
    // Staff section
    private let staffNameLabel = UILabel()
    
    // Dates section
    private let dateStackView = UIStackView()
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupCardStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupCardStyle() {
        backgroundColor = .clear
        selectionStyle = .none
        
        // For insetGrouped style, no card styling needed
        cardView.backgroundColor = .clear
        
        contentView.addSubview(cardView)
        cardView.snp.makeConstraints { make in
            make.edges.equalToSuperview()  // Full content view for insetGrouped style
        }
        
        // Customer section
        let customerTitleLabel = UILabel()
        customerTitleLabel.text = "Customer Information".localized()
        customerTitleLabel.font = .titleSmall()
        customerTitleLabel.textColor = .textPrimary
        
        customerNameLabel.font = .bodyMedium()
        customerNameLabel.textColor = .textPrimary
        customerNameLabel.numberOfLines = 0
        
        customerPhoneLabel.font = .bodySmall()
        customerPhoneLabel.textColor = .textSecondary
        
        let customerStack = UIStackView(arrangedSubviews: [
            customerTitleLabel,
            customerNameLabel,
            customerPhoneLabel
        ])
        customerStack.axis = .vertical
        customerStack.spacing = 6
        customerStack.alignment = .leading
        
        // Outlet section
        let outletTitleLabel = UILabel()
        outletTitleLabel.text = "Outlet".localized()
        outletTitleLabel.font = .captionMedium()
        outletTitleLabel.textColor = .textTertiary
        
        outletNameLabel.font = .bodyMedium()
        outletNameLabel.textColor = .textPrimary
        
        outletAddressLabel.font = .bodySmall()
        outletAddressLabel.textColor = .textSecondary
        outletAddressLabel.numberOfLines = 0
        
        outletPhoneLabel.font = .bodySmall()
        outletPhoneLabel.textColor = .textSecondary
        
        let outletStack = UIStackView(arrangedSubviews: [
            outletTitleLabel,
            outletNameLabel,
            outletAddressLabel,
            outletPhoneLabel
        ])
        outletStack.axis = .vertical
        outletStack.spacing = 6
        outletStack.alignment = .leading
        
        // Staff section
        let staffTitleLabel = UILabel()
        staffTitleLabel.text = "Created By".localized()
        staffTitleLabel.font = .captionMedium()
        staffTitleLabel.textColor = .textTertiary
        
        staffNameLabel.font = .bodyMedium()
        staffNameLabel.textColor = .textPrimary
        
        let staffStack = UIStackView(arrangedSubviews: [
            staffTitleLabel,
            staffNameLabel
        ])
        staffStack.axis = .vertical
        staffStack.spacing = 6
        staffStack.alignment = .leading
        
        // Dates section
        dateStackView.axis = .horizontal
        dateStackView.distribution = .fillEqually
        dateStackView.spacing = 12
        
        // Main stack
        let mainStack = UIStackView(arrangedSubviews: [
            customerStack,
            outletStack,
            staffStack,
            dateStackView
        ])
        mainStack.axis = .vertical
        mainStack.spacing = 20
        mainStack.alignment = .leading
        
        cardView.addSubview(mainStack)
        mainStack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(20)
        }
    }
    
    func configure(
        customerName: String,
        customerPhone: String,
        outletName: String,
        outletAddress: String?,
        outletPhone: String?,
        staffName: String,
        dates: [(title: String, value: String)]
    ) {
        customerNameLabel.text = customerName
        customerPhoneLabel.text = customerPhone
        
        outletNameLabel.text = outletName
        outletAddressLabel.text = outletAddress
        outletAddressLabel.isHidden = outletAddress == nil || outletAddress?.isEmpty == true
        outletPhoneLabel.text = outletPhone
        outletPhoneLabel.isHidden = outletPhone == nil || outletPhone?.isEmpty == true
        
        staffNameLabel.text = staffName
        
        // Clear and add dates
        dateStackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
        dates.forEach { date in
            let dateView = createDateView(title: date.title, value: date.value)
            dateStackView.addArrangedSubview(dateView)
        }
    }
    
    private func createDateView(title: String, value: String) -> UIView {
        let container = UIView()
        let titleLabel = UILabel()
        let valueLabel = UILabel()
        
        titleLabel.text = title
        titleLabel.font = .captionMedium()
        titleLabel.textColor = .textTertiary
        titleLabel.textAlignment = .center
        
        valueLabel.text = value
        valueLabel.font = .bodyMedium()
        valueLabel.textColor = .textPrimary
        valueLabel.textAlignment = .center
        
        let stack = UIStackView(arrangedSubviews: [titleLabel, valueLabel])
        stack.axis = .vertical
        stack.spacing = 6
        
        container.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        return container
    }
}

// MARK: - Outlet & Staff Info Card Cell
class OutletInfoCardCell: UITableViewCell {
    private let cardView = UIView()
    private let outletNameLabel = UILabel()
    private let outletAddressLabel = UILabel()
    private let outletPhoneLabel = UILabel()
    private let staffNameLabel = UILabel()
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupCardStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupCardStyle() {
        backgroundColor = .clear
        selectionStyle = .none
        
        // For insetGrouped style, no card styling needed - UITableView handles it
        cardView.backgroundColor = .clear
        
        contentView.addSubview(cardView)
        cardView.snp.makeConstraints { make in
            make.edges.equalToSuperview()  // Full content view for insetGrouped style
        }
        
        // Outlet section
        let outletTitleLabel = UILabel()
        outletTitleLabel.text = "Outlet".localized()
        outletTitleLabel.font = .captionMedium()
        outletTitleLabel.textColor = .textTertiary
        
        outletNameLabel.font = .bodyMedium()
        outletNameLabel.textColor = .textPrimary
        
        outletAddressLabel.font = .bodySmall()
        outletAddressLabel.textColor = .textSecondary
        outletAddressLabel.numberOfLines = 0
        
        outletPhoneLabel.font = .bodySmall()
        outletPhoneLabel.textColor = .textSecondary
        
        // Staff section
        let staffTitleLabel = UILabel()
        staffTitleLabel.text = "Created By".localized()
        staffTitleLabel.font = .captionMedium()
        staffTitleLabel.textColor = .textTertiary
        
        staffNameLabel.font = .bodyMedium()
        staffNameLabel.textColor = .textPrimary
        
        // Outlet stack with better spacing
        let outletStack = UIStackView(arrangedSubviews: [
            outletTitleLabel,
            outletNameLabel,
            outletAddressLabel,
            outletPhoneLabel
        ])
        outletStack.axis = .vertical
        outletStack.spacing = 6  // Increased spacing for better readability
        outletStack.alignment = .leading
        
        // Staff stack with better spacing
        let staffStack = UIStackView(arrangedSubviews: [
            staffTitleLabel,
            staffNameLabel
        ])
        staffStack.axis = .vertical
        staffStack.spacing = 6  // Increased spacing
        staffStack.alignment = .leading
        
        // Main stack with better spacing
        let mainStack = UIStackView(arrangedSubviews: [outletStack, staffStack])
        mainStack.axis = .vertical
        mainStack.spacing = 20  // Increased spacing between sections
        mainStack.alignment = .leading
        
        cardView.addSubview(mainStack)
        mainStack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(20)  // Increased padding for modern look
        }
    }
    
    func configure(
        outletName: String,
        outletAddress: String? = nil,
        outletPhone: String? = nil,
        staffName: String
    ) {
        outletNameLabel.text = outletName
        outletAddressLabel.text = outletAddress
        outletAddressLabel.isHidden = outletAddress == nil || outletAddress?.isEmpty == true
        
        outletPhoneLabel.text = outletPhone
        outletPhoneLabel.isHidden = outletPhone == nil || outletPhone?.isEmpty == true
        
        staffNameLabel.text = staffName
    }
}

// MARK: - Date Info Card Cell
class DateInfoCardCell: UITableViewCell {
    private let cardView = UIView()
    private let dateStackView = UIStackView()
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupCardStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupCardStyle() {
        backgroundColor = .clear
        selectionStyle = .none
        
        // For insetGrouped style, no card styling needed - UITableView handles it
        cardView.backgroundColor = .clear
        
        contentView.addSubview(cardView)
        cardView.snp.makeConstraints { make in
            make.edges.equalToSuperview()  // Full content view for insetGrouped style
        }
        
        dateStackView.axis = .horizontal
        dateStackView.distribution = .fillEqually
        dateStackView.spacing = 12  // Increased spacing between date items
        
        cardView.addSubview(dateStackView)
        dateStackView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(20)  // Increased padding
        }
    }
    
    func configure(dates: [(title: String, value: String)]) {
        dateStackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
        
        dates.forEach { date in
            let dateView = createDateView(title: date.title, value: date.value)
            dateStackView.addArrangedSubview(dateView)
        }
    }
    
    private func createDateView(title: String, value: String) -> UIView {
        let container = UIView()
        let titleLabel = UILabel()
        let valueLabel = UILabel()
        
        titleLabel.text = title
        titleLabel.font = .captionMedium()
        titleLabel.textColor = .textTertiary
        titleLabel.textAlignment = .center
        
        valueLabel.text = value
        valueLabel.font = .bodyMedium()
        valueLabel.textColor = .textPrimary
        valueLabel.textAlignment = .center
        
        let stack = UIStackView(arrangedSubviews: [titleLabel, valueLabel])
        stack.axis = .vertical
        stack.spacing = 6  // Increased spacing for better readability
        
        container.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        return container
    }
}

// MARK: - Summary Card Cell (Single Card for All Summary Items)
class SummaryCardCell: UITableViewCell {
    private let cardView = UIView()
    private let summaryStackView = UIStackView()
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupCardStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupCardStyle() {
        backgroundColor = .clear
        selectionStyle = .none
        
        // For insetGrouped style, no card styling needed - UITableView handles it
        cardView.backgroundColor = .clear
        
        contentView.addSubview(cardView)
        cardView.snp.makeConstraints { make in
            make.edges.equalToSuperview()  // Full content view for insetGrouped style
        }
        
        summaryStackView.axis = .vertical
        summaryStackView.spacing = 16  // Increased spacing for better readability
        summaryStackView.alignment = .fill
        
        cardView.addSubview(summaryStackView)
        summaryStackView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(20)  // Increased padding for modern look
        }
    }
    
    func configure(
        subtotal: String,
        discount: String,
        grandTotal: String,
        downPayment: String?,
        toCollect: String
    ) {
        // Clear existing views
        summaryStackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
        
        // Subtotal
        let subtotalRow = createSummaryRow(title: "Subtotal".localized(), value: subtotal, isHighlighted: false)
        summaryStackView.addArrangedSubview(subtotalRow)
        
        // Discount
        let discountRow = createSummaryRow(title: "Discount".localized(), value: discount, isHighlighted: false)
        summaryStackView.addArrangedSubview(discountRow)
        
        // Separator
        let separator = createSeparator()
        summaryStackView.addArrangedSubview(separator)
        
        // Grand Total
        let grandTotalRow = createSummaryRow(title: "Grand Total".localized(), value: grandTotal, isHighlighted: false)
        summaryStackView.addArrangedSubview(grandTotalRow)
        
        // Deposit (if exists)
        if let downPayment = downPayment {
            let downPaymentRow = createSummaryRow(title: "Deposit".localized(), value: downPayment, isHighlighted: false)
            summaryStackView.addArrangedSubview(downPaymentRow)
        }
        
        // To Collect (Highlighted)
        let toCollectRow = createSummaryRow(title: "To Collect".localized(), value: toCollect, isHighlighted: true)
        summaryStackView.addArrangedSubview(toCollectRow)
    }
    
    private func createSummaryRow(title: String, value: String, isHighlighted: Bool) -> UIView {
        let container = UIView()
        let titleLabel = UILabel()
        let valueLabel = UILabel()
        
        // Better typography hierarchy
        titleLabel.text = title
        titleLabel.font = isHighlighted ? .bodyBold() : .bodyMedium()
        titleLabel.textColor = isHighlighted ? .textPrimary : .textSecondary
        
        valueLabel.text = value
        valueLabel.font = isHighlighted ? .titleLarge() : .titleMedium()  // Larger font for highlighted
        valueLabel.textColor = isHighlighted ? .actionSuccess : .textPrimary  // Green for to collect
        valueLabel.textAlignment = .right
        valueLabel.numberOfLines = 1
        valueLabel.adjustsFontSizeToFitWidth = true
        valueLabel.minimumScaleFactor = 0.8
        
        let stackView = UIStackView(arrangedSubviews: [titleLabel, valueLabel])
        stackView.axis = .horizontal
        stackView.distribution = .fill
        stackView.spacing = 12  // Increased spacing
        
        container.addSubview(stackView)
        stackView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.height.greaterThanOrEqualTo(24)  // Minimum height for better touch target
        }
        
        titleLabel.setContentHuggingPriority(.required, for: .horizontal)
        valueLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        
        return container
    }
    
    private func createSeparator() -> UIView {
        let separator = UIView()
        separator.backgroundColor = .separator
        separator.snp.makeConstraints { make in
            make.height.equalTo(0.5)  // Thinner separator for modern look
        }
        return separator
    }
}

// MARK: - Document & Deposit Card Cell
class DocumentDepositCardCell: UITableViewCell {
    private let cardView = UIView()
    var materialTextField: UITextField!
    var bailButton: UIButton!
    var extraChargeButton: UIButton!
    
    var onMaterialChanged: ((String) -> Void)?
    var onBailTapped: (() -> Void)?
    var onExtraChargeTapped: (() -> Void)?
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupCardStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupCardStyle() {
        backgroundColor = .clear
        selectionStyle = .none
        
        // For insetGrouped style, no card styling needed - UITableView handles it
        cardView.backgroundColor = .clear
        
        contentView.addSubview(cardView)
        cardView.snp.makeConstraints { make in
            make.edges.equalToSuperview()  // Full content view for insetGrouped style
        }
        
        // Material field
        let materialTitleLabel = UILabel()
        materialTitleLabel.text = "Document".localized()
        materialTitleLabel.font = .captionMedium()
        materialTitleLabel.textColor = .textTertiary
        
        materialTextField = UITextField()
        materialTextField.font = .bodyMedium()
        materialTextField.placeholder = "Enter ID card, driver's license...".localized()
        materialTextField.borderStyle = .roundedRect
        materialTextField.returnKeyType = .done
        materialTextField.clearButtonMode = .whileEditing
        materialTextField.addTarget(self, action: #selector(materialChanged), for: .editingChanged)
        
        // Bail button
        let bailTitleLabel = UILabel()
        bailTitleLabel.text = "Security Deposit".localized()
        bailTitleLabel.font = .captionMedium()
        bailTitleLabel.textColor = .textTertiary
        
        bailButton = UIButton(type: .system)
        bailButton.titleLabel?.font = .bodyMedium()
        bailButton.setTitleColor(.actionPrimary, for: .normal)
        bailButton.contentHorizontalAlignment = .center
        bailButton.layer.borderWidth = 1
        bailButton.layer.borderColor = UIColor.borderColor.cgColor
        bailButton.layer.cornerRadius = 4
        bailButton.addTarget(self, action: #selector(bailTapped), for: .touchUpInside)
        
        // Extra charge button
        let extraChargeTitleLabel = UILabel()
        extraChargeTitleLabel.text = "Damage Fee".localized()
        extraChargeTitleLabel.font = .captionMedium()
        extraChargeTitleLabel.textColor = .textTertiary
        
        extraChargeButton = UIButton(type: .system)
        extraChargeButton.titleLabel?.font = .bodyMedium()
        extraChargeButton.setTitleColor(.actionPrimary, for: .normal)
        extraChargeButton.contentHorizontalAlignment = .center
        extraChargeButton.layer.borderWidth = 1
        extraChargeButton.layer.borderColor = UIColor.borderColor.cgColor
        extraChargeButton.layer.cornerRadius = 4
        extraChargeButton.addTarget(self, action: #selector(extraChargeTapped), for: .touchUpInside)
        
        // Layout
        let isIPad = traitCollection.horizontalSizeClass == .regular
        
        if isIPad {
            // iPad: Horizontal layout
            let materialStack = UIStackView(arrangedSubviews: [materialTitleLabel, materialTextField])
            materialStack.axis = .vertical
            materialStack.spacing = 10  // Better spacing
            
            let bailStack = UIStackView(arrangedSubviews: [bailTitleLabel, bailButton])
            bailStack.axis = .vertical
            bailStack.spacing = 10  // Better spacing
            
            let extraChargeStack = UIStackView(arrangedSubviews: [extraChargeTitleLabel, extraChargeButton])
            extraChargeStack.axis = .vertical
            extraChargeStack.spacing = 10  // Better spacing
            
            let mainStack = UIStackView(arrangedSubviews: [materialStack, bailStack, extraChargeStack])
            mainStack.axis = .horizontal
            mainStack.distribution = .fillEqually
            mainStack.spacing = 20  // Increased spacing for modern look
            
            cardView.addSubview(mainStack)
            mainStack.snp.makeConstraints { make in
                make.edges.equalToSuperview().inset(20)  // Increased padding
            }
            
            materialTextField.snp.makeConstraints { make in
                make.height.equalTo(36)
            }
            
            [bailButton, extraChargeButton].forEach { button in
                button.snp.makeConstraints { make in
                    make.height.equalTo(36)
                }
            }
        } else {
            // iPhone: Vertical layout
            let materialStack = UIStackView(arrangedSubviews: [materialTitleLabel, materialTextField])
            materialStack.axis = .vertical
            materialStack.spacing = 10  // Better spacing
            
            let bailStack = UIStackView(arrangedSubviews: [bailTitleLabel, bailButton])
            bailStack.axis = .vertical
            bailStack.spacing = 8
            
            let extraChargeStack = UIStackView(arrangedSubviews: [extraChargeTitleLabel, extraChargeButton])
            extraChargeStack.axis = .vertical
            extraChargeStack.spacing = 8
            
            let mainStack = UIStackView(arrangedSubviews: [materialStack, bailStack, extraChargeStack])
            mainStack.axis = .vertical
            mainStack.spacing = 20  // Increased spacing for modern look
            mainStack.alignment = .fill
            
            cardView.addSubview(mainStack)
            mainStack.snp.makeConstraints { make in
                make.edges.equalToSuperview().inset(20)  // Increased padding
            }
            
            materialTextField.snp.makeConstraints { make in
                make.height.equalTo(36)
            }
            
            [bailButton, extraChargeButton].forEach { button in
                button.snp.makeConstraints { make in
                    make.height.equalTo(36)
                }
            }
        }
    }
    
    @objc private func materialChanged() {
        onMaterialChanged?(materialTextField.text ?? "")
    }
    
    @objc private func bailTapped() {
        onBailTapped?()
    }
    
    @objc private func extraChargeTapped() {
        onExtraChargeTapped?()
    }
    
    func configure(
        material: String,
        bailAmount: String,
        damageFee: String,
        isMaterialEnabled: Bool,
        isBailEnabled: Bool,
        isExtraChargeEnabled: Bool
    ) {
        materialTextField.text = material
        materialTextField.isEnabled = isMaterialEnabled
        
        bailButton.setTitle(bailAmount, for: .normal)
        bailButton.isEnabled = isBailEnabled
        
        extraChargeButton.setTitle(damageFee, for: .normal)
        extraChargeButton.isEnabled = isExtraChargeEnabled
    }
}

// MARK: - Note Card Cell
class NoteCardCell: UITableViewCell {
    private let cardView = UIView()
    private let noteTextView: PlaceholderTextView
    
    var onNoteTapped: (() -> Void)?
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        noteTextView = PlaceholderTextView()
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupCardStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupCardStyle() {
        backgroundColor = .clear
        selectionStyle = .none
        
        // For insetGrouped style, no card styling needed - UITableView handles it
        cardView.backgroundColor = .clear
        
        contentView.addSubview(cardView)
        cardView.snp.makeConstraints { make in
            make.edges.equalToSuperview()  // Full content view for insetGrouped style
        }
        
//        noteTextView.font = .bodySmall()
//        noteTextView.textColor = .textPrimary
//        noteTextView.backgroundColor = .backgroundSecondary
        noteTextView.isScrollEnabled = false
        noteTextView.isEditable = false
        noteTextView.isUserInteractionEnabled = true
        noteTextView.textContainerInset = UIEdgeInsets(top: 8, left: 8, bottom: 8, right: 8)
        noteTextView.placeholder = "Add notes here...".localized()
        noteTextView.layer.cornerRadius = 8
        noteTextView.layer.borderWidth = 0.5
        noteTextView.layer.borderColor = UIColor.borderColor.cgColor
        
        let tap = UITapGestureRecognizer(target: self, action: #selector(noteTapped))
        noteTextView.addGestureRecognizer(tap)
        
        cardView.addSubview(noteTextView)
        noteTextView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(20)  // Increased padding
            make.height.greaterThanOrEqualTo(80)
        }
    }
    
    @objc private func noteTapped() {
        onNoteTapped?()
    }
    
    func configure(note: String) {
        noteTextView.text = note
    }
}

// MARK: - PlaceholderTextView
// Custom UITextView with placeholder support
class PlaceholderTextView: UITextView {
    // Placeholder label
    private let placeholderLabel = UILabel()
    
    // Placeholder text
    var placeholder: String = "" {
        didSet {
            placeholderLabel.text = placeholder
            updatePlaceholderVisibility()
        }
    }
    
    override var text: String! {
        didSet {
            updatePlaceholderVisibility()
        }
    }
    
    override init(frame: CGRect, textContainer: NSTextContainer?) {
        super.init(frame: frame, textContainer: textContainer)
        setupPlaceholder()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupPlaceholder()
    }
    
    private func setupPlaceholder() {
        // Configure placeholder label
        placeholderLabel.textColor = .textTertiary
        placeholderLabel.font = .bodySmall()
        placeholderLabel.numberOfLines = 0
        placeholderLabel.translatesAutoresizingMaskIntoConstraints = false
        addSubview(placeholderLabel)
        
        // Add constraints
        NSLayoutConstraint.activate([
            placeholderLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 5),
            placeholderLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -5),
            placeholderLabel.topAnchor.constraint(equalTo: topAnchor, constant: 8),
            placeholderLabel.bottomAnchor.constraint(lessThanOrEqualTo: bottomAnchor, constant: -8)
        ])
        
        // Add notification for text changes
        NotificationCenter.default.addObserver(self, selector: #selector(textDidChange), name: NSNotification.Name.UITextViewTextDidChange, object: self)
    }
    
    @objc private func textDidChange() {
        updatePlaceholderVisibility()
    }
    
    private func updatePlaceholderVisibility() {
        placeholderLabel.isHidden = !text.isEmpty
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}

// MARK: - Preview Section Header View
class PreviewSectionHeaderView: UITableViewHeaderFooterView {
    private let iconImageView = UIImageView()
    private let titleLabel = UILabel()
    
    override init(reuseIdentifier: String?) {
        super.init(reuseIdentifier: reuseIdentifier)
        setupStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupStyle() {
        contentView.backgroundColor = .clear
        
        let stackView = UIStackView(arrangedSubviews: [iconImageView, titleLabel])
        stackView.axis = .horizontal
        stackView.spacing = 10  // Increased spacing
        stackView.alignment = .center  // Center align for better visual balance
        
        contentView.addSubview(stackView)
        stackView.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(20)  // Increased leading
            make.trailing.equalToSuperview().offset(-20)
            make.top.equalToSuperview().offset(12)  // More top padding
            make.bottom.equalToSuperview().offset(-8)  // More bottom padding
        }
        
        iconImageView.contentMode = .scaleAspectFit
        iconImageView.tintColor = .actionPrimary  // Use primary color for icons
        iconImageView.snp.makeConstraints { make in
            make.width.height.equalTo(20)  // Slightly larger icons
        }
        
        // Better typography for section headers
        titleLabel.font = .titleMedium()  // Larger font
        titleLabel.textColor = .textPrimary  // Primary color for better visibility
        titleLabel.textAlignment = .left
    }
    
    func configure(title: String, icon: String) {
        titleLabel.text = title
        iconImageView.image = UIImage(systemName: icon)
    }
}

