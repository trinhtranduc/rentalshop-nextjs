//
//  BankAccountFormViewController.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-28.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import SnapKit

class BankAccountFormViewController: BaseViewControler {
    // MARK: - Properties
    weak var delegate: BankAccountFormDelegate?
    var bankAccount: BankAccount?
    
    // MARK: - UI Components
    private lazy var saveButton: UIButton = {
        let button = UIButton(type: .system)
        let title = bankAccount == nil ? "Add".localized() : "Update".localized()
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: 17)
        button.setTitleColor(APP_TONE_COLOR, for: .normal)
        button.addTarget(self, action: #selector(saveButtonTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var scrollView: UIScrollView = {
        let sv = UIScrollView()
        sv.showsVerticalScrollIndicator = false
        return sv
    }()
    
    private lazy var containerView: UIView = {
        let view = UIView()
        return view
    }()
    
    private lazy var bankNameButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Select Bank".localized(), for: .normal)
        button.setTitleColor(.label, for: .normal)
        button.titleLabel?.font = Utils.regularFont(size: 16)
        button.contentHorizontalAlignment = .right
        button.addTarget(self, action: #selector(bankNameButtonTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var bankCodeField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Bank Code".localized(),
            placeholder: "Auto-filled".localized()
        )
        field.textField.setLeftIcon(UIImage(systemName: "number.square.fill"))
        field.textField.isEnabled = false
        field.textField.textColor = .secondaryLabel
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private var selectedBankName: String?
    private var selectedBankCode: String?
    
