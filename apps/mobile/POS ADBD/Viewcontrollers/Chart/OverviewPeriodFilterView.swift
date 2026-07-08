//
//  OverviewPeriodFilterView.swift
//  POS ADBD
//

import UIKit
import SnapKit

final class OverviewPeriodFilterView: UIView {

    var onPeriodSelected: ((ReportPeriod) -> Void)?
    var onDateTapped: (() -> Void)?

    private let scrollView = UIScrollView()
    private let chipStack = UIStackView()
    private let dateButton = UIButton(type: .system)
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

        chipStack.axis = .horizontal
        chipStack.spacing = 8
        chipStack.alignment = .center

        dateButton.titleLabel?.font = .bodyMedium(size: 14)
        dateButton.tintColor = .brandPrimary
        dateButton.setTitleColor(.brandPrimary, for: .normal)
        dateButton.backgroundColor = .backgroundCard
        dateButton.layer.cornerRadius = 10
        dateButton.layer.borderWidth = 1
        dateButton.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.8).cgColor
        dateButton.contentEdgeInsets = UIEdgeInsets(top: 6, left: 10, bottom: 6, right: 10)
        dateButton.addTarget(self, action: #selector(dateTapped), for: .touchUpInside)
        dateButton.setContentHuggingPriority(.required, for: .horizontal)
        dateButton.setContentCompressionResistancePriority(.required, for: .horizontal)

        let row = UIStackView(arrangedSubviews: [scrollView, dateButton])
        row.axis = .horizontal
        row.spacing = 10
        row.alignment = .center

        scrollView.addSubview(chipStack)
        addSubview(row)

        row.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.height.equalTo(36)
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
        button.titleLabel?.font = .bodyMedium(size: 13)
        button.contentEdgeInsets = UIEdgeInsets(top: 7, left: 12, bottom: 7, right: 12)
        button.layer.cornerRadius = 10
        button.layer.borderWidth = 1
        button.addTarget(self, action: #selector(chipTapped(_:)), for: .touchUpInside)
        button.setContentHuggingPriority(.required, for: .horizontal)
        return button
    }

    private func updateChipSelection() {
        for button in chipButtons {
            let isSelected = button.tag == selectedPeriod.rawValue
            button.backgroundColor = isSelected ? .brandPrimary : .backgroundCard
            button.layer.borderColor = (isSelected ? UIColor.brandPrimary : UIColor.borderColor.withAlphaComponent(0.75)).cgColor
            button.setTitleColor(isSelected ? .white : .textPrimary, for: .normal)
        }
    }

    private func updateDateButton(title: String?, isVisible: Bool) {
        dateButton.isHidden = !isVisible
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
}
