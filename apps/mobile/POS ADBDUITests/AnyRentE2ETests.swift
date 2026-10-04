//
//  AnyRentE2ETests.swift
//  POS ADBDUITests
//
//  End-to-end walk through the main features, like a human tester (#395).
//  Run it with scripts/mobile-e2e/ios-e2e.sh; it reads (via TEST_RUNNER_ prefixing):
//    E2E_EMAIL, E2E_PASSWORD   the account to log in with
//    E2E_ROLE                  merchant | staff (staff runs read-only flows + restrictions)
//    E2E_FEATURES              comma list of MOBILE_FEATURES that are on; steps for off flags are skipped
//    E2E_OUT_DIR               where NN-feature-step.png screenshots are written
//  Test methods are numbered so XCTest runs them in flow order; each one launches the app and logs in
//  if needed, so one failing flow does not stop the next.
//

import XCTest

final class AnyRentE2ETests: XCTestCase {

    private var app: XCUIApplication!
    private var e2e: E2E!

    /// The app reads app-config flags at launch: relaunch once after the first login of the run.
    static var relaunchedAfterLogin = false

    override func setUpWithError() throws {
        continueAfterFailure = true
        app = XCUIApplication()
        e2e = E2E(test: self, app: app)
        XCTAssertFalse(e2e.email.isEmpty, "E2E_EMAIL is not set (run through scripts/mobile-e2e/ios-e2e.sh)")
        XCTAssertFalse(e2e.password.isEmpty, "E2E_PASSWORD is not set")
        try FileManager.default.createDirectory(atPath: e2e.outDir, withIntermediateDirectories: true)
    }

    // MARK: - Flows

    func test1HomeProducts() throws {
        try e2e.requireFlag("newProducts")
        try e2e.start()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        let firstRow = app.tables.cells.firstMatch
        XCTAssertTrue(firstRow.waitForExistence(timeout: 15), "Product list should load")
        e2e.shot("10-home-list")

        let search = e2e.field(["Name, barcode…", "Tên, mã vạch…"])
        if search.waitForExistence(timeout: 3) {
            search.tap()
            search.typeText("Product 1\n")
            sleep(2)
            e2e.soft(app.tables.cells.count > 0, "search 'Product 1' returns rows")
            e2e.shot("11-home-search")
            search.clearText()
            search.typeText("\n")
            sleep(2)
        } else {
            e2e.soft(false, "search field on Home")
        }

        XCTAssertTrue(app.tables.cells.firstMatch.waitForExistence(timeout: 10), "Rows after clearing search")
        e2e.tapRow(app.tables.cells.firstMatch)
        let addToCart = e2e.button(["Add to cart", "Thêm vào giỏ"])
        XCTAssertTrue(addToCart.waitForExistence(timeout: 10), "Product detail should open with Add to cart")
        if e2e.role == "merchant" {
            e2e.soft(e2e.button(["Edit product", "Sửa sản phẩm"]).exists, "merchant sees Edit on product detail")
        }
        e2e.shot("12-home-detail")
        addToCart.tap()
        sleep(1)
        e2e.shot("13-home-added")
        e2e.tapIfExists(e2e.button(["Back", "Quay lại"]))
        XCTAssertTrue(e2e.cartBar.waitForExistence(timeout: 5), "Cart bar should show after adding a product")
        e2e.shot("14-home-cart-bar")
    }

    func test2CartRent() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        guard e2e.openCartWithOneItem() else { return XCTFail("Could not open the cart with an item") }
        e2e.shot("20-cart-open")
        e2e.tapIfExists(e2e.button(["Rent", "Thuê"]))

        // Dates: same-day range on today (a same-day pickup and return still occupies the day).
        let dates = e2e.element(labelBeginsWith: ["Choose rental dates", "Chọn ngày thuê"])
        if dates.waitForExistence(timeout: 3) {
            dates.tap()
            e2e.pickTodayInDateSheet()
            e2e.shot("21-cart-dates-sheet")
            e2e.tapIfExists(e2e.button(["Confirm", "Xác nhận"]), timeout: 3)
        }
        e2e.shot("22-cart-dates")

        let customer = e2e.pickFirstCustomer()
        e2e.shot("23-cart-customer")

