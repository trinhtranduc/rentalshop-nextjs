//
//  ProductSelectedCell.swift
//  POS ADBD
//
//  Created by Trinh Tran on 11/25/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import SnapKit
import Kingfisher

protocol ProductSelectedCellDelegate: AnyObject {
    func didEndEditing(value: Double, isQuantity: Bool, at index: Int)
    func didUpdateNote(_ note: String?, at index: Int)
    func didTapDelete(at index: Int)
    func didTapStatus(at index: Int)
    func didUpdateRentalDays(_ days: Int, at index: Int)
    func didSelectPricingOption(optionId: Int, at index: Int)
}

// Default implementation so existing conformers don't break
extension ProductSelectedCellDelegate {
    func didUpdateRentalDays(_ days: Int, at index: Int) {}
    func didSelectPricingOption(optionId: Int, at index: Int) {}
}

/// Layout style for cart item cell
enum CartItemLayoutStyle: String, CaseIterable {
    case `default` = "default"
    case compact = "compact"
}

class ProductSelectedCell: UITableViewCell {
    // MARK: - Properties
    weak var delegate: ProductSelectedCellDelegate?
    private var cartItem: CartItem?
    private var itemIndex: Int?
    private var currentLayout: CartItemLayoutStyle = .default

    private var quantity: Int = 0 {
        didSet {
            quantityLabel.text = quantity.formatStringInCommon()
            compactQuantityLabel.text = quantity.formatStringInCommon()
            updateSubtotal()
        }
    }

    private var price: Double = 0 {
        didSet {
            priceButton.setTitleWithOutAnimation(title: price.formatStringInCommon())
            compactPriceButton.setTitleWithOutAnimation(title: price.formatStringInCommon())
            updateSubtotal()
        }
    }
    
    // Add new enum for booking status
    enum BookingStatus {
        case available
        case warning
        case loading // New state for when cache is being loaded
        
        var color: UIColor {
            switch self {
            case .available: return .systemGreen
            case .warning: return .systemOrange
            case .loading: return .systemGray
            }
        }
        
        var text: String {
            switch self {
            case .available: return "Available".localized()
            case .warning: return "Low Stock".localized()
            case .loading: return "Checking...".localized()
            }
        }
    }
    
