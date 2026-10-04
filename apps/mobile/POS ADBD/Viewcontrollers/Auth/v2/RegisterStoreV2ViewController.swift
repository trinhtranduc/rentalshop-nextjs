//
//  RegisterStoreV2ViewController.swift
//  POS ADBD
//
//  #386 — boards Dang-ky (step 1: shop) and Dang-ky-2 (step 2: owner). Both steps live in one screen so the
//  values stay when going back and forth. The call is the current `AuthenticationService.createAccount`.
//

import UIKit
import SafariServices
import SnapKit

final class RegisterStoreV2ViewController: BaseViewControler {
    private enum Step: Int {
        case store = 1, owner = 2
    }

    private let authService = AuthenticationService.shared
    private var step: Step = .store
    private var draft = RegisterDraft()

    private let header = AuthV2Header(showsProgress: true)
    private let primaryButton = AuthV2PrimaryButton(title: "authv2.continue".localized())
    private var storeStack = UIStackView()
    private var ownerStack = UIStackView()

    // Step 1
    private let storeNameField = AuthV2Field(title: "authv2.storeName".localized())
    private let phoneField = AuthV2Field(title: "authv2.phone".localized())
    private let addressField = AuthV2Field(title: "authv2.address".localized(), placeholder: "authv2.address.placeholder".localized())
    private let chipFlow = AuthV2ChipFlow()
    private var chips: [AuthV2Chip] = []

