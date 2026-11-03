//
//  PlanRenewal.swift
//  POS ADBD
//
//  #1459 Gói dịch vụ: what the plan screens read from the API and the pure rules they show. The server decides what may
//  be bought (`canRenew`, `canUpgrade`, `purchasablePlanIds`); this file only turns answers into words and numbers.
//  Contract shared with Android: .agent/changes/1459-plan-renewal/mobile.md.
//

import Foundation

// MARK: - API

/// GET /api/subscriptions/status as the plan screens read it. Every field is optional: an API without the #1459 fields
/// answers "nothing to buy".
struct PlanStatus: Decodable, Equatable {
    var planId: Int?
    var planName: String?
    /// ACTIVE | EXPIRED (computed by the server from the period end)
    var status: String?
    /// TRIAL | ACTIVE | PAST_DUE | CANCELLED | EXPIRED (as stored)
    var dbStatus: String?
    var daysRemaining: Int?
    var currentPeriodEnd: String?
    var billingAmount: Double?
    var billingCurrency: String?
    var billingChannel: String?
    var autoRenew: Bool?
    var billingIssue: Bool?
    var storeProductId: String?
    var planTier: String?
    var canRenew: Bool?
    var canUpgrade: Bool?
    var purchasablePlanIds: [Int]?
    var renewWindowDays: Int?
    var limits: PlanLimits?
    var features: [String]?
    /// A6: a store plan on this device's store with auto-renew off: offer "Bật lại tự gia hạn", not the same product
    var reenableAutoRenew: Bool?
    /// A13: the store's next charge (store expiration). Access runs to `currentPeriodEnd` = this + the days the shop had
    /// left when the store plan started. Nil while nothing auto-renews, or from an older API.
    var storeRenewsAt: String?

    enum CodingKeys: String, CodingKey {
        case planId, planName, status, dbStatus, daysRemaining, currentPeriodEnd, billingAmount, billingCurrency
        case billingChannel, autoRenew, billingIssue, storeProductId, planTier, canRenew, canUpgrade, purchasablePlanIds
        case renewWindowDays, limits, features, reenableAutoRenew, storeRenewsAt
    }

    init(planId: Int? = nil, planName: String? = nil, status: String? = nil, dbStatus: String? = nil,
         daysRemaining: Int? = nil, currentPeriodEnd: String? = nil, billingAmount: Double? = nil,
         billingCurrency: String? = nil, billingChannel: String? = nil, autoRenew: Bool? = nil, billingIssue: Bool? = nil,
         storeProductId: String? = nil, planTier: String? = nil, canRenew: Bool? = nil, canUpgrade: Bool? = nil,
         purchasablePlanIds: [Int]? = nil, renewWindowDays: Int? = nil, limits: PlanLimits? = nil, features: [String]? = nil,
         reenableAutoRenew: Bool? = nil, storeRenewsAt: String? = nil) {
        self.planId = planId
        self.planName = planName
        self.status = status
        self.dbStatus = dbStatus
        self.daysRemaining = daysRemaining
        self.currentPeriodEnd = currentPeriodEnd
        self.billingAmount = billingAmount
        self.billingCurrency = billingCurrency
        self.billingChannel = billingChannel
        self.autoRenew = autoRenew
        self.billingIssue = billingIssue
        self.storeProductId = storeProductId
        self.planTier = planTier
        self.canRenew = canRenew
        self.canUpgrade = canUpgrade
        self.purchasablePlanIds = purchasablePlanIds
        self.renewWindowDays = renewWindowDays
        self.limits = limits
        self.features = features
        self.reenableAutoRenew = reenableAutoRenew
        self.storeRenewsAt = storeRenewsAt
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func opt<T: Decodable>(_ type: T.Type, _ key: CodingKeys) -> T? { (try? c.decodeIfPresent(type, forKey: key)) ?? nil }
        planId = opt(Int.self, .planId)
        planName = opt(String.self, .planName)
        status = opt(String.self, .status)
        dbStatus = opt(String.self, .dbStatus)
        daysRemaining = opt(Int.self, .daysRemaining)
        currentPeriodEnd = opt(String.self, .currentPeriodEnd)
        billingAmount = opt(Double.self, .billingAmount)
        billingCurrency = opt(String.self, .billingCurrency)
        billingChannel = opt(String.self, .billingChannel)
        autoRenew = opt(Bool.self, .autoRenew)
        billingIssue = opt(Bool.self, .billingIssue)
        storeProductId = opt(String.self, .storeProductId)
        planTier = opt(String.self, .planTier)
        canRenew = opt(Bool.self, .canRenew)
        canUpgrade = opt(Bool.self, .canUpgrade)
        purchasablePlanIds = opt([Int].self, .purchasablePlanIds)
        renewWindowDays = opt(Int.self, .renewWindowDays)
        limits = opt(PlanLimits.self, .limits)
        features = PlanFeatures.decode(c, .features)
        reenableAutoRenew = opt(Bool.self, .reenableAutoRenew)
        storeRenewsAt = opt(String.self, .storeRenewsAt)
    }

