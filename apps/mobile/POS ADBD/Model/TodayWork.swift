//
//  TodayWork.swift
//  POS ADBD
//
//  "Việc cần làm" of the orders tab (#371), from GET /api/analytics/outlet-operations.
//

import Foundation

struct TodayWorkResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: TodayWork?
    let error: String?
}

struct TodayWork: Codable {
    let date: String?
    let pickupsToday: TodayWorkGroup
    let returnsToday: TodayWorkGroup
    let overdueReturns: TodayWorkGroup
    let noShows: TodayWorkGroup
    /// Missing or null on an older API: the "Ngày mai" group is hidden
    let tomorrowPickups: TodayWorkGroup?
    let tomorrowReturns: TodayWorkGroup?
    /// #938: rentals out with collateral, only when asked (`collateralHeld=1`) and the user sees money; nil otherwise
    var collateralHeld: TodayWorkGroup? = nil
    /// #1231: deposit stages due today / late (only for a client that sends `installments`); empty on an older API or a
    /// shop that collects the deposit at once. Tomorrow's stages (`installmentsDueTomorrow`) are not part of To do.
    var installmentsDue: [InstallmentReminderRow] = []
    var installmentsOverdue: [InstallmentReminderRow] = []
    /// #1378: hand-overs and returns already done today (`doneToday` of the API: orders picked up / returned today);
    /// 0 / 0 on an API that does not send it. Only the home-screen widget ("xong N/M") reads it.
    var doneToday: TodayWorkDone = .zero

    enum CodingKeys: String, CodingKey {
        case date, pickupsToday, returnsToday, overdueReturns, noShows, tomorrowPickups, tomorrowReturns, collateralHeld, doneToday
    }
    /// Read only (the rows are not re-encoded)
    private enum StageKeys: String, CodingKey { case installmentsDue, installmentsOverdue }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        date = try c.decodeIfPresent(String.self, forKey: .date)
        pickupsToday = try c.decodeIfPresent(TodayWorkGroup.self, forKey: .pickupsToday) ?? .empty
        returnsToday = try c.decodeIfPresent(TodayWorkGroup.self, forKey: .returnsToday) ?? .empty
        overdueReturns = try c.decodeIfPresent(TodayWorkGroup.self, forKey: .overdueReturns) ?? .empty
        noShows = try c.decodeIfPresent(TodayWorkGroup.self, forKey: .noShows) ?? .empty
        tomorrowPickups = try c.decodeIfPresent(TodayWorkGroup.self, forKey: .tomorrowPickups)
        tomorrowReturns = try c.decodeIfPresent(TodayWorkGroup.self, forKey: .tomorrowReturns)
        collateralHeld = (try? c.decodeIfPresent(TodayWorkGroup.self, forKey: .collateralHeld)) ?? nil
        doneToday = ((try? c.decodeIfPresent(TodayWorkDone.self, forKey: .doneToday)) ?? nil) ?? .zero
        let stages = try decoder.container(keyedBy: StageKeys.self)
        installmentsDue = ((try? stages.decodeIfPresent(InstallmentReminderGroup.self, forKey: .installmentsDue)) ?? nil)?.orders ?? []
        installmentsOverdue = ((try? stages.decodeIfPresent(InstallmentReminderGroup.self, forKey: .installmentsOverdue)) ?? nil)?.orders ?? []
    }
}

/// `doneToday` of outlet-operations: orders handed over and returned today (packages/database/src/outlet-operations.ts:106)
struct TodayWorkDone: Codable, Equatable {
    let pickups: Int
    let returns: Int

    static let zero = TodayWorkDone(pickups: 0, returns: 0)

    init(pickups: Int, returns: Int) {
        self.pickups = pickups
        self.returns = returns
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        pickups = (try? c.decode(Int.self, forKey: .pickups)) ?? 0
        returns = (try? c.decode(Int.self, forKey: .returns)) ?? 0
    }

    var total: Int { pickups + returns }
}

struct TodayWorkGroup: Codable {
    let count: Int
    let orders: [TodayWorkRow]

    static let empty = TodayWorkGroup(count: 0, orders: [])

    init(count: Int, orders: [TodayWorkRow]) {
        self.count = count
        self.orders = orders
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        count = (try? c.decode(Int.self, forKey: .count)) ?? 0
        orders = (try? c.decode([TodayWorkRow].self, forKey: .orders)) ?? []
    }
}

struct TodayWorkRow: Codable {
    let id: Int
    let orderNumber: String
    let customerName: String?
    let customerPhone: String?
    let pickupPlanAt: Date?
    let returnPlanAt: Date?
    let isReadyToDeliver: Bool
    let productNames: String
    let totalAmount: Double
    let amountDue: Double
    let refundDue: Double
    let lateDays: Int
    /// #938: the order's collateral (Thế chân "đang giữ" list); 0 when missing
    var securityDeposit: Double = 0
    /// #1231: a deposit stage row ("Thu cọc"): the stage label ("Cọc 2"); nil on every other row
    var stageLabel: String? = nil
    /// #1378: the first item's name (no quantity) and how many items the order has, for the home-screen widget
    var firstItemName: String = ""
    var itemCount: Int = 0

