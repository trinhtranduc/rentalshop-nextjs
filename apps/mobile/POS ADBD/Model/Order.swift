//
//  OrderAPIModels.swift
//  POS ADBD
//
//  Created by Assistant on 10/15/25.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation

// MARK: - Enums for Order API

enum OrderStatus: String, Codable, CaseIterable {
    case draft, reserved, pickuped, returned, completed, cancelled
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawValue = try container.decode(String.self)
        
        // Handle both uppercase and lowercase values from API
        switch rawValue.uppercased() {
        case "DRAFT":
            self = .draft
        case "RESERVED":
            self = .reserved
        case "PICKUPED", "PICKED_UP":
            self = .pickuped
        case "RETURNED":
            self = .returned
        case "COMPLETED":
            self = .completed
        case "CANCELLED":
            self = .cancelled
        default:
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: decoder.codingPath,
                    debugDescription: "Cannot initialize OrderStatus from invalid String value \(rawValue)"
                )
            )
        }
    }
    
    func inString() -> String {
        switch self {
        case .draft:
            return "Draft".localized().uppercased()
        case .reserved:
            return "Reserved".localized().uppercased()
        case .pickuped:
            return "Pickuped".localized().uppercased()
        case .returned:
            return "Returned".localized().uppercased()
        case .completed:
            return "Completed".localized().uppercased()
        case .cancelled:
            return "Cancelled".localized().uppercased()
        }
    }
    
    /// Returns localized display name for filter view (not uppercased)
    func localizedDisplayName() -> String {
        switch self {
        case .draft:
            return "Draft".localized()
        case .reserved:
            return "Reserved".localized()
        case .pickuped:
            return "Pickuped".localized()
        case .returned:
            return "Returned".localized()
        case .completed:
            return "Completed".localized()
        case .cancelled:
            return "Cancelled".localized()
        }
    }

    /// Resolves an OrderStatus from a raw API/display string (case-insensitive).
    /// Used by cells that receive status as a plain String (e.g. analytics payloads)
    /// so they can share the same badge styling as the strongly-typed path.
    static func from(apiString raw: String?) -> OrderStatus? {
        switch (raw ?? "").uppercased() {
        case "DRAFT":                          return .draft
        case "RESERVED":                       return .reserved
        case "PICKUPED", "PICKUP", "PICKED_UP": return .pickuped
        case "RETURNED":                       return .returned
        case "COMPLETED":                      return .completed
        case "CANCELLED":                      return .cancelled
        default:                               return nil
        }
    }
}

enum OrderType: String, Codable, CaseIterable {
    case rent, sale
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawValue = try container.decode(String.self)
        
        // Handle both uppercase and lowercase values from API
        switch rawValue.uppercased() {
        case "RENT":
            self = .rent
        case "SALE":
            self = .sale
        default:
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: decoder.codingPath,
                    debugDescription: "Cannot initialize OrderType from invalid String value \(rawValue)"
                )
            )
        }
    }
}

enum DiscountType: String, Codable, CaseIterable {
    case percentage, amount
}

// MARK: - API Response Models

struct OrdersResponse: Codable {
    let success: Bool
    let data: OrdersData?
    let code: String
    let message: String
}

struct OrdersData: Codable {
    let orders: [Order]
    let total: Int
    let page: Int
    let limit: Int
    let offset: Int
    let hasMore: Bool
    let totalPages: Int
}

struct Order: Codable {
    let id: Int
    let orderNumber: String
    let orderType: OrderType
    let status: OrderStatus
    let totalAmount: Double
    let depositAmount: Double
    let securityDeposit: Double
    let damageFee: Double
    let lateFee: Double
    let discountType: String?
    let discountValue: Double
    let discountAmount: Double
    let pickupPlanAt: Date?
    let returnPlanAt: Date?
    let pickedUpAt: Date?
    let returnedAt: Date?
    let rentalDuration: Int?
    let isReadyToDeliver: Bool
    let collateralType: String?
    let collateralDetails: String?
    let notes: String?
    let notesImages: [String]?
    let pickupNotes: String?
    let pickupNotesImages: [String]?
    let returnNotes: String?
    let returnNotesImages: [String]?
    let damageNotes: String?
    let damageNotesImages: [String]?
    let createdAt: Date
    let updatedAt: Date
    
    // Simplified customer data
    let customerId: Int
    let customerFirstName: String?
    let customerLastName: String?
    let customerName: String
    let customerPhone: String?
    let customerEmail: String?
    
    // Simplified outlet data
    let outletId: Int
    let outletName: String
    let merchantId: Int?
    let merchantName: String?
    
    // Simplified createdBy data
    let createdById: Int
    let createdByName: String
    
    // Order items with flattened product data
    let orderItems: [OrderItem]
    
    // Calculated fields
    let itemCount: Int
    let paymentCount: Int
    let totalPaid: Double
    let loyaltyPointsRedeemed: Int
    let loyaltyDiscount: Double
    let loyaltyPointsEarned: Int
    
    enum CodingKeys: String, CodingKey {
        case id
        case orderNumber
        case orderType
        case status
        case totalAmount
        case depositAmount
        case securityDeposit
        case damageFee
        case lateFee
        case discountType
        case discountValue
        case discountAmount
        case pickupPlanAt
        case returnPlanAt
        case pickedUpAt
        case returnedAt
        case rentalDuration
        case isReadyToDeliver
        case collateralType
        case collateralDetails
        case notes
        case notesImages
        case pickupNotes
        case pickupNotesImages
        case returnNotes
        case returnNotesImages
        case damageNotes
        case damageNotesImages
        case createdAt
        case updatedAt
        
        // Simplified customer data
        case customerId
        case customerFirstName
        case customerLastName
        case customerName
        case customerPhone
        case customerEmail
        
        // Simplified outlet data
        case outletId
        case outletName
        case merchantId
        case merchantName
        
        // Simplified createdBy data
        case createdById
        case createdByName
        
        // Order items
        case orderItems
        
        // Calculated fields
        case itemCount
        case paymentCount
        case totalPaid
        case loyaltyPointsRedeemed
        case loyaltyDiscount
        case loyaltyPointsEarned
    }
    
