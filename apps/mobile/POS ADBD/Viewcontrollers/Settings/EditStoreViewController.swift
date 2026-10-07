//
//  EditStoreViewController.swift
//  POS ADBD
//
//  "Thông tin cửa hàng" (#484, board CH-sua): the v2 form of "Sửa khách hàng" (label above the field, no icons).
//  Name (required) and phone, then ĐỊA CHỈ (street; city | state; country | postal code), then KHÁC (description).
//  Saves through `PUT /api/outlets/{id}` with the same fields as before.
//

import UIKit
import SnapKit
import IQKeyboardManagerSwift

protocol EditStoreViewControllerDelegate: AnyObject {
    func didUpdateStore()
}

class EditStoreViewController: BaseViewControler {
    // MARK: - Properties
    weak var delegate: EditStoreViewControllerDelegate?
    private var outlet: Outlet?
    private var merchant: Merchant?

    // MARK: - UI Components
    private let storeNameField = UITextField()
    private let phoneField = UITextField()
    private let addressField = UITextField()
    private let cityField = UITextField()
    private let stateField = UITextField()
    private let countryButton = UIButton(type: .custom)
    private let countryValue = V2.label(size: DS.TextSize.input)
    private let zipCodeField = UITextField()
    private let descriptionView = UITextView()
    private let descriptionPlaceholder = V2.label("store.v2.descriptionPlaceholder".localized(), size: DS.TextSize.input,
                                                  color: UIColor(hexString: "94A3B8"), lines: 0)
    private let nameError = V2.label(size: DS.TextSize.secondary, color: V2.danger, lines: 0)
    private let saveButton = V2.primaryButton("Save".localized())
    private let cancelButton = V2.secondaryButton("customers.v2.cancel".localized())
    private let formScroll = CustomerFormScrollView()
    private var keyboardManagerWasEnabled = true

