//
//  MainCustomerView.swift
//  POS ADBD
//
//  Created by Tran Trinh on 12/19/19.
//  Copyright © 2019 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import Kingfisher
import SnapKit

protocol InfoCustomerViewDelegate: AnyObject {
    func infoView(sender: InfoCustomerView)
}

class InfoCustomerView: UIView {
    // MARK: - Properties
    weak var delegate: InfoCustomerViewDelegate?
    var customer: Customer?
    
    // Expose infoButton for menu setup
    lazy var infoButton: UIButton = {
        let button = UIButton(type: .system)
        button.setImage(UIImage(named: "ic_more"), for: .normal)
        button.tintColor = .systemGray
        button.showsMenuAsPrimaryAction = true
        // Keep target for backward compatibility if menu is not set
        button.addTarget(self, action: #selector(infoButtonTapped), for: .touchUpInside)
        return button
    }()
    
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
    
    private lazy var customerAvatar: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.image = UIImage(systemName: "person.circle.fill")
        imageView.tintColor = .systemGray
        return imageView
    }()
    
    private lazy var customerNameLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 15)
        label.textColor = .black
        return label
    }()
    
    private lazy var customerPhoneLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 13)
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

    private lazy var customerLoyaltyLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 12)
        label.textColor = .systemBlue
        label.numberOfLines = 1
        return label
    }()

    private lazy var customerPointLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 12)
        label.textColor = .gray
        label.numberOfLines = 1
        return label
    }()

    private lazy var loyaltyStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [loyaltyIconView, customerLoyaltyLabel, customerPointLabel])
        stack.axis = .horizontal
        stack.spacing = 6
        stack.alignment = .center
        return stack
    }()
    
    
    private lazy var labelsStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [customerNameLabel, loyaltyStackView, customerPhoneLabel])
        stack.axis = .vertical
        stack.spacing = 4
        stack.alignment = .leading
        return stack
    }()
    
    // MARK: - Initialization
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    // MARK: - Setup
    private func setupUI() {
        addSubview(containerView)
        containerView.addSubview(customerAvatar)
        containerView.addSubview(labelsStackView)
        containerView.addSubview(infoButton)
        loyaltyIconView.addSubview(loyaltyIconImageView)
        
        // Container view - Card style full width
        containerView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        // Avatar — fixed size so card height stays compact and matches header constraint
        customerAvatar.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(12)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(50)
        }
        
        // Labels stack - with increased top and bottom padding
        labelsStackView.snp.makeConstraints { make in
            make.leading.equalTo(customerAvatar.snp.trailing).offset(12)
            make.top.equalToSuperview().offset(8)
            make.bottom.equalToSuperview().offset(-8)
            make.trailing.lessThanOrEqualTo(infoButton.snp.leading).offset(-8)
        }

        loyaltyIconView.snp.makeConstraints { make in
            make.width.height.equalTo(18)
        }

        loyaltyIconImageView.snp.makeConstraints { make in
            make.center.equalToSuperview()
            make.width.height.equalTo(10)
        }
        
        // Info button
        infoButton.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-12)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(36)
        }
    }
    
    // MARK: - Public Methods
    func bind(customer: Customer) {
        self.customer = customer
        customerNameLabel.text = customer.full_name
        customerPhoneLabel.text = customer.phone
        updateLoyaltyUI(customer: customer)
        
        if let avatar = customer.avatar {
            customerAvatar.kf.setImage(
                with: URL(string: avatar),
                placeholder: UIImage(systemName: "person.circle.fill"),
                options: [.transition(.fade(0.1))]
            )
        } else {
            customerAvatar.image = UIImage(systemName: "person.circle.fill")
            customerAvatar.tintColor = .systemGray
        }
    }

    private func updateLoyaltyUI(customer: Customer) {
        guard let loyaltyStatus = customer.loyaltyStatus else {
            loyaltyStackView.isHidden = true
            return
        }

        loyaltyStackView.isHidden = false

        switch loyaltyStatus {
        case .active:
            let tierName = customer.loyalty?.tier?.name ?? "Hạng khách".localized()
            let points = NumberFormatter.localizedString(from: NSNumber(value: customer.loyalty?.points ?? 0), number: .decimal)
            customerLoyaltyLabel.text = tierName
            customerLoyaltyLabel.textColor = .systemBlue
            customerPointLabel.text = "• \(points) điểm"
            customerPointLabel.textColor = .gray
            loyaltyIconImageView.image = UIImage(systemName: loyaltyIconName(for: customer.loyalty?.tier?.icon, status: loyaltyStatus))

            if let tierColor = customer.loyalty?.tier?.color, let parsed = UIColor(hexString: tierColor) {
                loyaltyIconView.layer.borderColor = parsed.withAlphaComponent(0.22).cgColor
                loyaltyIconView.backgroundColor = parsed.withAlphaComponent(0.10)
                loyaltyIconImageView.tintColor = parsed
            } else {
                loyaltyIconView.layer.borderColor = UIColor.systemBlue.withAlphaComponent(0.18).cgColor
                loyaltyIconView.backgroundColor = UIColor.systemBlue.withAlphaComponent(0.08)
                loyaltyIconImageView.tintColor = .systemBlue
            }
        case .inactive:
            customerLoyaltyLabel.text = "Loyalty chưa kích hoạt"
            customerLoyaltyLabel.textColor = .systemGray
            customerPointLabel.text = nil
            loyaltyIconImageView.image = UIImage(systemName: "sparkles")
            loyaltyIconView.layer.borderColor = UIColor.systemGray.withAlphaComponent(0.20).cgColor
            loyaltyIconView.backgroundColor = UIColor.systemGray.withAlphaComponent(0.08)
            loyaltyIconImageView.tintColor = .systemGray
        case .unavailable:
            customerLoyaltyLabel.text = "Loyalty không khả dụng"
            customerLoyaltyLabel.textColor = .systemGray
            customerPointLabel.text = nil
            loyaltyIconImageView.image = UIImage(systemName: "lock.fill")
            loyaltyIconView.layer.borderColor = UIColor.systemGray.withAlphaComponent(0.20).cgColor
            loyaltyIconView.backgroundColor = UIColor.systemGray.withAlphaComponent(0.08)
            loyaltyIconImageView.tintColor = .systemGray
        }
    }

    private func loyaltyIconName(for icon: String?, status: CustomerLoyaltyStatus) -> String {
        guard status == .active else { return "sparkles" }

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
    
    func setupMoreButtonMenu(menu: UIMenu) {
        infoButton.menu = menu
        infoButton.showsMenuAsPrimaryAction = true
    }
    
    // MARK: - Actions
    @objc private func infoButtonTapped() {
        // Fallback if menu is not set (backward compatibility)
        delegate?.infoView(sender: self)
    }
}
