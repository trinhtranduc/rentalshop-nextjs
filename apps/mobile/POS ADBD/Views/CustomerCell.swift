//
//  CustomerCell.swift
//  POS ADBD
//
//  Created by Tran Trinh on 11/13/19.
//  Copyright © 2019 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import Kingfisher
import SnapKit

protocol CustomerCellDelegate: AnyObject {
    func more(user: Customer?, sender: CustomerCell)
}

class CustomerCell: UITableViewCell {
    
    // MARK: - UI Components
    private lazy var nameLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular

        label.font = Utils.regularFont(size: isIPad ? 18 : 16)
        label.textColor = .black
        return label
    }()
    
    private lazy var phoneLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular

        label.font = Utils.regularFont(size: isIPad ? 16 : 14)
        label.textColor = .gray
        return label
    }()

    private lazy var loyaltyLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular

        label.font = Utils.mediumFont(size: isIPad ? 14 : 12)
        label.textColor = .systemBlue
        label.numberOfLines = 1
        return label
    }()
    
    var moreButton: UIButton = {
        let button = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 20, weight: .medium)
        let image = UIImage(systemName: "ellipsis", withConfiguration: config)
        button.setImage(image, for: .normal)
        button.tintColor = .gray
        button.addTarget(self, action: #selector(moreButtonTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var avatarImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFill
        imageView.tintColor = .lightGray
        return imageView
    }()
    
    private lazy var labelsStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [nameLabel, loyaltyLabel, phoneLabel])
        stack.axis = .vertical
        stack.spacing = 4
        stack.alignment = .leading
        return stack
    }()
    
    // MARK: - Properties
    weak var delegate: CustomerCellDelegate?
    private var user: Customer?
    
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
        // Add subviews
        contentView.addSubview(avatarImageView)
        contentView.addSubview(labelsStackView)
        contentView.addSubview(moreButton)
        
        // Setup constraints
        avatarImageView.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(16)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(50)
        }
        
        labelsStackView.snp.makeConstraints { make in
            make.leading.equalTo(avatarImageView.snp.trailing).offset(12)
            make.centerY.equalToSuperview()
            make.trailing.lessThanOrEqualTo(moreButton.snp.leading).offset(-12)
        }
        
        moreButton.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-16)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(44)
        }
    }
    
    // MARK: - Configuration
    func bind(user: Customer) {
        self.user = user
        nameLabel.text = user.full_name
        phoneLabel.text = user.phone
        loyaltyLabel.text = user.loyaltyStatusText
        loyaltyLabel.textColor = user.loyaltyStatus == .active ? .systemBlue : .systemGray
        loyaltyLabel.isHidden = user.loyaltyStatusText == nil
        
        if let avatar = user.avatar, let url = URL(string: avatar) {
            avatarImageView.kf.setImage(
                with: url,
                placeholder: UIImage(named: "ic_customer_empty"),
                options: [.transition(.fade(0.1))]
            )
        } else {
            avatarImageView.image = UIImage(named: "ic_customer_empty")
        }
    }
    
    func bind(user: Customer, searchWords: [String]?) {
        self.user = user
        phoneLabel.text = user.phone
        loyaltyLabel.text = user.loyaltyStatusText
        loyaltyLabel.textColor = user.loyaltyStatus == .active ? .systemBlue : .systemGray
        loyaltyLabel.isHidden = user.loyaltyStatusText == nil
        
        if let words = searchWords, let name = user.full_name {
            let attributes = NSMutableAttributedString(string: name)
            for word in words {
                let range = (name.lowercased() as NSString).range(of: word)
                attributes.addAttributes([
                    .foregroundColor: UIColor.blue,
                    .font: Utils.boldFont(size: 16),
                    .underlineStyle: NSUnderlineStyle.styleSingle.rawValue
                ], range: range)
            }
            nameLabel.attributedText = attributes
        } else {
            nameLabel.text = user.full_name
        }
        
        // Set avatar image
        if let avatar = user.avatar, let url = URL(string: avatar) {
            avatarImageView.kf.setImage(
                with: url,
                placeholder: UIImage(named: "ic_customer_empty"),
                options: [.transition(.fade(0.1))]
            )
        } else {
            avatarImageView.image = UIImage(named: "ic_customer_empty")
        }
    }
    
    // MARK: - Actions
    @objc private func moreButtonTapped() {
        delegate?.more(user: user, sender: self)
    }
}
