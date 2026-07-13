//
//  ImageSearchViewController.swift
//  POS ADBD
//
//  Created by AI Assistant
//  Copyright © 2024 Trinh Tran. All rights reserved.
//
//  EXAMPLE: Image Search Feature Implementation
//  This is a complete example showing how to use the image search API

import UIKit
import MBProgressHUD
import SnapKit
import AVFoundation
import CoreImage

class ImageSearchViewController: BaseViewControler {
    
    // MARK: - UI Components
    
    // Camera preview view
    private let cameraPreviewView: UIView = {
        let view = UIView()
        view.backgroundColor = .black
        return view
    }()
    
    // Captured image view (to show frozen frame)
    private let capturedImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.isHidden = true
        return imageView
    }()
    
    // Capture button overlay on camera preview
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
    
    // Photo library button
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
    
    // Cancel/Close button
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
    
    // Floating button removed - not needed when camera is always visible
    
    // Similarity slider and label removed - using fixed value
    
    // Result count label removed - will be shown in sheet
    
    // Validation feedback overlay
    private let validationOverlay: UIView = {
        let view = UIView()
        view.backgroundColor = UIColor.black.withAlphaComponent(0.8) // Same as ToastView
        view.layer.cornerRadius = 12 // Same as ToastView
        view.isHidden = true
        return view
    }()
    
    private let validationStatusLabel: UILabel = {
        let label = UILabel()
        label.font = .systemFont(ofSize: 14, weight: .medium)
        label.textColor = .white
        label.textAlignment = .center
        label.numberOfLines = 0
        return label
    }()
    
    // Product detection indicator (dot circle at center of detected object)
    private let productIndicatorView: UIView = {
        let view = UIView()
        view.backgroundColor = .clear // Transparent background
        view.layer.cornerRadius = 8
        view.layer.borderWidth = 2
        view.layer.borderColor = UIColor.white.cgColor
        view.isHidden = true
        return view
    }()
    
    // MARK: - Properties
    
    private var selectedImage: UIImage?
    private var searchResults: [Product] = []
    private var totalResults: Int = 0
    
    // Fixed minimum similarity (hidden from UI)
    private let minSimilarity: Float = 0.6
    
    // Camera properties
    private var captureSession: AVCaptureSession?
    private var videoOutput: AVCaptureVideoDataOutput?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var currentFrame: CVPixelBuffer?
    private var isCameraSetup = false
    
    // Image validation
    private let imageValidator: CIImageValidator = {
        return CIImageValidator()
    }()
    private var lastValidationTime: Date = Date()
    private let validationInterval: TimeInterval = 0.5 // Validate every 0.5 seconds
    private var currentValidationResult: CIValidationResult?
    
    // MARK: - Lifecycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupActions()
        setupTableView()
        setupImageValidator()
        setupCamera()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Hide navigation bar for full screen camera
        navigationController?.setNavigationBarHidden(true, animated: animated)
        startCameraSession()
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        // Stop camera session when leaving
        stopCameraSession()
        // Show navigation bar when leaving
        navigationController?.setNavigationBarHidden(false, animated: animated)
    }
    
    
    // MARK: - UI Setup
    
    override func setupUI() {
        title = "Search by Image".localized()
        view.backgroundColor = .black // Black background for camera view
        
        // Add subviews
        view.addSubview(cameraPreviewView)
        view.addSubview(capturedImageView)
        view.addSubview(captureButton)
        view.addSubview(photoLibraryButton)
        view.addSubview(cancelButton)
        view.addSubview(validationOverlay)
        view.addSubview(productIndicatorView)
        
        // Setup validation overlay
        validationOverlay.addSubview(validationStatusLabel)
        
        // Setup constraints using SnapKit - Full screen camera
        cameraPreviewView.snp.makeConstraints { make in
            make.edges.equalToSuperview() // Full screen
        }
        
        // Captured image view - same size as preview
        capturedImageView.snp.makeConstraints { make in
            make.edges.equalTo(cameraPreviewView)
        }
        
        // Cancel button - top left
        cancelButton.snp.makeConstraints { make in
            make.width.height.equalTo(50)
            make.top.equalTo(view.safeAreaLayoutGuide).offset(20)
            make.leading.equalToSuperview().offset(20)
        }
        
        // Capture button - bottom center
        captureButton.snp.makeConstraints { make in
            make.width.height.equalTo(70)
            make.centerX.equalToSuperview()
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-40)
        }
        
        // Photo library button - bottom left
        photoLibraryButton.snp.makeConstraints { make in
            make.width.height.equalTo(50)
            make.leading.equalToSuperview().offset(20)
            make.centerY.equalTo(captureButton)
        }
        
        // Validation overlay - top center, below cancel button
        validationOverlay.snp.makeConstraints { make in
            make.top.equalTo(cancelButton.snp.bottom).offset(20)
            make.centerX.equalToSuperview()
            make.leading.greaterThanOrEqualToSuperview().offset(20)
            make.trailing.lessThanOrEqualToSuperview().offset(-20)
            make.width.lessThanOrEqualTo(300)
        }
        
        validationStatusLabel.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.equalToSuperview().offset(16)
            make.trailing.equalToSuperview().offset(-16)
            make.bottom.equalToSuperview().offset(-12)
        }
        
        // Product indicator - initially hidden, will be positioned dynamically
        productIndicatorView.snp.makeConstraints { make in
            make.width.height.equalTo(16)
            make.centerX.equalToSuperview()
            make.centerY.equalToSuperview()
        }
    }
    
    private func setupActions() {
        // No actions needed - similarity is fixed
    }
    
    private func setupTableView() {
        // TableView setup removed - results will be shown in sheet
    }
    
    private func setupImageValidator() {
        // Configure thresholds for embedding/similarity search
        imageValidator.setBlurThreshold(100.0)
        imageValidator.setMotionThreshold(0.3)
        imageValidator.setProductCoverageMin(0.3, max: 0.7)
        imageValidator.setBackgroundClutterThreshold(0.4)
        imageValidator.setSaturationThreshold(0.8)
        imageValidator.setBrightnessMin(0.25, max: 0.80)
        imageValidator.setTiltThreshold(30.0)
    }
    
    // MARK: - Actions
    
    @objc private func cancelTapped() {
        stopCameraSession()
        dismiss(animated: true)
    }
    
    // MARK: - Camera Setup
    
    private func setupCamera() {
        // Check camera permission
        let authStatus = AVCaptureDevice.authorizationStatus(for: .video)
        
        switch authStatus {
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    if granted {
                        self?.initializeCamera()
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
        
        // Setup camera device
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
            showAlert(message: "Unable to access camera".localized())
            return
        }
        
        do {
            let input = try AVCaptureDeviceInput(device: camera)
            
            if captureSession.canAddInput(input) {
                captureSession.addInput(input)
        }
        
            // Setup video output to get frames
            videoOutput = AVCaptureVideoDataOutput()
            videoOutput?.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
            videoOutput?.setSampleBufferDelegate(self, queue: DispatchQueue(label: "camera.frame.processing.queue"))
            
            if let videoOutput = videoOutput, captureSession.canAddOutput(videoOutput) {
                captureSession.addOutput(videoOutput)
            }
            
            // Setup preview layer
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
        // Get current frame from video output
        guard let frame = currentFrame else {
            showAlert(message: "No frame available".localized())
            return
        }
        
        // Pause camera session to freeze the frame
        stopCameraSession()
        
        // Convert CVPixelBuffer to UIImage
        let ciImage = CIImage(cvPixelBuffer: frame)
        let context = CIContext(options: nil)
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else {
            showAlert(message: "Unable to process frame".localized())
            // Resume camera if conversion fails
            startCameraSession()
            return
        }
        
        // Create UIImage and fix orientation
        let image = UIImage(cgImage: cgImage, scale: 1.0, orientation: .right)
        let fixedImage = image.fixImageOrientation()
        
        // Show captured image (freeze frame)
        capturedImageView.image = fixedImage
        capturedImageView.isHidden = false
        
        // Hide validation overlay when showing captured image
        validationOverlay.isHidden = true
        
        // Process and search image directly (no validation dialog)
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
            title: "Camera Access".localized(),
            message: "Please enable camera access in Settings".localized(),
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Settings".localized(), style: .default) { _ in
            if let url = URL(string: UIApplicationOpenSettingsURLString) {
                UIApplication.shared.open(url)
            }
        })
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        present(alert, animated: true)
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = cameraPreviewView.bounds
    }
    
    // MARK: - Image Validation & Search
    
    private func validateAndProcessImage(image: UIImage) {
        // Validate image on background queue
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            
            let result = self.imageValidator.validate(image)
            
            DispatchQueue.main.async {
                // Show validation result to user
                if !result.isValid {
                    // Show warning but allow user to proceed
                    let issues = result.errors.prefix(3).joined(separator: "\n")
                    let alert = UIAlertController(
                        title: "Image quality warning".localized(),
                        message: String(format: "The image may not be optimal for search:\n\n%@\n\nDo you want to continue?".localized(), issues),
                        preferredStyle: .alert
                    )
                    alert.addAction(UIAlertAction(title: "Continue anyway".localized(), style: .default) { [weak self] _ in
                        self?.processAndSearchImage(image: image)
                    })
                    alert.addAction(UIAlertAction(title: "Retake".localized(), style: .cancel) { [weak self] _ in
                        // Resume camera
                        self?.capturedImageView.isHidden = true
                        self?.startCameraSession()
                    })
                    self.present(alert, animated: true)
                } else {
                    // Image is valid, proceed with search
                    self.processAndSearchImage(image: image)
                }
            }
        }
    }
    
    private func performImageSearch(image: UIImage) {
        // Fallback method - compress aggressively for image search (target: 20KB like frontend)
        guard let imageData = compressImageForSearch(image: image) else {
            showAlert(message: "Unable to compress image".localized())
            return
        }
        performImageSearch(imageData: imageData, image: image)
    }
    
    /// Compress image aggressively for image search (target: 20KB, similar to frontend)
    /// Uses smaller max dimension and lower quality to achieve ~99% reduction
    private func compressImageForSearch(image: UIImage) -> Data? {
        // Print original size
        if let originalData = UIImageJPEGRepresentation(image, 1.0) {
            let originalSizeKB = originalData.count / 1024
            print("📊 IMAGE SEARCH COMPRESSION")
            print("   Original file size: \(originalSizeKB)KB (\(String(format: "%.2f", Double(originalSizeKB) / 1024.0))MB)")
        }
        
        // Compress with aggressive settings:
        // - Target: 20KB (like frontend)
        // - Max dimension: 1024px (smaller than default 1920px)
        // - Min quality: 0.05 (lower than default 0.1 for more compression)
        return image.compressToTargetSize(
            targetSizeKB: 20,
            maxDimension: 1024,
            minQuality: 0.05
        )
    }
    
    private func performImageSearch(imageData: Data, image: UIImage) {
        // Show loading
        let hud = MBProgressHUD.showAdded(to: self.view, animated: true)
        hud.label.text = "Searching...".localized()
        
        // Use fixed minimum similarity
        
        // Print size of data being sent
        let sizeKB = imageData.count / 1024
        print("📤 Sending compressed image: \(sizeKB)KB")
        
        // Call API with compressed data
        ProductService.shared.searchProductsByImage(
            imageData: imageData,
            image: image,
            limit: 50,
            minSimilarity: minSimilarity,
            categoryId: nil
        ) { [weak self] products, total, message, error in
            guard let self = self else { return }
            
            // Hide loading
            DispatchQueue.main.async {
                MBProgressHUD.hide(for: self.view, animated: true)
            }
            
            // Handle error
            if let error = error {
                DispatchQueue.main.async {
                    self.showAlert(message: error.localizedDescription)
                    // Resume camera after error
                    self.capturedImageView.isHidden = true
                    self.startCameraSession()
                }
                return
            }
            
            // Update results and present sheet
            DispatchQueue.main.async {
                self.searchResults = products ?? []
                self.totalResults = total ?? 0
                self.presentResultsSheet()
                
                // Camera stays paused until user closes the result sheet
            }
        }
    }
    
    private func presentResultsSheet() {
        let resultsVC = ImageSearchResultsViewController(
            products: searchResults,
            totalResults: totalResults
        )
        
        // Set delegate to know when sheet is dismissed
        resultsVC.onDismiss = { [weak self] in
            // Resume camera when result sheet is dismissed
            self?.capturedImageView.isHidden = true
            self?.startCameraSession()
        }
        
        // Wrap in navigation controller
        let navController = UINavigationController(rootViewController: resultsVC)
        
        // Configure as sheet
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
    
    // MARK: - Helper Methods
    
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

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension ImageSearchViewController: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        // Store current frame
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        currentFrame = pixelBuffer
        
        // Validate frame periodically (throttle to avoid performance issues)
        let now = Date()
        if now.timeIntervalSince(lastValidationTime) >= validationInterval {
            lastValidationTime = now
            validateCurrentFrame(pixelBuffer: pixelBuffer)
        }
    }
    
    private func validateCurrentFrame(pixelBuffer: CVPixelBuffer) {
        // Convert CVPixelBuffer to UIImage for validation
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let context = CIContext(options: nil)
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return }
        
        // Create UIImage and fix orientation
        let image = UIImage(cgImage: cgImage, scale: 1.0, orientation: .right)
        let fixedImage = image.fixImageOrientation()
        
        // Validate on background queue
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            
            let result = self.imageValidator.validate(fixedImage)
            
            // Detect product center
            let productCenter = self.imageValidator.detectProductCenter(fixedImage)
            
            // Update UI on main queue
            DispatchQueue.main.async {
                self.currentValidationResult = result
                self.updateValidationFeedback(result: result)
                self.updateProductIndicator(center: productCenter, imageSize: fixedImage.size)
            }
        }
    }
    
    private func updateProductIndicator(center: CGPoint, imageSize: CGSize) {
        // Hide indicator if camera is paused (showing captured image)
        guard capturedImageView.isHidden else {
            productIndicatorView.isHidden = true
            return
        }
        
        // Check if product was detected (center is valid, normalized 0-1)
        if center.x < 0 || center.y < 0 || center.x > 1 || center.y > 1 {
            productIndicatorView.isHidden = true
            return
        }
        
        // Show indicator
        productIndicatorView.isHidden = false
        
        // Convert normalized coordinates (0-1) to preview layer coordinates
        guard let previewLayer = previewLayer else { return }
        
        let previewBounds = previewLayer.bounds
        let previewWidth = previewBounds.width
        let previewHeight = previewBounds.height
        
        // Calculate position in preview layer
        // Center is normalized (0-1), so multiply by preview dimensions
        let x = center.x * previewWidth
        let y = center.y * previewHeight
        
        // Update indicator position using center constraints
        productIndicatorView.snp.remakeConstraints { make in
            make.width.height.equalTo(16)
            make.centerX.equalTo(cameraPreviewView.snp.leading).offset(x)
            make.centerY.equalTo(cameraPreviewView.snp.top).offset(y)
        }
        
        // Animate position change for smooth movement
        UIView.animate(withDuration: 0.2) {
            self.view.layoutIfNeeded()
        }
    }
    
    private func updateValidationFeedback(result: CIValidationResult) {
        // Hide overlay if camera is paused (showing captured image)
        guard capturedImageView.isHidden else {
            validationOverlay.isHidden = true
            return
        }
        
        // Show overlay
        validationOverlay.isHidden = false
        
        // Calculate quality percentage
        let qualityPercentage = calculateQualityPercentage(result: result)
        
        // Display "Image quality %d%" text (localized)
        validationStatusLabel.text = String(format: "%@ %d%%", "Image quality".localized(), Int(qualityPercentage))
    }
    
    private func calculateQualityPercentage(result: CIValidationResult) -> Float {
        // Total possible score: 100 points
        // Priority order for image search (embedding/similarity):
        // 1. Product Visibility - Most critical for search accuracy
        // 2. Single Product Focus - Multiple products confuse embedding
        // 3. Background Clutter - Complex background affects embedding
        // 4. Image Sharpness - Blurry images reduce embedding quality
        // 5. Motion Blur - Similar to blur, affects feature extraction
        // 6. Obstruction - Blocked products can't be matched
        // 7. Brightness - Too dark/bright affects feature detection
        // 8. Tilt - Moderate impact on embedding
        // 9. Color Cast - Least critical, but can affect matching
        
        var score: Float = 100.0
        
        // 1. CRITICAL: Product Visibility (20 points) - Highest priority
        // If product is not visible, search will fail
        if result.productNotVisible {
            score -= 20.0
        }
        
        // 2. CRITICAL: Single Product Focus (18 points) - Very high priority
        // Multiple products confuse the embedding model
        if result.hasMultipleProducts {
            score -= 18.0
        }
        
        // 3. CRITICAL: Background Clutter (16 points) - Very high priority
        // Complex background interferes with product embedding
        if result.backgroundTooCluttered {
            score -= 16.0
        }
        
        // 4. IMPORTANT: Image Sharpness (14 points) - High priority
        // Blurry images reduce feature extraction quality
        if result.isBlurry {
            score -= 14.0
        }
        
        // 5. IMPORTANT: Motion Blur (12 points) - High priority
        // Motion blur affects feature detection similar to blur
        if result.hasMotionBlur {
            score -= 12.0
        }
        
        // 6. IMPORTANT: Obstruction (10 points) - High priority
        // Blocked products can't be properly matched
        if result.hasObstruction {
            score -= 10.0
        }
        
        // 7. MODERATE: Brightness (8 points) - Medium priority
        // Too dark or bright affects feature detection
        if result.isTooDark {
            score -= 4.0
        }
        if result.isTooBright {
            score -= 4.0
        }
        
        // 8. MODERATE: Tilt (6 points) - Medium priority
        // Excessive tilt can affect embedding but less critical
        if result.isTilted {
            score -= 6.0
        }
        
        // 9. LOW: Color Cast (4 points) - Lower priority
        // Color cast can affect matching but is less critical
        if result.hasColorCast {
            score -= 4.0
        }
        
        // Ensure score is between 0 and 100
        return max(0, min(100, score))
    }
}

