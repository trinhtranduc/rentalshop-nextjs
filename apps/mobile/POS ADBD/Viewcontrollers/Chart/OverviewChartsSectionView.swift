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

    let barChartView: BarChartView
    let lineChartView: LineChartView

    private let chartsBodyStackView: UIStackView
    private let toggleChevron = UIImageView()
    private let toggleSubtitleLabel = UILabel()
    private let titleLabel = UILabel()
    private var chartsBodyHeightConstraint: Constraint?

    init(isIPad: Bool) {
        barChartView = BarChartView()
        barChartView.heightAnchor.constraint(equalToConstant: 250).isActive = true

        lineChartView = LineChartView()
        lineChartView.heightAnchor.constraint(equalToConstant: 250).isActive = true

        let revenuePanel = OverviewChartsSectionView.makeChartPanel(
            title: "Revenue".localized(),
            subtitle: "Real income".localized() + " • " + "Plan income".localized(),
            chartView: barChartView,
            isIPad: isIPad
        )
        let ordersPanel = OverviewChartsSectionView.makeChartPanel(
            title: "Order total".localized(),
            subtitle: "Overview_Charts_Orders_Subtitle".localized(),
            chartView: lineChartView,
            isIPad: isIPad
        )

        chartsBodyStackView = UIStackView(arrangedSubviews: [revenuePanel, ordersPanel])
        chartsBodyStackView.axis = .vertical
        chartsBodyStackView.spacing = 12
        chartsBodyStackView.clipsToBounds = true

        super.init(frame: .zero)

        backgroundColor = .backgroundCard
        layer.cornerRadius = 16
        layer.borderWidth = 1
        layer.borderColor = UIColor.borderColor.withAlphaComponent(0.52).cgColor
        layer.shadowColor = UIColor.black.withAlphaComponent(0.02).cgColor
        layer.shadowOpacity = 1
        layer.shadowRadius = 10
        layer.shadowOffset = CGSize(width: 0, height: 4)

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

        let headerStack = UIStackView(arrangedSubviews: [labelStack, UIView(), toggleChevron])
        headerStack.axis = .horizontal
        headerStack.spacing = 12
        headerStack.alignment = .center
        // Labels/chevron must not steal taps from the full-width toggle control beneath.
        headerStack.isUserInteractionEnabled = false

        let toggleButton = UIButton(type: .system)
        toggleButton.accessibilityLabel = "Overview_Charts_Title".localized()
        toggleButton.addTarget(self, action: #selector(toggleTapped), for: .touchUpInside)

        addSubview(headerStack)
        addSubview(chartsBodyStackView)
        // Toggle sits above the header visuals so expand/collapse always receives the tap.
        addSubview(toggleButton)

        headerStack.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview().inset(14)
        }
        chartsBodyStackView.snp.makeConstraints { make in
            make.top.equalTo(headerStack.snp.bottom).offset(12)
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
            self.toggleChevron.image = UIImage(systemName: expanded ? "chevron.up" : "chevron.down")
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
        // Parent scroll view may need another layout pass after height change.
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

    private static func makeChartPanel(
        title: String,
        subtitle: String,
        chartView: UIView,
        isIPad: Bool
    ) -> UIView {
        let container = UIView()
        container.backgroundColor = .backgroundCard
        container.layer.cornerRadius = 12
        container.layer.borderWidth = 1
        container.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.68).cgColor

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .bodyBold(size: isIPad ? 16 : 15)
        titleLabel.textColor = .textPrimary

        let subtitleLabel = UILabel()
        subtitleLabel.text = subtitle
        subtitleLabel.font = .captionMedium(size: 11)
        subtitleLabel.textColor = .textSecondary
        subtitleLabel.numberOfLines = 2

        let labelStack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        labelStack.axis = .vertical
        labelStack.spacing = 3
        labelStack.alignment = .leading

        let stack = UIStackView(arrangedSubviews: [labelStack, chartView])
        stack.axis = .vertical
        stack.spacing = 10

        container.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 12, bottom: 12, right: 12))
        }

        return container
    }
}
