//
//  BankAccount.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-28.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation

struct BankAccount: Codable {
    var id: Int?
    var bankName: String
    var accountNumber: String
    var accountHolderName: String
    var bankCode: String?
    var branch: String?
    var isDefault: Bool?
    var qrCode: String?
    var notes: String?
    var isActive: Bool?
    var merchantId: Int?
    var outletId: Int?
    var createdAt: String?
    var updatedAt: String?
    
    init() {
        self.bankName = ""
        self.accountNumber = ""
        self.accountHolderName = ""
    }
    
    init(bankName: String, accountNumber: String, accountHolderName: String, branch: String? = nil, bankCode: String? = nil) {
        self.bankName = bankName
        self.accountNumber = accountNumber
        self.accountHolderName = accountHolderName
        self.branch = branch
        self.bankCode = bankCode
        self.isActive = true
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case bankName
        case accountNumber
        case accountHolderName
        case bankCode
        case branch
        case isDefault
        case qrCode
        case notes
        case isActive
        case merchantId
        case outletId
        case createdAt
        case updatedAt
    }
}

// MARK: - API Response Models
struct APIBankAccountResponse: Codable {
    let success: Bool
    let message: String?
    let code: String?
    let error: String?
    let data: BankAccount?
}

struct APIBankAccountsResponse: Codable {
    let success: Bool
    let message: String?
    let code: String?
    let error: String?
    let data: [BankAccount]?
}

