//
//  BankAccountViewController.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-28.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//
//  #622: the outlet's bank accounts (default first). A MERCHANT login has no outlet of its own, so the screen uses
//  the default outlet and offers an outlet row when the shop has several.
//

import Foundation
import UIKit
import SnapKit

class BankAccountViewController: BaseViewControler {
    /// New style (#459 look), set by Settings v2 before the page is shown
    var v2 = false

    // MARK: - Properties
    private var bankAccounts: [BankAccount] = []
    private var selectedBankAccount: BankAccount?
    private var outlets: [Outlet] = []
    private var outletId: Int?
    private var hasLoaded = false

    private enum Section { case outlet, accounts }
    private var sections: [Section] { outlets.count > 1 ? [.outlet, .accounts] : [.accounts] }

    // MARK: - UI Components
    private lazy var bankAccountsTableView: UITableView = {
        let table = UITableView(frame: .zero, style: .insetGrouped)
        table.delegate = self
        table.dataSource = self
        table.backgroundColor = .backgroundPrimary
        table.register(UITableViewCell.self, forCellReuseIdentifier: "BankAccountCell")
        table.register(BankAccountV2Cell.self, forCellReuseIdentifier: BankAccountV2Cell.reuseId)
        table.register(SettingsDetailV2Cell.self, forCellReuseIdentifier: SettingsDetailV2Cell.reuseId)
        return table
    }()

    private lazy var addButton: UIButton = {
        let button = UIButton(type: .system)
        button.setImage(UIImage(systemName: "plus"), for: .normal)
        button.tintColor = APP_TONE_COLOR
        button.accessibilityLabel = "Add Bank Account".localized()
        button.addTarget(self, action: #selector(addButtonTapped), for: .touchUpInside)
        return button
    }()

    private lazy var emptyLabel: UILabel = {
        let label = UILabel()
        label.text = "bankAccounts.empty".localized()
        label.font = Utils.regularFont(size: 15)
        label.textColor = .textSecondary
        label.textAlignment = .center
        label.numberOfLines = 0
        label.isHidden = true
        return label
    }()

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        if !v2 {
            setupNavigationBar()
        }
        setupUI()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        if outletId == nil && !hasLoaded {
            resolveOutletAndLoad()
        } else {
            loadBankAccounts()
        }
    }

    // MARK: - Setup
    override func setupUI() {
        if v2 {
            setupV2UI()
            return
        }
        view.backgroundColor = .backgroundPrimary

        guard let customNavBar = customNavBar else { return }

        view.addSubview(bankAccountsTableView)
        bankAccountsTableView.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
        addEmptyLabel()
    }

