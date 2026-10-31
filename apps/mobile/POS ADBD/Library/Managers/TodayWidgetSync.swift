//
//  TodayWidgetSync.swift
//  POS ADBD
//
//  #1375 (epic #1372): keeps the "Việc cần làm" widget file up to date. The app writes the file; the widget extension
//  only reads it (no network, no token: the refresh token changes on every refresh, a second process refreshing it
//  could sign the whole phone out).
//
//  It writes when the app opens, the branch changes, an order is created / handed over / returned / cancelled, the
//  customer-name switch changes, and after sign-in. At sign-out the shop's data goes away at once.
//

import Foundation
import UIKit
import DraftOrderActivity

final class TodayWidgetSync {
    static let shared = TodayWidgetSync()

    /// What an answer of the API does to the file
    enum Outcome: Equatable {
        /// A list: write it
        case write
        /// 403: this account has no "Việc cần làm"
        case noAccess
        /// A network or server error: the last file stays (never turned into an empty or a wrong day)
        case keep
    }

    static func outcome(work: TodayWork?, error: NSError?) -> Outcome {
        if work != nil { return .write }
        if error?.code == 403 { return .noAccess }
        return .keep
    }

    // MARK: Ẩn tên khách trên widget

    static let hideNamesKey = "widget.hideCustomerNames"

    static func hideNames(defaults: UserDefaults = .standard) -> Bool {
        defaults.bool(forKey: hideNamesKey)
    }

    static func setHideNames(_ hidden: Bool, defaults: UserDefaults = .standard) {
        defaults.set(hidden, forKey: hideNamesKey)
    }

    // MARK: Refresh

    private var started = false
    private var pending: DispatchWorkItem?
    /// Bumped at sign-out and at every request: an answer from before sign-out is dropped
    private var generation = 0
    private var lastWork: TodayWork?
    private var lastUserId: Int?

    /// Observers; safe to call more than once
    func start() {
        guard !started, TodayWidgetBridge.isSupported else { return }
        started = true
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(changed), name: NSNotification.Name.UIApplicationDidBecomeActive, object: nil)
        center.addObserver(self, selector: #selector(changed), name: OrdersChangeSignal.name, object: nil)
        center.addObserver(self, selector: #selector(changed), name: .currentOutletDidChange, object: nil)
    }

    @objc private func changed() {
        refresh()
    }

    /// A few changes in a row make one request
    func refresh() {
        guard TodayWidgetBridge.isSupported else { return }
        pending?.cancel()
        let item = DispatchWorkItem { [weak self] in self?.load() }
        pending = item
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8, execute: item)
    }

    private func load() {
        guard let user = User.account() else { return }
        generation += 1
        let current = generation
        _ = AnalyticsAPIService.shared.loadOutletOperations { [weak self] work, error in
            DispatchQueue.main.async {
                guard let self = self, current == self.generation, User.account()?.id == user.id else { return }
                self.apply(work: work, error: error, user: user)
            }
        }
    }

    private func apply(work: TodayWork?, error: NSError?, user: User) {
        let now = Date()
        let labels = TodayWidgetData.labels()
        let outletId = CurrentOutlet.shared.id ?? user.outletId ?? 0
        switch TodayWidgetSync.outcome(work: work, error: error) {
        case .write:
            guard let work = work else { return }
            lastWork = work
            lastUserId = user.id
            TodayWidgetBridge.write(TodayWidgetData.snapshot(from: work, userId: user.id, outletId: outletId,
                                                             hideNames: TodayWidgetSync.hideNames(), now: now, labels: labels))
        case .noAccess:
            lastWork = nil
            TodayWidgetBridge.write(TodayWidgetSnapshot.noAccess(userId: user.id, outletId: outletId, labels: labels, now: now))
        case .keep:
            break
        }
    }

    /// The owner flipped "Ẩn tên khách trên widget": rewrite from the last answer, or ask again
    func hideNamesChanged() {
        guard let user = User.account() else { return }
        if let work = lastWork, lastUserId == user.id {
            TodayWidgetBridge.write(TodayWidgetData.snapshot(from: work, userId: user.id,
                                                             outletId: CurrentOutlet.shared.id ?? user.outletId ?? 0,
                                                             hideNames: TodayWidgetSync.hideNames(), now: Date(),
                                                             labels: TodayWidgetData.labels()))
        } else {
            refresh()
        }
    }

    /// Logout, a kicked session, a switch of account: the shop's data leaves the widget at once
    func userDidSignOut() {
        generation += 1
        pending?.cancel()
        lastWork = nil
        lastUserId = nil
        TodayWidgetBridge.signOut(labels: TodayWidgetData.labels())
    }
}
