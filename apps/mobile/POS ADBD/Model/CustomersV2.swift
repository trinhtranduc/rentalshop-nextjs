//
//  CustomersV2.swift
//  POS ADBD
//
//  Redesigned customer screens (#387, flag `newCustomers`, boards KH-chon, KH-moi, KH-ds, KH-chi-tiet).
//  Pure helpers and the response shapes they read; the existing `Customer` model is reused for rows.
//

import Foundation

/// `GET /api/customers` page
struct CustomersV2Page: Codable {
    let customers: [Customer]
    let total: Int
    let hasMore: Bool

    enum CodingKeys: String, CodingKey { case customers, total, hasMore }

    init(customers: [Customer], total: Int, hasMore: Bool) {
        self.customers = customers
        self.total = total
        self.hasMore = hasMore
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        customers = ((try? c.decodeIfPresent([Customer].self, forKey: .customers)) ?? nil) ?? []
        hasMore = ((try? c.decodeIfPresent(Bool.self, forKey: .hasMore)) ?? nil) ?? false
        total = ((try? c.decodeIfPresent(Int.self, forKey: .total)) ?? nil) ?? customers.count
    }
}

struct CustomersV2PageResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: CustomersV2Page?
}

/// One row of `GET /api/customers/{id}/orders` (list rows carry no item names, only a count)
struct CustomerOrderRow: Decodable, Equatable {
    let id: Int
    let orderNumber: String
    let orderType: OrderType
    let status: OrderStatus
    let totalAmount: Double
    let pickupPlanAt: Date?
    let returnPlanAt: Date?
    let createdAt: Date?
    let itemCount: Int

    private enum CodingKeys: String, CodingKey {
        case id, orderNumber, orderType, status, totalAmount, pickupPlanAt, returnPlanAt, createdAt
        case count = "_count"
    }

    private struct Count: Decodable { let orderItems: Int? }

    init(id: Int, orderNumber: String, orderType: OrderType, status: OrderStatus, totalAmount: Double,
         pickupPlanAt: Date?, returnPlanAt: Date?, createdAt: Date?, itemCount: Int) {
        self.id = id
        self.orderNumber = orderNumber
        self.orderType = orderType
        self.status = status
        self.totalAmount = totalAmount
        self.pickupPlanAt = pickupPlanAt
        self.returnPlanAt = returnPlanAt
        self.createdAt = createdAt
        self.itemCount = itemCount
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        orderNumber = ((try? c.decodeIfPresent(String.self, forKey: .orderNumber)) ?? nil) ?? "\(id)"
        let type = ((try? c.decodeIfPresent(String.self, forKey: .orderType)) ?? nil) ?? ""
        orderType = OrderType(rawValue: type.lowercased()) ?? .rent
        let status = ((try? c.decodeIfPresent(String.self, forKey: .status)) ?? nil) ?? ""
        self.status = OrderStatus(rawValue: status.lowercased()) ?? .unknown
        totalAmount = ((try? c.decodeIfPresent(Double.self, forKey: .totalAmount)) ?? nil) ?? 0
        pickupPlanAt = CustomersV2Logic.date(((try? c.decodeIfPresent(String.self, forKey: .pickupPlanAt)) ?? nil))
        returnPlanAt = CustomersV2Logic.date(((try? c.decodeIfPresent(String.self, forKey: .returnPlanAt)) ?? nil))
        createdAt = CustomersV2Logic.date(((try? c.decodeIfPresent(String.self, forKey: .createdAt)) ?? nil))
        itemCount = (((try? c.decodeIfPresent(Count.self, forKey: .count)) ?? nil)?.orderItems) ?? 0
    }
}

/// `GET /api/customers/{id}/orders` data: one page of orders, the header summary and a customer snapshot
struct CustomerOrdersV2: Decodable {
    let orders: [CustomerOrderRow]
    let totalOrders: Int
    let totalAmount: Double
    let customer: Customer?

    private enum CodingKeys: String, CodingKey { case orders, total, summary, customer }
    private struct Summary: Decodable { let totalOrders: Int?; let totalAmount: Double? }

    init(orders: [CustomerOrderRow], totalOrders: Int, totalAmount: Double, customer: Customer?) {
        self.orders = orders
        self.totalOrders = totalOrders
        self.totalAmount = totalAmount
        self.customer = customer
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        orders = ((try? c.decodeIfPresent([CustomerOrderRow].self, forKey: .orders)) ?? nil) ?? []
        let summary = (try? c.decodeIfPresent(Summary.self, forKey: .summary)) ?? nil
        let total = (try? c.decodeIfPresent(Int.self, forKey: .total)) ?? nil
        totalOrders = summary?.totalOrders ?? total ?? orders.count
        totalAmount = summary?.totalAmount ?? 0
        customer = (try? c.decodeIfPresent(Customer.self, forKey: .customer)) ?? nil
    }
}

