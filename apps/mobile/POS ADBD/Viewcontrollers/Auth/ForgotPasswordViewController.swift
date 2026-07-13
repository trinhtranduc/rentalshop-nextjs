import UIKit
import QuartzCore
import SnapKit

class ForgotPasswordViewController: BaseViewControler {
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
    
    private lazy var descriptionLabel: UILabel = {
        let label = UILabel()
        label.text = "Enter your email to receive a password reset link".localized()
        label.font = Utils.regularFont(size: 16)
        label.textColor = .systemGray
        label.textAlignment = .center
        label.numberOfLines = 0
        return label
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
    
    private lazy var sendResetLinkButton: RCPrimaryButton = {
        let button = RCPrimaryButton(title: "Send Reset Link".localized(), backgroundColor: APP_TONE_COLOR)
        button.isEnabled = false
        button.addTarget(self, action: #selector(sendResetLinkTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var gradientLayer: CAGradientLayer = {
        let layer = CAGradientLayer()
        // Beautiful gradient inspired by modern login designs
        layer.colors = [
            UIColor(red: 239/255, green: 246/255, blue: 255/255, alpha: 1).cgColor,  // blue-50 #EFF6FF
            UIColor.white.cgColor,
            UIColor(red: 238/255, green: 242/255, blue: 255/255, alpha: 1).cgColor   // indigo-50 #EEF2FF
        ]
        layer.locations = [0.0, 0.5, 1.0]
        layer.startPoint = CGPoint(x: 0, y: 0)
        layer.endPoint = CGPoint(x: 1, y: 1)
        return layer
    }()
    
    // MARK: - Properties
    private let authService = AuthenticationService.shared
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        installAuthEntryBackground()
        view.backgroundColor = .white//.backgroundPrimary
        // Add gradient layer
//        view.layer.insertSublayer(gradientLayer, at: 0)
        setupNavigationBar()
        setupUI()
        setupGestures()
        
        setStatusBarStyle(.darkContent)
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        // Update gradient layer frame
        gradientLayer.frame = view.bounds
    }
    
    // MARK: - UI Setup
    override func setupUI() {
        view.addSubview(containerView)
        containerView.addSubview(stackView)
        
        [descriptionLabel, emailField, sendResetLinkButton].forEach {
            stackView.addArrangedSubview($0)
        }
        
        let isIPad = traitCollection.horizontalSizeClass == .regular
        
        // Send reset link button height
        sendResetLinkButton.snp.makeConstraints { make in
            make.height.equalTo(50)
        }
        
        guard let customNavBar = customNavBar else { return }
        
        if isIPad {
            // iPad - Fixed width centered container
            containerView.snp.makeConstraints { make in
                make.centerX.equalToSuperview()
                make.width.equalTo(400)
                make.top.equalTo(customNavBar.snp.bottom).offset(40)
                make.bottom.lessThanOrEqualTo(view.safeAreaLayoutGuide).offset(-20)
            }
        } else {
            // iPhone - Edge-to-edge with margins
            containerView.snp.makeConstraints { make in
                make.top.equalTo(customNavBar.snp.bottom).offset(40)
                make.leading.equalToSuperview().offset(20)
                make.trailing.equalToSuperview().offset(-20)
                make.bottom.lessThanOrEqualTo(view.safeAreaLayoutGuide).offset(-20)
            }
        }
        
        // StackView constraints
        stackView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        // Setup delegates and text change monitoring
        emailField.textField.delegate = self
        emailField.textField.addTarget(self, action: #selector(textFieldDidChange(_:)), for: .editingChanged)
    }
    
    // MARK: - Navigation Bar Setup
    private func setupNavigationBar() {
        setupCustomNavigationBar(
            title: "Forgot Password".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .pop
        )
    }
    
    // MARK: - Actions
    @objc private func sendResetLinkTapped() {
        guard validateInput() else { return }
        
        let email = emailField.textField.text ?? ""
        showProgressText(text: "Sending...".localized())
        
        authService.forgotPassword(email: email) { [weak self] success, error in
            self?.hideProgress()
            
            if let error = error {
                self?.showAlert(message: error.localizedDescription)
                return
            }
            
            if success {
                // Navigate to check email page with forgot password context
                let checkEmailVC = CheckEmailViewController()
                checkEmailVC.email = email
//                checkEmailVC.context = "forgot_password"
                self?.navigationController?.pushViewController(checkEmailVC, animated: true)
            }
        }
    }
    
    @objc private func textFieldDidChange(_ textField: UITextField) {
        updateButtonState()
    }
    
    // MARK: - Validation
    private func validateInput() -> Bool {
        let email = emailField.textField.text ?? ""
        
        emailField.clearError()
        
        if email.isEmpty {
            emailField.showError("Email is required".localized())
            return false
        }
        
        if !email.isValidEmail() {
            emailField.showError("Please enter a valid email address".localized())
            return false
        }
        
        return true
    }
    
    private func updateButtonState() {
        let email = emailField.textField.text ?? ""
        sendResetLinkButton.isEnabled = !email.isEmpty && email.isValidEmail()
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
extension ForgotPasswordViewController: UITextFieldDelegate {
    func textFieldDidEndEditing(_ textField: UITextField) {
        updateButtonState()
        emailField.clearError()
    }
    
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        if textField == emailField.textField {
            textField.resignFirstResponder()
            if sendResetLinkButton.isEnabled {
                sendResetLinkTapped()
            }
        }
        return true
    }
}

