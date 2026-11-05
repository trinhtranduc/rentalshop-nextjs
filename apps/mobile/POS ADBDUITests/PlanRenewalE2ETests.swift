//
//  PlanRenewalE2ETests.swift
//  POS ADBDUITests
//
//  #1459 The expired gate through the real login screen, on a visible simulator against the local API:
//  - testOwnerGateAfterLogin: an expired owner lands on "Gói của shop đã hết hạn" right after login (no tabs, Đăng xuất);
//  - testStaffExpiredRetries: staff see "Nhờ chủ shop gia hạn."; Thử lại opens Home once the owner paid.
//  Purchases run in the hosted test PlanRenewalHostedE2ETests (SKTestSession needs an XCTest process).
//  scripts/mobile-e2e/plan-renewal-e2e.sh sets the shop's period in the database first.
//  Reads (TEST_RUNNER_ prefix stripped by xcodebuild): E2E_EMAIL, E2E_PASSWORD, E2E_OUT_DIR, E2E_API_URL, E2E_RC_SECRET,
//  E2E_MERCHANT_ID.
//

import XCTest

final class PlanRenewalE2ETests: XCTestCase {
    private var app: XCUIApplication!
    private var e2e: E2E!
    private let env = ProcessInfo.processInfo.environment

    override func setUpWithError() throws {
        continueAfterFailure = true
        app = XCUIApplication()
        e2e = E2E(test: self, app: app)
        XCTAssertFalse(e2e.email.isEmpty, "E2E_EMAIL is not set (run through scripts/mobile-e2e/plan-renewal-e2e.sh)")
        try FileManager.default.createDirectory(atPath: e2e.outDir, withIntermediateDirectories: true)
    }

    func testOwnerGateAfterLogin() throws {
        e2e.startLoose()
        let title = app.staticTexts["plan.expired.title"]
        XCTAssertTrue(title.waitForExistence(timeout: 30), "Expired screen right after login")
        XCTAssertFalse(app.tabBars.firstMatch.exists, "No tabs behind the expired screen")
        XCTAssertTrue(app.buttons["plan.logout"].exists, "Đăng xuất on the expired screen")
        XCTAssertTrue(e2e.rawKeys().isEmpty, "No raw API codes: \(e2e.rawKeys())")
        e2e.shot("plan-41-owner-gate-after-login")
        app.swipeUp()
        sleep(1)
        e2e.shot("plan-42-owner-gate-bottom")
    }

    func testStaffExpiredRetries() throws {
        e2e.startLoose()
        XCTAssertTrue(app.staticTexts["plan.expired.title"].waitForExistence(timeout: 30), "Expired screen for staff")
        XCTAssertTrue(app.staticTexts["plan.message"].exists, "Nhờ chủ shop gia hạn.")
        XCTAssertFalse(app.buttons["plan.buy"].exists, "Staff cannot buy")
        XCTAssertTrue(e2e.rawKeys().isEmpty, "No raw API codes: \(e2e.rawKeys())")
        e2e.shot("plan-31-expired-staff")
        app.buttons["plan.retry"].tap()
        sleep(3)
        XCTAssertTrue(app.staticTexts["plan.expired.title"].exists, "Still expired: stays on the screen")
        // The owner pays on their phone: the store tells the server
        try postWebhook(type: "RENEWAL", productId: "anyrent_merchant_annual", price: 1_799_000, months: 12)
        app.buttons["plan.retry"].tap()
        XCTAssertTrue(app.tabBars.firstMatch.waitForExistence(timeout: 30), "Thử lại opens Home once the period runs again")
        sleep(2)
        e2e.shot("plan-32-staff-home")
    }

    /// The RevenueCat webhook the server would get from the store, sent to the local API
    private func postWebhook(type: String, productId: String, price: Int, months: Int) throws {
        guard let base = env["E2E_API_URL"], let url = URL(string: base + "/api/webhooks/revenuecat") else {
            throw XCTSkip("E2E_API_URL is not set")
        }
        let merchantId = env["E2E_MERCHANT_ID"] ?? "1"
        let now = Date()
        let end = Calendar(identifier: .gregorian).date(byAdding: .month, value: months, to: now)!
        let event: [String: Any] = [
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
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(env["E2E_RC_SECRET"] ?? "")", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["api_version": "1.0", "event": event])
        let done = expectation(description: "webhook \(type)")
        var status = 0
        var body = ""
        URLSession.shared.dataTask(with: request) { data, response, _ in
            status = (response as? HTTPURLResponse)?.statusCode ?? 0
            body = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
            done.fulfill()
        }.resume()
        wait(for: [done], timeout: 20)
        print("E2E_NOTE: webhook \(type) \(productId) → \(status) \(body)")
        XCTAssertEqual(status, 200, "webhook \(type): \(body)")
    }
}
