//
//  OverviewSummaryCardView.swift
//  POS ADBD
//
//  Cash Strip layout (Direction A):
//  one hero revenue number + one dens meta line. No nested metric cards.
//

import UIKit
import SnapKit

final class OverviewSummaryCardView: UIView {

    let incomeLabel: UILabel
    let ordersLabel: UILabel
    let collateralLabel: UILabel
    let collateralPlanLabel: UILabel
    let revenueInfoButton: UIButton
    let growthPillView: UIView
    let growthPillLabel: UILabel

    private let contentStack = UIStackView()
    private let metaStack = UIStackView()
    private weak var ordersUnit: UIView?
    private weak var collateralUnit: UIView?
    private weak var planUnit: UIView?

    init(
        isIPad: Bool,
        infoTarget: Any?,
        infoAction: Selector
    ) {
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
        growthPillLabel.textAlignment = .left
        growthPillLabel.numberOfLines = 1
        growthPillLabel.adjustsFontSizeToFitWidth = true
        growthPillLabel.minimumScaleFactor = 0.75

        growthPillView = UIView()
        growthPillView.isHidden = true
        growthPillView.layer.cornerRadius = 8
        growthPillView.addSubview(growthPillLabel)
        growthPillLabel.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 4, left: 8, bottom: 4, right: 8))
        }

        super.init(frame: .zero)

        incomeLabel.font = .bodyBold(size: isIPad ? 28 : 24)
        incomeLabel.textColor = .brandPrimary
        incomeLabel.numberOfLines = 1
        incomeLabel.adjustsFontSizeToFitWidth = true
        incomeLabel.minimumScaleFactor = 0.65
        incomeLabel.setContentCompressionResistancePriority(.required, for: .vertical)

        styleMetaValue(ordersLabel, isIPad: isIPad)
        styleMetaValue(collateralLabel, isIPad: isIPad)
        styleMetaValue(collateralPlanLabel, isIPad: isIPad)

        buildLayout(isIPad: isIPad)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func setCollateralMetricsVisible(_ visible: Bool) {
        collateralUnit?.isHidden = !visible
        planUnit?.isHidden = !visible
    }

    func applyIncomeColor(for amount: Double) {
        incomeLabel.textColor = OverviewUIBuilder.revenueDisplayColor(for: amount, positiveColor: .brandPrimary)
    }

    private func styleMetaValue(_ label: UILabel, isIPad: Bool) {
        // Meta values sit under short titles — keep them clearly larger than captions
        // so Orders / Deposit Held / Deposit Due remain readable at a glance.
        label.font = .bodyBold(size: isIPad ? 18 : 16)
        label.textColor = .textPrimary
        label.numberOfLines = 1
        label.adjustsFontSizeToFitWidth = true
        label.minimumScaleFactor = 0.7
    }

    private func buildLayout(isIPad: Bool) {
        let card = UIView()
        card.backgroundColor = .backgroundCard
        card.layer.cornerRadius = 12
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.65).cgColor

        let titleLabel = UILabel()
        titleLabel.text = "Report_Summary_Revenue".localized()
        titleLabel.font = .captionMedium(size: 12)
        titleLabel.textColor = .textTertiary

        let titleRow = UIStackView(arrangedSubviews: [titleLabel, revenueInfoButton, UIView()])
        titleRow.axis = .horizontal
        titleRow.spacing = 4
        titleRow.alignment = .center

        let heroStack = UIStackView(arrangedSubviews: [titleRow, incomeLabel, growthPillView])
        heroStack.axis = .vertical
        heroStack.spacing = 4
        heroStack.alignment = .leading

        let orders = makeMetaUnit(
            title: "Report_Summary_Orders".localized(),
            valueLabel: ordersLabel,
            isIPad: isIPad
        )
        let held = makeMetaUnit(
            title: "Report_Summary_DepositHeld".localized(),
            valueLabel: collateralLabel,
            isIPad: isIPad
        )
        let due = makeMetaUnit(
            title: "Report_Summary_DepositDue".localized(),
            valueLabel: collateralPlanLabel,
            isIPad: isIPad
        )
        ordersUnit = orders
        collateralUnit = held
        planUnit = due

        // Equal columns so larger titles/values share width instead of crowding left.
        metaStack.axis = .horizontal
        metaStack.spacing = 10
        metaStack.alignment = .top
        metaStack.distribution = .fillEqually
        metaStack.addArrangedSubview(orders)
        metaStack.addArrangedSubview(held)
        metaStack.addArrangedSubview(due)

        let hairline = UIView()
        hairline.backgroundColor = UIColor.borderColor.withAlphaComponent(0.7)
        hairline.snp.makeConstraints { make in
            make.height.equalTo(1 / UIScreen.main.scale)
        }

        contentStack.axis = .vertical
        contentStack.spacing = 10
        contentStack.alignment = .fill
        contentStack.addArrangedSubview(heroStack)
        contentStack.addArrangedSubview(hairline)
        contentStack.addArrangedSubview(metaStack)

        addSubview(card)
        card.addSubview(contentStack)
        card.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        contentStack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 14, bottom: 12, right: 14))
        }
    }

    private func makeMetaUnit(title: String, valueLabel: UILabel, isIPad: Bool) -> UIView {
        let titleLabel = UILabel()
        titleLabel.text = title
        // Was 10pt — too small next to 16pt values; 12/13 matches secondary body rhythm.
        titleLabel.font = .captionMedium(size: isIPad ? 13 : 12)
        titleLabel.textColor = .textTertiary
        titleLabel.numberOfLines = 2
        titleLabel.adjustsFontSizeToFitWidth = true
        titleLabel.minimumScaleFactor = 0.85
        titleLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        let stack = UIStackView(arrangedSubviews: [titleLabel, valueLabel])
        stack.axis = .vertical
        stack.spacing = 3
        stack.alignment = .leading
        return stack
    }
}
