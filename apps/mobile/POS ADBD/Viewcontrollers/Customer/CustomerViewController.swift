//
//  CustomerViewController.swift
//  POS ADBD
//
//  Created by Tran Trinh on 12/1/19.
//  Copyright © 2019 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import SnapKit

protocol CustomerViewControllerDelegate: AnyObject {
    func didCreateCustomer(customer: Customer, sender: CustomerViewController)
    func didUpdateCustomer(customer: Customer, sender: CustomerViewController)
}

class CustomerViewController: BaseViewControler {
    // MARK: - Properties
    var customer: Customer?
    var customerText: String?
    weak var delegate: CustomerViewControllerDelegate?
    
    // MARK: - UI Components
    private lazy var saveButton: UIButton = {
        let button = UIButton(type: .system)
        let title = customer == nil ? "Add".localized() : "Update".localized()
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
    
    private lazy var stackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 12
        return stack
    }()
    
    private lazy var customerNameField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Customer Name *".localized(), // * indicates required field
            placeholder: "Enter customer name".localized()
        )
        field.textField.setLeftIcon(UIImage(systemName: "person.fill"))
        field.textField.returnKeyType = .next
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private lazy var phoneField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Phone Number".localized(),
            placeholder: "Enter phone number".localized()
        )
        field.textField.keyboardType = .phonePad
        field.textField.setLeftIcon(UIImage(systemName: "phone.fill"))
        field.textField.returnKeyType = .next
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private lazy var emailField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Email".localized(),
            placeholder: "Enter email".localized()
        )
        field.textField.keyboardType = .emailAddress
        field.textField.setLeftIcon(UIImage(systemName: "envelope.fill"))
        field.textField.returnKeyType = .next
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private lazy var addressField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Address".localized(),
            placeholder: "Enter address".localized()
        )
        field.textField.setLeftIcon(UIImage(systemName: "mappin.circle.fill"))
        field.textField.returnKeyType = .done
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupNavigationBar()
        setupUI()
        setupData()
        
        // Add tap gesture to dismiss keyboard
        view.onTap { [weak self] _ in
            self?.view.endEditing(true)
        }
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Ensure navigation bar is hidden when returning to this screen
        navigationController?.setNavigationBarHidden(true, animated: false)
    }
    
    // MARK: - Setup
    override func setupUI() {
        view.backgroundColor = .backgroundPrimary
        
        guard let customNavBar = customNavBar else { return }
        
        // Setup view hierarchy
        view.addSubview(scrollView)
        scrollView.addSubview(containerView)
        
        // Create one card container for all fields
        let fieldsCardContainer = UIView()
        fieldsCardContainer.backgroundColor = .white
        fieldsCardContainer.layer.cornerRadius = 10
        fieldsCardContainer.layer.borderWidth = 0.5
        fieldsCardContainer.layer.borderColor = UIColor.separator.withAlphaComponent(0.25).cgColor
        
        // Create inner stack for fields with separators
        let fieldsStack = UIStackView()
        fieldsStack.axis = .vertical
        fieldsStack.spacing = 0
        fieldsStack.distribution = .fill
        
        let allFields = [customerNameField, phoneField, emailField, addressField]
        
        // Add each field with wrapper view for padding - title and value on same row
        for (index, field) in allFields.enumerated() {
            let fieldWrapper = UIView()
            
            // Create horizontal stack for title and value
            let rowStack = UIStackView()
            rowStack.axis = .horizontal
            rowStack.spacing = 12
            rowStack.alignment = .center
            rowStack.distribution = .fill
            
            // Title label with required indicator
            let titleLabel = UILabel()
            let titleText = field.titleLabel.text ?? ""
            titleLabel.text = titleText
            titleLabel.font = Utils.regularFont(size: 16) // Match AccountViewController
            titleLabel.textColor = .label
            titleLabel.setContentHuggingPriority(.defaultHigh, for: .horizontal)
            
            // Add red asterisk for required fields (fields with * in title)
            if titleText.contains("*") {
                let attributedText = NSMutableAttributedString(string: titleText)
                let asteriskRange = (titleText as NSString).range(of: "*")
                if asteriskRange.location != NSNotFound {
                    attributedText.addAttribute(.foregroundColor, value: UIColor.systemRed, range: asteriskRange)
                }
                titleLabel.attributedText = attributedText
            }
            
            // Value textField - remove title from field and use only textField
            let valueTextField = field.textField
            valueTextField.font = Utils.regularFont(size: 16) // Match AccountViewController
            valueTextField.textAlignment = .right
            valueTextField.setContentHuggingPriority(.defaultLow, for: .horizontal)
            
            // Remove border, icon, and padding for clean right alignment
            valueTextField.layer.borderWidth = 0
            valueTextField.layer.borderColor = UIColor.clear.cgColor
            valueTextField.backgroundColor = .clear
            valueTextField.leftView = nil
            valueTextField.leftViewMode = .never
            valueTextField.rightView = nil
            valueTextField.rightViewMode = .never
            //valueTextField.disablePadding = true // Disable padding for right alignment
            
            rowStack.addArrangedSubview(titleLabel)
            rowStack.addArrangedSubview(valueTextField)
            
            fieldWrapper.addSubview(rowStack)
            rowStack.snp.makeConstraints { make in
                make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16))
                make.height.greaterThanOrEqualTo(44)
            }
            
            fieldsStack.addArrangedSubview(fieldWrapper)
            
            // Add separator after each field except the last one
            if index < allFields.count - 1 {
                let separator = UIView()
                separator.backgroundColor = UIColor.separator.withAlphaComponent(0.25)
                fieldsStack.addArrangedSubview(separator)
                separator.snp.makeConstraints { make in
                    make.height.equalTo(0.5)
                }
            }
        }
        
        fieldsCardContainer.addSubview(fieldsStack)
        fieldsStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        containerView.addSubview(fieldsCardContainer)
        
        // Setup constraints
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
        let title = customer == nil ? "Add new customer".localized() : "Update customer".localized()
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
        navBar.backButtonTintColor = .black // Black X button for white background
        navBar.addRightButton(saveButton)
    }
    
    override func setupData() {
        let buttonTitle = customer == nil ? "Add".localized() : "Update".localized()
        saveButton.setTitle(buttonTitle, for: .normal)
        
        if let customer = customer {
            // Combine firstName and lastName into single customerName field
            var fullName = ""
            if let firstName = customer.firstName, !firstName.isEmpty {
                fullName = firstName
            }
            if let lastName = customer.lastName, !lastName.isEmpty {
                if fullName.isEmpty {
                    fullName = lastName
                } else {
                    fullName += " \(lastName)"
                }
            }
            
            // Fallback to full_name if firstName/lastName not available
            if fullName.isEmpty, let customerFullName = customer.full_name, !customerFullName.isEmpty {
                fullName = customerFullName
            }
            
            customerNameField.textField.text = fullName
            phoneField.textField.text = customer.phone
            emailField.textField.text = customer.email
            addressField.textField.text = customer.address
        } else if let text = customerText {
            if Int(text) != nil {
                phoneField.textField.text = text
            } else {
                // Use text as customer name
                customerNameField.textField.text = text
            }
        }
    }
    
    // MARK: - Actions
    @objc private func saveButtonTapped() {
        guard validateInputs() else { return }
        
        // Get customer name and split into firstName and lastName
        let customerName = customerNameField.textField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        
        // Split name into firstName and lastName
        // If only one word, use it for firstName and set lastName to empty string
        // If multiple words, first word is firstName, rest is lastName
        let nameComponents = customerName.components(separatedBy: " ").filter { !$0.isEmpty }
        let firstName = nameComponents.first ?? customerName
        let lastName = nameComponents.count > 1 ? nameComponents.dropFirst().joined(separator: " ") : ""
        
        // firstName is required when sending to server, other fields are optional
        var params: [String: Any] = [
            "firstName": firstName
        ]
        
        // Only include optional fields if they have values
        if !lastName.isEmpty {
            params["lastName"] = lastName
        }
        
        if let phone = phoneField.textField.text?.trimmingCharacters(in: .whitespacesAndNewlines), !phone.isEmpty {
            params["phone"] = phone
        }
        
        if let email = emailField.textField.text?.trimmingCharacters(in: .whitespacesAndNewlines), !email.isEmpty {
            params["email"] = email
        }
        
        if let address = addressField.textField.text?.trimmingCharacters(in: .whitespacesAndNewlines), !address.isEmpty {
            params["address"] = address
        }
        
        if let customer = customer {
            // Use new API id field if available, fallback to customer_id
            let customerId = customer.id ?? customer.customer_id
            updateCustomer(customerId: customerId, withParams: params)
        } else {
            createCustomer(withParams: params)
        }
    }
    
    
    // MARK: - Validation & Server Updates
    private func validateInputs() -> Bool {
        // Validate customer name (required)
        guard let customerName = customerNameField.textField.text, !customerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "Please enter customer name".localized()
            )
            return false
        }
        
        return true
    }
    
    private func createCustomer(withParams params: [String: Any]) {
        view.endEditing(true)
        showProgressText(text: "Loading...".localized())
        
        CustomerService.shared.createCustomer(withValues: params) { [weak self] customer, error in
            guard let self = self else { return }
            self.hideProgress()
            
            if let error = error {
                UIAlertController.errorAlert(parent: self, error: error)
            } else if let customer = customer {
                print("✅ Customer created successfully: \(customer.full_name ?? "Unnamed")")
                // Notify delegate about new customer
                self.delegate?.didCreateCustomer(customer: customer, sender: self)
                self.dismiss(animated: true)
            }
        }
    }
    
    private func updateCustomer(customerId: Int, withParams params: [String: Any]) {
        view.endEditing(true)
        showProgressText(text: "Updating customer...".localized())
        
        CustomerService.shared.updateCustomer(customerId: customerId, withValues: params) { [weak self] customer, error in
            guard let self = self else { return }
            self.hideProgress()
            
            if let error = error {
                UIAlertController.errorAlert(parent: self, error: error)
            } else if let customer = customer {
                print("✅ Customer updated successfully: \(customer.full_name ?? "Unnamed")")
                // Notify delegate about updated customer
                self.delegate?.didUpdateCustomer(customer: customer, sender: self)
                self.dismiss(animated: true)
            }
        }
    }
    
    // Legacy method for backward compatibility - will be removed in future versions
    private func updateCustomer(withParams params: [String: Any]) {
        // This method shouldn't be called anymore since we use customerId version
        guard let customer = customer else {
            print("❌ Error: updateCustomer called without customer object")
            return
        }
        
        let customerId = customer.id ?? customer.customer_id
        updateCustomer(customerId: customerId, withParams: params)
    }
}
