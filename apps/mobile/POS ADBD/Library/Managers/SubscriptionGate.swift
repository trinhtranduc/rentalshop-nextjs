//
//  SubscriptionGate.swift
//  POS ADBD
//
//  #1459 An expired shop can still sign in, but nearly every call answers 403 (SUBSCRIPTION_EXPIRED). Instead of an
//  error on each screen the app shows one screen ("Gói của shop đã hết hạn"):
//  - after login, when the login's period end has passed;
//  - at launch, when the last known period end has passed (then a status read decides);
//  - on any 403 that says the period ended: SUBSCRIPTION_EXPIRED (what `authenticateRequest` answers today),
//    SUBSCRIPTION_PERIOD_ENDED (the later subscription check), SUBSCRIPTION_CANCELLED (a cancelled period that ended) or
//    SUBSCRIPTION_PAST_DUE (a payment problem the API blocks on).
//  The gate only calls GET /api/subscriptions/status, GET /api/plans (owner) and logout, all open to expired shops.
//

import Foundation

final class SubscriptionGate {
    static let shared = SubscriptionGate()
    /// A payment was confirmed or the plan changed: Home hides or redraws its "Còn N ngày" line
    static let planDidChange = Notification.Name("planDidChange")
    /// 403 codes that open the plan screen: the period ended, or a payment problem the API blocks on (PAST_DUE: the owner
    /// reaches Quản lý / huỷ gói, staff "Nhờ chủ shop gia hạn."). Not PAUSED: that one is the admin's, "contact support".
    static let periodEndedCodes: Set<String> = ["SUBSCRIPTION_EXPIRED", "SUBSCRIPTION_PERIOD_ENDED", "SUBSCRIPTION_CANCELLED", "SUBSCRIPTION_PAST_DUE"]

    private let defaults: UserDefaults
    private static let endKey = "plan.periodEnd.v1"
    private static let merchantKey = "plan.periodEnd.merchant.v1"

    /// The expired screen is the window's root
    var isShowingExpired = false

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    // MARK: - What the app knows of the period end

    /// A status answer (any screen) keeps the end of the shop's period
    func remember(_ status: PlanStatus) {
        guard let end = status.periodEnd, let merchantId = User.account()?.merchantId else { return }
        store(end, merchantId: merchantId)
    }

    /// The login answer carries `merchant.subscription.currentPeriodEnd`
    func rememberLogin(_ user: User?) {
        guard let user, let merchantId = user.merchantId, let end = user.merchant?.subscription?.currentPeriodEnd else { return }
        store(end, merchantId: merchantId)
    }

    func clear() {
        defaults.removeObject(forKey: Self.endKey)
        defaults.removeObject(forKey: Self.merchantKey)
        isShowingExpired = false
    }

    /// Last known period end of this user's shop
    var knownPeriodEnd: Date? {
        guard let user = User.account(), let merchantId = user.merchantId else { return nil }
        if defaults.integer(forKey: Self.merchantKey) == merchantId, defaults.object(forKey: Self.endKey) != nil {
            return Date(timeIntervalSince1970: defaults.double(forKey: Self.endKey))
        }
        return user.merchant?.subscription?.currentPeriodEnd
    }

    /// A shop user (not ADMIN) whose last known period end has passed
    func knownExpired(now: Date = Date()) -> Bool {
        guard let user = User.account(), user.role != .admin, user.merchantId != nil else { return false }
        return PlanRenewalLogic.isPeriodOver(knownPeriodEnd, now: now)
    }

    private func store(_ end: Date, merchantId: Int) {
        defaults.set(end.timeIntervalSince1970, forKey: Self.endKey)
        defaults.set(merchantId, forKey: Self.merchantKey)
    }

    // MARK: - Signals

    /// A request answered 403 with one of `periodEndedCodes`
    func periodEnded() {
        DispatchQueue.main.async { appDelegate.showExpiredPlan() }
    }

    /// The tabs are up: read the status once; an expired shop goes to the gate
    func verifyInBackground() {
        guard let user = User.account(), user.role != .admin, user.merchantId != nil else { return }
        SubscriptionAPIService.shared.planStatus { status, _ in
            guard let status, status.isBlocked else { return }
            appDelegate.showExpiredPlan()
        }
    }

    /// The per-screen alert for this code is not shown: the gate says it once
    static func isPeriodEndedError(_ error: Error) -> Bool {
        ((error as NSError).userInfo[NSError.apiCodeKey] as? String).map(periodEndedCodes.contains) ?? false
    }

    /// Pure: does this answer open the gate (an authorised request, 403, a period-ended code)
    static func opensGate(statusCode: Int?, code: String?, sentAuthorization: Bool) -> Bool {
        statusCode == 403 && sentAuthorization && code.map(periodEndedCodes.contains) == true
    }
}
