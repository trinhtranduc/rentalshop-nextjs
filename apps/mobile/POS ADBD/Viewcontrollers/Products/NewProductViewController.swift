import Foundation
import UIKit
import GestureRecognizerClosures
import Kingfisher
import SnapKit

protocol NewProductViewControllerDelegate {
    func didAddNewProduct(product: Product)
    func didUpdateProduct(product: Product)
}

class NewProductViewController: BaseViewControler {
    // MARK: - Properties
    var delegate: NewProductViewControllerDelegate?
    private var product: Product?
    var code: String?
    private var selectedImage: UIImage? // Property to store the selected image
    
    // MARK: - UI Components
    private lazy var saveNavButton: UIButton = {
        let button = UIButton(type: .system)
        let title = product == nil ? "Add".localized() : "Update".localized()
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: 17)
        button.setTitleColor(APP_TONE_COLOR, for: .normal)
        button.addTarget(self, action: #selector(save), for: .touchUpInside)
        return button
    }()
    
    // Add UIImagePickerController
    private lazy var imagePickerController: UIImagePickerController = {
        let picker = UIImagePickerController()
        picker.delegate = self
        picker.allowsEditing = true
        picker.sourceType = .photoLibrary
        return picker
    }()
    
    // MARK: - UI Components
    private lazy var scrollView: UIScrollView = {
        let sv = UIScrollView()
        sv.showsVerticalScrollIndicator = false
        return sv
    }()
    
    private lazy var containerView: UIView = {
        let view = UIView()
        return view
    }()
    
    private lazy var img: UIImageView = {
        let iv = UIImageView()
        iv.contentMode = .scaleAspectFill
        iv.clipsToBounds = true
        iv.layer.cornerRadius = 5
        iv.backgroundColor = .systemGray6
        iv.isUserInteractionEnabled = true
        
        // Add camera icon overlay
        let cameraIcon = UIImageView(image: UIImage(systemName: "camera.fill"))
        cameraIcon.tintColor = .systemGray3
        cameraIcon.contentMode = .scaleAspectFit
        iv.addSubview(cameraIcon)
        
        // Center the camera icon using SnapKit
        cameraIcon.snp.makeConstraints { make in
            make.center.equalToSuperview()
            make.width.height.equalTo(40)
        }
        
        // Add tap gesture
        let tap = UITapGestureRecognizer(target: self, action: #selector(addImage))
        iv.addGestureRecognizer(tap)
        
        return iv
    }()
    
    private lazy var nameField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Product name *".localized(),
            placeholder: "Enter product name".localized()
        )
        field.textField.setLeftIcon(UIImage(systemName: "tag.fill"))
        field.setTitleColor(APP_TEXT_COLOR)
        // Enable auto-capitalization for product name
        field.textField.autocapitalizationType = .words
        field.textField.autocorrectionType = .no
//        field.textField.font = Utils.regularFont(size: 16)
//        field.titleLabel.font = Utils.mediumFont(size: 14)
        return field
    }()
    
    private lazy var quantityField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Quantity".localized(),
            placeholder: "Enter quantity (optional)".localized()
        )
        field.textField.keyboardType = .numberPad
        field.textField.setLeftIcon(UIImage(systemName: "number.square.fill"))
        field.setTitleColor(APP_TEXT_COLOR)
//        field.textField.font = Utils.regularFont(size: 16)
//        field.titleLabel.font = Utils.mediumFont(size: 14)
        return field
    }()
    
    private lazy var rentField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Rent Price / rental *".localized(),
            placeholder: "Enter price per rental".localized()
        )
        field.textField.keyboardType = .decimalPad
        field.textField.setLeftIcon(UIImage(systemName: "dollarsign.square.fill"))
        field.setTitleColor(APP_TEXT_COLOR)
