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

private final class ExpandedTouchButton: UIButton {
    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        guard !isHidden, alpha > 0.01, isUserInteractionEnabled else { return false }
        let horizontalExpansion = max(0, (44 - bounds.width) / 2)
        let verticalExpansion = max(0, (44 - bounds.height) / 2)
        return bounds.insetBy(dx: -horizontalExpansion, dy: -verticalExpansion).contains(point)
    }
}

private struct PricingMethodSheetOption {
    let type: String
    let title: String
    let price: String
    let isSelected: Bool
}

private final class PricingMethodSheetViewController: UIViewController {
    var onSelect: ((String) -> Void)?
    var onEditPrice: (() -> Void)?

    private let options: [PricingMethodSheetOption]
    private let editTitle: String

    init(options: [PricingMethodSheetOption], editTitle: String) {
        self.options = options
        self.editTitle = editTitle
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .pageSheet
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }

    private func setupUI() {
        view.backgroundColor = .systemBackground

        let titleLabel = UILabel()
        titleLabel.text = "Price and pricing method".localized()
        titleLabel.font = Utils.mediumFont(size: 20)
        titleLabel.textColor = .textPrimary
        titleLabel.adjustsFontForContentSizeCategory = true

        let closeButton = UIButton(type: .system)
        closeButton.setImage(UIImage(systemName: "xmark"), for: .normal)
        closeButton.tintColor = .textSecondary
        closeButton.accessibilityLabel = "Close".localized()
        closeButton.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        closeButton.snp.makeConstraints { make in
            make.width.height.equalTo(44)
        }

        let headerSpacer = UIView()
        let header = UIStackView(arrangedSubviews: [titleLabel, headerSpacer, closeButton])
        header.axis = .horizontal
        header.alignment = .center

        let optionStack = UIStackView()
        optionStack.axis = .vertical
        optionStack.spacing = 4

        for (index, option) in options.enumerated() {
            optionStack.addArrangedSubview(makeOptionButton(option, index: index))
        }

        let editButton = UIButton(type: .system)
        var editConfiguration = UIButton.Configuration.tinted()
        editConfiguration.title = editTitle
        editConfiguration.image = UIImage(systemName: "square.and.pencil")
        editConfiguration.imagePlacement = .leading
        editConfiguration.imagePadding = 8
        editConfiguration.cornerStyle = .medium
        editConfiguration.baseForegroundColor = APP_TONE_COLOR
        editConfiguration.baseBackgroundColor = APP_TONE_COLOR
        editConfiguration.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = Utils.mediumFont(size: 16)
            return outgoing
        }
        editButton.configuration = editConfiguration
        editButton.addTarget(self, action: #selector(editPriceTapped), for: .touchUpInside)
        editButton.snp.makeConstraints { make in
            make.height.equalTo(48)
        }

        let contentStack = UIStackView(arrangedSubviews: [
            header,
            optionStack,
            editButton
        ])
        contentStack.axis = .vertical
        contentStack.spacing = 12

        view.addSubview(contentStack)
        contentStack.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(8)
            make.leading.trailing.equalToSuperview().inset(20)
            make.bottom.lessThanOrEqualTo(view.safeAreaLayoutGuide).inset(12)
        }
    }

    private func makeOptionButton(
        _ option: PricingMethodSheetOption,
        index: Int
    ) -> UIButton {
        let button = UIButton(type: .system)
        var configuration = UIButton.Configuration.plain()

        var priceTitle = AttributedString(option.price)
        priceTitle.font = Utils.mediumFont(size: 18)
        priceTitle.foregroundColor = option.isSelected
            ? APP_TONE_COLOR
            : UIColor.textPrimary

        var pricingMethodTitle = AttributedString(" / \(option.title)")
        pricingMethodTitle.font = Utils.regularFont(size: 14)
        pricingMethodTitle.foregroundColor = UIColor.textSecondary
        priceTitle.append(pricingMethodTitle)

        configuration.attributedTitle = priceTitle
        configuration.titleAlignment = .leading
        configuration.image = option.isSelected
            ? UIImage(systemName: "checkmark.circle.fill")
            : UIImage(systemName: "circle")
        configuration.imagePlacement = .trailing
        configuration.imagePadding = 12
        configuration.baseForegroundColor = option.isSelected ? APP_TONE_COLOR : .textPrimary
        configuration.contentInsets = NSDirectionalEdgeInsets(
            top: 8,
            leading: 4,
            bottom: 8,
            trailing: 4
        )
        button.configuration = configuration
        button.tag = index
        button.contentHorizontalAlignment = .fill
        button.accessibilityLabel = option.title
        button.accessibilityTraits = option.isSelected
            ? UIAccessibilityTraitButton | UIAccessibilityTraitSelected
            : UIAccessibilityTraitButton
        button.accessibilityValue = option.price
        button.addTarget(self, action: #selector(optionTapped(_:)), for: .touchUpInside)
        button.snp.makeConstraints { make in
            make.height.greaterThanOrEqualTo(52)
        }
        return button
    }

    @objc private func optionTapped(_ sender: UIButton) {
        guard options.indices.contains(sender.tag) else { return }
        onSelect?(options[sender.tag].type)
    }

    @objc private func editPriceTapped() {
        onEditPrice?()
    }

    @objc private func closeTapped() {
        dismiss(animated: true)
    }
}

