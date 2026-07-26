# Image Search API Integration

## Tổng quan (Overview)

API tìm kiếm sản phẩm theo hình ảnh đã được tích hợp vào ứng dụng. Chức năng này cho phép người dùng tải lên một hình ảnh và tìm các sản phẩm tương tự dựa trên độ tương đồng về hình ảnh.

The image search API has been integrated into the app. This feature allows users to upload an image and find similar products based on visual similarity.

---

## API Endpoint

**POST** `https://dev-api.anyrent.shop/api/products/searchByImage`

---

## Các thay đổi trong Code (Code Changes)

### 1. **Model Updates** (`Product.swift`)

Đã thêm các trường mới vào struct `Product` để hỗ trợ kết quả tìm kiếm theo hình ảnh:

```swift
struct Product: Codable {
    // ... existing fields ...
    
    // Image search specific fields
    var similarity: Double?           // Điểm tương đồng (0.0 - 1.0)
    var similarityPercent: Int?       // Phần trăm tương đồng (0 - 100)
    var merchant: MerchantDetail?     // Thông tin merchant
}
```

**Giải thích:**
- `similarity`: Điểm số đánh giá mức độ tương đồng giữa hình ảnh tìm kiếm và sản phẩm (từ 0.0 đến 1.0)
- `similarityPercent`: Giá trị phần trăm của `similarity` để hiển thị dễ dàng hơn
- `merchant`: Chi tiết về merchant sở hữu sản phẩm

### 2. **Response Models** (`APIResponse.swift`)

Đã tạo các model mới để xử lý response từ API:

```swift
// Image Search Response Data
struct ImageSearchResponseData: Codable {
    let products: [Product]?
    let total: Int?
    let message: String?
}

// API Response wrapper
struct APIImageSearchResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: ImageSearchResponseData?
    let error: String?
}
```

**Giải thích:**
- `ImageSearchResponseData`: Chứa danh sách sản phẩm tìm được, tổng số và thông báo
- `APIImageSearchResponse`: Wrapper chuẩn cho API response theo format của hệ thống

### 3. **Service Method** (`ProductService.swift`)

Đã thêm method mới để gọi API:

```swift
func searchProductsByImage(
    image: UIImage,
    limit: Int? = 20,
    minSimilarity: Float? = 0.5,
    categoryId: Int? = nil,
    completion: @escaping ([Product]?, Int?, String?, NSError?) -> Void
)
```

**Tham số (Parameters):**
- `image`: Hình ảnh cần tìm kiếm (bắt buộc)
- `limit`: Số lượng kết quả tối đa (1-100, mặc định 20)
- `minSimilarity`: Điểm tương đồng tối thiểu (0.0-1.0, mặc định 0.5)
- `categoryId`: ID danh mục để lọc kết quả (tùy chọn)

**Giải thích hoạt động:**
1. Nén hình ảnh xuống dưới 5MB (theo yêu cầu API)
2. Tạo multipart/form-data request với hình ảnh và các tham số
3. Gửi POST request đến API endpoint
4. Parse response và trả về danh sách sản phẩm với điểm tương đồng

---

## Cách sử dụng (Usage)

### Ví dụ cơ bản (Basic Example)

```swift
import UIKit

class ProductSearchViewController: UIViewController {
    
    func searchProductsByImage(image: UIImage) {
        // Hiển thị loading indicator
        showLoadingIndicator()
        
        // Gọi API tìm kiếm
        ProductService.shared.searchProductsByImage(
            image: image,
            limit: 20,
            minSimilarity: 0.5,
            categoryId: nil
        ) { [weak self] products, total, message, error in
            // Ẩn loading indicator
            self?.hideLoadingIndicator()
            
            // Xử lý error
            if let error = error {
                self?.showErrorAlert(message: error.localizedDescription)
                return
            }
            
            // Xử lý kết quả
            guard let products = products else {
                self?.showErrorAlert(message: "Không tìm thấy sản phẩm")
                return
            }
            
            // Hiển thị kết quả
            print("Tìm thấy \(total ?? 0) sản phẩm tương tự")
            self?.displaySearchResults(products: products)
        }
    }
    
    func displaySearchResults(products: [Product]) {
        // Hiển thị danh sách sản phẩm với điểm tương đồng
        for product in products {
            print("Sản phẩm: \(product.name ?? "N/A")")
            print("Độ tương đồng: \(product.similarityPercent ?? 0)%")
            print("Danh mục: \(product.category?.name ?? "N/A")")
            print("---")
        }
    }
    
    func showLoadingIndicator() {
        // TODO: Implement loading UI
    }
    
    func hideLoadingIndicator() {
        // TODO: Implement hiding loading UI
    }
    
    func showErrorAlert(message: String) {
        let alert = UIAlertController(
            title: "Lỗi",
            message: message,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}
```