    /// Country as the picker returns it (the button shows a placeholder while empty)
    private var country: String = "" {
        didSet { renderCountry() }
    }

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupData()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        keyboardManagerWasEnabled = IQKeyboardManager.shared.enable
        IQKeyboardManager.shared.enable = false
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        IQKeyboardManager.shared.enable = keyboardManagerWasEnabled
    }

    override func setupUI() {
        view.backgroundColor = .white
        let back = CustomersV2UI.iconButton("chevron.left", label: "Back".localized(), size: DS.Icon.lg)
        back.addTarget(self, action: #selector(close), for: .touchUpInside)
        let title = V2.label("Store Information".localized(), size: 20, weight: .bold)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        let header = UIStackView(arrangedSubviews: [back, title])
        header.alignment = .center
        header.spacing = 4
        let headerLine = V2.divider()
        headerLine.backgroundColor = DS.Color.border

        storeNameField.autocapitalizationType = .words
        storeNameField.autocorrectionType = .no
        storeNameField.addTarget(self, action: #selector(nameChanged), for: .editingChanged)
        phoneField.keyboardType = .phonePad
        zipCodeField.keyboardType = .numberPad
        zipCodeField.placeholder = "700000"
        KeyboardDoneBar.attach([phoneField, zipCodeField])
        [storeNameField, phoneField, addressField, cityField, stateField, zipCodeField].forEach { $0.delegate = self }
        nameError.isHidden = true

        let nameBox = UIStackView(arrangedSubviews: [field(requiredTitle("store.v2.name".localized()), storeNameField,
                                                           accessibility: "store.v2.name".localized()), nameError])
        nameBox.axis = .vertical
        nameBox.spacing = 6

        let cityState = pair(field(plainTitle("store.v2.city".localized()), cityField),
                             field(plainTitle("store.v2.state".localized()), stateField))
        let countryZip = pair(countryBlock(), field(plainTitle("Postal Code".localized()), zipCodeField))

        let form = UIStackView(arrangedSubviews: [
            nameBox,
            field(plainTitle("Phone Number".localized()), phoneField),
            sectionTitle("Address".localized(), optional: false),
            field(plainTitle("store.v2.street".localized()), addressField),
            cityState,
            countryZip,
            sectionTitle("store.v2.other".localized(), optional: true),
            descriptionBlock(),
        ])
        form.axis = .vertical
        form.spacing = 14
        // Section titles sit a little lower (board: padding-top 6)
        form.setCustomSpacing(20, after: form.arrangedSubviews[1])
        form.setCustomSpacing(20, after: form.arrangedSubviews[5])

        let scroll = formScroll
        scroll.keyboardDismissMode = .interactive
        scroll.addSubview(form)

        let bottom = UIView()
        bottom.backgroundColor = .white
        let bottomLine = V2.divider()
        bottomLine.backgroundColor = DS.Color.border
        cancelButton.addTarget(self, action: #selector(close), for: .touchUpInside)
        saveButton.addTarget(self, action: #selector(saveButtonTapped), for: .touchUpInside)
        let buttons = UIStackView(arrangedSubviews: [cancelButton, saveButton])
        buttons.spacing = 12
        cancelButton.setContentHuggingPriority(.required, for: .horizontal)
        cancelButton.contentEdgeInsets = UIEdgeInsets(top: 0, left: 20, bottom: 0, right: 20)
        [bottomLine, buttons].forEach(bottom.addSubview)

        [header, headerLine, scroll, bottom].forEach(view.addSubview)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(8)
            make.leading.trailing.equalToSuperview().inset(8)
        }
        headerLine.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom)
            make.leading.trailing.equalToSuperview()
        }
        bottom.snp.makeConstraints { make in make.leading.trailing.equalToSuperview() }
        bottomLine.snp.makeConstraints { make in make.top.leading.trailing.equalToSuperview() }
        buttons.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalToSuperview().offset(-12)
        }
        bottom.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor).isActive = true
        scroll.snp.makeConstraints { make in
            make.top.equalTo(headerLine.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(bottom.snp.top)
        }
        form.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(16)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalToSuperview().offset(-16)
            make.width.equalToSuperview().offset(-2 * DS.Spacing.lg)
        }
    }

    // MARK: - Form pieces

    private func plainTitle(_ text: String) -> NSAttributedString {
        NSAttributedString(string: text, attributes: [
            NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.body),
            NSAttributedString.Key.foregroundColor: DS.Color.text,
        ])
    }

    /// "Tên cửa hàng *" with a red star
    private func requiredTitle(_ text: String) -> NSAttributedString {
        let title = NSMutableAttributedString(attributedString: plainTitle(text + " "))
        title.append(NSAttributedString(string: "*", attributes: [
            NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.body),
            NSAttributedString.Key.foregroundColor: V2.danger,
        ]))
        return title
    }

    private func styleBox(_ view: UIView) {
        view.layer.borderWidth = 1
        view.layer.borderColor = V2.border.cgColor
        view.layer.cornerRadius = 12
        view.backgroundColor = .white
    }

    private func field(_ title: NSAttributedString, _ input: UITextField, accessibility: String? = nil) -> UIView {
        let label = UILabel()
        label.attributedText = title
        label.numberOfLines = 0
        input.font = Utils.regularFont(size: DS.TextSize.input)
        input.textColor = DS.Color.text
        styleBox(input)
        input.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 14, height: 1))
        input.leftViewMode = .always
        input.rightView = UIView(frame: CGRect(x: 0, y: 0, width: 10, height: 1))
        input.rightViewMode = .always
        input.returnKeyType = .next
        input.accessibilityLabel = accessibility ?? title.string
        input.snp.makeConstraints { make in make.height.equalTo(52) }
        let stack = UIStackView(arrangedSubviews: [label, input])
        stack.axis = .vertical
        stack.spacing = 6
        return stack
    }

    private func pair(_ left: UIView, _ right: UIView) -> UIView {
        let row = UIStackView(arrangedSubviews: [left, right])
        row.distribution = .fillEqually
        row.alignment = .top
        row.spacing = 12
        return row
    }

    /// "ĐỊA CHỈ", "KHÁC (không bắt buộc)"
    private func sectionTitle(_ text: String, optional: Bool) -> UIView {
        let label = UILabel()
        let title = NSMutableAttributedString(string: text.uppercased(), attributes: [
            NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.secondary),
            NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
            NSAttributedString.Key.kern: 0.5,
        ])
        if optional {
            title.append(NSAttributedString(string: " " + "customers.v2.optional".localized(), attributes: [
                NSAttributedString.Key.font: Utils.regularFont(size: DS.TextSize.secondary),
                NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
            ]))
        }
        label.attributedText = title
        label.accessibilityTraits = UIAccessibilityTraitHeader
        return label
    }

    /// "Quốc gia": a row that opens the country picker
    private func countryBlock() -> UIView {
        let label = UILabel()
        label.attributedText = plainTitle("Country".localized())
        styleBox(countryButton)
        countryValue.isUserInteractionEnabled = false
        countryValue.lineBreakMode = .byTruncatingTail
        let chevron = UIImageView(image: DS.symbol("chevron.right", DS.Icon.sm, weight: .semibold))
        chevron.tintColor = UIColor(hexString: "94A3B8")
        chevron.isUserInteractionEnabled = false
        chevron.setContentHuggingPriority(.required, for: .horizontal)
        chevron.setContentCompressionResistancePriority(.required, for: .horizontal)
        let inner = UIStackView(arrangedSubviews: [countryValue, chevron])
        inner.alignment = .center
        inner.spacing = 6
        inner.isUserInteractionEnabled = false
        countryButton.addSubview(inner)
        inner.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(14)
            make.trailing.equalToSuperview().offset(-12)
            make.centerY.equalToSuperview()
        }
        countryButton.snp.makeConstraints { make in make.height.equalTo(52) }
        countryButton.addTarget(self, action: #selector(countryFieldTapped), for: .touchUpInside)
        countryButton.accessibilityTraits = UIAccessibilityTraitButton
        let stack = UIStackView(arrangedSubviews: [label, countryButton])
        stack.axis = .vertical
        stack.spacing = 6
        renderCountry()
        return stack
    }

    private func renderCountry() {
        let value = country.trimmingCharacters(in: .whitespacesAndNewlines)
        countryValue.text = value.isEmpty ? "Select country".localized() : value
        countryValue.textColor = value.isEmpty ? UIColor(hexString: "94A3B8") : DS.Color.text
        countryButton.accessibilityLabel = "\("Country".localized()), \(countryValue.text ?? "")"
    }

    /// "Mô tả": three lines, grows with the text
    private func descriptionBlock() -> UIView {
        let label = UILabel()
        label.attributedText = plainTitle("Description".localized())
        descriptionView.font = Utils.regularFont(size: DS.TextSize.input)
        descriptionView.textColor = DS.Color.text
        descriptionView.isScrollEnabled = false
        descriptionView.textContainerInset = UIEdgeInsets(top: 12, left: 10, bottom: 12, right: 10)
        descriptionView.accessibilityLabel = "Description".localized()
        descriptionView.delegate = self
        styleBox(descriptionView)
        descriptionView.addSubview(descriptionPlaceholder)
        descriptionPlaceholder.isUserInteractionEnabled = false
        descriptionPlaceholder.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.equalToSuperview().offset(15)
            make.width.equalToSuperview().offset(-30)
        }
        descriptionView.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(96) }
        let stack = UIStackView(arrangedSubviews: [label, descriptionView])
        stack.axis = .vertical
        stack.spacing = 6
        return stack
    }

    private func updateDescriptionPlaceholder() {
        descriptionPlaceholder.isHidden = !(descriptionView.text ?? "").isEmpty
    }

    // MARK: - Data

    override func setupData() {
        guard let user = User.account() else { return }

        outlet = user.outlet
        merchant = user.merchant

        // Prefer outlet data, fallback to merchant data
        storeNameField.text = outlet?.name ?? merchant?.name ?? ""
        addressField.text = outlet?.address ?? merchant?.address ?? ""
        cityField.text = outlet?.city ?? merchant?.city ?? ""
        stateField.text = outlet?.state ?? merchant?.state ?? ""
        country = outlet?.country ?? merchant?.country ?? ""
        zipCodeField.text = outlet?.zipCode ?? merchant?.zipCode ?? ""
        phoneField.text = outlet?.phone ?? merchant?.phone ?? ""
        descriptionView.text = outlet?.description ?? ""
        updateDescriptionPlaceholder()
    }

    // MARK: - Actions

    @objc private func close() {
        view.endEditing(true)
        if let nav = navigationController, nav.viewControllers.first !== self {
            nav.popViewController(animated: true)
        } else {
            dismiss(animated: true)
        }
    }

    @objc private func nameChanged() {
        showNameError(nil)
    }

    private func showNameError(_ text: String?) {
        nameError.text = text
        nameError.isHidden = text == nil
        storeNameField.layer.borderColor = (text == nil ? V2.border : V2.danger).cgColor
    }

    @objc private func countryFieldTapped() {
        view.endEditing(true)
        let pickerVC = CountryPickerViewController()
        pickerVC.delegate = self
        pickerVC.selectedCountry = country
        navigationController?.pushViewController(pickerVC, animated: true)
    }

    @objc private func saveButtonTapped() {
        // Validate required fields
        guard let storeName = storeNameField.text?.trimmingCharacters(in: .whitespacesAndNewlines),
              !storeName.isEmpty else {
            showNameError("Store name is required".localized())
            storeNameField.becomeFirstResponder()
            return
        }

        // Get outlet ID
        guard let user = User.account(),
              let outletId = user.outlet?.id ?? user.outletId else {
            UIAlertController.errorAlert(
                parent: self,
                error: NSError.errorWithOwnMessage(
                    message: "Outlet ID not found".localized(),
                    domain: "RC"
                )
            )
            return
        }

        // Prepare update data
        var updateData: [String: Any] = [
            "name": storeName
        ]

        func trimmed(_ text: String?) -> String? {
            guard let value = text?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else { return nil }
            return value
        }
        if let address = trimmed(addressField.text) { updateData["address"] = address }
        if let city = trimmed(cityField.text) { updateData["city"] = city }
        if let state = trimmed(stateField.text) { updateData["state"] = state }
        if let countryName = trimmed(self.country) { updateData["country"] = countryName }
        if let zipCode = trimmed(zipCodeField.text) { updateData["zipCode"] = zipCode }
        if let phone = trimmed(phoneField.text) { updateData["phone"] = phone }
        if let description = trimmed(descriptionView.text) { updateData["description"] = description }

        view.endEditing(true)
        saveButton.isEnabled = false
        showProgressText(text: "Updating store...".localized())

        // Call API to update outlet
        OutletService.shared.updateOutlet(outletId: outletId, withValues: updateData) { [weak self] (outlet: Outlet?, error: NSError?) in
            DispatchQueue.main.async {
                self?.hideProgress()
                self?.saveButton.isEnabled = true

                if let error = error {
                    UIAlertController.errorAlert(parent: self, error: error)
                } else if let outlet = outlet {
                    // Update local user data
                    if let user = User.account() {
                        user.outlet = outlet
                        User.save(user: user)
                    }

                    // Notify delegate
                    self?.delegate?.didUpdateStore()

                    // Dismiss
                    self?.dismiss(animated: true)
                }
            }
        }
    }
}