    // MARK: - Custom Decoding
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Decode all fields
        id = try container.decode(Int.self, forKey: .id)
        orderNumber = try container.decode(String.self, forKey: .orderNumber)
        orderType = try container.decode(OrderType.self, forKey: .orderType)
        status = try container.decode(OrderStatus.self, forKey: .status)
        totalAmount = try container.decode(Double.self, forKey: .totalAmount)
        depositAmount = try container.decode(Double.self, forKey: .depositAmount)
        securityDeposit = try container.decode(Double.self, forKey: .securityDeposit)
        damageFee = try container.decode(Double.self, forKey: .damageFee)
        lateFee = try container.decode(Double.self, forKey: .lateFee)
        discountType = try container.decodeIfPresent(String.self, forKey: .discountType)
        discountValue = try container.decode(Double.self, forKey: .discountValue)
        discountAmount = try container.decode(Double.self, forKey: .discountAmount)
        pickupPlanAt = try container.decodeIfPresent(Date.self, forKey: .pickupPlanAt)
        returnPlanAt = try container.decodeIfPresent(Date.self, forKey: .returnPlanAt)
        pickedUpAt = try container.decodeIfPresent(Date.self, forKey: .pickedUpAt)
        returnedAt = try container.decodeIfPresent(Date.self, forKey: .returnedAt)
        rentalDuration = try container.decodeIfPresent(Int.self, forKey: .rentalDuration)
        isReadyToDeliver = try container.decode(Bool.self, forKey: .isReadyToDeliver)
        collateralType = try container.decodeIfPresent(String.self, forKey: .collateralType)
        collateralDetails = try container.decodeIfPresent(String.self, forKey: .collateralDetails)
        notes = try container.decodeIfPresent(String.self, forKey: .notes)
        notesImages = try container.decodeIfPresent([String].self, forKey: .notesImages)
        pickupNotes = try container.decodeIfPresent(String.self, forKey: .pickupNotes)
        pickupNotesImages = try container.decodeIfPresent([String].self, forKey: .pickupNotesImages)
        returnNotes = try container.decodeIfPresent(String.self, forKey: .returnNotes)
        returnNotesImages = try container.decodeIfPresent([String].self, forKey: .returnNotesImages)
        damageNotes = try container.decodeIfPresent(String.self, forKey: .damageNotes)
        damageNotesImages = try container.decodeIfPresent([String].self, forKey: .damageNotesImages)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
        
        // Customer data
        customerId = try container.decode(Int.self, forKey: .customerId)
        customerFirstName = try container.decodeIfPresent(String.self, forKey: .customerFirstName)
        customerLastName = try container.decodeIfPresent(String.self, forKey: .customerLastName)
        
        // Build customerName from firstName + lastName (prefer this over API's customerName)
        // This ensures we don't get "Trinh null" when lastName is null
        if let firstName = customerFirstName {
            let lastName = customerLastName ?? ""
            let fullName = [firstName, lastName].filter { !$0.isEmpty }.joined(separator: " ")
            customerName = fullName.isEmpty ? (try container.decodeIfPresent(String.self, forKey: .customerName) ?? "") : fullName
        } else {
            // Fallback to API's customerName, but clean up "null" strings
            let apiCustomerName = try container.decodeIfPresent(String.self, forKey: .customerName) ?? ""
            // Replace " null" or "null " or "null" with empty string
            customerName = apiCustomerName.replacingOccurrences(of: " null", with: "")
                .replacingOccurrences(of: "null ", with: "")
                .replacingOccurrences(of: "null", with: "")
                .trimmingCharacters(in: .whitespaces)
        }
        
        customerPhone = try container.decodeIfPresent(String.self, forKey: .customerPhone)
        customerEmail = try container.decodeIfPresent(String.self, forKey: .customerEmail)
        
        // Outlet data
        outletId = try container.decode(Int.self, forKey: .outletId)
        outletName = try container.decode(String.self, forKey: .outletName)
        merchantId = try container.decodeIfPresent(Int.self, forKey: .merchantId)
        merchantName = try container.decodeIfPresent(String.self, forKey: .merchantName)
        
        // CreatedBy data
        createdById = try container.decode(Int.self, forKey: .createdById)
        createdByName = try container.decode(String.self, forKey: .createdByName)
        
        // Order items
        orderItems = try container.decode([OrderItem].self, forKey: .orderItems)
        
        // Calculated fields
        itemCount = try container.decode(Int.self, forKey: .itemCount)
        paymentCount = try container.decode(Int.self, forKey: .paymentCount)
        totalPaid = try container.decode(Double.self, forKey: .totalPaid)
        loyaltyPointsRedeemed = try container.decodeIfPresent(Int.self, forKey: .loyaltyPointsRedeemed) ?? 0
        loyaltyDiscount = try container.decodeIfPresent(Double.self, forKey: .loyaltyDiscount) ?? 0
        loyaltyPointsEarned = try container.decodeIfPresent(Int.self, forKey: .loyaltyPointsEarned) ?? 0
    }
    
    var amountDue: Double {
        return max(0, totalAmount - loyaltyDiscount)
    }
    
    // MARK: - Computed Properties
    
    /// Returns pickup date - actual if available, otherwise planned
    var pickupDate: Date? {
        return pickedUpAt ?? pickupPlanAt
    }
    
    /// Returns return date - actual if available, otherwise planned
    var returnDate: Date? {
        return returnedAt ?? returnPlanAt
    }
    
    /// Returns true if order has been picked up
    var isPickedUp: Bool {
        return pickedUpAt != nil
    }
    
    /// Returns true if order has been returned
    var isReturned: Bool {
        return returnedAt != nil
    }
    
    /// Returns true if order is currently active (picked up but not returned)
    var isActive: Bool {
        return isPickedUp && !isReturned
    }
    
    /// Returns total amount (using new API field)
    func total() -> Double {
        return totalAmount
    }
    
    // MARK: - Memberwise Initializer
    /// Memberwise initializer for creating Order instances manually
    /// This is needed because we have a custom init(from decoder:) which prevents automatic memberwise initializer
    init(
        id: Int,
        orderNumber: String,
        orderType: OrderType,
        status: OrderStatus,
        totalAmount: Double,
        depositAmount: Double,
        securityDeposit: Double,
        damageFee: Double,
        lateFee: Double,
        discountType: String?,
        discountValue: Double,
        discountAmount: Double,
        pickupPlanAt: Date?,
        returnPlanAt: Date?,
        pickedUpAt: Date?,
        returnedAt: Date?,
        rentalDuration: Int?,
        isReadyToDeliver: Bool,
        collateralType: String?,
        collateralDetails: String?,
        notes: String?,
        notesImages: [String]? = nil,
        pickupNotes: String?,
        pickupNotesImages: [String]? = nil,
        returnNotes: String?,
        returnNotesImages: [String]? = nil,
        damageNotes: String?,
        damageNotesImages: [String]? = nil,
        createdAt: Date,
        updatedAt: Date,
        customerId: Int,
        customerFirstName: String?,
        customerLastName: String?,
        customerName: String,
        customerPhone: String?,
        customerEmail: String?,
        outletId: Int,
        outletName: String,
        merchantId: Int?,
        merchantName: String?,
        createdById: Int,
        createdByName: String,
        orderItems: [OrderItem],
        itemCount: Int,
        paymentCount: Int,
        totalPaid: Double,
        loyaltyPointsRedeemed: Int = 0,
        loyaltyDiscount: Double = 0,
        loyaltyPointsEarned: Int = 0
    ) {
        self.id = id
        self.orderNumber = orderNumber
        self.orderType = orderType
        self.status = status
        self.totalAmount = totalAmount
        self.depositAmount = depositAmount
        self.securityDeposit = securityDeposit
        self.damageFee = damageFee
        self.lateFee = lateFee
        self.discountType = discountType
        self.discountValue = discountValue
        self.discountAmount = discountAmount
        self.pickupPlanAt = pickupPlanAt
        self.returnPlanAt = returnPlanAt
        self.pickedUpAt = pickedUpAt
        self.returnedAt = returnedAt
        self.rentalDuration = rentalDuration
        self.isReadyToDeliver = isReadyToDeliver
        self.collateralType = collateralType
        self.collateralDetails = collateralDetails
        self.notes = notes
        self.notesImages = notesImages
        self.pickupNotes = pickupNotes
        self.pickupNotesImages = pickupNotesImages
        self.returnNotes = returnNotes
        self.returnNotesImages = returnNotesImages
        self.damageNotes = damageNotes
        self.damageNotesImages = damageNotesImages
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.customerId = customerId
        self.customerFirstName = customerFirstName
        self.customerLastName = customerLastName
        self.customerName = customerName
        self.customerPhone = customerPhone
        self.customerEmail = customerEmail
        self.outletId = outletId
        self.outletName = outletName
        self.merchantId = merchantId
        self.merchantName = merchantName
        self.createdById = createdById
        self.createdByName = createdByName
        self.orderItems = orderItems
        self.itemCount = itemCount
        self.paymentCount = paymentCount
        self.totalPaid = totalPaid
        self.loyaltyPointsRedeemed = loyaltyPointsRedeemed
        self.loyaltyDiscount = loyaltyDiscount
        self.loyaltyPointsEarned = loyaltyPointsEarned
    }
}

