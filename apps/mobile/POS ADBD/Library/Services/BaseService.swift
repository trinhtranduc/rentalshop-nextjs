import Alamofire
import SwiftyJSON

// MARK: - API Error Handler
typealias APIErrorHandler = (APIErrorCode, String) -> Void

class BaseService {
    // MARK: - Properties
    private var errorHandler: APIErrorHandler?
    
    // MARK: - Headers - Updated according to API documentation
    static var jsonHeader: HTTPHeaders {
        var header: HTTPHeaders = [
            "Content-Type": "application/json",
            "X-Client-Platform": "mobile",
            "X-Device-Type": "ios",
            "X-App-Version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0",
            "User-Agent": "AnyRent-iOS/1.0.0"
        ]
        
        // Add Authorization header using Bearer token format
        if let user = User.account(), let token = user.token {
            header["Authorization"] = "Bearer \(token)"
        }
        
        return header
    }
    
    static var formHeader: HTTPHeaders {
        var header: HTTPHeaders = [
            "Content-Type": "multipart/form-data",
            "X-Client-Platform": "mobile",
            "X-Device-Type": "ios",
            "X-App-Version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0",
            "User-Agent": "AnyRent-iOS/1.0.0"
        ]
        
        // Add Authorization header using Bearer token format
        if let user = User.account(), let token = user.token {
            header["Authorization"] = "Bearer \(token)"
        }
        
        return header
    }
    
    // MARK: - Setup
    func setErrorHandler(_ handler: @escaping APIErrorHandler) {
        self.errorHandler = handler
    }
    
    // MARK: - Helper Methods
    
    /// Convert enum rawValue to uppercase for API compatibility
    func apiEnumValue<T: RawRepresentable>(_ enumValue: T) -> String where T.RawValue == String {
        return enumValue.rawValue.uppercased()
    }
    
    // MARK: - Generic API Request Methods
    
    /// Generic GET request with comprehensive logging
    func performGET<T: Codable>(
        path: String,
        parameters: [String: Any]? = nil,
        responseType: T.Type,
        context: String = "API Request",
        completion: @escaping (T?, NSError?) -> Void
    ) {
        let fullURL = path.hasPrefix("http") ? path : APIEndpoint.currentBaseURL + path
        let requestParams = parameters
        
        // Log request details
        print("📡 \(context) Request:")
        print("   URL: \(fullURL)")
        print("   Method: GET")
        print("   Parameters: \(requestParams ?? [:])")
        print("   Headers: \(BaseService.jsonHeader)")
        print("   Timestamp: \(Date())")
        print("   " + String(repeating: "-", count: 50))
        
        AF.request(fullURL, method: .get, parameters: requestParams, headers: BaseService.jsonHeader)
            .responseData { response in
                self.handleResponse(response: response, responseType: responseType, context: context, completion: completion)
            }
    }
    
    /// Generic POST request with comprehensive logging
    func performPOST<T: Codable>(
        path: String,
        parameters: [String: Any]? = nil,
        responseType: T.Type,
        context: String = "API Request",
        completion: @escaping (T?, NSError?) -> Void
    ) {
        let fullURL = path.hasPrefix("http") ? path : APIEndpoint.currentBaseURL + path
        
        // Log request details
        print("📡 \(context) Request:")
        print("   URL: \(fullURL)")
        print("   Method: POST")
        print("   Headers: \(BaseService.jsonHeader)")
        print("   Timestamp: \(Date())")
        
        // Log POST parameters as JSON string
        if let parameters = parameters {
            do {
                let jsonData = try JSONSerialization.data(withJSONObject: parameters, options: [.prettyPrinted, .sortedKeys])
                if let jsonString = String(data: jsonData, encoding: .utf8) {
                    print("   POST Body (JSON):")
                    print(jsonString)
                } else {
                    print("   Parameters: \(parameters)")
                }
            } catch {
                print("   Parameters: \(parameters)")
                print("   ⚠️ Failed to convert parameters to JSON: \(error)")
            }
        } else {
            print("   POST Body: (empty)")
        }
        print("   " + String(repeating: "-", count: 50))
        
        AF.request(fullURL, method: .post, parameters: parameters, encoding: JSONEncoding.default, headers: BaseService.jsonHeader)
            .responseData { response in
                self.handleResponse(response: response, responseType: responseType, context: context, completion: completion)
            }
    }
    
