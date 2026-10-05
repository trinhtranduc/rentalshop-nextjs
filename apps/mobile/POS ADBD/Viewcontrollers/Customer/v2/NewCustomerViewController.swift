//
//  NewCustomerViewController.swift
//  POS ADBD
//
//  "Khách mới" (#387, board KH-moi): phone and full name required, note optional. The phone is looked up first;
//  when a customer already has it, that customer is offered ("Chọn khách này") instead of a duplicate.
//

import UIKit
import SnapKit
import IQKeyboardManagerSwift

final class NewCustomerViewController: BaseViewControler {
    enum Mode { case pick, browse }

    private let mode: Mode
    private let prefill: String
    private let flow: NewCustomerFlow
    private let phoneField = UITextField()
    private let nameField = UITextField()
    private let noteField = UITextField()
    private let saveButton: UIButton
    private let existingBox = UIView()
    private let existingAvatar = CustomersV2UI.avatar(size: 44, fontSize: DS.TextSize.body)
    private let existingName = V2.label(size: DS.TextSize.name, weight: .bold)
    private let existingTier = CustomersV2UI.tierPill()
    private let existingSubtitle = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted)
    private var existing: Customer?
    private var keyboardManagerWasEnabled = true
    private let formScroll = CustomerFormScrollView()

    /// The created or chosen customer
    var onDone: ((Customer) -> Void)?

    init(mode: Mode, prefill: String = "", flow: NewCustomerFlow = NewCustomerFlow()) {
        self.mode = mode
        self.prefill = prefill
        self.flow = flow
        saveButton = V2.primaryButton((mode == .pick ? "customers.v2.saveAndPick" : "Save").localized())
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        // Same prefill as the current form: digits go to the phone, anything else to the name
        if !prefill.isEmpty {
            if CustomersV2Logic.phoneDigits(prefill).count == prefill.filter({ !$0.isWhitespace }).count {
                phoneField.text = prefill
            } else {
                nameField.text = prefill
            }
        }
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        // The button follows the keyboard itself; IQKeyboardManager would also shift the form
        keyboardManagerWasEnabled = IQKeyboardManager.shared.enable
        IQKeyboardManager.shared.enable = false
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        IQKeyboardManager.shared.enable = keyboardManagerWasEnabled
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if (phoneField.text ?? "").isEmpty { phoneField.becomeFirstResponder() } else { nameField.becomeFirstResponder() }
    }

    override func setupUI() {
        view.backgroundColor = .white
        let back = CustomersV2UI.iconButton("chevron.left", label: "products.cart.back".localized(), size: DS.Icon.lg)
        back.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        let title = V2.label("customers.v2.newTitle".localized(), size: 20, weight: .bold)
        let header = UIStackView(arrangedSubviews: [back, title])
        header.alignment = .center
        header.spacing = 4

        phoneField.keyboardType = .phonePad
        phoneField.textContentType = .telephoneNumber
        nameField.autocapitalizationType = .words
        nameField.textContentType = .name
        nameField.returnKeyType = .next
        noteField.placeholder = "customers.v2.notePlaceholder".localized()
        noteField.returnKeyType = .done
        [phoneField, nameField, noteField].forEach { $0.delegate = self }
        [phoneField, nameField].forEach { $0.addTarget(self, action: #selector(fieldsChanged), for: .editingChanged) }

        let noteTitle = NSMutableAttributedString(string: "customers.v2.note".localized(), attributes: [
            NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.body),
            NSAttributedString.Key.foregroundColor: DS.Color.text,
        ])
        noteTitle.append(NSAttributedString(string: " " + "customers.v2.optional".localized(), attributes: [
            NSAttributedString.Key.font: Utils.regularFont(size: DS.TextSize.body),
            NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
        ]))
        let hint = V2.label("customers.v2.hint".localized(), size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)

        buildExistingBox()
        let form = UIStackView(arrangedSubviews: [
            field("customers.v2.phone".localized(), phoneField),
            field("customers.v2.name".localized(), nameField),
            field(nil, noteField, attributedTitle: noteTitle),
            hint,
            existingBox,
        ])
        form.axis = .vertical
        form.spacing = 16

        let scroll = formScroll
        scroll.keyboardDismissMode = .interactive
        scroll.addSubview(form)
        saveButton.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)
        [header, scroll, saveButton].forEach(view.addSubview)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(12)
            make.leading.equalToSuperview().offset(8)
            make.trailing.equalToSuperview().offset(-8)
        }
        scroll.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom).offset(4)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(saveButton.snp.top).offset(-12)
        }
        form.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalToSuperview().offset(-12)
            make.width.equalToSuperview().offset(-2 * DS.Spacing.lg)
        }
        saveButton.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
        // Sits on the keyboard when it is up, else on the safe area
        saveButton.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor, constant: -12).isActive = true
    }

    private func field(_ title: String?, _ input: UITextField, attributedTitle: NSAttributedString? = nil) -> UIView {
        let label = V2.label(title, size: DS.TextSize.body, weight: .bold)
        if let attributedTitle { label.attributedText = attributedTitle }
        input.font = Utils.regularFont(size: DS.TextSize.input)
        input.textColor = DS.Color.text
        input.layer.borderWidth = 1
        input.layer.borderColor = V2.border.cgColor
        input.layer.cornerRadius = 12
        input.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 14, height: 1))
        input.leftViewMode = .always
        input.accessibilityLabel = attributedTitle?.string ?? title
        input.snp.makeConstraints { make in make.height.equalTo(52) }
        let stack = UIStackView(arrangedSubviews: [label, input])
        stack.axis = .vertical
        stack.spacing = 6
        return stack
    }

    /// "Số này đã có khách" card with the existing customer and "Chọn khách này"
    private func buildExistingBox() {
        existingBox.isHidden = true
        existingBox.backgroundColor = DS.Status.waiting.fill
        existingBox.layer.cornerRadius = DS.Radius.card
        let title = V2.label("customers.v2.duplicate".localized(), size: DS.TextSize.body, weight: .bold, color: DS.Status.waiting.text, lines: 0)
        let nameRow = UIStackView(arrangedSubviews: [existingName, existingTier])
        nameRow.spacing = 6
        nameRow.alignment = .center
        let texts = UIStackView(arrangedSubviews: [nameRow, existingSubtitle])
        texts.axis = .vertical
        texts.spacing = DS.Gap.lineTight
        texts.alignment = .leading
        let row = UIStackView(arrangedSubviews: [existingAvatar, texts])
        row.spacing = 12
        row.alignment = .center
        let use = V2.secondaryButton((mode == .pick ? "customers.v2.useExisting" : "customers.v2.openExisting").localized())
        use.backgroundColor = .white
        use.addTarget(self, action: #selector(useExistingTapped), for: .touchUpInside)
        let stack = UIStackView(arrangedSubviews: [title, row, use])
        stack.axis = .vertical
        stack.spacing = 12
        existingBox.addSubview(stack)
        stack.snp.makeConstraints { make in make.edges.equalToSuperview().inset(DS.Spacing.md) }
    }

    private func showExisting(_ customer: Customer?) {
        existing = customer
        existingBox.isHidden = customer == nil
        guard let customer else { return }
        let name = CustomersV2Logic.displayName(customer)
        existingAvatar.text = CustomersV2Logic.initials(name)
        existingName.text = name
        CustomersV2UI.setTier(existingTier, CustomersV2Logic.tierName(customer))
        existingSubtitle.text = CustomersV2Logic.subtitle(phone: customer.phone, orderCount: customer.orderCount)
        UIAccessibilityPostNotification(UIAccessibilityAnnouncementNotification, "customers.v2.duplicate".localized())
    }

    // MARK: - Actions

    @objc private func backTapped() {
        navigationController?.popViewController(animated: true)
    }

    @objc private func fieldsChanged() {
        // A changed phone needs a new check
        if existing != nil { showExisting(nil) }
    }

    @objc private func useExistingTapped() {
        guard let existing else { return }
        onDone?(existing)
    }

    @objc private func saveTapped() {
        let name = nameField.text ?? ""
        let phone = phoneField.text ?? ""
        if let problem = CustomersV2Logic.validate(name: name, phone: phone) {
            let message = problem == .missingPhone ? "customers.v2.needPhone" : "customers.v2.needName"
            UIAlertController.alert(parent: self, title: "Error".localized(), message: message.localized())
            (problem == .missingPhone ? phoneField : nameField).becomeFirstResponder()
            return
        }
        view.endEditing(true)
        saveButton.isEnabled = false
        showProgressText(text: "Loading...".localized())
        flow.submit(name: name, phone: phone, note: noteField.text) { [weak self] outcome in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                self.saveButton.isEnabled = true
                switch outcome {
                case .created(let customer):
                    self.onDone?(customer)
                case .existing(let customer):
                    self.showExisting(customer)
                case .failed(let error):
                    UIAlertController.errorAlert(parent: self, error: error)
                }
            }
        }
    }
}

extension NewCustomerViewController: UITextFieldDelegate {
    func textFieldDidBeginEditing(_ textField: UITextField) {
        // After the keyboard has resized the scroll view
        DispatchQueue.main.async { self.formScroll.revealFocusedField() }
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        if textField === nameField {
            noteField.becomeFirstResponder()
        } else {
            textField.resignFirstResponder()
        }
        return true
    }
}
