# 📱 Swift QR Code Payment Guide

Hướng dẫn tạo QR code thanh toán bằng Swift cho iOS app.

## 📋 Tổng quan

App iOS cần:
1. Gọi API để lấy VietQR string từ server
2. Generate QR code image từ string đó
3. Hiển thị QR code cho user scan

## 🔧 Implementation

### 1. Network Service - Gọi API lấy QR Code

```swift
import Foundation

// MARK: - QR Code Response Models
struct QRCodeResponse: Codable {
    let success: Bool
    let data: QRCodeData?
    let code: String?
    let message: String?
}

struct QRCodeData: Codable {
    let qrCodeString: String
    let bankAccount: BankAccount
    let amount: Int
    let orderNumber: String
    let transferDescription: String
}

struct BankAccount: Codable {
    let id: Int
    let accountHolderName: String
    let accountNumber: String
    let bankName: String
    let bankCode: String
    let branch: String?
}

// MARK: - QR Code Service
class QRCodeService {
    static let shared = QRCodeService()
    
    private let baseURL = "https://your-api-domain.com/api"
    private var authToken: String?
    
    private init() {}
    
    func setAuthToken(_ token: String) {
        self.authToken = token
    }
    
    /// Lấy QR code string cho order payment
    /// - Parameters:
    ///   - orderId: Order ID
    ///   - completion: Completion handler với QRCodeData hoặc Error
    func getQRCode(for orderId: Int, completion: @escaping (Result<QRCodeData, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/orders/\(orderId)/qr-code") else {
            completion(.failure(QRCodeError.invalidURL))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let httpResponse = response as? HTTPURLResponse else {
                completion(.failure(QRCodeError.invalidResponse))
                return
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                if httpResponse.statusCode == 404 {
                    completion(.failure(QRCodeError.noBankAccount))
                } else {
                    completion(.failure(QRCodeError.serverError(httpResponse.statusCode)))
                }
                return
            }
            
            guard let data = data else {
                completion(.failure(QRCodeError.noData))
                return
            }
            
            do {
                let response = try JSONDecoder().decode(QRCodeResponse.self, from: data)
                
                if response.success, let qrData = response.data {
                    completion(.success(qrData))
                } else {
                    let errorMessage = response.message ?? "Unknown error"
                    completion(.failure(QRCodeError.apiError(errorMessage)))
                }
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
}

// MARK: - QR Code Errors
enum QRCodeError: LocalizedError {
    case invalidURL
    case invalidResponse
    case noData
    case noBankAccount
    case serverError(Int)
    case apiError(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response"
        case .noData:
            return "No data received"
        case .noBankAccount:
            return "No default bank account found for this outlet"
        case .serverError(let code):
            return "Server error: \(code)"
        case .apiError(let message):
            return message
        }
    }
}
```

### 2. QR Code Generator - Tạo QR Code Image

