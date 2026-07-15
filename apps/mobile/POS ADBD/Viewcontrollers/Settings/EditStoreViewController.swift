import UIKit
import SnapKit

protocol EditStoreViewControllerDelegate: AnyObject {
    func didUpdateStore()
}

class EditStoreViewController: BaseViewControler {
    // MARK: - Properties
    weak var delegate: EditStoreViewControllerDelegate?
    private var outlet: Outlet?
    private var merchant: Merchant?
    
    // MARK: - UI Components
    private lazy var saveButton: RCPrimaryButton = {
        let button = RCPrimaryButton(
            title: "Update Store".localized(),
            backgroundColor: APP_TONE_COLOR
        )
        button.addTarget(self, action: #selector(saveButtonTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var scrollView: UIScrollView = {
        let sv = UIScrollView()
        sv.showsVerticalScrollIndicator = false
        return sv
    }()
    
    private lazy var containerView: UIView = {
        let view = UIView()
        return view
    }()
    
    private lazy var storeNameField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Store Name *".localized(),
            placeholder: "Enter store name".localized()
        )
        field.textField.setLeftIcon(UIImage(systemName: "storefront.fill"))
        field.textField.returnKeyType = .next
        field.setTitleColor(APP_TEXT_COLOR)
        // Enable auto-capitalization for store name
        field.textField.autocapitalizationType = .words
        field.textField.autocorrectionType = .no
        return field
    }()
    
    private lazy var addressField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Address".localized(),
            placeholder: "Enter street address".localized()
        )
        field.textField.setLeftIcon(UIImage(systemName: "mappin.circle.fill"))
        field.textField.returnKeyType = .next
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private lazy var cityField: LabeledTextField = {
        let field = LabeledTextField(
            title: "City".localized(),
            placeholder: "Enter city".localized()
        )
        field.textField.setLeftIcon(UIImage(systemName: "building.2.fill"))
        field.textField.returnKeyType = .next
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private lazy var stateField: LabeledTextField = {
        let field = LabeledTextField(
            title: "State/Province".localized(),
            placeholder: "Enter state or province".localized()
        )
        field.textField.setLeftIcon(UIImage(systemName: "map.fill"))
        field.textField.returnKeyType = .next
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private lazy var countryField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Country".localized(),
            placeholder: "Select country".localized()
        )
        field.textField.setLeftIcon(UIImage(systemName: "globe"))
        field.setTitleColor(APP_TEXT_COLOR)
        
        // Disable text field to prevent editing
        field.textField.isEnabled = false
        
        // Add right arrow icon to indicate it's tappable
        field.textField.setRightIcon(UIImage(systemName: "chevron.right"))
        
        return field
    }()
    
    private lazy var zipCodeField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Postal Code".localized(),
            placeholder: "Enter postal code".localized()
        )
        field.textField.setLeftIcon(UIImage(systemName: "number"))
        field.textField.returnKeyType = .next
        field.setTitleColor(APP_TEXT_COLOR)
        field.textField.keyboardType = .numberPad
        return field
    }()
    
    private lazy var phoneField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Phone Number".localized(),
            placeholder: "Enter phone number".localized()
        )
        field.textField.setLeftIcon(UIImage(systemName: "phone.fill"))
        field.textField.returnKeyType = .next
        field.setTitleColor(APP_TEXT_COLOR)
        field.textField.keyboardType = .phonePad
        return field
    }()
    
    private lazy var descriptionField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Description".localized(),
            placeholder: "Enter store description".localized()
        )
        field.textField.setLeftIcon(UIImage(systemName: "text.alignleft"))
        field.textField.returnKeyType = .done
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupData()
    }
    
    override func setupUI() {
        view.backgroundColor = .backgroundPrimary
        
        // Setup navigation bar
        let navBar = setupCustomNavigationBar(
            title: "Edit Store".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .custom { [weak self] in
                self?.dismiss(animated: true)
            }
        )
        navBar.setDismissButton() // Use X button for dismiss
        
        guard let customNavBar = customNavBar else { return }
        
        // Setup scroll view and save button
        view.addSubview(scrollView)
        view.addSubview(saveButton)
        scrollView.addSubview(containerView)
        
        // Create card container for all fields
        let fieldsCardContainer = UIView()
        fieldsCardContainer.backgroundColor = .white
        fieldsCardContainer.layer.cornerRadius = 10
        fieldsCardContainer.layer.borderWidth = 0.5
        fieldsCardContainer.layer.borderColor = UIColor.separator.withAlphaComponent(0.25).cgColor
        
        // Create inner stack for fields with separators
        let fieldsStack = UIStackView()
        fieldsStack.axis = .vertical
        fieldsStack.spacing = 0
        fieldsStack.distribution = .fill
        
        let allFields = [storeNameField, addressField, cityField, stateField, countryField, zipCodeField, phoneField, descriptionField]
        
        // Add each field with wrapper view for padding - title and value on same row
        for (index, field) in allFields.enumerated() {
            let fieldWrapper = UIView()
            
            // Create horizontal stack for title and value
            let rowStack = UIStackView()
            rowStack.axis = .horizontal
            rowStack.spacing = 12
            rowStack.alignment = .center
            rowStack.distribution = .fill
            
            // Title label
            let titleLabel = UILabel()
            titleLabel.text = field.titleLabel.text
            titleLabel.font = Utils.regularFont(size: 16) // Match AccountViewController
            titleLabel.textColor = .label
            titleLabel.setContentHuggingPriority(.defaultHigh, for: .horizontal)
            
            // Use existing textField with disabled padding for clean right alignment
            let valueTextField = field.textField
            valueTextField.font = Utils.regularFont(size: 16) // Match AccountViewController
            valueTextField.textAlignment = .right
            valueTextField.setContentHuggingPriority(.defaultLow, for: .horizontal)
            
            // Remove border, icon, and padding for clean right alignment
            valueTextField.layer.borderWidth = 0
            valueTextField.layer.borderColor = UIColor.clear.cgColor
            valueTextField.backgroundColor = .clear
            valueTextField.leftView = nil
            valueTextField.leftViewMode = .never
            valueTextField.rightView = nil
            valueTextField.rightViewMode = .never
            
            // Special handling for countryField - add chevron and make whole row tappable
            if field == countryField {
                // Add chevron icon
                let chevronIcon = UIImageView(image: UIImage(systemName: "chevron.right"))
                chevronIcon.tintColor = .systemGray3
                chevronIcon.contentMode = .scaleAspectFit
                chevronIcon.setContentHuggingPriority(.required, for: .horizontal)
                
                rowStack.addArrangedSubview(titleLabel)
                rowStack.addArrangedSubview(valueTextField)
                rowStack.addArrangedSubview(chevronIcon)
                
                // Make the whole wrapper tappable
                let tapGesture = UITapGestureRecognizer(target: self, action: #selector(countryFieldTapped))
                fieldWrapper.addGestureRecognizer(tapGesture)
                fieldWrapper.isUserInteractionEnabled = true
            } else {
                rowStack.addArrangedSubview(titleLabel)
                rowStack.addArrangedSubview(valueTextField)
            }
            
            fieldWrapper.addSubview(rowStack)
            rowStack.snp.makeConstraints { make in
                make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16))
                make.height.greaterThanOrEqualTo(44)
            }
            
            fieldsStack.addArrangedSubview(fieldWrapper)
            
            // Add separator after each field except the last one
            if index < allFields.count - 1 {
                let separator = UIView()
                separator.backgroundColor = UIColor.separator.withAlphaComponent(0.25)
                fieldsStack.addArrangedSubview(separator)
                separator.snp.makeConstraints { make in
                    make.height.equalTo(0.5)
                }
            }
        }
        
        fieldsCardContainer.addSubview(fieldsStack)
        fieldsStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        containerView.addSubview(fieldsCardContainer)
        
        // Save button constraints
        saveButton.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(20)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-20)
            make.height.equalTo(50)
        }
        
        // ScrollView constraints
        scrollView.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(saveButton.snp.top).offset(-16)
        }
        
        // ContainerView constraints - CRITICAL for scrollView content size
        containerView.snp.makeConstraints { make in
            make.top.leading.trailing.bottom.equalToSuperview()
            make.width.equalToSuperview() // This ensures horizontal scrolling is disabled
        }
        
        // Fields card container constraints
        fieldsCardContainer.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(16)
            make.leading.equalToSuperview().offset(12)
            make.trailing.equalToSuperview().offset(-12)
            make.bottom.equalToSuperview().offset(-16)
        }
        
        // Setup text field delegates
        setupTextFieldDelegates()
    }
    
    override func setupData() {
        guard let user = User.account() else { return }
        
        outlet = user.outlet
        merchant = user.merchant
        
        // Prefer outlet data, fallback to merchant data
        let storeName = outlet?.name ?? merchant?.name ?? ""
        let address = outlet?.address ?? merchant?.address ?? ""
        let city = outlet?.city ?? merchant?.city ?? ""
        let state = outlet?.state ?? merchant?.state ?? ""
        let country = outlet?.country ?? merchant?.country ?? ""
        let zipCode = outlet?.zipCode ?? merchant?.zipCode ?? ""
        let phone = outlet?.phone ?? merchant?.phone ?? ""
        let description = outlet?.description ?? ""
        
        storeNameField.textField.text = storeName
        addressField.textField.text = address
        cityField.textField.text = city
        stateField.textField.text = state
        countryField.textField.text = country
        zipCodeField.textField.text = zipCode
        phoneField.textField.text = phone
        descriptionField.textField.text = description
    }
    
    private func setupTextFieldDelegates() {
        storeNameField.textField.delegate = self
        addressField.textField.delegate = self
        cityField.textField.delegate = self
        stateField.textField.delegate = self
        countryField.textField.delegate = self // Add delegate to intercept tap
        zipCodeField.textField.delegate = self
        phoneField.textField.delegate = self
        descriptionField.textField.delegate = self
    }
    
    @objc private func countryFieldTapped() {
        let pickerVC = CountryPickerViewController()
        pickerVC.delegate = self
        pickerVC.selectedCountry = countryField.textField.text
        navigationController?.pushViewController(pickerVC, animated: true)
    }
    
    // MARK: - Actions
    @objc private func saveButtonTapped() {
        // Validate required fields
        guard let storeName = storeNameField.textField.text?.trimmingCharacters(in: .whitespacesAndNewlines),
              !storeName.isEmpty else {
            storeNameField.errorMessage = "Store name is required".localized()
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
        
        if let address = addressField.textField.text?.trimmingCharacters(in: .whitespacesAndNewlines), !address.isEmpty {
            updateData["address"] = address
        }
        
        if let city = cityField.textField.text?.trimmingCharacters(in: .whitespacesAndNewlines), !city.isEmpty {
            updateData["city"] = city
        }
        
        if let state = stateField.textField.text?.trimmingCharacters(in: .whitespacesAndNewlines), !state.isEmpty {
            updateData["state"] = state
        }
        
        if let country = countryField.textField.text?.trimmingCharacters(in: .whitespacesAndNewlines), !country.isEmpty {
            updateData["country"] = country
        }
        
        if let zipCode = zipCodeField.textField.text?.trimmingCharacters(in: .whitespacesAndNewlines), !zipCode.isEmpty {
            updateData["zipCode"] = zipCode
        }
        
        if let phone = phoneField.textField.text?.trimmingCharacters(in: .whitespacesAndNewlines), !phone.isEmpty {
            updateData["phone"] = phone
        }
        
        if let description = descriptionField.textField.text?.trimmingCharacters(in: .whitespacesAndNewlines), !description.isEmpty {
            updateData["description"] = description
        }
        
        // Show progress
        showProgressText(text: "Updating store...".localized())
        
        // Call API to update outlet
        OutletService.shared.updateOutlet(outletId: outletId, withValues: updateData) { [weak self] (outlet: Outlet?, error: NSError?) in
            DispatchQueue.main.async {
                self?.hideProgress()
                
                if let error = error {
                    UIAlertController.errorAlert(parent: self, error: error)
                } else if let outlet = outlet {
                    // Update local user data
                    if let user = User.account() {
                        // Update outlet in user object
                        // Note: Outlet is a struct, so we need to create a new instance
                        // In production, you might want to reload user profile from API
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
    
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        // Move to next field
        if textField == storeNameField.textField {
            addressField.textField.becomeFirstResponder()
        } else if textField == addressField.textField {
            cityField.textField.becomeFirstResponder()
        } else if textField == cityField.textField {
            stateField.textField.becomeFirstResponder()
        } else if textField == stateField.textField {
            countryFieldTapped() // Open country picker instead of next field
        } else if textField == zipCodeField.textField {
            phoneField.textField.becomeFirstResponder()
        } else if textField == phoneField.textField {
            descriptionField.textField.becomeFirstResponder()
        } else {
            textField.resignFirstResponder()
        }
        return true
    }
    
    func textFieldDidBeginEditing(_ textField: UITextField) {
        // Clear error when user starts editing
        if let field = [storeNameField, addressField, cityField, stateField, zipCodeField, phoneField, descriptionField]
            .first(where: { $0.textField == textField }) {
            field.errorMessage = nil
        }
    }
}

// MARK: - CountryPickerViewControllerDelegate
extension EditStoreViewController: CountryPickerViewControllerDelegate {
    func didSelectCountry(country: String, sender: CountryPickerViewController) {
        countryField.textField.text = country
    }
}