// MARK: - UIImagePickerControllerDelegate (for photo library)

extension ImageSearchViewController: UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    
    func imagePickerController(
        _ picker: UIImagePickerController,
        didFinishPickingMediaWithInfo info: [String : Any]
    ) {
        // Get selected image (no editing, so use original)
        guard let originalImage = info[UIImagePickerControllerOriginalImage] as? UIImage else {
        picker.dismiss(animated: true)
            showAlert(message: "Unable to load image".localized())
            return
        }
        
        // Dismiss picker first
        picker.dismiss(animated: true) { [weak self] in
            self?.processAndSearchImage(image: originalImage)
        }
    }
    
    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }
    
    private func processAndSearchImage(image: UIImage) {
        // Compress image aggressively for image search (target: 20KB, similar to frontend)
        guard let compressedData = compressImageForSearch(image: image) else {
            showAlert(message: "Unable to compress image".localized())
            return
}

        // Print compression info
        let sizeKB = compressedData.count / 1024
        if let originalData = UIImageJPEGRepresentation(image, 1.0) {
            let originalSizeKB = originalData.count / 1024
            let reduction = originalSizeKB > 0 ? Int((1.0 - Double(sizeKB) / Double(originalSizeKB)) * 100) : 0
            print("✅ Image compressed: \(originalSizeKB)KB → \(sizeKB)KB (\(reduction)% reduction)")
        } else {
            print("✅ Image compressed: \(sizeKB)KB (target: 20KB)")
    }
    
        // Convert compressed data back to UIImage for display
        guard let compressedImage = UIImage(data: compressedData) else {
            showAlert(message: "Unable to process compressed image".localized())
            return
        }
        
        // Update selected image
        self.selectedImage = compressedImage
        
        // Auto perform search with compressed data directly (to avoid re-compression)
        self.performImageSearch(imageData: compressedData, image: compressedImage)
    }
}

