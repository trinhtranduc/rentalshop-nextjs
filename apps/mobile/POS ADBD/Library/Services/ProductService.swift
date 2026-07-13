import Alamofire
import SwiftyJSON
import Foundation

protocol ProductServiceProtocol {
    func loadProducts(keyword: String?, page: Int?, limit: Int?, sortBy: String?, sortOrder: String?, outletId: Int?, completion: @escaping (_ productsResponse: ProductsResponse?, _ error: NSError?) -> Void)
    func deleteProduct(productId: Int, completion: @escaping (_ error: NSError?) -> Void)
    
    // New request model methods
    func createProduct(request: CreateProductRequest, images: [UIImage], completion: @escaping (_ product: Product?, _ error: NSError?) -> Void)
    func updateProduct(productId: Int, request: UpdateProductRequest, images: [UIImage], completion: @escaping (_ product: Product?, _ error: NSError?) -> Void)
    
    // Legacy methods (deprecated)
    func updateProduct(withValues: [String: Any], productImages: [UIImage], completion: @escaping (_ product: Product?, _ error: NSError?) -> Void)
    func updateProduct(productId: Int, withValues: [String: Any], productImages: [UIImage], completion: @escaping (_ product: Product?, _ error: NSError?) -> Void)
    func createProduct(product: Product, img: UIImage, completion: @escaping (_ product: Product?, _ error: NSError?) -> Void)
    func createProduct(withValues: [String: Any], img: UIImage, completion: @escaping (_ product: Product?, _ error: NSError?) -> Void)
    func createProduct(withValues: [String: Any], images: [UIImage], completion: @escaping (_ product: Product?, _ error: NSError?) -> Void)
    
    func exportProducts(period: String, format: String, startDate: Date?, endDate: Date?, completion: @escaping (Data?, String?, NSError?) -> Void)
    
    // Image search
    func searchProductsByImage(image: UIImage, limit: Int?, minSimilarity: Float?, categoryId: Int?, completion: @escaping (_ products: [Product]?, _ total: Int?, _ message: String?, _ error: NSError?) -> Void)
    func searchProductsByImage(imageData: Data, image: UIImage, limit: Int?, minSimilarity: Float?, categoryId: Int?, completion: @escaping (_ products: [Product]?, _ total: Int?, _ message: String?, _ error: NSError?) -> Void)
}

class ProductService: BaseService, ProductServiceProtocol {
    static let shared = ProductService()
    
    // MARK: - Helper Methods for Codable Parsing
    
    private func uploadRequestWithCustomParsing(path: String, parameters: [String: Any], images: [UIImage], method: HTTPMethod = .post, completion: @escaping (Product?, NSError?) -> Void) {
        let fullURL = APIEndpoint.currentBaseURL + path
        
        AF.upload(multipartFormData: { multipartFormData in
            // Convert parameters to JSON string and wrap in "data" field
            do {
                let jsonData = try JSONSerialization.data(withJSONObject: parameters)
                if let jsonString = String(data: jsonData, encoding: .utf8) {
                    multipartFormData.append(jsonString.data(using: .utf8) ?? Data(), withName: "data")
                }
            } catch {
                print("❌ Failed to convert parameters to JSON: \(error)")
            }
            
            // Add images only if images array is not empty
            // Images should already be compressed to < 100KB before reaching here
            if !images.isEmpty {
                for (index, image) in images.enumerated() {
                    // Compress image to ensure it's < 100KB before upload
                    if let compressedData = image.compressToTargetSize(targetSizeKB: 100) {
                        multipartFormData.append(compressedData, withName: "images", fileName: "image_\(index).jpg", mimeType: "image/jpeg")
                        print("📤 Uploading image \(index + 1): \(compressedData.count / 1024)KB")
                    } else {
                        // Fallback: use JPEG with 0.8 quality if compression fails
                        if let imageData = UIImageJPEGRepresentation(image, 0.8) {
                            multipartFormData.append(imageData, withName: "images", fileName: "image_\(index).jpg", mimeType: "image/jpeg")
                            print("⚠️ Using fallback compression for image \(index + 1): \(imageData.count / 1024)KB")
                        }
                    }
                }
            }
        }, to: fullURL, method: method, headers: BaseService.formHeader)
        .responseData { response in
            print("📡 Product Operation Response:")
            print("   Status Code: \(response.response?.statusCode ?? 0)")
            
            switch response.result {
            case .success(let data):
                // Log raw response JSON
                if let jsonString = String(data: data, encoding: .utf8) {
//                    print("📄 Product Operation Raw Response Body:")
//                    print(jsonString)
//                    print("   " + String(repeating: "-", count: 50))
                }
                
                do {
                    
                    let apiResponse = try JSONDecoder.shared.decode(APIProductResponse.self, from: data)
                    
                    print("✅ Product operation response parsed successfully with Codable")
                    print("   Success: \(apiResponse.success)")
                    print("   Message: \(apiResponse.message ?? "No message")")
                    
                    if apiResponse.success, let product = apiResponse.data {
                        print("✅ Product operation successful: \(product.name ?? "Unknown")")
                        completion(product, nil)
                    } else {
                        // Use error code model for localized messages
                        let nsError = self.createErrorFromResponse(
                            success: apiResponse.success,
                            code: apiResponse.code,
                            message: apiResponse.message,
                            error: apiResponse.error,
                            httpStatusCode: response.response?.statusCode,
                            defaultMessage: "Operation failed"
                        )
                        print("❌ Product operation failed: \(nsError.localizedDescription)")
                        completion(nil, nsError)
                    }
                } catch {
                    print("❌ Failed to parse Product response: \(error)")
                    completion(nil, error as NSError)
                }
            case .failure(let error):
                print("❌ Request failed: \(error)")
                completion(nil, error as NSError)
            }
        }
    }
    
