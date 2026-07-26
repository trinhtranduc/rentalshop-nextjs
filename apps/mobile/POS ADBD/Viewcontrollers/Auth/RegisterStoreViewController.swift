import UIKit
import SnapKit

class RegisterStoreViewController: BaseViewControler {
    // MARK: - UI Components
    private lazy var scrollView: UIScrollView = {
        let scrollView = UIScrollView()
        scrollView.showsVerticalScrollIndicator = true
        scrollView.alwaysBounceVertical = true
        scrollView.backgroundColor = .clear
        return scrollView
    }()
    
    private lazy var containerView: UIView = {
        let view = UIView()
        view.backgroundColor = .clear
        return view
    }()

    // Glass card wrapping the form, matching LoginViewController / Create Account.
    private lazy var cardView: UIView = {
        let view = UIView()
        view.backgroundColor = .surfaceAuthCard
        view.layer.cornerRadius = 24
        view.layer.borderWidth = 1
        view.layer.borderColor = UIColor.white.withAlphaComponent(0.72).cgColor
        view.clipsToBounds = true
        return view
    }()

    private lazy var stackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 24
        stack.distribution = .fill
        stack.backgroundColor = .clear
        return stack
    }()
    
    // MARK: - Personal Information Fields
    private lazy var nameField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Name".localized(),
            placeholder: "e.g. Nguyen Van A".localized()
        )
        field.setRequired(true)
        field.textField.autocapitalizationType = .words
        field.textField.setLeftIcon(UIImage(systemName: "person.fill"))
        return field
    }()
    
    private lazy var emailField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Email".localized(),
            placeholder: "Email for activation link".localized()
        )
        field.setRequired(true)
        field.textField.keyboardType = .emailAddress
        field.textField.autocapitalizationType = .none
        field.textField.setLeftIcon(UIImage(systemName: "envelope.fill"))
        return field
    }()
    
    private lazy var passwordField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Password".localized(),
            placeholder: "At least 6 characters".localized()
        )
        field.setRequired(true)
        field.textField.isSecureTextEntry = true
        field.textField.setLeftIcon(UIImage(systemName: "lock.fill"))
        field.textField.setRightIcon(UIImage(systemName: "eye.fill"),
                                    action: #selector(togglePasswordVisibility),
                                    target: self)
        return field
    }()
    
    private lazy var retypePasswordField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Confirm Password".localized(),
            placeholder: "Re-enter your password".localized()
        )
        field.setRequired(true)
        field.textField.isSecureTextEntry = true
        field.textField.setLeftIcon(UIImage(systemName: "lock.fill"))
        field.textField.setRightIcon(UIImage(systemName: "eye.fill"),
                                    action: #selector(toggleRetypePasswordVisibility),
                                    target: self)
        return field
    }()
    
    // MARK: - Store Information Fields
    private lazy var storeNameField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Store Name".localized(),
            placeholder: "e.g. AnyRent Rental Shop".localized()
        )
        field.setRequired(true)
        field.textField.setLeftIcon(UIImage(systemName: "building.2.fill"))
        // Enable auto-capitalization for store name
        field.textField.autocapitalizationType = .words
        field.textField.autocorrectionType = .no
        return field
    }()
    
    private lazy var locationField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Location".localized(),
            placeholder: "e.g. 01 Quang Trung, District 1, HCMC".localized()
        )
        field.setRequired(true)
        field.textField.setLeftIcon(UIImage(systemName: "location.fill"))
        field.textField.autocapitalizationType = .words
        return field
    }()
    
    private lazy var phoneField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Phone Number".localized(),
            placeholder: "e.g. 0901234567".localized()
        )
        field.setRequired(true)
        field.textField.keyboardType = .phonePad
        field.textField.setLeftIcon(UIImage(systemName: "phone.fill"))
        return field
    }()
    
    // Add privacy policy checkbox
    private lazy var privacyPolicyView: UIView = {
        let view = UIView()
        return view
    }()
    
    private lazy var privacyCheckbox: UIButton = {
        let button = UIButton(type: .custom)
        
        // Configure button to scale images properly
        var config = UIButton.Configuration.plain()
        config.imagePlacement = .all
        config.imagePadding = 0
        config.preferredSymbolConfigurationForImage = UIImage.SymbolConfiguration(pointSize: 20, weight: .medium)
        button.configuration = config
        
        button.setImage(UIImage(systemName: "square"), for: .normal)
        button.setImage(UIImage(systemName: "checkmark.square.fill"), for: .selected)
        button.tintColor = APP_TONE_COLOR
        button.addTarget(self, action: #selector(privacyCheckboxTapped), for: .touchUpInside)
        return button
    }()
    
    // Single flowing consent line: "I agree to the Privacy Policy and Terms of
    // Service" with the two link phrases tappable. Replaces the old label + two
    // separate buttons that were forced onto their own line (broke mid-sentence).
    private lazy var privacyTextView: UITextView = {
        let tv = UITextView()
        tv.isScrollEnabled = false
        tv.isEditable = false
        tv.isSelectable = true
        tv.backgroundColor = .clear
        tv.textContainerInset = .zero
        tv.textContainer.lineFragmentPadding = 0
        tv.delegate = self
        tv.tintColor = .brandPrimary // UITextView renders .link ranges in the tint color
        return tv
    }()
    
    private lazy var registerButton: RCPrimaryButton = {
        let button = RCPrimaryButton(title: "Register".localized(), backgroundColor: APP_TONE_COLOR)
        button.isEnabled = false
        button.addTarget(self, action: #selector(registerButtonTapped), for: .touchUpInside)
        return button
    }()
    
    // MARK: - Section Headers
    private lazy var personalInfoHeader: UILabel = {
        let label = UILabel()
        label.text = "Personal Information".localized()
        label.font = Utils.mediumFont(size: 16)
        label.textColor = APP_TEXT_COLOR.withAlphaComponent(0.8)
        return label
    }()
    
    private lazy var storeInfoHeader: UILabel = {
        let label = UILabel()
        label.text = "Store Information".localized()
        label.font = Utils.mediumFont(size: 16)
        label.textColor = APP_TEXT_COLOR.withAlphaComponent(0.8)
        return label
    }()
    
    // Add property
    private lazy var tapGesture: UITapGestureRecognizer = {
        let gesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        return gesture
    }()
    
    // MARK: - Properties
    var registrationData: RegistrationData!
    private let authService = AuthenticationService.shared
    private var isPrivacyPolicyAccepted = false
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .backgroundPrimary
        installAuthEntryBackground()
        setupNavigationBar()
        setupUI()
        setupGestures()
        
        // Set dark status bar text for light backgrounds
        setStatusBarStyle(.darkContent) // or .default
    }
    
    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        setupCustomNavigationBar(
            title: "Create Account".localized(),
            statusBarBackgroundColor: .surfaceAuthChrome,
            titleCentered: true,
            hideBackButton: false,
            backAction: .pop
        )
    }
    
    // MARK: - UI Setup
    override func setupUI() {
        // Add subviews — fixed card, scroll INSIDE the card.
        view.addSubview(cardView)
        cardView.addSubview(scrollView)
        scrollView.addSubview(containerView)
        containerView.addSubview(stackView)
        
        // Setup privacy policy view
        privacyPolicyView.addSubview(privacyCheckbox)
        privacyPolicyView.addSubview(privacyTextView)
        
        // Personal Information Section
        // Add spacing before first section header
        let firstSpacer = UIView()
        firstSpacer.snp.makeConstraints { make in
            make.height.equalTo(8)
        }
        stackView.addArrangedSubview(firstSpacer)
        stackView.addArrangedSubview(personalInfoHeader)
        stackView.addArrangedSubview(nameField)
        stackView.addArrangedSubview(emailField)
        stackView.addArrangedSubview(passwordField)
        stackView.addArrangedSubview(retypePasswordField)
        
        // Store Information Section
        // Add spacing before second section header
        let secondSpacer = UIView()
        secondSpacer.snp.makeConstraints { make in
            make.height.equalTo(8)
        }
        stackView.addArrangedSubview(secondSpacer)
        stackView.addArrangedSubview(storeInfoHeader)
        stackView.addArrangedSubview(storeNameField)
        stackView.addArrangedSubview(phoneField)
        stackView.addArrangedSubview(locationField)
        
        // Privacy Policy and Register Button
        stackView.addArrangedSubview(privacyPolicyView)
        stackView.addArrangedSubview(registerButton)
        
        let isIPad = traitCollection.horizontalSizeClass == .regular
        
        // Setup privacy policy view constraints
        privacyCheckbox.snp.makeConstraints { make in
            make.leading.equalToSuperview()
            make.top.equalToSuperview().offset(8)
            make.width.height.equalTo(24)
        }
        
        privacyTextView.snp.makeConstraints { make in
            make.leading.equalTo(privacyCheckbox.snp.trailing).offset(12)
            make.top.equalToSuperview().offset(4)
            make.trailing.equalToSuperview()
            make.bottom.equalToSuperview().offset(-4)
        }

        privacyPolicyView.snp.makeConstraints { make in
            // Ensure the checkbox always fits even if the consent text is a single line.
            make.height.greaterThanOrEqualTo(32)
        }
        
        // Register button height
        registerButton.snp.makeConstraints { make in
            make.height.equalTo(50)
        }
        
        guard let customNavBar = customNavBar else { return }

        // Fixed card: pinned below the nav bar with a 20pt top gap; it does NOT scroll.
        cardView.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom).offset(20)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-20)
            if isIPad {
                make.centerX.equalToSuperview()
                make.width.equalTo(400)
            } else {
                make.leading.equalToSuperview().offset(20)
                make.trailing.equalToSuperview().offset(-20)
            }
        }

        // Scroll view fills the card; the card's rounded corners clip the scrolling content.
        scrollView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }

        // ContainerView pins to scroll content; width = scroll frame width (vertical scroll only).
        containerView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.width.equalToSuperview()
        }

        // StackView pins to the container edges with 20pt inner padding.
        stackView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(20)
        }
        
        // Setup delegates and text change monitoring
        [nameField.textField, emailField.textField, passwordField.textField, retypePasswordField.textField, storeNameField.textField, locationField.textField, phoneField.textField].forEach { field in
            field.delegate = self
            field.addTarget(self, action: #selector(textFieldDidChange(_:)), for: .editingChanged)
        }
        
        // Setup privacy policy label with localization and iPad font sizing
        setupPrivacyPolicyLabel()
    }
    
    private func createTextField(placeholder: String) -> RCTextFieldPadding {
        let field = RCTextFieldPadding()
        field.placeholder = placeholder.localized()
        field.heightAnchor.constraint(equalToConstant: 50).isActive = true
        return field
    }
    
    private func setupPrivacyPolicyLabel() {
        let isIPad = traitCollection.horizontalSizeClass == .regular
        let fontSize: CGFloat = isIPad ? 16 : 14
        let font = Utils.regularFont(size: fontSize)

        // One flowing sentence with two tappable link phrases.
        let baseAttrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: APP_TEXT_COLOR]
        let text = NSMutableAttributedString(string: "I agree to the ".localized(), attributes: baseAttrs)
        text.append(NSAttributedString(string: "Privacy Policy".localized(),
                                       attributes: [.font: font, .link: URL(string: "anyrent://privacy")!]))
        text.append(NSAttributedString(string: " and ".localized(), attributes: baseAttrs))
        text.append(NSAttributedString(string: "Terms of Service".localized(),
                                       attributes: [.font: font, .link: URL(string: "anyrent://terms")!]))

        privacyTextView.attributedText = text
    }
    
    // MARK: - Privacy Policy Actions
    @objc private func privacyCheckboxTapped() {
        isPrivacyPolicyAccepted.toggle()
        privacyCheckbox.isSelected = isPrivacyPolicyAccepted
        updateRegisterButtonState()
    }
    
    @objc private func privacyPolicyButtonTapped() {
        openPrivacyPolicy()
    }
    
    @objc private func termsButtonTapped() {
        openTermsOfService()
    }
    
    private func openPrivacyPolicy() {
        let urlString: String
        urlString = "https://www.anyrent.shop/privacy"
        
        if let url = URL(string: urlString) {
            presentWebView(url: url, title: "Privacy Policy".localized())
        }
    }
    
    private func openTermsOfService() {
        let urlString: String
        urlString = "https://www.anyrent.shop/terms"
        
        if let url = URL(string: urlString) {
            presentWebView(url: url, title: "Terms of Service".localized())
        }
    }
    
    private func presentWebView(url: URL, title: String) {
        let webViewController = WebViewController()
        webViewController.url = url
        webViewController.title = title
        
        let navigationController = UINavigationController(rootViewController: webViewController)
        navigationController.modalPresentationStyle = .formSheet
        
        present(navigationController, animated: true)
    }
    
    private func updateRegisterButtonState() {
        let name = nameField.textField.text ?? ""
        let email = emailField.textField.text ?? ""
        let password = passwordField.textField.text ?? ""
        let retypePassword = retypePasswordField.textField.text ?? ""
        let storeName = storeNameField.textField.text ?? ""
        let location = locationField.textField.text ?? ""
        let phone = phoneField.textField.text ?? ""
        
        // Required fields validation
        let isNameValid = !name.isEmpty && name.count >= 2
        let isEmailValid = !email.isEmpty && email.isValidEmail()
        let isPasswordValid = !password.isEmpty && password.count >= 6
        let isRetypePasswordValid = !retypePassword.isEmpty && password == retypePassword
        let isStoreNameValid = !storeName.isEmpty && storeName.count >= 3
        
        let isLocationValid = !location.isEmpty && location.count >= 3
        let phoneRegex = "^[0-9+]{10,13}$"
        let phonePredicate = NSPredicate(format: "SELF MATCHES %@", phoneRegex)
        let isPhoneValid = !phone.isEmpty && phonePredicate.evaluate(with: phone)
        
        registerButton.isEnabled = isNameValid && isEmailValid && isPasswordValid && isRetypePasswordValid && isStoreNameValid && isLocationValid && isPhoneValid && isPrivacyPolicyAccepted
    }
    
    // MARK: - Actions
    @objc private func registerButtonTapped(_ sender: UIButton) {
        guard validateInputs() else { return }
        
        showProgressText(text: "Processing...".localized())
        AuthenticationService.shared.createAccount(
            loginName: emailField.textField.text ?? "",
            password: passwordField.textField.text ?? "",
            storeName: storeNameField.textField.text ?? "",
            address: locationField.textField.text ?? "", // Use location as address
            name: nameField.textField.text ?? "",
            phone: phoneField.textField.text ?? "",
            completion: { [weak self] account, error in
                self?.hideProgress()
                
                if let error = error {
                    UIAlertController.errorAlert(parent: self, error: error)
                } else {
                    // Handle successful registration
                    self?.showSuccessAndDismiss()
                }
            }
        )
    }
    
    @objc private func togglePasswordVisibility() {
        passwordField.textField.isSecureTextEntry.toggle()
        let iconName = passwordField.textField.isSecureTextEntry ? "eye.fill" : "eye.slash.fill"
        passwordField.textField.setRightIcon(UIImage(systemName: iconName),
                                           action: #selector(togglePasswordVisibility),
                                           target: self)
    }
    
    @objc private func toggleRetypePasswordVisibility() {
        retypePasswordField.textField.isSecureTextEntry.toggle()
        let iconName = retypePasswordField.textField.isSecureTextEntry ? "eye.fill" : "eye.slash.fill"
        retypePasswordField.textField.setRightIcon(UIImage(systemName: iconName),
                                                 action: #selector(toggleRetypePasswordVisibility),
                                                 target: self)
    }
    
    // MARK: - Validation
    @objc private func textFieldDidChange(_ textField: UITextField) {
        // Update button state when typing
        updateRegisterButtonState()
    }
    
    private func validateInputs() -> Bool {
        let name = nameField.textField.text ?? ""
        let email = emailField.textField.text ?? ""
        let password = passwordField.textField.text ?? ""
        let retypePassword = retypePasswordField.textField.text ?? ""
        let storeName = storeNameField.textField.text ?? ""
        let location = locationField.textField.text ?? ""
        let phone = phoneField.textField.text ?? ""
        
        // Clear previous errors
        nameField.clearError()
        emailField.clearError()
        passwordField.clearError()
        retypePasswordField.clearError()
        storeNameField.clearError()
        locationField.clearError()
        phoneField.clearError()
        
        var isValid = true
        
        // Personal Information Validation
        if name.isEmpty {
            nameField.showError("Name is required".localized())
            isValid = false
        } else if name.count < 2 {
            nameField.showError("Name must be at least 2 characters".localized())
            isValid = false
        }
        
        if email.isEmpty {
            emailField.showError("Email is required".localized())
            isValid = false
        } else if !email.isValidEmail() {
            emailField.showError("Please enter a valid email address".localized())
            isValid = false
        }
        
        if password.isEmpty {
            passwordField.showError("Password is required".localized())
            isValid = false
        } else if password.count < 6 {
            passwordField.showError("Password must be at least 6 characters".localized())
            isValid = false
        }
        
        if retypePassword.isEmpty {
            retypePasswordField.showError("Please confirm your password".localized())
            isValid = false
        } else if password != retypePassword {
            retypePasswordField.showError("Passwords do not match".localized())
            isValid = false
        }
        
        // Store Information Validation
        if storeName.isEmpty {
            storeNameField.showError("Store name is required".localized())
            isValid = false
        } else if storeName.count < 3 {
            storeNameField.showError("Store name must be at least 3 characters".localized())
            isValid = false
        }
        
        if location.isEmpty {
            locationField.showError("Location is required".localized())
            isValid = false
        } else if location.count < 3 {
            locationField.showError("Please enter a valid location (City, Province)".localized())
            isValid = false
        }
        
        if phone.isEmpty {
            phoneField.showError("Phone number is required".localized())
            isValid = false
        } else {
            let phoneRegex = "^[0-9+]{10,13}$"
            let phonePredicate = NSPredicate(format: "SELF MATCHES %@", phoneRegex)
            if !phonePredicate.evaluate(with: phone) {
                phoneField.showError("Please enter a valid phone number".localized())
                isValid = false
            }
        }
        
        if !isPrivacyPolicyAccepted {
            showAlert(title: "Privacy Policy Required".localized(), message: "Please accept the Privacy Policy and Terms of Service to continue.".localized())
            return false
        }
        
        return isValid
    }
    
    private func showAlert(title: String, message: String) {
        let alert = UIAlertController(
            title: title.localized(),
            message: message.localized(),
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
        present(alert, animated: true)
    }
    
    private func showSuccessAndDismiss() {
        // Navigate to check email page with registration context
        let checkEmailVC = CheckEmailViewController()
        checkEmailVC.email = self.emailField.textField.text
        checkEmailVC.context = "registration"
        navigationController?.pushViewController(checkEmailVC, animated: true)
    }
    
    // MARK: - Keyboard Handling
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
    }
    
    // Add login button action
    @objc private func loginButtonTapped() {
        // Add animation
//        UIView.animate(withDuration: 0.1) {
//            self.loginButton.transform = CGAffineTransform(scaleX: 0.95, y: 0.95)
//        } completion: { _ in
//            UIView.animate(withDuration: 0.1) {
//                self.loginButton.transform = .identity
//            } completion: { _ in
                self.navigationController?.popToRootViewController(animated: true)
//            }
//        }
    }
    
    // Add setup method
    private func setupGestures() {
        view.addGestureRecognizer(tapGesture)
    }
    
    // Add dismiss method
    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }
}