// MARK: - Image Search Results Sheet View Controller

class ImageSearchResultsViewController: BaseViewControler {
    
    // MARK: - Properties
    private let products: [Product]
    private let totalResults: Int
    var onDismiss: (() -> Void)?
    
    // MARK: - UI Components
    private let productTableView: UITableView = {
        let tv = UITableView(frame: .zero, style: .plain)
        tv.backgroundColor = .backgroundPrimary
        tv.separatorStyle = .none // Match MainViewController style
        tv.rowHeight = UITableViewAutomaticDimension
        tv.estimatedRowHeight = 100
        return tv
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
    
    // MARK: - Initialization
    init(products: [Product], totalResults: Int) {
        self.products = products
        self.totalResults = totalResults
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupTableView()
    }
    
    // MARK: - UI Setup
    override func setupUI() {
        view.backgroundColor = .white
        
        // Setup navigation bar with result count in title
        if products.isEmpty {
            title = "No similar products found".localized()
        } else {
            title = String(format: "Results: %d products".localized(), totalResults)
        }
        
        // Add close button
        navigationItem.rightBarButtonItem = UIBarButtonItem(
            barButtonSystemItem: .close,
            target: self,
            action: #selector(closeTapped)
        )
        
        // Add subviews
        view.addSubview(productTableView)
        view.addSubview(emptyStateLabel)
        
        // Setup constraints
        productTableView.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.bottom.equalToSuperview()
        }
        
        // Empty state label - center of table view
        emptyStateLabel.snp.makeConstraints { make in
            make.centerX.equalTo(productTableView)
            make.centerY.equalTo(productTableView)
            make.leading.trailing.equalTo(productTableView).inset(32)
        }
        
        // Show/hide empty state based on products
        emptyStateLabel.isHidden = !products.isEmpty
    }
    
