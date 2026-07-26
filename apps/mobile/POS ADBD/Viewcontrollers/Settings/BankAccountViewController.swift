//
//  BankAccountViewController.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-28.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import SnapKit

class BankAccountViewController: BaseViewControler {
    // MARK: - Properties
    private var bankAccounts: [BankAccount] = []
    private var selectedBankAccount: BankAccount?
    
    // MARK: - UI Components
    private lazy var bankAccountsTableView: UITableView = {
        let table = UITableView(frame: .zero, style: .insetGrouped)
        table.delegate = self
        table.dataSource = self
        table.backgroundColor = .backgroundPrimary
        table.register(UITableViewCell.self, forCellReuseIdentifier: "BankAccountCell")
        return table
    }()
    
    private lazy var addButton: UIButton = {
        let button = UIButton(type: .system)
        button.setImage(UIImage(systemName: "plus"), for: .normal)
        button.tintColor = APP_TONE_COLOR
        button.addTarget(self, action: #selector(addButtonTapped), for: .touchUpInside)
        return button
    }()
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupNavigationBar()
        setupUI()
        loadBankAccounts()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        loadBankAccounts()
    }
    
    // MARK: - Setup
    override func setupUI() {
        view.backgroundColor = .backgroundPrimary
        
        guard let customNavBar = customNavBar else { return }
        
        view.addSubview(bankAccountsTableView)
        bankAccountsTableView.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
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
        let formVC = BankAccountFormViewController()
        formVC.bankAccount = selectedBankAccount
        formVC.delegate = self
        let navController = BaseNavigationController(rootViewController: formVC)
        present(navController, animated: true)
    }
    
    // MARK: - Data Loading
    private func loadBankAccounts() {
        showProgressText(text: "Loading...".localized())
        
        BankAccountService.shared.getBankAccounts { [weak self] bankAccounts, error in
            guard let self = self else { return }
            self.hideProgress()
            
            if let error = error {
                UIAlertController.errorAlert(parent: self, error: error)
            } else if let bankAccounts = bankAccounts {
                self.bankAccounts = bankAccounts
                self.bankAccountsTableView.reloadData()
            }
        }
    }
    
    private func deleteBankAccount(at indexPath: IndexPath) {
        let bankAccount = bankAccounts[indexPath.row]
        guard let bankAccountId = bankAccount.id else { return }
        
        showProgressText(text: "Deleting...".localized())
        
        BankAccountService.shared.deleteBankAccount(bankAccountId: bankAccountId) { [weak self] error in
            guard let self = self else { return }
            self.hideProgress()
            
            if let error = error {
                UIAlertController.errorAlert(parent: self, error: error)
            } else {
                self.bankAccounts.remove(at: indexPath.row)
                self.bankAccountsTableView.deleteRows(at: [indexPath], with: .fade)
            }
        }
    }
}

// MARK: - UITableViewDataSource
extension BankAccountViewController: UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return bankAccounts.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "BankAccountCell", for: indexPath)
        let bankAccount = bankAccounts[indexPath.row]
        
        var config = cell.defaultContentConfiguration()
        config.text = bankAccount.bankName
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
        selectedBankAccount = bankAccounts[indexPath.row]
        presentBankAccountForm()
    }
    
    func tableView(_ tableView: UITableView, canEditRowAt indexPath: IndexPath) -> Bool {
        return true
    }
    
    func tableView(_ tableView: UITableView, commit editingStyle: UITableViewCell.EditingStyle, forRowAt indexPath: IndexPath) {
        if editingStyle == .delete {
            let bankAccount = bankAccounts[indexPath.row]
            
            let alert = UIAlertController(
                title: "Delete Bank Account".localized(),
                message: String(format: "Are you sure you want to delete %@?".localized(), bankAccount.bankName),
                preferredStyle: .alert
            )
            
            alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
            alert.addAction(UIAlertAction(title: "Delete".localized(), style: .destructive) { [weak self] _ in
                self?.deleteBankAccount(at: indexPath)
            })
            
            present(alert, animated: true)
        }
    }
    
    func tableView(_ tableView: UITableView, titleForDeleteConfirmationButtonForRowAt indexPath: IndexPath) -> String? {
        return "Delete".localized()
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

