//
//  DepositPlan.swift
//  POS ADBD
//
//  "Thu cọc theo giai đoạn" (#1199): the shop setting "Cách thu cọc", the stages of an order and the pure money
//  rules the screens share. The API owns the money (`effectivePlan`, packages/utils/src/core/deposit-plan.ts);
//  this file only previews a new order's stages (same rounding) and reads what the API sends. Every new field is
//  optional, so an older API or an order without a plan decodes as before.
//

import Foundation

// MARK: - Client capability header

/// Header every request carries so the API sends deposit stages and accepts `paymentPlan` (#1199), sends BLOCK options and checks BLOCK prices (#1189).
/// `branch-listing` (#1346): this build has the "Hiện ở chi nhánh" tick, so the API does not list a product again when it is put on an order.
/// Old builds never send it and keep getting the answers they decode today.
enum ClientCapabilities {
    static let headerName = "X-Client-Capabilities"
    /// One token per feature this build understands; the value is comma separated
    static let tokens: [String] = ["installments", "block-pricing", "branch-listing"]
    static var headerValue: String { tokens.joined(separator: ", ") }
}

// MARK: - Shop setting

enum DepositMode: String, Equatable {
    case oneTime = "ONE_TIME"
    case staged = "STAGED"

    /// A missing or unknown value is "Thu cọc 1 lần", as for every shop before #1199
    static func from(_ raw: String?) -> DepositMode {
        DepositMode(rawValue: (raw ?? "").uppercased()) ?? .oneTime
    }
}

/// When a stage falls due: the day of the order, N days before the pickup day, or N days after the order day
struct DepositDueRule: Codable, Equatable {
    static let onCreateKind = "ON_CREATE"
    static let beforePickupKind = "BEFORE_PICKUP"
    static let afterCreateKind = "AFTER_CREATE"

    var kind: String
    var days: Int?

    static let onCreate = DepositDueRule(kind: onCreateKind, days: nil)
    static func beforePickup(_ days: Int) -> DepositDueRule { DepositDueRule(kind: beforePickupKind, days: days) }
    static func afterCreate(_ days: Int) -> DepositDueRule { DepositDueRule(kind: afterCreateKind, days: days) }

    /// "Lúc đặt" / "Trước ngày lấy 4 ngày" / "Sau ngày đặt 3 ngày"
    var text: String {
        switch kind {
        case DepositDueRule.beforePickupKind:
            return String(format: "deposit.due.beforePickup".localized(), days ?? 0)
        case DepositDueRule.afterCreateKind:
            return String(format: "deposit.due.afterCreate".localized(), days ?? 0)
        default:
            return "deposit.due.onCreate".localized()
        }
    }
}

/// One stage of a template: a percentage of the order total and its due rule (the last stage "rest" is automatic)
struct DepositStageTemplate: Codable, Equatable {
    var label: String
    var type: String = "PERCENT"
    var value: Double
    var dueRule: DepositDueRule
}

struct DepositTemplate: Codable, Equatable {
    var id: String
    var name: String
    var isDefault: Bool?
    var items: [DepositStageTemplate]

    /// "30% giữ chỗ · 40% trước ngày lấy · còn lại khi giao"
    var summary: String {
        let parts = items.map { "\(DepositPlanMath.percentText($0.value))% \($0.label.lowercased())" }
        return (parts + ["deposit.template.restShort".localized()]).joined(separator: " · ")
    }
}

/// GET / PUT /api/settings/deposit
struct DepositSettings: Decodable, Equatable {
    var depositMode: DepositMode
    var cancellationPolicy: String
    var templates: [DepositTemplate]
    /// The built-in template of the API, used while a STAGED shop has none of its own
    var defaultTemplate: DepositTemplate?

    enum CodingKeys: String, CodingKey { case depositMode, cancellationPolicy, templates, defaultTemplate }

