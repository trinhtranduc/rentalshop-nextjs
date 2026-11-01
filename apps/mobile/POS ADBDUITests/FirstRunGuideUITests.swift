//
//  FirstRunGuideUITests.swift
//  POS ADBDUITests
//
//  #1393, #1394, #1410, #1411: a new empty shop walks the whole guide: product, customer in the cart, order, finish. The main guard against
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

    private func next() -> XCUIElement {
        let next = app.buttons["guide.bubble.next"]
        XCTAssertTrue(next.waitForExistence(timeout: 10), "Tiếp")
        return next
    }

    /// Waits for Tiếp to go solid
    private func nextGoesSolid() {
        expectation(for: NSPredicate(format: "value == %@", "on"), evaluatedWith: next())
        waitForExpectations(timeout: 10)
    }

    private func counter(_ text: String) {
        let label = app.staticTexts["guide.bubble.counter"]
        XCTAssertTrue(label.waitForExistence(timeout: 10), "the counter")
        expectation(for: NSPredicate(format: "label == %@", text), evaluatedWith: label)
        waitForExpectations(timeout: 10)
    }

    /// Fill the photo bubble from the Simulator library, seeded with `simctl addmedia` before the run.
    private func pickSeededPhoto() {
        let addPhoto = e2e.element(labelBeginsWith: ["Add photo", "Thêm ảnh"], type: .button)
        XCTAssertTrue(addPhoto.waitForExistence(timeout: 5), "the add-photo tile")
        addPhoto.tap()
        let library = e2e.button(["Photo Library", "Thư viện ảnh"])
        XCTAssertTrue(library.waitForExistence(timeout: 5), "the source sheet")
        e2e.shot("guide-02b-source-sheet")
        library.tap()
        // The picker runs out of process and its cells have no stable name, so tap a place that is always a photo, with or without
        // the system's privacy banner above the grid. The library has more than one photo on a Simulator. Slow machine: tap again.
        sleep(4)
        e2e.shot("guide-02c-picker")
        let photo = app.coordinate(withNormalizedOffset: CGVector(dx: 0.16, dy: 0.6))
        // The bubble is hidden while the picker covers it: it is back once the picker has left
        let bubbleBack = app.buttons["guide.bubble.next"]
        for _ in 0..<3 where !bubbleBack.exists {
            photo.tap()
            _ = bubbleBack.waitForExistence(timeout: 6)
        }
    }

    /// #1411: the whole guide with its 9 bubbles, filling every required field. A bubble that drifts or goes missing fails here.
    func testWalkTheWholeGuideOnAnEmptyShop() throws {
        logInToHome()
        count("0/3")
        e2e.shot("guide-01-home-new-shop")
        XCTAssertFalse(app.buttons["guide.bubble.next"].exists, "no bubble before the button is tapped")

        // 1 photo: Tiếp is off, and neither Tiếp nor a tap on the dim moves on or closes anything
        app.buttons["guide.cta"].tap()
        _ = bubble("productPhoto")
        counter("1/9")
        XCTAssertEqual(next().value as? String, "off")
        e2e.shot("guide-02-photo-empty")
        next().tap()
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.72)).tap()
        XCTAssertTrue(app.staticTexts["guide.bubble.productPhoto"].exists, "a tap on the dim only flashes the ring")
        pickSeededPhoto()
        nextGoesSolid()
        e2e.shot("guide-03-photo-picked")
        next().tap()

        // 2 name: the keyboard opens, the bubble stays above it, Tiếp follows the typing
        _ = bubble("productName")
        counter("2/9")
        XCTAssertEqual(next().value as? String, "off")
        let name = app.textFields["product.form.name"]
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5), "the cursor moved here")
        XCTAssertLessThan(next().frame.maxY, app.keyboards.firstMatch.frame.minY, "the bubble sits above the keyboard")
        name.typeText("Ao cuoi ren")
        nextGoesSolid()
        e2e.shot("guide-04-name")
        next().tap()

        // 3 price
        _ = bubble("productPrice")
        counter("3/9")
        XCTAssertEqual(next().value as? String, "off")
        let price = app.textFields["product.form.perRental"]
        XCTAssertTrue(price.isHittable, "the form scrolled to the price")
        XCTAssertLessThan(next().frame.maxY, app.keyboards.firstMatch.frame.minY, "the bubble sits above the keyboard")
        price.typeText("0")
        XCTAssertEqual(next().value as? String, "off", "0đ is not a price in the guide")
        price.typeText("1200000")
        nextGoesSolid()
        e2e.shot("guide-05-price")
        next().tap()

        // 4 save: Tiếp never acts for the user
        _ = bubble("productSave")
        counter("4/9")
        e2e.shot("guide-06-save")
        next().tap()
        XCTAssertTrue(app.staticTexts["guide.bubble.productSave"].exists, "Tiếp does not save")
        app.buttons["product.form.save"].tap()
        count("1/3")
        e2e.shot("guide-07-home-one-done")

        // 5 customer row
        app.buttons["guide.cta"].tap()
        XCTAssertTrue(app.buttons["cart.more"].waitForExistence(timeout: 8), "the cart opens")
        _ = bubble("cartCustomer")
        counter("5/9")
        e2e.shot("guide-08-cart-customer")
        let customerRow = app.buttons["cart.customerRow"]
        XCTAssertTrue(customerRow.isHittable, "the lit control takes the tap")
        customerRow.tap()

        // 6 on the picker
        _ = bubble("newCustomer")
        counter("6/9")
        e2e.shot("guide-09-picker")
        app.cells["customers.picker.new"].tap()

        // 6 on the form: the form's own rule, nothing more
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5), "the form opens the keyboard")
        let phone = app.textFields["Phone number"].exists ? app.textFields["Phone number"] : app.textFields["Số điện thoại"]
        XCTAssertTrue(phone.waitForExistence(timeout: 5))
        counter("6/9")
        XCTAssertEqual(next().value as? String, "off")
        e2e.shot("guide-10-new-customer-empty")
        XCTAssertLessThan(next().frame.maxY, app.keyboards.firstMatch.frame.minY, "the bubble sits above the keyboard")
        XCTAssertTrue(e2e.type(into: ["Phone number", "Số điện thoại"], text: E2E.uniquePhone()), "phone field")
        XCTAssertEqual(next().value as? String, "off", "the name is still missing")
        XCTAssertTrue(e2e.type(into: ["Full name", "Họ và tên"], text: "Lan Anh"), "name field")
        nextGoesSolid()
        e2e.shot("guide-11-new-customer-filled")
        next().tap()

        // 7 save and select
        _ = bubble("newCustomerSave")
        counter("7/9")
        e2e.shot("guide-12-save-and-select")
        app.buttons["customers.new.save"].tap()

        // 8 dates
        _ = bubble("cartDates")
        counter("8/9")
        e2e.shot("guide-13-dates")
        app.buttons["cart.datesRow"].exists ? app.buttons["cart.datesRow"].tap() : e2e.element(labelBeginsWith: ["Choose rental dates", "Chọn ngày thuê"]).tap()
        XCTAssertFalse(app.staticTexts["guide.bubble.cartDates"].isHittable, "no bubble over the calendar")
        e2e.pickTodayInDateSheet()
        e2e.tapIfExists(e2e.button(["Confirm", "Xác nhận"]), timeout: 3)

        // 9 create, then the real confirm sheet with no bubble
        _ = bubble("cartCreate")
        counter("9/9")
        e2e.shot("guide-14-create")
        XCTAssertTrue(e2e.createOrderFromCart(cta: ["Create order", "Tạo đơn"], shotPrefix: "guide-15-order"),
                      "order created (last alert: \(e2e.lastAlert ?? "none"))")
        XCTAssertFalse(app.buttons["guide.bubble.next"].exists, "the walk ended with the order")
        // "Tạo đơn mới" already closes the cart. Not `E2E.goBack`: on Home its edge drag can land on a product row and open it.
        if app.buttons["cart.back"].waitForExistence(timeout: 2) { app.buttons["cart.back"].tap() }

        // Finish, once
        let finish = app.buttons["guide.finish.close"]
        XCTAssertTrue(finish.waitForExistence(timeout: 20), "the finish card shows")
        e2e.dismissRatingPrompt() // the app's rating prompt can follow the first order
        e2e.shot("guide-16-finish")
        finish.tap()
        XCTAssertTrue(finish.waitForNonExistence(timeout: 5))
        e2e.shot("guide-17-home-after-finish")
        XCTAssertFalse(app.staticTexts["guide.count"].exists)
    }

    /// #1411: Thoát hướng dẫn returns to the card and never ends the guide; with content it asks first, and Hủy stays
    func testExitAsksWhenSomethingIsTypedAndReturnsToTheCard() throws {
        logInToHome()
        count("0/3")
        app.buttons["guide.cta"].tap()
        _ = bubble("productPhoto")
        app.buttons["guide.bubble.exit"].tap()
        count("0/3")
        e2e.shot("guide-exit-01-card-no-question")

        app.buttons["guide.cta"].tap()
        _ = bubble("productPhoto")
        pickSeededPhoto()
        nextGoesSolid()
        next().tap()
        _ = bubble("productName")
        app.buttons["guide.bubble.exit"].tap()
        let discard = e2e.button(["Discard", "Bỏ"])
        XCTAssertTrue(discard.waitForExistence(timeout: 3), "a form with content asks")
        e2e.shot("guide-exit-02-discard")
        e2e.button(["Cancel", "Hủy"]).tap()
        XCTAssertTrue(app.staticTexts["guide.bubble.productName"].waitForExistence(timeout: 3), "Hủy stays, the bubble is still there")
        app.buttons["guide.bubble.exit"].tap()
        XCTAssertTrue(discard.waitForExistence(timeout: 3))
        discard.tap()
        count("0/3")
        e2e.shot("guide-exit-03-card")

        // Opening again starts the form over: a form has no draft
        app.buttons["guide.cta"].tap()
        _ = bubble("productPhoto")
        counter("1/9")
    }

    /// #1411: leaving a screen and coming back: nothing blocks it, the cart resumes from its data, a form starts over
    func testBackGestureAndResume() throws {
        logInToHome()
        count("0/3")
        addProductWithTheNormalForm()
        count("1/3")
        app.buttons["guide.cta"].tap()
        _ = bubble("cartCustomer")
        counter("5/9")
        app.buttons["cart.customerRow"].tap()
        _ = bubble("newCustomer")
        app.cells["customers.picker.new"].tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(e2e.type(into: ["Phone number", "Số điện thoại"], text: "0912"), "phone field")
        e2e.shot("guide-back-01-form")

        // Thoát with something typed asks, and from inside the sheet goes all the way to the card. The cart keeps its line.
        app.buttons["guide.bubble.exit"].tap()
        let discard = e2e.button(["Discard", "Bỏ"])
        XCTAssertTrue(discard.waitForExistence(timeout: 3), "a form with content asks")
        discard.tap()
        count("1/3")
        XCTAssertFalse(app.buttons["guide.bubble.next"].exists)
        e2e.shot("guide-back-02-card")

        // The cart resumes from its data
        app.buttons["guide.cta"].tap()
        _ = bubble("cartCustomer")
        counter("5/9")
        app.buttons["cart.customerRow"].tap()
        _ = bubble("newCustomer")
        e2e.shot("guide-back-03-picker")

        // Pull the picker's sheet down: nothing blocks it, and the cart's bubble is there again
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.08))
            .press(forDuration: 0.1, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.95)))
        _ = bubble("cartCustomer")
        counter("5/9")
        e2e.shot("guide-back-04-cart-again")

        // The form starts over: it has no draft
        app.buttons["cart.customerRow"].tap()
        _ = bubble("newCustomer")
        app.cells["customers.picker.new"].tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        counter("6/9")
        XCTAssertEqual(next().value as? String, "off", "nothing kept")
    }

    /// #1411: the phone belongs to a customer that arrived after the run started (needs TEST_RUNNER_E2E_DUP_PHONE and a helper that adds it
    /// when the shot guide-dup-00-ready appears). The real box shows, the bubble leaves, "Chọn khách này" goes on to the dates.
    func testDuplicatePhone() throws {
        let phone = ProcessInfo.processInfo.environment["E2E_DUP_PHONE"] ?? ""
        try XCTSkipIf(phone.isEmpty, "set TEST_RUNNER_E2E_DUP_PHONE")
        logInToHome()
        count("0/3")
        addProductWithTheNormalForm()
        count("1/3")
        app.buttons["guide.cta"].tap()
        _ = bubble("cartCustomer")
        app.buttons["cart.customerRow"].tap()
        _ = bubble("newCustomer")
        e2e.shot("guide-dup-00-ready")
        sleep(8) // the helper adds the customer now
        app.cells["customers.picker.new"].tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(e2e.type(into: ["Phone number", "Số điện thoại"], text: phone), "phone field")
        XCTAssertTrue(e2e.type(into: ["Full name", "Họ và tên"], text: "Lan Anh"), "name field")
        nextGoesSolid()
        next().tap()
        _ = bubble("newCustomerSave")
        app.buttons["customers.new.save"].tap()
        let use = e2e.button(["Choose this customer", "Use this customer", "Select this customer", "Chọn khách này"])
        XCTAssertTrue(use.waitForExistence(timeout: 15), "the form's own box")
        XCTAssertFalse(app.buttons["guide.bubble.next"].exists, "the bubble does not cover it")
        e2e.shot("guide-dup-01-box")
        use.tap()
        _ = bubble("cartDates")
        counter("8/9")
        e2e.shot("guide-dup-02-dates")
    }

    /// #1411: a shop that has customers: 7 bubbles, 6 and 7 go, the customer comes from the list. Needs E2E_WITH_CUSTOMER=1 on new-empty-shop.sh.
    func testShopWithCustomersWalksSeven() throws {
        logInToHome()
        count("1/3") // the customer row is ticked from the data
        app.buttons["guide.cta"].tap()
        _ = bubble("productPhoto")
        counter("1/7")
        e2e.shot("guide-customers-01-counter")
        app.buttons["guide.bubble.exit"].tap()
        count("1/3")
        addProductWithTheNormalForm()
        count("2/3")

        app.buttons["guide.cta"].tap()
        _ = bubble("cartCustomer")
        counter("5/7")
        e2e.shot("guide-customers-02-cart")
        app.buttons["cart.customerRow"].tap()
        sleep(2)
        XCTAssertFalse(app.buttons["guide.bubble.next"].exists, "no bubble on the list")
        e2e.shot("guide-customers-03-picker")
        XCTAssertNotNil(e2e.pickVisibleCustomer())
        _ = bubble("cartDates")
        counter("6/7")
        e2e.shot("guide-customers-04-dates")
        e2e.element(labelBeginsWith: ["Choose rental dates", "Chọn ngày thuê"]).tap()
        e2e.pickTodayInDateSheet()
        e2e.tapIfExists(e2e.button(["Confirm", "Xác nhận"]), timeout: 3)
        _ = bubble("cartCreate")
        counter("7/7")
        e2e.shot("guide-customers-05-create")
    }

    /// #1411: a sale order: 8 bubbles, the dates go
    func testSaleOrderHasNoDatesBubble() throws {
        logInToHome()
        count("0/3")
        addProductWithTheNormalForm()
        count("1/3")
        // Into the cart by its own button, to make it a sale, then back: the cart keeps it
        app.buttons["Cart"].exists ? app.buttons["Cart"].tap() : e2e.button(["Giỏ hàng", "Giỏ"]).firstMatch.tap()
        if !e2e.button(["Sale", "Bán"]).waitForExistence(timeout: 5) {
            // an empty cart has no switch: add the product first
            app.buttons["cart.back"].tap()
            app.buttons["guide.cta"].tap()
            _ = bubble("cartCustomer")
            app.buttons["guide.bubble.exit"].tap()
            count("1/3")
            app.buttons["Cart"].exists ? app.buttons["Cart"].tap() : e2e.button(["Giỏ hàng", "Giỏ"]).firstMatch.tap()
        }
        e2e.button(["Sale", "Bán"]).tap()
        sleep(1)
        app.buttons["cart.back"].tap()
        app.buttons["guide.cta"].tap()
        _ = bubble("cartCustomer")
        counter("5/8")
        e2e.shot("guide-sale-01-cart")
        app.buttons["cart.customerRow"].tap()
        _ = bubble("newCustomer")
        counter("6/8")
        app.cells["customers.picker.new"].tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(e2e.type(into: ["Phone number", "Số điện thoại"], text: E2E.uniquePhone()), "phone field")
        XCTAssertTrue(e2e.type(into: ["Full name", "Họ và tên"], text: "Lan Anh"), "name field")
        nextGoesSolid()
        next().tap()
        _ = bubble("newCustomerSave")
        counter("7/8")
        app.buttons["customers.new.save"].tap()
        _ = bubble("cartCreate")
        counter("8/8")
        e2e.shot("guide-sale-02-create")
        XCTAssertFalse(app.staticTexts["guide.bubble.cartDates"].exists, "a sale has no dates")
    }

    private func addProductWithTheNormalForm() {
        e2e.button(["Add product", "Thêm sản phẩm"]).firstMatch.tap()
        let name = app.textFields["product.form.name"]
        XCTAssertTrue(name.waitForExistence(timeout: 8))
        name.tap()
        name.typeText("Vest")
        let save = app.buttons["product.form.save"]
        save.tap()
        if !save.waitForNonExistence(timeout: 3), save.exists { save.tap() } // the first tap may only close the keyboard
    }

    /// #1411: the normal form outside the guide keeps its rules: no photo, no price, it saves
    func testTheNormalFormStillSavesWithoutPhotoAndPrice() throws {
        logInToHome()
        count("0/3")
        addProductWithTheNormalForm()
        XCTAssertFalse(app.buttons["guide.bubble.next"].exists, "the guide runs only from the card")
        count("1/3")
        e2e.shot("guide-normal-form-saved")
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
        _ = bubble("productPhoto") // the button runs the step on Home
        app.buttons["guide.bubble.exit"].tap()
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
