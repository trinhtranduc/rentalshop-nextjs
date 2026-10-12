//
//  OrdersFilterSheet.swift
//  POS ADBD
//
//  "Lọc & sắp xếp" of the rent list (board Loc, #401): sort, date range and "Xem N đơn".
//  #888: one "Xếp theo" date (Ngày lấy / Ngày trả / Ngày tạo) for both the order and the range.
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
    private let dates = RentOrdersFilter.SortDate.allCases
    private let directions = RentOrdersFilter.Direction.allCases
    private let presets: [RentOrdersFilter.DateRange] = [.any, .today, .next7Days, .thisMonth]
    private var dateButtons: [UIButton] = []
    private var directionButtons: [UIButton] = []
    private let rangeLabel = UILabel()
    private let sameDateHint = UILabel()
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
        reset.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        reset.addTarget(self, action: #selector(resetTapped), for: .touchUpInside)
        reset.snp.makeConstraints { make in make.height.equalTo(40) }
        let titleRow = UIStackView(arrangedSubviews: [title, UIView(), reset])
        titleRow.alignment = .center

        dateButtons = dates.enumerated().map { index, date in
            makeButton(OrdersHomeLogic.sortDateTitle(date), size: DS.TextSize.body, tag: index, action: #selector(dateTapped(_:)))
        }
        directionButtons = directions.enumerated().map { index, _ in
            makeButton("", size: DS.TextSize.body, tag: index, action: #selector(directionTapped(_:)))
        }
        presetButtons = presets.enumerated().map { index, preset in
            let button = makeButton(Self.presetTitle(preset), size: DS.TextSize.body, tag: index, action: #selector(presetTapped(_:)))
            stylePill(button)
            return button
        }
        customButton.setImage(DS.symbol("calendar", 16), for: .normal)
        customButton.titleLabel?.font = Utils.regularFont(size: DS.TextSize.body)
        customButton.imageEdgeInsets = UIEdgeInsets(top: 0, left: -3, bottom: 0, right: 3)
        customButton.titleEdgeInsets = UIEdgeInsets(top: 0, left: 3, bottom: 0, right: -3)
        customButton.addTarget(self, action: #selector(customTapped), for: .touchUpInside)
        stylePill(customButton)

        let presetLines = wrap(presetButtons + [customButton], width: UIScreen.main.bounds.width - 2 * DS.Spacing.lg)

        applyButton.addTarget(self, action: #selector(applyTapped), for: .touchUpInside)

        rangeLabel.font = Utils.boldFont(size: DS.TextSize.secondary)
        rangeLabel.textColor = DS.Color.textMuted
        sameDateHint.font = Utils.regularFont(size: DS.TextSize.secondary)
        sameDateHint.textColor = DS.Color.textMuted
        sameDateHint.numberOfLines = 0
        let sortSection = section(sectionLabel("orders.v2.filter.sortBy".localized()), track(dateButtons))
        let orderSection = section(sectionLabel("orders.v2.filter.order".localized()), track(directionButtons))
        let rangeSection = section(rangeLabel, presetLines)
        rangeSection.addArrangedSubview(sameDateHint)

        let stack = contentStack
        [titleRow, sortSection, orderSection, rangeSection, applyButton].forEach { stack.addArrangedSubview($0) }
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

    private static func presetTitle(_ range: RentOrdersFilter.DateRange) -> String {
        switch range {
        case .any: return "orders.v2.range.any".localized()
        case .today: return "orders.v2.range.today".localized()
        case .next7Days: return "orders.v2.range.next7".localized()
        case .thisMonth: return "orders.v2.range.month".localized()
        case .custom(let from, let to):
            return "\(OrdersHomeLogic.dayMonth(from, timeZone: Date.shopTimeZone)) – \(OrdersHomeLogic.dayMonth(to, timeZone: Date.shopTimeZone))"
        }
    }

    // MARK: - Building blocks

    private func sectionLabel(_ text: String) -> UILabel {
        let label = V2.label(nil, size: DS.TextSize.secondary, weight: .bold, color: DS.Color.textMuted)
        setSectionText(label, text)
        return label
    }

    private func setSectionText(_ label: UILabel, _ text: String) {
        label.attributedText = NSAttributedString(string: text.uppercased(), attributes: [NSAttributedString.Key.kern: 0.5])
    }

    private func section(_ label: UIView, _ body: UIView) -> UIStackView {
        let stack = UIStackView(arrangedSubviews: [label, body])
        stack.axis = .vertical
        stack.spacing = DS.Spacing.sm
        return stack
    }

    /// A segmented track (board Loc): grey rounded track, the selected segment white with a light shadow
    private func track(_ buttons: [UIButton]) -> UIStackView {
        buttons.forEach { button in
            button.layer.cornerRadius = 9
            button.snp.makeConstraints { make in make.height.equalTo(40) }
        }
        let track = UIStackView(arrangedSubviews: buttons)
        track.distribution = .fillEqually
        track.backgroundColor = Self.trackFill
        track.layer.cornerRadius = 12
        track.isLayoutMarginsRelativeArrangement = true
        track.layoutMargins = UIEdgeInsets(top: 4, left: 4, bottom: 4, right: 4)
        return track
    }

    private func styleSegment(_ button: UIButton, selected: Bool) {
        button.backgroundColor = selected ? DS.Color.surface : .clear
        button.setTitleColor(selected ? DS.Color.text : DS.Color.textMuted, for: .normal)
        button.titleLabel?.font = selected ? Utils.boldFont(size: DS.TextSize.body) : Utils.regularFont(size: DS.TextSize.body)
        button.layer.shadowColor = DS.Color.text.cgColor
        button.layer.shadowOpacity = selected ? 0.08 : 0
        button.layer.shadowRadius = 1
        button.layer.shadowOffset = CGSize(width: 0, height: 1)
        button.accessibilityTraits = selected ? (UIAccessibilityTraitButton | UIAccessibilityTraitSelected) : UIAccessibilityTraitButton
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
        for (index, button) in dateButtons.enumerated() {
            styleSegment(button, selected: dates[index] == filter.sortDate)
        }
        for (index, button) in directionButtons.enumerated() {
            button.setTitle(OrdersHomeLogic.directionTitle(filter.sortDate, directions[index]), for: .normal)
            styleSegment(button, selected: directions[index] == filter.direction)
        }
        let dateName = OrdersHomeLogic.sortDateTitle(filter.sortDate).lowercased()
        setSectionText(rangeLabel, String(format: "orders.v2.filter.rangeOf".localized(), dateName))
        // Board: "Sắp xếp và khoảng ngày cùng tính theo **ngày lấy**."
        let hint = String(format: "orders.v2.filter.sameDate".localized(), dateName)
        let attributed = NSMutableAttributedString(string: hint)
        if let range = hint.range(of: dateName, options: .backwards) {
            attributed.addAttribute(.font, value: Utils.boldFont(size: DS.TextSize.secondary), range: NSRange(range, in: hint))
            attributed.addAttribute(.foregroundColor, value: DS.Color.text, range: NSRange(range, in: hint))
        }
        sameDateHint.attributedText = attributed
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
        button.titleLabel?.font = selected ? Utils.boldFont(size: DS.TextSize.body) : Utils.regularFont(size: DS.TextSize.body)
        button.accessibilityTraits = selected ? (UIAccessibilityTraitButton | UIAccessibilityTraitSelected) : UIAccessibilityTraitButton
    }

    private func updateCount() {
        applyButton.setTitle("orders.v2.filter.show".localized(), for: .normal)
        let requested = filter
        countProvider?(requested) { [weak self] count in
            DispatchQueue.main.async {
                guard let self, self.filter == requested, let count else { return }
                self.applyButton.setTitle(PluralText.format("orders.v2.filter.showCount", count: count, count), for: .normal)
            }
        }
    }

    // MARK: - Actions

    @objc private func dateTapped(_ sender: UIButton) {
        filter.sortDate = dates[sender.tag]
        refresh()
    }

    @objc private func directionTapped(_ sender: UIButton) {
        filter.direction = directions[sender.tag]
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
            picker.timeZone = Date.shopTimeZone
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
        let row = UIStackView(arrangedSubviews: [V2.label(title, size: DS.TextSize.body), UIView(), picker])
        row.alignment = .center
        return row
    }

    @objc private func doneTapped() {
        onDone?(fromPicker.date, toPicker.date)
        dismiss(animated: true)
    }
}
