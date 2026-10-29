//
//  EditStoreViewController.swift
//  POS ADBD
//
//  The shop / branch form (#484, board CH-sua; #1313): the v2 form of "Sửa khách hàng" (label above the field, no icons).
//  - shop (the owner): name (required), phone, tax id, ĐỊA CHỈ (street, ward / district, province), KHÁC (country, postal
//    code, description). Saves through `PUT /api/settings/merchant`; no website.
//  - branch: name (required), phone, address (required). Saves through `PUT /api/outlets?id=`. Read-only (no Lưu) for staff.
//

import UIKit
import SnapKit
import IQKeyboardManagerSwift

protocol EditStoreViewControllerDelegate: AnyObject {
    func didUpdateStore()
}

class EditStoreViewController: BaseViewControler {
    enum Kind { case shop, branch }

    // MARK: - Properties
    weak var delegate: EditStoreViewControllerDelegate?
    /// What the form edits
    var kind: Kind = .shop
    /// The branch being edited (kind `.branch`)
    var branch: Outlet?
    /// Fields and Lưu are off for a read-only view (staff)
    var editable = true
    var screenTitle = "Store Information".localized()
    /// Line under the title: "Thuộc cửa hàng …", "Bạn chỉ xem được mục này."
    var subtitle: String?

    // MARK: - UI Components
    private let storeNameField = UITextField()
    private let phoneField = UITextField()
    private let taxIdField = UITextField()
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
        let title = V2.label(screenTitle, size: 20, weight: .bold)
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
        taxIdField.keyboardType = .numbersAndPunctuation
        zipCodeField.keyboardType = .numberPad
        zipCodeField.placeholder = "700000"
        KeyboardDoneBar.attach([phoneField, taxIdField, zipCodeField])
        [storeNameField, phoneField, taxIdField, addressField, cityField, stateField, zipCodeField].forEach { $0.delegate = self }
        nameError.isHidden = true

        let isShop = kind == .shop
        let nameTitle = (isShop ? "shopinfo.shopName" : "shopinfo.branchName").localized()
        // The red star only where the form can be saved (read-only for staff)
        let nameBox = UIStackView(arrangedSubviews: [field(editable ? requiredTitle(nameTitle) : plainTitle(nameTitle), storeNameField,
                                                           accessibility: nameTitle), nameError])
        nameBox.axis = .vertical
        nameBox.spacing = 6

