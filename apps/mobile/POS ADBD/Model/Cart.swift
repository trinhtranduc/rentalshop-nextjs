//
//  Cart.swift
//  POS ADBD
//
//  Created by Assistant on 2025-10-22.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation

// MARK: - Cart Model
/// Represents the current working cart for creating/editing orders
class Cart {
    
    // MARK: - Properties
    var orderId: Int? // ID of order being edited (nil if creating new order)
    private(set) var items: [CartItem] = []
    var customer: Customer?
    var orderType: OrderType = .rent
    var pickupPlanAt: Date?
    var returnPlanAt: Date?
    var notes: String?
    var discount: Double = 0
    var discountType: DiscountType = .amount
    var collateralDetails: String?
    var manualDepositAmount: Double? // Deposit amount (auto-calculated from items, but user can override)
    var isDepositManuallyOverridden: Bool = false // Flag to track if user has manually overridden deposit
    var manualSecurityDeposit: Double? // Manual security deposit (nil = not set, user must input if needed)
    var loyaltyRedeemPoints: Int = 0
    var loyaltyDiscountAmount: Double = 0
    
    // MARK: - Computed Properties
    var amountDue: Double {
        return max(0, totalAmount - loyaltyDiscountAmount)
    }
    
    var totalAmount: Double {
        let subtotal = items.reduce(0) { $0 + $1.subTotal }
        return applyDiscount(to: subtotal)
    }
    
    var subtotalAmount: Double {
        return items.reduce(0) { $0 + $1.subTotal }
    }
    
    var discountAmount: Double {
        let subtotal = subtotalAmount
        if discountType == .amount {
            return discount
        } else {
            return subtotal * (discount / 100.0)
        }
    }
    
    var depositAmount: Double {
        // manualDepositAmount is always set (either auto-calculated or user-overridden)
        // If not set yet, calculate from items
        if let manualDeposit = manualDepositAmount {
            return manualDeposit
        }
        // Calculate from items if not set
        let calculated = items.reduce(0) { $0 + $1.totalDeposit }
        // Auto-set it for next time
        manualDepositAmount = calculated
        return calculated
    }
    
    /// Calculate deposit from items
    private func calculateDepositFromItems() -> Double {
        return items.reduce(0) { $0 + $1.totalDeposit }
    }
    
    /// Update deposit amount automatically from items (only if not manually overridden)
    private func updateDepositFromItems() {
        if !isDepositManuallyOverridden {
            manualDepositAmount = calculateDepositFromItems()
        }
    }
    
    var itemCount: Int {
        return items.reduce(0) { $0 + $1.quantity }
    }
    
    var isEmpty: Bool {
        return items.isEmpty
    }
    
    // MARK: - Initialization
    init() {}
    
    // MARK: - Cart Operations
    
    /// Add a product to cart
    func addItem(product: Product, quantity: Int, price: Double) {
        // Check if product already exists in cart
        let productId = product.product_id != 0 ? product.product_id : (product.id ?? 0)
        if let index = items.firstIndex(where: { $0.productId == productId }) {
            // Update existing item quantity
            items[index].quantity += quantity
        } else {
            // Add new item
            let item = CartItem(from: product, quantity: quantity, price: price)
            items.append(item)
        }
        // Auto-update deposit from items (only if not manually overridden)
        updateDepositFromItems()
    }
    
    /// Add CartItem directly to cart
    func addItem(_ cartItem: CartItem) {
        // Check if product already exists in cart
        if let index = items.firstIndex(where: { $0.productId == cartItem.productId }) {
            // Update existing item quantity
            items[index].quantity += cartItem.quantity
        } else {
            // Add new item
            items.append(cartItem)
        }
        // Auto-update deposit from items (only if not manually overridden)
        updateDepositFromItems()
    }
    
    /// Remove item at specific index
    func removeItem(at index: Int) {
        guard index >= 0 && index < items.count else { return }
        items.remove(at: index)
        // Auto-update deposit from items (only if not manually overridden)
        updateDepositFromItems()
    }
    
    /// Update quantity for item at specific index
    func updateQuantity(at index: Int, quantity: Int) {
        guard index >= 0 && index < items.count else { return }
        if quantity <= 0 {
            removeItem(at: index)
        } else {
            items[index].quantity = quantity
            // Auto-update deposit from items (only if not manually overridden)
            updateDepositFromItems()
        }
    }
    
