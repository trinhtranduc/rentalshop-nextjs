//
//  ForgotPasswordV2ViewController.swift
//  POS ADBD
//
//  #386 — board Quen-mat-khau. Calls `AuthenticationService.forgotPassword` like the current screen;
//  errors in an alert as today.
//

import UIKit
import SnapKit

final class ForgotPasswordV2ViewController: BaseViewControler {
    var prefilledEmail: String?

    private let authService = AuthenticationService.shared
    private let emailField = AuthV2Field(title: "Email".localized(), placeholder: "authv2.email.placeholder".localized())
    private let sendButton = AuthV2PrimaryButton(title: "authv2.forgot.send".localized())

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setStatusBarStyle(.darkContent)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: animated)
    }

    override func setupUI() {
        let header = AuthV2Header()
        header.backButton.addTarget(self, action: #selector(backTapped), for: .touchUpInside)

        let note = UILabel()
        note.text = "authv2.forgot.staffNote".localized()
        note.font = Utils.regularFont(size: 14)
        note.textColor = AuthV2Style.textMuted
        note.textAlignment = .center
        note.numberOfLines = 0

        let content = authV2Page(header: header, footer: note, contentInsetTop: 200, blobs: .forgot)

        emailField.text = prefilledEmail ?? ""
        emailField.textField.keyboardType = .emailAddress
        emailField.textField.autocapitalizationType = .none
        emailField.textField.autocorrectionType = .no
        emailField.textField.returnKeyType = .send
        emailField.textField.delegate = self
        emailField.onChange = { [weak self] in self?.emailField.setError(nil) }
        sendButton.addTarget(self, action: #selector(sendTapped), for: .touchUpInside)

        let title = authV2TitleBlock(title: "authv2.forgot.title".localized(), subtitle: "authv2.forgot.text".localized())
        [title, emailField, sendButton].forEach(content.addArrangedSubview)
        content.setCustomSpacing(18, after: title)
    }

    @objc private func backTapped() {
        navigationController?.popViewController(animated: true)
    }

    @objc private func sendTapped() {
        view.endEditing(true)
        let errors = AuthValidation.forgot(email: emailField.text)
        emailField.setError(errors[.email]?.localized())
        guard errors.isEmpty else { return }

        let email = AuthValidation.trimmed(emailField.text)
        showProgressText(text: "Sending...".localized())
        authService.forgotPassword(email: email) { [weak self] success, error in
            guard let self else { return }
            self.hideProgress()
            if let error = error {
                self.authV2Alert(error.localizedDescription)
                return
            }
            if success {
                let sent = EmailSentV2ViewController(email: email, purpose: .passwordReset)
                self.navigationController?.pushViewController(sent, animated: true)
            }
        }
    }
}

extension ForgotPasswordV2ViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        sendTapped()
        return true
    }
}
