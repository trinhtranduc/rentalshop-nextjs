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

    /// Body of PUT /api/outlets?outletId=
    static func branchPayload(_ form: BranchFormValues) -> [String: Any] {
        ["name": trimmed(form.name), "phone": trimmed(form.phone), "address": trimmed(form.address)]
    }

    /// Open branches only, the main one first, the API order kept otherwise
    static func branchRows(_ rows: [BranchRow]) -> [BranchRow] {
        let open = rows.filter { $0.isActive ?? true }
        return open.filter { $0.isDefault == true } + open.filter { $0.isDefault != true }
    }

    private static func trimmed(_ text: String) -> String { text.trimmingCharacters(in: .whitespacesAndNewlines) }
}