//        field.textField.font = Utils.regularFont(size: 16)
//        field.titleLabel.font = Utils.mediumFont(size: 14)
        return field
    }()

    // Optional per-day rental price (creates a DAILY pricing option when > 0)
    private lazy var dailyPriceField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Rent Price / day".localized(),
            placeholder: "Enter price per day (optional)".localized()
        )
        field.textField.keyboardType = .decimalPad
        field.textField.setLeftIcon(UIImage(systemName: "calendar"))
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()

    private lazy var saleField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Sale Price".localized(),
            placeholder: "Enter sale price (optional)".localized()
        )
        field.textField.keyboardType = .decimalPad
        field.textField.setLeftIcon(UIImage(systemName: "dollarsign.circle.fill"))
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private lazy var costPriceField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Cost Price".localized(),
            placeholder: "Enter cost price (optional)".localized()
        )
        field.textField.keyboardType = .decimalPad
        field.textField.setLeftIcon(UIImage(systemName: "dollarsign.square"))
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private lazy var depositField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Deposit Price".localized(),
            placeholder: "Enter deposit price (optional)".localized()
        )
        field.textField.keyboardType = .decimalPad
        field.textField.setLeftIcon(UIImage(systemName: "lock.fill"))
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private lazy var barcodeField: LabeledTextField = {
        let field = LabeledTextField(
            title: "Barcode".localized(),
            placeholder: "Enter barcode (optional)".localized()
        )
        if let barcodeIcon = UIImage(systemName: "barcode") {
            field.textField.setLeftIcon(barcodeIcon)
        }
        field.setTitleColor(APP_TEXT_COLOR)
//        field.textField.font = Utils.regularFont(size: 16)
//        field.titleLabel.font = Utils.mediumFont(size: 14)
        return field
    }()
    
    private lazy var stackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 16
        stack.distribution = .fill
        return stack
    }()
    
    private lazy var saveButton: RCPrimaryButton = {
        let button = RCPrimaryButton(
            title: product == nil ? "Add Product".localized() : "Update Product".localized(),
            backgroundColor: APP_TONE_COLOR
        )
        button.addTarget(self, action: #selector(save), for: .touchUpInside)
        return button
    }()
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupNavigationBar()
        setupUI()
        setupData()
        loadInitialData()
    }
    
    // MARK: - Setup
    override func setupUI() {
        view.backgroundColor = .backgroundPrimary
        
        guard let customNavBar = customNavBar else { return }
        
        view.addSubview(scrollView)
        view.addSubview(saveButton)
        scrollView.addSubview(containerView)
        
        // Create card container for image
        let imageCardContainer = UIView()
        imageCardContainer.backgroundColor = .white
        imageCardContainer.layer.cornerRadius = 10
        imageCardContainer.layer.borderWidth = 0.5
        imageCardContainer.layer.borderColor = UIColor.separator.withAlphaComponent(0.25).cgColor
        imageCardContainer.addSubview(img)
        containerView.addSubview(imageCardContainer)
        
        // Create one card container for all fields
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
        
        let allFields = [nameField, rentField, dailyPriceField, quantityField, saleField, costPriceField, depositField, barcodeField]
        
        // Add each field with wrapper view for padding - title and value on same row
        for (index, field) in allFields.enumerated() {
            let fieldWrapper = UIView()
            
            // Create horizontal stack for title and value
            let rowStack = UIStackView()
            rowStack.axis = .horizontal
            rowStack.spacing = 12
            rowStack.alignment = .center
            rowStack.distribution = .fill
            
            // Title label with required indicator
            let titleLabel = UILabel()
            let titleText = field.titleLabel.text ?? ""
            titleLabel.text = titleText
            titleLabel.font = Utils.regularFont(size: 16) // Match AccountViewController
            titleLabel.textColor = .label
            titleLabel.setContentHuggingPriority(.defaultHigh, for: .horizontal)
            
            // Add red asterisk for required fields (fields with * in title)
            if titleText.contains("*") {
                let attributedText = NSMutableAttributedString(string: titleText)
                let asteriskRange = (titleText as NSString).range(of: "*")
                if asteriskRange.location != NSNotFound {
                    attributedText.addAttribute(.foregroundColor, value: UIColor.systemRed, range: asteriskRange)
                }
                titleLabel.attributedText = attributedText
            }
            
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
            //valueTextField.disablePadding = true // Disable padding for right alignment
            
            rowStack.addArrangedSubview(titleLabel)
            rowStack.addArrangedSubview(valueTextField)
            
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
        
        // Image card container constraints
        imageCardContainer.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(5)
            make.centerX.equalToSuperview()
            make.width.height.equalTo(182) // 150 + 16*2 padding
        }
        
        // Image constraints (inside card)
        img.snp.remakeConstraints { make in
            make.center.equalToSuperview()
            make.width.height.equalTo(150)
        }
        
        // Fields card container constraints
        fieldsCardContainer.snp.makeConstraints { make in
            make.top.equalTo(imageCardContainer.snp.bottom).offset(16)
            make.leading.equalToSuperview().offset(12)
            make.trailing.equalToSuperview().offset(-12)
            make.bottom.equalToSuperview().offset(-16)
        }
        
        // Update button title when product changes
        if product != nil {
            saveButton.setButtonTitle("Update Product".localized())
        }
        
        // Setup delegates and text change monitoring
        [nameField, barcodeField, quantityField, costPriceField, rentField, dailyPriceField, saleField, depositField].forEach { field in
            field.textField.delegate = self
            field.textField.addTarget(self, action: #selector(textFieldDidChange(_:)), for: .editingChanged)
        }
        
        // Configure number formatting for quantity, cost price, rent, sale, and deposit fields
        [quantityField, costPriceField, rentField, dailyPriceField, saleField, depositField].forEach { field in
            field.textField.configureNumberFormatting()
        }
    }
    
    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        let title = product == nil ? "Add product".localized() : "Update product".localized()
        let navBar = setupCustomNavigationBar(
            title: title,
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .custom { [weak self] in
                self?.dismiss(animated: true)
            }
        )
        navBar.setDismissButton() // Use X button for dismiss
    }
    
    override func setupData() {
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        view.addGestureRecognizer(tapGesture)
    }
    
    private func loadInitialData() {
        if let product = product {
            // Update title and button
            customNavBar?.title = "Update product".localized()
            saveNavButton.setTitle("Update".localized(), for: .normal)
            
            nameField.textField.text = product.name
            barcodeField.textField.text = product.barcode
            quantityField.textField.text = (product.totalStock ?? product.quantity).formatStringInCommon()
            
            // Load cost price with formatting
            if let costPrice = product.costPrice {
                costPriceField.textField.text = costPrice.formatStringInCommon()
            } else {
                costPriceField.textField.text = ""
            }
            
            rentField.textField.text = product.rent.formatStringInCommon()
            if let salePrice = product.salePrice {
                saleField.textField.text = salePrice.formatStringInCommon()
            } else {
                saleField.textField.text = ""
            }
            
            // Load deposit with formatting
            if let deposit = product.deposit {
                depositField.textField.text = deposit.formatStringInCommon()
            } else {
                depositField.textField.text = ""
            }

            // Populate pricing options (per-rental + per-day)
            if let options = product.pricingOptions, !options.isEmpty {
                if let fixedOpt = options.first(where: { $0.type.uppercased() == "FIXED" }) {
                    rentField.textField.text = fixedOpt.price.formatStringInCommon()
                }
                if let dailyOpt = options.first(where: { $0.type.uppercased() == "DAILY" }) {
                    dailyPriceField.textField.text = dailyOpt.price.formatStringInCommon()
                }
            }

            if let url = product.image_url {
                let processor = RoundCornerImageProcessor(cornerRadius: 5)
                img.kf.setImage(with: URL(string: url), 
                              options: [.processor(processor),
                                      .transition(.fade(0.1))]) { [weak self] result in
                    // Hide camera icon when image is loaded
                    self?.img.subviews.first?.isHidden = true
                }
            }
        } else {
            // Update title and button
            customNavBar?.title = "Add product".localized()
            saveNavButton.setTitle("Add".localized(), for: .normal)
            
            barcodeField.textField.text = ""
        }
    }
    
    // MARK: - Validation
    private func validateField(_ field: LabeledTextField, value: String?) -> Bool {
        field.clearError()

        let text = (value ?? "").trimmingCharacters(in: .whitespacesAndNewlines)

        if field == nameField || field == rentField {
            guard !text.isEmpty else {
                field.showError("This field is required".localized())
                return false
            }
        } else if text.isEmpty {
            return true
        }

        switch field {
        case quantityField:
            guard let quantity = Int(text.formatStringRemoveCommon()), quantity >= 0 else {
                field.showError("Quantity must be greater than or equal to 0".localized())
                return false
            }
        case rentField:
            guard let price = Double(text.formatStringRemoveCommon()), price > 0 else {
                field.showError("Rent price must be greater than 0".localized())
                return false
            }
        case dailyPriceField:
            guard let price = Double(text.formatStringRemoveCommon()), price > 0 else {
                field.showError("Daily price must be greater than 0".localized())
                return false
            }
        case saleField:
            guard let price = Double(text.formatStringRemoveCommon()), price >= 0 else {
                field.showError("Sale price must be greater than or equal to 0".localized())
                return false
            }
        case costPriceField:
            guard let price = Double(text.formatStringRemoveCommon()), price >= 0 else {
                field.showError("Cost price must be greater than or equal to 0".localized())
                return false
            }
        case depositField:
            guard let price = Double(text.formatStringRemoveCommon()), price >= 0 else {
                field.showError("Deposit price must be greater than or equal to 0".localized())
                return false
            }
        default:
            break
        }
        
        return true
    }
    
    private func validateInputs() -> Bool {
        let isNameValid = validateField(nameField, value: nameField.textField.text)
        let isBarcodeValid = validateField(barcodeField, value: barcodeField.textField.text)
        let isQuantityValid = validateField(quantityField, value: quantityField.textField.text)
        let isCostPriceValid = validateField(costPriceField, value: costPriceField.textField.text)
        let isRentValid = validateField(rentField, value: rentField.textField.text)
        let isDailyPriceValid = validateField(dailyPriceField, value: dailyPriceField.textField.text)
        let isSaleValid = validateField(saleField, value: saleField.textField.text)
        let isDepositValid = validateField(depositField, value: depositField.textField.text)
        
        // Image is now optional - no validation required
        // Users can create products without images
        
        return isNameValid && isBarcodeValid && isQuantityValid && isCostPriceValid && isRentValid && isDailyPriceValid && isSaleValid && isDepositValid
    }
    
    // MARK: - Public Methods
    func loadProduct(product: Product) {
        self.product = product
        
        // Load product data into UI
        nameField.textField.text = product.name
        barcodeField.textField.text = product.barcode
        quantityField.textField.text = (product.totalStock ?? product.quantity).formatStringInCommon()
        
        if let costPrice = product.costPrice {
            costPriceField.textField.text = costPrice.formatStringInCommon()
        } else {
            costPriceField.textField.text = ""
        }
        
        rentField.textField.text = product.rent.formatStringInCommon()
        if let salePrice = product.salePrice {
            saleField.textField.text = salePrice.formatStringInCommon()
        } else {
            saleField.textField.text = ""
        }
        
        if let deposit = product.deposit {
            depositField.textField.text = deposit.formatStringInCommon()
        } else {
            depositField.textField.text = ""
        }

        // Populate pricing options (per-rental + per-day)
        if let options = product.pricingOptions, !options.isEmpty {
            if let fixedOpt = options.first(where: { $0.type.uppercased() == "FIXED" }) {
                rentField.textField.text = fixedOpt.price.formatStringInCommon()
            }
            if let dailyOpt = options.first(where: { $0.type.uppercased() == "DAILY" }) {
                dailyPriceField.textField.text = dailyOpt.price.formatStringInCommon()
            }
        }

        // Load image if available
        if let imageUrl = product.image_url, !imageUrl.isEmpty {
            let processor = RoundCornerImageProcessor(cornerRadius: 5)
            img.kf.setImage(with: URL(string: imageUrl), 
                          options: [.processor(processor),
                                  .transition(.fade(0.1))]) { [weak self] result in
                // Hide camera icon when image is loaded
                self?.img.subviews.first?.isHidden = true
            }
        }
    }
    
    // Method to set the product image from an external source (like MainViewController)
    func setProductImage(_ image: UIImage) {
        img.image = image
        // Store the image for later upload
        selectedImage = image
    }
    
    // MARK: - Pricing Options Helpers

    /// Build pricing options from the price fields.
    /// Per-rental is always the default. Per-day is added only when provided.
    private func buildPricingOptions() -> [PricingOptionRequest] {
        let rentVal = Double((rentField.textField.text ?? "").formatStringRemoveCommon()) ?? 0
        let dailyVal = Double((dailyPriceField.textField.text ?? "").formatStringRemoveCommon()) ?? 0

        var options: [PricingOptionRequest] = []
        if rentVal > 0 {
            options.append(PricingOptionRequest(type: "FIXED", price: rentVal, isDefault: true))
        }
        if dailyVal > 0 {
            options.append(PricingOptionRequest(type: "DAILY", price: dailyVal, isDefault: false))
        }
        return options
    }

    // MARK: - Actions
    @objc private func addImage() {
        // Check if the device has a camera
        if UIImagePickerController.isSourceTypeAvailable(.camera) {
            // Show action sheet to choose between camera and photo library
            let actionSheet = UIAlertController(title: "Select Image Source".localized(), 
                                               message: nil, 
                                               preferredStyle: .actionSheet)
            
            // Camera action
            let cameraAction = UIAlertAction(title: "Camera".localized(), style: .default) { [weak self] _ in
                self?.imagePickerController.sourceType = .camera
                self?.present(self!.imagePickerController, animated: true)
            }
            
            // Photo library action
            let photoLibraryAction = UIAlertAction(title: "Photo Library".localized(), style: .default) { [weak self] _ in
                self?.imagePickerController.sourceType = .photoLibrary
                self?.present(self!.imagePickerController, animated: true)
            }
            
            // Cancel action
            let cancelAction = UIAlertAction(title: "Cancel".localized(), style: .cancel)
            
            // Add actions to the action sheet
            actionSheet.addAction(cameraAction)
            actionSheet.addAction(photoLibraryAction)
            actionSheet.addAction(cancelAction)
            
            // For iPad, set the popover presentation controller
            if UIDevice.current.userInterfaceIdiom == .pad {
                if let popover = actionSheet.popoverPresentationController {
                    popover.sourceView = img
                    popover.sourceRect = img.bounds
                    popover.permittedArrowDirections = [.up, .down, .left, .right]
                }
            }
            
            present(actionSheet, animated: true)
        } else {
            // If no camera is available, just show the photo library
            imagePickerController.sourceType = .photoLibrary
            present(imagePickerController, animated: true)
        }
    }
    
    @objc private func cancel() {
        dismiss(animated: true)
    }
    
    @objc private func save() {
        guard validateInputs() else { return }
        
        let productName = nameField.textField.text?.trim() ?? ""
        let barcode = barcodeField.textField.text?.trim() ?? ""
        let quantity = quantityField.textField.text ?? ""
        let costPrice = costPriceField.textField.text ?? ""
        let rent = rentField.textField.text ?? ""
        let sale = saleField.textField.text ?? ""
        let deposit = depositField.textField.text ?? ""
        
        // Image is now optional - check if user has selected an image
        let productImage = img.image
        
        if let product = product {
            updateExistingProduct(productName: productName, 
                                barcode: barcode,
                                rent: rent, 
                                quantity: quantity, 
                                product: product, 
                                image: productImage,
                                sale: sale,
                                costPrice: costPrice,
                                deposit: deposit)
        } else {
            createNewProduct(productName: productName, 
                           barcode: barcode,
                           rent: rent, 
                           quantity: quantity, 
                           image: productImage,
                           sale: sale,
                           costPrice: costPrice,
                           deposit: deposit)
        }
    }
    
    @objc private func textFieldDidChange(_ textField: UITextField) {
        if let field = [nameField, barcodeField, quantityField, costPriceField, rentField, dailyPriceField, saleField, depositField]
            .first(where: { $0.textField == textField }) {
            field.clearError()
        }
    }
    
    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }
    
    private func updateExistingProduct(productName: String, barcode: String, rent: String, quantity: String, 
product: Product, image: UIImage?, sale: String, costPrice: String, deposit: String) {
        // Get actual merchant ID and outlet ID from logged in user
        guard let user = User.current() else {
            UIAlertController.errorAlert(parent: self, error: NSError.errorWithOwnMessage(message: "User not logged in".localized(), domain: "RC", code: 401))
            return
        }
        
        // Get outlet ID: prefer outlet.id, then outletId property, fallback to 1
        let outletId = user.outlet?.id ?? user.outletId ?? 1
        let merchantId = user.merchant?.id ?? user.merchantId
        
        print("📋 Update Product - Using outlet ID: \(outletId), merchant ID: \(merchantId ?? 0)")
        
        let parsedQuantity = Int(quantity.formatStringRemoveCommon())
        let quantityValue = quantity.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? (product.totalStock ?? product.quantity)
            : (parsedQuantity ?? 0)
        let outletStock = [OutletStockItem(outletId: outletId, stock: quantityValue)]
        let request = UpdateProductRequest(
            name: productName,
            description: "", // TODO: Add description field to UI
            barcode: barcode.isEmpty ? nil : barcode,
            rentPrice: Double(rent.formatStringRemoveCommon()) ?? 0.0,
            salePrice: sale.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : Double(sale.formatStringRemoveCommon()),
            costPrice: costPrice.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : Double(costPrice.formatStringRemoveCommon()),
            deposit: deposit.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : Double(deposit.formatStringRemoveCommon()),
            totalStock: quantityValue,
            categoryId: nil, // Set to null as requested
            merchantId: merchantId ?? 0,
            outletStock: outletStock,
            images: nil,
            isActive: true,
            pricingType: "FIXED",
            durationConfig: nil,
            pricingOptions: buildPricingOptions()
        )
        
        showProgressText(text: "Loading...".localized())
        
        // Prepare images array - compress to < 100KB before sending
        var images: [UIImage] = []
        if let image = image {
            // Compress image to be smaller than 100KB
            if let compressedData = image.compressToTargetSize(targetSizeKB: 100),
               let compressedImage = UIImage(data: compressedData) {
                images.append(compressedImage)
                print("✅ Image compressed for update: \(compressedData.count / 1024)KB")
            } else {
                // Fallback: use original image if compression fails
                images.append(image)
                print("⚠️ Image compression failed, using original image")
            }
        }
        
        // Use new request model method
        ProductService.shared.updateProduct(productId: product.product_id, request: request, images: images) { [weak self] product, error in
            self?.hideProgress()
            if let err = error {
                UIAlertController.errorAlert(parent: self, error: err)
            } else if let pro = product {
                self?.delegate?.didUpdateProduct(product: pro)
            }
        }
    }
    
    private func createNewProduct(productName: String, barcode: String, rent: String, quantity: String, 
                                image: UIImage?, sale: String, costPrice: String, deposit: String) {
        // Get actual merchant ID and outlet ID from logged in user
        guard let user = User.current() else {
            UIAlertController.errorAlert(parent: self, error: NSError.errorWithOwnMessage(message: "User not logged in".localized(), domain: "RC", code: 401))
            return
        }
        
        // Get outlet ID: prefer outlet.id, then outletId property, fallback to 1
        let outletId = user.outlet?.id ?? user.outletId ?? 1
        let merchantId = user.merchant?.id ?? user.merchantId
        
        print("📋 Create Product - Using outlet ID: \(outletId), merchant ID: \(merchantId ?? 0)")
        
        let quantityValue = quantity.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? 0
            : (Int(quantity.formatStringRemoveCommon()) ?? 0)
        let request = CreateProductRequest.create(
            name: productName,
            description: "", // TODO: Add description field to UI
            barcode: barcode.isEmpty ? nil : barcode,
            rentPrice: Double(rent.formatStringRemoveCommon()) ?? 0.0,
            salePrice: sale.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : Double(sale.formatStringRemoveCommon()),
            costPrice: costPrice.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : Double(costPrice.formatStringRemoveCommon()),
            deposit: deposit.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : Double(deposit.formatStringRemoveCommon()),
            totalStock: quantityValue,
            categoryId: nil, // Set to null as requested
            merchantId: merchantId,
            outletId: outletId,
            images: nil,
            pricingType: "FIXED",
            durationConfig: nil,
            pricingOptions: buildPricingOptions()
        )
        
        showProgressText(text: "Loading...".localized())
        
        // Prepare images array - compress to < 100KB before sending
        var images: [UIImage] = []
        if let image = image {
            // Compress image to be smaller than 100KB
            if let compressedData = image.compressToTargetSize(targetSizeKB: 100),
               let compressedImage = UIImage(data: compressedData) {
                images.append(compressedImage)
                print("✅ Image compressed for create: \(compressedData.count / 1024)KB")
            } else {
                // Fallback: use original image if compression fails
                images.append(image)
                print("⚠️ Image compression failed, using original image")
            }
        }
        
        // Use new request model method
        ProductService.shared.createProduct(request: request, images: images) { [weak self] product, error in
            self?.hideProgress()
            if let err = error {
                UIAlertController.errorAlert(parent: self, error: err)
            } else if let pro = product {
                self?.delegate?.didAddNewProduct(product: pro)
            }
        }
    }
    
}

