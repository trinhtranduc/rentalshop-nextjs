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

    /// #1079: at most this many carts are open at once
    static let maxCarts = 10
    private static let multiPrefix = "anyrent.draftCarts."

    /// The open carts; `activeIndex` is the one the rest of the app reads and edits as `cart`
    private(set) var carts: [Cart] = [Cart()]
    private(set) var activeIndex = 0
    private var storage: Cart {
        get { carts[activeIndex] }
        set { carts[activeIndex] = newValue }
    }
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
        cart.number = storage.number
        storage = cart
        noteImageData = []
        persistToDiskNow()
        if notify {
            NotificationCenter.default.post(name: .cartStoreDidChange, object: storage)
        }
    }

    /// Number of the cart that was in use when an order edit opened its own cart; closing the edit cart returns there
    private var returnCartNumber: Int?

    /// Edit an order. With a draft in the cart in use, the edit gets its own new cart and the draft stays; with an
    /// empty cart (or while already editing) the cart in use is replaced as before. False when no cart is free.
    @discardableResult
    func startEditCart(_ cart: Cart, notify: Bool = true) -> Bool {
        if storage.hasDraftContent && !storage.isEditMode {
            guard carts.count < Self.maxCarts else { return false }
            returnCartNumber = storage.number
            cart.number = (1...(Self.maxCarts + 1)).first { n in !carts.contains { $0.number == n } } ?? carts.count + 1
            carts.append(cart)
            activeIndex = carts.count - 1
            noteImageData = []
            didChangeCarts(notify: notify)
        } else {
            replaceCart(with: cart, notify: notify)
        }
        return true
    }

    /// #1124 "Xác nhận" of an online booking: like an order edit, a draft in the cart in use keeps its cart and the
    /// booking gets its own new one (closing it returns to the draft); an empty cart is replaced. False when no cart is free.
    @discardableResult
    func startBookingCart(_ cart: Cart, notify: Bool = true) -> Bool {
        if storage.hasDraftContent {
            guard carts.count < Self.maxCarts else { return false }
            returnCartNumber = storage.number
            cart.number = (1...(Self.maxCarts + 1)).first { n in !carts.contains { $0.number == n } } ?? carts.count + 1
            carts.append(cart)
            activeIndex = carts.count - 1
            noteImageData = []
            didChangeCarts(notify: notify)
        } else {
            replaceCart(with: cart, notify: notify)
        }
        return true
    }

    /// The cart in use is done (order created, cart cleared): it closes and the next one is used.
    /// `persistToDisk: false` is a logout / test reset: every cart is dropped from memory.
    func resetCart(notify: Bool = true, persistToDisk: Bool = true) {
        guard persistToDisk else {
            resetAllCarts(notify: notify, persistToDisk: false)
            return
        }
        closeActiveCart()
        noteImageData = []
        persistToDiskNow()
        if notify {
            NotificationCenter.default.post(name: .cartStoreDidChange, object: storage)
        }
    }

    /// Every cart is dropped (outlet switch, logout)
    func resetAllCarts(notify: Bool = true, persistToDisk: Bool = true) {
        carts = [Cart()]
        activeIndex = 0
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

    // MARK: - Several carts (#1079)

    /// A new empty cart, used at once. False at the limit.
    @discardableResult
    func newCart(notify: Bool = true) -> Bool {
        guard carts.count < Self.maxCarts else { return false }
        let cart = Cart()
        cart.number = (1...(Self.maxCarts + 1)).first { n in !carts.contains { $0.number == n } } ?? carts.count + 1
        carts.append(cart)
        activeIndex = carts.count - 1
        noteImageData = []
        didChangeCarts(notify: notify)
        return true
    }

    func switchCart(to index: Int, notify: Bool = true) {
        guard carts.indices.contains(index), index != activeIndex else { return }
        activeIndex = index
        noteImageData = []
        didChangeCarts(notify: notify)
    }

    /// The cart at `index` is removed; with only one cart it is just emptied
    func deleteCart(at index: Int, notify: Bool = true) {
        guard carts.indices.contains(index) else { return }
        if carts.count == 1 {
            storage.clear()
            storage.number = 1
        } else {
            carts.remove(at: index)
            if index < activeIndex {
                activeIndex -= 1
            } else if activeIndex >= carts.count {
                activeIndex = carts.count - 1
            }
        }
        noteImageData = []
        didChangeCarts(notify: notify)
    }

    private func closeActiveCart() {
        if carts.count > 1 {
            let wasEdit = storage.isEditMode || storage.bookingRequestId != nil
            carts.remove(at: activeIndex)
            activeIndex = min(activeIndex, carts.count - 1)
            if wasEdit, let back = carts.firstIndex(where: { $0.number == returnCartNumber }) {
                activeIndex = back
            }
            returnCartNumber = nil
        } else {
            storage.clear()
            storage.number = 1
        }
    }

    private func didChangeCarts(notify: Bool) {
        persistToDiskNow()
        if notify {
            NotificationCenter.default.post(name: .cartStoreDidChange, object: storage)
        }
    }

    /// Customer name, or "Giỏ k" while the cart has no customer yet
    static func title(of cart: Cart) -> String {
        if let name = customerName(of: cart) { return name }
        return String(format: "cart.multi.title".localized(), cart.number)
    }

    /// Round avatar text: first letters of the first and last word of the customer name, else the cart number
    static func avatarText(of cart: Cart) -> String {
        guard let name = customerName(of: cart) else { return "\(cart.number)" }
        let words = name.split(separator: " ")
        guard let first = words.first?.first else { return "\(cart.number)" }
        guard words.count > 1, let last = words.last?.first else { return String(first).uppercased() }
        return (String(first) + String(last)).uppercased()
    }

    private static func customerName(of cart: Cart) -> String? {
        guard let customer = cart.customer else { return nil }
        let full = customer.full_name?.trimmingCharacters(in: .whitespaces) ?? ""
        if !full.isEmpty { return full }
        let joined = [customer.firstName, customer.lastName].compactMap { $0 }.joined(separator: " ")
            .trimmingCharacters(in: .whitespaces)
        return joined.isEmpty ? nil : joined
    }

    func restoreFromDisk() {
        guard let userId = User.account()?.id, userId > 0 else { return }
        let defaults = UserDefaults.standard
        guard let restored = Self.decodeSnapshot(multi: defaults.data(forKey: Self.multiKey(for: userId)),
                                                 legacy: defaults.data(forKey: Self.key(for: userId))) else {
            hydratedUserId = userId
            return
        }
        isRestoring = true
        carts = restored.carts
        activeIndex = restored.activeIndex
        isRestoring = false
        hydratedUserId = userId
        NotificationCenter.default.post(name: .cartStoreDidChange, object: storage)
    }

    /// The saved carts: the new list, else an old single-cart draft as the first cart; nil when nothing readable
    static func decodeSnapshot(multi: Data?, legacy: Data?) -> (carts: [Cart], activeIndex: Int)? {
        if let multi, let saved = try? JSONDecoder().decode(MultiSnapshot.self, from: multi), !saved.carts.isEmpty {
            let carts = saved.carts.prefix(maxCarts).map { snapshot -> Cart in
                let cart = Cart()
                cart.applyDiskSnapshot(snapshot)
                return cart
            }
            return (Array(carts), min(max(saved.activeIndex, 0), carts.count - 1))
        }
        if let legacy {
            do {
                let snapshot = try JSONDecoder().decode(Cart.DiskSnapshot.self, from: legacy)
                let cart = Cart()
                cart.applyDiskSnapshot(snapshot)
                cart.number = 1
                return ([cart], 0)
            } catch {
                Swift.print("⚠️ Draft cart restore failed: \(error.localizedDescription)")
            }
        }
        return nil
    }

    static func encodeSnapshot(carts: [Cart], activeIndex: Int) throws -> Data {
        try JSONEncoder().encode(MultiSnapshot(activeIndex: activeIndex, carts: carts.map { $0.makeDiskSnapshot() }))
    }

    private struct MultiSnapshot: Codable {
        var activeIndex: Int
        var carts: [Cart.DiskSnapshot]
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

    /// #1199: the stages of the new order start from a template (nil clears them)
    func setDepositTemplate(_ template: DepositTemplate?) {
        storage.depositTemplateId = template?.id
        storage.depositStages = template.map { $0.items.map(DepositStageDraft.init) }
        notifyDidChange()
    }

    /// #1199: the owner typed another amount for a stage of this order (nil = back to its percentage)
    func setDepositStageAmount(index: Int, amount: Double?) {
        guard var stages = storage.depositStages, stages.indices.contains(index) else { return }
        stages[index].amountOverride = amount
        storage.depositStages = stages
        notifyDidChange()
    }

    /// #1199: "Thu ngay giai đoạn 1": the method, or nil to create the order without collecting
    func setCollectFirstStage(method: String?) {
        storage.collectFirstStageNow = method != nil
        if let method { storage.collectMethod = method }
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

    /// #1189: see `Cart.refreshBlockTable(from:)`
    func refreshBlockTable(from product: Product) {
        storage.refreshBlockTable(from: product)
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
        let key = Self.multiKey(for: userId)
        // One empty cart is the default; only drafts worth keeping are saved
        guard carts.contains(where: { $0.hasDraftContent }) || carts.count > 1 else {
            // Only delete the saved carts after this user was restored, or after
            // an explicit clear / successful order (`resetCart(persistToDisk: true)`).
            guard hydratedUserId == userId else { return }
            UserDefaults.standard.removeObject(forKey: key)
            UserDefaults.standard.removeObject(forKey: Self.key(for: userId))
            UserDefaults.standard.synchronize()
            return
        }
        do {
            let data = try Self.encodeSnapshot(carts: carts, activeIndex: activeIndex)
            UserDefaults.standard.set(data, forKey: key)
            UserDefaults.standard.removeObject(forKey: Self.key(for: userId))
            UserDefaults.standard.synchronize()
            hydratedUserId = userId
        } catch {
            Swift.print("⚠️ Draft cart persist failed: \(error.localizedDescription)")
        }
    }

    private static func multiKey(for userId: Int) -> String {
        "\(multiPrefix)\(userId)"
    }

    private static func key(for userId: Int) -> String {
        "\(defaultsPrefix)\(userId)"
    }
}
