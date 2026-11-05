//
//  SubscriptionAPIService.swift
//  POS ADBD
//
//  GET /api/subscriptions/status for MERCHANT renew UI.
//

import Alamofire
import Foundation

final class SubscriptionAPIService: BaseService {
    static let shared = SubscriptionAPIService()

    /// #1459 status with the renewal fields (`canRenew`, `purchasablePlanIds`, `autoRenew`, …). Open to expired shops.
    @discardableResult
    func planStatus(completion: @escaping (PlanStatus?, NSError?) -> Void) -> DataRequest {
        TabsV2APIService.shared.request(APIEndpoint.Path.subscriptionsStatus) { (status: PlanStatus?, error: NSError?) in
            if let status { SubscriptionGate.shared.remember(status) }
            completion(status, error)
        }
    }

    /// #1459 GET /api/plans (owner only; open to expired shops)
    @discardableResult
    func plans(completion: @escaping ([PlanOption]?, NSError?) -> Void) -> DataRequest {
        TabsV2APIService.shared.request(APIEndpoint.Path.plans, parameters: ["limit": 50]) { (payload: PlanListResponse.Payload?, error: NSError?) in
            completion(payload?.plans, error)
        }
    }

    func getStatus(completion: @escaping (SubscriptionStatusInfo?, NSError?) -> Void) {
        performGET(
            path: APIEndpoint.Path.subscriptionsStatus,
            parameters: nil,
            responseType: APIResponse<SubscriptionStatusInfo>.self,
            context: "SubscriptionAPIService.getStatus"
        ) { response, error in
            DispatchQueue.main.async {
                if let error {
                    completion(nil, error)
                    return
                }
                guard let response, response.success, let data = response.data else {
                    let message = response?.message ?? response?.error ?? "Failed to load subscription status"
                    completion(nil, NSError.errorWithOwnMessage(message: message, domain: "RC"))
                    return
                }
                completion(data, nil)
            }
        }
    }
}