struct OrderCount: Codable {
    let orderItems: Int
    let payments: Int
}

// MARK: - Order Detail Response Models

struct OrderDetailResponse: Codable {
    let success: Bool
    let data: OrderDetail?
    let code: String
    let message: String
}

struct OrderDetail: Codable {
    let id: Int
    let orderNumber: String
    let orderType: OrderType
    let status: OrderStatus
    let totalAmount: Double
    let depositAmount: Double
    let securityDeposit: Double
    let damageFee: Double
    let lateFee: Double
    let discountType: String? // Optional because API can return null
    let discountValue: Double
    let discountAmount: Double
    let pickupPlanAt: Date?
    let returnPlanAt: Date?
    let pickedUpAt: Date?
    let returnedAt: Date?
    let rentalDuration: Int?
    let isReadyToDeliver: Bool
    let collateralType: String?
    let collateralDetails: String?
    let notes: String?
    let notesImages: [String]?
    let pickupNotes: String?
    let pickupNotesImages: [String]?
    let returnNotes: String?
    let returnNotesImages: [String]?
    let damageNotes: String?
    let damageNotesImages: [String]?
    let createdAt: Date
    let updatedAt: Date
    let outletId: Int
    let customerId: Int
    let createdById: Int
    let customer: CustomerDetail
    let outlet: OutletDetail
    let createdBy: UserDetail
    let orderItems: [OrderItem]
    let payments: [Payment]
    
    // MARK: - Computed Properties
    
    /// Returns pickup date - actual if available, otherwise planned
    var pickupDate: Date? {
        return pickedUpAt ?? pickupPlanAt
    }
    
    /// Returns return date - actual if available, otherwise planned
    var returnDate: Date? {
        return returnedAt ?? returnPlanAt
    }
    
    /// Returns true if order has been picked up
    var isPickedUp: Bool {
        return pickedUpAt != nil
    }
    
    /// Returns true if order has been returned
    var isReturned: Bool {
        return returnedAt != nil
    }
    
    /// Returns true if order is currently active (picked up but not returned)
    var isActive: Bool {
        return isPickedUp && !isReturned
    }
    
    /// Returns discount type with default value "amount" if nil
    var discountTypeOrDefault: String {
        return discountType ?? "amount"
    }
}

// MARK: - Order from OrderDetail (for loading full order from API)
extension Order {
    /// Build an Order from API OrderDetail (e.g. when opening order from daily report by id).
    static func from(detail: OrderDetail) -> Order {
        let firstName = detail.customer.firstName
        let lastName = detail.customer.lastName?.trimmingCharacters(in: .whitespaces)
        let customerNameParts = [firstName, lastName].compactMap { name -> String? in
            guard let name = name, !name.isEmpty else { return nil }
            return name
        }
        let customerName = customerNameParts.joined(separator: " ")
        let createdByFirstName = detail.createdBy.firstName
        let createdByLastName = detail.createdBy.lastName.trimmingCharacters(in: .whitespaces)
        let createdByNameParts = [createdByFirstName, createdByLastName.isEmpty ? nil : createdByLastName].compactMap { $0 }
        let createdByName = createdByNameParts.joined(separator: " ")
        let totalPaid = detail.payments.reduce(0) { $0 + $1.amount }
        return Order(
            id: detail.id,
            orderNumber: detail.orderNumber,
            orderType: detail.orderType,
            status: detail.status,
            totalAmount: detail.totalAmount,
            depositAmount: detail.depositAmount,
            securityDeposit: detail.securityDeposit,
            damageFee: detail.damageFee,
            lateFee: detail.lateFee,
            discountType: detail.discountType ?? "amount",
            discountValue: detail.discountValue,
            discountAmount: detail.discountAmount,
            pickupPlanAt: detail.pickupPlanAt,
            returnPlanAt: detail.returnPlanAt,
            pickedUpAt: detail.pickedUpAt,
            returnedAt: detail.returnedAt,
            rentalDuration: detail.rentalDuration,
            isReadyToDeliver: detail.isReadyToDeliver,
            collateralType: detail.collateralType,
            collateralDetails: detail.collateralDetails,
            notes: detail.notes,
            notesImages: detail.notesImages,
            pickupNotes: detail.pickupNotes,
            pickupNotesImages: detail.pickupNotesImages,
            returnNotes: detail.returnNotes,
            returnNotesImages: detail.returnNotesImages,
            damageNotes: detail.damageNotes,
            damageNotesImages: detail.damageNotesImages,
            createdAt: detail.createdAt,
            updatedAt: detail.updatedAt,
            customerId: detail.customerId,
            customerFirstName: detail.customer.firstName,
            customerLastName: detail.customer.lastName,
            customerName: customerName,
            customerPhone: detail.customer.phone,
            customerEmail: detail.customer.email,
            outletId: detail.outletId,
            outletName: detail.outlet.name,
            merchantId: detail.outlet.merchant.id,
            merchantName: detail.outlet.merchant.name,
            createdById: detail.createdById,
            createdByName: createdByName,
            orderItems: detail.orderItems,
            itemCount: detail.orderItems.count,
            paymentCount: detail.payments.count,
            totalPaid: totalPaid
        )
    }
}

