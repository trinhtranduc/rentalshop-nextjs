//
//  ProductRequest.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-20.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation

// MARK: - Create Product Request Model
/// Request model for creating new products - matches API form-data structure
struct CreateProductRequest: Codable {
    let name: String
    let description: String?
    let barcode: String?
    let rentPrice: Double
    let salePrice: Double?
    let costPrice: Double?
    let deposit: Double?
    let totalStock: Int
    let categoryId: Int? // Optional - server may set default
    let merchantId: Int? // Optional - server may set default
    let outletStock: [OutletStockItem] // Array of outlet stock objects
    let images: [String]? // Optional image URLs/filenames
    // Pricing configuration (default FIXED if nil). "FIXED" = per rental, "DAILY" = per day.
    let pricingType: String?
    // JSON string { minDuration, maxDuration, defaultDuration } - required by API when pricingType == "DAILY"
    let durationConfig: String?
    // Multiple pricing options (Phase 1: FIXED + DAILY)
    let pricingOptions: [PricingOptionRequest]?
    /// #1189: 2 = this client sends the full option list including BLOCK
    var pricingSchemaVersion: Int? = nil
}

// MARK: - Outlet Stock Item Model
struct OutletStockItem: Codable {
    let outletId: Int
    let stock: Int
}

// MARK: - Pricing Option Request Model (Phase 1: FIXED + DAILY)
struct PricingOptionRequest: Codable {
    let type: String        // "FIXED" | "DAILY" | "BLOCK"
    let price: Double
    let isDefault: Bool
    // #1189: only on a BLOCK option (`price` = day-1 price); left out of the JSON otherwise
    var blockTiers: [Double]? = nil
    var blockStartDay: Int? = nil
    var blockExtraMode: String? = nil
    var blockExtraPrice: Double? = nil

    init(type: String, price: Double, isDefault: Bool) {
        self.type = type
        self.price = price
        self.isDefault = isDefault
    }

    init(type: String, price: Double, isDefault: Bool, table: BlockTable) {
        self.init(type: type, price: price, isDefault: isDefault)
        blockTiers = table.tiers
        blockStartDay = table.startDay
        blockExtraMode = table.extraMode
        blockExtraPrice = table.extraPrice
    }
}

extension PricingOptionRequest {
    /// The option as the form-data JSON of the product routes; block fields only on a BLOCK option
    var formDictionary: [String: Any] {
        var dict: [String: Any] = ["type": type, "price": price, "isDefault": isDefault]
        if let blockTiers { dict["blockTiers"] = blockTiers }
        if let blockStartDay { dict["blockStartDay"] = blockStartDay }
        if let blockExtraMode { dict["blockExtraMode"] = blockExtraMode }
        if let blockExtraPrice { dict["blockExtraPrice"] = blockExtraPrice }
        return dict
    }
}

/// #1189: the API stores BLOCK options only from a client that says it knows them
enum ProductPricingSchema {
    static let version = 2
}

// MARK: - Create Product Request Extension
extension CreateProductRequest {
    // MARK: - Validation
    func validate() -> (isValid: Bool, errors: [String]) {
        var errors: [String] = []
        
        // Required fields
        if name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors.append("Product name is required")
        }
        
        if rentPrice < 0 {
            errors.append("Rent price must be non-negative")
        }
        
        if let salePrice = salePrice, salePrice < 0 {
            errors.append("Sale price must be non-negative")
        }
        
        if totalStock < 0 {
            errors.append("Total stock must be non-negative")
        }
        
        if let deposit = deposit, deposit < 0 {
            errors.append("Deposit must be non-negative")
        }
        
        if let categoryId = categoryId, categoryId <= 0 {
            errors.append("Category ID must be positive")
        }
        
        if let merchantId = merchantId, merchantId <= 0 {
            errors.append("Merchant ID must be positive")
        }
        
