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
        let addToCart = e2e.button(["Add to cart", "Thêm vào giỏ"])
        // The list reloads after the search is cleared; a tap during the reload is lost, so retry.
        for _ in 0..<3 where !addToCart.exists {
            sleep(1)
            app.tables.cells.firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.4, dy: 0.5)).tap()
            _ = addToCart.waitForExistence(timeout: 5)
        }
        XCTAssertTrue(addToCart.waitForExistence(timeout: 5), "Product detail should open with Add to cart")
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

        // New customer with a Vietnamese name: covers "Khách mới" and accent-insensitive search below.
        let customer = e2e.createCustomerInPicker(name: E2E.vietnameseName, phone: E2E.uniquePhone())
            ?? e2e.pickFirstCustomer()
        e2e.shot("23-cart-customer")

        guard e2e.createOrderFromCart(cta: ["Create order", "Tạo đơn"], shotPrefix: "24-cart-rent") else {
            return XCTFail("Rent order was not created (last alert: \(e2e.lastAlert ?? "none"))")
        }

        // The created order shows up in the Orders tab (search by the customer we picked).
        try e2e.requireFlagSoft("newOrders")
        e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
        sleep(2)
        e2e.shot("28-orders-after-rent")
        if let name = customer, !name.isEmpty {
            // Search without accents ("nguyen van") must find "Nguyễn Văn …" (word prefix, accent-insensitive).
            let query = name == E2E.vietnameseName ? E2E.vietnameseQuery : name
            let search = e2e.ordersSearchField
            if search.waitForExistence(timeout: 5) {
                search.tap()
                search.typeText(query)
                sleep(3)
                let row = app.cells.containing(NSPredicate(format: "label CONTAINS %@", name)).firstMatch
                let any = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", name)).firstMatch
                XCTAssertTrue(row.waitForExistence(timeout: 8) || any.exists,
                              "Searching '\(query)' should list the order for \(name)")
                e2e.shot("29-orders-new-rent")
                e2e.tapIfExists(e2e.button(["Cancel", "Huỷ", "Hủy"]))
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
                      "Sale order was not created (last alert: \(e2e.lastAlert ?? "none"))")
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

        // The sort button under the status chips opens "Lọc & sắp xếp" (board Loc).
        let filter = e2e.sortButton
        if filter.waitForExistence(timeout: 3) {
            filter.tap()
            sleep(1)
            e2e.shot("42-orders-filter-sheet")
            let nearest = e2e.element(labelBeginsWith: ["Nearest task", "Việc gần nhất"])
            e2e.soft(nearest.waitForExistence(timeout: 3), "filter sheet lists Việc gần nhất")
            e2e.tapIfExists(nearest)
            // KHOẢNG NGÀY: planned hand-over day in the next 7 days (exact labels: the sort has "Hand-over date").
            e2e.tapIfExists(e2e.button(["Handed over", "Ngày giao"]))
            e2e.tapIfExists(e2e.button(["Next 7 days", "7 ngày tới"]))
            sleep(1)
            e2e.shot("42b-orders-filter-nearest")
            e2e.tapIfExists(e2e.element(labelBeginsWith: ["Show", "Xem"], type: .button), timeout: 3)
            sleep(2)
            e2e.soft(e2e.element(labelBeginsWith: ["Nearest task", "Việc gần nhất"], type: .button).exists,
                     "list header shows the Việc gần nhất sort")
            e2e.shot("42c-orders-nearest")
        } else {
            XCTFail("Sort/filter button on Tất cả đơn")
        }

        let sale = e2e.saleModeButton
        XCTAssertTrue(sale.waitForExistence(timeout: 5), "Đơn bán (Sales) switch should exist")
        sale.tap()
        sleep(2)
        e2e.shot("43-orders-sale")

        let search = e2e.ordersSearchField
        XCTAssertTrue(search.waitForExistence(timeout: 5), "Orders search field")
        for (query, shot) in [("ORD-001", "44-orders-search-code"), ("555-1006", "45-orders-search-phone"),
                              ("james", "46-orders-search-name")] {
            search.tap()
            search.clearText()
            search.typeText(query)
            sleep(3)
            e2e.soft(app.cells.count > 0, "search '\(query)' returns rows")
            e2e.shot(shot)
        }
        e2e.tapIfExists(e2e.button(["Cancel", "Huỷ", "Hủy"]))
    }

    func test5OrderDetailActions() throws {
        try e2e.requireFlag("newOrders")
        try e2e.requireFlag("newOrderDetail")
        try e2e.requireRole("merchant")
        try e2e.start()
        e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
        sleep(2)

        // A RESERVED rent order: the to-do list marks it "To hand over" / "Cần giao" (#482).
        e2e.tapIfExists(e2e.button(["To do", "Việc cần làm"]))
        sleep(2)
        let handOverRow = app.tables.cells.containing(
            NSPredicate(format: "label == 'To hand over' OR label == 'Cần giao' OR label == 'Hand over' OR label == 'Giao'")).firstMatch
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
        let sale = e2e.saleModeButton
        XCTAssertTrue(sale.waitForExistence(timeout: 5), "Đơn bán (Sales) switch")
        sale.tap()
        sleep(2)
        // Open a RESERVED sale (only those offer Cancel order), scrolling the list if needed.
        var cancelled = false
        let reservedBadge = NSPredicate(format: "label ==[c] 'RESERVED' OR label ==[c] 'Booked' OR label ==[c] 'Đã đặt' OR label ==[c] 'Đặt trước'")
        let reservedRow = app.cells.containing(reservedBadge).firstMatch
        for _ in 0..<5 where !(reservedRow.exists && reservedRow.isHittable) {
            app.swipeUp()
            sleep(1)
        }
        if reservedRow.exists {
            e2e.tapRow(reservedRow)
            sleep(2)
            let cancel = e2e.button(["Cancel order", "Hủy đơn", "Hủy đơn hàng"])
            if cancel.waitForExistence(timeout: 5), cancel.isHittable {
                e2e.shot("55-detail-sale")
                cancel.tap()
                let confirm = app.alerts.buttons.matching(
                    NSPredicate(format: "label == 'Confirm' OR label == 'Xác nhận'")).firstMatch
                XCTAssertTrue(confirm.waitForExistence(timeout: 5), "Cancel asks for confirmation")
                e2e.shot("56-detail-cancel-confirm")
                confirm.tap()
                sleep(3)
                e2e.dismissAlerts()
                let badge = app.staticTexts.matching(NSPredicate(format: "label ==[c] 'CANCELLED' OR label ==[c] 'Cancelled' OR label ==[c] 'Đã hủy' OR label ==[c] 'Đã huỷ'")).firstMatch
                e2e.soft(badge.waitForExistence(timeout: 5), "order shows CANCELLED after cancel")
                e2e.shot("57-detail-cancelled")
                cancelled = true
            } else {
                e2e.shot("55-detail-sale-no-cancel")
            }
            e2e.goBack()
        }
        XCTAssertTrue(cancelled, "Found and cancelled a sale order")
    }


    func test0AuthFlows() throws {
        try e2e.requireFlag("newAuth")
        app.launch()
        e2e.settle(seconds: 4)
        if app.tabBars.firstMatch.waitForExistence(timeout: 4) { e2e.logout() }
        XCTAssertTrue(app.secureTextFields.firstMatch.waitForExistence(timeout: 15), "Login screen")
        e2e.shot("03-auth-login")

        // Wrong password: an error, and the login form stays.
        e2e.login(email: e2e.email, password: "wrong-" + e2e.password)
        sleep(4)
        e2e.dismissAlerts()
        XCTAssertTrue(app.secureTextFields.firstMatch.exists, "Wrong password stays on login")
        let error = app.staticTexts.matching(NSPredicate(
            format: "label CONTAINS[c] 'Invalid email or password' OR label CONTAINS[c] 'không hợp lệ' OR label CONTAINS[c] 'incorrect' OR label CONTAINS[c] 'sai'")).firstMatch
        e2e.soft(error.exists || e2e.lastAlert != nil, "wrong password shows an error")
        e2e.shot("04-auth-wrong-password")

        // Forgot password: send the link, land on "Kiểm tra email" (or the rate-limit message).
        let forgot = e2e.button(["Forgot Password?", "Quên mật khẩu?", "Forgot password?"])
        XCTAssertTrue(forgot.waitForExistence(timeout: 5), "Forgot password link")
        forgot.tap()
        let email = e2e.field(["Email"])
        XCTAssertTrue(email.waitForExistence(timeout: 8), "Forgot password form")
        sleep(1)
        e2e.dismissSystemAlert()
        e2e.shot("05-auth-forgot")
        email.tap()
        email.clearText()
        email.typeText(e2e.email)
        e2e.tapIfExists(e2e.button(["Send link", "Gửi liên kết"]), timeout: 3)
        let sent = e2e.element(labelBeginsWith: ["Check your email", "Kiểm tra email"])
        e2e.soft(sent.waitForExistence(timeout: 12), "forgot password reaches Kiểm tra email")
        e2e.dismissAlerts()
        e2e.shot("06-auth-forgot-sent")
        e2e.backToLogin()

        // Sign-up (merchant run only, it creates a shop): two steps, then the activation email screen.
        guard e2e.role == "merchant" else { return }
        let create = e2e.button(["Create a new shop", "Tạo cửa hàng mới"])
        XCTAssertTrue(create.waitForExistence(timeout: 8), "Create a new shop link")
        create.tap()
        let stamp = Int(Date().timeIntervalSince1970) % 100_000_000
        XCTAssertTrue(e2e.type(into: ["Shop name", "Tên cửa hàng"], text: "E2E Shop \(stamp)"), "Shop name field")
        _ = e2e.type(into: ["Phone number", "Số điện thoại"], text: E2E.uniquePhone())
        _ = e2e.type(into: ["Address", "Địa chỉ"], text: "12 Nguyen Hue, District 1")
        e2e.tapIfExists(e2e.button(["Tools", "Dụng cụ"]), timeout: 2)
        e2e.hideKeyboard()
        e2e.shot("07-auth-signup-step1")
        let next = e2e.button(["Continue", "Tiếp tục"])
        for _ in 0..<3 where !(next.exists && next.isHittable) { app.swipeUp() }
        next.tap()
        XCTAssertTrue(e2e.type(into: ["Full name", "Họ và tên"], text: "E2E Owner"), "Owner step opens")
        _ = e2e.type(into: ["Email"], text: "e2e391+\(stamp)@example.com")
        let secure = app.secureTextFields
        if secure.count >= 2 {
            secure.element(boundBy: 0).tap(); secure.element(boundBy: 0).typeText("e2e12345")
            secure.element(boundBy: 1).tap(); secure.element(boundBy: 1).typeText("e2e12345")
        }
        e2e.hideKeyboard()
        let terms = app.descendants(matching: .any).matching(NSPredicate(
            format: "label BEGINSWITH 'Please accept the Privacy Policy' OR label BEGINSWITH 'Vui lòng'")).firstMatch
        for _ in 0..<2 where !(terms.exists && terms.isHittable) { app.swipeUp() }
        if terms.waitForExistence(timeout: 3) { terms.tap() } else { e2e.note("terms checkbox not found") }
        e2e.shot("08-auth-signup-step2")
        let createShop = e2e.button(["Create shop", "Tạo cửa hàng"])
        for _ in 0..<3 where !(createShop.exists && createShop.isHittable) { app.swipeUp() }
        createShop.tap()
        let verify = e2e.element(labelBeginsWith: ["Check your email", "Kiểm tra email"])
        XCTAssertTrue(verify.waitForExistence(timeout: 20),
                      "Sign-up ends on the activation email screen (last alert: \(e2e.lastAlert ?? "none"))")
        e2e.dismissAlerts()
        e2e.shot("09-auth-signup-email-sent")
        e2e.backToLogin()
    }

    func test5bOrderExtendEditPrint() throws {
        try e2e.requireFlag("newOrders")
        try e2e.requireFlag("newOrderDetail")
        try e2e.requireRole("merchant")
        try e2e.start()
        e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
        sleep(2)
        let all = e2e.button(["All orders", "Tất cả đơn"])
        XCTAssertTrue(all.waitForExistence(timeout: 5), "Tất cả đơn")
        all.tap()
        sleep(1)
        e2e.tapIfExists(e2e.button(["Renting", "Đang thuê"]), timeout: 3)
        sleep(2)
        let row = app.cells.firstMatch
        guard row.waitForExistence(timeout: 8) else { return XCTFail("No renting order to extend") }
        e2e.tapRow(row)
        let extend = e2e.button(["Extend", "Gia hạn"])
        XCTAssertTrue(extend.waitForExistence(timeout: 10), "A renting order offers Gia hạn")
        e2e.shot("58-detail-renting")
        extend.tap()
        let confirm = e2e.element(labelBeginsWith: ["Extend to", "Gia hạn đến"], type: .button)
        XCTAssertTrue(confirm.waitForExistence(timeout: 8), "Extend sheet with Gia hạn đến <day>")
        e2e.shot("59-detail-extend-sheet")
        confirm.tap()
        sleep(4)
        e2e.dismissAlerts()
        e2e.shot("5a-detail-extended")

        // Print preview from the nav bar printer button.
        let print = e2e.button(["Print receipt", "In hóa đơn", "In biên nhận"])
        if print.waitForExistence(timeout: 5) {
            print.tap()
            sleep(3)
            e2e.shot("5b-detail-print-preview")
            e2e.dismissAlerts()
            e2e.tapIfExists(e2e.button(["Close", "Đóng", "Cancel", "Huỷ", "Hủy", "Done", "Xong"]), timeout: 2)
            if !extend.exists { e2e.goBackOnce() }
        } else {
            e2e.soft(false, "print button on order detail")
        }

        // Edit order: only Booked (RESERVED) orders offer it. It opens the cart in edit mode; leave without saving.
        e2e.goBack()
        e2e.tapIfExists(e2e.button(["Booked", "Đã đặt"]), timeout: 3)
        sleep(2)
        let booked = app.cells.firstMatch
        if booked.waitForExistence(timeout: 8) {
            e2e.tapRow(booked)
            let edit = e2e.button(["Edit order", "Sửa đơn"])
            if edit.waitForExistence(timeout: 8) {
                e2e.shot("5c-detail-booked")
                edit.tap()
                sleep(3)
                e2e.shot("5d-detail-edit-order")
                e2e.goBackOnce()
            } else {
                e2e.soft(false, "Booked order offers Sửa đơn")
            }
        }
        e2e.goBack()
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


    func test7aCustomers() throws {
        try e2e.requireFlag("newCustomers")
        try e2e.start()
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        let row = app.staticTexts.matching(NSPredicate(format: "label == 'Customers' OR label == 'Khách hàng'")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 8), "Customers row in Settings")
        e2e.shot("75-settings-counts")
        row.tap()
        let search = e2e.field(["Name or phone number", "Tên hoặc số điện thoại"])
        XCTAssertTrue(search.waitForExistence(timeout: 10), "Customers list with search")
        sleep(2)
        e2e.shot("76-customers-list")
        search.tap()
        search.typeText(E2E.vietnameseQuery)
        sleep(3)
        e2e.shot("76b-customers-search-no-accents")
        search.clearText()
        // Sarah Brown has cancelled orders in the seed: Tổng chi must leave them out.
        search.typeText("sarah brown")
        sleep(3)
        let first = app.cells.firstMatch
        guard first.waitForExistence(timeout: 8) else { return XCTFail("No customer rows for 'sarah brown'") }
        e2e.tapRow(first)
        let spent = e2e.element(labelBeginsWith: ["Total spent", "Tổng chi"])
        XCTAssertTrue(spent.waitForExistence(timeout: 10), "Customer detail shows Tổng chi")
        e2e.shot("77-customer-detail")
        let edit = e2e.button(["Edit", "Sửa"])
        if edit.waitForExistence(timeout: 3) {
            edit.tap()
            XCTAssertTrue(e2e.element(labelBeginsWith: ["Edit customer", "Sửa khách hàng"]).waitForExistence(timeout: 8),
                          "Edit customer opens")
            e2e.shot("78-customer-edit")
            e2e.tapIfExists(e2e.button(["Cancel", "Hủy", "Huỷ", "Back", "Quay lại"]), timeout: 2)
            sleep(1)
        }
        if e2e.role == "merchant" {
            let order = e2e.element(labelBeginsWith: ["Create order for this customer", "Tạo đơn cho khách này"])
            for _ in 0..<3 where !(order.exists && order.isHittable) { app.swipeUp() }
            XCTAssertTrue(order.waitForExistence(timeout: 5), "Tạo đơn cho khách này")
            order.tap()
            sleep(3)
            e2e.shot("79-customer-create-order")
        }
        e2e.goBack()
    }

    func test7bProductManage() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        // Product 1 has a renting order: delete must answer 409 PRODUCT_HAS_OPEN_ORDERS and keep the screen.
        guard e2e.openProduct(named: "Product 1 - Electronics") else { return XCTFail("Product 1 detail") }
        e2e.shot("7c-product-detail-strip")
        let delete = e2e.button(["Delete product", "Xóa sản phẩm", "Delete", "Xóa"])
        XCTAssertTrue(delete.waitForExistence(timeout: 5), "Merchant sees Xóa on product detail")
        delete.tap()
        let confirm = app.sheets.buttons.matching(NSPredicate(format: "label IN %@", ["Delete product", "Xóa sản phẩm"])).firstMatch
        let anyConfirm = confirm.waitForExistence(timeout: 5) ? confirm
            : app.buttons.matching(NSPredicate(format: "label IN %@", ["Delete product", "Xóa sản phẩm"])).element(boundBy: 1)
        e2e.shot("7d-product-delete-confirm")
        anyConfirm.tap()
        sleep(3)
        let blocked = app.staticTexts.matching(NSPredicate(
            format: "label CONTAINS 'reserved or being rented' OR label CONTAINS 'đang thuê' OR label CONTAINS 'đặt trước'")).firstMatch
        e2e.soft(blocked.waitForExistence(timeout: 5), "409 PRODUCT_HAS_OPEN_ORDERS message")
        e2e.shot("7e-product-delete-409")
        e2e.dismissAlerts()
        XCTAssertTrue(e2e.button(["Add to cart", "Thêm vào giỏ"]).waitForExistence(timeout: 5), "Detail stays after 409")

        // Edit opens the form; close without saving.
        let edit = e2e.button(["Edit product", "Sửa sản phẩm", "Edit", "Sửa"])
        if edit.waitForExistence(timeout: 3) {
            edit.tap()
            sleep(2)
            e2e.shot("7f-product-edit-form")
            e2e.tapIfExists(e2e.button(["Close", "Đóng"]), timeout: 3)
        }
        e2e.goBackOnce()

        // A product without open orders is deleted and leaves the list.
        let name = "Product 30 - Maintenance Equipment"
        guard e2e.openProduct(named: name) else { return XCTFail("\(name) detail") }
        e2e.button(["Delete product", "Xóa sản phẩm", "Delete", "Xóa"]).tap()
        let ok = app.sheets.buttons.matching(NSPredicate(format: "label IN %@", ["Delete product", "Xóa sản phẩm"])).firstMatch
        if ok.waitForExistence(timeout: 5) { ok.tap() }
        sleep(3)
        e2e.dismissAlerts()
        e2e.shot("7g-product-deleted")
        e2e.soft(app.tables.cells.firstMatch.waitForExistence(timeout: 8), "back on the product list after delete")
    }

    func test7cSettingsUsers() throws {
        try e2e.requireFlag("newSettings")
        try e2e.start()
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        let users = app.staticTexts.matching(NSPredicate(format: "label == 'Users' OR label == 'Người dùng'")).firstMatch
        if e2e.role == "staff" {
            e2e.shot("7h-staff-settings")
            e2e.soft(!users.exists, "OUTLET_STAFF does not see Người dùng")
            return
        }
        XCTAssertTrue(users.waitForExistence(timeout: 8), "Users row")
        users.tap()
        sleep(3)
        e2e.shot("7h-settings-users")
        e2e.goBackOnce()
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
            // The secure field sometimes drops the typed password (keyboard switch after the email field),
            // leaving Login disabled. Retry while the login form is still showing.
            for attempt in 1...3 {
                login()
                if !app.secureTextFields.firstMatch.waitForNonExistence(timeout: 8) {
                    shot("00-login-retry-\(attempt)", attachOnly: true)
                    dismissAlerts()
                    continue
                }
                break
            }
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
            if app.tabBars.firstMatch.exists && !app.alerts.firstMatch.exists { return false }
            dismissSystemAlert()
            // "Signed in on another device" (single-session API) shows an app alert, then the login form.
            if app.alerts.firstMatch.exists { dismissAlerts() }
            sleep(1)
        }
        return app.secureTextFields.firstMatch.exists
    }

    private func login() { login(email: email, password: password) }

    func login(email: String, password: String) {
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
        if let typed = pass.value as? String, typed.isEmpty || typed == pass.placeholderValue {
            pass.tap()
            pass.typeText(password)
        }
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
        // iOS "Save Password?" (AutoFill) sheet after a login or sign-up form.
        let savePassword = springboard.buttons.matching(NSPredicate(format: "label IN %@", ["Not Now", "Không phải bây giờ"])).firstMatch
        if savePassword.exists && savePassword.isHittable {
            savePassword.tap()
            return true
        }
        let savePasswordInApp = app.buttons.matching(NSPredicate(format: "label IN %@", ["Not Now", "Không phải bây giờ"])).firstMatch
        if savePasswordInApp.exists && savePasswordInApp.isHittable {
            savePasswordInApp.tap()
            return true
        }
        return false
    }

    /// In-app error/info alerts after an action: record them, then close them.
    /// Text of the last app alert dismissed (for failure messages).
    var lastAlert: String?

    func dismissAlerts() {
        dismissSystemAlert()
        let alert = app.alerts.firstMatch
        if alert.waitForExistence(timeout: 0.5) {
            lastAlert = "\(alert.label) \(alert.staticTexts.allElementsBoundByIndex.map { $0.label }.joined(separator: " | "))"
            note("Alert: \(lastAlert ?? "")")
            shot("alert-\(Int(Date().timeIntervalSince1970))")
            let ok = alert.buttons.matching(NSPredicate(format: "label IN %@", ["OK", "Đóng", "Close"])).firstMatch
            let target = ok.exists ? ok : alert.buttons.firstMatch
            if target.exists { target.tap() } // the alert may close on its own
        }
    }

    func logout() {
        tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        sleep(1)
        let logout = app.staticTexts.matching(NSPredicate(format: "label == 'Logout' OR label == 'Đăng xuất' OR label == 'Log out'")).firstMatch
        for _ in 0..<4 where !(logout.exists && logout.isHittable) { app.swipeUp() }
        guard logout.waitForExistence(timeout: 5) else { return note("logout row not found") }
        logout.tap()
        let confirm = app.alerts.buttons.matching(
            NSPredicate(format: "label == 'Logout' OR label == 'Đăng xuất' OR label == 'Log out'")).firstMatch
        if confirm.waitForExistence(timeout: 5) { confirm.tap() }
        _ = app.secureTextFields.firstMatch.waitForExistence(timeout: 15)
    }

    func backToLogin() {
        for _ in 0..<3 where !app.secureTextFields.firstMatch.exists {
            let back = button(["Back to sign in", "Về đăng nhập", "Back", "Quay lại"])
            if back.exists && back.isHittable { back.tap() } else { goBackOnce() }
            sleep(1)
        }
    }

    /// Type into the text field whose label/placeholder matches; false when it is not on screen.
    @discardableResult
    func type(into labels: [String], text: String) -> Bool {
        let target = field(labels)
        guard target.waitForExistence(timeout: 6) else { return false }
        target.tap()
        target.clearText()
        target.typeText(text)
        return true
    }

    func hideKeyboard() {
        guard app.keyboards.firstMatch.exists else { return }
        let labels = ["Done", "done", "Return", "return", "Xong", "Go", "Next", "next"]
        let toolbarDone = app.toolbars.buttons.matching(NSPredicate(format: "label IN %@", labels)).firstMatch
        let keyDone = app.keyboards.buttons.matching(NSPredicate(format: "label IN %@", labels)).firstMatch
        if toolbarDone.exists { toolbarDone.tap() } else if keyDone.exists { keyDone.tap() }
        sleep(1)
        if app.keyboards.firstMatch.exists { // still up: drag the content down to dismiss it interactively
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.35))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.9)))
        }
    }

    /// One back step (nav bar back, labelled back, or the top-left arrow), without waiting for the tab bar.
    func goBackOnce() {
        let back = app.buttons.matching(NSPredicate(format: "label IN %@",
            ["Back", "Quay lại", "Back to products", "Quay lại chọn sản phẩm"])).firstMatch
        if back.exists && back.isHittable {
            back.tap()
        } else if app.navigationBars.buttons.firstMatch.exists, app.navigationBars.buttons.firstMatch.isHittable {
            app.navigationBars.buttons.firstMatch.tap()
        } else {
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.067, dy: 0.087)).tap()
        }
        sleep(1)
    }

    var ordersSearchField: XCUIElement {
        let v2 = field(["Name, phone, order number, item", "Tìm tên, SĐT, mã đơn, tên đồ"])
        return v2.exists ? v2 : app.searchFields.firstMatch.exists ? app.searchFields.firstMatch
            : app.textFields.matching(NSPredicate(format: "placeholderValue BEGINSWITH 'Name, phone' OR placeholderValue BEGINSWITH 'Tên'")).firstMatch
    }

    /// Home → search the product by name → open its detail. True when "Add to cart" shows.
    func openProduct(named name: String) -> Bool {
        tapTab(["Home", "Trang chủ"], index: 0)
        let search = field(["Name, barcode…", "Tên, mã vạch…"])
        guard search.waitForExistence(timeout: 10) else { return false }
        search.tap()
        search.clearText()
        search.typeText(name + "\n")
        sleep(3)
        let row = app.cells.containing(NSPredicate(format: "label CONTAINS %@", name)).firstMatch
        let text = app.staticTexts[name]
        if row.waitForExistence(timeout: 5) { tapRow(row) } else if text.exists { text.tap() } else { return false }
        return button(["Add to cart", "Thêm vào giỏ"]).waitForExistence(timeout: 10)
    }

    /// In the customer picker: "Khách mới" → phone + name → "Lưu và chọn". Returns the name, or nil.
    func createCustomerInPicker(name: String, phone: String) -> String? {
        let row = element(labelBeginsWith: ["Choose customer", "Chọn khách hàng"])
        guard row.waitForExistence(timeout: 5) else { note("Customer row not found"); return nil }
        row.tap()
        let new = element(labelBeginsWith: ["New customer", "Khách mới"])
        guard new.waitForExistence(timeout: 8) else { note("Khách mới not in picker"); return nil }
        new.tap()
        guard type(into: ["Phone number", "Số điện thoại"], text: phone) else { note("phone field"); return nil }
        _ = type(into: ["Full name", "Họ và tên"], text: name)
        shot("23a-cart-new-customer")
        let save = button(["Save and select", "Lưu và chọn"])
        guard save.waitForExistence(timeout: 3) else { note("Lưu và chọn missing"); return nil }
        save.tap()
        sleep(3)
        dismissAlerts()
        return element(labelBeginsWith: [name]).exists ? name : name
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

    /// Orders tab header button that switches Đơn thuê ↔ Đơn bán ("Sales" / "Đơn bán" while on rentals).
    var saleModeButton: XCUIElement {
        button(["Sales", "Đơn bán", "Sale"])
    }

    /// Sort button on Tất cả đơn ("Newest first ⌄"); it opens the filter sheet.
    var sortButton: XCUIElement {
        element(labelBeginsWith: ["Newest first", "Nearest task", "Hand-over date", "Return date",
                                  "Mới tạo nhất", "Việc gần nhất", "Ngày giao gần nhất", "Ngày trả gần nhất"],
                type: .button)
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

    /// Leave a pushed screen. Order and calendar details hide the tab bar and use an unlabeled arrow, so
    /// when the tab bar is hidden keep trying (labeled back, nav bar, top-left arrow, edge swipe) until it shows.
    func goBack() {
        let tabBar = app.tabBars.firstMatch
        let tabBarWasVisible = tabBar.exists && tabBar.isHittable
        let back = app.buttons.matching(NSPredicate(format: "label IN %@",
            ["Back", "Quay lại", "Back to products", "Quay lại chọn sản phẩm"])).firstMatch
        for attempt in 0..<4 {
            if back.exists && back.isHittable && attempt == 0 {
                back.tap()
            } else if attempt <= 1, app.navigationBars.buttons.firstMatch.exists,
                      app.navigationBars.buttons.firstMatch.isHittable {
                app.navigationBars.buttons.firstMatch.tap()
            } else if attempt == 2 {
                app.coordinate(withNormalizedOffset: CGVector(dx: 0.067, dy: 0.087)).tap()
            } else {
                app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.5))
                    .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.8, dy: 0.5)))
            }
            sleep(1)
            if tabBarWasVisible || (tabBar.exists && tabBar.isHittable) { return }
        }
        note("goBack: tab bar still hidden after 4 attempts")
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
        // The v2 picker uses a text field ("Name or phone number"), the old one a search field.
        let v2Search = field(["Name or phone number", "Tên hoặc số điện thoại"])
        let search = v2Search.waitForExistence(timeout: 8) ? v2Search : app.searchFields.firstMatch
        guard search.waitForExistence(timeout: 2) else {
            XCTFail("Customer picker did not open")
            return nil
        }
        sleep(2)
        let top = search.frame.maxY
        // Skip the "Khách mới" / "New customer" row at the top of the v2 picker.
        let newLabels = ["New customer", "Khách mới"]
        let cell = app.cells.allElementsBoundByIndex.first { cell in
            cell.frame.minY >= top && cell.isHittable
                && !newLabels.contains(where: { cell.label.hasPrefix($0) })
                && !cell.staticTexts.allElementsBoundByIndex.contains(where: { newLabels.contains($0.label) })
        }
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
        sleep(1)
        shot("\(shotPrefix)-after-create-tap")
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
        let created = backHome && !cartBar.exists
        if !created, let alert = lastAlert { note("Order not created; last alert: \(alert)") }
        return created
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

    static let vietnameseName = "Nguyễn Văn Kiểm Thử"
    static let vietnameseQuery = "nguyen van kiem"

    static func uniquePhone() -> String {
        String(format: "09%08d", Int(Date().timeIntervalSince1970 * 10) % 100_000_000)
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
        // Put the caret at the end first: a plain tap can land mid-text and leave a tail behind.
        coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.5)).tap()
        typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count + 4))
    }
}
