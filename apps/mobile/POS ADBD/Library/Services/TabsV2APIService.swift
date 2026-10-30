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
    func request<T: Decodable>(_ path: String, method: HTTPMethod = .get, parameters: [String: Any]? = nil,
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
        request(APIEndpoint.Path.calendarOrdersCount, parameters: Self.calendarMonthParameters(year: year, month: month),
                completion: completion)
    }

    /// `timeZone` is the shop zone, so counts and lists are shop days whatever the phone zone (#596)
    /// #828: `outletId` is a merchant's chosen branch (outlet users are scoped by the API)
    static func calendarMonthParameters(year: Int, month: Int,
                                        outletId: Int? = CurrentOutlet.shared.merchantFilterId) -> [String: Any] {
        var params: [String: Any] = ["month": month, "year": year, "timeZone": Date.shopTimeZone.identifier]
        if let outletId { params["outletId"] = outletId }
        return params
    }

    /// Hand-overs (`RESERVED` by pickup plan) or returns (`kind=return`) of one day
    @discardableResult
    func calendarDay(_ dayKey: String, returns: Bool,
                     completion: @escaping ([CalendarDayOrder]?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.calendarOrdersByDate,
                parameters: Self.calendarDayParameters(dayKey, returns: returns)) { (body: CalendarDayOrdersResponse.DataBody?, error) in
            completion(body?.orders, error)
        }
    }

    /// #938: rentals still out past their return day (outlet-operations `overdueReturns`), listed under today's returns
    @discardableResult
    func calendarLateReturns(completion: @escaping ([CalendarDayOrder]?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.outletOperations, parameters: Self.outletOperationsParameters()) { (body: CalendarLateReturns?, error) in
            completion(body?.orders, error)
        }
    }

    static func calendarDayParameters(_ dayKey: String, returns: Bool,
                                      outletId: Int? = CurrentOutlet.shared.merchantFilterId) -> [String: Any] {
        var params: [String: Any] = ["date": dayKey, "timeZone": Date.shopTimeZone.identifier, "limit": 200]
        if let outletId { params["outletId"] = outletId }
        if returns {
            params["kind"] = "return"
        } else {
            params["status"] = "RESERVED"
        }
        return params
    }

    // MARK: - Overview

    @discardableResult
    func overviewReport(_ range: DayKeyRange, limit: Int = OverviewDashLogic.topLimit,
                        completion: @escaping (OverviewReport?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.analyticsPeriod, parameters: Self.overviewReportParameters(range, limit: limit), completion: completion)
    }

    /// #828: `outletIds` narrows a merchant's figures to its chosen branch. The API reads it once #827 is merged;
    /// until then it ignores the parameter and the figures stay shop-wide.
    static func overviewReportParameters(_ range: DayKeyRange, limit: Int = OverviewDashLogic.topLimit,
                                         outletId: Int? = CurrentOutlet.shared.merchantFilterId) -> [String: Any] {
        // #620: `limit` sizes topProducts / topCustomers (API default 3, max 50); the overview shows five, as web;
        // "Xem tất cả" (#633) asks for `topAllLimit`
        var params: [String: Any] = ["startDate": range.start, "endDate": range.end, "groupBy": OverviewLogic.groupBy(range),
                                     "limit": limit, "timeZone": Date.shopTimeZone.identifier]
        if let outletId { params["outletIds"] = String(outletId) }
        return params
    }

    /// #1059 "Đơn tạo hôm nay": one page of GET /api/analytics/income/orders `status=new` (the rows behind the
    /// "Giá trị đơn mới" tile), shop civil days, the merchant's chosen branch (#828)
    @discardableResult
    func overviewNewOrders(_ range: DayKeyRange, offset: Int, limit: Int = 200,
                           completion: @escaping (IncomeOrdersData?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.incomeOrders, parameters: Self.overviewNewOrdersParameters(range, offset: offset, limit: limit),
                completion: completion)
    }

    static func overviewNewOrdersParameters(_ range: DayKeyRange, offset: Int, limit: Int = 200,
                                            outletId: Int? = CurrentOutlet.shared.merchantFilterId) -> [String: Any] {
        var params: [String: Any] = ["startDate": range.start, "endDate": range.end, "status": "new", "plan": "false",
                                     "limit": limit, "offset": offset, "timeZone": Date.shopTimeZone.identifier]
        if let outletId { params["outletIds"] = String(outletId) }
        return params
    }

    @discardableResult
    func overviewNow(completion: @escaping (OverviewNow?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.outletOperations, parameters: Self.outletOperationsParameters(), completion: completion)
    }

    /// Today's work and the overview "now" block for the shop day (also `AnalyticsAPIService.loadOutletOperations`)
    /// #828: a merchant's chosen branch as `outletIds` (the API ignores it for outlet users)
    static func outletOperationsParameters(outletId: Int? = CurrentOutlet.shared.merchantFilterId) -> [String: Any] {
        var params: [String: Any] = ["timeZone": Date.shopTimeZone.identifier]
        if let outletId { params["outletIds"] = String(outletId) }
        return params
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
        /// #1124 "Nhận đặt online"; missing (older API) = off
        let onlineBookingEnabled: Bool?
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

    // MARK: - Order note on the shared image (#1354)

    /// `merchant.shareOrderNote` of GET /api/users/profile (missing = false); nil without a merchant
    @discardableResult
    func shareOrderNote(completion: @escaping (Bool?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.userProfile) { (body: ShareOrderNoteProfile?, error: NSError?) in
            completion(body?.flag, error)
        }
    }

    /// PUT /api/settings/merchant `{ shareOrderNote }` (MERCHANT only; 403 otherwise). Answers the saved value.
    @discardableResult
    func setShareOrderNote(_ on: Bool, completion: @escaping (Bool?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.merchantSettings, method: .put,
                parameters: ["shareOrderNote": on]) { (body: ShareOrderNoteProfile.Shop?, error: NSError?) in
            completion(body.map { $0.shareOrderNote ?? on }, error)
        }
    }

    // MARK: - Shop info (#1313)

    /// The shop as PUT /api/settings/merchant answers it (only what the form edits)
    struct MerchantInfoBody: Decodable {
        let name: String?
        let phone: String?
        let address: String?
        let city: String?
        let state: String?
        let zipCode: String?
        let country: String?
        let taxId: String?
        let description: String?
    }

    private struct ProfileShop: Decodable {
        let merchant: MerchantInfoBody?
    }

    /// `merchant` of GET /api/users/profile: the shop as the server has it (the owner may have edited it on the web)
    @discardableResult
    func shopInfo(completion: @escaping (MerchantInfoBody?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.userProfile) { (body: ProfileShop?, error: NSError?) in
            completion(body?.merchant, error)
        }
    }

    /// PUT /api/settings/merchant with the shop form (MERCHANT; 403 for other roles). Answers the saved shop.
    @discardableResult
    func updateMerchantInfo(_ values: [String: Any], completion: @escaping (MerchantInfoBody?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.merchantSettings, method: .put, parameters: values, completion: completion)
    }

    // MARK: - Shop currency (#1145)

    private struct CurrencyBody: Decodable {
        let currency: String?
    }

    /// `currency` of GET /api/settings/currency, normalised (missing = VND)
    @discardableResult
    func shopCurrency(completion: @escaping (ShopCurrency?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.settingsCurrency) { (body: CurrencyBody?, error: NSError?) in
            completion(body.map { ShopCurrency.normalise($0.currency) }, error)
        }
    }

    /// PUT /api/settings/currency `{ currency }` (403 for staff). Answers the saved value.
    @discardableResult
    func setShopCurrency(_ currency: ShopCurrency, completion: @escaping (ShopCurrency?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.settingsCurrency, method: .put,
                parameters: ["currency": currency.rawValue]) { (body: CurrencyBody?, error: NSError?) in
            completion(body.map { ShopCurrency.normalise($0.currency ?? currency.rawValue) }, error)
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

// MARK: - Online booking requests (#1124)

extension TabsV2APIService {
    /// `merchant.onlineBookingEnabled` of GET /api/users/profile; false when off, missing or without a merchant
    @discardableResult
    func onlineBookingEnabled(completion: @escaping (Bool, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.userProfile) { (body: ProfileFlags?, error: NSError?) in
            completion(body?.merchant?.onlineBookingEnabled == true, error)
        }
    }

    /// GET /api/booking-requests (newest first, `counts` per status); outlet users only see their branch
    @discardableResult
    func bookingRequests(status: BookingStatus?, page: Int = 1, limit: Int = 30,
                         completion: @escaping (BookingRequestList?, NSError?) -> Void) -> DataRequest {
        var parameters: [String: Any] = ["page": page, "limit": limit]
        if let status, status != .unknown { parameters["status"] = status.rawValue }
        if let outletId = CurrentOutlet.shared.merchantFilterId { parameters["outletId"] = outletId }
        return request(APIEndpoint.Path.bookingRequests, parameters: parameters, completion: completion)
    }

    @discardableResult
    func bookingRequest(id: Int, completion: @escaping (BookingRequest?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.bookingRequest(id: id), completion: completion)
    }

    /// "Xác nhận": finds or creates the customer by phone and answers what the cart needs. Creates no order.
    @discardableResult
    func prepareBookingRequest(id: Int, completion: @escaping (BookingPrepare?, NSError?) -> Void) -> DataRequest {
        request(APIEndpoint.Path.bookingRequestPrepare(id: id), method: .post, parameters: [:], completion: completion)
    }

    private struct RejectAnswer: Decodable { let id: Int; let status: String }

    @discardableResult
    func rejectBookingRequest(id: Int, reason: BookingRejectReason, note: String?,
                              completion: @escaping (Bool, NSError?) -> Void) -> DataRequest {
        var parameters: [String: Any] = ["reason": reason.rawValue]
        if let note, !note.isEmpty { parameters["note"] = note }
        return request(APIEndpoint.Path.bookingRequestReject(id: id), method: .post, parameters: parameters) {
            (body: RejectAnswer?, error: NSError?) in
            completion(body != nil, error)
        }
    }
}