```swift
import UIKit
import CoreImage

// MARK: - QR Code Generator
class QRCodeGenerator {
    static let shared = QRCodeGenerator()
    
    private init() {}
    
    /// Generate QR code image từ string
    /// - Parameters:
    ///   - qrString: VietQR EMV QR Code string
    ///   - size: Kích thước QR code (default: 300x300)
    ///   - color: Màu QR code (default: black)
    ///   - backgroundColor: Màu nền (default: white)
    /// - Returns: UIImage của QR code hoặc nil nếu lỗi
    func generateQRCode(
        from qrString: String,
        size: CGSize = CGSize(width: 300, height: 300),
        color: UIColor = .black,
        backgroundColor: UIColor = .white
    ) -> UIImage? {
        // Convert string to Data
        guard let data = qrString.data(using: .utf8) else {
            print("❌ Error: Cannot convert QR string to Data")
            return nil
        }
        
        // Create CIFilter for QR code generation
        guard let filter = CIFilter(name: "CIQRCodeGenerator") else {
            print("❌ Error: CIQRCodeGenerator filter not available")
            return nil
        }
        
        // Set input message
        filter.setValue(data, forKey: "inputMessage")
        
        // Set error correction level (L, M, Q, H)
        // H = High (30% error correction) - recommended for payment QR codes
        filter.setValue("H", forKey: "inputCorrectionLevel")
        
        // Get output image
        guard let ciImage = filter.outputImage else {
            print("❌ Error: Cannot generate CIImage")
            return nil
        }
        
        // Scale image to desired size
        let scaleX = size.width / ciImage.extent.width
        let scaleY = size.height / ciImage.extent.height
        let transformedImage = ciImage.transformed(by: CGAffineTransform(scaleX: scaleX, scaleY: scaleY))
        
        // Create context for rendering
        let context = CIContext(options: nil)
        guard let cgImage = context.createCGImage(transformedImage, from: transformedImage.extent) else {
            print("❌ Error: Cannot create CGImage")
            return nil
        }
        
        // Create UIImage with color
        let uiImage = UIImage(cgImage: cgImage)
        
        // Apply colors if needed
        if color != .black || backgroundColor != .white {
            return applyColors(to: uiImage, color: color, backgroundColor: backgroundColor)
        }
        
        return uiImage
    }
    
    /// Apply custom colors to QR code
    private func applyColors(to image: UIImage, color: UIColor, backgroundColor: UIColor) -> UIImage? {
        guard let cgImage = image.cgImage else { return nil }
        
        let width = cgImage.width
        let height = cgImage.height
        let bytesPerPixel = 4
        let bytesPerRow = bytesPerPixel * width
        let bitsPerComponent = 8
        
        var pixelData = [UInt8](repeating: 0, count: width * height * bytesPerPixel)
        
        guard let context = CGContext(
            data: &pixelData,
            width: width,
            height: height,
            bitsPerComponent: bitsPerComponent,
            bytesPerRow: bytesPerRow,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
            return nil
        }
        
        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
        
        // Get color components
        var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
        var bgRed: CGFloat = 0, bgGreen: CGFloat = 0, bgBlue: CGFloat = 0, bgAlpha: CGFloat = 0
        
        color.getRed(&red, green: &green, blue: &blue, alpha: &alpha)
        backgroundColor.getRed(&bgRed, green: &bgGreen, blue: &bgBlue, alpha: &bgAlpha)
        
        // Apply colors
        for i in 0..<width * height {
            let pixelIndex = i * bytesPerPixel
            let pixelValue = pixelData[pixelIndex]
            
            if pixelValue == 0 {
                // Black pixel -> apply foreground color
                pixelData[pixelIndex] = UInt8(red * 255)
                pixelData[pixelIndex + 1] = UInt8(green * 255)
                pixelData[pixelIndex + 2] = UInt8(blue * 255)
                pixelData[pixelIndex + 3] = UInt8(alpha * 255)
            } else {
                // White pixel -> apply background color
                pixelData[pixelIndex] = UInt8(bgRed * 255)
                pixelData[pixelIndex + 1] = UInt8(bgGreen * 255)
                pixelData[pixelIndex + 2] = UInt8(bgBlue * 255)
                pixelData[pixelIndex + 3] = UInt8(bgAlpha * 255)
            }
        }
        
        guard let newCGImage = context.makeImage() else { return nil }
        return UIImage(cgImage: newCGImage)
    }
}
```

### 3. View Controller - Hiển thị QR Code

