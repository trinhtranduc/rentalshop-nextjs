//
//  OverviewPeriodFilterView.swift
//  POS ADBD
//

import UIKit
import SnapKit

final class OverviewPeriodFilterView: UIView {

    var onPeriodSelected: ((ReportPeriod) -> Void)?
    var onDateTapped: (() -> Void)?
    var onRefreshTapped: (() -> Void)?

    private let rowStack = UIStackView()
    private let scrollView = UIScrollView()
    private let chipStack = UIStackView()
    private let dateButton = UIButton(type: .system)
    private let refreshButton = UIButton(type: .system)
    private var chipButtons: [UIButton] = []
    private var availablePeriods: [ReportPeriod] = ReportPeriod.allCases
    private(set) var selectedPeriod: ReportPeriod = .today

    override init(frame: CGRect) {
        super.init(frame: frame)
        buildLayout()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func configure(
        periods: [ReportPeriod],
        selected: ReportPeriod,
        dateTitle: String?,
        showsDateButton: Bool
    ) {
        availablePeriods = periods
        selectedPeriod = selected
        rebuildChips()
        updateDateButton(title: dateTitle, isVisible: showsDateButton)
        updateChipSelection()
    }

    func setDateTitle(_ title: String) {
        dateButton.setTitle(title, for: .normal)
    }

    func setDateButtonEnabled(_ enabled: Bool) {
        dateButton.isUserInteractionEnabled = enabled
        dateButton.alpha = enabled ? 1 : 0.55
    }

    private func buildLayout() {
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.alwaysBounceHorizontal = true
        scrollView.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        chipStack.axis = .horizontal
        chipStack.spacing = 8
        chipStack.alignment = .center

        let calendarImage = UIImage(systemName: "calendar")
        dateButton.setImage(calendarImage, for: .normal)
        dateButton.semanticContentAttribute = .forceLeftToRight
        dateButton.titleLabel?.font = .bodyMedium(size: 13)
        dateButton.tintColor = .brandPrimary
        dateButton.setTitleColor(.brandPrimary, for: .normal)
        dateButton.backgroundColor = .backgroundCard
        dateButton.layer.cornerRadius = 14
        dateButton.layer.borderWidth = 1
        dateButton.layer.borderColor = UIColor.brandPrimary.withAlphaComponent(0.14).cgColor
        dateButton.contentEdgeInsets = UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12)
        dateButton.imageEdgeInsets = UIEdgeInsets(top: 0, left: -4, bottom: 0, right: 4)
        dateButton.addTarget(self, action: #selector(dateTapped), for: .touchUpInside)
        dateButton.setContentHuggingPriority(.required, for: .horizontal)
        dateButton.setContentCompressionResistancePriority(.required, for: .horizontal)

        refreshButton.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        refreshButton.tintColor = .brandPrimary
        refreshButton.backgroundColor = .backgroundCard
        refreshButton.layer.cornerRadius = 14
        refreshButton.layer.borderWidth = 1
        refreshButton.layer.borderColor = UIColor.brandPrimary.withAlphaComponent(0.14).cgColor
        refreshButton.addTarget(self, action: #selector(refreshTapped), for: .touchUpInside)
        refreshButton.setContentHuggingPriority(.required, for: .horizontal)
        refreshButton.setContentCompressionResistancePriority(.required, for: .horizontal)
        refreshButton.snp.makeConstraints { make in
            make.width.height.equalTo(44)
        }

        rowStack.axis = .horizontal
        rowStack.spacing = 8
        rowStack.alignment = .center
        rowStack.addArrangedSubview(scrollView)
        rowStack.addArrangedSubview(dateButton)
        rowStack.addArrangedSubview(refreshButton)

        scrollView.addSubview(chipStack)
        addSubview(rowStack)

        rowStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.height.equalTo(44)
        }
        chipStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.height.equalToSuperview()
        }
    }

    private func rebuildChips() {
        chipButtons.forEach { $0.removeFromSuperview() }
        chipButtons.removeAll()

        for period in availablePeriods {
            let button = makeChipButton(title: period.title, tag: period.rawValue)
            chipStack.addArrangedSubview(button)
            chipButtons.append(button)
        }
    }

    private func makeChipButton(title: String, tag: Int) -> UIButton {
        let button = UIButton(type: .system)
        button.tag = tag
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = .bodyMedium(size: 15)
        button.contentEdgeInsets = UIEdgeInsets(top: 10, left: 15, bottom: 10, right: 15)
        button.layer.cornerRadius = 15
        button.layer.borderWidth = 1
        button.addTarget(self, action: #selector(chipTapped(_:)), for: .touchUpInside)
        button.setContentHuggingPriority(.required, for: .horizontal)
        button.setContentCompressionResistancePriority(.required, for: .horizontal)
        return button
    }

    private func updateChipSelection() {
        for button in chipButtons {
            let isSelected = button.tag == selectedPeriod.rawValue
            button.backgroundColor = isSelected ? UIColor.brandPrimary.withAlphaComponent(0.10) : .backgroundCard
            button.layer.borderColor = (isSelected ? UIColor.brandPrimary.withAlphaComponent(0.20) : UIColor.borderColor.withAlphaComponent(0.75)).cgColor
            button.setTitleColor(isSelected ? .brandPrimary : .textPrimary, for: .normal)
            button.titleLabel?.font = isSelected ? .bodyMedium(size: 15) : .bodyMedium(size: 15)
            button.layer.shadowOpacity = 0
        }
    }

    private func updateDateButton(title: String?, isVisible: Bool) {
        dateButton.isHidden = !isVisible
        rowStack.spacing = 8
        if let title = title {
            dateButton.setTitle(title, for: .normal)
        }
    }

    @objc private func chipTapped(_ sender: UIButton) {
        guard let period = ReportPeriod(rawValue: sender.tag) else { return }
        selectedPeriod = period
        updateChipSelection()
        onPeriodSelected?(period)
    }

    @objc private func dateTapped() {
        onDateTapped?()
    }

    @objc private func refreshTapped() {
        onRefreshTapped?()
    }
}
