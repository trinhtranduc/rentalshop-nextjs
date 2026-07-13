//
//  User.swift
//  POS ADBD
//
//  Created by Assistant on 2025-10-22.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit

// MARK: - Role Enum

enum Role: String, CaseIterable, Codable {
    case admin = "ADMIN"
    case merchant = "MERCHANT"
    case outletAdmin = "OUTLET_ADMIN"
    case outletStaff = "OUTLET_STAFF"
    
    func inString() -> String {
        return self.rawValue
    }
    
    var displayName: String {
        switch self {
        case .admin:
            return "Admin".localized()
        case .merchant:
            return "Merchant".localized()
        case .outletAdmin:
            return "Outlet Admin".localized()
        case .outletStaff:
            return "Outlet Staff".localized()
        }
    }
}

// MARK: - User Model (Codable) - Extended to replace Account model

class User: NSObject, Codable {
    // MARK: - Core Fields from API Response
    var id: Int = 0
    var email: String?
    var firstName: String?
    var lastName: String?
    var name: String?
    var phone: String?
    var role: Role {
        get { return Role(rawValue: privateRole) ?? .outletStaff }
        set { privateRole = newValue.rawValue }
    }
    private var privateRole = Role.outletStaff.rawValue
    var merchantId: Int?
    var outletId: Int?
    var emailVerified: Bool?
    var emailVerifiedAt: Date?
    var isActive: Bool = true
    
    // MARK: - Permissions (from API User response)
    var permissions: [String] = []
    
    // MARK: - Token (from LoginData, not in API User response)
    var token: String?
    
    // MARK: - Nested Objects (from API)
    var merchant: Merchant?
    var outlet: Outlet?
    var subscription: Subscription?
    
    // MARK: - Links (from API)
    var publicProductLink: String?
    var affiliateLink: String?
    
    // MARK: - UserDefaults Keys
    private static let userKey = "com.rental.shop.user"
    
    // MARK: - Computed Properties
    
    /// Full name computed from name field or firstName + lastName
    var fullName: String? {
        get {
            if let name = name, !name.isEmpty {
                return name
            }
            if let firstName = firstName, let lastName = lastName {
                return "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)
            }
            if let firstName = firstName {
                return firstName
            }
            if let lastName = lastName {
                return lastName
            }
            return nil
        }
        set {
            name = newValue
        }
    }
    
    // MARK: - Computed Properties for Backward Compatibility
    
    var storeName: String? {
        return merchant?.name
    }
    
    var address: String? {
        return merchant?.address ?? outlet?.address
    }
    
    var city: String? {
        return merchant?.city ?? outlet?.city
    }
    
    var state: String? {
        return merchant?.state ?? outlet?.state
    }
    
    var country: String? {
        return merchant?.country ?? outlet?.country
    }
    
    var zipCode: String? {
        return merchant?.zipCode ?? outlet?.zipCode
    }
    
    var businessType: String? {
        return merchant?.businessType
    }
    
    var pricingType: String? {
        return merchant?.pricingType
    }
    
    var currency: String? {
        return merchant?.currency
    }
    
    var taxId: String? {
        return merchant?.taxId
    }
    
    // MARK: - Subscription Computed Properties
    
    var planName: String? {
        return subscription?.plan?.name ?? merchant?.subscription?.plan?.name
    }
    
    var planStatus: String? {
        return subscription?.status ?? merchant?.subscription?.status
    }
    
    var isTrialActive: Bool {
        guard let subscription = subscription ?? merchant?.subscription else { return false }
        return subscription.status.uppercased() == "TRIAL" || subscription.status.uppercased() == "ACTIVE"
    }
    
    var planLimits: String? {
        return subscription?.plan?.limits ?? merchant?.subscription?.plan?.limits
    }
    
    var planFeatures: String? {
        return subscription?.plan?.features ?? merchant?.subscription?.plan?.features
    }

    var hasLoyaltyFeature: Bool {
        guard let features = planFeatures?.lowercased() else { return false }
        return features.contains("loyalty")
    }
    
    // MARK: - Initializers
    
    override init() {
        super.init()
    }
    
