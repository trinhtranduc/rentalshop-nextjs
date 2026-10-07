//
//  EmailSentV2ViewController.swift
//  POS ADBD
//
//  #386 — board Quen-mat-khau-da-gui, style 4A in #466 (board DX-Da-gui). Also used after sign-up (the activation mail), where the current flow
//  shows its "check your email" screen. "Gửi lại email" is disabled for a minute after a tap.
//

import UIKit
import SnapKit

final class EmailSentV2ViewController: BaseViewControler {
    enum Purpose {
        case passwordReset, verification
    }

    private let email: String
    private let purpose: Purpose
    private let authService = AuthenticationService.shared
    private var cooldown = ResendCooldown()
    private var timer: Timer?
    private let resendButton = authV2LinkButton("Resend Email".localized())

    init(email: String, purpose: Purpose) {
        self.email = email
        self.purpose = purpose
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setStatusBarStyle(.darkContent)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: animated)
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        timer?.invalidate()
        timer = nil
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if !cooldown.canResend(now: Date()) { startTimer() }
    }

    override func setupUI() {
        let header = AuthV2Header()
        header.backButton.addTarget(self, action: #selector(backToLogin), for: .touchUpInside)

        let backButton = AuthV2PrimaryButton(title: "authv2.backToLogin".localized())
        backButton.addTarget(self, action: #selector(backToLogin), for: .touchUpInside)
        resendButton.addTarget(self, action: #selector(resendTapped), for: .touchUpInside)
        resendButton.setTitleColor(AuthV2Style.textMuted, for: .disabled)
        let footer = UIStackView(arrangedSubviews: [backButton, resendButton])
        footer.axis = .vertical
        footer.spacing = 8

        let content = authV2Page(header: header, footer: footer, contentInsetTop: 110)

        let iconRow = AuthV2Style.makeMailTile()

        let titleStyle = NSMutableParagraphStyle()
        titleStyle.minimumLineHeight = AuthV2Style.titleLineHeight
        titleStyle.maximumLineHeight = AuthV2Style.titleLineHeight
        let title = UILabel()
        title.attributedText = NSAttributedString(string: "authv2.sent.title".localized(), attributes: [
            NSAttributedString.Key.font: Utils.extraBoldFont(size: AuthV2Style.titleSize),
            NSAttributedString.Key.foregroundColor: AuthV2Style.text,
            NSAttributedString.Key.kern: AuthV2Style.headingKern,
            NSAttributedString.Key.paragraphStyle: titleStyle
        ])
        title.numberOfLines = 0
        title.accessibilityTraits = UIAccessibilityTraitHeader

        let format = (purpose == .passwordReset ? "authv2.sent.reset" : "authv2.sent.verify").localized()
        let full = String(format: format, email)
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineSpacing = 4
        let body = NSMutableAttributedString(string: full, attributes: [
            NSAttributedString.Key.font: Utils.regularFont(size: 16),
            NSAttributedString.Key.foregroundColor: AuthV2Style.textMuted,
            NSAttributedString.Key.paragraphStyle: paragraph
        ])
        if let range = full.range(of: email) {
            body.addAttributes([NSAttributedString.Key.font: Utils.boldFont(size: 16),
                                NSAttributedString.Key.foregroundColor: AuthV2Style.text], range: NSRange(range, in: full))
        }
        let bodyLabel = UILabel()
        bodyLabel.attributedText = body
        bodyLabel.numberOfLines = 0

        [iconRow, title, bodyLabel].forEach(content.addArrangedSubview)
        content.setCustomSpacing(16, after: iconRow)
        content.setCustomSpacing(6, after: title)
        updateResendButton()
    }

    @objc private func backToLogin() {
        view.endEditing(true)
        navigationController?.popToRootViewController(animated: true)
    }

    @objc private func resendTapped() {
        guard cooldown.canResend(now: Date()) else { return }
        showProgressText(text: "Sending...".localized())
        let completion: (Bool, NSError?) -> Void = { [weak self] success, error in
            guard let self else { return }
            self.hideProgress()
            if let error = error {
                UIAlertController.errorAlert(parent: self, error: error)
            } else if success {
                self.cooldown.start(now: Date())
                self.startTimer()
            }
        }
        switch purpose {
        case .passwordReset: authService.forgotPassword(email: email, completion: completion)
        case .verification: authService.resendVerification(email: email, completion: completion)
        }
    }

    private func startTimer() {
        timer?.invalidate()
        updateResendButton()
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] timer in
            guard let self else { timer.invalidate(); return }
            self.updateResendButton()
            if self.cooldown.canResend(now: Date()) {
                timer.invalidate()
                self.timer = nil
            }
        }
    }

    private func updateResendButton() {
        let remaining = cooldown.remaining(now: Date())
        resendButton.isEnabled = remaining == 0
        let title = remaining == 0 ? "Resend Email".localized() : String(format: "authv2.resendIn".localized(), remaining)
        UIView.performWithoutAnimation {
            resendButton.setTitle(title, for: .normal)
            resendButton.layoutIfNeeded()
        }
    }
}