    /// Update price for item at specific index
    /// This will save the custom price based on current order type
    func updatePrice(at index: Int, price: Double) {
        guard index >= 0 && index < items.count else { return }
        items[index].price = price
        
        // Save custom price based on current order type
        if orderType == .rent {
            items[index].setCustomRentalPrice(price)
        } else {
            items[index].customSalePrice = price
        }
        // Auto-update deposit from items (only if not manually overridden)
        // Note: Price doesn't affect deposit calculation, but we update anyway to ensure consistency
        updateDepositFromItems()
    }

    /// Sync the displayed price for every item to the current order type without changing custom price state.
    /// This is used when switching between rent and sale so the cart keeps a single source of truth.
    func syncPricesWithOrderType() {
        for index in items.indices {
            items[index].price = items[index].effectivePrice(for: orderType)
        }
    }
    
    /// Set manual deposit amount (user override)
    /// - Parameter amount: The manual deposit amount to set. Accepts 0 as valid value.
    ///                     If nil, reset to auto-calculate from items.
    func setManualDepositAmount(_ amount: Double?) {
        if let amount = amount {
            // Accept 0 as a valid manual value
            manualDepositAmount = amount
            isDepositManuallyOverridden = true
        } else {
            // Reset to auto-calculate
            isDepositManuallyOverridden = false
            manualDepositAmount = calculateDepositFromItems()
        }
    }
    
    /// Update availability status for item at specific index
    func updateAvailabilityStatus(at index: Int, status: AvailabilityStatus?) {
        guard index >= 0 && index < items.count else { return }
        items[index].availabilityStatus = status
    }
    
    /// Update availability status for all items with same productId
    func updateAvailabilityStatus(for productId: Int, status: AvailabilityStatus?) {
        for index in items.indices where items[index].productId == productId {
            items[index].availabilityStatus = status
        }
    }
    
    /// Update note for item at specific index
    func updateNote(at index: Int, note: String?) {
        guard index >= 0 && index < items.count else { return }
        items[index].note = note
    }
    
    /// Update rental days for item at specific index (DAILY pricing items only)
    func updateRentalDays(at index: Int, days: Int) {
        guard index >= 0 && index < items.count else { return }
        items[index].rentalDays = max(1, days)
    }
    
    /// Select a pricing option for item at index (multi-option products)
    func selectPricingOption(at index: Int, optionId: Int) {
        guard index >= 0 && index < items.count else { return }
        items[index].selectPricingOption(optionId)
    }

    /// Select FIXED or DAILY even when the product has no configured option
    /// for that mode. Missing prices intentionally resolve to zero.
    func selectPricingType(at index: Int, type: String) {
        guard index >= 0 && index < items.count else { return }
        items[index].selectPricingType(type)
    }

    /// Auto-update rental days for all DAILY items based on pickup/return dates
    func syncRentalDaysFromDates() {
        guard let days = calculateRentalDays(), days >= 1 else { return }
        for index in items.indices where items[index].isDailyPricing {
            items[index].rentalDays = days
        }
    }
    
    /// Clear all items from cart
    func clear() {
        orderId = nil // Clear order ID if editing an order
        items.removeAll()
        customer = nil
        orderType = .rent
        pickupPlanAt = nil
        returnPlanAt = nil
        notes = nil
        discount = 0
        discountType = .amount
        collateralDetails = nil
        manualDepositAmount = nil
        manualSecurityDeposit = nil
    }
    
    // MARK: - Helper Methods
    
    private func applyDiscount(to amount: Double) -> Double {
        if discountType == .amount {
            return max(0, amount - discount)
        } else {
            let discountAmount = amount * (discount / 100.0)
            return max(0, amount - discountAmount)
        }
    }
    
