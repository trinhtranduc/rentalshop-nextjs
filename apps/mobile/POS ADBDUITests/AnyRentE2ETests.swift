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
//  #530 added the screens from #482 #490 #491 #496 #518 #519: test5c/5d (⋯ sheet, order history), test7d–7j
//  (product history, overlap setting, pricing sheet, change password, orders by product, notifications, today's work).
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
            // Exact label: the explanation under the options also begins with "Việc gần nhất:"
            let nearest = e2e.button(["Nearest task", "Việc gần nhất"])
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
        // Order numbers are 6 random digits (seeded ones read #0001): search the number of the first listed row.
        let firstCell = app.cells.firstMatch
        let firstRow = firstCell.waitForExistence(timeout: 5)
            ? ([firstCell.label] + firstCell.staticTexts.allElementsBoundByIndex.map(\.label)).joined(separator: " ") : ""
        let listedNumber = firstRow.components(separatedBy: "#").dropFirst().first?
            .components(separatedBy: CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-")).inverted).first ?? ""
        e2e.soft(!listedNumber.isEmpty, "a listed order shows its number (#…)")
        for (query, shot) in [(listedNumber.isEmpty ? "0001" : listedNumber, "44-orders-search-code"), ("555-1006", "45-orders-search-phone"),
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
        // Show both passwords first: a visible field gets no "Use Strong Password" autofill, which otherwise
        // paints the secure fields yellow and drops what we type (the form then says the password is missing).
        let showToggles = app.buttons.matching(NSPredicate(format: "label IN %@", ["Show password", "Hiện mật khẩu"]))
        for _ in 0..<2 where showToggles.firstMatch.exists { showToggles.firstMatch.tap() }
        let typedNew = e2e.type(into: ["Password", "Mật khẩu"], text: "e2e123456")
        let typedConfirm = e2e.type(into: ["Re-enter password", "Nhập lại mật khẩu"], text: "e2e123456")
        if !(typedNew && typedConfirm) {
            let secure = app.secureTextFields
            if secure.count >= 2 {
                e2e.typeSecure(secure.element(boundBy: 0), "e2e123456")
                e2e.typeSecure(secure.element(boundBy: 1), "e2e123456")
            }
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

        // Print from the ⋯ action sheet (#519: the header keeps only ⋯).
        let more = e2e.button(["More actions", "Thêm thao tác"])
        if more.waitForExistence(timeout: 5) {
            more.tap()
            sleep(1)
            e2e.shot("5a2-detail-action-sheet")
        }
        let print = e2e.button(["Print receipt", "In hóa đơn", "In hoá đơn", "In biên nhận"])
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
        sleep(4)
        e2e.shot("70-overview")
        // #616: period chips, four tiles that open a detail sheet, Thực thu theo ngày, Hôm nay
        let week = e2e.element(labelBeginsWith: ["7 days", "7 ngày"], type: .button)
        if e2e.role == "merchant" {
            XCTAssertTrue(week.waitForExistence(timeout: 8), "Period chips on Overview")
        }
        e2e.soft(e2e.element(labelBeginsWith: ["Today", "Hôm nay"], type: .staticText).exists, "Hôm nay card")
        guard week.waitForExistence(timeout: 2) else { return }
        let collected = e2e.element(labelBeginsWith: ["Collected", "Thực thu"], type: .button)
        XCTAssertTrue(collected.waitForExistence(timeout: 8), "Thực thu tile")
        collected.tap()
        sleep(2)
        e2e.soft(e2e.element(labelBeginsWith: ["See these orders", "Xem các đơn liên quan"], type: .button).waitForExistence(timeout: 5),
                 "detail sheet links to the orders")
        e2e.shot("71-overview-sheet-collected")
        e2e.tapIfExists(e2e.button(["Close", "Đóng"]), timeout: 3)
        sleep(1)
        app.swipeUp()
        sleep(1)
        e2e.shot("72-overview-today-card")
        app.swipeDown()
        sleep(1)
        week.tap()
        sleep(3)
        e2e.soft(week.isSelected, "7 ngày chip is selected")
        e2e.shot("73-overview-7-days")
        e2e.element(labelBeginsWith: ["Today", "Hôm nay"], type: .button).tap()
        sleep(3)
        e2e.shot("74-overview-today")
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
        // A product with an upcoming or renting order: delete must answer 409 PRODUCT_HAS_OPEN_ORDERS and keep
        // the screen. Seed ids move on every reseed, so pick by the detail's "Sắp tới" / "Đang thuê" counts.
        guard e2e.openProduct(where: { $0 > 0 }) != nil else { return XCTFail("No product with open orders") }
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
        guard e2e.openProduct(where: { $0 == 0 }) != nil else { return XCTFail("No product without open orders") }
        e2e.button(["Delete product", "Xóa sản phẩm", "Delete", "Xóa"]).tap()
        let ok = app.sheets.buttons.matching(NSPredicate(format: "label IN %@", ["Delete product", "Xóa sản phẩm"])).firstMatch
        if ok.waitForExistence(timeout: 5) { ok.tap() }
        sleep(3)
        e2e.dismissAlerts()
        e2e.shot("7g-product-deleted")
        // Back on the product list; the search still holds the deleted product's name, so "no match" also counts.
        let noMatch = e2e.element(labelBeginsWith: ["No products match", "Không có sản phẩm nào khớp"])
        e2e.soft(app.tables.cells.firstMatch.waitForExistence(timeout: 8) || noMatch.exists,
                 "back on the product list after delete")
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

    // MARK: - Screens that landed on dev with #482 #490 #491 #496 #518 #519 (#530)

    /// ⋯ on the order detail opens a sheet (board CT-thao-tac), not a UIMenu: In hoá đơn, Ghi chú, Lịch sử thay đổi,
    /// then Huỷ đơn apart. Actions the screen already shows as buttons are not repeated in it.
    func test5cOrderActionSheet() throws {
        try e2e.requireFlag("newOrders")
        try e2e.requireFlag("newOrderDetail")
        try e2e.requireRole("merchant")
        try e2e.start()

        // A booked rental: the bottom bar has Sửa đơn + Giao đồ
        guard e2e.openFirstOrder(chip: ["Booked", "Đã đặt"]) else { return XCTFail("No booked order to open") }
        checkOrderSheet(onScreen: [["Edit order", "Sửa đơn"]], onScreenPrefixes: [["Hand over", "Giao đồ"]],
                        expected: [["Print receipt", "In hoá đơn"], ["Notes", "Ghi chú"], ["Change history", "Lịch sử thay đổi"]],
                        destructive: ["Cancel order", "Huỷ đơn"], shotPrefix: "47a-order-sheet-booked")
        e2e.goBack()

        // A renting order: Gia hạn + Nhận trả on screen
        guard e2e.openFirstOrder(chip: ["Renting", "Đang thuê"]) else { return XCTFail("No renting order to open") }
        checkOrderSheet(onScreen: [["Extend", "Gia hạn"]], onScreenPrefixes: [["Take back", "Nhận trả"]],
                        expected: [["Print receipt", "In hoá đơn"], ["Notes", "Ghi chú"], ["Change history", "Lịch sử thay đổi"]],
                        destructive: ["Cancel order", "Huỷ đơn"], shotPrefix: "47b-order-sheet-renting")
        XCTAssertFalse(e2e.button(["Edit order", "Sửa đơn"]).exists, "A renting order is not editable: no Sửa đơn in the sheet")
        e2e.goBack()
    }

    /// Opens ⋯ on the open detail and checks the sheet against the buttons the screen shows
    private func checkOrderSheet(onScreen: [[String]], onScreenPrefixes: [[String]], expected: [[String]],
                                 destructive: [String], shotPrefix: String) {
        // Buttons of the screen before the sheet opens (the bottom bar)
        let exact: ([String]) -> Int = { self.app.buttons.matching(NSPredicate(format: "label IN %@", $0)).count }
        let prefix: ([String]) -> Int = { labels in
            self.app.buttons.matching(NSCompoundPredicate(orPredicateWithSubpredicates:
                labels.map { NSPredicate(format: "label BEGINSWITH %@", $0) })).count
        }
        let before = onScreen.map(exact) + onScreenPrefixes.map(prefix)
        XCTAssertTrue(before.allSatisfy { $0 >= 1 }, "\(shotPrefix): the bottom bar shows \(onScreen + onScreenPrefixes) (\(before))")
        e2e.shot("\(shotPrefix)-detail")

        let more = e2e.orderMoreButton
        guard e2e.openOrderSheet() else { return XCTFail("\(shotPrefix): ⋯ does not open the sheet titled Đơn #…") }
        sleep(1)
        e2e.shot("\(shotPrefix)-sheet")
        // A sheet has its own title and a close button; a UIMenu has neither
        XCTAssertTrue(e2e.button(["Close", "Đóng"]).exists, "\(shotPrefix): the sheet has a close button")

        var frames: [CGRect] = []
        for labels in expected {
            let row = e2e.button(labels)
            XCTAssertTrue(row.exists, "\(shotPrefix): sheet lists \(labels)")
            frames.append(row.exists ? row.frame : .zero)
        }
        let cancel = e2e.button(destructive)
        XCTAssertTrue(cancel.exists, "\(shotPrefix): sheet lists \(destructive) (destructive)")
        if cancel.exists, let last = frames.last, last != .zero {
            XCTAssertGreaterThan(cancel.frame.minY - last.maxY, 4, "\(shotPrefix): Huỷ đơn sits apart from the other rows")
        }
        XCTAssertEqual(frames.map(\.minY), frames.map(\.minY).sorted(), "\(shotPrefix): rows in the order In hoá đơn, Ghi chú, Lịch sử")

        // Not repeated: the count of those labels does not grow while the sheet is up. When the screen under the
        // sheet is hidden from accessibility, any match must be a sheet row.
        let underVisible = more.exists
        let after = onScreen.map(exact) + onScreenPrefixes.map(prefix)
        for (index, count) in after.enumerated() {
            let labels = (onScreen + onScreenPrefixes)[index]
            XCTAssertEqual(count, underVisible ? before[index] : 0, "\(shotPrefix): the sheet does not repeat \(labels)")
        }
        e2e.button(["Close", "Đóng"]).tap()
        XCTAssertTrue(e2e.orderSheetTitle.waitForNonExistence(timeout: 5), "\(shotPrefix): the sheet closes")
    }

    /// Lịch sử thay đổi of an order (board LS-don): a new order shows "Tạo đơn" under today; a note and a hand-over
    /// add entries, the hand-over with the status old → new.
    func test5dOrderChangeHistory() throws {
        try e2e.requireFlag("newOrders")
        try e2e.requireFlag("newOrderDetail")
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        guard e2e.openCartWithOneItem() else { return XCTFail("Could not open the cart with an item") }
        e2e.cartRentToday()
        _ = e2e.pickFirstCustomer()
        guard e2e.createOrderFromCart(cta: E2E.rentCta, shotPrefix: "48a-history-order", openOrder: true) else {
            return XCTFail("Rent order was not created (last alert: \(e2e.lastAlert ?? "none"))")
        }
        let number = e2e.lastCreatedOrderNumber ?? ""
        XCTAssertTrue(e2e.orderMoreButton.waitForExistence(timeout: 10), "Xem đơn opens the new order")

        XCTAssertTrue(e2e.tapOrderSheetRow(["Change history", "Lịch sử thay đổi"]), "⋯ → Lịch sử thay đổi")
        let title = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Change history", "Lịch sử thay đổi"])).firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 8), "History screen opens")
        sleep(2)
        e2e.soft(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "#" + number)).firstMatch.exists,
                 "history subtitle names order #\(number)")
        let today = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'HÔM NAY' OR label BEGINSWITH 'TODAY'")).firstMatch
        XCTAssertTrue(today.waitForExistence(timeout: 5), "entries are grouped by day, today first")
        let created = app.cells.matching(NSPredicate(format: "label BEGINSWITH 'Tạo đơn' OR label BEGINSWITH 'Order created'")).firstMatch
        XCTAssertTrue(created.waitForExistence(timeout: 5), "the history has the creation entry")
        e2e.shot("48b-history-created")
        e2e.goBackOnce()

        // A note through ⋯ → Ghi chú
        let stamp = "E2E note \(Int(Date().timeIntervalSince1970) % 100_000)"
        if e2e.tapOrderSheetRow(["Notes", "Ghi chú"]) {
            let text = app.textViews.firstMatch
            if text.waitForExistence(timeout: 5) {
                text.tap()
                text.typeText(stamp)
                e2e.tapIfExists(e2e.button(["Done", "Xong"]), timeout: 2)
                e2e.shot("48c-history-note-editor")
                e2e.tapIfExists(e2e.button(["Save note", "Lưu ghi chú"]), timeout: 3)
                sleep(3)
                e2e.dismissAlerts()
            } else {
                e2e.soft(false, "note editor has a text view")
            }
        }

        // Hand over: RESERVED → PICKUPED, an entry with "Trạng thái: Đã đặt thành Đang thuê"
        let handOver = e2e.element(labelBeginsWith: ["Hand over", "Giao đồ"], type: .button)
        if handOver.waitForExistence(timeout: 8) {
            handOver.tap()
            let handed = e2e.element(labelBeginsWith: ["Handed over", "Đã giao"], type: .button)
            if handed.waitForExistence(timeout: 8) { handed.tap() }
            sleep(3)
            e2e.dismissAlerts()
        } else {
            XCTFail("The new order offers Giao đồ")
        }

        XCTAssertTrue(e2e.tapOrderSheetRow(["Change history", "Lịch sử thay đổi"]), "⋯ → Lịch sử thay đổi again")
        XCTAssertTrue(title.waitForExistence(timeout: 8), "History screen opens again")
        sleep(3)
        let note = app.cells.matching(NSPredicate(format: "label CONTAINS %@", stamp)).firstMatch
        XCTAssertTrue(note.waitForExistence(timeout: 5), "the note edit is in the history")
        let status = app.cells.matching(NSPredicate(format:
            "(label CONTAINS 'Trạng thái: ' AND label CONTAINS ' thành ') OR (label CONTAINS 'Status: ' AND label CONTAINS ' to ')")).firstMatch
        XCTAssertTrue(status.waitForExistence(timeout: 5), "the hand-over shows the status old → new")
        if status.exists { e2e.note("history status entry: \(status.label)") }
        e2e.soft(app.cells.count >= 3, "history lists creation, note and hand-over (\(app.cells.count) rows)")
        e2e.shot("48d-history-after-edits")
        e2e.goBackOnce()
        e2e.goBack()
    }

    /// Lịch sử thay đổi of a product (board LS-san-pham): a daily-price edit shows old → new. The price is put back.
    func test7dProductChangeHistory() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        let key = "Product 25 -"
        guard e2e.openProduct(named: key) else { return XCTFail("\(key) not found") }
        // Two edits (seed products may have no daily price): 77.000, then 88.000, so the second entry has old → new
        guard let old = editDailyPrice(to: "77000", shot: nil) else {
            return XCTFail("Could not change the daily price of \(key)")
        }
        XCTAssertNotNil(editDailyPrice(to: "88000", shot: "15a-product-price-edit"), "second daily-price edit saves")
        XCTAssertTrue(e2e.button(["Add to cart", "Thêm vào giỏ"]).waitForExistence(timeout: 10), "Back on the product detail after saving")

        let history = app.descendants(matching: .any)["product.detail.history"]
        XCTAssertTrue(e2e.scrollTo(history), "Product detail has Lịch sử thay đổi")
        history.tap()
        let title = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Change history", "Lịch sử thay đổi"])).firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 8), "Product history opens")
        sleep(3)
        let entry = app.cells.matching(NSPredicate(format: "label CONTAINS '88.000'")).firstMatch
        XCTAssertTrue(entry.waitForExistence(timeout: 5), "history shows the new daily price 88.000")
        if entry.exists {
            e2e.note("product history entry: \(entry.label)")
            XCTAssertTrue(["Sửa giá", "Price changed"].contains { entry.label.hasPrefix($0) },
                          "the price edit is titled Sửa giá (\(entry.label))")
            XCTAssertTrue(entry.label.contains("77.000đ thành 88.000đ") || entry.label.contains("77.000đ to 88.000đ"),
                          "the entry shows the daily price old → new (\(entry.label))")
        }
        e2e.shot("15b-product-history")
        e2e.goBackOnce()

        // Put the price back
        if editDailyPrice(to: old, shot: nil) == nil { XCTFail("Could not restore the daily price of \(key) to '\(old)'") }
        e2e.goBackOnce()
    }

    /// Product detail → Sửa → "Thuê theo ngày" → new value → Lưu thay đổi. Returns the value the field had (may be "").
    private func editDailyPrice(to value: String, shot: String?) -> String? {
        let edit = e2e.button(["Edit product", "Sửa sản phẩm", "Edit", "Sửa"])
        guard edit.waitForExistence(timeout: 5) else { e2e.note("no Sửa on product detail"); return nil }
        edit.tap()
        let field = e2e.field(["Rent per day", "Thuê theo ngày"])
        guard field.waitForExistence(timeout: 8) else { e2e.note("no Thuê theo ngày field"); return nil }
        e2e.scrollTo(field)
        let raw = field.value as? String ?? ""
        let old = (raw == field.placeholderValue || raw == "0") ? "" : raw
        field.tap()
        field.clearText()
        if !value.isEmpty { field.typeText(value) }
        e2e.hideKeyboard()
        if let shot { e2e.shot(shot) }
        let save = e2e.button(["Save changes", "Lưu thay đổi"])
        e2e.scrollTo(save)
        guard save.exists else { e2e.note("no Lưu thay đổi"); return nil }
        save.tap()
        sleep(3)
        e2e.dismissAlerts()
        guard field.waitForNonExistence(timeout: 10) else { e2e.note("product form stayed open"); return nil }
        return old
    }

    /// "Cho tạo đơn khi trùng lịch" (#518, boards CD-trung-lich, GH-trung-bat, GH-trung-tat). A rental takes every unit
    /// of a product today; a second cart for it today shows the clash. ON: "Vẫn tạo đơn" in the confirm sheet.
    /// OFF: the blocked notice and a disabled Tạo đơn. The setting is turned back ON whatever happens.
    func test7eOverlapSetting() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireFlag("newSettings")
        try e2e.requireRole("merchant")
        try e2e.start()
        // Runs after the method even when an assertion fails (the UI test target is built for iOS 12.2)
        if #available(iOS 13.0, *) {
            addTeardownBlock { [app = app!, e2e = e2e!] in
                if !app.tabBars.firstMatch.exists { app.launch(); e2e.settle(seconds: 6) }
                if e2e.setOverlapAllowed(true) != true { XCTFail("Could not turn Cho tạo đơn khi trùng lịch back ON") }
                e2e.emptyCart()
            }
        }
        XCTAssertEqual(e2e.setOverlapAllowed(true), true, "Cho tạo đơn khi trùng lịch is ON")
        e2e.shot("33a-overlap-setting-on")
        e2e.emptyCart()

        // 1. A rental today that takes every free unit (+ until the line says "Chỉ còn N trống")
        let key = "Product 2 -"
        guard e2e.addToCartAndOpen(product: key) else { return XCTFail("Could not put \(key) in the cart") }
        e2e.cartRentToday()
        let plus = e2e.button(["One more", "Thêm 1"])
        let short = app.staticTexts.matching(NSPredicate(format:
            "label CONTAINS 'trống trong ngày' OR label CONTAINS 'free on these dates' OR label BEGINSWITH ' Hết đồ' OR label BEGINSWITH ' Booked out' OR label BEGINSWITH 'Hết đồ' OR label BEGINSWITH 'Booked out'")).firstMatch
        for _ in 0..<40 where !short.exists {
            guard plus.exists else { break }
            plus.tap()
            sleep(1)
        }
        e2e.soft(short.waitForExistence(timeout: 3), "the line says the stock runs out")
        e2e.shot("33b-overlap-first-order-cart")
        _ = e2e.pickFirstCustomer()
        guard e2e.createOrderFromCart(cta: E2E.rentCta, shotPrefix: "33c-overlap-first") else {
            return XCTFail("The order taking all stock was not created (last alert: \(e2e.lastAlert ?? "none"))")
        }
        let firstNumber = e2e.lastCreatedOrderNumber ?? ""

        // 2. Same product, same day: the line shows the clash; the confirm sheet warns and reads "Vẫn tạo đơn"
        guard e2e.addToCartAndOpen(product: key) else { return XCTFail("Could not put \(key) in the cart again") }
        e2e.cartRentToday()
        let clash = app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Hết đồ' OR label CONTAINS 'Booked out'")).firstMatch
        XCTAssertTrue(clash.waitForExistence(timeout: 10), "the cart line shows Hết đồ … · đã thuê ở đơn #…")
        if clash.exists {
            e2e.soft(firstNumber.isEmpty || clash.label.contains(firstNumber), "clash names order #\(firstNumber) (\(clash.label))")
        }
        _ = e2e.pickFirstCustomer()
        e2e.shot("33d-overlap-on-cart")
        let cta = e2e.button(["Create order", "Tạo đơn"])
        XCTAssertTrue(cta.waitForExistence(timeout: 5) && cta.isEnabled, "Tạo đơn is enabled with the setting ON")
        cta.tap()
        let anyway = e2e.button(["Create anyway", "Vẫn tạo đơn"])
        XCTAssertTrue(anyway.waitForExistence(timeout: 10), "the confirm sheet's button reads Vẫn tạo đơn")
        e2e.soft(app.descendants(matching: .any).matching(NSPredicate(format:
            "label BEGINSWITH 'Trùng lịch' OR label BEGINSWITH 'Schedule overlap'")).firstMatch.exists, "the sheet has the Trùng lịch block")
        e2e.shot("33e-overlap-on-confirm")
        e2e.tapIfExists(e2e.button(["Cancel", "Hủy", "Huỷ"]), timeout: 3)
        sleep(1)

        // 3. OFF: the same cart is blocked
        XCTAssertEqual(e2e.setOverlapAllowed(false), false, "Cho tạo đơn khi trùng lịch turns OFF")
        e2e.shot("33f-overlap-setting-off")
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        XCTAssertTrue(e2e.cartBar.waitForExistence(timeout: 5), "the cart is kept")
        e2e.cartBar.tap()
        sleep(3)
        let blocked = app.descendants(matching: .any).matching(NSPredicate(format:
            "label BEGINSWITH 'Cửa hàng không cho tạo đơn trùng lịch' OR label BEGINSWITH 'This shop does not allow overlapping'")).firstMatch
        XCTAssertTrue(blocked.waitForExistence(timeout: 10), "the cart shows the blocked notice")
        let ctaOff = e2e.button(["Create order", "Tạo đơn"])
        XCTAssertTrue(ctaOff.waitForExistence(timeout: 3), "Tạo đơn button")
        XCTAssertFalse(ctaOff.isEnabled, "Tạo đơn is disabled with the setting OFF")
        e2e.shot("33g-overlap-off-cart")
        e2e.goBackOnce()
        // The teardown block turns the setting back ON and empties the cart
    }

    /// Cart line pricing chip → "Cách tính giá" (#482, board Gio-hang-chon-gia): Theo ngày with a price for this order
    /// only. The line total follows; the catalog price shown in the sheet stays.
    func test7fCartPricingSheet() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        e2e.emptyCart()
        guard e2e.openCartWithOneItem() else { return XCTFail("Could not open the cart with an item") }
        e2e.cartRentToday()
        let chip = e2e.element(labelBeginsWith: ["Change pricing for", "Đổi cách tính giá"], type: .button)
        XCTAssertTrue(chip.waitForExistence(timeout: 5), "a rent line has the pricing chip")
        e2e.shot("34a-cart-pricing-chip")
        chip.tap()
        let title = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Pricing", "Cách tính giá"])).firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 5), "the chip opens Cách tính giá")
        let perRental = e2e.element(labelBeginsWith: ["Per rental", "Theo lần"], type: .button)
        let perDay = e2e.element(labelBeginsWith: ["Per day", "Theo ngày"], type: .button)
        XCTAssertTrue(perRental.exists && perDay.exists, "the sheet lists Theo lần and Theo ngày")
        let catalogPerDay = perDay.exists ? perDay.label : ""
        e2e.shot("34b-cart-pricing-sheet")
        perDay.tap()
        sleep(1)
        let price = e2e.field(["Price for this order", "Giá cho đơn này"])
        XCTAssertTrue(price.waitForExistence(timeout: 3), "Giá cho đơn này field")
        price.tap()
        price.clearText()
        price.typeText("123456")
        XCTAssertEqual(price.value as? String, "123.456", "the price field formats the amount")
        e2e.shot("34c-cart-pricing-edited")
        let apply = e2e.button(["Apply", "Áp dụng"])
        if !apply.isHittable { app.scrollViews.firstMatch.swipeUp(); sleep(1) }
        XCTAssertTrue(apply.isHittable, "Áp dụng is reachable with the keyboard up")
        apply.tap()
        sleep(2)
        let total = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH '123.456'")).firstMatch
        XCTAssertTrue(total.waitForExistence(timeout: 5), "the line total becomes 123.456đ (1 day × 1)")
        XCTAssertTrue(((chip.value as? String) ?? "").contains("123.456"), "the chip shows the order price (\(chip.value ?? ""))")
        e2e.shot("34d-cart-pricing-applied")

        // The product's own price is unchanged: the sheet still shows the catalog price on Theo ngày
        chip.tap()
        XCTAssertTrue(title.waitForExistence(timeout: 5), "the sheet opens again")
        let perDayAgain = e2e.element(labelBeginsWith: ["Per day", "Theo ngày"], type: .button)
        XCTAssertEqual(perDayAgain.label, catalogPerDay, "the catalog daily price stays (only this order changed)")
        e2e.shot("34e-cart-pricing-catalog-kept")
        title.swipeDown()
        sleep(1)
        e2e.goBackOnce()
        e2e.emptyCart()
    }

    /// Cài đặt → Đổi mật khẩu (#490 #491, board DMK-doi-mat-khau): a bottom sheet; an empty submit shows the error
    /// under "Mật khẩu hiện tại". The password is never changed.
    func test7gChangePasswordSheet() throws {
        try e2e.requireFlag("newSettings")
        try e2e.start()
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        sleep(2)
        let row = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Change Password", "Đổi mật khẩu"])).firstMatch
        XCTAssertTrue(e2e.scrollTo(row), "Đổi mật khẩu row in Settings")
        row.tap()
        let fields = app.secureTextFields
        XCTAssertTrue(fields.firstMatch.waitForExistence(timeout: 5), "the sheet opens with password fields")
        XCTAssertEqual(fields.count, 3, "Mật khẩu hiện tại, Mật khẩu mới, Nhập lại mật khẩu mới")
        e2e.soft(app.tabBars.firstMatch.exists, "the sheet sits over Cài đặt (tab bar still there)")
        sleep(2)
        e2e.note("password sheet: keyboard \(app.keyboards.firstMatch.exists ? "up" : "down")")
        e2e.shot("83a-password-sheet")
        // Board DMK-doi-mat-khau: the sheet fits its content, title and close button fully on screen
        let sheetTitle = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Change Password", "Đổi mật khẩu"]))
            .allElementsBoundByIndex.first { $0.frame.minY < fields.firstMatch.frame.minY }
        let close = e2e.button(["Close", "Đóng"])
        let top = app.windows.firstMatch.frame.minY + 50 // below the status bar
        XCTAssertTrue((sheetTitle?.frame.minY ?? 0) >= top, "the sheet title is not cut off at the top (y \(Int(sheetTitle?.frame.minY ?? -1)))")
        XCTAssertTrue(close.exists && close.frame.minY >= top, "the close button is not cut off at the top (y \(Int(close.frame.minY)))")
        let submit = e2e.button(["Change password", "Change Password", "Đổi mật khẩu"])
        XCTAssertTrue(submit.exists && submit.isHittable, "Đổi mật khẩu button is reachable with the keyboard up")
        submit.tap()
        sleep(1)
        let error = app.staticTexts.matching(NSPredicate(format: "label IN %@",
            ["Enter your current password", "Nhập mật khẩu hiện tại"])).firstMatch
        XCTAssertTrue(error.waitForExistence(timeout: 3), "an empty submit shows Nhập mật khẩu hiện tại")
        if error.exists, fields.count >= 2 {
            XCTAssertTrue(error.frame.minY >= fields.element(boundBy: 0).frame.maxY - 1
                          && error.frame.maxY <= fields.element(boundBy: 1).frame.minY,
                          "the error sits under the current-password field")
        }
        e2e.shot("83b-password-empty-error")
        e2e.button(["Close", "Đóng"]).tap()
        XCTAssertTrue(fields.firstMatch.waitForNonExistence(timeout: 5), "the sheet closes")
    }

    /// Tổng quan → a top product → "Đơn theo sản phẩm" (#482, board DT-don-theo-sp): photo, name, sub line, period chip,
    /// 3 tiles and the ĐƠN HÀNG rows. "Đơn theo khách hàng" (DT-don-theo-kh) where the app links it.
    func test7hOrdersByProductAndCustomer() throws {
        try e2e.requireFlag("newOverview")
        try e2e.requireRole("merchant")
        try e2e.start()
        guard e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3) else { return XCTFail("No Tổng quan tab") }
        sleep(3)
        let top = app.buttons.matching(NSPredicate(format: "label CONTAINS ' lượt thuê' OR label CONTAINS ' rentals,'")).firstMatch
        if e2e.scrollTo(top, maxSwipes: 8) {
            e2e.shot("63a-overview-top-products")
            top.tap()
        } else {
            // Without a ranking: product detail → "Tất cả N ›"
            e2e.note("no top product on Tổng quan; using product detail")
            guard e2e.openProduct(where: { $0 > 0 }) != nil else { return XCTFail("No product with orders") }
            let all = e2e.element(labelBeginsWith: ["All ", "Tất cả "], type: .button)
            XCTAssertTrue(e2e.scrollTo(all), "Tất cả N › on product detail")
            all.tap()
        }
        checkEntityOrders(title: ["Orders by product", "Đơn theo sản phẩm"],
                          tiles: [["Orders, ", "Số đơn, "], ["Rentals, ", "Lượt thuê, "], ["Revenue, ", "Doanh thu, "]],
                          shot: "63b-orders-by-product")
        e2e.goBack()

        // Đơn theo khách hàng: the v2 screens (newCustomers) have no link to it; the old picker's ⋯ → Xem đơn hàng does
        if e2e.features.contains("newCustomers") {
            e2e.note("NOT COVERED: Đơn theo khách hàng has no entry point with newCustomers on (customer detail v2 and "
                     + "Tổng quan do not link it)")
            return
        }
        guard e2e.openCartWithOneItem() else { return XCTFail("Could not open the cart") }
        let pick = e2e.element(labelBeginsWith: ["Choose customer", "Chọn khách hàng"])
        guard pick.waitForExistence(timeout: 5) else { return XCTFail("Customer row in the cart") }
        pick.tap()
        sleep(3)
        let more = app.cells.firstMatch.buttons.allElementsBoundByIndex.last
        guard let more else { return XCTFail("customer row ⋯") }
        more.tap()
        e2e.tapIfExists(e2e.button(["View orders", "Xem đơn hàng"]), timeout: 3)
        checkEntityOrders(title: ["Orders by customer", "Đơn theo khách hàng"],
                          tiles: [["Orders, ", "Số đơn, "], ["Spent, ", "Đã chi, "], ["Renting, ", "Đang thuê, "]],
                          shot: "64-orders-by-customer")
        e2e.goBackOnce()
    }

    private func checkEntityOrders(title: [String], tiles: [[String]], shot: String) {
        let header = app.staticTexts.matching(NSPredicate(format: "label IN %@", title)).firstMatch
        XCTAssertTrue(header.waitForExistence(timeout: 10), "\(shot): \(title) opens")
        sleep(3)
        for labels in tiles {
            XCTAssertTrue(e2e.element(labelBeginsWith: labels).exists, "\(shot): tile \(labels)")
        }
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label IN %@", ["ORDERS", "ĐƠN HÀNG"])).firstMatch.exists,
                      "\(shot): ĐƠN HÀNG band")
        // Period chip: "Tất cả thời gian", "30 ngày qua · …" or a day
        let chip = app.buttons.matching(NSPredicate(format:
            "label CONTAINS 'thời gian' OR label CONTAINS 'All time' OR label CONTAINS 'ngày' OR label CONTAINS 'days' OR label CONTAINS '/'")).firstMatch
        e2e.soft(chip.exists, "\(shot): period chip")
        XCTAssertGreaterThan(app.cells.count, 0, "\(shot): order rows")
        e2e.shot(shot)
    }

    /// The bell on Trang chủ → Thông báo (#482): the list renders and long titles wrap instead of ending in "…"
    func test7iNotifications() throws {
        try e2e.requireFlag("newProducts")
        try e2e.start()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        let bell = e2e.button(["Notifications", "Thông báo"])
        XCTAssertTrue(bell.waitForExistence(timeout: 8), "bell on Trang chủ")
        bell.tap()
        sleep(3)
        let title = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Notifications", "Thông báo"])).firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 8), "Thông báo opens")
        let empty = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["No notifications", "Chưa có thông báo"])).firstMatch
        let rows = app.cells
        XCTAssertTrue(rows.firstMatch.waitForExistence(timeout: 5) || empty.exists, "notification rows or the empty state")
        e2e.soft(rows.count > 0, "notifications listed (\(rows.count))")
        // A label whose text needs more than one line must be taller than one line (a truncated one is not)
        // A long title or body must wrap: taller than one line and inside the screen (not cut or run off the edge)
        let screenRight = app.windows.firstMatch.frame.maxX
        for cell in rows.allElementsBoundByIndex.prefix(6) where cell.exists {
            for text in cell.staticTexts.allElementsBoundByIndex where text.label.count > 60 {
                let oneLine: CGFloat = 26
                XCTAssertTrue(text.frame.height > oneLine && text.frame.maxX <= screenRight + 1,
                              "long notification text wraps: '\(text.label.prefix(40))…' is \(Int(text.frame.height))pt tall, "
                              + "right edge \(Int(text.frame.maxX)) of \(Int(screenRight))")
            }
        }
        e2e.shot("16-notifications")
        e2e.goBackOnce()
    }

    /// Tổng quan → "Việc hôm nay" (#496): Cần giao / Cần nhận trả hôm nay rows open Đơn hàng; "Quá ngày lấy, khách chưa
    /// đến" opens "Chưa lấy đồ" (board DT-chua-lay).
    func test7jTodayWorkAndNotPickedUp() throws {
        try e2e.requireFlag("newOverview")
        try e2e.start()
        guard e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3) else {
            throw XCTSkip("No Tổng quan tab for this account")
        }
        sleep(3)
        let header = e2e.element(labelBeginsWith: ["Today's work ·", "Việc hôm nay ·", "VIỆC HÔM NAY ·", "TODAY'S WORK ·"])
        XCTAssertTrue(e2e.scrollTo(header), "Việc hôm nay section on Tổng quan")
        let pickups = e2e.element(labelBeginsWith: ["To hand over today", "Cần giao hôm nay"], type: .button)
        let returns = e2e.element(labelBeginsWith: ["To take back today", "Cần nhận trả hôm nay"], type: .button)
        XCTAssertTrue(pickups.exists, "Cần giao hôm nay row")
        XCTAssertTrue(returns.exists, "Cần nhận trả hôm nay row")
        if pickups.exists { e2e.note("today row: \(pickups.label)") }
        e2e.shot("65a-overview-today-work")

        let noShows = e2e.element(labelBeginsWith: ["Pickup day passed", "Quá ngày lấy"], type: .button)
        XCTAssertTrue(e2e.scrollTo(noShows), "Quá ngày lấy, khách chưa đến row")
        e2e.note("no-show row: \(noShows.label)")
        noShows.tap()
        let title = e2e.element(labelBeginsWith: ["Not picked up", "Chưa lấy đồ"])
        XCTAssertTrue(title.waitForExistence(timeout: 8), "Chưa lấy đồ opens")
        sleep(3)
        let empty = app.staticTexts.matching(NSPredicate(format: "label IN %@",
            ["No orders waiting for pickup", "Không có đơn nào chờ khách lấy đồ"])).firstMatch
        XCTAssertTrue(app.cells.firstMatch.exists || empty.exists, "Chưa lấy đồ rows or its empty state")
        e2e.soft(app.cells.count > 0, "Chưa lấy đồ lists orders (\(app.cells.count))")
        e2e.shot("66a-not-picked-up")
        if app.cells.count > 0 {
            e2e.tapRow(app.cells.firstMatch)
            e2e.soft(e2e.orderMoreButton.waitForExistence(timeout: 10), "a Chưa lấy đồ row opens the order")
            e2e.shot("66b-not-picked-up-order")
            e2e.goBackOnce()
        }
        e2e.goBack()

        // Cần giao hôm nay → Đơn hàng (Việc cần làm)
        e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3)
        sleep(2)
        if e2e.scrollTo(pickups) {
            pickups.tap()
            sleep(2)
            XCTAssertTrue(e2e.button(["All orders", "Tất cả đơn"]).waitForExistence(timeout: 8), "Cần giao hôm nay opens Đơn hàng")
            e2e.shot("65b-today-work-orders")
        }
    }

    /// #622: Settings → Tài khoản ngân hàng (list, add form, bank picker) and the printer switch "In QR chuyển khoản"
    func test7kBankAccounts() throws {
        try e2e.requireFlag("newSettings")
        try e2e.start()
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        let row = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Bank Accounts", "Tài khoản ngân hàng"])).firstMatch
        if e2e.role == "staff" {
            e2e.shot("7k-staff-settings")
            e2e.soft(!row.exists, "OUTLET_STAFF does not see Tài khoản ngân hàng")
            return
        }
        XCTAssertTrue(row.waitForExistence(timeout: 8), "Bank accounts row in the Store group")
        e2e.shot("7k-settings-bank-row")
        row.tap()
        sleep(3)
        e2e.shot("7k-bank-list")

        // Add Vietcombank 0123456789 NGUYEN VAN A as default, unless an earlier run did
        let account = "0123456789 · NGUYEN VAN A"
        if !app.staticTexts[account].exists {
            e2e.button(["Add Bank Account", "Thêm tài khoản ngân hàng"]).tap()
            sleep(2)
            e2e.shot("7k-bank-form-empty")
            app.textFields.matching(NSPredicate(format: "label BEGINSWITH 'Bank Name' OR label BEGINSWITH 'Tên ngân hàng'")).firstMatch.tap()
            let search = app.searchFields.firstMatch
            XCTAssertTrue(search.waitForExistence(timeout: 5), "Bank picker")
            search.tap()
            search.typeText("Vietcombank")
            sleep(1)
            e2e.shot("7k-bank-picker")
            app.cells.staticTexts["Vietcombank"].firstMatch.tap()
            sleep(1)
            let number = app.textFields.matching(NSPredicate(format: "label BEGINSWITH 'Account Number' OR label BEGINSWITH 'Số tài khoản'")).firstMatch
            number.tap()
            number.typeText("0123456789")
            let holder = app.textFields.matching(NSPredicate(format: "label BEGINSWITH 'Account Holder' OR label BEGINSWITH 'Tên chủ tài khoản'")).firstMatch
            holder.tap()
            holder.typeText("NGUYEN VAN A")
            app.switches.firstMatch.tap()
            e2e.shot("7k-bank-form-filled")
            e2e.button(["Add", "Thêm"]).tap()
            XCTAssertTrue(app.staticTexts[account].waitForExistence(timeout: 10), "The new account is listed (\(e2e.lastAlert ?? "no alert"))")
        }
        e2e.shot("7k-bank-list-filled")
        app.staticTexts[account].tap()
        sleep(2)
        e2e.shot("7k-bank-form-edit")
        e2e.goBackOnce()
        sleep(1)
        e2e.goBackOnce()

        // Printer page: the switch sits under the printer note, off by default; turned on for the shot, then back
        let printer = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Printer", "Máy in"])).firstMatch
        XCTAssertTrue(printer.waitForExistence(timeout: 5), "Printer row")
        printer.tap()
        let toggle = app.switches["printer.bankQr.switch"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 5), "In QR chuyển khoản trên bill switch")
        let wasOn = (toggle.value as? String) == "1"
        if !wasOn { toggle.tap() }
        e2e.shot("7k-printer-bank-qr-on")
        if !wasOn { toggle.tap() }
        e2e.goBackOnce()
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
        // Extra launch arguments, e.g. "-OverviewForceDark YES" (#616 review of the dark Overview)
        let extra = (env["E2E_LAUNCH_ARGS"] ?? "").split(separator: " ").map(String.init)
        app.launchArguments += extra
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

    /// Upcoming + renting orders on the open product detail (chips "Sắp tới N" / "Đang thuê N"); nil without chips
    func productOpenOrderCount() -> Int? {
        var total = 0
        var found = false
        for prefix in ["Sắp tới ", "Upcoming ", "Đang thuê ", "Rented "] {
            let chip = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", prefix)).firstMatch
            guard chip.waitForExistence(timeout: 1),
                  let count = Int(chip.label.components(separatedBy: " ").last ?? "") else { continue }
            total += count
            found = true
        }
        return found ? total : nil
    }

    /// Opens the first seed product ("Product N - …") whose open-order count matches; returns its search key
    func openProduct(where match: (Int) -> Bool, upTo last: Int = 20) -> String? {
        for index in 1...last {
            let key = "Product \(index) -"
            guard openProduct(named: key) else { continue }
            if let count = productOpenOrderCount(), match(count) { return key }
            goBackOnce()
        }
        return nil
    }

    /// The App Store "Enjoying AnyRent?" prompt can follow a created order; it blocks taps until dismissed
    func dismissRatingPrompt() {
        let labels = ["Not Now", "Để sau", "Không phải bây giờ"]
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for owner in [app, springboard] {
            let notNow = owner.buttons.matching(NSPredicate(format: "label IN %@", labels)).firstMatch
            if notNow.waitForExistence(timeout: 2) { notNow.tap(); sleep(1); return }
        }
    }

    /// Types into a secure field, retrying when the keyboard switch drops the text. A ".newPassword" field gets
    /// iOS's "Use Strong Password" offer, which fills the field yellow and clears our text: choose our own instead.
    func typeSecure(_ field: XCUIElement, _ text: String) {
        for _ in 0..<3 {
            field.tap()
            let ownPassword = app.buttons.matching(NSPredicate(
                format: "label CONTAINS[c] 'Own Password' OR label CONTAINS[c] 'riêng' OR label CONTAINS[c] 'Other Options'")).firstMatch
            if ownPassword.waitForExistence(timeout: 1) { ownPassword.tap(); field.tap() }
            field.clearText()
            field.typeText(text)
            if let value = field.value as? String, !value.isEmpty, value != field.placeholderValue { return }
        }
        note("secure field stayed empty")
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
    /// Number of the last order created from the cart ("Đã tạo đơn #787771" → "787771")
    private(set) var lastCreatedOrderNumber: String?

    /// Cart CTA → confirm sheet ("Tạo đơn thuê?" / "Bán & thu tiền?", #476) → "Đã tạo đơn #NNNNNN" sheet → "Tạo đơn mới",
    /// or "Xem đơn" with `openOrder` (the order detail opens).
    func createOrderFromCart(cta: [String], shotPrefix: String, openOrder: Bool = false) -> Bool {
        let ctaButton = button(cta)
        guard ctaButton.waitForExistence(timeout: 5) else {
            XCTFail("Cart CTA \(cta) missing")
            return false
        }
        ctaButton.tap()
        sleep(2)
        dismissAlerts()
        let sheetTitle = app.staticTexts.matching(NSPredicate(
            format: "label IN %@", ["Tạo đơn thuê?", "Create rental order?", "Bán & thu tiền?", "Sell & collect?"])).firstMatch
        guard sheetTitle.waitForExistence(timeout: 10) else {
            shot("\(shotPrefix)-no-preview")
            XCTFail("Confirm sheet did not open")
            return false
        }
        shot("\(shotPrefix)-preview")
        // The sheet's confirm button has the same label as the cart CTA: take the lowest one on screen.
        let confirm = app.buttons.matching(NSPredicate(format: "label IN %@", cta))
        let sheetButton = confirm.allElementsBoundByIndex.filter { $0.isHittable }.max { $0.frame.minY < $1.frame.minY }
        (sheetButton ?? confirm.firstMatch).tap()
        sleep(2)
        dismissAlerts()
        let created = app.staticTexts.matching(NSPredicate(
            format: "label BEGINSWITH 'Đã tạo đơn #' OR (label BEGINSWITH 'Order #' AND label ENDSWITH 'created')")).firstMatch
        guard created.waitForExistence(timeout: 15) else {
            shot("\(shotPrefix)-not-created")
            if let alert = lastAlert { note("Order not created; last alert: \(alert)") }
            return false
        }
        lastCreatedOrderNumber = created.label.components(separatedBy: "#").last?
            .components(separatedBy: CharacterSet.decimalDigits.inverted).first
        shot("\(shotPrefix)-created")
        soft(lastCreatedOrderNumber?.count == 6, "created order number has 6 digits (\(created.label))")
        if openOrder {
            tapIfExists(button(["Xem đơn", "View order"]), timeout: 3)
            sleep(2)
            dismissRatingPrompt()
            return true
        }
        tapIfExists(button(["Tạo đơn mới", "New order"]), timeout: 3)
        sleep(1)
        dismissRatingPrompt()
        return true
    }

    // MARK: New screens (#530)

    /// Cart CTA labels: "Tạo đơn", or "Vẫn tạo đơn" in the confirm sheet when the dates clash (#518)
    static let rentCta = ["Create order", "Tạo đơn", "Create anyway", "Vẫn tạo đơn"]

    /// In the cart: Rent, then today as a same-day range
    func cartRentToday() {
        tapIfExists(button(["Rent", "Thuê"]))
        let dates = element(labelBeginsWith: ["Choose rental dates", "Chọn ngày thuê"])
        if dates.waitForExistence(timeout: 3) {
            dates.tap()
            pickTodayInDateSheet()
            tapIfExists(button(["Confirm", "Xác nhận"]), timeout: 3)
            sleep(1)
        }
    }

    /// Removes every line from the cart (− on a 1-quantity line asks "Bỏ món này khỏi giỏ?"), then back to Home.
    func emptyCart() {
        tapTab(["Home", "Trang chủ"], index: 0)
        guard cartBar.waitForExistence(timeout: 3) else { return }
        cartBar.tap()
        guard button(["Back to products", "Quay lại chọn sản phẩm"]).waitForExistence(timeout: 8) else { return }
        let minus = app.buttons.matching(NSPredicate(format: "label IN %@", ["One less", "Bớt 1"]))
        for _ in 0..<60 where minus.firstMatch.exists {
            minus.firstMatch.tap()
            let remove = app.alerts.buttons.matching(NSPredicate(format: "label IN %@", ["Remove", "Bỏ"])).firstMatch
            if remove.waitForExistence(timeout: 1) { remove.tap(); sleep(1) }
        }
        goBackOnce()
    }

    /// Home → product detail → Thêm vào giỏ → back → open the cart. True when the cart shows.
    func addToCartAndOpen(product key: String) -> Bool {
        guard openProduct(named: key) else { note("product \(key) not found"); return false }
        button(["Add to cart", "Thêm vào giỏ"]).tap()
        sleep(1)
        tapIfExists(button(["Back", "Quay lại"]))
        guard cartBar.waitForExistence(timeout: 5) else { return false }
        cartBar.tap()
        return button(["Back to products", "Quay lại chọn sản phẩm"]).waitForExistence(timeout: 8)
    }

    /// The ⋯ button of the order detail (#519: the header keeps only ⋯; it opens the action sheet)
    var orderMoreButton: XCUIElement {
        let byId = app.buttons["order.detail.more"]
        return byId.exists ? byId : button(["More actions", "Thêm thao tác"])
    }

    /// Title of the ⋯ sheet, "Đơn #787771"
    var orderSheetTitle: XCUIElement {
        app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Đơn #' OR label BEGINSWITH 'Order #'")).firstMatch
    }

    /// ⋯ → the sheet; true when its title shows
    @discardableResult
    func openOrderSheet() -> Bool {
        let more = orderMoreButton
        guard more.waitForExistence(timeout: 10) else { note("⋯ on order detail not found"); return false }
        more.tap()
        return orderSheetTitle.waitForExistence(timeout: 5)
    }

    /// ⋯ → one row of the sheet (the sheet closes, then the row's action runs)
    @discardableResult
    func tapOrderSheetRow(_ labels: [String]) -> Bool {
        guard openOrderSheet() else { return false }
        let row = button(labels)
        guard row.waitForExistence(timeout: 3) else { note("sheet row \(labels) missing"); return false }
        row.tap()
        sleep(2)
        return true
    }

    /// Orders tab → Tất cả đơn → status chip → open the first row; true when the detail's ⋯ shows
    func openFirstOrder(chip: [String]) -> Bool {
        tapTab(["My Order", "Đơn hàng"], index: 1)
        sleep(2)
        let all = button(["All orders", "Tất cả đơn"])
        guard all.waitForExistence(timeout: 5) else { return false }
        all.tap()
        sleep(1)
        tapIfExists(button(chip), timeout: 3)
        sleep(2)
        let row = app.cells.firstMatch
        guard row.waitForExistence(timeout: 8) else { return false }
        tapRow(row)
        return orderMoreButton.waitForExistence(timeout: 10)
    }

    /// Swipes up until the element is on screen and hittable
    @discardableResult
    func scrollTo(_ element: XCUIElement, maxSwipes: Int = 6) -> Bool {
        for _ in 0..<maxSwipes where !(element.exists && element.isHittable) {
            app.swipeUp()
            sleep(1)
        }
        return element.exists && element.isHittable
    }

    /// Cài đặt → "Cho tạo đơn khi trùng lịch" (#518); sets it and returns the value the switch shows after the save
    @discardableResult
    func setOverlapAllowed(_ allowed: Bool) -> Bool? {
        // From a pushed screen (cart, detail) the tab bar is hidden: go back to it first
        if !(app.tabBars.firstMatch.exists && app.tabBars.firstMatch.isHittable) { goBack() }
        tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        sleep(2)
        let toggle = app.switches.matching(NSPredicate(format: "label IN %@",
            ["Allow overlapping orders", "Cho tạo đơn khi trùng lịch"])).firstMatch
        guard scrollTo(toggle) else { note("overlap switch not found in Settings"); return nil }
        if (toggle.value as? String == "1") != allowed {
            toggle.tap()
            sleep(3) // saves at once (PATCH), the switch is disabled meanwhile
            dismissAlerts()
        }
        return toggle.value as? String == "1"
    }

    /// Text of every static text inside an element (cell, row)
    static func texts(_ element: XCUIElement) -> String {
        ([element.label] + element.staticTexts.allElementsBoundByIndex.map(\.label)).joined(separator: " ")
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
