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

    private lazy var customerLoyaltyLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 12)
        label.textColor = .systemBlue
        label.numberOfLines = 1
        return label
    }()
    
    
    private lazy var labelsStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [customerNameLabel, customerLoyaltyLabel, customerPhoneLabel])
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
        customerLoyaltyLabel.text = customer.loyaltySummaryText
        customerLoyaltyLabel.isHidden = customer.loyaltySummaryText == nil
        
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
