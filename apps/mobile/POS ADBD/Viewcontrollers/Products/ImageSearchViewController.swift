import UIKit
import MBProgressHUD
import SnapKit
import AVFoundation
import CoreImage
import CoreMedia

/// Live camera image search. Capture (or pick from library) then present matches in a sheet.
class ImageSearchViewController: BaseViewControler {

    private let cameraPreviewView: UIView = {
        let view = UIView()
        view.backgroundColor = .black
        return view
    }()

    private let capturedImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.isHidden = true
        return imageView
    }()

    private lazy var captureButton: UIButton = {
        let button = UIButton(type: .custom)
        let config = UIImage.SymbolConfiguration(pointSize: 32, weight: .medium)
        button.setImage(UIImage(systemName: "camera.fill", withConfiguration: config), for: .normal)
        button.tintColor = .white
        button.backgroundColor = UIColor.black.withAlphaComponent(0.5)
        button.layer.cornerRadius = 35
        button.addTarget(self, action: #selector(captureFrame), for: .touchUpInside)
        return button
    }()

    private lazy var photoLibraryButton: UIButton = {
        let button = UIButton(type: .custom)
        let config = UIImage.SymbolConfiguration(pointSize: 24, weight: .medium)
        button.setImage(UIImage(systemName: "photo.on.rectangle", withConfiguration: config), for: .normal)
        button.tintColor = .white
        button.backgroundColor = UIColor.black.withAlphaComponent(0.5)
        button.layer.cornerRadius = 25
        button.addTarget(self, action: #selector(openPhotoLibrary), for: .touchUpInside)
        return button
    }()

    private lazy var cancelButton: UIButton = {
        let button = UIButton(type: .custom)
        let config = UIImage.SymbolConfiguration(pointSize: 24, weight: .medium)
        button.setImage(UIImage(systemName: "xmark", withConfiguration: config), for: .normal)
        button.tintColor = .white
        button.backgroundColor = UIColor.black.withAlphaComponent(0.5)
        button.layer.cornerRadius = 25
        button.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        return button
    }()

    /// Ring over the detected product center (normalized 0...1).
    private let productIndicatorView: UIView = {
        let view = UIView()
        view.backgroundColor = .clear
        view.layer.cornerRadius = 8
        view.layer.borderWidth = 2
        view.layer.borderColor = UIColor.white.cgColor
        view.isHidden = true
        return view
    }()

    private var searchResults: [Product] = []
    /// #672: the photo just searched, shown in the results header
    private var searchedPhoto: UIImage?
    /// #672: "Tìm bằng tên" on the empty results; nil just closes image search
    var onSearchByName: (() -> Void)?
    private let minSimilarity: Float = 0.6

    private var captureSession: AVCaptureSession?
    private var videoOutput: AVCaptureVideoDataOutput?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var currentFrame: CVPixelBuffer?
    private var isCameraSetup = false

    private let imageValidator = CIImageValidator()
    private var lastValidationTime = Date()
    private let validationInterval: TimeInterval = 0.5
    private var isValidating = false

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupCamera()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: animated)
        startCameraSession()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopCameraSession()
        navigationController?.setNavigationBarHidden(false, animated: animated)
    }

    override func setupUI() {
        title = "Search by Image".localized()
        view.backgroundColor = .black

        view.addSubview(cameraPreviewView)
        view.addSubview(capturedImageView)
        view.addSubview(captureButton)
        view.addSubview(photoLibraryButton)
        view.addSubview(cancelButton)
        view.addSubview(productIndicatorView)

        cameraPreviewView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        capturedImageView.snp.makeConstraints { make in
            make.edges.equalTo(cameraPreviewView)
        }
        cancelButton.snp.makeConstraints { make in
            make.width.height.equalTo(50)
            make.top.equalTo(view.safeAreaLayoutGuide).offset(20)
            make.leading.equalToSuperview().offset(20)
        }
        captureButton.snp.makeConstraints { make in
            make.width.height.equalTo(70)
            make.centerX.equalToSuperview()
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-40)
        }
        photoLibraryButton.snp.makeConstraints { make in
            make.width.height.equalTo(50)
            make.leading.equalToSuperview().offset(20)
            make.centerY.equalTo(captureButton)
        }
        productIndicatorView.snp.makeConstraints { make in
            make.width.height.equalTo(16)
            make.centerX.equalToSuperview()
            make.centerY.equalToSuperview()
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = cameraPreviewView.bounds
    }

    @objc private func cancelTapped() {
        stopCameraSession()
        dismiss(animated: true)
    }

    private func setupCamera() {
        switch AVCaptureDevice.authorizationStatus(for: AVMediaType.video) {
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: AVMediaType.video) { [weak self] granted in
                DispatchQueue.main.async {
                    if granted {
                        self?.initializeCamera()
                        self?.startCameraSession()
                    } else {
                        self?.showCameraPermissionAlert()
                    }
                }
            }
        case .authorized:
            initializeCamera()
        case .denied, .restricted:
            showCameraPermissionAlert()
        @unknown default:
            showCameraPermissionAlert()
        }
    }

    private func initializeCamera() {
        guard !isCameraSetup else { return }

        captureSession = AVCaptureSession()
        captureSession?.sessionPreset = .high
        guard let captureSession = captureSession else { return }

        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: AVMediaType.video, position: .back) else {
            showAlert(message: "Unable to access camera".localized())
            return
        }

        do {
            let input = try AVCaptureDeviceInput(device: camera)
            if captureSession.canAddInput(input) {
                captureSession.addInput(input)
            }

            videoOutput = AVCaptureVideoDataOutput()
            videoOutput?.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
            videoOutput?.setSampleBufferDelegate(self, queue: DispatchQueue(label: "camera.frame.processing.queue"))
            if let videoOutput = videoOutput, captureSession.canAddOutput(videoOutput) {
                captureSession.addOutput(videoOutput)
            }

            previewLayer = AVCaptureVideoPreviewLayer(session: captureSession)
            previewLayer?.videoGravity = .resizeAspectFill
            previewLayer?.frame = cameraPreviewView.bounds
            if let previewLayer = previewLayer {
                cameraPreviewView.layer.addSublayer(previewLayer)
            }

            isCameraSetup = true
        } catch {
            let errorMessage = String(format: "Camera initialization error: %@".localized(), error.localizedDescription)
            showAlert(message: errorMessage)
        }
    }

    private func startCameraSession() {
        guard let captureSession = captureSession, !captureSession.isRunning else { return }
        DispatchQueue.global(qos: .userInitiated).async {
            captureSession.startRunning()
        }
    }

    private func stopCameraSession() {
        guard let captureSession = captureSession, captureSession.isRunning else { return }
        DispatchQueue.global(qos: .userInitiated).async {
            captureSession.stopRunning()
        }
    }

    @objc private func captureFrame() {
        guard let frame = currentFrame else {
            showAlert(message: "No frame available".localized())
            return
        }

        stopCameraSession()

        let ciImage = CIImage(cvPixelBuffer: frame)
        let context = CIContext(options: nil)
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else {
            showAlert(message: "Unable to process frame".localized())
            startCameraSession()
            return
        }

        let image = UIImage(cgImage: cgImage, scale: 1.0, orientation: .right)
        let fixedImage = image.fixImageOrientation()

        capturedImageView.image = fixedImage
        capturedImageView.isHidden = false
        productIndicatorView.isHidden = true
        processAndSearchImage(image: fixedImage)
    }

    @objc private func openPhotoLibrary() {
        let picker = UIImagePickerController()
        picker.sourceType = .photoLibrary
        picker.delegate = self
        picker.allowsEditing = false
        picker.modalPresentationStyle = .fullScreen
        present(picker, animated: true)
    }

    private func showCameraPermissionAlert() {
        let alert = UIAlertController(
            title: "common.permission.camera.title".localized(),
            message: "common.permission.camera.settingsMessage".localized(),
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "common.action.settings".localized(), style: .default) { _ in
            if let url = URL(string: UIApplicationOpenSettingsURLString) {
                UIApplication.shared.open(url)
            }
        })
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        present(alert, animated: true)
    }

    /// #654: 512 px long side, JPEG 0.7 (`ImageSearchQuery`; same numbers on Android)
    private func compressImageForSearch(image: UIImage) -> Data? {
        return ImageSearchQuery.jpegData(from: image)
    }

    private func processAndSearchImage(image: UIImage) {
        guard let compressedData = compressImageForSearch(image: image) else {
            showAlert(message: "Unable to compress image".localized())
            resumeCameraPreview()
            return
        }
        performImageSearch(imageData: compressedData, image: image)
    }

    private func performImageSearch(imageData: Data, image: UIImage) {
        let hud = MBProgressHUD.showAdded(to: self.view, animated: true)
        hud.label.text = "Searching...".localized()

        ProductService.shared.searchProductsByImage(
            imageData: imageData,
            image: image,
            limit: 50,
            minSimilarity: minSimilarity,
            categoryId: nil
        ) { [weak self] products, _, _, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                MBProgressHUD.hide(for: self.view, animated: true)

                if let error = error {
                    self.showAlert(message: error.localizedDescription)
                    self.resumeCameraPreview()
                    return
                }

                self.searchResults = products ?? []
                self.searchedPhoto = image
                self.presentResultsSheet()
            }
        }
    }

    private func presentResultsSheet() {
        let resultsVC = ImageSearchResultsViewController(products: searchResults, photo: searchedPhoto)
        resultsVC.onDismiss = { [weak self] in
            self?.resumeCameraPreview()
        }
        resultsVC.onSearchByName = { [weak self] in
            self?.closeForSearchByName()
        }

        let navController = UINavigationController(rootViewController: resultsVC)
        // Swiping the sheet down while a product detail is on top still resumes the camera
        navController.presentationController?.delegate = resultsVC
        if #available(iOS 15.0, *) {
            if let sheet = navController.sheetPresentationController {
                sheet.detents = [.medium(), .large()]
                sheet.preferredCornerRadius = 16
                sheet.prefersGrabberVisible = true
                sheet.largestUndimmedDetentIdentifier = .medium
            }
        } else {
            navController.modalPresentationStyle = .pageSheet
        }
        present(navController, animated: true)
    }

    private func resumeCameraPreview() {
        capturedImageView.isHidden = true
        capturedImageView.image = nil
        searchedPhoto = nil
        startCameraSession()
    }

    /// #672: "Tìm bằng tên" closes image search, then the caller focuses its name search
    private func closeForSearchByName() {
        stopCameraSession()
        let searchByName = onSearchByName
        dismiss(animated: true) {
            searchByName?()
        }
    }

    private func showAlert(message: String) {
        let alert = UIAlertController(
            title: "Notification".localized(),
            message: message,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
        present(alert, animated: true)
    }
}

