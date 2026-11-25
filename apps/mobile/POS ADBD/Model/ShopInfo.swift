//
//  ShopInfo.swift
//  POS ADBD
//
//  #1313: the owner edits the shop and each branch on the phone; the branch manager edits own branch; staff only view.
//  Pure rules (who edits what, the address line, validation, the PUT bodies). Android: `ShopInfoLogic.kt`.
//

import Foundation

/// The shop form (PUT /api/settings/merchant). `address` = street, `state` = ward / district, `city` = province, as on the web.
struct ShopFormValues: Equatable {
    var name = ""
    var phone = ""
    var taxId = ""
    var address = ""
    var state = ""
    var city = ""
    var country = ""
    var zipCode = ""
    var description = ""
}

/// The branch form (PUT /api/outlets?outletId=)
struct BranchFormValues: Equatable {
    var name = ""
    var phone = ""
    var address = ""
    /// #1643: nil = the links were not loaded from the API, so they are not sent (the branch keeps its links)
    var links: [OutletLink]? = nil
}

/// A branch in the owner's list
struct BranchRow: Equatable {
    let id: Int
    let name: String
    let isActive: Bool?
    let isDefault: Bool?
}

enum ShopFormProblem: Equatable { case nameRequired, addressRequired }

enum ShopInfoLogic {
    /// #1539 (app): rows of the CỬA HÀNG block
    enum ShopRow: Equatable { case shop, currency, emailLanguage }

    /// The shop card, Tiền tệ, then Ngôn ngữ email when it is shown
    static func shopRows(emailLanguage: SignupLanguage?) -> [ShopRow] {
        emailLanguage == nil ? [.shop, .currency] : [.shop, .currency, .emailLanguage]
    }

    /// What the Settings row opens
    enum Destination: Equatable {
        /// MERCHANT: the shop card and the list of branches
        case shopAndBranches
        /// Everyone else: the form of the own branch (editable for the branch manager, read-only for staff)
        case ownBranch(editable: Bool)
    }

    /// Row title like the web: the owner "Thông tin cửa hàng", other roles "Thông tin chi nhánh" (localization keys)
    static func rowTitleKey(role: Role?) -> String {
        role == .merchant ? "Store Information" : "Branch Information"
    }

    static func destination(role: Role?) -> Destination {
        switch role {
        case .merchant: return .shopAndBranches
        case .outletAdmin: return .ownBranch(editable: true)
        default: return .ownBranch(editable: false)
        }
    }

