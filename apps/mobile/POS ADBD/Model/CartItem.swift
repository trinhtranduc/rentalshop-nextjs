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
    
    // Computed properties
    var subTotal: Double {
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
    }
    
}

