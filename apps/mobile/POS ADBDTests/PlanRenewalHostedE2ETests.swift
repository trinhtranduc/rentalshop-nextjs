//
//  PlanRenewalHostedE2ETests.swift
//  POS ADBDTests
//
//  #1459 Gia hạn gói end to end, hosted in the app on a visible simulator against the local API.
//  SKTestSession only works inside an XCTest process, so this test runs in the app (the unit-test host), opens the
//  session from AnyRentSubscriptions.storekit (storefront VNM, no dialogs), turns on `E2EStoreKit` and drives the real
//  screens (Home → Gói dịch vụ, the expired gate). The RevenueCat webhook is simulated: the test posts it to the local
//  API with the webhook secret, as RevenueCat would after the store charged.
//
//  Steps, in order (one run; scripts/mobile-e2e/plan-renewal-e2e.sh sets merchant1 to Basic with 5 days left first):
//  1. the owner renews Basic 12 months from the Home line → banner → auto-renewing state;
//  2. the store refunds it (period ends now); after a new login the gate opens; the owner buys Professional 12 months → Home;
//  3. refunded again; the next call answers 403 SUBSCRIPTION_PERIOD_ENDED → the gate; Khôi phục giao dịch → Home.
//  Skipped unless E2E_API_URL, E2E_EMAIL, E2E_STOREKIT_PATH are set (normal unit-test runs skip it).
//

import StoreKitTest
import XCTest
@testable import POS_ADBD

final class PlanRenewalHostedE2ETests: XCTestCase {
    private static var session: SKTestSession?
    private let env = ProcessInfo.processInfo.environment

    override func setUpWithError() throws {
        guard let api = env["E2E_API_URL"], !api.isEmpty, let path = env["E2E_STOREKIT_PATH"], !path.isEmpty,
              !(env["E2E_EMAIL"] ?? "").isEmpty else {
            throw XCTSkip("plan renewal e2e: run through scripts/mobile-e2e/plan-renewal-e2e.sh")
        }
        continueAfterFailure = false
        if Self.session == nil {
            let session = try SKTestSession(contentsOf: URL(fileURLWithPath: path))
            session.storefront = "VNM"
            session.disableDialogs = true
            session.clearTransactions()
            Self.session = session
        }
        E2EStoreKit.isActive = true
        try FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
    }

    /// Leave the app signed out and on RevenueCat again: other unit tests read the signed-in shop (its currency)
    override class func tearDown() {
        if session != nil {
            E2EStoreKit.isActive = false
            appDelegate.logout()
            RunLoop.main.run(until: Date().addingTimeInterval(2))
        }
        super.tearDown()
    }

    private var outDir: String { env["E2E_OUT_DIR"] ?? NSTemporaryDirectory() }
    private var window: UIWindow { appDelegate.window! }

    // MARK: - Steps

    func test1OwnerRenews12MonthsFromHome() throws {
        signIn()
        let line: UIButton = try waitForView("home.planLine", 30) { !$0.isHidden && $0.window != nil }
        shot("plan-01-home-line")
        line.sendActions(for: .touchUpInside)
        _ = try waitForView("plan.buy", 30) as UIButton
        spin(0.8) // the push animation
        XCTAssertNotNil(view("plan.row.basic") as ChoiceRow?, "Basic row")
        XCTAssertNotNil(view("plan.row.professional") as ChoiceRow?, "Professional row (upgrade)")
        shot("plan-02-owner-active")
        tap("plan.period.12")
        let buy: UIButton = try waitForView("plan.buy", 10)
        XCTAssertTrue(buy.title(for: .normal)?.contains("12") == true, "Button names the period: \(buy.title(for: .normal) ?? "")")
        // A13: 5 days left: the new period continues from the old end; the store charges today + 12 months
        let chargeDay = PlanRenewalLogic.day(PlanRenewalLogic.newPeriodEnd(now: Date(), months: 12))
        let disclosure = (view("plan.disclosure") as UILabel?)?.text ?? ""
        XCTAssertTrue(disclosure.contains(chargeDay), "Disclosure names the charge day \(chargeDay): \(disclosure)")
        XCTAssertTrue(disclosure.hasPrefix(String("plan.disclosureCarry".localized().prefix(12))), "Continues from the old end: \(disclosure)")
        shot("plan-03-twelve-months")
        try buyAndConfirm(type: "RENEWAL", productId: "anyrent_merchant_annual", price: 1_799_000, months: 12, shot: "plan-04")
        _ = try waitForView("plan.banner.text", 30) as UILabel
        shot("plan-05-renewed-banner")
        let autoRenew: UILabel = try waitForView("plan.autoRenew", 20)
        // A13: "Tự gia hạn ngày <today + 12 months>" while "Dùng đến" is 5 days later
        XCTAssertTrue(autoRenew.text?.contains(chargeDay) == true, "Auto-renew row: \(autoRenew.text ?? "")")
        let statusLine = (view("plan.status") as UILabel?)?.text ?? ""
        XCTAssertFalse(statusLine.contains(chargeDay), "Dùng đến keeps the 5 days: \(statusLine)")
        // A5: renewing on this phone's store, the same plan is never offered again; the upgrade may be
        if let buy = view("plan.buy") as UIButton? {
            let title = buy.title(for: .normal) ?? ""
            XCTAssertTrue(title.contains("Professional"), "Only the upgrade while auto-renewing: \(title)")
        }
        spin(4.5) // the banner goes away by itself
        shot("plan-06-auto-renewing")
    }

