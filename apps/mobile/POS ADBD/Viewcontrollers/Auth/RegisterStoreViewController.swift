import UIKit
import SnapKit

/// 3-step merchant signup: Shop → Owner → Business field.
/// Keeps each step short; Previous preserves entered data.
class RegisterStoreViewController: BaseViewControler {

    private enum Step: Int, CaseIterable {
        case shop = 0
        case owner = 1
        case business = 2
    }

    private struct BusinessOption {
        let titleKey: String
        let apiValue: String
    }

    // MARK: - UI: Chrome
    private lazy var scrollView: UIScrollView = {
        let scrollView = UIScrollView()
        scrollView.showsVerticalScrollIndicator = true
        scrollView.alwaysBounceVertical = true
        scrollView.backgroundColor = .clear
        return scrollView
    }()

    private lazy var containerView: UIView = {
        let view = UIView()
        view.backgroundColor = .clear
        return view
    }()

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
        stack.spacing = 14
        stack.distribution = .fill
        stack.backgroundColor = .clear
        return stack
    }()

    /// Compact progress row (step text + dots) so the card doesn't waste vertical space.
    private lazy var progressHeaderStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 4
        stack.alignment = .center
        return stack
    }()

    private lazy var progressLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 13)
        label.textColor = APP_TEXT_COLOR.withAlphaComponent(0.55)
        label.textAlignment = .center
        return label
    }()

    private lazy var pageControl: UIPageControl = {
        let control = UIPageControl()
        control.numberOfPages = Step.allCases.count
        control.currentPage = 0
        control.currentPageIndicatorTintColor = APP_TONE_COLOR
        control.pageIndicatorTintColor = APP_TONE_COLOR.withAlphaComponent(0.25)
        control.isUserInteractionEnabled = false
        // Shrink default page-control padding so it doesn't inflate the card.
        if #available(iOS 14.0, *) {
            control.backgroundStyle = .minimal
        }
        return control
    }()

    private lazy var stepTitleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 18)
        label.textColor = APP_TEXT_COLOR
        label.numberOfLines = 0
        return label
    }()

    private lazy var stepSubtitleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 14)
        label.textColor = APP_TEXT_COLOR.withAlphaComponent(0.65)
        label.numberOfLines = 0
        return label
    }()

    // MARK: - Step containers
    private lazy var shopStepView = UIStackView()
    private lazy var ownerStepView = UIStackView()
    private lazy var businessStepView = UIStackView()

    // MARK: - Shop fields
    private lazy var storeNameField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Store Name".localized(),
            placeholder: "AnyRent Rental Shop".localized()
        )
        field.setRequired(true)
        field.textField.setLeftIcon(UIImage(systemName: "building.2.fill"))
        field.textField.autocapitalizationType = .words
        field.textField.autocorrectionType = .no
        return field
    }()

    private lazy var phoneField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Phone Number".localized(),
            placeholder: "0901234567".localized()
        )
        field.setRequired(true)
        field.textField.keyboardType = .phonePad
        field.textField.setLeftIcon(UIImage(systemName: "phone.fill"))
        return field
    }()

    private lazy var locationField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Location".localized(),
            placeholder: "01 Quang Trung, District 1, HCMC".localized()
        )
        field.setRequired(true)
        field.textField.setLeftIcon(UIImage(systemName: "location.fill"))
        field.textField.autocapitalizationType = .words
        return field
    }()

    // MARK: - Owner fields
    private lazy var nameField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Name".localized(),
            placeholder: "e.g. Nguyen Van A".localized()
        )
        field.setRequired(true)
        field.textField.autocapitalizationType = .words
        field.textField.setLeftIcon(UIImage(systemName: "person.fill"))
        return field
    }()

    private lazy var emailField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Email".localized(),
            placeholder: "Email for activation link".localized()
        )
        field.setRequired(true)
        field.textField.keyboardType = .emailAddress
        field.textField.autocapitalizationType = .none
        field.textField.setLeftIcon(UIImage(systemName: "envelope.fill"))
        return field
    }()

    private lazy var passwordField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Password".localized(),
            placeholder: "At least 6 characters".localized()
        )
        field.setRequired(true)
        field.textField.isSecureTextEntry = true
        field.textField.setLeftIcon(UIImage(systemName: "lock.fill"))
        field.textField.setRightIcon(
            UIImage(systemName: "eye.fill"),
            action: #selector(togglePasswordVisibility),
            target: self
        )
        return field
    }()

    private lazy var retypePasswordField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Confirm Password".localized(),
            placeholder: "Re-enter your password".localized()
        )
        field.setRequired(true)
        field.textField.isSecureTextEntry = true
        field.textField.setLeftIcon(UIImage(systemName: "lock.fill"))
        field.textField.setRightIcon(
            UIImage(systemName: "eye.fill"),
            action: #selector(toggleRetypePasswordVisibility),
            target: self
        )
        return field
    }()

    // MARK: - Business field chips (multi-select tags)
    private let businessOptions: [BusinessOption] = [
        BusinessOption(titleKey: "Ao dai rental", apiValue: "AO_DAI"),
        BusinessOption(titleKey: "Costume rental", apiValue: "COSTUME"),
        BusinessOption(titleKey: "Wedding dress rental", apiValue: "WEDDING_DRESS"),
        BusinessOption(titleKey: "Equipment rental", apiValue: "EQUIPMENT"),
        BusinessOption(titleKey: "Vehicle rental", apiValue: "VEHICLE"),
        BusinessOption(titleKey: "Film equipment rental", apiValue: "FILM_EQUIPMENT"),
        BusinessOption(titleKey: "Other", apiValue: "OTHER")
    ]

    private lazy var chipsStackView: WrapChipContainer = {
        let view = WrapChipContainer()
        view.spacing = 8
        view.rowSpacing = 8
        return view
    }()

    private var chipButtons: [UIButton] = []

    // MARK: - Privacy + nav
    private lazy var privacyPolicyView: UIView = {
        UIView()
    }()

    private lazy var privacyCheckbox: UIButton = {
        // Classic custom button (not .system / not Configuration) so SF Symbols
        // stay at a normal checkbox size instead of a huge filled square.
        let button = UIButton(type: .custom)
        let symbolConfig = UIImage.SymbolConfiguration(pointSize: 17, weight: .regular)
        let unchecked = UIImage(systemName: "square", withConfiguration: symbolConfig)?
            .withTintColor(UIColor.systemGray3, renderingMode: .alwaysOriginal)
        let checked = UIImage(systemName: "checkmark.square.fill", withConfiguration: symbolConfig)?
            .withTintColor(APP_TONE_COLOR, renderingMode: .alwaysOriginal)
        button.setImage(unchecked, for: .normal)
        button.setImage(checked, for: .selected)
        button.setImage(checked, for: [.selected, .highlighted])
        button.adjustsImageWhenHighlighted = false
        button.imageView?.contentMode = .scaleAspectFit
        button.contentHorizontalAlignment = .center
        button.contentVerticalAlignment = .center
        // Larger tap target while keeping a compact visual checkbox.
        button.contentEdgeInsets = UIEdgeInsets(top: 6, left: 6, bottom: 6, right: 6)
        button.addTarget(self, action: #selector(privacyCheckboxTapped), for: .touchUpInside)
        return button
    }()

    private lazy var privacyTextView: UITextView = {
        let tv = UITextView()
        tv.isScrollEnabled = false
        tv.isEditable = false
        tv.isSelectable = true
        tv.backgroundColor = .clear
        tv.textContainerInset = .zero
        tv.textContainer.lineFragmentPadding = 0
        tv.delegate = self
        tv.tintColor = .brandPrimary
        return tv
    }()

    private lazy var navButtonsStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 12
        stack.distribution = .fillEqually
        return stack
    }()

    private lazy var previousButton: RCPrimaryButton = {
        let button = RCPrimaryButton(
            title: "Previous".localized(),
            borderStyle: true,
            borderColor: APP_TONE_COLOR
        )
        button.addTarget(self, action: #selector(previousTapped), for: .touchUpInside)
        button.isHidden = true
        return button
    }()

    private lazy var primaryButton: RCPrimaryButton = {
        let button = RCPrimaryButton(title: "Next".localized(), backgroundColor: APP_TONE_COLOR)
        button.isEnabled = false
        button.addTarget(self, action: #selector(primaryTapped), for: .touchUpInside)
        return button
    }()

    private lazy var tapGesture: UITapGestureRecognizer = {
        UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
    }()

    // MARK: - State
    private var currentStep: Step = .shop
    /// Multi-select niche tags (API codes). Default OTHER so signup is never blocked.
    private var selectedBusinessTags: Set<String> = ["OTHER"]
    private var isPrivacyPolicyAccepted = false
    private let authService = AuthenticationService.shared

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .backgroundPrimary
        installAuthEntryBackground()
        setupNavigationBar()
        setupUI()
        setupGestures()
        setStatusBarStyle(.darkContent)
        showStep(.shop, animated: false)
        updatePrimaryButtonState()
    }

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
        view.addSubview(cardView)
        cardView.addSubview(scrollView)
        scrollView.addSubview(containerView)
        containerView.addSubview(stackView)

        configureStepStacks()
        buildBusinessChips()
        setupPrivacyPolicyView()

        progressHeaderStack.addArrangedSubview(progressLabel)
        progressHeaderStack.addArrangedSubview(pageControl)

        stackView.addArrangedSubview(progressHeaderStack)
        stackView.addArrangedSubview(stepTitleLabel)
        stackView.addArrangedSubview(stepSubtitleLabel)
        stackView.addArrangedSubview(shopStepView)
        stackView.addArrangedSubview(ownerStepView)
        stackView.addArrangedSubview(businessStepView)
        stackView.addArrangedSubview(navButtonsStack)

        // Tighter grouping: title sits near subtitle; fields start soon after.
        stackView.setCustomSpacing(6, after: stepTitleLabel)
        stackView.setCustomSpacing(16, after: stepSubtitleLabel)
        stackView.setCustomSpacing(20, after: shopStepView)
        stackView.setCustomSpacing(20, after: ownerStepView)
        stackView.setCustomSpacing(20, after: businessStepView)

        navButtonsStack.addArrangedSubview(previousButton)
        navButtonsStack.addArrangedSubview(primaryButton)

        let isIPad = traitCollection.horizontalSizeClass == .regular

        privacyCheckbox.snp.makeConstraints { make in
            make.leading.equalToSuperview()
            // Align with the first line of consent text (not vertically centered
            // against the whole multi-line block — that made the box look huge).
            make.top.equalTo(privacyTextView.snp.top).offset(-2)
            make.width.height.equalTo(32)
        }

        privacyTextView.snp.makeConstraints { make in
            make.leading.equalTo(privacyCheckbox.snp.trailing).offset(8)
            make.top.equalToSuperview()
            make.trailing.equalToSuperview()
            make.bottom.equalToSuperview()
        }

        privacyPolicyView.snp.makeConstraints { make in
            make.height.greaterThanOrEqualTo(32)
        }

        previousButton.snp.makeConstraints { make in
            make.height.equalTo(50)
        }
        primaryButton.snp.makeConstraints { make in
            make.height.equalTo(50)
        }

        guard let customNavBar = customNavBar else { return }

        // Card hugs content (like Login) instead of stretching to the bottom —
        // that stretch left a large empty glass area on short wizard steps.
        cardView.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom).offset(16)
            make.bottom.lessThanOrEqualTo(view.safeAreaLayoutGuide).offset(-16)
            if isIPad {
                make.centerX.equalToSuperview()
                make.width.equalTo(400)
            } else {
                make.leading.equalToSuperview().offset(20)
                make.trailing.equalToSuperview().offset(-20)
            }
        }

        scrollView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            // Prefer content height; yield when content is taller than the screen
            // so the card caps at safe-area and the scroll view can scroll.
            make.height.equalTo(containerView).priority(750)
        }

        containerView.snp.makeConstraints { make in
            make.edges.equalTo(scrollView.contentLayoutGuide)
            make.width.equalTo(scrollView.frameLayoutGuide)
        }

        stackView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 18, left: 18, bottom: 18, right: 18))
        }

        let fields = [
            storeNameField.textField, phoneField.textField, locationField.textField,
            nameField.textField, emailField.textField,
            passwordField.textField, retypePasswordField.textField
        ]
        fields.forEach { field in
            field.delegate = self
            field.addTarget(self, action: #selector(textFieldDidChange(_:)), for: .editingChanged)
        }

        setupPrivacyPolicyLabel()
    }

    private func configureStepStacks() {
        [shopStepView, ownerStepView, businessStepView].forEach { stack in
            stack.axis = .vertical
            stack.spacing = 14
            stack.distribution = .fill
        }

        [storeNameField, phoneField, locationField].forEach {
            shopStepView.addArrangedSubview($0)
        }

        [nameField, emailField, passwordField, retypePasswordField].forEach {
            ownerStepView.addArrangedSubview($0)
        }

        businessStepView.addArrangedSubview(chipsStackView)
        businessStepView.addArrangedSubview(privacyPolicyView)
        businessStepView.setCustomSpacing(16, after: chipsStackView)
    }

    private func setupPrivacyPolicyView() {
        privacyPolicyView.addSubview(privacyCheckbox)
        privacyPolicyView.addSubview(privacyTextView)
    }

    private func buildBusinessChips() {
        chipButtons.removeAll()

        for (index, option) in businessOptions.enumerated() {
            let button = makeChipButton(title: option.titleKey.localized(), tag: index)
            chipButtons.append(button)
        }
        chipsStackView.setChips(chipButtons)
        updateChipSelection()
    }

    private func makeChipButton(title: String, tag: Int) -> UIButton {
        let button = UIButton(type: .system)
        button.tag = tag
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = Utils.mediumFont(size: 13)
        button.titleLabel?.numberOfLines = 1
        button.titleLabel?.lineBreakMode = .byClipping
        button.contentHorizontalAlignment = .center
        button.contentEdgeInsets = UIEdgeInsets(top: 8, left: 12, bottom: 8, right: 12)
        button.layer.cornerRadius = 16
        button.layer.borderWidth = 1
        button.clipsToBounds = true
        button.setContentHuggingPriority(.required, for: .horizontal)
        button.setContentCompressionResistancePriority(.required, for: .horizontal)
        button.addTarget(self, action: #selector(chipTapped(_:)), for: .touchUpInside)
        return button
    }

    // MARK: - Step navigation
    private func showStep(_ step: Step, animated: Bool) {
        currentStep = step
        pageControl.currentPage = step.rawValue
        progressLabel.text = String(
            format: "Step %d of %d".localized(),
            step.rawValue + 1,
            Step.allCases.count
        )

        switch step {
        case .shop:
            stepTitleLabel.text = "Shop Information".localized()
            stepSubtitleLabel.text = "Tell us about your rental store".localized()
        case .owner:
            stepTitleLabel.text = "Shop Owner Information".localized()
            stepSubtitleLabel.text = "This account will manage your store".localized()
        case .business:
            stepTitleLabel.text = "What do you rent?".localized()
            stepSubtitleLabel.text = "Select all that apply".localized()
        }

        let updates = {
            self.shopStepView.isHidden = step != .shop
            self.ownerStepView.isHidden = step != .owner
            self.businessStepView.isHidden = step != .business
            self.previousButton.isHidden = step == .shop
            self.primaryButton.setButtonTitle(
                step == .business ? "Register".localized() : "Next".localized()
            )
            self.updatePrimaryButtonState()
            self.scrollView.setContentOffset(.zero, animated: false)
            if step == .business {
                self.chipsStackView.relayout()
            }
            // Recalculate hug-height after showing/hiding step stacks.
            self.view.setNeedsLayout()
            self.view.layoutIfNeeded()
        }

        if animated {
            UIView.transition(with: stackView, duration: 0.2, options: .transitionCrossDissolve, animations: updates)
        } else {
            updates()
        }
    }

    @objc private func previousTapped() {
        dismissKeyboard()
        guard let previous = Step(rawValue: currentStep.rawValue - 1) else { return }
        showStep(previous, animated: true)
    }

    @objc private func primaryTapped() {
        dismissKeyboard()
        switch currentStep {
        case .shop:
            guard validateShopStep() else { return }
            showStep(.owner, animated: true)
        case .owner:
            guard validateOwnerStep() else { return }
            showStep(.business, animated: true)
        case .business:
            guard validateBusinessStep() else { return }
            submitRegistration()
        }
    }

    // MARK: - Business chips (multi-select)
    @objc private func chipTapped(_ sender: UIButton) {
        guard businessOptions.indices.contains(sender.tag) else { return }
        let tag = businessOptions[sender.tag].apiValue

        if selectedBusinessTags.contains(tag) {
            // Keep at least one tag selected
            if selectedBusinessTags.count > 1 {
                selectedBusinessTags.remove(tag)
            }
        } else {
            selectedBusinessTags.insert(tag)
            // Picking a specific niche replaces bare "OTHER" so tags stay meaningful
            if tag != "OTHER" {
                selectedBusinessTags.remove("OTHER")
            }
        }

        updateChipSelection()
        updatePrimaryButtonState()
    }

    private func updateChipSelection() {
        for (index, button) in chipButtons.enumerated() {
            guard businessOptions.indices.contains(index) else { continue }
            let title = businessOptions[index].titleKey.localized()
            let selected = selectedBusinessTags.contains(businessOptions[index].apiValue)
            button.setTitle(title, for: .normal)
            if selected {
                button.backgroundColor = APP_TONE_COLOR
                button.setTitleColor(.white, for: .normal)
                button.layer.borderColor = APP_TONE_COLOR.cgColor
            } else {
                button.backgroundColor = UIColor.white.withAlphaComponent(0.72)
                button.setTitleColor(APP_TEXT_COLOR, for: .normal)
                button.layer.borderColor = APP_TONE_COLOR.withAlphaComponent(0.28).cgColor
            }
        }
    }

    private var selectedBusinessTagsPayload: [String] {
        // Stable order matching catalog
        businessOptions
            .map(\.apiValue)
            .filter { selectedBusinessTags.contains($0) }
    }

    // MARK: - Privacy
    private func setupPrivacyPolicyLabel() {
        let isIPad = traitCollection.horizontalSizeClass == .regular
        let fontSize: CGFloat = isIPad ? 16 : 14
        let font = Utils.regularFont(size: fontSize)
        let baseAttrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: APP_TEXT_COLOR]
        let text = NSMutableAttributedString(string: "I agree to the ".localized(), attributes: baseAttrs)
        text.append(NSAttributedString(
            string: "Privacy Policy".localized(),
            attributes: [.font: font, .link: URL(string: "anyrent://privacy")!]
        ))
        text.append(NSAttributedString(string: " and ".localized(), attributes: baseAttrs))
        text.append(NSAttributedString(
            string: "Terms of Service".localized(),
            attributes: [.font: font, .link: URL(string: "anyrent://terms")!]
        ))
        privacyTextView.attributedText = text
    }

    @objc private func privacyCheckboxTapped() {
        isPrivacyPolicyAccepted.toggle()
        privacyCheckbox.isSelected = isPrivacyPolicyAccepted
        updatePrimaryButtonState()
    }

    private func openPrivacyPolicy() {
        if let url = URL(string: "https://www.anyrent.shop/privacy") {
            presentWebView(url: url, title: "Privacy Policy".localized())
        }
    }

    private func openTermsOfService() {
        if let url = URL(string: "https://www.anyrent.shop/terms") {
            presentWebView(url: url, title: "Terms of Service".localized())
        }
    }

    private func presentWebView(url: URL, title: String) {
        let webViewController = WebViewController()
        webViewController.url = url
        webViewController.title = title
        let navigationController = UINavigationController(rootViewController: webViewController)
        navigationController.modalPresentationStyle = .formSheet
        present(navigationController, animated: true)
    }

    // MARK: - Validation / button state
    private func updatePrimaryButtonState() {
        switch currentStep {
        case .shop:
            primaryButton.isEnabled = isShopValid
        case .owner:
            primaryButton.isEnabled = isOwnerValid
        case .business:
            primaryButton.isEnabled = isPrivacyPolicyAccepted && !selectedBusinessTags.isEmpty
        }
    }

    private var isShopValid: Bool {
        let storeName = storeNameField.textField.text ?? ""
        let location = locationField.textField.text ?? ""
        let phone = phoneField.textField.text ?? ""
        let phonePredicate = NSPredicate(format: "SELF MATCHES %@", "^[0-9+]{10,13}$")
        return storeName.count >= 3
            && location.count >= 3
            && phonePredicate.evaluate(with: phone)
    }

    private var isOwnerValid: Bool {
        let name = nameField.textField.text ?? ""
        let email = emailField.textField.text ?? ""
        let password = passwordField.textField.text ?? ""
        let retype = retypePasswordField.textField.text ?? ""
        return name.count >= 2
            && email.isValidEmail()
            && password.count >= 6
            && password == retype
    }

    @discardableResult
    private func validateShopStep() -> Bool {
        let storeName = storeNameField.textField.text ?? ""
        let location = locationField.textField.text ?? ""
        let phone = phoneField.textField.text ?? ""

        storeNameField.clearError()
        locationField.clearError()
        phoneField.clearError()

        var isValid = true

        if storeName.isEmpty {
            storeNameField.showError("Store name is required".localized())
            isValid = false
        } else if storeName.count < 3 {
            storeNameField.showError("Store name must be at least 3 characters".localized())
            isValid = false
        }

        if location.isEmpty {
            locationField.showError("Location is required".localized())
            isValid = false
        } else if location.count < 3 {
            locationField.showError("Please enter a valid location (City, Province)".localized())
            isValid = false
        }

        if phone.isEmpty {
            phoneField.showError("Phone number is required".localized())
            isValid = false
        } else {
            let phonePredicate = NSPredicate(format: "SELF MATCHES %@", "^[0-9+]{10,13}$")
            if !phonePredicate.evaluate(with: phone) {
                phoneField.showError("Please enter a valid phone number".localized())
                isValid = false
            }
        }

        return isValid
    }

    @discardableResult
    private func validateOwnerStep() -> Bool {
        let name = nameField.textField.text ?? ""
        let email = emailField.textField.text ?? ""
        let password = passwordField.textField.text ?? ""
        let retypePassword = retypePasswordField.textField.text ?? ""

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

    @discardableResult
    private func validateBusinessStep() -> Bool {
        if selectedBusinessTags.isEmpty {
            showAlert(
                title: "Business field required".localized(),
                message: "Please select at least one rental type".localized()
            )
            return false
        }
        if !isPrivacyPolicyAccepted {
            showAlert(
                title: "Privacy Policy Required".localized(),
                message: "Please accept the Privacy Policy and Terms of Service to continue.".localized()
            )
            return false
        }
        return true
    }

    private func showAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
        present(alert, animated: true)
    }

    // MARK: - Submit
    private func submitRegistration() {
        showProgressText(text: "Processing...".localized())
        authService.createAccount(
            loginName: emailField.textField.text ?? "",
            password: passwordField.textField.text ?? "",
            storeName: storeNameField.textField.text ?? "",
            address: locationField.textField.text ?? "",
            name: nameField.textField.text ?? "",
            phone: phoneField.textField.text ?? "",
            businessTags: selectedBusinessTagsPayload
        ) { [weak self] _, error in
            self?.hideProgress()
            if let error = error {
                UIAlertController.errorAlert(parent: self, error: error)
            } else {
                self?.showSuccessAndDismiss()
            }
        }
    }

    private func showSuccessAndDismiss() {
        let checkEmailVC = CheckEmailViewController()
        checkEmailVC.email = emailField.textField.text
        checkEmailVC.context = "registration"
        navigationController?.pushViewController(checkEmailVC, animated: true)
    }

    // MARK: - Field helpers
    @objc private func togglePasswordVisibility() {
        passwordField.textField.isSecureTextEntry.toggle()
        let iconName = passwordField.textField.isSecureTextEntry ? "eye.fill" : "eye.slash.fill"
        passwordField.textField.setRightIcon(
            UIImage(systemName: iconName),
            action: #selector(togglePasswordVisibility),
            target: self
        )
    }

    @objc private func toggleRetypePasswordVisibility() {
        retypePasswordField.textField.isSecureTextEntry.toggle()
        let iconName = retypePasswordField.textField.isSecureTextEntry ? "eye.fill" : "eye.slash.fill"
        retypePasswordField.textField.setRightIcon(
            UIImage(systemName: iconName),
            action: #selector(toggleRetypePasswordVisibility),
            target: self
        )
    }

    @objc private func textFieldDidChange(_ textField: UITextField) {
        updatePrimaryButtonState()
    }

    private func setupGestures() {
        view.addGestureRecognizer(tapGesture)
    }

    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }
}

