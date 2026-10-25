//
//  DepositPlanAPIService.swift
//  POS ADBD
//
//  Calls of "Thu cọc theo giai đoạn" (#1199): the shop setting, collecting / voiding a stage, editing the plan of
//  one order. Every call answers through the same envelope as the other v2 screens.
//

import Foundation
import Alamofire

final class DepositPlanAPIService {
    static let shared = DepositPlanAPIService()

    /// A response whose body the screen does not read (it reloads the order instead)
    struct Ignored: Decodable {}

    private var api: TabsV2APIService { TabsV2APIService.shared }

    // MARK: Setting

    /// GET /api/settings/deposit (every role)
    @discardableResult
    func settings(completion: @escaping (DepositSettings?, NSError?) -> Void) -> DataRequest {
        api.request(APIEndpoint.Path.depositSettings, completion: completion)
    }

    /// PUT /api/settings/deposit (shop owner only, 403 for others). Only the keys given are sent. Answers the saved setting.
    @discardableResult
    func saveSettings(mode: DepositMode? = nil, cancellationPolicy: String? = nil, templates: [DepositTemplate]? = nil,
                      completion: @escaping (DepositSettings?, NSError?) -> Void) -> DataRequest {
        api.request(APIEndpoint.Path.depositSettings, method: .put,
                    parameters: Self.settingsBody(mode: mode, cancellationPolicy: cancellationPolicy, templates: templates),
                    completion: completion)
    }

    static func settingsBody(mode: DepositMode?, cancellationPolicy: String?, templates: [DepositTemplate]?) -> [String: Any] {
        var body: [String: Any] = [:]
        if let mode { body["depositMode"] = mode.rawValue }
        if let cancellationPolicy { body["cancellationPolicy"] = cancellationPolicy }
        if let templates {
            body["templates"] = templates.map { template -> [String: Any] in
                var row: [String: Any] = ["id": template.id, "name": template.name, "items": template.items.map(Self.stageBody)]
                if template.isDefault == true { row["isDefault"] = true }
                return row
            }
        }
        return body
    }

    private static func stageBody(_ item: DepositStageTemplate) -> [String: Any] {
        var rule: [String: Any] = ["kind": item.dueRule.kind]
        if let days = item.dueRule.days { rule["days"] = days }
        return ["label": item.label, "type": "PERCENT", "value": item.value, "dueRule": rule]
    }

    // MARK: One order

    /// POST /api/orders/{id}/installments/{key}/collect
    @discardableResult
    func collect(orderId: Int, key: String, request: CollectInstallmentRequest,
                 completion: @escaping (Bool, NSError?) -> Void) -> DataRequest {
        var body: [String: Any] = ["amount": request.amount, "method": request.method, "reference": request.reference]
        if let day = request.collectedOn { body["collectedOn"] = day }
        if let note = request.note, !note.isEmpty { body["note"] = note }
        return api.request(Self.collectPath(orderId: orderId, key: key), method: .post, parameters: body) { (data: Ignored?, error: NSError?) in
            completion(data != nil && error == nil, error)
        }
    }

    /// POST /api/orders/{id}/installments/{key}/void (shop owner)
    @discardableResult
    func void(orderId: Int, key: String, note: String?, completion: @escaping (Bool, NSError?) -> Void) -> DataRequest {
        var body: [String: Any] = [:]
        if let note, !note.isEmpty { body["note"] = note }
        return api.request(Self.voidPath(orderId: orderId, key: key), method: .post, parameters: body) { (data: Ignored?, error: NSError?) in
            completion(data != nil && error == nil, error)
        }
    }

    /// PUT /api/orders/{id}/deposit-plan (shop owner and outlet admin): the explicit stages, never the last one
    @discardableResult
    func editPlan(orderId: Int, items: [[String: Any]], completion: @escaping (Bool, NSError?) -> Void) -> DataRequest {
        api.request(Self.planPath(orderId: orderId), method: .put, parameters: ["items": items]) { (data: Ignored?, error: NSError?) in
            completion(data != nil && error == nil, error)
        }
    }

    static func collectPath(orderId: Int, key: String) -> String { "\(APIEndpoint.Path.orders)/\(orderId)/installments/\(key)/collect" }
    static func voidPath(orderId: Int, key: String) -> String { "\(APIEndpoint.Path.orders)/\(orderId)/installments/\(key)/void" }
    static func planPath(orderId: Int) -> String { "\(APIEndpoint.Path.orders)/\(orderId)/deposit-plan" }
}