    // MARK: - Codable Implementation
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case firstName
        case lastName
        case name
        case phone
        case role
        case privateRole
        case merchantId
        case outletId
        case emailVerified
        case emailVerifiedAt
        case isActive
        case permissions
        case token
        case merchant
        case outlet
        case subscription
        case publicProductLink
        case affiliateLink
    }
    
    required init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        self.id = try container.decodeIfPresent(Int.self, forKey: .id) ?? 0
        self.email = try container.decodeIfPresent(String.self, forKey: .email)
        self.firstName = try container.decodeIfPresent(String.self, forKey: .firstName)
        self.lastName = try container.decodeIfPresent(String.self, forKey: .lastName)
        self.name = try container.decodeIfPresent(String.self, forKey: .name)
        self.phone = try container.decodeIfPresent(String.self, forKey: .phone)
        
        // Decode role - handle both string and enum
        if let roleString = try? container.decode(String.self, forKey: .role) {
            self.privateRole = roleString
        } else if let roleEnum = try? container.decode(Role.self, forKey: .role) {
            self.privateRole = roleEnum.rawValue
        } else {
            self.privateRole = try container.decodeIfPresent(String.self, forKey: .privateRole) ?? Role.outletStaff.rawValue
        }
        
        self.merchantId = try container.decodeIfPresent(Int.self, forKey: .merchantId)
        self.outletId = try container.decodeIfPresent(Int.self, forKey: .outletId)
        self.emailVerified = try container.decodeIfPresent(Bool.self, forKey: .emailVerified)
        self.emailVerifiedAt = try container.decodeIfPresent(Date.self, forKey: .emailVerifiedAt)
        self.isActive = try container.decodeIfPresent(Bool.self, forKey: .isActive) ?? true
        self.permissions = try container.decodeIfPresent([String].self, forKey: .permissions) ?? []
        self.token = try container.decodeIfPresent(String.self, forKey: .token)
        self.merchant = try container.decodeIfPresent(Merchant.self, forKey: .merchant)
        self.outlet = try container.decodeIfPresent(Outlet.self, forKey: .outlet)
        self.subscription = try container.decodeIfPresent(Subscription.self, forKey: .subscription)
        self.publicProductLink = try container.decodeIfPresent(String.self, forKey: .publicProductLink)
        self.affiliateLink = try container.decodeIfPresent(String.self, forKey: .affiliateLink)
        
        super.init()
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        
        try container.encode(id, forKey: .id)
        try container.encodeIfPresent(email, forKey: .email)
        try container.encodeIfPresent(firstName, forKey: .firstName)
        try container.encodeIfPresent(lastName, forKey: .lastName)
        try container.encodeIfPresent(name, forKey: .name)
        try container.encodeIfPresent(phone, forKey: .phone)
        try container.encode(privateRole, forKey: .privateRole)
        try container.encodeIfPresent(merchantId, forKey: .merchantId)
        try container.encodeIfPresent(outletId, forKey: .outletId)
        try container.encodeIfPresent(emailVerified, forKey: .emailVerified)
        try container.encodeIfPresent(emailVerifiedAt, forKey: .emailVerifiedAt)
        try container.encode(isActive, forKey: .isActive)
        try container.encode(permissions, forKey: .permissions)
        try container.encodeIfPresent(token, forKey: .token)
        try container.encodeIfPresent(merchant, forKey: .merchant)
        try container.encodeIfPresent(outlet, forKey: .outlet)
        try container.encodeIfPresent(subscription, forKey: .subscription)
        try container.encodeIfPresent(publicProductLink, forKey: .publicProductLink)
        try container.encodeIfPresent(affiliateLink, forKey: .affiliateLink)
    }
    
    // MARK: - UserDefaults Storage Methods
    
    class func reset() {
        UserDefaults.standard.removeObject(forKey: userKey)
        UserDefaults.standard.synchronize()
        print("✅ User reset successfully from UserDefaults")
    }
    
    class func current() -> User? {
        guard let data = UserDefaults.standard.data(forKey: userKey) else {
            print("ℹ️ No user found in UserDefaults")
            return nil
        }
        
        do {
            let user = try JSONDecoder.shared.decode(User.self, from: data)
            return user
        } catch {
            print("❌ Error decoding user from UserDefaults: \(error)")
            return nil
        }
    }
    
    // Legacy method name for backward compatibility
    class func account() -> User? {
        return current()
    }
    
    class func save(user: User) {
        do {
            let data = try JSONEncoder.shared.encode(user)
            UserDefaults.standard.set(data, forKey: userKey)
            UserDefaults.standard.synchronize()
            print("✅ User saved successfully to UserDefaults")
            print("   User: \(user.fullName ?? "Unknown")")
            print("   Email: \(user.email ?? "Unknown")")
            print("   Token: \(user.token != nil ? "Present (\(user.token!.prefix(20))...)" : "Missing")")
        } catch {
            print("❌ Error encoding user to UserDefaults: \(error)")
        }
    }
    
    // MARK: - Conversion from LoginData
    
    /// Create User from LoginData using Codable
    /// Note: LoginResponse = API wrapper (success, code, message, data)
    ///       LoginData = Pure data (user, token)
    convenience init(from loginData: LoginData) {
        self.init()
        
        // Map user fields from User model
        let apiUser = loginData.user
        self.id = apiUser.id
        self.email = apiUser.email
        self.firstName = apiUser.firstName
        self.lastName = apiUser.lastName
        self.name = apiUser.name
        self.phone = apiUser.phone
        self.token = loginData.token
        self.merchantId = apiUser.merchantId
        self.outletId = apiUser.outletId
        self.emailVerified = apiUser.emailVerified
        self.emailVerifiedAt = apiUser.emailVerifiedAt
        self.permissions = apiUser.permissions
        
        // Store nested objects directly
        self.merchant = apiUser.merchant
        self.outlet = apiUser.outlet
        self.subscription = apiUser.subscription
        
        // Map role string to enum
        let roleString = apiUser.role
        switch roleString.rawValue.uppercased(){
            case "ADMIN", "SUPER_ADMIN":
                self.role = .admin
            case "MERCHANT":
                self.role = .merchant
            case "OUTLET_ADMIN":
                self.role = .outletAdmin
            case "OUTLET_STAFF", "EMPLOYEE", "SALE":
                self.role = .outletStaff
            default:
                self.role = .outletStaff
            }
    }
}