struct CustomerDetail: Codable {
    let id: Int
    let firstName: String
    let lastName: String? // Optional because API can return null
    let phone: String? // Optional because API can return null
    let email: String? // Optional because API can return null
    let address: String?
    let city: String?
    let state: String?
    let zipCode: String?
    let country: String?
    let dateOfBirth: Date?
    let idNumber: String?
    let idType: String?
}

struct OutletDetail: Codable {
    let id: Int
    let name: String
    let address: String?
    let phone: String?
    let city: String?
    let state: String?
    let zipCode: String?
    let country: String?
    let merchant: Merchant
}

struct UserDetail: Codable {
    let id: Int
    let firstName: String
    let lastName: String
    let email: String?
}

struct OrderItem: Codable {
    let id: Int
    let quantity: Int
    let unitPrice: Double
    let totalPrice: Double
    let notes: String?
    
    // Flattened product data - make some fields optional to handle API variations
    let productId: Int?
    let productName: String
    let productBarcode: String?
    let productImages: [String]?
    let productRentPrice: Double?
    let productDeposit: Double?
    let isReadyToDeliver: Bool?
    private struct EmbeddedProduct: Codable {
        let id: Int?
        let name: String?
        let barcode: String?
        let images: [String]?
        let rentPrice: Double?
        let deposit: Double?
    }
    
    // Default initializer for manual creation
    init(id: Int, quantity: Int, unitPrice: Double, totalPrice: Double, notes: String?, productId: Int?, productName: String, productBarcode: String?, productImages: [String]?, productRentPrice: Double?, productDeposit: Double?, isReadyToDeliver: Bool? = nil) {
        self.id = id
        self.quantity = quantity
        self.unitPrice = unitPrice
        self.totalPrice = totalPrice
        self.notes = notes
        self.productId = productId
        self.productName = productName
        self.productBarcode = productBarcode
        self.productImages = productImages
        self.productRentPrice = productRentPrice
        self.productDeposit = productDeposit
        self.isReadyToDeliver = isReadyToDeliver
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Required fields
        id = try container.decode(Int.self, forKey: .id)
        quantity = try container.decode(Int.self, forKey: .quantity)
        unitPrice = try container.decode(Double.self, forKey: .unitPrice)
        totalPrice = try container.decode(Double.self, forKey: .totalPrice)
        notes = try container.decodeIfPresent(String.self, forKey: .notes)
        
        let embedded = try container.decodeIfPresent(EmbeddedProduct.self, forKey: .product)
        
        // Product fields - handle missing fields gracefully
        productId = try container.decodeIfPresent(Int.self, forKey: .productId) ?? embedded?.id
        
        if let flat = try container.decodeIfPresent(String.self, forKey: .productName)?
            .trimmingCharacters(in: .whitespacesAndNewlines), !flat.isEmpty {
            productName = flat
        } else if let nested = embedded?.name?.trimmingCharacters(in: .whitespacesAndNewlines), !nested.isEmpty {
            productName = nested
        } else {
            productName = "Unknown Product"
        }
        
        if let flat = try container.decodeIfPresent(String.self, forKey: .productBarcode)?
            .trimmingCharacters(in: .whitespacesAndNewlines), !flat.isEmpty {
            productBarcode = flat
        } else if let nested = embedded?.barcode?.trimmingCharacters(in: .whitespacesAndNewlines), !nested.isEmpty {
            productBarcode = nested
        } else {
            productBarcode = nil
        }
        
        // Handle productImages: array, JSON string, empty [], or missing — then embedded product.images
        if container.contains(.productImages) {
            if let imagesArray = try? container.decode([String].self, forKey: .productImages), !imagesArray.isEmpty {
                productImages = imagesArray
            } else if let imagesString = try? container.decode(String.self, forKey: .productImages),
                      let jsonData = imagesString.data(using: .utf8),
                      let parsedArray = try? JSONDecoder().decode([String].self, from: jsonData),
                      !parsedArray.isEmpty {
                productImages = parsedArray
            } else {
                productImages = Self.nonEmptyImages(embedded?.images)
            }
        } else {
            productImages = Self.nonEmptyImages(embedded?.images)
        }
        
        productRentPrice = try container.decodeIfPresent(Double.self, forKey: .productRentPrice) ?? embedded?.rentPrice
        let productDepositFlat = try container.decodeIfPresent(Double.self, forKey: .productDeposit)
        let productDepositLine = try container.decodeIfPresent(Double.self, forKey: .deposit)
        productDeposit = productDepositFlat ?? productDepositLine ?? embedded?.deposit
        isReadyToDeliver = try container.decodeIfPresent(Bool.self, forKey: .isReadyToDeliver)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(quantity, forKey: .quantity)
        try container.encode(unitPrice, forKey: .unitPrice)
        try container.encode(totalPrice, forKey: .totalPrice)
        try container.encodeIfPresent(notes, forKey: .notes)
        try container.encodeIfPresent(productId, forKey: .productId)
        try container.encode(productName, forKey: .productName)
        try container.encodeIfPresent(productBarcode, forKey: .productBarcode)
        try container.encodeIfPresent(productImages, forKey: .productImages)
        try container.encodeIfPresent(productRentPrice, forKey: .productRentPrice)
        try container.encodeIfPresent(productDeposit, forKey: .productDeposit)
        try container.encodeIfPresent(isReadyToDeliver, forKey: .isReadyToDeliver)
    }
    
