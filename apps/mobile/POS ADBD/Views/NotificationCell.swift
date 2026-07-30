//
//  NotificationCell.swift
//  POS ADBD
//

import Foundation
import UIKit
import SnapKit

final class NotificationCell: UITableViewCell {

    private lazy var containerView: UIView = {
        let view = UIView()
        view.backgroundColor = .white
        view.layer.cornerRadius = 10
        view.layer.borderWidth = 0.5
        view.layer.borderColor = UIColor.separator.withAlphaComponent(0.25).cgColor
        return view
    }()

    private lazy var unreadDotView: UIView = {
        let view = UIView()
        view.backgroundColor = .brandPrimary
        view.layer.cornerRadius = 4
        return view
    }()

    private lazy var iconImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.tintColor = .brandPrimary
        imageView.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 18, weight: .medium)
        return imageView
    }()

    private lazy var titleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 15)
        label.textColor = .textPrimary
        label.numberOfLines = 2
        return label
    }()

    private lazy var bodyLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 13)
        label.textColor = .textSecondary
        label.numberOfLines = 3
        return label
    }()

    private lazy var timeLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 12)
        label.textColor = .textTertiary
        label.setContentCompressionResistancePriority(.required, for: .horizontal)
        return label
    }()

    private lazy var titleRowStack: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [titleLabel, timeLabel])
        stack.axis = .horizontal
        stack.alignment = .top
        stack.spacing = 8
        stack.distribution = .fill
        return stack
    }()

    private lazy var textStack: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [titleRowStack, bodyLabel])
        stack.axis = .vertical
        stack.spacing = 4
        stack.alignment = .fill
        return stack
    }()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        backgroundColor = .clear
        selectionStyle = .default

        contentView.addSubview(containerView)
        containerView.addSubview(unreadDotView)
        containerView.addSubview(iconImageView)
        containerView.addSubview(textStack)

        containerView.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(6)
            make.leading.equalToSuperview().offset(12)
            make.trailing.equalToSuperview().offset(-12)
            make.bottom.equalToSuperview().offset(-6)
        }

        unreadDotView.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(12)
            make.centerY.equalTo(iconImageView)
            make.width.height.equalTo(8)
        }

        iconImageView.snp.makeConstraints { make in
            make.leading.equalTo(unreadDotView.snp.trailing).offset(8)
            make.top.equalToSuperview().offset(14)
            make.width.height.equalTo(22)
        }

        textStack.snp.makeConstraints { make in
            make.leading.equalTo(iconImageView.snp.trailing).offset(10)
            make.trailing.equalToSuperview().offset(-12)
            make.top.equalToSuperview().offset(12)
            make.bottom.equalToSuperview().offset(-12)
        }
    }

    func configure(with notification: InboxNotification) {
        titleLabel.text = notification.title
        bodyLabel.text = notification.displayBody
        timeLabel.text = Self.relativeTime(from: notification.createdAtDate)

        let isUnread = !notification.isRead
        unreadDotView.isHidden = !isUnread
        titleLabel.font = isUnread ? Utils.boldFont(size: 15) : Utils.mediumFont(size: 15)
        containerView.backgroundColor = isUnread
            ? UIColor.brandPrimary.withAlphaComponent(0.06)
            : .white

        let symbolName: String
        switch notification.type {
        case "ORDER_CREATED":
            symbolName = "plus.circle.fill"
        case "ORDER_STATUS_CHANGED":
            symbolName = "arrow.triangle.2.circlepath"
        default:
            symbolName = "bell.fill"
        }
        iconImageView.image = UIImage(systemName: symbolName)
    }

    private static func relativeTime(from date: Date?) -> String {
        guard let date else { return "" }
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}
