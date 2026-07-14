import Foundation

class OrderViewModel: PreviewViewModelProtocol {
    var bailAmount: Double {order.securityDeposit}
    
    // MARK: - Properties
    private var order: Order
    
    // Expose current order for external access (read-only)
    var currentOrder: Order { order }
    
    // MARK: - Computed Properties
    var orderType: OrderType { order.orderType }
    var orderNumber: String? { order.orderNumber }
    var itemsCount: Int { order.orderItems.count }
    
    // MARK: - UI State
    var title: String { "#\(order.orderNumber)" }
    
    var saveButtonTitle: String {
        switch (orderType, order.status) {
        case (.sale, _):
            return "Checkout".localized().uppercased()
        case (.rent, .draft):
            return "Action_Reserved".localized().uppercased()
        case (.rent, .reserved):
            return "Action_Pickup".localized().uppercased()
        case (.rent, .pickuped):
            return "Action_Return".localized().uppercased()
        default:
            return "Save".localized().uppercased()
        }
    }
    
    var shouldShowDepositInfo: Bool { orderType == .rent }
    
    var availableActions: [PreviewAction] {
        var actions: [PreviewAction] = []
        
        switch (orderType, order.status) {
        case (.sale, .draft):
            if order.id == -1 {
                actions = [.save]
            } else {
                actions = [.print]
            }
        case (.sale, .completed):
            actions = [.print]
            // Cancel for SALE: only if user has canManageOrders permission and status is completed
            if PermissionManager.shared.canManageOrders() {
                actions.append(.cancel)
            }
        case (.sale, _):
            actions = [.print]
            // No cancel for other sale statuses
        case (.rent, .draft):
            actions = [.save]
        case (.rent, .reserved):
            actions = [.save, .print]
            // Cancel for Rent: only when status is reserved and user has canManageOrders permission
            if PermissionManager.shared.canManageOrders() {
                actions.append(.cancel)
            }
        case (.rent, .pickuped):
            actions = [.save, .print]
        case (.rent, .returned), (.rent, .cancelled):
            actions = [.print]
        case (.sale, .cancelled):
            actions = [.print]
        default:
            break
        }
        
        // Add delete action for cancelled orders (only for outlet admin and merchant)
        if order.status == .cancelled {
            if let user = User.account() {
                // Check if user is outlet admin or merchant
                if user.role == .outletAdmin || user.role == .merchant {
                    actions.append(.delete)
                }
            }
        }
        
        // Add update action if user has canUpdateOrders permission
        // Update is available for orders that are not draft and not cancelled
//        if canUpdate() {
//            // Only add update if not already in actions (to avoid duplicates)
//            if !actions.contains(.update) {
//                actions.append(.update)
//            }
//        }
        
        return actions
    }
    
    // MARK: - Customer Info
    var customerName: String {
        order.customerName
    }
    
    var customerPhone: String {
        order.customerPhone?.removeWhiteSpace().formatPhone(haveSpace: true) ?? "N/A"
    }
    
    // MARK: - Outlet & Staff Info
    var outletName: String {
        order.outletName
    }
    
    var outletAddress: String? {
        // Store address: prefer outlet, fallback to merchant (consistent with User.address)
        guard let user = User.account() else { return nil }
        return user.outlet?.address ?? user.merchant?.address
    }
    
    var outletPhone: String? {
        // Store phone: prefer outlet, fallback to merchant (same as Order thermal print)
        guard let user = User.account() else { return nil }
        return user.outlet?.phone ?? user.merchant?.phone
    }
    
    var merchantName: String? {
        order.merchantName
    }
    
    var staffName: String {
        order.createdByName
    }
    
    var staffId: Int {
        order.createdById
    }
    
    // MARK: - Notes
    var notes: String { order.notes ?? "" }
    
    // MARK: - Financial Info
    var subtotal: Double {
        order.orderItems.reduce(0) { $0 + ($1.unitPrice * Double($1.quantity)) }
    }
    