    private static func nonEmptyImages(_ images: [String]?) -> [String]? {
        guard let images = images, !images.isEmpty else { return nil }
        return images
    }
    
    enum CodingKeys: String, CodingKey {
        case id, quantity, unitPrice, totalPrice, notes
        case productId, productName, productBarcode, productImages, productRentPrice, productDeposit
        case product
        case deposit
        case isReadyToDeliver
    }
}

struct ProductDetail: Codable {
    let id: Int
    let name: String
    let barcode: String?
    let description: String?
    let images: [String]?
    let category: CategoryDetail
}

struct CategoryDetail: Codable {
    let id: Int
    let name: String
}

struct MerchantDetail: Codable {
    let id: Int
    let name: String
}

struct Payment: Codable {
    let id: Int
    let amount: Double
    let paymentMethod: String
    let paymentDate: Date
    let status: String
    let notes: String?
}

// MARK: - Update Order Request Model

struct UpdateOrderRequest: Codable {
    let orderType: String?
    let status: String?
    let totalAmount: Double?
    let depositAmount: Double?
    let securityDeposit: Double?
    let customerId: Int?
    let customerName: String?
    let customerPhone: String?
    let customerEmail: String?
    let outletId: Int?
    let pickupPlanAt: String?
    let returnPlanAt: String?
    let pickedUpAt: String?
    let returnedAt: String?
    let rentalDuration: Int?
    let isReadyToDeliver: Bool?
    let collateralType: String?
    let collateralDetails: String?
    let notes: String?
    let pickupNotes: String?
    let returnNotes: String?
    let damageNotes: String?
    let damageFee: Double?
    /// When clearing a discount on update, send `0` for value/amount so the API overwrites stored discount (omitting keys often leaves the old discount).
    let discountType: String?
    let discountValue: Double?
    let discountAmount: Double?
    let orderItems: [UpdateOrderItem]?
    /// URLs of note images (for "delete only" or "set list" via JSON; see API_ORDER_NOTES_IMAGES.md)
    let notesImages: [String]?

    init(orderType: String? = nil, status: String? = nil, totalAmount: Double? = nil, depositAmount: Double? = nil, securityDeposit: Double? = nil, customerId: Int? = nil, customerName: String? = nil, customerPhone: String? = nil, customerEmail: String? = nil, outletId: Int? = nil, pickupPlanAt: String? = nil, returnPlanAt: String? = nil, pickedUpAt: String? = nil, returnedAt: String? = nil, rentalDuration: Int? = nil, isReadyToDeliver: Bool? = nil, collateralType: String? = nil, collateralDetails: String? = nil, notes: String? = nil, pickupNotes: String? = nil, returnNotes: String? = nil, damageNotes: String? = nil, damageFee: Double? = nil, discountType: String? = nil, discountValue: Double? = nil, discountAmount: Double? = nil, orderItems: [UpdateOrderItem]? = nil, notesImages: [String]? = nil) {
        self.orderType = orderType
        self.status = status
        self.totalAmount = totalAmount
        self.depositAmount = depositAmount
        self.securityDeposit = securityDeposit
        self.customerId = customerId
        self.customerName = customerName
        self.customerPhone = customerPhone
        self.customerEmail = customerEmail
        self.outletId = outletId
        self.pickupPlanAt = pickupPlanAt
        self.returnPlanAt = returnPlanAt
        self.pickedUpAt = pickedUpAt
        self.returnedAt = returnedAt
        self.rentalDuration = rentalDuration
        self.isReadyToDeliver = isReadyToDeliver
        self.collateralType = collateralType
        self.collateralDetails = collateralDetails
        self.notes = notes
        self.pickupNotes = pickupNotes
        self.returnNotes = returnNotes
        self.damageNotes = damageNotes
        self.damageFee = damageFee
        self.discountType = discountType
        self.discountValue = discountValue
        self.discountAmount = discountAmount
        self.orderItems = orderItems
        self.notesImages = notesImages
    }

    // Custom encoding to only include non-nil values
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        if let orderType = orderType { try container.encode(orderType, forKey: .orderType) }
        if let status = status { try container.encode(status, forKey: .status) }
        if let totalAmount = totalAmount { try container.encode(totalAmount, forKey: .totalAmount) }
        if let depositAmount = depositAmount { try container.encode(depositAmount, forKey: .depositAmount) }
        if let securityDeposit = securityDeposit { try container.encode(securityDeposit, forKey: .securityDeposit) }
        if let customerId = customerId { try container.encode(customerId, forKey: .customerId) }
        if let customerName = customerName { try container.encode(customerName, forKey: .customerName) }
        if let customerPhone = customerPhone { try container.encode(customerPhone, forKey: .customerPhone) }
        if let customerEmail = customerEmail { try container.encode(customerEmail, forKey: .customerEmail) }
        if let outletId = outletId { try container.encode(outletId, forKey: .outletId) }
        if let pickupPlanAt = pickupPlanAt { try container.encode(pickupPlanAt, forKey: .pickupPlanAt) }
        if let returnPlanAt = returnPlanAt { try container.encode(returnPlanAt, forKey: .returnPlanAt) }
        if let pickedUpAt = pickedUpAt { try container.encode(pickedUpAt, forKey: .pickedUpAt) }
        if let returnedAt = returnedAt { try container.encode(returnedAt, forKey: .returnedAt) }
        if let rentalDuration = rentalDuration { try container.encode(rentalDuration, forKey: .rentalDuration) }
        if let isReadyToDeliver = isReadyToDeliver { try container.encode(isReadyToDeliver, forKey: .isReadyToDeliver) }
        if let collateralType = collateralType { try container.encode(collateralType, forKey: .collateralType) }
        if let collateralDetails = collateralDetails { try container.encode(collateralDetails, forKey: .collateralDetails) }
        if let notes = notes { try container.encode(notes, forKey: .notes) }
        if let pickupNotes = pickupNotes { try container.encode(pickupNotes, forKey: .pickupNotes) }
        if let returnNotes = returnNotes { try container.encode(returnNotes, forKey: .returnNotes) }
        if let damageNotes = damageNotes { try container.encode(damageNotes, forKey: .damageNotes) }
        if let damageFee = damageFee { try container.encode(damageFee, forKey: .damageFee) }
        if let discountType = discountType { try container.encode(discountType, forKey: .discountType) }
        if let discountValue = discountValue { try container.encode(discountValue, forKey: .discountValue) }
        if let discountAmount = discountAmount { try container.encode(discountAmount, forKey: .discountAmount) }
        if let orderItems = orderItems { try container.encode(orderItems, forKey: .orderItems) }
        if let notesImages = notesImages { try container.encode(notesImages, forKey: .notesImages) }
    }

    enum CodingKeys: String, CodingKey {
        case orderType, status, totalAmount, depositAmount, securityDeposit
        case customerId, customerName, customerPhone, customerEmail
        case outletId, pickupPlanAt, returnPlanAt, pickedUpAt, returnedAt
        case rentalDuration, isReadyToDeliver, collateralType, collateralDetails
        case notes, pickupNotes, returnNotes, damageNotes, damageFee
        case discountType, discountValue, discountAmount
        case orderItems, notesImages
    }
}