protocol ProductSelectedCellDelegate: AnyObject {
    func didEndEditing(value: Double, isQuantity: Bool, at index: Int)
    func didUpdateNote(_ note: String?, at index: Int)
    func didTapDelete(at index: Int)
    func didTapStatus(at index: Int)
    func didUpdateRentalDays(_ days: Int, at index: Int)
    func didSelectPricingOption(optionId: Int, at index: Int)
    func didSelectPricingType(_ type: String, at index: Int)
}

// Default implementation so existing conformers don't break
extension ProductSelectedCellDelegate {
    func didUpdateRentalDays(_ days: Int, at index: Int) {}
    func didSelectPricingOption(optionId: Int, at index: Int) {}
    func didSelectPricingType(_ type: String, at index: Int) {}
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
            if currentOrderType == .rent {
                if currentPricingType.uppercased() == "DAILY" {
                    dailyRatePrice = price
                } else {
                    fixedRatePrice = price
                }
            } else {
                fixedRatePrice = price
            }
            updatePriceControl()
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
    private lazy var cardView: UIView = {
        let view = UIView()
        view.backgroundColor = .backgroundCard
        view.layer.cornerRadius = 8
        view.layer.borderWidth = 0.5
        view.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.4).cgColor
        view.layer.shadowColor = UIColor.black.cgColor
        view.layer.shadowOpacity = 0.035
        view.layer.shadowRadius = 8
        view.layer.shadowOffset = CGSize(width: 0, height: 2)
        view.layoutMargins = UIEdgeInsets(top: 8, left: 10, bottom: 8, right: 10)
        return view
    }()

    private lazy var containerStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [
            topStackView,
            controlsStackView,
            priceSummaryView,
            rentalDaysContainer,
            noteActionButton,
            noteTextField
        ])
        stack.axis = .vertical
        stack.spacing = 6
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()
    
    private lazy var topStackView: UIStackView = {
        let titleRow = UIStackView(arrangedSubviews: [productNameLabel, statusView])
        titleRow.axis = .horizontal
        titleRow.spacing = 8
        titleRow.alignment = .top
        productNameLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        statusView.setContentHuggingPriority(.required, for: .horizontal)

        let infoStack = UIStackView(arrangedSubviews: [
            titleRow,
            productCodeLabel
        ])
        infoStack.axis = .vertical
        infoStack.spacing = 4
        infoStack.alignment = .fill

        let stack = UIStackView(arrangedSubviews: [productImageView, infoStack])
        stack.axis = .horizontal
        stack.spacing = 12
        stack.alignment = .top

        productImageView.snp.makeConstraints { make in
            make.width.height.equalTo(44)
        }
        return stack
    }()
    
    private lazy var controlsStackView: UIStackView = {
        let spacer = UIView()
        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)

        let stack = UIStackView(arrangedSubviews: [
            quantityControlView,
            spacer,
            rateSelectorButton
        ])
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .center
        stack.distribution = .fill
        
        quantityControlView.setContentHuggingPriority(.required, for: .horizontal)
        rateSelectorButton.setContentHuggingPriority(.required, for: .horizontal)
        
        return stack
    }()

    private lazy var rateSelectorButton: UIButton = {
        let button = UIButton(type: .system)
        var configuration = UIButton.Configuration.plain()
        configuration.titleAlignment = .trailing
        configuration.imagePlacement = .trailing
        configuration.imagePadding = 4
        configuration.contentInsets = NSDirectionalEdgeInsets(
            top: 8,
            leading: 12,
            bottom: 8,
            trailing: 0
        )
        button.configuration = configuration
        button.contentHorizontalAlignment = .right
        button.backgroundColor = .clear
        button.layer.borderWidth = 0
        button.addTarget(self, action: #selector(rateSelectorTapped), for: .touchUpInside)
        button.snp.makeConstraints { make in
            make.height.equalTo(44)
            make.width.greaterThanOrEqualTo(132)
        }
        return button
    }()

    private lazy var priceSummaryView: UIView = {
        let view = UIView()
        view.backgroundColor = .clear

        let divider = UIView()
        divider.backgroundColor = UIColor.borderColor.withAlphaComponent(0.35)

        let unitPriceStack = UIStackView(arrangedSubviews: [
            unitPriceCaptionLabel,
            unitPriceButton
        ])
        unitPriceStack.axis = .vertical
        unitPriceStack.spacing = 0
        unitPriceStack.alignment = .leading

        let subtotalStack = UIStackView(arrangedSubviews: [
            subtotalCaptionLabel,
            subtotalLabel
        ])
        subtotalStack.axis = .vertical
        subtotalStack.spacing = 1
        subtotalStack.alignment = .trailing

        let spacer = UIView()
        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)

        let row = UIStackView(arrangedSubviews: [
            unitPriceStack,
            spacer,
            subtotalStack
        ])
        row.axis = .horizontal
        row.spacing = 12
        row.alignment = .center

        unitPriceStack.setContentHuggingPriority(.required, for: .horizontal)
        subtotalStack.setContentHuggingPriority(.required, for: .horizontal)
        view.addSubview(divider)
        view.addSubview(row)
        divider.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview()
            make.height.equalTo(0.5)
        }
        row.snp.makeConstraints { make in
            make.top.equalTo(divider.snp.bottom).offset(4)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalToSuperview().inset(4)
        }
        view.snp.makeConstraints { make in
            make.height.equalTo(52)
        }
        return view
    }()

    private lazy var unitPriceCaptionLabel: UILabel = {
        let label = UILabel()
        label.text = "Unit price".localized()
        label.font = Utils.regularFont(size: 11)
        label.textColor = .textSecondary
        label.adjustsFontForContentSizeCategory = true
        return label
    }()

    private lazy var unitPriceButton: UIButton = {
        let button = ExpandedTouchButton(type: .system)
        var configuration = UIButton.Configuration.plain()
        configuration.titleAlignment = .leading
        configuration.imagePlacement = .trailing
        configuration.imagePadding = 5
        configuration.contentInsets = .zero
        button.configuration = configuration
        button.contentHorizontalAlignment = .leading
        button.addTarget(self, action: #selector(priceTapped), for: .touchUpInside)
        button.snp.makeConstraints { make in
            make.height.equalTo(30)
        }
        return button
    }()
    
    private lazy var productNameLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 16)
        label.textColor = .textPrimary
        label.numberOfLines = 2
        label.adjustsFontForContentSizeCategory = true
        label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        return label
    }()

    private lazy var productCodeLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 12)
        label.textColor = .textSecondary
        label.numberOfLines = 1
        label.adjustsFontForContentSizeCategory = true
        return label
    }()
    
    private lazy var productImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.layer.cornerRadius = 8
        imageView.backgroundColor = UIColor.systemGray6
        imageView.translatesAutoresizingMaskIntoConstraints = false
        imageView.isAccessibilityElement = true
        return imageView
    }()

    private lazy var subtotalLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 17)
        label.textColor = .textPrimary
        label.textAlignment = .right
        label.adjustsFontForContentSizeCategory = true
        label.setContentHuggingPriority(.required, for: .horizontal)
        label.setContentCompressionResistancePriority(.required, for: .horizontal)
        return label
    }()

    private lazy var subtotalCaptionLabel: UILabel = {
        let label = UILabel()
        label.text = "Subtotal".localized()
        label.font = Utils.regularFont(size: 12)
        label.textColor = .textSecondary
        label.textAlignment = .right
        label.adjustsFontForContentSizeCategory = true
        return label
    }()

    private lazy var quantityControlView: UIView = {
        let view = UIView()
        view.backgroundColor = .clear
        view.layer.borderWidth = 0
        
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
            make.width.height.equalTo(44)
        }
        
        quantityLabel.snp.makeConstraints { make in
            make.center.equalToSuperview()
            make.width.equalTo(16)
        }
        
        increaseButton.snp.makeConstraints { make in
            make.trailing.equalToSuperview()
            make.centerY.equalToSuperview()
            make.width.height.equalTo(44)
        }
        
        view.snp.makeConstraints { make in
            make.width.equalTo(104)
            make.height.equalTo(44)
        }
        
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(quantityTapped))
        view.addGestureRecognizer(tapGesture)
        return view
    }()
    
    private lazy var quantityLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 16)
        label.textColor = APP_TONE_COLOR
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    // Update status view
    private lazy var statusView: UIButton = {
        let button = ExpandedTouchButton(type: .system)
        
        // Configure button appearance using UIButtonConfiguration (iOS 15+)
        var config = UIButton.Configuration.plain()
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = Utils.regularFont(size: 11)
            return outgoing
        }
        config.contentInsets = NSDirectionalEdgeInsets(top: 3, leading: 0, bottom: 3, trailing: 0)
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
    
    private lazy var noteActionButton: UIButton = {
        let button = ExpandedTouchButton(type: .system)
        var configuration = UIButton.Configuration.plain()
        configuration.title = "Add note".localized()
        configuration.image = UIImage(systemName: "plus")
        configuration.preferredSymbolConfigurationForImage = UIImage.SymbolConfiguration(
            pointSize: 14,
            weight: .regular
        )
        configuration.imagePlacement = .leading
        configuration.imagePadding = 6
        configuration.baseForegroundColor = .textSecondary
        configuration.contentInsets = .zero
        configuration.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = Utils.regularFont(size: 13)
            return outgoing
        }
        button.configuration = configuration
        button.contentHorizontalAlignment = .leading
        button.addTarget(self, action: #selector(showNoteEditor), for: .touchUpInside)
        button.snp.makeConstraints { make in
            make.height.equalTo(32)
        }
        return button
    }()

    private lazy var noteTextField: RCTextFieldPadding = {
        let field = RCTextFieldPadding()
        field.placeholder = "Note".localized()
        field.font = Utils.regularFont(size: 15)
        field.delegate = self
        field.backgroundColor = .backgroundTertiary
        field.layer.cornerRadius = 10
        field.layer.borderWidth = 0
        field.returnKeyType = .done
        field.clearButtonMode = .whileEditing
        field.isHidden = true
        
        // Use SnapKit for constraints
        field.snp.makeConstraints { make in
            make.height.equalTo(44)
        }
        
        return field
    }()

    // MARK: - Order duration (read-only; dates are selected for the whole order)
    private lazy var rentalDaysContainer: UIView = {
        let view = UIView()
        view.isHidden = true
        view.backgroundColor = .clear
        view.layer.cornerRadius = 0
        return view
    }()

    private lazy var rentalDaysLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 13)
        label.textColor = .textSecondary
        label.adjustsFontForContentSizeCategory = true
        label.numberOfLines = 1
        return label
    }()

    private lazy var compactRentalDaysContainer: UIView = {
        let view = UIView()
        view.isHidden = true
        return view
    }()

    private lazy var compactRentalDaysLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 12)
        label.textColor = .secondaryLabel
        label.numberOfLines = 1
        return label
    }()

    private var hasCompleteOrderDates = false
    private var rentalDays: Int = 1 {
        didSet {
            updateRentalDaysControl()
            updateSubtotal()
        }
    }

    // MARK: - Pricing options
    private var currentOptions: [PricingOption] = []
    private var currentPricingType = "FIXED"
    private var currentOrderType: OrderType = .rent
    private var fixedRatePrice: Double = 0
    private var dailyRatePrice: Double = 0

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
        let b = ExpandedTouchButton(type: .system)
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
        l.textColor = APP_TONE_COLOR
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
        b.addTarget(self, action: #selector(rateSelectorTapped), for: .touchUpInside)
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
        hasCompleteOrderDates = false
        rentalDaysContainer.isHidden = true
        compactRentalDaysContainer.isHidden = true
        currentOptions = []
        currentPricingType = "FIXED"
        currentOrderType = .rent
        fixedRatePrice = 0
        dailyRatePrice = 0
        noteTextField.text = nil
        compactNoteField.text = nil
        updateNotePresentation(note: nil)
        currentStatus = .available
        setStatus(.available)
    }
    
    // MARK: - Setup
    private func setupUI() {
        backgroundColor = .clear
        contentView.backgroundColor = .clear

        let backgroundView = UIView()
        backgroundView.backgroundColor = .clear
        self.backgroundView = backgroundView

        let selectedBackgroundView = UIView()
        selectedBackgroundView.backgroundColor = APP_TONE_COLOR.withAlphaComponent(0.06)
        self.selectedBackgroundView = selectedBackgroundView

        contentView.addSubview(cardView)
        cardView.snp.makeConstraints { make in
            make.top.bottom.equalToSuperview().inset(5)
            make.leading.trailing.equalToSuperview().inset(12)
        }

        cardView.addSubview(containerStackView)
        containerStackView.snp.makeConstraints { make in
            make.edges.equalTo(cardView.layoutMarginsGuide)
        }

        // Read-only duration from the order pickup/return dates.
        setupRentalDaysView()

        // Compact layout: [Image] [Col: name+status, qty row, price=subtotal, note]
        cardView.addSubview(compactContainerView)
        compactContainerView.snp.makeConstraints { make in
            make.edges.equalTo(cardView.layoutMarginsGuide)
        }

        let compactTopRow = UIStackView(arrangedSubviews: [compactNameLabel, compactStatusButton])
        compactTopRow.axis = .horizontal
        compactTopRow.spacing = 8
        compactTopRow.alignment = .center
        compactStatusButton.setContentHuggingPriority(.required, for: .horizontal)

        let compactQtyStack = UIStackView(arrangedSubviews: [compactDecreaseButton, compactQuantityLabel, compactIncreaseButton])
        compactQtyStack.axis = .horizontal
        compactQtyStack.spacing = 0
        compactQtyStack.alignment = .center
        compactDecreaseButton.snp.makeConstraints { make in make.width.height.equalTo(44) }
        compactIncreaseButton.snp.makeConstraints { make in make.width.height.equalTo(44) }
        compactQuantityLabel.snp.makeConstraints { make in make.width.equalTo(28) }

        let compactSpacer = UIView()
        compactSpacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
        let compactControlRow = UIStackView(arrangedSubviews: [compactQtyStack, compactSpacer, compactSubtotalLabel])
        compactControlRow.axis = .horizontal
        compactControlRow.spacing = 8
        compactControlRow.alignment = .center
        compactSubtotalLabel.setContentHuggingPriority(.required, for: .horizontal)

        compactPriceButton.snp.makeConstraints { make in make.height.equalTo(44) }
        let compactCol = UIStackView(arrangedSubviews: [
            compactTopRow,
            compactPriceButton,
            compactControlRow,
            compactRentalDaysContainer,
            compactNoteField
        ])
        compactCol.axis = .vertical
        compactCol.spacing = 8
        compactCol.alignment = .fill

        // Compact layout uses the same read-only order duration.
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
    private func setupRentalDaysView() {
        let iconView = UIImageView(image: UIImage(systemName: "calendar"))
        iconView.tintColor = .textSecondary
        iconView.contentMode = .scaleAspectFit
        iconView.snp.makeConstraints { make in
            make.width.height.equalTo(16)
        }

        let stack = UIStackView(arrangedSubviews: [iconView, rentalDaysLabel])
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .center

        rentalDaysContainer.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview()
            make.top.bottom.equalToSuperview()
        }
        rentalDaysContainer.snp.makeConstraints { make in
            make.height.equalTo(32)
        }
        updateRentalDaysControl()
    }

    private func setupCompactRentalDaysView() {
        let iconView = UIImageView(image: UIImage(systemName: "calendar"))
        iconView.tintColor = .secondaryLabel
        iconView.contentMode = .scaleAspectFit
        iconView.snp.makeConstraints { make in
            make.width.height.equalTo(14)
        }

        let compactDaysStack = UIStackView(arrangedSubviews: [iconView, compactRentalDaysLabel])
        compactDaysStack.axis = .horizontal
        compactDaysStack.spacing = 6
        compactDaysStack.alignment = .center

        compactRentalDaysContainer.addSubview(compactDaysStack)
        compactDaysStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        compactRentalDaysContainer.snp.makeConstraints { make in
            make.height.equalTo(24)
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
        button.accessibilityLabel = title == "+" ? "Increase".localized() : "Decrease".localized()
        
        button.addTarget(self, action: action, for: .touchUpInside)
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }

    private func updateRentalDaysControl() {
        let text: String
        if hasCompleteOrderDates {
            text = String(format: "%d days from order dates".localized(), rentalDays)
        } else {
            text = "Select order dates to calculate".localized()
        }
        rentalDaysLabel.text = text
        compactRentalDaysLabel.text = text
        rentalDaysContainer.accessibilityLabel = text
        compactRentalDaysContainer.accessibilityLabel = text
    }

    private func updateNotePresentation(note: String?) {
        let hasNote = !(note?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
        noteActionButton.isHidden = hasNote
        noteTextField.isHidden = !hasNote
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
    func configureCell(
        cartItem: CartItem,
        at index: Int,
        getDate: Date? = nil,
        returnDate: Date? = nil,
        availabilityStatus: AvailabilityStatus? = nil,
        orderType: OrderType = .rent,
        layout: CartItemLayoutStyle = .default
    ) {
        self.cartItem = cartItem
        self.itemIndex = index
        currentOrderType = orderType
        applyLayout(layout)

        productNameLabel.text = cartItem.productName
        compactNameLabel.text = cartItem.productName
        let barcode = (cartItem.barcode ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        productCodeLabel.text = barcode.isEmpty ? nil : "#\(barcode)"
        productCodeLabel.isHidden = barcode.isEmpty
        productImageView.accessibilityLabel = cartItem.productName
        compactImageView.accessibilityLabel = cartItem.productName
        quantity = cartItem.quantity
        hasCompleteOrderDates = getDate != nil && returnDate != nil
        rentalDays = cartItem.rentalDays
        noteTextField.text = cartItem.note
        compactNoteField.text = cartItem.note
        updateNotePresentation(note: cartItem.note)

        // Keep both supported rental rates available behind the single,
        // compact price control.
        currentOptions = orderType == .rent ? (cartItem.pricingOptions ?? []) : []
        if let selectedOptionId = cartItem.selectedPricingOptionId,
           let selectedOption = currentOptions.first(where: { $0.id == selectedOptionId }) {
            currentPricingType = selectedOption.type
        } else {
            currentPricingType = cartItem.pricingType ?? "FIXED"
        }
        let configuredFixedPrice = currentOptions.first {
            $0.type.uppercased() == "FIXED"
        }?.price
        let configuredDailyPrice = currentOptions.first {
            $0.type.uppercased() == "DAILY"
        }?.price
        fixedRatePrice = cartItem.customFixedPrice
            ?? configuredFixedPrice
            ?? (currentPricingType.uppercased() == "FIXED" ? cartItem.price : 0)
        dailyRatePrice = cartItem.customDailyPrice
            ?? configuredDailyPrice
            ?? (currentPricingType.uppercased() == "DAILY" ? cartItem.price : 0)
        price = cartItem.price
        updatePriceControl()

        // Duration is informative only. Pickup/return dates are edited once
        // for the whole order, then synced to all per-day items.
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
    
    @objc private func rateSelectorTapped() {
        if currentOrderType == .rent {
            presentPricingMethodSheet()
        } else {
            priceTapped()
        }
    }

    private func selectPricingType(_ type: String) {
        guard let index = itemIndex else { return }
        guard currentOrderType == .rent else { return }
        guard currentPricingType.uppercased() != type else { return }
        currentPricingType = type
        updatePriceControl()
        UISelectionFeedbackGenerator().selectionChanged()
        delegate?.didSelectPricingType(type, at: index)
        UIAccessibilityPostNotification(
            UIAccessibilityAnnouncementNotification,
            String(
                format: "Pricing changed to %@".localized(),
                pricingTitle(for: type)
            ) as NSString
        )
    }

    private func updatePriceControl() {
        updateRateSelectorButton()
        updateUnitPriceButton()

        if currentOrderType == .rent {
            let compactTitle = NSMutableAttributedString(
                string: price.formatStringInCommon(),
                attributes: [
                    .font: Utils.mediumFont(size: 14),
                    .foregroundColor: APP_TEXT_COLOR
                ]
            )
            compactTitle.append(NSAttributedString(
                string: pricingSuffix(for: currentPricingType),
                attributes: [
                    .font: Utils.regularFont(size: 12),
                    .foregroundColor: UIColor.textSecondary
                ]
            ))
            compactPriceButton.setAttributedTitle(compactTitle, for: .normal)
        } else {
            compactPriceButton.setAttributedTitle(nil, for: .normal)
            compactPriceButton.setTitleWithOutAnimation(
                title: "\(price.formatStringInCommon()) · \("Sale Price".localized())"
            )
        }
        compactPriceButton.accessibilityLabel = "Unit price".localized()
        let accessibleModeTitle = currentOrderType == .rent
            ? pricingTitle(for: currentPricingType)
            : "Sale Price".localized()
        compactPriceButton.accessibilityValue =
            "\(price.formatStringInCommon()), \(accessibleModeTitle)"
        compactPriceButton.accessibilityHint = currentOrderType == .rent
            ? "Double tap to change pricing method".localized()
            : "Double tap to edit unit price".localized()
        compactPriceButton.menu = nil
        compactPriceButton.showsMenuAsPrimaryAction = false
    }

    private func updateRateSelectorButton() {
        var configuration = rateSelectorButton.configuration ?? UIButton.Configuration.plain()
        let isRent = currentOrderType == .rent

        var attributedTitle = AttributedString(
            isRent ? pricingTitle(for: currentPricingType) : "Sale Price".localized()
        )
        attributedTitle.font = Utils.mediumFont(size: 14)
        attributedTitle.foregroundColor = UIColor.textPrimary
        configuration.attributedTitle = attributedTitle
        let chevronConfiguration = UIImage.SymbolConfiguration(
            pointSize: 10,
            weight: .semibold
        )
        configuration.image = isRent
            ? UIImage(systemName: "chevron.down", withConfiguration: chevronConfiguration)
            : nil
        configuration.baseForegroundColor = UIColor.textSecondary
        rateSelectorButton.configuration = configuration
        rateSelectorButton.isHidden = !isRent
        rateSelectorButton.accessibilityLabel = isRent
            ? "Price and pricing method".localized()
            : "Sale Price".localized()
        rateSelectorButton.accessibilityValue = pricingTitle(for: currentPricingType)
        rateSelectorButton.accessibilityHint = "Double tap to change pricing method".localized()
        rateSelectorButton.accessibilityTraits = UIAccessibilityTraitButton
        rateSelectorButton.menu = nil
        rateSelectorButton.showsMenuAsPrimaryAction = false
    }

    private func updateUnitPriceButton() {
        var configuration = unitPriceButton.configuration ?? UIButton.Configuration.plain()
        let suffix = currentOrderType == .rent
            ? pricingSuffix(for: currentPricingType)
            : ""

        var attributedTitle = AttributedString(price.formatStringInCommon())
        attributedTitle.font = Utils.mediumFont(size: 16)
        attributedTitle.foregroundColor = APP_TONE_COLOR

        configuration.attributedTitle = attributedTitle
        configuration.image = nil
        configuration.baseForegroundColor = APP_TONE_COLOR
        unitPriceButton.configuration = configuration
        unitPriceCaptionLabel.text = currentOrderType == .rent
            ? "Unit price".localized()
            : "Sale Price".localized()
        unitPriceButton.accessibilityLabel = unitPriceCaptionLabel.text
        unitPriceButton.accessibilityValue = "\(price.formatStringInCommon())\(suffix)"
        unitPriceButton.accessibilityHint = "Double tap to edit unit price".localized()
    }

    private func presentPricingMethodSheet() {
        let options = ["FIXED", "DAILY"].map { type in
            let optionPrice = type == "DAILY" ? dailyRatePrice : fixedRatePrice
            return PricingMethodSheetOption(
                type: type,
                title: pricingTitle(for: type),
                price: optionPrice.formatStringInCommon(),
                isSelected: currentPricingType.uppercased() == type
            )
        }
        let controller = PricingMethodSheetViewController(
            options: options,
            editTitle: "Edit unit price".localized()
        )
        controller.onSelect = { [weak self, weak controller] type in
            self?.selectPricingType(type)
            controller?.dismiss(animated: true)
        }
        controller.onEditPrice = { [weak self, weak controller] in
            controller?.dismiss(animated: true) {
                self?.priceTapped()
            }
        }

        if let sheet = controller.sheetPresentationController {
            if #available(iOS 16.0, *) {
                sheet.detents = [
                    .custom(identifier: .init("pricing-method")) { _ in 246 }
                ]
            } else {
                sheet.detents = [.medium()]
            }
            sheet.prefersGrabberVisible = true
            sheet.preferredCornerRadius = 16
            sheet.prefersScrollingExpandsWhenScrolledToEdge = false
        }
        presentSheet(controller)
    }

    private func pricingTitle(for type: String) -> String {
        switch type.uppercased() {
        case "DAILY":
            return "Per day".localized()
        case "HOURLY":
            return "Per hour".localized()
        case "MONTHLY":
            return "Per month".localized()
        default:
            return "Per rental".localized()
        }
    }

    private func pricingSuffix(for type: String) -> String {
        switch type.uppercased() {
        case "DAILY":
            return "/rental day".localized()
        case "HOURLY":
            return "/rental hour".localized()
        case "MONTHLY":
            return "/rental month".localized()
        default:
            return "/rental".localized()
        }
    }

    @objc private func showNoteEditor() {
        noteActionButton.isHidden = true
        noteTextField.isHidden = false
        noteTextField.becomeFirstResponder()
    }

    @objc private func quantityTapped() {
        guard itemIndex != nil else { return }
        
        let controller = NumberPickerViewController.instance()
        controller.delegate = self
        controller.tag = 1 // Tag for quantity
        controller.configure(
            initialValue: Double(quantity),
            title: "Quantity".localized()
        )
        presentSheet(controller)
    }
    
    @objc private func priceTapped() {
        guard itemIndex != nil else { return }
        
        let controller = NumberPickerViewController.instance()
        controller.delegate = self
        controller.tag = 2 // Tag for price
        controller.configure(
            initialValue: price,
            title: unitPriceCaptionLabel.text ?? "Unit price".localized()
        )
        presentSheet(controller)
    }

    private func presentSheet(_ controller: UIViewController) {
        var responder: UIResponder? = self
        while let currentResponder = responder {
            if let viewController = currentResponder as? UIViewController {
                viewController.present(controller, animated: true)
                return
            }
            responder = currentResponder.next
        }

        guard let windowScene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first(where: { $0.activationState == .foregroundActive }),
              let rootViewController = windowScene.windows
            .first(where: { $0.isKeyWindow })?
            .rootViewController else {
            return
        }
        rootViewController.present(controller, animated: true)
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
            statusView.backgroundColor = .clear
            statusView.setTitle("Available".localized(), for: .normal)
            statusView.setTitleColor(.systemGreen, for: .normal)
            statusView.tintColor = .systemGreen
            
            // Remove any animations if previously warning
            statusView.layer.removeAllAnimations()
            
        case .warning:
            statusView.backgroundColor = UIColor.systemOrange.withAlphaComponent(0.1)
            statusView.setTitle("Low Stock".localized(), for: .normal)
            statusView.setTitleColor(.systemOrange, for: .normal)
            statusView.tintColor = .systemOrange
            
            // Add subtle pulsing animation to draw attention
            addPulseAnimation(to: statusView)
            
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
            
        case .loading:
            statusView.backgroundColor = .clear
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
        if textField === noteTextField {
            updateNotePresentation(note: normalizedNote)
        }
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
        } else if sender.tag == 2 { // Price
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
