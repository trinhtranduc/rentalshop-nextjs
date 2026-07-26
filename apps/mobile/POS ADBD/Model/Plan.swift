//
//  Plan.swift
//  POS ADBD
//
//  Created by Assistant on 2025-10-22.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation

// MARK: - Plan Model (Codable) - Pure data model

struct Plan: Codable {
    let id: Int
    let name: String
    let description: String
    let basePrice: Double
    let currency: String
    let trialDays: Int
    let limits: String?
    let features: String?
    let isActive: Bool?
    let isPopular: Bool?
    let sortOrder: Int?
    let createdAt: Date?
    let updatedAt: Date?
    let deletedAt: Date?
}