extension ImageSearchViewController: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(
        _ output: AVCaptureOutput,
        didOutput sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        currentFrame = pixelBuffer

        let now = Date()
        if now.timeIntervalSince(lastValidationTime) >= validationInterval {
            lastValidationTime = now
            validateCurrentFrame(pixelBuffer: pixelBuffer)
        }
    }

    private func validateCurrentFrame(pixelBuffer: CVPixelBuffer) {
        if isValidating { return }
        isValidating = true

        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let context = CIContext(options: nil)
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else {
            isValidating = false
            return
        }

        let image = UIImage(cgImage: cgImage, scale: 1.0, orientation: .right)
        let fixedImage = image.fixImageOrientation()

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let strongSelf = self else { return }
            let productCenter = strongSelf.imageValidator.detectProductCenter(fixedImage)
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.isValidating = false
                self.updateProductIndicator(center: productCenter)
            }
        }
    }

    private func updateProductIndicator(center: CGPoint) {
        guard capturedImageView.isHidden else {
            productIndicatorView.isHidden = true
            return
        }
        if center.x < 0 || center.y < 0 || center.x > 1 || center.y > 1 {
            productIndicatorView.isHidden = true
            return
        }
        guard let previewLayer = previewLayer else { return }
        productIndicatorView.isHidden = false
        let x = center.x * previewLayer.bounds.width
        let y = center.y * previewLayer.bounds.height
        productIndicatorView.snp.remakeConstraints { make in
            make.width.height.equalTo(16)
            make.centerX.equalTo(cameraPreviewView.snp.leading).offset(x)
            make.centerY.equalTo(cameraPreviewView.snp.top).offset(y)
        }
        UIView.animate(withDuration: 0.2) {
            self.view.layoutIfNeeded()
        }
    }
}

