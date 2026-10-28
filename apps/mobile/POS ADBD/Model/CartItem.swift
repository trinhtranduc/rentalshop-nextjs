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
struct AvailabilityStatus: Codable, Equatable {
    let isAvailable: Bool
    let available: Int
}

// MARK: - CartItem Model
/// Represents a single item in the shopping cart
struct CartItem: Codable {
    /// #951: each add is its own line (a product may sit on several lines, e.g. one paid and one free);
    /// line actions find the line by this id. A cart saved before #951 gets an id on load.
    var lineId: UUID = UUID()
    let productId: Int
    let productName: String?
    let barcode: String?
    var quantity: Int
    var price: Double
    /// #951: 0 is a real price (a 0đ product, a free line). True only while a rent line has no price at all: the
    /// product has none for the line's mode and none was typed. A line loaded from a saved order always has one.
    var priceMissing: Bool = false
    var deposit: Double
    var note: String?
    var imageUrl: String?
    /// #888: the product's cost (giá vốn) when the line was added; the API sends it only to `products.manage` roles.
    /// Optional, so a cart saved before #888 still decodes.
    var costPrice: Double?
    
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
    /// Number of rental days (DAILY multiplies by it; a BLOCK line looks its price up by it)
    var rentalDays: Int = 1 {
        didSet { if rentalDays != oldValue { repriceBlock() } }
    }

    /// #1189: the day-block table of the chosen BLOCK option, or of the saved order line (`pricingSnapshot`)
    var blockTable: BlockTable?
    /// #1189: currency minor unit the table is rounded to (VND 1)
    var blockCurrency: String?

    // Multiple pricing options (Phase 1: FIXED + DAILY)
    var pricingOptions: [PricingOption]?
    var selectedPricingOptionId: Int?

    /// Whether this cart item uses per-day pricing
    var isDailyPricing: Bool {
        return pricingType?.uppercased() == "DAILY"
    }

    /// #482: the pricing type the order API accepts (FIXED, HOURLY, DAILY). Another option type chosen in the sheet
    /// (BLOCK) is sent as FIXED: its total is already unit price × quantity, so the payload keeps today's shape.
    var requestPricingType: String {
        let type = pricingType?.uppercased() ?? "FIXED"
        // #1189: this client sends `X-Client-Capabilities: block-pricing`, so a BLOCK line goes as BLOCK
        if type == "BLOCK" && isBlockPricing { return type }
        return ["FIXED", "HOURLY", "DAILY"].contains(type) ? type : "FIXED"
    }

    /// #1189: a line priced from a day-block table. Its `price` is the unit price for `rentalDays` and is kept
    /// up to date by `repriceBlock`; staff do not type a price on it.
    var isBlockPricing: Bool {
        pricingType?.uppercased() == "BLOCK" && blockTable != nil
    }

    /// The breakdown behind the price ("Khối 3 ngày + 2 ngày thêm"); nil on a line that is not a block line
    var blockDetail: BlockRentDetail? {
        guard isBlockPricing, let table = blockTable else { return nil }
        return BlockPricing.detail(table, days: rentalDays, minorUnit: BlockPricing.minorUnit(currency: blockCurrency ?? ShopCurrencyStore.current.rawValue))
    }

    /// #1189: a line loaded from a saved order keeps its stored price and gets its saved table, so a changed date
    /// prices it again; a price typed by hand (`overridden`) stays a plain price
    mutating func adoptSnapshot(_ snapshot: BlockSnapshot?) {
        guard pricingType?.uppercased() == "BLOCK", let snapshot, snapshot.overridden != true,
              BlockPricing.isValid(snapshot.table) else { return }
        blockTable = snapshot.table
        blockCurrency = snapshot.currency
    }

    /// Looks the unit price up in the table for the current days
    mutating func repriceBlock() {
        guard let detail = blockDetail else { return }
        price = detail.total
        customRentPrice = detail.total
        priceMissing = false
    }