        // Validate outletStock array
        for (index, outletItem) in outletStock.enumerated() {
            if outletItem.outletId <= 0 {
                errors.append("Outlet ID at index \(index) must be positive")
            }
            if outletItem.stock < 0 {
                errors.append("Stock at index \(index) must be non-negative")
            }
        }
        
        return (errors.isEmpty, errors)
    }
    
    // MARK: - Factory Methods
    static func create(
        name: String,
        description: String? = nil,
        barcode: String? = nil,
        rentPrice: Double,
        salePrice: Double? = nil,
        costPrice: Double? = nil,
        deposit: Double? = nil,
        totalStock: Int,
        categoryId: Int? = nil,
        merchantId: Int? = nil,
        outletId: Int,
        images: [String]? = nil,
        pricingType: String? = nil,
        durationConfig: String? = nil,
        pricingOptions: [PricingOptionRequest]? = nil,
        pricingSchemaVersion: Int? = nil
    ) -> CreateProductRequest {
        let outletStock = [OutletStockItem(outletId: outletId, stock: totalStock)]

        return CreateProductRequest(
            name: name,
            description: description,
            barcode: barcode,
            rentPrice: rentPrice,
            salePrice: salePrice,
            costPrice: costPrice,
            deposit: deposit,
            totalStock: totalStock,
            categoryId: categoryId,
            merchantId: merchantId,
            outletStock: outletStock,
            images: images,
            pricingType: pricingType,
            durationConfig: durationConfig,
            pricingOptions: pricingOptions,
            pricingSchemaVersion: pricingSchemaVersion
        )
    }
}

// MARK: - Update Product Request Model
/// Request model for updating existing products - matches API form-data structure
struct UpdateProductRequest: Codable {
    let name: String?
    let description: String?
    let barcode: String?
    let rentPrice: Double?
    let salePrice: Double?
    let costPrice: Double?
    let deposit: Double?
    let totalStock: Int?
    let categoryId: Int?
    let merchantId: Int?
    let outletStock: [OutletStockItem]? // Array of outlet stock objects
    let images: [String]? // Optional image URLs/filenames
    let isActive: Bool?
    // Pricing configuration (nil = leave unchanged). "FIXED" = per rental, "DAILY" = per day.
    let pricingType: String?
    // JSON string { minDuration, maxDuration, defaultDuration } - required by API when pricingType == "DAILY"
    let durationConfig: String?
    // Multiple pricing options (Phase 1: FIXED + DAILY)
    let pricingOptions: [PricingOptionRequest]?
    /// #1189: 2 = this client sends the full option list including BLOCK
    var pricingSchemaVersion: Int? = nil

    // Default nil so existing factory methods (which omit these) keep compiling
    init(
        name: String?,
        description: String?,
        barcode: String?,
        rentPrice: Double?,
        salePrice: Double?,
        costPrice: Double?,
        deposit: Double?,
        totalStock: Int?,
        categoryId: Int?,
        merchantId: Int?,
        outletStock: [OutletStockItem]?,
        images: [String]?,
        isActive: Bool?,
        pricingType: String? = nil,
        durationConfig: String? = nil,
        pricingOptions: [PricingOptionRequest]? = nil,
        pricingSchemaVersion: Int? = nil
    ) {
        self.pricingSchemaVersion = pricingSchemaVersion
        self.name = name
        self.description = description
        self.barcode = barcode
        self.rentPrice = rentPrice
        self.salePrice = salePrice
        self.costPrice = costPrice
        self.deposit = deposit
        self.totalStock = totalStock
        self.categoryId = categoryId
        self.merchantId = merchantId
        self.outletStock = outletStock
        self.images = images
        self.isActive = isActive
        self.pricingType = pricingType
        self.durationConfig = durationConfig
        self.pricingOptions = pricingOptions
    }

    // MARK: - Validation
    func validate() -> (isValid: Bool, errors: [String]) {
        var errors: [String] = []
        
        // Validate provided fields only
        if let name = name, name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors.append("Product name cannot be empty")
        }
        
