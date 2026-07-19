//
//  CartItem.swift
//  POS ADBD
//
//  Created by Assistant on 2025-10-22.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation

// MARK: - Availability Status
/// Represents product availability status
struct AvailabilityStatus: Codable {
    let isAvailable: Bool
    let available: Int
}

// MARK: - CartItem Model
/// Represents a single item in the shopping cart
struct CartItem: Codable {
    let productId: Int
    let productName: String?
    let barcode: String?
    var quantity: Int
    var price: Double
    var deposit: Double
    var note: String?
    var imageUrl: String?
    
    // Store original prices from product when added to cart
    let originalRentPrice: Double
    let originalSalePrice: Double
    
    // Store custom prices if user manually changes them
    var customRentPrice: Double?
    var customSalePrice: Double?
    
    // Product availability status (for rent orders)
    // nil = not loaded yet (loading state)
    var availabilityStatus: AvailabilityStatus? = nil
    
    // Daily rental pricing
    var pricingType: String?  // nil/FIXED = fixed, DAILY = per-day
    var rentalDays: Int = 1   // Number of rental days (only used when pricingType == DAILY)

    // Multiple pricing options (Phase 1: FIXED + DAILY)
    var pricingOptions: [PricingOption]?
    var selectedPricingOptionId: Int?

    /// Whether this cart item uses per-day pricing
    var isDailyPricing: Bool {
        return pricingType?.uppercased() == "DAILY"
    }

    /// Whether this cart item offers more than one pricing option
    var hasMultiplePricingOptions: Bool {
        return (pricingOptions?.count ?? 0) > 1
    }

    /// Switch to a different pricing option (updates price + pricingType)
    mutating func selectPricingOption(_ optionId: Int) {
        guard let opt = pricingOptions?.first(where: { $0.id == optionId }) else { return }
        self.selectedPricingOptionId = optionId
        self.pricingType = opt.type
        self.price = opt.price
        self.customRentPrice = opt.price
    }
    
    // Computed properties
    var subTotal: Double {
        if isDailyPricing {
            return Double(quantity) * price * Double(rentalDays)
        }
        return Double(quantity) * price
    }
    
    var totalDeposit: Double {
        return Double(quantity) * deposit
    }
    
    /// Get effective price for a given order type (rent or sale)
    /// Priority: custom price > original price
    func effectivePrice(for orderType: OrderType) -> Double {
        if orderType == .rent {
            return customRentPrice ?? originalRentPrice
        } else {
            return customSalePrice ?? originalSalePrice
        }
    }
    
    // MARK: - Initialization
    init(productId: Int, productName: String?, barcode: String?, quantity: Int, price: Double, deposit: Double, note: String? = nil, imageUrl: String? = nil, originalRentPrice: Double, originalSalePrice: Double, customRentPrice: Double? = nil, customSalePrice: Double? = nil, availabilityStatus: AvailabilityStatus? = nil) {
        self.productId = productId
        self.productName = productName
        self.barcode = barcode
        self.quantity = quantity
        self.price = price
        self.deposit = deposit
        self.note = note
        self.imageUrl = imageUrl
        self.originalRentPrice = originalRentPrice
        self.originalSalePrice = originalSalePrice
        self.customRentPrice = customRentPrice
        self.customSalePrice = customSalePrice
        self.availabilityStatus = availabilityStatus
    }
    
    // Convenience init from Product model
    init(from product: Product, quantity: Int, price: Double) {
        self.productId = product.product_id ?? product.id ?? 0
        self.productName = product.name
        self.barcode = product.barcode
        self.quantity = quantity
        self.price = price
        self.deposit = product.deposit ?? 0
        self.note = product.note
        self.imageUrl = product.image_url ?? product.images?.first
        
        // Store original prices from product
        self.originalRentPrice = product.rentPrice ?? product.rent
        self.originalSalePrice = product.salePrice ?? product.sale
        self.customRentPrice = nil
        self.customSalePrice = nil
        
        // Daily pricing + multiple options
        self.pricingOptions = product.pricingOptions
        self.rentalDays = 1
        if let def = product.defaultPricingOption {
            self.selectedPricingOptionId = def.id
            self.pricingType = def.type
        } else {
            self.pricingType = product.pricingType
        }
    }
    
}

