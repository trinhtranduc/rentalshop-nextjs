//
//  FirstRunGuideUITests.swift
//  POS ADBDUITests
//
//  #1393, #1394, #1410: a new empty shop walks the whole guide: product, customer in the cart, order, finish. The main guard against
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

    /// Past the intro pages only: `E2E.start` does more than a new shop needs.
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
        XCTAssertFalse(app.buttons["guide.bubble.skip"].exists, "no bubble before the button is tapped")

        // Bubble 1: product form. A tap on the dim closes it and leaves the form usable.
        app.buttons["guide.cta"].tap()
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
        app.buttons["guide.cta"].tap()
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

    /// #1410: Để sau only collapses: the slim row stays, keeps its place after a relaunch and reopens the card
    func testLaterCollapsesAndTheSlimRowReopensTheCard() throws {
        logInToHome()
        count("0/3")
        e2e.shot("guide-card-01-new")
        XCTAssertFalse(app.buttons["guide.dismiss"].exists, "Bỏ qua left the card")
        XCTAssertFalse(e2e.button(["Skip", "Bỏ qua"]).exists, "Bỏ qua left the card")
        XCTAssertTrue(app.buttons["guide.cta"].isHittable, "the blue button")

        app.buttons["guide.later"].tap()
        let slim = app.buttons["guide.slim"]
        XCTAssertTrue(slim.waitForExistence(timeout: 5), "Để sau leaves the slim row")
        XCTAssertTrue(slim.label.hasSuffix("0/3"), slim.label)
        XCTAssertFalse(app.buttons["guide.cta"].exists)
        e2e.shot("guide-card-02-slim")

        app.terminate()
        app.launch()
        XCTAssertTrue(slim.waitForExistence(timeout: 20), "still collapsed after a relaunch")
        slim.tap()
        count("0/3")
        XCTAssertFalse(slim.exists)
    }

    /// #1410: hiding is only from Cài đặt, with its confirm; the row stays and brings the guide back
    func testHideFromSettingsThenReopen() throws {
        logInToHome()
        count("0/3")
        app.buttons["guide.later"].tap()
        XCTAssertTrue(app.buttons["guide.slim"].waitForExistence(timeout: 5))

        openGuideSheet()
        e2e.shot("guide-hide-01-sheet")
        app.buttons["guide.hide"].tap()
        let hide = e2e.button(["Hide", "Ẩn"])
        XCTAssertTrue(hide.waitForExistence(timeout: 3), "the one-line confirm")
        e2e.shot("guide-hide-02-confirm")
        hide.tap()
        XCTAssertTrue(app.otherElements["guide.sheet"].waitForNonExistence(timeout: 5))

        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        XCTAssertTrue(app.buttons["guide.slim"].waitForNonExistence(timeout: 5), "hidden: no slim row")
        XCTAssertFalse(app.staticTexts["guide.count"].exists, "hidden: no card")
        e2e.shot("guide-hide-03-home")

        openGuideSheet()
        XCTAssertFalse(app.buttons["guide.hide"].exists, "already hidden")
        e2e.shot("guide-hide-04-sheet-hidden")
        app.buttons["guide.cta"].tap()
        XCTAssertTrue(app.textFields["product.form.name"].waitForExistence(timeout: 8), "the button runs the step on Home")
        e2e.element(labelBeginsWith: ["Close", "Đóng"], type: .button).tap()
        count("0/3")
        e2e.shot("guide-hide-05-card-back")
    }

    private func openGuideSheet() {
        e2e.tapTab(["Settings", "Setting", "Cài đặt"], index: 4)
        let settingsRow = app.cells["settings.firstRunGuide"].firstMatch
        for _ in 0..<4 where !(settingsRow.exists && settingsRow.isHittable) { app.swipeUp(); sleep(1) }
        XCTAssertTrue(settingsRow.waitForExistence(timeout: 10), "the Settings row")
        settingsRow.tap()
        XCTAssertTrue(app.staticTexts["guide.count"].waitForExistence(timeout: 5), "the card in a sheet")
    }
}