// MARK: - Update Order Item Model

struct UpdateOrderItem: Codable {
    let productId: Int
    let quantity: Int
    let unitPrice: Double
    let totalPrice: Double
    let deposit: Double?
    let notes: String?
    let rentalDays: Int?
    let imageUrl: String?
}

// MARK: - Update Order Request Extension

extension UpdateOrderRequest {
    // MARK: - Specific Update Constructors
    
    /// Create request for updating ready to deliver status
    static func updateReadyToDeliver(_ isReady: Bool) -> UpdateOrderRequest {
        return UpdateOrderRequest(
            isReadyToDeliver: isReady
        )
    }
    
    /// Create request for updating collateral details
    static func updateCollateralDetails(_ details: String) -> UpdateOrderRequest {
        // If details is empty, set both to nil to clear the collateral
        // If details is provided, set both collateralType and collateralDetails
        let collateralType = details.isEmpty ? nil : "ID_CARD"
        let collateralDetails = details.isEmpty ? nil : details
        
        return UpdateOrderRequest(
            collateralType: collateralType,
            collateralDetails: collateralDetails
        )
    }
    
    /// Create request for updating security deposit
    static func updateSecurityDeposit(_ amount: Double) -> UpdateOrderRequest {
        return UpdateOrderRequest(
            depositAmount: nil,
            securityDeposit: amount
        )
    }
    
    /// Create request for updating notes (text only)
    static func updateNotes(_ notes: String) -> UpdateOrderRequest {
        return UpdateOrderRequest(
            notes: notes
        )
    }

    /// Create request for updating notes and/or setting notesImages array (JSON; use for "delete only" or set list)
    static func updateNotes(_ notes: String, notesImages: [String]?) -> UpdateOrderRequest {
        return UpdateOrderRequest(
            notes: notes,
            notesImages: notesImages
        )
    }
    
    /// Create request for updating damage fee
    static func updateDamageFee(_ amount: Double) -> UpdateOrderRequest {
        return UpdateOrderRequest(
            damageNotes: amount > 0 ? "Damage fee: \(amount)" : nil, damageFee: amount
        )
    }
    
    /// Create request for updating order status
    static func updateStatus(_ status: String) -> UpdateOrderRequest {
        let request = UpdateOrderRequest(
            status: status
        )
        return request
    }
    
    // MARK: - Validation
    
    /// Validates the update request according to API rules
    /// Only validates fields that are actually being updated (non-nil values)
    func validate() -> ValidationResult {
        var errors: [String] = []
        
        // Validate orderType (only if provided)
        if let orderType = orderType {
            if !["RENT", "SALE"].contains(orderType.uppercased()) {
                errors.append("orderType must be either 'RENT' or 'SALE'")
            }
        }
        
        // Validate status (only if provided)
        if let status = status {
            if !["RESERVED", "PICKUPED", "RETURNED", "COMPLETED", "CANCELLED"].contains(status.uppercased()) {
                errors.append("status must be one of: RESERVED, PICKUPED, RETURNED, COMPLETED, CANCELLED")
            }
        }
        
        // Validate outletId (only if provided)
        if let outletId = outletId, outletId <= 0 {
            errors.append("outletId must be a positive integer")
        }
        
        // Validate customerId (only if provided)
        if let customerId = customerId, customerId <= 0 {
            errors.append("customerId must be a positive integer")
        }
        
        // Only validate customer details if we're updating customer info
        // This is for partial updates where only specific fields are being changed
        let isUpdatingCustomer = customerId != nil || customerName != nil || customerPhone != nil || customerEmail != nil
        if isUpdatingCustomer && customerId == nil {
            if let customerName = customerName, customerName.isEmpty {
                errors.append("customerName cannot be empty")
            }
            if let customerPhone = customerPhone, customerPhone.isEmpty {
                errors.append("customerPhone cannot be empty")
            }
        }
        
        // Validate customer email format
        if let customerEmail = customerEmail, !customerEmail.isEmpty {
            if !isValidEmail(customerEmail) {
                errors.append("customerEmail must be a valid email format")
            }
        }
        
        // Validate amounts
        if let totalAmount = totalAmount, totalAmount < 0 {
            errors.append("totalAmount must be non-negative")
        }
        
        if let depositAmount = depositAmount, depositAmount < 0 {
            errors.append("depositAmount must be non-negative")
        }
        
        if let securityDeposit = securityDeposit, securityDeposit < 0 {
            errors.append("securityDeposit must be non-negative")
        }
        
        if let discountType = discountType {
            if !["percentage", "amount"].contains(discountType.lowercased()) {
                errors.append("discountType must be either 'percentage' or 'amount'")
            }
        }
        if let discountValue = discountValue, discountValue < 0 {
            errors.append("discountValue must be non-negative")
        }
        if let discountType = discountType, discountType.lowercased() == "percentage", let discountValue = discountValue, discountValue > 100 {
            errors.append("discountValue cannot exceed 100 when discountType is 'percentage'")
        }
        if let discountAmount = discountAmount, discountAmount < 0 {
            errors.append("discountAmount must be non-negative")
        }
        
        // Validate rentalDuration
        if let rentalDuration = rentalDuration, rentalDuration <= 0 {
            errors.append("rentalDuration must be a positive integer")
        }
        
        // Validate collateralType
        if let collateralType = collateralType {
            if !["CASH", "ID_CARD", "CREDIT_CARD", "DOCUMENT"].contains(collateralType.uppercased()) {
                errors.append("collateralType must be one of: CASH, ID_CARD, CREDIT_CARD, DOCUMENT")
            }
        }
        
        // Validate collateralDetails (required if collateralType is provided)
        if collateralType != nil && (collateralDetails == nil || collateralDetails?.isEmpty == true) {
            errors.append("collateralDetails is required when collateralType is provided")
        }
        
        // Validate orderItems
        if let orderItems = orderItems {
            for (index, item) in orderItems.enumerated() {
                if item.productId <= 0 {
                    errors.append("orderItems[\(index)].productId must be a positive integer")
                }
                if item.quantity <= 0 {
                    errors.append("orderItems[\(index)].quantity must be a positive integer")
                }
                if item.unitPrice < 0 {
                    errors.append("orderItems[\(index)].unitPrice must be non-negative")
                }
                if item.totalPrice < 0 {
                    errors.append("orderItems[\(index)].totalPrice must be non-negative")
                }
                if let deposit = item.deposit, deposit < 0 {
                    errors.append("orderItems[\(index)].deposit must be non-negative")
                }
                if let rentalDays = item.rentalDays, rentalDays <= 0 {
                    errors.append("orderItems[\(index)].rentalDays must be a positive integer")
                }
            }
        }
        
        return ValidationResult(isValid: errors.isEmpty, errors: errors)
    }
    