    /// v2: ‹ header with +, flat white list
    private func setupV2UI() {
        view.backgroundColor = .white
        let back = SettingsDetailV2.backButton()
        back.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        let add = CustomersV2UI.iconButton("plus", label: "Add Bank Account".localized(), size: DS.Icon.sm)
        add.addTarget(self, action: #selector(addButtonTapped), for: .touchUpInside)
        let line = SettingsDetailV2.installHeader(on: view, title: "Bank Accounts".localized(), back: back, trailing: [add])

        bankAccountsTableView.backgroundColor = .white
        bankAccountsTableView.separatorStyle = .none
        bankAccountsTableView.sectionHeaderTopPadding = 0
        bankAccountsTableView.rowHeight = UITableViewAutomaticDimension
        bankAccountsTableView.estimatedRowHeight = 72
        view.addSubview(bankAccountsTableView)
        bankAccountsTableView.snp.makeConstraints { make in
            make.top.equalTo(line.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
        addEmptyLabel()
    }

    private func addEmptyLabel() {
        view.addSubview(emptyLabel)
        emptyLabel.snp.makeConstraints { make in
            make.center.equalTo(bankAccountsTableView)
            make.leading.trailing.equalToSuperview().inset(32)
        }
    }

    @objc private func backTapped() {
        navigationController?.popViewController(animated: true)
    }

    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        let navBar = setupCustomNavigationBar(
            title: "Bank Accounts".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .pop
        )
        navBar.addRightButton(addButton, size: CGSize(width: 44, height: 44))
    }

    // MARK: - Actions
    @objc private func addButtonTapped() {
        selectedBankAccount = nil
        presentBankAccountForm()
    }

    private func presentBankAccountForm() {
        guard let outletId = outletId else { return }
        let formVC = BankAccountFormViewController()
        formVC.bankAccount = selectedBankAccount
        formVC.outletId = outletId
        formVC.v2 = v2
        formVC.delegate = self
        if v2 {
            presentWithHiddenNavigationBar(formVC, fullScreen: true)
        } else {
            let navController = BaseNavigationController(rootViewController: formVC)
            present(navController, animated: true)
        }
    }

    private func chooseOutlet(from source: UIView?) {
        let sheet = UIAlertController(title: "Outlet".localized(), message: nil, preferredStyle: .actionSheet)
        for outlet in outlets {
            let action = UIAlertAction(title: outlet.name, style: .default) { [weak self] _ in
                self?.outletId = outlet.id
                self?.loadBankAccounts()
            }
            action.setValue(outlet.id == outletId, forKey: "checked")
            sheet.addAction(action)
        }
        sheet.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        if let popover = sheet.popoverPresentationController, let source = source {
            popover.sourceView = source
            popover.sourceRect = source.bounds
        }
        present(sheet, animated: true)
    }

    // MARK: - Data Loading

    /// Own outlet when the login has one, else the shop's default (or first) active outlet
    private func resolveOutletAndLoad() {
        hasLoaded = true
        if let own = User.account()?.outletId {
            outletId = own
            loadBankAccounts()
            return
        }
        showProgressText(text: "Loading...".localized())
        OutletService.shared.getOutlets { [weak self] outlets, error in
            guard let self = self else { return }
            self.hideProgress()
            if let error = error {
                UIAlertController.errorAlert(parent: self, error: error)
                return
            }
            self.outlets = (outlets ?? []).filter { $0.isActive ?? true }
            self.outletId = (self.outlets.first { $0.isDefault == true } ?? self.outlets.first)?.id
            self.loadBankAccounts()
        }
    }

    private func loadBankAccounts() {
        guard let outletId = outletId else {
            render()
            return
        }
        showProgressText(text: "Loading...".localized())

        BankAccountService.shared.getBankAccounts(outletId: outletId) { [weak self] bankAccounts, error in
            guard let self = self else { return }
            self.hideProgress()

            if let error = error {
                UIAlertController.errorAlert(parent: self, error: error)
            } else if let bankAccounts = bankAccounts {
                // API order is default first, then newest
                self.bankAccounts = bankAccounts.filter { $0.isActive ?? true }
            }
            self.render()
        }
    }

    private func render() {
        bankAccountsTableView.reloadData()
        emptyLabel.isHidden = !bankAccounts.isEmpty
    }

    private func deleteBankAccount(_ bankAccount: BankAccount) {
        guard let bankAccountId = bankAccount.id else { return }

        showProgressText(text: "Deleting...".localized())

        BankAccountService.shared.deleteBankAccount(outletId: outletId, bankAccountId: bankAccountId) { [weak self] error in
            guard let self = self else { return }
            self.hideProgress()

            if let error = error {
                UIAlertController.errorAlert(parent: self, error: error)
            } else {
                self.loadBankAccounts()
            }
        }
    }

    private func confirmDelete(_ bankAccount: BankAccount) {
        let alert = UIAlertController(
            title: "Delete Bank Account".localized(),
            message: String(format: "Are you sure you want to delete %@?".localized(), bankAccount.bankName),
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "Delete".localized(), style: .destructive) { [weak self] _ in
            self?.deleteBankAccount(bankAccount)
        })
        present(alert, animated: true)
    }

    private var outletName: String? {
        outlets.first { $0.id == outletId }?.name
    }
}

// MARK: - UITableViewDataSource
extension BankAccountViewController: UITableViewDataSource {
    func numberOfSections(in tableView: UITableView) -> Int {
        sections.count
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        switch sections[section] {
        case .outlet: return 1
        case .accounts: return bankAccounts.count
        }
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        if sections[indexPath.section] == .outlet {
            let cell = tableView.dequeueReusableCell(withIdentifier: SettingsDetailV2Cell.reuseId, for: indexPath)
            (cell as? SettingsDetailV2Cell)?.configure(title: "Outlet".localized(), value: outletName, accessory: .chevron)
            return cell
        }
        let bankAccount = bankAccounts[indexPath.row]
        let isDefault = bankAccount.isDefault == true

        if v2 {
            let cell = tableView.dequeueReusableCell(withIdentifier: BankAccountV2Cell.reuseId, for: indexPath)
            (cell as? BankAccountV2Cell)?.bind(bankAccount)
            return cell
        }

        let cell = tableView.dequeueReusableCell(withIdentifier: "BankAccountCell", for: indexPath)
        var config = cell.defaultContentConfiguration()
        config.text = isDefault ? "\(bankAccount.bankName) · \("Default".localized())" : bankAccount.bankName
        config.secondaryText = "\(bankAccount.accountNumber) - \(bankAccount.accountHolderName)"
        config.textProperties.font = .bodyRegular(size: 16)
        config.secondaryTextProperties.font = .captionSmall(size: 14)
        config.secondaryTextProperties.color = .textSecondary

        if let branch = bankAccount.branch, !branch.isEmpty {
            config.secondaryText = "\(bankAccount.accountNumber) - \(bankAccount.accountHolderName)\n\(branch)"
        }

        cell.contentConfiguration = config
        cell.accessoryType = .disclosureIndicator

        return cell
    }
}

// MARK: - UITableViewDelegate
extension BankAccountViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        if sections[indexPath.section] == .outlet {
            chooseOutlet(from: tableView.cellForRow(at: indexPath))
            return
        }
        selectedBankAccount = bankAccounts[indexPath.row]
        presentBankAccountForm()
    }

    func tableView(_ tableView: UITableView, trailingSwipeActionsConfigurationForRowAt indexPath: IndexPath) -> UISwipeActionsConfiguration? {
        guard sections[indexPath.section] == .accounts else { return nil }
        let bankAccount = bankAccounts[indexPath.row]
        let delete = UIContextualAction(style: .destructive, title: "Delete".localized()) { [weak self] _, _, done in
            self?.confirmDelete(bankAccount)
            done(true)
        }
        return UISwipeActionsConfiguration(actions: [delete])
    }
}

