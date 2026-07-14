//
//  UserCell.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-XX.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import SnapKit

protocol UserCellDelegate: AnyObject {
    func more(user: User?, sender: UserCell)
}

class UserCell: UITableViewCell {
    
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
    
    private lazy var nameLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.regularFont(size: isIPad ? 18 : 16)
        label.textColor = .textPrimary
        label.numberOfLines = 2
        return label
    }()
    
    private lazy var emailLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.regularFont(size: isIPad ? 16 : 14)
        label.textColor = .textSecondary
        return label
    }()
    
    private lazy var roleLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.regularFont(size: isIPad ? 16 : 14)
        label.textColor = .systemBlue
        return label
    }()
    
    private lazy var outletLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.regularFont(size: isIPad ? 16 : 14)
        label.textColor = .textSecondary
        label.numberOfLines = 2
        return label
    }()
    
    private lazy var statusLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        label.font = Utils.mediumFont(size: isIPad ? 14 : 12)
        label.textAlignment = .center
        label.layer.cornerRadius = 4
        label.clipsToBounds = true
        return label
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
    
    private lazy var avatarImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFill
        imageView.layer.cornerRadius = 25
        imageView.clipsToBounds = true
        imageView.backgroundColor = .systemGray6
        imageView.image = UIImage(systemName: "person.circle.fill")
        imageView.tintColor = .systemGray
        return imageView
    }()
    
    
    private lazy var labelsStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [emailLabel, roleLabel, outletLabel])
        stack.axis = .vertical
        stack.spacing = 4
        stack.alignment = .leading
        return stack
    }()
    
    // MARK: - Properties
    weak var delegate: UserCellDelegate?
    private var user: User?
    
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
        backgroundColor = .clear // Clear background để card style nổi bật
        selectionStyle = .default
        
        // Add container view first
        contentView.addSubview(containerView)
        
        // Add subviews to container
        containerView.addSubview(avatarImageView)
        containerView.addSubview(nameLabel)
        containerView.addSubview(statusLabel)
        containerView.addSubview(labelsStackView)
        containerView.addSubview(moreButton)
        
        // Make sure more button is always visible and properly sized
        moreButton.isHidden = false
        moreButton.isUserInteractionEnabled = true
        
        // Adjust sizes based on device
        let isIPad = traitCollection.horizontalSizeClass == .regular
        let avatarSize: CGFloat = isIPad ? 60 : 50
        let buttonSize: CGFloat = isIPad ? 44 : 36
        let horizontalSpacing: CGFloat = isIPad ? 12 : 12
        let verticalSpacing: CGFloat = isIPad ? 6 : 6
        
        // Container view constraints - Card style với spacing
        containerView.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(verticalSpacing)
            make.leading.equalToSuperview().offset(horizontalSpacing)
            make.trailing.equalToSuperview().offset(-horizontalSpacing)
            make.bottom.equalToSuperview().offset(-verticalSpacing)
        }
        
        // Padding bên trong container
        let innerPadding: CGFloat = isIPad ? 16 : 12
        
        // Avatar image constraints
        avatarImageView.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(innerPadding)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(avatarSize)
        }
        
        // Name label constraints - top row, left side
        nameLabel.snp.makeConstraints { make in
            make.leading.equalTo(avatarImageView.snp.trailing).offset(12)
            make.top.equalToSuperview().offset(innerPadding)
            make.trailing.lessThanOrEqualTo(statusLabel.snp.leading).offset(-8)
        }
        
        // Status label constraints - Badge style at top right
        statusLabel.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(innerPadding)
            make.trailing.equalTo(moreButton.snp.leading).offset(-8)
            make.height.equalTo(20)
            make.width.greaterThanOrEqualTo(50)
        }
        statusLabel.setContentHuggingPriority(.required, for: .horizontal)
        nameLabel.setContentHuggingPriority(.defaultLow, for: .horizontal)
        
        // Labels stack view constraints - below name row
        labelsStackView.snp.makeConstraints { make in
            make.leading.equalTo(avatarImageView.snp.trailing).offset(12)
            make.top.equalTo(nameLabel.snp.bottom).offset(4)
            make.trailing.lessThanOrEqualTo(moreButton.snp.leading).offset(-8)
            make.bottom.lessThanOrEqualToSuperview().offset(-innerPadding)
        }
        
        // More button constraints - center right
        moreButton.snp.makeConstraints { make in
            make.centerY.equalToSuperview()
            make.trailing.equalToSuperview().offset(-innerPadding)
            make.width.height.equalTo(buttonSize)
        }
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
    
    // MARK: - Configuration
    func bind(user: User, searchWords: [String]? = nil) {
        self.user = user
        
        // Name with search highlighting
        let name = user.fullName ?? user.email ?? "Unknown"
        if let words = searchWords, !words.isEmpty {
            let attributes = NSMutableAttributedString(string: name)
            for word in words {
                let range = (name.lowercased() as NSString).range(of: word.lowercased())
                attributes.addAttributes([
                    .foregroundColor: UIColor.blue,
                    .font: Utils.boldFont(size: 16),
                    .underlineStyle: NSUnderlineStyle.styleSingle.rawValue
                ], range: range)
            }
            nameLabel.attributedText = attributes
        } else {
            nameLabel.text = name
        }
        
        // Email
        emailLabel.text = user.email
        
        // Role
        roleLabel.text = user.role.displayName
        
        // Outlet
        if let outletName = user.outlet?.name {
            outletLabel.text = String(format: "Outlet: %@".localized(), outletName)
            outletLabel.isHidden = false
        } else {
            outletLabel.isHidden = true
        }
        
        // Status - Always show status with badge style
        if user.isActive {
            statusLabel.text = "  Active  ".localized() // Add spaces for padding
            statusLabel.textColor = .white
            statusLabel.backgroundColor = UIColor.systemGreen
            statusLabel.layer.cornerRadius = 4
            statusLabel.textAlignment = .center
            nameLabel.alpha = 1.0
            emailLabel.alpha = 1.0
            roleLabel.alpha = 1.0
        } else {
            statusLabel.text = "  Disabled  ".localized() // Add spaces for padding
            statusLabel.textColor = .white
            statusLabel.backgroundColor = UIColor.systemRed
            statusLabel.layer.cornerRadius = 4
            statusLabel.textAlignment = .center
            nameLabel.alpha = 0.6
            emailLabel.alpha = 0.6
            roleLabel.alpha = 0.6
        }
        statusLabel.isHidden = false
    }
    
    // MARK: - Public Methods
    func setupMoreButtonMenu(menu: UIMenu) {
        moreButton.menu = menu
        moreButton.showsMenuAsPrimaryAction = true
    }
    
    // MARK: - Actions
    @objc private func moreButtonTapped() {
        // Fallback if menu is not set (backward compatibility)
        guard let user = user else { return }
        delegate?.more(user: user, sender: self)
    }
}

