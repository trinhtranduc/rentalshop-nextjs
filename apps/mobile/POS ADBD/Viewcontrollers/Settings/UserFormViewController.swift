//
//  UserFormViewController.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-XX.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import SnapKit

protocol UserFormViewControllerDelegate: AnyObject {
    func didCreateUser(user: User)
    func didUpdateUser(user: User)
}

class UserFormViewController: BaseViewControler {
    
    // MARK: - Properties
    var user: User?
    weak var delegate: UserFormViewControllerDelegate?
    /// #459: new style, set by the v2 user list before the form is shown
    var v2 = false
    /// v2 rows that open the role / outlet pickers (iPad popover anchors)
    private var v2RoleRow: UIView?
    private var v2OutletRow: UIView?
    
    // MARK: - UI Components
    private lazy var saveButton: RCPrimaryButton = {
        let button = RCPrimaryButton(
            title: user == nil ? "Add User".localized() : "Update User".localized(),
            backgroundColor: APP_TONE_COLOR
        )
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
    
    private lazy var userNameField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Name *".localized(),
            placeholder: "Enter user's name".localized()
        )
        field.textField.setLeftIcon(UIImage(systemName: "person.fill"))
        field.textField.returnKeyType = .next
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private lazy var emailField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Email *".localized(),
            placeholder: "Enter email".localized()
        )
        field.textField.keyboardType = .emailAddress
        field.textField.autocapitalizationType = .none
        field.textField.setLeftIcon(UIImage(systemName: "envelope.fill"))
        field.textField.returnKeyType = .next
        field.setTitleColor(APP_TEXT_COLOR)
        field.textField.isEnabled = user == nil // Email cannot be changed when editing
        return field
    }()
    
    private lazy var passwordField: LabeledTextField = {
        let field = LabeledTextField(
            title: user == nil ? "Password *".localized() : "Password (leave blank to keep current)".localized(),
            placeholder: "Enter password".localized()
        )
        field.textField.isSecureTextEntry = true
        field.textField.setLeftIcon(UIImage(systemName: "key.fill"))
        field.textField.returnKeyType = .next
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private lazy var roleField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Role *".localized(),
            placeholder: "Select role".localized()
        )
        field.textField.setLeftIcon(UIImage(systemName: "person.badge.shield.checkmark.fill"))
        field.textField.isEnabled = false // Use picker
        field.setTitleColor(APP_TEXT_COLOR)
        
        return field
    }()
    
    private lazy var outletField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Outlet".localized(),
            placeholder: "Select outlet".localized()
        )
        field.textField.setLeftIcon(UIImage(systemName: "storefront.fill"))
        field.textField.isEnabled = false // Use picker
        field.setTitleColor(APP_TEXT_COLOR)
        
        return field
    }()
    
    /// #684: empty until the owner picks a role in the sheet (create); the user's role when editing
    private var selectedRole: Role?
    private var selectedOutletId: Int?
    private var availableOutlets: [Outlet] = []
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Hide tabbar when pushed
        self.hidesBottomBarWhenPushed = true
        
        if !v2 {
            setupNavigationBar()
        }
        setupUI()
        setupData()
        
        // Add tap gesture to dismiss keyboard
        view.onTap { [weak self] _ in
            self?.view.endEditing(true)
        }
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        
        // Ensure tabbar is hidden
        self.tabBarController?.tabBar.isHidden = true
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        
        // Show tabbar when leaving
        self.tabBarController?.tabBar.isHidden = false
    }
    
    // MARK: - Setup
    override func setupUI() {
        if v2 {
            setupV2UI()
            return
        }
        view.backgroundColor = .backgroundPrimary
        
        guard let customNavBar = customNavBar else { return }
        
        view.addSubview(scrollView)
        view.addSubview(saveButton)
        scrollView.addSubview(containerView)
        
        // Create card container for all fields
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
        
        // Determine if outlet field should be shown
        let currentUser = User.current()
        let isMerchant = currentUser?.role == .merchant
        let isOutletAdmin = currentUser?.role == .outletAdmin
        let isEditMode = user != nil
        
        // Outlet field: show for merchant when creating, for outlet admin (auto-assigned), or when editing (read-only)
        // Password field: only show when creating new user (not when editing, use separate change password option)
        var allFields: [LabeledTextField] = [userNameField, emailField]
        
        // Only show password field when creating new user
        if !isEditMode {
            allFields.append(passwordField)
        }
        
        allFields.append(roleField)
        
        if (isMerchant && !isEditMode) || (isOutletAdmin && !isEditMode) || isEditMode {
            allFields.append(outletField)
            // Disable outlet field when editing (cannot change outlet)
            if isEditMode {
                outletField.textField.isEnabled = false
            }
        }
        
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
            
            // Use existing textField with disabled padding for clean right alignment
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
            
            // Special handling for roleField and outletField - add chevron and make whole row tappable
            if field == roleField {
                // Add chevron icon
                let chevronIcon = UIImageView(image: UIImage(systemName: "chevron.right"))
                chevronIcon.tintColor = .systemGray3
                chevronIcon.contentMode = .scaleAspectFit
                chevronIcon.setContentHuggingPriority(.required, for: .horizontal)
                
                rowStack.addArrangedSubview(titleLabel)
                rowStack.addArrangedSubview(valueTextField)
                rowStack.addArrangedSubview(chevronIcon)
                
                // Make the whole wrapper tappable
                let tapGesture = UITapGestureRecognizer(target: self, action: #selector(showRolePicker))
                fieldWrapper.addGestureRecognizer(tapGesture)
                fieldWrapper.isUserInteractionEnabled = true
            } else if field == outletField {
                // Check if outlet field should be interactive
                let currentUser = User.current()
                let isMerchant = currentUser?.role == .merchant
                let isEditMode = user != nil
                let isInteractive = isMerchant && !isEditMode
                
                if isInteractive {
                    // Add chevron icon for interactive outlet field
                    let chevronIcon = UIImageView(image: UIImage(systemName: "chevron.right"))
                    chevronIcon.tintColor = .systemGray3
                    chevronIcon.contentMode = .scaleAspectFit
                    chevronIcon.setContentHuggingPriority(.required, for: .horizontal)
                    
                    rowStack.addArrangedSubview(titleLabel)
                    rowStack.addArrangedSubview(valueTextField)
                    rowStack.addArrangedSubview(chevronIcon)
                    
                    // Make the whole wrapper tappable
                    let tapGesture = UITapGestureRecognizer(target: self, action: #selector(showOutletPicker))
                    fieldWrapper.addGestureRecognizer(tapGesture)
                    fieldWrapper.isUserInteractionEnabled = true
                } else {
                    // No chevron for non-interactive outlet field (outlet admin or edit mode)
                    rowStack.addArrangedSubview(titleLabel)
                    rowStack.addArrangedSubview(valueTextField)
                    fieldWrapper.isUserInteractionEnabled = false
                }
            } else {
                rowStack.addArrangedSubview(titleLabel)
                rowStack.addArrangedSubview(valueTextField)
            }
            
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
        
        // Save button constraints
        saveButton.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(20)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-20)
            make.height.equalTo(50)
        }
        
        // ScrollView constraints
        scrollView.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(saveButton.snp.top).offset(-16)
        }
        
        // ContainerView constraints - CRITICAL for scrollView content size
        containerView.snp.makeConstraints { make in
            make.top.leading.trailing.bottom.equalToSuperview()
            make.width.equalToSuperview() // This ensures horizontal scrolling is disabled
        }
        
        // Fields card container constraints
        fieldsCardContainer.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(16)
            make.leading.equalToSuperview().offset(12)
            make.trailing.equalToSuperview().offset(-12)
            make.bottom.equalToSuperview().offset(-16)
        }
        
        // Update button title when user changes
        if user != nil {
            saveButton.setButtonTitle("Update User".localized())
        }
        
        // Setup delegates and text change monitoring
        [userNameField, emailField, passwordField].forEach { field in
            field.textField.delegate = self
            field.textField.addTarget(self, action: #selector(textFieldDidChange(_:)), for: .editingChanged)
        }
    }
    
    /// v2: ‹ header, labelled fields (same fields per role and mode as the old form), primary button at the bottom
    private func setupV2UI() {
        view.backgroundColor = .white
        let back = SettingsDetailV2.backButton()
        back.addTarget(self, action: #selector(v2Close), for: .touchUpInside)
        let title = user == nil ? "Add User".localized() : "Update User".localized()
        let line = SettingsDetailV2.installHeader(on: view, title: title, back: back)

        let save = V2.primaryButton(title)
        save.addTarget(self, action: #selector(saveButtonTapped), for: .touchUpInside)
        let bar = SettingsDetailV2.installBottomBar(on: view, buttons: [save])

        let currentUser = User.current()
        let isMerchant = currentUser?.role == .merchant
        let isOutletAdmin = currentUser?.role == .outletAdmin
        let isEditMode = user != nil

        let form = UIStackView()
        form.axis = .vertical
        form.spacing = 16
        form.addArrangedSubview(SettingsDetailV2.field(userNameField.titleLabel.text ?? "", userNameField.textField))
        form.addArrangedSubview(SettingsDetailV2.field(emailField.titleLabel.text ?? "", emailField.textField, enabled: !isEditMode))
        // Password only when creating (editing uses Change Password in the list menu)
        if !isEditMode {
            form.addArrangedSubview(SettingsDetailV2.field(passwordField.titleLabel.text ?? "", passwordField.textField))
        }
        let roleRow = SettingsDetailV2.field(roleField.titleLabel.text ?? "", roleField.textField, chevron: true)
        roleRow.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(showRolePicker)))
        v2RoleRow = roleRow
        form.addArrangedSubview(roleRow)
        if (isMerchant && !isEditMode) || (isOutletAdmin && !isEditMode) || isEditMode {
            let interactive = isMerchant && !isEditMode
            let outletRow = SettingsDetailV2.field(outletField.titleLabel.text ?? "", outletField.textField,
                                                   enabled: interactive, chevron: interactive)
            if interactive {
                outletRow.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(showOutletPicker)))
            } else {
                outletRow.isUserInteractionEnabled = false
            }
            v2OutletRow = outletRow
            form.addArrangedSubview(outletRow)
        }

        view.addSubview(scrollView)
        scrollView.addSubview(form)
        scrollView.snp.makeConstraints { make in
            make.top.equalTo(line.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(bar.snp.top)
        }
        form.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(16)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalToSuperview().offset(-16)
            make.width.equalToSuperview().offset(-2 * DS.Spacing.lg)
        }

        [userNameField, emailField, passwordField].forEach { field in
            field.textField.delegate = self
            field.textField.addTarget(self, action: #selector(textFieldDidChange(_:)), for: .editingChanged)
        }
    }

    @objc private func v2Close() {
        dismiss(animated: true)
    }

    /// v2 rows anchor the action sheets on iPad
    private func anchorV2Popover(_ alert: UIAlertController, to row: UIView?) {
        guard v2, let row, let popover = alert.popoverPresentationController else { return }
        popover.sourceView = row
        popover.sourceRect = row.bounds
    }

    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        let title = user == nil ? "Add User".localized() : "Update User".localized()
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
    }
    
    // MARK: - Helper Methods
    
    /// Convert shop name to tenant key format (lowercase, remove diacritics, remove spaces)
    /// Example: "áo dài bình dương" -> "aodaibinhduong"
    private func generateTenantKey(from shopName: String) -> String {
        // Remove Vietnamese diacritics
        let withoutDiacritics = shopName.formatStringOriginalCharacter()
        
        // Convert to lowercase and remove spaces
        let tenantKey = withoutDiacritics.lowercased().removeWhiteSpace()
        
        return tenantKey
    }
    
    override func setupData() {
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        view.addGestureRecognizer(tapGesture)
        
        let currentUser = User.current()
        let isMerchant = currentUser?.role == .merchant
        let isOutletAdmin = currentUser?.role == .outletAdmin
        let isEditMode = user != nil
        
        if let user = user {
            // Edit mode - load existing user data
            // Combine firstName and lastName into single userName field
            var fullName = ""
            if let firstName = user.firstName, !firstName.isEmpty {
                fullName = firstName
            }
            if let lastName = user.lastName, !lastName.isEmpty {
                if fullName.isEmpty {
                    fullName = lastName
                } else {
                    fullName += " \(lastName)"
                }
            }
            userNameField.textField.text = fullName
            emailField.textField.text = user.email
            selectedRole = user.role
            roleField.textField.text = user.role.displayName
            
            // Show outlet name but don't allow editing
            if let outletName = user.outlet?.name {
                outletField.textField.text = outletName
            }
            selectedOutletId = user.outletId
        } else {
            // Create mode
            selectedRole = nil
            roleField.textField.text = nil
            
            // Set email placeholder with tenant key format
            if let shopName = currentUser?.merchant?.name ?? currentUser?.storeName, !shopName.isEmpty {
                let tenantKey = generateTenantKey(from: shopName)
                emailField.textField.placeholder = "\(tenantKey)_"
            }
            
            // Auto-assign outlet for outlet admin
            if isOutletAdmin, let outletId = currentUser?.outletId, let outletName = currentUser?.outlet?.name {
                selectedOutletId = outletId
                outletField.textField.text = outletName
                outletField.textField.isEnabled = false // Cannot change
            } else if isMerchant {
                // Load outlets for merchant to choose from
                loadOutlets()
                
                // Set default outlet to current user's outlet
                if let outletId = currentUser?.outletId, let outletName = currentUser?.outlet?.name {
                    selectedOutletId = outletId
                    outletField.textField.text = outletName
                }
            }
        }
    }
    
    private func loadOutlets() {
        OutletService.shared.getOutlets { [weak self] outlets, error in
            guard let self = self else { return }
            if let error = error {
                print("❌ Failed to load outlets: \(error.localizedDescription)")
                return
            }
            if let outlets = outlets {
                self.availableOutlets = outlets
                print("✅ Loaded \(outlets.count) outlets")
            }
        }
    }
    
    @objc private func showOutletPicker() {
        guard !availableOutlets.isEmpty else {
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "No outlets available".localized()
            )
            return
        }
        
        let alert = UIAlertController(
            title: "Select Outlet".localized(),
            message: nil,
            preferredStyle: .actionSheet
        )
        
        for outlet in availableOutlets {
            alert.addAction(UIAlertAction(title: outlet.name, style: .default) { [weak self] _ in
                self?.selectedOutletId = outlet.id
                self?.outletField.textField.text = outlet.name
            })
        }
        
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        anchorV2Popover(alert, to: v2OutletRow)
        
        // For iPad
        if !v2, UIDevice.current.userInterfaceIdiom == .pad {
            if let popover = alert.popoverPresentationController {
                // Find the outlet field wrapper in the view hierarchy
                for subview in containerView.subviews {
                    if let cardContainer = subview.subviews.first(where: { $0.subviews.contains(where: { $0.subviews.contains(where: { ($0 as? UILabel)?.text == "Outlet".localized() }) }) }) {
                        popover.sourceView = cardContainer
                        popover.sourceRect = cardContainer.bounds
                        break
                    }
                }
            }
        }
        
        present(alert, animated: true)
    }
    
    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }
    
    @objc private func textFieldDidChange(_ textField: UITextField) {
        // Clear any validation errors when user types
        if let field = [userNameField, emailField, passwordField]
            .first(where: { $0.textField == textField }) {
            field.clearError()
        }
    }
    
    // MARK: - Actions
    @objc private func saveButtonTapped() {
        guard validateInputs() else { return }
        
        view.endEditing(true)
        
        // Get user name and split into firstName and lastName
        let userName = userNameField.textField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        
        // Split name into firstName and lastName
        // If only one word, use it for firstName and set lastName to empty string
        // If multiple words, first word is firstName, rest is lastName
        let nameComponents = userName.components(separatedBy: " ").filter { !$0.isEmpty }
        let firstName = nameComponents.first ?? userName
        let lastName = nameComponents.count > 1 ? nameComponents.dropFirst().joined(separator: " ") : ""
        
        var params: [String: Any] = [:]
        
        if !firstName.isEmpty {
            params["firstName"] = firstName
        }
        
        if !lastName.isEmpty {
            params["lastName"] = lastName
        }else{
            params["lastName"] = ""
        }
        
        if let email = emailField.textField.text, !email.isEmpty {
            params["email"] = email
        }
        
        if let password = passwordField.textField.text, !password.isEmpty {
            params["password"] = password
        }
        
        if let selectedRole { params["role"] = selectedRole.rawValue }
        
        // Add outletId if selected (for merchant creating user) or auto-assigned (for outlet admin)
        if let outletId = selectedOutletId {
            params["outletId"] = outletId
        }
        
        // Add merchantId from current user (required for creating user)
        if let currentUser = User.current() {
            let merchantId = currentUser.merchant?.id ?? currentUser.merchantId
            if let merchantId = merchantId {
                params["merchantId"] = merchantId
            }
        }
        
        if let user = user {
            // Update existing user
            updateUser(userId: user.id, withParams: params)
        } else {
            // Create new user
            createUser(withParams: params)
        }
    }
    
    @objc private func showRolePicker() {
        // Only outlet roles (not admin or merchant); #682 Nhân viên kho behind the API flag.
        // #684: a sheet that says what each role can do
        let allowedRoles = UserFormRoles.choices(inventoryRole: AppConfigService.shared.cached?.inventoryRole ?? false,
                                                 currentRole: user?.role)
        let sheet = RolePickerSheet(roles: allowedRoles, selected: selectedRole)
        sheet.onPick = { [weak self] role in
            self?.selectedRole = role
            self?.roleField.textField.text = role.displayName
        }
        present(sheet, animated: true)
    }
    
    // MARK: - Validation
    private func validateInputs() -> Bool {
        // #684: the role starts empty; it must be picked before saving
        guard UserFormRoles.isComplete(selectedRole) else {
            UIAlertController.alert(parent: self, title: "Error".localized(), message: "users.role.required".localized())
            return false
        }
        guard let userName = userNameField.textField.text, !userName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "Please enter user name".localized()
            )
            return false
        }
        
        guard let email = emailField.textField.text, !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "Email is required".localized()
            )
            return false
        }
        
        // Validate email format
        if !email.isValidEmail() {
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "Invalid email format".localized()
            )
            return false
        }
        
        // Password required for new users
        if user == nil {
            guard let password = passwordField.textField.text, !password.isEmpty else {
                UIAlertController.alert(
                    parent: self,
                    title: "Error".localized(),
                    message: "Password is required".localized()
                )
                return false
            }
            
            if password.count < 6 {
                UIAlertController.alert(
                    parent: self,
                    title: "Error".localized(),
                    message: "Password must be at least 6 characters".localized()
                )
                return false
            }
        }
        
        return true
    }
    
    // MARK: - API Calls
    private func createUser(withParams params: [String: Any]) {
        showProgressText(text: "Creating user...".localized())
        
        UserService.shared.createUser(withValues: params) { [weak self] user, error in
            guard let self = self else { return }
            self.hideProgress()
            
            if let error = error {
                UIAlertController.errorAlert(parent: self, error: error)
            } else if let user = user {
                self.delegate?.didCreateUser(user: user)
                self.dismiss(animated: true)
            }
        }
    }
    
    private func updateUser(userId: Int, withParams params: [String: Any]) {
        showProgressText(text: "Updating user...".localized())
        
        UserService.shared.updateUser(userId: userId, withValues: params) { [weak self] user, error in
            guard let self = self else { return }
            self.hideProgress()
            
            if let error = error {
                UIAlertController.errorAlert(parent: self, error: error)
            } else if let user = user {
                self.delegate?.didUpdateUser(user: user)
                self.dismiss(animated: true)
            }
        }
    }
}