// MARK: - UITextFieldDelegate
extension EditStoreViewController: UITextFieldDelegate {
    func textFieldDidBeginEditing(_ textField: UITextField) {
        DispatchQueue.main.async { self.formScroll.revealFocusedField() }
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        // Name → phone → street → city → state → country picker; postal code → description
        if textField === storeNameField {
            phoneField.becomeFirstResponder()
        } else if textField === phoneField {
            addressField.becomeFirstResponder()
        } else if textField === addressField {
            cityField.becomeFirstResponder()
        } else if textField === cityField {
            stateField.becomeFirstResponder()
        } else if textField === stateField {
            countryFieldTapped()
        } else if textField === zipCodeField {
            descriptionView.becomeFirstResponder()
        } else {
            textField.resignFirstResponder()
        }
        return true
    }
}

// MARK: - UITextViewDelegate
extension EditStoreViewController: UITextViewDelegate {
    func textViewDidBeginEditing(_ textView: UITextView) {
        DispatchQueue.main.async { self.formScroll.revealFocusedField() }
    }

    func textViewDidChange(_ textView: UITextView) {
        updateDescriptionPlaceholder()
    }
}

// MARK: - CountryPickerViewControllerDelegate
extension EditStoreViewController: CountryPickerViewControllerDelegate {
    func didSelectCountry(country: String, sender: CountryPickerViewController) {
        self.country = country
    }
}