    /// The chosen option id, left out when the type is sent as FIXED in its place
    var requestPricingOptionId: Int? {
        requestPricingType == (pricingType?.uppercased() ?? "FIXED") ? selectedPricingOptionId : nil
    }

    /// Whether this cart item offers more than one pricing option
    var hasMultiplePricingOptions: Bool {
        return (pricingOptions?.count ?? 0) > 1
    }

    /// #473 — A line built before the product had both prices (added earlier, restored from disk, or loaded from
    /// an edited order) takes the product's options, so the cart offers "Theo lần / Theo ngày". Only when those
    /// options hold both prices and the line does not offer both yet. Quantity, mode and prices stay.
    mutating func adoptPricingOptions(_ options: [PricingOption]?) {
        let active = (options ?? []).filter { $0.isActive != false }
        var fresh = self
        fresh.pricingOptions = active
        guard CartV2Logic.offersBothModes(fresh), !CartV2Logic.offersBothModes(self) else { return }
        pricingOptions = active
        if selectedPricingOptionId == nil {
            let current = pricingType?.uppercased() ?? ProductPricingMode.perRental.rawValue
            selectedPricingOptionId = active.first { $0.type.uppercased() == current }?.id
        }
    }

    mutating func refreshPricing(from product: Product) {
        adoptPricingOptions(product.pricingOptions)
        if let cost = product.costPrice { costPrice = cost }
    }

    /// Switch to a different pricing option (updates price + pricingType)
    mutating func selectPricingOption(_ optionId: Int) {
        guard let opt = pricingOptions?.first(where: { $0.id == optionId }) else { return }
        self.selectedPricingOptionId = optionId
        self.pricingType = opt.type
        self.price = opt.price
        self.customRentPrice = opt.price
        self.priceMissing = false
        if let table = opt.blockTable {
            blockTable = table
            repriceBlock()
        }
    }