    enum CodingKeys: String, CodingKey {
        case id, orderNumber, customerName, customerPhone, pickupPlanAt, returnPlanAt
        case isReadyToDeliver, productNames, totalAmount, amountDue, refundDue, lateDays, items, securityDeposit
    }

    /// #1231: the row of a deposit stage that is due today or late; `id` is the order, so a tap opens its detail
    init(stage: InstallmentReminderRow) {
        self.init(id: stage.orderId, orderNumber: stage.orderNumber, customerName: stage.customerName,
                  totalAmount: stage.remaining, amountDue: stage.remaining, lateDays: stage.lateDays)
        stageLabel = stage.label
    }

    private struct Item: Codable {
        let name: String?
        let quantity: Int?
    }

    init(id: Int, orderNumber: String, customerName: String? = nil, customerPhone: String? = nil,
         pickupPlanAt: Date? = nil, returnPlanAt: Date? = nil, isReadyToDeliver: Bool = false,
         productNames: String = "", totalAmount: Double = 0, amountDue: Double = 0, refundDue: Double = 0,
         lateDays: Int = 0) {
        self.id = id
        self.orderNumber = orderNumber
        self.customerName = customerName
        self.customerPhone = customerPhone
        self.pickupPlanAt = pickupPlanAt
        self.returnPlanAt = returnPlanAt
        self.isReadyToDeliver = isReadyToDeliver
        self.productNames = productNames
        self.totalAmount = totalAmount
        self.amountDue = amountDue
        self.refundDue = refundDue
        self.lateDays = lateDays
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        orderNumber = try c.decode(String.self, forKey: .orderNumber)
        customerName = try c.decodeIfPresent(String.self, forKey: .customerName)
        customerPhone = try c.decodeIfPresent(String.self, forKey: .customerPhone)
        pickupPlanAt = (try? c.decodeIfPresent(Date.self, forKey: .pickupPlanAt)) ?? nil
        returnPlanAt = (try? c.decodeIfPresent(Date.self, forKey: .returnPlanAt)) ?? nil
        isReadyToDeliver = (try? c.decode(Bool.self, forKey: .isReadyToDeliver)) ?? false
        totalAmount = (try? c.decode(Double.self, forKey: .totalAmount)) ?? 0
        amountDue = (try? c.decode(Double.self, forKey: .amountDue)) ?? 0
        refundDue = (try? c.decode(Double.self, forKey: .refundDue)) ?? 0
        lateDays = (try? c.decode(Int.self, forKey: .lateDays)) ?? 0
        securityDeposit = (try? c.decode(Double.self, forKey: .securityDeposit)) ?? 0
        // Item names with quantity ("Áo dài ×2", board Main) when the API sends them; otherwise the joined names
        let items = (try? c.decode([Item].self, forKey: .items)) ?? []
        let fromItems = items.compactMap { item -> String? in
            guard let name = item.name, !name.isEmpty else { return nil }
            return (item.quantity ?? 1) > 1 ? "\(name) ×\(item.quantity ?? 1)" : name
        }
        productNames = fromItems.isEmpty
            ? ((try? c.decode(String.self, forKey: .productNames)) ?? "")
            : fromItems.joined(separator: ", ")
        // The widget's "Áo dài gấm đỏ +1": from the items when the API sent them, else from the joined names
        let names = items.compactMap { $0.name }.filter { !$0.isEmpty }
        if !names.isEmpty {
            firstItemName = names[0]
            itemCount = names.count
        } else {
            let parts = productNames.components(separatedBy: ", ").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
            firstItemName = parts.first ?? ""
            itemCount = parts.count
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(orderNumber, forKey: .orderNumber)
        try c.encodeIfPresent(customerName, forKey: .customerName)
        try c.encodeIfPresent(customerPhone, forKey: .customerPhone)
        try c.encodeIfPresent(pickupPlanAt, forKey: .pickupPlanAt)
        try c.encodeIfPresent(returnPlanAt, forKey: .returnPlanAt)
        try c.encode(isReadyToDeliver, forKey: .isReadyToDeliver)
        try c.encode(productNames, forKey: .productNames)
        try c.encode(totalAmount, forKey: .totalAmount)
        try c.encode(amountDue, forKey: .amountDue)
        try c.encode(refundDue, forKey: .refundDue)
        try c.encode(lateDays, forKey: .lateDays)
        try c.encode(securityDeposit, forKey: .securityDeposit)
    }
}
