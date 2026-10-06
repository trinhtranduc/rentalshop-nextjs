//
//  TabsV2APIService.swift
//  POS ADBD
//
//  Calls of the redesigned calendar, overview and settings tabs (#374). Each call returns its DataRequest so a
//  screen can cancel a stale one.
//

import Foundation
import Alamofire

/// `{ success, code, message, error, data }`
struct V2Envelope<T: Decodable>: Decodable {
    let success: Bool
    let code: String?
    let message: String?
    let error: String?
    let data: T?
}

final class TabsV2APIService: BaseService {
    static let shared = TabsV2APIService()

    @discardableResult
    private func request<T: Decodable>(_ path: String, method: HTTPMethod = .get, parameters: [String: Any]? = nil,
                                       completion: @escaping (T?, NSError?) -> Void) -> DataRequest {
        let url = APIEndpoint.currentBaseURL + path
        let encoding: ParameterEncoding = method == .get ? URLEncoding.default : JSONEncoding.default
        return AuthSession.shared.request(url, method: method, parameters: parameters, encoding: encoding, headers: BaseService.jsonHeader)
            .responseData { response in
                let statusCode = response.response?.statusCode
                switch response.result {
                case .success(let data):
                    if let envelope = try? JSONDecoder.shared.decode(V2Envelope<T>.self, from: data) {
                        if envelope.success, let body = envelope.data {
                            completion(body, nil)
                        } else {
                            completion(nil, self.createErrorFromResponse(success: envelope.success, code: envelope.code,
                                                                         message: envelope.message, error: envelope.error,
                                                                         httpStatusCode: statusCode))
                        }
                    } else {
                        completion(nil, NSError(domain: "RC", code: statusCode ?? -1))
                    }
                case .failure(let error):
                    completion(nil, error as NSError)
                }
            }
    }

    // MARK: - Calendar

    @discardableResult
    func calendarMonth(year: Int, month: Int, completion: @escaping (CalendarMonthCounts?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.calendarOrdersCount,
                parameters: ["month": month, "year": year, "timeZone": DeviceTimeZone.identifier],
                completion: completion)
    }

    /// Hand-overs (`RESERVED` by pickup plan) or returns (`kind=return`) of one day
    @discardableResult
    func calendarDay(_ dayKey: String, returns: Bool,
                     completion: @escaping ([CalendarDayOrder]?, NSError?) -> Void) -> DataRequest {
        var params: [String: Any] = ["date": dayKey, "timeZone": DeviceTimeZone.identifier, "limit": 200]
        if returns {
            params["kind"] = "return"
        } else {
            params["status"] = "RESERVED"
        }
        return request(APIEndpoint.Path.calendarOrdersByDate, parameters: params) { (body: CalendarDayOrdersResponse.DataBody?, error) in
            completion(body?.orders, error)
        }
    }

    // MARK: - Overview

    @discardableResult
    func overviewReport(_ range: DayKeyRange, completion: @escaping (OverviewReport?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.analyticsPeriod,
                parameters: ["startDate": range.start, "endDate": range.end,
                             "groupBy": OverviewLogic.groupBy(range), "limit": 3,
                             "timeZone": DeviceTimeZone.identifier],
                completion: completion)
    }

    @discardableResult
    func overviewNow(completion: @escaping (OverviewNow?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.outletOperations, parameters: ["timeZone": DeviceTimeZone.identifier],
                completion: completion)
    }

    // MARK: - Settings

    @discardableResult
    func plan(completion: @escaping (SettingsPlan?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.subscriptionsStatus, completion: completion)
    }

    // MARK: - Order overlap setting (#518)

    private struct ProfileFlags: Decodable {
        let merchant: MerchantFlags?
    }

    private struct MerchantFlags: Decodable {
        let allowOverlappingOrders: Bool?
    }

    /// `merchant.allowOverlappingOrders` of GET /api/users/profile (missing = ON); nil without a merchant
    @discardableResult
    func allowOverlappingOrders(completion: @escaping (Bool?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.userProfile) { (body: ProfileFlags?, error: NSError?) in
            completion(body?.merchant.map { $0.allowOverlappingOrders ?? true }, error)
        }
    }

    /// PUT /api/settings/merchant `{ allowOverlappingOrders }` (MERCHANT / ADMIN; 403 otherwise). Answers the saved value.
    @discardableResult
    func setAllowOverlappingOrders(_ allowed: Bool, completion: @escaping (Bool?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.merchantSettings, method: .put,
                parameters: ["allowOverlappingOrders": allowed]) { (body: MerchantFlags?, error: NSError?) in
            completion(body.map { $0.allowOverlappingOrders ?? allowed }, error)
        }
    }

    // MARK: - Change history (#519)

    @discardableResult
    func orderChanges(orderId: Int, limit: Int = ChangeHistoryLogic.pageSize, offset: Int = 0,
                      completion: @escaping (ChangeHistoryPage?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.orderChanges(orderId: orderId), parameters: ["limit": limit, "offset": offset],
                completion: completion)
    }

    @discardableResult
    func productChanges(productId: Int, limit: Int = ChangeHistoryLogic.pageSize, offset: Int = 0,
                        completion: @escaping (ChangeHistoryPage?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.productChanges(productId: productId), parameters: ["limit": limit, "offset": offset],
                completion: completion)
    }

    /// POST /api/auth/change-password. The API answers without `data`, so success is `error == nil`.
    func changePassword(current: String, new: String, completion: @escaping (NSError?) -> Void) {
        let url = APIEndpoint.currentBaseURL + APIEndpoint.Path.changePassword
        AuthSession.shared.request(url, method: .post, parameters: ["currentPassword": current, "newPassword": new],
                   encoding: JSONEncoding.default, headers: BaseService.jsonHeader)
            .responseData { response in
                let statusCode = response.response?.statusCode
                switch response.result {
                case .success(let data):
                    guard let envelope = try? JSONDecoder.shared.decode(V2Envelope<String>.self, from: data) else {
                        completion(NSError(domain: "RC", code: statusCode ?? -1))
                        return
                    }
                    if envelope.success {
                        completion(nil)
                    } else {
                        completion(self.createErrorFromResponse(success: false, code: envelope.code, message: envelope.message,
                                                                error: envelope.error, httpStatusCode: statusCode))
                    }
                case .failure(let error):
                    completion(error as NSError)
                }
            }
    }
}