extension ImageSearchViewController: UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    func imagePickerController(
        _ picker: UIImagePickerController,
        didFinishPickingMediaWithInfo info: [String: Any]
    ) {
        guard let originalImage = info[UIImagePickerControllerOriginalImage] as? UIImage else {
            picker.dismiss(animated: true)
            showAlert(message: "Unable to load image".localized())
            return
        }

        picker.dismiss(animated: true) { [weak self] in
            self?.stopCameraSession()
            self?.capturedImageView.image = originalImage
            self?.capturedImageView.isHidden = false
            self?.productIndicatorView.isHidden = true
            self?.processAndSearchImage(image: originalImage)
        }
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }
}

// MARK: - Results sheet

/// #672: header with the photo just taken and "Chụp lại", then the Products home rows (`ProductRowV2Cell`) in
/// API order; no matches shows tips with "Chụp lại" and "Tìm bằng tên".
final class ImageSearchResultsViewController: BaseViewControler {

    private let products: [Product]
    private let photo: UIImage?
    var onDismiss: (() -> Void)?
    /// "Tìm bằng tên": close image search and go to the name search
    var onSearchByName: (() -> Void)?
    private var didNotifyDismiss = false

    private lazy var list: UITableView = {
        let table = UITableView(frame: .zero, style: .plain)
        table.dataSource = self
        table.delegate = self
        table.backgroundColor = .white
        table.separatorStyle = .none
        table.rowHeight = UITableViewAutomaticDimension
        table.estimatedRowHeight = DS.Gap.productRowMinHeight
        table.register(ProductRowV2Cell.self, forCellReuseIdentifier: ProductRowV2Cell.reuseId)
        return table
    }()

