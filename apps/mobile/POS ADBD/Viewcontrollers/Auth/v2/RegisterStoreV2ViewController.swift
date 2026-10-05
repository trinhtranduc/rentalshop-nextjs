//
//  RegisterStoreV2ViewController.swift
//  POS ADBD
//
//  #386 — boards Dang-ky (step 1: shop) and Dang-ky-2 (step 2: owner); style 4A in #466 (DX-Tao-cua-hang-1/2). Both steps live in one screen so the
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

    private let header = AuthV2Header()
    private let progress = AuthV2Progress()
    private let primaryButton = AuthV2PrimaryButton(title: "authv2.continue".localized())
    private var loginRow = UIView()
    private var storeStack = UIStackView()
    private var ownerStack = UIStackView()

    // Step 1
    private let storeNameField = AuthV2Field(title: "authv2.storeName".localized(), icon: "storefront")
    private let phoneField = AuthV2Field(title: "authv2.phone".localized(), icon: "phone")
    private let addressField = AuthV2Field(title: "authv2.address".localized(), icon: "mappin.and.ellipse", placeholder: "authv2.address.placeholder".localized())
    private let chipFlow = AuthV2ChipFlow()
    private var chips: [AuthV2Chip] = []

    // Step 2
    private let nameField = AuthV2Field(title: "authv2.fullName".localized(), icon: "person")
    private let emailField = AuthV2Field(title: "Email".localized(), icon: "envelope")
    private let passwordField = AuthV2Field(title: "Password".localized(), icon: "lock", hint: "authv2.password.hint".localized(), secure: true)
    private let confirmField = AuthV2Field(title: "authv2.confirmPassword".localized(), icon: "lock", secure: true)
    private let termsCheck = UIButton(type: .custom)
    private let termsError = UILabel()
    private let termsText = UITextView()
    private var termsWidth: CGFloat = 0

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setStatusBarStyle(.darkContent)
        show(.store)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        // A non-scrolling text view sizes itself before it knows its width; re-measure once it does
        if termsText.bounds.width != termsWidth {
            termsWidth = termsText.bounds.width
            termsText.invalidateIntrinsicContentSize()
        }
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: animated)
    }

    override func setupUI() {
        header.backButton.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        primaryButton.addTarget(self, action: #selector(primaryTapped), for: .touchUpInside)
        // Footer: the main button, plus "Đã có cửa hàng? Đăng nhập" on step 1 (board DX-Tao-cua-hang-1)
        let (row, loginLink) = authV2SecondaryRow(question: "authv2.haveStore".localized(), link: "Login".localized())
        loginLink.addTarget(self, action: #selector(loginTapped), for: .touchUpInside)
        loginRow = row
        let footer = UIStackView(arrangedSubviews: [primaryButton, loginRow])
        footer.axis = .vertical
        footer.spacing = 2
        let content = authV2Page(header: header, footer: footer, contentInsetTop: 24)
        content.addArrangedSubview(progress)

        storeStack = makeStoreStep()
        ownerStack = makeOwnerStep()

        // Return moves to the next field; the last field of a step closes the keyboard
        let chain = [storeNameField, phoneField, addressField, nameField, emailField, passwordField, confirmField]
        chain.forEach { $0.textField.delegate = self }
        [addressField, confirmField].forEach { $0.textField.returnKeyType = .done }
        [storeNameField, nameField, emailField, passwordField].forEach { $0.textField.returnKeyType = .next }
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
            attributes: [NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.body), NSAttributedString.Key.foregroundColor: AuthV2Style.text]
        )
        attributed.append(NSAttributedString(
            string: "authv2.rentWhat.hint".localized(),
            attributes: [NSAttributedString.Key.font: Utils.regularFont(size: DS.TextSize.body), NSAttributedString.Key.foregroundColor: AuthV2Style.textMuted]
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
        stack.spacing = 14
        stack.setCustomSpacing(16, after: stack.arrangedSubviews[0])
        return stack
    }

    private func makeOwnerStep() -> UIStackView {
        nameField.textField.autocapitalizationType = .words
        nameField.textField.textContentType = .name
        emailField.textField.keyboardType = .emailAddress
        emailField.textField.autocapitalizationType = .none
        emailField.textField.autocorrectionType = .no
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
        stack.setCustomSpacing(16, after: stack.arrangedSubviews[0])
        return stack
    }

    private func makeTermsRow() -> UIView {
        termsCheck.tintColor = AuthV2Style.primary
        termsCheck.addTarget(self, action: #selector(termsTapped), for: .touchUpInside)
        termsCheck.accessibilityLabel = "Please accept the Privacy Policy and Terms of Service to continue.".localized()
        updateTermsCheck()

        let terms = "authv2.terms.link".localized()
        let privacy = "Privacy Policy".localized()
        let full = String(format: "authv2.terms".localized(), terms, privacy)
        let text = NSMutableAttributedString(string: full, attributes: [
            NSAttributedString.Key.font: Utils.regularFont(size: DS.TextSize.body),
            NSAttributedString.Key.foregroundColor: AuthV2Style.termsText
        ])
        if let range = full.range(of: terms) {
            text.addAttributes([NSAttributedString.Key.link: URL(string: AppLegalLinks.termsURL)!,
                                NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.body)], range: NSRange(range, in: full))
        }
        if let range = full.range(of: privacy) {
            text.addAttributes([NSAttributedString.Key.link: URL(string: AppLegalLinks.privacyURL)!,
                                NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.body)], range: NSRange(range, in: full))
        }
        let textView = termsText
        textView.attributedText = text
        textView.isEditable = false
        textView.isScrollEnabled = false
        textView.backgroundColor = .clear
        textView.textContainerInset = UIEdgeInsets(top: 11, left: 0, bottom: 0, right: 0)
        textView.textContainer.lineFragmentPadding = 0
        textView.tintColor = AuthV2Style.primary
        textView.delegate = self

        termsError.font = Utils.mediumFont(size: DS.TextSize.secondary)
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
        progress.setStep(next.rawValue, of: 2)
        loginRow.isHidden = next != .store
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

    @objc private func loginTapped() {
        view.endEditing(true)
        navigationController?.popViewController(animated: true)
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
        termsCheck.setImage(DS.symbol(name, DS.Icon.lg), for: .normal)
        termsCheck.tintColor = draft.termsAccepted ? AuthV2Style.primary : AuthV2Style.fieldBorder
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
        authV2SetLoading(true, button: primaryButton)
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
            self.authV2SetLoading(false, button: self.primaryButton)
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
            self.view.endEditing(true)
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

extension RegisterStoreV2ViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        let next: [UITextField: UITextField] = [
            storeNameField.textField: phoneField.textField,
            nameField.textField: emailField.textField,
            emailField.textField: passwordField.textField,
            passwordField.textField: confirmField.textField
        ]
        if let target = next[textField] {
            target.becomeFirstResponder()
        } else {
            textField.resignFirstResponder()
        }
        return true
    }
}