    var isExpired: Bool { status?.uppercased() == "EXPIRED" }
    var isTrial: Bool { dbStatus?.uppercased() == "TRIAL" }
    /// Stored PAST_DUE while the period runs: the API answers 403 SUBSCRIPTION_PAST_DUE everywhere (Lemon / Stripe, or a
    /// store row from before #1459; store billing issues no longer set it)
    var isPastDue: Bool { dbStatus?.uppercased() == "PAST_DUE" && !isExpired }
    /// The rest of the API refuses this shop: the gate stays up
    var isBlocked: Bool { isExpired || isPastDue }
    var periodEnd: Date? { PlanRenewalLogic.parseInstant(currentPeriodEnd) }
    var purchasable: [Int] { purchasablePlanIds ?? [] }
    var window: Int { renewWindowDays ?? PlanRenewalLogic.defaultRenewWindowDays }
}

struct PlanStatusResponse: Decodable {
    let success: Bool
    let data: PlanStatus?
}

struct PlanLimits: Decodable, Equatable {
    var outlets: Int?
    var users: Int?
    var products: Int?

    init(outlets: Int? = nil, users: Int? = nil, products: Int? = nil) {
        self.outlets = outlets
        self.users = users
        self.products = products
    }

    enum CodingKeys: String, CodingKey { case outlets, users, products }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        outlets = (try? c.decodeIfPresent(Int.self, forKey: .outlets)) ?? nil
        users = (try? c.decodeIfPresent(Int.self, forKey: .users)) ?? nil
        products = (try? c.decodeIfPresent(Int.self, forKey: .products)) ?? nil
    }
}

/// Features are strings or `{ name }` objects, as an array or as a JSON string (GET /api/plans)
enum PlanFeatures {
    private struct Named: Decodable { let name: String }

    static func decode<K: CodingKey>(_ c: KeyedDecodingContainer<K>, _ key: K) -> [String]? {
        if let list = (try? c.decodeIfPresent([String].self, forKey: key)) ?? nil { return list }
        if let named = (try? c.decodeIfPresent([Named].self, forKey: key)) ?? nil { return named.map { $0.name } }
        if let text = (try? c.decodeIfPresent(String.self, forKey: key)) ?? nil { return fromJSON(text) }
        return nil
    }

    static func fromJSON(_ text: String) -> [String]? {
        guard let data = text.data(using: .utf8), let parsed = try? JSONSerialization.jsonObject(with: data),
              let raw = parsed as? [Any] else { return nil }
        return raw.compactMap { ($0 as? String) ?? (($0 as? [String: Any])?["name"] as? String) }
    }
}

/// Store product ids of a plan (`storeProductIds` of GET /api/plans)
struct PlanStoreProducts: Decodable, Equatable {
    let semiAnnual: String
    let annual: String

    func id(months: Int) -> String { months == 6 ? semiAnnual : annual }
}

