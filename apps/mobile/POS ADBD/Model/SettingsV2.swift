//
//  SettingsV2.swift
//  POS ADBD
//
//  Redesigned settings (#374): one grouped list linking the existing sub-screens. Rows follow the role rules of
//  the current settings screen.
//

import Foundation

enum SettingsV2Item: Equatable {
    /// #1270 CỬA HÀNG (plan B): Thông tin cửa hàng, Tiền tệ (owner only), Tài khoản ngân hàng (owner, outlet admin),
    /// Cọc (screen with two sections), In & phiếu (screen with two sections)
    case storeInfo, currency, bankAccounts, deposit, printing
    case categories, customers, users, export
    /// #1259 TÀI KHOẢN: Gói dịch vụ, Ngôn ngữ, Nâng cao (Thông tin ứng dụng + Xoá tài khoản)
    case plan, language, advanced
}

struct SettingsV2Section: Equatable {
    enum Group: Equatable { case store, management, account }
    let group: Group
    let items: [SettingsV2Item]

    var title: String {
        switch group {
        case .store: return "settings.v2.group.store".localized()
        case .management: return "settings.v2.group.management".localized()
        case .account: return "settings.v2.group.account".localized()
        }
    }
}

enum SettingsV2Logic {
    /// Sections for a role (#1270 plan B: 3 groups, 12 rows for the owner plus the overlap switch, the name card and the bell).
    /// - customers: the redesigned list (#387) when `showsCustomers` (flag `newCustomers`) and any customer right
    /// - users: `users.manage` (as today)
    /// - export: any export right and never OUTLET_STAFF (as today)
    /// - plan: shown once `subscriptions/status` answered
    /// - categories (#632): whoever may add one (`CategoryRules.canAdd`: MERCHANT, OUTLET_ADMIN); never OUTLET_STAFF
    /// - notifications (#937): not a row any more; the bell at the top right of Cài đặt (every role, with the unread badge)
    /// - the bank accounts line (#622) and the owner's currency (#1145) sit inside Thu tiền / Thông tin cửa hàng
    static func sections(role: Role?, permissions: [String], hasPlan: Bool, showsCustomers: Bool = false) -> [SettingsV2Section] {
        var storeItems: [SettingsV2Item] = [.storeInfo]
        if ShopCurrencyLogic.canChange(role: role) { storeItems.append(.currency) }
        if canManageBankAccounts(role: role) { storeItems.append(.bankAccounts) }
        if ShopDepositLogic.canView(role: role) { storeItems.append(.deposit) }
        storeItems.append(.printing)
        let store = SettingsV2Section(group: .store, items: storeItems)

        var management: [SettingsV2Item] = []
        if CategoryRules.canAdd(role: role, permissions: permissions) { management.append(.categories) }
        if showsCustomers, permissions.contains(where: { ["customers.view", "customers.manage"].contains($0) }) {
            management.append(.customers)
        }
        if permissions.contains("users.manage") { management.append(.users) }
        let exportRights = ["products.export", "products.manage", "orders.export", "orders.manage",
                            "customers.export", "customers.manage", "analytics.export", "analytics.view"]
        // #682: Nhân viên kho exports products on the web only; the export screen also lists orders and customers
        if !(role?.isStaffLike ?? false), permissions.contains(where: { exportRights.contains($0) }) {
            management.append(.export)
        }

        var account: [SettingsV2Item] = []
        if hasPlan { account.append(.plan) }
        account += [.language, .advanced]

        return [store, SettingsV2Section(group: .management, items: management),
                SettingsV2Section(group: .account, items: account)]
            .filter { !$0.items.isEmpty }
    }

    /// "80 mm" once a printer is saved, else "80 mm · chưa chọn máy in"
    static func printingValue(hasPrinter: Bool, paperMillimetres: Int, none: String) -> String {
        hasPrinter ? "\(paperMillimetres) mm" : "\(paperMillimetres) mm · \(none)"
    }

    /// Cọc screen: "Mẫu giai đoạn" and "Chính sách huỷ / dời ngày" look dimmed in "Thu cọc 1 lần" (still tappable)
    static func depositStagesDimmed(staged: Bool) -> Bool { !staged }