    func loadProducts(keyword: String?, page: Int?, limit: Int?, sortBy: String?, sortOrder: String?, outletId: Int?, completion: @escaping (ProductsResponse?, NSError?) -> Void) {
        let path = APIEndpoint.Path.products
        // Updated parameters according to new API documentation with pagination support
        var params: [String: Any] = [:]
        if let keyword = keyword, !keyword.isEmpty {
            params["q"] = keyword
        }
        if let page = page {
            params["page"] = page
        }
        if let limit = limit {
            params["limit"] = limit
        }
        if let sortBy = sortBy {
            params["sortBy"] = sortBy
        }
        if let sortOrder = sortOrder {
            params["sortOrder"] = sortOrder
        }
        if let outletId = outletId {
            params["outletId"] = outletId
        }
        
        // Custom handling for products API response
        let fullURL = APIEndpoint.currentBaseURL + path
        var requestParams = params.isEmpty ? nil : params
        
        print("📡 Loading Products - URL: \(fullURL)")
        if let requestParams = requestParams {
            print("📡 Parameters: \(requestParams)")
        }
        
        performGET(
            path: path,
            parameters: requestParams,
            responseType: APIProductsResponse.self,
            context: "ProductService.loadProducts"
        ) { apiResponse, error in
            if let error = error {
                completion(nil, error)
                return
            }
            
            guard let apiResponse = apiResponse else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "RC")
                completion(nil, error)
                return
            }
            
            // Print parsed products with details for debugging
            if let products = apiResponse.data?.products {
                print("📦 Parsed Products:")
                for (index, product) in products.enumerated() {
                    print("   [\(index)] \(product.name ?? "No name") (ID: \(product.product_id ?? product.id ?? 0))")
                    print("       - Barcode: \(product.barcode ?? "N/A")")
                    print("       - Rent: \(product.rentPrice ?? product.rent ?? 0)")
                    print("       - Stock: \(product.totalStock ?? product.quantity ?? 0)")
                    print("       - Images: \(product.images?.count ?? 0) images")
                    if let firstImage = product.images?.first {
                        print("       - First Image: \(firstImage.prefix(80))...")
                    }
                }
            }
            
