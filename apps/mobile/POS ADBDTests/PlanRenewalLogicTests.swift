import XCTest
@testable import POS_ADBD

/// #1459 Gói dịch vụ: the words and numbers the plan screens show. The rule of what may be bought is the server's
/// (`canRenew`, `canUpgrade`, `purchasablePlanIds`); these tests pin how the app reads it. Same cases on Android
/// (`PlanRenewalTest.kt`), contract in .agent/changes/1459-plan-renewal/mobile.md.
final class PlanRenewalLogicTests: XCTestCase {
    private let basicProducts = PlanStoreProducts(semiAnnual: "anyrent_merchant_semi_annual", annual: "anyrent_merchant_annual")
    private let proProducts = PlanStoreProducts(semiAnnual: "anyrent_professional_semi_annual", annual: "anyrent_professional_annual")
    /// 2026-11-02 10:00 in Vietnam
    private let now = ISO8601DateFormatter().date(from: "2026-11-02T03:00:00Z")!

    private func status(_ json: String) throws -> PlanStatus {
        try JSONDecoder().decode(PlanStatus.self, from: Data(json.utf8))
    }

    // MARK: Decoding

    func testStatusDecodesTheNewFieldsAndToleratesAnOlderApi() throws {
        let new = try status("""
        {"planId":2,"planName":"Basic","status":"ACTIVE","dbStatus":"ACTIVE","daysRemaining":5,
         "currentPeriodEnd":"2026-11-07T03:00:00.000Z","billingAmount":1799000,"billingCurrency":"VND",
         "billingChannel":"APP_STORE","autoRenew":false,"billingIssue":true,"storeProductId":"anyrent_merchant_annual",
         "planTier":"basic","canRenew":true,"canUpgrade":true,"purchasablePlanIds":[2,3],"renewWindowDays":7,
         "limits":{"outlets":1,"users":2,"products":2000,"allowWebAccess":true},"features":["Mobile app access"]}
        """)
        XCTAssertEqual(new.purchasable, [2, 3])
        XCTAssertEqual(new.billingIssue, true)
        XCTAssertEqual(new.limits, PlanLimits(outlets: 1, users: 2, products: 2000))
        XCTAssertEqual(new.periodEnd, ISO8601DateFormatter().date(from: "2026-11-07T03:00:00Z"))

        let old = try status(#"{"planName":"Basic","status":"ACTIVE","daysRemaining":20,"currentPeriodEnd":"2026-11-22T03:00:00Z"}"#)
        XCTAssertEqual(old.purchasable, [])
        XCTAssertNil(old.canRenew)
        XCTAssertEqual(old.window, 7)
    }

    func testPlansDecodeLimitsAndFeaturesSentAsJsonStrings() throws {
        let json = """
        [{"id":2,"name":"Basic","isPopular":false,"sortOrder":1,"limits":"{\\"users\\":2,\\"products\\":2000,\\"outlets\\":1}",
          "features":"[\\"Mobile app access\\"]","storeProductIds":{"semiAnnual":"anyrent_merchant_semi_annual","annual":"anyrent_merchant_annual"}},
         {"id":3,"name":"Professional","isPopular":true,"sortOrder":2,"limits":"{\\"users\\":4,\\"products\\":5000}",
          "features":"[\\"All Basic features\\",\\"Web dashboard access\\"]","storeProductIds":{"semiAnnual":"anyrent_professional_semi_annual","annual":"anyrent_professional_annual"}},
         {"id":4,"name":"Enterprise","isPopular":false,"sortOrder":3,"limits":"{}","features":"[]","storeProductIds":null}]
        """
        let plans = try JSONDecoder().decode([PlanOption].self, from: Data(json.utf8))
        XCTAssertEqual(plans.map(\.tierRank), [1, 2, 0])
        XCTAssertEqual(plans[0].limits, PlanLimits(outlets: 1, users: 2, products: 2000))
        XCTAssertTrue(plans[1].isPopular)
        XCTAssertTrue(PlanRenewalLogic.hasWeb(plans[1].features))
        XCTAssertFalse(PlanRenewalLogic.hasWeb(plans[0].features))
        XCTAssertNil(plans[2].storeProductIds)
    }

    // MARK: Words

    func testTrialShowsDungThuNeverTheRawValue() {
        XCTAssertEqual(PlanRenewalLogic.displayPlanName("Basic", isTrial: true), "plan.trial".localized())
        XCTAssertEqual(PlanRenewalLogic.displayPlanName("Trial", isTrial: false), "plan.trial".localized())
        XCTAssertEqual(PlanRenewalLogic.displayPlanName("Professional", isTrial: false), "Professional")
        XCTAssertNotEqual("plan.trial".localized(), "plan.trial")
    }

    func testStatusLineDaysLeftLastDayAndValidUntil() {
        var s = PlanStatus(status: "ACTIVE", daysRemaining: 13, currentPeriodEnd: "2026-11-15T03:00:00Z")
        XCTAssertEqual(PlanRenewalLogic.statusLine(s), .daysLeft(end: "15/11/2026", days: 13))
        s.daysRemaining = 0
        XCTAssertEqual(PlanRenewalLogic.statusLine(s), .lastDay(end: "15/11/2026"))
        XCTAssertEqual(PlanRenewalLogic.statusLine(s, renewed: true), .validUntil(end: "15/11/2026"))
        s.autoRenew = true
        XCTAssertEqual(PlanRenewalLogic.statusLine(s), .validUntil(end: "15/11/2026"))
    }

    func testDayIsTheVietnamDay() {
        // 16:59:59Z is still 2 Nov in Vietnam; 17:00Z is 3 Nov
        XCTAssertEqual(PlanRenewalLogic.day(ISO8601DateFormatter().date(from: "2026-11-02T16:59:59Z")!), "02/11/2026")
        XCTAssertEqual(PlanRenewalLogic.day(ISO8601DateFormatter().date(from: "2026-11-02T17:00:00Z")!), "03/11/2026")
    }

    func testIncludesLine() {
        let basic = PlanLimits(outlets: 1, users: 2, products: 2000)
        XCTAssertEqual(PlanRenewalLogic.includes(limits: basic, features: ["Mobile app access"], withOutlets: false),
                       ["plan.feature.phone".localized(), String(format: "plan.feature.users".localized(), 2),
                        String(format: "plan.feature.products".localized(), "2.000")].joined(separator: " · "))
        let pro = PlanRenewalLogic.includes(limits: PlanLimits(outlets: 1, users: 4, products: 5000),
                                            features: ["Web dashboard access"], withOutlets: true)
        XCTAssertTrue(pro.hasPrefix("plan.feature.phoneWeb".localized()))
        XCTAssertTrue(pro.contains(String(format: "plan.feature.outlets".localized(), 1)))
        XCTAssertTrue(pro.contains("5.000"))
    }

    // MARK: Money

    func testMonthlyExactAndApproximate() {
        XCTAssertEqual(PlanRenewalLogic.monthly(total: 999_000, months: 6, currencyCode: "VND"), .init(amount: 166_500, approximate: false))
        XCTAssertEqual(PlanRenewalLogic.monthly(total: 1_799_000, months: 12, currencyCode: "VND"), .init(amount: 150_000, approximate: true))
        XCTAssertEqual(PlanRenewalLogic.monthly(total: 2_399_000, months: 12, currencyCode: "VND"), .init(amount: 200_000, approximate: true))
        XCTAssertEqual(PlanRenewalLogic.monthly(total: Decimal(string: "59.99")!, months: 12, currencyCode: "USD"),
                       .init(amount: Decimal(string: "5")!, approximate: true))
    }

    func testSavingsAgainstTwoSixMonthPeriods() {
        XCTAssertEqual(PlanRenewalLogic.savingsPercent(semiAnnual: 999_000, annual: 1_799_000), 10)
        XCTAssertEqual(PlanRenewalLogic.savingsPercent(semiAnnual: 1_299_000, annual: 2_399_000), 8)
        XCTAssertNil(PlanRenewalLogic.savingsPercent(semiAnnual: 900_000, annual: 1_800_000))
    }

    // MARK: Buying

    func testPurchaseKind() {
        typealias L = PlanRenewalLogic
        XCTAssertEqual(L.purchaseKind(selectedPlanId: 2, selectedRank: 1, currentPlanId: 2, currentRank: 1, isTrial: false), .renew)
        XCTAssertEqual(L.purchaseKind(selectedPlanId: 3, selectedRank: 2, currentPlanId: 2, currentRank: 1, isTrial: false), .upgrade)
        XCTAssertEqual(L.purchaseKind(selectedPlanId: 2, selectedRank: 1, currentPlanId: 3, currentRank: 2, isTrial: false), .buy)
        // Trial: buying the plan the trial runs on is a purchase, not a renewal
        XCTAssertEqual(L.purchaseKind(selectedPlanId: 2, selectedRank: 1, currentPlanId: 2, currentRank: 1, isTrial: true), .buy)
        // Trial plan (no tier): every plan is a purchase
        XCTAssertEqual(L.purchaseKind(selectedPlanId: 3, selectedRank: 2, currentPlanId: 1, currentRank: 0, isTrial: true), .buy)
    }

    func testButtonTitles() {
        XCTAssertEqual(PlanRenewalLogic.buttonTitle(kind: .renew, planName: "Basic", months: 12, amount: "1.799.000 ₫"),
                       String(format: "plan.button.renew".localized(), "plan.months12".localized(), "1.799.000 ₫"))
        XCTAssertEqual(PlanRenewalLogic.buttonTitle(kind: .upgrade, planName: "Professional", months: 12, amount: "2.399.000 ₫"),
                       String(format: "plan.button.upgrade".localized(), "Professional", "plan.months12".localized(), "2.399.000 ₫"))
        XCTAssertEqual(PlanRenewalLogic.buttonTitle(kind: .buy, planName: "Basic", months: 6, amount: "999.000 ₫"),
                       String(format: "plan.button.buy".localized(), "Basic", "plan.months6".localized(), "999.000 ₫"))
    }

    func testNewPeriodEndIsTodayPlusMonthsOnTheVietnamDayClamped() {
        XCTAssertEqual(PlanRenewalLogic.day(PlanRenewalLogic.newPeriodEnd(now: now, months: 12)), "02/11/2027")
        XCTAssertEqual(PlanRenewalLogic.day(PlanRenewalLogic.newPeriodEnd(now: now, months: 6)), "02/05/2027")
        // 31 Jan 2027 23:30 in Vietnam (16:30Z) + 1 month → 28 Feb
        let endOfJan = ISO8601DateFormatter().date(from: "2027-01-31T16:30:00Z")!
        XCTAssertEqual(PlanRenewalLogic.day(PlanRenewalLogic.newPeriodEnd(now: endOfJan, months: 1)), "28/02/2027")
        // 17:00Z on 30 Nov is already 1 Dec in Vietnam: + 6 months → 1 Jun
        let vnDecember = ISO8601DateFormatter().date(from: "2026-11-30T17:00:00Z")!
        XCTAssertEqual(PlanRenewalLogic.day(PlanRenewalLogic.newPeriodEnd(now: vnDecember, months: 6)), "01/06/2027")
        XCTAssertEqual(PlanRenewalLogic.disclosure(now: now, months: 12, amount: "1.799.000 ₫"),
                       String(format: "plan.disclosure".localized(), "02/11/2027", 12, "1.799.000 ₫"))
    }

    func testDefaultPlanIsTheCurrentOneWhenPurchasableElseTheFirst() {
        let plans = [PlanOption(id: 2, name: "Basic", storeProductIds: basicProducts),
                     PlanOption(id: 3, name: "Professional", isPopular: true, storeProductIds: proProducts)]
        XCTAssertEqual(PlanRenewalLogic.defaultPlanId(plans: plans, status: PlanStatus(planId: 2, purchasablePlanIds: [2, 3])), 2)
        XCTAssertEqual(PlanRenewalLogic.defaultPlanId(plans: plans, status: PlanStatus(planId: 2, purchasablePlanIds: [3])), 3)
        XCTAssertNil(PlanRenewalLogic.defaultPlanId(plans: plans, status: PlanStatus(planId: 3, purchasablePlanIds: [])))
    }

    // MARK: Screens

    func testScreenMode() {
        typealias L = PlanRenewalLogic
        let active = PlanStatus(status: "ACTIVE", purchasablePlanIds: [3])
        XCTAssertEqual(L.mode(isOwner: true, status: active, storeHasProducts: true), .purchase)
        XCTAssertEqual(L.mode(isOwner: true, status: active, storeHasProducts: false), .storeUnavailable)
        XCTAssertEqual(L.mode(isOwner: true, status: PlanStatus(status: "ACTIVE", autoRenew: true), storeHasProducts: true), .autoRenewing)
        XCTAssertEqual(L.mode(isOwner: true, status: PlanStatus(status: "ACTIVE", purchasablePlanIds: []), storeHasProducts: true), .nothingToBuy)
        let expired = PlanStatus(status: "EXPIRED", autoRenew: true, purchasablePlanIds: [2, 3])
        XCTAssertEqual(L.mode(isOwner: true, status: expired, storeHasProducts: true), .expiredOwner)
        // Android build without a RevenueCat key: no store products, still a screen with Thử lại / Đăng xuất
        XCTAssertEqual(L.mode(isOwner: true, status: expired, storeHasProducts: false), .storeUnavailable)
        XCTAssertEqual(L.mode(isOwner: false, status: expired, storeHasProducts: true), .expiredStaff)
    }

    func testHomeLineOnlyForTheOwnerInsideTheWindow() {
        typealias L = PlanRenewalLogic
        let open = PlanStatus(status: "ACTIVE", daysRemaining: 5, autoRenew: false, canRenew: true, renewWindowDays: 7)
        XCTAssertEqual(L.homeLine(isOwner: true, status: open), String(format: "plan.home.daysLeft".localized(), 5))
        var lastDay = open
        lastDay.daysRemaining = 0
        XCTAssertEqual(L.homeLine(isOwner: true, status: lastDay), "plan.home.lastDay".localized())
        XCTAssertNil(L.homeLine(isOwner: false, status: open))
        var far = open
        far.daysRemaining = 8
        XCTAssertNil(L.homeLine(isOwner: true, status: far))
        var autoRenew = open
        autoRenew.autoRenew = true
        XCTAssertNil(L.homeLine(isOwner: true, status: autoRenew))
        var closed = open
        closed.canRenew = false
        XCTAssertNil(L.homeLine(isOwner: true, status: closed))
        XCTAssertNil(L.homeLine(isOwner: true, status: PlanStatus(status: "EXPIRED", daysRemaining: nil, canRenew: true)))
    }

    func testPeriodOverAndConfirmation() {
        typealias L = PlanRenewalLogic
        XCTAssertTrue(L.isPeriodOver(ISO8601DateFormatter().date(from: "2026-11-02T02:59:59Z"), now: now))
        XCTAssertFalse(L.isPeriodOver(ISO8601DateFormatter().date(from: "2026-11-02T03:00:01Z"), now: now))
        XCTAssertFalse(L.isPeriodOver(nil, now: now))

        let before = PlanStatus(planId: 2, status: "ACTIVE", currentPeriodEnd: "2026-11-07T03:00:00Z")
        XCTAssertFalse(L.confirmed(before: before, after: before))
        XCTAssertTrue(L.confirmed(before: before, after: PlanStatus(planId: 2, status: "ACTIVE", currentPeriodEnd: "2027-11-02T03:00:00Z")))
        XCTAssertTrue(L.confirmed(before: before, after: PlanStatus(planId: 3, status: "ACTIVE", currentPeriodEnd: "2026-11-07T03:00:00Z")))
        let expired = PlanStatus(planId: 2, status: "EXPIRED", currentPeriodEnd: "2026-10-31T03:00:00Z")
        XCTAssertFalse(L.confirmed(before: expired, after: expired))
        XCTAssertTrue(L.confirmed(before: expired, after: PlanStatus(planId: 2, status: "ACTIVE", currentPeriodEnd: "2027-11-02T03:00:00Z")))
    }

    func testGooglePlayIdsMatchWithoutTheBasePlan() {
        XCTAssertEqual(PlanRenewalLogic.baseProductId("anyrent_merchant_annual:annual"), "anyrent_merchant_annual")
        XCTAssertEqual(PlanRenewalLogic.baseProductId("anyrent_professional_annual"), "anyrent_professional_annual")
        XCTAssertNil(PlanRenewalLogic.baseProductId(nil))
    }

    func testGateOpensOnEveryPeriodEndedCodeOfAnAuthorisedRequest() {
        typealias G = SubscriptionGate
        for code in ["SUBSCRIPTION_EXPIRED", "SUBSCRIPTION_PERIOD_ENDED", "SUBSCRIPTION_CANCELLED", "SUBSCRIPTION_PAST_DUE"] {
            XCTAssertTrue(G.opensGate(statusCode: 403, code: code, sentAuthorization: true), code)
            XCTAssertFalse(G.opensGate(statusCode: 403, code: code, sentAuthorization: false), "no token: \(code)")
            XCTAssertTrue(G.isPeriodEndedError(NSError(domain: "RC", code: 403, userInfo: [NSError.apiCodeKey: code])))
        }
        XCTAssertFalse(G.opensGate(statusCode: 403, code: "SUBSCRIPTION_PAUSED", sentAuthorization: true), "paused is the admin's")
        XCTAssertFalse(G.opensGate(statusCode: 403, code: "INSUFFICIENT_PERMISSIONS", sentAuthorization: true))
        XCTAssertFalse(G.opensGate(statusCode: 401, code: "SUBSCRIPTION_EXPIRED", sentAuthorization: true))
        XCTAssertFalse(G.isPeriodEndedError(NSError(domain: "RC", code: 403)))
    }

    /// A PAST_DUE shop (Lemon / Stripe, or a store row from before #1459) is blocked by the API while its period runs:
    /// the gate stays up, the owner gets Quản lý / huỷ gói (nothing to buy, no double billing), staff ask the owner
    func testPastDueKeepsTheGateWithoutAPlanToBuy() {
        typealias L = PlanRenewalLogic
        let pastDue = PlanStatus(status: "ACTIVE", dbStatus: "PAST_DUE", daysRemaining: 10, billingIssue: true, purchasablePlanIds: [3])
        XCTAssertTrue(pastDue.isPastDue)
        XCTAssertTrue(pastDue.isBlocked)
        XCTAssertEqual(L.mode(isOwner: true, status: pastDue, storeHasProducts: true), .paymentIssueOwner)
        XCTAssertEqual(L.mode(isOwner: false, status: pastDue, storeHasProducts: true), .expiredStaff)
        // A store billing issue keeps ACTIVE (#1459): not blocked, the plan screen shows the payment line
        let storeIssue = PlanStatus(status: "ACTIVE", dbStatus: "ACTIVE", daysRemaining: 10, billingIssue: true, purchasablePlanIds: [3])
        XCTAssertFalse(storeIssue.isBlocked)
        XCTAssertEqual(L.mode(isOwner: true, status: storeIssue, storeHasProducts: true), .purchase)
        // Expired wins over PAST_DUE
        let ended = PlanStatus(status: "EXPIRED", dbStatus: "PAST_DUE", purchasablePlanIds: [2, 3])
        XCTAssertFalse(ended.isPastDue)
        XCTAssertTrue(ended.isBlocked)
        XCTAssertEqual(L.mode(isOwner: true, status: ended, storeHasProducts: true), .expiredOwner)
    }

    // MARK: Audit fixes (A1, A3a, A5, A6, A12)

    /// A3a: only builds on the production API buy as merchant_<id>; any other API uses dev_merchant_<id>
    func testAppUserIdUsesTheDevPrefixOffProduction() {
        XCTAssertEqual(PlanRenewalLogic.appUserId(merchantId: 7, apiBaseURL: "https://api.anyrent.shop"), "merchant_7")
        XCTAssertEqual(PlanRenewalLogic.appUserId(merchantId: 7, apiBaseURL: "https://api.anyrent.shop/"), "merchant_7")
        XCTAssertEqual(PlanRenewalLogic.appUserId(merchantId: 7, apiBaseURL: "https://dev-api.anyrent.shop"), "dev_merchant_7")
        XCTAssertEqual(PlanRenewalLogic.appUserId(merchantId: 7, apiBaseURL: "http://localhost:3459"), "dev_merchant_7")
    }

    /// A1: the store sheet opens only when RevenueCat is logged in as this shop
    func testStoreAccountReadyOnlyForTheExpectedId() {
        typealias L = PlanRenewalLogic
        XCTAssertTrue(L.storeAccountReady(current: "merchant_7", expected: "merchant_7"))
        XCTAssertFalse(L.storeAccountReady(current: "$RCAnonymousID:abc", expected: "merchant_7"))
        XCTAssertFalse(L.storeAccountReady(current: "merchant_8", expected: "merchant_7"))
        XCTAssertFalse(L.storeAccountReady(current: nil, expected: "merchant_7"))
        XCTAssertFalse(L.storeAccountReady(current: "merchant_7", expected: nil))
        XCTAssertFalse(L.storeAccountReady(current: "", expected: ""))
    }

    /// A5: upgrade while auto-renewing on this store; A6: re-enable instead of buying the same product
    func testUpgradeWhileAutoRenewingAndReenable() throws {
        typealias L = PlanRenewalLogic
        let upgrade = PlanStatus(status: "ACTIVE", autoRenew: true, purchasablePlanIds: [3])
        XCTAssertEqual(L.mode(isOwner: true, status: upgrade, storeHasProducts: true), .purchase)
        XCTAssertEqual(L.mode(isOwner: true, status: upgrade, storeHasProducts: false), .autoRenewing)
        XCTAssertEqual(L.mode(isOwner: true, status: PlanStatus(status: "ACTIVE", autoRenew: true, purchasablePlanIds: []), storeHasProducts: true), .autoRenewing)
        let reenableOnly = PlanStatus(status: "ACTIVE", autoRenew: false, purchasablePlanIds: [], reenableAutoRenew: true)
        XCTAssertEqual(L.mode(isOwner: true, status: reenableOnly, storeHasProducts: true), .reenableOnly)
        let reenableAndUpgrade = PlanStatus(status: "ACTIVE", autoRenew: false, purchasablePlanIds: [3], reenableAutoRenew: true)
        XCTAssertEqual(L.mode(isOwner: true, status: reenableAndUpgrade, storeHasProducts: true), .purchase)
        let decoded = try status(#"{"status":"ACTIVE","reenableAutoRenew":true,"purchasablePlanIds":[]}"#)
        XCTAssertEqual(decoded.reenableAutoRenew, true)
        XCTAssertNil(try status(#"{"status":"ACTIVE"}"#).reenableAutoRenew)
    }

    /// A12: about a minute for the webhook before the slow state
    func testConfirmationWaitsAboutAMinute() {
        XCTAssertEqual(PlanConfirmation.timeout, 60)
        XCTAssertEqual(PlanConfirmation.interval, 2)
    }

    // MARK: A13 renewal credit: a renewal continues from the old end, the days left are never lost

    /// 2026-11-03 10:00 in Vietnam
    private let renewNow = ISO8601DateFormatter().date(from: "2026-11-03T03:00:00Z")!
    private let price = "1.799.000 ₫"

    /// Owner example: the plan ends 05/11/2026, 12 months bought on 03/11/2026 → 05/11/2027; the store charges 03/11/2027
    func testDisclosureContinuesFromTheOldEnd() {
        typealias L = PlanRenewalLogic
        let manual = PlanStatus(planId: 2, status: "ACTIVE", dbStatus: "ACTIVE", daysRemaining: 2,
                                currentPeriodEnd: "2026-11-05T16:59:59.999Z", billingChannel: "MANUAL")
        XCTAssertEqual(L.disclosure(now: renewNow, months: 12, amount: price, status: manual),
                       String(format: "plan.disclosureCarry".localized(), "05/11/2026", "05/11/2027", 12, price, "03/11/2027"))
        // Trial days are kept too (6 months: 03/05/2027 + 10 days)
        let trial = PlanStatus(planId: 1, status: "ACTIVE", dbStatus: "TRIAL", daysRemaining: 10, currentPeriodEnd: "2026-11-13T03:00:00Z")
        XCTAssertEqual(L.disclosure(now: renewNow, months: 6, amount: "999.000 ₫", status: trial),
                       String(format: "plan.disclosureCarry".localized(), "13/11/2026", "13/05/2027", 6, "999.000 ₫", "03/05/2027"))
        // A plan bought on Google Play, auto-renew off there, renewed on the iPhone: a new App Store subscription
        let otherStore = PlanStatus(planId: 2, status: "ACTIVE", daysRemaining: 3, currentPeriodEnd: "2026-11-06T03:00:00Z",
                                    billingChannel: "PLAY_STORE", autoRenew: false, storeProductId: "anyrent_merchant_annual")
        XCTAssertEqual(L.disclosure(now: renewNow, months: 12, amount: price, status: otherStore),
                       String(format: "plan.disclosureCarry".localized(), "06/11/2026", "06/11/2027", 12, price, "03/11/2027"))
    }

    func testDisclosureStartsTodayOnceExpired() {
        typealias L = PlanRenewalLogic
        let expired = PlanStatus(planId: 2, status: "EXPIRED", currentPeriodEnd: "2026-10-31T03:00:00Z", billingChannel: "MANUAL")
        let today = String(format: "plan.disclosure".localized(), "03/11/2027", 12, price)
        XCTAssertEqual(L.disclosure(now: renewNow, months: 12, amount: price, status: expired), today)
        XCTAssertEqual(L.disclosure(now: renewNow, months: 12, amount: price, status: nil), today)
        XCTAssertEqual(L.disclosure(now: renewNow, months: 12, amount: price), today)
    }

    /// An upgrade in the store that bills the plan: the store prorates its own days, only the credit carries over
    func testDisclosureForAnUpgradeInTheSameStore() {
        typealias L = PlanRenewalLogic
        let withCredit = PlanStatus(planId: 2, status: "ACTIVE", currentPeriodEnd: "2026-12-05T03:00:00Z", billingChannel: "APP_STORE",
                                    autoRenew: true, storeProductId: "anyrent_merchant_annual", purchasablePlanIds: [3],
                                    storeRenewsAt: "2026-12-03T03:00:00Z")
        XCTAssertEqual(L.disclosure(now: renewNow, months: 12, amount: "2.399.000 ₫", status: withCredit),
                       String(format: "plan.disclosureCredit".localized(), "05/11/2027", 12, "2.399.000 ₫", "03/11/2027"))
        var noCredit = withCredit
        noCredit.storeRenewsAt = "2026-12-05T03:00:00Z"
        XCTAssertEqual(L.disclosure(now: renewNow, months: 12, amount: "2.399.000 ₫", status: noCredit),
                       String(format: "plan.disclosure".localized(), "03/11/2027", 12, "2.399.000 ₫"))
    }

    /// The auto-renew row shows the store's charge date; "Dùng đến" stays the period end (they differ with a credit)
    func testAutoRenewRowUsesTheStoreChargeDate() throws {
        typealias L = PlanRenewalLogic
        let decoded = try status(#"{"status":"ACTIVE","autoRenew":true,"currentPeriodEnd":"2027-11-05T16:59:59.999Z","storeRenewsAt":"2027-11-03T03:00:00.000Z"}"#)
        XCTAssertEqual(decoded.storeRenewsAt, "2027-11-03T03:00:00.000Z")
        XCTAssertEqual(L.autoRenewDate(decoded).map(L.day), "03/11/2027")
        XCTAssertEqual(L.statusLine(decoded), .validUntil(end: "05/11/2027"))
        // An API without the field: the period end, as before
        let older = try status(#"{"status":"ACTIVE","autoRenew":true,"currentPeriodEnd":"2027-11-05T16:59:59.999Z"}"#)
        XCTAssertNil(older.storeRenewsAt)
        XCTAssertEqual(L.autoRenewDate(older).map(L.day), "05/11/2027")
    }

    // MARK: #1464 the store already has a plan; compact links

    /// One locale's sentence from the app bundle
    private func sentence(_ key: String, _ localization: String) -> String? {
        guard let path = Bundle.main.path(forResource: "Localizable", ofType: "strings", inDirectory: nil, forLocalization: localization),
              let table = NSDictionary(contentsOfFile: path) as? [String: String] else { return nil }
        return table[key]
    }

    /// Apple keeps the current plan and moves the bought one to the next renewal (another period in the same group, or a
    /// downgrade): the purchase answers with merchant_subscription still on the old product (dev, 2026-11-03)
    func testStoreKeptTheCurrentPlanWhenTheEntitlementIsOnAnotherProduct() {
        typealias L = PlanRenewalLogic
        XCTAssertTrue(L.storeKeptCurrentPlan(boughtProductId: "anyrent_merchant_annual", entitlementActive: true,
                                             entitlementProductId: "anyrent_merchant_semi_annual"))
        XCTAssertTrue(L.storeKeptCurrentPlan(boughtProductId: "anyrent_merchant_annual", entitlementActive: true,
                                             entitlementProductId: "anyrent_professional_annual"))
        // A new period on the bought product (a renewal, an upgrade Apple applies at once)
        XCTAssertFalse(L.storeKeptCurrentPlan(boughtProductId: "anyrent_merchant_annual", entitlementActive: true,
                                              entitlementProductId: "anyrent_merchant_annual"))
        XCTAssertFalse(L.storeKeptCurrentPlan(boughtProductId: "anyrent_professional_annual", entitlementActive: true,
                                              entitlementProductId: "anyrent_professional_annual"))
        // A Google Play base plan is the same product
        XCTAssertFalse(L.storeKeptCurrentPlan(boughtProductId: "anyrent_merchant_annual", entitlementActive: true,
                                              entitlementProductId: "anyrent_merchant_annual:annual"))
        // Nothing active, or no product known: the usual wait and message
        XCTAssertFalse(L.storeKeptCurrentPlan(boughtProductId: "anyrent_merchant_annual", entitlementActive: false,
                                              entitlementProductId: "anyrent_merchant_semi_annual"))
        XCTAssertFalse(L.storeKeptCurrentPlan(boughtProductId: "anyrent_merchant_annual", entitlementActive: true,
                                              entitlementProductId: nil))
    }

    /// The slow state names the store's plan only after such a purchase; otherwise "Chưa nhận được xác nhận."
    func testSlowStateSaysTheStoreHasAPlanOnlyThen() {
        typealias L = PlanRenewalLogic
        XCTAssertEqual(L.slowMessage(storeKeptPlan: true), "plan.storeHasPlan".localized())
        XCTAssertEqual(L.slowMessage(storeKeptPlan: false), "plan.notConfirmed".localized())
        XCTAssertEqual(sentence("plan.storeHasPlan", "vi-VN"), "Apple ID này đang có gói. Kỳ mới bắt đầu từ lần gia hạn tới.")
        XCTAssertEqual(sentence("plan.storeHasPlan", "en"), "This Apple ID already has a plan. The new period starts at the next renewal.")
        XCTAssertEqual(sentence("plan.notConfirmed", "vi-VN"), "Chưa nhận được xác nhận.")
    }

    /// "Quản lý / huỷ gói" only for a plan the App Store bills (auto-renew on or off); trial, MANUAL, LEMON and Google Play
    /// shops have nothing to manage in Apple's sheet
    func testManageLinkOnlyForAPlanBilledByTheAppStore() {
        typealias L = PlanRenewalLogic
        XCTAssertEqual(L.footerLinks(PlanStatus(status: "ACTIVE", billingChannel: "APP_STORE", autoRenew: true)), .manageAndRestore)
        XCTAssertEqual(L.footerLinks(PlanStatus(status: "ACTIVE", billingChannel: "APP_STORE", autoRenew: false)), .manageAndRestore)
        XCTAssertEqual(L.footerLinks(PlanStatus(status: "EXPIRED", billingChannel: "APP_STORE")), .manageAndRestore)
        for channel in ["MANUAL", "LEMON", "PLAY_STORE", nil] as [String?] {
            XCTAssertEqual(L.footerLinks(PlanStatus(status: "ACTIVE", billingChannel: channel)), .restoreOnly, channel ?? "no channel")
            XCTAssertEqual(L.footerLinks(PlanStatus(status: "EXPIRED", billingChannel: channel)), .restoreOnly, channel ?? "no channel")
        }
        XCTAssertEqual(L.footerLinks(PlanStatus(status: "ACTIVE", dbStatus: "TRIAL", billingChannel: "MANUAL")), .restoreOnly)
    }

    /// At most two small lines: "Quản lý / huỷ gói · Khôi phục" or "Khôi phục giao dịch", then "Điều khoản · Bảo mật"
    func testFooterLabelsAreShort() {
        typealias L = PlanRenewalLogic
        XCTAssertEqual(L.restoreTitle(.manageAndRestore), "plan.restoreShort".localized())
        XCTAssertEqual(L.restoreTitle(.restoreOnly), "plan.restore".localized())
        XCTAssertEqual(sentence("plan.restoreShort", "vi-VN"), "Khôi phục")
        XCTAssertEqual(sentence("plan.restore", "vi-VN"), "Khôi phục giao dịch")
        XCTAssertEqual(sentence("plan.terms", "vi-VN"), "Điều khoản")
        XCTAssertEqual(sentence("plan.privacy", "vi-VN"), "Bảo mật")
        XCTAssertEqual(sentence("plan.restoreShort", "en"), "Restore")
        XCTAssertEqual(sentence("plan.terms", "en"), "Terms")
        XCTAssertEqual(sentence("plan.privacy", "en"), "Privacy")
        XCTAssertEqual(AppLegalLinks.termsURL, "https://www.anyrent.shop/terms")
        XCTAssertEqual(AppLegalLinks.privacyURL, "https://www.anyrent.shop/privacy")
    }
}