### Ví dụ với UIImagePickerController

```swift
class ProductSearchViewController: UIViewController {
    
    // MARK: - Pick Image from Camera/Gallery
    
    func showImageSourceSelection() {
        let alert = UIAlertController(
            title: "Chọn hình ảnh",
            message: "Chọn nguồn hình ảnh để tìm kiếm sản phẩm",
            preferredStyle: .actionSheet
        )
        
        // Camera option
        if UIImagePickerController.isSourceTypeAvailable(.camera) {
            alert.addAction(UIAlertAction(title: "Chụp ảnh", style: .default) { [weak self] _ in
                self?.openImagePicker(sourceType: .camera)
            })
        }
        
        // Photo library option
        alert.addAction(UIAlertAction(title: "Chọn từ thư viện", style: .default) { [weak self] _ in
            self?.openImagePicker(sourceType: .photoLibrary)
        })
        
        alert.addAction(UIAlertAction(title: "Hủy", style: .cancel))
        
        present(alert, animated: true)
    }
    
    func openImagePicker(sourceType: UIImagePickerController.SourceType) {
        let picker = UIImagePickerController()
        picker.sourceType = sourceType
        picker.delegate = self
        picker.allowsEditing = true
        present(picker, animated: true)
    }
}

// MARK: - UIImagePickerControllerDelegate

extension ProductSearchViewController: UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    
    func imagePickerController(
        _ picker: UIImagePickerController,
        didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]
    ) {
        picker.dismiss(animated: true)
        
        // Lấy hình ảnh đã chọn
        let image = (info[.editedImage] as? UIImage) ?? (info[.originalImage] as? UIImage)
        
        guard let selectedImage = image else {
            showErrorAlert(message: "Không thể tải hình ảnh")
            return
        }
        
        // Tìm kiếm sản phẩm với hình ảnh đã chọn
        searchProductsByImage(image: selectedImage)
    }
    
    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }
}
```

### Ví dụ với TableView để hiển thị kết quả

```swift
class SearchResultsViewController: UIViewController {
    
    @IBOutlet weak var tableView: UITableView!
    private var searchResults: [Product] = []
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupTableView()
    }
    
    func setupTableView() {
        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(ProductCell.self, forCellReuseIdentifier: "ProductCell")
    }
    
    func searchAndDisplayProducts(image: UIImage) {
        ProductService.shared.searchProductsByImage(
            image: image,
            limit: 50,
            minSimilarity: 0.6,  // Tăng ngưỡng tương đồng để có kết quả chính xác hơn
            categoryId: nil
        ) { [weak self] products, total, message, error in
            if let error = error {
                self?.showErrorAlert(message: error.localizedDescription)
                return
            }
            
            self?.searchResults = products ?? []
            self?.tableView.reloadData()
            
            if self?.searchResults.isEmpty == true {
                self?.showEmptyState()
            }
        }
    }
    
    func showEmptyState() {
        // TODO: Show empty state UI
    }
}

// MARK: - UITableViewDataSource

extension SearchResultsViewController: UITableViewDataSource {
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return searchResults.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "ProductCell", for: indexPath) as! ProductCell
        let product = searchResults[indexPath.row]
        
        // Configure cell
        cell.nameLabel.text = product.name
        cell.similarityLabel.text = "Độ tương đồng: \(product.similarityPercent ?? 0)%"
        cell.priceLabel.text = "Giá thuê: \(product.rentPrice ?? 0) đ"
        cell.categoryLabel.text = product.category?.name ?? "Không có danh mục"
        
        // Load image
        if let imageUrl = product.images?.first {
            cell.loadImage(from: imageUrl)
        }
        
        return cell
    }
}

// MARK: - UITableViewDelegate

extension SearchResultsViewController: UITableViewDelegate {
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let product = searchResults[indexPath.row]
        
        // Mở chi tiết sản phẩm
        showProductDetail(product: product)
    }
    
    func showProductDetail(product: Product) {
        // TODO: Navigate to product detail screen
    }
}
```

