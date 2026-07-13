import UIKit
import QuartzCore
import SnapKit

class LoginViewController: BaseViewControler {
    // MARK: - UI Components
    private lazy var containerView: UIView = {
        let view = UIView()
        return view
    }()
    
    private lazy var stackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 24
        stack.distribution = .fill
        return stack
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
    
    private lazy var loginButton: RCPrimaryButton = {
        let button = RCPrimaryButton(title: "Login".localized(), backgroundColor: APP_TONE_COLOR)
        button.isEnabled = false
        button.addTarget(self, action: #selector(loginButtonTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var titleStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 16
        stack.alignment = .center
        return stack
    }()
    
    private lazy var iconImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.image = UIImage(named: "login-blue")
        imageView.tintColor = APP_TONE_COLOR
        imageView.contentMode = .scaleAspectFit
        return imageView
    }()
    
    private lazy var titleLabel: UILabel = {
        let label = UILabel()
        label.text = "Welcome Back".localized()
        label.font = Utils.extraBoldFont(size: 28)
        label.textColor = .textPrimary
        label.textAlignment = .center
        return label
    }()
    
    private lazy var forgotPasswordButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Forgot Password?".localized(), for: .normal)
        button.setTitleColor(APP_TONE_COLOR, for: .normal)
        button.titleLabel?.font = Utils.regularFont(size: 14)
        button.contentHorizontalAlignment = .right
        button.addTarget(self, action: #selector(forgotPasswordTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var registerButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Create new store account".localized(), for: .normal)
        button.setTitleColor(APP_TONE_COLOR, for: .normal)
        button.titleLabel?.font = Utils.regularFont(size: 14)
        button.addTarget(self, action: #selector(register), for: .touchUpInside)
        return button
    }()
    
    private lazy var backgroundImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.image = UIImage(named: "bg")
        imageView.contentMode = .scaleToFill
        return imageView
    }()
    
    private lazy var gradientLayer: CAGradientLayer = {
        let layer = CAGradientLayer()
        // Beautiful gradient inspired by modern login designs
        // Gradient từ trên xuống dưới với màu xanh dương nhẹ nhàng
        layer.colors = [
            UIColor(red: 239/255, green: 246/255, blue: 255/255, alpha: 1).cgColor,  // blue-50 #EFF6FF (trên cùng)
            UIColor(red: 255/255, green: 255/255, blue: 255/255, alpha: 1).cgColor,  // white (giữa)
            UIColor(red: 238/255, green: 242/255, blue: 255/255, alpha: 1).cgColor   // indigo-50 #EEF2FF (dưới cùng)
        ]
        layer.locations = [0.0, 0.5, 1.0]
        // Gradient từ trên xuống dưới (vertical)
        layer.startPoint = CGPoint(x: 0.5, y: 0)
        layer.endPoint = CGPoint(x: 0.5, y: 1)
        return layer
    }()
    
    // MARK: - Properties
    private let authService = AuthenticationService.shared
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        installAuthEntryBackground()
        // Set background color as fallback
        view.backgroundColor = .white//.backgroundPrimary
        // Add gradient layer to background
//        view.layer.insertSublayer(gradientLayer, at: 0)
        setupUI()
        setupGestures()
        loadLastLoginEmail()
        
        // Set white status bar text for dark backgrounds
        setStatusBarStyle(.darkContent)
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Hide navigation bar on login screen
        navigationController?.setNavigationBarHidden(true, animated: animated)
        
        // Reset any transforms or animations
//        registerButton.transform = .identity
//        loginButton.transform = .identity
        