// MARK: - UITextFieldDelegate
extension UserFormViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        switch textField {
        case userNameField.textField:
            emailField.textField.becomeFirstResponder()
        case emailField.textField:
            if user == nil {
                passwordField.textField.becomeFirstResponder()
            } else {
                textField.resignFirstResponder()
            }
        case passwordField.textField:
            textField.resignFirstResponder()
        default:
            break
        }
        return true
    }
}

/// #684 (canvas N3): "Chọn quyền" like the order ⋯ action sheet — title + ✕, one row per role the caller may give
/// (icon box, role name, what the role can do), the current role with a blue icon and ✓
final class RolePickerSheet: V2FittingSheet {
    var onPick: ((Role) -> Void)?
    private let roles: [Role]
    private let selected: Role?

    init(roles: [Role], selected: Role?) {
        self.roles = roles
        self.selected = selected
        super.init()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private static func symbol(_ role: Role) -> String {
        switch role {
        case .outletAdmin: return "building.2"
        case .outletInventory: return "shippingbox"
        default: return "person"
        }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        stack.spacing = 0
        let title = V2.label("Select role".localized(), size: 20, weight: .bold)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        let close = UIButton(type: .system)
        close.setImage(DS.symbol("xmark", 16, weight: .bold), for: .normal)
        close.tintColor = UIColor(hexString: "475569")
        close.backgroundColor = UIColor(hexString: "F1F5F9")
        close.layer.cornerRadius = 18
        close.accessibilityLabel = "Close".localized()
        close.addAction(UIAction { [weak self] _ in self?.dismiss(animated: true) }, for: .touchUpInside)
        close.snp.makeConstraints { make in make.size.equalTo(36) }
        let header = UIStackView(arrangedSubviews: [title, close])
        header.alignment = .center
        header.spacing = DS.Spacing.md
        stack.addArrangedSubview(header)
        stack.setCustomSpacing(6, after: header)
        for role in roles { stack.addArrangedSubview(row(role)) }
    }

    private func row(_ role: Role) -> UIView {
        let on = role == selected
        let control = UIControl()
        let iconBox = UIView()
        iconBox.backgroundColor = UIColor(hexString: on ? "EFF4FF" : "F1F5F9")
        iconBox.layer.cornerRadius = 10
        iconBox.isUserInteractionEnabled = false
        let icon = UIImageView(image: DS.symbol(Self.symbol(role), DS.Icon.md))
        icon.tintColor = on ? DS.Color.primary : DS.Color.text
        icon.contentMode = .center
        iconBox.addSubview(icon)
        icon.snp.makeConstraints { make in make.center.equalToSuperview() }
        iconBox.snp.makeConstraints { make in make.size.equalTo(36) }
        let title = V2.label(role.displayName, size: 16, weight: .medium, color: on ? DS.Color.primary : DS.Color.text)
        let help = V2.label(UserFormRoles.help(role), size: DS.TextSize.secondary, color: UIColor(hexString: "475569"), lines: 0)
        let texts = UIStackView(arrangedSubviews: [title, help])
        texts.axis = .vertical
        texts.spacing = 2
        let check = UIImageView(image: DS.symbol("checkmark", DS.Icon.md, weight: .bold))
        check.tintColor = DS.Color.primary
        check.isHidden = !on
        check.setContentHuggingPriority(.required, for: .horizontal)
        let line = UIStackView(arrangedSubviews: [iconBox, texts, check])
        line.alignment = .center
        line.spacing = 14
        line.isUserInteractionEnabled = false
        control.addSubview(line)
        line.snp.makeConstraints { make in
            make.top.bottom.equalToSuperview().inset(10)
            make.leading.trailing.equalToSuperview().inset(4)
        }
        let divider = V2.divider()
        divider.backgroundColor = UIColor(hexString: "F1F5F9")
        divider.isUserInteractionEnabled = false
        control.addSubview(divider)
        divider.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        control.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(64) }
        control.isAccessibilityElement = true
        control.accessibilityTraits = on ? UIAccessibilityTraitButton | UIAccessibilityTraitSelected : UIAccessibilityTraitButton
        control.accessibilityLabel = role.displayName
        control.accessibilityHint = UserFormRoles.help(role)
        control.addAction(UIAction { [weak self] _ in
            let onPick = self?.onPick
            self?.dismiss(animated: true) { onPick?(role) }
        }, for: .touchUpInside)
        return control
    }
}
