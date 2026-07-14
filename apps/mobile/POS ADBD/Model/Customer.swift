//
//  Customer.swift
//  POS ADBD
//
//  Created by Tran Trinh on 11/13/19.
//  Copyright © 2019 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit

struct CustomerLoyaltyTier: Codable {
    var id: Int
    var name: String
    var color: String?
    var icon: String?
    var multiplier: Double?
}

struct CustomerLoyaltySnapshot: Codable {
    var points: Int
    var totalEarned: Int
    var totalRedeemed: Int
    var totalSpent: Double
    var totalOrders: Int
    var tier: CustomerLoyaltyTier?
}

enum CustomerLoyaltyStatus: String, Codable {
    case active
    case inactive
    case unavailable
}

enum CustomerLoyaltyDisplayState {
    case active
    case legacy
    case inactive
    case unavailable
    case none
}

struct Customer: Codable, Comparable, Copying {
    // Legacy fields for backward compatibility
    var full_name: String?
    var customer_id: Int = 0
    var email: String?
    var address: String?
    var customer_level: String?
    var avatar: String?
    var phone: String?
    var rental_point: Int = 0
    var sale_point: Int = 0
    var loyalty: CustomerLoyaltySnapshot?
    var loyaltyStatus: CustomerLoyaltyStatus?
    
    // New API fields according to documentation
    var id: Int?
    var firstName: String?
    var lastName: String?
    var city: String?
    var state: String?
    var country: String?
    var isActive: Bool?
    var merchantId: Int?
    var createdAt: String?
    var zipCode: String?
    var updatedAt: String?

    init() {}
    
    // Copying protocol implementation
    init(original: Customer) {
        self.full_name = original.full_name
        self.customer_id = original.customer_id
        self.email = original.email
        self.address = original.address
        self.customer_level = original.customer_level
        self.avatar = original.avatar
        self.phone = original.phone
        self.rental_point = original.rental_point
        self.sale_point = original.sale_point
        self.loyalty = original.loyalty
        self.loyaltyStatus = original.loyaltyStatus
        self.id = original.id
        self.firstName = original.firstName
        self.lastName = original.lastName
        self.city = original.city
        self.state = original.state
        self.zipCode = original.zipCode
        self.country = original.country
        self.isActive = original.isActive
        self.merchantId = original.merchantId
        self.createdAt = original.createdAt
        self.updatedAt = original.updatedAt
    }
    
    // MARK: - Codable Implementation
    
    enum CodingKeys: String, CodingKey {
        // Legacy fields
        case customer_id
        case email
        case address
        case customer_level
        case avatar
        case phone
        case rental_point = "royal_rental_point"
        case sale_point = "royal_sale_point"
        case loyalty
        case loyaltyStatus
        
        // New API fields
        case id
        case firstName
        case lastName
        case city
        case state
        case zipCode
        case country
        case isActive
        case merchantId
        case createdAt
        case updatedAt
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Handle both old and new API formats
        // ID mapping - prefer new format first
        if let idValue = try? container.decode(Int.self, forKey: .id) {
            self.customer_id = idValue
            self.id = idValue
        } else {
            self.customer_id = try container.decodeIfPresent(Int.self, forKey: .customer_id) ?? 0
        }
        
        self.firstName = try container.decodeIfPresent(String.self, forKey: .firstName)
        self.lastName = try container.decodeIfPresent(String.self, forKey: .lastName)
        
        // Build full_name: only include non-empty firstName and lastName
        let nameParts = [self.firstName, self.lastName].compactMap { name -> String? in
            guard let name = name else { return nil }
            let trimmed = name.trimmingCharacters(in: .whitespaces)
            return trimmed.isEmpty ? nil : trimmed
        }
        self.full_name = nameParts.joined(separator: " ")
        
        self.email = try container.decodeIfPresent(String.self, forKey: .email)
        self.address = try container.decodeIfPresent(String.self, forKey: .address)
        self.customer_level = try container.decodeIfPresent(String.self, forKey: .customer_level)
        self.avatar = try container.decodeIfPresent(String.self, forKey: .avatar)
        self.phone = try container.decodeIfPresent(String.self, forKey: .phone)
        
        // Points mapping with fallback
        self.rental_point = try container.decodeIfPresent(Int.self, forKey: .rental_point) ?? 0
        self.sale_point = try container.decodeIfPresent(Int.self, forKey: .sale_point) ?? 0
        self.loyalty = try container.decodeIfPresent(CustomerLoyaltySnapshot.self, forKey: .loyalty)
        self.loyaltyStatus = try container.decodeIfPresent(CustomerLoyaltyStatus.self, forKey: .loyaltyStatus)
        
        // New API fields
        self.city = try container.decodeIfPresent(String.self, forKey: .city)
        self.state = try container.decodeIfPresent(String.self, forKey: .state)
        self.zipCode = try container.decodeIfPresent(String.self, forKey: .zipCode)
        self.country = try container.decodeIfPresent(String.self, forKey: .country)
        self.isActive = try container.decodeIfPresent(Bool.self, forKey: .isActive)
        self.merchantId = try container.decodeIfPresent(Int.self, forKey: .merchantId)
        self.createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt)
        self.updatedAt = try container.decodeIfPresent(String.self, forKey: .updatedAt)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        
        // Legacy fields
        try container.encode(customer_id, forKey: .customer_id)
        try container.encodeIfPresent(email, forKey: .email)
        try container.encodeIfPresent(address, forKey: .address)
        try container.encodeIfPresent(customer_level, forKey: .customer_level)
        try container.encodeIfPresent(avatar, forKey: .avatar)
        try container.encodeIfPresent(phone, forKey: .phone)
        try container.encode(rental_point, forKey: .rental_point)
        try container.encode(sale_point, forKey: .sale_point)
        try container.encodeIfPresent(loyalty, forKey: .loyalty)
        try container.encodeIfPresent(loyaltyStatus, forKey: .loyaltyStatus)
        
