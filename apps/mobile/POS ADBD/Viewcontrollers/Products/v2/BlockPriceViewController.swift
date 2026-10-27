//
//  BlockPriceViewController.swift
//  POS ADBD
//
//  #1249 (owner's mockup): the setup screen of "Giá theo khối ngày", opened from the product form. The table of prices
//  by number of days, what happens past the last day, a preview, "Tạo nhanh", "Sao chép từ sản phẩm khác", then
//  "Lưu bảng giá" and "Tắt giá theo khối ngày". There is no list of price kinds here. It only edits the form's draft;
//  the product is saved by the form.
//

import UIKit
import SnapKit

final class BlockPriceViewController: UIViewController {
    /// "Lưu bảng giá": a valid table
    var onSave: ((BlockTable) -> Void)?
    /// "Tắt giá theo khối ngày": back to Thuê theo ngày
    var onTurnOff: (() -> Void)?

    private let editor = BlockTableEditorView()
    private let scroll = UIScrollView()
    private let content = UIStackView()

    init(table: BlockTable?) {
        super.init(nibName: nil, bundle: nil)
        editor.load(table)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        let back = UIButton(type: .system)
        back.setImage(DS.symbol("chevron.left", DS.Icon.lg, weight: .semibold), for: .normal)
        back.tintColor = DS.Color.text
        back.accessibilityLabel = "Back".localized()
        back.accessibilityIdentifier = "block.back"
        back.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        let title = V2.label("block.title".localized(), size: 20, weight: .bold)
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
        let save = V2.primaryButton("block.save".localized())
        save.accessibilityIdentifier = "block.save"
        save.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)
        footer.addArrangedSubview(save)
        let off = V2.secondaryButton("block.turnOff".localized())
        off.setTitleColor(V2.danger, for: .normal)
        off.accessibilityIdentifier = "block.turnOff"
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
        let intro = V2.label("block.intro".localized(), size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
        content.addArrangedSubview(padded(intro, top: 12, bottom: 4))
        content.addArrangedSubview(editor)
        content.addArrangedSubview(link("block.quick".localized(), symbol: "bolt.fill", id: "block.quick", action: #selector(quickTapped)))
        content.addArrangedSubview(link("block.copy".localized(), symbol: "doc.on.doc", id: "block.copy", action: #selector(copyTapped)))
        content.addArrangedSubview(UIView().heighted(24))
    }

    private func padded(_ view: UIView, top: CGFloat, bottom: CGFloat) -> UIView {
        let wrap = UIStackView(arrangedSubviews: [view])
        wrap.isLayoutMarginsRelativeArrangement = true
        wrap.layoutMargins = UIEdgeInsets(top: top, left: DS.Spacing.lg, bottom: bottom, right: DS.Spacing.lg)
        return wrap
    }

    private func link(_ title: String, symbol: String, id: String, action: Selector) -> UIView {
        let button = UIButton(type: .system)
        button.setTitle("  " + title, for: .normal)
        button.setImage(DS.symbol(symbol, 14, weight: .semibold), for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        button.tintColor = DS.Color.primary
        button.contentHorizontalAlignment = .leading
        button.accessibilityIdentifier = id
        button.addTarget(self, action: action, for: .touchUpInside)
        button.snp.makeConstraints { make in make.height.equalTo(44) }
        return padded(button, top: 2, bottom: 2)
    }

    // MARK: Actions

    @objc private func backTapped() {
        view.endEditing(true)
        navigationController?.popViewController(animated: true)
    }

    @objc private func saveTapped() {
        view.endEditing(true)
        switch editor.input {
        case .invalid:
            UIAlertController.alert(parent: self, title: "Error".localized(), message: "block.error.invalid".localized())
        case .empty:
            UIAlertController.alert(parent: self, title: "Error".localized(), message: "block.error.nothing".localized())
        case .table(let table):
            onSave?(table)
            navigationController?.popViewController(animated: true)
        }
    }

    @objc private func turnOffTapped() {
        view.endEditing(true)
        onTurnOff?()
        navigationController?.popViewController(animated: true)
    }

    /// "Tạo nhanh": first day + each extra day + number of days → the rows (the owner can still edit them)
    @objc private func quickTapped() {
        view.endEditing(true)
        let alert = UIAlertController(title: "block.quick.title".localized(), message: "block.quick.message".localized(), preferredStyle: .alert)
        let placeholders = ["block.quick.first", "block.quick.extra", "block.quick.days"]
        for (index, key) in placeholders.enumerated() {
            alert.addTextField { field in
                field.placeholder = key.localized()
                field.keyboardType = .numberPad
                field.accessibilityIdentifier = key
                if index == 2 { field.text = "3" }
            }
        }
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "block.quick.create".localized(), style: .default) { [weak self, weak alert] _ in
            let texts = alert?.textFields?.map { $0.text } ?? []
            guard texts.count == 3, let first = MoneyInput.parse(texts[0]), let extra = MoneyInput.parse(texts[1]),
                  let days = Int(texts[2] ?? ""),
                  let table = BlockPricing.quickTable(firstDay: first, extraPerDay: extra, days: days) else {
                UIAlertController.alert(parent: self ?? UIViewController(), title: "Error".localized(), message: "block.quick.invalid".localized())
                return
            }
            self?.editor.load(table)
        })
        present(alert, animated: true)
    }

    @objc private func copyTapped() {
        view.endEditing(true)
        let picker = BlockCopyPickerViewController()
        picker.onPick = { [weak self] table in self?.editor.load(table) }
        navigationController?.pushViewController(picker, animated: true)
    }
}

private extension UIView {
    func heighted(_ height: CGFloat) -> UIView {
        snp.makeConstraints { make in make.height.equalTo(height) }
        return self
    }
}

/// "Sao chép từ sản phẩm khác": products of the shop that have a table; a tap copies the table and the rule past the
/// last day (never the sale price or the deposit)
final class BlockCopyPickerViewController: UIViewController, UITableViewDataSource, UITableViewDelegate {
    var onPick: ((BlockTable) -> Void)?

    private let table = UITableView(frame: .zero, style: .plain)
    private let search = UITextField()
    private let emptyLabel = V2.label("block.copy.empty".localized(), size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
    private var rows: [(name: String, table: BlockTable)] = []
    private var requestId = 0

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        let back = UIButton(type: .system)
        back.setImage(DS.symbol("chevron.left", DS.Icon.lg, weight: .semibold), for: .normal)
        back.tintColor = DS.Color.text
        back.accessibilityLabel = "Back".localized()
        back.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        let title = V2.label("block.copy".localized(), size: 20, weight: .bold)
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
            make.centerY.equalToSuperview()
        }
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }

        search.placeholder = "products.search.placeholder".localized()
        search.font = Utils.regularFont(size: DS.TextSize.input)
        search.borderStyle = .roundedRect
        search.clearButtonMode = .whileEditing
        search.returnKeyType = .search
        search.autocorrectionType = .no
        search.accessibilityIdentifier = "block.copy.search"
        search.addTarget(self, action: #selector(searchChanged), for: .editingChanged)
        view.addSubview(search)
        search.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom).offset(10)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.height.equalTo(44)
        }
        table.dataSource = self
        table.delegate = self
        table.register(UITableViewCell.self, forCellReuseIdentifier: "row")
        table.keyboardDismissMode = .onDrag
        view.addSubview(table)
        table.snp.makeConstraints { make in
            make.top.equalTo(search.snp.bottom).offset(6)
            make.leading.trailing.bottom.equalToSuperview()
        }
        view.addSubview(emptyLabel)
        emptyLabel.textAlignment = .center
        emptyLabel.snp.makeConstraints { make in
            make.centerX.equalToSuperview()
            make.top.equalTo(search.snp.bottom).offset(60)
            make.leading.trailing.equalToSuperview().inset(32)
        }
        load(keyword: nil)
    }

