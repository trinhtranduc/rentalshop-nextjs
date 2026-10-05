//
//  LoginV2ViewController.swift
//  POS ADBD
//
//  #386 — board Dang-nhap (flag `newAuth`), style 4A in #466 (board DX-Dang-nhap). The sign-in itself is the one of `LoginViewController`:
//  `AuthenticationService.login`, `User.save`, purchases sync, push start, then `loadMainUserView`.
//

import UIKit
import SnapKit

final class LoginV2ViewController: BaseViewControler {
    private let authService = AuthenticationService.shared

    private let emailField = AuthV2Field(title: "Email".localized(), icon: "envelope", placeholder: "authv2.email.placeholder".localized())
    private let passwordField = AuthV2Field(title: "Password".localized(), icon: "lock", secure: true)
    private let loginButton = AuthV2PrimaryButton(title: "Login".localized())

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setStatusBarStyle(.darkContent)
        if let lastEmail = Utils.loadLastLoginEmail(), !lastEmail.isEmpty {
            emailField.text = lastEmail
        }
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: animated)
    }

    override func setupUI() {
        let content = authV2Page(header: nil, footer: nil, contentInsetTop: 96)

        let brand = AuthV2Style.makeBrandHeader()
        let title = authV2TitleBlock(title: "authv2.login.title".localized(), subtitle: "authv2.login.subtitle".localized(), centered: true)

        emailField.textField.keyboardType = .emailAddress
        emailField.textField.autocapitalizationType = .none
        emailField.textField.autocorrectionType = .no
        emailField.textField.returnKeyType = .next
        emailField.textField.delegate = self
        passwordField.textField.returnKeyType = .go
        passwordField.textField.delegate = self
        emailField.onChange = { [weak self] in self?.emailField.setError(nil) }
        passwordField.onChange = { [weak self] in self?.passwordField.setError(nil) }

        let forgot = authV2LinkButton("Forgot Password?".localized())
        forgot.addTarget(self, action: #selector(forgotTapped), for: .touchUpInside)
        let forgotRow = UIStackView(arrangedSubviews: [UIView(), forgot])
        forgotRow.axis = .horizontal

        loginButton.addTarget(self, action: #selector(loginTapped), for: .touchUpInside)

        let (registerRow, registerButton) = authV2SecondaryRow(question: "authv2.noStore".localized(), link: "authv2.createStore".localized())
        registerButton.addTarget(self, action: #selector(registerTapped), for: .touchUpInside)

        [brand, title, emailField, passwordField, forgotRow, loginButton, registerRow].forEach(content.addArrangedSubview)
        content.setCustomSpacing(48, after: brand)
        content.setCustomSpacing(20, after: title)
        content.setCustomSpacing(14, after: emailField)
        content.setCustomSpacing(0, after: passwordField)
        content.setCustomSpacing(4, after: forgotRow)
        content.setCustomSpacing(8, after: loginButton)
    }

    // MARK: - Actions

    @objc private func forgotTapped() {
        view.endEditing(true)
        let forgot = ForgotPasswordV2ViewController()
        forgot.prefilledEmail = AuthValidation.trimmed(emailField.text)
        navigationController?.pushViewController(forgot, animated: true)
    }

    @objc private func registerTapped() {
        view.endEditing(true)
        navigationController?.pushViewController(RegisterStoreV2ViewController(), animated: true)
    }

    @objc private func loginTapped() {
        view.endEditing(true)
        let errors = AuthValidation.login(email: emailField.text, password: passwordField.text)
        emailField.setError(errors[.email]?.localized())
        passwordField.setError(errors[.password]?.localized())
        guard errors.isEmpty else { return }
        performLogin(email: AuthValidation.trimmed(emailField.text), password: passwordField.text)
    }

    /// Same success path as `LoginViewController.performLogin`
    private func performLogin(email: String, password: String) {
        authV2SetLoading(true, button: loginButton)
        authService.login(emailUser: email, passwordUser: password) { [weak self] user, error in
            guard let self else { return }
            self.authV2SetLoading(false, button: self.loginButton)

            if let error = error {
                switch AuthErrorPlacement.login(status: error.code) {
                case .field:
                    self.passwordField.setError(error.localizedDescription)
                case .alert:
                    self.authV2Alert(error.localizedDescription)
                }
                return
            }

            if let user = user {
                if !email.isEmpty {
                    Utils.saveLastLoginEmail(email: email)
                }
                User.save(user: user)
                PurchasesManager.syncFromCurrentUser()
                PushNotificationManager.shared.start()
                appDelegate.loadMainUserView()
            }
        }
    }
}

extension LoginV2ViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        if textField == emailField.textField {
            passwordField.textField.becomeFirstResponder()
        } else {
            loginTapped()
        }
        return true
    }
}
