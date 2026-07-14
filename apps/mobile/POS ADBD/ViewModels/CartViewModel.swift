import Foundation

class CartViewModel: PreviewViewModelProtocol {
    // MARK: - Properties
    private var cart: Cart {
        CartStore.shared.cart
    }
    
    // MARK: - Computed Properties
    var orderType: OrderType { cart.orderType }
    var orderNumber: String? { nil } // Cart doesn't have order number yet
    var itemsCount: Int { cart.items.count }
    
    // Computed property to check if in edit mode
    var isEditMode: Bool {
        return cart.orderId != nil
    }
    
    // MARK: - UI State
    var title: String {
        isEditMode ? "Edit Order".localized() : "Create Order".localized()
    }
    
    var saveButtonTitle: String {
        isEditMode ? "Update Order".localized().uppercased() : "Create Order".localized().uppercased()
    }
    
    var shouldShowDepositInfo: Bool { orderType == .rent }
    
    var availableActions: [PreviewAction] {
        // When creating order, only show save button (Create Order)
        // No cancel button for new order creation
        return [.save]
    }
    
    // MARK: - Customer Info
    var customerName: String {
        guard let customer = cart.customer else { return "" }
        // Only include non-empty firstName and lastName
        let nameParts = [customer.firstName, customer.lastName].compactMap { name -> String? in
            guard let name = name else { return nil }
            let trimmed = name.trimmingCharacters(in: .whitespaces)
            return trimmed.isEmpty ? nil : trimmed
        }
        return nameParts.joined(separator: " ")
    }
    
    var customerPhone: String {
        return cart.customer?.phone?.removeWhiteSpace().formatPhone(haveSpace: true) ?? ""
    }
    
    // MARK: - Outlet & Staff Info
    var outletName: String {
        // Get from current user's outlet or default
        if let user = User.account(), let outlet = user.outlet {
            return outlet.name ?? "Default Outlet".localized()
        }
        return "Default Outlet".localized()
    }
    
    var outletAddress: String? {
        guard let user = User.account() else { return nil }
        return user.outlet?.address ?? user.merchant?.address
    }
    
    var outletPhone: String? {
        guard let user = User.account() else { return nil }
        return user.outlet?.phone ?? user.merchant?.phone
    }
    
    var merchantName: String? {
//        if let user = User.account(), let outlet = user.outlet, let merchant = outlet.merchant {
//            return merchant.name
//        }
        return nil
    }
    
    var staffName: String {
        // Get from current user
        if let user = User.account() {
            let firstName = user.firstName ?? ""
            let lastName = user.lastName ?? ""
            return "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)
        }
        return "Unknown Staff".localized()
    }
    
    var staffId: Int {
        return User.account()?.id ?? 0
    }
    
    // MARK: - Notes
    var notes: String { cart.notes ?? "" }
    
    // MARK: - Financial Info
    var subtotal: Double {
        cart.items.reduce(0) { $0 + ($1.price * Double($1.quantity)) }
    }
    
    var discountAmount: Double { cart.discountAmount }
    
    /// Discount value (percentage if percentage type, amount if amount type)
    var discountValue: Double {
        if cart.discountType == .amount {
            return cart.discountAmount // Return amount
        } else {
            return cart.discount // Return percentage
        }
    }
    
    var discountText: String {
        if cart.discountType == .amount {
            return cart.discountAmount.formatStringInCommon()
        } else {
            return "\(cart.discount) %"
        }
    }
    
    var totalAmount: Double { cart.totalAmount }
    var depositAmount: Double { cart.depositAmount }
    var toCollectAmount: Double {
        cart.loyaltyDiscountAmount > 0 ? cart.amountDue : totalAmount
    }

    // MARK: - Loyalty
    private(set) var loyaltySummary: LoyaltyCustomerSummary?
    var loyaltyUsePoints: Bool = false
    var loyaltyRedeemPoints: Int = 0

    var loyaltyFeatureEnabled: Bool {
        guard let user = User.account(), user.hasLoyaltyFeature else { return false }
        return cart.customer != nil
    }

    var loyaltyBalance: Int { loyaltySummary?.points ?? 0 }
    var loyaltyDiscount: Double { cart.loyaltyDiscountAmount }
    var loyaltyAmountDue: Double { cart.amountDue }

    func refreshLoyalty(completion: (() -> Void)? = nil) {
        guard loyaltyFeatureEnabled, let customerId = cart.customer?.customer_id else {
            loyaltySummary = nil
            completion?()
            return
        }

        LoyaltyService.shared.fetchCustomerSummary(customerId: customerId) { [weak self] summary, _ in
            self?.loyaltySummary = summary
            completion?()
        }
    }

    func setLoyaltyUsePoints(_ use: Bool) {
        loyaltyUsePoints = use
        if !use {
            loyaltyRedeemPoints = 0
            cart.loyaltyRedeemPoints = 0
            cart.loyaltyDiscountAmount = 0
        }
        validateLoyaltyRedeem(completion: nil)
    }

    func setLoyaltyRedeemPoints(_ points: Int) {
        loyaltyRedeemPoints = max(0, points)
        validateLoyaltyRedeem(completion: nil)
    }

