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

    private lazy var loyaltyIconView: UIView = {
        let view = UIView()
        view.layer.cornerRadius = 9
        view.layer.masksToBounds = true
        view.layer.borderWidth = 1
        view.layer.borderColor = UIColor.systemBlue.withAlphaComponent(0.18).cgColor
        view.backgroundColor = UIColor.systemBlue.withAlphaComponent(0.08)
        return view
    }()

    private lazy var loyaltyIconImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.tintColor = .systemBlue
        return imageView
    }()

    private lazy var loyaltyLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular

        label.font = Utils.mediumFont(size: isIPad ? 14 : 12)
        label.textColor = .systemBlue
        label.numberOfLines = 1
        return label
    }()

    private lazy var loyaltyStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [loyaltyIconView, loyaltyLabel])
        stack.axis = .horizontal
        stack.spacing = 6
        stack.alignment = .center
        return stack
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
        let stack = UIStackView(arrangedSubviews: [nameLabel, loyaltyStackView, phoneLabel])
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

    override func prepareForReuse() {
        super.prepareForReuse()
        nameLabel.text = nil
        nameLabel.attributedText = nil
        phoneLabel.text = nil
        loyaltyLabel.text = nil
        loyaltyStackView.isHidden = true
        loyaltyIconImageView.image = nil
        avatarImageView.image = UIImage(named: "ic_customer_empty")
    }
    
    // MARK: - Setup
    private func setupUI() {
        // Add subviews
        contentView.addSubview(avatarImageView)
        contentView.addSubview(labelsStackView)
        contentView.addSubview(moreButton)
        loyaltyIconView.addSubview(loyaltyIconImageView)
        
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

        loyaltyIconView.snp.makeConstraints { make in
            make.width.height.equalTo(18)
        }

        loyaltyIconImageView.snp.makeConstraints { make in
            make.center.equalToSuperview()
            make.width.height.equalTo(10)
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
        updateLoyaltyUI(for: user)
        
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
        updateLoyaltyUI(for: user)
        
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

    private func updateLoyaltyUI(for user: Customer) {
        guard let loyaltyStatusText = user.loyaltyStatusText else {
            loyaltyStackView.isHidden = true
            return
        }

        loyaltyStackView.isHidden = false
        loyaltyLabel.text = loyaltyStatusText
        loyaltyLabel.textColor = user.loyaltyStatus == .active ? .systemBlue : .systemGray

        let iconName = loyaltyIconName(for: user.loyalty?.tier?.icon, status: user.loyaltyStatus)
        loyaltyIconImageView.image = UIImage(systemName: iconName)

        let tintColor: UIColor
        if user.loyaltyStatus == .active, let tierColor = user.loyalty?.tier?.color, let parsed = UIColor(hexString: tierColor) {
            tintColor = parsed
            loyaltyIconView.layer.borderColor = parsed.withAlphaComponent(0.22).cgColor
            loyaltyIconView.backgroundColor = parsed.withAlphaComponent(0.10)
        } else if user.loyaltyStatus == .unavailable {
            tintColor = .systemGray
            loyaltyIconView.layer.borderColor = UIColor.systemGray.withAlphaComponent(0.20).cgColor
            loyaltyIconView.backgroundColor = UIColor.systemGray.withAlphaComponent(0.08)
        } else {
            tintColor = .systemBlue
            loyaltyIconView.layer.borderColor = UIColor.systemBlue.withAlphaComponent(0.18).cgColor
            loyaltyIconView.backgroundColor = UIColor.systemBlue.withAlphaComponent(0.08)
        }

        loyaltyIconImageView.tintColor = tintColor
    }

    private func loyaltyIconName(for icon: String?, status: CustomerLoyaltyStatus?) -> String {
        guard status == .active else {
            return status == .unavailable ? "lock.fill" : "sparkles"
        }

        switch (icon ?? "").lowercased() {
        case "medal":
            return "medal.fill"
        case "award":
            return "rosette"
        case "crown":
            return "crown.fill"
        case "gem":
            return "diamond.fill"
        case "diamond":
            return "diamond.fill"
        case "star":
            return "star.fill"
        case "user":
            fallthrough
        default:
            return "person.fill"
        }
    }
    
    // MARK: - Actions
    @objc private func moreButtonTapped() {
        delegate?.more(user: user, sender: self)
    }
}
