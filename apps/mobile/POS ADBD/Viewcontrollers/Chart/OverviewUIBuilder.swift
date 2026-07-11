//
//  OverviewUIBuilder.swift
//  POS ADBD
//

import UIKit
import SnapKit

enum OverviewUIBuilder {

    enum RankingRowStyle {
        case embedded
        case standalone
    }

    static func revenueDisplayColor(for amount: Double, positiveColor: UIColor = .brandPrimary) -> UIColor {
        // Use semantic danger red — not statusCancelledText-as-badge-white.
        amount < 0 ? .actionDanger : positiveColor
    }

    static func makeSummaryValueLabel(isIPad: Bool) -> UILabel {
        let label = UILabel()
        label.font = .bodyRegular(size: isIPad ? 18 : 16)
        label.textColor = .brandPrimary
        label.text = "0"
        label.adjustsFontSizeToFitWidth = true
        label.minimumScaleFactor = 0.7
        return label
    }

    static func makeSummaryMetricColumnDivider() -> UIView {
        let view = UIView()
        view.backgroundColor = UIColor.borderColor.withAlphaComponent(0.9)
        view.snp.makeConstraints { make in
            make.width.equalTo(1)
        }
        return view
    }

    /// Compact metric: short title on top, value below. Avoids "..." from sideways title+value.
    static func makeSummaryStackedMetric(
        title: String,
        valueLabel: UILabel,
        accessory: UIView?,
        alignment: UIStackView.Alignment
    ) -> UIView {
        let container = UIStackView()
        container.axis = .vertical
        container.spacing = 2
        container.alignment = alignment

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .captionMedium(size: 11)
        titleLabel.textColor = .textTertiary
        titleLabel.numberOfLines = 1
        titleLabel.adjustsFontSizeToFitWidth = true
        titleLabel.minimumScaleFactor = 0.8
        titleLabel.setContentCompressionResistancePriority(.required, for: .vertical)

        let titleRow: UIView
        if let accessory = accessory {
            let row = UIStackView(arrangedSubviews: [titleLabel, accessory, UIView()])
            row.axis = .horizontal
            row.spacing = 2
            row.alignment = .center
            titleRow = row
        } else {
            titleRow = titleLabel
        }

        valueLabel.numberOfLines = 1
        valueLabel.adjustsFontSizeToFitWidth = true
        valueLabel.minimumScaleFactor = 0.7
        valueLabel.setContentCompressionResistancePriority(.required, for: .vertical)

        container.addArrangedSubview(titleRow)
        container.addArrangedSubview(valueLabel)
        return container
    }

    static func makeSummaryStripMetric(
        title: String,
        valueLabel: UILabel,
        metric: OverviewMetric,
        infoTarget: Any?,
        infoAction: Selector
    ) -> UIView {
        // Kept for call-site compatibility; prefer makeSummaryStackedMetric for density.
        return makeSummaryStackedMetric(
            title: title,
            valueLabel: valueLabel,
            accessory: OverviewMetricInfoPresenter.makeInfoButton(
                metric: metric,
                target: infoTarget,
                action: infoAction
            ),
            alignment: .center
        )
    }

    static func makeSummaryMetricTile(
        title: String,
        valueLabel: UILabel,
        tintColor: UIColor
    ) -> UIView {
        let container = UIView()
        container.backgroundColor = .backgroundCard
        container.layer.cornerRadius = 14
        container.layer.borderWidth = 1
        container.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.7).cgColor

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .captionMedium(size: 11)
        titleLabel.textColor = .textSecondary
        titleLabel.numberOfLines = 2
        titleLabel.textAlignment = .left

        valueLabel.textColor = tintColor
        valueLabel.font = .bodyBold(size: 16)

        let stack = UIStackView(arrangedSubviews: [titleLabel, valueLabel])
        stack.axis = .vertical
        stack.spacing = 5
        stack.alignment = .leading

