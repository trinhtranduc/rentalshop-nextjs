import Alamofire
import SwiftyJSON

protocol AuthenticationServiceProtocol {
    func login(emailUser: String, passwordUser: String, completion: @escaping (_ user: User?, _ error: NSError?) -> Void)
    func logout(completion: @escaping (_ success: Bool, _ error: NSError?) -> Void)
    func createAccount(loginName: String, password: String, storeName: String, address: String, name: String, phone: String, completion: @escaping (_ user: User?, _ error: NSError?) -> Void)
    func accountDeletion(completion: @escaping (_ success: Bool, _ error: NSError?) -> Void)
    func validateAccount(completion: @escaping (_ error: NSError?) -> Void)
    func resendVerification(email: String, completion: @escaping (_ success: Bool, _ error: NSError?) -> Void)
}

class AuthenticationService: BaseService, AuthenticationServiceProtocol {
    static let shared = AuthenticationService()
    
    func login(emailUser: String, passwordUser: String, completion: @escaping (User?, NSError?) -> Void) {
        let path = APIEndpoint.Path.login
        let fullURL = APIEndpoint.currentBaseURL + path
        
        // Updated request format according to API documentation
        let params: [String: Any] = [
            "email": emailUser,
            "password": passwordUser
        ]
        
        print("📡 Login Request - URL: \(fullURL)")
        print("📡 Login Params: \(params)")
        
        AF.request(fullURL, method: .post, parameters: params, encoding: JSONEncoding.default, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Login Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Login Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        let loginResponse = try JSONDecoder.shared.decode(LoginResponse.self, from: data)
                        
                        print("✅ Login response parsed successfully with Codable")
                        print("   Success: \(loginResponse.success)")
                        print("   Message: \(loginResponse.message ?? "No message")")
                        
                        guard loginResponse.success, let loginData = loginResponse.data else {
                            // Use error code model for localized messages
                            let nsError = self.createErrorFromResponse(
                                success: loginResponse.success,
                                code: loginResponse.code,
                                message: loginResponse.message,
                                error: loginResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Login failed"
                            )
                            print("❌ Login failed: \(nsError.localizedDescription)")
                            completion(nil, nsError)
                            return
                        }
                        
                        // Use Codable conversion via convenience init
                        let user = User(from: loginData)
                        
                        print("✅ User mapped successfully via Codable")
                        print("   ID: \(user.id)")
                        print("   Name: \(user.fullName ?? "Unknown")")
                        print("   Role: \(user.role.rawValue)")
                        print("   Merchant ID: \(user.merchantId ?? 0)")
                        print("   Outlet ID: \(user.outletId ?? 0)")
                        print("   Permissions: \(user.permissions.count) permissions")
                        if !user.permissions.isEmpty {
                            print("   Permission list: \(user.permissions.joined(separator: ", "))")
                        }
                        if let outlet = user.outlet {
                            print("   Outlet Object: ID=\(outlet.id), Name=\(outlet.name)")
                        } else {
                            print("   Outlet Object: nil")
                        }
                        
                        // Save user to UserDefaults
                        User.save(user: user)
                        completion(user, nil)
                        
                    } catch {
                        print("❌ Login response decode error: \(error)")
                        completion(nil, error as NSError)
                    }
                    
                case .failure(let error):
                    print("❌ Login request failed: \(error)")
                    completion(nil, error as NSError)
                }
            }
    }
    
    func logout(completion: @escaping (Bool, NSError?) -> Void) {
        let path = APIEndpoint.Path.logout
        let fullURL = APIEndpoint.currentBaseURL + path
        
        AF.request(fullURL, method: .post, parameters: nil, encoding: JSONEncoding.default, headers: BaseService.jsonHeader)
            .responseData { response in
                switch response.result {
                case .success(let data):
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIEmptyResponse.self, from: data)
                        // Reset user from UserDefaults on successful logout
                        if apiResponse.success {
                            User.reset()
                        }
                        completion(apiResponse.success, nil)
                    } catch {
                        completion(false, error as NSError)
                    }
                case .failure(let error):
                    completion(false, error as NSError)
                }
            }
    }
    
    func createAccount(loginName: String, password: String, storeName: String, address: String, name: String, phone: String, completion: @escaping (User?, NSError?) -> Void) {
        let path = APIEndpoint.Path.register
        let fullURL = APIEndpoint.currentBaseURL + path
        
        // Split name into firstName and lastName
        // If only one word, use it for firstName and set lastName to empty string
        // If multiple words, first word is firstName, rest is lastName
        let nameComponents = name.trimmingCharacters(in: .whitespaces).components(separatedBy: " ").filter { !$0.isEmpty }
        let firstName = nameComponents.first ?? name
        let lastName = nameComponents.count > 1 ? nameComponents.dropFirst().joined(separator: " ") : ""
        
        // Updated request format according to API documentation
        let params: [String: Any] = [
            "firstName": firstName,
            "lastName": lastName, // Can be empty string if user only entered one name
            "email": loginName,
            "password": password,
            "phone": phone,
            "role": "MERCHANT",
            "businessName": storeName,
            "outletName": storeName,
            "businessType": "GENERAL",
            "pricingType": "FIXED"
        ]
        
        print("📡 Register Request - URL: \(fullURL)")
        print("📡 Register Params: \(params)")
        
        AF.request(fullURL, method: .post, parameters: params, encoding: JSONEncoding.default, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Register Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Register Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        let registerResponse = try JSONDecoder.shared.decode(RegisterResponse.self, from: data)
                        
                        print("✅ Register response parsed successfully")
                        print("   Success: \(registerResponse.success)")
                        print("   Code: \(registerResponse.code ?? "No code")")
                        print("   Message: \(registerResponse.message ?? "No message")")
                        
                        guard registerResponse.success, let registerData = registerResponse.data else {
                            // Use error code model for localized messages
                            let nsError = self.createErrorFromResponse(
                                success: registerResponse.success,
                                code: registerResponse.code,
                                message: registerResponse.message,
                                error: registerResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Registration failed"
                            )
                            print("❌ Registration failed: \(nsError.localizedDescription)")
                            completion(nil, nsError)
                            return
                        }
                        
                        // Convert RegisterData to User
                        // Register response doesn't have token, so we create User from user data
                        let user = User()
                        user.id = registerData.user.id
                        user.email = registerData.user.email
                        user.firstName = registerData.user.firstName
                        user.lastName = registerData.user.lastName
                        user.name = registerData.user.name
                        user.phone = registerData.user.phone
                        user.token = nil // No token in register response
                        user.merchantId = registerData.user.merchantId
                        user.outletId = registerData.user.outletId
                        user.emailVerified = registerData.user.emailVerified
                        user.emailVerifiedAt = registerData.user.emailVerifiedAt
                        
                        // Map role string to enum
                        let roleString = registerData.user.role
                        switch roleString.rawValue.uppercased() {
                            case "ADMIN", "SUPER_ADMIN":
                                user.role = .admin
                            case "MERCHANT":
                                user.role = .merchant
                            case "OUTLET_ADMIN":
                                user.role = .outletAdmin
                            case "OUTLET_STAFF", "EMPLOYEE", "SALE":
                                user.role = .outletStaff
                            default:
                                user.role = .outletStaff
                            }
                        
                        
                        // Store merchant and outlet if available (prefer from RegisterData, fallback to user)
                        user.merchant = registerData.merchant ?? registerData.user.merchant
                        user.outlet = registerData.outlet ?? registerData.user.outlet
                        user.subscription = registerData.user.subscription
                        
                        print("✅ User created successfully")
                        print("   User ID: \(user.id)")
                        print("   Email: \(user.email ?? "N/A")")
                        print("   Requires Email Verification: \(registerData.requiresEmailVerification ?? false)")
                        completion(user, nil)
                        
                    } catch {
                        print("❌ Register response decode error: \(error)")
                        completion(nil, error as NSError)
                    }
                    
                case .failure(let error):
                    print("❌ Register request failed: \(error)")
                    completion(nil, error as NSError)
                }
            }
    }
    
    func accountDeletion(completion: @escaping (Bool, NSError?) -> Void) {
        let path = APIEndpoint.currentBaseURL + APIEndpoint.Path.accountDeletion
        let fullURL = path.hasPrefix("http") ? path : APIEndpoint.currentBaseURL + path
        
        AF.request(fullURL, method: .post, parameters: nil, encoding: JSONEncoding.default, headers: BaseService.jsonHeader)
            .responseData { response in
                switch response.result {
                case .success(let data):
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIEmptyResponse.self, from: data)
                        completion(apiResponse.success, nil)
                    } catch {
                        completion(false, error as NSError)
                    }
                case .failure(let error):
                    completion(false, error as NSError)
                }
            }
    }
    
    func validateAccount(completion: @escaping (NSError?) -> Void) {
        let path = APIEndpoint.currentBaseURL + APIEndpoint.Path.validateAccount
        let fullURL = path.hasPrefix("http") ? path : APIEndpoint.currentBaseURL + path
        
        print("📡 Validate Account Request - URL: \(fullURL)")
        
        AF.request(fullURL, method: .post, parameters: nil, encoding: JSONEncoding.default, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Validate Account Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Validate Account Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIEmptyResponse.self, from: data)
                        if apiResponse.success {
                            print("✅ Account validation successful")
                            completion(nil)
                        } else {
                            // Use error code model for localized messages
                            let nsError = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Validation failed"
                            )
                            print("❌ Account validation failed: \(nsError.localizedDescription)")
                            completion(nsError)
                        }
                    } catch {
                        print("❌ Validate Account response decode error: \(error)")
                        completion(error as NSError)
                    }
                case .failure(let error):
                    print("❌ Validate Account request failed: \(error)")
                    completion(error as NSError)
                }
            }
    }
    
    func resendVerification(email: String, completion: @escaping (Bool, NSError?) -> Void) {
        let path = APIEndpoint.Path.resendVerification
        let fullURL = APIEndpoint.currentBaseURL + path
        
        // Validate email format
        guard email.isValidEmail() else {
            let error = NSError.errorWithOwnMessage(
                message: "Please enter a valid email address".localized(),
                domain: "RC",
                code: 400
            )
            completion(false, error)
            return
        }
        
        let params: [String: Any] = [
            "email": email
        ]
        
        print("📡 Resend Verification Request - URL: \(fullURL)")
        print("📡 Resend Verification Params: \(params)")
        
        AF.request(fullURL, method: .post, parameters: params, encoding: JSONEncoding.default, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Resend Verification Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Resend Verification Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIResendVerificationResponse.self, from: data)
                        
                        print("✅ Resend verification response parsed successfully")
                        print("   Success: \(apiResponse.success)")
                        print("   Code: \(apiResponse.code ?? "No code")")
                        print("   Message: \(apiResponse.message ?? "No message")")
                        print("   Data message: \(apiResponse.data?.message ?? "No data message")")
                        
                        if apiResponse.success {
                            // Success - email sent
                            completion(true, nil)
                        } else {
                            // Use error code model for localized messages
                            let errorMessage = apiResponse.data?.message ?? apiResponse.message ?? apiResponse.error ?? "Failed to resend verification email"
                            let nsError = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: errorMessage,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Failed to resend verification email"
                            )
                            print("❌ Resend verification failed: \(nsError.localizedDescription)")
                            completion(false, nsError)
                        }
                        
                    } catch {
                        print("❌ Resend verification response decode error: \(error)")
                        let decodeError = NSError.errorWithOwnMessage(
                            message: "Failed to parse server response".localized(),
                            domain: "RC",
                            code: 500
                        )
                        completion(false, decodeError)
                    }
                    
                case .failure(let error):
                    print("❌ Resend verification request failed: \(error)")
                    // Handle network errors
                    let networkError = NSError.errorWithOwnMessage(
                        message: "Network error. Please check your connection and try again.".localized(),
                        domain: "RC",
                        code: (error as NSError).code
                    )
                    completion(false, networkError)
                }
            }
    }
    
    func forgotPassword(email: String, completion: @escaping (Bool, NSError?) -> Void) {
        let path = APIEndpoint.Path.forgotPassword
        let fullURL = APIEndpoint.currentBaseURL + path
        
        // Validate email format
        guard email.isValidEmail() else {
            let error = NSError.errorWithOwnMessage(
                message: "Please enter a valid email address".localized(),
                domain: "RC",
                code: 400
            )
            completion(false, error)
            return
        }
        
        let params: [String: Any] = [
            "email": email
        ]
        
        print("📡 Forgot Password Request - URL: \(fullURL)")
        print("📡 Forgot Password Params: \(params)")
        
        AF.request(fullURL, method: .post, parameters: params, encoding: JSONEncoding.default, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Forgot Password Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Forgot Password Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIForgotPasswordResponse.self, from: data)
                        
                        print("✅ Forgot password response parsed successfully")
                        print("   Success: \(apiResponse.success)")
                        print("   Code: \(apiResponse.code ?? "No code")")
                        print("   Message: \(apiResponse.message ?? "No message")")
                        
                        if apiResponse.success {
                            // Success - email sent (always returns success for security)
                            completion(true, nil)
                        } else {
                            // Use error code model for localized messages
                            let errorMessage = apiResponse.data?.message ?? apiResponse.message ?? apiResponse.error ?? "Failed to send password reset email"
                            let nsError = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: errorMessage,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Failed to send password reset email"
                            )
                            print("❌ Forgot password failed: \(nsError.localizedDescription)")
                            completion(false, nsError)
                        }
                        
                    } catch {
                        print("❌ Forgot password response decode error: \(error)")
                        let decodeError = NSError.errorWithOwnMessage(
                            message: "Failed to parse server response".localized(),
                            domain: "RC",
                            code: 500
                        )
                        completion(false, decodeError)
                    }
                    
                case .failure(let error):
                    print("❌ Forgot password request failed: \(error)")
                    // Handle network errors
                    let networkError = NSError.errorWithOwnMessage(
                        message: "Network error. Please check your connection and try again.".localized(),
                        domain: "RC",
                        code: (error as NSError).code
                    )
                    completion(false, networkError)
                }
            }
    }
} 