    /// Create Cart from OrderDetail (for editing orders)
    static func fromOrderDetail(_ orderDetail: OrderDetail) -> Cart {
        let cart = Cart()
        
        cart.orderId = orderDetail.id
        
        // Map basic properties
        cart.orderType = orderDetail.orderType
        cart.pickupPlanAt = orderDetail.pickupPlanAt
        cart.returnPlanAt = orderDetail.returnPlanAt
        cart.notes = orderDetail.notes
        cart.collateralDetails = orderDetail.collateralDetails
        
        // Map discount
        cart.discount = orderDetail.discountValue
        cart.discountType = DiscountType(rawValue: orderDetail.discountTypeOrDefault) ?? .amount
        
        // Map deposit amount from order (preserve the original deposit amount)
        if orderDetail.depositAmount > 0 {
            cart.setManualDepositAmount(orderDetail.depositAmount)
        } else {
            // If deposit is 0, still set it as manual to preserve the value
            cart.setManualDepositAmount(0)
        }
        
        // Map security deposit (if set)
        cart.manualSecurityDeposit = orderDetail.securityDeposit > 0 ? orderDetail.securityDeposit : nil
        
        // Map customer from CustomerDetail to Customer
        var customer = Customer()
        customer.id = orderDetail.customer.id
        customer.customer_id = orderDetail.customerId
        customer.firstName = orderDetail.customer.firstName
        customer.lastName = orderDetail.customer.lastName
        customer.phone = orderDetail.customer.phone
        customer.email = orderDetail.customer.email
        customer.address = orderDetail.customer.address
        customer.city = orderDetail.customer.city
        customer.state = orderDetail.customer.state
        customer.country = orderDetail.customer.country
        cart.customer = customer
        
        // Convert OrderItems to CartItems
        // IMPORTANT: When editing order, we must preserve the exact unitPrice from the order.
        // Do not fallback to catalog prices here, otherwise sync/reload can revert edited prices.
        cart.items = orderDetail.orderItems.map { orderItem in
            // Use unitPrice from order for all price baselines in edit flow.
            let unitPrice = orderItem.unitPrice
            let customRentPrice = cart.orderType == .rent ? unitPrice : nil
            let customSalePrice = cart.orderType == .sale ? unitPrice : nil
            return CartItem(
                productId: orderItem.productId ?? 0,
                productName: orderItem.productName,
                barcode: orderItem.productBarcode,
                quantity: orderItem.quantity,
                price: unitPrice,
                deposit: orderItem.productDeposit ?? 0,
                note: orderItem.notes,
                imageUrl: orderItem.productImages?.first,
                originalRentPrice: unitPrice,
                originalSalePrice: unitPrice,
                customRentPrice: customRentPrice,
                customSalePrice: customSalePrice
            )
        }
        
        return cart
    }
    
    /// Convert Cart to OrderDetail for saving
    func toOrderDetail() -> OrderDetail {
        // This is a simplified conversion - in real implementation, you might need to handle IDs, dates, etc.
        let orderDetail = OrderDetail(
            id: -1, // New order
            orderNumber: "",
            orderType: self.orderType,
            status: .draft,
            totalAmount: self.totalAmount,
            depositAmount: self.depositAmount,
            securityDeposit: manualSecurityDeposit ?? 0,
            damageFee: 0,
            lateFee: 0,
            discountType: self.discountType.rawValue,
            discountValue: self.discount,
            discountAmount: self.discountAmount,
            pickupPlanAt: self.pickupPlanAt,
            returnPlanAt: self.returnPlanAt,
            pickedUpAt: nil,
            returnedAt: nil,
            rentalDuration: nil,
            isReadyToDeliver: false,
            collateralType: nil,
            collateralDetails: self.collateralDetails,
            notes: self.notes,
            notesImages: nil,
            pickupNotes: nil,
            pickupNotesImages: nil,
            returnNotes: nil,
            returnNotesImages: nil,
            damageNotes: nil,
            damageNotesImages: nil,
            createdAt: Date(),
            updatedAt: Date(),
            outletId: 0,
            customerId: self.customer?.id ?? 0,
            createdById: 0,
            customer: CustomerDetail(
                id: self.customer?.id ?? 0,
                firstName: self.customer?.firstName ?? "",
                lastName: self.customer?.lastName ?? "",
                phone: self.customer?.phone ?? "",
                email: self.customer?.email ?? "",
                address: self.customer?.address,
                city: self.customer?.city,
                state: self.customer?.state,
                zipCode: nil,
                country: self.customer?.country,
                dateOfBirth: nil,
                idNumber: nil,
                idType: nil
            ),
            outlet: OutletDetail(
                id: 0,
                name: "",
                address: nil,
                phone: nil,
                city: nil,
                state: nil,
                zipCode: nil,
                country: nil,
                merchant: Merchant(
                    id: 0,
                    name: "",
                    email: "",
                    phone: nil,
                    address: nil,
                    city: nil,
                    state: nil,
                    zipCode: nil,
                    country: nil,
                    businessType: nil,
                    taxId: nil,
                    currency: "USD",
                    pricingType: nil,
                    subscription: nil,
                    website: nil,
                    description: nil,
                    planId: nil,
                    totalRevenue: nil,
                    lastActiveAt: nil,
                    isActive: nil,
                    createdAt: nil,
                    updatedAt: nil,
                    pricingConfig: nil
                )
            ),
            createdBy: UserDetail(
                id: 0,
                firstName: "",
                lastName: "",
                email: nil
            ),
            orderItems: self.items.map { cartItem in
                OrderItem(
                    id: 0,
                    quantity: cartItem.quantity,
                    unitPrice: cartItem.price,
                    totalPrice: cartItem.subTotal,
                    notes: cartItem.note,
                    productId: cartItem.productId,
                    productName: cartItem.productName ?? "",
                    productBarcode: cartItem.barcode,
                    productImages: cartItem.imageUrl != nil ? [cartItem.imageUrl!] : nil,
                    productRentPrice: nil,
                    productDeposit: cartItem.deposit
                )
            },
            payments: []
        )
        return orderDetail
    }
    