        let addressTitle = sectionTitle("Address".localized(), optional: false)
        let otherTitle = sectionTitle("store.v2.other".localized(), optional: true)
        var parts: [UIView] = []
        if let subtitle {
            parts.append(V2.label(subtitle, size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0))
        }
        parts += [nameBox, field(plainTitle("Phone Number".localized()), phoneField)]
        if isShop {
            parts += [
                field(plainTitle("shopinfo.taxId".localized()), taxIdField),
                addressTitle,
                field(plainTitle("store.v2.street".localized()), addressField),
                field(plainTitle("shopinfo.ward".localized()), stateField),
                field(plainTitle("shopinfo.province".localized()), cityField),
                otherTitle,
                countryBlock(),
                field(plainTitle("Postal Code".localized()), zipCodeField),
                descriptionBlock(),
            ]
        } else {
            parts.append(field(editable ? requiredTitle("Address".localized()) : plainTitle("Address".localized()), addressField,
                              accessibility: "Address".localized()))
        }
        let form = UIStackView(arrangedSubviews: parts)
        form.axis = .vertical
        form.spacing = 14
        // Section titles sit a little lower (board: padding-top 6)
        for title in [addressTitle, otherTitle] {
            if let index = parts.firstIndex(of: title), index > 0 { form.setCustomSpacing(20, after: parts[index - 1]) }
        }
        if !editable { setFieldsEnabled(false) }

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
        bottom.isHidden = !editable

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
        if !editable { bottom.snp.makeConstraints { make in make.height.equalTo(0) } }
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
        switch kind {
        case .shop:
            let merchant = user.merchant
            storeNameField.text = merchant?.name ?? ""
            phoneField.text = merchant?.phone ?? ""
            taxIdField.text = merchant?.taxId ?? ""
            addressField.text = merchant?.address ?? ""
            stateField.text = merchant?.state ?? ""
            cityField.text = merchant?.city ?? ""
            country = merchant?.country ?? ""
            zipCodeField.text = merchant?.zipCode ?? ""
            descriptionView.text = merchant?.description ?? ""
        case .branch:
            let outlet = branch ?? user.outlet
            storeNameField.text = outlet?.name ?? ""
            phoneField.text = outlet?.phone ?? ""
            addressField.text = outlet?.address ?? ""
        }
        updateDescriptionPlaceholder()
    }

    /// Read-only: the boxes look like the grey fields of the other read-only forms
    private func setFieldsEnabled(_ on: Bool) {
        [storeNameField, phoneField, taxIdField, addressField, cityField, stateField, zipCodeField].forEach {
            $0.isEnabled = on
            $0.textColor = on ? DS.Color.text : DS.Color.textMuted
            $0.backgroundColor = on ? .white : V2.sectionFill
        }
        countryButton.isEnabled = on
        descriptionView.isEditable = on
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
        guard editable else { return }
        switch kind {
        case .shop: saveShop()
        case .branch: saveBranch()
        }
    }

    private func saveShop() {
        let form = ShopFormValues(name: storeNameField.text ?? "", phone: phoneField.text ?? "", taxId: taxIdField.text ?? "",
                                  address: addressField.text ?? "", state: stateField.text ?? "", city: cityField.text ?? "",
                                  country: country, zipCode: zipCodeField.text ?? "", description: descriptionView.text ?? "")
        if ShopInfoLogic.problem(shop: form) != nil {
            showNameError("Store name is required".localized())
            storeNameField.becomeFirstResponder()
            return
        }
        view.endEditing(true)
        saveButton.isEnabled = false
        showProgressText(text: "Updating store...".localized())
        TabsV2APIService.shared.updateMerchantInfo(ShopInfoLogic.shopPayload(form)) { [weak self] saved, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                self.saveButton.isEnabled = true
                if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                if let user = User.account(), user.merchant != nil {
                    user.merchant?.name = saved?.name ?? form.name
                    user.merchant?.phone = saved?.phone
                    user.merchant?.taxId = saved?.taxId
                    user.merchant?.address = saved?.address
                    user.merchant?.state = saved?.state
                    user.merchant?.city = saved?.city
                    user.merchant?.country = saved?.country
                    user.merchant?.zipCode = saved?.zipCode
                    user.merchant?.description = saved?.description
                    User.save(user: user)
                }
                self.delegate?.didUpdateStore()
                self.close()
            }
        }
    }

    private func saveBranch() {
        let form = BranchFormValues(name: storeNameField.text ?? "", phone: phoneField.text ?? "", address: addressField.text ?? "")
        switch ShopInfoLogic.problem(branch: form) {
        case .nameRequired?:
            showNameError("Store name is required".localized())
            storeNameField.becomeFirstResponder()
            return
        case .addressRequired?:
            UIAlertController.errorAlert(parent: self, error: NSError.errorWithOwnMessage(message: "shopinfo.addressRequired".localized(), domain: "RC"))
            addressField.becomeFirstResponder()
            return
        case nil:
            break
        }
        // The owner picks a branch from the list; a branch manager edits the own one
        guard let outletId = branch?.id ?? User.account()?.outlet?.id ?? User.account()?.outletId else { return }
        view.endEditing(true)
        saveButton.isEnabled = false
        showProgressText(text: "Updating store...".localized())
        OutletService.shared.updateOutlet(outletId: outletId, withValues: ShopInfoLogic.branchPayload(form)) { [weak self] (outlet: Outlet?, error: NSError?) in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                self.saveButton.isEnabled = true
                if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                if let outlet, let user = User.account(), user.outlet?.id == outlet.id {
                    user.outlet = outlet
                    User.save(user: user)
                }
                self.delegate?.didUpdateStore()
                self.close()
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
        // Shop: name → phone → tax id → street → ward → province → country picker; postal code → description.
        // Branch: name → phone → address.
        if textField === storeNameField {
            phoneField.becomeFirstResponder()
        } else if textField === phoneField {
            (kind == .shop ? taxIdField : addressField).becomeFirstResponder()
        } else if textField === taxIdField {
            addressField.becomeFirstResponder()
        } else if textField === addressField {
            if kind == .shop { stateField.becomeFirstResponder() } else { textField.resignFirstResponder() }
        } else if textField === stateField {
            cityField.becomeFirstResponder()
        } else if textField === cityField {
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
