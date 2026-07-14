//
//  Category.swift
//  POS ADBD
//
//  Created by Assistant on $(date).
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation

struct Category: Codable, Comparable, Copying {
    var id: Int?
    var name: String?
    var description: String?
    var isActive: Bool?
    var isDefault: Bool?
    var merchantId: Int?
    var createdAt: String?
    var updatedAt: String?
    
    init() {}
    
    // Copying protocol implementation
    init(original: Category) {
        self.id = original.id
        self.name = original.name
        self.description = original.description
        self.isActive = original.isActive
        self.isDefault = original.isDefault
        self.merchantId = original.merchantId
        self.createdAt = original.createdAt
        self.updatedAt = original.updatedAt
    }
    
    // MARK: - Codable Implementation
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case isActive
        case isDefault
        case merchantId
        case createdAt
        case updatedAt
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        self.id = try container.decodeIfPresent(Int.self, forKey: .id)
        self.name = try container.decodeIfPresent(String.self, forKey: .name)
        self.description = try container.decodeIfPresent(String.self, forKey: .description)
        self.isActive = try container.decodeIfPresent(Bool.self, forKey: .isActive)
        self.isDefault = try container.decodeIfPresent(Bool.self, forKey: .isDefault)
        self.merchantId = try container.decodeIfPresent(Int.self, forKey: .merchantId)
        self.createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt)
        self.updatedAt = try container.decodeIfPresent(String.self, forKey: .updatedAt)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        
        try container.encodeIfPresent(id, forKey: .id)
        try container.encodeIfPresent(name, forKey: .name)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encodeIfPresent(isActive, forKey: .isActive)
        try container.encodeIfPresent(isDefault, forKey: .isDefault)
        try container.encodeIfPresent(merchantId, forKey: .merchantId)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(updatedAt, forKey: .updatedAt)
    }
    
    // MARK: - Comparable Implementation
    
    static func == (lhs: Category, rhs: Category) -> Bool {
        return lhs.id == rhs.id
    }
    
    static func < (lhs: Category, rhs: Category) -> Bool {
        guard let lhsId = lhs.id, let rhsId = rhs.id else {
            return (lhs.name ?? "") < (rhs.name ?? "")
        }
        return lhsId < rhsId
    }
}