    // MARK: - UI Components
    private lazy var containerStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [
            topStackView,
            controlsStackView,
            pricingOptionContainer,
            rentalDaysContainer,
            noteTextField
        ])
        stack.axis = .vertical
        stack.spacing = 16
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()
    
    private lazy var topStackView: UIStackView = {
        // Container for product name and status
        let container = UIView()
        
        // Add subviews
        container.addSubview(productNameLabel)
        container.addSubview(statusView)
        
        // Setup constraints using SnapKit
        productNameLabel.snp.makeConstraints { make in
            make.top.leading.bottom.equalToSuperview()
            make.trailing.lessThanOrEqualTo(statusView.snp.leading).offset(-8)
        }
        
        statusView.snp.makeConstraints { make in
            make.centerY.equalTo(container.snp.top).offset(10)
            make.trailing.equalToSuperview()
        }
        
        // Create stack view with container
        let stack = UIStackView(arrangedSubviews: [container])
        stack.axis = .vertical
        stack.spacing = 4
        stack.alignment = .fill
        return stack
    }()
    
    private lazy var controlsStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [
            quantityControlView,
            priceButton,
            equalLabel,
            subtotalLabel
        ])
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .center
        stack.distribution = .fill
        
        quantityControlView.setContentHuggingPriority(.required, for: .horizontal)
        priceButton.setContentHuggingPriority(.required, for: .horizontal)
        equalLabel.setContentHuggingPriority(.required, for: .horizontal)
        subtotalLabel.setContentHuggingPriority(.required, for: .horizontal)
        
        return stack
    }()
    
    private lazy var productNameLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 17)
        label.textColor = .black
        label.numberOfLines = 0
        label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        return label
    }()
    
    private lazy var productImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.layer.cornerRadius = 8
        imageView.backgroundColor = UIColor.systemGray6
        imageView.translatesAutoresizingMaskIntoConstraints = false
        return imageView
    }()
    
    private lazy var multiplyLabel: UILabel = {
        let label = UILabel()
        label.text = "×"
        label.font = Utils.boldFont(size: 15)
        label.textColor = .gray
        label.textAlignment = .center
        label.setContentHuggingPriority(.required, for: .horizontal)
        return label
    }()
    
    private lazy var equalLabel: UILabel = {
        let label = UILabel()
        label.text = "="
        label.font = Utils.boldFont(size: 15)
        label.textColor = .gray
        label.textAlignment = .center
        label.setContentHuggingPriority(.required, for: .horizontal)
        return label
    }()
    
    private lazy var subtotalLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 16)
        label.textColor = .black
        label.textAlignment = .right
        label.setContentHuggingPriority(.required, for: .horizontal)
        label.setContentCompressionResistancePriority(.required, for: .horizontal)
        
        // Use SnapKit for constraints
        label.snp.makeConstraints { make in
            make.width.equalTo(100)
        }
        
        return label
    }()
    
    private lazy var quantityControlView: UIView = {
        let view = UIView()
        
        let decreaseButton = createQuantityButton(title: "-", action: #selector(decreaseTapped))
        let increaseButton = createQuantityButton(title: "+", action: #selector(increaseTapped))
        
        quantityLabel.text = "0"
        
        view.addSubview(decreaseButton)
        view.addSubview(quantityLabel)
        view.addSubview(increaseButton)
        
        // Use SnapKit for cleaner constraints with adjusted sizes
        decreaseButton.snp.makeConstraints { make in
            make.leading.equalToSuperview()
            make.centerY.equalToSuperview()
            make.width.height.equalTo(32) // Square buttons for better appearance
        }
        
        quantityLabel.snp.makeConstraints { make in
            make.center.equalToSuperview()
            make.width.equalTo(40)
        }
        
        increaseButton.snp.makeConstraints { make in
            make.trailing.equalToSuperview()
            make.centerY.equalToSuperview()
            make.width.height.equalTo(32) // Square buttons for better appearance
        }
        
        view.snp.makeConstraints { make in
            make.width.equalTo(120)
            make.height.equalTo(44)
        }
        
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(quantityTapped))
        view.addGestureRecognizer(tapGesture)
        return view
    }()
    
    private lazy var quantityLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 16)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private lazy var priceButton: UIButton = {
        let button = UIButton(type: .system)
        var configuration = UIButton.Configuration.plain()
        configuration.contentInsets = NSDirectionalEdgeInsets(top: 0, leading: 12, bottom: 0, trailing: 12)
        configuration.baseForegroundColor = .systemBlue
        button.configuration = configuration
        button.titleLabel?.font = Utils.mediumFont(size: 16)
        button.addTarget(self, action: #selector(priceTapped), for: .touchUpInside)
        
        // Match the style of the quantity buttons
//        button.backgroundColor = UIColor.systemGray6.withAlphaComponent(0.5)
//        button.layer.cornerRadius = 8
        
        // Use SnapKit for constraints
        button.snp.makeConstraints { make in
            make.width.equalTo(120)
            make.height.equalTo(44)
        }
        
        return button
    }()
    
    // Update status view
    private lazy var statusView: UIButton = {
        let button = UIButton(type: .system)
        
        // Configure button appearance using UIButtonConfiguration (iOS 15+)
        var config = UIButton.Configuration.plain()
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = Utils.regularFont(size: 11)
            return outgoing
        }
        config.contentInsets = NSDirectionalEdgeInsets(top: 3, leading: 8, bottom: 3, trailing: 8)
        config.imagePadding = 3
        config.imagePlacement = .leading
        
        // Add dot image
        let dotConfig = UIImage.SymbolConfiguration(pointSize: 7)
        let dotImage = UIImage(systemName: "circle.fill", withConfiguration: dotConfig)?
            .withRenderingMode(.alwaysTemplate)
        config.image = dotImage
        
        button.configuration = config
        button.layer.cornerRadius = 10
        button.clipsToBounds = true
        
        // Use SnapKit for constraints
        button.snp.makeConstraints { make in
            make.height.equalTo(22)
        }
        
        button.addTarget(self, action: #selector(statusTapped), for: .touchUpInside)
        return button
    }()
    
    // Keep track of current status
    private var currentStatus: BookingStatus = .available
    
    // Add back noteTextField
    private lazy var noteTextField: RCTextFieldPadding = {
        let field = RCTextFieldPadding()
        field.placeholder = "Note".localized()
        field.font = Utils.regularFont(size: 15)
        field.delegate = self
        field.backgroundColor = .backgroundTertiary
        field.layer.cornerRadius = 8
        field.layer.borderWidth = 0
        field.returnKeyType = .done
        field.clearButtonMode = .whileEditing
        
        // Use SnapKit for constraints
        field.snp.makeConstraints { make in
            make.height.equalTo(44)
        }
        
        return field
    }()

    // MARK: - Rental Duration UI (for DAILY pricing items)
    private lazy var rentalDaysContainer: UIView = {
        let view = UIView()
        view.isHidden = true // Hidden by default, shown only for DAILY items
        return view
    }()

    private lazy var rentalDaysLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 14)
        label.textColor = .secondaryLabel
        label.text = "Số ngày thuê:"
        return label
    }()

    private lazy var rentalDaysValueLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 15)
        label.textAlignment = .center
        label.textColor = .systemBlue
        label.text = "1"
        return label
    }()

    private lazy var rentalDaysSuffixLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 14)
        label.textColor = .secondaryLabel
        label.text = "ngày"
        return label
    }()

    private lazy var decreaseDaysButton: UIButton = createQuantityButton(title: "-", action: #selector(decreaseDaysTapped))
    private lazy var increaseDaysButton: UIButton = createQuantityButton(title: "+", action: #selector(increaseDaysTapped))

    // Compact layout rental days
    private lazy var compactRentalDaysContainer: UIView = {
        let view = UIView()
        view.isHidden = true
        return view
    }()

    private lazy var compactRentalDaysLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 12)
        label.textColor = .secondaryLabel
        label.text = "Số ngày:"
        return label
    }()

    private lazy var compactRentalDaysValueLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 13)
        label.textAlignment = .center
        label.textColor = .systemBlue
        label.text = "1"
        return label
    }()

    private lazy var compactRentalDaysSuffixLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 12)
        label.textColor = .secondaryLabel
        label.text = "ngày"
        return label
    }()

    private lazy var compactDecreaseDaysButton: UIButton = {
        let b = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 12, weight: .semibold)
        b.setImage(UIImage(systemName: "minus", withConfiguration: config), for: .normal)
        b.tintColor = APP_TEXT_COLOR
        b.addTarget(self, action: #selector(decreaseDaysTapped), for: .touchUpInside)
        return b
    }()

    private lazy var compactIncreaseDaysButton: UIButton = {
        let b = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 12, weight: .semibold)
        b.setImage(UIImage(systemName: "plus", withConfiguration: config), for: .normal)
        b.tintColor = APP_TEXT_COLOR
        b.addTarget(self, action: #selector(increaseDaysTapped), for: .touchUpInside)
        return b
    }()

    private var rentalDays: Int = 1 {
        didSet {
            rentalDaysValueLabel.text = "\(rentalDays)"
            compactRentalDaysValueLabel.text = "\(rentalDays)"
            updateSubtotal()
        }
    }

    // MARK: - Pricing Option selector (multi-option items)
    private var currentOptions: [PricingOption] = []

    private lazy var pricingOptionContainer: UIView = {
        let view = UIView()
        view.isHidden = true
        return view
    }()

    private lazy var pricingOptionLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 14)
        label.textColor = .secondaryLabel
        label.text = "Loại giá:"
        return label
    }()

    private lazy var pricingOptionSegment: UISegmentedControl = {
        let seg = UISegmentedControl()
        seg.addTarget(self, action: #selector(pricingOptionChanged), for: .valueChanged)
        return seg
    }()

    // MARK: - Compact layout
    private lazy var compactContainerView: UIView = {
        let v = UIView()
        v.isHidden = true
        return v
    }()

    private lazy var compactImageView: UIImageView = {
        let iv = UIImageView()
        iv.contentMode = .scaleAspectFill
        iv.clipsToBounds = true
        iv.layer.cornerRadius = 8
        iv.backgroundColor = .systemGray6
        return iv
    }()

    private lazy var compactNameLabel: UILabel = {
        let l = UILabel()
        l.font = Utils.mediumFont(size: 15)
        l.textColor = .label
        l.numberOfLines = 2
        return l
    }()

    private lazy var compactStatusButton: UIButton = {
        let b = UIButton(type: .system)
        var config = UIButton.Configuration.plain()
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { inc in
            var out = inc
            out.font = Utils.regularFont(size: 10)
            return out
        }
        config.contentInsets = NSDirectionalEdgeInsets(top: 2, leading: 6, bottom: 2, trailing: 6)
        config.imagePadding = 2
        config.imagePlacement = .leading
        let dotConfig = UIImage.SymbolConfiguration(pointSize: 5)
        config.image = UIImage(systemName: "circle.fill", withConfiguration: dotConfig)?.withRenderingMode(.alwaysTemplate)
        b.configuration = config
        b.layer.cornerRadius = 8
        b.clipsToBounds = true
        b.addTarget(self, action: #selector(statusTapped), for: .touchUpInside)
        return b
    }()

    private lazy var compactQuantityLabel: UILabel = {
        let l = UILabel()
        l.font = Utils.mediumFont(size: 14)
        l.textAlignment = .center
        l.textColor = .label
        return l
    }()

    private lazy var compactDecreaseButton: UIButton = {
        let b = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 14, weight: .semibold)
        b.setImage(UIImage(systemName: "minus", withConfiguration: config), for: .normal)
        b.tintColor = APP_TEXT_COLOR
        b.addTarget(self, action: #selector(decreaseTapped), for: .touchUpInside)
        return b
    }()

    private lazy var compactIncreaseButton: UIButton = {
        let b = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 14, weight: .semibold)
        b.setImage(UIImage(systemName: "plus", withConfiguration: config), for: .normal)
        b.tintColor = APP_TEXT_COLOR
        b.addTarget(self, action: #selector(increaseTapped), for: .touchUpInside)
        return b
    }()

    private lazy var compactPriceButton: UIButton = {
        let b = UIButton(type: .system)
        var config = UIButton.Configuration.plain()
        config.contentInsets = NSDirectionalEdgeInsets(top: 4, leading: 8, bottom: 4, trailing: 8)
        config.baseForegroundColor = .systemBlue
        b.configuration = config
        b.titleLabel?.font = Utils.mediumFont(size: 14)
        b.addTarget(self, action: #selector(priceTapped), for: .touchUpInside)
        return b
    }()

    private lazy var compactSubtotalLabel: UILabel = {
        let l = UILabel()
        l.font = Utils.boldFont(size: 14)
        l.textColor = .label
        l.textAlignment = .right
        return l
    }()

    private lazy var compactNoteField: RCTextFieldPadding = {
        let f = RCTextFieldPadding()
        f.placeholder = "Note".localized()
        f.font = Utils.regularFont(size: 13)
        f.delegate = self
        f.backgroundColor = .backgroundTertiary
        f.layer.cornerRadius = 8
        f.returnKeyType = .done
        f.layer.borderWidth = 0
        f.clearButtonMode = .whileEditing
        return f
    }()

    // MARK: - Initialization
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func prepareForReuse() {
        super.prepareForReuse()
        cartItem = nil
        itemIndex = nil
        quantity = 0
        price = 0
        rentalDays = 1
        rentalDaysContainer.isHidden = true
        compactRentalDaysContainer.isHidden = true
        pricingOptionContainer.isHidden = true
        currentOptions = []
        noteTextField.text = nil
        compactNoteField.text = nil
        currentStatus = .available
        setStatus(.available)
    }
    
    // MARK: - Setup
    private func setupUI() {
        contentView.backgroundColor = .white
        contentView.layer.cornerRadius = 12
        contentView.layer.shadowColor = UIColor.black.cgColor
        contentView.layer.shadowOffset = CGSize(width: 0, height: 2)
        contentView.layer.shadowRadius = 4
        contentView.layer.shadowOpacity = 0.08

        let backgroundView = UIView()
        backgroundView.backgroundColor = .white
        backgroundView.layer.cornerRadius = 12
        self.backgroundView = backgroundView

        let selectedBackgroundView = UIView()
        selectedBackgroundView.backgroundColor = UIColor.systemGray6.withAlphaComponent(0.3)
        selectedBackgroundView.layer.cornerRadius = 12
        self.selectedBackgroundView = selectedBackgroundView

        contentView.layoutMargins = UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16)

        contentView.addSubview(containerStackView)
        containerStackView.snp.makeConstraints { make in
            make.edges.equalTo(contentView.layoutMarginsGuide)
        }

        // Setup rental days container (default layout)
        setupRentalDaysView()

        // Setup pricing option selector (default layout)
        setupPricingOptionView()

        // Compact layout: [Image] [Col: name+status, qty row, price=subtotal, note]
        contentView.addSubview(compactContainerView)
        compactContainerView.snp.makeConstraints { make in
            make.edges.equalTo(contentView.layoutMarginsGuide)
        }

        let compactTopRow = UIStackView(arrangedSubviews: [compactNameLabel, compactStatusButton])
        compactTopRow.axis = .horizontal
        compactTopRow.spacing = 8
        compactTopRow.alignment = .center
        compactStatusButton.setContentHuggingPriority(.required, for: .horizontal)

        let compactQtyStack = UIStackView(arrangedSubviews: [compactDecreaseButton, compactQuantityLabel, compactIncreaseButton])
        compactQtyStack.axis = .horizontal
        compactQtyStack.spacing = 4
        compactQtyStack.alignment = .center
        compactDecreaseButton.snp.makeConstraints { make in make.width.height.equalTo(28) }
        compactIncreaseButton.snp.makeConstraints { make in make.width.height.equalTo(28) }
        compactQuantityLabel.snp.makeConstraints { make in make.width.equalTo(36) }

        let eqLabel = UILabel()
        eqLabel.text = "="
        eqLabel.font = Utils.boldFont(size: 12)
        eqLabel.textColor = .gray
        let compactPriceRow = UIStackView(arrangedSubviews: [compactQtyStack, compactPriceButton, eqLabel, compactSubtotalLabel])
        compactPriceRow.axis = .horizontal
        compactPriceRow.spacing = 6
        compactPriceRow.alignment = .center
        compactSubtotalLabel.setContentHuggingPriority(.required, for: .horizontal)

        let compactCol = UIStackView(arrangedSubviews: [compactTopRow, compactPriceRow, compactRentalDaysContainer, compactNoteField])
        compactCol.axis = .vertical
        compactCol.spacing = 8
        compactCol.alignment = .fill

        // Setup compact rental days container
        setupCompactRentalDaysView()

        compactContainerView.addSubview(compactImageView)
        compactContainerView.addSubview(compactCol)

        compactImageView.snp.makeConstraints { make in
            make.leading.top.equalToSuperview()
            make.width.height.equalTo(52)
        }
        compactCol.snp.makeConstraints { make in
            make.leading.equalTo(compactImageView.snp.trailing).offset(12)
            make.trailing.top.bottom.equalToSuperview()
        }
        compactNoteField.snp.makeConstraints { make in make.height.equalTo(36) }
    }

    private func applyLayout(_ style: CartItemLayoutStyle) {
        currentLayout = style
        let isCompact = (style == .compact)
        containerStackView.isHidden = isCompact
        compactContainerView.isHidden = !isCompact
    }

    // MARK: - Rental Days View Setup
    private func setupPricingOptionView() {
        pricingOptionLabel.setContentHuggingPriority(.required, for: .horizontal)
        let stack = UIStackView(arrangedSubviews: [pricingOptionLabel, pricingOptionSegment])
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .center
        pricingOptionContainer.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        pricingOptionContainer.snp.makeConstraints { make in
            make.height.greaterThanOrEqualTo(32)
        }
    }

    private func setupRentalDaysView() {
        decreaseDaysButton.snp.makeConstraints { make in make.width.height.equalTo(28) }
        increaseDaysButton.snp.makeConstraints { make in make.width.height.equalTo(28) }
        rentalDaysValueLabel.snp.makeConstraints { make in make.width.greaterThanOrEqualTo(24) }

        let daysDisplayStack = UIStackView(arrangedSubviews: [
            decreaseDaysButton,
            rentalDaysValueLabel,
            increaseDaysButton,
            rentalDaysSuffixLabel
        ])
        daysDisplayStack.axis = .horizontal
        daysDisplayStack.spacing = 4
        daysDisplayStack.alignment = .center

        let rentalDaysSpacer = UIView()
        rentalDaysSpacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
        let rentalDaysStack = UIStackView(arrangedSubviews: [rentalDaysLabel, rentalDaysSpacer, daysDisplayStack])
        rentalDaysStack.axis = .horizontal
        rentalDaysStack.spacing = 8
        rentalDaysStack.alignment = .center

        rentalDaysContainer.addSubview(rentalDaysStack)
        rentalDaysStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        rentalDaysContainer.snp.makeConstraints { make in
            make.height.equalTo(36)
        }
    }

    private func setupCompactRentalDaysView() {
        compactDecreaseDaysButton.snp.makeConstraints { make in make.width.height.equalTo(24) }
        compactIncreaseDaysButton.snp.makeConstraints { make in make.width.height.equalTo(24) }
        compactRentalDaysValueLabel.snp.makeConstraints { make in make.width.greaterThanOrEqualTo(20) }

        let compactDaysDisplayStack = UIStackView(arrangedSubviews: [
            compactDecreaseDaysButton,
            compactRentalDaysValueLabel,
            compactIncreaseDaysButton,
            compactRentalDaysSuffixLabel
        ])
        compactDaysDisplayStack.axis = .horizontal
        compactDaysDisplayStack.spacing = 3
        compactDaysDisplayStack.alignment = .center

        let compactDaysSpacer = UIView()
        compactDaysSpacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
        let compactDaysStack = UIStackView(arrangedSubviews: [compactRentalDaysLabel, compactDaysSpacer, compactDaysDisplayStack])
        compactDaysStack.axis = .horizontal
        compactDaysStack.spacing = 6
        compactDaysStack.alignment = .center

        compactRentalDaysContainer.addSubview(compactDaysStack)
        compactDaysStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        compactRentalDaysContainer.snp.makeConstraints { make in
            make.height.equalTo(28)
        }
    }

    private func setCompactStatus(_ status: BookingStatus) {
        switch status {
        case .available:
            compactStatusButton.backgroundColor = UIColor.systemGreen.withAlphaComponent(0.2)
            compactStatusButton.setTitle("Available".localized(), for: .normal)
            compactStatusButton.setTitleColor(.systemGreen, for: .normal)
            compactStatusButton.tintColor = .systemGreen
        case .warning:
            compactStatusButton.backgroundColor = UIColor.systemOrange.withAlphaComponent(0.2)
            compactStatusButton.setTitle("Low Stock".localized(), for: .normal)
            compactStatusButton.setTitleColor(.systemOrange, for: .normal)
            compactStatusButton.tintColor = .systemOrange
        case .loading:
            compactStatusButton.backgroundColor = UIColor.systemGray.withAlphaComponent(0.2)
            compactStatusButton.setTitle("Checking...".localized(), for: .normal)
            compactStatusButton.setTitleColor(.systemGray, for: .normal)
            compactStatusButton.tintColor = .systemGray
        }
    }

    
    private func createQuantityButton(title: String, action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        
        // Use standard plus and minus SF Symbols
        let symbolName = title == "+" ? "plus" : "minus"
        let configuration = UIImage.SymbolConfiguration(pointSize: 16, weight: .semibold)
        let image = UIImage(systemName: symbolName, withConfiguration: configuration)
        
        button.setImage(image, for: .normal)
        button.tintColor = APP_TEXT_COLOR
        
        button.addTarget(self, action: action, for: .touchUpInside)
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }
    
    // MARK: - Public Methods
    
    /// Configure cell with CartItem (NEW - use this for Cart-based flow)
    /// - Parameters:
    ///   - cartItem: The cart item to display
    ///   - index: Index of the item in cart
    ///   - getDate: Pickup date (optional)
    ///   - returnDate: Return date (optional)
    ///   - availabilityStatus: Availability status - nil means loading
    ///   - layout: Visual layout style (.default or .compact)
    func configureCell(cartItem: CartItem, at index: Int, getDate: Date? = nil, returnDate: Date? = nil, availabilityStatus: AvailabilityStatus? = nil, layout: CartItemLayoutStyle = .default) {
        self.cartItem = cartItem
        self.itemIndex = index
        applyLayout(layout)

        productNameLabel.text = cartItem.productName
        compactNameLabel.text = cartItem.productName
        quantity = cartItem.quantity
        price = cartItem.price
        rentalDays = cartItem.rentalDays
        noteTextField.text = cartItem.note
        compactNoteField.text = cartItem.note

        // Pricing option selector (multi-option products)
        currentOptions = cartItem.pricingOptions ?? []
        let showOptions = currentOptions.count > 1
        pricingOptionContainer.isHidden = !showOptions
        if showOptions {
            pricingOptionSegment.removeAllSegments()
            for (i, opt) in currentOptions.enumerated() {
                pricingOptionSegment.insertSegment(withTitle: opt.isDailyType ? "Theo ngày" : "Theo lần", at: i, animated: false)
            }
            let selectedIdx = currentOptions.firstIndex(where: { $0.id == cartItem.selectedPricingOptionId }) ?? 0
            pricingOptionSegment.selectedSegmentIndex = selectedIdx
        }

        // Show/hide rental days controls based on pricing type
        let showRentalDays = cartItem.isDailyPricing
        rentalDaysContainer.isHidden = !showRentalDays
        compactRentalDaysContainer.isHidden = !showRentalDays

        if let imageUrl = cartItem.imageUrl, !imageUrl.isEmpty {
            productImageView.kf.setImage(with: URL(string: imageUrl), placeholder: UIImage(named: "no-image"))
            compactImageView.kf.setImage(with: URL(string: imageUrl), placeholder: UIImage(named: "no-image"))
        } else {
            productImageView.image = UIImage(named: "no-image")
            compactImageView.image = UIImage(named: "no-image")
        }

        updateSubtotal()

        let status = availabilityStatus ?? cartItem.availabilityStatus
        if let getDate = getDate, let returnDate = returnDate {
            updateBookingStatus(getDate: getDate, returnDate: returnDate, availabilityStatus: status)
        } else {
            currentStatus = .available
            setStatus(.available)
        }
    }
    
    // Legacy bind methods removed - use configureCell(cartItem:at:getDate:returnDate:) instead
    
    // MARK: - Actions
    @objc private func increaseTapped() {
        guard let index = itemIndex else { return }
        
        quantity += 1
        if CartStore.shared.cart.pickupPlanAt != nil, CartStore.shared.cart.returnPlanAt != nil {
            currentStatus = .loading
            setStatus(.loading)
        }
        
        delegate?.didEndEditing(value: Double(quantity), isQuantity: true, at: index)
    }
    
    @objc private func decreaseTapped() {
        guard quantity > 1 else { return }
        guard let index = itemIndex else { return }
        
        quantity -= 1
        if CartStore.shared.cart.pickupPlanAt != nil, CartStore.shared.cart.returnPlanAt != nil {
            currentStatus = .loading
            setStatus(.loading)
        }
        
        delegate?.didEndEditing(value: Double(quantity), isQuantity: true, at: index)
    }
    
    @objc private func pricingOptionChanged() {
        guard let index = itemIndex else { return }
        let i = pricingOptionSegment.selectedSegmentIndex
        guard i >= 0 && i < currentOptions.count, let optId = currentOptions[i].id else { return }
        delegate?.didSelectPricingOption(optionId: optId, at: index)
    }

    @objc private func increaseDaysTapped() {
        guard let index = itemIndex else { return }
        rentalDays += 1
        delegate?.didUpdateRentalDays(rentalDays, at: index)
    }

    @objc private func decreaseDaysTapped() {
        guard rentalDays > 1 else { return }
        guard let index = itemIndex else { return }
        rentalDays -= 1
        delegate?.didUpdateRentalDays(rentalDays, at: index)
    }

    @objc private func quantityTapped() {
        guard itemIndex != nil else { return }
        
        let controller = NumberPickerViewController.instance()
        controller.delegate = self
        controller.tag = 1 // Tag for quantity
        controller.configure(initialValue: Double(quantity))
        
        // Present from the window's root view controller
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first,
           let rootVC = window.rootViewController {
            rootVC.present(controller, animated: true)
        }
    }
    
    @objc private func priceTapped() {
        guard itemIndex != nil else { return }
        
        let controller = NumberPickerViewController.instance()
        controller.delegate = self
        controller.tag = 2 // Tag for price
        controller.configure(initialValue: price)
        
        // Present from the window's root view controller
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first,
           let rootVC = window.rootViewController {
            rootVC.present(controller, animated: true)
        }
    }
    
    private func updateSubtotal() {
        let subtotal: Double
        if cartItem?.isDailyPricing == true {
            subtotal = Double(quantity) * price * Double(rentalDays)
        } else {
            subtotal = Double(quantity) * price
        }
        subtotalLabel.text = subtotal.formatStringInCommon()
        compactSubtotalLabel.text = subtotal.formatStringInCommon()
    }
    
    // Add method to update status
    private func updateBookingStatus(getDate: Date?, returnDate: Date?, availabilityStatus: AvailabilityStatus?) {
        guard let cartItem = cartItem,
              let getDate = getDate,
              let returnDate = returnDate else {
            currentStatus = .available
            setStatus(.available)
            return
        }
        
        // Use availability status from ViewController (from API response)
        if let status = availabilityStatus {
            let requestedQuantity = CartStore.shared.cart.items
                .filter { $0.productId == cartItem.productId }
                .reduce(0) { $0 + $1.quantity }
            
            // Check if requested quantity > available
            let hasOverlap = !status.isAvailable || requestedQuantity > status.available
            currentStatus = hasOverlap ? .warning : .available
        } else {
            // Status not loaded yet - show loading state
            currentStatus = .loading
        }
        
        setStatus(currentStatus)
    }
    
    private func setStatus(_ status: BookingStatus) {
        switch status {
        case .available:
            statusView.backgroundColor = UIColor.systemGreen.withAlphaComponent(0.2)
            statusView.setTitle("Available".localized(), for: .normal)
            statusView.setTitleColor(.systemGreen, for: .normal)
            statusView.tintColor = .systemGreen
            
            // Remove any animations if previously warning
            statusView.layer.removeAllAnimations()
            
        case .warning:
            statusView.backgroundColor = UIColor.systemOrange.withAlphaComponent(0.2)
            statusView.setTitle("Low Stock".localized(), for: .normal)
            statusView.setTitleColor(.systemOrange, for: .normal)
            statusView.tintColor = .systemOrange
            
            // Add subtle pulsing animation to draw attention
            addPulseAnimation(to: statusView)
            
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
            
        case .loading:
            statusView.backgroundColor = UIColor.systemGray.withAlphaComponent(0.2)
            statusView.setTitle("Checking...".localized(), for: .normal)
            statusView.setTitleColor(.systemGray, for: .normal)
            statusView.tintColor = .systemGray
            
            statusView.layer.removeAllAnimations()
        }
        setCompactStatus(status)
    }

    private func addPulseAnimation(to view: UIView) {
        // Remove any existing animations first
        view.layer.removeAllAnimations()
        
        // Create a subtle pulsing animation
        let pulseAnimation = CABasicAnimation(keyPath: "opacity")
        pulseAnimation.duration = 1.0
        pulseAnimation.fromValue = 1.0
        pulseAnimation.toValue = 0.6
//        pulseAnimation.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        pulseAnimation.autoreverses = true
        pulseAnimation.repeatCount = .greatestFiniteMagnitude
        
        // Add the animation to the view's layer
        view.layer.add(pulseAnimation, forKey: "pulseAnimation")
    }
    
    @objc private func statusTapped() {
        guard let index = itemIndex else { return }
        delegate?.didTapStatus(at: index)
    }
    
    /// Check product availability from cache and update status
    /// Returns nil if cache not loaded yet (loading state)
    // MARK: - Cache commented out - always return nil to show loading state
    // Cache logic removed - API will be called directly from ViewController
    private func checkForOverlappingBookings(productId: Int, getDate: Date, returnDate: Date) -> Bool? {
        // Cache logic commented out - always return nil to show loading state
        // ViewController will call API and update cell status via reloadSelectionTable()
        
        // OLD CACHE LOGIC (COMMENTED):
        // let requestedQuantity = CartStore.shared.cart.items
        //     .filter { $0.productId == productId }
        //     .reduce(0) { $0 + $1.quantity }
        //
        // guard let result = ProductAvailabilityCache.shared.checkAvailability(
        //     productId: productId,
        //     startDate: getDate,
        //     endDate: returnDate,
        //     requestedQuantity: requestedQuantity
        // ) else {
        //     return nil
        // }
        //
        // let (isAvailable, available) = result
        // if !isAvailable || requestedQuantity > available {
        //     return true
        // }
        // return false
        
        // Always return nil - ViewController will handle API call and update status
        return nil
    }
    
}

// MARK: - UITextFieldDelegate
extension ProductSelectedCell: UITextFieldDelegate {
    func textFieldDidEndEditing(_ textField: UITextField) {
        guard let index = itemIndex else { return }
        // Normalize empty string to nil - empty notes should be treated as no note
        let noteText = textField.text?.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedNote = (noteText?.isEmpty ?? true) ? nil : noteText
        delegate?.didUpdateNote(normalizedNote, at: index)
    }
    
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        // This will dismiss the keyboard when the user presses the "Done" button
        textField.resignFirstResponder()
        return true
    }
}

// MARK: - NumberPickerViewControllerDelegate
extension ProductSelectedCell: NumberPickerViewControllerDelegate {
    func didSelectNumber(_ value: Double, sender: NumberPickerViewController) {
        guard let index = itemIndex else { return }
        
        if sender.tag == 1 { // Quantity
            let newQuantity = Int(value)
            quantity = newQuantity
            if CartStore.shared.cart.pickupPlanAt != nil, CartStore.shared.cart.returnPlanAt != nil {
                currentStatus = .loading
                setStatus(.loading)
            }
            
            delegate?.didEndEditing(value: value, isQuantity: true, at: index)
        } else { // Price
            price = value
            delegate?.didEndEditing(value: value, isQuantity: false, at: index)
        }
    }
}

extension UIButton {
    func setTitleWithOutAnimation(title: String) {
        UIView.performWithoutAnimation {
            self.setTitle(title, for: .normal)
            self.layoutIfNeeded()
        }
    }
}