    // Step 2
    private let nameField = AuthV2Field(title: "authv2.fullName".localized())
    private let emailField = AuthV2Field(title: "Email".localized())
    private let passwordField = AuthV2Field(title: "Password".localized(), hint: "authv2.password.hint".localized(), secure: true)
    private let confirmField = AuthV2Field(title: "authv2.confirmPassword".localized(), secure: true)
    private let termsCheck = UIButton(type: .custom)
    private let termsError = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setStatusBarStyle(.darkContent)
        show(.store)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: animated)
    }

    override func setupUI() {
        header.backButton.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        primaryButton.addTarget(self, action: #selector(primaryTapped), for: .touchUpInside)
        let content = authV2Page(header: header, footer: primaryButton, contentInsetTop: 20)

        storeStack = makeStoreStep()
        ownerStack = makeOwnerStep()
        content.addArrangedSubview(storeStack)
        content.addArrangedSubview(ownerStack)
    }

    private func makeStoreStep() -> UIStackView {
        phoneField.textField.keyboardType = .phonePad
        phoneField.textField.textContentType = .telephoneNumber
        storeNameField.textField.autocapitalizationType = .words
        addressField.textField.textContentType = .fullStreetAddress
        storeNameField.onChange = { [weak self] in self?.storeNameField.setError(nil) }
        phoneField.onChange = { [weak self] in self?.phoneField.setError(nil) }
        addressField.onChange = { [weak self] in self?.addressField.setError(nil) }

        let legend = UILabel()
        let attributed = NSMutableAttributedString(
            string: "authv2.rentWhat".localized() + " ",
            attributes: [NSAttributedString.Key.font: Utils.boldFont(size: 14), NSAttributedString.Key.foregroundColor: DS.Color.text]
        )
        attributed.append(NSAttributedString(
            string: "authv2.rentWhat.hint".localized(),
            attributes: [NSAttributedString.Key.font: Utils.regularFont(size: 14), NSAttributedString.Key.foregroundColor: DS.Color.textMuted]
        ))
        legend.attributedText = attributed
        legend.numberOfLines = 0

        chips = BusinessTagRules.options.enumerated().map { index, option in
            let chip = AuthV2Chip(title: option.titleKey.localized())
            chip.tag = index
            chip.addTarget(self, action: #selector(chipTapped(_:)), for: .touchUpInside)
            return chip
        }
        chipFlow.chips = chips
        updateChips()

        let tagsStack = UIStackView(arrangedSubviews: [legend, chipFlow])
        tagsStack.axis = .vertical
        tagsStack.spacing = 10

        let stack = UIStackView(arrangedSubviews: [
            authV2TitleBlock(title: "authv2.store.title".localized(), subtitle: "authv2.store.subtitle".localized()),
            storeNameField, phoneField, addressField, tagsStack
        ])
        stack.axis = .vertical
        stack.spacing = 16
        stack.setCustomSpacing(20, after: stack.arrangedSubviews[0])
        return stack
    }

    private func makeOwnerStep() -> UIStackView {
        nameField.textField.autocapitalizationType = .words
        nameField.textField.textContentType = .name
        emailField.textField.keyboardType = .emailAddress
        emailField.textField.autocapitalizationType = .none
        emailField.textField.autocorrectionType = .no
        emailField.textField.textContentType = .username
        passwordField.textField.textContentType = .newPassword
        confirmField.textField.textContentType = .newPassword
        nameField.onChange = { [weak self] in self?.nameField.setError(nil) }
        emailField.onChange = { [weak self] in self?.emailField.setError(nil) }
        passwordField.onChange = { [weak self] in self?.passwordField.setError(nil) }
        confirmField.onChange = { [weak self] in self?.confirmField.setError(nil) }

        let stack = UIStackView(arrangedSubviews: [
            authV2TitleBlock(title: "authv2.owner.title".localized(), subtitle: "authv2.owner.subtitle".localized()),
            nameField, emailField, passwordField, confirmField, makeTermsRow()
        ])
        stack.axis = .vertical
        stack.spacing = 14
        stack.setCustomSpacing(20, after: stack.arrangedSubviews[0])
        return stack
    }

    private func makeTermsRow() -> UIView {
        termsCheck.tintColor = DS.Color.primary
        termsCheck.addTarget(self, action: #selector(termsTapped), for: .touchUpInside)
        termsCheck.accessibilityLabel = "Please accept the Privacy Policy and Terms of Service to continue.".localized()
        updateTermsCheck()

        let terms = "Terms of Service".localized()
        let privacy = "Privacy Policy".localized()
        let full = String(format: "authv2.terms".localized(), terms, privacy)
        let text = NSMutableAttributedString(string: full, attributes: [
            NSAttributedString.Key.font: Utils.regularFont(size: 14),
            NSAttributedString.Key.foregroundColor: UIColor(hexString: "334155")
        ])
        if let range = full.range(of: terms) {
            text.addAttributes([NSAttributedString.Key.link: URL(string: AppLegalLinks.termsURL)!,
                                NSAttributedString.Key.font: Utils.boldFont(size: 14)], range: NSRange(range, in: full))
        }
        if let range = full.range(of: privacy) {
            text.addAttributes([NSAttributedString.Key.link: URL(string: AppLegalLinks.privacyURL)!,
                                NSAttributedString.Key.font: Utils.boldFont(size: 14)], range: NSRange(range, in: full))
        }
        let textView = UITextView()
        textView.attributedText = text
        textView.isEditable = false
        textView.isScrollEnabled = false
        textView.backgroundColor = .clear
        textView.textContainerInset = UIEdgeInsets(top: 11, left: 0, bottom: 0, right: 0)
        textView.textContainer.lineFragmentPadding = 0
        textView.tintColor = DS.Color.primary
        textView.delegate = self

        termsError.font = Utils.mediumFont(size: 13)
        termsError.textColor = AuthV2Style.error
        termsError.numberOfLines = 0
        termsError.isHidden = true

        let row = UIView()
        row.addSubview(termsCheck)
        row.addSubview(textView)
        termsCheck.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(-11)
            make.top.equalToSuperview()
            make.width.height.equalTo(DS.touchTarget)
        }
        textView.snp.makeConstraints { make in
            make.leading.equalTo(termsCheck.snp.trailing).offset(-1)
            make.trailing.top.bottom.equalToSuperview()
            make.height.greaterThanOrEqualTo(DS.touchTarget)
        }
        let stack = UIStackView(arrangedSubviews: [row, termsError])
        stack.axis = .vertical
        stack.spacing = 4
        return stack
    }

    // MARK: - Steps

    private func show(_ next: Step) {
        step = next
        storeStack.isHidden = next != .store
        ownerStack.isHidden = next != .owner
        header.setStep(next.rawValue, of: 2)
        primaryButton.setTitle((next == .store ? "authv2.continue" : "authv2.createStoreButton").localized(), for: .normal)
        UIAccessibilityPostNotification(UIAccessibilityScreenChangedNotification, nil)
    }

    private func readFields() {
        draft.storeName = storeNameField.text
        draft.phone = phoneField.text
        draft.address = addressField.text
        draft.fullName = nameField.text
        draft.email = emailField.text
        draft.password = passwordField.text
        draft.confirmPassword = confirmField.text
    }

    @objc private func backTapped() {
        view.endEditing(true)
        if step == .owner {
            show(.store)
        } else {
            navigationController?.popViewController(animated: true)
        }
    }

    @objc private func primaryTapped() {
        view.endEditing(true)
        readFields()
        switch step {
        case .store:
            let errors = draft.storeErrors
            storeNameField.setError(errors[.storeName]?.localized())
            phoneField.setError(errors[.phone]?.localized())
            addressField.setError(errors[.address]?.localized())
            if errors.isEmpty { show(.owner) }
        case .owner:
            let errors = draft.ownerErrors
            nameField.setError(errors[.fullName]?.localized())
            emailField.setError(errors[.email]?.localized())
            passwordField.setError(errors[.password]?.localized())
            confirmField.setError(errors[.confirmPassword]?.localized())
            setTermsError(errors[.terms]?.localized())
            if errors.isEmpty { submit() }
        }
    }

    @objc private func chipTapped(_ sender: UIButton) {
        guard BusinessTagRules.options.indices.contains(sender.tag) else { return }
        draft.tags = BusinessTagRules.toggle(BusinessTagRules.options[sender.tag].apiValue, in: draft.tags)
        updateChips()
    }

    private func updateChips() {
        for (index, chip) in chips.enumerated() {
            chip.setOn(draft.tags.contains(BusinessTagRules.options[index].apiValue))
        }
        chipFlow.setNeedsLayout()
    }

    @objc private func termsTapped() {
        draft.termsAccepted.toggle()
        updateTermsCheck()
        if draft.termsAccepted { setTermsError(nil) }
    }

    private func updateTermsCheck() {
        let name = draft.termsAccepted ? "checkmark.square.fill" : "square"
        termsCheck.setImage(UIImage(systemName: name, withConfiguration: UIImage.SymbolConfiguration(pointSize: 22)), for: .normal)
        termsCheck.tintColor = draft.termsAccepted ? DS.Color.primary : AuthV2Style.fieldBorder
        termsCheck.accessibilityTraits = draft.termsAccepted
            ? UIAccessibilityTraitButton | UIAccessibilityTraitSelected : UIAccessibilityTraitButton
    }

    private func setTermsError(_ message: String?) {
        termsError.text = message
        termsError.isHidden = message == nil
    }

    // MARK: - Submit

    private func submit() {
        let request = draft.request
        showProgressText(text: "Processing...".localized())
        authService.createAccount(
            loginName: request.loginName,
            password: request.password,
            storeName: request.storeName,
            address: request.address,
            name: request.name,
            phone: request.phone,
            businessTags: request.businessTags
        ) { [weak self] _, error in
            guard let self else { return }
            self.hideProgress()
            if let error = error {
                switch AuthErrorPlacement.register(status: error.code) {
                case .field:
                    self.emailField.setError(error.localizedDescription)
                case .alert:
                    UIAlertController.errorAlert(parent: self, error: error)
                }
                return
            }
            // Same as today: the "check your email" screen for the activation mail
            let sent = EmailSentV2ViewController(email: request.loginName, purpose: .verification)
            self.navigationController?.pushViewController(sent, animated: true)
        }
    }
}

extension RegisterStoreV2ViewController: UITextViewDelegate {
    func textView(_ textView: UITextView, shouldInteractWith URL: URL, in characterRange: NSRange, interaction: UITextItemInteraction) -> Bool {
        present(SFSafariViewController(url: URL), animated: true)
        return false
    }
}
