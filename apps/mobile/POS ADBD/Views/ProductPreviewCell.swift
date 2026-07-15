//
//  ProductPreviewCell.swift
//  POS ADBD
//
//  Created by Trinh Tran on 11/26/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import Kingfisher
import SnapKit
import RealmSwift

class ProductPreviewCell: UITableViewCell {
    // MARK: - Properties
    private var cartItem: CartItem?
    private var orderItem: OrderItem?
    
    // Add enum for availability status
    enum AvailabilityStatus {
        case available
        case unavailable
        case notApplicable // For sale orders or when dates aren't provided
        
        var color: UIColor {
            switch self {
            case .available: return .systemGreen
            case .unavailable: return .systemRed
            case .notApplicable: return .clear
            }
        }
        
        var text: String {
            switch self {
            case .available: return "Available".localized()
            case .unavailable: return "Unavailable".localized()
            case .notApplicable: return ""
            }
        }
        
        var icon: String {
            switch self {
            case .available: return "checkmark.circle.fill"
            case .unavailable: return "exclamationmark.triangle.fill"
            case .notApplicable: return ""
            }
        }
    }
    
    // MARK: - UI Components
    private lazy var productImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.layer.cornerRadius = 5
        imageView.backgroundColor = .systemGray6 // Background for placeholder
        imageView.isUserInteractionEnabled = true
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(viewImage))
        imageView.addGestureRecognizer(tapGesture)
        return imageView
    }()
    
    private lazy var nameLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 16) // Match AccountViewController text chính
        label.textColor = .black
        label.numberOfLines = 0 // Allow multiple lines for product name as well
        return label
    }()
    
    private lazy var quantityPriceLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
        label.textColor = .darkGray
        return label
    }()
    
    private lazy var totalLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 16) // Match AccountViewController text chính size, nhưng bold để nổi bật tổng tiền
        label.textColor = .black
        label.textAlignment = .right
        return label
    }()
    
    private lazy var noteLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
        label.textColor = .systemGray
        label.lineBreakMode = .byWordWrapping
        label.numberOfLines = 0
        return label
    }()
    
    // Add availability status indicator
    private lazy var availabilityIndicator: UIView = {
        let view = UIView()
        view.layer.cornerRadius = 4
        view.clipsToBounds = true
        view.isHidden = true
        
        // Add icon and label
        view.addSubview(statusIcon)
        view.addSubview(statusLabel)
        
        statusIcon.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(4)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(16)
        }
        
        statusLabel.snp.makeConstraints { make in
            make.leading.equalTo(statusIcon.snp.trailing).offset(4)
            make.trailing.equalToSuperview().offset(-4)
            make.centerY.equalToSuperview()
        }
        
        return view
    }()
    
    private lazy var statusIcon: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.tintColor = .white
        return imageView
    }()
    
    private lazy var statusLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
        label.textColor = .white
        return label
    }()
    
    // MARK: - Stack Views
    private lazy var contentStackView: UIStackView = {
        let stackView = UIStackView()
        stackView.axis = .horizontal
        stackView.alignment = .center
        stackView.spacing = 12
        return stackView
    }()
    
    private lazy var infoStackView: UIStackView = {
        let stackView = UIStackView()
        stackView.axis = .vertical
        stackView.alignment = .fill
        stackView.spacing = 4
        return stackView
    }()
    
    private lazy var priceInfoStackView: UIStackView = {
        let stackView = UIStackView()
        stackView.axis = .horizontal
        stackView.alignment = .center
        stackView.distribution = .equalSpacing
        return stackView
    }()
    
    // MARK: - Initialization
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Setup
    private func setupUI() {
        selectionStyle = .none
        
        // Setup stack view hierarchy
        contentView.addSubview(contentStackView)
        
        contentStackView.addArrangedSubview(productImageView)
        contentStackView.addArrangedSubview(infoStackView)
        
        infoStackView.addArrangedSubview(nameLabel)
        infoStackView.addArrangedSubview(priceInfoStackView)
        infoStackView.addArrangedSubview(noteLabel)
        
        priceInfoStackView.addArrangedSubview(quantityPriceLabel)
        priceInfoStackView.addArrangedSubview(totalLabel)
        
        // Add availability indicator
        infoStackView.addArrangedSubview(availabilityIndicator)
        
        // Setup constraints
        let isIPad = traitCollection.horizontalSizeClass == .regular
        let topBottomInset: CGFloat = isIPad ? 12 : 8
        let leadingTrailingInset: CGFloat = isIPad ? 20 : 16
        let imageSize: CGFloat = isIPad ? 80 : 70
        let indicatorHeight: CGFloat = isIPad ? 28 : 24
        
        contentStackView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: topBottomInset, left: leadingTrailingInset, bottom: topBottomInset, right: leadingTrailingInset))
        }
        
        productImageView.snp.makeConstraints { make in
            make.width.height.equalTo(imageSize)
        }
        
        availabilityIndicator.snp.makeConstraints { make in
            make.height.equalTo(indicatorHeight)
        }
        
        // Set content hugging and compression resistance
        nameLabel.setContentHuggingPriority(.defaultLow, for: .horizontal)
        nameLabel.setContentCompressionResistancePriority(.defaultHigh, for: .horizontal)
        
        quantityPriceLabel.setContentHuggingPriority(.defaultHigh, for: .horizontal)
        quantityPriceLabel.setContentCompressionResistancePriority(.defaultHigh, for: .horizontal)
        
        totalLabel.setContentHuggingPriority(.defaultHigh, for: .horizontal)
        totalLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
    }
    
    // MARK: - Public Methods
    
    /// Bind with CartItem (for cart/preview)
    func bind(cartItem: CartItem, index: Int, pickupDate: Date? = nil, returnDate: Date? = nil, orderType: OrderType = .rent) {
        self.cartItem = cartItem
        self.orderItem = nil
        
        nameLabel.text = cartItem.productName
        
        // Format the quantity and price on the left
        let quantity = cartItem.quantity.inString()
        let price = cartItem.price.formatStringInCommon()
        quantityPriceLabel.text = "\(quantity) × \(price)"
        
        // Display total on the right
        totalLabel.text = "= \(cartItem.subTotal.formatStringInCommon())"
        
        if let note = cartItem.note, !note.isEmpty {
            noteLabel.isHidden = false
            noteLabel.text = note
        } else {
            noteLabel.isHidden = true
        }
        
        // Load image with Kingfisher
        let processor = RoundCornerImageProcessor(cornerRadius: 5)
        if let imageUrl = cartItem.imageUrl, !imageUrl.isEmpty, let url = URL(string: imageUrl) {
            productImageView.kf.setImage(
                with: url,
                placeholder: UIImage(named: "no-image"),
                options: [
                    .processor(processor),
                    .transition(.fade(0.1))
                ]
            )
        } else {
            productImageView.image = UIImage(named: "no-image")
        }
        
        availabilityIndicator.isHidden = true
    }
    
    /// Bind with OrderItem (for order detail)
    func bind(orderItem: OrderItem, index: Int, pickupDate: Date? = nil, returnDate: Date? = nil, orderType: OrderType = .rent) {
        self.orderItem = orderItem
        self.cartItem = nil
        
        nameLabel.text = orderItem.productName
        
        // Format the quantity and price on the left
        let quantity = orderItem.quantity.inString()
        let price = orderItem.unitPrice.formatStringInCommon()
        quantityPriceLabel.text = "\(quantity) × \(price)"
        
        // Display total on the right
        totalLabel.text = "= \(orderItem.totalPrice.formatStringInCommon())"
        
        if let note = orderItem.notes, !note.isEmpty {
            noteLabel.isHidden = false
            noteLabel.text = note
        } else {
            noteLabel.isHidden = true
        }
        
        // Load image with Kingfisher
        let processor = RoundCornerImageProcessor(cornerRadius: 5)
        if let imageUrl = orderItem.productImages?.first, !imageUrl.isEmpty, let url = URL(string: imageUrl) {
            productImageView.kf.setImage(
                with: url,
                placeholder: UIImage(named: "no-image"),
                options: [
                    .processor(processor),
                    .transition(.fade(0.1))
                ]
            )
        } else {
            productImageView.image = UIImage(named: "no-image")
        }
        
        availabilityIndicator.isHidden = true
    }
    
    // Legacy bind method removed - use bind(cartItem:) or bind(orderItem:) instead
    
    // MARK: - Actions
    @objc private func viewImage() {
        let imageUrl: String?
        if let cartItem = cartItem {
            imageUrl = cartItem.imageUrl
        } else if let orderItem = orderItem {
            imageUrl = orderItem.productImages?.first
        } else {
            return
        }
        
        guard let url = imageUrl else { return }
        let controller = ImageProductViewController.instance(imageUrl: url)
        if let navigationController = appDelegate.window?.rootViewController as? UINavigationController {
            navigationController.presentController(
                size: CGSize(width: 800, height: 500),
                controller: controller,
                completion: nil
            )
        }
    }
}
