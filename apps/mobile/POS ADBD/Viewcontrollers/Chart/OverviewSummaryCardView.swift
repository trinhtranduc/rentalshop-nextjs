//
//  OverviewSummaryCardView.swift
//  POS ADBD
//

import UIKit
import DGCharts
import SnapKit

final class OverviewSummaryCardView: UIView {

    enum SummaryMode {
        case today
        case range
    }

    enum PerformanceMode: Int {
        case revenue = 0
        case growth = 1
        case orders = 2
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
    let chartView: LineChartView

    var performanceMode: PerformanceMode = .revenue {
        didSet {
            guard oldValue != performanceMode else { return }
            refreshModeChrome()
            renderStoredHero()
            onPerformanceModeChanged?(performanceMode)
        }
    }

    var onPerformanceModeChanged: ((PerformanceMode) -> Void)?

    private let isIPad: Bool
    private let contentStack = UIStackView()
    private let metricTitleLabel = UILabel()
    private let swipeHintLabel = UILabel()
    private var modeButtons: [UIButton] = []

    private var storedRevenue: Double = 0
    private var storedOrders: Double = 0
    private var storedRevenueGrowth: Double?
    private var storedOrdersGrowth: Double?

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
        growthPillView.addSubview(growthPillLabel)
        growthPillLabel.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }

        chartView = LineChartView()
        chartView.snp.makeConstraints { make in
            make.height.equalTo(isIPad ? 240 : 200)
        }
        chartView.setContentHuggingPriority(.required, for: .vertical)
        chartView.setContentCompressionResistancePriority(.required, for: .vertical)

        super.init(frame: .zero)

        configureBaseLabels()
        buildLayout()
        refreshModeChrome()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func setMode(_ mode: SummaryMode) {
        incomeLabel.font = .bodyBold(size: isIPad ? 31 : 27)
        incomeLabel.minimumScaleFactor = 0.7
        _ = mode
        renderStoredHero()
    }

    func setContextText(_ text: String?) {
        _ = text
    }

    func applyIncomeColor(for amount: Double) {
        guard performanceMode == .revenue else { return }
        incomeLabel.textColor = OverviewUIBuilder.revenueDisplayColor(for: amount, positiveColor: .brandPrimary)
    }

    func applyChangeMetric(text: String?, color: UIColor) {
        let value = (text?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false) ? text! : "—"
        changeMetricLabel.text = value
        changeMetricLabel.textColor = color
    }

    func setShowsHorizontalHint(_ shows: Bool) {
        swipeHintLabel.isHidden = !shows
        swipeHintLabel.text = "Overview_Charts_SwipeHint".localized()
    }

    func applyHero(
        revenue: Double,
        orders: Double,
        revenueGrowth: Double?,
        ordersGrowth: Double?
    ) {
        storedRevenue = revenue
        storedOrders = orders
        storedRevenueGrowth = revenueGrowth
        storedOrdersGrowth = ordersGrowth
        ordersLabel.text = orders.formatStringInCommon()
        changeMetricLabel.text = orders.formatStringInCommon()
        renderStoredHero()
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
            $0.isHidden = true
        }

        metricTitleLabel.font = .captionMedium(size: 12)
        metricTitleLabel.textColor = .textTertiary

