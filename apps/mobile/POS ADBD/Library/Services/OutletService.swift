import Foundation

protocol OutletServiceProtocol {
    func getOutlets(completion: @escaping ([Outlet]?, NSError?) -> Void)
    func updateOutlet(outletId: Int, withValues values: [String: Any], completion: @escaping (Outlet?, NSError?) -> Void)
}

class OutletService: BaseService, OutletServiceProtocol {
    static let shared = OutletService()
    
    private override init() {
        super.init()
    }
    
    // MARK: - Get Outlets
    func getOutlets(completion: @escaping ([Outlet]?, NSError?) -> Void) {
        let path = APIEndpoint.Path.outlets
        
        performGET(
            path: path,
            parameters: nil,
            responseType: APIOutletsResponse.self,
            context: "OutletService.getOutlets"
        ) { apiResponse, error in
            if let error = error {
                DispatchQueue.main.async {
                    completion(nil, error)
                }
                return
            }
            
            guard let apiResponse = apiResponse else {
                let error = NSError.errorWithOwnMessage(
                    message: "No response received",
                    domain: "RC"
                )
                DispatchQueue.main.async {
                    completion(nil, error)
                }
                return
            }
            
            if apiResponse.success, let outletsResponse = apiResponse.data, let outlets = outletsResponse.outlets {
                DispatchQueue.main.async {
                    completion(outlets, nil)
                }
            } else {
                let errorMessage = apiResponse.message ?? apiResponse.error ?? "Failed to load outlets"
                let error = NSError.errorWithOwnMessage(
                    message: errorMessage,
                    domain: "RC"
                )
                DispatchQueue.main.async {
                    completion(nil, error)
                }
            }
        }
    }
    
    // MARK: - Update Outlet
    func updateOutlet(outletId: Int, withValues values: [String: Any], completion: @escaping (Outlet?, NSError?) -> Void) {
        // Use query parameter ?id= instead of path parameter
        // Add id to query string, other fields go in body
        let path = "\(APIEndpoint.Path.outlets)?id=\(outletId)"
        
        performPUT(
            path: path,
            parameters: values,
            responseType: APIOutletResponse.self,
            context: "OutletService.updateOutlet"
        ) { apiResponse, error in
            if let error = error {
                DispatchQueue.main.async {
                    completion(nil, error)
                }
                return
            }
            
            guard let outlet = apiResponse?.data else {
                let error = NSError.errorWithOwnMessage(
                    message: "Failed to parse outlet data".localized(),
                    domain: "RC"
                )
                DispatchQueue.main.async {
                    completion(nil, error)
                }
                return
            }
            
            DispatchQueue.main.async {
                completion(outlet, nil)
            }
        }
    }
}

// MARK: - API Response Models

// Outlets Response using Codable - matches API documentation format
struct OutletsResponse: Codable {
    let outlets: [Outlet]?
    let total: Int?
    let page: Int?
    let limit: Int?
    let hasMore: Bool?
    let totalPages: Int?
    
    enum CodingKeys: String, CodingKey {
        case outlets
        case total
        case page
        case limit
        case hasMore
        case totalPages
    }
}

// API Response wrapper for outlets using Codable
struct APIOutletsResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: OutletsResponse?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// API Response wrapper for single outlet using Codable (for create/update operations)
struct APIOutletResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: Outlet?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