            if apiResponse.success, let productsResponse = apiResponse.data {
                let products = productsResponse.products ?? []
                print("📦 Found \(products.count) products")
                print("   Total: \(productsResponse.total ?? 0)")
                print("   Page: \(productsResponse.page ?? 0)")
                print("   Has More: \(productsResponse.hasMore ?? false)")
                
                completion(productsResponse, nil)
            } else {
                // Use error code model for localized messages
                let nsError = self.createErrorFromResponse(
                    success: apiResponse.success,
                    code: apiResponse.code,
                    message: apiResponse.message,
                    error: apiResponse.error,
                    httpStatusCode: nil,
                    defaultMessage: "Invalid response format"
                )
                print("❌ API Error: \(nsError.localizedDescription)")
                completion(nil, nsError)
            }
        }
    }
    
    
    func deleteProduct(productId: Int, completion: @escaping (NSError?) -> Void) {
        let path = "\(APIEndpoint.Path.products)/\(productId)"
        performDELETE(
            path: path,
            responseType: APIEmptyResponse.self,
            context: "ProductService.deleteProduct"
        ) { apiResponse, error in
            if let error = error {
                completion(error)
                return
            }
            
            guard let apiResponse = apiResponse else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "RC")
                completion(error)
                return
            }
            
            if apiResponse.success {
                completion(nil)
            } else {
                // Use error code model for localized messages
                let nsError = self.createErrorFromResponse(
                    success: apiResponse.success,
                    code: apiResponse.code,
                    message: apiResponse.message,
                    error: apiResponse.error,
                    httpStatusCode: nil,
                    defaultMessage: "Delete failed"
                )
                completion(nsError)
            }
        }
    }
    
    func updateProduct(withValues values: [String: Any], productImages: [UIImage], completion: @escaping (Product?, NSError?) -> Void) {
        let path = APIEndpoint.Path.products
        
        // Use custom response handling for Product updates - use PUT method
        uploadRequestWithCustomParsing(path: path, parameters: values, images: productImages, method: .put, completion: completion)
    }
    
    func updateProduct(productId: Int, withValues values: [String: Any], productImages: [UIImage], completion: @escaping (Product?, NSError?) -> Void) {
        let path = "\(APIEndpoint.Path.products)/\(productId)"
        
        // Use custom response handling for Product updates with ID in path - use PUT method
        uploadRequestWithCustomParsing(path: path, parameters: values, images: productImages, method: .put, completion: completion)
    }
    
    func createProduct(product: Product, img: UIImage, completion: @escaping (Product?, NSError?) -> Void) {
        let path = APIEndpoint.Path.products
        
        let params: [String: Any] = [
            "name": product.name ?? "",
            "description": product.description ?? product.note ?? "",
            "barcode": product.barcode ?? "",
            "totalStock": product.totalStock ?? product.quantity,
            "rentPrice": product.rentPrice ?? product.rent,
            "salePrice": product.salePrice ?? product.sale,
            "deposit": product.deposit ?? 0.0
        ]
        
        uploadRequestWithCustomParsing(path: path, parameters: params, images: [img], completion: completion)
    }
    
    func createProduct(withValues values: [String: Any], img: UIImage, completion: @escaping (Product?, NSError?) -> Void) {
        let path = APIEndpoint.Path.products
        uploadRequestWithCustomParsing(path: path, parameters: values, images: [img], completion: completion)
    }
    
    func createProduct(withValues values: [String: Any], images: [UIImage], completion: @escaping (Product?, NSError?) -> Void) {
        let path = APIEndpoint.Path.products
        uploadRequestWithCustomParsing(path: path, parameters: values, images: images, completion: completion)
    }
    
    func exportProducts(
        period: String,
        format: String = "excel",
        startDate: Date? = nil,
        endDate: Date? = nil,
        completion: @escaping (Data?, String?, NSError?) -> Void
    ) {
        let path = APIEndpoint.Path.exportProducts
        
        // Build query parameters according to new API spec
        var queryParams: [String: Any] = [:]
        queryParams["period"] = period
        queryParams["format"] = format
        
        // Add dates if period is custom
        if period == "custom" {
            if let startDate = startDate {
                queryParams["startDate"] = startDate.dateServerISOString()
            }
            if let endDate = endDate {
                queryParams["endDate"] = endDate.dateServerISOString()
            }
        }
        
        exportDataGET(path: path, parameters: queryParams, completion: completion)
    }
    
    // MARK: - New Request Model Methods
    
    func createProduct(request: CreateProductRequest, images: [UIImage], completion: @escaping (Product?, NSError?) -> Void) {
        // Validate request
        let validation = request.validate()
        if !validation.isValid {
            let errorMessage = validation.errors.joined(separator: "\n")
            let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "ValidationError")
            completion(nil, error)
            return
        }
        
        let path = APIEndpoint.Path.products
        let fullURL = APIEndpoint.currentBaseURL + path
        
        let requestId = UUID().uuidString.prefix(8)
        let timestamp = Date()
        
        print("📡 Creating Product:")
        print("   Request ID: \(requestId)")
        print("   Timestamp: \(timestamp)")
        print("   URL: \(fullURL)")
        print("   Method: POST")
        print("   Name: \(request.name)")
        print("   Description: \(request.description ?? "nil")")
        print("   Barcode: \(request.barcode ?? "nil")")
        print("   Rent Price: \(request.rentPrice)")
        print("   Sale Price: \(request.salePrice)")
        print("   Deposit: \(request.deposit ?? 0)")
        print("   Total Stock: \(request.totalStock)")
        print("   Merchant ID: \(request.merchantId ?? 0)")
        print("   Category ID: \(request.categoryId ?? 0)")
        print("   Images: \(images.count)\(images.isEmpty ? " (not sending images field)" : "")")
        print("   Outlet Stock: \(request.outletStock.count) outlets")
        for (index, outlet) in request.outletStock.enumerated() {
            print("     Outlet \(index + 1): ID=\(outlet.outletId), Stock=\(outlet.stock)")
        }
        
        // Convert to form data
        let formData = request.toFormData()
        
        // Log form data
        print("📤 Product Request Form Data:")
        print("   data: \(formData)")
        
        // Log the JSON data that will be sent
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: formData)
            if let jsonString = String(data: jsonData, encoding: .utf8) {
                print("📄 Product Data JSON (wrapped in 'data' field):")
                print(jsonString)
            }
        } catch {
            print("❌ Failed to encode form data to JSON: \(error)")
        }
        
        // Log request JSON
        do {
            let jsonData = try JSONEncoder().encode(request)
            if let jsonString = String(data: jsonData, encoding: .utf8) {
                print("📄 Product Request JSON:")
                print(jsonString)
            }
        } catch {
            print("❌ Failed to encode Product request to JSON: \(error)")
        }
        
        // Log request headers
        print("📋 Product Request Headers:")
        for header in BaseService.formHeader {
            print("   \(header.name): \(header.value)")
        }
        
        // Use existing upload method with logging
        uploadRequestWithCustomParsing(path: path, parameters: formData, images: images, completion: completion)
    }
    
    func updateProduct(productId: Int, request: UpdateProductRequest, images: [UIImage], completion: @escaping (Product?, NSError?) -> Void) {
        // Validate request
        let validation = request.validate()
        if !validation.isValid {
            let errorMessage = validation.errors.joined(separator: "\n")
            let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "ValidationError")
            completion(nil, error)
            return
        }
        
        let path = "\(APIEndpoint.Path.products)/\(productId)"
        let fullURL = APIEndpoint.currentBaseURL + path
        
        let requestId = UUID().uuidString.prefix(8)
        let timestamp = Date()
        
        print("📡 Updating Product \(productId):")
        print("   Request ID: \(requestId)")
        print("   Timestamp: \(timestamp)")
        print("   URL: \(fullURL)")
        print("   Method: PUT")
        if let name = request.name { print("   Name: \(name)") }
        if let description = request.description { print("   Description: \(description)") }
        if let barcode = request.barcode { print("   Barcode: \(barcode)") }
        if let rentPrice = request.rentPrice { print("   Rent Price: \(rentPrice)") }
        if let salePrice = request.salePrice { print("   Sale Price: \(salePrice)") }
        if let deposit = request.deposit { print("   Deposit: \(deposit)") }
        if let totalStock = request.totalStock { print("   Total Stock: \(totalStock)") }
        if let merchantId = request.merchantId { print("   Merchant ID: \(merchantId)") }
        if let categoryId = request.categoryId { print("   Category ID: \(categoryId)") }
        print("   Images: \(images.count)\(images.isEmpty ? " (not sending images field)" : "")")
        if let outletStock = request.outletStock { 
            print("   Outlet Stock: \(outletStock.count) outlets")
            for (index, outlet) in outletStock.enumerated() {
                print("     Outlet \(index + 1): ID=\(outlet.outletId), Stock=\(outlet.stock)")
            }
        }
        if let isActive = request.isActive { print("   Is Active: \(isActive)") }
        
        // Convert to form data
        let formData = request.toFormData()
        
        // Log form data
        print("📤 Product Update Request Form Data:")
        print("   data: \(formData)")
        
        // Log the JSON data that will be sent
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: formData)
            if let jsonString = String(data: jsonData, encoding: .utf8) {
                print("📄 Product Update Data JSON (wrapped in 'data' field):")
                print(jsonString)
            }
        } catch {
            print("❌ Failed to encode form data to JSON: \(error)")
        }
        
        // Log request JSON
        do {
            let jsonData = try JSONEncoder().encode(request)
            if let jsonString = String(data: jsonData, encoding: .utf8) {
                print("📄 Product Update Request JSON:")
                print(jsonString)
            }
        } catch {
            print("❌ Failed to encode Product update request to JSON: \(error)")
        }
        
        // Log request headers
        print("📋 Product Update Request Headers:")
        for header in BaseService.formHeader {
            print("   \(header.name): \(header.value)")
        }
        
        // Use existing upload method with logging
        uploadRequestWithCustomParsing(path: path, parameters: formData, images: images, method: .put, completion: completion)
    }
    
    // MARK: - Image Search Method
    
    /// Search products by image (with pre-compressed data)
    /// - Parameters:
    ///   - imageData: Pre-compressed image data (will be used directly)
    ///   - image: UIImage for logging purposes
    ///   - limit: Maximum number of results to return (1-100, default: 20)
    ///   - minSimilarity: Minimum similarity score (0.0-1.0, default: 0.5)
    ///   - categoryId: Optional category ID to filter results
    ///   - completion: Completion handler with products array, total count, message, and error
    func searchProductsByImage(
        imageData: Data,
        image: UIImage,
        limit: Int? = 20,
        minSimilarity: Float? = 0.5,
        categoryId: Int? = nil,
        completion: @escaping ([Product]?, Int?, String?, NSError?) -> Void
    ) {
        let path = "/api/products/searchByImage"
        let fullURL = APIEndpoint.currentBaseURL + path
        
        let requestId = UUID().uuidString.prefix(8)
        let timestamp = Date()
        
        let sizeKB = imageData.count / 1024
        
        print("📡 Searching Products by Image:")
        print("   Request ID: \(requestId)")
        print("   Timestamp: \(timestamp)")
        print("   URL: \(fullURL)")
        print("   Method: POST")
        print("   Limit: \(limit ?? 20)")
        print("   Min Similarity: \(minSimilarity ?? 0.5)")
        if let categoryId = categoryId {
            print("   Category ID: \(categoryId)")
        }
        print("   Image Size: \(image.size)")
        print("   Compressed Data Size: \(sizeKB)KB")
        print("   " + String(repeating: "-", count: 50))
        
        AF.upload(multipartFormData: { multipartFormData in
            // Use pre-compressed data directly
            multipartFormData.append(imageData, withName: "image", fileName: "search_image.jpg", mimeType: "image/jpeg")
            print("📤 Uploading pre-compressed image: \(sizeKB)KB")
            
            // Add optional parameters
            if let limit = limit {
                if let data = "\(limit)".data(using: .utf8) {
                    multipartFormData.append(data, withName: "limit")
                }
            }
            
            if let minSimilarity = minSimilarity {
                if let data = "\(minSimilarity)".data(using: .utf8) {
                    multipartFormData.append(data, withName: "minSimilarity")
                }
            }
            
            if let categoryId = categoryId {
                if let data = "\(categoryId)".data(using: .utf8) {
                    multipartFormData.append(data, withName: "categoryId")
                }
            }
        }, to: fullURL, method: .post, headers: BaseService.formHeader)
        .responseData { response in
            print("📡 Image Search Response:")
            print("   Status Code: \(response.response?.statusCode ?? 0)")
            
            switch response.result {
            case .success(let data):
                // Log raw response JSON
                if let jsonString = String(data: data, encoding: .utf8) {
                    if let jsonObject = try? JSONSerialization.jsonObject(with: data, options: []),
                       let prettyJsonData = try? JSONSerialization.data(withJSONObject: jsonObject, options: [.prettyPrinted]),
                       let prettyJsonString = String(data: prettyJsonData, encoding: .utf8) {
                        print("📄 Image Search Response Body:")
                        print(prettyJsonString)
                    } else {
                        print("📄 Image Search Response Body (Raw):")
                        print(jsonString)
                    }
                    print("   " + String(repeating: "-", count: 50))
                }
                
                do {
                    let apiResponse = try JSONDecoder.shared.decode(APIImageSearchResponse.self, from: data)
                    
                    print("✅ Image search response parsed successfully")
                    print("   Success: \(apiResponse.success)")
                    print("   Message: \(apiResponse.message ?? "No message")")
                    
                    if apiResponse.success, let responseData = apiResponse.data {
                        let products = responseData.products ?? []
                        let total = responseData.total ?? 0
                        let message = responseData.message ?? apiResponse.message
                        
                        print("✅ Image search successful:")
                        print("   Found \(products.count) products")
                        print("   Total: \(total)")
                        print("   Message: \(message ?? "No message")")
                        
                        // Log products with similarity scores
                        for (index, product) in products.enumerated() {
                            print("   [\(index + 1)] \(product.name ?? "No name")")
                            print("       - Similarity: \(product.similarity ?? 0.0)")
                            print("       - Similarity %: \(product.similarityPercent ?? 0)%")
                            print("       - Category: \(product.category?.name ?? "N/A")")
                            print("       - Merchant: \(product.merchant?.name ?? "N/A")")
                        }
                        
                        completion(products, total, message, nil)
                    } else {
                        // Use error code model for localized messages
                        let nsError = self.createErrorFromResponse(
                            success: apiResponse.success,
                            code: apiResponse.code,
                            message: apiResponse.message,
                            error: apiResponse.error,
                            httpStatusCode: response.response?.statusCode,
                            defaultMessage: "Image search failed"
                        )
                        print("❌ Image search failed: \(nsError.localizedDescription)")
                        completion(nil, nil, nil, nsError)
                    }
                } catch {
                    print("❌ Failed to parse image search response: \(error)")
                    error.logJSONParsingError(data: data, context: "Image Search")
                    completion(nil, nil, nil, error as NSError)
                }
            case .failure(let error):
                print("❌ Image search request failed: \(error)")
                completion(nil, nil, nil, error as NSError)
            }
        }
    }
    
    /// Search products by image (UIImage version - for backward compatibility)
    /// - Parameters:
    ///   - image: The image to search with (UIImage)
    ///   - limit: Maximum number of results to return (1-100, default: 20)
    ///   - minSimilarity: Minimum similarity score (0.0-1.0, default: 0.5)
    ///   - categoryId: Optional category ID to filter results
    ///   - completion: Completion handler with products array, total count, message, and error
    func searchProductsByImage(
        image: UIImage,
        limit: Int? = 20,
        minSimilarity: Float? = 0.5,
        categoryId: Int? = nil,
        completion: @escaping ([Product]?, Int?, String?, NSError?) -> Void
    ) {
        let path = "/api/products/searchByImage"
        let fullURL = APIEndpoint.currentBaseURL + path
        
        let requestId = UUID().uuidString.prefix(8)
        let timestamp = Date()
        
        print("📡 Searching Products by Image:")
        print("   Request ID: \(requestId)")
        print("   Timestamp: \(timestamp)")
        print("   URL: \(fullURL)")
        print("   Method: POST")
        print("   Limit: \(limit ?? 20)")
        print("   Min Similarity: \(minSimilarity ?? 0.5)")
        if let categoryId = categoryId {
            print("   Category ID: \(categoryId)")
        }
        print("   Image Size: \(image.size)")
        print("   " + String(repeating: "-", count: 50))
        
        AF.upload(multipartFormData: { multipartFormData in
            // Add image (required field)
            // Only compress if image is too large (safety check for max 5MB as per API docs)
            let imageData: Data?
            if let jpegData = UIImageJPEGRepresentation(image, 0.8) {
                let sizeKB = jpegData.count / 1024
                if sizeKB > 5000 {
                    // Only compress if image is larger than 5MB
                    imageData = image.compressToTargetSize(targetSizeKB: 5000)
                    print("📤 Image compressed for upload: \((imageData?.count ?? 0) / 1024)KB (original: \(sizeKB)KB)")
                } else {
                    // Use image as-is if already small enough
                    imageData = jpegData
                    print("📤 Image uploaded: \(sizeKB)KB (no compression needed)")
                }
            } else {
                imageData = nil
            }
            
            if let imageData = imageData {
                multipartFormData.append(imageData, withName: "image", fileName: "search_image.jpg", mimeType: "image/jpeg")
            } else {
                print("⚠️ Failed to convert image to JPEG")
            }
            
            // Add optional parameters
            if let limit = limit {
                if let data = "\(limit)".data(using: .utf8) {
                    multipartFormData.append(data, withName: "limit")
                }
            }
            
            if let minSimilarity = minSimilarity {
                if let data = "\(minSimilarity)".data(using: .utf8) {
                    multipartFormData.append(data, withName: "minSimilarity")
                }
            }
            
            if let categoryId = categoryId {
                if let data = "\(categoryId)".data(using: .utf8) {
                    multipartFormData.append(data, withName: "categoryId")
                }
            }
        }, to: fullURL, method: .post, headers: BaseService.formHeader)
        .responseData { response in
            print("📡 Image Search Response:")
            print("   Status Code: \(response.response?.statusCode ?? 0)")
            
            switch response.result {
            case .success(let data):
                // Log raw response JSON
                if let jsonString = String(data: data, encoding: .utf8) {
                    if let jsonObject = try? JSONSerialization.jsonObject(with: data, options: []),
                       let prettyJsonData = try? JSONSerialization.data(withJSONObject: jsonObject, options: [.prettyPrinted]),
                       let prettyJsonString = String(data: prettyJsonData, encoding: .utf8) {
                        print("📄 Image Search Response Body:")
                        print(prettyJsonString)
                    } else {
                        print("📄 Image Search Response Body (Raw):")
                        print(jsonString)
                    }
                    print("   " + String(repeating: "-", count: 50))
                }
                
                do {
                    let apiResponse = try JSONDecoder.shared.decode(APIImageSearchResponse.self, from: data)
                    
                    print("✅ Image search response parsed successfully")
                    print("   Success: \(apiResponse.success)")
                    print("   Message: \(apiResponse.message ?? "No message")")
                    
                    if apiResponse.success, let responseData = apiResponse.data {
                        let products = responseData.products ?? []
                        let total = responseData.total ?? 0
                        let message = responseData.message ?? apiResponse.message
                        
                        print("✅ Image search successful:")
                        print("   Found \(products.count) products")
                        print("   Total: \(total)")
                        print("   Message: \(message ?? "No message")")
                        
                        // Log products with similarity scores
                        for (index, product) in products.enumerated() {
                            print("   [\(index + 1)] \(product.name ?? "No name")")
                            print("       - Similarity: \(product.similarity ?? 0.0)")
                            print("       - Similarity %: \(product.similarityPercent ?? 0)%")
                            print("       - Category: \(product.category?.name ?? "N/A")")
                            print("       - Merchant: \(product.merchant?.name ?? "N/A")")
                        }
                        
                        completion(products, total, message, nil)
                    } else {
                        // Use error code model for localized messages
                        let nsError = self.createErrorFromResponse(
                            success: apiResponse.success,
                            code: apiResponse.code,
                            message: apiResponse.message,
                            error: apiResponse.error,
                            httpStatusCode: response.response?.statusCode,
                            defaultMessage: "Image search failed"
                        )
                        print("❌ Image search failed: \(nsError.localizedDescription)")
                        completion(nil, nil, nil, nsError)
                    }
                } catch {
                    print("❌ Failed to parse image search response: \(error)")
                    error.logJSONParsingError(data: data, context: "Image Search")
                    completion(nil, nil, nil, error as NSError)
                }
            case .failure(let error):
                print("❌ Image search request failed: \(error)")
                completion(nil, nil, nil, error as NSError)
            }
        }
    }
} 