```swift
import UIKit

class PaymentQRCodeViewController: UIViewController {
    
    // MARK: - Properties
    private let orderId: Int
    private var qrCodeData: QRCodeData?
    
    // MARK: - UI Components
    private let scrollView: UIScrollView = {
        let scrollView = UIScrollView()
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        return scrollView
    }()
    
    private let contentView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let qrCodeImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.backgroundColor = .white
        imageView.layer.cornerRadius = 12
        imageView.layer.shadowColor = UIColor.black.cgColor
        imageView.layer.shadowOffset = CGSize(width: 0, height: 2)
        imageView.layer.shadowRadius = 8
        imageView.layer.shadowOpacity = 0.1
        imageView.translatesAutoresizingMaskIntoConstraints = false
        return imageView
    }()
    
    private let bankInfoView: UIView = {
        let view = UIView()
        view.backgroundColor = .systemBackground
        view.layer.cornerRadius = 12
        view.layer.borderWidth = 1
        view.layer.borderColor = UIColor.separator.cgColor
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let amountLabel: UILabel = {
        let label = UILabel()
        label.font = .systemFont(ofSize: 24, weight: .bold)
        label.textColor = .label
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let orderNumberLabel: UILabel = {
        let label = UILabel()
        label.font = .systemFont(ofSize: 16, weight: .medium)
        label.textColor = .secondaryLabel
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let loadingIndicator: UIActivityIndicatorView = {
        let indicator = UIActivityIndicatorView(style: .large)
        indicator.hidesWhenStopped = true
        indicator.translatesAutoresizingMaskIntoConstraints = false
        return indicator
    }()
    
    // MARK: - Initialization
    init(orderId: Int) {
        self.orderId = orderId
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        loadQRCode()
    }
    
    // MARK: - Setup
    private func setupUI() {
        view.backgroundColor = .systemGroupedBackground
        title = "Thanh toán"
        
        // Add save button
        navigationItem.rightBarButtonItem = UIBarButtonItem(
            title: "Lưu",
            style: .plain,
            target: self,
            action: #selector(saveQRCode)
        )
        
        // Setup scroll view
        view.addSubview(scrollView)
        scrollView.addSubview(contentView)
        
        // Add subviews
        contentView.addSubview(qrCodeImageView)
        contentView.addSubview(amountLabel)
        contentView.addSubview(orderNumberLabel)
        contentView.addSubview(bankInfoView)
        contentView.addSubview(loadingIndicator)
        
        // Setup bank info view
        setupBankInfoView()
        
        // Layout constraints
        NSLayoutConstraint.activate([
            // Scroll view
            scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            
            // Content view
            contentView.topAnchor.constraint(equalTo: scrollView.topAnchor),
            contentView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            contentView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            contentView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            contentView.widthAnchor.constraint(equalTo: scrollView.widthAnchor),
            
            // QR code image
            qrCodeImageView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 20),
            qrCodeImageView.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            qrCodeImageView.widthAnchor.constraint(equalToConstant: 300),
            qrCodeImageView.heightAnchor.constraint(equalToConstant: 300),
            
            // Amount label
            amountLabel.topAnchor.constraint(equalTo: qrCodeImageView.bottomAnchor, constant: 20),
            amountLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            amountLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            // Order number label
            orderNumberLabel.topAnchor.constraint(equalTo: amountLabel.bottomAnchor, constant: 8),
            orderNumberLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            orderNumberLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            
            // Bank info view
            bankInfoView.topAnchor.constraint(equalTo: orderNumberLabel.bottomAnchor, constant: 20),
            bankInfoView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 20),
            bankInfoView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -20),
            bankInfoView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -20),
            
            // Loading indicator
            loadingIndicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            loadingIndicator.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }
    
    private func setupBankInfoView() {
        // This will be populated when QR code data is loaded
    }
    
    // MARK: - Load QR Code
    private func loadQRCode() {
        loadingIndicator.startAnimating()
        qrCodeImageView.isHidden = true
        
        QRCodeService.shared.getQRCode(for: orderId) { [weak self] result in
            DispatchQueue.main.async {
                self?.loadingIndicator.stopAnimating()
                
                switch result {
                case .success(let qrData):
                    self?.qrCodeData = qrData
                    self?.displayQRCode(qrData)
                    
                case .failure(let error):
                    self?.showError(error)
                }
            }
        }
    }
    
    private func displayQRCode(_ data: QRCodeData) {
        // Generate QR code image
        guard let qrImage = QRCodeGenerator.shared.generateQRCode(
            from: data.qrCodeString,
            size: CGSize(width: 300, height: 300)
        ) else {
            showError(QRCodeError.apiError("Cannot generate QR code image"))
            return
        }
        
        // Display QR code
        qrCodeImageView.image = qrImage
        qrCodeImageView.isHidden = false
        
        // Display amount
        if data.amount > 0 {
            let formatter = NumberFormatter()
            formatter.numberStyle = .currency
            formatter.currencyCode = "VND"
            formatter.locale = Locale(identifier: "vi_VN")
            amountLabel.text = formatter.string(from: NSNumber(value: data.amount))
        } else {
            amountLabel.text = "Quét để thanh toán"
        }
        
        // Display order number
        orderNumberLabel.text = "Đơn hàng: \(data.orderNumber)"
        
        // Setup bank info
        setupBankInfo(data.bankAccount)
    }
    
    private func setupBankInfo(_ bankAccount: BankAccount) {
        // Clear existing subviews
        bankInfoView.subviews.forEach { $0.removeFromSuperview() }
        
        let stackView = UIStackView()
        stackView.axis = .vertical
        stackView.spacing = 12
        stackView.alignment = .leading
        stackView.translatesAutoresizingMaskIntoConstraints = false
        
        // Bank name
        let bankNameLabel = createInfoLabel(title: "Ngân hàng", value: bankAccount.bankName)
        stackView.addArrangedSubview(bankNameLabel)
        
        // Account number
        let accountNumberLabel = createInfoLabel(title: "Số tài khoản", value: bankAccount.accountNumber)
        stackView.addArrangedSubview(accountNumberLabel)
        
        // Account holder
        let accountHolderLabel = createInfoLabel(title: "Chủ tài khoản", value: bankAccount.accountHolderName)
        stackView.addArrangedSubview(accountHolderLabel)
        
        // Branch (if available)
        if let branch = bankAccount.branch {
            let branchLabel = createInfoLabel(title: "Chi nhánh", value: branch)
            stackView.addArrangedSubview(branchLabel)
        }
        
        bankInfoView.addSubview(stackView)
        
        NSLayoutConstraint.activate([
            stackView.topAnchor.constraint(equalTo: bankInfoView.topAnchor, constant: 16),
            stackView.leadingAnchor.constraint(equalTo: bankInfoView.leadingAnchor, constant: 16),
            stackView.trailingAnchor.constraint(equalTo: bankInfoView.trailingAnchor, constant: -16),
            stackView.bottomAnchor.constraint(equalTo: bankInfoView.bottomAnchor, constant: -16)
        ])
    }
    
    private func createInfoLabel(title: String, value: String) -> UIView {
        let containerView = UIView()
        
        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .systemFont(ofSize: 14, weight: .medium)
        titleLabel.textColor = .secondaryLabel
        
        let valueLabel = UILabel()
        valueLabel.text = value
        valueLabel.font = .systemFont(ofSize: 16, weight: .regular)
        valueLabel.textColor = .label
        valueLabel.numberOfLines = 0
        
        containerView.addSubview(titleLabel)
        containerView.addSubview(valueLabel)
        
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        valueLabel.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: containerView.topAnchor),
            titleLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            titleLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            
            valueLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 4),
            valueLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            valueLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            valueLabel.bottomAnchor.constraint(equalTo: containerView.bottomAnchor)
        ])
        
        return containerView
    }
    
    // MARK: - Actions
    @objc private func saveQRCode() {
        guard let qrImage = qrCodeImageView.image else { return }
        
        UIImageWriteToSavedPhotosAlbum(qrImage, self, #selector(image(_:didFinishSavingWithError:contextInfo:)), nil)
    }
    
    @objc private func image(_ image: UIImage, didFinishSavingWithError error: Error?, contextInfo: UnsafeRawPointer) {
        if let error = error {
            showAlert(title: "Lỗi", message: "Không thể lưu ảnh: \(error.localizedDescription)")
        } else {
            showAlert(title: "Thành công", message: "Đã lưu QR code vào thư viện ảnh")
        }
    }
    
    // MARK: - Error Handling
    private func showError(_ error: Error) {
        let message = error.localizedDescription
        showAlert(title: "Lỗi", message: message)
    }
    
    private func showAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}
```

### 4. Usage Example

```swift
// Trong ViewController khác (ví dụ: OrderDetailViewController)
func showPaymentQRCode() {
    let qrCodeVC = PaymentQRCodeViewController(orderId: order.id)
    let navController = UINavigationController(rootViewController: qrCodeVC)
    present(navController, animated: true)
}

// Setup auth token trước khi sử dụng
QRCodeService.shared.setAuthToken("your-jwt-token")
```

## 📝 Notes

1. **Error Correction Level**: Sử dụng "H" (High) để đảm bảo QR code vẫn scan được khi bị mờ
2. **QR Code Size**: 300x300 là kích thước tốt cho mobile, có thể tăng lên 400x400 cho tablet
3. **Colors**: Có thể customize màu QR code, nhưng nên giữ contrast cao để dễ scan
4. **Permissions**: Cần thêm `NSPhotoLibraryAddUsageDescription` vào Info.plist để lưu ảnh

## 🔗 API Reference

- API Endpoint: `GET /api/orders/[orderId]/qr-code`
- Response Format: Xem `docs/MOBILE_API.md`
- VietQR Specification: https://github.com/subiz/vietqr