    /// Generic PUT request with comprehensive logging
    func performPUT<T: Codable>(
        path: String,
        parameters: [String: Any]? = nil,
        responseType: T.Type,
        context: String = "API Request",
        completion: @escaping (T?, NSError?) -> Void
    ) {
        let fullURL = path.hasPrefix("http") ? path : APIEndpoint.currentBaseURL + path
        
        // Log request details
        print("📡 \(context) Request:")
        print("   URL: \(fullURL)")
        print("   Method: PUT")
        print("   Headers: \(BaseService.jsonHeader)")
        print("   Timestamp: \(Date())")
        
        // Log PUT parameters as JSON string
        if let parameters = parameters {
            do {
                let jsonData = try JSONSerialization.data(withJSONObject: parameters, options: [.prettyPrinted, .sortedKeys])
                if let jsonString = String(data: jsonData, encoding: .utf8) {
                    print("   PUT Body (JSON):")
                    print(jsonString)
                } else {
                    print("   Parameters: \(parameters)")
                }
            } catch {
                print("   Parameters: \(parameters)")
                print("   ⚠️ Failed to convert parameters to JSON: \(error)")
            }
        } else {
            print("   PUT Body: (empty)")
        }
        print("   " + String(repeating: "-", count: 50))
        
        AF.request(fullURL, method: .put, parameters: parameters, encoding: JSONEncoding.default, headers: BaseService.jsonHeader)
            .responseData { response in
                self.handleResponse(response: response, responseType: responseType, context: context, completion: completion)
            }
    }

    /// PUT request with Encodable body (e.g. UpdateOrderRequest with notesImages for "delete only" API)
    func performPUTWithEncodableBody<T: Codable, R: Encodable>(
        path: String,
        body: R,
        responseType: T.Type,
        context: String = "API Request",
        completion: @escaping (T?, NSError?) -> Void
    ) {
        let fullURL = path.hasPrefix("http") ? path : APIEndpoint.currentBaseURL + path
        do {
            let data = try JSONEncoder.shared.encode(body)
            if let jsonString = String(data: data, encoding: .utf8) {
                print("📡 \(context) PUT Body (JSON): \(jsonString)")
            }
            var request = URLRequest(url: URL(string: fullURL)!)
            request.httpMethod = "PUT"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = data
            for (key, value) in BaseService.jsonHeader.dictionary {
                request.setValue(value, forHTTPHeaderField: key)
            }
            AF.request(request).responseData { response in
                self.handleResponse(response: response, responseType: responseType, context: context, completion: completion)
            }
        } catch {
            print("❌ \(context) JSON Encoding error: \(error)")
            completion(nil, error as NSError)
        }
    }

    /// Generic PATCH request with comprehensive logging
    func performPATCH<T: Codable>(
        path: String,
        parameters: [String: Any]? = nil,
        responseType: T.Type,
        context: String = "API Request",
        completion: @escaping (T?, NSError?) -> Void
    ) {
        let fullURL = path.hasPrefix("http") ? path : APIEndpoint.currentBaseURL + path
        
        // Log request details
        print("📡 \(context) Request:")
        print("   URL: \(fullURL)")
        print("   Method: PATCH")
        print("   Headers: \(BaseService.jsonHeader)")
        print("   Timestamp: \(Date())")
        
        // Log PATCH parameters as JSON string
        if let parameters = parameters {
            do {
                let jsonData = try JSONSerialization.data(withJSONObject: parameters, options: [.prettyPrinted, .sortedKeys])
                if let jsonString = String(data: jsonData, encoding: .utf8) {
                    print("   PATCH Body (JSON):")
                    print(jsonString)
                } else {
                    print("   Parameters: \(parameters)")
                }
            } catch {
                print("   Parameters: \(parameters)")
                print("   ⚠️ Failed to convert parameters to JSON: \(error)")
            }
        } else {
            print("   PATCH Body: (empty)")
        }
        print("   " + String(repeating: "-", count: 50))
        
        AF.request(fullURL, method: .patch, parameters: parameters, encoding: JSONEncoding.default, headers: BaseService.jsonHeader)
            .responseData { response in
                self.handleResponse(response: response, responseType: responseType, context: context, completion: completion)
            }
    }
    
