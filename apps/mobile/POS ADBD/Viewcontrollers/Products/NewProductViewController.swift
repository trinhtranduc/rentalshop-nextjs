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
        iv.isAccessibilityElement = true
        iv.accessibilityTraits = UIAccessibilityTraitButton
        iv.accessibilityLabel = "Product image".localized()
        iv.accessibilityHint = "Choose a product image".localized()
        
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

    private let imageErrorLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 12)
        label.textColor = .actionDanger
        label.numberOfLines = 0
        label.isHidden = true
        label.adjustsFontForContentSizeCategory = true
        return label
    }()
    
    private lazy var nameField: LabeledTextField = {
        let field = LabeledTextField(
            title: "product.form.name.required".localized(),
            placeholder: "product.form.name.placeholder".localized()
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
            title: "product.form.quantity.required".localized(),
            placeholder: "product.form.quantity.placeholder".localized()
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
            title: "product.form.pricePerRental.required".localized(),
            placeholder: "product.form.pricePerRental.placeholder".localized()
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
            title: "product.form.pricePerDay".localized(),
            placeholder: "product.form.pricePerDay.placeholder".localized()
        )
        field.textField.keyboardType = .decimalPad
        field.textField.setLeftIcon(UIImage(systemName: "calendar"))
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()

    private lazy var saleField: LabeledTextField = {
        let field = LabeledTextField(
            title: "product.form.salePrice".localized(),
            placeholder: "product.form.salePrice.placeholder".localized()
        )
        field.textField.keyboardType = .decimalPad
        field.textField.setLeftIcon(UIImage(systemName: "dollarsign.circle.fill"))
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private lazy var costPriceField: LabeledTextField = {
        let field = LabeledTextField(
            title: "product.form.costPrice".localized(),
            placeholder: "product.form.costPrice.placeholder".localized()
        )
        field.textField.keyboardType = .decimalPad
        field.textField.setLeftIcon(UIImage(systemName: "dollarsign.square"))
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private lazy var depositField: LabeledTextField = {
        let field = LabeledTextField(
            title: "product.form.deposit".localized(),
            placeholder: "product.form.deposit.placeholder".localized()
        )
        field.textField.keyboardType = .decimalPad
        field.textField.setLeftIcon(UIImage(systemName: "lock.fill"))
        field.setTitleColor(APP_TEXT_COLOR)
        return field
    }()
    
    private lazy var barcodeField: LabeledTextField = {
        let field = LabeledTextField(
            title: "product.form.barcode.required".localized(),
            placeholder: "product.form.barcode.placeholder".localized()
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

    private var optionalDetailsContainer: UIView?
    private var isOptionalDetailsExpanded = false

    private let optionalDetailsChevron: UIImageView = {
        let imageView = UIImageView(image: UIImage(systemName: "chevron.down"))
        imageView.tintColor = .textSecondary
        imageView.contentMode = .scaleAspectFit
        return imageView
    }()

    /// Add future pricing units here (for example HOURLY or MONTHLY).
    /// The form and request builder render and serialize this collection automatically.
    private var additionalPricingFields: [(type: String, field: LabeledTextField)] {
        [
            (type: "DAILY", field: dailyPriceField)
        ]
    }
    
    private lazy var saveButton: RCPrimaryButton = {
        let button = RCPrimaryButton(
            title: product == nil ? "Add Product".localized() : "Update Product".localized(),
            backgroundColor: APP_TONE_COLOR
        )
        button.addTarget(self, action: #selector(save), for: .touchUpInside)
        return button
    }()

    /// Compact image-search row under the photo (edit + manage only). Not a second Save CTA.
    private lazy var imageSearchIconView: UIImageView = {
        let imageView = UIImageView()
        let symbol = UIImage(systemName: "camera.viewfinder")
            ?? UIImage(systemName: "photo.on.rectangle")
        imageView.image = symbol
        imageView.tintColor = .brandPrimary
        imageView.contentMode = .scaleAspectFit
        imageView.setContentHuggingPriority(.required, for: .horizontal)
        return imageView
    }()

    private lazy var imageSearchTitleLabel: UILabel = {
        let label = UILabel()
        label.text = "product.imageSearch.section".localized()
        label.font = Utils.mediumFont(size: 13)
        label.textColor = .textPrimary
        label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        label.lineBreakMode = .byTruncatingTail
        label.numberOfLines = 1
        return label
    }()

    private lazy var imageSearchStatusChip: PaddedChipLabel = {
        let chip = PaddedChipLabel()
        chip.font = Utils.mediumFont(size: 11)
        chip.contentInsets = UIEdgeInsets(top: 3, left: 8, bottom: 3, right: 8)
        return chip
    }()

    private lazy var imageSearchUpdateButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("product.imageSearch.update".localized(), for: .normal)
        button.titleLabel?.font = Utils.mediumFont(size: 13)
        button.setTitleColor(.brandPrimary, for: .normal)
        button.setTitleColor(.tertiaryLabel, for: .disabled)
        button.contentEdgeInsets = UIEdgeInsets(top: 2, left: 4, bottom: 2, right: 4)
        button.setContentHuggingPriority(.required, for: .horizontal)
        button.setContentCompressionResistancePriority(.required, for: .horizontal)
        button.addTarget(self, action: #selector(syncImageSearch), for: .touchUpInside)
        return button
    }()

    private lazy var imageSearchSpinner: UIActivityIndicatorView = {
        let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)
        spinner.hidesWhenStopped = true
        spinner.color = .brandPrimary
        spinner.setContentHuggingPriority(.required, for: .horizontal)
        return spinner
    }()

    private lazy var imageSearchRow: UIView = {
        let row = UIView()
        row.backgroundColor = UIColor.backgroundTertiary.withAlphaComponent(0.9)
        row.layer.cornerRadius = 10
        row.isHidden = true

        row.addSubview(imageSearchIconView)
        row.addSubview(imageSearchTitleLabel)
        row.addSubview(imageSearchStatusChip)
        row.addSubview(imageSearchUpdateButton)
        row.addSubview(imageSearchSpinner)

        imageSearchIconView.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(10)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(16)
        }
        imageSearchTitleLabel.snp.makeConstraints { make in
            make.leading.equalTo(imageSearchIconView.snp.trailing).offset(6)
            make.centerY.equalToSuperview()
        }
        imageSearchStatusChip.snp.makeConstraints { make in
            make.leading.greaterThanOrEqualTo(imageSearchTitleLabel.snp.trailing).offset(6)
            make.centerY.equalToSuperview()
        }
        imageSearchUpdateButton.snp.makeConstraints { make in
            make.leading.equalTo(imageSearchStatusChip.snp.trailing).offset(0)
            make.trailing.equalToSuperview().offset(-2)
            make.centerY.equalToSuperview()
        }
        imageSearchSpinner.snp.makeConstraints { make in
            make.center.equalTo(imageSearchUpdateButton)
        }
        row.translatesAutoresizingMaskIntoConstraints = false
        row.heightAnchor.constraint(equalToConstant: 34).isActive = true
        return row
    }()

    private var isSyncingImageSearch = false
    private var imageSearchQueued = false
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupNavigationBar()
        setupUI()
        setupData()
        loadInitialData()
        refreshImageSearchButton()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // The form is presented inside a UINavigationController but owns the
        // compact custom bar. Re-apply the hidden state after presentation
        // transitions so the system bar cannot appear underneath it.
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // A modal navigation controller can restore its bar after the
        // transition completes; hide it once more at the stable screen state.
        navigationController?.setNavigationBarHidden(true, animated: false)
    }
    
    // MARK: - Setup
    override func setupUI() {
        view.backgroundColor = .backgroundPrimary
        
        guard let customNavBar = customNavBar else { return }
        
        view.addSubview(scrollView)
        view.addSubview(saveButton)
        scrollView.addSubview(containerView)

        let productInfoStack = makeVerticalStack()
        productInfoStack.addArrangedSubview(makeImageRow())
        productInfoStack.addArrangedSubview(makeSeparator())
        productInfoStack.addArrangedSubview(makeFieldRow(nameField))
        productInfoStack.addArrangedSubview(makeSeparator())
        productInfoStack.addArrangedSubview(makeFieldRow(barcodeField))
        productInfoStack.addArrangedSubview(makeSeparator())
        productInfoStack.addArrangedSubview(makeFieldRow(quantityField))
        let productInfoCard = makeCard(containing: productInfoStack)

        let pricingStack = makeVerticalStack()
        pricingStack.addArrangedSubview(makeFieldRow(rentField))
        pricingStack.addArrangedSubview(makeSeparator())

        let optionalStack = makeVerticalStack()
        optionalStack.addArrangedSubview(makeDisclosureRow(
            title: "product.section.moreOptions.title".localized(),
            chevron: optionalDetailsChevron,
            action: #selector(toggleOptionalDetails)
        ))

        let optionalContent = UIView()
        let optionalContentStack = makeVerticalStack()
        optionalContentStack.addArrangedSubview(makeSeparator())
        appendFields(
            additionalPricingFields.map(\.field) + [saleField, costPriceField, depositField],
            to: optionalContentStack
        )
        optionalContent.addSubview(optionalContentStack)
        optionalContentStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        optionalContent.isHidden = true
        optionalDetailsContainer = optionalContent
        optionalStack.addArrangedSubview(optionalContent)
        pricingStack.addArrangedSubview(optionalStack)
        let pricingCard = makeCard(containing: pricingStack)

        stackView.addArrangedSubview(productInfoCard)
        stackView.addArrangedSubview(pricingCard)
        containerView.addSubview(stackView)
        
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

        stackView.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(8)
            make.leading.trailing.equalToSuperview().inset(12)
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

    private func makeVerticalStack() -> UIStackView {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 0
        stack.distribution = .fill
        return stack
    }

    private func makeCard(containing content: UIView) -> UIView {
        let card = UIView()
        card.backgroundColor = .backgroundCard
        card.layer.cornerRadius = 12
        card.layer.borderWidth = 0.5
        card.layer.borderColor = UIColor.separator.withAlphaComponent(0.25).cgColor
        card.clipsToBounds = true
        card.addSubview(content)
        content.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        return card
    }

    private func makeDisclosureRow(
        title: String,
        chevron: UIImageView,
        action: Selector
    ) -> UIView {
        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = Utils.mediumFont(size: 16)
        titleLabel.textColor = .textPrimary
        titleLabel.adjustsFontForContentSizeCategory = true

        let row = UIStackView(arrangedSubviews: [titleLabel, chevron])
        row.axis = .horizontal
        row.spacing = 12
        row.alignment = .center
        row.isUserInteractionEnabled = false

        chevron.snp.makeConstraints { make in
            make.width.height.equalTo(16)
        }

        let wrapper = UIView()
        wrapper.addSubview(row)
        row.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16))
        }

        let button = UIButton(type: .system)
        button.addTarget(self, action: action, for: .touchUpInside)
        button.accessibilityLabel = title
        wrapper.addSubview(button)
        button.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.height.greaterThanOrEqualTo(56)
        }
        return wrapper
    }

    private func appendFields(_ fields: [LabeledTextField], to stack: UIStackView) {
        for (index, field) in fields.enumerated() {
            stack.addArrangedSubview(makeFieldRow(field))
            if index < fields.count - 1 {
                stack.addArrangedSubview(makeSeparator())
            }
        }
    }

    private func makeFieldRow(_ field: LabeledTextField) -> UIView {
        let fieldWrapper = UIView()
        let rowStack = UIStackView()
        rowStack.axis = .horizontal
        rowStack.spacing = 12
        rowStack.alignment = .center
        rowStack.distribution = .fill

        let titleLabel = UILabel()
        let titleText = field.titleLabel.text ?? ""
        titleLabel.text = titleText
        titleLabel.font = Utils.regularFont(size: 16)
        titleLabel.textColor = .textPrimary
        titleLabel.adjustsFontForContentSizeCategory = true
        titleLabel.setContentHuggingPriority(.defaultHigh, for: .horizontal)

        if titleText.contains("*") {
            let attributedText = NSMutableAttributedString(string: titleText)
            let asteriskRange = (titleText as NSString).range(of: "*")
            if asteriskRange.location != NSNotFound {
                attributedText.addAttribute(.foregroundColor, value: UIColor.actionDanger, range: asteriskRange)
            }
            titleLabel.attributedText = attributedText
        }

        let valueTextField = field.textField
        valueTextField.accessibilityLabel = titleText.replacingOccurrences(of: "*", with: "").trim()
        valueTextField.font = Utils.regularFont(size: 16)
        valueTextField.textAlignment = .right
        valueTextField.setContentHuggingPriority(.defaultLow, for: .horizontal)
        valueTextField.layer.borderWidth = 0
        valueTextField.layer.borderColor = UIColor.clear.cgColor
        valueTextField.backgroundColor = .clear
        valueTextField.leftView = nil
        valueTextField.leftViewMode = .never
        valueTextField.rightView = nil
        valueTextField.rightViewMode = .never

        rowStack.addArrangedSubview(titleLabel)
        rowStack.addArrangedSubview(valueTextField)
        fieldWrapper.addSubview(rowStack)
        rowStack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16))
            make.height.greaterThanOrEqualTo(44)
        }
        return fieldWrapper
    }

    private func makeImageRow() -> UIView {
        let titleLabel = UILabel()
        let title = "Product image".localized()
        let attributedTitle = NSMutableAttributedString(
            string: title,
            attributes: [
                .font: Utils.mediumFont(size: 16),
                .foregroundColor: UIColor.textPrimary
            ]
        )
        attributedTitle.append(NSAttributedString(
            string: " *",
            attributes: [
                .font: Utils.mediumFont(size: 16),
                .foregroundColor: UIColor.actionDanger
            ]
        ))
        titleLabel.attributedText = attributedTitle
        titleLabel.font = Utils.regularFont(size: 16)
        titleLabel.textColor = .textPrimary
        titleLabel.adjustsFontForContentSizeCategory = true

        let imageWrap = UIView()
        imageWrap.addSubview(img)
        img.snp.remakeConstraints { make in
            make.top.bottom.equalToSuperview()
            make.centerX.equalToSuperview()
            make.width.height.equalTo(140)
        }

        let contentStack = UIStackView(arrangedSubviews: [imageWrap, imageSearchRow, imageErrorLabel])
        contentStack.axis = .vertical
        contentStack.spacing = 12
        contentStack.alignment = .fill

        let wrapper = UIView()
        wrapper.addSubview(titleLabel)
        wrapper.addSubview(contentStack)

        titleLabel.snp.makeConstraints { make in
            make.top.leading.equalToSuperview().inset(16)
            make.trailing.lessThanOrEqualToSuperview().offset(-16)
        }
        contentStack.snp.makeConstraints { make in
            make.top.equalTo(titleLabel.snp.bottom).offset(12)
            make.leading.trailing.equalToSuperview().inset(16)
            make.bottom.equalToSuperview().offset(-12)
        }
        return wrapper
    }

    private func makeSeparator() -> UIView {
        let separator = UIView()
        separator.backgroundColor = UIColor.separator.withAlphaComponent(0.25)
        separator.snp.makeConstraints { make in
            make.height.equalTo(0.5)
        }
        return separator
    }
    
    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        let title = product == nil ? "Add product".localized() : "Update product".localized()
        // Full-screen modal: pin below the status bar so the title is not under the notch.
        let navBar = setupCustomNavigationBar(
            title: title,
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .custom { [weak self] in
                self?.dismiss(animated: true)
            },
            pinToSafeArea: true
        )

        // Keep a fixed bar height. remakeConstraints without height used to wipe
        // RCCustomNavigationBar's SnapKit height → bar expanded, title centered
        // mid-screen, and scrollView collapsed to zero.
        navBar.snp.remakeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.equalToSuperview()
            make.height.equalTo(44)
        }

        navBar.setDismissButton() // Use X button for dismiss
    }
    
    override func setupData() {
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        view.addGestureRecognizer(tapGesture)
    }

    private func generatedBarcode(from existingValue: String? = nil) -> String {
        let trimmedValue = existingValue?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmedValue.isEmpty ? Utils.randomString(length: 6) : trimmedValue
    }
    
    private func loadInitialData() {
        if let product = product {
            // Update title and button
            customNavBar?.title = "Update product".localized()
            saveNavButton.setTitle("Update".localized(), for: .normal)
            
            nameField.textField.text = product.name
            barcodeField.textField.text = generatedBarcode(from: product.barcode)
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
                for definition in additionalPricingFields {
                    if let option = options.first(where: { $0.type.uppercased() == definition.type }) {
                        definition.field.textField.text = option.price.formatStringInCommon()
                    }
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
            
            barcodeField.textField.text = generatedBarcode()
        }

        // Only lay out the disclosure section after the view hierarchy exists.
        if isViewLoaded {
            syncExpandedSectionsWithData()
        }
    }
    
    // MARK: - Validation
    private func validateField(_ field: LabeledTextField, value: String?) -> Bool {
        field.clearError()

        let text = (value ?? "").trimmingCharacters(in: .whitespacesAndNewlines)

        if field == nameField || field == barcodeField || field == quantityField || field == rentField {
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
        let isImageValid = validateImage()
        let isNameValid = validateField(nameField, value: nameField.textField.text)
        let isBarcodeValid = validateField(barcodeField, value: barcodeField.textField.text)
        let isQuantityValid = validateField(quantityField, value: quantityField.textField.text)
        let isCostPriceValid = validateField(costPriceField, value: costPriceField.textField.text)
        let isRentValid = validateField(rentField, value: rentField.textField.text)
        let isDailyPriceValid = validateField(dailyPriceField, value: dailyPriceField.textField.text)
        let isSaleValid = validateField(saleField, value: saleField.textField.text)
        let isDepositValid = validateField(depositField, value: depositField.textField.text)
        
        return isImageValid && isNameValid && isBarcodeValid && isQuantityValid && isCostPriceValid && isRentValid && isDailyPriceValid && isSaleValid && isDepositValid
    }

    private func validateImage() -> Bool {
        let hasExistingImage = !(product?.image_url ?? "").isEmpty
        let isValid = selectedImage != nil || img.image != nil || hasExistingImage
        imageErrorLabel.text = isValid ? nil : "Product image is required".localized()
        imageErrorLabel.isHidden = isValid
        img.layer.borderWidth = isValid ? 0 : 1
        img.layer.borderColor = isValid ? UIColor.clear.cgColor : UIColor.actionDanger.cgColor
        return isValid
    }

    private func hasSavedProductPhoto() -> Bool {
        !(product?.image_url ?? "").isEmpty
    }

    /// Staff never see this. Create shows status only (no product id to Update yet).
    private func refreshImageSearchButton() {
        let isEdit = product != nil
        let canManage = PermissionManager.shared.canManageProducts()
        let show = canManage
        imageSearchRow.isHidden = !show
        imageSearchUpdateButton.isEnabled = isEdit && hasSavedProductPhoto() && !isSyncingImageSearch
        imageSearchUpdateButton.isHidden = !isEdit || isSyncingImageSearch
        imageSearchStatusChip.snp.remakeConstraints { make in
            make.leading.greaterThanOrEqualTo(imageSearchTitleLabel.snp.trailing).offset(6)
            make.centerY.equalToSuperview()
            if !isEdit {
                make.trailing.equalToSuperview().offset(-10)
            }
        }
        imageSearchUpdateButton.snp.remakeConstraints { make in
            make.centerY.equalToSuperview()
            if isEdit {
                make.leading.equalTo(imageSearchStatusChip.snp.trailing)
                make.trailing.equalToSuperview().offset(-2)
            } else {
                make.width.height.equalTo(0)
                make.trailing.equalToSuperview()
            }
        }
        if isSyncingImageSearch {
            imageSearchSpinner.startAnimating()
        } else {
            imageSearchSpinner.stopAnimating()
        }
        refreshImageSearchStatus(visible: show)
    }

    private func refreshImageSearchStatus(visible: Bool) {
        imageSearchStatusChip.isHidden = !visible
        guard visible else { return }

        let hasLocalPhoto = selectedImage != nil || img.image != nil
        if imageSearchQueued || isSyncingImageSearch {
            imageSearchStatusChip.applySoft(
                tint: .brandPrimary,
                text: "product.imageSearch.updating".localized()
            )
        } else if let indexedAt = product?.embeddingGeneratedAt, !indexedAt.isEmpty {
            imageSearchStatusChip.applySoft(
                tint: UIColor(hexString: "1B7A3D"),
                text: "product.imageSearch.ready".localized()
            )
        } else if product == nil && hasLocalPhoto {
            imageSearchStatusChip.applySoft(
                tint: .brandPrimary,
                text: "product.imageSearch.willIndex".localized()
            )
        } else {
            imageSearchStatusChip.applySoft(
                tint: .textSecondary,
                text: "product.imageSearch.notIndexed".localized()
            )
        }
    }

    @objc private func syncImageSearch() {
        guard let productId = product?.id, hasSavedProductPhoto(), !isSyncingImageSearch else { return }

        isSyncingImageSearch = true
        refreshImageSearchButton()
        saveButton.isEnabled = false
        saveNavButton.isEnabled = false

        ProductService.shared.syncProductEmbeddings(productId: productId) { [weak self] error in
            guard let self else { return }
            if let error {
                self.isSyncingImageSearch = false
                self.saveButton.isEnabled = true
                self.saveNavButton.isEnabled = true
                self.refreshImageSearchButton()
                UIAlertController.errorAlert(parent: self, error: error)
                return
            }

            ProductService.shared.loadProduct(productId: productId) { [weak self] latest, _ in
                guard let self else { return }
                self.isSyncingImageSearch = false
                self.saveButton.isEnabled = true
                self.saveNavButton.isEnabled = true
                if let latest {
                    self.product = latest
                }
                let indexedAt = latest?.embeddingGeneratedAt ?? ""
                if !indexedAt.isEmpty {
                    self.imageSearchQueued = false
                    self.refreshImageSearchButton()
                    self.showToast(
                        message: "product.imageSearch.readyToast".localized(),
                        duration: 3.5,
                        icon: UIImage(systemName: "checkmark.circle.fill")
                    )
                } else {
                    self.imageSearchQueued = true
                    self.refreshImageSearchButton()
                    self.showToast(
                        message: "product.imageSearch.queued".localized(),
                        duration: 3.5,
                        icon: UIImage(systemName: "checkmark.circle.fill")
                    )
                }
            }
        }
    }
    
    // MARK: - Public Methods
    func loadProduct(product: Product) {
        self.product = product
        
        // Load product data into UI
        nameField.textField.text = product.name
        barcodeField.textField.text = generatedBarcode(from: product.barcode)
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
            for definition in additionalPricingFields {
                if let option = options.first(where: { $0.type.uppercased() == definition.type }) {
                    definition.field.textField.text = option.price.formatStringInCommon()
                }
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

        // `loadProduct` may run before this controller is embedded in its
        // UINavigationController. Do not force view loading/layout at that
        // point; viewDidLoad will sync the section after setup completes.
        if isViewLoaded {
            syncExpandedSectionsWithData()
        }
        refreshImageSearchButton()
    }
    
    // Method to set the product image from an external source (like MainViewController)
    func setProductImage(_ image: UIImage) {
        img.image = image
        // Store the image for later upload
        selectedImage = image
        refreshImageSearchButton()
    }
    
    // MARK: - Pricing Options Helpers

    /// Build pricing options from the price fields.
    /// Per-rental is always the default. Per-day is added only when provided.
    private func buildPricingOptions() -> [PricingOptionRequest] {
        let rentVal = Double((rentField.textField.text ?? "").formatStringRemoveCommon()) ?? 0

        var options: [PricingOptionRequest] = []
        if rentVal > 0 {
            options.append(PricingOptionRequest(type: "FIXED", price: rentVal, isDefault: true))
        }

        for definition in additionalPricingFields {
            let price = Double((definition.field.textField.text ?? "").formatStringRemoveCommon()) ?? 0
            if price > 0 {
                options.append(PricingOptionRequest(
                    type: definition.type,
                    price: price,
                    isDefault: false
                ))
            }
        }
        return options
    }

    // MARK: - Actions

    @objc private func toggleOptionalDetails() {
        setOptionalDetailsExpanded(!isOptionalDetailsExpanded, animated: true)
    }

    private func setOptionalDetailsExpanded(_ expanded: Bool, animated: Bool) {
        isOptionalDetailsExpanded = expanded
        optionalDetailsContainer?.isHidden = !expanded
        updateDisclosure(
            chevron: optionalDetailsChevron,
            expanded: expanded,
            accessibilityContainer: optionalDetailsContainer
        )
        animateDisclosureChange(animated)
    }

    private func updateDisclosure(
        chevron: UIImageView,
        expanded: Bool,
        accessibilityContainer: UIView?
    ) {
        chevron.image = UIImage(systemName: expanded ? "chevron.up" : "chevron.down")
        accessibilityContainer?.accessibilityElementsHidden = !expanded
    }

    private func animateDisclosureChange(_ animated: Bool) {
        guard animated else {
            view.layoutIfNeeded()
            return
        }

        UIView.animate(
            withDuration: 0.22,
            delay: 0,
            options: [.curveEaseInOut, .beginFromCurrentState]
        ) {
            self.view.layoutIfNeeded()
        }
    }

    private func syncExpandedSectionsWithData() {
        let hasAdditionalPricing = additionalPricingFields.contains {
            !($0.field.textField.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
        let hasOptionalDetails = hasAdditionalPricing || [
            saleField.textField.text,
            costPriceField.textField.text,
            depositField.textField.text
        ].contains {
            !($0 ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }

        setOptionalDetailsExpanded(hasOptionalDetails, animated: false)
    }

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
        barcodeField.textField.text = generatedBarcode(from: barcodeField.textField.text)
        guard validateInputs() else { return }
        
        let productName = nameField.textField.text?.trim() ?? ""
        let barcode = barcodeField.textField.text?.trim() ?? ""
        let quantity = quantityField.textField.text ?? ""
        let costPrice = costPriceField.textField.text ?? ""
        let rent = rentField.textField.text ?? ""
        let sale = saleField.textField.text ?? ""
        let deposit = depositField.textField.text ?? ""
        
        // Image is required and has already been validated above.
        // On edit, only upload a file when the user picked a new photo.
        // Re-uploading the Kingfisher-cached display image every save created a
        // new S3 URL and raced the image-search job (old vectors dropped, new
        // vectors skipped by cooldown).
        let productImage = img.image
        
        if let product = product {
            updateExistingProduct(productName: productName, 
                                barcode: barcode,
                                rent: rent, 
                                quantity: quantity, 
                                product: product, 
                                image: selectedImage,
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
            if let err = error {
                self?.hideProgress()
                UIAlertController.errorAlert(parent: self, error: err)
                return
            }
            guard let self, let pro = product else {
                self?.hideProgress()
                return
            }
            // Create form has no product id yet, so it cannot tap Update.
            // Kick CLIP indexing the same way edit does after the product exists.
            let productId = pro.id ?? (pro.product_id > 0 ? pro.product_id : nil)
            if !images.isEmpty, let productId {
                ProductService.shared.syncProductEmbeddings(productId: productId) { [weak self] _ in
                    self?.hideProgress()
                    self?.delegate?.didAddNewProduct(product: pro)
                }
            } else {
                self.hideProgress()
                self.delegate?.didAddNewProduct(product: pro)
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
            barcodeField.textField.becomeFirstResponder()
        case barcodeField.textField:
            quantityField.textField.becomeFirstResponder()
        case quantityField.textField:
            rentField.textField.becomeFirstResponder()
        case rentField.textField:
            if isOptionalDetailsExpanded {
                dailyPriceField.textField.becomeFirstResponder()
            } else {
                textField.resignFirstResponder()
            }
        case dailyPriceField.textField:
            saleField.textField.becomeFirstResponder()
        case saleField.textField:
            costPriceField.textField.becomeFirstResponder()
        case costPriceField.textField:
            depositField.textField.becomeFirstResponder()
        case depositField.textField:
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
            imageErrorLabel.isHidden = true
            img.layer.borderWidth = 0
            refreshImageSearchButton()
        }
        
        // Dismiss the picker
        picker.dismiss(animated: true)
    }
    
    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        // Dismiss the picker if the user cancels
        picker.dismiss(animated: true)
    }
} 
