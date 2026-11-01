//
//  PromptTimingUITests.swift
//  POS ADBDUITests
//
//  #1413: the notification question stays off onboarding and comes on Home, once. Needs a fresh install, a clean simulator
//  (the answer survives a reinstall only by erasing the device) and a shop from scripts/mobile-e2e/new-empty-shop.sh:
//    TEST_RUNNER_E2E_EMAIL=... TEST_RUNNER_E2E_PASSWORD=... TEST_RUNNER_E2E_ROLE=merchant TEST_RUNNER_E2E_OUT_DIR=... \
//    TEST_RUNNER_E2E_FEATURES=... xcodebuild test -only-testing:"POS ADBDUITests/PromptTimingUITests" ...
//  The rating sheet is Apple's: a run shows when the app asked, and only `hasRequestedAppRating` proves that.
//

import XCTest

final class PromptTimingUITests: XCTestCase {
    private var app: XCUIApplication!
    private var e2e: E2E!
    private let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")

    override func setUpWithError() throws {
        continueAfterFailure = false
        guard !(ProcessInfo.processInfo.environment["E2E_EMAIL"] ?? "").isEmpty else {
            throw XCTSkip("set TEST_RUNNER_E2E_EMAIL to a shop from new-empty-shop.sh")
        }
        app = XCUIApplication()
        e2e = E2E(test: self, app: app)
        try FileManager.default.createDirectory(atPath: e2e.outDir, withIntermediateDirectories: true)
    }

    private var question: XCUIElement {
        springboard.alerts.matching(NSPredicate(format: "label CONTAINS[c] 'Notifications' OR label CONTAINS[c] 'thông báo'")).firstMatch
    }

    private func assertNoQuestion(for seconds: Int, _ place: String) {
        for _ in 0..<seconds {
            XCTAssertFalse(question.exists, "no notification question \(place)")
            sleep(1)
        }
    }

    private var nextPage: XCUIElement { e2e.button(["Next", "Tiếp"]) }

    private func waitForFirstPage() {
        let deadline = Date().addingTimeInterval(40)
        while Date() < deadline, !nextPage.exists {
            XCTAssertFalse(question.exists, "no notification question before the first page")
            sleep(1)
        }
        XCTAssertTrue(nextPage.exists, "onboarding page 1")
    }

    func testTheQuestionWaitsForHomeAndIsAskedOnce() throws {
        app.launch()
        XCTAssertTrue(app.secureTextFields.firstMatch.waitForExistence(timeout: 30), "a fresh install starts at login")
        assertNoQuestion(for: 3, "on the login screen")
        e2e.login(email: e2e.email, password: e2e.password)

        waitForFirstPage()
        assertNoQuestion(for: 6, "on onboarding page 1")
        e2e.shot("ios-01-onboarding-page1-no-prompt")

        // Relaunch, signed in, with onboarding still to do
        app.terminate()
        app.launch()
        waitForFirstPage()
        assertNoQuestion(for: 6, "on page 1 after a relaunch")
        e2e.shot("ios-02-relaunch-onboarding-no-prompt")

        nextPage.tap()
        assertNoQuestion(for: 2, "on page 2")
        e2e.shot("ios-03-onboarding-page2-no-prompt")
        nextPage.tap()
        assertNoQuestion(for: 2, "on page 3")
        e2e.shot("ios-04-onboarding-page3-no-prompt")
        e2e.button(["Get started", "Bắt đầu"]).tap()

        XCTAssertTrue(e2e.tabBar.waitForExistence(timeout: 30), "Home after the last page")
        XCTAssertTrue(question.waitForExistence(timeout: 15), "the question comes on Home")
        e2e.shot("ios-05-home-prompt")
        let allow = question.buttons.matching(NSPredicate(format: "label IN %@", ["Allow", "Cho phép"])).firstMatch
        XCTAssertTrue(allow.exists)
        allow.tap()
        XCTAssertTrue(question.waitForNonExistence(timeout: 5))

        // Answered: back to Home, and a relaunch, ask nothing
        e2e.tapTab(["Settings", "Setting", "Cài đặt"], index: 4)
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        assertNoQuestion(for: 4, "after answering")
        app.terminate()
        app.launch()
        XCTAssertTrue(e2e.tabBar.waitForExistence(timeout: 30))
        assertNoQuestion(for: 6, "on a relaunch after answering")
        e2e.shot("ios-06-relaunch-answered-no-prompt")
    }

    /// One more order from Home, for a run that checks `hasRequestedAppRating` from outside. E2E_ORDER_SHOT names the stills.
    func testOneMoreOrder() throws {
        let name = ProcessInfo.processInfo.environment["E2E_ORDER_SHOT"] ?? ""
        guard !name.isEmpty else { throw XCTSkip("set TEST_RUNNER_E2E_ORDER_SHOT") }
        app.launch()
        XCTAssertTrue(e2e.tabBar.waitForExistence(timeout: 30), "signed in already, from the walk before this")
        XCTAssertTrue(e2e.openCartWithOneItem(), "cart")
        let dates = e2e.element(labelBeginsWith: ["Choose rental dates", "Chọn ngày thuê"])
        if dates.waitForExistence(timeout: 3) {
            dates.tap()
            e2e.pickTodayInDateSheet()
            e2e.tapIfExists(e2e.button(["Confirm", "Xác nhận"]), timeout: 3)
        }
        _ = e2e.pickFirstCustomer()
        XCTAssertTrue(e2e.createOrderFromCart(cta: ["Create order", "Tạo đơn"], shotPrefix: name), "order created")
        sleep(4) // the read of the total, then StoreKit
        e2e.shot("\(name)-after")
        if app.buttons["cart.back"].exists { app.buttons["cart.back"].tap() }
    }
}
