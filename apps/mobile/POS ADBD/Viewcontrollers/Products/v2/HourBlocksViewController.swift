//
//  HourBlocksViewController.swift
//  POS ADBD
//
//  #1621 (mockup "Màn mới Giá theo khối giờ"): the setup screen of "Theo khối giờ", opened from the product form. One row
//  per block (hours 1–24 and the price of the whole block), "+ Thêm khối", "Lưu bảng giá" and "Tắt giá theo khối giờ".
//  No preview and nothing past the last block: the block chosen in the cart is its price. It only edits the form's
//  draft; the product is saved by the form.
//

import UIKit
import SnapKit

final class HourBlocksViewController: UIViewController {
    /// "Lưu bảng giá": the blocks, shortest first (empty = every row was cleared: "Chưa cài")
    var onSave: (([HourBlock]) -> Void)?
    /// "Tắt giá theo khối giờ": every block goes ("Chưa cài")
    var onTurnOff: (() -> Void)?

    private var rows: [(hours: String, price: String)]
    private let scroll = UIScrollView()
    private let content = UIStackView()
    private let list = UIStackView()

    init(blocks: [HourBlock]) {
        rows = blocks.isEmpty ? [("", "")] : blocks.map { (String($0.hours), MoneyInput.display($0.price)) }
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        let back = UIButton(type: .system)
        back.setImage(DS.symbol("chevron.left", DS.Icon.lg, weight: .semibold), for: .normal)
        back.tintColor = DS.Color.text
        back.accessibilityLabel = "Back".localized()
        back.accessibilityIdentifier = "hourBlock.back"
        back.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        let title = V2.label("hourBlock.title".localized(), size: 20, weight: .bold)
        let header = UIView()
        let line = V2.divider()
        line.backgroundColor = DS.Color.border
        [back, title, line].forEach { header.addSubview($0) }
        view.addSubview(header)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.equalToSuperview()
            make.height.equalTo(56)
        }
        back.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(8)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(DS.touchTarget)
        }
        title.snp.makeConstraints { make in
            make.leading.equalTo(back.snp.trailing).offset(4)
            make.trailing.lessThanOrEqualToSuperview().offset(-DS.Spacing.lg)
            make.centerY.equalToSuperview()
        }
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }

        let footer = UIStackView()
        footer.axis = .vertical
        footer.spacing = 8
        footer.backgroundColor = .white
        footer.isLayoutMarginsRelativeArrangement = true
        footer.layoutMargins = UIEdgeInsets(top: 12, left: DS.Spacing.lg, bottom: 8, right: DS.Spacing.lg)
        let save = V2.primaryButton("hourBlock.save".localized())
        save.accessibilityIdentifier = "hourBlock.save"
        save.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)
        footer.addArrangedSubview(save)
        let off = V2.secondaryButton("hourBlock.turnOff".localized())
        off.setTitleColor(V2.danger, for: .normal)
        off.accessibilityIdentifier = "hourBlock.turnOff"
        off.addTarget(self, action: #selector(turnOffTapped), for: .touchUpInside)
        footer.addArrangedSubview(off)
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
            make.bottom.equalTo(footerLine.snp.top)
        }
        content.axis = .vertical
        scroll.addSubview(content)
        content.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.width.equalToSuperview()
        }
        let intro = V2.label("hourBlock.intro".localized(), size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
        content.addArrangedSubview(padded(intro, top: 12, bottom: 4))
        list.axis = .vertical
        content.addArrangedSubview(list)
        render()
    }

    // MARK: Rows

    /// Rebuilds the rows; the typed texts live in `rows`, so nothing is lost
    private func render() {
        list.arrangedSubviews.forEach { $0.removeFromSuperview() }
        list.addArrangedSubview(V2.sectionHeader("hourBlock.section".localized()))
        for index in rows.indices {
            list.addArrangedSubview(row(index))
        }
        if rows.count < HourBlocks.maxCount {
            let add = UIButton(type: .system)
            add.setTitle("hourBlock.add".localized(), for: .normal)
            add.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
            add.contentHorizontalAlignment = .leading
            add.accessibilityIdentifier = "hourBlock.add"
            add.addTarget(self, action: #selector(addTapped), for: .touchUpInside)
            add.snp.makeConstraints { make in make.height.equalTo(44) }
            list.addArrangedSubview(padded(add, top: 4, bottom: 8))
        } else {
            let max = V2.label(String(format: "hourBlock.max".localized(), HourBlocks.maxCount), size: DS.TextSize.secondary,
                               color: DS.Color.textMuted, lines: 0)
            list.addArrangedSubview(padded(max, top: 8, bottom: 8))
        }
    }

    private func padded(_ view: UIView, top: CGFloat, bottom: CGFloat) -> UIView {
        let wrap = UIStackView(arrangedSubviews: [view])
        wrap.isLayoutMarginsRelativeArrangement = true
        wrap.layoutMargins = UIEdgeInsets(top: top, left: DS.Spacing.lg, bottom: bottom, right: DS.Spacing.lg)
        return wrap
    }

    private func box(_ input: UIView, unit: String, width: CGFloat?) -> UIView {
        let unitLabel = V2.label(unit, size: DS.TextSize.body, color: DS.Color.textMuted)
        unitLabel.setContentHuggingPriority(.required, for: .horizontal)
        unitLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        let box = UIStackView(arrangedSubviews: [input, unitLabel])
        box.alignment = .center
        box.spacing = 6
        box.isLayoutMarginsRelativeArrangement = true
        box.layoutMargins = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 12)
        box.layer.cornerRadius = 12
        box.layer.borderWidth = 1
        box.layer.borderColor = V2.border.cgColor
        box.snp.makeConstraints { make in
            make.height.equalTo(46)
            if let width { make.width.equalTo(width) }
        }
        return box
    }

    /// "[ 4 ] giờ   [ 250.000 ] đ   ✕"
    private func row(_ index: Int) -> UIView {
        let number = index + 1
        let hours = HourField()
        hours.text = rows[index].hours
        hours.placeholder = "0"
        hours.accessibilityIdentifier = "hourBlock.hours.\(number)"
        hours.accessibilityLabel = String(format: "hourBlock.hoursOf".localized(), number)
        hours.onChange = { [weak self] text in
            guard let self, index < self.rows.count else { return }
            self.rows[index].hours = text
        }
        let price = BlockMoneyField()
        price.text = rows[index].price
        price.placeholder = "0"
        price.accessibilityIdentifier = "hourBlock.price.\(number)"
        price.accessibilityLabel = String(format: "hourBlock.priceOf".localized(), number)
        price.onChange = { [weak self] text in
            guard let self, index < self.rows.count else { return }
            self.rows[index].price = text
        }
        let remove = UIButton(type: .system)
        remove.setImage(DS.symbol("xmark", 14, weight: .semibold), for: .normal)
        remove.tintColor = UIColor(hexString: "64748B")
        remove.tag = index
        remove.isHidden = rows.count <= 1
        remove.accessibilityLabel = String(format: "hourBlock.remove".localized(), number)
        remove.accessibilityIdentifier = "hourBlock.remove.\(number)"
        remove.addTarget(self, action: #selector(removeTapped(_:)), for: .touchUpInside)
        remove.snp.makeConstraints { make in make.size.equalTo(36) }
        let line = UIStackView(arrangedSubviews: [box(hours, unit: "hourBlock.unit".localized(), width: 96),
                                                  box(price, unit: MoneyFormatter.unitLabel(daily: false), width: nil), remove])
        line.alignment = .center
        line.spacing = 8
        line.isLayoutMarginsRelativeArrangement = true
        line.layoutMargins = UIEdgeInsets(top: 5, left: DS.Spacing.lg, bottom: 5, right: 8)
        return line
    }

    // MARK: Actions

    @objc private func backTapped() {
        view.endEditing(true)
        navigationController?.popViewController(animated: true)
    }

    @objc private func addTapped() {
        view.endEditing(true)
        guard rows.count < HourBlocks.maxCount else { return }
        rows.append(("", ""))
        render()
    }

    @objc private func removeTapped(_ sender: UIButton) {
        view.endEditing(true)
        guard rows.count > 1, sender.tag < rows.count else { return }
        rows.remove(at: sender.tag)
        render()
    }

    @objc private func saveTapped() {
        view.endEditing(true)
        switch HourBlocks.parse(rows: rows) {
        case .invalid(let issue):
            UIAlertController.alert(parent: self, title: "Error".localized(), message: issue.message)
        case .empty:
            onSave?([])
            navigationController?.popViewController(animated: true)
        case .blocks(let blocks):
            onSave?(blocks)
            navigationController?.popViewController(animated: true)
        }
    }

    @objc private func turnOffTapped() {
        view.endEditing(true)
        onTurnOff?()
        navigationController?.popViewController(animated: true)
    }
}

/// A box for the number of hours: digits only, at most two
final class HourField: UITextField {
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
        text = String((text ?? "").filter { $0.isNumber }.prefix(2))
        onChange?(text ?? "")
    }
}