        // Ensure views are in correct state
//        view.layoutIfNeeded()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        // Update gradient layer frame
        gradientLayer.frame = view.bounds
    }
    
    // MARK: - UI Setup
    override func setupUI() {
        
        // Add other subviews
        view.addSubview(titleStackView)
        titleStackView.addArrangedSubview(iconImageView)
        titleStackView.addArrangedSubview(titleLabel)
        view.addSubview(containerView)
        containerView.addSubview(stackView)
        view.addSubview(registerButton)
        
        [emailField, passwordField, forgotPasswordButton, loginButton].forEach {
            stackView.addArrangedSubview($0)
        }
        
        // Giảm khoảng cách trên dưới của forgot password button
        stackView.setCustomSpacing(5, after: passwordField) // Khoảng cách giữa password field và forgot button
        stackView.setCustomSpacing(20, after: forgotPasswordButton) // Khoảng cách giữa forgot button và login button

        let isIPad = traitCollection.horizontalSizeClass == .regular
        
        // Title stack view constraints
        titleStackView.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(40)
            make.centerX.equalToSuperview()
        }
        
        // Icon image constraints
        iconImageView.snp.makeConstraints { make in
            make.height.width.equalTo(60)
        }

        if isIPad {
            // iPad - Fixed width centered container
            containerView.snp.makeConstraints { make in
                make.centerX.equalToSuperview()
                make.width.equalTo(400) // Fixed width for iPad
                make.top.equalTo(titleStackView.snp.bottom).offset(40)
            }
        } else {
            // iPhone - Edge-to-edge with margins
            containerView.snp.makeConstraints { make in
                make.top.equalTo(titleStackView.snp.bottom).offset(40)
                make.leading.equalToSuperview().offset(20)
                make.trailing.equalToSuperview().offset(-20)
            }
        }
        
        // StackView constraints - pins to containerView edges
        stackView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        // Forgot password button height - giảm height để khoảng cách gần hơn
        forgotPasswordButton.snp.makeConstraints { make in
            make.height.equalTo(36)
        }
        
        // Login button height
        loginButton.snp.makeConstraints { make in
            make.height.equalTo(50)
        }
        
        // Register button constraints
        registerButton.snp.makeConstraints { make in
            make.top.equalTo(containerView.snp.bottom).offset(20)
            make.centerX.equalToSuperview()
        }
        
        if isIPad {
            registerButton.snp.makeConstraints { make in
                make.width.equalTo(400) // Match container width on iPad
            }
        } else {
            registerButton.snp.makeConstraints { make in
                make.leading.equalToSuperview().offset(20)
                make.trailing.equalToSuperview().offset(-20)
            }
        }
        
        // Setup delegates and text change monitoring
        [emailField.textField, passwordField.textField].forEach { field in
            field.delegate = self
            field.addTarget(self, action: #selector(textFieldDidChange(_:)), for: .editingChanged)
        }
    }
    
    // MARK: - Actions
    @objc private func loginButtonTapped(_ sender: UIButton) {
        guard validateInputs() else { return }
        performLogin()
    }
    
    @objc private func forgotPasswordTapped() {
        let forgotPasswordVC = ForgotPasswordViewController()
        navigationController?.pushViewController(forgotPasswordVC, animated: true)
    }
    
    @objc func register() {
        // Push merged registration screen
        let registerVC = RegisterStoreViewController()
        navigationController?.pushViewController(registerVC, animated: true)
    }
    
    @objc private func togglePasswordVisibility() {
        passwordField.textField.isSecureTextEntry.toggle()
        let iconName = passwordField.textField.isSecureTextEntry ? "eye.fill" : "eye.slash.fill"
        passwordField.textField.setRightIcon(UIImage(systemName: iconName),
                                           action: #selector(togglePasswordVisibility),
                                           target: self)
    }
    
    @objc private func textFieldDidChange(_ textField: UITextField) {
        // Update button state without full validation (lightweight check)
        updateLoginButtonState()
    }
    
    // MARK: - Button State Management
    private func updateLoginButtonState() {
        let email = emailField.textField.text ?? ""
        let password = passwordField.textField.text ?? ""
        
        // Lightweight validation for button state (no error messages)
        let hasEmail = !email.isEmpty && email.contains("@")
        let hasPassword = password.count >= 6
        
        loginButton.isEnabled = hasEmail && hasPassword
    }
    
    // MARK: - Validation & Login
    private func validateInputs() -> Bool {
        let email = emailField.textField.text ?? ""
        let password = passwordField.textField.text ?? ""
        
        var isValid = true
        
        // Clear previous errors
        emailField.clearError()
        passwordField.clearError()
        
        // Validate email
        if email.isEmpty {
            emailField.showError("Email is required".localized())
            isValid = false
        } else if !email.isValidEmail() {
            emailField.showError("Please enter a valid email address".localized())
            isValid = false
        }
        
        // Validate password
        if password.isEmpty {
            passwordField.showError("Password is required".localized())
            isValid = false
        } else if password.count < 6 {
            passwordField.showError("Password must be at least 6 characters".localized())
            isValid = false
        }
        
        return isValid
    }
    
    private func performLogin() {
        self.showProgressText(text: "Loading...".localized())
        
        authService.login(
            emailUser: emailField.textField.text ?? "",
            passwordUser: passwordField.textField.text ?? ""
        ) { [weak self] user, error in
            self?.hideProgress()
            
            if let error = error {
                self?.showAlert(message: error.localizedDescription)
                return
            }
            
            if let user = user {
                // Save/update email for next login
                if let email = self?.emailField.textField.text, !email.isEmpty {
                    Utils.saveLastLoginEmail(email: email)
                }
                User.save(user: user)
                appDelegate.loadMainUserView()
            }
        }
    }
    
    // MARK: - Email Persistence
    private func loadLastLoginEmail() {
        if let lastEmail = Utils.loadLastLoginEmail(), !lastEmail.isEmpty {
            emailField.textField.text = lastEmail
            // Update button state after loading email
            updateLoginButtonState()
        }
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
    
    // MARK: - Gestures
    private lazy var tapGesture: UITapGestureRecognizer = {
        let gesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        return gesture
    }()
    
    private func setupGestures() {
        view.addGestureRecognizer(tapGesture)
    }
    
    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }
}

// MARK: - UITextFieldDelegate
extension LoginViewController: UITextFieldDelegate {
    func textFieldDidEndEditing(_ textField: UITextField) {
        // Update button state (lightweight check, no error messages)
        updateLoginButtonState()
        
        // Clear errors when user finishes editing
        if textField == emailField.textField {
            emailField.clearError()
        } else if textField == passwordField.textField {
            passwordField.clearError()
        }
    }
    
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        switch textField {
        case emailField.textField:
            passwordField.textField.becomeFirstResponder()
        case passwordField.textField:
            textField.resignFirstResponder()
            if loginButton.isEnabled {
                loginButtonTapped(loginButton)
            }
        default:
            break
        }
        return true
    }
}

// MARK: - Notification Names
extension Notification.Name {
    static let userDidLogin = Notification.Name("userDidLogin")
}
