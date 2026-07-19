import Foundation

extension Notification.Name {
    static let cartStoreDidChange = Notification.Name("cartStoreDidChange")
}

/// Central owner for the working cart state.
/// AppShare bridges to this store so older code can keep reading the current cart
/// while new mutations can move here gradually.
final class CartStore {
    static let shared = CartStore()

    private var storage = Cart()

    private init() {}

    var cart: Cart {
        storage
    }

    func replaceCart(with cart: Cart, notify: Bool = true) {
        storage = cart
        if notify {
            notifyDidChange()
        }
    }

    func resetCart(notify: Bool = true) {
        storage.clear()
        if notify {
            notifyDidChange()
        }
    }

    func setCustomer(_ customer: Customer?) {
        storage.customer = customer
        notifyDidChange()
    }

    func setOrderType(_ orderType: OrderType, syncPrices: Bool = false) {
        storage.orderType = orderType
        if syncPrices {
            storage.syncPricesWithOrderType()
        }
        notifyDidChange()
    }

    func setPickupDate(_ date: Date?) {
        storage.pickupPlanAt = date
        storage.syncRentalDaysFromDates()
        notifyDidChange()
    }

    func setReturnDate(_ date: Date?) {
        storage.returnPlanAt = date
        storage.syncRentalDaysFromDates()
        notifyDidChange()
    }

    func setDiscount(_ discount: Double) {
        storage.discount = discount
        notifyDidChange()
    }

    func setNotes(_ notes: String?) {
        storage.notes = notes
        notifyDidChange()
    }

    func setCollateralDetails(_ details: String?) {
        storage.collateralDetails = details
        notifyDidChange()
    }

    func setManualSecurityDeposit(_ amount: Double?) {
        storage.manualSecurityDeposit = amount
        notifyDidChange()
    }

    func setDiscountType(_ discountType: DiscountType) {
        storage.discountType = discountType
        notifyDidChange()
    }

    func setManualDepositAmount(_ amount: Double?) {
        storage.setManualDepositAmount(amount)
        notifyDidChange()
    }

    func addItem(_ cartItem: CartItem) {
        storage.addItem(cartItem)
        notifyDidChange()
    }

    func removeItem(at index: Int) {
        storage.removeItem(at: index)
        notifyDidChange()
    }

    func updateQuantity(at index: Int, quantity: Int) {
        storage.updateQuantity(at: index, quantity: quantity)
        notifyDidChange()
    }

    func updatePrice(at index: Int, price: Double) {
        storage.updatePrice(at: index, price: price)
        notifyDidChange()
    }

    func updateNote(at index: Int, note: String?) {
        storage.updateNote(at: index, note: note)
        notifyDidChange()
    }

    func updateRentalDays(at index: Int, days: Int) {
        storage.updateRentalDays(at: index, days: days)
        notifyDidChange()
    }

    func selectPricingOption(at index: Int, optionId: Int) {
        storage.selectPricingOption(at: index, optionId: optionId)
        notifyDidChange()
    }

    func syncRentalDaysFromDates() {
        storage.syncRentalDaysFromDates()
        notifyDidChange()
    }

    func updateAvailabilityStatus(for productId: Int, status: AvailabilityStatus?) {
        storage.updateAvailabilityStatus(for: productId, status: status)
        notifyDidChange()
    }

    func syncPricesWithOrderType() {
        storage.syncPricesWithOrderType()
        notifyDidChange()
    }

    private func notifyDidChange() {
        NotificationCenter.default.post(name: .cartStoreDidChange, object: storage)
    }
}
