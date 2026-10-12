//
//  AttendanceService.swift
//  POS ADBD
//
//  Chấm công calls (#909, API #907). A refused call answers an `AttendanceFailure` with the API code and the
//  numbers of its `data` (distance, radius, accuracy), so the screen can show the mockup copy.
//

import Foundation
import Alamofire

final class AttendanceService: BaseService {
    static let shared = AttendanceService()

    enum Path {
        static let me = "/api/attendance/me"
        static let punch = "/api/attendance/punch"
        static let shifts = "/api/attendance/shifts"
        static func month(userId: Int) -> String { "/api/attendance/people/\(userId)/month" }
    }

    /// `{ success, code, message, data }`; `data` / `details` of a failure may carry the numbers
    private struct Envelope<T: Decodable>: Decodable {
        let success: Bool
        let code: String?
        let message: String?
        let data: T?
        let numbers: Numbers?

        struct Numbers: Decodable {
            let distanceM: Double?
            let radiusM: Double?
            let accuracyM: Double?
            init(from decoder: Decoder) throws {
                let c = try decoder.container(keyedBy: AttendanceKey.self)
                distanceM = c.double("distanceM", "distance")
                radiusM = c.double("radiusM", "radius")
                accuracyM = c.double("accuracyM", "accuracy")
            }
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: AttendanceKey.self)
            success = c.bool("success") ?? false
            code = c.string("code")
            message = c.string("message", "error")
            data = success ? c.object(T.self, "data") : nil
            numbers = success ? nil : c.object(Numbers.self, "data", "details", "meta")
        }
    }

    @discardableResult
    private func call<T: Decodable>(_ path: String, method: HTTPMethod = .get, parameters: [String: Any]? = nil,
                                    completion: @escaping (Result<T, AttendanceFailure>) -> Void) -> DataRequest {
        let url = APIEndpoint.currentBaseURL + path
        let encoding: ParameterEncoding = method == .get ? URLEncoding.default : JSONEncoding.default
        return AuthSession.shared.request(url, method: method, parameters: parameters, encoding: encoding, headers: BaseService.jsonHeader)
            .responseData { response in
                let result: Result<T, AttendanceFailure>
                switch response.result {
                case .success(let data):
                    if let envelope = try? JSONDecoder.shared.decode(Envelope<T>.self, from: data) {
                        if envelope.success, let body = envelope.data {
                            result = .success(body)
                        } else {
                            let message = envelope.code.flatMap { code -> String? in
                                let text = code.localized()
                                return text == code ? nil : text
                            } ?? envelope.message
                            result = .failure(AttendanceFailure(code: envelope.code, message: message,
                                                                distanceM: envelope.numbers?.distanceM,
                                                                radiusM: envelope.numbers?.radiusM,
                                                                accuracyM: envelope.numbers?.accuracyM))
                        }
                    } else {
                        result = .failure(AttendanceFailure(code: nil, message: "attendance.error.other.message".localized()))
                    }
                case .failure(let error):
                    result = .failure(AttendanceFailure(code: nil, message: error.localizedDescription))
                }
                DispatchQueue.main.async { completion(result) }
            }
    }

    @discardableResult
    func me(completion: @escaping (Result<AttendanceMe, AttendanceFailure>) -> Void) -> DataRequest {
        call(Path.me, completion: completion)
    }

    /// POST /punch `{ code, latitude, longitude, accuracy, isMock }`
    @discardableResult
    func punch(code: String, latitude: Double, longitude: Double, accuracy: Double, isMock: Bool,
               completion: @escaping (Result<AttendancePunchResult, AttendanceFailure>) -> Void) -> DataRequest {
        call(Path.punch, method: .post, parameters: Self.punchParameters(code: code, latitude: latitude, longitude: longitude,
                                                                         accuracy: accuracy, isMock: isMock),
             completion: completion)
    }

    static func punchParameters(code: String, latitude: Double, longitude: Double, accuracy: Double, isMock: Bool) -> [String: Any] {
        ["code": code.trimmingCharacters(in: .whitespacesAndNewlines), "latitude": latitude, "longitude": longitude,
         "accuracy": accuracy, "isMock": isMock]
    }

    /// Own schedule of `from`…`to` (day keys). Staff get only their own days (#907 rule 33).
    @discardableResult
    func shifts(outletId: Int?, from: String, to: String,
                completion: @escaping (Result<AttendanceSchedule, AttendanceFailure>) -> Void) -> DataRequest {
        var params: [String: Any] = ["from": from, "to": to]
        if let outletId { params["outletId"] = outletId }
        return call(Path.shifts, parameters: params, completion: completion)
    }

    /// Own month (`YYYY-MM`): summary and scans
    @discardableResult
    func month(userId: Int, outletId: Int?, month: String,
               completion: @escaping (Result<AttendanceMonth, AttendanceFailure>) -> Void) -> DataRequest {
        var params: [String: Any] = ["month": month]
        if let outletId { params["outletId"] = outletId }
        return call(Path.month(userId: userId), parameters: params, completion: completion)
    }

    // MARK: - merchant.modules refresh

    private struct ProfileModules: Decodable {
        let merchant: MerchantModules?
    }

    private struct MerchantModules: Decodable {
        let modules: [String]?
    }

    private static var lastModulesRefresh: Date?

    /// Reads `merchant.modules` of GET /api/users/profile into the cached user (at most once a minute unless forced),
    /// so a module the admin turns on shows without signing in again. Completion on main with the value in effect.
    static func refreshModules(force: Bool = false, completion: ((Bool) -> Void)? = nil) {
        if !force, let last = lastModulesRefresh, Date().timeIntervalSince(last) < 60 {
            completion?(AttendanceModule.isOn(User.account()?.merchant))
            return
        }
        lastModulesRefresh = Date()
        shared.call(APIEndpoint.Path.userProfile) { (result: Result<ProfileModules, AttendanceFailure>) in
            if case .success(let profile) = result, let user = User.account(), user.merchant != nil {
                let modules = profile.merchant?.modules
                if user.merchant?.modules != modules {
                    user.merchant?.modules = modules
                    User.save(user: user)
                }
            }
            completion?(AttendanceModule.isOn(User.account()?.merchant))
        }
    }
}