    init(depositMode: DepositMode = .oneTime, cancellationPolicy: String = "", templates: [DepositTemplate] = [],
         defaultTemplate: DepositTemplate? = nil) {
        self.depositMode = depositMode
        self.cancellationPolicy = cancellationPolicy
        self.templates = templates
        self.defaultTemplate = defaultTemplate
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        depositMode = DepositMode.from((try? c.decodeIfPresent(String.self, forKey: .depositMode)) ?? nil)
        cancellationPolicy = ((try? c.decodeIfPresent(String.self, forKey: .cancellationPolicy)) ?? nil) ?? ""
        templates = ((try? c.decodeIfPresent([DepositTemplate].self, forKey: .templates)) ?? nil) ?? []
        defaultTemplate = (try? c.decodeIfPresent(DepositTemplate.self, forKey: .defaultTemplate)) ?? nil
    }

    /// The template a new order starts from: the shop default, else its first, else the API's built-in one
    var startTemplate: DepositTemplate? {
        templates.first(where: { $0.isDefault == true }) ?? templates.first ?? defaultTemplate
    }

    /// The choices of "Thu cọc theo giai đoạn" in the cart: the shop's templates, or the built-in one while it has none
    var choices: [DepositTemplate] {
        if !templates.isEmpty { return templates }
        return defaultTemplate.map { [$0] } ?? []
    }
}

// MARK: - Stages of an order (what the API sends)

/// `installments[]` of an order response (only for a client that sends `installments`)
struct OrderInstallment: Codable, Equatable {
    static let rest = "rest"

    let key: String
    let label: String
    let percent: Double
    let amount: Double
    let plannedAmount: Double
    let remaining: Double
    let dueDateKey: String?
    /// PAID, PARTIAL, DUE_TODAY, OVERDUE, UPCOMING or VOID
    let status: String
    let collectedAt: String?
    let paidAmount: Double

    var isRest: Bool { key == OrderInstallment.rest }
    var isPaid: Bool { status == "PAID" || status == "PARTIAL" || paidAmount > 0 }

    enum CodingKeys: String, CodingKey {
        case key, label, percent, amount, plannedAmount, remaining, dueDateKey, status, collectedAt, paidAmount
    }

    init(key: String, label: String, percent: Double, amount: Double, plannedAmount: Double? = nil, remaining: Double? = nil,
         dueDateKey: String?, status: String, collectedAt: String? = nil, paidAmount: Double = 0) {
        self.key = key
        self.label = label
        self.percent = percent
        self.amount = amount
        self.plannedAmount = plannedAmount ?? amount
        self.remaining = remaining ?? (paidAmount > 0 ? 0 : amount)
        self.dueDateKey = dueDateKey
        self.status = status
        self.collectedAt = collectedAt
        self.paidAmount = paidAmount
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        key = try c.decode(String.self, forKey: .key)
        label = ((try? c.decodeIfPresent(String.self, forKey: .label)) ?? nil) ?? key
        percent = ((try? c.decodeIfPresent(Double.self, forKey: .percent)) ?? nil) ?? 0
        amount = ((try? c.decodeIfPresent(Double.self, forKey: .amount)) ?? nil) ?? 0
        plannedAmount = ((try? c.decodeIfPresent(Double.self, forKey: .plannedAmount)) ?? nil) ?? amount
        paidAmount = ((try? c.decodeIfPresent(Double.self, forKey: .paidAmount)) ?? nil) ?? 0
        remaining = ((try? c.decodeIfPresent(Double.self, forKey: .remaining)) ?? nil) ?? (paidAmount > 0 ? 0 : amount)
        dueDateKey = (try? c.decodeIfPresent(String.self, forKey: .dueDateKey)) ?? nil
        status = ((try? c.decodeIfPresent(String.self, forKey: .status)) ?? nil) ?? "UPCOMING"
        collectedAt = (try? c.decodeIfPresent(String.self, forKey: .collectedAt)) ?? nil
    }
}

/// `installmentSummary` of an order response
struct InstallmentSummary: Codable, Equatable {
    struct NextDue: Codable, Equatable {
        let key: String
        let dueDateKey: String?
        let amount: Double
    }

    let planned: Double
    let collected: Double
    let remaining: Double
    /// Share of the order total already collected, 2 decimals
    let percentCollected: Double
    let nextDue: NextDue?

