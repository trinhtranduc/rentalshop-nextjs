//
//  OverviewPeriodFilterView.swift
//  POS ADBD
//

import UIKit
import SnapKit

final class OverviewPeriodFilterView: UIView {

    var onDateTapped: (() -> Void)?
    var onRefreshTapped: (() -> Void)?

    private let rowStack = UIStackView()
    private let dateControl = UIControl()
    private let calendarIcon = UIImageView()
    private let dateLabel = UILabel()
    private let chevronIcon = UIImageView()
    private let refreshButton = UIButton(type: .system)

    override init(frame: CGRect) {
        super.init(frame: frame)
        buildLayout()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func configure(title: String, enabled: Bool) {
        dateLabel.text = title
        dateControl.isEnabled = enabled
        dateControl.alpha = enabled ? 1 : 0.55
    }

    private func buildLayout() {
        let symbol = UIImage.SymbolConfiguration(pointSize: 13, weight: .regular)
        calendarIcon.image = UIImage(systemName: "calendar", withConfiguration: symbol)
        calendarIcon.tintColor = .textPrimary
        calendarIcon.contentMode = .scaleAspectFit
        calendarIcon.setContentHuggingPriority(.required, for: .horizontal)

        dateLabel.font = .bodyMedium(size: 14)
        dateLabel.textColor = .textPrimary
        dateLabel.setContentHuggingPriority(.required, for: .horizontal)
        dateLabel.setContentCompressionResistancePriority(.required, for: .horizontal)

        chevronIcon.image = UIImage(systemName: "chevron.down", withConfiguration: symbol)
        chevronIcon.tintColor = .textSecondary
        chevronIcon.contentMode = .scaleAspectFit
        chevronIcon.setContentHuggingPriority(.required, for: .horizontal)

        let content = UIStackView(arrangedSubviews: [calendarIcon, dateLabel, chevronIcon])
        content.axis = .horizontal
        content.alignment = .center
        content.spacing = 6
        content.isUserInteractionEnabled = false

        dateControl.backgroundColor = UIColor.systemGray6
        dateControl.layer.cornerRadius = 10
        dateControl.addTarget(self, action: #selector(dateTapped), for: .touchUpInside)
        dateControl.addSubview(content)
        calendarIcon.snp.makeConstraints { make in
            make.width.height.equalTo(16)
        }
        chevronIcon.snp.makeConstraints { make in
            make.width.height.equalTo(12)
        }
        content.snp.makeConstraints { make in
            make.top.bottom.equalToSuperview().inset(10)
            make.leading.trailing.equalToSuperview().inset(12)
        }
        dateControl.setContentHuggingPriority(.required, for: .horizontal)
        dateControl.setContentCompressionResistancePriority(.required, for: .horizontal)

        refreshButton.setImage(UIImage(systemName: "arrow.clockwise"), for: .normal)
        refreshButton.tintColor = .textPrimary
        refreshButton.backgroundColor = UIColor.systemGray6
        refreshButton.layer.cornerRadius = 10
        refreshButton.addTarget(self, action: #selector(refreshTapped), for: .touchUpInside)
        refreshButton.setContentHuggingPriority(.required, for: .horizontal)
        refreshButton.snp.makeConstraints { make in
            make.width.height.equalTo(40)
        }

        rowStack.axis = .horizontal
        rowStack.spacing = 8
        rowStack.alignment = .center
        rowStack.addArrangedSubview(dateControl)
        rowStack.addArrangedSubview(UIView())
        rowStack.addArrangedSubview(refreshButton)

        addSubview(rowStack)
        rowStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.height.equalTo(44)
        }
    }

    @objc private func dateTapped() {
        onDateTapped?()
    }

    @objc private func refreshTapped() {
        onRefreshTapped?()
    }
}
