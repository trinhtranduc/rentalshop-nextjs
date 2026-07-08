//
//  OverviewUIBuilder.swift
//  POS ADBD
//

import UIKit
import SnapKit

enum OverviewUIBuilder {

    static func revenueDisplayColor(for amount: Double, positiveColor: UIColor = .brandPrimary) -> UIColor {
        amount < 0 ? .statusCancelledText : positiveColor
    }

    static func makeSummaryValueLabel(isIPad: Bool) -> UILabel {
        let label = UILabel()
        label.font = .bodyRegular(size: isIPad ? 18 : 16)
        label.textColor = .brandPrimary
        label.text = "0"
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

    static func makeSummaryStripMetric(
        title: String,
        valueLabel: UILabel,
        metric: OverviewMetric,
        infoTarget: Any?,
        infoAction: Selector
    ) -> UIView {
        let container = UIStackView()
        container.axis = .vertical
        container.spacing = 4
        container.alignment = .center

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .captionMedium(size: 11)
        titleLabel.textColor = .textTertiary
        titleLabel.numberOfLines = 2
        titleLabel.textAlignment = .center

        let infoButton = OverviewMetricInfoPresenter.makeInfoButton(
            metric: metric,
            target: infoTarget,
            action: infoAction
        )
        let titleRow = UIStackView(arrangedSubviews: [titleLabel, infoButton])
        titleRow.axis = .horizontal
        titleRow.spacing = 2
        titleRow.alignment = .center

        valueLabel.textColor = .textPrimary
        valueLabel.numberOfLines = 1
        valueLabel.textAlignment = .center

        container.addArrangedSubview(titleRow)
        container.addArrangedSubview(valueLabel)
        return container
    }

    static func makeSnapshotValueLabel(isIPad: Bool) -> UILabel {
        let label = UILabel()
        label.text = "—"
        label.font = .bodyBold(size: isIPad ? 24 : 22)
        label.textColor = .textPrimary
        label.numberOfLines = 1
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

    static func makeInsightCard(
        title: String,
        subtitle: String,
        iconSystemName: String,
        contentView: UIView,
        isIPad: Bool
    ) -> UIView {
        let container = UIView()
        container.backgroundColor = .backgroundCard
        container.layer.cornerRadius = 14
        container.layer.borderWidth = 1
        container.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.6).cgColor
        container.layer.shadowColor = UIColor.black.withAlphaComponent(0.04).cgColor
        container.layer.shadowOpacity = 1
        container.layer.shadowRadius = 12
        container.layer.shadowOffset = CGSize(width: 0, height: 6)

        let iconContainer = UIView()
        iconContainer.backgroundColor = UIColor.brandPrimary.withAlphaComponent(0.08)
        iconContainer.layer.cornerRadius = 16
        iconContainer.snp.makeConstraints { make in
            make.width.height.equalTo(32)
        }

        let iconView = UIImageView(image: UIImage(systemName: iconSystemName))
        iconView.tintColor = .brandPrimary
        iconView.contentMode = .scaleAspectFit
        iconContainer.addSubview(iconView)
        iconView.snp.makeConstraints { make in
            make.center.equalToSuperview()
        }

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .bodyBold(size: isIPad ? 18 : 16)
        titleLabel.textColor = .textPrimary

        let subtitleLabel = UILabel()
        subtitleLabel.text = subtitle
        subtitleLabel.font = .captionMedium(size: 11)
        subtitleLabel.textColor = .textSecondary
        subtitleLabel.numberOfLines = 2

        let labelStack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        labelStack.axis = .vertical
        labelStack.spacing = 4

        let headerStack = UIStackView(arrangedSubviews: [iconContainer, labelStack, UIView()])
        headerStack.axis = .horizontal
        headerStack.spacing = 12
        headerStack.alignment = .center

        let bodyStack = UIStackView(arrangedSubviews: [headerStack, contentView])
        bodyStack.axis = .vertical
        bodyStack.spacing = 14

        container.addSubview(bodyStack)
        bodyStack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 16, left: 16, bottom: 16, right: 16))
        }

        return container
    }

    static func makeSectionEmptyView(text: String) -> UIView {
        let container = UIView()
        container.backgroundColor = .backgroundCard
        container.layer.cornerRadius = 12
        container.layer.borderWidth = 1
        container.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.45).cgColor

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

    static func makeRankingRow(
        rank: Int,
        title: String,
        subtitle: String,
        value: String,
        accentColor: UIColor,
        isIPad: Bool
    ) -> UIView {
        let container = UIView()
        container.backgroundColor = .backgroundCard
        container.layer.cornerRadius = 12
        container.layer.borderWidth = 1
        container.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.45).cgColor

        let rankContainer = UIView()
        rankContainer.backgroundColor = accentColor.withAlphaComponent(0.10)
        rankContainer.layer.cornerRadius = 16
        rankContainer.snp.makeConstraints { make in
            make.width.height.equalTo(32)
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
        titleLabel.font = .bodyBold(size: isIPad ? 16 : 15)
        titleLabel.textColor = .textPrimary
        titleLabel.numberOfLines = 1

        let subtitleLabel = UILabel()
        subtitleLabel.text = subtitle
        subtitleLabel.font = .captionMedium(size: 12)
        subtitleLabel.textColor = .textSecondary
        subtitleLabel.numberOfLines = 1

        let textStack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        textStack.axis = .vertical
        textStack.spacing = 3
        textStack.alignment = .fill

        let valueLabel = UILabel()
        valueLabel.text = value
        valueLabel.font = .bodyBold(size: isIPad ? 16 : 15)
        valueLabel.textColor = accentColor
        valueLabel.textAlignment = .right
        valueLabel.setContentCompressionResistancePriority(.required, for: .horizontal)

        let stack = UIStackView(arrangedSubviews: [rankContainer, textStack, valueLabel])
        stack.axis = .horizontal
        stack.spacing = 12
        stack.alignment = .center

        container.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 12, bottom: 12, right: 12))
        }
        container.snp.makeConstraints { make in
            make.height.greaterThanOrEqualTo(68)
        }
        return container
    }

    static func populateRows(in stackView: UIStackView, rows: [UIView], emptyText: String) {
        stackView.arrangedSubviews.forEach { view in
            stackView.removeArrangedSubview(view)
            view.removeFromSuperview()
        }

        if rows.isEmpty {
            stackView.addArrangedSubview(makeSectionEmptyView(text: emptyText))
            return
        }

        rows.forEach { stackView.addArrangedSubview($0) }
    }

    static func growthText(_ growth: Double) -> String {
        let absoluteGrowth = abs(growth)
        let pattern = absoluteGrowth.rounded() == absoluteGrowth ? "%.0f%%" : "%.1f%%"
        let formattedValue = String(format: pattern, absoluteGrowth)

        if growth > 0 {
            return "+" + formattedValue
        }
        if growth < 0 {
            return "-" + formattedValue
        }
        return formattedValue
    }
}