    /// Generic DELETE request with comprehensive logging
    func performDELETE<T: Codable>(
        path: String,
        parameters: [String: Any]? = nil,
        responseType: T.Type,
        context: String = "API Request",
        completion: @escaping (T?, NSError?) -> Void
    ) {
        let fullURL = path.hasPrefix("http") ? path : APIEndpoint.currentBaseURL + path
        
        // Log request details
        print("📡 \(context) Request:")
        print("   URL: \(fullURL)")
        print("   Method: DELETE")
        print("   Parameters: \(parameters ?? [:])")
        print("   Headers: \(BaseService.jsonHeader)")
        print("   Timestamp: \(Date())")
        print("   " + String(repeating: "-", count: 50))
        
        AF.request(fullURL, method: .delete, parameters: parameters, headers: BaseService.jsonHeader)
            .responseData { response in
                self.handleResponse(response: response, responseType: responseType, context: context, completion: completion)
            }
    }
    
    /// Generic response handler with comprehensive logging
    private func handleResponse<T: Codable>(
        response: DataResponse<Data, AFError>,
        responseType: T.Type,
        context: String,
        completion: @escaping (T?, NSError?) -> Void
    ) {
        // Log response details
        print("📡 \(context) Response:")
        print("   Status Code: \(response.response?.statusCode ?? 0)")
        print("   Headers: \(response.response?.allHeaderFields ?? [:])")
        
        switch response.result {
        case .success(let data):
            // Log raw response data as formatted JSON
            if let jsonString = String(data: data, encoding: .utf8) {
                // Try to format JSON for better readability
                if let jsonObject = try? JSONSerialization.jsonObject(with: data, options: []),
                   let prettyJsonData = try? JSONSerialization.data(withJSONObject: jsonObject, options: [.prettyPrinted, .sortedKeys]),
                   let prettyJsonString = String(data: prettyJsonData, encoding: .utf8) {
                    print("   Response Body (JSON):")
                    print(prettyJsonString)
                } else {
                    print("   Response Body (Raw):")
                    print(jsonString)
                }
            } else {
                print("   Response Body: (binary data, \(data.count) bytes)")
            }
            
            do {
                let decodedResponse = try JSONDecoder.shared.decode(responseType, from: data)
                print("✅ \(context) Success: Response parsed successfully")
                completion(decodedResponse, nil)
            } catch {
                print("❌ \(context) JSON Parsing Error:")
                print("   Error: \(error)")
                print("   Error Type: \(type(of: error))")
                
                // Log detailed parsing error using extension
                error.logJSONParsingError(data: data, context: context)
                
                let nsError = error as NSError
                if let userId = UserDefaults.standard.string(forKey: "user_id") {
                    AnalyticsService.shared.trackError(error: nsError, userId: userId, context: context.lowercased())
                }
                completion(nil, nsError)
            }
            
        case .failure(let error):
            print("❌ \(context) Network Error:")
            print("   Error: \(error)")
            print("   Error Type: \(type(of: error))")
            print("   Localized Description: \(error.localizedDescription)")
            
            let nsError = error as NSError
            if let userId = UserDefaults.standard.string(forKey: "user_id") {
                AnalyticsService.shared.trackError(error: nsError, userId: userId, context: context.lowercased())
            }
            completion(nil, nsError)
        }
        
        print("   " + String(repeating: "-", count: 50))
    }
    
    // MARK: - Export Methods
    