    private func setupTableView() {
        productTableView.delegate = self
        productTableView.dataSource = self
        productTableView.register(ProductCell.self, forCellReuseIdentifier: String(describing: ProductCell.self))
        productTableView.separatorStyle = .none // Match MainViewController style
        productTableView.backgroundColor = .backgroundPrimary
    }
    
    @objc private func closeTapped() {
        dismiss(animated: true) { [weak self] in
            self?.onDismiss?()
        }
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        // Call onDismiss when view is about to disappear (handles swipe down dismissal)
        if isBeingDismissed {
            onDismiss?()
        }
    }
}

// MARK: - UITableViewDataSource
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
        // Bind product
        cell.bind(product: product, searchWords: nil)
        
        // Show check indicator dot circle on all items (to indicate they need checking)
        cell.showCheckIndicator(true)
        
        // Setup more button menu
        cell.setupMoreButtonMenu(menu: createProductMenu(for: product, cell: cell))
        
        return cell
    }
}

// MARK: - UITableViewDelegate
extension ImageSearchResultsViewController: UITableViewDelegate {
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        // Selection is handled by ProductCellDelegate
    }
}

// MARK: - ProductCellDelegate
extension ImageSearchResultsViewController: ProductCellDelegate {
    func viewImage(sender: Product) {
        let controller = ImageProductViewController.instance(imageUrl: sender.image_url ?? "")
        let nav = UINavigationController(rootViewController: controller)
        present(nav, animated: true)
    }
    