        guard e2e.createOrderFromCart(cta: ["Create order", "Tạo đơn"], shotPrefix: "24-cart-rent") else {
            return XCTFail("Rent order was not created")
        }

        // The created order shows up in the Orders tab (search by the customer we picked).
        try e2e.requireFlagSoft("newOrders")
        e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
        sleep(2)
        e2e.shot("28-orders-after-rent")
        if let name = customer, !name.isEmpty {
            let search = app.searchFields.firstMatch
            if search.waitForExistence(timeout: 5) {
                search.tap()
                search.typeText(name)
                sleep(3)
                let row = app.tables.cells.containing(NSPredicate(format: "label CONTAINS %@", name)).firstMatch
                XCTAssertTrue(row.waitForExistence(timeout: 8), "An order for \(name) should be listed")
                e2e.shot("29-orders-new-rent")
                e2e.tapIfExists(app.buttons["Cancel"])
            }
        }
    }

    func test3CartSale() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        guard e2e.openCartWithOneItem() else { return XCTFail("Could not open the cart with an item") }
        let sale = e2e.button(["Sale", "Bán"])
        XCTAssertTrue(sale.waitForExistence(timeout: 5), "Rent/Sale switch should exist")
        sale.tap()
        sleep(1)
        e2e.shot("30-cart-sale")
        _ = e2e.pickFirstCustomer()
        e2e.shot("31-cart-sale-customer")
        XCTAssertTrue(e2e.createOrderFromCart(cta: ["Sell & collect", "Bán & thu tiền"], shotPrefix: "32-cart-sale"),
                      "Sale order was not created")
    }

    func test4OrdersTab() throws {
        try e2e.requireFlag("newOrders")
        try e2e.start()
        e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
        sleep(2)
        let todo = e2e.button(["To do", "Việc cần làm"])
        e2e.soft(todo.waitForExistence(timeout: 8), "Việc cần làm segment (hidden when the dashboard returns 403)")
        e2e.tapIfExists(todo)
        sleep(2)
        e2e.shot("40-orders-todo")

        let all = e2e.button(["All orders", "Tất cả đơn"])
        XCTAssertTrue(all.waitForExistence(timeout: 5), "Tất cả đơn segment should exist")
        all.tap()
        sleep(2)
        e2e.soft(app.tables.cells.count > 0, "All orders lists rows")
        e2e.shot("41-orders-all")

        let filter = e2e.button(["Order Filter", "Bộ lọc đơn hàng"])
        if filter.waitForExistence(timeout: 3) {
            filter.tap()
            sleep(1)
            e2e.shot("42-orders-filter-sheet")
            e2e.tapIfExists(e2e.button(["Confirm", "Xác nhận"]), timeout: 3)
            sleep(1)
        } else {
            XCTFail("Filter button on Tất cả đơn")
        }

        let sale = e2e.button(["Sale", "Đơn bán"])
        XCTAssertTrue(sale.waitForExistence(timeout: 5), "Đơn bán segment should exist")
        sale.tap()
        sleep(2)
        e2e.shot("43-orders-sale")

        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 5), "Orders search field")
        search.tap()
        search.typeText("ORD")
        sleep(3)
        e2e.soft(app.tables.cells.count > 0, "search 'ORD' returns rows")
        e2e.shot("44-orders-search")
    }

    func test5OrderDetailActions() throws {
        try e2e.requireFlag("newOrders")
        try e2e.requireFlag("newOrderDetail")
        try e2e.requireRole("merchant")
        try e2e.start()
        e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
        sleep(2)

        // A RESERVED rent order: the to-do list marks it "Hand over" / "Giao".
        e2e.tapIfExists(e2e.button(["To do", "Việc cần làm"]))
        sleep(2)
        let handOverRow = app.tables.cells.containing(
            NSPredicate(format: "label == 'Hand over' OR label == 'Giao'")).firstMatch
        if handOverRow.waitForExistence(timeout: 8) {
            e2e.tapRow(handOverRow)
            let handOver = e2e.element(labelBeginsWith: ["Hand over", "Giao đồ"], type: .button)
            XCTAssertTrue(handOver.waitForExistence(timeout: 10), "RESERVED rent order shows Giao đồ")
            e2e.shot("50-detail-reserved")
            handOver.tap()
            let handed = e2e.element(labelBeginsWith: ["Handed over", "Đã giao"], type: .button)
            XCTAssertTrue(handed.waitForExistence(timeout: 8), "Giao đồ sheet has a confirm button")
            e2e.shot("51-detail-handover-sheet")
            handed.tap()
            sleep(3)
            e2e.dismissAlerts()
            e2e.shot("52-detail-pickuped")

            let takeBack = e2e.element(labelBeginsWith: ["Take back", "Nhận trả"], type: .button)
            XCTAssertTrue(takeBack.waitForExistence(timeout: 10), "After hand-over the order offers Nhận trả")
            takeBack.tap()
            let taken = e2e.element(labelBeginsWith: ["Taken back", "Đã nhận"], type: .button)
            XCTAssertTrue(taken.waitForExistence(timeout: 8), "Nhận trả sheet has a confirm button")
            e2e.shot("53-detail-return-sheet")
            taken.tap()
            sleep(3)
            e2e.dismissAlerts()
            e2e.shot("54-detail-returned")
            e2e.goBack()
        } else {
            XCTFail("No 'Hand over' row in Việc cần làm (seed has RESERVED rent orders for today)")
        }

        // Cancel a sale order.
        e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
        let sale = e2e.button(["Sale", "Đơn bán"])
        XCTAssertTrue(sale.waitForExistence(timeout: 5), "Đơn bán segment")
        sale.tap()
        sleep(2)
        var cancelled = false
        for index in 0..<6 where !cancelled {
            let cells = app.tables.cells
            guard cells.count > index else { break }
            e2e.tapRow(cells.element(boundBy: index))
            sleep(2)
            let cancel = e2e.button(["Cancel order", "Hủy đơn", "Hủy đơn hàng"])
            if cancel.waitForExistence(timeout: 4), cancel.isHittable {
                e2e.shot("55-detail-sale")
                cancel.tap()
                let confirm = app.alerts.buttons.matching(
                    NSPredicate(format: "label == 'Confirm' OR label == 'Xác nhận'")).firstMatch
                XCTAssertTrue(confirm.waitForExistence(timeout: 5), "Cancel asks for confirmation")
                e2e.shot("56-detail-cancel-confirm")
                confirm.tap()
                sleep(3)
                e2e.dismissAlerts()
                e2e.shot("57-detail-cancelled")
                cancelled = true
            }
            e2e.goBack()
        }
        XCTAssertTrue(cancelled, "Found and cancelled a sale order")
    }

    func test6Calendar() throws {
        try e2e.requireFlag("newCalendar")
        try e2e.start()
        e2e.tapTab(["Calendar", "Lịch Thuê", "Lịch"], index: 2)
        sleep(2)
        let next = e2e.button(["Next month", "Tháng sau"])
        XCTAssertTrue(next.waitForExistence(timeout: 8), "Calendar month header")
        e2e.shot("60-calendar-month")

        let todayKey = E2E.dayMonth(Date())
        let tomorrowKey = E2E.dayMonth(Date().addingTimeInterval(86_400))
        let today = app.descendants(matching: .any).matching(NSPredicate(format: "label ENDSWITH %@", " " + todayKey)).firstMatch
        let tomorrow = app.descendants(matching: .any).matching(NSPredicate(format: "label ENDSWITH %@", " " + tomorrowKey)).firstMatch
        if tomorrow.exists { tomorrow.tap(); sleep(2) }
        XCTAssertTrue(today.waitForExistence(timeout: 5), "Today's cell (\(todayKey)) is on the month grid")
        today.tap()
        sleep(2)
        e2e.shot("61-calendar-today")

        let row = app.tables.cells.firstMatch
        if row.waitForExistence(timeout: 5) {
            e2e.tapRow(row)
            sleep(3)
            e2e.shot("62-calendar-order")
            e2e.goBack()
        } else {
            e2e.soft(false, "orders on today's calendar list (seed creates some for today)")
        }
    }

    func test7Overview() throws {
        try e2e.requireFlag("newOverview")
        try e2e.start()
        guard e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3) else {
            throw XCTSkip("No Reports tab for this account")
        }
        sleep(3)
        e2e.shot("70-overview")
        let period = e2e.element(labelBeginsWith: ["Period:", "Khoảng thời gian:"], type: .button)
        if e2e.role == "merchant" {
            XCTAssertTrue(period.waitForExistence(timeout: 8), "Period selector on Overview")
        }
        guard period.waitForExistence(timeout: 2) else { return }
        period.tap()
        sleep(1)
        e2e.shot("71-overview-period-sheet")
        let option = e2e.element(labelBeginsWith: ["Last 30 days", "30 ngày qua"])
        XCTAssertTrue(option.waitForExistence(timeout: 5), "Period sheet lists 30 ngày qua")
        option.tap()
        sleep(3)
        e2e.soft(e2e.element(labelBeginsWith: ["Period: Last 30", "Khoảng thời gian: 30"], type: .button).exists,
                 "period button shows the new period")
        e2e.shot("72-overview-30-days")
    }

    func test8StaffRestrictions() throws {
        try e2e.requireRole("staff")
        try e2e.requireFlag("newProducts")
        try e2e.start()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        let firstRow = app.tables.cells.firstMatch
        XCTAssertTrue(firstRow.waitForExistence(timeout: 15), "Product list should load")
        e2e.tapRow(firstRow)
        XCTAssertTrue(e2e.button(["Add to cart", "Thêm vào giỏ"]).waitForExistence(timeout: 10), "Product detail opens")
        XCTAssertFalse(e2e.button(["Edit product", "Sửa sản phẩm", "Edit", "Sửa"]).exists,
                       "OUTLET_STAFF must not see Sửa on product detail")
        e2e.shot("90-staff-product-detail")
        e2e.tapIfExists(e2e.button(["Back", "Quay lại"]))

        let add = e2e.button(["Add product", "Thêm sản phẩm"])
        if add.waitForExistence(timeout: 3) {
            add.tap()
            let name = e2e.field(["Product name", "Tên sản phẩm"])
            XCTAssertTrue(name.waitForExistence(timeout: 8), "Add-product form opens")
            let priceLabels = ["Prices", "Giá", "Rent per rental", "Thuê theo lần", "Rent per day", "Thuê theo ngày",
                               "Sale price", "Giá bán", "Deposit per item", "Cọc mỗi món"]
            let price = app.descendants(matching: .any).matching(NSPredicate(format: "label IN %@", priceLabels)).firstMatch
            XCTAssertFalse(price.exists, "OUTLET_STAFF must not see price fields in the add-product form")
            e2e.shot("91-staff-add-product")
            e2e.tapIfExists(e2e.button(["Close", "Đóng"]))
        } else {
            e2e.note("Add product (+) is hidden for this staff account")
            e2e.shot("91-staff-no-add-product")
        }
    }

    func test9SettingsLogout() throws {
        try e2e.start()
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        sleep(2)
        e2e.shot("80-settings")
        let logout = app.staticTexts.matching(NSPredicate(format: "label == 'Logout' OR label == 'Đăng xuất' OR label == 'Log out'")).firstMatch
        for _ in 0..<4 where !(logout.exists && logout.isHittable) {
            app.swipeUp()
        }
        XCTAssertTrue(logout.waitForExistence(timeout: 5), "Logout row in Settings")
        logout.tap()
        let confirm = app.alerts.buttons.matching(
            NSPredicate(format: "label == 'Logout' OR label == 'Đăng xuất' OR label == 'Log out'")).firstMatch
        XCTAssertTrue(confirm.waitForExistence(timeout: 5), "Logout asks for confirmation")
        e2e.shot("81-settings-logout-confirm")
        confirm.tap()
        XCTAssertTrue(app.secureTextFields.firstMatch.waitForExistence(timeout: 15), "Back on the login screen")
        e2e.shot("82-logged-out")
    }
}

