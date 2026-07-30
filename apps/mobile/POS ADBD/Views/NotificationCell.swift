//
//  NotificationCell.swift
//  POS ADBD
//

import Foundation
import UIKit
import SnapKit

final class NotificationCell: UITableViewCell {

    private lazy var unreadDotView: UIView = {
        let view = UIView()
        view.backgroundColor = .brandPrimary
        view.layer.cornerRadius = 3.5
        return view
    }()

    private lazy var iconImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.tintColor = .brandPrimary
        imageView.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 15, weight: .medium)
        return imageView
    }()

    private lazy var titleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 14)
        label.textColor = .textPrimary
        label.numberOfLines = 1
        label.lineBreakMode = .byTruncatingTail
        return label
    }()

    private lazy var bodyLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 12)
        label.textColor = .textSecondary
        label.numberOfLines = 2
        label.lineBreakMode = .byTruncatingTail
        return label
    }()

    private lazy var timeLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 11)
        label.textColor = .textTertiary
        label.setContentCompressionResistancePriority(.required, for: .horizontal)
        label.setContentHuggingPriority(.required, for: .horizontal)
        return label
    }()

    private lazy var titleRowStack: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [titleLabel, timeLabel])
        stack.axis = .horizontal
        stack.alignment = .firstBaseline
        stack.spacing = 6
        stack.distribution = .fill
        return stack
    }()

    private lazy var textStack: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [titleRowStack, bodyLabel])
        stack.axis = .vertical
        stack.spacing = 2
        stack.alignment = .fill
        return stack
    }()

    private lazy var separatorView: UIView = {
        let view = UIView()
        view.backgroundColor = UIColor.separator.withAlphaComponent(0.35)
        return view
    }()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        backgroundColor = .white
        contentView.backgroundColor = .white
        selectionStyle = .default

        contentView.addSubview(unreadDotView)
        contentView.addSubview(iconImageView)
        contentView.addSubview(textStack)
        contentView.addSubview(separatorView)

        unreadDotView.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(12)
            make.centerY.equalTo(iconImageView)
            make.width.height.equalTo(7)
        }

        iconImageView.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(28)
            make.top.equalToSuperview().offset(10)
            make.width.height.equalTo(18)
        }

        textStack.snp.makeConstraints { make in
            make.leading.equalTo(iconImageView.snp.trailing).offset(8)
            make.trailing.equalToSuperview().offset(-12)
            make.top.equalToSuperview().offset(8)
            make.bottom.equalToSuperview().offset(-8)
        }

        separatorView.snp.makeConstraints { make in
            make.leading.equalTo(textStack)
            make.trailing.equalToSuperview()
            make.bottom.equalToSuperview()
            make.height.equalTo(1.0 / UIScreen.main.scale)
        }
    }

    func configure(with notification: InboxNotification) {
        titleLabel.text = notification.title
        bodyLabel.text = notification.displayBody
        timeLabel.text = Self.relativeTime(from: notification.createdAtDate)

        let isUnread = !notification.isRead
        unreadDotView.isHidden = !isUnread
        titleLabel.font = isUnread ? Utils.boldFont(size: 14) : Utils.mediumFont(size: 14)
        contentView.backgroundColor = isUnread
            ? UIColor.brandPrimary.withAlphaComponent(0.04)
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