        if let rentPrice = rentPrice, rentPrice < 0 {
            errors.append("Rent price must be non-negative")
        }
        
        if let salePrice = salePrice, salePrice < 0 {
            errors.append("Sale price must be non-negative")
        }
        
        if let totalStock = totalStock, totalStock < 0 {
            errors.append("Total stock must be non-negative")
        }
        
        if let deposit = deposit, deposit < 0 {
            errors.append("Deposit must be non-negative")
        }
        
        if let categoryId = categoryId, categoryId <= 0 {
            errors.append("Category ID must be positive")
        }
        
        if let merchantId = merchantId, merchantId <= 0 {
            errors.append("Merchant ID must be positive")
        }
        
        // Validate outletStock array if provided
        if let outletStock = outletStock {
            for (index, outletItem) in outletStock.enumerated() {
                if outletItem.outletId <= 0 {
                    errors.append("Outlet ID at index \(index) must be positive")
                }
                if outletItem.stock < 0 {
                    errors.append("Stock at index \(index) must be non-negative")
                }
            }
        }
        
        return (errors.isEmpty, errors)
    }
    
    // MARK: - Factory Methods
    static func updateName(_ name: String) -> UpdateProductRequest {
        return UpdateProductRequest(
            name: name,
            description: nil,
            barcode: nil,
            rentPrice: nil,
            salePrice: nil,
            costPrice: nil,
            deposit: nil,
            totalStock: nil,
            categoryId: nil,
            merchantId: nil,
            outletStock: nil,
            images: nil,
            isActive: nil
        )
    }
    
    static func updatePrices(rentPrice: Double, salePrice: Double, deposit: Double? = nil) -> UpdateProductRequest {
        return UpdateProductRequest(
            name: nil,
            description: nil,
            barcode: nil,
            rentPrice: rentPrice,
            salePrice: salePrice,
            costPrice: nil,
            deposit: deposit,
            totalStock: nil,
            categoryId: nil,
            merchantId: nil,
            outletStock: nil,
            images: nil,
            isActive: nil
        )
    }
    
    static func updateStock(_ totalStock: Int, outletId: Int) -> UpdateProductRequest {
        let outletStock = [OutletStockItem(outletId: outletId, stock: totalStock)]
        
        return UpdateProductRequest(
            name: nil,
            description: nil,
            barcode: nil,
            rentPrice: nil,
            salePrice: nil,
            costPrice: nil,
            deposit: nil,
            totalStock: totalStock,
            categoryId: nil,
            merchantId: nil,
            outletStock: outletStock,
            images: nil,
            isActive: nil
        )
    }
    
    static func updateCategory(_ categoryId: Int) -> UpdateProductRequest {
        return UpdateProductRequest(
            name: nil,
            description: nil,
            barcode: nil,
            rentPrice: nil,
            salePrice: nil,
            costPrice: nil,
            deposit: nil,
            totalStock: nil,
            categoryId: categoryId,
            merchantId: nil,
            outletStock: nil,
            images: nil,
            isActive: nil
        )
    }
    
    static func updateMerchant(_ merchantId: Int) -> UpdateProductRequest {
        return UpdateProductRequest(
            name: nil,
            description: nil,
            barcode: nil,
            rentPrice: nil,
            salePrice: nil,
            costPrice: nil,
            deposit: nil,
            totalStock: nil,
            categoryId: nil,
            merchantId: merchantId,
            outletStock: nil,
            images: nil,
            isActive: nil
        )
    }
    
    static func updateImages(_ images: [String]) -> UpdateProductRequest {
        return UpdateProductRequest(
            name: nil,
            description: nil,
            barcode: nil,
            rentPrice: nil,
            salePrice: nil,
            costPrice: nil,
            deposit: nil,
            totalStock: nil,
            categoryId: nil,
            merchantId: nil,
            outletStock: nil,
            images: images,
            isActive: nil
        )
    }
    
    static func updateStatus(_ isActive: Bool) -> UpdateProductRequest {
        return UpdateProductRequest(
            name: nil,
            description: nil,
            barcode: nil,
            rentPrice: nil,
            salePrice: nil,
            costPrice: nil,
            deposit: nil,
            totalStock: nil,
            categoryId: nil,
            merchantId: nil,
            outletStock: nil,
            images: nil,
            isActive: isActive
        )
    }
}