    /// Basic ISO 8601 date format validation
    private func isValidISODate(_ dateString: String) -> Bool {
        let formatter = ISO8601DateFormatter()
        return formatter.date(from: dateString) != nil
    }
    
    /// Basic email format validation
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
    
    // MARK: - Helper Methods
    
    /// Convert to dictionary for analytics tracking
    func toDictionary() -> [String: Any] {
        var dict: [String: Any] = [:]
        
        if let orderType = orderType { dict["orderType"] = orderType }
        if let status = status { dict["status"] = status }
        if let totalAmount = totalAmount { dict["totalAmount"] = totalAmount }
        if let depositAmount = depositAmount { dict["depositAmount"] = depositAmount }
        if let securityDeposit = securityDeposit { dict["securityDeposit"] = securityDeposit }
        if let customerId = customerId { dict["customerId"] = customerId }
        if let customerName = customerName { dict["customerName"] = customerName }
        if let customerPhone = customerPhone { dict["customerPhone"] = customerPhone }
        if let customerEmail = customerEmail { dict["customerEmail"] = customerEmail }
        if let outletId = outletId { dict["outletId"] = outletId }
        if let pickupPlanAt = pickupPlanAt { dict["pickupPlanAt"] = pickupPlanAt }
        if let returnPlanAt = returnPlanAt { dict["returnPlanAt"] = returnPlanAt }
        if let pickedUpAt = pickedUpAt { dict["pickedUpAt"] = pickedUpAt }
        if let returnedAt = returnedAt { dict["returnedAt"] = returnedAt }
        if let rentalDuration = rentalDuration { dict["rentalDuration"] = rentalDuration }
        if let isReadyToDeliver = isReadyToDeliver { dict["isReadyToDeliver"] = isReadyToDeliver }
        if let collateralType = collateralType { dict["collateralType"] = collateralType }
        if let collateralDetails = collateralDetails { dict["collateralDetails"] = collateralDetails }
        if let notes = notes { dict["notes"] = notes }
        if let pickupNotes = pickupNotes { dict["pickupNotes"] = pickupNotes }
        if let returnNotes = returnNotes { dict["returnNotes"] = returnNotes }
        if let damageNotes = damageNotes { dict["damageNotes"] = damageNotes }
        if let damageFee = damageFee { dict["damageFee"] = damageFee }
        if let orderItems = orderItems { 
            dict["orderItems"] = orderItems.map { item in
                var itemDict: [String: Any] = [:]
                itemDict["productId"] = item.productId
                itemDict["quantity"] = item.quantity
                itemDict["unitPrice"] = item.unitPrice
                itemDict["totalPrice"] = item.totalPrice
                if let deposit = item.deposit { itemDict["deposit"] = deposit }
                if let notes = item.notes { itemDict["notes"] = notes }
                if let rentalDays = item.rentalDays { itemDict["rentalDays"] = rentalDays }
                return itemDict
            }
        }
        
        return dict
    }
}

// MARK: - Print Data Extension