    enum CodingKeys: String, CodingKey { case planned, collected, remaining, percentCollected, nextDue }

    init(planned: Double, collected: Double, remaining: Double, percentCollected: Double, nextDue: NextDue? = nil) {
        self.planned = planned
        self.collected = collected
        self.remaining = remaining
        self.percentCollected = percentCollected
        self.nextDue = nextDue
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        planned = ((try? c.decodeIfPresent(Double.self, forKey: .planned)) ?? nil) ?? 0
        collected = ((try? c.decodeIfPresent(Double.self, forKey: .collected)) ?? nil) ?? 0
        remaining = ((try? c.decodeIfPresent(Double.self, forKey: .remaining)) ?? nil) ?? 0
        percentCollected = ((try? c.decodeIfPresent(Double.self, forKey: .percentCollected)) ?? nil) ?? 0
        nextDue = (try? c.decodeIfPresent(NextDue.self, forKey: .nextDue)) ?? nil
    }
}

/// Money and roles of an order that has stages. The server checks every one of these again.
enum DepositPlanLogic {
    /// An order shows the stage card only when the API sent a plan (`hasDepositPlan`) and stages
    static func hasPlan(_ detail: OrderDetail) -> Bool {
        detail.hasDepositPlan == true && !(detail.installments ?? []).isEmpty
    }

    /// MERCHANT and OUTLET_ADMIN edit the plan; the API also answers 403 to staff
    static func canEditPlan(role: Role?) -> Bool { role == .merchant || role == .outletAdmin }

    /// Only the shop owner voids a stage collected by mistake
    static func canVoid(role: Role?) -> Bool { role == .merchant }

    /// Shop owner and outlet admin may keep part of the money when cancelling; staff refund everything
    static func canKeepOnCancel(role: Role?) -> Bool { role == .merchant || role == .outletAdmin }

    /// Staff take cash or bank transfer only
    static func collectMethods(role: Role?) -> [String] {
        (role?.isStaffLike ?? false) ? ["CASH", "TRANSFER"] : ["CASH", "TRANSFER", "CHECK"]
    }

    /// A stage can be collected while the order is reserved and the stage is not collected yet
    static func canCollect(_ stage: OrderInstallment, status: OrderStatus) -> Bool {
        status == .reserved && !stage.isPaid && stage.status != "VOID" && stage.amount > 0
    }

    /// The first explicit stage that can still be collected (the "Thu giai đoạn N" button)
    static func nextToCollect(_ stages: [OrderInstallment], status: OrderStatus) -> OrderInstallment? {
        stages.first { !$0.isRest && canCollect($0, status: status) }
    }

    /// Explicit stages nobody collected: the API blocks the hand-over until they are (INSTALLMENT_UNPAID_AT_PICKUP)
    static func unpaidBeforePickup(_ stages: [OrderInstallment]) -> [OrderInstallment] {
        stages.filter { !$0.isRest && $0.amount > 0 && $0.paidAmount <= 0 && $0.status != "VOID" }
    }

    /// #1380: a booked rental of a plan with a stage still uncollected. The API refuses its hand-over, so the bottom bar says
    /// "Còn đợt chưa thu" instead of the Giao đồ button; the stage is collected on the deposit card (open to every role)
    static func blocksHandOver(hasPlan: Bool?, status: OrderStatus, stages: [OrderInstallment]?) -> Bool {
        false
    }

    /// "Thu giai đoạn 2" for `i2`, "Thu giai đoạn" for a key that is not a number
    static func stageNumber(_ stages: [OrderInstallment], key: String) -> Int? {
        stages.firstIndex { $0.key == key }.map { $0 + 1 }
    }

    /// #1222: the list badge only for a rental waiting for pick-up whose order has a deposit plan (`hasDepositPlan` and
    /// `installmentSummary.percentCollected`, which the list API sends to a build that declares `installments`).
    /// A one-time deposit order has no badge, whatever mode the shop is in now.
    static func listBadgePercent(_ order: Order) -> Double? {
        guard order.hasDepositPlan == true, order.orderType == .rent, order.status == .reserved,
              let sent = order.installmentPercentCollected, sent > 0 else { return nil }
        return min(100, sent.rounded())
    }

