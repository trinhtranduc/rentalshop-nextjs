//
//  OrdersFilterSheet.swift
//  POS ADBD
//
//  "Lọc & sắp xếp" of the rent list (board Loc, #401): sort, date range and "Xem N đơn".
//  The status is chosen with the chips on the list itself.
//

import UIKit
import SnapKit

final class OrdersFilterSheet: UIViewController {
    var onApply: ((RentOrdersFilter) -> Void)?
    /// Size of the list for a filter (nil while unknown)
    var countProvider: ((RentOrdersFilter, @escaping (Int?) -> Void) -> Void)?

    private static let outline = UIColor(hexString: "CBD5E1")
    private static let chipBorder = UIColor(hexString: "E2E8F0")
    private static let selectedFill = UIColor(hexString: "EFF6FF")
    private static let selectedText = UIColor(hexString: "1E40AF")
    private static let trackFill = UIColor(hexString: "F1F5F9")

    private var filter: RentOrdersFilter
    private let sorts = RentOrdersFilter.Sort.allCases
    private let bases = RentOrdersFilter.DateBasis.allCases
    private let presets: [RentOrdersFilter.DateRange] = [.any, .today, .next7Days, .thisMonth]
    private var sortButtons: [UIButton] = []
    private var basisButtons: [UIButton] = []
    private var presetButtons: [UIButton] = []
    private let customButton = UIButton(type: .system)
    private let applyButton = V2.primaryButton("")
    private let contentStack = UIStackView()

