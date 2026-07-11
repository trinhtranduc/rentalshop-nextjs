import Foundation
import Alamofire

struct LoyaltyCustomerSummary: Codable {
    let customerId: Int
    let points: Int
    let totalEarned: Int
    let totalRedeemed: Int
    let totalSpent: Double
    let totalOrders: Int
    let canRedeem: Bool
    let maxRedeemPoints: Int
}

struct LoyaltyValidateRedeemResponse: Codable {
    let valid: Bool
    let reason: String?
    let discount: Double?
    let amountDue: Double?
    let maxPoints: Int?
    let currentBalance: Int?
}

protocol LoyaltyServiceProtocol {
    func fetchCustomerSummary(customerId: Int, completion: @escaping (LoyaltyCustomerSummary?, NSError?) -> Void)
    func validateRedeem(customerId: Int, points: Int, orderTotalAmount: Double, orderType: String, completion: @escaping (LoyaltyValidateRedeemResponse?, NSError?) -> Void)
}

class LoyaltyService: BaseService, LoyaltyServiceProtocol {
    static let shared = LoyaltyService()

    func fetchCustomerSummary(customerId: Int, completion: @escaping (LoyaltyCustomerSummary?, NSError?) -> Void) {
        let path = "/api/loyalty/customers/\(customerId)/summary"
        requestWithAPIResponse(path: path, method: .get, parameters: nil, completion: completion)
    }

    func validateRedeem(customerId: Int, points: Int, orderTotalAmount: Double, orderType: String, completion: @escaping (LoyaltyValidateRedeemResponse?, NSError?) -> Void) {
        let path = "/api/loyalty/validate-redeem"
        let params: [String: Any] = [
            "customerId": customerId,
            "points": points,
            "orderTotalAmount": orderTotalAmount,
            "orderType": orderType.uppercased()
        ]
        requestWithAPIResponse(path: path, method: .post, parameters: params, completion: completion)
    }

    private func requestWithAPIResponse<T: Codable>(path: String, method: HTTPMethod, parameters: [String: Any]?, completion: @escaping (T?, NSError?) -> Void) {
        let fullURL = APIEndpoint.currentBaseURL + path

        AF.request(fullURL, method: method, parameters: parameters, encoding: JSONEncoding.default, headers: BaseService.jsonHeader)
            .responseData { response in
                switch response.result {
                case .success(let data):
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIResponse<T>.self, from: data)
                        if apiResponse.success, let payload = apiResponse.data {
                            DispatchQueue.main.async { completion(payload, nil) }
                        } else {
                            let error = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Loyalty request failed"
                            )
                            DispatchQueue.main.async { completion(nil, error) }
                        }
                    } catch {
                        DispatchQueue.main.async {
                            completion(nil, NSError(domain: "LoyaltyService", code: -1, userInfo: [NSLocalizedDescriptionKey: error.localizedDescription]))
                        }
                    }
                case .failure(let error):
                    DispatchQueue.main.async {
                        completion(nil, error as NSError)
                    }
                }
            }
    }
}
