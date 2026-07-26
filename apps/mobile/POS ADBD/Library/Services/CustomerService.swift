import Alamofire
import SwiftyJSON
import Foundation

protocol CustomerServiceProtocol {
    func loadCustomer(keyword: String?, page: Int?, limit: Int?, completion: @escaping (_ customersResponse: CustomersResponse?, _ error: NSError?) -> Void)
    func deleteCustomer(customerId: Int, completion: @escaping (_ error: NSError?) -> Void)
    func createCustomer(withValues: [String: Any], completion: @escaping (_ customer: Customer?, _ error: NSError?) -> Void)
    func updateCustomer(withValues: [String: Any], completion: @escaping (_ customer: Customer?, _ error: NSError?) -> Void)
    func updateCustomer(customerId: Int, withValues: [String: Any], completion: @escaping (_ customer: Customer?, _ error: NSError?) -> Void)
    func exportCustomers(period: String, format: String, startDate: Date?, endDate: Date?, completion: @escaping (Data?, String?, NSError?) -> Void)
}

class CustomerService: BaseService, CustomerServiceProtocol {
    static let shared = CustomerService()
    
    // MARK: - Helper Methods for Codable Parsing
    
    private func requestWithCustomParsing(path: String, method: HTTPMethod, parameters: [String: Any]? = nil, completion: @escaping (Customer?, NSError?) -> Void) {
        let fullURL = APIEndpoint.currentBaseURL + path
        
        AF.request(fullURL, method: method, parameters: parameters, encoding: JSONEncoding.default, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Customer Operation Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Customer Operation Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APICustomerResponse.self, from: data)
                        
                        print("✅ Customer operation response parsed successfully with Codable")
                        print("   Success: \(apiResponse.success)")
                        print("   Message: \(apiResponse.message ?? "No message")")
                        
                        if apiResponse.success, let customer = apiResponse.data {
                            print("✅ Customer operation successful: \(customer.full_name ?? "Unknown")")
                            DispatchQueue.main.async {
                                completion(customer, nil)
                            }
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
                            print("❌ Customer operation failed: \(nsError.localizedDescription)")
                            DispatchQueue.main.async {
                                completion(nil, nsError)
                            }
                        }
                    } catch {
                        print("❌ Codable parsing error: \(error)")
                        DispatchQueue.main.async {
                            completion(nil, error as NSError)
                        }
                    }
                case .failure(let error):
                    print("❌ Request failed: \(error)")
                    DispatchQueue.main.async {
                        completion(nil, error as NSError)
                    }
                }
            }
    }
    
    func loadCustomer(keyword: String?, page: Int?, limit: Int?, completion: @escaping (CustomersResponse?, NSError?) -> Void) {
        let path = APIEndpoint.Path.customers
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
        
        // Custom handling for customers API response với Codable
        let fullURL = APIEndpoint.currentBaseURL + path
        var requestParams = params.isEmpty ? nil : params
        
        print("📡 Loading Customers - URL: \(fullURL)")
        if let requestParams = requestParams {
            print("📡 Parameters: \(requestParams)")
        }
        
        performGET(
            path: path,
            parameters: requestParams,
            responseType: APICustomersResponse.self,
            context: "CustomerService.loadCustomer"
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
            
            if apiResponse.success, let customersResponse = apiResponse.data {
                let customers = customersResponse.customers ?? []
                print("👥 Found \(customers.count) customers")
                print("   Total: \(customersResponse.total ?? 0)")
                print("   Page: \(customersResponse.page ?? 0)")
                print("   Has More: \(customersResponse.hasMore ?? false)")
                
                DispatchQueue.main.async {
                    completion(customersResponse, nil)
                }
            } else {
                let errorMessage = apiResponse.message ?? apiResponse.error ?? "Invalid response format"
                print("❌ API Error: \(errorMessage)")
                DispatchQueue.main.async {
                    completion(nil, NSError.errorWithOwnMessage(message: errorMessage, domain: "RC"))
                }
            }
        }
    }
    
    func deleteCustomer(customerId: Int, completion: @escaping (NSError?) -> Void) {
        let path = "\(APIEndpoint.Path.customers)/\(customerId)"
        performDELETE(
            path: path,
            responseType: APIEmptyResponse.self,
            context: "CustomerService.deleteCustomer"
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
    
    func createCustomer(withValues values: [String: Any], completion: @escaping (Customer?, NSError?) -> Void) {
        let path = APIEndpoint.Path.customers
        
        performPOST(
            path: path,
            parameters: values,
            responseType: APICustomerResponse.self,
            context: "CustomerService.createCustomer"
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
            
            if apiResponse.success, let customer = apiResponse.data {
                print("✅ Customer operation successful: \(customer.full_name ?? "Unknown")")
                DispatchQueue.main.async {
                    completion(customer, nil)
                }
            } else {
                // Use error code model for localized messages
                let nsError = self.createErrorFromResponse(
                    success: apiResponse.success,
                    code: apiResponse.code,
                    message: apiResponse.message,
                    error: apiResponse.error,
                    httpStatusCode: nil,
                    defaultMessage: "Operation failed"
                )
                print("❌ Customer operation failed: \(nsError.localizedDescription)")
                DispatchQueue.main.async {
                    completion(nil, nsError)
                }
            }
        }
    }
    
    func updateCustomer(withValues values: [String: Any], completion: @escaping (Customer?, NSError?) -> Void) {
        let path = APIEndpoint.Path.customers
        
        performPUT(
            path: path,
            parameters: values,
            responseType: APICustomerResponse.self,
            context: "CustomerService.updateCustomer"
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
            
            if apiResponse.success, let customer = apiResponse.data {
                print("✅ Customer operation successful: \(customer.full_name ?? "Unknown")")
                DispatchQueue.main.async {
                    completion(customer, nil)
                }
            } else {
                // Use error code model for localized messages
                let nsError = self.createErrorFromResponse(
                    success: apiResponse.success,
                    code: apiResponse.code,
                    message: apiResponse.message,
                    error: apiResponse.error,
                    httpStatusCode: nil,
                    defaultMessage: "Operation failed"
                )
                print("❌ Customer operation failed: \(nsError.localizedDescription)")
                DispatchQueue.main.async {
                    completion(nil, nsError)
                }
            }
        }
    }
    
    func updateCustomer(customerId: Int, withValues values: [String: Any], completion: @escaping (Customer?, NSError?) -> Void) {
        let path = "\(APIEndpoint.Path.customers)/\(customerId)"
        
        performPUT(
            path: path,
            parameters: values,
            responseType: APICustomerResponse.self,
            context: "CustomerService.updateCustomerWithId"
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
            
            if apiResponse.success, let customer = apiResponse.data {
                print("✅ Customer operation successful: \(customer.full_name ?? "Unknown")")
                DispatchQueue.main.async {
                    completion(customer, nil)
                }
            } else {
                // Use error code model for localized messages
                let nsError = self.createErrorFromResponse(
                    success: apiResponse.success,
                    code: apiResponse.code,
                    message: apiResponse.message,
                    error: apiResponse.error,
                    httpStatusCode: nil,
                    defaultMessage: "Operation failed"
                )
                print("❌ Customer operation failed: \(nsError.localizedDescription)")
                DispatchQueue.main.async {
                    completion(nil, nsError)
                }
            }
        }
    }
    
    func exportCustomers(
        period: String,
        format: String = "excel",
        startDate: Date? = nil,
        endDate: Date? = nil,
        completion: @escaping (Data?, String?, NSError?) -> Void
    ) {
        let path = APIEndpoint.Path.exportCustomers
        
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
} 