    /// The list badge "Đã thu 30%": nil without a plan
    static func badge(percentCollected: Double?) -> String? {
        guard let percent = percentCollected else { return nil }
        return String(format: "deposit.badge.collected".localized(), DepositPlanMath.percentText(percent))
    }

    /// The kept amount of the cancel sheet: `collected` is what the customer paid; the default keeps nothing
    /// ("Khách đã trả / Tiệm giữ lại / Hoàn cho khách"). The owner edits either number; the other follows.
    struct CancelAmounts: Equatable {
        let collected: Double
        let kept: Double
        var refund: Double { max(0, collected - kept) }
        var isValid: Bool { kept >= 0 && kept <= collected }

        static func keeping(_ kept: Double, of collected: Double) -> CancelAmounts {
            CancelAmounts(collected: collected, kept: min(max(0, kept), collected))
        }

        static func refunding(_ refund: Double, of collected: Double) -> CancelAmounts {
            keeping(collected - min(max(0, refund), collected), of: collected)
        }
    }

    /// Body of PUT /api/orders/{id} that cancels: `cancelKeptAmount` only when the shop keeps some money
    static func cancelBody(kept: Double, note: String?) -> [String: Any] {
        var body: [String: Any] = ["status": "CANCELLED"]
        if kept > 0 { body["cancelKeptAmount"] = kept }
        let text = (note ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if !text.isEmpty { body["cancelNote"] = text }
        return body
    }
}

// MARK: - Preview of the stages of a new order (the API recomputes them)

/// One stage of the cart while the order is not created: the template item, edited for this order
struct DepositStageDraft: Equatable {
    var label: String
    var percent: Double
    var dueRule: DepositDueRule
    /// `YYYY-MM-DD`; wins over the rule (the owner picked a day)
    var dueDateKey: String?
    /// A fixed amount that replaces the percentage (owner edit)
    var amountOverride: Double?

    init(label: String, percent: Double, dueRule: DepositDueRule, dueDateKey: String? = nil, amountOverride: Double? = nil) {
        self.label = label
        self.percent = percent
        self.dueRule = dueRule
        self.dueDateKey = dueDateKey
        self.amountOverride = amountOverride
    }

    init(_ item: DepositStageTemplate) {
        self.init(label: item.label, percent: item.value, dueRule: item.dueRule)
    }
}

/// A stage with its amount and day, for the cart list
struct DepositStagePreview: Equatable {
    let key: String
    let label: String
    let percent: Double
    let amount: Double
    let dueDateKey: String
    let isRest: Bool
}

enum DepositPlanMath {
    /// Digits after the point of the currency's smallest unit: VND 0, USD 2
    static func minorDigits(_ currency: ShopCurrency) -> Int {
        currency == .usd ? 2 : 0
    }

    /// Round to the smallest unit of the currency (VND 1, USD 0.01), as `roundMoney` of the API
    static func roundMoney(_ amount: Double, currency: ShopCurrency) -> Double {
        let factor = pow(10.0, Double(minorDigits(currency)))
        return ((amount + Double.ulpOfOne) * factor).rounded() / factor
    }

    /// `percent` of `total` in the smallest unit (12.000.000 × 30% = 3.600.000)
    static func percentOf(_ total: Double, percent: Double, currency: ShopCurrency) -> Double {
        let factor = pow(10.0, Double(minorDigits(currency)))
        let totalMinor = (total * factor).rounded()
        return (totalMinor * percent / 100).rounded() / factor
    }

    /// `30` for 30, `33.33` for 33.33
    static func percentText(_ value: Double) -> String {
        let rounded = (value * 100).rounded() / 100
        if rounded == rounded.rounded() { return String(Int(rounded)) }
        return String(format: "%g", rounded)
    }