    /// Create Cart from Order API model
    static func fromOrder(_ order: Order) -> Cart {
        let cart = Cart()
        
        // Set order ID to indicate this is an edit operation
        cart.orderId = order.id
        
        // Map basic properties
        cart.orderType = order.orderType
        cart.pickupPlanAt = order.pickupPlanAt
        cart.returnPlanAt = order.returnPlanAt
        cart.notes = order.notes
        cart.collateralDetails = order.collateralDetails
        
        // Map discount
        cart.discount = order.discountValue
        if let discountType = order.discountType {
            cart.discountType = DiscountType(rawValue: discountType) ?? .amount
        }
        
        // Map deposit amount from order (preserve the original deposit amount)
        if order.depositAmount > 0 {
            cart.setManualDepositAmount(order.depositAmount)
        } else {
            // If deposit is 0, still set it as manual to preserve the value
            cart.setManualDepositAmount(0)
        }
        
        // Map security deposit (if set)
        cart.manualSecurityDeposit = order.securityDeposit > 0 ? order.securityDeposit : nil
        
        // Map customer
        var customer = Customer()
        customer.customer_id = order.customerId
        customer.firstName = order.customerName.components(separatedBy: " ").first
        customer.lastName = order.customerName.components(separatedBy: " ").dropFirst().joined(separator: " ")
        customer.phone = order.customerPhone
        customer.full_name = order.customerName
        customer.email = order.customerEmail
        cart.customer = customer
        
        // Convert OrderItems to CartItems
        // IMPORTANT: When editing order, we must preserve the exact unitPrice from the order.
        // Do not fallback to catalog prices here, otherwise sync/reload can revert edited prices.
        cart.items = order.orderItems.map { orderItem in
            // Use unitPrice from order for all price baselines in edit flow.
            let unitPrice = orderItem.unitPrice
            let customRentPrice = cart.orderType == .rent ? unitPrice : nil
            let customSalePrice = cart.orderType == .sale ? unitPrice : nil
            return CartItem(
                productId: orderItem.productId ?? 0,
                productName: orderItem.productName,
                barcode: orderItem.productBarcode,
                quantity: orderItem.quantity,
                price: unitPrice,
                deposit: 0,
                note: orderItem.notes,
                imageUrl: orderItem.productImages?.first,
                originalRentPrice: unitPrice,
                originalSalePrice: unitPrice,
                customRentPrice: customRentPrice,
                customSalePrice: customSalePrice
            )
        }
        
        return cart
    }
    
    /// Create Cart from legacy Order values (for backward compatibility)
    static func fromLegacyOrderValues(_ values: [String: Any]) -> Cart? {
        let cart = Cart()
        
        // Extract customer
        if let customerData = values["customer"] as? [String: Any],
           let customerJson = try? JSONSerialization.data(withJSONObject: customerData),
           let customer = try? JSONDecoder.shared.decode(Customer.self, from: customerJson) {
            cart.customer = customer
        }
        
        // Extract order type
        if let orderTypeString = values["type"] as? String,
           let orderType = OrderType(rawValue: orderTypeString) {
            cart.orderType = orderType
        }
        
        // Extract dates
        if let pickupDate = values["get_date"] as? Date {
            cart.pickupPlanAt = pickupDate
        }
        if let returnDate = values["return_date"] as? Date {
            cart.returnPlanAt = returnDate
        }
        
        // Extract notes
        if let notes = values["notes"] as? String {
            cart.notes = notes
        }
        
        // Extract items from productModels
        if let productModelsData = values["productModels"] as? [[String: Any]] {
            for productData in productModelsData {
                // Extract product data directly from dictionary
                if let productDict = productData["product"] as? [String: Any] {
                    let price = productDict["selected_price"] as? Double ?? 0
                    // When loading from dictionary, we don't have original prices
                    // Use current price as both original prices
                    let cartItem = CartItem(
                        productId: productDict["product_id"] as? Int ?? 0,
                        productName: productDict["name"] as? String ?? "",
                        barcode: productDict["barcode"] as? String ?? "",
                        quantity: productDict["selected_quatity"] as? Int ?? 0,
                        price: price,
                        deposit: 0,
                        note: productDict["note"] as? String ?? "",
                        imageUrl: productDict["image_url"] as? String,
                        originalRentPrice: price,
                        originalSalePrice: price
                    )
                    cart.items.append(cartItem)
                }
            }
        }
        
        return cart
    }
    