    /// #937: badge on the "Thông báo" row: the unread count, capped at 99, none at 0
    static func unreadBadge(_ count: Int) -> String? {
        count > 0 ? "\(min(count, 99))" : nil
    }

    /// Bank accounts screen (#622): owners and outlet admins; staff only print the account
    static func canManageBankAccounts(role: Role?) -> Bool {
        role == .merchant || role == .outletAdmin
    }

    /// "MT" from "Merchant Tran"; one letter for one word; "?" when empty
    static func initials(_ name: String) -> String {
        let words = name.split(separator: " ").filter { !$0.isEmpty }
        let letters = (words.count > 1 ? [words.first!, words.last!] : Array(words.prefix(1)))
            .compactMap { $0.first.map { String($0).uppercased() } }
        return letters.isEmpty ? "?" : letters.joined()
    }

    /// "Dùng thử · còn 43 ngày", "Basic · hết hạn"
    static func planText(_ plan: SettingsPlan) -> String {
        let name = plan.isTrial ? "settings.v2.plan.trial".localized() : plan.name
        if plan.isExpired { return "\(name) · \("settings.v2.plan.expired".localized())" }
        if let days = plan.daysRemaining {
            return "\(name) · \(String(format: "settings.v2.plan.daysLeft".localized(), days))"
        }
        return name
    }

    /// Minimum length the API accepts for a new password
    static let minPasswordLength = 6

    enum PasswordProblem: Equatable { case missingCurrent, tooShort, mismatch }

    static func validatePassword(current: String, new: String, confirm: String) -> PasswordProblem? {
        if current.isEmpty { return .missingCurrent }
        if new.count < minPasswordLength { return .tooShort }
        if new != confirm { return .mismatch }
        return nil
    }
}

/// The plan of GET /api/subscriptions/status
struct SettingsPlan: Decodable, Equatable {
    let name: String
    let isTrial: Bool
    let isExpired: Bool
    let daysRemaining: Int?

    enum CodingKeys: String, CodingKey { case planName, status, dbStatus, daysRemaining }

    init(name: String, isTrial: Bool, isExpired: Bool, daysRemaining: Int?) {
        self.name = name
        self.isTrial = isTrial
        self.isExpired = isExpired
        self.daysRemaining = daysRemaining
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let rawName = ((try? c.decodeIfPresent(String.self, forKey: .planName)) ?? nil)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        name = rawName.isEmpty ? "—" : rawName
        let status = (((try? c.decodeIfPresent(String.self, forKey: .status)) ?? nil) ?? "").uppercased()
        let dbStatus = (((try? c.decodeIfPresent(String.self, forKey: .dbStatus)) ?? nil) ?? "").uppercased()
        isTrial = dbStatus == "TRIAL"
        isExpired = status == "EXPIRED"
        daysRemaining = (try? c.decodeIfPresent(Int.self, forKey: .daysRemaining)) ?? nil
    }
}

struct SettingsPlanResponse: Decodable {
    let success: Bool
    let data: SettingsPlan?
}

/// `total` of a list endpoint called with `limit=1` (#388): customers answer `data.total`, users `pagination.total`
struct SettingsListTotal: Codable {
    let total: Int?

    private enum Keys: String, CodingKey { case data, pagination }
    private enum TotalKeys: String, CodingKey { case total }

    init(total: Int?) { self.total = total }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        func read(_ key: Keys) -> Int? {
            guard let nested = try? c.nestedContainer(keyedBy: TotalKeys.self, forKey: key) else { return nil }
            return (try? nested.decodeIfPresent(Int.self, forKey: .total)) ?? nil
        }
        total = read(.data) ?? read(.pagination)
    }

    func encode(to encoder: Encoder) throws {}

    /// The list that gives the count next to a settings row
    static func path(for item: SettingsV2Item) -> String? {
        switch item {
        case .customers: return "/api/customers"
        case .users: return "/api/users"
        default: return nil
        }
    }
}

// MARK: - Shop currency (#1145)