    init(filter: RentOrdersFilter) {
        self.filter = filter
        super.init(nibName: nil, bundle: nil)
        if let sheet = sheetPresentationController {
            sheet.detents = [.large()]
            if #available(iOS 16.0, *) {
                // As tall as the content (board Loc), never taller than the screen allows
                sheet.detents = [.custom { [weak self] context in
                    guard let self else { return nil }
                    return min(context.maximumDetentValue, self.fittingHeight())
                }]
            }
            sheet.prefersGrabberVisible = true
            sheet.preferredCornerRadius = 24
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface

        let title = V2.label("orders.v2.filter.title".localized(), size: 20, weight: .bold)
        let reset = UIButton(type: .system)
        reset.setTitle("Reset Filter".localized(), for: .normal)
        reset.setTitleColor(DS.Color.primary, for: .normal)
        reset.titleLabel?.font = Utils.boldFont(size: 15)
        reset.addTarget(self, action: #selector(resetTapped), for: .touchUpInside)
        reset.snp.makeConstraints { make in make.height.equalTo(40) }
        let titleRow = UIStackView(arrangedSubviews: [title, UIView(), reset])
        titleRow.alignment = .center

        sortButtons = sorts.enumerated().map { index, sort in
            let button = makeButton(Self.sortTitle(sort), size: 14, tag: index, action: #selector(sortTapped(_:)))
            button.layer.cornerRadius = 12
            button.snp.makeConstraints { make in make.height.equalTo(44) }
            return button
        }
        basisButtons = bases.enumerated().map { index, basis in
            let button = makeButton(Self.basisTitle(basis), size: 13, tag: index, action: #selector(basisTapped(_:)))
            button.layer.cornerRadius = 9
            button.snp.makeConstraints { make in make.height.equalTo(36) }
            return button
        }
        presetButtons = presets.enumerated().map { index, preset in
            let button = makeButton(Self.presetTitle(preset), size: 14, tag: index, action: #selector(presetTapped(_:)))
            stylePill(button)
            return button
        }
        customButton.setImage(DS.symbol("calendar", 16), for: .normal)
        customButton.titleLabel?.font = Utils.regularFont(size: 14)
        customButton.imageEdgeInsets = UIEdgeInsets(top: 0, left: -3, bottom: 0, right: 3)
        customButton.titleEdgeInsets = UIEdgeInsets(top: 0, left: 3, bottom: 0, right: -3)
        customButton.addTarget(self, action: #selector(customTapped), for: .touchUpInside)
        stylePill(customButton)

        let sortGrid = UIStackView()
        sortGrid.axis = .vertical
        sortGrid.spacing = DS.Spacing.sm
        stride(from: 0, to: sortButtons.count, by: 2).forEach { start in
            var line: [UIView] = Array(sortButtons[start..<min(start + 2, sortButtons.count)])
            if line.count < 2 { line.append(UIView()) }
            let row = UIStackView(arrangedSubviews: line)
            row.spacing = DS.Spacing.sm
            row.distribution = .fillEqually
            sortGrid.addArrangedSubview(row)
        }

        let track = UIStackView(arrangedSubviews: basisButtons)
        track.distribution = .fillEqually
        track.backgroundColor = Self.trackFill
        track.layer.cornerRadius = 12
        track.isLayoutMarginsRelativeArrangement = true
        track.layoutMargins = UIEdgeInsets(top: 4, left: 4, bottom: 4, right: 4)

        let presetLines = wrap(presetButtons + [customButton], width: UIScreen.main.bounds.width - 2 * DS.Spacing.lg)

        applyButton.addTarget(self, action: #selector(applyTapped), for: .touchUpInside)

        let sortSection = UIStackView(arrangedSubviews: [sectionLabel("orders.v2.filter.sort".localized()), sortGrid])
        sortSection.axis = .vertical
        sortSection.spacing = 16
        let rangeSection = UIStackView(arrangedSubviews: [sectionLabel("orders.v2.filter.range".localized()), track, presetLines])
        rangeSection.axis = .vertical
        rangeSection.spacing = DS.Spacing.sm
        rangeSection.setCustomSpacing(16, after: rangeSection.arrangedSubviews[0])

        let stack = contentStack
        [titleRow, sortSection, rangeSection, applyButton].forEach { stack.addArrangedSubview($0) }
        stack.axis = .vertical
        stack.spacing = DS.Spacing.lg
        view.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(DS.Spacing.xl)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
        refresh()
    }

    /// Top inset + content + the board's 28pt bottom padding
    private func fittingHeight() -> CGFloat {
        loadViewIfNeeded()
        let width = (view.bounds.width > 0 ? view.bounds.width : UIScreen.main.bounds.width) - 2 * DS.Spacing.lg
        let size = contentStack.systemLayoutSizeFitting(CGSize(width: width, height: 0),
                                                       withHorizontalFittingPriority: .required,
                                                       verticalFittingPriority: .fittingSizeLevel)
        return DS.Spacing.xl + size.height + 28
    }

    // MARK: - Texts

    static func sortTitle(_ sort: RentOrdersFilter.Sort) -> String {
        switch sort {
        case .createdDate: return "orders.v2.sort.created".localized()
        case .pickupDate: return "orders.v2.sort.pickup".localized()
        case .returnDate: return "orders.v2.sort.return".localized()
        }
    }

    private static func basisTitle(_ basis: RentOrdersFilter.DateBasis) -> String {
        switch basis {
        case .created: return "orders.v2.basis.created".localized()
        case .pickedUp: return "orders.v2.basis.pickup".localized()
        case .returned: return "orders.v2.basis.return".localized()
        }
    }

    private static func presetTitle(_ range: RentOrdersFilter.DateRange) -> String {
        switch range {
        case .any: return "orders.v2.range.any".localized()
        case .today: return "orders.v2.range.today".localized()
        case .next7Days: return "orders.v2.range.next7".localized()
        case .thisMonth: return "orders.v2.range.month".localized()
        case .custom(let from, let to):
            return "\(OrdersHomeLogic.dayMonth(from, timeZone: .current)) – \(OrdersHomeLogic.dayMonth(to, timeZone: .current))"
        }
    }

    // MARK: - Building blocks

    private func sectionLabel(_ text: String) -> UILabel {
        let label = V2.label(nil, size: 13, weight: .bold, color: DS.Color.textMuted)
        label.attributedText = NSAttributedString(string: text, attributes: [NSAttributedString.Key.kern: 0.5])
        return label
    }

    private func makeButton(_ title: String, size: CGFloat, tag: Int, action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        button.tag = tag
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = Utils.regularFont(size: size)
        button.titleLabel?.adjustsFontSizeToFitWidth = true
        button.addTarget(self, action: action, for: .touchUpInside)
        return button
    }

    private func stylePill(_ button: UIButton) {
        button.layer.cornerRadius = 20
        button.contentEdgeInsets = UIEdgeInsets(top: 0, left: 14, bottom: 0, right: 14)
        button.snp.makeConstraints { make in make.height.equalTo(40) }
    }

    /// Pills in lines that fit `width` (board Loc: chips wrap)
    private func wrap(_ buttons: [UIButton], width: CGFloat) -> UIStackView {
        let column = UIStackView()
        column.axis = .vertical
        column.alignment = .leading
        column.spacing = DS.Spacing.sm
        var line = UIStackView()
        var used: CGFloat = 0
        for button in buttons {
            let size = button.intrinsicContentSize.width + 8 // room for the bold selected title
            if used > 0 && used + DS.Spacing.sm + size > width {
                column.addArrangedSubview(line)
                line = UIStackView()
                used = 0
            }
            line.spacing = DS.Spacing.sm
            line.addArrangedSubview(button)
            used += (used > 0 ? DS.Spacing.sm : 0) + size
        }
        column.addArrangedSubview(line)
        return column
    }

    // MARK: - State

    private func refresh() {
        for (index, button) in sortButtons.enumerated() {
            let selected = sorts[index] == filter.sort
            button.layer.borderWidth = selected ? 2 : 1
            button.layer.borderColor = (selected ? DS.Color.primary : Self.outline).cgColor
            button.backgroundColor = selected ? Self.selectedFill : DS.Color.surface
            button.setTitleColor(selected ? Self.selectedText : DS.Color.text, for: .normal)
            button.titleLabel?.font = selected ? Utils.boldFont(size: 14) : Utils.regularFont(size: 14)
            button.accessibilityTraits = selected ? (UIAccessibilityTraitButton | UIAccessibilityTraitSelected) : UIAccessibilityTraitButton
        }
        for (index, button) in basisButtons.enumerated() {
            let selected = bases[index] == filter.dateBasis
            button.backgroundColor = selected ? DS.Color.surface : .clear
            button.setTitleColor(selected ? DS.Color.text : DS.Color.textMuted, for: .normal)
            button.titleLabel?.font = selected ? Utils.boldFont(size: 13) : Utils.regularFont(size: 13)
            button.layer.shadowColor = DS.Color.text.cgColor
            button.layer.shadowOpacity = selected ? 0.08 : 0
            button.layer.shadowRadius = 1
            button.layer.shadowOffset = CGSize(width: 0, height: 1)
            button.accessibilityTraits = selected ? (UIAccessibilityTraitButton | UIAccessibilityTraitSelected) : UIAccessibilityTraitButton
        }
        var customSelected = false
        if case .custom = filter.dateRange { customSelected = true }
        for (index, button) in presetButtons.enumerated() {
            stylePillState(button, selected: presets[index] == filter.dateRange)
        }
        customButton.setTitle(customSelected ? Self.presetTitle(filter.dateRange) : "Select date".localized(), for: .normal)
        stylePillState(customButton, selected: customSelected)
        updateCount()
    }

    private func stylePillState(_ button: UIButton, selected: Bool) {
        button.backgroundColor = selected ? DS.Color.text : DS.Color.surface
        button.layer.borderWidth = selected ? 0 : 1
        button.layer.borderColor = Self.chipBorder.cgColor
        button.setTitleColor(selected ? .white : DS.Color.text, for: .normal)
        button.tintColor = selected ? .white : DS.Color.text
        button.titleLabel?.font = selected ? Utils.boldFont(size: 14) : Utils.regularFont(size: 14)
        button.accessibilityTraits = selected ? (UIAccessibilityTraitButton | UIAccessibilityTraitSelected) : UIAccessibilityTraitButton
    }

    private func updateCount() {
        applyButton.setTitle("orders.v2.filter.show".localized(), for: .normal)
        let requested = filter
        countProvider?(requested) { [weak self] count in
            DispatchQueue.main.async {
                guard let self, self.filter == requested, let count else { return }
                self.applyButton.setTitle(String(format: "orders.v2.filter.showCount".localized(), count), for: .normal)
            }
        }
    }

    // MARK: - Actions

    @objc private func sortTapped(_ sender: UIButton) {
        filter.sort = sorts[sender.tag]
        refresh()
    }

    @objc private func basisTapped(_ sender: UIButton) {
        filter.dateBasis = bases[sender.tag]
        refresh()
    }

    @objc private func presetTapped(_ sender: UIButton) {
        filter.dateRange = presets[sender.tag]
        refresh()
    }

    @objc private func customTapped() {
        let picker = OrdersDateRangePicker()
        if case .custom(let from, let to) = filter.dateRange {
            picker.from = from
            picker.to = to
        }
        picker.onDone = { [weak self] from, to in
            guard let self else { return }
            self.filter.dateRange = .custom(from: from, to: to)
            self.refresh()
        }
        present(picker, animated: true)
    }

    @objc private func resetTapped() {
        var cleared = RentOrdersFilter()
        cleared.status = filter.status
        filter = cleared
        refresh()
    }

    @objc private func applyTapped() {
        onApply?(filter)
        dismiss(animated: true)
    }
}

/// "Chọn ngày": two day pickers (from, to)
final class OrdersDateRangePicker: UIViewController {
    var from = Date()
    var to = Date()
    var onDone: ((Date, Date) -> Void)?

    private let fromPicker = UIDatePicker()
    private let toPicker = UIDatePicker()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface
        if let sheet = sheetPresentationController {
            sheet.detents = [.medium()]
            sheet.prefersGrabberVisible = true
        }
        let title = V2.label("Select date".localized(), size: 20, weight: .bold)
        [fromPicker, toPicker].forEach { picker in
            picker.datePickerMode = .date
            picker.preferredDatePickerStyle = .compact
            picker.timeZone = .current
        }
        fromPicker.date = from
        toPicker.date = to
        let done = V2.primaryButton("Done".localized())
        done.addTarget(self, action: #selector(doneTapped), for: .touchUpInside)
        let stack = UIStackView(arrangedSubviews: [
            title,
            row("orders.v2.range.from".localized(), fromPicker),
            row("orders.v2.range.to".localized(), toPicker),
            done,
        ])
        stack.axis = .vertical
        stack.spacing = DS.Spacing.lg
        view.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(DS.Spacing.xl)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
    }

    private func row(_ title: String, _ picker: UIDatePicker) -> UIView {
        let row = UIStackView(arrangedSubviews: [V2.label(title, size: 15), UIView(), picker])
        row.alignment = .center
        return row
    }

    @objc private func doneTapped() {
        onDone?(fromPicker.date, toPicker.date)
        dismiss(animated: true)
    }
}