    var discountAmount: Double { order.discountAmount }
    
    var discountText: String {
        let discountType = order.discountType ?? "amount"
        if discountType == "amount" {
            return order.discountAmount.formatStringInCommon()
        } else {
            return "\(order.discountValue) %"
        }
    }
    
    var totalAmount: Double { order.totalAmount }
    var depositAmount: Double { order.depositAmount }
    
    var toCollectAmount: Double {
        switch order.status {
        case .draft:
            if orderType == .rent {
                // Use shared calculation method for consistency
                return calculateDepositPayment().amount
            } else {
                return totalAmount // For sale drafts, collect the full amount
            }
        case .reserved:
            // Use shared calculation method for consistency
            return calculatePickupPayment().amount
        case .pickuped:
            // For return, calculate refund amount (can be negative)
            let returnPayment = calculateReturnPayment()
            // Return positive amount for display (actual refund/collect is handled separately)
            return abs(returnPayment.amount)
        default:
            return 0
        }
    }
    
    // MARK: - Dates
    var createDate: Date? { order.createdAt }
    var pickupDate: Date? { order.pickupDate }
    var returnDate: Date? { order.returnDate }
    var isReadyToDeliver: Bool { order.isReadyToDeliver }
    
    // MARK: - Deposit Info
    var materialText: String { order.collateralDetails ?? "" }
    var securityDeposit: Double { order.securityDeposit }
    var damageFee: Double { order.damageFee }
    
    // MARK: - Input Field States
    /// Collateral details can be updated for rent orders in reserved or pickuped status
    var isMaterialTextFieldEnabled: Bool {
        guard canUpdate() else { return false }
        return orderType == .rent && (order.status == .reserved || order.status == .pickuped)
    }
    
    /// Security deposit can be updated for rent orders:
    /// - When order is in draft status (creating order) - always allowed
    /// - When order is in reserved or pickuped status - requires canUpdate permission
    var isBailButtonEnabled: Bool {
        guard orderType == .rent else { return false }
        
        // Allow editing when order is in draft status (creating order)
        if order.status == .draft {
            return true
        }
        
        // For other statuses, check update permission
        guard canUpdate() else { return false }
        return order.status == .reserved || order.status == .pickuped
    }
    
    /// Damage fee can be updated for rent orders in pickuped status (after pickup)
    /// Can also be updated in returned status if needed
    var isExtraChargeButtonEnabled: Bool {
        guard canUpdate() else { return false }
        return orderType == .rent && (order.status == .pickuped || order.status == .returned)
    }
    
    /// Deposit amount cannot be updated for existing orders (only when creating)
    var isDepositButtonEnabled: Bool {
        return false // Deposit can only be edited when creating order (CartViewModel)
    }
    
    // MARK: - Initialization
    init(order: Order) {
        self.order = order
    }
    
    // MARK: - Item Management
    func item(at index: Int) -> Any {
        guard index < order.orderItems.count else { 
            // Return a default OrderItem if index is out of bounds
            return OrderItem(
                id: 0,
                quantity: 0,
                unitPrice: 0,
                totalPrice: 0,
                notes: nil,
                productId: 0,
                productName: "",
                productBarcode: nil,
                productImages: nil,
                productRentPrice: nil,
                productDeposit: nil
            )
        }
        return order.orderItems[index]
    }
    
    // MARK: - Update Methods
    func updateNotes(_ notes: String) {
        // OrderDetail properties are let constants, so we can't modify them directly
        // In a real implementation, we would need to create a new OrderDetail or use a different approach
        // For now, we'll just store the updated values locally
        // TODO: Implement proper state management for OrderDetail updates
    }
    
    func updateMaterial(_ material: String) {
        // OrderDetail properties are let constants, so we can't modify them directly
        // TODO: Implement proper state management for OrderDetail updates
    }
    