        swipeHintLabel.font = .captionMedium(size: 11)
        swipeHintLabel.textColor = .brandPrimary
        swipeHintLabel.isHidden = true
    }

    private func buildLayout() {
        let titleLabel = UILabel()
        titleLabel.text = "Overview_Performance_Title".localized()
        titleLabel.font = .bodyBold(size: isIPad ? 18 : 16)
        titleLabel.textColor = .textPrimary

        let pills = makeModePills()

        let titleRow = UIStackView(arrangedSubviews: [metricTitleLabel, revenueInfoButton, UIView()])
        titleRow.axis = .horizontal
        titleRow.spacing = 4
        titleRow.alignment = .center

        let heroStack = UIStackView(arrangedSubviews: [titleRow, incomeLabel, growthPillView])
        heroStack.axis = .vertical
        heroStack.spacing = 4
        heroStack.alignment = .leading

        contentStack.axis = .vertical
        contentStack.spacing = 12
        contentStack.alignment = .fill
        contentStack.addArrangedSubview(titleLabel)
        contentStack.addArrangedSubview(pills)
        contentStack.addArrangedSubview(heroStack)
        contentStack.addArrangedSubview(chartView)
        contentStack.addArrangedSubview(swipeHintLabel)

        addSubview(contentStack)
        contentStack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 16, left: 16, bottom: 14, right: 16))
        }
    }

    private func makeModePills() -> UIStackView {
        let titles = [
            "Report_Summary_Revenue".localized(),
            "Overview_Performance_GrowthPercent".localized(),
            "Report_Summary_Orders".localized()
        ]
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 8
        stack.distribution = .fillEqually

        for (index, title) in titles.enumerated() {
            let button = UIButton(type: .system)
            button.tag = index
            button.setTitle(title, for: .normal)
            button.titleLabel?.font = .captionMedium(size: isIPad ? 13 : 12)
            button.titleLabel?.adjustsFontSizeToFitWidth = true
            button.titleLabel?.minimumScaleFactor = 0.8
            button.layer.cornerRadius = 8
            button.layer.borderWidth = 1.5
            button.addTarget(self, action: #selector(modePillTapped(_:)), for: .touchUpInside)
            button.snp.makeConstraints { make in
                make.height.equalTo(32)
            }
            modeButtons.append(button)
            stack.addArrangedSubview(button)
        }
        return stack
    }

    @objc private func modePillTapped(_ sender: UIButton) {
        guard let mode = PerformanceMode(rawValue: sender.tag) else { return }
        performanceMode = mode
    }

    private func refreshModeChrome() {
        for button in modeButtons {
            let selected = button.tag == performanceMode.rawValue
            button.backgroundColor = selected ? .backgroundPrimary : UIColor.systemGray6
            button.setTitleColor(.textPrimary, for: .normal)
            button.layer.borderColor = selected
                ? UIColor.label.cgColor
                : UIColor.clear.cgColor
        }

        switch performanceMode {
        case .revenue:
            metricTitleLabel.text = "Report_Summary_Revenue".localized()
            revenueInfoButton.isHidden = false
        case .growth:
            metricTitleLabel.text = "Overview_Performance_GrowthPercent".localized()
            revenueInfoButton.isHidden = true
        case .orders:
            metricTitleLabel.text = "Report_Summary_Orders".localized()
            revenueInfoButton.isHidden = true
        }
    }

    private func renderStoredHero() {
        let vsPrevious = "vs previous period".localized()

        switch performanceMode {
        case .revenue:
            incomeLabel.text = storedRevenue.formatStringInCommon()
            incomeLabel.textColor = OverviewUIBuilder.revenueDisplayColor(
                for: storedRevenue,
                positiveColor: .brandPrimary
            )
            applyGrowthCaption(storedRevenueGrowth, prefix: nil, vsPrevious: vsPrevious)

        case .growth:
            let growth = storedRevenueGrowth
            incomeLabel.text = growth.map { OverviewUIBuilder.growthText($0) } ?? "—"
            incomeLabel.textColor = growthColor(growth)
            if growth != nil {
                growthPillLabel.text = vsPrevious
                growthPillLabel.textColor = .textSecondary
                growthPillView.isHidden = false
            } else {
                growthPillView.isHidden = true
            }

        case .orders:
            incomeLabel.text = storedOrders.formatStringInCommon()
            incomeLabel.textColor = .accentOrange
            applyGrowthCaption(storedOrdersGrowth, prefix: nil, vsPrevious: vsPrevious)
        }
    }

    private func applyGrowthCaption(_ growth: Double?, prefix: String?, vsPrevious: String) {
        guard let growth else {
            growthPillView.isHidden = true
            return
        }
        let text = OverviewUIBuilder.growthText(growth) + "  " + vsPrevious
        growthPillLabel.text = prefix.map { $0 + " " + text } ?? text
        growthPillLabel.textColor = growthColor(growth)
        growthPillView.isHidden = false
    }

    private func growthColor(_ growth: Double?) -> UIColor {
        guard let growth else { return .textSecondary }
        if growth > 0 { return .actionSuccess }
        if growth < 0 { return .actionDanger }
        return .textSecondary
    }
}
