//
//  SettingsV2.swift
//  POS ADBD
//
//  Redesigned settings (#374): one grouped list linking the existing sub-screens. Rows follow the role rules of
//  the current settings screen.
//

import Foundation

enum SettingsV2Item: Equatable {
    /// #937: the inbox, moved here from the Home bell
    case notifications
    case storeInfo, receiptNote, printer, bankAccounts
    /// #1145 "Tiền tệ", shop owner only, right after "Thông tin cửa hàng"
    case currency
    /// #1199 "Cách thu cọc": every role sees it; only the shop owner changes it
    case depositMode
    case categories, customers, users, export
    case plan, language, password, appInfo, deleteAccount
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
    /// Sections for a role.
    /// - customers: the redesigned list (#387) when `showsCustomers` (flag `newCustomers`) and any customer right
    /// - users: `users.manage` (as today)
    /// - export: any export right and never OUTLET_STAFF (as today)
    /// - plan: shown once `subscriptions/status` answered
    /// - bankAccounts (#622): MERCHANT and OUTLET_ADMIN (the API rejects writes from OUTLET_STAFF)
    /// - categories (#632): whoever may add one (`CategoryRules.canAdd`: MERCHANT, OUTLET_ADMIN); never OUTLET_STAFF
    /// - notifications (#937): every role, first row of CỬA HÀNG (the Home bell became the cart button)
    /// - currency (#1145): MERCHANT only, after storeInfo
    static func sections(role: Role?, permissions: [String], hasPlan: Bool, showsCustomers: Bool = false) -> [SettingsV2Section] {
        var storeItems: [SettingsV2Item] = [.notifications, .storeInfo]
        if ShopCurrencyLogic.canChange(role: role) { storeItems.append(.currency) }
        storeItems += [.receiptNote, .printer]
        if canManageBankAccounts(role: role) { storeItems.append(.bankAccounts) }
        storeItems.append(.depositMode)
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
        account += [.language, .password, .appInfo, .deleteAccount]

        return [store, SettingsV2Section(group: .management, items: management),
                SettingsV2Section(group: .account, items: account)]
            .filter { !$0.items.isEmpty }
    }

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
/// GET /api/settings/currency on Cài đặt and changed there by the shop owner
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
        guard User.account()?.merchant != nil else {
            completion?(current)
            return
        }
        if !force, let lastRefresh, Date().timeIntervalSince(lastRefresh) < 60 {
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

enum ShopCurrencyLogic {
    /// The "Tiền tệ" row: the shop owner only (the API refuses others with 403)
    static func canChange(role: Role?) -> Bool { role == .merchant }

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