struct CustomerOrdersV2Response: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: CustomerOrdersV2?

    enum CodingKeys: String, CodingKey { case success, code, message, data }

    /// Read-only response (`performGET` asks for Codable); never sent back
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(success, forKey: .success)
    }
}

/// Total of a filtered `GET /api/orders` (used for the "Đang thuê" count)
struct OrdersTotalResponse: Codable {
    struct Data: Codable { let total: Int? }
    let success: Bool
    let data: Data?
}

enum CustomersV2Logic {
    static let pageSize = 20

    // MARK: - Names

    static func displayName(_ customer: Customer) -> String {
        let parts = [customer.firstName, customer.lastName]
            .compactMap { $0?.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        if !parts.isEmpty { return parts.joined(separator: " ") }
        let full = (customer.full_name ?? "").trimmingCharacters(in: .whitespaces)
        if !full.isEmpty { return full }
        return customer.phone?.nilIfEmpty ?? "—"
    }

    /// Last two words, as on the boards: "Nguyễn Thị Lan" → "TL", "Minh" → "M", empty → "?"
    static func initials(_ name: String) -> String {
        let words = name.split(separator: " ").filter { !$0.isEmpty && $0 != "—" }
        let letters = words.suffix(2).compactMap { $0.first.map { String($0).uppercased() } }
        return letters.isEmpty ? "?" : letters.joined()
    }

    /// Same split as the current customer form: first word → firstName, the rest → lastName
    static func splitName(_ name: String) -> (firstName: String, lastName: String) {
        let words = name.trimmingCharacters(in: .whitespacesAndNewlines).components(separatedBy: " ").filter { !$0.isEmpty }
        let first = words.first ?? ""
        let last = words.count > 1 ? words.dropFirst().joined(separator: " ") : ""
        return (first, last)
    }

    /// `POST /api/customers` body: the fields the current form sends, plus `notes` when given
    static func createPayload(name: String, phone: String, note: String?) -> [String: Any] {
        let split = splitName(name)
        var params: [String: Any] = ["firstName": split.firstName]
        if !split.lastName.isEmpty { params["lastName"] = split.lastName }
        let trimmedPhone = phone.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedPhone.isEmpty { params["phone"] = trimmedPhone }
        if let note = note?.nilIfEmpty { params["notes"] = note }
        return params
    }

    enum FormProblem: Equatable { case missingPhone, missingName }

    static func validate(name: String, phone: String) -> FormProblem? {
        if phoneDigits(phone).isEmpty { return .missingPhone }
        if name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return .missingName }
        return nil
    }

    // MARK: - Phone

    /// Digits only: "0901 234 567" and "0901-234-567" are the same phone
    static func phoneDigits(_ phone: String?) -> String {
        String((phone ?? "").filter { $0.isNumber })
    }

    /// The customer in `candidates` (the answer of a `q=<phone>` search, which matches substrings) whose phone has
    /// exactly the same digits
    static func duplicate(of phone: String, in candidates: [Customer]) -> Customer? {
        let digits = phoneDigits(phone)
        guard !digits.isEmpty else { return nil }
        return candidates.first { phoneDigits($0.phone) == digits }
    }

    // MARK: - Rows

    /// Tier name when the merchant's loyalty program is on and the customer has a tier
    static func tierName(_ customer: Customer) -> String? {
        guard customer.loyaltyStatus == nil || customer.loyaltyStatus == .active else { return nil }
        return customer.loyalty?.tier?.name.nilIfEmpty
    }

    /// "09xxxx099 · 12 đơn" (no phone: "12 đơn")
    static func subtitle(phone: String?, orderCount: Int) -> String {
        let orders = String(format: "customers.v2.orders".localized(), orderCount)
        guard let phone = phone?.nilIfEmpty else { return orders }
        return "\(phone.maskedPhoneNumber) · \(orders)"
    }

    struct Tile: Equatable {
        let title: String
        let value: String
    }

    /// Số đơn, Tổng chi, Đang thuê. Money reads "—" when hidden for staff; an unknown renting count reads "—".
    static func tiles(totalOrders: Int, totalAmount: Double, renting: Int?, hidesMoney: Bool) -> [Tile] {
        [
            Tile(title: "customers.v2.tile.orders".localized(), value: "\(totalOrders)"),
            Tile(title: "customers.v2.tile.spent".localized(), value: hidesMoney ? "—" : MoneyFormatter.format(totalAmount)),
            Tile(title: "customers.v2.tile.renting".localized(), value: renting.map(String.init) ?? "—"),
        ]
    }

    /// "#148148 · 2 món"
    static func orderTitle(_ row: CustomerOrderRow) -> String {
        "#\(row.orderNumber) · " + String(format: "customers.v2.items".localized(), row.itemCount)
    }

