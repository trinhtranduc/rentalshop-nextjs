//
//  Subscription.swift
//  POS ADBD
//
//  Created by Assistant on 2025-10-22.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation

// MARK: - Subscription Model (Codable) - Pure data model

struct Subscription: Codable {
    let id: Int
    let merchantId: Int
    let planId: Int
    let status: String
    let currentPeriodStart: Date
    let currentPeriodEnd: Date
    let trialStart: Date?
    let trialEnd: Date?
    let cancelAtPeriodEnd: Bool
    let canceledAt: Date?
    let cancelReason: String?
    let amount: Double
    let currency: String
    let interval: String
    let intervalCount: Int
    let period: Int?
    let discount: Double?
    let savings: Double?
    let createdAt: Date?
    let updatedAt: Date?
    let plan: Plan?
}