        container.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 11, left: 12, bottom: 11, right: 12))
        }

        return container
    }

    static func makeSnapshotValueLabel(isIPad: Bool) -> UILabel {
        let label = UILabel()
        label.text = "—"
        label.font = .bodyBold(size: isIPad ? 28 : 26)
        label.textColor = .textPrimary
        label.numberOfLines = 1
        label.adjustsFontSizeToFitWidth = true
        label.minimumScaleFactor = 0.72
        label.allowsDefaultTighteningForTruncation = true
        return label
    }

    static func makeSnapshotItem(
        title: String,
        valueLabel: UILabel,
        backgroundColor: UIColor,
        tintColor: UIColor
    ) -> UIView {
        let container = UIView()
        container.backgroundColor = backgroundColor
        container.layer.cornerRadius = 12
        container.layer.borderWidth = 1
        container.layer.borderColor = tintColor.withAlphaComponent(0.18).cgColor

        let dotView = UIView()
        dotView.backgroundColor = tintColor
        dotView.layer.cornerRadius = 4
        dotView.snp.makeConstraints { make in
            make.width.height.equalTo(8)
        }

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .captionMedium(size: 11)
        titleLabel.textColor = .textSecondary

        let titleRow = UIStackView(arrangedSubviews: [dotView, titleLabel])
        titleRow.axis = .horizontal
        titleRow.spacing = 6
        titleRow.alignment = .center

        valueLabel.textColor = tintColor

        let stack = UIStackView(arrangedSubviews: [titleRow, valueLabel])
        stack.axis = .vertical
        stack.spacing = 8
        stack.alignment = .leading

        container.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 12, bottom: 12, right: 12))
        }
        container.snp.makeConstraints { make in
            make.height.greaterThanOrEqualTo(78)
        }
        return container
    }

    static func makeCompactSnapshotItem(
        title: String,
        valueLabel: UILabel,
        tintColor: UIColor,
        iconSystemName: String
    ) -> UIView {
        let container = UIView()
        // Flat, number-forward style, centered: big dark value on top, then a
        // centered "[icon] label" row underneath. The number stays dark for
        // readability; the icon carries the semantic status colour so rows are
        // scannable without turning every number into a colour.
        container.backgroundColor = .clear

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .captionMedium(size: 12)
        titleLabel.textColor = .textSecondary
        titleLabel.numberOfLines = 1
        titleLabel.adjustsFontSizeToFitWidth = true
        titleLabel.minimumScaleFactor = 0.8

        let iconView = UIImageView(image: UIImage(systemName: iconSystemName))
        iconView.tintColor = tintColor
        iconView.contentMode = .scaleAspectFit
        iconView.setContentHuggingPriority(.required, for: .horizontal)
        iconView.snp.makeConstraints { make in
            make.width.height.equalTo(14)
        }

        let titleRow = UIStackView(arrangedSubviews: [iconView, titleLabel])
        titleRow.axis = .horizontal
        titleRow.spacing = 5
        titleRow.alignment = .center

        valueLabel.textColor = .textPrimary
        valueLabel.textAlignment = .center
        valueLabel.numberOfLines = 1
        valueLabel.setContentCompressionResistancePriority(.required, for: .vertical)
        valueLabel.setContentHuggingPriority(.required, for: .vertical)

        let stack = UIStackView(arrangedSubviews: [valueLabel, titleRow])
        stack.axis = .vertical
        stack.spacing = 4
        stack.alignment = .center

        container.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.center.equalToSuperview()
            make.leading.greaterThanOrEqualToSuperview().offset(6)
            make.trailing.lessThanOrEqualToSuperview().offset(-6)
            make.top.greaterThanOrEqualToSuperview().offset(10)
            make.bottom.lessThanOrEqualToSuperview().offset(-10)
        }
        container.snp.makeConstraints { make in
            make.height.greaterThanOrEqualTo(66)
        }

        return container
    }

    /// Section card for grouped in-card lists (e.g. today's orders): header + flat rows inside.
    static func makeGroupedListSectionCard(
        title: String,
        subtitleLabel: UILabel,
        dateLabel: UILabel,
        iconSystemName: String,
        contentView: UIView,
        isIPad: Bool
    ) -> UIView {
        subtitleLabel.font = .captionMedium(size: 12)
        subtitleLabel.textColor = .textSecondary
        subtitleLabel.numberOfLines = 1

        dateLabel.font = .captionMedium(size: 12)
        dateLabel.textColor = .textTertiary
        dateLabel.textAlignment = .right
        dateLabel.numberOfLines = 1

        return makeInsightCard(
            title: title,
            subtitle: "",
            iconSystemName: iconSystemName,
            contentView: contentView,
            accessoryView: dateLabel,
            isIPad: isIPad,
            externalSubtitleLabel: subtitleLabel
        )
    }

    static func makeInsightCard(
        title: String,
        subtitle: String,
        iconSystemName: String,
        contentView: UIView,
        accessoryView: UIView? = nil,
        isIPad: Bool,
        externalSubtitleLabel: UILabel? = nil
    ) -> UIView {
        let container = UIView()
        container.backgroundColor = .backgroundCard
        container.layer.cornerRadius = 16
        container.layer.borderWidth = 1
        container.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.5).cgColor
        container.layer.shadowColor = UIColor.black.withAlphaComponent(0.02).cgColor
        container.layer.shadowOpacity = 1
        container.layer.shadowRadius = 9
        container.layer.shadowOffset = CGSize(width: 0, height: 4)

        let iconView = UIImageView(image: UIImage(systemName: iconSystemName))
        iconView.tintColor = .neutralGray
        iconView.contentMode = .scaleAspectFit
        iconView.snp.makeConstraints { make in
            make.width.height.equalTo(20)
        }

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .bodyBold(size: isIPad ? 17 : 16)
        titleLabel.textColor = .textPrimary

        let subtitleLabel = externalSubtitleLabel ?? UILabel()
        if externalSubtitleLabel == nil {
            subtitleLabel.text = subtitle
            subtitleLabel.font = .captionMedium(size: 12)
            subtitleLabel.textColor = .textSecondary
            subtitleLabel.numberOfLines = 2
        }

        let labelStack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        labelStack.axis = .vertical
        labelStack.spacing = 3

        var headerSubviews: [UIView] = [iconView, labelStack, UIView()]
        if let accessoryView = accessoryView {
            accessoryView.setContentHuggingPriority(.required, for: .horizontal)
            accessoryView.setContentCompressionResistancePriority(.required, for: .horizontal)
            headerSubviews.append(accessoryView)
        }

        let headerStack = UIStackView(arrangedSubviews: headerSubviews)
        headerStack.axis = .horizontal
        headerStack.spacing = 12
        headerStack.alignment = .center

        let bodyStack = UIStackView(arrangedSubviews: [headerStack, contentView])
        bodyStack.axis = .vertical
        bodyStack.spacing = 14

        container.addSubview(bodyStack)
        bodyStack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 15, left: 15, bottom: 15, right: 15))
        }

        return container
    }

    static func makeSectionActionButton(title: String) -> UIButton {
        var config = UIButton.Configuration.plain()
        config.title = title
        config.baseForegroundColor = .brandPrimary
        config.contentInsets = NSDirectionalEdgeInsets(top: 6, leading: 8, bottom: 6, trailing: 0)
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = .captionMedium(size: 12)
            return outgoing
        }
        let button = UIButton(configuration: config)
        return button
    }

    static func makeInlineSectionEmptyView(text: String) -> UIView {
        let container = UIView()
        let label = UILabel()
        label.tag = 100
        label.text = text
        label.font = .bodyRegular(size: 13)
        label.textColor = .textSecondary
        label.textAlignment = .center
        label.numberOfLines = 0

        container.addSubview(label)
        label.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview().inset(UIEdgeInsets(top: 20, left: 8, bottom: 0, right: 8))
        }
        return container
    }

    static func makeSectionEmptyView(text: String, cornerRadius: CGFloat = 12) -> UIView {
        let container = UIView()
        container.backgroundColor = .backgroundCard
        container.layer.cornerRadius = cornerRadius
        container.layer.borderWidth = 1
        container.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.6).cgColor

        let label = UILabel()
        label.text = text
        label.font = .bodyRegular(size: 13)
        label.textColor = .textSecondary
        label.textAlignment = .center
        label.numberOfLines = 0

        container.addSubview(label)
        label.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 18, left: 14, bottom: 18, right: 14))
        }

        return container
    }

    static func makeCustomerRankingRow(
        rank: Int,
        title: String,
        phone: String?,
        trailingSubtitle: String?,
        value: String,
        accentColor: UIColor,
        isIPad: Bool,
        style: RankingRowStyle = .standalone
    ) -> UIView {
        let trimmedPhone = phone?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let hasPhone = !trimmedPhone.isEmpty
        let trimmedTrailing = trailingSubtitle?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let hasTrailing = !trimmedTrailing.isEmpty

        let subtitleView: UIView
        if hasPhone {
            subtitleView = OverviewRankingPhoneSubtitleView(phone: trimmedPhone, trailingText: hasTrailing ? trimmedTrailing : nil)
        } else if hasTrailing {
            let label = UILabel()
            label.text = trimmedTrailing
            label.font = .captionMedium(size: 12)
            label.textColor = .textSecondary
            label.numberOfLines = 1
            subtitleView = label
        } else {
            subtitleView = UIView()
        }

        return makeRankingRow(
            rank: rank,
            title: title,
            subtitleView: subtitleView,
            value: value,
            accentColor: accentColor,
            isIPad: isIPad,
            style: style
        )
    }

    static func makeRankingRow(
        rank: Int,
        title: String,
        subtitle: String,
        value: String,
        accentColor: UIColor,
        isIPad: Bool,
        style: RankingRowStyle = .standalone
    ) -> UIView {
        let subtitleLabel = UILabel()
        subtitleLabel.text = subtitle
        subtitleLabel.font = .captionMedium(size: 12)
        subtitleLabel.textColor = .textSecondary
        subtitleLabel.numberOfLines = 1

        return makeRankingRow(
            rank: rank,
            title: title,
            subtitleView: subtitleLabel,
            value: value,
            accentColor: accentColor,
            isIPad: isIPad,
            style: style
        )
    }

    private static func makeRankingRow(
        rank: Int,
        title: String,
        subtitleView: UIView,
        value: String,
        accentColor: UIColor,
        isIPad: Bool,
        style: RankingRowStyle = .standalone
    ) -> UIView {
        let container = UIView()
        switch style {
        case .embedded:
            container.backgroundColor = .clear
        case .standalone:
            container.backgroundColor = .backgroundCard
            container.layer.cornerRadius = 10
            container.layer.borderWidth = 1
            container.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.45).cgColor
        }

        let rankContainer = UIView()
        rankContainer.backgroundColor = accentColor.withAlphaComponent(0.10)
        rankContainer.layer.cornerRadius = 12
        rankContainer.snp.makeConstraints { make in
            make.width.height.equalTo(30)
        }

        let rankLabel = UILabel()
        rankLabel.text = "\(rank)"
        rankLabel.font = .bodyBold(size: 13)
        rankLabel.textColor = accentColor
        rankLabel.textAlignment = .center
        rankContainer.addSubview(rankLabel)
        rankLabel.snp.makeConstraints { make in
            make.center.equalToSuperview()
        }

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .bodyRegular(size: isIPad ? 16 : 15)
        titleLabel.textColor = .textPrimary
        titleLabel.numberOfLines = 1

        let textStack = UIStackView(arrangedSubviews: [titleLabel, subtitleView])
        textStack.axis = .vertical
        textStack.spacing = 3
        textStack.alignment = .fill

        let valueLabel = UILabel()
        valueLabel.text = value
        valueLabel.font = .bodyRegular(size: isIPad ? 17 : 15)
        valueLabel.textColor = accentColor
        valueLabel.textAlignment = .right
        valueLabel.setContentCompressionResistancePriority(.required, for: .horizontal)

        let stack = UIStackView(arrangedSubviews: [rankContainer, textStack, valueLabel])
        stack.axis = .horizontal
        stack.spacing = 10
        stack.alignment = .center

        container.addSubview(stack)
        let contentInsets: UIEdgeInsets
        switch style {
        case .embedded:
            contentInsets = UIEdgeInsets(top: 12, left: 0, bottom: 12, right: 0)
        case .standalone:
            contentInsets = UIEdgeInsets(top: 10, left: 11, bottom: 10, right: 11)
        }
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(contentInsets)
        }
        container.snp.makeConstraints { make in
            make.height.greaterThanOrEqualTo(64)
        }
        return container
    }

    static func populateRows(in stackView: UIStackView, rows: [UIView], emptyText: String, showsDividers: Bool = false, emptyCornerRadius: CGFloat = 12) {
        stackView.arrangedSubviews.forEach { view in
            stackView.removeArrangedSubview(view)
            view.removeFromSuperview()
        }

        if rows.isEmpty {
            stackView.addArrangedSubview(makeSectionEmptyView(text: emptyText, cornerRadius: emptyCornerRadius))
            return
        }

        for (index, row) in rows.enumerated() {
            stackView.addArrangedSubview(row)
            if showsDividers, index < rows.count - 1 {
                stackView.addArrangedSubview(makeRankingDivider())
            }
        }
    }

    static func makeRankingDivider() -> UIView {
        let divider = UIView()
        divider.backgroundColor = UIColor.borderColor.withAlphaComponent(0.9)
        divider.snp.makeConstraints { make in
            make.height.equalTo(1 / UIScreen.main.scale)
        }
        return divider
    }

    static func growthText(_ growth: Double) -> String {
        let absoluteGrowth = abs(growth)
        let pattern = absoluteGrowth.rounded() == absoluteGrowth ? "%.0f%%" : "%.1f%%"
        let formattedValue = String(format: pattern, absoluteGrowth)

        if growth > 0 {
            return "↑" + formattedValue
        }
        if growth < 0 {
            return "↓" + formattedValue
        }
        return "→" + formattedValue
    }
}