    private func load(keyword: String?) {
        requestId += 1
        let id = requestId
        ProductService.shared.loadProducts(keyword: keyword, page: 1, limit: 100, sortBy: "createdAt", sortOrder: "desc",
                                           outletId: CurrentOutlet.shared.id) { [weak self] response, _ in
            DispatchQueue.main.async {
                guard let self, id == self.requestId else { return }
                self.rows = (response?.products ?? []).compactMap { product in
                    ProductPricing.block(product).map { (name: product.name ?? "", table: $0) }
                }
                self.emptyLabel.isHidden = !self.rows.isEmpty
                self.table.reloadData()
            }
        }
    }

    @objc private func searchChanged() {
        let text = (search.text ?? "").trimmingCharacters(in: .whitespaces)
        load(keyword: text.isEmpty ? nil : text)
    }

    @objc private func backTapped() { navigationController?.popViewController(animated: true) }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { rows.count }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "row", for: indexPath)
        let row = rows[indexPath.row]
        var config = cell.defaultContentConfiguration()
        config.text = row.name
        config.secondaryText = BlockPricing.rowSummary(row.table) + " · " + BlockPricing.rangeSummary(row.table)
        config.textProperties.font = Utils.boldFont(size: DS.TextSize.input)
        config.secondaryTextProperties.font = Utils.regularFont(size: DS.TextSize.secondary)
        config.secondaryTextProperties.color = DS.Color.textMuted
        cell.contentConfiguration = config
        cell.accessibilityIdentifier = "block.copy.row.\(indexPath.row)"
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        onPick?(rows[indexPath.row].table)
        navigationController?.popViewController(animated: true)
    }
}
