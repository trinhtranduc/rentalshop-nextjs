import UIKit
import SnapKit

class RegisterAccountViewController: BaseViewControler {
    // MARK: - UI Components
    private lazy var scrollView: UIScrollView = {
        let scrollView = UIScrollView()
        scrollView.showsVerticalScrollIndicator = true
        scrollView.alwaysBounceVertical = true
        return scrollView
    }()
    
    private lazy var containerView: UIView = {
        let view = UIView()
        return view
    }()

    // Glass card wrapping the form, matching LoginViewController for a consistent
    // auth look (the fields previously sat bare on the background).
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
        return stack
    }()
    
    private lazy var nameField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Name".localized(),
            placeholder: "Enter your name".localized()
        )
        field.textField.autocapitalizationType = .words
        field.textField.setLeftIcon(UIImage(systemName: "person.fill"))
        return field
    }()
    
    private lazy var emailField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Email".localized(),
            placeholder: "Enter your email".localized()
        )
        field.textField.keyboardType = .emailAddress
        field.textField.autocapitalizationType = .none
        field.textField.setLeftIcon(UIImage(systemName: "envelope.fill"))
        return field
    }()
    
    private lazy var passwordField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Password".localized(),
            placeholder: "Enter password".localized()
        )
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
            placeholder: "Confirm password".localized()
        )
        field.textField.isSecureTextEntry = true
        field.textField.setLeftIcon(UIImage(systemName: "lock.fill"))
        field.textField.setRightIcon(UIImage(systemName: "eye.fill"),
                                    action: #selector(toggleRetypePasswordVisibility),
                                    target: self)
        return field
    }()
    
    private lazy var nextButton: RCPrimaryButton = {
        let button = RCPrimaryButton(title: "Next".localized(), backgroundColor: APP_TONE_COLOR)
        button.isEnabled = false
        button.addTarget(self, action: #selector(nextButtonTapped), for: .touchUpInside)
        return button
    }()
    
    
    private lazy var loginButton: HapticButton = {
        let button = HapticButton(
            title: "Already have an account? Login".localized(),
            backgroundColor: .surfaceAuthChrome,
            titleColor: APP_TONE_COLOR,
            font: Utils.regularFont(size: 16),
            feedbackType: .light
        )
        button.layer.cornerRadius = 16
        button.layer.borderWidth = 1
        button.layer.borderColor = UIColor.white.withAlphaComponent(0.72).cgColor
        button.contentEdgeInsets = UIEdgeInsets(top: 12, left: 18, bottom: 12, right: 18)
        button.setPressAnimation(enabled: false) // No animation needed for text button
        button.addTarget(self, action: #selector(loginButtonTapped), for: .touchUpInside)
        return button
    }()
    
    // Add property
    private lazy var tapGesture: UITapGestureRecognizer = {
        let gesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        return gesture
    }()
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .backgroundPrimary
        installAuthEntryBackground()
        
        setupNavigationBar()
        setupUI()
        setupGestures()
        
        setStatusBarStyle(.darkContent) // or .default
    }
    
    // MARK: - Navigation Bar Setup
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
        // Add other subviews — fixed card, scroll INSIDE the card.
        view.addSubview(cardView)
        cardView.addSubview(scrollView)
        scrollView.addSubview(containerView)
        containerView.addSubview(stackView)
        view.addSubview(loginButton)
        
        [nameField, emailField, passwordField, retypePasswordField, nextButton].forEach {
            stackView.addArrangedSubview($0)
        }
        
        let isIPad = traitCollection.horizontalSizeClass == .regular
        
        // Setup delegates and text change monitoring
        [nameField.textField, emailField.textField, passwordField.textField, retypePasswordField.textField].forEach { field in
            field.delegate = self
            field.addTarget(self, action: #selector(textFieldDidChange(_:)), for: .editingChanged)
        }
        
        // Next button height
        nextButton.snp.makeConstraints { make in
            make.height.equalTo(50)
        }
        
        // IMPORTANT: Set up loginButton constraints FIRST before scrollView
        // This ensures loginButton position is known when scrollView constraints depend on it
        if isIPad {
            // iPad - Fixed width centered container
            loginButton.snp.makeConstraints { make in
                make.centerX.equalToSuperview()
                make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-20)
            }
        } else {
            // iPhone - Edge-to-edge with margins
            loginButton.snp.makeConstraints { make in
                make.centerX.equalToSuperview()
                make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-20)
            }
        }
        
        guard let customNavBar = customNavBar else { return }

        // Fixed card: pinned below the nav bar (20pt top gap) and above the bottom
        // button; it does NOT scroll — the fields scroll inside it.
        cardView.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom).offset(20)
            make.bottom.equalTo(loginButton.snp.top).offset(-20)
            if isIPad {
                make.centerX.equalToSuperview()
                make.width.equalTo(400)
            } else {
                make.leading.equalToSuperview().offset(20)
                make.trailing.equalToSuperview().offset(-20)
            }
        }

        // Scroll view fills the card; rounded corners clip the scrolling content.
        scrollView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }

        // ContainerView pins to scroll content; width = scroll frame width (vertical only).
        containerView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.width.equalToSuperview()
        }

        // StackView pins to the container edges with 20pt inner padding.
        stackView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(20)
        }
    }
    
    // Add setup method
    private func setupGestures() {
        view.addGestureRecognizer(tapGesture)
    }
    
    // Add dismiss method
    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }
    
    @objc private func loginButtonTapped() {
        // Remove all animations and just do a clean pop
        navigationController?.popViewController(animated: true)
    }
    
    @objc private func nextButtonTapped(_ sender: UIButton) {
        // This method is no longer used since we merged both screens into RegisterStoreViewController
        // All registration fields are now in RegisterStoreViewController
        guard validateInputs() else { return }
        
        // Navigate directly to merged registration screen
        let registerVC = RegisterStoreViewController()
        self.navigationController?.pushViewController(registerVC, animated: true)
    }
    
    // MARK: - Validation
    private func validateInputs() -> Bool {
        let name = nameField.textField.text ?? ""
        let email = emailField.textField.text ?? ""
        let password = passwordField.textField.text ?? ""
        let retypePassword = retypePasswordField.textField.text ?? ""
        
        // Clear previous errors
        nameField.clearError()
        emailField.clearError()
        passwordField.clearError()
        retypePasswordField.clearError()
        
        var isValid = true
        
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
        
        return isValid
    }
    
    @objc private func textFieldDidChange(_ textField: UITextField) {
        // Update button state when typing
        updateNextButtonState()
    }
    
    private func updateNextButtonState() {
        let name = nameField.textField.text ?? ""
        let email = emailField.textField.text ?? ""
        let password = passwordField.textField.text ?? ""
        let retypePassword = retypePasswordField.textField.text ?? ""
        
        let isNameValid = !name.isEmpty && name.count >= 2
        let isEmailValid = !email.isEmpty && email.isValidEmail()
        let isPasswordValid = !password.isEmpty && password.count >= 6
        let isRetypePasswordValid = !retypePassword.isEmpty && password == retypePassword
        
        nextButton.isEnabled = isNameValid && isEmailValid && isPasswordValid && isRetypePasswordValid
    }
    
    private func showAlert(message: String) {
        let alert = UIAlertController(
            title: "Error".localized(),
            message: message,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
        present(alert, animated: true)
    }
    
    // MARK: - Keyboard Handling
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        // Clean up any ongoing animations
//        view.layer.removeAllAnimations()
        // Remove any gesture recognizers to prevent memory leaks
//        view.gestureRecognizers?.forEach { view.removeGestureRecognizer($0) }
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
    
    // Add proper cleanup in deinit
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}

// MARK: - UITextFieldDelegate
extension RegisterAccountViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        switch textField {
        case nameField.textField:
            emailField.textField.becomeFirstResponder()
        case emailField.textField:
            passwordField.textField.becomeFirstResponder()
        case passwordField.textField:
            retypePasswordField.textField.becomeFirstResponder()
        case retypePasswordField.textField:
            textField.resignFirstResponder()
            if nextButton.isEnabled {
                nextButtonTapped(nextButton)
            }
        default:
            break
        }
        return true
    }
    
    func textFieldDidEndEditing(_ textField: UITextField) {
        updateNextButtonState()
        // Clear errors when user finishes editing
        if textField == nameField.textField {
            nameField.clearError()
        } else if textField == emailField.textField {
            emailField.clearError()
        } else if textField == passwordField.textField {
            passwordField.clearError()
        } else if textField == retypePasswordField.textField {
            retypePasswordField.clearError()
        }
    }
}
