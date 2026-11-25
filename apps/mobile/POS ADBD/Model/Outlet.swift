//
//  Outlet.swift
//  POS ADBD
//
//  Created by Assistant on 2025-10-22.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation

// MARK: - Outlet Model (Codable) - Pure data model

struct Outlet: Codable {
    let id: Int
    let name: String
    let address: String?
    let description: String?
    let isActive: Bool?
    let isDefault: Bool?
    let createdAt: Date?
    let updatedAt: Date?
    let merchantId: Int? // Optional - not always present in API responses (e.g., register response)
    let phone: String?
    let city: String?
    let country: String?
    let state: String?
    let zipCode: String?
    /// #1308: what the branch prints on its bills (`GET /api/outlets`); nil on an older payload
    var printNote: String? = nil
    var printBankQr: Bool? = nil
    /// #1643: links of the branch shown on its public shop page; nil on an older payload (then the app does not send `links`)
    var links: [OutletLinkEntry]? = nil
}
