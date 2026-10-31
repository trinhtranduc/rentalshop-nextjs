//
//  FirstRunGuideUITests.swift
//  POS ADBDUITests
//
//  #1393: a new empty shop walks the card: product, customer in the cart, order, finish. The guard against the guide drifting
//  when screens change. Log in with a shop from scripts/mobile-e2e/new-empty-shop.sh:
//    TEST_RUNNER_E2E_EMAIL=... TEST_RUNNER_E2E_PASSWORD=... TEST_RUNNER_E2E_ROLE=merchant TEST_RUNNER_E2E_OUT_DIR=... \
//    TEST_RUNNER_E2E_FEATURES=... xcodebuild test -only-testing:"POS ADBDUITests/FirstRunGuideUITests" ...
//

import XCTest

final class FirstRunGuideUITests: XCTestCase {
    private var app: XCUIApplication!
    private var e2e: E2E!

    override func setUpWithError() throws {
        continueAfterFailure = false
        guard !(ProcessInfo.processInfo.environment["E2E_EMAIL"] ?? "").isEmpty else {
            throw XCTSkip("set TEST_RUNNER_E2E_EMAIL to a shop from new-empty-shop.sh")
        }
        app = XCUIApplication()
        e2e = E2E(test: self, app: app)
        try FileManager.default.createDirectory(atPath: e2e.outDir, withIntermediateDirectories: true)
    }

    /// `E2E.start` taps every "Bỏ qua", which on a new shop would also be the card's. Past the intro pages only.
    private func logInToHome() {
        app.launch()
        if app.secureTextFields.firstMatch.waitForExistence(timeout: 10) {
            e2e.login(email: e2e.email, password: e2e.password)
        }
        let deadline = Date().addingTimeInterval(40)
        while Date() < deadline, !e2e.tabBar.exists {
            e2e.dismissSystemAlert()
            let skip = e2e.button(["Skip", "Bỏ qua"])
            if skip.exists && skip.isHittable { skip.tap() }
            sleep(1)
        }
        XCTAssertTrue(e2e.tabBar.waitForExistence(timeout: 5), "tab bar after login")
        e2e.dismissSystemAlert()
    }

    private func count(_ text: String) {
        let label = app.staticTexts["guide.count"]
        XCTAssertTrue(label.waitForExistence(timeout: 15), "the card shows")
        let shown = NSPredicate(format: "label == %@", text)
        expectation(for: shown, evaluatedWith: label)
        waitForExpectations(timeout: 15)
    }

    private func row(_ name: String) -> XCUIElement {
        let row = app.buttons["guide.row.\(name)"]
        XCTAssertTrue(row.waitForExistence(timeout: 10), "row \(name)")
        return row
    }

    func testWalkTheCardOnAnEmptyShop() throws {
        logInToHome()
        count("0/3")
        e2e.shot("guide-01-home-new-shop")

        // 1. Product: the form opens from the row
        row("product").tap()
        let name = app.textFields["product.form.name"]
        XCTAssertTrue(name.waitForExistence(timeout: 8), "product form")
        e2e.shot("guide-02-product-form")
        name.tap()
        name.typeText("Ao cuoi ren")
        let price = app.textFields["product.form.perRental"]
        XCTAssertTrue(price.waitForExistence(timeout: 3))
        price.tap()
        price.typeText("1200000")
        e2e.shot("guide-03-product-filled")
        let save = e2e.button(["Save product", "Lưu sản phẩm"])
        save.tap()
        if !save.waitForNonExistence(timeout: 2), save.exists { save.tap() } // the first tap may only close the keyboard
        count("1/3")
        e2e.shot("guide-04-home-one-done")

        // 2. Customer, inside the cart: the row puts the product in the cart
        row("customer").tap()
        XCTAssertTrue(app.buttons["cart.more"].waitForExistence(timeout: 8), "the cart opens")
        e2e.shot("guide-05-cart")
        XCTAssertNotNil(e2e.createCustomerInPicker(name: "Lan Anh", phone: E2E.uniquePhone()), "customer made in the cart")
        e2e.shot("guide-06-cart-customer")

        // 3. Order: dates, then Tạo đơn
        let dates = e2e.element(labelBeginsWith: ["Choose rental dates", "Chọn ngày thuê"])
        XCTAssertTrue(dates.waitForExistence(timeout: 5), "dates row")
        dates.tap()
        e2e.pickTodayInDateSheet()
        e2e.tapIfExists(e2e.button(["Confirm", "Xác nhận"]), timeout: 3)
        XCTAssertTrue(e2e.createOrderFromCart(cta: ["Create order", "Tạo đơn"], shotPrefix: "guide-07-order"),
                      "order created (last alert: \(e2e.lastAlert ?? "none"))")
        e2e.goBack()

        // Finish, once
        let finish = app.buttons["guide.finish.close"]
        XCTAssertTrue(finish.waitForExistence(timeout: 20), "the finish card shows")
        e2e.shot("guide-08-finish")
        finish.tap()
        XCTAssertTrue(finish.waitForNonExistence(timeout: 5))
        e2e.shot("guide-09-home-after-finish")
        XCTAssertFalse(app.otherElements["guide.card"].exists)
    }

    func testSkipThenReopenFromSettings() throws {
        logInToHome()
        count("0/3")
        let dismiss = app.buttons["guide.dismiss"]
        XCTAssertTrue(dismiss.waitForExistence(timeout: 5))
        dismiss.tap()
        XCTAssertTrue(app.staticTexts["guide.count"].waitForNonExistence(timeout: 5), "Bỏ qua hides the card")
        e2e.shot("guide-skip-01-home")

        e2e.tapTab(["Setting", "Cài đặt"], index: 4)
        let settingsRow = app.cells["settings.firstRunGuide"]
        for _ in 0..<4 where !(settingsRow.exists && settingsRow.isHittable) { app.swipeUp(); sleep(1) }
        XCTAssertTrue(settingsRow.waitForExistence(timeout: 10), "the Settings row stays after a skip")
        e2e.shot("guide-skip-02-settings")
        settingsRow.tap()
        XCTAssertTrue(app.staticTexts["guide.count"].waitForExistence(timeout: 5), "the card in a sheet")
        e2e.shot("guide-skip-03-sheet")
        row("product").tap()
        XCTAssertTrue(app.textFields["product.form.name"].waitForExistence(timeout: 8), "the row runs the step on Home")
        e2e.shot("guide-skip-04-form")
        XCTAssertTrue(e2e.element(labelBeginsWith: ["Close", "Đóng", "Cancel", "Hủy", "Back", "Quay lại"], type: .button).exists)
        e2e.element(labelBeginsWith: ["Close", "Đóng", "Cancel", "Hủy", "Back", "Quay lại"], type: .button).tap()
        e2e.tapIfExists(e2e.button(["Leave", "Thoát", "Discard", "Bỏ"]), timeout: 2)
        count("0/3")
        e2e.shot("guide-skip-05-card-back")
    }
}