// MARK: - Helper (self-contained; does not use POS_ADBDUITests' private helpers)

private final class E2E {
    let test: XCTestCase
    let app: XCUIApplication
    let email: String
    let password: String
    let role: String
    let features: Set<String>
    let outDir: String
    private let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")

    init(test: XCTestCase, app: XCUIApplication) {
        let env = ProcessInfo.processInfo.environment
        self.test = test
        self.app = app
        email = env["E2E_EMAIL"] ?? ""
        password = env["E2E_PASSWORD"] ?? ""
        role = (env["E2E_ROLE"] ?? "merchant").lowercased()
        features = Set((env["E2E_FEATURES"] ?? "").split(separator: ",").map {
            $0.trimmingCharacters(in: .whitespaces)
        })
        outDir = env["E2E_OUT_DIR"] ?? (NSTemporaryDirectory() as NSString).appendingPathComponent("anyrent-e2e")
    }

    // MARK: Gates

    func requireFlag(_ flag: String) throws {
        if !features.contains(flag) { throw XCTSkip("flag \(flag) is off") }
    }

    /// Mid-test: a missing flag ends the method without failing.
    func requireFlagSoft(_ flag: String) throws {
        if !features.contains(flag) { throw XCTSkip("flag \(flag) is off; rest of the flow skipped") }
    }

