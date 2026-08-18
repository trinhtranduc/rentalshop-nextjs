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
    private var totalResults: Int = 0
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

    private func compressImageForSearch(image: UIImage) -> Data? {
        return image.compressToTargetSize(
            targetSizeKB: 20,
            maxDimension: 1024,
            minQuality: 0.05
        )
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
        ) { [weak self] products, total, _, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                MBProgressHUD.hide(for: self.view, animated: true)

                if let error = error {
                    self.showAlert(message: error.localizedDescription)
                    self.resumeCameraPreview()
                    return
                }

                self.searchResults = products ?? []
                self.totalResults = total ?? products?.count ?? 0
                self.presentResultsSheet()
            }
        }
    }

    private func presentResultsSheet() {
        let resultsVC = ImageSearchResultsViewController(
            products: searchResults,
            totalResults: totalResults
        )
        resultsVC.onDismiss = { [weak self] in
            self?.resumeCameraPreview()
        }

        let navController = UINavigationController(rootViewController: resultsVC)
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
        startCameraSession()
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

class ImageSearchResultsViewController: BaseViewControler {

    private let products: [Product]
    private let totalResults: Int
    var onDismiss: (() -> Void)?
    private var didNotifyDismiss = false

    private let productTableView: UITableView = {
        let tableView = UITableView(frame: .zero, style: .plain)
        tableView.backgroundColor = .backgroundPrimary
        tableView.separatorStyle = .none
        tableView.rowHeight = UITableViewAutomaticDimension
        tableView.estimatedRowHeight = 100
        return tableView
    }()

    private let emptyStateLabel: UILabel = {
        let label = UILabel()
        label.font = .systemFont(ofSize: 16)
        label.textColor = .systemGray
        label.textAlignment = .center
        label.numberOfLines = 0
        label.text = "No similar products found".localized()
        label.isHidden = true
        return label
    }()

    init(products: [Product], totalResults: Int) {
        self.products = products
        self.totalResults = totalResults
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupTableView()
    }

    override func setupUI() {
        view.backgroundColor = .white

        if products.isEmpty {
            title = "No similar products found".localized()
        } else {
            title = String(format: "Results: %d products".localized(), totalResults)
        }

        navigationItem.rightBarButtonItem = UIBarButtonItem(
            barButtonSystemItem: .close,
            target: self,
            action: #selector(closeTapped)
        )

        view.addSubview(productTableView)
        view.addSubview(emptyStateLabel)

        productTableView.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.bottom.equalToSuperview()
        }
        emptyStateLabel.snp.makeConstraints { make in
            make.centerX.equalTo(productTableView)
            make.centerY.equalTo(productTableView)
            make.leading.trailing.equalTo(productTableView).inset(32)
        }
        emptyStateLabel.isHidden = !products.isEmpty
    }

    private func setupTableView() {
        productTableView.delegate = self
        productTableView.dataSource = self
        productTableView.register(ProductCell.self, forCellReuseIdentifier: String(describing: ProductCell.self))
    }

    @objc private func closeTapped() {
        dismiss(animated: true) { [weak self] in
            self?.notifyDismiss()
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if isBeingDismissed {
            notifyDismiss()
        }
    }

    private func notifyDismiss() {
        guard !didNotifyDismiss else { return }
        didNotifyDismiss = true
        onDismiss?()
    }
}

extension ImageSearchResultsViewController: UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return products.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(
            withIdentifier: String(describing: ProductCell.self),
            for: indexPath
        ) as! ProductCell
        cell.isUserInteractionEnabled = true
        cell.contentView.isUserInteractionEnabled = true
        cell.delegate = self

        let product = products[indexPath.row]
        cell.bind(product: product, searchWords: nil)
        cell.showCheckIndicator(true)
        cell.setupMoreButtonMenu(menu: createProductMenu(for: product, cell: cell))
        return cell
    }
}

extension ImageSearchResultsViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
    }
}

extension ImageSearchResultsViewController: ProductCellDelegate {
    func viewImage(sender: Product) {
        let controller = ImageProductViewController.instance(imageUrl: sender.image_url ?? "")
        let nav = UINavigationController(rootViewController: controller)
        present(nav, animated: true)
    }

    func more(product: Product, sender: ProductCell) {}

    private func createProductMenu(for product: Product, cell: ProductCell) -> UIMenu {
        let addToCartAction = UIAction(
            title: "Add to cart".localized(),
            image: UIImage(systemName: "cart.badge.plus")
        ) { [weak self] _ in
            self?.addProductToCart(product: product)
        }

        let checkAction = UIAction(
            title: "product.action.viewOrderHistory".localized(),
            image: UIImage(systemName: "list.bullet.rectangle")
        ) { [weak self] _ in
            self?.previewOrders(sender: cell, product: product)
        }

        return UIMenu(children: [addToCartAction, checkAction])
    }

    private func addProductToCart(product: Product) {
        guard let infoVC = findInfoMainViewController() else {
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

    func previewOrders(sender: ProductCell, product: Product) {
        let controller = OrderCheckViewController()
        controller.delegate = self
        controller.loadProduct(product)
        present(UINavigationController(rootViewController: controller), animated: true)
    }
}

extension ImageSearchResultsViewController: OrderCheckViewControllerDelegate {
    func didSelectOrder(order: Order, sender: OrderCheckViewController) {
        showProgressText(text: "Loading...".localized())
        OrderService.shared.loadOrderDetail(orderId: order.id) { [weak self] orderDetail, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.hideProgress()
                if let error = error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                guard let detail = orderDetail else {
                    let err = NSError.errorWithOwnMessage(message: "No order detail received".localized(), domain: "POS")
                    UIAlertController.errorAlert(parent: self, error: err)
                    return
                }
                let fullOrder = Order.from(detail: detail)
                guard let nav = self.navigationController else { return }
                let preview = PreviewViewController(order: fullOrder)
                preview.hidesBottomBarWhenPushed = true
                preview.delegate = self
                nav.pushViewController(preview, animated: true)
            }
        }
    }
}

extension ImageSearchResultsViewController: PreviewViewControllerDelegate {
    func didCompleteOrder(sender: PreviewViewController, updatedOrder: Order?) {
        navigationController?.popViewController(animated: true)
    }
}
