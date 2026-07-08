//
//  OverviewSummaryCardView.swift
//  POS ADBD
//

import UIKit
import SnapKit

final class OverviewSummaryCardView: UIView {

    let dateButton: UIButton
    let incomeLabel: UILabel
    let ordersLabel: UILabel
    let collateralLabel: UILabel
    let collateralPlanLabel: UILabel
    let revenueInfoButton: UIButton
    let growthPillView: UIView
    let growthPillLabel: UILabel

    private weak var collateralMetricView: UIView?
    private weak var planMetricView: UIView?
    private weak var collateralDividerView: UIView?

    init(
        isIPad: Bool,
        dateTarget: Any?,
        dateAction: Selector,
        infoTarget: Any?,
        infoAction: Selector
    ) {
        dateButton = UIButton(type: .system)
        incomeLabel = OverviewUIBuilder.makeSummaryValueLabel(isIPad: isIPad)
        ordersLabel = OverviewUIBuilder.makeSummaryValueLabel(isIPad: isIPad)
        collateralLabel = OverviewUIBuilder.makeSummaryValueLabel(isIPad: isIPad)
        collateralPlanLabel = OverviewUIBuilder.makeSummaryValueLabel(isIPad: isIPad)
        revenueInfoButton = OverviewMetricInfoPresenter.makeInfoButton(
            metric: .totalRevenue,
            target: infoTarget,
            action: infoAction
        )

        growthPillLabel = UILabel()
        growthPillLabel.font = .captionMedium(size: 12)
        growthPillLabel.textAlignment = .center
        growthPillLabel.numberOfLines = 1

        growthPillView = UIView()
        growthPillView.isHidden = true
        growthPillView.layer.cornerRadius = 9
        growthPillView.addSubview(growthPillLabel)
        growthPillLabel.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 5, left: 8, bottom: 5, right: 8))
        }

        super.init(frame: .zero)

        dateButton.titleLabel?.font = .bodyMedium(size: isIPad ? 18 : 16)
        dateButton.addTarget(dateTarget, action: dateAction, for: .touchUpInside)
        dateButton.tintColor = .brandPrimary
        dateButton.contentHorizontalAlignment = .center
        dateButton.backgroundColor = .clear
        dateButton.layer.cornerRadius = 10
        dateButton.layer.borderWidth = 1
        dateButton.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.8).cgColor
        dateButton.contentEdgeInsets = UIEdgeInsets(top: 5, left: 10, bottom: 5, right: 10)
        dateButton.setTitleColor(.brandPrimary, for: .normal)

        incomeLabel.font = .bodyBold(size: isIPad ? 26 : 24)
        incomeLabel.textColor = .brandPrimary
        ordersLabel.font = .bodyBold(size: isIPad ? 17 : 16)
        collateralLabel.font = .bodyBold(size: isIPad ? 16 : 15)
        collateralPlanLabel.font = .bodyBold(size: isIPad ? 16 : 15)

        buildLayout(isIPad: isIPad, infoTarget: infoTarget, infoAction: infoAction)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func setCollateralMetricsVisible(_ visible: Bool) {
        collateralMetricView?.isHidden = !visible
        planMetricView?.isHidden = !visible
        collateralDividerView?.isHidden = !visible
    }

    func applyIncomeColor(for amount: Double) {
        incomeLabel.textColor = OverviewUIBuilder.revenueDisplayColor(for: amount, positiveColor: .brandPrimary)
    }

    private func buildLayout(isIPad: Bool, infoTarget: Any?, infoAction: Selector) {
        let card = UIView()
        card.backgroundColor = .backgroundCard
        card.layer.cornerRadius = 14
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.7).cgColor

        let topRow = UIStackView(arrangedSubviews: [UIView(), dateButton])
        topRow.axis = .horizontal
        topRow.spacing = 10
        topRow.alignment = .center

        let heroTitleLabel = UILabel()
        heroTitleLabel.text = "Total Revenue".localized()
        heroTitleLabel.font = .captionMedium(size: 12)
        heroTitleLabel.textColor = .textSecondary

        let heroTitleRow = UIStackView(arrangedSubviews: [heroTitleLabel, revenueInfoButton, UIView()])
        heroTitleRow.axis = .horizontal
        heroTitleRow.spacing = 4
        heroTitleRow.alignment = .center

        let heroStack = UIStackView(arrangedSubviews: [heroTitleRow, incomeLabel, growthPillView])
        heroStack.axis = .vertical
        heroStack.spacing = 4
        heroStack.alignment = .fill

        let collateralTitle = isIPad
            ? "Collateral (received)".localized()
            : "Collateral (received)_Short".localized()
        let planTitle = isIPad
            ? "Collateral (return)".localized()
            : "Collateral (return)_Short".localized()

        let ordersCard = OverviewUIBuilder.makeSummaryStripMetric(
            title: "Total Orders".localized(),
            valueLabel: ordersLabel,
            metric: .totalOrders,
            infoTarget: infoTarget,
            infoAction: infoAction
        )
        let collateralCard = OverviewUIBuilder.makeSummaryStripMetric(
            title: collateralTitle,
            valueLabel: collateralLabel,
            metric: .collateralReceived,
            infoTarget: infoTarget,
            infoAction: infoAction
        )
        let planCard = OverviewUIBuilder.makeSummaryStripMetric(
            title: planTitle,
            valueLabel: collateralPlanLabel,
            metric: .collateralExpected,
            infoTarget: infoTarget,
            infoAction: infoAction
        )

        let collateralDivider = OverviewUIBuilder.makeSummaryMetricColumnDivider()
        let metricsPanel = UIView()
        metricsPanel.backgroundColor = .clear
        metricsPanel.layer.cornerRadius = 10
        metricsPanel.layer.borderWidth = 1
        metricsPanel.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.65).cgColor

        let metricsStack: UIStackView
        if isIPad {
            let ordersDivider = OverviewUIBuilder.makeSummaryMetricColumnDivider()
            let horizontalStack = UIStackView(arrangedSubviews: [ordersCard, ordersDivider, collateralCard, collateralDivider, planCard])
            horizontalStack.axis = .horizontal
            horizontalStack.spacing = 12
            horizontalStack.alignment = .fill
            horizontalStack.distribution = .fill
            metricsStack = horizontalStack
        } else {
            let collateralRow = UIStackView(arrangedSubviews: [collateralCard, collateralDivider, planCard])
            collateralRow.axis = .horizontal
            collateralRow.spacing = 12
            collateralRow.alignment = .fill
            collateralRow.distribution = .fillEqually

            let verticalStack = UIStackView(arrangedSubviews: [ordersCard, collateralRow])
            verticalStack.axis = .vertical
            verticalStack.spacing = 10
            verticalStack.alignment = .fill
            metricsStack = verticalStack
        }

        metricsPanel.addSubview(metricsStack)
        metricsStack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12))
        }

        collateralMetricView = collateralCard
        planMetricView = planCard
        collateralDividerView = collateralDivider

        let stack = UIStackView(arrangedSubviews: [topRow, heroStack, metricsPanel])
        stack.axis = .vertical
        stack.spacing = 10
        stack.alignment = .fill

        addSubview(card)
        card.addSubview(stack)
        card.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(14)
        }
    }
}
