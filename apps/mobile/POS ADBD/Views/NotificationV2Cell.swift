//
//  NotificationV2Cell.swift
//  POS ADBD
//
//  Inbox row of the new UI (#477, board TB-thong-bao): 40pt type tile, 16pt title, 15pt body,
//  14pt time, 9pt unread dot and a very light blue row while unread.
//  #482: title and body wrap in full (no line limit, no ellipsis); a long unbroken word wraps too.
//

import UIKit
import SnapKit

final class NotificationV2Cell: UITableViewCell {
    static let reuseId = "NotificationV2Cell"

    private let tile = UIView()
    private let iconView = UIImageView()
    private let titleLabel = V2.label(size: 16, weight: .bold, lines: 0)
    private let timeLabel = V2.label(size: DS.TextSize.secondary, color: UIColor(hexString: "64748B"))
    private let bodyLabel = V2.label(size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
    private let dot = UIView()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none

        tile.layer.cornerRadius = DS.Radius.card
        iconView.contentMode = .center
        tile.addSubview(iconView)
        iconView.snp.makeConstraints { make in make.center.equalToSuperview() }

        // Word wrap breaks a word longer than the line at a character, so nothing is cut (#482)
        titleLabel.lineBreakMode = .byWordWrapping
        bodyLabel.lineBreakMode = .byWordWrapping
        titleLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        timeLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        timeLabel.setContentHuggingPriority(.required, for: .horizontal)
        timeLabel.font = UIFont.monospacedDigitSystemFont(ofSize: DS.TextSize.secondary, weight: .regular)
        bodyLabel.font = Utils.regularFont(size: DS.TextSize.body)

        let titleRow = UIStackView(arrangedSubviews: [titleLabel, timeLabel])
        titleRow.spacing = DS.Spacing.sm
        titleRow.alignment = .firstBaseline
        let text = UIStackView(arrangedSubviews: [titleRow, bodyLabel])
        text.axis = .vertical
        text.spacing = 3

        dot.layer.cornerRadius = 4.5
        let line = V2.divider()

        [tile, text, dot, line].forEach(contentView.addSubview)
        tile.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(14)
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.size.equalTo(40)
        }
        text.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(14)
            make.leading.equalTo(tile.snp.trailing).offset(DS.Spacing.md)
            make.bottom.equalToSuperview().offset(-14)
            // 14 + 40 + 14 = the 68pt minimum row; the row is never shorter than the type tile
            make.height.greaterThanOrEqualTo(40)
        }
        dot.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(21)
            make.leading.equalTo(text.snp.trailing).offset(DS.Spacing.md)
            make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
            make.size.equalTo(9)
        }
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        // #533: never put SnapKit constraints on contentView itself. SnapKit turns off its
        // translatesAutoresizingMaskIntoConstraints, the table can no longer pin its width, and the
        // labels measure one line as wide as the whole text (right edge ~1500pt on a 402pt screen).
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func configure(with notification: InboxNotification) {
        let kind = NotificationsLogic.kind(type: notification.type, status: notification.data?.status)
        let colors = NotificationsLogic.colors(for: kind)
        tile.backgroundColor = colors.fill
        iconView.tintColor = colors.text
        iconView.image = DS.symbol(NotificationsLogic.symbol(for: kind), DS.Icon.md) ?? DS.symbol("bell", DS.Icon.md)

        let style = NotificationsLogic.rowStyle(isRead: notification.isRead)
        titleLabel.text = notification.title
        titleLabel.font = style.titleBold ? Utils.boldFont(size: 16) : Utils.mediumFont(size: 16)
        titleLabel.textColor = UIColor(hexString: style.titleHex)
        bodyLabel.text = notification.displayBody
        timeLabel.text = NotificationsLogic.time(notification.createdAtDate)
        dot.backgroundColor = style.showsDot ? DS.Color.primary : .clear
        contentView.backgroundColor = UIColor(hexString: style.backgroundHex)
        backgroundColor = contentView.backgroundColor

        accessibilityLabel = [notification.title, notification.displayBody, timeLabel.text]
            .compactMap { $0 }.joined(separator: ", ")
        accessibilityValue = notification.isRead ? nil : "notifications.v2.unreadA11y".localized()
        isAccessibilityElement = true
    }

    override func setHighlighted(_ highlighted: Bool, animated: Bool) {
        super.setHighlighted(highlighted, animated: animated)
        contentView.alpha = highlighted ? 0.7 : 1
    }
}