---

## Lưu ý quan trọng (Important Notes)

### 1. **Kích thước hình ảnh**
- API chỉ chấp nhận hình ảnh có kích thước tối đa 5MB
- Code đã tự động nén hình ảnh xuống mức phù hợp
- Format hỗ trợ: JPG, PNG, WEBP

### 2. **Thông số tìm kiếm**
- `limit`: Từ 1 đến 100 sản phẩm
- `minSimilarity`: Từ 0.0 đến 1.0 (0.0 = không giống, 1.0 = giống hoàn toàn)
- Nên sử dụng `minSimilarity` >= 0.5 để có kết quả tốt

### 3. **Performance**
- Việc nén hình ảnh có thể mất vài giây
- Nên hiển thị loading indicator khi gọi API
- Xử lý trên background thread nếu cần

### 4. **Error Handling**
- Luôn kiểm tra `error` trước khi xử lý kết quả
- Hiển thị thông báo lỗi thân thiện cho người dùng
- Log lỗi để debug khi cần

---

## Test Cases

### Test 1: Tìm kiếm cơ bản
```swift
func testBasicImageSearch() {
    let testImage = UIImage(named: "test_product")!
    
    ProductService.shared.searchProductsByImage(
        image: testImage,
        completion: { products, total, message, error in
            XCTAssertNil(error)
            XCTAssertNotNil(products)
            XCTAssertGreaterThan(products?.count ?? 0, 0)
        }
    )
}
```

### Test 2: Tìm kiếm với category filter
```swift
func testImageSearchWithCategory() {
    let testImage = UIImage(named: "test_dress")!
    let categoryId = 84 // Category "General"
    
    ProductService.shared.searchProductsByImage(
        image: testImage,
        categoryId: categoryId,
        completion: { products, total, message, error in
            XCTAssertNil(error)
            
            // Kiểm tra tất cả sản phẩm đều thuộc category đã chọn
            products?.forEach { product in
                XCTAssertEqual(product.category?.id, categoryId)
            }
        }
    )
}
```

### Test 3: Kiểm tra độ tương đồng
```swift
func testSimilarityScores() {
    let testImage = UIImage(named: "test_product")!
    
    ProductService.shared.searchProductsByImage(
        image: testImage,
        minSimilarity: 0.7,
        completion: { products, total, message, error in
            XCTAssertNil(error)
            
            // Kiểm tra tất cả sản phẩm đều có độ tương đồng >= 0.7
            products?.forEach { product in
                XCTAssertGreaterThanOrEqual(product.similarity ?? 0.0, 0.7)
            }
        }
    )
}
```

---

## Troubleshooting

### Lỗi: "Image too large"
**Giải pháp:** Hình ảnh lớn hơn 5MB. Code đã tự động nén nhưng nếu vẫn gặp lỗi, hãy giảm quality khi nén:
```swift
if let imageData = image.compressToTargetSize(targetSizeKB: 3000) { // Giảm xuống 3MB
    // ...
}
```

### Lỗi: "No products found"
**Giải pháp:** 
- Giảm `minSimilarity` xuống (ví dụ: 0.3)
- Bỏ filter `categoryId` để mở rộng phạm vi tìm kiếm
- Sử dụng hình ảnh rõ nét hơn

### Lỗi: Network timeout
**Giải pháp:** 
- Kiểm tra kết nối internet
- Retry request với exponential backoff
- Giảm kích thước hình ảnh

---

## Future Improvements

1. **Caching**: Cache kết quả tìm kiếm để tránh gọi API lặp lại
2. **History**: Lưu lịch sử tìm kiếm
3. **Crop/Edit**: Cho phép người dùng crop hoặc edit hình ảnh trước khi tìm kiếm
4. **Batch Search**: Tìm kiếm với nhiều hình ảnh cùng lúc
5. **Advanced Filters**: Thêm nhiều filter như giá, thương hiệu, v.v.

---

## Liên hệ (Contact)

Nếu có vấn đề hoặc câu hỏi, vui lòng liên hệ team phát triển.
