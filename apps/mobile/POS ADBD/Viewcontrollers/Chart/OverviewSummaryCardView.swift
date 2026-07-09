//
//  OverviewSummaryCardView.swift
//  POS ADBD
//

import UIKit
import SnapKit

final class OverviewSummaryCardView: UIView {

    enum SummaryMode {
        case today
        case range
    }

    let incomeLabel: UILabel
    let ordersLabel: UILabel
    let collateralLabel: UILabel
    let collateralPlanLabel: UILabel
    let averageLabel: UILabel
    let changeMetricLabel: UILabel
    let revenueInfoButton: UIButton
    let growthPillView: UIView
    let growthPillLabel: UILabel

    private let isIPad: Bool
    private let contentStack = UIStackView()
    private let metricsStack = UIStackView()
    private let contextLabel = UILabel()
    private let metricsSurfaceView = UIView()
    private let rangeOrderStack = UIStackView()

    private var currentMode: SummaryMode = .today

    init(
        isIPad: Bool,
        infoTarget: Any?,
        infoAction: Selector
    ) {
        self.isIPad = isIPad
        incomeLabel = OverviewUIBuilder.makeSummaryValueLabel(isIPad: isIPad)
        ordersLabel = OverviewUIBuilder.makeSummaryValueLabel(isIPad: isIPad)
        collateralLabel = OverviewUIBuilder.makeSummaryValueLabel(isIPad: isIPad)
        collateralPlanLabel = OverviewUIBuilder.makeSummaryValueLabel(isIPad: isIPad)
        averageLabel = OverviewUIBuilder.makeSummaryValueLabel(isIPad: isIPad)
        changeMetricLabel = OverviewUIBuilder.makeSummaryValueLabel(isIPad: isIPad)
        revenueInfoButton = OverviewMetricInfoPresenter.makeInfoButton(
            metric: .totalRevenue,
            target: infoTarget,
            action: infoAction
        )

        growthPillLabel = UILabel()
        growthPillLabel.font = .captionMedium(size: 12)
        growthPillLabel.textAlignment = .left
        growthPillLabel.numberOfLines = 2

        growthPillView = UIView()
        growthPillView.backgroundColor = .clear
        growthPillView.isHidden = true
        growthPillView.addSubview(growthPillLabel)
        growthPillLabel.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }

        super.init(frame: .zero)

        configureBaseLabels()
        buildLayout()
        setMode(.today)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func setMode(_ mode: SummaryMode) {
        currentMode = mode

        contextLabel.isHidden = true
        growthPillView.isHidden = true
        rangeOrderStack.isHidden = false
        metricsSurfaceView.isHidden = true
        rebuildMetricLayout(for: mode)
        updateMetricFonts(for: mode)

        incomeLabel.font = .bodyBold(size: isIPad ? 31 : 27)
        incomeLabel.minimumScaleFactor = 0.7
    }

    func setContextText(_ text: String?) {
        contextLabel.text = text
        contextLabel.isHidden = true
    }

    func applyIncomeColor(for amount: Double) {
        incomeLabel.textColor = OverviewUIBuilder.revenueDisplayColor(for: amount, positiveColor: .brandPrimary)
    }

    func applyChangeMetric(text: String?, color: UIColor) {
        let value = (text?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false) ? text! : "—"
        changeMetricLabel.text = value
        changeMetricLabel.textColor = color
    }

    private func configureBaseLabels() {
        backgroundColor = .backgroundCard
        layer.cornerRadius = 18
        layer.borderWidth = 1
        layer.borderColor = UIColor.borderColor.withAlphaComponent(0.72).cgColor
        layer.shadowColor = UIColor.black.withAlphaComponent(0.04).cgColor
        layer.shadowOpacity = 1
        layer.shadowRadius = 14
        layer.shadowOffset = CGSize(width: 0, height: 6)

        incomeLabel.numberOfLines = 1
        incomeLabel.textColor = .brandPrimary
        incomeLabel.adjustsFontSizeToFitWidth = true
        incomeLabel.setContentCompressionResistancePriority(.required, for: .vertical)

        [ordersLabel, collateralLabel, collateralPlanLabel, averageLabel, changeMetricLabel].forEach {
            $0.font = .bodyBold(size: isIPad ? 21 : 19)
            $0.textColor = .textPrimary
            $0.numberOfLines = 1
            $0.adjustsFontSizeToFitWidth = true
            $0.minimumScaleFactor = 0.72
            $0.setContentCompressionResistancePriority(.required, for: .vertical)
        }

        contextLabel.font = .captionMedium(size: 12)
        contextLabel.textColor = .textSecondary
        contextLabel.numberOfLines = 1
        contextLabel.isHidden = true
    }