// MARK: - Product Request Extension
extension UpdateProductRequest {
    // MARK: - Conversion to Form Data
    
    /// Convert UpdateProductRequest to form data dictionary for API submission
    func toFormData() -> [String: Any] {
        var formData: [String: Any] = [:]
        
        if let name = name { formData["name"] = name }
        if let description = description { formData["description"] = description }
        if let barcode = barcode { formData["barcode"] = barcode }
        if let rentPrice = rentPrice { formData["rentPrice"] = rentPrice }
        if let salePrice = salePrice { formData["salePrice"] = salePrice }
        if let costPrice = costPrice { formData["costPrice"] = costPrice }
        if let deposit = deposit { formData["deposit"] = deposit }
        if let totalStock = totalStock { formData["totalStock"] = totalStock }
        if let categoryId = categoryId { formData["categoryId"] = categoryId }
        if let merchantId = merchantId { formData["merchantId"] = merchantId }
        if let outletStock = outletStock {
            // Convert outletStock array to array of dictionaries
            let outletStockArray = outletStock.map { ["outletId": $0.outletId, "stock": $0.stock] }
            formData["outletStock"] = outletStockArray
        }
        if let isActive = isActive { formData["isActive"] = isActive }
        // Kept photo URLs (the API adds uploaded files after them). nil = not sent, as before.
        if let images = images { formData["images"] = images }
        if let pricingType = pricingType { formData["pricingType"] = pricingType }
        if let durationConfig = durationConfig { formData["durationConfig"] = durationConfig }
        if let pricingOptions = pricingOptions {
            formData["pricingOptions"] = pricingOptions.map { $0.formDictionary }
            // #1189: only the v2 form sends it (the API then replaces the BLOCK option with ours); the old form keeps it stored
            if let pricingSchemaVersion { formData["pricingSchemaVersion"] = pricingSchemaVersion }
        }

        return formData
    }
}

extension CreateProductRequest {
    /// Convert CreateProductRequest to form data dictionary for API submission
    func toFormData() -> [String: Any] {
        var formData: [String: Any] = [:]
        
        formData["name"] = name
        if let description = description { formData["description"] = description }
        if let barcode = barcode { formData["barcode"] = barcode }
        formData["rentPrice"] = rentPrice
        if let salePrice = salePrice { formData["salePrice"] = salePrice }
        if let costPrice = costPrice { formData["costPrice"] = costPrice }
        if let deposit = deposit { formData["deposit"] = deposit }
        formData["totalStock"] = totalStock
        if let categoryId = categoryId { formData["categoryId"] = categoryId }
        if let merchantId = merchantId { formData["merchantId"] = merchantId }
        
        // Convert outletStock array to array of dictionaries
        let outletStockArray = outletStock.map { ["outletId": $0.outletId, "stock": $0.stock] }
        formData["outletStock"] = outletStockArray
        if let images = images, !images.isEmpty { formData["images"] = images }

        if let pricingType = pricingType { formData["pricingType"] = pricingType }
        if let durationConfig = durationConfig { formData["durationConfig"] = durationConfig }
        if let pricingOptions = pricingOptions {
            formData["pricingOptions"] = pricingOptions.map { $0.formDictionary }
            // #1189: only the v2 form sends it (the API then replaces the BLOCK option with ours); the old form keeps it stored
            if let pricingSchemaVersion { formData["pricingSchemaVersion"] = pricingSchemaVersion }
        }

        return formData
    }
}
