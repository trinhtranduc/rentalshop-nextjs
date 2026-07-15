import UIKit
import QuartzCore
import SnapKit

class CheckEmailViewController: BaseViewControler {
    // MARK: - Properties
    var email: String?
    var context: String? // "registration" or "forgot_password"
    
    // MARK: - Resend Email Cooldown
    private var resendTimer: Timer?
    private var cooldownSeconds: Int = 120 // 2 minutes
    private var remainingSeconds: Int = 0
    private var canResend: Bool = true {
        didSet {
            updateResendButtonState()
        }
    }
    
    // MARK: - UI Components
    private lazy var containerView: UIView = {
        let view = UIView()
        return view
    }()
    
    private lazy var descriptionLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 16)
        label.textColor = .systemGray
        label.textAlignment = .center
        label.numberOfLines = 0
        return label
    }()
    
    private lazy var emailLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 16)
        label.textColor = APP_TONE_COLOR
        label.textAlignment = .center
        label.numberOfLines = 0
        return label
    }()
    
    private lazy var resendButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Resend Email".localized(), for: .normal)
        button.titleLabel?.font = Utils.regularFont(size: 14)
        button.setTitleColor(APP_TONE_COLOR, for: .normal)
        button.setTitleColor(.systemGray, for: .disabled)
        button.addTarget(self, action: #selector(resendEmailTapped), for: .touchUpInside)
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
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white//.backgroundPrimary
        // Add gradient layer
//        view.layer.insertSublayer(gradientLayer, at: 0)
        setupNavigationBar()
        setupUI()
        
        setStatusBarStyle(.darkContent)
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        // Stop timer when view disappears
        resendTimer?.invalidate()
        resendTimer = nil
    }
    
    // MARK: - Navigation Bar Setup
    private func setupNavigationBar() {
        setupCustomNavigationBar(
            title: "Check Your Email".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .popToRoot
        )
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        // Update gradient layer frame
        gradientLayer.frame = view.bounds
    }
    
    // MARK: - UI Setup
    override func setupUI() {
        view.addSubview(containerView)
        containerView.addSubview(descriptionLabel)
        containerView.addSubview(emailLabel)
        containerView.addSubview(resendButton)
        
        // Set email text if available
        if let email = email {
            emailLabel.text = email
        }
        
        // Update UI based on context
        updateUIForContext()
        
        let isIPad = traitCollection.horizontalSizeClass == .regular
        
        guard let customNavBar = customNavBar else { return }
        
        if isIPad {
            // iPad - Fixed width centered container
            containerView.snp.makeConstraints { make in
                make.centerX.equalToSuperview()
                make.width.equalTo(500)
                make.top.equalTo(customNavBar.snp.bottom)
                make.bottom.equalTo(view.safeAreaLayoutGuide)
            }
        } else {
            // iPhone - Edge-to-edge with margins
            containerView.snp.makeConstraints { make in
                make.top.equalTo(customNavBar.snp.bottom)
                make.bottom.equalTo(view.safeAreaLayoutGuide)
                make.leading.equalToSuperview().offset(20)
                make.trailing.equalToSuperview().offset(-20)
            }
        }
        
        // Description constraints
        descriptionLabel.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(60)
            make.leading.trailing.equalToSuperview()
        }
        
        // Email label constraints
        emailLabel.snp.makeConstraints { make in
            make.top.equalTo(descriptionLabel.snp.bottom).offset(24)
            make.leading.trailing.equalToSuperview()
        }
        
        // Resend button constraints
        resendButton.snp.makeConstraints { make in
            make.top.equalTo(emailLabel.snp.bottom).offset(40)
            make.centerX.equalToSuperview()
            make.height.equalTo(44)
        }
    }
    
    // MARK: - Helper Methods
    private func updateUIForContext() {
        if context == "forgot_password" {
            // Forgot password context
            descriptionLabel.text = "We've sent a password reset link to your email address. Please check your inbox and click the link to reset your password.".localized()
        } else {
            // Registration context (default)
            descriptionLabel.text = "We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.".localized()
        }
    }
    
    private func updateResendButtonState() {
        if canResend {
            resendButton.setTitle("Resend Email".localized(), for: .normal)
            resendButton.isEnabled = true
        } else {
            let minutes = remainingSeconds / 60
            let seconds = remainingSeconds % 60
            let timeString = String(format: "%d:%02d", minutes, seconds)
            let baseTitle = "Resend Email".localized()
            let title = "\(baseTitle) (\(timeString))"
            resendButton.setTitle(title, for: .disabled)
            resendButton.isEnabled = false
        }
    }
    
    internal func startCooldown() {
        canResend = false
        remainingSeconds = cooldownSeconds
        
        // Update button immediately
        updateResendButtonState()
        
        // Start timer (scheduledTimer automatically runs on main thread)
        resendTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] timer in
            guard let self = self else {
                timer.invalidate()
                return
            }
            
            self.remainingSeconds -= 1
            
            if self.remainingSeconds <= 0 {
                self.canResend = true
                timer.invalidate()
                self.resendTimer = nil
            } else {
                self.updateResendButtonState()
            }
        }
    }
    
    // MARK: - Actions
    @objc private func resendEmailTapped() {
        guard let email = email, !email.isEmpty else {
            return
        }
        
        guard canResend else {
            return
        }
        
        // Show loading
        showProgressText(text: "Sending...".localized())
        
        // Call appropriate API based on context
        if context == "forgot_password" {
            // Resend password reset email
            AuthenticationService.shared.forgotPassword(email: email) { [weak self] success, error in
                guard let strongSelf = self else { return }

                DispatchQueue.main.async {
                    strongSelf.hideProgress()
                    
                    if success {
                        // Start cooldown timer
                        strongSelf.startCooldown()
                        
                    } else if let error = error {
                        UIAlertController.errorAlert(parent: strongSelf, error: error)
                    }
                }
            }
        } else {
            // Resend verification email
            AuthenticationService.shared.resendVerification(email: email) { [weak self] success, error in
                guard let strongSelf = self else { return }

                DispatchQueue.main.async {
                    strongSelf.hideProgress()
                    
                    if success {
                        // Start cooldown timer
                        strongSelf.startCooldown()
                    } else if let error = error {
                        UIAlertController.errorAlert(parent: strongSelf, error: error)
                    }
                }
            }
        }
    }
}

