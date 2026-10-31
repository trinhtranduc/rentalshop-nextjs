//
//  FirstRunGuideUITests.swift
//  POS ADBDUITests
//
//  #1393, #1394: a new empty shop walks the whole guide: product, customer in the cart, order, finish. The main guard against
//  bubbles drifting when screens change. Log in with a shop from scripts/mobile-e2e/new-empty-shop.sh:
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

    private func bubble(_ name: String) -> XCUIElement {
        let text = app.staticTexts["guide.bubble.\(name)"]
        XCTAssertTrue(text.waitForExistence(timeout: 10), "bubble \(name)")
        return text
    }

    /// #1394: the whole guide with its 6 bubbles, in the order of the mockup. A bubble that drifts or goes missing fails here.
    func testWalkTheWholeGuideOnAnEmptyShop() throws {
        logInToHome()
        count("0/3")
        e2e.shot("guide-01-home-new-shop")
        XCTAssertFalse(app.buttons["guide.bubble.skip"].exists, "no bubble before a row is tapped")

        // Bubble 1: product form. A tap on the dim closes it and leaves the form usable.
        row("product").tap()
        let first = bubble("productName")
        e2e.shot("guide-02-bubble-product")
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.72)).tap()
        XCTAssertTrue(first.waitForNonExistence(timeout: 3), "a tap on the dim closes the bubble")
        let name = app.textFields["product.form.name"]
        XCTAssertTrue(name.exists, "the form stays")
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

        // Bubble 2: the row puts the product in the cart and lights the customer row
        row("customer").tap()
        XCTAssertTrue(app.buttons["cart.more"].waitForExistence(timeout: 8), "the cart opens")
        _ = bubble("cartCustomer")
        e2e.shot("guide-05-bubble-cart-customer")
        let customerRow = app.buttons["cart.customerRow"]
        XCTAssertTrue(customerRow.isHittable, "the lit control takes the tap")
        customerRow.tap()

        // Bubble 3: the picker
        _ = bubble("pickerNew")
        e2e.shot("guide-06-bubble-picker")
        app.cells["customers.picker.new"].tap()

        // Bubble 4: the new customer form, with the keyboard up by itself
        let fields = bubble("newCustomerFields")
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5), "the form opens the keyboard")
        e2e.shot("guide-07-bubble-new-customer")
        XCTAssertLessThan(fields.frame.maxY, app.keyboards.firstMatch.frame.minY, "the bubble sits above the keyboard")
        XCTAssertTrue(e2e.type(into: ["Phone number", "Số điện thoại"], text: E2E.uniquePhone()), "phone field")
        XCTAssertTrue(fields.waitForNonExistence(timeout: 3), "typing closes the bubble")
        XCTAssertTrue(e2e.type(into: ["Full name", "Họ và tên"], text: "Lan Anh"), "name field")
        e2e.shot("guide-08-new-customer-filled")
        e2e.button(["Save and select", "Lưu và chọn"]).tap()

        // Bubble 5: back in the cart with the customer, the dates are lit
        _ = bubble("cartDates")
        e2e.shot("guide-09-bubble-dates")
        e2e.element(labelBeginsWith: ["Choose rental dates", "Chọn ngày thuê"]).tap()
        e2e.pickTodayInDateSheet()
        e2e.tapIfExists(e2e.button(["Confirm", "Xác nhận"]), timeout: 3)

        // Bubble 6: all set
        _ = bubble("cartCreate")
        e2e.shot("guide-10-bubble-create")
        XCTAssertTrue(e2e.createOrderFromCart(cta: ["Create order", "Tạo đơn"], shotPrefix: "guide-11-order"),
                      "order created (last alert: \(e2e.lastAlert ?? "none"))")
        // "Tạo đơn mới" already closes the cart. Not `E2E.goBack`: on Home its edge drag can land on a product row and open it.
        if app.buttons["cart.back"].waitForExistence(timeout: 2) { app.buttons["cart.back"].tap() }

        // Finish, once
        let finish = app.buttons["guide.finish.close"]
        XCTAssertTrue(finish.waitForExistence(timeout: 20), "the finish card shows")
        e2e.dismissRatingPrompt() // the app's rating prompt can follow the first order
        e2e.shot("guide-12-finish")
        finish.tap()
        XCTAssertTrue(finish.waitForNonExistence(timeout: 5))
        e2e.shot("guide-13-home-after-finish")
        XCTAssertFalse(app.staticTexts["guide.count"].exists)
    }

    /// #1394: Bỏ qua in a bubble ends the guide and the screen stays usable
    func testSkipFromABubble() throws {
        logInToHome()
        count("0/3")
        row("product").tap()
        _ = bubble("productName")
        app.buttons["guide.bubble.skip"].tap()
        XCTAssertTrue(app.buttons["guide.bubble.skip"].waitForNonExistence(timeout: 3))
        let name = app.textFields["product.form.name"]
        XCTAssertTrue(name.exists, "the form stays usable")
        name.tap()
        name.typeText("Vest")
        e2e.shot("guide-skip-bubble-form")
        e2e.element(labelBeginsWith: ["Close", "Đóng"], type: .button).tap()
        e2e.tapIfExists(e2e.button(["Leave", "Thoát", "Discard", "Bỏ", "Yes", "Có"]), timeout: 2)
        XCTAssertTrue(app.staticTexts["guide.count"].waitForNonExistence(timeout: 5), "the card is hidden")
        e2e.shot("guide-skip-bubble-home")
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