    private func buildLayout() {
        let titleLabel = UILabel()
        titleLabel.text = "Report_Summary_Revenue".localized()
        titleLabel.font = .captionMedium(size: 12)
        titleLabel.textColor = .textTertiary

        let titleRow = UIStackView(arrangedSubviews: [titleLabel, revenueInfoButton, UIView()])
        titleRow.axis = .horizontal
        titleRow.spacing = 4
        titleRow.alignment = .center

        let revenueStack = UIStackView(arrangedSubviews: [titleRow, incomeLabel, contextLabel, growthPillView])
        revenueStack.axis = .vertical
        revenueStack.spacing = 4
        revenueStack.alignment = .leading

        let rangeOrderTitleLabel = UILabel()
        rangeOrderTitleLabel.text = "Report_Summary_Orders".localized()
        rangeOrderTitleLabel.font = .captionMedium(size: 11)
        rangeOrderTitleLabel.textColor = .textSecondary
        rangeOrderTitleLabel.textAlignment = .right

        rangeOrderStack.axis = .vertical
        rangeOrderStack.spacing = 4
        rangeOrderStack.alignment = .trailing
        rangeOrderStack.addArrangedSubview(rangeOrderTitleLabel)
        rangeOrderStack.addArrangedSubview(changeMetricLabel)

        let heroRow = UIStackView(arrangedSubviews: [revenueStack, UIView(), rangeOrderStack])
        heroRow.axis = .horizontal
        heroRow.spacing = 12
        heroRow.alignment = .top

        metricsSurfaceView.backgroundColor = .clear
        metricsSurfaceView.addSubview(metricsStack)

        metricsStack.axis = .horizontal
        metricsStack.spacing = 0
        metricsStack.distribution = .fill
        metricsStack.alignment = .top
        metricsStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }

        contentStack.axis = .vertical
        contentStack.spacing = 14
        contentStack.alignment = .fill
        contentStack.addArrangedSubview(heroRow)
        contentStack.addArrangedSubview(metricsSurfaceView)

        addSubview(contentStack)
        contentStack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 16, left: 16, bottom: 14, right: 16))
        }
    }

    private func rebuildMetricLayout(for mode: SummaryMode) {
        metricsStack.arrangedSubviews.forEach { view in
            metricsStack.removeArrangedSubview(view)
            view.removeFromSuperview()
        }

        switch mode {
        case .today:
            return

        case .range:
            return
        }
    }

    private func installMetricItems(_ items: [UIView]) {
        guard let firstItem = items.first else { return }

        for (index, item) in items.enumerated() {
            metricsStack.addArrangedSubview(item)
            if index > 0 {
                item.snp.makeConstraints { make in
                    make.width.equalTo(firstItem)
                }
            }
            if index < items.count - 1 {
                metricsStack.addArrangedSubview(makeMetricDivider())
            }
        }
    }

    private func makeMetricDivider() -> UIView {
        let divider = UIView()
        divider.backgroundColor = UIColor.borderColor.withAlphaComponent(0.65)
        divider.snp.makeConstraints { make in
            make.width.equalTo(1 / UIScreen.main.scale)
            make.height.equalTo(48)
        }
        return divider
    }

    private func updateMetricFonts(for mode: SummaryMode) {
        switch mode {
        case .today:
            ordersLabel.font = .bodyBold(size: isIPad ? 22 : 20)
            ordersLabel.textColor = .accentOrange
            changeMetricLabel.font = .bodyBold(size: isIPad ? 34 : 30)
            changeMetricLabel.textColor = .accentOrange
            changeMetricLabel.textAlignment = .right

        case .range:
            ordersLabel.font = .bodyBold(size: isIPad ? 22 : 20)
            ordersLabel.textColor = .accentOrange
            changeMetricLabel.font = .bodyBold(size: isIPad ? 34 : 30)
            changeMetricLabel.textColor = .accentOrange
            changeMetricLabel.textAlignment = .right
        }
    }

    private func makeMetricStripItem(title: String, valueLabel: UILabel) -> UIView {
        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .captionMedium(size: isIPad ? 12 : 11)
        titleLabel.textColor = .textSecondary
        titleLabel.numberOfLines = 2
        titleLabel.textAlignment = .center
        titleLabel.setContentCompressionResistancePriority(.required, for: .vertical)

        valueLabel.textAlignment = .center
        valueLabel.setContentHuggingPriority(.required, for: .vertical)
        valueLabel.setContentCompressionResistancePriority(.required, for: .vertical)

        let stack = UIStackView(arrangedSubviews: [titleLabel, valueLabel])
        stack.axis = .vertical
        stack.spacing = 5
        stack.alignment = .center
        stack.distribution = .fill

        let container = UIView()
        container.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 6, left: 8, bottom: 6, right: 8))
        }
        container.snp.makeConstraints { make in
            make.height.greaterThanOrEqualTo(62)
        }
        return container
    }
}