    func updateBailAmount(_ amount: Double) {
        // Create a new Order with updated securityDeposit
        // This is needed because Order is a struct with let properties
        let updatedOrder = Order(
            id: order.id,
            orderNumber: order.orderNumber,
            orderType: order.orderType,
            status: order.status,
            totalAmount: order.totalAmount,
            depositAmount: order.depositAmount,
            securityDeposit: amount,
            damageFee: order.damageFee,
            lateFee: order.lateFee,
            discountType: order.discountType,
            discountValue: order.discountValue,
            discountAmount: order.discountAmount,
            pickupPlanAt: order.pickupPlanAt,
            returnPlanAt: order.returnPlanAt,
            pickedUpAt: order.pickedUpAt,
            returnedAt: order.returnedAt,
            rentalDuration: order.rentalDuration,
            isReadyToDeliver: order.isReadyToDeliver,
            collateralType: order.collateralType,
            collateralDetails: order.collateralDetails,
            notes: order.notes,
            pickupNotes: order.pickupNotes,
            returnNotes: order.returnNotes,
            damageNotes: order.damageNotes,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            customerId: order.customerId,
            customerFirstName: order.customerFirstName,
            customerLastName: order.customerLastName,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerEmail: order.customerEmail,
            outletId: order.outletId,
            outletName: order.outletName,
            merchantId: order.merchantId,
            merchantName: order.merchantName,
            createdById: order.createdById,
            createdByName: order.createdByName,
            orderItems: order.orderItems,
            itemCount: order.itemCount,
            paymentCount: order.paymentCount,
            totalPaid: order.totalPaid
        )
        self.order = updatedOrder
    }
    
    func updateDepositAmount(_ amount: Double) {
        // Deposit amount cannot be updated for existing orders
        // Only editable when creating order (CartViewModel)
    }
    
    func updateDamageFee(_ fee: Double) {
        // OrderDetail properties are let constants, so we can't modify them directly
        // TODO: Implement proper state management for OrderDetail updates
    }
    
    func updateReadyToDeliver(_ isReady: Bool) {
        // OrderDetail properties are let constants, so we can't modify them directly
        // TODO: Implement proper state management for OrderDetail updates
    }
    
    // MARK: - Actions
    func saveOrder(completion: @escaping (Result<Void, Error>) -> Void) {
        // Handle different save scenarios based on order status
        switch order.status {
        case .draft:
            saveDraftOrder(completion: completion)
        case .reserved:
            handlePickup(completion: completion)
        case .pickuped:
            handleReturn(completion: completion)
        default:
            completion(.failure(NSError(domain: "OrderViewModel", code: -1, userInfo: [NSLocalizedDescriptionKey: "Cannot save order in current status"])))
        }
    }
    
