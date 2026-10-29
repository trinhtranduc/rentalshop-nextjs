//
//  ShopInfoViewController.swift
//  POS ADBD
//
//  #1313 "Thông tin cửa hàng" for the shop owner: two blocks. CỬA HÀNG (name, phone · tax id, address, Sửa, and the
//  Tiền tệ row) and CHI NHÁNH (tap a branch to edit its name, address, phone). Other roles skip this screen:
//  `ShopInfoRouter` opens their own branch form (editable for the branch manager, read-only for staff).
//

import UIKit
import SnapKit

enum ShopInfoRouter {
    /// The screen behind the Settings row for the signed-in role
    static func makeScreen() -> UIViewController {
        let user = User.account()
        switch ShopInfoLogic.destination(role: user?.role) {
        case .shopAndBranches:
            return ShopInfoViewController()
        case .ownBranch(let editable):
            let form = EditStoreViewController()
            form.kind = .branch
            form.branch = user?.outlet
            form.hidesBottomBarWhenPushed = true // the form has its own Huỷ / Lưu bar
            form.editable = editable
            form.screenTitle = "Branch Information".localized()
            let shop = (user?.merchant?.name ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            if !editable {
                form.subtitle = "shopinfo.viewOnly".localized()
            } else if !shop.isEmpty {
                form.subtitle = String(format: "shopinfo.yourBranch".localized(), shop)
            }
            return form
        }
    }
}

final class ShopInfoViewController: BaseViewControler {
    private let table = UITableView(frame: .zero, style: .plain)
    private var branches: [BranchRow] = []
    private var outlets: [Outlet] = []
    private var loaded = false

    private var shopName: String { (User.account()?.merchant?.name ?? "").trimmingCharacters(in: .whitespacesAndNewlines) }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        loadShop()
        loadBranches()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        table.reloadData()
    }

    override func setupUI() {
        view.backgroundColor = .white
        let back = SettingsDetailV2.backButton()
        back.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        let line = SettingsDetailV2.installHeader(on: view, title: "Store Information".localized(), back: back)
        SettingsDetailV2.configureList(table)
        table.dataSource = self
        table.delegate = self
        table.register(ShopCardCell.self, forCellReuseIdentifier: ShopCardCell.reuseId)
        table.register(BranchCell.self, forCellReuseIdentifier: BranchCell.reuseId)
        view.addSubview(table)
        table.snp.makeConstraints { make in
            make.top.equalTo(line.snp.bottom)
            make.leading.trailing.equalTo(view.readableColumn())
            make.bottom.equalToSuperview()
        }
        let hint = V2.label("shopinfo.webHint".localized(), size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
        let footer = UIView(frame: CGRect(x: 0, y: 0, width: 0, height: 64))
        footer.addSubview(hint)
        hint.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
        table.tableFooterView = footer
    }

    @objc private func backTapped() { navigationController?.popViewController(animated: true) }

    /// The shop as the server has it; a failed read keeps what the login gave
    private func loadShop() {
        TabsV2APIService.shared.shopInfo { [weak self] saved, _ in
            DispatchQueue.main.async {
                guard let saved, let user = User.account(), user.merchant != nil else { return }
                user.merchant?.name = saved.name ?? user.merchant?.name ?? ""
                user.merchant?.phone = saved.phone
                user.merchant?.taxId = saved.taxId
                user.merchant?.address = saved.address
                user.merchant?.state = saved.state
                user.merchant?.city = saved.city
                user.merchant?.country = saved.country
                user.merchant?.zipCode = saved.zipCode
                user.merchant?.description = saved.description
                User.save(user: user)
                self?.table.reloadData()
            }
        }
    }

    private func loadBranches() {
        showProgressText(text: "Loading...".localized())
        OutletService.shared.getOutlets(limit: 200) { [weak self] outlets, error in
            guard let self else { return }
            self.hideProgress()
            if let error {
                UIAlertController.errorAlert(parent: self, error: error)
                return
            }
            self.outlets = outlets ?? []
            let rows = ShopInfoLogic.branchRows(self.outlets.map {
                BranchRow(id: $0.id, name: $0.name, isActive: $0.isActive, isDefault: $0.isDefault)
            })
            self.branches = rows
            self.loaded = true
            self.table.reloadData()
        }
    }

    private func openShopForm() {
        let form = EditStoreViewController()
        form.kind = .shop
        form.hidesBottomBarWhenPushed = true
        form.screenTitle = "shopinfo.title.shop".localized()
        form.delegate = self
        navigationController?.pushViewController(form, animated: true)
    }

    private func openBranchForm(_ row: BranchRow) {
        guard let outlet = outlets.first(where: { $0.id == row.id }) else { return }
        let form = EditStoreViewController()
        form.kind = .branch
        form.hidesBottomBarWhenPushed = true
        form.branch = outlet
        form.editable = ShopInfoLogic.canEditBranch(role: User.account()?.role, branchId: outlet.id, ownBranchId: User.account()?.outletId)
        form.screenTitle = "shopinfo.title.branch".localized()
        if !shopName.isEmpty { form.subtitle = String(format: "shopinfo.belongsTo".localized(), shopName) }
        form.delegate = self
        navigationController?.pushViewController(form, animated: true)
    }
}

extension ShopInfoViewController: EditStoreViewControllerDelegate {
    func didUpdateStore() {
        table.reloadData()
        loadBranches()
    }
}

extension ShopInfoViewController: UITableViewDataSource, UITableViewDelegate {
    func numberOfSections(in tableView: UITableView) -> Int { 2 }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        section == 0 ? 2 : branches.count
    }

    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? {
        if section == 0 { return V2.sectionHeader("settings.v2.group.store".localized()) }
        let hint = V2.label("shopinfo.tapToEdit".localized(), size: DS.TextSize.secondary, color: DS.Color.textMuted)
        return V2.sectionHeader(String(format: "shopinfo.branches".localized(), branches.count), trailing: hint)
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        if indexPath.section == 0 {
            if indexPath.row == 0 {
                let cell = tableView.dequeueReusableCell(withIdentifier: ShopCardCell.reuseId, for: indexPath) as! ShopCardCell
                let merchant = User.account()?.merchant
                cell.configure(name: merchant?.name ?? "",
                               summary: ShopInfoLogic.shopSummary(phone: merchant?.phone, taxId: merchant?.taxId,
                                                                  taxIdLabel: "shopinfo.taxIdShort".localized()),
                               address: ShopInfoLogic.addressLine(address: merchant?.address, state: merchant?.state, city: merchant?.city),
                               onEdit: { [weak self] in self?.openShopForm() })
                return cell
            }
            let cell = tableView.dequeueReusableCell(withIdentifier: SettingsDetailV2Cell.reuseId, for: indexPath) as! SettingsDetailV2Cell
            cell.configure(title: "settings.v2.currency".localized(), value: ShopCurrencyStore.current.rawValue, accessory: .chevron)
            return cell
        }
        let cell = tableView.dequeueReusableCell(withIdentifier: BranchCell.reuseId, for: indexPath) as! BranchCell
        let row = branches[indexPath.row]
        let outlet = outlets.first { $0.id == row.id }
        cell.configure(name: row.name, isMain: row.isDefault == true, address: outlet?.address ?? "", phone: outlet?.phone ?? "")
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        if indexPath.section == 0 {
            if indexPath.row == 0 { openShopForm() } else {
                ShopCurrencyUI.choose(from: self) { [weak self] in self?.table.reloadData() }
            }
        } else {
            openBranchForm(branches[indexPath.row])
        }
    }
}

