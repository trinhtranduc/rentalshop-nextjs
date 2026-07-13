//
//  Merchant.swift
//  POS ADBD
//
//  Created by Assistant on 2025-10-22.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation

// MARK: - Merchant Model (Codable) - Pure data model

struct Merchant: Codable {
    let id: Int
    let name: String
    let email: String?
    let phone: String?
    let address: String?
    let city: String?
    let state: String?
    let zipCode: String?
    let country: String?
    let businessType: String?
    let taxId: String?
    let currency: String?
    let pricingType: String?
    let subscription: Subscription?
    
    // Optional fields from documentation (may not be in login response)
    let website: String?
    let description: String?
    let planId: Int?
    let totalRevenue: Double?
    let lastActiveAt: Date?
    let isActive: Bool?
    let createdAt: Date?
    let updatedAt: Date?
    let pricingConfig: String?
}

