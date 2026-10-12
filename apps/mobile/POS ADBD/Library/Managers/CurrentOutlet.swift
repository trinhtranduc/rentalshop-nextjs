//
//  CurrentOutlet.swift
//  POS ADBD
//
//  #828: the one place the app asks "which branch am I working in". Outlet users (OUTLET_ADMIN, OUTLET_STAFF,
//  OUTLET_INVENTORY) always work in their own outlet. A MERCHANT works in the branch it picked with the header button
//  (remembered on this device per account), else the shop's default outlet. Logout forgets the choice.
//

import Foundation

extension Notification.Name {
    /// The working outlet changed (merchant picked a branch, or the remembered one was turned off)
    static let currentOutletDidChange = Notification.Name("currentOutletDidChange")
}

/// What the small line above a tab title shows (board SP-dong, #828 mockup)
enum OutletHeaderMode: Equatable {
    case hidden
    /// Store icon + name, not tappable (outlet users, a shop with one active branch)
    case plain(String)
    /// "🏬 <name> ▾" button; `highlighted` (soft blue pill) when it is not the default branch
    case button(String, highlighted: Bool)
}

/// Pure rules, unit tested
enum CurrentOutletLogic {
    /// Active outlets, the default first, the rest in the API order
    static func activeOutlets(_ outlets: [Outlet]) -> [Outlet] {
        let active = outlets.filter { $0.isActive != false }
        return active.filter { $0.isDefault == true } + active.filter { $0.isDefault != true }
    }

    static func defaultOutlet(_ active: [Outlet]) -> Outlet? {
        active.first { $0.isDefault == true } ?? active.first
    }

    /// The remembered branch when it is still active, else the default. `fellBack`: a remembered branch is gone
    static func resolve(remembered: Int?, active: [Outlet]) -> (outlet: Outlet?, fellBack: Bool) {
        if let remembered, let match = active.first(where: { $0.id == remembered }) {
            return (match, false)
        }
        return (defaultOutlet(active), remembered != nil && !active.isEmpty)
    }

    /// Only a MERCHANT switches, and only with two or more active branches
    static func canSwitch(role: Role?, activeCount: Int) -> Bool {
        role == .merchant && activeCount >= 2
    }

    static func headerMode(role: Role?, activeCount: Int, name: String?, isDefault: Bool) -> OutletHeaderMode {
        guard let name, !name.isEmpty else { return .hidden }
        if canSwitch(role: role, activeCount: activeCount) {
            return .button(name, highlighted: !isDefault)
        }
        return .plain(name)
    }

    /// Switching drops the cart; ask first only when it has lines
    static func needsCartConfirm(itemCount: Int) -> Bool { itemCount > 0 }
}

final class CurrentOutlet {
    static let shared = CurrentOutlet()

    private static let choicePrefix = "anyrent.currentOutlet."
    private static let outletsPrefix = "anyrent.merchantOutlets."

    private let defaults: UserDefaults
    private let loader: (@escaping ([Outlet]?, NSError?) -> Void) -> Void
    /// Active outlets of the merchant, default first (empty for outlet users or before the first load)
    private(set) var outlets: [Outlet] = []
    private var loadedForUserId: Int?
    private var refreshing = false

    init(defaults: UserDefaults = .standard,
         loader: @escaping (@escaping ([Outlet]?, NSError?) -> Void) -> Void = { OutletService.shared.getOutlets(completion: $0) }) {
        self.defaults = defaults
        self.loader = loader
    }

    // MARK: - Reading

    private var user: User? { User.current() }

    private var isMerchant: Bool { user?.role == .merchant }

    /// The outlet the app works in: the outlet user's own, or the merchant's chosen (else default) branch.
    /// Nil only for a merchant before its outlets were ever loaded on this device (the API then uses the default).
    var id: Int? {
        guard let user else { return nil }
        guard user.role == .merchant else { return user.outlet?.id ?? user.outletId }
        syncCache(for: user.id)
        return CurrentOutletLogic.resolve(remembered: remembered(for: user.id), active: outlets).outlet?.id
            ?? remembered(for: user.id) ?? user.outlet?.id ?? user.outletId
    }

