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
    var customFixedPrice: Double?
    var customDailyPrice: Double?
    
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

    /// Switch between the two cart pricing modes. Products created before
    /// pricingOptions existed keep their current price as a legacy option;
    /// the missing mode is still selectable with a zero price.
    mutating func selectPricingType(_ type: String) {
        let normalizedType = type.uppercased()
        let currentType = pricingType?.uppercased() ?? "FIXED"

        if pricingOptions?.contains(where: { $0.type.uppercased() == currentType }) != true {
            let legacyOption = PricingOption(
                id: selectedPricingOptionId,
                type: currentType,
                price: price,
                isDefault: true,
                isActive: true
            )
            if pricingOptions == nil {
                pricingOptions = []
            }
            pricingOptions?.append(legacyOption)
        }

        let option = pricingOptions?.first(where: { $0.type.uppercased() == normalizedType })
        selectedPricingOptionId = option?.id
        pricingType = normalizedType
        if normalizedType == "DAILY" {
            price = customDailyPrice ?? option?.price ?? 0
        } else {
            price = customFixedPrice ?? option?.price ?? 0
        }
        customRentPrice = price
    }

    /// Save a manual rental price for the currently selected pricing mode.
    /// FIXED and DAILY values are intentionally independent.
    mutating func setCustomRentalPrice(_ value: Double) {
        let currentType = pricingType?.uppercased() ?? "FIXED"
        if currentType == "DAILY" {
            customDailyPrice = value
        } else {
            customFixedPrice = value
        }
        customRentPrice = value
        price = value
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
        self.customFixedPrice = customRentPrice
        self.customDailyPrice = nil
        self.availabilityStatus = availabilityStatus
    }
    
    // Convenience init from Product model
    init(from product: Product, quantity: Int, price: Double) {
        self.productId = product.product_id != 0 ? product.product_id : (product.id ?? 0)
        self.productName = product.name
        self.barcode = product.barcode
        self.quantity = quantity
        self.price = price
        self.deposit = product.deposit ?? 0
        // A cart note belongs to this order line and must start empty. Product
        // description/note metadata should not prefill an editable order note.
        self.note = nil
        self.imageUrl = product.image_url ?? product.images?.first
        
        // Store original prices from product
        self.originalRentPrice = product.rentPrice ?? product.rent
        self.originalSalePrice = product.salePrice ?? product.sale
        self.customRentPrice = nil
        self.customSalePrice = nil
        self.customFixedPrice = nil
        self.customDailyPrice = nil
        
        // Daily pricing + multiple options. Legacy products expose their
        // existing rent price as the configured mode so the cart can still
        // offer the missing FIXED/DAILY mode at price zero.
        let activeOptions = product.pricingOptions?.filter { $0.isActive != false } ?? []
        if activeOptions.isEmpty {
            let legacyType = product.pricingType?.uppercased() ?? "FIXED"
            self.pricingOptions = [
                PricingOption(
                    id: nil,
                    type: legacyType,
                    price: product.rentPrice ?? product.rent,
                    isDefault: true,
                    isActive: true
                )
            ]
        } else {
            self.pricingOptions = activeOptions
        }
        self.rentalDays = 1
        if let def = self.pricingOptions?.first(where: { $0.isDefault == true })
            ?? self.pricingOptions?.first {
            self.selectedPricingOptionId = def.id
            self.pricingType = def.type
            self.price = def.price
        } else {
            self.pricingType = product.pricingType ?? "FIXED"
        }
    }
    
}