private final class OverviewRankingPhoneSubtitleView: UIView {
    private let phoneLabel = UILabel()
    private let revealButton = UIButton(type: .system)
    private let trailingLabel = UILabel()
    private var rawPhone = ""
    private var isRevealed = false

    init(phone: String, trailingText: String?) {
        super.init(frame: .zero)
        rawPhone = phone
        setupUI(trailingText: trailingText)
        updatePhoneDisplay()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI(trailingText: String?) {
        phoneLabel.font = .captionMedium(size: 12)
        phoneLabel.textColor = .textSecondary
        phoneLabel.numberOfLines = 1

        revealButton.setImage(UIImage.revealEye(revealed: false), for: .normal)
        revealButton.tintColor = .textSecondary
        revealButton.addTarget(self, action: #selector(toggleReveal), for: .touchUpInside)
        revealButton.snp.makeConstraints { make in
            make.width.height.equalTo(24)
        }

        trailingLabel.font = .captionMedium(size: 12)
        trailingLabel.textColor = .textSecondary
        trailingLabel.numberOfLines = 1

        var arrangedSubviews: [UIView] = [phoneLabel, revealButton]
        if let trailingText, !trailingText.isEmpty {
            let separatorLabel = UILabel()
            separatorLabel.text = "•"
            separatorLabel.font = .captionMedium(size: 12)
            separatorLabel.textColor = .textSecondary
            trailingLabel.text = trailingText
            arrangedSubviews.append(separatorLabel)
            arrangedSubviews.append(trailingLabel)
        }

        let stack = UIStackView(arrangedSubviews: arrangedSubviews)
        stack.axis = .horizontal
        stack.spacing = 4
        stack.alignment = .center

        addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
    }

    @objc private func toggleReveal() {
        isRevealed.toggle()
        revealButton.setImage(UIImage.revealEye(revealed: isRevealed), for: .normal)
        updatePhoneDisplay()
    }

    private func updatePhoneDisplay() {
        phoneLabel.text = isRevealed ? rawPhone : rawPhone.maskedPhoneNumber
    }
}
