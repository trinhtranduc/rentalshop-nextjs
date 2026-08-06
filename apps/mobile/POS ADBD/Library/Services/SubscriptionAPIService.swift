//
//  SubscriptionAPIService.swift
//  POS ADBD
//
//  GET /api/subscriptions/status for MERCHANT renew UI.
//

import Foundation

final class SubscriptionAPIService: BaseService {
    static let shared = SubscriptionAPIService()

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
