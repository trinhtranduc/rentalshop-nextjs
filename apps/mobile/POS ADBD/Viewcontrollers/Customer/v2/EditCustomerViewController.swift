//
//  EditCustomerViewController.swift
//  POS ADBD
//
//  "Sửa khách hàng" (#387, flag `newCustomers`, board KH-sua): phone and name required, then optional email,
//  address, ID number, date of birth and notes. Loads `GET /api/customers/{id}`, saves through
//  `PUT /api/customers/{id}`. A phone that belongs to another customer is shown under the phone field.
//

import UIKit
import SnapKit
import IQKeyboardManagerSwift

final class EditCustomerViewController: BaseViewControler {
    private let customerId: Int
    private let dataSource: CustomersV2DataSource
    private let phoneField = UITextField()
    private let nameField = UITextField()
    private let emailField = UITextField()
    private let addressField = UITextField()
    private let idField = UITextField()
    private let dobField = UITextField()
    private let notesField = UITextField()
    private let phoneError = V2.label(size: DS.TextSize.secondary, color: V2.danger, lines: 0)
    private let saveButton = V2.primaryButton("Save".localized())
    private let cancelButton = V2.secondaryButton("customers.v2.cancel".localized())
    private let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)
    private var keyboardManagerWasEnabled = true
    private let formScroll = CustomerFormScrollView()

    /// Called after a successful save (the detail reloads itself)
    var onSaved: (() -> Void)?

    init(customerId: Int, dataSource: CustomersV2DataSource = LiveCustomersV2DataSource()) {
        self.customerId = customerId
        self.dataSource = dataSource
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        load()
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
        let back = CustomersV2UI.iconButton("chevron.left", label: "products.cart.back".localized(), size: DS.Icon.lg)
        back.addTarget(self, action: #selector(close), for: .touchUpInside)
        let title = V2.label("customers.v2.editTitle".localized(), size: 20, weight: .bold)
        let header = UIStackView(arrangedSubviews: [back, title])
        header.alignment = .center
        header.spacing = 4
        let headerLine = V2.divider()
        headerLine.backgroundColor = DS.Color.border

        phoneField.keyboardType = .phonePad
        nameField.autocapitalizationType = .words
        emailField.keyboardType = .emailAddress
        emailField.autocapitalizationType = .none
        emailField.autocorrectionType = .no
        emailField.placeholder = "customers.v2.emailPlaceholder".localized()
        dobField.placeholder = "dd/MM/yyyy"
        dobField.keyboardType = .numbersAndPunctuation
        [phoneField, nameField, emailField, addressField, idField, dobField, notesField].forEach { $0.delegate = self }
        phoneField.addTarget(self, action: #selector(phoneChanged), for: .editingChanged)
        phoneError.isHidden = true

        let phoneBox = UIStackView(arrangedSubviews: [field("customers.v2.phone".localized(), phoneField), phoneError])
        phoneBox.axis = .vertical
        phoneBox.spacing = 6

        let extraTitle = UILabel()
        let extra = NSMutableAttributedString(string: "customers.v2.moreInfo".localized().uppercased(), attributes: [
            NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.secondary),
            NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
            NSAttributedString.Key.kern: 0.5,
        ])
        extra.append(NSAttributedString(string: " " + "customers.v2.optional".localized(), attributes: [
            NSAttributedString.Key.font: Utils.regularFont(size: DS.TextSize.secondary),
            NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
        ]))
        extraTitle.attributedText = extra

        let pair = UIStackView(arrangedSubviews: [field("customers.v2.idNumber".localized(), idField),
                                                  field("customers.v2.dateOfBirth".localized(), dobField)])
        pair.distribution = .fillEqually
        pair.spacing = 12

        let form = UIStackView(arrangedSubviews: [
            phoneBox,
            field("customers.v2.name".localized(), nameField),
            extraTitle,
            field("Email".localized(), emailField),
            field("customers.v2.address".localized(), addressField),
            pair,
            field("customers.v2.note".localized(), notesField),
        ])
        form.axis = .vertical
        form.spacing = 14
        form.setCustomSpacing(20, after: form.arrangedSubviews[1])

        let scroll = formScroll
        scroll.keyboardDismissMode = .interactive
        scroll.addSubview(form)

        let bottom = UIView()
        bottom.backgroundColor = .white
        let bottomLine = V2.divider()
        bottomLine.backgroundColor = DS.Color.border
        cancelButton.addTarget(self, action: #selector(close), for: .touchUpInside)
        saveButton.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)
        let buttons = UIStackView(arrangedSubviews: [cancelButton, saveButton])
        buttons.spacing = 12
        cancelButton.setContentHuggingPriority(.required, for: .horizontal)
        cancelButton.contentEdgeInsets = UIEdgeInsets(top: 0, left: 20, bottom: 0, right: 20)
        [bottomLine, buttons].forEach(bottom.addSubview)

        [header, headerLine, scroll, bottom, spinner].forEach(view.addSubview)
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
        spinner.snp.makeConstraints { make in make.center.equalTo(scroll) }
    }

    private func field(_ title: String, _ input: UITextField) -> UIView {
        let label = V2.label(title, size: DS.TextSize.body, weight: .bold)
        input.font = Utils.regularFont(size: DS.TextSize.input)
        input.textColor = DS.Color.text
        input.layer.borderWidth = 1
        input.layer.borderColor = V2.border.cgColor
        input.layer.cornerRadius = 12
        input.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 14, height: 1))
        input.leftViewMode = .always
        input.returnKeyType = .next
        input.accessibilityLabel = title
        input.snp.makeConstraints { make in make.height.equalTo(52) }
        let stack = UIStackView(arrangedSubviews: [label, input])
        stack.axis = .vertical
        stack.spacing = 6
        return stack
    }

    // MARK: - Data

    private func load() {
        spinner.startAnimating()
        saveButton.isEnabled = false
        dataSource.loadProfile(customerId: customerId) { [weak self] profile, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.spinner.stopAnimating()
                if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                guard let profile else { return }
                let form = CustomerEditLogic.form(from: profile)
                self.phoneField.text = form.phone
                self.nameField.text = form.name
                self.emailField.text = form.email
                self.addressField.text = form.address
                self.idField.text = form.idNumber
                self.dobField.text = form.dateOfBirth
                self.notesField.text = form.notes
                self.saveButton.isEnabled = true
            }
        }
    }

    private var currentForm: CustomerEditForm {
        CustomerEditForm(phone: phoneField.text ?? "", name: nameField.text ?? "", email: emailField.text ?? "",
                         address: addressField.text ?? "", idNumber: idField.text ?? "",
                         dateOfBirth: dobField.text ?? "", notes: notesField.text ?? "")
    }

    // MARK: - Actions

    @objc private func close() {
        if let nav = navigationController, nav.viewControllers.first !== self {
            nav.popViewController(animated: true)
        } else {
            dismiss(animated: true)
        }
    }

    @objc private func phoneChanged() {
        showPhoneError(nil)
    }

    private func showPhoneError(_ text: String?) {
        phoneError.text = text
        phoneError.isHidden = text == nil
        phoneField.layer.borderColor = (text == nil ? V2.border : V2.danger).cgColor
    }

    @objc private func saveTapped() {
        let form = currentForm
        if let problem = CustomerEditLogic.validate(form) {
            switch problem {
            case .missingPhone:
                showPhoneError("customers.v2.needPhone".localized())
                phoneField.becomeFirstResponder()
            case .missingName:
                UIAlertController.alert(parent: self, title: "Error".localized(), message: "customers.v2.needName".localized())
            case .badEmail:
                UIAlertController.alert(parent: self, title: "Error".localized(), message: "customers.v2.badEmail".localized())
            case .badDate:
                UIAlertController.alert(parent: self, title: "Error".localized(), message: "customers.v2.badDate".localized())
            }
            return
        }
        view.endEditing(true)
        saveButton.isEnabled = false
        showProgressText(text: "Loading...".localized())
        dataSource.updateCustomer(customerId: customerId, params: CustomerEditLogic.updatePayload(form)) { [weak self] error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                self.saveButton.isEnabled = true
                if let error {
                    if error.code == 409 {
                        self.showPhoneError("customers.v2.phoneTaken".localized())
                    } else {
                        UIAlertController.errorAlert(parent: self, error: error)
                    }
                    return
                }
                self.onSaved?()
                self.close()
            }
        }
    }
}

extension EditCustomerViewController: UITextFieldDelegate {
    func textFieldDidBeginEditing(_ textField: UITextField) {
        DispatchQueue.main.async { self.formScroll.revealFocusedField() }
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        let order: [UITextField] = [phoneField, nameField, emailField, addressField, idField, dobField, notesField]
        if let index = order.firstIndex(where: { $0 === textField }), index + 1 < order.count {
            order[index + 1].becomeFirstResponder()
        } else {
            textField.resignFirstResponder()
        }
        return true
    }
}