    func requireRole(_ wanted: String) throws {
        if role != wanted { throw XCTSkip("\(wanted) run only (this run: \(role))") }
    }

    // MARK: Launch + login

    /// Launch, log in when needed, get past the notification prompt and onboarding, and relaunch once so
    /// app-config flags apply.
    func start() throws {
        app.launch()
        if isLoginScreen(timeout: 8) {
            login()
            settle(seconds: 15)
            if !AnyRentE2ETests.relaunchedAfterLogin {
                AnyRentE2ETests.relaunchedAfterLogin = true
                app.terminate()
                app.launch()
            }
        }
        settle(seconds: 6)
        guard app.tabBars.firstMatch.waitForExistence(timeout: 30) else {
            shot("00-no-main-shell")
            XCTFail("Main tab bar did not appear after login")
            throw XCTSkip("not logged in")
        }
    }

    private func isLoginScreen(timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if app.secureTextFields.firstMatch.exists { return true }
            if app.tabBars.firstMatch.exists { return false }
            dismissSystemAlert()
            sleep(1)
        }
        return app.secureTextFields.firstMatch.exists
    }

    private func login() {
        let emailField = field(["Enter your email", "Nhập email của bạn", "Email"])
        let resolved = emailField.waitForExistence(timeout: 5) ? emailField : app.textFields.firstMatch
        XCTAssertTrue(resolved.waitForExistence(timeout: 5), "Email field on login")
        resolved.tap()
        resolved.clearText()
        resolved.typeText(email)
        let pass = app.secureTextFields.firstMatch
        pass.tap()
        pass.clearText()
        pass.typeText(password)
        shot("01-login-filled", attachOnly: true)
        let loginButton = button(["Login", "Đăng nhập", "Log in"])
        XCTAssertTrue(loginButton.waitForExistence(timeout: 5), "Login button")
        if !loginButton.isHittable { app.tap() } // hide the keyboard
        loginButton.tap()
    }

    /// Tap through the notification prompt and onboarding until the tab bar has been stable for a moment.
    func settle(seconds: TimeInterval) {
        let deadline = Date().addingTimeInterval(seconds)
        var quiet = 0
        while Date() < deadline {
            var acted = dismissSystemAlert()
            let skip = button(["Skip", "Bỏ qua"])
            if skip.exists && skip.isHittable {
                shot("02-onboarding", attachOnly: true)
                skip.tap()
                acted = true
            }
            if !acted && app.tabBars.firstMatch.exists {
                quiet += 1
                if quiet >= 3 { return }
            } else {
                quiet = 0
            }
            sleep(1)
        }
    }

    @discardableResult
    func dismissSystemAlert() -> Bool {
        let labels = ["Don’t Allow", "Don't Allow", "Không cho phép", "Not Now", "Không phải bây giờ"]
        let systemButton = springboard.alerts.buttons.matching(NSPredicate(format: "label IN %@", labels)).firstMatch
        if systemButton.exists {
            systemButton.tap()
            return true
        }
        let inApp = app.alerts.buttons.matching(NSPredicate(format: "label IN %@", labels)).firstMatch
        if inApp.exists {
            inApp.tap()
            return true
        }
        return false
    }

    /// In-app error/info alerts after an action: record them, then close them.
    func dismissAlerts() {
        dismissSystemAlert()
        let alert = app.alerts.firstMatch
        if alert.exists {
            note("Alert: \(alert.label) \(alert.staticTexts.allElementsBoundByIndex.map { $0.label }.joined(separator: " | "))")
            shot("alert-\(Int(Date().timeIntervalSince1970))")
            let ok = alert.buttons.matching(NSPredicate(format: "label IN %@", ["OK", "Đóng", "Close"])).firstMatch
            (ok.exists ? ok : alert.buttons.firstMatch).tap()
        }
    }

    // MARK: Queries

    func button(_ labels: [String]) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label IN %@", labels)).firstMatch
    }

    func field(_ labels: [String]) -> XCUIElement {
        app.textFields.matching(NSPredicate(format: "label IN %@ OR placeholderValue IN %@", labels, labels)).firstMatch
    }

    func element(labelBeginsWith prefixes: [String], type: XCUIElement.ElementType = .any) -> XCUIElement {
        let predicate = NSCompoundPredicate(orPredicateWithSubpredicates: prefixes.map {
            NSPredicate(format: "label BEGINSWITH %@", $0)
        })
        return app.descendants(matching: type).matching(predicate).firstMatch
    }

    var cartBar: XCUIElement {
        app.descendants(matching: .any).matching(
            NSPredicate(format: "(label CONTAINS 'Cart ·' OR label CONTAINS 'Giỏ hàng ·') AND (label CONTAINS 'Create order' OR label CONTAINS 'Tạo đơn')")
        ).firstMatch
    }

    // MARK: Actions

    @discardableResult
    func tapTab(_ names: [String], index: Int?) -> Bool {
        let tabBar = app.tabBars.firstMatch
        guard tabBar.waitForExistence(timeout: 10) else { return false }
        for name in names where tabBar.buttons[name].exists {
            tabBar.buttons[name].tap()
            return true
        }
        if let index = index, tabBar.buttons.count > index {
            tabBar.buttons.element(boundBy: index).tap()
            return true
        }
        if index == nil, tabBar.buttons.count > 0 { // last tab (Settings)
            tabBar.buttons.element(boundBy: tabBar.buttons.count - 1).tap()
            return true
        }
        return false
    }

    func tapRow(_ row: XCUIElement) {
        if row.isHittable {
            row.tap()
        } else {
            row.coordinate(withNormalizedOffset: CGVector(dx: 0.4, dy: 0.5)).tap()
        }
    }

    func tapIfExists(_ element: XCUIElement, timeout: TimeInterval = 1) {
        if element.waitForExistence(timeout: timeout), element.isHittable { element.tap() }
    }

    func goBack() {
        let back = app.buttons.matching(NSPredicate(format: "label IN %@",
            ["Back", "Quay lại", "Back to products", "Quay lại chọn sản phẩm"])).firstMatch
        if back.exists && back.isHittable {
            back.tap()
        } else if app.navigationBars.buttons.firstMatch.exists && app.navigationBars.buttons.firstMatch.isHittable {
            app.navigationBars.buttons.firstMatch.tap()
        } else {
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.0, dy: 0.5))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.8, dy: 0.5)))
        }
        sleep(1)
    }

    /// Home → make sure one product with stock is in the cart → open the cart.
    func openCartWithOneItem() -> Bool {
        tapTab(["Home", "Trang chủ"], index: 0)
        guard app.tables.cells.firstMatch.waitForExistence(timeout: 15) else { return false }
        if !cartBar.waitForExistence(timeout: 2) {
            let add = app.tables.buttons.matching(NSPredicate(
                format: "(label BEGINSWITH 'Add ' AND label CONTAINS 'cart') OR (label BEGINSWITH 'Thêm ' AND label CONTAINS 'giỏ')"
            ))
            for index in 0..<min(add.count, 5) {
                let candidate = add.element(boundBy: index)
                if candidate.isHittable && candidate.isEnabled {
                    candidate.tap()
                    break
                }
            }
        }
        guard cartBar.waitForExistence(timeout: 5) else { return false }
        cartBar.tap()
        return button(["Back to products", "Quay lại chọn sản phẩm"]).waitForExistence(timeout: 8)
    }

    /// In the date sheet (FSCalendar), tap today's day number once: a same-day range.
    func pickTodayInDateSheet() {
        sleep(1)
        let day = Calendar.current.component(.day, from: Date())
        let matches = app.collectionViews.cells.matching(NSPredicate(format: "label == %@ OR label BEGINSWITH %@",
                                                                     "\(day)", "\(day) "))
        let texts = app.collectionViews.staticTexts.matching(NSPredicate(format: "label == %@", "\(day)"))
        // Leading/trailing days of other months repeat small and large numbers: first match early in the
        // month, last match late in the month.
        let pool = matches.count > 0 ? matches : texts
        guard pool.count > 0 else { return note("No day \(day) in the date sheet") }
        let target = day < 15 ? pool.element(boundBy: 0) : pool.element(boundBy: pool.count - 1)
        if target.isHittable { target.tap() } else { note("Day \(day) not hittable in the date sheet") }
        sleep(1)
    }

    /// Open the customer picker and choose the first customer. Returns the name shown on the row.
    func pickFirstCustomer() -> String? {
        let row = element(labelBeginsWith: ["Choose customer", "Chọn khách hàng"])
        guard row.waitForExistence(timeout: 5) else {
            note("Customer row not found (already chosen?)")
            return nil
        }
        row.tap()
        let search = app.searchFields.firstMatch
        guard search.waitForExistence(timeout: 8) else {
            XCTFail("Customer picker did not open")
            return nil
        }
        sleep(2)
        let top = search.frame.maxY
        let cell = app.cells.allElementsBoundByIndex.first { $0.frame.minY >= top && $0.isHittable }
        guard let chosen = cell else {
            XCTFail("No customer rows in the picker")
            return nil
        }
        let name = chosen.staticTexts.firstMatch.exists ? chosen.staticTexts.firstMatch.label : nil
        chosen.tap()
        sleep(1)
        return name
    }

    /// Cart CTA → preview → create → payment sheet confirm. True when the app is back on Home with an empty cart.
    func createOrderFromCart(cta: [String], shotPrefix: String) -> Bool {
        let ctaButton = button(cta)
        guard ctaButton.waitForExistence(timeout: 5) else {
            XCTFail("Cart CTA \(cta) missing")
            return false
        }
        ctaButton.tap()
        sleep(2)
        dismissAlerts()
        // The preview's footer button reads "Create Order" / "Tạo đơn".
        let create = app.buttons.matching(NSPredicate(format: "label IN %@", ["Create Order", "Create order", "Tạo đơn"]))
        guard create.firstMatch.waitForExistence(timeout: 10) else {
            shot("\(shotPrefix)-no-preview")
            XCTFail("Preview did not open")
            return false
        }
        shot("\(shotPrefix)-preview")
        let footer = create.allElementsBoundByIndex.filter { $0.isHittable }.max { $0.frame.minY < $1.frame.minY }
        (footer ?? create.firstMatch).tap()
        let confirm = button(["Confirm", "Xác nhận"])
        if confirm.waitForExistence(timeout: 8) {
            shot("\(shotPrefix)-payment")
            confirm.tap()
        } else {
            note("No payment sheet after Create")
        }
        sleep(4)
        dismissAlerts()
        let backHome = app.tabBars.firstMatch.waitForExistence(timeout: 15)
        shot("\(shotPrefix)-created")
        return backHome && !cartBar.exists
    }

    // MARK: Reporting

    /// Soft check: logged and attached, never fails the test.
    func soft(_ condition: Bool, _ message: String) {
        if !condition { note("SOFT CHECK FAILED: \(message)") }
    }

    func note(_ message: String) {
        print("E2E_NOTE: \(message)")
        let attachment = XCTAttachment(string: message)
        attachment.name = "note"
        attachment.lifetime = .keepAlways
        test.add(attachment)
    }

    /// XCTAttachment (kept always) + PNG in E2E_OUT_DIR, named NN-feature-step.
    func shot(_ name: String, attachOnly: Bool = false) {
        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        test.add(attachment)
        guard !attachOnly else { return }
        let path = (outDir as NSString).appendingPathComponent("\(name).png")
        if FileManager.default.createFile(atPath: path, contents: screenshot.pngRepresentation) {
            print("E2E_SCREENSHOT: \(path)")
        } else {
            print("E2E_NOTE: could not write \(path)")
        }
    }

    /// "dd/MM" as on the calendar day cells (DayFormatter.short is "<weekday> dd/MM").
    static func dayMonth(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "dd/MM"
        return formatter.string(from: date)
    }
}

private extension XCUIElement {
    func clearText() {
        guard let current = value as? String, !current.isEmpty,
              current != placeholderValue else { return }
        tap()
        typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count))
    }
}