    // MARK: - Validation
    
    /// Validate cart comprehensively (for creating new orders)
    func validate() -> (isValid: Bool, errors: [String]) {
        var errors: [String] = []
        
        // Check if cart has items
        if items.isEmpty {
            errors.append("Cart is empty. Please add at least one item.".localized())
        }
        
        // Check if customer is selected
        if customer == nil {
            errors.append("Please select a customer.".localized())
        }
        
        // Check if pickup date is set for RENT orders only
        if orderType == .rent {
            if pickupPlanAt == nil {
                errors.append("Please set pickup date for rental order.".localized())
            }
            if returnPlanAt == nil {
                errors.append("Please set return date for rental order.".localized())
            }
            
            // Check if return date is on or after pickup date
            if let pickup = pickupPlanAt, let returnDate = returnPlanAt {
                if returnDate < pickup {
                    errors.append("Return date must be on or after pickup date".localized())
                }
            }
        }
        // SALE orders don't need pickup/return dates or deposit
        
        // Check if all items have valid quantity and price
        for (index, item) in items.enumerated() {
            if item.quantity <= 0 {
                errors.append(String(format: "Item %d: Quantity must be greater than 0.".localized(), index + 1))
            }
            if item.price < 0 {
                errors.append(String(format: "Item %d: Price cannot be negative.".localized(), index + 1))
            }
        }
        
        return (errors.isEmpty, errors)
    }
    
    /// Check if cart is in edit mode (has orderId)
    var isEditMode: Bool {
        return orderId != nil
    }
    
    /// Validate for specific field updates (lightweight validation)
    /// Use this for partial updates when editing existing orders
    func validateForFieldUpdate(field: String) -> (isValid: Bool, errors: [String]) {
        var errors: [String] = []
        
        // For specific field updates, only validate the field itself
        // This is lightweight validation for partial updates
        switch field {
        case "notes", "material", "bail", "damageFee", "lateFee", "securityDeposit", "collateralDetails":
            // These fields can be any value, no validation needed for partial updates
            // They are updated independently on existing orders
            break
        default:
            // For unknown fields or full cart validation, validate everything
            // This ensures backward compatibility
            if items.isEmpty {
                errors.append("Cart is empty. Please add at least one item.")
            }
            if customer == nil {
                errors.append("Please select a customer.")
            }
        }
        
        return (errors.isEmpty, errors)
    }
    
    // MARK: - Conversion to API Request
    