    func more(product: Product, sender: ProductCell) {
        // Menu is handled by setupMoreButtonMenu
    }
    
    // MARK: - Product Menu
    private func createProductMenu(for product: Product, cell: ProductCell) -> UIMenu {
        var menuActions: [UIMenuElement] = []
        
        // Add to cart action
        let addToCartAction = UIAction(
            title: "Add to cart".localized(),
            image: UIImage(systemName: "cart.badge.plus")
        ) { [weak self] _ in
            self?.addProductToCart(product: product)
        }
        menuActions.append(addToCartAction)
        
        // Product check action
        let checkAction = UIAction(
            title: "Product check".localized(),
            image: UIImage(systemName: "list.bullet.rectangle")
        ) { [weak self] _ in
            self?.previewOrders(sender: cell, product: product)
        }
        menuActions.append(checkAction)
        
        return UIMenu(children: menuActions)
    }
    
    /// Add product to cart
    private func addProductToCart(product: Product) {
        // Find InfoMainViewController to add product
        guard let infoVC = findInfoMainViewController() else {
            showToast(message: "Unable to add product to cart".localized(), icon: UIImage(systemName: "exclamationmark.triangle"))
            return
        }
        
        // Determine price based on current cart order type
        let price: Double
        if CartStore.shared.cart.orderType == .rent {
            price = product.rentPrice ?? product.rent
        } else {
            price = product.salePrice ?? product.sale
        }
        
        // Add product directly to cart
        infoVC.addProduct(product: product, quantity: 1, price: price)
        
        // Update cart badge in MainViewController
        updateCartBadge()
        
        // Show success toast
        showToast(message: "Added to cart".localized(), icon: UIImage(systemName: "checkmark.circle.fill"))
    }
    