    /// `YYYY-MM-DD` plus `days` (negative goes back), civil days with no time zone
    static func addDays(_ key: String, _ days: Int) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC") ?? TimeZone(secondsFromGMT: 0)!
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.timeZone = calendar.timeZone
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: key), let moved = calendar.date(byAdding: .day, value: days, to: date) else {
            return key
        }
        return formatter.string(from: moved)
    }

    /// The day a stage falls due; `createdKey` / `pickupKey` are civil days of the shop
    static func dueKey(_ draft: DepositStageDraft, createdKey: String, pickupKey: String) -> String {
        if let picked = draft.dueDateKey, picked.count == 10 { return picked }
        switch draft.dueRule.kind {
        case DepositDueRule.beforePickupKind: return addDays(pickupKey, -(draft.dueRule.days ?? 0))
        case DepositDueRule.afterCreateKind: return addDays(createdKey, draft.dueRule.days ?? 0)
        default: return createdKey
        }
    }

    /// Stages with amounts: each explicit stage is its percentage of the total (or its fixed amount); the last stage
    /// "rest" is always total − the others, so the stages add up to the total. Golden: 12.000.000 with 30% / 40% →
    /// 3.600.000 / 4.800.000 / 3.600.000.
    static func stages(_ drafts: [DepositStageDraft], total: Double, createdKey: String, pickupKey: String,
                       currency: ShopCurrency) -> [DepositStagePreview] {
        var result: [DepositStagePreview] = []
        var explicit = 0.0
        for (index, draft) in drafts.enumerated() {
            let amount = draft.amountOverride.map { roundMoney($0, currency: currency) }
                ?? percentOf(total, percent: draft.percent, currency: currency)
            explicit += amount
            result.append(DepositStagePreview(key: "i\(index + 1)", label: draft.label,
                                              // #1245: the template's own % until the owner edits the amount; then the % of the order, 1 decimal
                                              percent: draft.amountOverride == nil || total <= 0
                                                  ? draft.percent : (amount / total * 1000).rounded() / 10,
                                              amount: amount, dueDateKey: dueKey(draft, createdKey: createdKey, pickupKey: pickupKey),
                                              isRest: false))
        }
        let rest = max(0, roundMoney(total - explicit, currency: currency))
        result.append(DepositStagePreview(key: OrderInstallment.rest, label: "deposit.rest.label".localized(),
                                          percent: total > 0 ? (rest / total * 10000).rounded() / 100 : 0,
                                          amount: rest, dueDateKey: pickupKey, isRest: true))
        return result
    }

    /// The explicit stages add up to more than the order total: the API answers 400 INSTALLMENT_EXCEEDS_TOTAL
    static func exceedsTotal(_ stages: [DepositStagePreview], total: Double) -> Bool {
        stages.filter { !$0.isRest }.reduce(0) { $0 + $1.amount } > total + 0.000001
    }
}

// MARK: - Requests

/// `paymentPlan` of POST /api/orders: the stages of the order and, optionally, "Thu giai đoạn 1 ngay"
struct PaymentPlanRequest: Codable {
    struct Item: Codable {
        let key: String?
        let label: String
        let type: String
        let value: Double
        let dueRule: DepositDueRule?
        let dueDateKey: String?
        let amountOverride: Double?
    }

    struct CollectFirstNow: Codable {
        let method: String
        let reference: String
    }

    var templateId: String?
    var items: [Item]?
    var collectFirstNow: CollectFirstNow?

    static func items(from drafts: [DepositStageDraft]) -> [Item] {
        drafts.map {
            Item(key: nil, label: $0.label, type: "PERCENT", value: $0.percent,
                 dueRule: $0.dueDateKey == nil ? $0.dueRule : nil, dueDateKey: $0.dueDateKey, amountOverride: $0.amountOverride)
        }
    }
}

/// Body of POST /api/orders/{id}/installments/{key}/collect
struct CollectInstallmentRequest: Encodable {
    let amount: Double
    let method: String
    let collectedOn: String?
    let note: String?
    /// One value per tap, reused on a retry: the API answers a repeat with the first payment and changes nothing
    let reference: String
}

// MARK: - The shop's deposit mode, cached on the signed-in user

enum DepositModeStore {
    /// A fetch is on its way: a profile refresh must not overwrite it
    private static var lastRefresh: Date?
    static var saving = false

