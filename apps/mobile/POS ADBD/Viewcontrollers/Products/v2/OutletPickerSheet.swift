//
//  OutletPickerSheet.swift
//  POS ADBD
//
//  #828 "Chọn chi nhánh": single-select list of the merchant's active branches (name, address, "mặc định"),
//  "Đang chọn" on the branch in use, and "Dùng <branch>". Opened only from OutletHeaderButton.
//

import UIKit
import SnapKit

final class OutletPickerSheet: UIViewController {
    /// Called after the sheet is gone, with the picked branch (also when it is the current one)
    var onChoose: ((Outlet) -> Void)?

    private static let selectedFill = UIColor(hexString: "EFF6FF")
    private static let selectedBorder = UIColor(hexString: "BFDBFE")
    private static let badgeFill = UIColor(hexString: "DBEAFE")
    private static let radioOff = UIColor(hexString: "94A3B8")
    private static let subtle = UIColor(hexString: "64748B")

    private let outlets: [Outlet]
    private let currentId: Int
    private var selectedId: Int
    private var rows: [OutletOptionRow] = []
    private let contentStack = UIStackView()
    private let useButton = V2.primaryButton("")

    init(outlets: [Outlet], currentId: Int) {
        self.outlets = outlets
        self.currentId = currentId
        self.selectedId = currentId
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .pageSheet
        if let sheet = sheetPresentationController {
            sheet.detents = [.medium(), .large()]
            if #available(iOS 16.0, *) {
                sheet.detents = [.custom { [weak self] context in
                    guard let self else { return nil }
                    return min(context.maximumDetentValue, self.fittingHeight())
                }]
            }
            sheet.prefersGrabberVisible = true
            sheet.preferredCornerRadius = DS.Radius.sheet
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface
        view.accessibilityIdentifier = "outlet.picker"

        let title = V2.label("outlet.picker.title".localized(), size: 18, weight: .bold)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        let hint = V2.label("outlet.picker.hint".localized(), size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)

        let list = UIStackView()
        list.axis = .vertical
        list.spacing = 2
        rows = outlets.map { outlet in
            let row = OutletOptionRow(outlet: outlet, isCurrent: outlet.id == currentId)
            row.addTarget(self, action: #selector(rowTapped(_:)), for: .touchUpInside)
            list.addArrangedSubview(row)
            return row
        }
        let scroll = UIScrollView()
        scroll.alwaysBounceVertical = false
        scroll.addSubview(list)
        list.snp.makeConstraints { make in
            make.edges.equalTo(scroll.contentLayoutGuide)
            make.width.equalTo(scroll.frameLayoutGuide)
        }
        let listHeight = scroll.heightAnchor.constraint(equalTo: list.heightAnchor)
        listHeight.priority = .defaultHigh
        listHeight.isActive = true

        useButton.accessibilityIdentifier = "outlet.picker.use"
        useButton.titleLabel?.lineBreakMode = .byTruncatingTail
        useButton.addTarget(self, action: #selector(useTapped), for: .touchUpInside)

        contentStack.axis = .vertical
        contentStack.spacing = 4
        [title, hint, scroll, useButton].forEach { contentStack.addArrangedSubview($0) }
        contentStack.setCustomSpacing(10, after: hint)
        contentStack.setCustomSpacing(12, after: scroll)
        view.addSubview(contentStack)
        contentStack.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(DS.Spacing.xl)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.lessThanOrEqualTo(view.safeAreaLayoutGuide).offset(-DS.Spacing.lg)
        }
        render()
    }

    private func fittingHeight() -> CGFloat {
        loadViewIfNeeded()
        let width = (view.bounds.width > 0 ? view.bounds.width : UIScreen.main.bounds.width) - 2 * DS.Spacing.lg
        let size = contentStack.systemLayoutSizeFitting(CGSize(width: width, height: 0),
                                                       withHorizontalFittingPriority: .required,
                                                       verticalFittingPriority: .fittingSizeLevel)
        return DS.Spacing.xl + size.height + DS.Spacing.lg
    }

    private func render() {
        rows.forEach { $0.isChosen = $0.outlet.id == selectedId }
        let name = outlets.first { $0.id == selectedId }?.name ?? ""
        useButton.setTitle(String(format: "outlet.picker.use".localized(), name), for: .normal)
    }

    @objc private func rowTapped(_ sender: OutletOptionRow) {
        selectedId = sender.outlet.id
        render()
    }

    @objc private func useTapped() {
        guard let outlet = outlets.first(where: { $0.id == selectedId }) else { return }
        dismiss(animated: true) { [onChoose] in
            onChoose?(outlet)
        }
    }

    // MARK: - Row

    final class OutletOptionRow: UIControl {
        let outlet: Outlet
        private let radio = UIView()
        private let dot = UIView()

        var isChosen = false {
            didSet { update() }
        }

        init(outlet: Outlet, isCurrent: Bool) {
            self.outlet = outlet
            super.init(frame: .zero)
            layer.cornerRadius = 12
            layer.borderWidth = 1
            radio.layer.cornerRadius = 11
            radio.layer.borderWidth = 2
            radio.isUserInteractionEnabled = false
            dot.layer.cornerRadius = 5
            dot.backgroundColor = DS.Color.primary
            radio.addSubview(dot)
            radio.snp.makeConstraints { make in make.size.equalTo(22) }
            dot.snp.makeConstraints { make in
                make.center.equalToSuperview()
                make.size.equalTo(10)
            }

            let name = V2.label(outlet.name, size: DS.TextSize.input, weight: .semibold, lines: 2)
            var details: [String] = []
            if let address = outlet.address?.trimmingCharacters(in: .whitespacesAndNewlines), !address.isEmpty {
                details.append(address)
            }
            if outlet.isDefault == true { details.append("outlet.picker.default".localized()) }
            let detail = V2.label(details.joined(separator: " · "), size: 13, color: OutletPickerSheet.subtle, lines: 2)
            detail.isHidden = details.isEmpty
            let texts = UIStackView(arrangedSubviews: [name, detail])
            texts.axis = .vertical
            texts.spacing = 2

            let badge = PaddedLabel()
            badge.text = "outlet.picker.current".localized()
            badge.font = Utils.boldFont(size: DS.TextSize.pill)
            badge.textColor = DS.Color.primary
            badge.backgroundColor = OutletPickerSheet.badgeFill
            badge.layer.cornerRadius = 10
            badge.layer.masksToBounds = true
            badge.isHidden = !isCurrent
            badge.setContentCompressionResistancePriority(.required, for: .horizontal)
            badge.setContentHuggingPriority(.required, for: .horizontal)

            let row = UIStackView(arrangedSubviews: [radio, texts, badge])
            row.spacing = 12
            row.alignment = .center
            row.isUserInteractionEnabled = false
            addSubview(row)
            row.snp.makeConstraints { make in
                make.edges.equalToSuperview().inset(UIEdgeInsets(top: 8, left: 10, bottom: 8, right: 10))
            }
            snp.makeConstraints { make in make.height.greaterThanOrEqualTo(60) }

            isAccessibilityElement = true
            accessibilityIdentifier = "outlet.picker.row.\(outlet.id)"
            accessibilityLabel = ([outlet.name] + details + (isCurrent ? ["outlet.picker.current".localized()] : []))
                .joined(separator: ", ")
            update()
        }

        required init?(coder: NSCoder) {
            fatalError("init(coder:) has not been implemented")
        }

        private func update() {
            backgroundColor = isChosen ? OutletPickerSheet.selectedFill : .clear
            layer.borderColor = (isChosen ? OutletPickerSheet.selectedBorder : UIColor.clear).cgColor
            radio.layer.borderColor = (isChosen ? DS.Color.primary : OutletPickerSheet.radioOff).cgColor
            dot.isHidden = !isChosen
            accessibilityTraits = isChosen ? UIAccessibilityTraitButton | UIAccessibilityTraitSelected : UIAccessibilityTraitButton
        }
    }

    /// Small pill label ("Đang chọn")
    final class PaddedLabel: UILabel {
        private let insets = UIEdgeInsets(top: 2, left: 8, bottom: 2, right: 8)

        override func drawText(in rect: CGRect) {
            super.drawText(in: UIEdgeInsetsInsetRect(rect, insets))
        }

        override var intrinsicContentSize: CGSize {
            let size = super.intrinsicContentSize
            return CGSize(width: size.width + insets.left + insets.right, height: size.height + insets.top + insets.bottom)
        }
    }
}