    private lazy var accountNumberField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Account Number".localized(),
            placeholder: "Enter account number".localized()
        )
        field.textField.keyboardType = .numberPad
        field.textField.setLeftIcon(UIImage(systemName: "number"))
        field.textField.returnKeyType = .next
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private lazy var accountHolderNameField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Account Holder Name".localized(),
            placeholder: "Enter account holder name".localized()
        )
        field.textField.setLeftIcon(UIImage(systemName: "person.fill"))
        field.textField.returnKeyType = .next
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private lazy var branchField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Branch".localized(),
            placeholder: "Enter branch (optional)".localized()
        )
        field.textField.setLeftIcon(UIImage(systemName: "mappin.circle.fill"))
        field.textField.returnKeyType = .done
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private lazy var isDefaultSwitch: UISwitch = {
        let switchControl = UISwitch()
        switchControl.onTintColor = APP_TONE_COLOR
        return switchControl
    }()
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupNavigationBar()
        setupUI()
        setupData()
        
        view.onTap { [weak self] _ in
            self?.view.endEditing(true)
        }
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }
    
    // MARK: - Setup
    override func setupUI() {
        view.backgroundColor = .backgroundPrimary
        
        view.addSubview(scrollView)
        scrollView.addSubview(containerView)
        
        let fieldsCardContainer = UIView()
        fieldsCardContainer.backgroundColor = .white
        fieldsCardContainer.layer.cornerRadius = 10
        fieldsCardContainer.layer.borderWidth = 0.5
        fieldsCardContainer.layer.borderColor = UIColor.separator.withAlphaComponent(0.25).cgColor
        
        let fieldsStack = UIStackView()
        fieldsStack.axis = .vertical
        fieldsStack.spacing = 0
        fieldsStack.distribution = .fill
        
        // Bank Name Row (Button)
        let bankNameWrapper = UIView()
        let bankNameRowStack = UIStackView()
        bankNameRowStack.axis = .horizontal
        bankNameRowStack.spacing = 12
        bankNameRowStack.alignment = .center
        bankNameRowStack.distribution = .fill
        
        let bankNameTitleLabel = UILabel()
        bankNameTitleLabel.text = "Bank Name".localized()
        bankNameTitleLabel.font = Utils.regularFont(size: 16)
        bankNameTitleLabel.textColor = .label
        bankNameTitleLabel.setContentHuggingPriority(.defaultHigh, for: .horizontal)
        
        bankNameRowStack.addArrangedSubview(bankNameTitleLabel)
        bankNameRowStack.addArrangedSubview(bankNameButton)
        
        bankNameWrapper.addSubview(bankNameRowStack)
        bankNameRowStack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16))
            make.height.greaterThanOrEqualTo(44)
        }
        fieldsStack.addArrangedSubview(bankNameWrapper)
        
        // Separator
        let separator1 = UIView()
        separator1.backgroundColor = UIColor.separator.withAlphaComponent(0.25)
        fieldsStack.addArrangedSubview(separator1)
        separator1.snp.makeConstraints { make in
            make.height.equalTo(0.5)
        }
        
        // Bank Code Row (Read-only)
        let bankCodeWrapper = UIView()
        let bankCodeRowStack = UIStackView()
        bankCodeRowStack.axis = .horizontal
        bankCodeRowStack.spacing = 12
        bankCodeRowStack.alignment = .center
        bankCodeRowStack.distribution = .fill
        
        let bankCodeTitleLabel = UILabel()
        bankCodeTitleLabel.text = bankCodeField.titleLabel.text
        bankCodeTitleLabel.font = Utils.regularFont(size: 16)
        bankCodeTitleLabel.textColor = .label
        bankCodeTitleLabel.setContentHuggingPriority(.defaultHigh, for: .horizontal)
        
        let bankCodeTextField = bankCodeField.textField
        bankCodeTextField.font = Utils.regularFont(size: 16)
        bankCodeTextField.textAlignment = .right
        bankCodeTextField.setContentHuggingPriority(.defaultLow, for: .horizontal)
        bankCodeTextField.layer.borderWidth = 0
        bankCodeTextField.layer.borderColor = UIColor.clear.cgColor
        bankCodeTextField.backgroundColor = .clear
        bankCodeTextField.leftView = nil
        bankCodeTextField.leftViewMode = .never
        bankCodeTextField.rightView = nil
        bankCodeTextField.rightViewMode = .never
        
        bankCodeRowStack.addArrangedSubview(bankCodeTitleLabel)
        bankCodeRowStack.addArrangedSubview(bankCodeTextField)
        
        bankCodeWrapper.addSubview(bankCodeRowStack)
        bankCodeRowStack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16))
            make.height.greaterThanOrEqualTo(44)
        }
        fieldsStack.addArrangedSubview(bankCodeWrapper)
        
        // Separator
        let separator2 = UIView()
        separator2.backgroundColor = UIColor.separator.withAlphaComponent(0.25)
        fieldsStack.addArrangedSubview(separator2)
        separator2.snp.makeConstraints { make in
            make.height.equalTo(0.5)
        }
        
        // Other fields
        let otherFields = [accountNumberField, accountHolderNameField, branchField]
        
        for (index, field) in otherFields.enumerated() {
            let fieldWrapper = UIView()
            
            let rowStack = UIStackView()
            rowStack.axis = .horizontal
            rowStack.spacing = 12
            rowStack.alignment = .center
            rowStack.distribution = .fill
            
            let titleLabel = UILabel()
            titleLabel.text = field.titleLabel.text
            titleLabel.font = Utils.regularFont(size: 16)
            titleLabel.textColor = .label
            titleLabel.setContentHuggingPriority(.defaultHigh, for: .horizontal)
            
            let valueTextField = field.textField
            valueTextField.font = Utils.regularFont(size: 16)
            valueTextField.textAlignment = .right
            valueTextField.setContentHuggingPriority(.defaultLow, for: .horizontal)
            
            valueTextField.layer.borderWidth = 0
            valueTextField.layer.borderColor = UIColor.clear.cgColor
            valueTextField.backgroundColor = .clear
            valueTextField.leftView = nil
            valueTextField.leftViewMode = .never
            valueTextField.rightView = nil
            valueTextField.rightViewMode = .never
            
            rowStack.addArrangedSubview(titleLabel)
            rowStack.addArrangedSubview(valueTextField)
            
            fieldWrapper.addSubview(rowStack)
            rowStack.snp.makeConstraints { make in
                make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16))
                make.height.greaterThanOrEqualTo(44)
            }
            
            fieldsStack.addArrangedSubview(fieldWrapper)
            
            if index < otherFields.count - 1 {
                let separator = UIView()
                separator.backgroundColor = UIColor.separator.withAlphaComponent(0.25)
                fieldsStack.addArrangedSubview(separator)
                separator.snp.makeConstraints { make in
                    make.height.equalTo(0.5)
                }
            }
        }
        
        // Separator before default switch
        let separator3 = UIView()
        separator3.backgroundColor = UIColor.separator.withAlphaComponent(0.25)
        fieldsStack.addArrangedSubview(separator3)
        separator3.snp.makeConstraints { make in
            make.height.equalTo(0.5)
        }
        
        // Default Switch Row
        let defaultWrapper = UIView()
        let defaultRowStack = UIStackView()
        defaultRowStack.axis = .horizontal
        defaultRowStack.spacing = 12
        defaultRowStack.alignment = .center
        defaultRowStack.distribution = .fill
        
        let defaultTitleLabel = UILabel()
        defaultTitleLabel.text = "Set as Default".localized()
        defaultTitleLabel.font = Utils.regularFont(size: 16)
        defaultTitleLabel.textColor = .label
        defaultTitleLabel.setContentHuggingPriority(.defaultHigh, for: .horizontal)
        
        defaultRowStack.addArrangedSubview(defaultTitleLabel)
        defaultRowStack.addArrangedSubview(isDefaultSwitch)
        
        defaultWrapper.addSubview(defaultRowStack)
        defaultRowStack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16))
            make.height.greaterThanOrEqualTo(44)
        }
        fieldsStack.addArrangedSubview(defaultWrapper)
        
        fieldsCardContainer.addSubview(fieldsStack)
        fieldsStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        containerView.addSubview(fieldsCardContainer)
        
        guard let customNavBar = customNavBar else { return }
        
        scrollView.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(view.safeAreaLayoutGuide)
        }
        
        containerView.snp.makeConstraints { make in
            make.edges.equalTo(scrollView)
            make.width.equalTo(scrollView)
            make.height.greaterThanOrEqualTo(scrollView)
        }
        
        fieldsCardContainer.snp.makeConstraints { make in
            make.top.equalTo(containerView).offset(16)
            make.leading.equalTo(containerView).offset(12)
            make.trailing.equalTo(containerView).offset(-12)
            make.bottom.lessThanOrEqualTo(containerView).offset(-16)
        }
    }
    
    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        let title = bankAccount == nil ? "Add Bank Account".localized() : "Edit Bank Account".localized()
        let navBar = setupCustomNavigationBar(
            title: title,
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .custom { [weak self] in
                self?.dismiss(animated: true)
            }
        )
        navBar.setDismissButton() // Use X button for dismiss
        navBar.addRightButton(saveButton)
    }
    
    override func setupData() {
        let buttonTitle = bankAccount == nil ? "Add".localized() : "Update".localized()
        saveButton.setTitle(buttonTitle, for: .normal)
        
        if let bankAccount = bankAccount {
            selectedBankName = bankAccount.bankName
            selectedBankCode = bankAccount.bankCode
            bankNameButton.setTitle(bankAccount.bankName, for: .normal)
            bankCodeField.textField.text = bankAccount.bankCode
            accountNumberField.textField.text = bankAccount.accountNumber
            accountHolderNameField.textField.text = bankAccount.accountHolderName
            branchField.textField.text = bankAccount.branch
            isDefaultSwitch.isOn = bankAccount.isDefault ?? false
        }
    }
    
    // MARK: - Actions
    @objc private func bankNameButtonTapped() {
        let pickerVC = BankPickerViewController()
        pickerVC.delegate = self
        if let selectedBankName = selectedBankName {
            pickerVC.selectedBankName = selectedBankName
        }
        let navController = UINavigationController(rootViewController: pickerVC)
        present(navController, animated: true)
    }
    
    @objc private func saveButtonTapped() {
        guard validateInputs() else { return }
        
        guard let bankName = selectedBankName, !bankName.isEmpty else {
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "Please select a bank".localized()
            )
            return
        }
        
        let accountNumber = accountNumberField.textField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let accountHolderName = accountHolderNameField.textField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let branch = branchField.textField.text?.trimmingCharacters(in: .whitespacesAndNewlines)
        
        var params: [String: Any] = [
            "bankName": bankName,
            "accountNumber": accountNumber,
            "accountHolderName": accountHolderName,
            "isDefault": isDefaultSwitch.isOn
        ]
        
        if let bankCode = selectedBankCode {
            params["bankCode"] = bankCode
        }
        
        if let branch = branch, !branch.isEmpty {
            params["branch"] = branch
        }
        
        if let bankAccount = bankAccount, let bankAccountId = bankAccount.id {
            updateBankAccount(bankAccountId: bankAccountId, withParams: params)
        } else {
            createBankAccount(withParams: params)
        }
    }
    
    // MARK: - Validation
    private func validateInputs() -> Bool {
        guard let bankName = selectedBankName, !bankName.isEmpty else {
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "Please select a bank".localized()
            )
            return false
        }
        
        guard let accountNumber = accountNumberField.textField.text, !accountNumber.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "Please check account number".localized()
            )
            return false
        }
        
        guard let accountHolderName = accountHolderNameField.textField.text, !accountHolderName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "Please check account holder name".localized()
            )
            return false
        }
        
        return true
    }
    
    // MARK: - API Calls
    private func createBankAccount(withParams params: [String: Any]) {
        view.endEditing(true)
        showProgressText(text: "Loading...".localized())
        
        BankAccountService.shared.createBankAccount(withValues: params) { [weak self] bankAccount, error in
            guard let self = self else { return }
            self.hideProgress()
            
            if let error = error {
                UIAlertController.errorAlert(parent: self, error: error)
            } else if bankAccount != nil {
                self.delegate?.bankAccountFormDidSave()
                self.dismiss(animated: true)
            }
        }
    }
    
    private func updateBankAccount(bankAccountId: Int, withParams params: [String: Any]) {
        view.endEditing(true)
        showProgressText(text: "Updating...".localized())
        
        BankAccountService.shared.updateBankAccount(bankAccountId: bankAccountId, withValues: params) { [weak self] bankAccount, error in
            guard let self = self else { return }
            self.hideProgress()
            
            if let error = error {
                UIAlertController.errorAlert(parent: self, error: error)
            } else if bankAccount != nil {
                self.delegate?.bankAccountFormDidSave()
                self.dismiss(animated: true)
            }
        }
    }
}

// MARK: - BankPickerViewControllerDelegate
extension BankAccountFormViewController: BankPickerViewControllerDelegate {
    func didSelectBank(bankName: String, bankCode: String, sender: BankPickerViewController) {
        selectedBankName = bankName
        selectedBankCode = bankCode
        bankNameButton.setTitle(bankName, for: .normal)
        bankCodeField.textField.text = bankCode
    }
}