        // New API fields
        try container.encodeIfPresent(id, forKey: .id)
        try container.encodeIfPresent(firstName, forKey: .firstName)
        try container.encodeIfPresent(lastName, forKey: .lastName)
        try container.encodeIfPresent(city, forKey: .city)
        try container.encodeIfPresent(state, forKey: .state)
        try container.encodeIfPresent(country, forKey: .country)
        try container.encodeIfPresent(isActive, forKey: .isActive)
        try container.encodeIfPresent(merchantId, forKey: .merchantId)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
    }
    
    // MARK: - Static Methods
    
    static func filter(text: String, customers: [Customer]) -> ([Customer], [String]){
        var result = customers
        var words : [String] = []
        for word in text.lowercased().components(separatedBy: " "){
            if word.count != 0{
                result = Customer.filter(word: word, customers: result)
                words.append(word)
            }
        }
        return (result,words)
    }
    
    static func filter(word: String, customers: [Customer]) -> [Customer]{
        return customers.filter({ customer -> Bool in
            let name = "\(customer.full_name ?? "")" + " " + "\(customer.phone ?? "")"
            return name.lowercased().contains(word)
        })
    }

    var loyaltyTierName: String? {
        return loyaltyDisplayLevelName
    }

    var loyaltySummaryText: String? {
        guard let levelName = loyaltyDisplayLevelName else { return nil }
        guard let points = loyaltyDisplayPoints else { return levelName }

        let pointsText = NumberFormatter.localizedString(from: NSNumber(value: points), number: .decimal)
        return "\(levelName) • \(pointsText) điểm"
    }

    var loyaltyStatusText: String? {
        switch loyaltyStatus {
        case .active:
            return loyaltySummaryText
        case .inactive:
            return "Loyalty chưa kích hoạt"
        case .unavailable:
            return "Loyalty không khả dụng"
        case .none:
            return loyaltySummaryText
        }
    }

    var loyaltyDisplayState: CustomerLoyaltyDisplayState {
        if let status = loyaltyStatus {
            switch status {
            case .active:
                return .active
            case .inactive:
                return .inactive
            case .unavailable:
                return .unavailable
            }
        }

        if loyalty != nil || loyaltyLegacyPoints > 0 || (customer_level?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false) {
            return .legacy
        }

        return .none
    }

    var loyaltyDisplayLevelName: String? {
        switch loyaltyDisplayState {
        case .active:
            return loyalty?.tier?.name ?? customer_level?.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty ?? "Thành viên".localized()
        case .legacy:
            return customer_level?.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty ?? "Thành viên".localized()
        case .inactive:
            return "Loyalty chưa kích hoạt"
        case .unavailable:
            return "Loyalty không khả dụng"
        case .none:
            return nil
        }
    }

    var loyaltyDisplayPoints: Int? {
        switch loyaltyDisplayState {
        case .active:
            return loyalty?.points ?? 0
        case .legacy:
            return loyaltyLegacyPoints
        case .inactive, .unavailable, .none:
            return nil
        }
    }

    var loyaltyDisplayIconName: String? {
        switch loyaltyDisplayState {
        case .active:
            return loyalty?.tier?.icon?.loyaltySystemIconName ?? "person.fill"
        case .legacy:
            return customer_level?.loyaltySystemIconName ?? (loyaltyLegacyPoints > 0 ? "star.fill" : "person.fill")
        case .inactive:
            return "sparkles"
        case .unavailable:
            return "lock.fill"
        case .none:
            return nil
        }
    }

    private var loyaltyLegacyPoints: Int {
        return max(0, rental_point) + max(0, sale_point)
    }
    
    // MARK: - Comparable Protocol
    
    static func ==(lhs: Customer, rhs: Customer) -> Bool {
        return lhs.full_name == rhs.full_name
    }
    
    static func <(lhs: Customer, rhs: Customer) -> Bool {
        return (lhs.full_name ?? "") < (rhs.full_name ?? "")
    }
    
    // MARK: - Static Methods (Realm methods removed - will use UserDefaults or Core Data later)
    static func reset() {
        // TODO: Implement with UserDefaults or Core Data for local persistence
        UserDefaults.standard.removeObject(forKey: "saved_customers")
    }
    
    static func customers() -> [Customer] {
        // TODO: Load from UserDefaults or Core Data for local persistence
        guard let data = UserDefaults.standard.data(forKey: "saved_customers"),
              let customers = try? JSONDecoder.shared.decode([Customer].self, from: data) else {
            return []
        }
        return customers.sorted { ($0.full_name ?? "") < ($1.full_name ?? "") }
    }
    
    static func saveCustomers(_ customers: [Customer]) {
        // TODO: Save to UserDefaults or Core Data for local persistence
        if let data = try? JSONEncoder.shared.encode(customers) {
            UserDefaults.standard.set(data, forKey: "saved_customers")
        }
    }
}

extension String {
    var nilIfEmpty: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    var loyaltySystemIconName: String {
        switch lowercased() {
        case "medal", "dong", "đồng":
            return "medal.fill"
        case "award", "bac", "bạc":
            return "rosette"
        case "crown", "vang", "vàng":
            return "crown.fill"
        case "gem", "diamond", "bach kim", "bạch kim", "kim cương", "kim cuong":
            return "diamond.fill"
        case "star", "vip":
            return "star.fill"
        case "user", "thành viên", "thanh vien":
            return "person.fill"
        default:
            return "person.fill"
        }
    }
}
