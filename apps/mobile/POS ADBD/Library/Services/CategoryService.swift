import Alamofire
import SwiftyJSON
import Foundation

protocol CategoryServiceProtocol {
    func loadCategories(keyword: String?, page: Int?, limit: Int?, completion: @escaping (_ categoriesResponse: CategoriesResponseCodable?, _ error: NSError?) -> Void)
    func deleteCategory(categoryId: Int, completion: @escaping (_ error: NSError?) -> Void)
    func updateCategory(withValues: [String: Any], completion: @escaping (_ category: Category?, _ error: NSError?) -> Void)
    func updateCategory(categoryId: Int, withValues: [String: Any], completion: @escaping (_ category: Category?, _ error: NSError?) -> Void)
    func createCategory(category: Category, completion: @escaping (_ category: Category?, _ error: NSError?) -> Void)
    func createCategory(withValues: [String: Any], completion: @escaping (_ category: Category?, _ error: NSError?) -> Void)
}

class CategoryService: BaseService, CategoryServiceProtocol {
    static let shared = CategoryService()
    
    // MARK: - Helper Methods for Codable Parsing
    
    private func requestWithCustomParsing(path: String, method: HTTPMethod, parameters: [String: Any]? = nil, completion: @escaping (Category?, NSError?) -> Void) {
        let fullURL = APIEndpoint.currentBaseURL + path
        
        AF.request(fullURL, method: method, parameters: parameters, encoding: JSONEncoding.default, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Category Operation Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Category Operation Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APICategoryResponse.self, from: data)
                        
                        print("✅ Category operation response parsed successfully with Codable")
                        print("   Success: \(apiResponse.success)")
                        print("   Message: \(apiResponse.message ?? "No message")")
                        
                        if apiResponse.success, let category = apiResponse.data {
                            print("✅ Category operation successful: \(category.name ?? "Unknown")")
                            completion(category, nil)
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
                            print("❌ Category operation failed: \(nsError.localizedDescription)")
                            completion(nil, nsError)
                        }
                    } catch {
                        completion(nil, error as NSError)
                    }
                case .failure(let error):
                    print("❌ Request failed: \(error)")
                    completion(nil, error as NSError)
                }
            }
    }
    
    func loadCategories(keyword: String?, page: Int?, limit: Int?, completion: @escaping (CategoriesResponseCodable?, NSError?) -> Void) {
        let path = APIEndpoint.Path.categories
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
        
        // Custom handling for categories API response
        let fullURL = APIEndpoint.currentBaseURL + path
        var requestParams = params.isEmpty ? nil : params
        
        print("📡 Loading Categories - URL: \(fullURL)")
        if let requestParams = requestParams {
            print("📡 Parameters: \(requestParams)")
        }
        
        performGET(
            path: path,
            parameters: requestParams,
            responseType: APICategoriesResponse.self,
            context: "CategoryService.loadCategories"
        ) { apiResponse, error in
            if let error = error {
                DispatchQueue.main.async {
                    completion(nil, error)
                }
                return
            }
            
            guard let apiResponse = apiResponse else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "RC")
                DispatchQueue.main.async {
                    completion(nil, error)
                }
                return
            }
            
            if apiResponse.success, let categoriesResponse = apiResponse.data {
                let categories = categoriesResponse.categories ?? []
                print("📦 Found \(categories.count) categories")
                print("   Total: \(categoriesResponse.total ?? 0)")
                print("   Page: \(categoriesResponse.page ?? 0)")
                print("   Has More: \(categoriesResponse.hasMore ?? false)")
                
                DispatchQueue.main.async {
                    completion(categoriesResponse, nil)
                }
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
                DispatchQueue.main.async {
                    completion(nil, nsError)
                }
            }
        }
    }
    
    func deleteCategory(categoryId: Int, completion: @escaping (NSError?) -> Void) {
        let path = "\(APIEndpoint.Path.categories)/\(categoryId)"
        performDELETE(
            path: path,
            responseType: APIEmptyResponse.self,
            context: "CategoryService.deleteCategory"
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
    
    func updateCategory(withValues values: [String: Any], completion: @escaping (Category?, NSError?) -> Void) {
        let path = APIEndpoint.Path.categories
        
        performPUT(
            path: path,
            parameters: values,
            responseType: APICategoryResponse.self,
            context: "CategoryService.updateCategory"
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
            
            if apiResponse.success, let category = apiResponse.data {
                print("✅ Category operation successful: \(category.name ?? "Unknown")")
                completion(category, nil)
            } else {
                let errorMessage = apiResponse.message ?? apiResponse.error ?? "Operation failed"
                print("❌ Category operation failed: \(errorMessage)")
                completion(nil, NSError.errorWithOwnMessage(message: errorMessage, domain: "RC"))
            }
        }
    }
    
    func updateCategory(categoryId: Int, withValues values: [String: Any], completion: @escaping (Category?, NSError?) -> Void) {
        let path = "\(APIEndpoint.Path.categories)/\(categoryId)"
        
        // Use custom response handling for Category updates with ID in path - use PUT method
        requestWithCustomParsing(path: path, method: .put, parameters: values, completion: completion)
    }
    
    func createCategory(category: Category, completion: @escaping (Category?, NSError?) -> Void) {
        let path = APIEndpoint.Path.categories
        
        let params: [String: Any] = [
            "name": category.name ?? "",
            "description": category.description ?? "",
            "isActive": category.isActive ?? true,
            "merchantId": category.merchantId ?? 0
        ]
        
        requestWithCustomParsing(path: path, method: .post, parameters: params, completion: completion)
    }
    
    func createCategory(withValues values: [String: Any], completion: @escaping (Category?, NSError?) -> Void) {
        let path = APIEndpoint.Path.categories
        requestWithCustomParsing(path: path, method: .post, parameters: values, completion: completion)
    }
}