/// Name, "phone · MST …", address and the Sửa link
private final class ShopCardCell: UITableViewCell {
    static let reuseId = "ShopCardCell"
    private let nameLabel = V2.label(size: DS.TextSize.body, weight: .bold, lines: 0)
    private let summaryLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
    private let addressLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
    private let editButton = CustomersV2UI.textButton("Edit".localized(), color: DS.Color.primary)
    private let line = V2.divider()
    private var onEdit: (() -> Void)?

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        let texts = UIStackView(arrangedSubviews: [nameLabel, summaryLabel, addressLabel])
        texts.axis = .vertical
        texts.spacing = 4
        editButton.addTarget(self, action: #selector(editTapped), for: .touchUpInside)
        editButton.setContentHuggingPriority(.required, for: .horizontal)
        editButton.setContentCompressionResistancePriority(.required, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [texts, editButton])
        row.alignment = .center
        row.spacing = DS.Spacing.md
        contentView.addSubview(row)
        row.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: DS.Spacing.lg, bottom: 12, right: DS.Spacing.lg))
        }
        contentView.addSubview(line)
        line.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.trailing.bottom.equalToSuperview()
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func configure(name: String, summary: String, address: String, onEdit: @escaping () -> Void) {
        nameLabel.text = name
        summaryLabel.text = summary
        summaryLabel.isHidden = summary.isEmpty
        addressLabel.text = address
        addressLabel.isHidden = address.isEmpty
        self.onEdit = onEdit
    }

    @objc private func editTapped() { onEdit?() }
}

/// A branch: name (+ "Chính"), address, phone, chevron
private final class BranchCell: UITableViewCell {
    static let reuseId = "BranchCell"
    private let nameLabel = V2.label(size: DS.TextSize.body, weight: .bold, lines: 0)
    private let mainChip = V2.label("shopinfo.main".localized(), size: DS.TextSize.secondary, color: DS.Color.primary)
    private let addressLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
    private let phoneLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted)
    private let chevron = UIImageView(image: DS.symbol("chevron.right", DS.Icon.sm))
    private let line = V2.divider()

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        chevron.tintColor = UIColor(hexString: "94A3B8")
        chevron.setContentHuggingPriority(.required, for: .horizontal)
        let top = UIStackView(arrangedSubviews: [nameLabel, mainChip, UIView()])
        top.spacing = 8
        top.alignment = .firstBaseline
        let texts = UIStackView(arrangedSubviews: [top, addressLabel, phoneLabel])
        texts.axis = .vertical
        texts.spacing = 4
        let row = UIStackView(arrangedSubviews: [texts, chevron])
        row.alignment = .center
        row.spacing = DS.Spacing.md
        contentView.addSubview(row)
        row.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: DS.Spacing.lg, bottom: 12, right: DS.Spacing.lg))
        }
        contentView.addSubview(line)
        line.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.trailing.bottom.equalToSuperview()
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func configure(name: String, isMain: Bool, address: String, phone: String) {
        nameLabel.text = name
        mainChip.isHidden = !isMain
        addressLabel.text = address
        addressLabel.isHidden = address.isEmpty
        phoneLabel.text = phone
        phoneLabel.isHidden = phone.isEmpty
    }
}
