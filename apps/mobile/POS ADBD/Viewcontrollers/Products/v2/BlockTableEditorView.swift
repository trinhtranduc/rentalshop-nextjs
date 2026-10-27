//
//  BlockPriceViewController.swift
//  POS ADBD
//
//  #1189: the product's price screen. Radio rows choose how a new order is priced (Thuê theo lần / Thuê theo ngày /
//  Giá theo khối ngày), then the day table (1 ngày … N ngày, one price each), what happens past the last day, a
//  preview and "Lưu bảng giá" / "Tắt giá theo khối ngày". It only edits the form's draft; the product is saved by the
//  form. Opened from the product form, which hides the row from roles that may not edit prices.
//

import UIKit
import SnapKit

final class BlockPriceViewController: UIViewController, UITextFieldDelegate {
    var onSave: ((BlockPriceDraft) -> Void)?

    private let productName: String
    private let hadTable: Bool
    private var mode: ProductPricingMode
    private var rentalText: String
    private var dayText: String
    private var tierTexts: [String]
    private var extraMode: String
    private var extraText: String
    private var previewDays = 5
    private var startDay: Int
    private let previewTotalLabel = V2.label(size: 18, weight: .bold, color: DS.Color.primary)
    private let previewFormulaLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)

    private let scroll = UIScrollView()
    private let content = UIStackView()

    init(productName: String, draft: BlockPriceDraft) {
        self.productName = productName
        hadTable = draft.table != nil
        mode = draft.defaultMode
        rentalText = MoneyInput.display(draft.perRental)
        dayText = MoneyInput.display(draft.perDay)
        let table = draft.table
        startDay = table?.startDay ?? 1
        tierTexts = table?.tiers.map { MoneyInput.display($0) } ?? [""]
        extraMode = table?.extraMode ?? BlockTable.extraPerDay
        extraText = MoneyInput.display(table?.extraPrice)
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        let close = UIButton(type: .system)
        close.setImage(DS.symbol("xmark", DS.Icon.lg, weight: .semibold), for: .normal)
        close.tintColor = DS.Color.text
        close.accessibilityLabel = "Close".localized()
        close.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        let title = V2.label(String(format: "block.screen.title".localized(), productName), size: 20, weight: .bold)
        let header = UIView()
        let line = V2.divider()
        line.backgroundColor = DS.Color.border
        header.addSubview(close)
        header.addSubview(title)
        header.addSubview(line)
        view.addSubview(header)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.equalToSuperview()
            make.height.equalTo(56)
        }
        close.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(8)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(DS.touchTarget)
        }
        title.snp.makeConstraints { make in
            make.leading.equalTo(close.snp.trailing).offset(4)
            make.trailing.lessThanOrEqualToSuperview().offset(-DS.Spacing.lg)
            make.centerY.equalToSuperview()
        }
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }

        let footer = UIStackView()
        footer.axis = .vertical
        footer.spacing = 6
        footer.backgroundColor = .white
        footer.isLayoutMarginsRelativeArrangement = true
        footer.layoutMargins = UIEdgeInsets(top: 12, left: DS.Spacing.lg, bottom: 8, right: DS.Spacing.lg)
        let save = V2.primaryButton("block.save".localized())
        save.accessibilityIdentifier = "block.save"
        save.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)
        save.snp.makeConstraints { make in make.height.equalTo(52) }
        footer.addArrangedSubview(save)
        if hadTable {
            let off = UIButton(type: .system)
            off.setTitle("block.turnOff".localized(), for: .normal)
            off.setTitleColor(V2.danger, for: .normal)
            off.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
            off.accessibilityIdentifier = "block.turnOff"
            off.addTarget(self, action: #selector(turnOffTapped), for: .touchUpInside)
            off.snp.makeConstraints { make in make.height.equalTo(44) }
            footer.addArrangedSubview(off)
        }
        let footerLine = V2.divider()
        footerLine.backgroundColor = DS.Color.border
        view.addSubview(footer)
        view.addSubview(footerLine)
        footer.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(view.keyboardLayoutGuide.snp.top)
        }
        footerLine.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(footer.snp.top)
        }

        scroll.keyboardDismissMode = .interactive
        view.addSubview(scroll)
        scroll.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(footer.snp.top)
        }
        content.axis = .vertical
        scroll.addSubview(content)
        content.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.width.equalToSuperview()
        }
        render()
    }

    // MARK: Render

    /// Rebuilds the rows; the typed texts live in the properties, so nothing is lost
    private func render() {
        view.endEditing(true)
        content.arrangedSubviews.forEach { $0.removeFromSuperview() }

        content.addArrangedSubview(V2.sectionHeader("block.section.default".localized()))
        content.addArrangedSubview(radioRow(.perRental, title: "products.form.perRental".localized(), field: moneyField(text: rentalText, id: "block.rental") { [weak self] in self?.rentalText = $0 }))
        content.addArrangedSubview(V2.divider())
        content.addArrangedSubview(radioRow(.perDay, title: "products.form.perDay".localized(), field: moneyField(text: dayText, id: "block.day") { [weak self] in self?.dayText = $0 }))
        content.addArrangedSubview(V2.divider())
        let blockSummary: UIView
        if case .table(let table) = currentInput {
            blockSummary = V2.label(String(format: "block.row.tiers".localized(), table.tiers.count), size: DS.TextSize.body, color: DS.Color.textMuted)
        } else {
            blockSummary = V2.label("block.row.off".localized(), size: DS.TextSize.body, color: DS.Color.textMuted)
        }
        content.addArrangedSubview(radioRow(.block, title: "block.title".localized(), field: blockSummary))
        content.addArrangedSubview(V2.divider())
        content.addArrangedSubview(padded(V2.label("block.hint.default".localized(), size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0), top: 10, bottom: 12))

        content.addArrangedSubview(V2.sectionHeader("block.section.tiers".localized()))
        for index in tierTexts.indices {
            content.addArrangedSubview(tierRow(index))
        }
        if tierTexts.count < BlockPricing.maxTiers {
            let add = UIButton(type: .system)
            add.setTitle(String(format: "block.addDay".localized(), tierTexts.count + 1), for: .normal)
            add.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
            add.contentHorizontalAlignment = .leading
            add.accessibilityIdentifier = "block.addDay"
            add.addTarget(self, action: #selector(addDayTapped), for: .touchUpInside)
            add.snp.makeConstraints { make in make.height.equalTo(44) }
            content.addArrangedSubview(padded(add, top: 4, bottom: 8))
        }

        content.addArrangedSubview(V2.sectionHeader(String(format: "block.section.beyond".localized(), tierTexts.count).uppercased()))
        let lastText = tierTexts.last.flatMap { MoneyInput.parse($0) }
        content.addArrangedSubview(extraRow(BlockTable.extraPerDay, title: "block.extraPerDay".localized(),
                                            field: moneyField(text: extraText, id: "block.extra") { [weak self] in self?.extraText = $0; self?.updatePreview() }))
        content.addArrangedSubview(V2.divider())
        let holdTitle = lastText.map { String(format: "block.holdLast.price".localized(), MoneyFormatter.suffixed($0)) } ?? "block.holdLast".localized()
        content.addArrangedSubview(extraRow(BlockTable.holdLast, title: holdTitle, field: nil))
        content.addArrangedSubview(V2.divider())
        content.addArrangedSubview(previewBox())
        content.addArrangedSubview(UIView().heighted(24))
    }

    private var currentInput: BlockTableInput {
        BlockPricing.parse(tierTexts: tierTexts, startDay: startDay, extraMode: extraMode, extraText: extraText)
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

    /// A row of the default-price radio list; the tap on the row (not on its box) picks it
    private func radioRow(_ rowMode: ProductPricingMode, title: String, field: UIView) -> UIView {
        let selected = mode == rowMode
        let label = V2.label(title, size: DS.TextSize.input, weight: selected ? .bold : .regular)
        label.accessibilityIdentifier = "block.radio.label." + rowMode.rawValue
        let row = UIStackView(arrangedSubviews: [dot(selected: selected), label, UIView(), field])
        row.alignment = .center
        row.spacing = 14
        row.isLayoutMarginsRelativeArrangement = true
        row.layoutMargins = UIEdgeInsets(top: 8, left: DS.Spacing.lg, bottom: 8, right: DS.Spacing.lg)
        row.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(58) }
        row.isAccessibilityElement = false
        let tap = UITapGestureRecognizer(target: self, action: #selector(radioTapped(_:)))
        row.addGestureRecognizer(tap)
        row.accessibilityIdentifier = "block.radio." + rowMode.rawValue
        row.tag = rowMode == .perRental ? 0 : (rowMode == .perDay ? 1 : 2)
        return row
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
        input.delegate = self
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
        if case .table(let table) = currentInput,
           let detail = BlockPricing.detail(table, days: previewDays, minorUnit: BlockPricing.minorUnit(currency: ShopCurrencyStore.current.rawValue)) {
            previewTotalLabel.text = CartV2Logic.money(detail.total)
            previewFormulaLabel.text = BlockPricing.summary(detail) + (detail.extraDays > 0 ? " · " + BlockPricing.formula(detail) : "")
        } else {
            previewTotalLabel.text = "–"
            previewFormulaLabel.text = nil
        }
    }

    // MARK: Actions

    @objc private func radioTapped(_ gesture: UITapGestureRecognizer) {
        let picked: ProductPricingMode = [.perRental, .perDay, .block][gesture.view?.tag ?? 0]
        mode = picked
        render()
    }

    @objc private func extraTapped(_ gesture: UITapGestureRecognizer) {
        extraMode = gesture.view?.tag == 0 ? BlockTable.extraPerDay : BlockTable.holdLast
        render()
    }

    @objc private func addDayTapped() {
        tierTexts.append("")
        render()
    }

    @objc private func removeDayTapped(_ sender: UIButton) {
        guard tierTexts.count > 1, sender.tag < tierTexts.count else { return }
        tierTexts.remove(at: sender.tag)
        render()
    }

    @objc private func closeTapped() {
        dismiss(animated: true)
    }

    @objc private func turnOffTapped() {
        let rental = MoneyInput.parse(rentalText)
        let day = MoneyInput.parse(dayText)
        var fallback = mode
        if fallback == .block { fallback = (rental == nil && day != nil) ? .perDay : .perRental }
        onSave?(BlockPriceDraft(perRental: rental, perDay: day, defaultMode: fallback, table: nil))
        dismiss(animated: true)
    }

    @objc private func saveTapped() {
        view.endEditing(true)
        let rental = MoneyInput.parse(rentalText)
        let day = MoneyInput.parse(dayText)
        var table: BlockTable?
        switch currentInput {
        case .table(let value): table = value
        case .empty: table = nil
        case .invalid:
            UIAlertController.alert(parent: self, title: "Error".localized(), message: "block.error.invalid".localized())
            return
        }
        var chosen = mode
        if chosen == .block && table == nil {
            UIAlertController.alert(parent: self, title: "Error".localized(), message: "block.error.empty".localized())
            return
        }
        if chosen == .perDay && day == nil { chosen = .perRental }
        onSave?(BlockPriceDraft(perRental: rental, perDay: day, defaultMode: chosen, table: table))
        dismiss(animated: true)
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
