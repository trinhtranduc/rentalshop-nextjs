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
        label.lineBreakMode = .byTruncatingTail
        // Name yields to the points badge when space is tight.
        label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        label.setContentHuggingPriority(.defaultLow, for: .horizontal)
        return label
    }()
    
    private lazy var phoneLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular

        label.font = Utils.regularFont(size: isIPad ? 16 : 14)
        label.textColor = .gray
        // Phone yields horizontal space so the tier pill keeps its full text.
        label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        label.setContentHuggingPriority(.defaultLow, for: .horizontal)
        return label
    }()

    // MARK: Points badge — "⭐ 1,250 điểm"
    private lazy var pointsIconView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.image = UIImage(systemName: "star.fill")
        imageView.tintColor = .systemBlue
        return imageView
    }()

    private lazy var pointsLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular

        label.font = Utils.mediumFont(size: isIPad ? 15 : 13)
        label.textColor = .systemBlue
        label.numberOfLines = 1
        return label
    }()

    private lazy var pointsBadge: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [pointsIconView, pointsLabel])
        stack.axis = .horizontal
        stack.spacing = 3
        stack.alignment = .center
        stack.isLayoutMarginsRelativeArrangement = true
        stack.layoutMargins = UIEdgeInsets(top: 3, left: 8, bottom: 3, right: 8)
        // Points must never be squeezed out by a long name.
        stack.setContentHuggingPriority(.required, for: .horizontal)
        stack.setContentCompressionResistancePriority(.required, for: .horizontal)
        return stack
    }()

    private lazy var pointsBadgeView: UIView = {
        let view = UIView()
        view.layer.cornerRadius = 11
        view.layer.masksToBounds = true
        view.layer.borderWidth = 1
        view.layer.borderColor = UIColor.systemBlue.withAlphaComponent(0.18).cgColor
        view.backgroundColor = UIColor.systemBlue.withAlphaComponent(0.08)
        view.setContentHuggingPriority(.required, for: .horizontal)
        view.setContentCompressionResistancePriority(.required, for: .horizontal)
        return view
    }()

    private lazy var phoneIconView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.image = UIImage(systemName: "phone.fill")
        imageView.tintColor = .systemGray
        return imageView
    }()

    // MARK: Tier pill (line 2, leading) — "◆ Vàng"
    private lazy var tierIconImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.tintColor = .systemBlue
        return imageView
    }()

    private lazy var tierNameLabel: UILabel = {
        let label = UILabel()
        let isIPad = traitCollection.horizontalSizeClass == .regular

        label.font = Utils.mediumFont(size: isIPad ? 14 : 12)
        label.textColor = .systemBlue
        label.numberOfLines = 1
        return label
    }()

    private lazy var tierPillStack: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [tierIconImageView, tierNameLabel])
        stack.axis = .horizontal
        stack.spacing = 4
        stack.alignment = .center
        stack.isLayoutMarginsRelativeArrangement = true
        stack.layoutMargins = UIEdgeInsets(top: 2, left: 8, bottom: 2, right: 8)
        return stack
    }()

    private lazy var tierPillView: UIView = {
        let view = UIView()
        view.layer.cornerRadius = 11
        view.layer.masksToBounds = true
        view.layer.borderWidth = 1
        view.layer.borderColor = UIColor.systemBlue.withAlphaComponent(0.22).cgColor
        view.backgroundColor = UIColor.systemBlue.withAlphaComponent(0.10)
        // Keep the pill sized to its text; don't let it stretch or truncate.
        view.setContentHuggingPriority(.required, for: .horizontal)
        view.setContentCompressionResistancePriority(.required, for: .horizontal)
        return view
    }()

    // MARK: Row containers
    private lazy var topRowStack: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [nameLabel, UIView()])
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .center
        return stack
    }()

    private lazy var bottomRowStack: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [tierPillView, pointsBadgeView])
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .center
        return stack
    }()

    private lazy var phoneRowStack: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [phoneIconView, phoneLabel])
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
        let stack = UIStackView(arrangedSubviews: [topRowStack, bottomRowStack, phoneRowStack])
        stack.axis = .vertical
        stack.spacing = 6
        // Keep rows left-aligned so the tier/points chips size to their content.
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
        pointsLabel.text = nil
        tierNameLabel.text = nil
        tierIconImageView.image = nil
        tierPillView.isHidden = true
        pointsBadgeView.isHidden = true
        phoneRowStack.isHidden = false
        avatarImageView.image = UIImage(named: "ic_customer_empty")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        contentView.frame = bounds
    }
    
    // MARK: - Setup
    private func setupUI() {
        // Add subviews
        contentView.addSubview(avatarImageView)
        contentView.addSubview(labelsStackView)
        contentView.addSubview(moreButton)
        tierPillView.addSubview(tierPillStack)
        pointsBadgeView.addSubview(pointsBadge)

        // Setup constraints
        avatarImageView.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(16)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(56)
        }

        labelsStackView.snp.makeConstraints { make in
            make.leading.equalTo(avatarImageView.snp.trailing).offset(12)
            make.centerY.equalToSuperview()
            make.trailing.lessThanOrEqualTo(moreButton.snp.leading).offset(-12)
        }

        phoneIconView.snp.makeConstraints { make in
            make.width.height.equalTo(14)
        }

        pointsIconView.snp.makeConstraints { make in
            make.width.height.equalTo(13)
        }

        tierIconImageView.snp.makeConstraints { make in
            make.width.height.equalTo(13)
        }

        tierPillStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }

        pointsBadge.snp.makeConstraints { make in
            make.edges.equalToSuperview()
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
        let state = user.loyaltyDisplayState

        // No loyalty at all → line 2 is just the phone, exactly like a plain customer.
        guard state != .none, let levelName = user.loyaltyDisplayLevelName else {
            pointsBadgeView.isHidden = true
            tierPillView.isHidden = true
            phoneRowStack.isHidden = phoneLabel.text?.isEmpty ?? true
            return
        }

        // Accent color now comes from the local loyalty level map so the UI stays consistent.
        let accent: UIColor = user.loyaltyDisplayAccentColor ?? .systemBlue

        // Tier pill (line 2, leading)
        tierPillView.isHidden = false
        tierNameLabel.text = levelName
        tierNameLabel.textColor = accent
        tierIconImageView.image = UIImage(systemName: loyaltyIconName(for: user))
        tierIconImageView.tintColor = accent
        tierPillView.backgroundColor = accent.withAlphaComponent(0.10)
        tierPillView.layer.borderColor = accent.withAlphaComponent(0.22).cgColor

        // Points badge should always render for loyalty rows so reused cells never look stale.
        let points = user.loyaltyDisplayPoints ?? 0
        let pointsText = NumberFormatter.localizedString(from: NSNumber(value: points), number: .decimal)
        pointsLabel.text = "\(pointsText) đ"
        pointsLabel.textColor = accent
        pointsIconView.tintColor = accent
        pointsBadgeView.isHidden = false
        pointsBadgeView.backgroundColor = accent.withAlphaComponent(0.08)
        pointsBadgeView.layer.borderColor = accent.withAlphaComponent(0.18).cgColor

        phoneRowStack.isHidden = phoneLabel.text?.isEmpty ?? true
    }

    func loyaltyIconName(for user: Customer) -> String {
        return user.loyaltyDisplayIconName ?? "person.fill"
    }
    
    // MARK: - Actions
    @objc private func moreButtonTapped() {
        delegate?.more(user: user, sender: self)
    }
}