// MARK: - UITextFieldDelegate
extension RegisterStoreViewController: UITextFieldDelegate {
    func textFieldDidEndEditing(_ textField: UITextField) {
        updatePrimaryButtonState()

        switch textField {
        case nameField.textField: nameField.clearError()
        case emailField.textField: emailField.clearError()
        case passwordField.textField: passwordField.clearError()
        case retypePasswordField.textField: retypePasswordField.clearError()
        case storeNameField.textField: storeNameField.clearError()
        case locationField.textField: locationField.clearError()
        case phoneField.textField: phoneField.clearError()
        default: break
        }
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        switch textField {
        case storeNameField.textField:
            phoneField.textField.becomeFirstResponder()
        case phoneField.textField:
            locationField.textField.becomeFirstResponder()
        case locationField.textField:
            textField.resignFirstResponder()
            if primaryButton.isEnabled { primaryTapped() }
        case nameField.textField:
            emailField.textField.becomeFirstResponder()
        case emailField.textField:
            passwordField.textField.becomeFirstResponder()
        case passwordField.textField:
            retypePasswordField.textField.becomeFirstResponder()
        case retypePasswordField.textField:
            textField.resignFirstResponder()
            if primaryButton.isEnabled { primaryTapped() }
        default:
            break
        }
        return true
    }
}