// MARK: - UITextFieldDelegate
extension RegisterStoreViewController: UITextFieldDelegate {
    func textFieldDidEndEditing(_ textField: UITextField) {
        // Update button state when field loses focus
        updateRegisterButtonState()
        
        // Clear errors when user finishes editing
        if textField == nameField.textField {
            nameField.clearError()
        } else if textField == emailField.textField {
            emailField.clearError()
        } else if textField == passwordField.textField {
            passwordField.clearError()
        } else if textField == retypePasswordField.textField {
            retypePasswordField.clearError()
        } else if textField == storeNameField.textField {
            storeNameField.clearError()
        } else if textField == locationField.textField {
            locationField.clearError()
        } else if textField == phoneField.textField {
            phoneField.clearError()
        }
    }
    
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        switch textField {
        case nameField.textField:
            emailField.textField.becomeFirstResponder()
        case emailField.textField:
            passwordField.textField.becomeFirstResponder()
        case passwordField.textField:
            retypePasswordField.textField.becomeFirstResponder()
        case retypePasswordField.textField:
            storeNameField.textField.becomeFirstResponder()
        case storeNameField.textField:
            phoneField.textField.becomeFirstResponder()
        case phoneField.textField:
            locationField.textField.becomeFirstResponder()
        case locationField.textField:
            textField.resignFirstResponder()
            if registerButton.isEnabled {
                registerButtonTapped(registerButton)
            }
        default:
            break
        }
        return true
    }
}

// MARK: - UITextViewDelegate (consent link taps)
extension RegisterStoreViewController: UITextViewDelegate {
    func textView(_ textView: UITextView, shouldInteractWith URL: URL, in characterRange: NSRange, interaction: UITextItemInteraction) -> Bool {
        switch URL.absoluteString {
        case "anyrent://privacy":
            openPrivacyPolicy()
        case "anyrent://terms":
            openTermsOfService()
        default:
            break
        }
        return false
    }
}

 