extension Order {
    func toPrintData() -> Data {
        var data = Data()
        
        // Initialize printer
        data.append(PrinterCommand.initializePrinter())
        
        // Store header
        if let user = User.account() {
            // Center alignment and bold for store name
            data.append(PrinterCommand.selectAlignment(PrinterCommand.Alignment.center.rawValue))
            data.append(PrinterCommand.selectOrCancleBoldModel(1))
            let storeName = user.storeName?.uppercased() ?? merchantName?.uppercased() ?? ""
            data.append(storeName.localized().formatStringOriginalCharacter().data(using: .utf8)!)
            data.append("\n\n".data(using: .utf8)!)
            data.append(PrinterCommand.selectOrCancleBoldModel(0))
            data.append(PrinterCommand.selectAlignment(PrinterCommand.Alignment.left.rawValue))
            
            // Store details
            let phone = user.outlet?.phone ?? user.merchant?.phone ?? ""
            let address = user.address ?? ""
            data.append("\(("Phone".localized().formatStringOriginalCharacter())): \(phone.formatStringOriginalCharacter())\n".data(using: .utf8)!)
            data.append("\(("Address".localized().formatStringOriginalCharacter())): \(address.formatStringOriginalCharacter())\n".data(using: .utf8)!)
            
            // Center alignment for separator
            data.append(PrinterCommand.selectAlignment(PrinterCommand.Alignment.center.rawValue))
            data.append("------------------\n\n".data(using: .utf8)!)
        }
        
        // Order details
        data.append(PrinterCommand.selectAlignment(PrinterCommand.Alignment.center.rawValue))
        data.append(PrinterCommand.selectOrCancleBoldModel(1))
        data.append("\(("Order".localized())) #\(orderNumber.formatStringOriginalCharacter())\n".data(using: .utf8)!)
        data.append(PrinterCommand.selectOrCancleBoldModel(0))
        data.append(PrinterCommand.selectAlignment(PrinterCommand.Alignment.left.rawValue))
        
        // Customer info
        data.append("\n".data(using: .utf8)!)
        data.append(PrinterCommand.selectOrCancleBoldModel(1))
        let customerPhone = customerPhone ?? ""
        data.append("\(("Customer".localized().formatStringOriginalCharacter())): \(customerName.formatStringOriginalCharacter()) - \(customerPhone.formatStringOriginalCharacter())\n".data(using: .utf8)!)
        data.append(PrinterCommand.selectOrCancleBoldModel(0))
        
        // Order type specific details
        if orderType == .rent {
            // Deposit info
            if depositAmount > 0 {
                data.append("\(("Deposit".localized().formatStringOriginalCharacter())): \(depositAmount.formatStringInCommon())\n".data(using: .utf8)!)
            } else {
                data.append("\(("Deposit".localized().formatStringOriginalCharacter())): \(("NO DEPOSIT".localized().formatStringOriginalCharacter()))\n".data(using: .utf8)!)
            }
            
            // Dates
            if let pickupDate = pickupDate, let returnDate = returnDate {
                let pickupDateStr = pickupDate.dateInString()?.formatStringOriginalCharacter() ?? ""
                let returnDateStr = returnDate.dateInString()?.formatStringOriginalCharacter() ?? ""
                data.append("\(("Rent Date".localized().formatStringOriginalCharacter())): \(pickupDateStr)    \(("Return Date".localized().formatStringOriginalCharacter())): \(returnDateStr)\n".data(using: .utf8)!)
            }
            
            data.append("\(("Order Date".localized().formatStringOriginalCharacter())): \(createdAt.fullDateInString()?.formatStringOriginalCharacter() ?? "")\n".data(using: .utf8)!)
        } else {
            data.append("\(("Order Date".localized().formatStringOriginalCharacter())): \(createdAt.fullDateInString()?.formatStringOriginalCharacter() ?? "")\n".data(using: .utf8)!)
        }
        
        // Products list
        data.append(PrinterCommand.selectOrCancleBoldModel(0))
        data.append("------------------------------------------------\n".data(using: .utf8)!)
        
        for (index, item) in orderItems.enumerated() {
            if let note = item.notes, !note.isEmpty {
                data.append("\(index + 1). \(item.productName.formatStringOriginalCharacter()) (\(note.formatStringOriginalCharacter()))\n".data(using: .utf8)!)
            } else {
                data.append("\(index + 1). \(item.productName.formatStringOriginalCharacter())\n".data(using: .utf8)!)
            }
            
            // Right alignment for price
            data.append(PrinterCommand.selectAlignment(PrinterCommand.Alignment.right.rawValue))
            data.append("\(item.quantity) x \(item.unitPrice.formatStringInCommon()) = \(item.totalPrice.formatStringInCommon())\n".data(using: .utf8)!)
            data.append(PrinterCommand.selectAlignment(PrinterCommand.Alignment.left.rawValue))
        }
        
        // Note if exists
        if let note = notes, !note.isEmpty {
            data.append(PrinterCommand.selectOrCancleBoldModel(1))
            data.append("*** \(("Note".localized().formatStringOriginalCharacter())): \(note.formatStringOriginalCharacter())\n".data(using: .utf8)!)
            data.append(PrinterCommand.selectAlignment(PrinterCommand.Alignment.left.rawValue))
        }
        
        // Total and discount
        data.append("------------------------------------------------\n".data(using: .utf8)!)
        data.append(PrinterCommand.selectOrCancleBoldModel(1))
        data.append(PrinterCommand.selectAlignment(PrinterCommand.Alignment.right.rawValue))
        
        let subtotal = orderItems.reduce(0.0) { $0 + $1.totalPrice }
        data.append("\(("Subtotal".localized().formatStringOriginalCharacter().uppercased())): \(subtotal.formatStringInCommon())\n".data(using: .utf8)!)
        if discountAmount > 0 {
            let discountType = discountType ?? "amount"
            if discountType == "amount" {
                data.append("\(("Discount".localized().formatStringOriginalCharacter().uppercased())): \(discountAmount.formatStringInCommon()) d\n".data(using: .utf8)!)
            } else {
                data.append("\(("Discount".localized().formatStringOriginalCharacter().uppercased())): \(discountValue.formatStringInCommon())%\n".data(using: .utf8)!)
            }
            data.append("------------------\n".data(using: .utf8)!)
            data.append("\(("Total".localized().formatStringOriginalCharacter().uppercased())): \(totalAmount.formatStringInCommon())\n\n".data(using: .utf8)!)
        } else {
            data.append("\(("Discount".localized().formatStringOriginalCharacter().uppercased())): 0\n".data(using: .utf8)!)
            data.append("------------------\n".data(using: .utf8)!)
            data.append("\(("Total".localized().formatStringOriginalCharacter())): \(totalAmount.formatStringInCommon())\n\n".data(using: .utf8)!)
        }
        
        // Footer for rent orders
        if orderType == .rent {
            // Add note from printer settings
            let note = Utils.loadNotePrinter()
            data.append(PrinterCommand.selectOrCancleBoldModel(1))
            data.append(PrinterCommand.selectAlignment(PrinterCommand.Alignment.center.rawValue))
            data.append("\(("Note".localized().formatStringOriginalCharacter()))\n".data(using: .utf8)!)
            data.append(PrinterCommand.selectAlignment(PrinterCommand.Alignment.left.rawValue))
            data.append(PrinterCommand.selectOrCancleBoldModel(0))
            data.append("\(note.formatStringOriginalCharacter())\n".data(using: .utf8)!)
            
            data.append("------------------------------------------------\n".data(using: .utf8)!)
            
            // Signature lines
            let customerSignature = "Customer Signature".localized().formatStringOriginalCharacter()
            let storeSignature = "Store Signature".localized().formatStringOriginalCharacter()
            let signatureLine = String(format: "Signature Line Format".localized(), customerSignature, storeSignature)
            data.append("\(signatureLine)\n".data(using: .utf8)!)
            data.append("\n\n\n\n".data(using: .utf8)!)
            data.append("\n\n\n\n".data(using: .utf8)!)
        }
        
        // Thank you message
        data.append("\n".data(using: .utf8)!)
        data.append(PrinterCommand.selectAlignment(PrinterCommand.Alignment.center.rawValue))
        data.append("\(("Thank you for shopping".localized().formatStringOriginalCharacter().uppercased()))\n\n".data(using: .utf8)!)
        
        // Barcode
        data.append(PrinterCommand.printBarcode(orderNumber))
        
        // Footer with app info
        data.append(PrinterCommand.selectAlignment(PrinterCommand.Alignment.center.rawValue))
        data.append("------------------------------------------------\n".data(using: .utf8)!)
        data.append("\(("Download AnyRent on App Store".localized().formatStringOriginalCharacter()))\n".data(using: .utf8)!)
        data.append(PrinterCommand.selectAlignment(PrinterCommand.Alignment.left.rawValue))
        
        // Paper feed and cut
        data.append("\n\n\n\n\n\n".data(using: .utf8)!)
        data.append(PrinterCommand.feedPaper(2))
        data.append(PrinterCommand.cutPaper())
        
        return data
    }
}

// MARK: - Validation Result

struct ValidationResult {
    let isValid: Bool
    let errors: [String]
}
