//
//  SettingsV2.swift
//  POS ADBD
//
//  Redesigned settings (#374): one grouped list linking the existing sub-screens. Rows follow the role rules of
//  the current settings screen.
//

import Foundation

enum SettingsV2Item: Equatable {
    case storeInfo, receiptNote, printer
    case users, export
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
    /// Sections for a role. iOS has no customer list screen, so "Khách hàng" is not listed here.
    /// - users: `users.manage` (as today)
    /// - export: any export right and never OUTLET_STAFF (as today)
    /// - plan: shown once `subscriptions/status` answered
    static func sections(role: Role?, permissions: [String], hasPlan: Bool) -> [SettingsV2Section] {
        let store = SettingsV2Section(group: .store, items: [.storeInfo, .receiptNote, .printer])

        var management: [SettingsV2Item] = []
        if permissions.contains("users.manage") { management.append(.users) }
        let exportRights = ["products.export", "products.manage", "orders.export", "orders.manage",
                            "customers.export", "customers.manage", "analytics.export", "analytics.view"]
        if role != .outletStaff, permissions.contains(where: { exportRights.contains($0) }) {
            management.append(.export)
        }

        var account: [SettingsV2Item] = []
        if hasPlan { account.append(.plan) }
        account += [.language, .password, .appInfo, .deleteAccount]

        return [store, SettingsV2Section(group: .management, items: management),
                SettingsV2Section(group: .account, items: account)]
            .filter { !$0.items.isEmpty }
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