    /// Convert cart to UpdateOrderRequest for API submission (when editing existing order)
    func toUpdateOrderRequest() -> UpdateOrderRequest {
        // Ensure all item prices are synced with effective prices before updating order
        // This ensures custom prices are used when updating order
        for index in items.indices {
            let effectivePrice = items[index].effectivePrice(for: orderType)
            items[index].price = effectivePrice
        }
        
        let orderItems = items.map { item in
            // Normalize empty string notes to nil - empty notes should not be sent to API
            let normalizedNote = item.note?.trimmingCharacters(in: .whitespacesAndNewlines)
            let finalNote = (normalizedNote?.isEmpty ?? true) ? nil : normalizedNote
            
            // Use effective price (custom price if user changed it, otherwise original price)
            // This ensures custom prices are used when updating order
            let effectivePrice = item.effectivePrice(for: orderType)
            let effectiveSubTotal: Double
            if item.isDailyPricing {
                effectiveSubTotal = Double(item.quantity) * effectivePrice * Double(item.rentalDays)
            } else {
                effectiveSubTotal = Double(item.quantity) * effectivePrice
            }
            
            return UpdateOrderItem(
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: effectivePrice,
                totalPrice: effectiveSubTotal,
                deposit: item.deposit,
                notes: finalNote,
                rentalDays: item.isDailyPricing ? item.rentalDays : calculateRentalDays(),
                imageUrl: item.imageUrl,
                pricingOptionId: item.selectedPricingOptionId
            )
        }
        
        // Only include rental-specific fields for RENT orders
        let isRentOrder = orderType == .rent
        
        // Get customer info
        let customerId = customer?.customer_id
        let customerName = customer?.full_name
        let customerPhone = customer?.phone
        let customerEmail = customer?.email
        
        // Discount: on PUT, send explicit zeros when cleared so the server overwrites any existing discount.
        let hasDiscount = discountAmount > 0
        let discountTypeValue: String? = hasDiscount ? discountType.rawValue : nil
        let discountValueValue: Double? = hasDiscount ? discount : 0
        let discountAmountValue: Double? = hasDiscount ? discountAmount : 0
        
        return UpdateOrderRequest(
            orderType: orderType.rawValue.uppercased(),
            status: nil, // Status is not updated when editing order via cart
            totalAmount: totalAmount,
            depositAmount: isRentOrder ? depositAmount : nil,
            securityDeposit: isRentOrder ? manualSecurityDeposit : nil,
            customerId: customerId,
            customerName: customerName,
            customerPhone: customerPhone,
            customerEmail: customerEmail,
            outletId: nil, // Outlet ID is determined from authenticated user's token
            pickupPlanAt: isRentOrder ? pickupPlanAt?.dateServerISOString() : nil,
            returnPlanAt: isRentOrder ? returnPlanAt?.dateServerISOString() : nil,
            pickedUpAt: nil, // Not updated when editing order
            returnedAt: nil, // Not updated when editing order
            rentalDuration: isRentOrder ? calculateRentalDays() : nil,
            isReadyToDeliver: nil, // Not updated when editing order
            collateralType: collateralDetails != nil && !collateralDetails!.isEmpty ? "ID_CARD" : nil,
            collateralDetails: collateralDetails,
            notes: notes,
            pickupNotes: nil, // Not updated when editing order
            returnNotes: nil, // Not updated when editing order
            damageNotes: nil, // Not updated when editing order
            damageFee: nil, // Not updated when editing order
            discountType: discountTypeValue,
            discountValue: discountValueValue,
            discountAmount: discountAmountValue,
            orderItems: orderItems
        )
    }
    
