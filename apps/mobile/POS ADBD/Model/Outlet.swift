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
}