/// A plan of GET /api/plans (MERCHANT; open to expired shops)
struct PlanOption: Decodable, Equatable {
    let id: Int
    let name: String
    var isPopular: Bool
    var sortOrder: Int
    var limits: PlanLimits?
    var features: [String]?
    var storeProductIds: PlanStoreProducts?

    enum CodingKeys: String, CodingKey { case id, name, isPopular, sortOrder, limits, features, storeProductIds }

    init(id: Int, name: String, isPopular: Bool = false, sortOrder: Int = 0, limits: PlanLimits? = nil,
         features: [String]? = nil, storeProductIds: PlanStoreProducts? = nil) {
        self.id = id
        self.name = name
        self.isPopular = isPopular
        self.sortOrder = sortOrder
        self.limits = limits
        self.features = features
        self.storeProductIds = storeProductIds
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        name = (try? c.decode(String.self, forKey: .name)) ?? "—"
        isPopular = ((try? c.decodeIfPresent(Bool.self, forKey: .isPopular)) ?? nil) ?? false
        sortOrder = ((try? c.decodeIfPresent(Int.self, forKey: .sortOrder)) ?? nil) ?? 0
        if let object = (try? c.decodeIfPresent(PlanLimits.self, forKey: .limits)) ?? nil {
            limits = object
        } else if let text = (try? c.decodeIfPresent(String.self, forKey: .limits)) ?? nil, let data = text.data(using: .utf8) {
            limits = try? JSONDecoder().decode(PlanLimits.self, from: data)
        } else {
            limits = nil
        }
        features = PlanFeatures.decode(c, .features)
        storeProductIds = (try? c.decodeIfPresent(PlanStoreProducts.self, forKey: .storeProductIds)) ?? nil
    }

    /// Professional = 2, Basic = 1, others 0 (by its store products, never by name)
    var tierRank: Int { PlanRenewalLogic.tierRank(storeProducts: storeProductIds) }
}

struct PlanListResponse: Decodable {
    struct Payload: Decodable { let plans: [PlanOption] }
    let success: Bool
    let data: Payload?
}

/// A store product as the screen shows it (RevenueCat or, in an e2e run, StoreKit directly)
struct PlanStoreProduct: Equatable {
    let productId: String
    /// "1.799.000 ₫" as the store formats it
    let priceText: String
    let price: Decimal
    let currencyCode: String?
    /// Formats another amount the way the store formats this price
    let format: (Decimal) -> String

    static func == (lhs: PlanStoreProduct, rhs: PlanStoreProduct) -> Bool {
        lhs.productId == rhs.productId && lhs.priceText == rhs.priceText && lhs.price == rhs.price
    }
}

// MARK: - Rules

enum PlanRenewalLogic {
    static let defaultRenewWindowDays = 7
    static let basicAnnual = "anyrent_merchant_annual"
    static let professionalAnnual = "anyrent_professional_annual"
    static let allProductIds = ["anyrent_merchant_semi_annual", "anyrent_merchant_annual",
                                "anyrent_professional_semi_annual", "anyrent_professional_annual"]
    static let vietnam = TimeZone(identifier: "Asia/Ho_Chi_Minh")!

    /// A3a: `merchant_<id>` only for builds on the production API; any other API (dev, local) uses `dev_merchant_<id>`, so a
    /// sandbox purchase on a test build never lands on a production shop with the same number
    static func appUserId(merchantId: Int, apiBaseURL: String) -> String {
        let host = URL(string: apiBaseURL)?.host?.lowercased() ?? ""
        return host == "api.anyrent.shop" ? "merchant_\(merchantId)" : "dev_merchant_\(merchantId)"
    }

    /// A1: RevenueCat is logged in as this shop (never anonymous, never another shop)
    static func storeAccountReady(current: String?, expected: String?) -> Bool {
        guard let expected, !expected.isEmpty else { return false }
        return current == expected
    }