    /// Convert cart to CreateOrderRequest for API submission
    func toCreateOrderRequest() -> CreateOrderRequest {
        // Ensure all item prices are synced with effective prices before creating order
        // This ensures custom prices are used when creating order
        for index in items.indices {
            let effectivePrice = items[index].effectivePrice(for: orderType)
            items[index].price = effectivePrice
        }
        
        let orderItems = items.map { item in
            // Normalize empty string notes to nil - empty notes should not be sent to API
            let normalizedNote = item.note?.trimmingCharacters(in: .whitespacesAndNewlines)
            let finalNote = (normalizedNote?.isEmpty ?? true) ? nil : normalizedNote
            
            // Use effective price (custom price if user changed it, otherwise original price)
            // This ensures custom prices are used when creating order
            let effectivePrice = item.effectivePrice(for: orderType)
            let effectiveSubTotal: Double
            if item.isDailyPricing {
                effectiveSubTotal = Double(item.quantity) * effectivePrice * Double(item.rentalDays)
            } else {
                effectiveSubTotal = Double(item.quantity) * effectivePrice
            }
            
            return CreateOrderItem(
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: effectivePrice,
                totalPrice: effectiveSubTotal,
                deposit: item.deposit,
                notes: finalNote,
                rentDays: item.isDailyPricing ? item.rentalDays : nil,
                pricingOptionId: item.selectedPricingOptionId
            )
        }
        
        // Only include rental-specific fields for RENT orders
        let isRentOrder = orderType == .rent
        
        // Calculate discount fields
        // Only include discount if discountAmount > 0
        let hasDiscount = discountAmount > 0
        let discountTypeValue: String? = hasDiscount ? discountType.rawValue : nil
        let discountValueValue: Double? = hasDiscount ? discount : nil
        let discountAmountValue: Double? = hasDiscount ? discountAmount : nil
        
        // Get customerId (required field)
        guard let customerId = customer?.customer_id else {
            // Return a default CreateOrderRequest with invalid customerId
            // This will be caught by validation
            return CreateOrderRequest(
                orderType: orderType.rawValue.uppercased(),
                customerId: 0,
                totalAmount: totalAmount,
                orderItems: orderItems,
                pickupPlanAt: nil,
                returnPlanAt: nil,
                depositAmount: nil,
                securityDeposit: nil,
                damageFee: nil,
                lateFee: nil,
                notes: nil,
                pickupNotes: nil,
                isReadyToDeliver: nil,
                discountType: discountTypeValue,
                discountValue: discountValueValue,
                discountAmount: discountAmountValue,
                loyaltyRedeem: nil,
                rentalDuration: nil,
                rentalDurationUnit: nil
            )
        }
        
        return CreateOrderRequest(
            orderType: orderType.rawValue.uppercased(),
            customerId: customerId,
            totalAmount: totalAmount,
            orderItems: orderItems,
            pickupPlanAt: isRentOrder ? pickupPlanAt?.dateServerISOString() : nil,
            returnPlanAt: isRentOrder ? returnPlanAt?.dateServerISOString() : nil,
            depositAmount: isRentOrder ? depositAmount : nil,
            securityDeposit: isRentOrder ? manualSecurityDeposit : nil, // Use manual value if set, otherwise nil (user must input)
            damageFee: nil,
            lateFee: nil,
            notes: notes,
            pickupNotes: nil,
            isReadyToDeliver: false,
            discountType: discountTypeValue,
            discountValue: discountValueValue,
            discountAmount: discountAmountValue,
            loyaltyRedeem: loyaltyRedeemPoints > 0 ? CreateOrderRequest.LoyaltyRedeemRequest(points: loyaltyRedeemPoints) : nil,
            rentalDuration: isRentOrder ? calculateRentalDays() : nil,
            rentalDurationUnit: isRentOrder ? "day" : nil
        )
    }
    
    // MARK: - Helper Methods for CreateOrderRequest
    
    /// Calculate rental days based on pickup and return dates
    /// Counts inclusive calendar days between pickup and return
    private func calculateRentalDays() -> Int? {
        guard let pickup = pickupPlanAt, let returnDate = returnPlanAt else {
            return nil
        }
        
        let calendar = Calendar.current
        let startDay = calendar.startOfDay(for: pickup)
        let endDay = calendar.startOfDay(for: returnDate)
        let components = calendar.dateComponents([.day], from: startDay, to: endDay)
        // +1 because rental is inclusive (e.g. pickup Monday, return Tuesday = 2 days)
        return max(1, (components.day ?? 0) + 1)
    }
    
    /// Get current user ID from user session
    private func getCurrentUserId() -> Int {
        // TODO: Get from user session/account
        return 1004 // Default user ID
    }
    
    /// Calculate security deposit (typically 25% of total amount)
    /// NOTE: This function is no longer used. Security deposit must be manually input by user.
    /// Kept for reference only.
    private func calculateSecurityDeposit() -> Double? {
        guard orderType == .rent else { return nil }
        return totalAmount * 0.25
    }
    
    /// Get collateral type based on cart data
    private func getCollateralType() -> String? {
        guard orderType == .rent else { return nil }
        
        if let details = collateralDetails, !details.isEmpty {
            return "ID_CARD" // Default to ID_CARD if collateral details provided
        }
        
        return nil
    }
}

// MARK: - CreateOrderRequest Model
/// API request model for creating orders - matches comprehensive API structure
/// Note: outletId is not included as it is automatically determined from the authenticated user's token
struct CreateOrderRequest: Codable {
    let orderType: String
    let customerId: Int
    let totalAmount: Double
    let orderItems: [CreateOrderItem]
    let pickupPlanAt: String?
    let returnPlanAt: String?
    let depositAmount: Double?
    let securityDeposit: Double?
    let damageFee: Double?
    let lateFee: Double?
    let notes: String?
    let pickupNotes: String?
    let isReadyToDeliver: Bool?
    let discountType: String?
    let discountValue: Double?
    let discountAmount: Double?
    let loyaltyRedeem: LoyaltyRedeemRequest?
    let rentalDuration: Int?
    let rentalDurationUnit: String?
    
    struct LoyaltyRedeemRequest: Codable {
        let points: Int
    }
    