    /// Rent: "T7 03/10 → T2 05/10" (one day when both are the same day); sale: the created day
    static func orderDates(_ row: CustomerOrderRow, timeZone: TimeZone = Date.shopTimeZone) -> String {
        if row.orderType == .rent, let pickup = row.pickupPlanAt {
            let from = DayFormatter.short(pickup, timeZone: timeZone)
            guard let ret = row.returnPlanAt else { return from }
            if DayFormatter.key(pickup, timeZone: timeZone) == DayFormatter.key(ret, timeZone: timeZone) { return from }
            return "\(from) → \(DayFormatter.short(ret, timeZone: timeZone))"
        }
        return (row.createdAt ?? row.pickupPlanAt).map { DayFormatter.short($0, timeZone: timeZone) } ?? ""
    }

    // MARK: - Dates

    private static let isoFractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let iso = ISO8601DateFormatter()

    static func date(_ raw: String?) -> Date? {
        guard let raw, !raw.isEmpty else { return nil }
        return isoFractional.date(from: raw) ?? iso.date(from: raw)
    }
}

// MARK: - Edit (board KH-sua)

/// `GET /api/customers/{id}` fields the edit form shows
struct CustomerProfile: Codable, Equatable {
    var id: Int
    var firstName: String?
    var lastName: String?
    var phone: String?
    var email: String?
    var address: String?
    var idNumber: String?
    var dateOfBirth: String?
    var notes: String?
}

struct CustomerProfileResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: CustomerProfile?
}

/// The edit form's text, as typed
struct CustomerEditForm: Equatable {
    var phone = ""
    var name = ""
    var email = ""
    var address = ""
    var idNumber = ""
    /// dd/MM/yyyy
    var dateOfBirth = ""
    var notes = ""
}

enum CustomerEditLogic {
    enum Problem: Equatable { case missingPhone, missingName, badEmail, badDate }

    static func form(from profile: CustomerProfile) -> CustomerEditForm {
        let name = [profile.firstName, profile.lastName].compactMap { $0?.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }.joined(separator: " ")
        return CustomerEditForm(phone: profile.phone ?? "", name: name, email: profile.email ?? "",
                                address: profile.address ?? "", idNumber: profile.idNumber ?? "",
                                dateOfBirth: displayDate(profile.dateOfBirth), notes: profile.notes ?? "")
    }

    /// The first problem, in field order
    static func validate(_ form: CustomerEditForm) -> Problem? {
        if let problem = CustomersV2Logic.validate(name: form.name, phone: form.phone) {
            return problem == .missingPhone ? .missingPhone : .missingName
        }
        let email = form.email.trimmingCharacters(in: .whitespaces)
        if !email.isEmpty {
            let parts = email.split(separator: "@", omittingEmptySubsequences: false)
            if parts.count != 2 || parts[0].isEmpty || !parts[1].contains(".") || email.contains(" ") { return .badEmail }
        }
        if !form.dateOfBirth.trimmingCharacters(in: .whitespaces).isEmpty, isoDate(form.dateOfBirth) == nil { return .badDate }
        return nil
    }

    /// `PUT /api/customers/{id}` body: every field the form shows. An emptied field is sent as "" so the API clears it.
    static func updatePayload(_ form: CustomerEditForm) -> [String: Any] {
        let split = CustomersV2Logic.splitName(form.name)
        func clean(_ s: String) -> String { s.trimmingCharacters(in: .whitespacesAndNewlines) }
        return [
            "firstName": split.firstName,
            "lastName": split.lastName,
            "phone": clean(form.phone),
            "email": clean(form.email),
            "address": clean(form.address),
            "idNumber": clean(form.idNumber),
            "notes": clean(form.notes),
            "dateOfBirth": isoDate(form.dateOfBirth) ?? "",
        ]
    }

    /// "12/05/1990" → "1990-05-12T00:00:00.000Z" (a civil date, kept as UTC midnight); nil when not a real date
    static func isoDate(_ text: String) -> String? {
        let parts = text.trimmingCharacters(in: .whitespaces).split(separator: "/").map(String.init)
        guard parts.count == 3, let d = Int(parts[0]), let m = Int(parts[1]), let y = Int(parts[2]),
              parts[2].count == 4, (1...12).contains(m), d >= 1 else { return nil }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        guard let date = calendar.date(from: DateComponents(year: y, month: m, day: d)),
              calendar.component(.day, from: date) == d, calendar.component(.month, from: date) == m else { return nil }
        return String(format: "%04d-%02d-%02dT00:00:00.000Z", y, m, d)
    }

    /// "1990-05-12T00:00:00.000Z" → "12/05/1990" (the date part as stored, no time-zone shift)
    static func displayDate(_ iso: String?) -> String {
        guard let iso, iso.count >= 10 else { return "" }
        let parts = iso.prefix(10).split(separator: "-")
        guard parts.count == 3 else { return "" }
        return "\(parts[2])/\(parts[1])/\(parts[0])"
    }
}