    /// Google Play ids may carry ":basePlan"; App Store ids never do
    static func baseProductId(_ id: String?) -> String? {
        guard let id, !id.isEmpty else { return nil }
        return String(id.split(separator: ":").first ?? Substring(id))
    }

    static func tierRank(storeProducts: PlanStoreProducts?) -> Int {
        switch storeProducts?.annual {
        case professionalAnnual: return 2
        case basicAnnual: return 1
        default: return 0
        }
    }

    static func tierRank(planTier: String?) -> Int {
        switch planTier?.lowercased() {
        case "professional": return 2
        case "basic": return 1
        default: return 0
        }
    }

    /// "Dùng thử" during the trial, else the plan's own name
    static func displayPlanName(_ name: String?, isTrial: Bool) -> String {
        if isTrial { return "plan.trial".localized() }
        let trimmed = (name ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return "—" }
        return trimmed.lowercased() == "trial" ? "plan.trial".localized() : trimmed
    }

    // MARK: Dates (the Vietnam day, dd/MM/yyyy)

    static func parseInstant(_ iso: String?) -> Date? {
        guard let iso, !iso.isEmpty else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: iso) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: iso)
    }

    /// 2027-11-02T02:00Z → "02/11/2027"
    static func day(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = vietnam
        formatter.dateFormat = "dd/MM/yyyy"
        return formatter.string(from: date)
    }

    /// Today's Vietnam day plus `months`, the day clamped to the month's end (31/01 + 1 → 28 or 29/02)
    static func newPeriodEnd(now: Date, months: Int) -> Date {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = vietnam
        return calendar.date(byAdding: .month, value: months, to: now) ?? now
    }

    static func isPeriodOver(_ end: Date?, now: Date) -> Bool {
        guard let end else { return false }
        return end < now
    }

    // MARK: Words

    enum StatusLine: Equatable {
        case daysLeft(end: String, days: Int)
        case lastDay(end: String)
        case validUntil(end: String)
        case none
    }

    /// "Hết hạn 15/11/2026 · còn 13 ngày", "Hết hạn … · ngày cuối", or "Dùng đến …" once renewed
    static func statusLine(_ status: PlanStatus, renewed: Bool = false) -> StatusLine {
        guard let end = status.periodEnd else { return .none }
        if renewed || status.autoRenew == true { return .validUntil(end: day(end)) }
        guard let days = status.daysRemaining else { return .validUntil(end: day(end)) }
        return days <= 0 ? .lastDay(end: day(end)) : .daysLeft(end: day(end), days: days)
    }

    static func text(_ line: StatusLine) -> String? {
        switch line {
        case .daysLeft(let end, let days): return String(format: "plan.expiresDaysLeft".localized(), end, days)
        case .lastDay(let end): return String(format: "plan.expiresLastDay".localized(), end)
        case .validUntil(let end): return String(format: "plan.validUntil".localized(), end)
        case .none: return nil
        }
    }

    /// "app điện thoại · 2 người dùng · 1 chi nhánh · 2.000 sản phẩm" (chi nhánh only when asked)
    static func includes(limits: PlanLimits?, features: [String]?, withOutlets: Bool) -> String {
        var parts = [hasWeb(features) ? "plan.feature.phoneWeb".localized() : "plan.feature.phone".localized()]
        if let users = limits?.users, users > 0 { parts.append(String(format: "plan.feature.users".localized(), users)) }
        if withOutlets, let outlets = limits?.outlets, outlets > 0 {
            parts.append(String(format: "plan.feature.outlets".localized(), outlets))
        }
        if let products = limits?.products, products > 0 {
            parts.append(String(format: "plan.feature.products".localized(), groupThousands(products)))
        }
        return parts.joined(separator: " · ")
    }

    /// #1171: web only when the features say so (Basic has allowWebAccess but no web dashboard)
    static func hasWeb(_ features: [String]?) -> Bool {
        (features ?? []).contains { name in
            let n = name.lowercased().filter { $0.isLetter || $0.isNumber }
            return n.contains("webdashboard") || n.contains("allprofessional")
        }
    }

    /// 2000 → "2.000" (Vietnamese grouping, both languages, as the mockup)
    static func groupThousands(_ value: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.groupingSeparator = "."
        formatter.usesGroupingSeparator = true
        return formatter.string(from: NSNumber(value: value)) ?? "\(value)"
    }

    // MARK: Money

    struct Monthly: Equatable {
        let amount: Decimal
        let approximate: Bool
    }

    /// 999.000 / 6 = 166.500 (exact); 1.799.000 / 12 ≈ 150.000 (VND to the nearest 1.000, others to 0.01)
    static func monthly(total: Decimal, months: Int, currencyCode: String?) -> Monthly {
        guard months > 0 else { return Monthly(amount: total, approximate: false) }
        let raw = total / Decimal(months)
        let vnd = (currencyCode ?? "VND").uppercased() == "VND"
        var exact = raw
        var rounded = Decimal()
        NSDecimalRound(&rounded, &exact, vnd ? 0 : 2, .plain)
        if rounded == raw { return Monthly(amount: raw, approximate: false) }
        var value = raw
        var result = Decimal()
        if vnd {
            var thousands = raw / 1000
            NSDecimalRound(&result, &thousands, 0, .plain)
            return Monthly(amount: result * 1000, approximate: true)
        }
        NSDecimalRound(&result, &value, 2, .plain)
        return Monthly(amount: result, approximate: true)
    }

    /// 2 × 999.000 vs 1.799.000 → 10 (%); none when 12 months is not cheaper
    static func savingsPercent(semiAnnual: Decimal, annual: Decimal) -> Int? {
        let two = semiAnnual * 2
        guard two > 0, two > annual else { return nil }
        let percent = NSDecimalNumber(decimal: (two - annual) / two * 100).doubleValue
        let value = Int(percent.rounded())
        return value > 0 ? value : nil
    }

    // MARK: Buying

    enum PurchaseKind: Equatable { case renew, upgrade, buy }

    static func purchaseKind(selectedPlanId: Int, selectedRank: Int, currentPlanId: Int?, currentRank: Int, isTrial: Bool) -> PurchaseKind {
        if selectedPlanId == currentPlanId && !isTrial { return .renew }
        if currentRank > 0 && selectedRank > currentRank { return .upgrade }
        return .buy
    }

    static func periodLabel(months: Int) -> String {
        months == 6 ? "plan.months6".localized() : "plan.months12".localized()
    }

    /// "Gia hạn 12 tháng · 1.799.000 ₫", "Nâng lên Professional · 12 tháng · 2.399.000 ₫", "Mua gói Basic · 6 tháng · …"
    static func buttonTitle(kind: PurchaseKind, planName: String, months: Int, amount: String) -> String {
        let period = periodLabel(months: months)
        switch kind {
        case .renew: return String(format: "plan.button.renew".localized(), period, amount)
        case .upgrade: return String(format: "plan.button.upgrade".localized(), planName, period, amount)
        case .buy: return String(format: "plan.button.buy".localized(), planName, period, amount)
        }
    }

    /// A13 "Gia hạn sớm không mất ngày": the words under the buy button. The days left continue after the new store period
    /// (server rule `storeCreditForPurchase` in apps/api/lib/plan-renewal.ts; Android `PlanRenewal.disclosure`):
    /// - nothing left (expired, no end, no status): "Kỳ mới tính từ hôm nay, dùng đến 03/11/2027. Tự gia hạn mỗi 12 tháng
    ///   (1.799.000 ₫) đến khi huỷ.";
    /// - days left and a new store subscription (trial, manual, the other store): "Hạn mới tính tiếp từ 05/11/2026, dùng đến
    ///   05/11/2027. Tự gia hạn mỗi 12 tháng (1.799.000 ₫), lần trừ tiền tới ngày 03/11/2027, đến khi huỷ.";
    /// - an upgrade in the store that bills the plan (it prorates its own days): only the credit carries
    ///   (`currentPeriodEnd − storeRenewsAt`); none known → the first text.
    static func disclosure(now: Date, months: Int, amount: String, status: PlanStatus? = nil, deviceStore: String = "APP_STORE") -> String {
        let charge = newPeriodEnd(now: now, months: months)
        let startsToday = String(format: "plan.disclosure".localized(), day(charge), months, amount)
        guard let status = status, !status.isExpired, let end = status.periodEnd, end > now else { return startsToday }
        if status.billingChannel == deviceStore && status.storeProductId != nil {
            let credit = parseInstant(status.storeRenewsAt).map { max(0, end.timeIntervalSince($0)) } ?? 0
            let withCredit = charge.addingTimeInterval(credit)
            if day(withCredit) == day(charge) { return startsToday }
            return String(format: "plan.disclosureCredit".localized(), day(withCredit), months, amount, day(charge))
        }
        let left = end.timeIntervalSince(now)
        return String(format: "plan.disclosureCarry".localized(), day(end), day(charge.addingTimeInterval(left)), months, amount, day(charge))
    }

    /// A13: the date on the auto-renew row: the store's charge (`storeRenewsAt`), else the period end (an older API)
    static func autoRenewDate(_ status: PlanStatus) -> Date? {
        parseInstant(status.storeRenewsAt) ?? status.periodEnd
    }

    /// Which plan is chosen first: the current plan when it may be bought, else the cheapest purchasable one
    static func defaultPlanId(plans: [PlanOption], status: PlanStatus) -> Int? {
        let purchasable = plans.filter { status.purchasable.contains($0.id) }
        if let current = status.planId, purchasable.contains(where: { $0.id == current }) { return current }
        return purchasable.first?.id
    }

    // MARK: Screens

    enum Mode: Equatable {
        case purchase, autoRenewing, nothingToBuy, storeUnavailable, expiredOwner, expiredStaff
        /// PAST_DUE: the owner fixes the payment where the plan is billed (Quản lý / huỷ gói), nothing to buy here
        case paymentIssueOwner
        /// A6: auto-renew is off on this store and nothing else to buy: only "Bật lại tự gia hạn"
        case reenableOnly
    }

    /// What the plan screen shows. `storeHasProducts`: the store answered with at least one product.
    static func mode(isOwner: Bool, status: PlanStatus, storeHasProducts: Bool) -> Mode {
        if !isOwner { return .expiredStaff }
        if status.isPastDue { return .paymentIssueOwner }
        if status.isExpired { return storeHasProducts && !status.purchasable.isEmpty ? .expiredOwner : .storeUnavailable }
        if status.purchasable.isEmpty {
            if status.autoRenew == true { return .autoRenewing }
            if status.reenableAutoRenew == true { return .reenableOnly }
            return .nothingToBuy
        }
        // A5: an auto-renewing shop may upgrade through its own store; without store products it sees its auto-renew card
        if !storeHasProducts { return status.autoRenew == true ? .autoRenewing : .storeUnavailable }
        return .purchase
    }

    /// Home line for the owner: only when the renew rule opened (≤ 7 days, not auto-renewing) and the period runs
    static func homeLine(isOwner: Bool, status: PlanStatus?) -> String? {
        guard isOwner, let status, !status.isExpired, status.canRenew == true, status.autoRenew != true,
              let days = status.daysRemaining, days >= 0, days <= status.window else { return nil }
        return days == 0 ? "plan.home.lastDay".localized() : String(format: "plan.home.daysLeft".localized(), days)
    }

    /// The server took the payment: the period end moved past the old one, or the plan changed, and it is not expired
    static func confirmed(before: PlanStatus?, after: PlanStatus) -> Bool {
        guard !after.isExpired, let newEnd = after.periodEnd else { return false }
        guard let before else { return true }
        if let oldEnd = before.periodEnd, newEnd > oldEnd { return true }
        if before.isExpired { return true }
        return before.planId != nil && after.planId != before.planId
    }
}