    /// Runs from the expired state (runner step owner-buy-restore). A13: a refund of test 1's renewal would give the 5 days back
    func test2ExpiredOwnerBuysProfessionalAfterLogin() throws {
        signIn()
        let title: UILabel = try waitForView("plan.expired.title", 30)
        XCTAssertNotNil(title)
        XCTAssertFalse(window.rootViewController is TabbarViewController, "No tabs behind the expired screen")
        XCTAssertNotNil(view("plan.logout") as UIButton?, "Đăng xuất on the expired screen")
        _ = try waitForView("plan.buy", 20) as UIButton
        shot("plan-11-expired-owner")
        tap("plan.row.professional")
        tap("plan.period.12")
        shot("plan-12-professional-12")
        try buyAndConfirm(type: "INITIAL_PURCHASE", productId: "anyrent_professional_annual", price: 2_399_000, months: 12, shot: "plan-13")
        try waitFor(30, "Home after the payment") { self.window.rootViewController is TabbarViewController }
        _ = try waitForView("plan.banner.text", 10) as UILabel
        spin(1)
        shot("plan-14-home-renewed")
    }

    /// Refund of test 2's Professional purchase (bought with nothing left): access ends now (same run as test 2)
    func test3ExpiredOwnerRestores() throws {
        signIn() // the Professional shop of test 2 opens Home
        try postWebhook(type: "CANCELLATION", productId: "anyrent_professional_annual", price: 2_399_000, months: 12, extra: ["cancel_reason": "CUSTOMER_SUPPORT"])
        // Any call the expired shop makes now answers 403 SUBSCRIPTION_PERIOD_ENDED: one gate, no alert per screen
        TabsV2APIService.shared.request("/api/products", parameters: ["limit": 1, "page": 1]) { (_: SettingsListTotal?, _: NSError?) in }
        _ = try waitForView("plan.expired.title", 30) as UILabel
        let restore: UIButton = try waitForView("plan.restore", 20)
        shot("plan-21-expired-on-403")
        restore.sendActions(for: .touchUpInside)
        try waitForConfirming(shot: "plan-22-restore-confirming")
        try postWebhook(type: "RENEWAL", productId: "anyrent_professional_annual", price: 2_399_000, months: 12)
        try waitFor(30, "Home after the restore") { self.window.rootViewController is TabbarViewController }
        spin(1)
        shot("plan-23-home-after-restore")
    }

    // MARK: - App driving

    /// Same path as the login screen: AuthenticationService.login, then route(after: .loggedIn)
    private func signIn() {
        appDelegate.logout()
        spin(1.5)
        var done = false
        AuthenticationService.shared.login(emailUser: env["E2E_EMAIL"] ?? "", passwordUser: env["E2E_PASSWORD"] ?? "") { user, error in
            XCTAssertNil(error, "login: \(error?.localizedDescription ?? "")")
            if user != nil {
                PurchasesManager.syncFromCurrentUser()
                appDelegate.route(after: .loggedIn)
            }
            done = true
        }
        try? waitFor(30, "login") { done }
        spin(2)
        dismissPresented()
    }

    /// The first-run prompts on Home (notifications, guide sheets) would cover the screenshots
    private func dismissPresented() {
        if let presented = window.rootViewController?.presentedViewController {
            presented.dismiss(animated: false)
            spin(0.5)
        }
    }

