//
//  ProductFormViewController.swift
//  POS ADBD
//
//  Redesigned add / edit product (#373, flag `newProducts`, boards SP-tao, SP-sua): photos (first is the cover),
//  name, category, barcode with scan, prices (not for OUTLET_STAFF), deposit, quantity.
//

import UIKit
import SnapKit
import QRCodeReader
import AVFoundation
import AudioToolbox

final class ProductFormViewController: BaseViewControler {
    private enum Photo {
        case remote(String)
        case local(UIImage)
    }

    private let product: Product?
    var onSaved: ((Product) -> Void)?

    private let showsPrices = ProductAccess.showsPriceFields(role: ProductAccess.currentRole, permissions: ProductAccess.currentPermissions)
    private var photos: [Photo] = []
    private var categories: [Category] = []
    private var categoryId: Int?
    private var merchantOutlets: [(id: Int, isDefault: Bool)] = []
    private var defaultMode: ProductPricingMode = .perRental

    private let scroll = UIScrollView()
    private let form = UIStackView()
    private let photoStrip = UIStackView()
    private let nameField = UITextField()
    private let categoryRow = V2ValueRow(title: "products.form.category".localized())
    private let barcodeField = UITextField()
    private let barcodeWarning = V2.label(size: DS.TextSize.secondary, color: V2.danger, lines: 0)
    private let perRentalField = UITextField()
    private let perDayField = UITextField()
    private let saleField = UITextField()
    private let depositField = UITextField()
    private let defaultToggle = V2Segmented(titles: ["products.price.perRental".localized(), "products.price.perDay".localized()])
    private let quantityStepper = V2Stepper()
    private let stockNote = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted)

    private lazy var reader: QRCodeReaderViewController = {
        let builder = QRCodeReaderViewControllerBuilder {
            $0.reader = QRCodeReader(metadataObjectTypes: [.code39, .code128], captureDevicePosition: .back)
        }
        return QRCodeReaderViewController(builder: builder)
    }()

    private lazy var picker: UIImagePickerController = {
        let picker = UIImagePickerController()
        picker.delegate = self
        return picker
    }()

    private var isEdit: Bool { product != nil }

    private var stockCounts: ProductStockCounts? {
        guard let product else { return nil }
        let outlet = ProductOutletChoice.outletId(userOutletId: userOutletId, product: product, merchantOutlets: merchantOutlets)
        return ProductStock.counts(product, outletId: outlet)
    }

    private var userOutletId: Int? { User.current()?.outlet?.id ?? User.current()?.outletId }

    init(product: Product?) {
        self.product = product
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        buildLayout()
        fill()
        loadCategories()
        if userOutletId == nil { loadOutlets() }
        let tap = UITapGestureRecognizer(target: self, action: #selector(endEditing))
        tap.cancelsTouchesInView = false
        view.addGestureRecognizer(tap)
    }

    // MARK: - Layout

    private func buildLayout() {
        let header = UIView()
        let close = UIButton(type: .system)
        close.setImage(DS.symbol("xmark", DS.Icon.lg, weight: .semibold), for: .normal)
        close.tintColor = DS.Color.text
        close.accessibilityLabel = "Close".localized()
        close.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        let title = V2.label((isEdit ? "products.form.editTitle" : "products.form.addTitle").localized(), size: 20, weight: .bold)
        header.addSubview(close)
        header.addSubview(title)
        let headerLine = V2.divider()
        headerLine.backgroundColor = DS.Color.border
        header.addSubview(headerLine)
        view.addSubview(header)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.equalToSuperview()
            make.height.equalTo(56)
        }
        close.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(8)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(DS.touchTarget)
        }
        title.snp.makeConstraints { make in
            make.leading.equalTo(close.snp.trailing).offset(4)
            make.centerY.equalToSuperview()
        }
        headerLine.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }

        let bottom = UIView()
        bottom.backgroundColor = .white
        let bottomLine = V2.divider()
        bottomLine.backgroundColor = DS.Color.border
        bottom.addSubview(bottomLine)
        let save = V2.primaryButton((isEdit ? "products.form.saveChanges" : "products.form.save").localized())
        save.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)
        bottom.addSubview(save)
        view.addSubview(bottom)
        bottom.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        bottomLine.snp.makeConstraints { make in make.top.leading.trailing.equalToSuperview() }
        save.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-8)
        }

        view.addSubview(scroll)
        scroll.keyboardDismissMode = .interactive
        scroll.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(bottom.snp.top)
        }
        form.axis = .vertical
        scroll.addSubview(form)
        form.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.width.equalToSuperview()
        }

        // Photos
        let photoScroll = UIScrollView()
        photoScroll.showsHorizontalScrollIndicator = false
        photoStrip.axis = .horizontal
        photoStrip.spacing = 10
        photoScroll.addSubview(photoStrip)
        photoStrip.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 14, left: DS.Spacing.lg, bottom: 6, right: DS.Spacing.lg))
            make.height.equalTo(84)
        }
        photoScroll.snp.makeConstraints { make in make.height.equalTo(104) }
        form.addArrangedSubview(photoScroll)
        form.addArrangedSubview(padded(V2.label(String(format: "products.form.photosHint".localized(), ProductFormValidator.maxPhotos), // board SP-sua: hint stays 12/400
                                                size: DS.TextSize.pill, color: DS.Color.textMuted, lines: 0), top: 0, bottom: 6))

        // Name, category, barcode
        configure(nameField, placeholder: "products.form.namePlaceholder".localized(), numeric: false)
        form.addArrangedSubview(field(title: "products.form.name".localized(), required: true, input: nameField))
        categoryRow.addTarget(self, action: #selector(pickCategory), for: .touchUpInside)
        form.addArrangedSubview(categoryRow)
        form.addArrangedSubview(V2.divider())
        configure(barcodeField, placeholder: "products.form.barcodePlaceholder".localized(), numeric: false)
        barcodeField.autocapitalizationType = .allCharacters
        barcodeField.addTarget(self, action: #selector(barcodeEdited), for: .editingChanged)
        let scan = UIButton(type: .system)
        scan.setImage(DS.symbol("barcode.viewfinder", DS.Icon.md), for: .normal)
        scan.tintColor = DS.Color.text
        scan.accessibilityLabel = "common.action.scanBarcode".localized()
        scan.addTarget(self, action: #selector(scanBarcode), for: .touchUpInside)
        scan.snp.makeConstraints { make in make.width.height.equalTo(DS.touchTarget) }
        form.addArrangedSubview(field(title: "products.form.barcode".localized(), required: false, input: barcodeField, accessory: scan))
        barcodeWarning.isHidden = true
        form.addArrangedSubview(padded(barcodeWarning, top: 0, bottom: 4))

        // Prices (not for OUTLET_STAFF)
        if showsPrices {
            form.addArrangedSubview(V2.sectionHeader("products.form.prices".localized()))
            configure(perRentalField, placeholder: "0", numeric: true)
            configure(perDayField, placeholder: "0", numeric: true)
            form.addArrangedSubview(pair(field(title: "products.form.perRental".localized(), required: false, input: perRentalField),
                                         field(title: "products.form.perDay".localized(), required: false, input: perDayField)))
            let defaultTitle = V2.label("products.form.defaultPricing".localized(), size: DS.TextSize.body, weight: .bold)
            defaultToggle.addTarget(self, action: #selector(defaultChanged), for: .valueChanged)
            let defaultBox = UIStackView(arrangedSubviews: [defaultTitle, defaultToggle])
            defaultBox.axis = .vertical
            defaultBox.spacing = 6
            form.addArrangedSubview(padded(defaultBox, top: 8, bottom: 8))
            configure(saleField, placeholder: "products.form.notForSale".localized(), numeric: true)
            configure(depositField, placeholder: "0", numeric: true)
            form.addArrangedSubview(pair(field(title: "products.form.salePrice".localized(), required: false, input: saleField),
                                         field(title: "products.form.deposit".localized(), required: false, input: depositField)))
        }

        // Stock
        form.addArrangedSubview(V2.sectionHeader("products.form.stock".localized()))
        let quantityTitle = V2.label("products.form.quantity".localized(), size: DS.TextSize.body)
        let quantityTexts = UIStackView(arrangedSubviews: [quantityTitle, stockNote])
        quantityTexts.axis = .vertical
        let quantityRow = UIStackView(arrangedSubviews: [quantityTexts, UIView(), quantityStepper])
        quantityRow.alignment = .center
        form.addArrangedSubview(padded(quantityRow, top: 8, bottom: 24))
    }

    private func configure(_ field: UITextField, placeholder: String, numeric: Bool) {
        field.placeholder = placeholder
        field.font = Utils.regularFont(size: DS.TextSize.input)
        field.textColor = DS.Color.text
        field.autocorrectionType = .no
        field.delegate = self
        if numeric {
            field.keyboardType = .numberPad
            field.addTarget(self, action: #selector(formatMoney(_:)), for: .editingChanged)
        }
    }

    private func field(title: String, required: Bool, input: UITextField, unit: String? = nil, accessory: UIView? = nil) -> UIView {
        let titleLabel = V2.label(title, size: DS.TextSize.body, weight: .bold)
        if required {
            let text = NSMutableAttributedString(string: title + " ", attributes: [NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.body)])
            text.append(NSAttributedString(string: "*", attributes: [NSAttributedString.Key.foregroundColor: V2.danger,
                                                                     NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.body)]))
            titleLabel.attributedText = text
        }
        input.accessibilityLabel = title
        let box = UIView()
        box.layer.cornerRadius = 12
        box.layer.borderWidth = 1
        box.layer.borderColor = V2.border.cgColor
        input.setContentHuggingPriority(.defaultLow, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [input])
        row.alignment = .center
        row.spacing = 8
        if let unit {
            let unitLabel = V2.label(unit, size: DS.TextSize.body, color: DS.Color.textMuted)
            unitLabel.setContentHuggingPriority(.required, for: .horizontal)
            unitLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
            row.addArrangedSubview(unitLabel)
        }
        if let accessory { row.addArrangedSubview(accessory) }
        box.addSubview(row)
        row.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(12)
            make.trailing.equalToSuperview().offset(accessory == nil ? -12 : 0)
            make.top.bottom.equalToSuperview()
        }
        box.snp.makeConstraints { make in make.height.equalTo(48) }
        let stack = UIStackView(arrangedSubviews: [titleLabel, box])
        stack.axis = .vertical
        stack.spacing = 6
        return padded(stack, top: 8, bottom: 8)
    }

    private func pair(_ left: UIView, _ right: UIView) -> UIView {
        let stack = UIStackView(arrangedSubviews: [left, right])
        stack.distribution = .fillEqually
        (left as? UIStackView)?.layoutMargins.right = 6
        (right as? UIStackView)?.layoutMargins.left = 6
        return stack
    }

    private func padded(_ view: UIView, top: CGFloat, bottom: CGFloat) -> UIStackView {
        let wrap = UIStackView(arrangedSubviews: [view])
        wrap.isLayoutMarginsRelativeArrangement = true
        wrap.layoutMargins = UIEdgeInsets(top: top, left: DS.Spacing.lg, bottom: bottom, right: DS.Spacing.lg)
        return wrap
    }

    // MARK: - Fill

    private func fill() {
        guard let product else {
            quantityStepper.value = 1
            stockNote.isHidden = true
            renderPhotos()
            renderCategory()
            return
        }
        nameField.text = product.name
        barcodeField.text = product.barcode
        categoryId = product.categoryId ?? product.category?.id
        perRentalField.text = MoneyInput.display(ProductPricing.perRental(product))
        perDayField.text = MoneyInput.display(ProductPricing.perDay(product))
        saleField.text = MoneyInput.display(ProductPricing.sale(product))
        if let deposit = product.deposit, deposit > 0 { depositField.text = MoneyInput.display(deposit) }
        defaultMode = ProductPricing.defaultMode(product)
        defaultToggle.select(defaultMode == .perDay ? 1 : 0)
        photos = (product.images?.isEmpty == false ? product.images! : [product.image_url].compactMap { $0 })
            .filter { !$0.isEmpty }.map { .remote($0) }
        renderStock()
        renderPhotos()
        renderCategory()
    }

    private func renderStock() {
        guard let counts = stockCounts else { return }
        quantityStepper.value = counts.total
        stockNote.isHidden = false
        stockNote.text = String(format: "products.form.stockNote".localized(), counts.rented, counts.free)
    }

    private func renderCategory() {
        let name = categories.first(where: { $0.id == categoryId })?.name ?? product?.category?.name
        categoryRow.valueLabel.text = categoryId == nil ? "products.form.choose".localized() : (name ?? "products.form.choose".localized())
    }

    private func renderPhotos() {
        photoStrip.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for (index, photo) in photos.enumerated() {
            let tile = UIImageView()
            tile.contentMode = .scaleAspectFill
            tile.clipsToBounds = true
            tile.layer.cornerRadius = 12
            tile.layer.borderWidth = 1
            tile.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
            tile.isUserInteractionEnabled = true
            switch photo {
            case .remote(let url): V2.setImage(tile, url: url)
            case .local(let image): tile.image = image
            }
            tile.snp.makeConstraints { make in make.width.height.equalTo(84) }
            if index == 0 {
                let cover = V2.label(" " + "products.form.cover".localized() + " ", size: DS.TextSize.pill, weight: .bold, color: .white)
                cover.backgroundColor = DS.Color.text.withAlphaComponent(0.7)
                cover.layer.cornerRadius = 4
                cover.clipsToBounds = true
                tile.addSubview(cover)
                cover.snp.makeConstraints { make in make.leading.bottom.equalToSuperview().inset(4) }
            }
            let remove = UIButton(type: .system)
            remove.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
            remove.tintColor = .white
            remove.layer.shadowOpacity = 0.4
            remove.layer.shadowRadius = 2
            remove.tag = index
            remove.accessibilityLabel = "products.form.removePhoto".localized()
            remove.addTarget(self, action: #selector(removePhoto(_:)), for: .touchUpInside)
            tile.addSubview(remove)
            remove.snp.makeConstraints { make in
                make.top.trailing.equalToSuperview()
                make.width.height.equalTo(DS.touchTarget)
            }
            photoStrip.addArrangedSubview(tile)
        }
        if photos.count < ProductFormValidator.maxPhotos {
            let add = UIButton(type: .system)
            add.setImage(DS.symbol("camera", DS.Icon.lg), for: .normal)
            add.setTitle("products.form.addPhoto".localized(), for: .normal)
            add.titleLabel?.font = Utils.boldFont(size: DS.TextSize.pill)
            add.tintColor = DS.Color.primary
            add.backgroundColor = V2.sectionFill
            add.layer.cornerRadius = 12
            add.layer.borderWidth = 1.5
            add.layer.borderColor = UIColor(hexString: "94A3B8").cgColor
            add.imageEdgeInsets = UIEdgeInsets(top: -18, left: 24, bottom: 0, right: 0)
            add.titleEdgeInsets = UIEdgeInsets(top: 30, left: -24, bottom: 0, right: 0)
            add.addTarget(self, action: #selector(addPhoto(_:)), for: .touchUpInside)
            add.snp.makeConstraints { make in make.width.height.equalTo(84) }
            photoStrip.addArrangedSubview(add)
        }
    }

    // MARK: - Data

    private func loadCategories() {
        CategoryService.shared.loadCategories(keyword: nil, page: 1, limit: 100) { [weak self] response, _ in
            DispatchQueue.main.async {
                self?.categories = (response?.categories ?? []).filter { $0.isActive != false && $0.id != nil }
                self?.renderCategory()
            }
        }
    }

    private func loadOutlets() {
        OutletService.shared.getOutlets { [weak self] outlets, _ in
            DispatchQueue.main.async {
                self?.merchantOutlets = (outlets ?? []).filter { $0.isActive != false }.map { (id: $0.id, isDefault: $0.isDefault == true) }
                self?.renderStock()
            }
        }
    }

    // MARK: - Actions

    @objc private func endEditing() {
        view.endEditing(true)
    }

    @objc private func closeTapped() {
        dismiss(animated: true)
    }

    @objc private func formatMoney(_ field: UITextField) {
        field.text = MoneyInput.display(MoneyInput.parse(field.text))
    }

    @objc private func defaultChanged() {
        defaultMode = defaultToggle.selectedIndex == 1 ? .perDay : .perRental
    }

    @objc private func barcodeEdited() {
        barcodeWarning.isHidden = true
    }

    @objc private func removePhoto(_ sender: UIButton) {
        guard sender.tag < photos.count else { return }
        photos.remove(at: sender.tag)
        renderPhotos()
    }

    @objc private func addPhoto(_ sender: UIView) {
        let sheet = UIAlertController(title: "Select Image Source".localized(), message: nil, preferredStyle: .actionSheet)
        if UIImagePickerController.isSourceTypeAvailable(.camera) {
            sheet.addAction(UIAlertAction(title: "Camera".localized(), style: .default) { [weak self] _ in
                guard let self else { return }
                self.picker.sourceType = .camera
                self.present(self.picker, animated: true)
            })
        }
        sheet.addAction(UIAlertAction(title: "Photo Library".localized(), style: .default) { [weak self] _ in
            guard let self else { return }
            self.picker.sourceType = .photoLibrary
            self.present(self.picker, animated: true)
        })
        sheet.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        sheet.popoverPresentationController?.sourceView = sender
        sheet.popoverPresentationController?.sourceRect = sender.bounds
        present(sheet, animated: true)
    }

    @objc private func pickCategory() {
        let sheet = UIAlertController(title: "products.form.category".localized(), message: nil, preferredStyle: .actionSheet)
        sheet.addAction(UIAlertAction(title: "products.form.noCategory".localized(), style: .default) { [weak self] _ in
            self?.categoryId = nil
            self?.renderCategory()
        })
        for category in categories {
            sheet.addAction(UIAlertAction(title: category.name, style: .default) { [weak self] _ in
                self?.categoryId = category.id
                self?.renderCategory()
            })
        }
        sheet.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        sheet.popoverPresentationController?.sourceView = categoryRow
        sheet.popoverPresentationController?.sourceRect = categoryRow.bounds
        present(sheet, animated: true)
    }

    @objc private func scanBarcode() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                if granted { DispatchQueue.main.async { self.scanBarcode() } }
            }
        case .authorized:
            reader.delegate = self
            reader.modalPresentationStyle = .formSheet
            present(reader, animated: true)
        default:
            UIAlertController.alert(parent: self, title: "common.permission.camera.title".localized(),
                                    message: "common.permission.camera.settingsMessage".localized())
        }
    }

    /// A code already used by another product shows a warning; the shop decides
    private func checkBarcode(_ code: String) {
        let ownId = product.map { $0.id ?? $0.product_id }
        LiveProductsHomeDataSource().loadProducts(query: code, page: 1, limit: 20) { [weak self] page, _ in
            DispatchQueue.main.async {
                guard let self, self.barcodeField.text == code else { return }
                if let match = BarcodeMatch.exact(code, in: page?.products ?? []), (match.id ?? match.product_id) != ownId {
                    self.barcodeWarning.text = String(format: "products.form.barcodeUsed".localized(), match.name ?? "")
                    self.barcodeWarning.isHidden = false
                }
            }
        }
    }

    @objc private func saveTapped() {
        view.endEditing(true)
        let rented = stockCounts?.rented ?? 0
        let input = ProductFormInput(
            name: nameField.text ?? "",
            perRental: MoneyInput.parse(perRentalField.text),
            perDay: MoneyInput.parse(perDayField.text),
            defaultMode: defaultMode,
            salePrice: MoneyInput.parse(saleField.text),
            deposit: MoneyInput.parse(depositField.text),
            quantity: quantityStepper.value,
            rented: isEdit ? rented : 0,
            photoCount: photos.count,
            showsPrices: showsPrices
        )
        let issues = ProductFormValidator.validate(input)
        guard issues.isEmpty else {
            UIAlertController.alert(parent: self, title: "Error".localized(), message: issues.map { $0.message }.joined(separator: "\n"))
            return
        }
        guard let outletId = ProductOutletChoice.outletId(userOutletId: userOutletId, product: product, merchantOutlets: merchantOutlets) else {
            UIAlertController.alert(parent: self, title: "Error".localized(), message: "products.form.error.outlet".localized())
            return
        }
        save(input, outletId: outletId)
    }

    private func save(_ input: ProductFormInput, outletId: Int) {
        let name = input.name.trimmingCharacters(in: .whitespacesAndNewlines)
        let barcode = (barcodeField.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let keptUrls = photos.compactMap { photo -> String? in if case .remote(let url) = photo { return url }; return nil }
        let newImages = photos.compactMap { photo -> UIImage? in if case .local(let image) = photo { return image }; return nil }
        let options = showsPrices ? ProductPricing.options(perRental: input.perRental, perDay: input.perDay, defaultMode: input.defaultMode) : nil
        let merchantId = User.current()?.merchant?.id ?? User.current()?.merchantId

        let completion: (Product?, NSError?) -> Void = { [weak self] saved, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                guard let saved else { return }
                self.onSaved?(saved)
                self.dismiss(animated: true)
            }
        }

        showProgressText(text: "Loading...".localized())
        if let product {
            // Prices only when the user may set them (the API also strips them without products.manage)
            let request = UpdateProductRequest(
                name: name,
                description: nil,
                barcode: barcode.isEmpty ? nil : barcode,
                rentPrice: showsPrices ? (options?.first(where: { $0.isDefault })?.price ?? 0) : nil,
                salePrice: showsPrices ? (input.salePrice ?? 0) : nil,
                costPrice: nil,
                deposit: showsPrices ? (input.deposit ?? 0) : nil,
                totalStock: nil,
                categoryId: categoryId,
                merchantId: nil,
                outletStock: [OutletStockItem(outletId: outletId, stock: input.quantity)],
                images: keptUrls,
                isActive: nil,
                pricingType: nil,
                durationConfig: nil,
                pricingOptions: options
            )
            ProductService.shared.updateProduct(productId: product.id ?? product.product_id, request: request, images: newImages, completion: completion)
        } else {
            let request = CreateProductRequest.create(
                name: name,
                barcode: barcode.isEmpty ? nil : barcode,
                rentPrice: showsPrices ? (options?.first(where: { $0.isDefault })?.price ?? 0) : 0,
                salePrice: showsPrices ? input.salePrice : nil,
                deposit: showsPrices ? input.deposit : nil,
                totalStock: input.quantity,
                categoryId: categoryId,
                merchantId: merchantId,
                outletId: outletId,
                images: keptUrls.isEmpty ? nil : keptUrls,
                pricingOptions: (options?.isEmpty ?? true) ? nil : options
            )
            ProductService.shared.createProduct(request: request, images: newImages, completion: completion)
        }
    }
}