    func validateLoyaltyRedeem(completion: (() -> Void)? = nil) {
        guard loyaltyUsePoints,
              loyaltyRedeemPoints > 0,
              let customerId = cart.customer?.customer_id else {
            cart.loyaltyRedeemPoints = 0
            cart.loyaltyDiscountAmount = 0
            completion?()
            return
        }

        LoyaltyService.shared.validateRedeem(
            customerId: customerId,
            points: loyaltyRedeemPoints,
            orderTotalAmount: cart.totalAmount,
            orderType: cart.orderType.rawValue
        ) { [weak self] response, _ in
            guard let self else {
                completion?()
                return
            }

            if let response = response, response.valid {
                self.cart.loyaltyRedeemPoints = self.loyaltyRedeemPoints
                self.cart.loyaltyDiscountAmount = response.discount ?? 0
            } else {
                self.cart.loyaltyRedeemPoints = 0
                self.cart.loyaltyDiscountAmount = 0
            }
            completion?()
        }
    }
    
    /// Check if deposit amount is manually overridden (not calculated from items)
    var isDepositManuallyOverridden: Bool {
        return cart.manualDepositAmount != nil
    }
    
    // MARK: - Dates
    var createDate: Date? { Date() } // Current date for new orders
    var pickupDate: Date? { cart.pickupPlanAt }
    var returnDate: Date? { cart.returnPlanAt }
    var isReadyToDeliver: Bool { false } // Cart is not prepared yet
    
    // MARK: - Deposit Info
    var materialText: String { cart.collateralDetails ?? "" }
    var bailAmount: Double { cart.manualSecurityDeposit ?? 0 } // Security deposit (not deposit amount)
    var damageFee: Double { 0 } // Cart doesn't have damage fee
    
    // MARK: - Input Field States
    var isMaterialTextFieldEnabled: Bool { true } // Enabled when creating order
    var isBailButtonEnabled: Bool { true } // Enabled when creating order
    var isExtraChargeButtonEnabled: Bool { false } // Cart doesn't have damage fee
    var isDepositButtonEnabled: Bool { true } // Always enabled for cart (when creating order)
    
    // MARK: - Initialization
    init(cart: Cart) {
        if CartStore.shared.cart !== cart {
            CartStore.shared.replaceCart(with: cart, notify: false)
        }
    }
    
    // MARK: - Item Management
    func item(at index: Int) -> Any {
        guard index < cart.items.count else { 
            // Return a default CartItem if index is out of bounds
            return CartItem(
                productId: 0,
                productName: "",
                barcode: "",
                quantity: 0,
                price: 0,
                deposit: 0,
                note: nil,
                imageUrl: nil,
                originalRentPrice: 0,
                originalSalePrice: 0
            )
        }
        return cart.items[index]
    }
    
    // MARK: - Update Methods
    func updateNotes(_ notes: String) {
        CartStore.shared.setNotes(notes)
    }
    
    func updateMaterial(_ material: String) {
        CartStore.shared.setCollateralDetails(material)
    }
    
    func updateBailAmount(_ amount: Double) {
        CartStore.shared.setManualSecurityDeposit(amount > 0 ? amount : nil)
    }
    
    func updateDepositAmount(_ amount: Double) {
        // Set manual deposit amount override
        // Accept 0 as a valid manual value (user can set deposit to 0)
        CartStore.shared.setManualDepositAmount(amount)
    }
    
    func updateDamageFee(_ fee: Double) {
        // Cart doesn't have damage fee
    }
    
    func updateReadyToDeliver(_ isReady: Bool) {
        // Cart cannot be updated for ready deliver status
    }
    
    // MARK: - Actions
    func saveOrder(completion: @escaping (Result<Void, Error>) -> Void) {
        let proceed: () -> Void = { [weak self] in
            guard let self else { return }

            if let orderId = self.cart.orderId {
                let updateRequest = self.cart.toUpdateOrderRequest()
                OrderService.shared.updateOrder(orderId: orderId, request: updateRequest) { _, error in
                    if let error = error {
                        completion(.failure(error))
                        return
                    }
                    completion(.success(()))
                }
            } else {
                OrderService.shared.createOrder(from: self.cart) { _, error in
                    if let error = error {
                        completion(.failure(error))
                        return
                    }
                    completion(.success(()))
                }
            }
        }

        if loyaltyUsePoints && loyaltyRedeemPoints > 0 {
            validateLoyaltyRedeem {
                proceed()
            }
        } else {
            proceed()
        }
    }
    
    func cancelOrder(completion: @escaping (Result<Void, Error>) -> Void) {
        // For cart, cancel just means go back
        completion(.success(()))
    }
    
    func printOrder(completion: @escaping (Result<Void, Error>) -> Void) {
        // Cart cannot be printed
        completion(.failure(NSError(domain: "CartViewModel", code: -1, userInfo: [NSLocalizedDescriptionKey: "Cart cannot be printed"])))
    }
    
    func updateOrder(completion: @escaping (Result<Void, Error>) -> Void) {
        // Cart cannot be updated (it's not an existing order)
        completion(.failure(NSError(domain: "CartViewModel", code: -1, userInfo: [NSLocalizedDescriptionKey: "Cart cannot be updated"])))
    }
    
    func deleteOrder(completion: @escaping (Result<Void, Error>) -> Void) {
        // Cart cannot be deleted (only saved orders can be deleted)
        completion(.failure(NSError(domain: "CartViewModel", code: -1, userInfo: [NSLocalizedDescriptionKey: "Cart cannot be deleted".localized()])))
    }
    
    // MARK: - Validation
    func canSave() -> Bool {
        return !cart.items.isEmpty && cart.customer != nil
    }
    
    func canCancel() -> Bool {
        return true // Always can cancel cart
    }
    
    func canPrint() -> Bool {
        return false // Cart cannot be printed
    }
    
    func canUpdate() -> Bool {
        return false // Cart cannot be updated (it's not an existing order)
    }
}