    // MARK: - Custom Coding Keys
    private enum CodingKeys: String, CodingKey {
        case orderType
        case customerId
        case totalAmount
        case orderItems
        case pickupPlanAt
        case returnPlanAt
        case depositAmount
        case securityDeposit
        case damageFee
        case lateFee
        case notes
        case pickupNotes
        case isReadyToDeliver
        case discountType
        case discountValue
        case discountAmount
        case loyaltyRedeem
        case rentalDuration
        case rentalDurationUnit
        // Explicitly exclude 'subtotal' and 'outletId' fields
    }
    
    // MARK: - Custom Encoding
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        
        try container.encode(orderType, forKey: .orderType)
        try container.encode(customerId, forKey: .customerId)
        try container.encode(totalAmount, forKey: .totalAmount)
        try container.encode(orderItems, forKey: .orderItems)
        try container.encodeIfPresent(pickupPlanAt, forKey: .pickupPlanAt)
        try container.encodeIfPresent(returnPlanAt, forKey: .returnPlanAt)
        try container.encodeIfPresent(depositAmount, forKey: .depositAmount)
        try container.encodeIfPresent(securityDeposit, forKey: .securityDeposit)
        try container.encodeIfPresent(damageFee, forKey: .damageFee)
        try container.encodeIfPresent(lateFee, forKey: .lateFee)
        try container.encodeIfPresent(notes, forKey: .notes)
        try container.encodeIfPresent(pickupNotes, forKey: .pickupNotes)
        try container.encodeIfPresent(isReadyToDeliver, forKey: .isReadyToDeliver)
        try container.encodeIfPresent(discountType, forKey: .discountType)
        try container.encodeIfPresent(discountValue, forKey: .discountValue)
        try container.encodeIfPresent(discountAmount, forKey: .discountAmount)
        try container.encodeIfPresent(loyaltyRedeem, forKey: .loyaltyRedeem)
        try container.encodeIfPresent(rentalDuration, forKey: .rentalDuration)
        try container.encodeIfPresent(rentalDurationUnit, forKey: .rentalDurationUnit)
        
        // Explicitly NOT encoding 'subtotal' field
    }
    
    // MARK: - Validation
    
    /// Validates the create request according to API rules
    func validate() -> ValidationResult {
        var errors: [String] = []
        
        // Validate orderType
        if !["RENT", "SALE"].contains(orderType.uppercased()) {
            errors.append("orderType must be either 'RENT' or 'SALE'")
        }
        
        // Validate customerId (required)
        // Note: outletId is not validated as it is automatically determined from the authenticated user's token
        if customerId <= 0 {
            errors.append("customerId must be a positive integer")
        }
        
        // Validate amounts
        if totalAmount < 0 {
            errors.append("totalAmount must be non-negative")
        }
        
        if let depositAmount = depositAmount, depositAmount < 0 {
            errors.append("depositAmount must be non-negative")
        }
        
        if let securityDeposit = securityDeposit, securityDeposit < 0 {
            errors.append("securityDeposit must be non-negative")
        }
        
        if let damageFee = damageFee, damageFee < 0 {
            errors.append("damageFee must be non-negative")
        }
        
        if let lateFee = lateFee, lateFee < 0 {
            errors.append("lateFee must be non-negative")
        }
        
        // Validate discount fields
        if let discountType = discountType {
            if !["percentage", "amount"].contains(discountType.lowercased()) {
                errors.append("discountType must be either 'percentage' or 'amount'")
            }
        }
        
        if let discountValue = discountValue {
            if discountValue < 0 {
                errors.append("discountValue must be non-negative")
            }
            // If discountType is percentage, discountValue should be between 0 and 100
            if let discountType = discountType, discountType.lowercased() == "percentage" {
                if discountValue > 100 {
                    errors.append("discountValue cannot exceed 100 when discountType is 'percentage'")
                }
            }
        }
        
        if let discountAmount = discountAmount {
            if discountAmount < 0 {
                errors.append("discountAmount must be non-negative")
            }
        }
        
        // Validate orderItems
        if orderItems.isEmpty {
            errors.append("orderItems cannot be empty")
        }
        
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
}

// MARK: - CreateOrderItem Model
/// Individual item in create order request - matches API structure
struct CreateOrderItem: Codable {
    let productId: Int
    let quantity: Int
    let unitPrice: Double
    let totalPrice: Double
    let deposit: Double?
    let notes: String?
    let rentDays: Int?
    let pricingOptionId: Int?
}