extension ProductFormViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        return true
    }

    func textFieldDidEndEditing(_ textField: UITextField) {
        if textField === barcodeField, let code = barcodeField.text?.trimmingCharacters(in: .whitespacesAndNewlines), !code.isEmpty,
           code != product?.barcode {
            checkBarcode(code)
        }
    }
}

extension ProductFormViewController: UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [String: Any]) {
        picker.dismiss(animated: true)
        guard let image = info[UIImagePickerControllerOriginalImage] as? UIImage,
              photos.count < ProductFormValidator.maxPhotos else { return }
        photos.append(.local(image))
        renderPhotos()
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }
}

extension ProductFormViewController: QRCodeReaderViewControllerDelegate {
    func readerDidCancel(_ reader: QRCodeReaderViewController) {
        dismiss(animated: true)
    }

    func reader(_ reader: QRCodeReaderViewController, didScanResult result: QRCodeReaderResult) {
        reader.stopScanning()
        AudioServicesPlaySystemSound(1016)
        let code = result.value.trimmingCharacters(in: .whitespacesAndNewlines)
        dismiss(animated: true) { [weak self] in
            guard let self, !code.isEmpty else { return }
            self.barcodeField.text = code
            self.barcodeWarning.isHidden = true
            if code != self.product?.barcode { self.checkBarcode(code) }
        }
    }
}