    /// The cached mode; nil when the login payload did not carry it (older cached login): the screens fetch it
    static var cachedMode: DepositMode? {
        guard let raw = User.account()?.merchant?.depositMode else { return nil }
        return DepositMode.from(raw)
    }

    /// The mode in effect: the cached one, else "Thu cọc 1 lần"
    static var current: DepositMode { cachedMode ?? .oneTime }

    static func store(_ mode: DepositMode) {
        guard let user = User.account(), user.merchant != nil else { return }
        guard user.merchant?.depositMode != mode.rawValue else { return }
        user.merchant?.depositMode = mode.rawValue
        User.save(user: user)
    }

    /// The last setting read from the API: the cart needs its templates
    private(set) static var latest: DepositSettings?

    /// True while the mode or (for a staged shop) the templates are unknown
    static var needsFetch: Bool { cachedMode == nil || (current == .staged && latest == nil) }

    /// Reads the shop's setting when the cache has none (or `force`), at most once a minute. Completion runs on the
    /// main queue with the mode in effect. This is the lesson of #1138: a flag missing from the login payload is fetched.
    static func refresh(force: Bool = false, completion: ((DepositMode) -> Void)? = nil) {
        if !force, let lastRefresh {
            let age = Date().timeIntervalSince(lastRefresh)
            if age < 10 || (age < 60 && !needsFetch) {
                completion?(current)
                return
            }
        }
        lastRefresh = Date()
        DepositPlanAPIService.shared.settings { settings, _ in
            DispatchQueue.main.async {
                if let settings, !saving {
                    latest = settings
                    store(settings.depositMode)
                }
                completion?(current)
            }
        }
    }

    /// A save answered with the setting in effect
    static func didSave(_ settings: DepositSettings) {
        latest = settings
        store(settings.depositMode)
    }
}

// MARK: - The cart of a "Thu cọc theo giai đoạn" shop

extension Cart {
    /// A new rental in a shop on "Thu cọc theo giai đoạn" (an order being edited keeps the plan it has)
    var isStagedRental: Bool {
        orderType == .rent && !isEditMode && DepositModeStore.current == .staged && depositStages != nil
    }

    /// Staff cannot pick or edit the stages (the API uses the shop's default template for them)
    static var canEditStages: Bool { !(User.account()?.role.isStaffLike ?? true) }

    /// Stages with amounts for the order total as it is now; empty when the cart has no stages
    func stagedPreview(now: Date = Date(), timeZone: TimeZone = Date.shopTimeZone) -> [DepositStagePreview] {
        guard let drafts = depositStages else { return [] }
        let createdKey = DayFormatter.key(now, timeZone: timeZone)
        let pickupKey = pickupPlanAt.map { DayFormatter.key($0, timeZone: timeZone) } ?? createdKey
        return DepositPlanMath.stages(drafts, total: totalAmount, createdKey: createdKey, pickupKey: pickupKey,
                                      currency: ShopCurrencyStore.current)
    }

    /// What is paid with the order: stage 1, or nothing when "tạo đơn không thu ngay"
    var stagedCollectNow: Double {
        guard collectFirstStageNow, let first = stagedPreview().first, !first.isRest else { return 0 }
        return first.amount
    }

    /// `paymentPlan` of POST /api/orders; nil unless this is a staged rental
    func paymentPlanRequest(reference: String) -> PaymentPlanRequest? {
        guard isStagedRental, let drafts = depositStages else { return nil }
        var plan = PaymentPlanRequest()
        // Staff send no stages: the API takes the shop's default template for them
        if Cart.canEditStages {
            plan.templateId = depositTemplateId
            plan.items = PaymentPlanRequest.items(from: drafts)
        }
        if collectFirstStageNow, stagedCollectNow > 0 {
            plan.collectFirstNow = PaymentPlanRequest.CollectFirstNow(method: collectMethod, reference: reference)
        }
        return plan
    }
}

// MARK: - Bill and share image (#1252)

