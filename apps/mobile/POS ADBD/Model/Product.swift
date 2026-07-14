//
//  Product.swift
//  POS ADBD
//
//  Created by Trinh Tran on 12/5/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit

//Protocal that copyable class should conform
protocol Copying {
    init(original: Self)
}

//Concrete class extension
extension Copying {
    func copy() -> Self {
        return Self.init(original: self)
    }
}

//Array extension for elements conforms the Copying protocol
extension Array where Element: Copying {
    func clone() -> Array {
        var copiedArray = Array<Element>()
        for element in self {
            copiedArray.append(element.copy())
        }
        return copiedArray
    }
}

struct Product: Codable, Comparable, Copying {
    var barcode: String?
    var product_id: Int = 0
    var name: String?
    var quantity: Int = 0
    var rent: Double = 0
    var subTotal: Double = 0
    var sale: Double = 0
    var selected_price: Double = 0
    var selected_quatity: Int = 0
    var image_name: String?
    var note: String?
    var image_url: String?
    
    // Additional fields for new API format
    var id: Int?
    var totalStock: Int?
    var renting: Int?
    var available: Int?
    var rentPrice: Double?
    var salePrice: Double?
    var costPrice: Double?
    var deposit: Double?
    var description: String?
    var images: [String]?
    var isActive: Bool?
    var merchantId: Int?
    var outletId: Int?
    var categoryId: Int?
    var category: CategoryDetail?
    
    // Image search specific fields
    var similarity: Double?
    var similarityPercent: Int?
    var merchant: MerchantDetail?
    
    // Pricing type: nil/FIXED = fixed price, DAILY = per-day pricing
    var pricingType: String?
    
    /// Whether this product uses per-day pricing
    var isDailyPricing: Bool {
        return pricingType?.uppercased() == "DAILY"
    }
    
    init() {}
    
    // Copying protocol implementation
    init(original: Product) {
        self.barcode = original.barcode
        self.product_id = original.product_id
        self.name = original.name
        self.quantity = original.quantity
        self.rent = original.rent
        self.subTotal = original.subTotal
        self.sale = original.sale
        self.selected_price = original.selected_price
        self.selected_quatity = original.selected_quatity
        self.image_name = original.image_name
        self.note = original.note
        self.image_url = original.image_url
        self.id = original.id
        self.totalStock = original.totalStock
        self.rentPrice = original.rentPrice
        self.salePrice = original.salePrice
        self.costPrice = original.costPrice
        self.deposit = original.deposit
        self.description = original.description
        self.images = original.images
        self.isActive = original.isActive
        self.merchantId = original.merchantId
        self.categoryId = original.categoryId
        
        // Image search specific fields
        self.similarity = original.similarity
        self.similarityPercent = original.similarityPercent
        self.merchant = original.merchant
        
        // Pricing type
        self.pricingType = original.pricingType
    }
    
    // MARK: - Codable Implementation
    enum CodingKeys: String, CodingKey {
        // Legacy fields
        case barcode
        case product_id
        case name
        case quantity
        case rent = "rent_price"
        case subTotal = "sub_total"
        case sale = "sale_price"
        case selected_price = "price"
        case selected_quatity
        case image_name
        case note
        case image_url = "avatar"
        case product_name
        
        // New API fields
        case id
        case totalStock
        case renting
        case available
        case rentPrice
        case salePrice
        case costPrice
        case deposit
        case description
        case images
        case isActive
        case merchantId
        case outletId
        case categoryId
        case category
        
        // Image search specific fields
        case similarity
        case similarityPercent
        case merchant
        
        // Pricing type
        case pricingType
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Handle both old and new API formats
        // ID mapping - prefer new format first
        if let idValue = try? container.decode(Int.self, forKey: .id) {
            self.product_id = idValue
            self.id = idValue
        } else {
            self.product_id = try container.decodeIfPresent(Int.self, forKey: .product_id) ?? 0
        }
        
        self.barcode = try container.decodeIfPresent(String.self, forKey: .barcode)
        
        // Name mapping - prefer new format first  
        if let nameValue = try? container.decode(String.self, forKey: .name) {
            self.name = nameValue
        } else {
            self.name = try container.decodeIfPresent(String.self, forKey: .product_name)
        }
        
        // Quantity mapping - prefer new format first
        if let totalStockValue = try? container.decode(Int.self, forKey: .totalStock) {
            self.quantity = totalStockValue
            self.selected_quatity = totalStockValue
            self.totalStock = totalStockValue
        } else {
            let qtyValue = try container.decodeIfPresent(Int.self, forKey: .quantity) ?? 0
            self.quantity = qtyValue
            self.selected_quatity = qtyValue
        }
        
        // Price mapping - prefer new format first
        if let rentPriceValue = try? container.decode(Double.self, forKey: .rentPrice) {
            self.rent = rentPriceValue
            self.rentPrice = rentPriceValue
        } else {
            self.rent = try container.decodeIfPresent(Double.self, forKey: .rent) ?? 0
        }
        
        if let salePriceValue = try? container.decode(Double.self, forKey: .salePrice) {
            self.sale = salePriceValue
            self.salePrice = salePriceValue
        } else {
            self.sale = try container.decodeIfPresent(Double.self, forKey: .sale) ?? 0
        }
        