    /// For list filters the API did not get before (#828): the chosen branch of a merchant, nil for outlet users
    /// (the API already scopes them to their outlet)
    var merchantFilterId: Int? { isMerchant ? id : nil }

    var outlet: Outlet? {
        guard let user else { return nil }
        guard user.role == .merchant else { return user.outlet }
        let current = id
        return outlets.first { $0.id == current } ?? user.outlet
    }

    var name: String? { outlet?.name }

    var canSwitch: Bool { CurrentOutletLogic.canSwitch(role: user?.role, activeCount: outlets.count) }

    var isDefault: Bool {
        guard isMerchant, outlets.count >= 2 else { return true }
        return outlet?.isDefault == true
    }

    var headerMode: OutletHeaderMode {
        if isMerchant, let user { syncCache(for: user.id) }
        return CurrentOutletLogic.headerMode(role: user?.role, activeCount: outlets.count, name: name, isDefault: isDefault)
    }

    // MARK: - Changing

    /// Merchant picked a branch in the sheet
    func select(_ outletId: Int) {
        guard let user, user.role == .merchant else { return }
        let before = id
        defaults.set(outletId, forKey: Self.choicePrefix + String(user.id))
        if before != id { post() }
    }

    /// Reloads the merchant's active outlets. `onFallback` gets the old and the new name when the remembered branch
    /// is no longer active (the choice falls back to the default; the caller tells the merchant once).
    func refresh(onFallback: ((_ newName: String) -> Void)? = nil, completion: (() -> Void)? = nil) {
        guard let user, user.role == .merchant, !refreshing else {
            completion?()
            return
        }
        refreshing = true
        let userId = user.id
        let beforeId = id
        let beforeMode = headerMode
        loader { [weak self] loaded, _ in
            DispatchQueue.main.async {
                guard let self else { return }
                self.refreshing = false
                guard let loaded, User.current()?.id == userId else {
                    completion?()
                    return
                }
                let active = CurrentOutletLogic.activeOutlets(loaded)
                self.outlets = active
                self.loadedForUserId = userId
                if let data = try? JSONEncoder().encode(active) {
                    self.defaults.set(data, forKey: Self.outletsPrefix + String(userId))
                }
                let result = CurrentOutletLogic.resolve(remembered: self.remembered(for: userId), active: active)
                if result.fellBack {
                    self.defaults.removeObject(forKey: Self.choicePrefix + String(userId))
                    if let name = result.outlet?.name { onFallback?(name) }
                }
                if beforeId != self.id || beforeMode != self.headerMode { self.post() }
                completion?()
            }
        }
    }

    /// Logout or account change: back to the default branch next time
    func forget(userId: Int?) {
        if let userId {
            defaults.removeObject(forKey: Self.choicePrefix + String(userId))
            defaults.removeObject(forKey: Self.outletsPrefix + String(userId))
        }
        outlets = []
        loadedForUserId = nil
    }

    // MARK: - Private

    private func remembered(for userId: Int) -> Int? {
        defaults.object(forKey: Self.choicePrefix + String(userId)) as? Int
    }

    /// Outlets cached on disk for this account, so the header and the filters are right before the first load
    private func syncCache(for userId: Int) {
        guard loadedForUserId != userId else { return }
        loadedForUserId = userId
        if let data = defaults.data(forKey: Self.outletsPrefix + String(userId)),
           let cached = try? JSONDecoder().decode([Outlet].self, from: data) {
            outlets = CurrentOutletLogic.activeOutlets(cached)
        } else {
            outlets = []
        }
    }

    private func post() {
        NotificationCenter.default.post(name: .currentOutletDidChange, object: self)
    }
}
