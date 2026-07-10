//
//  OverviewChartsSectionView.swift
//  POS ADBD
//

import UIKit
import DGCharts
import SnapKit

protocol OverviewChartsSectionViewDelegate: AnyObject {
    func chartsSectionDidToggleExpansion(_ section: OverviewChartsSectionView)
}

final class OverviewChartsSectionView: UIView {

    weak var delegate: OverviewChartsSectionViewDelegate?

    private(set) var isExpanded: Bool = false
    private var showsHorizontalHint: Bool = false

    let revenueChartView: LineChartView
    let ordersChartView: LineChartView

    private let chartsBodyStackView: UIStackView
    private let toggleChevron = UIImageView()
    private let toggleSubtitleLabel = UILabel()
    private let titleLabel = UILabel()
    private let chartIconView = UIImageView()
    private var chartsBodyHeightConstraint: Constraint?

    init(isIPad: Bool) {
        revenueChartView = LineChartView()
        revenueChartView.heightAnchor.constraint(equalToConstant: isIPad ? 240 : 220).isActive = true

        ordersChartView = LineChartView()
        ordersChartView.heightAnchor.constraint(equalToConstant: isIPad ? 200 : 180).isActive = true

        chartsBodyStackView = UIStackView(arrangedSubviews: [revenueChartView, ordersChartView])
        chartsBodyStackView.axis = .vertical
        chartsBodyStackView.spacing = 8
        chartsBodyStackView.clipsToBounds = true

        super.init(frame: .zero)

        // Caption above each chart so revenue vs order-count is unambiguous.
        let revenueCaption = Self.makeChartCaption("Report_Summary_Revenue".localized(), isIPad: isIPad)
        let ordersCaption = Self.makeChartCaption("Overview_Charts_OrderCount".localized(), isIPad: isIPad)
        chartsBodyStackView.insertArrangedSubview(revenueCaption, at: 0)
        chartsBodyStackView.insertArrangedSubview(ordersCaption, at: 2)
        chartsBodyStackView.setCustomSpacing(4, after: revenueCaption)
        chartsBodyStackView.setCustomSpacing(16, after: revenueChartView)
        chartsBodyStackView.setCustomSpacing(4, after: ordersCaption)

        backgroundColor = .backgroundCard
        layer.cornerRadius = 16
        layer.borderWidth = 1
        layer.borderColor = UIColor.borderColor.withAlphaComponent(0.52).cgColor
        layer.shadowColor = UIColor.black.withAlphaComponent(0.02).cgColor
        layer.shadowOpacity = 1
        layer.shadowRadius = 10
        layer.shadowOffset = CGSize(width: 0, height: 4)

        let symbolConfig = UIImage.SymbolConfiguration(pointSize: isIPad ? 16 : 15, weight: .semibold)
        chartIconView.image = UIImage(systemName: "chart.line.uptrend.xyaxis", withConfiguration: symbolConfig)
        chartIconView.tintColor = .brandPrimary
        chartIconView.contentMode = .scaleAspectFit
        chartIconView.snp.makeConstraints { make in
            make.width.height.equalTo(isIPad ? 22 : 20)
        }

        toggleChevron.image = UIImage(systemName: "chevron.down")
        toggleChevron.tintColor = .textSecondary
        toggleChevron.contentMode = .scaleAspectFit
        toggleChevron.snp.makeConstraints { make in
            make.width.height.equalTo(14)
        }

        titleLabel.text = "Overview_Charts_Title".localized()
        titleLabel.font = .bodyBold(size: isIPad ? 18 : 16)
        titleLabel.textColor = .textPrimary

        toggleSubtitleLabel.font = .captionMedium(size: 11)
        toggleSubtitleLabel.textColor = .textSecondary
        toggleSubtitleLabel.text = "Overview_Charts_Show".localized()

        let labelStack = UIStackView(arrangedSubviews: [titleLabel, toggleSubtitleLabel])
        labelStack.axis = .vertical
        labelStack.spacing = 3
        labelStack.alignment = .leading

        let headerStack = UIStackView(arrangedSubviews: [chartIconView, labelStack, UIView(), toggleChevron])
        headerStack.axis = .horizontal
        headerStack.spacing = 10
        headerStack.alignment = .center
        headerStack.isUserInteractionEnabled = false

        let toggleButton = UIButton(type: .system)
        toggleButton.accessibilityLabel = "Overview_Charts_Title".localized()
        toggleButton.addTarget(self, action: #selector(toggleTapped), for: .touchUpInside)

        addSubview(headerStack)
        addSubview(chartsBodyStackView)
        addSubview(toggleButton)

        headerStack.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview().inset(14)
        }
        chartsBodyStackView.snp.makeConstraints { make in
            make.top.equalTo(headerStack.snp.bottom).offset(10)
            make.leading.trailing.bottom.equalToSuperview().inset(14)
            chartsBodyHeightConstraint = make.height.equalTo(0).constraint
        }
        toggleButton.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview()
            make.bottom.equalTo(headerStack.snp.bottom).offset(12)
        }
        chartsBodyHeightConstraint?.deactivate()
        refreshHeaderState()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private static func makeChartCaption(_ text: String, isIPad: Bool) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = .captionMedium(size: isIPad ? 13 : 12)
        label.textColor = .textSecondary
        return label
    }

    func configureInitialExpansion(isIPad: Bool) {
        setExpanded(true, animated: false)
    }

    func setShowsHorizontalHint(_ shows: Bool) {
        showsHorizontalHint = shows
        refreshHeaderState()
    }

    func setExpanded(_ expanded: Bool, animated: Bool) {
        isExpanded = expanded

        let updates = {
            self.chartsBodyStackView.isHidden = !expanded
            self.chartsBodyStackView.alpha = expanded ? 1 : 0
            if expanded {
                self.chartsBodyHeightConstraint?.deactivate()
            } else {
                self.chartsBodyHeightConstraint?.activate()
            }
            self.toggleChevron.image = UIImage(systemName: expanded ? "chevron.up" : "chevron.right")
            self.refreshHeaderState()
            self.layoutIfNeeded()
        }

        if animated {
            UIView.animate(withDuration: 0.25, animations: updates)
        } else {
            updates()
        }
    }

    @objc private func toggleTapped() {
        setExpanded(!isExpanded, animated: true)
        if let scrollView = enclosingScrollView() {
            UIView.animate(withDuration: 0.25) {
                scrollView.layoutIfNeeded()
            }
        }
        delegate?.chartsSectionDidToggleExpansion(self)
    }

    private func enclosingScrollView() -> UIScrollView? {
        var current: UIView? = superview
        while let view = current {
            if let scrollView = view as? UIScrollView {
                return scrollView
            }
            current = view.superview
        }
        return nil
    }

    private func refreshHeaderState() {
        if isExpanded {
            toggleSubtitleLabel.text = showsHorizontalHint
                ? "Overview_Charts_SwipeHint".localized()
                : "Overview_Charts_Hide".localized()
            toggleSubtitleLabel.textColor = showsHorizontalHint ? .brandPrimary : .textSecondary
        } else {
            toggleSubtitleLabel.text = "Overview_Charts_Show".localized()
            toggleSubtitleLabel.textColor = .textSecondary
        }
    }
}