// MARK: - UITextFieldDelegate
extension NewProductViewController: UITextFieldDelegate {
    func textField(_ textField: UITextField, shouldChangeCharactersIn range: NSRange, 
                  replacementString string: String) -> Bool {
        // Handle number formatting for quantity, cost price, rent, sale, and deposit fields
        if textField == quantityField.textField ||
           textField == costPriceField.textField ||
           textField == rentField.textField ||
           textField == dailyPriceField.textField ||
           textField == saleField.textField ||
           textField == depositField.textField {
            return textField.shouldChangeCharactersForNumberFormatting(in: range, replacementString: string)
        }
        return true
    }
    
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        switch textField {
        case nameField.textField:
            rentField.textField.becomeFirstResponder()
        case rentField.textField:
            dailyPriceField.textField.becomeFirstResponder()
        case dailyPriceField.textField:
            quantityField.textField.becomeFirstResponder()
        case quantityField.textField:
            saleField.textField.becomeFirstResponder()
        case saleField.textField:
            costPriceField.textField.becomeFirstResponder()
        case costPriceField.textField:
            depositField.textField.becomeFirstResponder()
        case depositField.textField:
            barcodeField.textField.becomeFirstResponder()
        case barcodeField.textField:
            textField.resignFirstResponder()
        default:
            break
        }
        return true
    }
}

// MARK: - UIImagePickerControllerDelegate, UINavigationControllerDelegate
extension NewProductViewController: UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [String : Any]) {
        // Get the edited image if available, otherwise get the original image
        let image = info[UIImagePickerControllerEditedImage] as? UIImage ?? info[UIImagePickerControllerOriginalImage] as? UIImage
        
        if let selectedImage = image {
            // Set the image to the image view
            img.image = selectedImage
            
            // Store the selected image for later use
            self.selectedImage = selectedImage
            
            // Hide camera icon when image is set
            img.subviews.first?.isHidden = true
        }
        
        // Dismiss the picker
        picker.dismiss(animated: true)
    }
    
    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        // Dismiss the picker if the user cancels
        picker.dismiss(animated: true)
    }
} 
