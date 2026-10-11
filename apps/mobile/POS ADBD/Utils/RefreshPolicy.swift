//
//  RefreshPolicy.swift
//  POS ADBD
//
//  #674: screens reload on appear only when their data changed or got old. Android: `RefreshPolicy.kt`.
//
//  - The app-wide "orders changed" signal is `Notification.Name.orderDidCreateOrUpdate`, posted through
//    `OrdersChangeSignal.post()` after every order mutation (Giao đồ, Nhận trả, extend, edit, cancel, delete,
//    note change, create from the cart). Orders, Calendar and Overview mark themselves dirty on it.
//  - On appear a screen reloads only when it is dirty or its last load is older than its TTL.
//

import Foundation

enum RefreshPolicy {
    /// Orders, Calendar, rented-out and not-picked-up lists
    static let listTTL: TimeInterval = 5 * 60
    /// Overview, Settings plan/counts/overlap, unread badge
    static let summaryTTL: TimeInterval = 10 * 60

    /// True when nothing was loaded yet, an order changed since the last load, or the last load is `ttl` old
    static func shouldReload(dirty: Bool, lastLoadedAt: Date?, now: Date, ttl: TimeInterval) -> Bool {
        guard !dirty, let lastLoadedAt else { return true }
        return now.timeIntervalSince(lastLoadedAt) >= ttl
    }
}

/// Freshness of one screen's data. A load takes `begin()` when it starts and passes it to `loaded`, so a change
/// that lands while the request is in flight still leaves the data dirty.
struct RefreshTracker: Equatable {
    private(set) var changeVersion = 0
    private(set) var loadedVersion = 0
    private(set) var lastLoadedAt: Date?

    var isDirty: Bool { loadedVersion < changeVersion }

    mutating func markDirty() { changeVersion += 1 }

    func begin() -> Int { changeVersion }

    mutating func loaded(version: Int, at date: Date) {
        loadedVersion = max(loadedVersion, version)
        lastLoadedAt = date
    }

    func shouldReload(now: Date, ttl: TimeInterval) -> Bool {
        RefreshPolicy.shouldReload(dirty: isDirty, lastLoadedAt: lastLoadedAt, now: now, ttl: ttl)
    }
}

/// The one "orders changed" signal (#674)
enum OrdersChangeSignal {
    static let name = Notification.Name.orderDidCreateOrUpdate

    static func post() {
        if Thread.isMainThread {
            NotificationCenter.default.post(name: name, object: nil)
        } else {
            DispatchQueue.main.async { NotificationCenter.default.post(name: name, object: nil) }
        }
    }
}
