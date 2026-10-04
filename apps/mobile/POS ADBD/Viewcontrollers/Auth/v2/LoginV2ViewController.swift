//
//  LoginV2ViewController.swift
//  POS ADBD
//
//  #386 — board Dang-nhap (flag `newAuth`). The sign-in itself is the one of `LoginViewController`:
//  `AuthenticationService.login`, `User.save`, purchases sync, push start, then `loadMainUserView`.
//

import UIKit
import SnapKit

final class LoginV2ViewController: BaseViewControler {
    private let authService = AuthenticationService.shared

    private let emailField = AuthV2Field(title: "Email".localized(), placeholder: "authv2.email.placeholder".localized())
    private let passwordField = AuthV2Field(title: "Password".localized(), secure: true)
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
        let footer = makeFooter()
        let content = authV2Page(header: nil, footer: footer, contentInsetTop: 240, blobs: .login)

        let title = authV2TitleBlock(title: "authv2.login.title".localized(), subtitle: "authv2.login.subtitle".localized())

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

        [title, emailField, passwordField, forgotRow, loginButton].forEach(content.addArrangedSubview)
        content.setCustomSpacing(16, after: title)
        content.setCustomSpacing(4, after: passwordField)
        content.setCustomSpacing(4, after: forgotRow)
    }

    private func makeFooter() -> UIView {
        let label = UILabel()
        label.text = "authv2.noStore".localized()
        label.font = Utils.regularFont(size: 15)
        label.textColor = AuthV2Style.textMuted
        let button = authV2LinkButton("authv2.createStore".localized())
        button.addTarget(self, action: #selector(registerTapped), for: .touchUpInside)
        let row = UIStackView(arrangedSubviews: [label, button])
        row.axis = .horizontal
        row.spacing = 6
        row.alignment = .center
        let wrapper = UIView()
        wrapper.addSubview(row)
        row.snp.makeConstraints { make in
            make.top.bottom.equalToSuperview()
            make.centerX.equalToSuperview()
            make.leading.greaterThanOrEqualToSuperview()
        }
        return wrapper
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
        showProgressText(text: "Loading...".localized())
        authService.login(emailUser: email, passwordUser: password) { [weak self] user, error in
            guard let self else { return }
            self.hideProgress()

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