    private func tap(_ id: String) {
        guard let control = view(id) as UIControl? else { return XCTFail("\(id) on screen") }
        control.sendActions(for: .touchUpInside)
        spin(0.6)
    }

    private func buyAndConfirm(type: String, productId: String, price: Int, months: Int, shot name: String) throws {
        let buy: UIButton = try waitForView("plan.buy", 10)
        buy.sendActions(for: .touchUpInside)
        try waitForConfirming(shot: "\(name)-confirming")
        try postWebhook(type: type, productId: productId, price: price, months: months)
    }

    /// StoreKit approved (no dialog): the button says "Đang xác nhận thanh toán…" while the app polls the server
    private func waitForConfirming(shot name: String) throws {
        try waitFor(30, "Đang xác nhận thanh toán…") {
            let title = (self.view("plan.buy") as UIButton?)?.title(for: .normal) ?? ""
            return title == "plan.confirming".localized()
        }
        shot(name)
    }

    // MARK: - Webhook (what RevenueCat sends after the store charged)

    private func postWebhook(type: String, productId: String, price: Int, months: Int, extra: [String: Any] = [:]) throws {
        let url = URL(string: (env["E2E_API_URL"] ?? "") + "/api/webhooks/revenuecat")!
        let merchantId = env["E2E_MERCHANT_ID"] ?? "1"
        let now = Date()
        let end = Calendar(identifier: .gregorian).date(byAdding: .month, value: months, to: now)!
        var event: [String: Any] = [
            "id": UUID().uuidString,
            "type": type,
            "app_user_id": "merchant_\(merchantId)",
            "product_id": productId,
            "store": "APP_STORE",
            "environment": "PRODUCTION",
            "purchased_at_ms": Int(now.timeIntervalSince1970 * 1000),
            "expiration_at_ms": Int(end.timeIntervalSince1970 * 1000),
            "event_timestamp_ms": Int(now.timeIntervalSince1970 * 1000),
            "price_in_purchased_currency": price,
            "currency": "VND",
            "transaction_id": "e2e-\(UUID().uuidString.prefix(8))",
            "original_transaction_id": "e2e-original-\(merchantId)",
        ]
        extra.forEach { event[$0.key] = $0.value }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(env["E2E_RC_SECRET"] ?? "")", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["api_version": "1.0", "event": event])
        var status = 0
        var body = ""
        var finished = false
        URLSession.shared.dataTask(with: request) { data, response, _ in
            status = (response as? HTTPURLResponse)?.statusCode ?? 0
            body = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
            finished = true
        }.resume()
        try waitFor(20, "webhook \(type)") { finished }
        print("E2E_NOTE: webhook \(type) \(productId) → \(status) \(body)")
        XCTAssertEqual(status, 200, "webhook \(type): \(body)")
    }

    // MARK: - Views, waiting, screenshots

    private func view<T: UIView>(_ id: String) -> T? {
        func search(_ root: UIView) -> T? {
            if root.accessibilityIdentifier == id, let match = root as? T, !root.isHidden { return match }
            for child in root.subviews { if let found = search(child) { return found } }
            return nil
        }
        return search(window)
    }

    private func waitForView<T: UIView>(_ id: String, _ timeout: TimeInterval, _ ready: @escaping (T) -> Bool = { _ in true }) throws -> T {
        var found: T?
        try waitFor(timeout, id) {
            if let match: T = self.view(id), ready(match) { found = match }
            return found != nil
        }
        return found!
    }

    private func waitFor(_ timeout: TimeInterval, _ what: String, _ condition: @escaping () -> Bool) throws {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if condition() { return }
            RunLoop.main.run(until: Date().addingTimeInterval(0.25))
        }
        shot("timeout-\(what.replacingOccurrences(of: " ", with: "-").prefix(40))")
        XCTFail("timed out: \(what)")
        throw XCTSkip("stopped: \(what)")
    }

    private func spin(_ seconds: TimeInterval) {
        RunLoop.main.run(until: Date().addingTimeInterval(seconds))
    }

    private func shot(_ name: String) {
        let renderer = UIGraphicsImageRenderer(bounds: window.bounds)
        let image = renderer.image { _ in _ = window.drawHierarchy(in: window.bounds, afterScreenUpdates: true) }
        let file = (outDir as NSString).appendingPathComponent("\(name).png")
        try? image.pngData()?.write(to: URL(fileURLWithPath: file))
        let attachment = XCTAttachment(image: image)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