// MARK: - UITextViewDelegate
extension RegisterStoreViewController: UITextViewDelegate {
    func textView(
        _ textView: UITextView,
        shouldInteractWith URL: URL,
        in characterRange: NSRange,
        interaction: UITextItemInteraction
    ) -> Bool {
        switch URL.absoluteString {
        case "anyrent://privacy": openPrivacyPolicy()
        case "anyrent://terms": openTermsOfService()
        default: break
        }
        return false
    }
}

// MARK: - Wrapping pill/tag layout
/// Auto Layout wrapping rows so UIStackView gets a real height (manual frames
/// collapsed the card and overlapped nav buttons).
private final class WrapChipContainer: UIView {
    var spacing: CGFloat = 8 {
        didSet { rowsStack.spacing = rowSpacing }
    }
    var rowSpacing: CGFloat = 8 {
        didSet { rowsStack.spacing = rowSpacing }
    }

    private let rowsStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.alignment = .fill
        stack.distribution = .fill
        stack.spacing = 8
        return stack
    }()

    private var chips: [UIButton] = []
    private var lastLayoutWidth: CGFloat = 0

    override init(frame: CGRect) {
        super.init(frame: frame)
        addSubview(rowsStack)
        rowsStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        setContentHuggingPriority(.required, for: .vertical)
        setContentCompressionResistancePriority(.required, for: .vertical)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func setChips(_ views: [UIButton]) {
        chips = views
        lastLayoutWidth = 0
        setNeedsLayout()
    }

    func relayout() {
        lastLayoutWidth = 0
        setNeedsLayout()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        let width = bounds.width
        guard width > 1 else { return }
        if abs(width - lastLayoutWidth) > 0.5 || rowsStack.arrangedSubviews.isEmpty {
            lastLayoutWidth = width
            rebuildRows(maxWidth: width)
        }
    }

    private func rebuildRows(maxWidth: CGFloat) {
        rowsStack.arrangedSubviews.forEach { row in
            rowsStack.removeArrangedSubview(row)
            row.removeFromSuperview()
        }
        chips.forEach { $0.removeFromSuperview() }

        guard !chips.isEmpty else { return }

        var currentRow = makeRow()
        var usedWidth: CGFloat = 0

        for chip in chips {
            let chipWidth = measuredWidth(for: chip, maxWidth: maxWidth)
            let needed = usedWidth == 0 ? chipWidth : usedWidth + spacing + chipWidth

            if usedWidth > 0, needed > maxWidth {
                finalizeRow(currentRow)
                rowsStack.addArrangedSubview(currentRow)
                currentRow = makeRow()
                usedWidth = 0
            }

            currentRow.addArrangedSubview(chip)
            usedWidth = usedWidth == 0 ? chipWidth : usedWidth + spacing + chipWidth
        }

        if !currentRow.arrangedSubviews.isEmpty {
            finalizeRow(currentRow)
            rowsStack.addArrangedSubview(currentRow)
        }
    }

    private func makeRow() -> UIStackView {
        let row = UIStackView()
        row.axis = .horizontal
        row.alignment = .center
        row.distribution = .fill
        row.spacing = spacing
        return row
    }

    private func finalizeRow(_ row: UIStackView) {
        // Trailing spacer keeps chips left-aligned as pills (not stretched).
        let spacer = UIView()
        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
        spacer.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        row.addArrangedSubview(spacer)
    }

    private func measuredWidth(for button: UIButton, maxWidth: CGFloat) -> CGFloat {
        let title = button.title(for: .normal) ?? ""
        let font = button.titleLabel?.font ?? Utils.mediumFont(size: 13)
        let textWidth = ceil((title as NSString).size(withAttributes: [.font: font]).width)
        let insets = button.contentEdgeInsets
        return min(textWidth + insets.left + insets.right, maxWidth)
    }
}
