import Foundation

extension Notification.Name {
    static let cartStoreDidChange = Notification.Name("cartStoreDidChange")
}

/// Central owner for the working cart state.
/// Draft carts are saved to UserDefaults per logged-in user so killing the app
/// does not lose an unfinished order. Logout clears memory only; the disk copy
/// is restored on the next login of the same user.
final class CartStore {
    static let shared = CartStore()

    private static let defaultsPrefix = "anyrent.draftCart."

    private var storage = Cart()
    private var isRestoring = false
    /// Set after we have loaded this user's disk snapshot (or confirmed there is none).
    /// Empty-cart persist must not wipe disk before restore — that is what made
    /// kill-and-reopen look like the cart vanished.
    private var hydratedUserId: Int?

    private init() {
        restoreFromDisk()
    }

    var cart: Cart {
        storage
    }

    func replaceCart(with cart: Cart, notify: Bool = true) {
        storage = cart
        persistToDiskNow()
        if notify {
            NotificationCenter.default.post(name: .cartStoreDidChange, object: storage)
        }
    }

    func resetCart(notify: Bool = true, persistToDisk: Bool = true) {
        storage.clear()
        if persistToDisk {
            persistToDiskNow()
        } else {
            hydratedUserId = nil
        }
        if notify {
            NotificationCenter.default.post(name: .cartStoreDidChange, object: storage)
        }
    }

    func restoreFromDisk() {
        guard let userId = User.account()?.id, userId > 0 else { return }
        guard let data = UserDefaults.standard.data(forKey: Self.key(for: userId)) else {
            hydratedUserId = userId
            return
        }

        do {
            let snapshot = try JSONDecoder().decode(Cart.DiskSnapshot.self, from: data)
            isRestoring = true
            storage.applyDiskSnapshot(snapshot)
            isRestoring = false
            hydratedUserId = userId
            NotificationCenter.default.post(name: .cartStoreDidChange, object: storage)
        } catch {
            Swift.print("⚠️ Draft cart restore failed: \(error.localizedDescription)")
            isRestoring = false
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
        storage.syncRentalDaysFromDates()
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

    func selectPricingType(at index: Int, type: String) {
        storage.selectPricingType(at: index, type: type)
        storage.syncRentalDaysFromDates()
        notifyDidChange()
    }

    func syncRentalDaysFromDates() {
        storage.syncRentalDaysFromDates()
        notifyDidChange()
    }

    func updateAvailabilityStatus(for productId: Int, status: AvailabilityStatus?) {
        storage.updateAvailabilityStatus(for: productId, status: status)
        NotificationCenter.default.post(name: .cartStoreDidChange, object: storage)
    }

    func syncPricesWithOrderType() {
        storage.syncPricesWithOrderType()
        notifyDidChange()
    }

    private func notifyDidChange() {
        persistToDiskNow()
        NotificationCenter.default.post(name: .cartStoreDidChange, object: storage)
    }

    func persistToDiskNow() {
        guard !isRestoring else { return }
        guard let userId = User.account()?.id, userId > 0 else { return }
        let key = Self.key(for: userId)
        guard storage.hasDraftContent else {
            // Only delete the saved cart after this user was restored, or after
            // an explicit clear / successful order (`resetCart(persistToDisk: true)`).
            guard hydratedUserId == userId else { return }
            UserDefaults.standard.removeObject(forKey: key)
            UserDefaults.standard.synchronize()
            return
        }
        do {
            let data = try JSONEncoder().encode(storage.makeDiskSnapshot())
            UserDefaults.standard.set(data, forKey: key)
            UserDefaults.standard.synchronize()
            hydratedUserId = userId
        } catch {
            Swift.print("⚠️ Draft cart persist failed: \(error.localizedDescription)")
        }
    }

    private static func key(for userId: Int) -> String {
        "\(defaultsPrefix)\(userId)"
    }
}