    init(products: [Product], photo: UIImage?) {
        self.products = products
        self.photo = photo
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        let content = ImageSearchResults.content(count: products.count)
        let header = buildHeader(showRetake: content == .list)
        view.addSubview(header)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(DS.Spacing.lg)
            make.leading.trailing.equalToSuperview()
        }
        let body: UIView = content == .list ? list : buildEmptyState()
        view.addSubview(body)
        body.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
        NotificationCenter.default.addObserver(self, selector: #selector(cartChanged), name: .cartStoreDidChange, object: nil)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // The sheet draws its own header; product detail manages the bar itself when pushed
        navigationController?.setNavigationBarHidden(true, animated: animated)
        list.reloadData()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if isBeingDismissed || navigationController?.isBeingDismissed == true {
            notifyDismiss()
        }
    }

    // MARK: Layout

    private func buildHeader(showRetake: Bool) -> UIView {
        let header = UIView()
        let thumb = V2.thumbnail(size: 52, radius: 12)
        thumb.image = photo
        thumb.isAccessibilityElement = false
        let title = V2.label(ImageSearchResults.title(count: products.count), size: DS.TextSize.amount, weight: .bold, lines: 2)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        let subtitle = V2.label("imageSearch.results.subtitle".localized(), size: DS.TextSize.secondary, color: DS.Color.textMuted)
        let texts = UIStackView(arrangedSubviews: [title, subtitle])
        texts.axis = .vertical
        texts.spacing = 2
        texts.setContentHuggingPriority(UILayoutPriority(1), for: .horizontal)
        texts.setContentCompressionResistancePriority(UILayoutPriority(1), for: .horizontal)
        let row = UIStackView(arrangedSubviews: [thumb, texts])
        row.alignment = .center
        row.spacing = 12
        if showRetake {
            row.addArrangedSubview(retakeOutlineButton())
        }
        header.addSubview(row)
        let line = V2.divider()
        line.backgroundColor = DS.Color.border
        header.addSubview(line)
        row.snp.makeConstraints { make in
            make.top.equalToSuperview()
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
        line.snp.makeConstraints { make in
            make.top.equalTo(row.snp.bottom).offset(DS.Spacing.lg)
            make.leading.trailing.bottom.equalToSuperview()
        }
        return header
    }

    /// Outlined "📷 Chụp lại" at the end of the header
    private func retakeOutlineButton() -> UIButton {
        let button = UIButton(type: .system)
        button.setImage(DS.symbol("camera", DS.Icon.sm), for: .normal)
        button.setTitle("imageSearch.action.retake".localized(), for: .normal)
        button.setTitleColor(DS.Color.text, for: .normal)
        button.tintColor = DS.Color.text
        button.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        button.layer.cornerRadius = 12
        button.layer.borderWidth = 1
        button.layer.borderColor = V2.border.cgColor
        button.contentEdgeInsets = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 16)
        button.titleEdgeInsets = UIEdgeInsets(top: 0, left: 6, bottom: 0, right: -6)
        button.setContentHuggingPriority(.required, for: .horizontal)
        button.setContentCompressionResistancePriority(.required, for: .horizontal)
        button.addTarget(self, action: #selector(retakeTapped), for: .touchUpInside)
        button.snp.makeConstraints { make in make.height.equalTo(DS.touchTarget) }
        return button
    }

    private func buildEmptyState() -> UIView {
        let scroll = UIScrollView()
        scroll.alwaysBounceVertical = true

        let iconCircle = UIView()
        iconCircle.backgroundColor = UIColor(hexString: "EEF2FF")
        iconCircle.layer.cornerRadius = 32
        let icon = UIImageView(image: DS.symbol("magnifyingglass", 28, weight: .semibold))
        icon.tintColor = UIColor(hexString: "3730A3")
        icon.contentMode = .center
        iconCircle.addSubview(icon)
        iconCircle.snp.makeConstraints { make in make.width.height.equalTo(64) }
        icon.snp.makeConstraints { make in make.center.equalToSuperview() }

        let headline = V2.label("imageSearch.empty.headline".localized(), size: DS.TextSize.amount, weight: .bold, lines: 0)
        headline.textAlignment = .center
        let message = V2.label("imageSearch.empty.message".localized(), size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
        message.textAlignment = .center

        let tips = UIStackView(arrangedSubviews: ImageSearchResults.tipKeys.map { key in
            V2.label("•  " + key.localized(), size: DS.TextSize.body, lines: 0)
        })
        tips.axis = .vertical
        tips.spacing = 8

        let retake = V2.primaryButton("imageSearch.action.retake".localized())
        retake.addTarget(self, action: #selector(retakeTapped), for: .touchUpInside)
        let byName = V2.secondaryButton("imageSearch.action.searchByName".localized())
        byName.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        byName.addTarget(self, action: #selector(searchByNameTapped), for: .touchUpInside)

        let column = UIStackView(arrangedSubviews: [iconCircle, headline, message, tips, retake, byName])
        column.axis = .vertical
        column.alignment = .center
        column.spacing = 12
        column.setCustomSpacing(16, after: iconCircle)
        column.setCustomSpacing(24, after: message)
        column.setCustomSpacing(28, after: tips)
        scroll.addSubview(column)
        column.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(40)
            make.bottom.equalToSuperview().offset(-24)
            make.leading.trailing.equalTo(scroll.frameLayoutGuide).inset(DS.Spacing.xl)
        }
        [headline, message, retake, byName].forEach { item in
            item.snp.makeConstraints { make in make.leading.trailing.equalToSuperview() }
        }
        return scroll
    }

    // MARK: Actions

    @objc private func retakeTapped() {
        dismiss(animated: true) { [weak self] in
            self?.notifyDismiss()
        }
    }

    @objc private func searchByNameTapped() {
        let searchByName = onSearchByName
        dismiss(animated: true) { [weak self] in
            self?.notifyDismiss()
            searchByName?()
        }
    }

    @objc private func cartChanged() {
        list.reloadData() // the + buttons show the cart count
    }

    private func notifyDismiss() {
        guard !didNotifyDismiss else { return }
        didNotifyDismiss = true
        onDismiss?()
    }

    /// #654: a result row opens the product detail (same as Android), full height inside the sheet
    private func openDetail(_ product: Product) {
        guard let nav = navigationController else { return }
        if #available(iOS 15.0, *), let sheet = nav.sheetPresentationController {
            sheet.animateChanges { sheet.selectedDetentIdentifier = .large }
        }
        let detail = ProductDetailViewController(product: product)
        nav.pushViewController(detail, animated: true)
    }

    private func addProductToCart(_ product: Product) {
        defer { list.reloadData() }
        guard let infoVC = findInfoMainViewController() else {
            // Redesigned Home (#373) has no InfoMainViewController; add straight to the cart store
            if FeatureFlags.shared.isOn(.newProducts) {
                ProductsCartBridge.add(product)
                HapticFeedback.light()
                showToast(message: "Added to cart".localized(), icon: UIImage(systemName: "checkmark.circle.fill"))
                return
            }
            showToast(message: "Unable to add product to cart".localized(), icon: UIImage(systemName: "exclamationmark.triangle"))
            return
        }

        let price: Double
        if CartStore.shared.cart.orderType == .rent {
            price = product.rentPrice ?? product.rent
        } else {
            price = product.salePrice ?? product.sale
        }

        infoVC.addProduct(product: product, quantity: 1, price: price)
        updateCartBadge()
        HapticFeedback.light()
        showToast(message: "Added to cart".localized(), icon: UIImage(systemName: "checkmark.circle.fill"))
    }

    private func updateCartBadge() {
        guard
            let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
            let window = windowScene.windows.first,
            let tabbarController = window.rootViewController as? TabbarViewController
        else { return }

        for viewController in tabbarController.viewControllers ?? [] {
            guard let navController = viewController as? UINavigationController else { continue }
            for viewController in navController.viewControllers {
                if let mainVC = viewController as? MainViewController {
                    mainVC.updateCartBadge()
                    return
                }
            }
        }
    }

    private func findInfoMainViewController() -> InfoMainViewController? {
        guard
            let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
            let window = windowScene.windows.first,
            let tabbarController = window.rootViewController as? TabbarViewController
        else { return nil }

        for viewController in tabbarController.viewControllers ?? [] {
            guard let navController = viewController as? UINavigationController else { continue }
            for viewController in navController.viewControllers {
                if let mainVC = viewController as? MainViewController {
                    return mainVC.cartViewController
                }
            }
        }
        return nil
    }
}

extension ImageSearchResultsViewController: UIAdaptivePresentationControllerDelegate {
    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        notifyDismiss()
    }
}

// #672: the same row as Products home (#671 round blue +, adds also when out today)
extension ImageSearchResultsViewController: UITableViewDataSource, UITableViewDelegate {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        products.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: ProductRowV2Cell.reuseId, for: indexPath) as! ProductRowV2Cell
        let product = products[indexPath.row]
        let inCart = ProductRowLogic.cartCount(productId: ProductRowLogic.cartId(product), in: CartStore.shared.cart.items)
        cell.bind(product, inCart: inCart)
        cell.onAdd = { [weak self] in self?.addProductToCart(product) }
        // #472: the thumbnail opens the photo full screen; without a photo it opens detail like the row
        cell.onImage = { [weak self] in
            guard let self else { return }
            if let request = ProductImages.thumbnailTap(product) {
                self.present(ImageViewerViewController(request: request), animated: true)
            } else {
                self.openDetail(product)
            }
        }
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        openDetail(products[indexPath.row])
    }
}
