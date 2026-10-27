//
//  BlockTableEditorView.swift
//  POS ADBD
//
//  #1249: the day table of "Thuê theo ngày", edited on the product form itself (it was a separate screen with three
//  radio rows). Prices for 1 … N days, what happens past the last day, and a preview. It only holds the typed texts;
//  the form reads `input` when it saves.
//

import UIKit
import SnapKit

final class BlockTableEditorView: UIStackView {
    /// Called when a structure change (add / remove a day, past-the-table rule) rebuilt the rows
    var onChange: (() -> Void)?

    private var tierTexts: [String] = [""]
    private var startDay = 1
    private var extraMode = BlockTable.extraPerDay
    private var extraText = ""
    private var previewDays = 5
    private let previewTotalLabel = V2.label(size: 18, weight: .bold, color: DS.Color.primary)
    private let previewFormulaLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)

    override init(frame: CGRect) {
        super.init(frame: frame)
        axis = .vertical
        render()
    }

    required init(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    /// Fills the boxes from a table (nil = one empty day)
    func load(_ table: BlockTable?) {
        startDay = table?.startDay ?? 1
        tierTexts = table?.tiers.map { MoneyInput.display($0) } ?? [""]
        extraMode = table?.extraMode ?? BlockTable.extraPerDay
        extraText = MoneyInput.display(table?.extraPrice)
        render()
    }

    /// The boxes as they are now: empty, invalid, or a table
    var input: BlockTableInput {
        BlockPricing.parse(tierTexts: tierTexts, startDay: startDay, extraMode: extraMode, extraText: extraText)
    }

    // MARK: Render

    /// Rebuilds the rows; the typed texts live in the properties, so nothing is lost
    private func render() {
        endEditing(true)
        arrangedSubviews.forEach { $0.removeFromSuperview() }

        addArrangedSubview(V2.sectionHeader("block.section.tiers".localized()))
        for index in tierTexts.indices {
            addArrangedSubview(tierRow(index))
        }
        if tierTexts.count < BlockPricing.maxTiers {
            let add = UIButton(type: .system)
            add.setTitle(String(format: "block.addDay".localized(), tierTexts.count + 1), for: .normal)
            add.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
            add.contentHorizontalAlignment = .leading
            add.accessibilityIdentifier = "block.addDay"
            add.addTarget(self, action: #selector(addDayTapped), for: .touchUpInside)
            add.snp.makeConstraints { make in make.height.equalTo(44) }
            addArrangedSubview(padded(add, top: 4, bottom: 8))
        }

        addArrangedSubview(V2.sectionHeader(String(format: "block.section.beyond".localized(), tierTexts.count).uppercased()))
        let lastText = tierTexts.last.flatMap { MoneyInput.parse($0) }
        addArrangedSubview(extraRow(BlockTable.extraPerDay, title: "block.extraPerDay".localized(),
                                    field: moneyField(text: extraText, id: "block.extra") { [weak self] in self?.extraText = $0; self?.updatePreview() }))
        addArrangedSubview(V2.divider())
        let holdTitle = lastText.map { String(format: "block.holdLast.price".localized(), MoneyFormatter.suffixed($0)) } ?? "block.holdLast".localized()
        addArrangedSubview(extraRow(BlockTable.holdLast, title: holdTitle, field: nil))
        addArrangedSubview(V2.divider())
        addArrangedSubview(previewBox())
    }

    private func padded(_ view: UIView, top: CGFloat, bottom: CGFloat) -> UIView {
        let wrap = UIStackView(arrangedSubviews: [view])
        wrap.isLayoutMarginsRelativeArrangement = true
        wrap.layoutMargins = UIEdgeInsets(top: top, left: DS.Spacing.lg, bottom: bottom, right: DS.Spacing.lg)
        return wrap
    }

    private func dot(selected: Bool) -> UIView {
        let dot = UIView()
        dot.backgroundColor = .white
        dot.layer.cornerRadius = 11
        dot.layer.borderWidth = selected ? 6 : 1.5
        dot.layer.borderColor = (selected ? DS.Color.primary : UIColor(hexString: "94A3B8")).cgColor
        dot.snp.makeConstraints { make in make.size.equalTo(22) }
        dot.isUserInteractionEnabled = false
        return dot
    }

    private func extraRow(_ rowMode: String, title: String, field: UIView?) -> UIView {
        let selected = extraMode == rowMode
        let label = V2.label(title, size: DS.TextSize.input, weight: selected ? .bold : .regular, lines: 2)
        label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        label.accessibilityIdentifier = "block.extraMode.label." + rowMode
        let row = UIStackView(arrangedSubviews: [dot(selected: selected), label, UIView()])
        if let field { row.addArrangedSubview(field) }
        row.alignment = .center
        row.spacing = 14
        row.isLayoutMarginsRelativeArrangement = true
        row.layoutMargins = UIEdgeInsets(top: 8, left: DS.Spacing.lg, bottom: 8, right: DS.Spacing.lg)
        row.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(56) }
        let tap = UITapGestureRecognizer(target: self, action: #selector(extraTapped(_:)))
        row.addGestureRecognizer(tap)
        row.accessibilityIdentifier = "block.extraMode." + rowMode
        row.tag = rowMode == BlockTable.extraPerDay ? 0 : 1
        return row
    }

    private func moneyField(text: String, id: String, onChange: @escaping (String) -> Void) -> UIView {
        let input = BlockMoneyField()
        input.text = text
        input.onChange = onChange
        input.placeholder = "0"
        input.accessibilityIdentifier = id
        let unit = V2.label(MoneyFormatter.unitLabel(daily: false), size: DS.TextSize.body, color: DS.Color.textMuted)
        unit.setContentHuggingPriority(.required, for: .horizontal)
        let box = UIStackView(arrangedSubviews: [input, unit])
        box.alignment = .center
        box.spacing = 6
        box.isLayoutMarginsRelativeArrangement = true
        box.layoutMargins = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 12)
        box.layer.cornerRadius = 12
        box.layer.borderWidth = 1
        box.layer.borderColor = V2.border.cgColor
        box.snp.makeConstraints { make in
            make.height.equalTo(46)
            make.width.equalTo(140)
        }
        return box
    }

    private func tierRow(_ index: Int) -> UIView {
        let day = startDay + index
        let label = V2.label(PluralText.format("products.cart.days", count: day, day), size: DS.TextSize.input, weight: .bold, color: UIColor(hexString: "334155"))
        label.setContentHuggingPriority(.required, for: .horizontal)
        label.snp.makeConstraints { make in make.width.equalTo(64) }
        let field = moneyField(text: tierTexts[index], id: "block.tier.\(index + 1)") { [weak self] in self?.tierTexts[index] = $0; self?.updatePreview() }
        field.snp.remakeConstraints { make in make.height.equalTo(46) }
        let remove = UIButton(type: .system)
        remove.setImage(DS.symbol("xmark", 14, weight: .semibold), for: .normal)
        remove.tintColor = UIColor(hexString: "64748B")
        remove.tag = index
        remove.isHidden = tierTexts.count <= 1
        remove.accessibilityLabel = "block.removeDay".localized()
        remove.addTarget(self, action: #selector(removeDayTapped(_:)), for: .touchUpInside)
        remove.snp.makeConstraints { make in make.size.equalTo(36) }
        let row = UIStackView(arrangedSubviews: [label, field, remove])
        row.alignment = .center
        row.spacing = 8
        row.isLayoutMarginsRelativeArrangement = true
        row.layoutMargins = UIEdgeInsets(top: 5, left: DS.Spacing.lg, bottom: 5, right: 8)
        return row
    }

    private func previewBox() -> UIView {
        let title = V2.label("block.preview".localized(), size: DS.TextSize.input, weight: .bold)
        let stepper = V2Stepper()
        stepper.minimum = 1
        stepper.value = previewDays
        stepper.onChange = { [weak self] value in
            self?.previewDays = max(1, value)
            self?.render()
        }
        previewTotalLabel.textAlignment = .right
        previewTotalLabel.accessibilityIdentifier = "block.previewTotal"
        updatePreview()
        let top = UIStackView(arrangedSubviews: [title, stepper, UIView(), previewTotalLabel])
        top.alignment = .center
        top.spacing = 12
        let box = UIStackView(arrangedSubviews: [top, previewFormulaLabel])
        box.axis = .vertical
        box.spacing = 6
        box.isLayoutMarginsRelativeArrangement = true
        box.layoutMargins = UIEdgeInsets(top: 12, left: 14, bottom: 12, right: 14)
        box.backgroundColor = UIColor(hexString: "EFF6FF")
        box.layer.cornerRadius = 12
        return padded(box, top: 12, bottom: 4)
    }

    /// "Xem thử": the price of `previewDays` days from the boxes as they are now
    private func updatePreview() {
        if case .table(let table) = input,
           let detail = BlockPricing.detail(table, days: previewDays, minorUnit: BlockPricing.minorUnit(currency: ShopCurrencyStore.current.rawValue)) {
            previewTotalLabel.text = CartV2Logic.money(detail.total)
            previewFormulaLabel.text = BlockPricing.summary(detail) + (detail.extraDays > 0 ? " · " + BlockPricing.formula(detail) : "")
        } else {
            previewTotalLabel.text = "–"
            previewFormulaLabel.text = nil
        }
    }

    // MARK: Actions

    @objc private func extraTapped(_ gesture: UITapGestureRecognizer) {
        extraMode = gesture.view?.tag == 0 ? BlockTable.extraPerDay : BlockTable.holdLast
        render()
        onChange?()
    }

    @objc private func addDayTapped() {
        tierTexts.append("")
        render()
        onChange?()
    }

    @objc private func removeDayTapped(_ sender: UIButton) {
        guard tierTexts.count > 1, sender.tag < tierTexts.count else { return }
        tierTexts.remove(at: sender.tag)
        render()
        onChange?()
    }
}

/// A numeric box that keeps "1.250.000" grouping and reports the text
final class BlockMoneyField: UITextField {
    var onChange: ((String) -> Void)?

    override init(frame: CGRect) {
        super.init(frame: frame)
        font = Utils.regularFont(size: DS.TextSize.input)
        textColor = DS.Color.text
        keyboardType = .numberPad
        autocorrectionType = .no
        textAlignment = .right
        setContentHuggingPriority(.defaultLow, for: .horizontal)
        addTarget(self, action: #selector(edited), for: .editingChanged)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    @objc private func edited() {
        let digits = String((text ?? "").filter { $0.isNumber }.prefix(12))
        text = digits.isEmpty ? "" : MoneyInput.display(Double(digits))
        onChange?(text ?? "")
    }
}

private extension UIView {
    func heighted(_ height: CGFloat) -> UIView {
        snp.makeConstraints { make in make.height.equalTo(height) }
        return self
    }
}