    /// Second text of the Settings row: the owner "3 chi nhánh" (once known), the branch manager the branch name, staff "Chỉ xem"
    static func rowValue(role: Role?, branchName: String?, branchCount: Int?, countText: (Int) -> String, readOnlyText: String) -> String? {
        switch role {
        case .merchant:
            return branchCount.map(countText)
        case .outletAdmin:
            let name = (branchName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            return name.isEmpty ? nil : name
        default:
            return readOnlyText
        }
    }

    /// The shop (name, phone, tax id, address, …) is the owner's (the API allows `merchant.manage`; the app only offers it to the owner)
    static func canEditShop(role: Role?) -> Bool { role == .merchant }

    /// The owner edits every branch of the shop, the branch manager only their own; staff none
    static func canEditBranch(role: Role?, branchId: Int, ownBranchId: Int?) -> Bool {
        switch role {
        case .merchant: return true
        case .outletAdmin: return ownBranchId != nil && ownBranchId == branchId
        default: return false
        }
    }

    /// "12 Lê Lợi, Quận 1, TP. Hồ Chí Minh": street, ward / district, province; empty and repeated parts skipped (web `addressLine`)
    static func addressLine(address: String?, state: String?, city: String?) -> String {
        var parts: [String] = []
        for part in [address, state, city] {
            let value = (part ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            if !value.isEmpty && !parts.contains(value) { parts.append(value) }
        }
        return parts.joined(separator: ", ")
    }

    /// "0900 000 001 · MST 0123456789"
    static func shopSummary(phone: String?, taxId: String?, taxIdLabel: String) -> String {
        let phoneText = (phone ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let tax = (taxId ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        var parts: [String] = []
        if !phoneText.isEmpty { parts.append(phoneText) }
        if !tax.isEmpty { parts.append("\(taxIdLabel) \(tax)") }
        return parts.joined(separator: " · ")
    }

    static func problem(shop: ShopFormValues) -> ShopFormProblem? {
        trimmed(shop.name).isEmpty ? .nameRequired : nil
    }

    static func problem(branch: BranchFormValues) -> ShopFormProblem? {
        if trimmed(branch.name).isEmpty { return .nameRequired }
        if trimmed(branch.address).isEmpty { return .addressRequired }
        return nil
    }

    /// Body of PUT /api/settings/merchant: text trimmed, an empty text clears the field; no website
    static func shopPayload(_ form: ShopFormValues) -> [String: Any] {
        [
            "name": trimmed(form.name),
            "phone": trimmed(form.phone),
            "taxId": trimmed(form.taxId),
            "address": trimmed(form.address),
            "state": trimmed(form.state),
            "city": trimmed(form.city),
            "country": trimmed(form.country),
            "zipCode": trimmed(form.zipCode),
            "description": trimmed(form.description),
        ]
    }

    /// Body of PUT /api/outlets?outletId=. `links` only when they were loaded (an empty list clears them)
    static func branchPayload(_ form: BranchFormValues) -> [String: Any] {
        var payload: [String: Any] = ["name": trimmed(form.name), "phone": trimmed(form.phone), "address": trimmed(form.address)]
        if let links = form.links { payload["links"] = OutletLinkLogic.payload(links) }
        return payload
    }

    /// Open branches only, the main one first, the API order kept otherwise
    static func branchRows(_ rows: [BranchRow]) -> [BranchRow] {
        let open = rows.filter { $0.isActive ?? true }
        return open.filter { $0.isDefault == true } + open.filter { $0.isDefault != true }
    }

    private static func trimmed(_ text: String) -> String { text.trimmingCharacters(in: .whitespacesAndNewlines) }
}

/// #1539 (app): "Ngôn ngữ email" in Thông tin cửa hàng (verification, password reset and plan emails)
enum EmailLanguageLogic {
    /// The owner sees it once GET /api/users/profile sends `merchant.language`; older APIs do not, so it stays hidden
    static func visibleLanguage(role: Role?, profileLanguage: String?) -> SignupLanguage? {
        guard role == .merchant else { return nil }
        return SignupLanguage.parse(profileLanguage)
    }

    /// PUT /api/settings/merchant with only the language
    static func body(_ language: SignupLanguage) -> [String: Any] {
        ["language": language.rawValue]
    }
}

// MARK: - Links of a branch (#1643)

/// What `GET /api/outlets` sends for a link. `type` stays a String so a network added later does not fail the whole decode.
struct OutletLinkEntry: Codable, Equatable {
    let type: String
    let url: String
    let label: String?
}

enum OutletLinkType: String, CaseIterable {
    case website, facebook, instagram, tiktok, youtube, zalo, other
}

/// A link that passed the rules; `label` only for `other`
struct OutletLink: Equatable {
    var type: OutletLinkType
    var url: String
    var label: String? = nil
}

/// `invalid` = not a usable http(s) address; `platform` = a valid address but not of the chosen network
enum OutletLinkError: Error, Equatable { case invalid, platform, labelRequired, labelTooLong }

enum OutletLinksResult: Equatable {
    case ok([OutletLink])
    case tooMany
    case invalid(index: Int, reason: OutletLinkError)
}

/// The rules of the web (`packages/utils/src/core/outlet-links.ts`) and the API; same cases in `tests/outlet-links.test.ts`.
/// Android: `OutletLinkLogic` in `ShopInfoLogic.kt`.
enum OutletLinkLogic {
    static let maxLinks = 6
    static let maxUrl = 300
    static let maxLabel = 30

    /// Hosts each network may use (a subdomain such as `www.` or `m.` also counts); website / other take any host
    private static func hosts(_ type: OutletLinkType) -> [String]? {
        switch type {
        case .website, .other: return nil
        case .facebook: return ["facebook.com", "fb.com", "fb.me"]
        case .instagram: return ["instagram.com"]
        case .tiktok: return ["tiktok.com"]
        case .youtube: return ["youtube.com", "youtu.be"]
        case .zalo: return ["zalo.me", "zalo.com"]
        }
    }

    /// Names of the networks, the same in every language; nil for website / other (the screens translate those)
    static func brandName(_ type: OutletLinkType) -> String? {
        switch type {
        case .facebook: return "Facebook"
        case .instagram: return "Instagram"
        case .tiktok: return "TikTok"
        case .youtube: return "YouTube"
        case .zalo: return "Zalo"
        case .website, .other: return nil
        }
    }

    /// Typed example shown as the URL placeholder
    static func example(_ type: OutletLinkType) -> String {
        switch type {
        case .website: return "tenshop.vn"
        case .facebook: return "facebook.com/tenshop"
        case .instagram: return "instagram.com/tenshop"
        case .tiktok: return "tiktok.com/@tenshop"
        case .youtube: return "youtube.com/@tenshop"
        case .zalo: return "zalo.me/0901234567"
        case .other: return "shopee.vn/tenshop"
        }
    }

    private static func matches(_ text: String, _ pattern: String) -> Bool {
        text.range(of: pattern, options: [.regularExpression, .caseInsensitive]) != nil
    }

    /// `https://` added when the owner typed no scheme; anything else with a scheme (`javascript:`, `mailto:`) is refused.
    private static func address(_ raw: String) -> String? {
        let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if text.isEmpty || text.count > maxUrl { return nil }
        let hasHttp = matches(text, "^https?://")
        if !hasHttp && matches(text, "^[a-z][a-z0-9+.-]*:") && !matches(text, "^[^/\\s:]+\\.[^/\\s:]+:\\d+") { return nil }
        guard let parts = URLComponents(string: hasHttp ? text : "https://\(text)") else { return nil }
        guard let scheme = parts.scheme?.lowercased(), scheme == "http" || scheme == "https" else { return nil }
        if parts.user != nil || parts.password != nil { return nil }
        guard let host = parts.host?.lowercased(), host.contains("."), !host.hasPrefix("."), !host.hasSuffix(".") else { return nil }
        var out = "\(scheme)://\(host)"
        if let port = parts.port { out += ":\(port)" }
        let path = parts.percentEncodedPath
        let query = parts.percentEncodedQuery.map { "?\($0)" } ?? ""
        let fragment = parts.percentEncodedFragment.map { "#\($0)" } ?? ""
        // a bare host has no trailing slash; a slash is kept when a query or fragment follows
        if path.isEmpty || path == "/" {
            if !query.isEmpty || !fragment.isEmpty { out += "/" }
        } else {
            out += path
        }
        return out + query + fragment
    }

    private static func hostMatches(_ url: String, _ allowed: [String]) -> Bool {
        guard let host = URLComponents(string: url)?.host?.lowercased() else { return false }
        return allowed.contains { host == $0 || host.hasSuffix(".\($0)") }
    }

    static func normalize(type: OutletLinkType, url: String, label: String? = nil) -> Result<OutletLink, OutletLinkError> {
        guard let stored = address(url) else { return .failure(.invalid) }
        if let allowed = hosts(type), !hostMatches(stored, allowed) { return .failure(.platform) }
        var link = OutletLink(type: type, url: stored)
        if type == .other {
            let name = (label ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            if name.isEmpty { return .failure(.labelRequired) }
            if name.count > maxLabel { return .failure(.labelTooLong) }
            link.label = name
        }
        return .success(link)
    }

    /// A whole list (the form's Lưu): each one normalised, exact repeats dropped, at most 6
    static func normalizeList(_ list: [OutletLinkEntry]) -> OutletLinksResult {
        var links: [OutletLink] = []
        for (index, raw) in list.enumerated() {
            guard let type = OutletLinkType(rawValue: raw.type) else { return .invalid(index: index, reason: .invalid) }
            switch normalize(type: type, url: raw.url, label: raw.label) {
            case .failure(let reason): return .invalid(index: index, reason: reason)
            case .success(let link): if !links.contains(link) { links.append(link) }
            }
        }
        return links.count > maxLinks ? .tooMany : .ok(links)
    }

    /// Reads what the API sent (never fails): keeps links that still pass the rules, at most 6
    static func parseStored(_ entries: [OutletLinkEntry]?) -> [OutletLink] {
        var out: [OutletLink] = []
        for raw in entries ?? [] {
            if out.count >= maxLinks { break }
            guard let type = OutletLinkType(rawValue: raw.type), case .success(let link) = normalize(type: type, url: raw.url, label: raw.label) else { continue }
            out.append(link)
        }
        return out
    }

    /// The `links` of the PUT body
    static func payload(_ links: [OutletLink]) -> [[String: Any]] {
        links.map { link in
            var item: [String: Any] = ["type": link.type.rawValue, "url": link.url]
            if link.type == .other, let label = link.label { item["label"] = label }
            return item
        }
    }
}
