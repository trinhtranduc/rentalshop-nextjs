//
//  BankPickerViewController.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-28.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import UIKit
import SnapKit

protocol BankPickerViewControllerDelegate: AnyObject {
    func didSelectBank(bankName: String, bankCode: String, sender: BankPickerViewController)
}

class BankPickerViewController: BaseViewControler {
    // MARK: - Properties
    weak var delegate: BankPickerViewControllerDelegate?
    var selectedBankName: String?
    
    // MARK: - UI Components
    
    private lazy var bankTableView: UITableView = {
        let table = UITableView(frame: .zero, style: .insetGrouped)
        table.delegate = self
        table.dataSource = self
        table.backgroundColor = .backgroundPrimary
        table.register(UITableViewCell.self, forCellReuseIdentifier: "BankCell")
        return table
    }()
    
    private lazy var searchBar: UISearchBar = {
        let searchBar = UISearchBar()
        searchBar.placeholder = "Search bank...".localized()
        searchBar.delegate = self
        searchBar.placeholderLabel?.font = Utils.regularFont(size: 16)
        searchBar.placeholderLabel?.textColor = .textTertiary
        searchBar.textField?.textColor = .textPrimary
        searchBar.textField?.font = Utils.regularFont(size: 16)
        
        // Configure text input traits
        searchBar.searchTextField.autocorrectionType = .no
        searchBar.searchTextField.autocapitalizationType = .none
        searchBar.searchTextField.spellCheckingType = .no
        searchBar.searchTextField.smartDashesType = .no
        searchBar.searchTextField.smartQuotesType = .no
        searchBar.searchTextField.smartInsertDeleteType = .no
        return searchBar
    }()
    
    // MARK: - Data
    private let allBanks = VietnamBankCodes.getAllBankNames()
    private var filteredBanks: [String] = []
    private var isSearching: Bool = false
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupNavigationBar()
        setupUI()
        filteredBanks = allBanks
    }
    
    // MARK: - Setup
    override func setupUI() {
        view.backgroundColor = .backgroundPrimary
        
        guard let customNavBar = customNavBar else { return }
        
        view.addSubview(searchBar)
        view.addSubview(bankTableView)
        
        searchBar.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom)
            make.leading.trailing.equalToSuperview()
        }
        
        bankTableView.snp.makeConstraints { make in
            make.top.equalTo(searchBar.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
    }
    
    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        let navBar = setupCustomNavigationBar(
            title: "Select Bank".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .custom { [weak self] in
                self?.dismiss(animated: true)
            }
        )
        navBar.setDismissButton() // Use X button for dismiss
    }
    
    // MARK: - Search
    private func filterBanks(with searchText: String) {
        if searchText.isEmpty {
            filteredBanks = allBanks
            isSearching = false
        } else {
            filteredBanks = allBanks.filter { bankName in
                bankName.lowercased().contains(searchText.lowercased())
            }
            isSearching = true
        }
        bankTableView.reloadData()
    }
}

// MARK: - UITableViewDataSource
extension BankPickerViewController: UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredBanks.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "BankCell", for: indexPath)
        let bankName = filteredBanks[indexPath.row]
        
        var config = cell.defaultContentConfiguration()
        config.text = bankName
        config.textProperties.font = .bodyRegular(size: 16)
        
        if let bankCode = VietnamBankCodes.getBankCode(for: bankName) {
            config.secondaryText = String(format: "Code: %@".localized(), bankCode)
            config.secondaryTextProperties.font = .captionSmall(size: 14)
            config.secondaryTextProperties.color = .secondaryLabel
        }
        
        cell.contentConfiguration = config
        
        if bankName == selectedBankName {
            cell.accessoryType = .checkmark
        } else {
            cell.accessoryType = .none
        }
        
        return cell
    }
}

// MARK: - UITableViewDelegate
extension BankPickerViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        let bankName = filteredBanks[indexPath.row]
        guard let bankCode = VietnamBankCodes.getBankCode(for: bankName) else {
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "Bank code not found".localized()
            )
            return
        }
        
        delegate?.didSelectBank(bankName: bankName, bankCode: bankCode, sender: self)
        dismiss(animated: true)
    }
}

// MARK: - UISearchBarDelegate
extension BankPickerViewController: UISearchBarDelegate {
    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        filterBanks(with: searchText)
    }
    
    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
    }
}

