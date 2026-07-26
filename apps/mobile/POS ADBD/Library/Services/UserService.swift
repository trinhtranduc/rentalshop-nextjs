import Alamofire
import SwiftyJSON
import Foundation

protocol UserServiceProtocol {
    func getUsers(search: String?, page: Int?, limit: Int?, role: String?, isActive: Bool?, merchantId: Int?, outletId: Int?, completion: @escaping (_ usersResponse: UsersResponse?, _ error: NSError?) -> Void)
    func createUser(withValues: [String: Any], completion: @escaping (_ user: User?, _ error: NSError?) -> Void)
    func updateUser(userId: Int, withValues: [String: Any], completion: @escaping (_ user: User?, _ error: NSError?) -> Void)
    func deleteUser(userId: Int, completion: @escaping (_ error: NSError?) -> Void)
    func disableUser(userId: Int, isActive: Bool, completion: @escaping (_ error: NSError?) -> Void)
    func changeUserPassword(userId: Int, newPassword: String, confirmPassword: String?, completion: @escaping (_ error: NSError?) -> Void)
}

class UserService: BaseService, UserServiceProtocol {
    static let shared = UserService()
    
    func getUsers(search: String?, page: Int?, limit: Int?, role: String?, isActive: Bool?, merchantId: Int?, outletId: Int?, completion: @escaping (UsersResponse?, NSError?) -> Void) {
        let path = APIEndpoint.Path.users
        var params: [String: Any] = [:]
        if let search = search, !search.isEmpty {
            params["search"] = search  // Changed from "q" to "search" per API docs
        }
        if let page = page {
            params["page"] = page
        }
        if let limit = limit {
            params["limit"] = limit
        }
        if let role = role, !role.isEmpty {
            params["role"] = role
        }
        if let isActive = isActive {
            params["isActive"] = isActive
        }
        if let merchantId = merchantId {
            params["merchantId"] = merchantId
        }
        if let outletId = outletId {
            params["outletId"] = outletId
        }
        
        let fullURL = APIEndpoint.currentBaseURL + path
        var requestParams = params.isEmpty ? nil : params
        
        print("📡 Loading Users - URL: \(fullURL)")
        if let requestParams = requestParams {
            print("📡 Parameters: \(requestParams)")
        }
        
        performGET(
            path: path,
            parameters: requestParams,
            responseType: APIUsersResponse.self,
            context: "UserService.getUsers"
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
            
            if apiResponse.success {
                let users = apiResponse.data ?? []
                let pagination = apiResponse.pagination
                
                print("👥 Found \(users.count) users")
                print("   Total: \(pagination?.total ?? 0)")
                print("   Page: \(pagination?.page ?? 0)")
                print("   Has More: \(pagination?.hasMore ?? false)")
                
                // Convert to UsersResponse format for compatibility
                let usersResponse = UsersResponse(
                    users: users,
                    total: pagination?.total,
                    page: pagination?.page,
                    limit: pagination?.limit,
                    hasMore: pagination?.hasMore
                )
                
                DispatchQueue.main.async {
                    completion(usersResponse, nil)
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
    
    func createUser(withValues values: [String: Any], completion: @escaping (User?, NSError?) -> Void) {
        let path = APIEndpoint.Path.users
        
        performPOST(
            path: path,
            parameters: values,
            responseType: APIUserResponse.self,
            context: "UserService.createUser"
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
            
            if apiResponse.success, let user = apiResponse.data {
                print("✅ User created successfully: \(user.fullName ?? "Unknown")")
                DispatchQueue.main.async {
                    completion(user, nil)
                }
            } else {
                let nsError = self.createErrorFromResponse(
                    success: apiResponse.success,
                    code: apiResponse.code,
                    message: apiResponse.message,
                    error: apiResponse.error,
                    httpStatusCode: nil,
                    defaultMessage: "Create user failed"
                )
                print("❌ User creation failed: \(nsError.localizedDescription)")
                DispatchQueue.main.async {
                    completion(nil, nsError)
                }
            }
        }
    }
    
    func updateUser(userId: Int, withValues values: [String: Any], completion: @escaping (User?, NSError?) -> Void) {
        let path = "\(APIEndpoint.Path.users)/\(userId)"
        
        performPUT(
            path: path,
            parameters: values,
            responseType: APIUserResponse.self,
            context: "UserService.updateUser"
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
            
            if apiResponse.success, let user = apiResponse.data {
                print("✅ User updated successfully: \(user.fullName ?? "Unknown")")
                DispatchQueue.main.async {
                    completion(user, nil)
                }
            } else {
                let nsError = self.createErrorFromResponse(
                    success: apiResponse.success,
                    code: apiResponse.code,
                    message: apiResponse.message,
                    error: apiResponse.error,
                    httpStatusCode: nil,
                    defaultMessage: "Update user failed"
                )
                print("❌ User update failed: \(nsError.localizedDescription)")
                DispatchQueue.main.async {
                    completion(nil, nsError)
                }
            }
        }
    }
    
    func deleteUser(userId: Int, completion: @escaping (NSError?) -> Void) {
        let path = "\(APIEndpoint.Path.users)/\(userId)"
        performDELETE(
            path: path,
            responseType: APIEmptyResponse.self,
            context: "UserService.deleteUser"
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
                let nsError = self.createErrorFromResponse(
                    success: apiResponse.success,
                    code: apiResponse.code,
                    message: apiResponse.message,
                    error: apiResponse.error,
                    httpStatusCode: nil,
                    defaultMessage: "Delete user failed"
                )
                completion(nsError)
            }
        }
    }
    
    func disableUser(userId: Int, isActive: Bool, completion: @escaping (NSError?) -> Void) {
        let path = "\(APIEndpoint.Path.users)/\(userId)"
        let params: [String: Any] = ["isActive": isActive]
        
        performPUT(
            path: path,
            parameters: params,
            responseType: APIUserResponse.self,
            context: "UserService.disableUser"
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
                let nsError = self.createErrorFromResponse(
                    success: apiResponse.success,
                    code: apiResponse.code,
                    message: apiResponse.message,
                    error: apiResponse.error,
                    httpStatusCode: nil,
                    defaultMessage: "Disable user failed"
                )
                completion(nsError)
            }
        }
    }
    
    func changeUserPassword(userId: Int, newPassword: String, confirmPassword: String? = nil, completion: @escaping (NSError?) -> Void) {
        let path = "\(APIEndpoint.Path.users)/\(userId)/change-password"
        var params: [String: Any] = ["newPassword": newPassword]
        if let confirmPassword = confirmPassword {
            params["confirmPassword"] = confirmPassword
        }
        
        // Changed from POST to PATCH per API documentation
        performPATCH(
            path: path,
            parameters: params,
            responseType: APIEmptyResponse.self,
            context: "UserService.changeUserPassword"
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
                let nsError = self.createErrorFromResponse(
                    success: apiResponse.success,
                    code: apiResponse.code,
                    message: apiResponse.message,
                    error: apiResponse.error,
                    httpStatusCode: nil,
                    defaultMessage: "Change password failed"
                )
                completion(nsError)
            }
        }
    }
}