    func cancelOrder(completion: @escaping (Result<Void, Error>) -> Void) {
        // Use specific update method for status change
        updateOrderStatus("CANCELLED") { [weak self] result in
            switch result {
            case .success:
                completion(.success(()))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
    
    func printOrder(completion: @escaping (Result<Void, Error>) -> Void) {
        // Use PrinterManager to print the order
        PrinterManager.shared.printOrder(order) { result in
            switch result {
            case .success:
                completion(.success(()))
            case .failure(let printerError):
                completion(.failure(printerError))
            }
        }
    }
    
    func deleteOrder(completion: @escaping (Result<Void, Error>) -> Void) {
        // Only allow delete for cancelled orders
        guard order.status == .cancelled else {
            let error = NSError.errorWithOwnMessage(message: "Only cancelled orders can be deleted".localized(), domain: "RC")
            completion(.failure(error))
            return
        }
        
        // Check user permission (outlet admin or merchant)
        guard let user = User.account() else {
            let error = NSError.errorWithOwnMessage(message: "User not found".localized(), domain: "RC")
            completion(.failure(error))
            return
        }
        
        guard user.role == .outletAdmin || user.role == .merchant else {
            let error = NSError.errorWithOwnMessage(message: "Only outlet admin and merchant can delete orders".localized(), domain: "RC")
            completion(.failure(error))
            return
        }
        
        // Call delete API
        OrderService.shared.deleteOrder(orderId: order.id) { error in
            if let error = error {
                completion(.failure(error))
            } else {
                completion(.success(()))
            }
        }
    }
    
    func updateOrder(completion: @escaping (Result<Void, Error>) -> Void) {
        // Create UpdateOrderRequest with current order data
        let updateRequest = createUpdateOrderRequest()
        
        // Call OrderService to update the order
        OrderService.shared.updateOrder(orderId: order.id, request: updateRequest) { [weak self] updatedOrder, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            // Update local order with the response
            if let updatedOrder = updatedOrder {
                self?.order = updatedOrder
            }
            
            completion(.success(()))
        }
    }
    
    // MARK: - Specific Update Methods
    
    /// Update only the ready to deliver status
    func updateReadyToDeliverStatus(_ isReady: Bool, completion: @escaping (Result<Void, Error>) -> Void) {
        let updateRequest = UpdateOrderRequest.updateReadyToDeliver(isReady)
        
        OrderService.shared.updateOrder(orderId: order.id, request: updateRequest) { [weak self] updatedOrder, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            if let updatedOrder = updatedOrder {
                self?.order = updatedOrder
            }
            
            completion(.success(()))
        }
    }
    
    /// Update only the collateral details
    func updateCollateralDetails(_ details: String, completion: @escaping (Result<Void, Error>) -> Void) {
        let updateRequest = UpdateOrderRequest.updateCollateralDetails(details)
        
        OrderService.shared.updateOrder(orderId: order.id, request: updateRequest) { [weak self] updatedOrder, error in
            guard let self = self else {
                completion(.failure(NSError(domain: "OrderViewModel", code: -1, userInfo: [NSLocalizedDescriptionKey: "Self is nil"])))
                return
            }
            
            if let error = error {
                completion(.failure(error))
                return
            }
            
            // Reload order detail from server to ensure all data is synced correctly
            // This is important because toCollectAmount calculation depends on collateralDetails
            self.reloadOrderDetail { result in
                switch result {
                case .success:
                    completion(.success(()))
                case .failure(let reloadError):
                    // If reload fails, still update with the response we got
                    if let updatedOrder = updatedOrder {
                        self.order = updatedOrder
                    }
                    completion(.failure(reloadError))
                }
            }
        }
    }
    
    /// Update only the security deposit
    func updateSecurityDeposit(_ amount: Double, completion: @escaping (Result<Void, Error>) -> Void) {
        let updateRequest = UpdateOrderRequest.updateSecurityDeposit(amount)
        
        OrderService.shared.updateOrder(orderId: order.id, request: updateRequest) { [weak self] updatedOrder, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            if let updatedOrder = updatedOrder {
                self?.order = updatedOrder
            }
            
            completion(.success(()))
        }
    }
    
    /// Update only the notes
    func updateNotes(_ notes: String, completion: @escaping (Result<Void, Error>) -> Void) {
        let updateRequest = UpdateOrderRequest.updateNotes(notes)
        
        OrderService.shared.updateOrder(orderId: order.id, request: updateRequest) { [weak self] updatedOrder, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            if let updatedOrder = updatedOrder {
                self?.order = updatedOrder
            }
            
            completion(.success(()))
        }
    }

    /// Update notes together with note images.
    /// Follows API spec (see docs/API_ORDER_NOTES_IMAGES.md):
    /// - Only delete/set list → JSON with notesImages array.
    /// - Only add new images → FormData with files.
    /// - Both delete and add → request 1: JSON (notesImages = kept URLs), then request 2: FormData (new files) if any.
    func updateNotes(
        _ notes: String,
        keptNoteImageURLs: [String]?,
        newNoteImageData: [Data]?,
        completion: @escaping (Result<Void, Error>) -> Void
    ) {
        let hasDeletionsOrSetList = keptNoteImageURLs != nil
        let hasNewFiles = (newNoteImageData?.isEmpty == false)

        if hasDeletionsOrSetList && hasNewFiles {
            // 1) Apply deletions / set list via JSON
            let request1 = UpdateOrderRequest.updateNotes(notes, notesImages: keptNoteImageURLs ?? [])
            OrderService.shared.updateOrder(orderId: order.id, request: request1) { [weak self] updatedOrder, error in
                if let error = error {
                    completion(.failure(error))
                    return
                }
                if let updatedOrder = updatedOrder {
                    self?.order = updatedOrder
                }
                // 2) Add new files via FormData
                let request2 = UpdateOrderRequest.updateNotes(notes)
                OrderService.shared.updateOrder(orderId: self?.order.id ?? 0, request: request2, notesImages: newNoteImageData ?? []) { [weak self] order2, err2 in
                    if let err2 = err2 {
                        completion(.failure(err2))
                        return
                    }
                    if let order2 = order2 {
                        self?.order = order2
                    }
                    completion(.success(()))
                }
            }
        } else if hasDeletionsOrSetList {
            // Only set list (including "delete only")
            let request = UpdateOrderRequest.updateNotes(notes, notesImages: keptNoteImageURLs ?? [])
            OrderService.shared.updateOrder(orderId: order.id, request: request) { [weak self] updatedOrder, error in
                if let error = error {
                    completion(.failure(error))
                    return
                }
                if let updatedOrder = updatedOrder {
                    self?.order = updatedOrder
                }
                completion(.success(()))
            }
        } else if hasNewFiles {
            // Only add new images (FormData)
            let request = UpdateOrderRequest.updateNotes(notes)
            OrderService.shared.updateOrder(orderId: order.id, request: request, notesImages: newNoteImageData ?? []) { [weak self] updatedOrder, error in
                if let error = error {
                    completion(.failure(error))
                    return
                }
                if let updatedOrder = updatedOrder {
                    self?.order = updatedOrder
                }
                completion(.success(()))
            }
        } else {
            // Text only
            updateNotes(notes, completion: completion)
        }
    }

    /// Update notes with note images (multipart only); use when caller does not track URLs (e.g. create flow).
    func updateNotes(_ notes: String, noteImages: [Data], completion: @escaping (Result<Void, Error>) -> Void) {
        guard !noteImages.isEmpty else {
            updateNotes(notes, completion: completion)
            return
        }
        updateNotes(notes, keptNoteImageURLs: nil, newNoteImageData: noteImages, completion: completion)
    }
    
    /// Update only the damage fee
    func updateDamageFee(_ amount: Double, completion: @escaping (Result<Void, Error>) -> Void) {
        let updateRequest = UpdateOrderRequest.updateDamageFee(amount)
        
        OrderService.shared.updateOrder(orderId: order.id, request: updateRequest) { [weak self] updatedOrder, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            if let updatedOrder = updatedOrder {
                self?.order = updatedOrder
            }
            
            completion(.success(()))
        }
    }
    
    /// Update order status (pickup, return, cancel)
    func updateOrderStatus(_ status: String, completion: @escaping (Result<Void, Error>) -> Void) {
        let updateRequest = UpdateOrderRequest.updateStatus(status)
        
        OrderService.shared.updateOrder(orderId: order.id, request: updateRequest) { [weak self] updatedOrder, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            if let updatedOrder = updatedOrder {
                self?.order = updatedOrder
            }
            
            completion(.success(()))
        }
    }
    
    // MARK: - Private Methods
    
    private func createUpdateOrderRequest() -> UpdateOrderRequest {
        // Convert Order to UpdateOrderRequest with all the correct keys
        let hasDiscount = order.discountAmount > 0
        let discountTypeValue: String? = hasDiscount ? (order.discountType ?? "amount") : nil
        let discountValueValue: Double? = hasDiscount ? order.discountValue : 0
        let discountAmountValue: Double? = hasDiscount ? order.discountAmount : 0
        return UpdateOrderRequest(
            orderType: order.orderType.rawValue.uppercased(),
            status: order.status.rawValue.uppercased(),
            totalAmount: order.totalAmount,
            depositAmount: order.depositAmount,
            securityDeposit: order.securityDeposit,
            customerId: order.customerId,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerEmail: order.customerEmail,
            outletId: order.outletId,
            pickupPlanAt: order.pickupPlanAt?.dateServerISOString(),
            returnPlanAt: order.returnPlanAt?.dateServerISOString(),
            pickedUpAt: order.pickedUpAt?.dateServerISOString(),
            returnedAt: order.returnedAt?.dateServerISOString(),
            rentalDuration: order.rentalDuration,
            isReadyToDeliver: order.isReadyToDeliver,
            collateralType: order.collateralType,
            collateralDetails: order.collateralDetails,
            notes: order.notes,
            pickupNotes: order.pickupNotes,
            returnNotes: order.returnNotes,
            damageNotes: order.damageNotes,
            discountType: discountTypeValue,
            discountValue: discountValueValue,
            discountAmount: discountAmountValue,
            orderItems: order.orderItems.map { orderItem in
                // Normalize empty string notes to nil - empty notes should not be sent to API
                let normalizedNote = orderItem.notes?.trimmingCharacters(in: .whitespacesAndNewlines)
                let finalNote = (normalizedNote?.isEmpty ?? true) ? nil : normalizedNote
                
                return UpdateOrderItem(
                    productId: orderItem.productId ?? 0,
                    quantity: orderItem.quantity,
                    unitPrice: orderItem.unitPrice,
                    totalPrice: orderItem.totalPrice,
                    deposit: orderItem.productDeposit,
                    notes: finalNote,
                    rentalDays: order.rentalDuration,
                    imageUrl: orderItem.productImages?.first
                )
            }
        )
    }
    
    private func saveDraftOrder(completion: @escaping (Result<Void, Error>) -> Void) {
        // Create update request to save draft order
        let updateRequest = createUpdateOrderRequest()
        
        // Call OrderService to update the order
        OrderService.shared.updateOrder(orderId: order.id, request: updateRequest) { [weak self] updatedOrder, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            // Update local order with the response
            if let updatedOrder = updatedOrder {
                self?.order = updatedOrder
            }
            
            completion(.success(()))
        }
    }
    
    private func handlePickup(completion: @escaping (Result<Void, Error>) -> Void) {
        if orderType == .rent {
            // Handle rental pickup with validation
            if (materialText.isEmpty && securityDeposit == 0) {
                completion(.failure(NSError(domain: "OrderViewModel", code: -1, userInfo: [NSLocalizedDescriptionKey: "Quý khách có thể cọc bằng các loại giấy tờ (CMND, GPLX, BLX) hoặc cọc tiền."])))
                return
            }
        }
        
        // Use specific update method for status change
        updateOrderStatus("PICKUPED") { [weak self] result in
            switch result {
            case .success:
                completion(.success(()))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
    
    private func handleReturn(completion: @escaping (Result<Void, Error>) -> Void) {
        // Use specific update method for status change
        updateOrderStatus("RETURNED") { [weak self] result in
            switch result {
            case .success:
                completion(.success(()))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
    
    // MARK: - Payment Calculation
    /// Calculate payment amount for deposit (when creating order)
    /// Returns: (amount: Double, collateralDetails: String?)
    func calculateDepositPayment() -> (amount: Double, collateralDetails: String?) {
        let collateralDetails = materialText.isEmpty ? nil : materialText
        return (amount: depositAmount, collateralDetails: collateralDetails)
    }
    
    /// Calculate payment amount for pickup (when picking up reserved order)
    /// Returns: (amount: Double, collateralDetails: String?)
    /// Logic:
    /// - Thu tiền: remainingTotal + securityDeposit (nếu có securityDeposit)
    /// - Thu giấy tờ: nếu có collateralDetails
    func calculatePickupPayment() -> (amount: Double, collateralDetails: String?) {
        // Calculate remaining amount to collect
        let remainingTotal = totalAmount - depositAmount
        
        // Thu tiền: remainingTotal + securityDeposit (nếu có securityDeposit)
        let remainingAmount = remainingTotal + securityDeposit
        
        // Thu giấy tờ nếu có collateralDetails
        let collateralDetails = materialText.isEmpty ? nil : materialText
        
        return (amount: max(0, remainingAmount), collateralDetails: collateralDetails)
    }
    
    /// Calculate refund/collection amount for return (when returning picked up order)
    /// Returns: (amount: Double, collateralDetails: String?)
    /// Note: amount can be negative (refund to customer) or positive (collect from customer)
    /// Formula: damageFee - securityDeposit
    /// - Negative: refund to customer (trả lại tiền) - security deposit > damage fee
    /// - Positive: collect from customer (thu tiền) - damage fee > security deposit
    /// Note: totalAmount and depositAmount are not included because payment was already collected
    func calculateReturnPayment() -> (amount: Double, collateralDetails: String?) {
        // Return order calculation: damageFee - securityDeposit
        // If negative: refund to customer (trả lại tiền)
        // If positive: collect from customer (thu tiền)
        let refundAmount = damageFee - securityDeposit
        let collateralDetails = materialText.isEmpty ? nil : materialText
        return (amount: refundAmount, collateralDetails: collateralDetails)
    }
    
    /// Get payment type and amount based on current order status
    /// Returns PaymentType enum for use in PaymentCollectionViewController
    func getPaymentType() -> PaymentType? {
        switch currentOrder.status {
        case .draft:
            let payment = calculateDepositPayment()
            return .deposit(amount: payment.amount, collateralDetails: payment.collateralDetails)
            
        case .reserved:
            let payment = calculatePickupPayment()
            return .pickup(amount: payment.amount, collateralDetails: payment.collateralDetails)
            
        case .pickuped:
            let payment = calculateReturnPayment()
            return .returnRefund(amount: payment.amount, collateralDetails: payment.collateralDetails)
            
        default:
            return nil
        }
    }
    
    // MARK: - Validation
    func canSave() -> Bool {
        switch order.status {
        case .draft, .reserved, .pickuped:
            return true
        default:
            return false
        }
    }
    
    func canCancel() -> Bool {
        // Check permission first
        guard PermissionManager.shared.canManageOrders() else {
            return false
        }
        
        // For SALE orders: can only cancel when status is completed
        if orderType == .sale {
            return order.status == .completed
        }
        
        // For Rent orders: can only cancel when status is reserved
        if orderType == .rent {
            return order.status == .reserved
        }
        
        return false
    }
    
    func canUpdate() -> Bool {
        // Check permission first
        guard PermissionManager.shared.canUpdateOrders() else {
            return false
        }
        
        // Can update orders that are not draft and not cancelled
        return order.status != .draft && order.status != .cancelled && order.id != -1
    }
    
    func canPrint() -> Bool {
        return order.status != .draft || order.id != -1
    }
    
    // MARK: - Reload Order Detail
    
    /// Reload order detail from API and update local order
    func reloadOrderDetail(completion: @escaping (Result<Order, Error>) -> Void) {
        OrderService.shared.loadOrderDetail(orderId: order.id) { [weak self] orderDetail, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let orderDetail = orderDetail else {
                let error = NSError.errorWithOwnMessage(message: "No order detail received", domain: "RC")
                completion(.failure(error))
                return
            }
            
            let updatedOrder = Order.from(detail: orderDetail)
            
            // Update local order
            self?.order = updatedOrder
            
            completion(.success(updatedOrder))
        }
    }
}