// MARK: - BankAccountFormDelegate
extension BankAccountViewController: BankAccountFormDelegate {
    func bankAccountFormDidSave() {
        loadBankAccounts()
    }
}

// MARK: - BankAccountFormDelegate Protocol
protocol BankAccountFormDelegate: AnyObject {
    func bankAccountFormDidSave()
}

/// v2 row: bank name (+ "Mặc định" pill), "number · holder", branch, chevron
final class BankAccountV2Cell: UITableViewCell {
    static let reuseId = "BankAccountV2Cell"
    private let nameLabel = V2.label(size: DS.TextSize.body, weight: .bold)
    private let defaultPill = OrderStatusPillLabel()
    private let detailLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
    private let branchLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        defaultPill.font = Utils.boldFont(size: DS.TextSize.pill)
        defaultPill.contentInsets = UIEdgeInsets(top: 2, left: 8, bottom: 2, right: 8)
        defaultPill.layer.cornerRadius = 10
        defaultPill.clipsToBounds = true
        defaultPill.text = "Default".localized()
        defaultPill.textColor = DS.Status.done.text
        defaultPill.backgroundColor = DS.Status.done.fill
        defaultPill.setContentCompressionResistancePriority(.required, for: .horizontal)
        defaultPill.setContentHuggingPriority(.required, for: .horizontal)
        nameLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        let nameRow = UIStackView(arrangedSubviews: [nameLabel, defaultPill, UIView()])
        nameRow.spacing = 8
        nameRow.alignment = .center
        let texts = UIStackView(arrangedSubviews: [nameRow, detailLabel, branchLabel])
        texts.axis = .vertical
        texts.spacing = DS.Gap.lineTight
        let chevron = UIImageView(image: DS.symbol("chevron.right", DS.Icon.sm))
        chevron.tintColor = UIColor(hexString: "94A3B8")
        chevron.contentMode = .center
        chevron.setContentHuggingPriority(.required, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [texts, chevron])
        row.spacing = DS.Spacing.md
        row.alignment = .center
        contentView.addSubview(row)
        row.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: DS.Spacing.lg, bottom: 12, right: DS.Spacing.lg))
        }
        let line = V2.divider()
        contentView.addSubview(line)
        line.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.trailing.bottom.equalToSuperview()
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func bind(_ account: BankAccount) {
        nameLabel.text = account.bankName
        defaultPill.isHidden = account.isDefault != true
        detailLabel.text = "\(account.accountNumber) · \(account.accountHolderName)"
        branchLabel.text = account.branch
        branchLabel.isHidden = (account.branch ?? "").isEmpty
        accessibilityTraits = UIAccessibilityTraitButton
    }
}