    /// Switch between the two cart pricing modes. Products created before
    /// pricingOptions existed keep their current price as a legacy option;
    /// the missing mode is still selectable with a zero price.
    mutating func selectPricingType(_ type: String) {
        let normalizedType = type.uppercased()
        let currentType = pricingType?.uppercased() ?? "FIXED"

        // #951: a mode without a price is not kept as a 0đ option for the way back
        if !priceMissing, pricingOptions?.contains(where: { $0.type.uppercased() == currentType }) != true {
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
        let typed: Double?
        if normalizedType == "DAILY" {
            typed = customDailyPrice
        } else if normalizedType == "FIXED" {
            typed = customFixedPrice
        } else {
            // #482: another option type (BLOCK, HOURLY) starts at its own price
            typed = nil
        }
        price = typed ?? option?.price ?? 0
        priceMissing = typed == nil && option == nil
        customRentPrice = price
        if normalizedType == "BLOCK", let table = option?.blockTable {
            blockTable = table
            repriceBlock()
        }
    }

    /// Save a manual rental price for the currently selected pricing mode.
    /// FIXED and DAILY values are intentionally independent.
    mutating func setCustomRentalPrice(_ value: Double) {
        let currentType = pricingType?.uppercased() ?? "FIXED"
        if currentType == "DAILY" {
            customDailyPrice = value
        } else if currentType == "FIXED" {
            customFixedPrice = value
        }
        customRentPrice = value
        price = value
        priceMissing = false
    }

    /// #951: the price box of the line's mode left empty: forget the typed price; the line goes back to the product's
    /// price for that mode, or asks for one ("Nhập giá") when the product has none.
    mutating func clearCustomRentalPrice() {
        let currentType = pricingType?.uppercased() ?? "FIXED"
        if currentType == "DAILY" {
            customDailyPrice = nil
        } else if currentType == "FIXED" {
            customFixedPrice = nil
        }
        let option = pricingOptions?.first(where: { $0.type.uppercased() == currentType && $0.isActive != false })
        price = option?.price ?? 0
        priceMissing = option == nil
        customRentPrice = option?.price
    }
    
    // Computed properties
    func subTotal(for orderType: OrderType) -> Double {
        if orderType == .rent && isDailyPricing {
            return Double(quantity) * price * Double(rentalDays)
        }
        return Double(quantity) * price
    }

    /// Backward-compatible subtotal for rental contexts.
    var subTotal: Double {
        subTotal(for: .rent)
    }
    
    var totalDeposit: Double {
        return Double(quantity) * deposit
    }
    
    /// Get effective price for a given order type (rent or sale)
    /// Priority: custom price > original price
    func effectivePrice(for orderType: OrderType) -> Double {
        if orderType == .rent {
            if let detail = blockDetail { return detail.total }
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
        // A line of a saved order (or built by hand) has its price, 0 included (#951)
        self.priceMissing = false
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
        self.costPrice = product.costPrice
        
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
        let legacyRent = product.rentPrice ?? product.rent
        if activeOptions.isEmpty && legacyRent < 0 {
            self.pricingOptions = []
            self.priceMissing = true
        } else if activeOptions.isEmpty {
            let legacyType = product.pricingType?.uppercased() ?? "FIXED"
            self.pricingOptions = [
                PricingOption(
                    id: nil,
                    type: legacyType,
                    price: legacyRent,
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
            if let table = def.blockTable {
                self.blockTable = table
                self.repriceBlock()
            }
        } else {
            self.pricingType = product.pricingType ?? "FIXED"
            self.price = 0
        }
    }

    // MARK: - Decoding (#951)

    /// Saved carts from before #951 have no `lineId` / `priceMissing`: a new id, and a rent line at 0 still asks for a
    /// price (as it did then).
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        lineId = try c.decodeIfPresent(UUID.self, forKey: .lineId) ?? UUID()
        productId = try c.decode(Int.self, forKey: .productId)
        productName = try c.decodeIfPresent(String.self, forKey: .productName)
        barcode = try c.decodeIfPresent(String.self, forKey: .barcode)
        quantity = try c.decode(Int.self, forKey: .quantity)
        price = try c.decode(Double.self, forKey: .price)
        priceMissing = try c.decodeIfPresent(Bool.self, forKey: .priceMissing) ?? (price <= 0)
        deposit = try c.decode(Double.self, forKey: .deposit)
        note = try c.decodeIfPresent(String.self, forKey: .note)
        imageUrl = try c.decodeIfPresent(String.self, forKey: .imageUrl)
        costPrice = try c.decodeIfPresent(Double.self, forKey: .costPrice)
        originalRentPrice = try c.decode(Double.self, forKey: .originalRentPrice)
        originalSalePrice = try c.decode(Double.self, forKey: .originalSalePrice)
        customRentPrice = try c.decodeIfPresent(Double.self, forKey: .customRentPrice)
        customSalePrice = try c.decodeIfPresent(Double.self, forKey: .customSalePrice)
        customFixedPrice = try c.decodeIfPresent(Double.self, forKey: .customFixedPrice)
        customDailyPrice = try c.decodeIfPresent(Double.self, forKey: .customDailyPrice)
        availabilityStatus = try c.decodeIfPresent(AvailabilityStatus.self, forKey: .availabilityStatus)
        pricingType = try c.decodeIfPresent(String.self, forKey: .pricingType)
        rentalDays = try c.decodeIfPresent(Int.self, forKey: .rentalDays) ?? 1
        pricingOptions = try c.decodeIfPresent([PricingOption].self, forKey: .pricingOptions)
        selectedPricingOptionId = try c.decodeIfPresent(Int.self, forKey: .selectedPricingOptionId)
        blockTable = try c.decodeIfPresent(BlockTable.self, forKey: .blockTable)
        blockCurrency = try c.decodeIfPresent(String.self, forKey: .blockCurrency)
    }
}