        self.selected_price = try container.decodeIfPresent(Double.self, forKey: .selected_price) ?? 0
        self.subTotal = try container.decodeIfPresent(Double.self, forKey: .subTotal) ?? 0
        self.costPrice = try container.decodeIfPresent(Double.self, forKey: .costPrice)
        self.deposit = try container.decodeIfPresent(Double.self, forKey: .deposit)
        
        // Image mapping
        if let imagesArray = try? container.decode([String].self, forKey: .images), !imagesArray.isEmpty {
            self.image_url = imagesArray.first
            self.images = imagesArray
        } else {
            self.image_url = try container.decodeIfPresent(String.self, forKey: .image_url)
        }
        
        self.image_name = try container.decodeIfPresent(String.self, forKey: .image_name)
        
        // Note/Description mapping - prefer new format first
        if let descriptionValue = try? container.decode(String.self, forKey: .description) {
            self.note = descriptionValue
            self.description = descriptionValue
        } else {
            self.note = try container.decodeIfPresent(String.self, forKey: .note)
        }
        
        // Additional new fields
        self.isActive = try container.decodeIfPresent(Bool.self, forKey: .isActive)
        self.merchantId = try container.decodeIfPresent(Int.self, forKey: .merchantId)
        self.outletId = try container.decodeIfPresent(Int.self, forKey: .outletId)
        self.renting = try container.decodeIfPresent(Int.self, forKey: .renting)
        self.available = try container.decodeIfPresent(Int.self, forKey: .available)
        self.categoryId = try container.decodeIfPresent(Int.self, forKey: .categoryId)
        self.category = try container.decodeIfPresent(CategoryDetail.self, forKey: .category)
        
        // Image search specific fields
        self.similarity = try container.decodeIfPresent(Double.self, forKey: .similarity)
        self.similarityPercent = try container.decodeIfPresent(Int.self, forKey: .similarityPercent)
        self.merchant = try container.decodeIfPresent(MerchantDetail.self, forKey: .merchant)
        
        // Pricing type
        self.pricingType = try container.decodeIfPresent(String.self, forKey: .pricingType)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        
        try container.encodeIfPresent(barcode, forKey: .barcode)
        try container.encode(product_id, forKey: .product_id)
        try container.encodeIfPresent(name, forKey: .name)
        try container.encode(quantity, forKey: .quantity)
        try container.encode(rent, forKey: .rent)
        try container.encode(subTotal, forKey: .subTotal)
        try container.encode(sale, forKey: .sale)
        try container.encode(selected_price, forKey: .selected_price)
        try container.encode(selected_quatity, forKey: .selected_quatity)
        try container.encodeIfPresent(image_name, forKey: .image_name)
        try container.encodeIfPresent(note, forKey: .note)
        try container.encodeIfPresent(image_url, forKey: .image_url)
        
        // New API fields
        try container.encodeIfPresent(id, forKey: .id)
        try container.encodeIfPresent(totalStock, forKey: .totalStock)
        try container.encodeIfPresent(rentPrice, forKey: .rentPrice)
        try container.encodeIfPresent(salePrice, forKey: .salePrice)
        try container.encodeIfPresent(costPrice, forKey: .costPrice)
        try container.encodeIfPresent(deposit, forKey: .deposit)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encodeIfPresent(images, forKey: .images)
        try container.encodeIfPresent(isActive, forKey: .isActive)
        try container.encodeIfPresent(merchantId, forKey: .merchantId)
        try container.encodeIfPresent(categoryId, forKey: .categoryId)
        try container.encodeIfPresent(pricingType, forKey: .pricingType)
    }
    
    
    func total() -> Double{
        return (self.selected_price * Double(self.selected_quatity))
    }
    func productValid() -> Bool{
        if selected_price == 0{
            return false
        }
        if selected_quatity == 0{
            return false
        }
        return true
        
    }
    
    static func filter(text: String, products: [Product]) -> ([Product], [String]){
        var result = products
        var words : [String] = []
        for word in text.lowercased().components(separatedBy: " "){
            if word.count != 0{
                result = Product.filter(word: word, products: result)
                words.append(word)
            }
            
        }
        return (result,words)
    }
    
    static func filter(word: String, products: [Product]) -> [Product]{
        return products.filter({ product -> Bool in
            let productName = "\(product.name ?? "")" + " " + "\(product.barcode ?? "")"
            return productName.lowercased().contains(word)
        })
    }
    
    
    static func ==(lhs: Product, rhs: Product) -> Bool {
        return lhs.name == rhs.name
    }
    
    static func <(lhs: Product, rhs: Product) -> Bool {
        return lhs.name! < rhs.name!
    }
    
    // MARK: - Static Methods (Realm methods removed - will use UserDefaults or Core Data later)
    static func reset() {
        // TODO: Implement with UserDefaults or Core Data for local persistence
        UserDefaults.standard.removeObject(forKey: "saved_products")
    }
    
    static func products() -> [Product] {
        // TODO: Load from UserDefaults or Core Data for local persistence
        guard let data = UserDefaults.standard.data(forKey: "saved_products"),
              let products = try? JSONDecoder.shared.decode([Product].self, from: data) else {
            return []
        }
        return products.sorted { ($0.name ?? "") < ($1.name ?? "") }
    }
    
    static func saveProducts(_ products: [Product]) {
        // TODO: Save to UserDefaults or Core Data for local persistence
        if let data = try? JSONEncoder.shared.encode(products) {
            UserDefaults.standard.set(data, forKey: "saved_products")
        }
    }
}


