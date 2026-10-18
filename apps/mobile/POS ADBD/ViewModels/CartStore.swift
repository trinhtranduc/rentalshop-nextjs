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
    /// #480: note photos picked in the cart note editor (JPEG ~180KB each, at most `OrderDetailLogic.maxNotePhotos`),
    /// sent as `notesImages` when the order is created. Memory only: not in the draft saved to disk, so they are gone
    /// after an app restart. Cleared with the cart.
    private(set) var noteImageData: [Data] = []
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
        noteImageData = []
        persistToDiskNow()
        if notify {
            NotificationCenter.default.post(name: .cartStoreDidChange, object: storage)
        }
    }

    func resetCart(notify: Bool = true, persistToDisk: Bool = true) {
        storage.clear()
        noteImageData = []
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

    /// #480: photos of the cart note (replaces the previous set; extra photos past the limit are dropped)
    func setNoteImageData(_ data: [Data]) {
        noteImageData = Array(data.prefix(OrderDetailLogic.maxNotePhotos))
        NotificationCenter.default.post(name: .cartStoreDidChange, object: storage)
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

    /// #951: remove the line with this id (swipe / confirm keep the line, not its row number)
    func removeItem(line lineId: UUID) {
        guard let index = storage.index(ofLine: lineId) else { return }
        removeItem(at: index)
    }

    /// #473 — lines of this product take its current prices when it has both and they do not offer both yet
    func refreshPricing(from product: Product) {
        storage.refreshPricing(from: product)
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

    /// #482 "Áp dụng" of the pricing sheet: the line's pricing type (rent) and its price for this order only
    /// #951: `price` nil = the box left empty (the typed price is dropped); 0 is a price (a free line)
    func applyLinePricing(at index: Int, type: String?, price: Double?) {
        if let type, storage.orderType == .rent {
            storage.selectPricingType(at: index, type: type)
            storage.syncRentalDaysFromDates()
        }
        if let price {
            storage.updatePrice(at: index, price: price)
        } else {
            storage.clearPrice(at: index)
        }
        notifyDidChange()
    }

    /// #951: the same, for the line with this id (a sheet keeps the line, not its row number)
    func applyLinePricing(line lineId: UUID, type: String?, price: Double?) {
        guard let index = storage.index(ofLine: lineId) else { return }
        applyLinePricing(at: index, type: type, price: price)
    }

    /// #951: note of the line with this id
    func updateNote(line lineId: UUID, note: String?) {
        guard let index = storage.index(ofLine: lineId) else { return }
        updateNote(at: index, note: note)
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

    /// #1056: posts only when a line's availability changed; every post rebuilds the cart screen, and the same
    /// answer arrives on each cart open
    @discardableResult
    func updateAvailabilityStatus(for productId: Int, status: AvailabilityStatus?) -> Bool {
        guard storage.updateAvailabilityStatus(for: productId, status: status) else { return false }
        NotificationCenter.default.post(name: .cartStoreDidChange, object: storage)
        return true
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
