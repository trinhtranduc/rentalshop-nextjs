//
//  OrdersFilterSheet.swift
//  POS ADBD
//
//  Filter of the rent list in the redesigned orders tab (#371): status and sort.
//

import UIKit
import SnapKit

final class OrdersFilterSheet: UIViewController {
    var onApply: ((RentOrdersFilter) -> Void)?

    private var filter: RentOrdersFilter
    private let statuses: [OrderStatus?] = [nil, .reserved, .pickuped, .returned, .cancelled]
    private let sorts: [RentOrdersFilter.Sort] = [.pickupDate, .createdDate]
    private var statusButtons: [UIButton] = []
    private var sortButtons: [UIButton] = []

    init(filter: RentOrdersFilter) {
        self.filter = filter
        super.init(nibName: nil, bundle: nil)
        if let sheet = sheetPresentationController {
            sheet.detents = [.medium()]
            sheet.prefersGrabberVisible = true
            sheet.preferredCornerRadius = DS.Radius.sheet
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        let header = RCSheetHeaderView()
        header.title = "Order Filter".localized()

        statusButtons = statuses.enumerated().map { index, status in
            makeChip(status?.localizedDisplayName() ?? "All".localized(), tag: index, action: #selector(statusTapped(_:)))
        }
        sortButtons = sorts.enumerated().map { index, sort in
            makeChip((sort == .pickupDate ? "Pickup date" : "Book date").localized(), tag: index, action: #selector(sortTapped(_:)))
        }

        let reset = UIButton(type: .system)
        reset.setTitle("Reset Filter".localized(), for: .normal)
        reset.titleLabel?.font = Utils.mediumFont(size: 15)
        reset.addTarget(self, action: #selector(resetTapped), for: .touchUpInside)
        let confirm = RCPrimaryButton(title: "Confirm".localized(), backgroundColor: DS.Color.primary)
        confirm.addTarget(self, action: #selector(confirmTapped), for: .touchUpInside)
        confirm.snp.makeConstraints { make in make.height.equalTo(50) }
        let buttons = UIStackView(arrangedSubviews: [reset, confirm])
        buttons.spacing = DS.Spacing.md
        reset.snp.makeConstraints { make in make.width.equalTo(96) }

        let stack = UIStackView(arrangedSubviews: [
            sectionLabel("Status Filter".localized()), grid(statusButtons),
            sectionLabel("Sort By".localized()), grid(sortButtons),
            UIView(), buttons,
        ])
        stack.axis = .vertical
        stack.spacing = DS.Spacing.md
        view.addSubview(header)
        view.addSubview(stack)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.equalToSuperview()
            make.height.equalTo(56)
        }
        stack.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom).offset(DS.Spacing.sm)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-DS.Spacing.md)
        }
        refreshSelection()
    }

    private func sectionLabel(_ text: String) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = Utils.mediumFont(size: 14)
        label.textColor = DS.Color.textMuted
        return label
    }

    /// Chips, three per row
    private func grid(_ chips: [UIButton]) -> UIStackView {
        let column = UIStackView()
        column.axis = .vertical
        column.spacing = DS.Spacing.sm
        stride(from: 0, to: chips.count, by: 3).forEach { start in
            var row: [UIView] = Array(chips[start..<min(start + 3, chips.count)])
            while row.count < 3 { row.append(UIView()) }
            let line = UIStackView(arrangedSubviews: row)
            line.spacing = DS.Spacing.sm
            line.distribution = .fillEqually
            line.snp.makeConstraints { make in make.height.equalTo(DS.touchTarget) }
            column.addArrangedSubview(line)
        }
        return column
    }

    private func makeChip(_ title: String, tag: Int, action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        button.tag = tag
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = Utils.mediumFont(size: 14)
        button.titleLabel?.adjustsFontSizeToFitWidth = true
        button.layer.cornerRadius = DS.Radius.card
        button.layer.borderWidth = 1.5
        button.addTarget(self, action: action, for: .touchUpInside)
        return button
    }

    private func refreshSelection() {
        for (index, button) in statusButtons.enumerated() {
            style(button, selected: statuses[index] == filter.status)
        }
        for (index, button) in sortButtons.enumerated() {
            style(button, selected: sorts[index] == filter.sort)
        }
    }

    private func style(_ button: UIButton, selected: Bool) {
        button.backgroundColor = selected ? DS.Status.handOver.fill : DS.Color.background
        button.layer.borderColor = (selected ? DS.Color.primary : UIColor.clear).cgColor
        button.setTitleColor(selected ? DS.Color.primary : DS.Color.text, for: .normal)
        button.accessibilityTraits = selected ? (UIAccessibilityTraitButton | UIAccessibilityTraitSelected) : UIAccessibilityTraitButton
    }

    @objc private func statusTapped(_ sender: UIButton) {
        filter.status = statuses[sender.tag]
        refreshSelection()
    }

    @objc private func sortTapped(_ sender: UIButton) {
        filter.sort = sorts[sender.tag]
        refreshSelection()
    }

    @objc private func resetTapped() {
        filter = RentOrdersFilter()
        refreshSelection()
    }

    @objc private func confirmTapped() {
        onApply?(filter)
        dismiss(animated: true)
    }
}