extension Notification.Name {
    /// The shop currency changed: money on screen is redrawn
    static let shopCurrencyDidChange = Notification.Name("shopCurrencyDidChange")
}

/// The shop currency cached on the signed-in user (login `merchant.currency`), refreshed from
/// GET /api/settings/currency (Cài đặt, app back in front, Tổng quan; every role) and changed there by the shop owner
enum ShopCurrencyStore {
    private static var cached: ShopCurrency?
    private static var lastRefresh: Date?
    /// A save is on its way: a refresh must not overwrite it
    static var saving = false

    /// The cached user's currency; VND without one. Read once, then kept until the user changes.
    static var current: ShopCurrency {
        if let cached { return cached }
        let value = ShopCurrency.normalise(User.current()?.currency)
        cached = value
        return value
    }

    /// A user was saved or signed out: read the currency again next time
    static func userDidChange() { cached = nil }

    /// Writes the value into the cached user; posts `.shopCurrencyDidChange` when it changed
    static func store(_ currency: ShopCurrency) {
        let previous = current
        if let user = User.account(), user.merchant != nil, user.merchant?.currency != currency.rawValue {
            user.merchant?.currency = currency.rawValue
            User.save(user: user)
        }
        cached = currency
        if previous != currency {
            NotificationCenter.default.post(name: .shopCurrencyDidChange, object: nil)
        }
    }

    /// Reads the shop's currency, at most once a minute unless forced (an owner may change it on another device).
    /// Completion runs on the main queue with the value in effect.
    static func refresh(force: Bool = false, completion: ((ShopCurrency) -> Void)? = nil) {
        // #1307: every shop role reads it (the row is owner-only, the read is not); ADMIN has no shop
        guard let user = User.account(), user.merchant != nil,
              ShopCurrencyLogic.shouldRefresh(role: user.role, lastRefresh: lastRefresh, now: Date(), force: force) else {
            completion?(current)
            return
        }
        lastRefresh = Date()
        TabsV2APIService.shared.shopCurrency { currency, _ in
            DispatchQueue.main.async {
                if let currency, !saving { store(currency) }
                completion?(current)
            }
        }
    }
}

enum ShopDepositLogic {
    /// #1310 the "Thu cọc" row: the shop owner only (`PUT /api/settings/deposit` is MERCHANT only). Orders still read the mode for every role.
    static func canView(role: Role?) -> Bool { role == .merchant }
}

enum ShopCurrencyLogic {
    /// The "Tiền tệ" row: the shop owner only (the API refuses others with 403)
    static func canChange(role: Role?) -> Bool { role == .merchant }

    /// #1307 reading the shop currency: every shop role, so staff follow the owner's change (not ADMIN, who has no shop)
    static func canRefresh(role: Role?) -> Bool { role != nil && role != .admin }

    /// #1307 read at most once a minute unless forced
    static func shouldRefresh(role: Role?, lastRefresh: Date?, now: Date, force: Bool) -> Bool {
        guard canRefresh(role: role) else { return false }
        if force { return true }
        guard let lastRefresh else { return true }
        return now.timeIntervalSince(lastRefresh) >= 60
    }

    /// The example in the confirm: 220000 in the old currency → in the new one ("220.000 → $220,000")
    static func example(from: ShopCurrency, to: ShopCurrency) -> String {
        MoneyFormatter.format(220_000, currency: from) + " → " + MoneyFormatter.format(220_000, currency: to)
    }

    /// "Đổi tiền tệ sang USD?"
    static func confirmTitle(to: ShopCurrency) -> String {
        String(format: "settings.v2.currency.confirm.title".localized(), to.rawValue)
    }

    /// "Mọi giá trong app sẽ hiện bằng USD. Số tiền giữ nguyên, không quy đổi (220.000 → $220,000)."
    static func confirmMessage(from: ShopCurrency, to: ShopCurrency) -> String {
        String(format: "settings.v2.currency.confirm.message".localized(), to.rawValue, example(from: from, to: to))
    }

    /// "Đổi sang USD"
    static func confirmButton(to: ShopCurrency) -> String {
        String(format: "settings.v2.currency.confirm.button".localized(), to.rawValue)
    }
}