/// The staged-deposit block of the printed bill and of the share image: "Thu cọc theo giai đoạn", one entry per stage
/// (name, amount, "30% đơn · thu 25/10 · Đã thu"), then "Đã thu" and "Còn phải thu". Pure: the same lines on both.
/// Nil for a one-time deposit, a sale, or an order the API sent without stages (an older API), so those bills do not change.
enum DepositPlanReceipt {
    struct Stage: Equatable {
        let title: String
        let amount: Double
        /// nil on the last stage ("Phần còn lại, thu khi giao"): one row only
        let detail: String?
    }

    struct Block: Equatable {
        let title: String
        let stages: [Stage]
        let collectedLabel: String
        let collected: Double
        let remainingLabel: String
        let remaining: Double
    }

    /// `text` translates a key: the app language on the bill, the share image's language on the image
    static func block(hasPlan: Bool?, orderType: OrderType, stages: [OrderInstallment]?, summary: InstallmentSummary?,
                      today: String = DayFormatter.key(Date()), text: (String) -> String = { $0.localized() }) -> Block? {
        let shown = (stages ?? []).filter { $0.status != "VOID" }
        guard orderType == .rent, hasPlan == true, !shown.isEmpty else { return nil }
        let rows = shown.enumerated().map { index, stage -> Stage in
            if stage.isRest { return Stage(title: text("deposit.rest.label"), amount: stage.amount, detail: nil) }
            return Stage(title: "\(index + 1). \(stage.label)", amount: stage.amount, detail: detail(stage, today: today, text: text))
        }
        return Block(title: text("deposit.card.title"), stages: rows,
                     collectedLabel: text("deposit.card.collected"),
                     collected: summary?.collected ?? shown.reduce(0) { $0 + $1.paidAmount },
                     remainingLabel: text("deposit.card.remaining"),
                     remaining: summary?.remaining ?? shown.reduce(0) { $0 + $1.remaining })
    }

    /// "30% đơn · 25/10 · Đã thu" (collected day) or "30% đơn · hạn 28/10 · Trễ 2 ngày"
    static func detail(_ stage: OrderInstallment, today: String, text: (String) -> String) -> String {
        let percent = DepositPlanMath.percentText(stage.percent)
        let head = stage.isPaid
            ? String(format: text("deposit.card.paidDetail"), percent, InstallmentCardView.paidDay(stage.collectedAt))
            : String(format: text("deposit.card.dueDetail"), percent, DepositUI.dayText(stage.dueDateKey))
        return head + " · " + status(stage, today: today, text: text)
    }

    static func status(_ stage: OrderInstallment, today: String, text: (String) -> String) -> String {
        switch stage.status {
        case "PAID": return text("deposit.status.paid")
        case "PARTIAL": return text("deposit.status.partial")
        case "DUE_TODAY": return text("deposit.status.today")
        case "OVERDUE":
            let late = InstallmentCardView.lateDays(stage.dueDateKey, today: today)
            return late > 0 ? String(format: text("deposit.status.late"), late) : text("deposit.status.due")
        default: return text("deposit.status.pending")
        }
    }
}

extension DepositPlanReceipt {
    /// ESC/POS bytes of the block, left aligned, narrow-paper friendly: a stage is its name and amount, then one small line
    static func printData(_ block: Block) -> Data {
        var data = Data()
        func line(_ text: String) { data.append((text.formatStringOriginalCharacter() + "\n").data(using: .utf8) ?? Data()) }
        data.append(PrinterCommand.selectAlignment(PrinterCommand.Alignment.left.rawValue))
        data.append(PrinterCommand.selectOrCancleBoldModel(0))
        line("------------------------------------------------")
        data.append(PrinterCommand.selectOrCancleBoldModel(1))
        line(block.title)
        data.append(PrinterCommand.selectOrCancleBoldModel(0))
        for stage in block.stages {
            line("\(stage.title): \(stage.amount.formatStringInCommon())")
            if let detail = stage.detail { line("   " + detail) }
        }
        data.append(PrinterCommand.selectOrCancleBoldModel(1))
        line("\(block.collectedLabel): \(block.collected.formatStringInCommon())")
        line("\(block.remainingLabel): \(block.remaining.formatStringInCommon())")
        data.append(PrinterCommand.selectOrCancleBoldModel(0))
        return data
    }
}
