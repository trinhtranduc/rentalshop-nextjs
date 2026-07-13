//
//  ProductCell.swift
//  POS ADBD
//
//  Created by Trinh Tran on 11/25/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import Kingfisher
import GestureRecognizerClosures
import SnapKit

protocol ProductCellDelegate {
    func viewImage(sender: Product)
    func more(product: Product, sender: ProductCell)
}

class ProductCell: UITableViewCell {
    // MARK: - UI Components
    private lazy var containerView: UIView = {
        let view = UIView()
        view.isUserInteractionEnabled = true
        view.backgroundColor = .white
        view.layer.cornerRadius = 10
        view.layer.borderWidth = 0.5
        view.layer.borderColor = UIColor.separator.withAlphaComponent(0.25).cgColor
        return view
    }()
    
    private lazy var productImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.isUserInteractionEnabled = true
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.layer.cornerRadius = 8
        imageView.backgroundColor = .systemGray6
        return imageView
    }()
    
    private lazy var productNameLabel: UILabel = {
        let label = UILabel()
        label.isUserInteractionEnabled = true
        label.font = Utils.regularFont(size: 16) // Match AccountViewController text chính
        label.numberOfLines = 2
        label.textColor = .textPrimary
        return label
    }()
    
    private lazy var stockLabel: UILabel = {
        let label = UILabel()
        label.isUserInteractionEnabled = true
        label.font = Utils.regularFont(size: 14) // Match AccountViewController text phụ
        label.textColor = .secondaryLabel
        return label
    }()
    
    // Rent price view (title + value)
    private lazy var rentPriceTitleLabel: UILabel = {
        let label = UILabel()
        label.adjustsFontSizeToFitWidth = true
        label.font = Utils.regularFont(size: 14)
        label.textColor = .secondaryLabel
        label.text = "Rent Price".localized()
        label.textAlignment = .left
        return label
    }()
    
    private lazy var rentPriceValueLabel: UILabel = {
        let label = UILabel()
        label.adjustsFontSizeToFitWidth = true
        label.font = Utils.regularFont(size: 14)
        label.textColor = .textPrimary
        label.textAlignment = .left
        return label
    }()
    
    private lazy var rentPriceView: UIView = {
        let container = UIView()
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 2 // Tight spacing between title and value
        stack.alignment = .leading
        
        stack.addArrangedSubview(rentPriceTitleLabel)
        stack.addArrangedSubview(rentPriceValueLabel)
        
        container.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        return container
    }()
    
    // Sale price view (title + value)
    private lazy var salePriceTitleLabel: UILabel = {
        let label = UILabel()
        label.adjustsFontSizeToFitWidth = true
        label.font = Utils.regularFont(size: 14)
        label.textColor = .secondaryLabel
        label.text = "Sale Price".localized()
        label.textAlignment = .left
        return label
    }()
    
    private lazy var salePriceValueLabel: UILabel = {
        let label = UILabel()
        label.adjustsFontSizeToFitWidth = true
        label.font = Utils.regularFont(size: 14)
        label.textColor = .textPrimary
        label.textAlignment = .left
        return label
    }()
    
    private lazy var salePriceView: UIView = {
        let container = UIView()
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 2 // Tight spacing between title and value
        stack.alignment = .leading
        
        stack.addArrangedSubview(salePriceTitleLabel)
        stack.addArrangedSubview(salePriceValueLabel)
        
        container.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        return container
    }()
    
    // Prices stack view (horizontal)
    private lazy var pricesStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 20 // Increased spacing between rent and sale prices for better readability
        stack.alignment = .top // Align top for consistent baseline
        stack.distribution = .fillEqually // Fill equally để chia đều không gian cho rent và sale price
        return stack
    }()
    
    lazy var moreButton: UIButton = {
        let button = UIButton(type: .system)
        button.isUserInteractionEnabled = true
        button.setImage(UIImage(named: "ic_more"), for: .normal)
        button.tintColor = .systemGray
        button.showsMenuAsPrimaryAction = true
        // Keep target for backward compatibility if menu is not set
        button.addTarget(self, action: #selector(moreButtonTapped), for: .touchUpInside)
        return button
    }()
    
    // Check indicator dot circle
    private lazy var checkIndicatorView: UIView = {
        let view = UIView()
        view.backgroundColor = .systemRed
        view.layer.cornerRadius = 6
        view.layer.borderWidth = 2
        view.layer.borderColor = UIColor.white.cgColor
        view.isHidden = true
        return view
    }()
    
    // MARK: - Properties
    var delegate: ProductCellDelegate?
    private var product: Product?
    
    // MARK: - Initialization
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
        
        // Enable cell selection
        self.selectionStyle = .default
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Setup
    private func setupUI() {
        backgroundColor = .clear // Clear background để card style nổi bật
        
        contentView.addSubview(containerView)
        
        containerView.addSubview(productImageView)
        containerView.addSubview(productNameLabel)
        containerView.addSubview(stockLabel)
        containerView.addSubview(pricesStackView)
        containerView.addSubview(moreButton)
        containerView.addSubview(checkIndicatorView)
        
        // Setup prices stack
        pricesStackView.addArrangedSubview(rentPriceView)
        pricesStackView.addArrangedSubview(salePriceView)
        
        // Make sure more button is always visible and properly sized
        moreButton.isHidden = false
        moreButton.isUserInteractionEnabled = true
        
        // Adjust image size based on device
        let isIPad = traitCollection.horizontalSizeClass == .regular
        let imageSize: CGFloat = isIPad ? 70 : 60
        let buttonSize: CGFloat = isIPad ? 44 : 36
        let horizontalSpacing: CGFloat = isIPad ? 12 : 12 // Spacing giống Option 5
        let verticalSpacing: CGFloat = isIPad ? 6 : 6 // Spacing giống Option 5
        
        // Container view constraints - Card style với spacing giống Option 5
        containerView.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(verticalSpacing)
            make.leading.equalToSuperview().offset(horizontalSpacing)
            make.trailing.equalToSuperview().offset(-horizontalSpacing)
            make.bottom.equalToSuperview().offset(-verticalSpacing)
        }
        
        // Padding bên trong container (giống Option 5)
        let innerPadding: CGFloat = isIPad ? 16 : 12
        
        // Product image constraints
        productImageView.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(innerPadding)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(imageSize)
        }
        
        // Product name label constraints
        productNameLabel.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(innerPadding)
            make.leading.equalTo(productImageView.snp.trailing).offset(12)
            make.trailing.lessThanOrEqualTo(moreButton.snp.leading).offset(-8)
        }
        
        // Prices stack view constraints - below product name, full width
        // Increased spacing for better visual hierarchy
        pricesStackView.snp.makeConstraints { make in
            make.top.equalTo(productNameLabel.snp.bottom).offset(8)
            make.leading.equalTo(productNameLabel.snp.leading)
            make.trailing.equalTo(moreButton.snp.leading).offset(-8) // Full width từ leading đến trước moreButton
        }
        
        // Stock label constraints
        // Increased spacing for better separation
        stockLabel.snp.makeConstraints { make in
            make.top.equalTo(pricesStackView.snp.bottom).offset(8)
            make.leading.equalTo(productNameLabel.snp.leading)
            make.trailing.lessThanOrEqualTo(moreButton.snp.leading).offset(-8)
            make.bottom.lessThanOrEqualToSuperview().offset(-innerPadding)
        }
        
        // More button constraints - top-right
        moreButton.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(innerPadding)
            make.trailing.equalToSuperview().offset(-innerPadding)
            make.width.height.equalTo(buttonSize)
        }
        
        // Check indicator dot circle - top-left of product image
        checkIndicatorView.snp.makeConstraints { make in
            make.top.equalTo(productImageView.snp.top).offset(-4)
            make.leading.equalTo(productImageView.snp.leading).offset(-4)
            make.width.height.equalTo(12)
        }
        
        // Only keep tap gesture for image preview
        let imageTap = UITapGestureRecognizer(target: self, action: #selector(imageViewTapped))
        productImageView.addGestureRecognizer(imageTap)
        productImageView.isUserInteractionEnabled = true
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
    func bind(product: Product, searchWords: [String]?) {
        self.product = product
        
        // Product name
        let name = product.name ?? ""
        if let words = searchWords, !words.isEmpty {
            let attributes = NSMutableAttributedString(string: name)
            for word in words {
                let range = (name.lowercased() as NSString).range(of: word.lowercased())
                attributes.addAttribute(.foregroundColor, value: UIColor.blue, range: range)
                attributes.addAttribute(.font, value: Utils.boldFont(size: 16), range: range) // Match AccountViewController text chính size
                attributes.addAttribute(.underlineStyle, value: NSUnderlineStyle.styleSingle.rawValue, range: range)
            }
            productNameLabel.attributedText = attributes
        } else {
            productNameLabel.text = name
        }
        
        // Calculate available quantity
        let availableValue: Int
        if let available = product.available {
            availableValue = available
        } else if let totalStock = product.totalStock, let renting = product.renting {
            availableValue = max(0, totalStock - renting)
        } else {
            availableValue = product.quantity
        }
        
        // Format stock label as "Stock: {stock} • Available: {available}" with colored available
        let totalQuantity = product.quantity.formatStringInCommon()
        let availableText = availableValue.formatStringInCommon()
        
        let stockLabelText = "Stock".localized() + ": \(totalQuantity)"
        let availableLabelText = "Available".localized() + ": \(availableText)"
        let fullStockText = "\(stockLabelText) • \(availableLabelText)"
        let stockAttributedString = NSMutableAttributedString(string: fullStockText)
        
        // Find the range of the available part and color it
        if let availableRange = fullStockText.range(of: availableLabelText) {
            let nsRange = NSRange(availableRange, in: fullStockText)
            stockAttributedString.addAttribute(.foregroundColor, value: APP_TONE_COLOR, range: nsRange)
        }
        
        stockLabel.attributedText = stockAttributedString
        
        // Rent price value
        let rentPrice = product.rentPrice ?? product.rent
        rentPriceValueLabel.text = rentPrice.formatStringInCommon()
        
        // Sale price value
        let salePrice = product.salePrice ?? product.sale
        salePriceValueLabel.text = salePrice.formatStringInCommon()
        
        // Product image
        let processor = RoundCornerImageProcessor(cornerRadius: 8)
        productImageView.kf.setImage(
            with: URL(string: product.image_url ?? ""),
            placeholder: UIImage(named: "no-image"),
            options: [
                .processor(processor),
                .transition(.fade(0.1))
            ]
        )
//        productImageView.image = UIImage(named: "product_\(Int.random(in: 1...8))")
    }
    
    // MARK: - Public Methods
    func setupMoreButtonMenu(menu: UIMenu) {
        moreButton.menu = menu
        moreButton.showsMenuAsPrimaryAction = true
    }
    
    // Add similarity info to stock label (for image search results)
    func addSimilarityToStockLabel(similarity: Int) {
        guard let currentAttributedText = stockLabel.attributedText else { return }
        let currentText = currentAttributedText.string
        let similarityText = String(format: " • Similarity: %d%%".localized(), similarity)
        let fullText = currentText + similarityText
        
        let attributedString = NSMutableAttributedString(attributedString: currentAttributedText)
        attributedString.append(NSAttributedString(string: similarityText))
        
        // Color similarity part
        if let similarityRange = fullText.range(of: similarityText) {
            let nsRange = NSRange(similarityRange, in: fullText)
            attributedString.addAttribute(.foregroundColor, value: UIColor.systemGreen, range: nsRange)
            attributedString.addAttribute(.font, value: Utils.boldFont(size: 14), range: nsRange)
        }
        
        stockLabel.attributedText = attributedString
    }
    
    // Show/hide check indicator dot circle
    func showCheckIndicator(_ show: Bool = true) {
        checkIndicatorView.isHidden = !show
    }
    
    // MARK: - Actions
    @objc private func moreButtonTapped() {
        // Fallback if menu is not set (backward compatibility)
        guard let product = product else { return }
        delegate?.more(product: product, sender: self)
    }
    
    @objc private func imageViewTapped() {
        guard let product = product else { return }
        delegate?.viewImage(sender: product)
    }
}