    /// Export data using GET request with query parameters (for new export API)
    func exportDataGET(path: String, parameters: [String: Any]?, completion: @escaping (Data?, String?, NSError?) -> Void) {
        let fullURL = path.hasPrefix("http") ? path : APIEndpoint.currentBaseURL + path
        
        // Log export request details
        print("📊 EXPORT REQUEST (GET):")
        print("   URL: \(fullURL)")
        print("   Method: GET")
        print("   Headers: \(BaseService.jsonHeader)")
        print("   Parameters: \(parameters ?? [:])")
        print("   Timestamp: \(Date())")
        print("   " + String(repeating: "-", count: 50))
        
        AF.request(fullURL, method: .get, parameters: parameters, headers: BaseService.jsonHeader)
            .responseData { [weak self] response in
                guard let self = self else { return }
                
                // Log export response details
                print("📥 EXPORT RESPONSE:")
                print("   URL: \(fullURL)")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                print("   Response Headers: \(response.response?.allHeaderFields ?? [:])")
                
                // Extract filename from Content-Disposition header
                var filename: String? = nil
                if let contentDisposition = response.response?.value(forHTTPHeaderField: "Content-Disposition") {
                    // Try to extract filename from Content-Disposition header
                    // Format: attachment; filename="filename.xlsx"
                    if let filenameStart = contentDisposition.range(of: "filename=\"") {
                        let filenameString = String(contentDisposition[filenameStart.upperBound...])
                        if let filenameEnd = filenameString.range(of: "\"") {
                            filename = String(filenameString[..<filenameEnd.lowerBound])
                        }
                    }
                }
                
                switch response.result {
                case .success(let data):
                    // Check if response is an error JSON
                    if let jsonString = String(data: data, encoding: .utf8),
                       let jsonData = jsonString.data(using: .utf8),
                       let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
                       let success = json?["success"] as? Bool, !success {
                        // This is an error response
                        let errorMessage = json?["message"] as? String ?? "Export failed".localized()
                        let errorCode = json?["code"] as? String ?? "EXPORT_ERROR"
                        print("   ❌ Error: \(errorMessage)")
                        print("   Error Code: \(errorCode)")
                        print("   " + String(repeating: "-", count: 50))
                        
                        let nsError = NSError.errorWithOwnMessage(message: errorMessage, domain: "RC")
                        completion(nil, nil, nsError)
                        return
                    }
                    
                    // Log success details
                    print("   ✅ Success: Received \(data.count) bytes of data")
                    if let filename = filename {
                        print("   Filename: \(filename)")
                    }
                    print("   " + String(repeating: "-", count: 50))
                    
                    completion(data, filename, nil)
                    
                case .failure(let error):
                    // Log error details
                    print("   ❌ Error: \(error)")
                    print("   Error Code: \((error as NSError).code)")
                    print("   Error Description: \(error.localizedDescription)")
                    print("   " + String(repeating: "-", count: 50))
                    
                    let nsErrorCode = (error as NSError).code
                    let errorCode = APIErrorCode(fromHTTPStatusCode: nsErrorCode) ?? .unknownError
                    self.handleError(code: errorCode, message: errorCode.defaultMessage)
                    
                    let nsError = NSError.errorWithOwnMessage(
                        message: errorCode.defaultMessage,
                        domain: "RC",
                        code: errorCode.httpStatusCode
                    )
                    completion(nil, nil, nsError)
                }
            }
    }
    
