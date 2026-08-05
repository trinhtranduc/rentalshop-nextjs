//
//  SubscriptionStatusInfo.swift
//  POS ADBD
//
//  DTO for GET /api/subscriptions/status (renew UI).
//

import Foundation

struct SubscriptionStatusInfo: Codable {
    let planName: String?
    let status: String?
    let statusReason: String?
    let daysRemaining: Int?
    let isExpiringSoon: Bool?
    let currentPeriodEnd: String?
    let hasAccess: Bool?

    var displayPlanName: String {
        let name = planName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return name.isEmpty ? "—".localized() : name
    }

    var displayStatus: String {
        (status ?? "UNKNOWN").uppercased()
    }
}