    /// Update cart badge in MainViewController
    private func updateCartBadge() {
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first,
           let tabbarController = window.rootViewController as? TabbarViewController {
            
            // Check navigation controllers in tab bar
            for viewController in tabbarController.viewControllers ?? [] {
                if let navController = viewController as? UINavigationController {
                    // Check MainViewController
                    for vc in navController.viewControllers {
                        if let mainVC = vc as? MainViewController {
                            mainVC.updateCartBadge()
                            return
                        }
                }
            }
        }
    }
}

    /// Find InfoMainViewController in navigation hierarchy
    private func findInfoMainViewController() -> InfoMainViewController? {
        // Check if we can find MainViewController first
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first,
           let tabbarController = window.rootViewController as? TabbarViewController {
            
            // Check navigation controllers in tab bar
            for viewController in tabbarController.viewControllers ?? [] {
                if let navController = viewController as? UINavigationController {
                    // Check MainViewController
                    for vc in navController.viewControllers {
                        if let mainVC = vc as? MainViewController {
                            // Use public property to access cart view controller
                            return mainVC.cartViewController
                        }
                    }
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

// MARK: - OrderCheckViewControllerDelegate
extension ImageSearchResultsViewController: OrderCheckViewControllerDelegate {
    func didSelectOrder(order: Order, sender: OrderCheckViewController) {
        // OrderCheck dismisses itself before calling this delegate; availability payload may omit other lines — load full detail.
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

// MARK: - PreviewViewControllerDelegate
extension ImageSearchResultsViewController: PreviewViewControllerDelegate {
    func didCompleteOrder(sender: PreviewViewController, updatedOrder: Order?) {
        navigationController?.popViewController(animated: true)
    }
}