    /// Legacy export method using POST (kept for backward compatibility)
    func exportData(path: String, parameters: [String: Any], completion: @escaping (Data?, NSError?) -> Void) {
        // Log export request details
        print("📊 EXPORT REQUEST:")
        print("   URL: \(path)")
        print("   Method: POST")
        print("   Headers: \(BaseService.formHeader)")
        print("   Parameters: \(parameters)")
        print("   Timestamp: \(Date())")
        print("   " + String(repeating: "-", count: 50))
        
        AF.upload(multipartFormData: { multipart in
            // Handle parameters
            for (key, value) in parameters {
                let data: Data?
                switch value {
                case let i as Int:
                    data = i.description.data(using: .utf8)
                case let f as Float:
                    data = f.description.data(using: .utf8)
                case let d as Double:
                    data = d.description.data(using: .utf8)
                case let s as String:
                    data = s.data(using: .utf8)
                case let b as Bool:
                    data = b.description.data(using: .utf8)
                default:
                    data = nil
                }
                if let data = data {
                    multipart.append(data, withName: key)
                }
            }
        }, to: path.hasPrefix("http") ? path : APIEndpoint.currentBaseURL + path, method: .post, headers: BaseService.formHeader)
        .response { [weak self] response in
            guard let self = self else { return }
            
            // Log export response details
            print("📥 EXPORT RESPONSE:")
            print("   URL: \(path)")
            print("   Status Code: \(response.response?.statusCode ?? 0)")
            print("   Response Headers: \(response.response?.allHeaderFields ?? [:])")
            
            if let error = response.error {
                // Log error details
                print("   ❌ Error: \(error)")
                print("   Error Code: \((error as NSError).code)")
                print("   Error Description: \(error.localizedDescription)")
                print("   " + String(repeating: "-", count: 50))
                
                let nsErrorCode = (error as NSError).code
                let errorCode = APIErrorCode(fromHTTPStatusCode: nsErrorCode) ?? .unknownError
                self.handleError(code: errorCode, message: errorCode.defaultMessage)
                
                let nsError = NSError.errorWithOwnMessage(
                    message: errorCode.defaultMessage,
                    domain: "RC",
                    code: errorCode.httpStatusCode
                )
                completion(nil, nsError)
                return
            }
            
            if let data = response.data {
                // Log success details
                print("   ✅ Success: Received \(data.count) bytes of data")
                print("   " + String(repeating: "-", count: 50))
                
                // Direct binary data response
                completion(data, nil)
            } else {
                // Log no data error
                print("   ❌ Error: No data received")
                print("   " + String(repeating: "-", count: 50))
                
                let error = NSError.errorWithOwnMessage(message: "No data received".localized(), domain: "RC")
                completion(nil, error)
            }
        }
    }
    
    // MARK: - Helper Methods
    
    /// Handle API error responses with proper error codes
    func handleError(code: APIErrorCode, message: String) {
        // Handle platform access denied and session expired
        if code == .forbidden || code == .unauthorized {
            if code == .forbidden {
                NotificationCenter.default.post(name: .accessDenied, object: nil)
            } else {
                NotificationCenter.default.post(name: .userSessionExpired, object: nil)
            }
        } else {
            print("Handling error with code: \(code.rawValue) (HTTP: \(code.httpStatusCode))")
            self.errorHandler?(code, message)
        }
    }
    
    /// Convert API error code strings to enum
    func getErrorCodeFromString(_ code: String?) -> APIErrorCode {
        guard let code = code else { return .unknownError }
        
        // Use the init?(from:) method to parse the error code string
        return APIErrorCode(from: code) ?? .unknownError
    }
    
    /// Create NSError from API error response using Codable error model
    func createErrorFromResponse(
        success: Bool,
        code: String?,
        message: String?,
        error: String?,
        httpStatusCode: Int? = nil,
        defaultMessage: String = "An error occurred"
    ) -> NSError {
        let errorResponse = APIErrorResponse(
            success: success,
            code: code,
            message: message,
            error: error
        )
        return errorResponse.toNSError(httpStatusCode: httpStatusCode)
    }
    
    /// Create error from decoded APIErrorResponse
    func createErrorFromDecodedResponse(
        _ errorResponse: APIErrorResponse,
        httpStatusCode: Int? = nil
    ) -> NSError {
        return errorResponse.toNSError(httpStatusCode: httpStatusCode)
    }
    
    /// Try to decode error response from data
    func decodeErrorResponse(from data: Data) -> APIErrorResponse? {
        let decoder = JSONDecoder()
        return try? decoder.decode(APIErrorResponse.self, from: data)
    }
}

// MARK: - Notification Names
extension Notification.Name {
    static let userSessionExpired = Notification.Name("userSessionExpired")
    static let accessDenied = Notification.Name("accessDenied")
}
