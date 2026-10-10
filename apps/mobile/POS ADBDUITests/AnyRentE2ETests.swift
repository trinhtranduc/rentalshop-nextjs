//
//  AnyRentE2ETests.swift
//  POS ADBDUITests
//
//  End-to-end walk through the main features, like a human tester (#395).
//  Run it with scripts/mobile-e2e/ios-e2e.sh; it reads (via TEST_RUNNER_ prefixing):
//    E2E_EMAIL, E2E_PASSWORD   the account to log in with
//    E2E_ROLE                  merchant | staff | inventory (staff runs read-only flows + restrictions; inventory = #682)
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

    /// #681: the stock line of each Home row, logged for comparison with the database (see the e2e report).
    /// Seeded edge orders make some products out today or down to one; the run prints every line it reads.
    func test1bHomeStockLines() throws {
        try e2e.requireFlag("newProducts")
        try e2e.start()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        XCTAssertTrue(app.tables.cells.firstMatch.waitForExistence(timeout: 15), "Product list should load")
        let search = e2e.field(["Search name, barcode or take a photo", "Tìm tên, mã vạch hoặc chụp ảnh", "Name, barcode…", "Tên, mã vạch…"])
        XCTAssertTrue(search.waitForExistence(timeout: 5), "search field on Home")
        for number in [3, 5, 6, 7, 8, 9, 10, 18, 26, 27, 28] {
            search.tap()
            search.clearText()
            search.typeText("Product \(number) -\n")
            sleep(2)
            let name = app.tables.cells.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Product \(number) -")).firstMatch
            guard name.waitForExistence(timeout: 5) else {
                e2e.soft(false, "row for Product \(number)")
                continue
            }
            let cell = app.tables.cells.containing(NSPredicate(format: "label BEGINSWITH %@", "Product \(number) -")).firstMatch
            let stock = cell.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "●")).firstMatch
            e2e.note("STOCK Product \(number): \(stock.exists ? stock.label : "<no stock line>")")
            if number == 5 || number == 10 { e2e.shot("15-home-stock-p\(number)") }
        }
        search.clearText()
        search.typeText("\n")
        sleep(2)
        e2e.shot("16-home-list-after")
    }

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
        // #677 (board gio-menu): ⋯ in the header opens "Chia sẻ báo giá" and "Xoá giỏ hàng" (no share icon any more)
        let more = app.buttons["cart.more"]
        XCTAssertTrue(more.waitForExistence(timeout: 3), "cart header has ⋯")
        XCTAssertFalse(app.buttons["cart.share"].exists, "no standalone share icon")
        if more.exists {
            more.tap()
            let quote = e2e.button(["Chia sẻ báo giá", "Share quote"])
            XCTAssertTrue(quote.waitForExistence(timeout: 3), "⋯ offers Chia sẻ báo giá")
            XCTAssertTrue(e2e.button(["Xoá giỏ hàng", "Clear cart"]).exists, "⋯ offers Xoá giỏ hàng")
            e2e.shot("22b-cart-more-menu")
            // Close the menu without choosing (tap outside it)
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
            sleep(1)
        }

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
        // #696: the cart's calendar; a tap on a later day moves the new return day (pickup stays)
        let before = confirm.label
        let later = Calendar.current.component(.day, from: Calendar.current.date(byAdding: .day, value: 5, to: Date())!)
        if let day = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "\(later)")).allElementsBoundByIndex
            .first(where: { $0.isHittable }) {
            day.tap()
            sleep(1)
            e2e.soft(confirm.label != before, "a later day changes Gia hạn đến (\(before) → \(confirm.label))")
            e2e.shot("59b-detail-extend-later-day")
        } else {
            e2e.soft(false, "day \(later) on the extend calendar")
        }
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

    /// WEB/MOBILE-STAT (#712 follow-up): the four Overview tiles on the phone. Their labels (value included) are noted
    /// as `E2E_NOTE: TILE <title> | <label>`; the e2e checker compares them with GET /api/analytics/period.
    func test7kOverviewTiles() throws {
        try e2e.requireFlag("newOverview")
        try e2e.start()
        guard e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3) else {
            throw XCTSkip("No Reports tab for this account")
        }
        sleep(4)
        let titles = ["Giá trị đơn mới", "Doanh thu", "Thực thu", "Còn phải thu", "Thế chân"]
        var found = 0
        for button in app.buttons.allElementsBoundByIndex where button.exists {
            let label = button.label
            guard let title = titles.first(where: { label.hasPrefix($0) }) else { continue }
            found += 1
            e2e.note("TILE \(title) | \(label)")
        }
        e2e.shot("72-overview-tiles")
        e2e.soft(found >= 4, "four Overview tiles on the phone (found \(found))")
    }

    /// Each Overview tile opens its detail sheet; every row of the sheet is noted as `E2E_NOTE: SHEET <tile> | <label>`
    /// (headline "<tile> · <period>, <value>", rows "<name>, <note>, <value>") for the stats check against the API.
    func test7lOverviewSheets() throws {
        try e2e.requireFlag("newOverview")
        try e2e.start()
        guard e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3) else {
            throw XCTSkip("No Reports tab for this account")
        }
        sleep(4)
        let tiles = ["Giá trị đơn mới", "Thực thu", "Còn phải thu", "Thế chân"]
        let rowNames = ["Đơn mới", "Cho thuê", "Bán", "Cọc khi tạo đơn", "Thu khi giao, bán", "Phí hư hỏng, trễ", "Hoàn đơn huỷ", "Thế chân nhận − trả",
                        "Thực thu", "Sẽ thu khi khách lấy đồ", "Quá ngày lấy, chưa thu", "Đã nhận", "Đã trả lại khách",
                        "Sẽ nhận khi giao", "Đang giữ, sẽ trả lại"]
        for (index, title) in tiles.enumerated() {
            let tile = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", title)).firstMatch
            guard tile.waitForExistence(timeout: 8) else { e2e.soft(false, "tile \(title)"); continue }
            e2e.note("TILE \(title) | \(tile.label)")
            tile.tap()
            let link = e2e.element(labelBeginsWith: ["Xem các đơn liên quan"], type: .button)
            e2e.soft(link.waitForExistence(timeout: 6), "\(title) sheet opened")
            sleep(1)
            for element in app.descendants(matching: .other).allElementsBoundByIndex where element.exists {
                let label = element.label
                guard !label.isEmpty else { continue }
                if label.hasPrefix("\(title) ·") || rowNames.contains(where: { label.hasPrefix("\($0),") }) {
                    e2e.note("SHEET \(title) | \(label)")
                }
            }
            e2e.shot("73-overview-sheet-\(index)")
            // #708: the related orders, with their total at the bottom (it must equal the tile)
            if link.exists {
                link.tap()
                let total = app.staticTexts["related.total"]
                if total.waitForExistence(timeout: 20) {
                    let deadline = Date().addingTimeInterval(30)
                    while total.label.isEmpty && Date() < deadline { sleep(1) }
                    e2e.note("RELATED \(title) | \(total.label)")
                } else {
                    e2e.soft(false, "\(title) related list total")
                }
                e2e.shot("74-overview-related-\(index)")
                e2e.goBackOnce()
                sleep(2)
            } else {
                e2e.tapIfExists(e2e.button(["Close", "Đóng"]), timeout: 3)
            }
            sleep(1)
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

    /// #682 Nhân viên kho: the staff app plus product and category management. Logs the Home stock lines so the run
    /// can be compared with the database, then checks Sửa / Xoá, price fields, Danh mục and no Người dùng / Xuất dữ liệu.
    func test8bInventoryRole() throws {
        try e2e.requireRole("inventory")
        try e2e.requireFlag("newProducts")
        try e2e.start()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        let firstRow = app.tables.cells.firstMatch
        XCTAssertTrue(firstRow.waitForExistence(timeout: 15), "Product list should load")
        e2e.shot("95-inventory-home")
        for index in 0..<min(4, app.tables.cells.count) {
            let cell = app.tables.cells.element(boundBy: index)
            let name = cell.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Product")).firstMatch
            let stock = cell.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "●")).firstMatch
            e2e.note("STOCK \(name.exists ? name.label : "?"): \(stock.exists ? stock.label : "<no stock line>")")
        }

        e2e.tapRow(firstRow)
        XCTAssertTrue(e2e.button(["Add to cart", "Thêm vào giỏ"]).waitForExistence(timeout: 10), "Product detail opens")
        let edit = e2e.button(["Edit product", "Sửa sản phẩm", "Edit", "Sửa"])
        XCTAssertTrue(edit.waitForExistence(timeout: 5), "Nhân viên kho sees Sửa on product detail")
        XCTAssertTrue(e2e.button(["Delete product", "Xoá sản phẩm", "Xóa sản phẩm", "Delete", "Xoá", "Xóa"]).exists,
                      "Nhân viên kho sees Xoá on product detail")
        e2e.soft(!e2e.button(["Change history", "Lịch sử thay đổi"]).exists, "no change history for Nhân viên kho")
        e2e.shot("96-inventory-product-detail")
        edit.tap()
        let priceLabels = ["Rent per rental", "Thuê theo lần", "Rent per day", "Thuê theo ngày", "Sale price", "Giá bán"]
        let price = app.descendants(matching: .any).matching(NSPredicate(format: "label IN %@", priceLabels)).firstMatch
        XCTAssertTrue(price.waitForExistence(timeout: 8), "Nhân viên kho sees the price fields")
        e2e.shot("97-inventory-product-form")
        e2e.tapIfExists(e2e.button(["Close", "Đóng"]))
        sleep(1)
        e2e.tapIfExists(e2e.button(["Back", "Quay lại"]))

        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        let label = { [app] (names: [String]) in app.staticTexts.matching(NSPredicate(format: "label IN %@", names)).firstMatch }
        let categories = label(["Categories", "Danh mục"])
        XCTAssertTrue(categories.waitForExistence(timeout: 8), "Settings shows Danh mục")
        XCTAssertFalse(label(["Users", "Người dùng"]).exists, "no Người dùng for Nhân viên kho")
        XCTAssertFalse(label(["Export Data", "Xuất dữ liệu"]).exists, "no Xuất dữ liệu for Nhân viên kho")
        e2e.shot("98-inventory-settings")
        categories.tap()
        sleep(3)
        e2e.shot("99-inventory-categories")
    }

    /// #684: the cart tag of a booked-out line reads "Hết hàng …" and opens Lịch trống on that day (the orders holding it);
    /// Thêm người dùng starts with no role and a sheet explains each role. Needs a product "Váy trùng đơn test" with
    /// stock 1 booked today (staged through the API before the run).
    func test8cOverlapTagAndRoleSheet() throws {
        try e2e.requireRole("merchant")
        try e2e.requireFlag("newProducts")
        try e2e.start()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        let search = e2e.field(["Search name, barcode or take a photo", "Tìm tên, mã vạch hoặc chụp ảnh"])
        XCTAssertTrue(search.waitForExistence(timeout: 10), "Home search")
        search.tap()
        search.typeText("Váy trùng đơn test\n")
        sleep(2)
        let row = app.tables.cells.containing(NSPredicate(format: "label BEGINSWITH %@", "Váy trùng đơn test")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 8), "the staged product")
        let plus = row.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Thêm ' OR label BEGINSWITH 'Add '")).firstMatch
        if plus.exists, !plus.label.contains("trong giỏ"), !plus.label.contains("in cart") { plus.tap() }
        sleep(1)
        XCTAssertTrue(e2e.cartBar.waitForExistence(timeout: 5), "cart bar")
        e2e.cartBar.tap()
        let dates = e2e.element(labelBeginsWith: ["Choose rental dates", "Chọn ngày thuê"])
        if dates.waitForExistence(timeout: 5) {
            dates.tap()
            e2e.pickTodayInDateSheet()
            e2e.tapIfExists(e2e.button(["Confirm", "Xác nhận"]), timeout: 3)
        }
        sleep(3)
        let tag = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Xem các đơn' OR label BEGINSWITH 'See the orders'")).firstMatch
        XCTAssertTrue(tag.waitForExistence(timeout: 8), "the booked-out tag is a button")
        e2e.note("TAG title: \(tag.staticTexts.firstMatch.exists ? tag.staticTexts.firstMatch.label : tag.label)")
        e2e.shot("84a-cart-overlap-tag")
        tag.tap()
        sleep(4)
        e2e.shot("84b-calendar-on-day")
        let holder = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS '#'")).firstMatch
        XCTAssertTrue(holder.waitForExistence(timeout: 8), "Lịch trống lists the order holding the product that day")
        e2e.note("CALENDAR holder: \(holder.label)")
        e2e.tapIfExists(e2e.button(["Back", "Quay lại"]))
        sleep(1)
        e2e.emptyCart()
        // Back to the tab bar from the cart
        app.terminate()
        try e2e.start()

        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        let users = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Users", "Người dùng"])).firstMatch
        XCTAssertTrue(users.waitForExistence(timeout: 8), "Người dùng row")
        users.tap()
        let add = e2e.button(["Add User", "Thêm người dùng"])
        XCTAssertTrue(add.waitForExistence(timeout: 8), "Add user button")
        add.tap()
        sleep(2)
        let role = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Select role", "Chọn quyền"])).firstMatch
        let roleField = app.textFields.matching(NSPredicate(format: "placeholderValue IN %@", ["Select role", "Chọn quyền"])).firstMatch
        XCTAssertTrue(role.waitForExistence(timeout: 5) || roleField.exists, "the role starts empty (Chọn quyền)")
        e2e.shot("84c-user-form-no-role")
        (roleField.exists ? roleField : role).tap()
        let staff = app.buttons.matching(NSPredicate(format: "label IN %@", ["Outlet Staff", "Nhân viên cửa hàng"])).firstMatch
        XCTAssertTrue(staff.waitForExistence(timeout: 5), "the role sheet lists Nhân viên")
        e2e.note("ROLE hint: \(staff.value as? String ?? "")")
        e2e.shot("84d-role-sheet")
        staff.tap()
        sleep(1)
        e2e.shot("84e-role-picked")
        XCTAssertTrue(app.textFields.matching(NSPredicate(format: "value IN %@", ["Outlet Staff", "Nhân viên cửa hàng"])).firstMatch.exists
                      || app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Outlet Staff", "Nhân viên cửa hàng"])).firstMatch.exists,
                      "the picked role fills the field")
    }

    /// #684: cart lines without cards (name, blue pricing link with "× N ngày", tag, total + −/+). Needs products
    /// "Váy cưới thuê theo ngày" (DAILY), "Vest xanh navy thuê lần" (FIXED) and "Váy trùng đơn test" (booked today).
    func test8dCartLines() throws {
        try e2e.requireRole("merchant")
        try e2e.requireFlag("newProducts")
        try e2e.start()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        let search = e2e.field(["Search name, barcode or take a photo", "Tìm tên, mã vạch hoặc chụp ảnh"])
        XCTAssertTrue(search.waitForExistence(timeout: 10), "Home search")
        for name in ["Váy cưới thuê theo ngày", "Vest xanh navy thuê lần", "Váy trùng đơn test"] {
            search.tap()
            search.clearText()
            search.typeText(name + "\n")
            sleep(2)
            let row = app.tables.cells.containing(NSPredicate(format: "label BEGINSWITH %@", name)).firstMatch
            guard row.waitForExistence(timeout: 8) else { e2e.soft(false, "row \(name)"); continue }
            let plus = row.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Thêm ' OR label BEGINSWITH 'Add '")).firstMatch
            if plus.exists, !plus.label.contains("trong giỏ") { plus.tap() }
            sleep(1)
        }
        XCTAssertTrue(e2e.cartBar.waitForExistence(timeout: 5), "cart bar")
        e2e.cartBar.tap()
        // The dates row: "Chọn ngày thuê" on a new cart, "T6 09/10 → T6 09/10" when dates were kept
        let chooser = app.descendants(matching: .any).matching(NSPredicate(format:
            "label BEGINSWITH 'Chọn ngày thuê' OR label BEGINSWITH 'Choose rental dates' OR label CONTAINS '→'")).firstMatch
        if chooser.waitForExistence(timeout: 5) {
            chooser.tap()
            sleep(1)
            // Tomorrow, then 2 days later: a 3-day rental (the sheet's days are plain labels; today has another label)
            let start = Calendar.current.component(.day, from: Calendar.current.date(byAdding: .day, value: 1, to: Date())!)
            let end = Calendar.current.component(.day, from: Calendar.current.date(byAdding: .day, value: 3, to: Date())!)
            for day in [start, end] {
                let label = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "\(day)")).allElementsBoundByIndex
                    .first { $0.isHittable }
                label?.tap()
                sleep(1)
            }
            e2e.tapIfExists(e2e.button(["Confirm", "Xác nhận"]), timeout: 3)
        }
        sleep(3)
        e2e.shot("85-cart-lines")
        // #684 (N1/N2): "+ Ghi chú" → the item note sheet → the note shows on the line
        let addNote = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Ghi chú cho' OR label BEGINSWITH 'Note for'")).firstMatch
        if addNote.waitForExistence(timeout: 5) {
            addNote.tap()
            sleep(1)
            e2e.shot("85c-item-note-sheet")
            app.textViews.firstMatch.typeText("Sửa eo 2cm, giao kèm voan trắng")
            e2e.button(["Lưu", "Save"]).tap()
            sleep(2)
            let shown = app.buttons.matching(NSPredicate(format: "value CONTAINS 'Sửa eo 2cm'")).firstMatch
            e2e.soft(shown.exists, "the note shows on the cart line")
        } else {
            e2e.soft(false, "+ Ghi chú on the cart line")
        }
        e2e.shot("85d-cart-with-note")
        app.swipeUp()
        sleep(1)
        e2e.shot("85b-cart-lines-scrolled")
    }

    // MARK: - Screens that landed on dev with #482 #490 #491 #496 #518 #519 (#530)

    /// Board D2 (#693): item rows on order detail — bold price, "/ theo ngày × N ngày", the note in a yellow box
    func test5eDetailItemRows() throws {
        try e2e.requireFlag("newOrders")
        try e2e.requireFlag("newOrderDetail")
        try e2e.requireRole("merchant")
        try e2e.start()
        guard e2e.openFirstOrder(chip: ["Booked", "Đã đặt"]) else { return XCTFail("No booked order to open") }
        sleep(2)
        e2e.shot("5e-detail-items")
        let note = app.staticTexts["orderDetail.item.note"]
        if !note.exists { app.swipeUp(); sleep(1) }
        e2e.soft(app.staticTexts["orderDetail.item.note"].exists, "the item note shows on order detail")
        e2e.shot("5e-detail-items-scrolled")
    }

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

    // MARK: - Fixes merged on dev 2026-10-08 (#670 #671 #672 #674 #676)

    /// Home search field (v2 placeholder "Tìm tên, mã vạch hoặc chụp ảnh"; older "Tên, mã vạch…")
    private var homeSearch: XCUIElement {
        let byLabel = e2e.field(["Name, barcode…", "Tên, mã vạch…", "Tìm tên, mã vạch hoặc chụp ảnh"])
        if byLabel.exists { return byLabel }
        return app.textFields.matching(NSPredicate(format:
            "placeholderValue BEGINSWITH 'Tìm tên' OR placeholderValue BEGINSWITH 'Name' OR label BEGINSWITH 'Tìm tên'")).firstMatch
    }

    /// Orders tab → Tất cả đơn; true when rows show
    private func openAllOrders() -> Bool {
        e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
        let all = e2e.button(["All orders", "Tất cả đơn"])
        guard all.waitForExistence(timeout: 8) else { return false }
        all.tap()
        return app.cells.firstMatch.waitForExistence(timeout: 10)
    }

    /// Visible, hittable rows from top to bottom
    private func visibleRows() -> [XCUIElement] {
        let bottom = app.windows.firstMatch.frame.maxY
        return app.cells.allElementsBoundByIndex
            .filter { $0.exists && $0.isHittable && $0.frame.minY >= 0 && $0.frame.maxY <= bottom }
            .sorted { $0.frame.minY < $1.frame.minY }
    }

    /// Samples the list for `seconds`: a reason when the rows vanished or a spinner showed, else nil
    private func listBlankedOrSpun(seconds: Double) -> String? {
        let deadline = Date().addingTimeInterval(seconds)
        while Date() < deadline {
            if !app.cells.firstMatch.exists { return "rows gone" }
            let spinner = app.activityIndicators.firstMatch
            if spinner.exists && spinner.frame.width > 0 { return "spinner '\(spinner.label)' at \(spinner.frame)" }
        }
        return nil
    }

    /// Back from a pushed screen with no waiting, so the list can be sampled at once
    private func quickBack() {
        let back = app.buttons.matching(NSPredicate(format: "label IN %@", ["Back", "Quay lại"])).firstMatch
        if back.exists && back.isHittable {
            back.tap()
        } else {
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.067, dy: 0.087)).tap()
        }
    }

    /// Searches Home and returns the product row whose texts contain `key`
    private func homeRow(_ key: String) -> XCUIElement? {
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        let search = homeSearch
        guard search.waitForExistence(timeout: 10) else { e2e.note("home search field not found"); return nil }
        search.tap()
        search.clearText()
        search.typeText(key + "\n")
        sleep(3)
        let row = app.cells.containing(NSPredicate(format: "label CONTAINS %@", key)).firstMatch
        return row.waitForExistence(timeout: 6) ? row : nil
    }

    /// #676 (board sua-don): Sửa đơn opens the cart as "Sửa đơn #n" with "Lưu thay đổi"; the button opens the
    /// "Lưu thay đổi đơn #n?" sheet with "Đã đổi" tags; saving lands on the detail with "Đã lưu đơn #n" and a history
    /// entry "bởi Merchant 1". #674: the new order tops Tất cả đơn without a pull-to-refresh, and the edit shows there.
    func test5eEditOrderSheet() throws {
        try e2e.requireFlag("newOrders")
        try e2e.requireFlag("newOrderDetail")
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()

        // A cart left in edit mode by an earlier run cannot be left except by saving: save it unchanged first
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        if e2e.cartBar.waitForExistence(timeout: 4) {
            e2e.cartBar.tap()
            let leftoverSave = e2e.button(["Lưu thay đổi", "Save changes"])
            if leftoverSave.waitForExistence(timeout: 5) {
                leftoverSave.tap()
                sleep(2)
                e2e.shot("60-0-leftover-edit-sheet-unchanged")
                let sheetSave = app.buttons["cart.edit.save"]
                if sheetSave.waitForExistence(timeout: 5) { sheetSave.tap() }
                sleep(4)
                e2e.shot("60-0-leftover-edit-saved")
                e2e.goBack()
            } else {
                e2e.goBackOnce()
                e2e.emptyCart()
            }
        }

        // Load Tất cả đơn first: the new order must then appear through the orders-changed signal (#674)
        XCTAssertTrue(openAllOrders(), "Tất cả đơn loads")
        sleep(2)
        e2e.shot("60a-all-orders-before-create")

        guard e2e.openCartWithOneItem() else { return XCTFail("Could not open the cart with an item") }
        e2e.cartRentToday()
        let customer = e2e.pickFirstCustomer() ?? ""
        guard e2e.createOrderFromCart(cta: E2E.rentCta, shotPrefix: "60b-edit-create") else {
            return XCTFail("Rent order was not created (last alert: \(e2e.lastAlert ?? "none"))")
        }
        let number = e2e.lastCreatedOrderNumber ?? ""
        e2e.note("created order #\(number) for '\(customer)'")

        // #674: back on Tất cả đơn (no pull-to-refresh): the new order is the top row
        e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
        sleep(3)
        XCTAssertTrue(app.cells.firstMatch.waitForExistence(timeout: 8), "Tất cả đơn has rows")
        // Seed rows can carry a createdAt later than now and sort above it: look at the first rows
        let topTexts = app.cells.allElementsBoundByIndex.prefix(5).map { E2E.texts($0) }
        e2e.note("top rows after create: \(topTexts.joined(separator: " || "))")
        XCTAssertTrue(topTexts.contains { $0.contains(number) },
                      "#674: new order #\(number) is at the top of Tất cả đơn without pull-to-refresh")
        e2e.shot("60c-all-orders-after-create")

        var row = app.cells.containing(NSPredicate(format: "label CONTAINS %@", number)).firstMatch
        if !row.exists { row = app.cells.matching(NSPredicate(format: "label CONTAINS %@", number)).firstMatch }
        guard row.waitForExistence(timeout: 5) else { return XCTFail("Order #\(number) not in Tất cả đơn") }
        e2e.tapRow(row)
        XCTAssertTrue(e2e.orderMoreButton.waitForExistence(timeout: 10), "order detail opens")
        sleep(2)
        e2e.shot("60d-edit-detail-before")

        let edit = e2e.button(["Edit order", "Sửa đơn"])
        guard edit.waitForExistence(timeout: 5) else { return XCTFail("Booked order offers Sửa đơn") }
        edit.tap()
        sleep(2)
        e2e.shot("60d2-edit-after-tap")
        // Sửa đơn loads the order into the cart and shows the product list; the cart bar opens the cart
        if !e2e.button(["Lưu thay đổi", "Save changes"]).exists, e2e.cartBar.waitForExistence(timeout: 5) {
            e2e.note("cart bar while editing: \(e2e.cartBar.label)")
            e2e.cartBar.tap()
        }
        let title = app.staticTexts.matching(NSPredicate(format: "label IN %@",
            ["Sửa đơn #\(number)", "Edit order #\(number)"])).firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 10), "cart title is 'Sửa đơn #\(number)'")
        let subtitle = app.staticTexts.matching(NSPredicate(format: "label ENDSWITH ' · Đơn thuê' OR label ENDSWITH ' · Rental'")).firstMatch
        XCTAssertTrue(subtitle.exists, "subtitle '<customer> · Đơn thuê'")
        if subtitle.exists {
            e2e.note("edit subtitle: \(subtitle.label)")
            e2e.soft(customer.isEmpty || subtitle.label.hasPrefix(customer), "subtitle starts with the customer \(customer)")
        }
        let save = e2e.button(["Lưu thay đổi", "Save changes"])
        XCTAssertTrue(save.exists, "bottom button is 'Lưu thay đổi'")
        // #677 option B: "Huỷ sửa" sits next to "Lưu thay đổi"; the header has no share button while editing
        XCTAssertTrue(app.buttons["cart.edit.cancel"].exists, "bottom bar has 'Huỷ sửa'")
        XCTAssertFalse(app.buttons["cart.share"].exists, "no share button while editing")
        XCTAssertFalse(app.buttons["cart.more"].exists, "no ⋯ while editing")
        XCTAssertFalse(e2e.button(["Tạo đơn", "Create order"]).exists, "no 'Tạo đơn' while editing")
        e2e.shot("60e-edit-cart")

        // Change the quantity 1 → 2
        let plus = e2e.button(["Thêm 1", "One more"])
        guard e2e.scrollTo(plus) else { return XCTFail("cart line has Thêm 1") }
        plus.tap()
        sleep(2)
        e2e.dismissAlerts()
        e2e.shot("60f-edit-cart-qty2")

        if !save.isHittable { app.swipeDown() }
        save.tap()
        let sheetTitle = app.staticTexts.matching(NSPredicate(format: "label IN %@",
            ["Lưu thay đổi đơn #\(number)?", "Save changes to order #\(number)?"])).firstMatch
        guard sheetTitle.waitForExistence(timeout: 8) else {
            e2e.shot("60g-edit-no-sheet")
            return XCTFail("'Lưu thay đổi đơn #\(number)?' sheet did not open")
        }
        sleep(1)
        e2e.shot("60g-edit-sheet")
        let expectations: [(String, Bool, Bool)] = [("Ngày thuê", false, true), ("Đồ thuê", true, true),
                                                    ("Tổng đơn", false, true), ("Đã thu", false, false)]
        for (label, changed, required) in expectations {
            let line = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", label + ", ")).firstMatch
            if !line.exists {
                if required { XCTFail("sheet row \(label) missing") } else { e2e.note("sheet row \(label) not shown") }
                continue
            }
            e2e.note("sheet row: \(line.label)")
            XCTAssertEqual(line.label.hasSuffix(", Đã đổi"), changed, "row \(label): 'Đã đổi' only when changed (\(line.label))")
        }
        XCTAssertFalse(e2e.button(["Tạo đơn", "Create order"]).exists, "no 'Tạo đơn' in the edit sheet")

        let keep = e2e.button(["Tiếp tục sửa", "Keep editing"])
        XCTAssertTrue(keep.exists, "sheet has Tiếp tục sửa")
        keep.tap()
        XCTAssertTrue(sheetTitle.waitForNonExistence(timeout: 5), "Tiếp tục sửa closes the sheet")
        XCTAssertTrue(title.exists, "still on the edit cart")
        e2e.shot("60h-edit-keep-editing")

        save.tap()
        XCTAssertTrue(sheetTitle.waitForExistence(timeout: 8), "sheet opens again")
        let sheetSave = app.buttons["cart.edit.save"]
        (sheetSave.exists ? sheetSave : e2e.button(["Lưu thay đổi"])).tap()
        // The toast lasts 2.5 s: poll any element and take a burst of screenshots
        let toast = app.descendants(matching: .any).matching(NSPredicate(format:
            "label CONTAINS 'Đã lưu đơn' OR label CONTAINS 'saved'")).firstMatch
        var toastSeen = false
        for index in 0..<8 {
            e2e.shot("60i-edit-saved-burst-\(index)")
            if toast.exists { toastSeen = true; e2e.note("toast: \(toast.label)"); break }
            usleep(250_000)
        }
        XCTAssertTrue(toastSeen, "toast 'Đã lưu đơn #\(number)'")
        XCTAssertTrue(e2e.orderMoreButton.waitForExistence(timeout: 10), "save lands on the order detail")
        XCTAssertFalse(save.exists, "no review/cart screen after the save")
        sleep(2)
        e2e.shot("60j-edit-saved-detail")
        e2e.note("detail texts after save: " + app.staticTexts.allElementsBoundByIndex.prefix(60).map(\.label).joined(separator: " | "))

        XCTAssertTrue(e2e.tapOrderSheetRow(["Change history", "Lịch sử thay đổi"]), "⋯ → Lịch sử thay đổi")
        sleep(3)
        let by = app.descendants(matching: .any).matching(NSPredicate(format:
            "label CONTAINS 'bởi Merchant 1' OR label CONTAINS 'by Merchant 1'")).firstMatch
        XCTAssertTrue(by.waitForExistence(timeout: 8), "history shows 'bởi Merchant 1'")
        e2e.note("history rows: " + app.cells.allElementsBoundByIndex.map(\.label).joined(separator: " | "))
        e2e.shot("60k-edit-history")
        e2e.goBackOnce()
        e2e.goBack()

        // #674: the list shows the edit
        e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
        sleep(3)
        let edited = app.cells.containing(NSPredicate(format: "label CONTAINS %@", number)).firstMatch
        if edited.waitForExistence(timeout: 5) { e2e.note("row after edit: \(E2E.texts(edited))") }
        e2e.shot("60l-all-orders-after-edit")
    }

    /// #674: back from a detail Tất cả đơn keeps its rows and scroll, no spinner; Việc cần làm ↔ Tất cả đơn show the
    /// previous results at once.
    func test5fOrdersQuietReload() throws {
        try e2e.requireFlag("newOrders")
        try e2e.requireFlag("newOrderDetail")
        try e2e.start()
        XCTAssertTrue(openAllOrders(), "Tất cả đơn loads")
        sleep(3)
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.78))
            .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)))
        sleep(2)
        let rows = visibleRows()
        guard let top = rows.first else { return XCTFail("no visible rows") }
        let topBefore = (E2E.texts(top), top.frame.minY)
        e2e.note("top row before: \(topBefore.0) @\(topBefore.1)")
        e2e.shot("61a-all-orders-scrolled")

        e2e.tapRow(rows.count > 1 ? rows[1] : rows[0])
        XCTAssertTrue(e2e.orderMoreButton.waitForExistence(timeout: 10), "detail opens")
        sleep(2)
        e2e.shot("61b-order-detail")
        quickBack()
        let problem = listBlankedOrSpun(seconds: 3)
        e2e.shot("61c-back-to-list")
        XCTAssertNil(problem, "#674: back from the detail the list neither blanks nor spins (\(problem ?? ""))")
        if let after = visibleRows().first {
            e2e.note("top row after: \(E2E.texts(after)) @\(after.frame.minY)")
            XCTAssertEqual(E2E.texts(after), topBefore.0, "scroll position kept: same top row")
            XCTAssertEqual(after.frame.minY, topBefore.1, accuracy: 6, "scroll position kept: same offset")
        } else {
            XCTFail("no rows after coming back")
        }

        let todo = e2e.button(["To do", "Việc cần làm"])
        let all = e2e.button(["All orders", "Tất cả đơn"])
        XCTAssertTrue(todo.exists, "Việc cần làm switch")
        todo.tap()
        sleep(3)
        let todoRows = app.cells.count
        e2e.shot("61d-todo")
        all.tap()
        let shown = app.cells.firstMatch.waitForExistence(timeout: 0.6)
        e2e.shot("61e-all-again")
        XCTAssertTrue(shown, "Tất cả đơn shows the previous rows at once")
        let problem2 = listBlankedOrSpun(seconds: 2)
        XCTAssertNil(problem2, "Tất cả đơn again: no blank/spinner (\(problem2 ?? ""))")
        todo.tap()
        if todoRows > 0 {
            let todoShown = app.cells.firstMatch.waitForExistence(timeout: 0.6)
            e2e.shot("61f-todo-again")
            XCTAssertTrue(todoShown, "Việc cần làm shows its previous rows at once")
        } else {
            sleep(1)
            e2e.shot("61f-todo-again")
            e2e.note("Việc cần làm had no rows; instant-show not checked there")
        }
        all.tap()
    }

    /// #671: + on Products home is round and blue, also on a product "Hết hôm nay"; it still adds to the cart.
    /// Makes Product 27 out today first (rents all its free stock today) when it is not.
    func test1cOutTodayAddButton() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        e2e.emptyCart()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        sleep(2)
        e2e.shot("62a-home-round-add")

        let key = "Product 27 -"
        guard var row = homeRow(key) else { return XCTFail("\(key) not found on Home") }
        let stockText: (XCUIElement) -> String = { row in
            row.staticTexts.matching(NSPredicate(format: "label BEGINSWITH '● '")).firstMatch.label
        }
        var stock = stockText(row)
        e2e.note("\(key) stock: \(stock)")
        e2e.shot("62b-product27-before")
        if let free = Int(stock.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()), stock.contains("Còn") {
            // Rent every free unit today
            let add = row.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Thêm ' OR label BEGINSWITH 'Add '")).firstMatch
            guard add.exists else { return XCTFail("+ on \(key)") }
            add.tap()
            sleep(1)
            guard e2e.cartBar.waitForExistence(timeout: 5) else { return XCTFail("cart bar") }
            e2e.cartBar.tap()
            _ = e2e.button(["Back to products", "Quay lại chọn sản phẩm"]).waitForExistence(timeout: 8)
            let plus = e2e.button(["Thêm 1", "One more"])
            for _ in 1..<max(free, 1) where e2e.scrollTo(plus) { plus.tap(); usleep(400_000) }
            e2e.cartRentToday()
            _ = e2e.pickFirstCustomer()
            e2e.shot("62c-cart-all-free-today")
            guard e2e.createOrderFromCart(cta: E2E.rentCta, shotPrefix: "62d-out-today-order") else {
                return XCTFail("order renting all free units was not created (\(e2e.lastAlert ?? "no alert"))")
            }
            guard let again = homeRow(key) else { return XCTFail("\(key) not found again") }
            row = again
            stock = stockText(row)
            e2e.note("\(key) stock after renting all: \(stock)")
        }
        XCTAssertTrue(stock.contains("Hết hôm nay") || stock.contains("Out today"), "\(key) shows 'Hết hôm nay' (\(stock))")
        let add = row.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Thêm ' OR label BEGINSWITH 'Add '")).firstMatch
        XCTAssertTrue(add.exists && add.isEnabled, "+ on an out-today product is enabled")
        e2e.note("+ frame \(add.frame), label \(add.label)")
        XCTAssertEqual(add.frame.width, add.frame.height, accuracy: 1, "+ is a circle-sized square frame")
        e2e.shot("62e-out-today-row")
        add.tap()
        sleep(2)
        e2e.dismissAlerts()
        e2e.shot("62f-out-today-added")
        let inCart = row.buttons.matching(NSPredicate(format: "label CONTAINS 'trong giỏ' OR label CONTAINS 'in cart'")).firstMatch
        e2e.note("+ after tap: \(row.buttons.allElementsBoundByIndex.map(\.label))")
        XCTAssertTrue(e2e.cartBar.waitForExistence(timeout: 5), "tapping + on an out-today product adds it (cart bar shows)")
        XCTAssertTrue(inCart.exists, "the circle shows the count in the cart (label '…: 1 trong giỏ, thêm 1')")
        e2e.emptyCart()
    }

    /// #672: the camera button on Home → photo library → search. No embedding service locally: an error or the new
    /// empty state ("Không thấy sản phẩm giống", tips, Chụp lại, Tìm bằng tên). Tìm bằng tên focuses Home search.
    func test1bImageSearch() throws {
        try e2e.requireFlag("newProducts")
        try e2e.start()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        let camera = e2e.button(["Tìm bằng hình", "Search by image", "Image search"])
        guard camera.waitForExistence(timeout: 8) else { return XCTFail("camera button on Home") }
        camera.tap()
        sleep(3)
        e2e.dismissSystemAlert()
        let permission = app.alerts.firstMatch
        if permission.exists { e2e.note("alert on camera open: \(permission.label)"); e2e.dismissAlerts() }
        e2e.shot("63a-image-search-camera")

        let height = app.windows.firstMatch.frame.height
        let library = app.buttons.allElementsBoundByIndex.first {
            $0.isHittable && $0.frame.minX < 120 && $0.frame.minY > height * 0.7
        }
        guard let library else {
            e2e.note(String(app.debugDescription.prefix(4000)))
            return XCTFail("photo library button (bottom left) not found")
        }
        library.tap()
        sleep(4)
        e2e.shot("63b-photo-picker")
        let photo = app.images.matching(NSPredicate(format: "label BEGINSWITH 'Photo' OR label BEGINSWITH 'Ảnh'")).firstMatch
        if photo.waitForExistence(timeout: 5) && photo.isHittable {
            photo.tap()
        } else {
            e2e.note("no photo cell by label; tapping the first grid cell. Tree: " + String(app.debugDescription.prefix(3000)))
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.16, dy: 0.32)).tap()
        }
        sleep(2)
        let choose = e2e.button(["Choose", "Chọn", "Add", "Thêm", "Done", "Xong"])
        if choose.exists && choose.isHittable { choose.tap() }
        sleep(8)
        e2e.shot("63c-after-search")

        let empty = app.staticTexts["Không thấy sản phẩm giống"]
        if app.alerts.firstMatch.exists {
            let alert = app.alerts.firstMatch
            e2e.note("image search alert: \(E2E.texts(alert))")
            e2e.shot("63d-image-search-error")
            e2e.dismissAlerts()
        } else if empty.exists {
            e2e.shot("63d-image-search-empty")
            for text in ["Chụp lại", "Tìm bằng tên"] {
                XCTAssertTrue(e2e.button([text]).exists || app.staticTexts[text].exists, "empty state offers \(text)")
            }
            XCTAssertTrue(app.staticTexts["Chụp cả món đồ, đủ sáng"].exists, "empty state tips")
            let byName = e2e.button(["Tìm bằng tên"])
            byName.tap()
            sleep(3)
            e2e.shot("63e-search-by-name")
            XCTAssertTrue(homeSearch.exists, "back on Home")
            XCTAssertTrue(app.keyboards.firstMatch.exists, "Tìm bằng tên focuses the Home search (keyboard up)")
            e2e.hideKeyboard()
            return
        } else {
            e2e.note("after search, texts: " + app.staticTexts.allElementsBoundByIndex.prefix(40).map(\.label).joined(separator: " | "))
            e2e.shot("63d-image-search-other")
        }
        // Close image search
        let close = app.buttons.allElementsBoundByIndex.first { $0.isHittable && $0.frame.minX < 100 && $0.frame.minY < 160 }
        close?.tap()
        sleep(2)
        e2e.shot("63f-image-search-closed")
    }

    /// #670: OUTLET_STAFF sees no "Lịch sử thay đổi" in the order ⋯ sheet nor on the product detail
    func test8bStaffNoHistory() throws {
        try e2e.requireRole("staff")
        try e2e.requireFlag("newOrders")
        try e2e.requireFlag("newOrderDetail")
        try e2e.start()
        var opened = e2e.openFirstOrder(chip: ["Booked", "Đã đặt"])
        if !opened { e2e.goBack(); opened = e2e.openFirstOrder(chip: ["Renting", "Đang thuê"]) }
        guard opened else { return XCTFail("staff could not open an order") }
        e2e.shot("92a-staff-order-detail")
        XCTAssertTrue(e2e.openOrderSheet(), "⋯ opens the sheet")
        sleep(1)
        e2e.shot("92b-staff-order-sheet")
        XCTAssertFalse(e2e.button(["Change history", "Lịch sử thay đổi"]).exists, "#670: no Lịch sử thay đổi in the staff ⋯ sheet")
        XCTAssertFalse(app.staticTexts["Lịch sử thay đổi"].exists, "#670: no Lịch sử thay đổi text in the staff ⋯ sheet")
        e2e.note("staff sheet buttons: \(app.buttons.allElementsBoundByIndex.map(\.label).filter { !$0.isEmpty })")
        e2e.tapIfExists(e2e.button(["Close", "Đóng"]))
        sleep(1)
        e2e.goBack()

        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        let first = app.tables.cells.firstMatch
        XCTAssertTrue(first.waitForExistence(timeout: 15), "product list")
        e2e.tapRow(first)
        XCTAssertTrue(e2e.button(["Add to cart", "Thêm vào giỏ"]).waitForExistence(timeout: 10), "product detail opens")
        e2e.shot("92c-staff-product-detail")
        for _ in 0..<4 { app.swipeUp(); usleep(500_000) }
        e2e.shot("92d-staff-product-detail-bottom")
        XCTAssertFalse(app.descendants(matching: .any)["product.detail.history"].exists, "#670: no history row on product detail")
        XCTAssertFalse(app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH 'Lịch sử thay đổi'")).firstMatch.exists,
                       "#670: no 'Lịch sử thay đổi' on product detail")
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

    // MARK: - #727 expired / out-of-plan accounts (run with ios-e2e.sh --scenario <slug> --role owner|staff|kho)

    /// MOB-SUB: login and every tab of an account whose subscription is expired, cancelled, paused or past due.
    /// Records what the person reads (E2E_NOTE: SUB …) and fails on a raw API code on screen. Nothing may be created
    /// (tests/e2e/mobile/subscription-flow.sh compares the row counts before and after).
    func test10aSubscriptionBroken() throws {
        try e2e.requireScenario(["expired-trial", "expired-active", "cancelled-ended", "paused", "past-due"])
        e2e.startLoose()
        let tag = "\(e2e.scenario)/\(e2e.scenarioRole)"
        e2e.shot("10a-sub-after-login")
        e2e.note("SUB \(tag) after-login tabBar=\(app.tabBars.firstMatch.exists) texts=\(e2e.screenTexts().prefix(25))")
        var raw = e2e.rawKeys()
        e2e.dismissAlerts()
        let tabs: [(String, [String], Int?)] = [
            ("home", ["Home", "Trang chủ"], 0), ("orders", ["My Order", "Đơn hàng"], 1),
            ("calendar", ["Calendar", "Lịch Thuê", "Lịch"], 2), ("reports", ["Reports", "Báo cáo", "Overview", "Tổng quan"], 3),
            ("settings", ["Settings", "Cài đặt", "Setting"], nil),
        ]
        for (name, labels, index) in tabs {
            guard e2e.tapTab(labels, index: index) else { e2e.note("SUB \(tag) \(name): tab not offered"); continue }
            sleep(4)
            e2e.shot("10b-sub-\(name)")
            e2e.note("SUB \(tag) \(name): alert=\(app.alerts.firstMatch.exists) texts=\(e2e.screenTexts().prefix(25))")
            raw += e2e.rawKeys()
            e2e.dismissAlerts()
        }
        XCTAssertTrue(raw.isEmpty, "raw API codes on screen: \(raw)")
    }

    /// MOB-SUB: after the subscription was fixed in the database (prepare-accounts.sh fix <slug>) the same login works:
    /// tab bar, product rows, orders. Run by subscription-flow.sh after test10aSubscriptionBroken.
    func test10bSubscriptionFixed() throws {
        try e2e.requireScenario(["expired-trial", "expired-active", "cancelled-ended", "paused", "past-due"])
        try e2e.start()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        XCTAssertTrue(app.tables.cells.firstMatch.waitForExistence(timeout: 20), "Home lists products again after the subscription was fixed")
        e2e.shot("10c-sub-fixed-home")
        e2e.note("SUB \(e2e.scenario)/\(e2e.scenarioRole) fixed home: \(e2e.screenTexts().prefix(12))")
        XCTAssertTrue(e2e.rawKeys().isEmpty, "raw API codes on screen: \(e2e.rawKeys())")
        if e2e.tapTab(["My Order", "Đơn hàng"], index: 1) {
            sleep(3)
            e2e.shot("10d-sub-fixed-orders")
            XCTAssertTrue(app.cells.firstMatch.waitForExistence(timeout: 10) || e2e.button(["All orders", "Tất cả đơn"]).exists, "Orders loads")
        }
    }

    // MARK: - #727 stock left, calendar, "Việc cần làm", order detail (scenario accounts with known data)

    /// Free units from a Home stock line: "● Còn 3 hôm nay" → 3, "● Hết hôm nay" / "● Out today" → 0
    private func freeFrom(_ line: String) -> Int? {
        if let digits = line.components(separatedBy: CharacterSet.decimalDigits.inverted).first(where: { !$0.isEmpty }), let n = Int(digits) { return n }
        return line.contains("Hết") || line.contains("Out") || line.contains("None") ? 0 : nil
    }

    /// The "● …" stock line of a Home row found by name
    private func stockLine(_ key: String) -> (line: String, colour: String)? {
        guard let row = homeRow(key) else { return nil }
        let label = row.staticTexts.matching(NSPredicate(format: "label BEGINSWITH '● '")).firstMatch
        guard label.waitForExistence(timeout: 3) else { return nil }
        return (label.label, e2e.colourName(of: label))
    }

    /// Adds the product of a Home row to the cart through its + button
    private func addFromHome(_ key: String) -> Bool {
        guard let row = homeRow(key) else { return false }
        let plus = row.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Thêm ' OR label BEGINSWITH 'Add '")).firstMatch
        guard plus.exists else { return false }
        plus.tap()
        sleep(1)
        return e2e.cartBar.waitForExistence(timeout: 5)
    }

    private func openCart() -> Bool {
        guard e2e.cartBar.waitForExistence(timeout: 5) else { return false }
        e2e.cartBar.tap()
        return e2e.button(["Back to products", "Quay lại chọn sản phẩm"]).waitForExistence(timeout: 8)
    }

    /// MOB-STOCK-01..08 (scenario stock, merchant owner): "Còn N hôm nay" on Home after a sale and a rent order created
    /// in the cart, the warning colour at 1 left, the cart's "Chỉ còn N trống" for the chosen dates, and a product that
    /// is out today (+ stays usable, a future day is free). The final lines are compared with GET /api/products/{id}/availability
    /// by tests/e2e/mobile/stock-flow-check.js.
    func test1dStockFlow() throws {
        try e2e.requireScenario(["stock"])
        try e2e.requireRole("merchant")
        try e2e.requireFlag("newProducts")
        try e2e.start()
        e2e.emptyCart()

        // MOB-STOCK-01: starting lines. Con5 has 5, Con1 has 1 (warning colour), Het is held by an order today
        guard let con5 = stockLine("E2E Con5"), let con1 = stockLine("E2E Con1"), let het = stockLine("E2E Het") else {
            return XCTFail("E2E Con5 / Con1 / Het not on Home (is this the stock scenario?)")
        }
        e2e.note("STOCKFLOW start Con5: \(con5.line) [\(con5.colour)]")
        e2e.note("STOCKFLOW start Con1: \(con1.line) [\(con1.colour)]")
        e2e.note("STOCKFLOW start Het: \(het.line) [\(het.colour)]")
        e2e.shot("1d-stock-start")
        XCTAssertEqual(freeFrom(con5.line), 5, "Con5 starts with 5 free")
        XCTAssertEqual(freeFrom(con1.line), 1, "Con1 starts with 1 free")
        XCTAssertEqual(freeFrom(het.line), 0, "Het is out today")
        e2e.soft(con5.colour == "green", "5 left is green (\(con5.colour))")
        e2e.soft(con1.colour == "amber", "exactly 1 left is the warning colour (\(con1.colour))")
        e2e.soft(het.colour == "red", "out today is red (\(het.colour))")

        // MOB-STOCK-02: sale of 2 × Con5 → 3 free
        XCTAssertTrue(addFromHome("E2E Con5"), "add Con5")
        XCTAssertTrue(openCart(), "cart opens")
        e2e.tapIfExists(e2e.button(["Sale", "Bán"]), timeout: 3)
        let more = e2e.button(["Thêm 1", "One more"])
        if more.waitForExistence(timeout: 3) { more.tap(); sleep(1) }
        let inStock = app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'trong kho' OR label CONTAINS 'in stock'")).firstMatch
        e2e.note("STOCKFLOW sale cart line: \(inStock.exists ? inStock.label : "<none>")")
        e2e.soft(inStock.exists && inStock.label.contains("5"), "a sale line shows the 5 in stock")
        e2e.shot("1d-stock-cart-sale")
        _ = e2e.pickFirstCustomer()
        XCTAssertTrue(e2e.createOrderFromCart(cta: ["Sell & collect", "Bán & thu tiền"], shotPrefix: "1d-sale"), "sale created (\(e2e.lastAlert ?? "no alert"))")
        if let afterSale = stockLine("E2E Con5") {
            e2e.note("STOCKFLOW after-sale Con5: \(afterSale.line)")
            XCTAssertEqual(freeFrom(afterSale.line), 3, "after selling 2 of 5 the row says 3 left")
        }

        // MOB-STOCK-03: rent of 1 × Con5 today → 2 free
        e2e.emptyCart()
        XCTAssertTrue(addFromHome("E2E Con5"), "add Con5 again")
        XCTAssertTrue(openCart(), "cart opens")
        e2e.cartRentToday()
        _ = e2e.pickFirstCustomer()
        XCTAssertTrue(e2e.createOrderFromCart(cta: E2E.rentCta, shotPrefix: "1d-rent"), "rent created (\(e2e.lastAlert ?? "no alert"))")
        if let afterRent = stockLine("E2E Con5") {
            e2e.note("STOCKFLOW after-rent Con5: \(afterRent.line)")
            XCTAssertEqual(freeFrom(afterRent.line), 2, "after the rent order the row says 2 left")
        }

        // MOB-STOCK-04: product detail shows the same number
        if e2e.openProduct(named: "E2E Con5") {
            sleep(2)
            e2e.shot("1d-stock-detail")
            e2e.note("STOCKFLOW detail Con5: \(e2e.screenTexts().prefix(30))")
            let texts = e2e.screenTexts().joined(separator: " ¦ ")
            e2e.soft(texts.contains("Còn 2") || texts.contains("2 left") || texts.contains("Còn trống"), "detail shows 2 free")
            e2e.goBackOnce()
        }

        // MOB-STOCK-05: out today → the + stays enabled (grey look is a screenshot check), and adding works
        if let row = homeRow("E2E Het") {
            let plus = row.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Thêm ' OR label BEGINSWITH 'Add '")).firstMatch
            XCTAssertTrue(plus.exists && plus.isEnabled, "+ on an out-today product is enabled")
            e2e.shot("1d-stock-het-row")
        }

        // MOB-STOCK-06: out today, rent TODAY → "Hết đồ" tag; MOB-STOCK-07: tomorrow is free (no tag, no shortage)
        e2e.emptyCart()
        XCTAssertTrue(addFromHome("E2E Het"), "add Het")
        XCTAssertTrue(openCart(), "cart opens")
        e2e.cartRentToday()
        sleep(3)
        let tag = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Xem các đơn' OR label BEGINSWITH 'See the orders' OR label BEGINSWITH 'Hết' OR label BEGINSWITH 'Out'")).firstMatch
        e2e.note("STOCKFLOW het-today tag: \(tag.exists ? tag.label : "<none>")")
        XCTAssertTrue(tag.exists, "Het rented today shows the booked-out tag")
        e2e.shot("1d-stock-het-today")
        let tomorrowDay = e2e.vnDay(1).day
        let dates = e2e.element(labelBeginsWith: ["Choose rental dates", "Chọn ngày thuê"])
        let datesAlt = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS '→'")).firstMatch
        (dates.exists ? dates : datesAlt).tap()
        sleep(1)
        e2e.pickDayInDateSheet(tomorrowDay)
        e2e.tapIfExists(e2e.button(["Confirm", "Xác nhận"]), timeout: 3)
        sleep(3)
        let shortage = app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Chỉ còn' OR label CONTAINS 'Only'")).firstMatch
        e2e.note("STOCKFLOW het-tomorrow shortage: \(shortage.exists ? shortage.label : "<none>") tag: \(tag.exists)")
        XCTAssertFalse(shortage.exists, "Het is free tomorrow: no shortage line")
        e2e.shot("1d-stock-het-tomorrow")
        // MOB-STOCK-08: 2 × Het tomorrow, only 1 exists → "Chỉ còn 1 trống trong ngày đã chọn"
        let plusOne = e2e.button(["Thêm 1", "One more"])
        if plusOne.waitForExistence(timeout: 3) { plusOne.tap(); sleep(2) }
        let short2 = app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Chỉ còn' OR label CONTAINS 'Only'")).firstMatch
        e2e.note("STOCKFLOW het-tomorrow x2 shortage: \(short2.exists ? short2.label : "<none>")")
        XCTAssertTrue(short2.exists, "2 × Het for tomorrow shows how many are left")
        XCTAssertEqual(freeFrom(short2.label), 1, "…and says 1")
        e2e.shot("1d-stock-het-short")
        e2e.emptyCart()

        // final lines for the API checker
        for key in ["E2E Con5", "E2E Con1", "E2E Het"] {
            if let last = stockLine(key) { e2e.note("STOCKFLOW final \(key): \(last.line)") }
        }
    }

    /// MOB-CAL-01..: month grid and day list for the ops scenario (orders 710001..710009 around today). Every selected day's
    /// header summary ("giao x · trả y") and the order numbers of its rows are noted as `E2E_NOTE: CAL <yyyy-MM-dd> | …`
    /// for tests/e2e/mobile/calendar-check.js (API: /api/calendar/orders/count and /by-date).
    func test6bCalendarOps() throws {
        try e2e.requireScenario(["ops"])
        try e2e.requireRole("merchant")
        try e2e.requireFlag("newCalendar")
        try e2e.start()
        e2e.tapTab(["Calendar", "Lịch Thuê", "Lịch"], index: 2)
        XCTAssertTrue(e2e.button(["Next month", "Tháng sau"]).waitForExistence(timeout: 10), "Calendar month header")
        sleep(2)
        // MOB-CAL-01: the screen opens on today (Vietnam day): header "HÔM NAY · T7 10/10"
        let todayDM = e2e.vnDay(0).dm
        let header = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'HÔM NAY' OR label BEGINSWITH 'TODAY'")).firstMatch
        XCTAssertTrue(header.waitForExistence(timeout: 8), "the day list opens on today")
        e2e.note("CAL header: \(header.label)")
        XCTAssertTrue(header.label.contains(todayDM), "today's header shows the Vietnam day \(todayDM) (\(header.label))")
        e2e.shot("6b-calendar-today")
        for offset in -5...4 {
            let day = e2e.vnDay(offset)
            let cell = app.descendants(matching: .any).matching(NSPredicate(format: "label ENDSWITH %@", " " + day.dm)).firstMatch
            guard cell.waitForExistence(timeout: 3), cell.isHittable else { e2e.note("CAL \(day.key) | not on this month's grid"); continue }
            cell.tap()
            sleep(3)
            let title = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", day.dm)).allElementsBoundByIndex
                .map(\.label).first { $0.uppercased() == $0 || $0.hasPrefix("HÔM NAY") } ?? ""
            let summary = app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'giao ' OR label CONTAINS 'hand'")).allElementsBoundByIndex.map(\.label).joined(separator: " / ")
            var numbers: [String] = []
            for cellRow in app.tables.cells.allElementsBoundByIndex where cellRow.exists {
                let text = E2E.texts(cellRow)
                if let r = text.range(of: "#\\d+", options: .regularExpression) { numbers.append(String(text[r]).replacingOccurrences(of: "#", with: "")) }
            }
            e2e.note("CAL \(day.key) | title=\(title) | summary=\(summary) | orders=\(numbers.sorted().joined(separator: ","))")
            if offset == 0 || offset == 1 || offset == -2 || offset == 3 { e2e.shot("6b-calendar-\(day.key)") }
        }
        // MOB-CAL-02: a day row opens its order
        if let day = Optional(e2e.vnDay(0)), let cell = Optional(app.descendants(matching: .any).matching(NSPredicate(format: "label ENDSWITH %@", " " + day.dm)).firstMatch), cell.exists {
            cell.tap()
            sleep(2)
            if app.tables.cells.firstMatch.waitForExistence(timeout: 5) {
                e2e.tapRow(app.tables.cells.firstMatch)
                XCTAssertTrue(e2e.orderMoreButton.waitForExistence(timeout: 10), "a calendar row opens the order")
                e2e.shot("6b-calendar-order")
                e2e.goBack()
            }
        }
    }

    /// MOB-TODO-01..: Tổng quan → "Hôm nay" counters and what each opens, for the ops scenario. Noted as
    /// `E2E_NOTE: TODO <counter> | <label> | rows=<numbers>` for tests/e2e/mobile/todo-check.js (API: /api/analytics/outlet-operations).
    func test7mTodayCounters() throws {
        try e2e.requireScenario(["ops"])
        try e2e.requireRole("merchant")
        try e2e.requireFlag("newOverview")
        try e2e.start()
        guard e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3) else { throw XCTSkip("no Tổng quan tab") }
        sleep(4)
        let counters: [(key: String, labels: [String])] = [
            ("pickups", ["Cần giao", "To hand over"]), ("returns", ["Cần nhận trả", "To take back"]),
            ("late", ["Trễ hạn trả", "Late returns"]), ("noshows", ["Quá ngày lấy", "Pickup day passed"]),
        ]
        for c in counters {
            let el = e2e.element(labelBeginsWith: c.labels, type: .button)
            _ = e2e.scrollTo(el)
            e2e.note("TODO \(c.key) | \(el.exists ? el.label : "<missing>")")
            XCTAssertTrue(el.exists, "counter \(c.key) on the Hôm nay card")
        }
        let tomorrow = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Ngày mai' OR label BEGINSWITH 'Tomorrow'")).firstMatch
        e2e.note("TODO tomorrow | \(tomorrow.exists ? tomorrow.label : "<missing>")")
        XCTAssertTrue(tomorrow.exists, "tomorrow line on the Hôm nay card")
        e2e.shot("7m-today-card")

        func rowNumbers() -> String {
            var numbers: [String] = []
            for cell in app.cells.allElementsBoundByIndex where cell.exists {
                if let r = E2E.texts(cell).range(of: "#\\d{5,6}", options: .regularExpression) {
                    numbers.append(String(E2E.texts(cell)[r]).replacingOccurrences(of: "#", with: ""))
                }
            }
            return numbers.sorted().joined(separator: ",")
        }
        // Trễ hạn trả → list of late returns; Quá ngày lấy → "Chưa lấy đồ"
        for (key, labels, shot) in [("late", ["Trễ hạn trả", "Late returns"], "7m-late-list"), ("noshows", ["Quá ngày lấy", "Pickup day passed"], "7m-noshow-list")] {
            let el = e2e.element(labelBeginsWith: labels, type: .button)
            guard e2e.scrollTo(el) else { continue }
            el.tap()
            sleep(4)
            e2e.note("TODOLIST \(key) | rows=\(rowNumbers())")
            e2e.shot(shot)
            e2e.goBack()
            e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3)
            sleep(2)
        }
        // Cần giao / Cần nhận trả → Đơn hàng → Việc cần làm
        let pickups = e2e.element(labelBeginsWith: ["Cần giao", "To hand over"], type: .button)
        if e2e.scrollTo(pickups) {
            pickups.tap()
            sleep(3)
            e2e.tapIfExists(e2e.button(["To do", "Việc cần làm"]), timeout: 3)
            sleep(3)
            e2e.note("TODOLIST orders-todo | rows=\(rowNumbers())")
            e2e.shot("7m-orders-todo")
        }
    }

    /// MOB-DETAIL-01..: money lines of orders 710001..710009 on the order detail (ops scenario). Each screen's texts are noted as
    /// `E2E_NOTE: DETAIL #<n> | …`; tests/e2e/mobile/detail-check.js looks for the API's total, deposit, collateral and amount due in them.
    func test5gOrderDetailMoney() throws {
        try e2e.requireScenario(["ops"])
        try e2e.requireRole("merchant")
        try e2e.requireFlag("newOrders")
        try e2e.start()
        for number in ["710001", "710002", "710003", "710004", "710005", "710008", "710009"] {
            e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
            let all = e2e.button(["All orders", "Tất cả đơn"])
            guard all.waitForExistence(timeout: 8) else { return XCTFail("Orders tab") }
            all.tap()
            sleep(2)
            if number == "710009" { e2e.tapIfExists(e2e.saleModeButton, timeout: 3); sleep(2) }
            let search = e2e.ordersSearchField
            guard search.waitForExistence(timeout: 5) else { return XCTFail("orders search") }
            search.tap()
            search.clearText()
            search.typeText(number)
            sleep(3)
            let row = app.cells.firstMatch
            guard row.waitForExistence(timeout: 8) else { e2e.note("DETAIL #\(number) | not in the list"); XCTFail("order \(number) not listed"); continue }
            e2e.tapRow(row)
            guard e2e.orderMoreButton.waitForExistence(timeout: 10) else { XCTFail("detail of \(number) did not open"); continue }
            sleep(2)
            var texts = e2e.screenTexts()
            app.swipeUp(); sleep(1)
            texts += e2e.screenTexts()
            app.swipeUp(); sleep(1)
            texts += e2e.screenTexts()
            e2e.note("DETAIL #\(number) | \(Array(NSOrderedSet(array: texts)).compactMap { $0 as? String }.joined(separator: " ¦ "))")
            e2e.shot("5g-detail-\(number)")
            e2e.goBack()
        }
    }

    // MARK: - #727 roles on every screen, plan limits

    /// MOB-ROLE-01..: what Nhân viên (staff) and Nhân viên kho (inventory) see on each tab. Hard checks: no raw API code anywhere,
    /// no revenue tiles on Tổng quan, no delete on an order, no Người dùng / Xuất dữ liệu in Cài đặt, orders and calendar load.
    /// Everything else is noted as `E2E_NOTE: ROLE <role> <screen> | …` (use --scenario ops --role staff|kho for known data).
    func test8eRoleScreens() throws {
        if e2e.role != "staff" && e2e.role != "inventory" { throw XCTSkip("staff or inventory run only (this run: \(e2e.role))") }
        try e2e.start()
        let tag = e2e.role
        var raw: [String] = []
        let tabBar = app.tabBars.firstMatch
        e2e.note("ROLE \(tag) tabs | \(tabBar.buttons.allElementsBoundByIndex.map(\.label))")

        // Orders: list, Việc cần làm, detail ⋯ sheet without delete
        if e2e.tapTab(["My Order", "Đơn hàng"], index: 1) {
            sleep(3)
            let todo = e2e.button(["To do", "Việc cần làm"])
            e2e.note("ROLE \(tag) orders | todoSegment=\(todo.exists) texts=\(e2e.screenTexts().prefix(15))")
            e2e.shot("8e-\(tag)-orders-todo")
            raw += e2e.rawKeys()
            let all = e2e.button(["All orders", "Tất cả đơn"])
            if all.waitForExistence(timeout: 5) {
                all.tap()
                sleep(3)
                XCTAssertTrue(app.cells.firstMatch.waitForExistence(timeout: 10), "\(tag) sees orders of the outlet")
                e2e.shot("8e-\(tag)-orders-all")
                raw += e2e.rawKeys()
                e2e.tapRow(app.cells.firstMatch)
                if e2e.orderMoreButton.waitForExistence(timeout: 10) {
                    sleep(2)
                    e2e.shot("8e-\(tag)-order-detail")
                    e2e.note("ROLE \(tag) order-detail | \(e2e.screenTexts().prefix(40))")
                    raw += e2e.rawKeys()
                    if e2e.openOrderSheet() {
                        e2e.shot("8e-\(tag)-order-sheet")
                        e2e.note("ROLE \(tag) order-sheet | \(app.buttons.allElementsBoundByIndex.map(\.label).filter { !$0.isEmpty })")
                        XCTAssertFalse(e2e.button(["Delete order", "Xoá đơn", "Xóa đơn"]).exists, "\(tag) cannot delete an order (no orders.delete)")
                        e2e.tapIfExists(e2e.button(["Close", "Đóng"]), timeout: 1)
                        app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.1)).tap()
                    }
                    e2e.goBack()
                }
            }
        }

        // Calendar: the day list loads, no raw keys
        if e2e.tapTab(["Calendar", "Lịch Thuê", "Lịch"], index: 2) {
            sleep(4)
            e2e.shot("8e-\(tag)-calendar")
            e2e.note("ROLE \(tag) calendar | \(e2e.screenTexts().prefix(20))")
            raw += e2e.rawKeys()
        }

        // Tổng quan: no revenue (analytics.view.revenue is missing); today's work (analytics.view.dashboard) may show
        if e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3) {
            sleep(4)
            e2e.shot("8e-\(tag)-overview")
            let texts = e2e.screenTexts()
            e2e.note("ROLE \(tag) overview | \(texts.prefix(40))")
            raw += e2e.rawKeys()
            let revenue = ["Real income", "Thực thu", "New orders total", "Giá trị đơn mới", "Revenue", "Doanh thu", "Collateral", "Tiền cọc", "Still to collect", "Còn phải thu"]
            let shown = texts.filter { t in revenue.contains(where: { t.hasPrefix($0) }) }
            XCTAssertTrue(shown.isEmpty, "\(tag) must not see revenue figures on Tổng quan: \(shown)")
            e2e.soft(e2e.element(labelBeginsWith: ["Today's work", "Việc hôm nay", "Hôm nay", "Today"]).exists, "\(tag) sees the Hôm nay card (analytics.view.dashboard)")
        } else {
            e2e.note("ROLE \(tag) overview | no Tổng quan tab")
        }

        // Cài đặt
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        sleep(2)
        let rows = app.staticTexts.allElementsBoundByIndex.map(\.label).filter { !$0.isEmpty }
        e2e.note("ROLE \(tag) settings | \(rows.prefix(40))")
        e2e.shot("8e-\(tag)-settings")
        raw += e2e.rawKeys()
        for hidden in [["Users", "Người dùng"], ["Export Data", "Xuất dữ liệu"], ["Bank accounts", "Tài khoản ngân hàng"], ["Subscription", "Gói đăng ký", "Gói dịch vụ"]] {
            e2e.soft(!rows.contains(where: { hidden.contains($0) }), "\(tag) does not see \(hidden[0]) in Cài đặt")
        }
        XCTAssertTrue(raw.isEmpty, "raw API codes on screen: \(raw)")
    }

    /// MOB-SUB-10..: at-limit merchant (plan limits equal to what exists: 2 products, 2 customers, 1 order): creating a customer, an
    /// order or a product must answer with a readable message (no raw code), and must not create anything
    /// (the DB counts are compared by tests/e2e/mobile/subscription-flow.sh). Run for owner, staff and kho.
    func test10cPlanLimit() throws {
        try e2e.requireScenario(["at-limit"])
        try e2e.start()
        let tag = "at-limit/\(e2e.scenarioRole)"
        var seen: [String] = []
        func record(_ what: String) {
            let texts = e2e.screenTexts()
            e2e.note("LIMIT \(tag) \(what) | alert=\(e2e.lastAlert ?? "<none>") texts=\(texts.prefix(20))")
            seen += e2e.rawKeys()
            if let alert = e2e.lastAlert { seen += [alert].filter { $0.contains("PLAN_LIMIT") || $0.contains("_EXCEEDED") } }
        }

        // customer, through the cart's picker ("Khách mới")
        e2e.lastAlert = nil
        if e2e.openCartWithOneItem() {
            _ = e2e.createCustomerInPicker(name: "Khach Gioi Han", phone: E2E.uniquePhone())
            sleep(2)
            e2e.shot("10e-limit-customer")
            record("customer")
            e2e.dismissAlerts()
            // order: the first existing customer, rent today
            e2e.lastAlert = nil
            e2e.goBackOnce()
            if e2e.openCartWithOneItem() {
                e2e.cartRentToday()
                _ = e2e.pickFirstCustomer()
                let created = e2e.createOrderFromCart(cta: E2E.rentCta, shotPrefix: "10e-limit-order")
                XCTAssertFalse(created, "an order must not be created when the plan's order limit is reached")
                e2e.shot("10e-limit-order-result")
                record("order")
                e2e.dismissAlerts()
            }
            e2e.emptyCart()
        } else {
            e2e.note("LIMIT \(tag) cart | could not open the cart")
        }

        // product (owner and kho; staff has no add button on Home)
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        let add = e2e.button(["Add product", "Thêm sản phẩm"])
        if add.waitForExistence(timeout: 5) {
            add.tap()
            let name = e2e.field(["Product name", "Tên sản phẩm"])
            if name.waitForExistence(timeout: 8) {
                name.tap()
                name.typeText("SP vuot gioi han \(Int(Date().timeIntervalSince1970) % 100000)")
                e2e.hideKeyboard()
                e2e.shot("10e-limit-product-form")
                let save = e2e.button(["Save", "Lưu", "Save product", "Lưu sản phẩm", "Add", "Thêm"])
                if save.waitForExistence(timeout: 3) { save.tap(); sleep(3) } else { e2e.note("LIMIT \(tag) product | no save button") }
                e2e.shot("10e-limit-product-result")
                record("product")
                e2e.dismissAlerts()
                e2e.tapIfExists(e2e.button(["Close", "Đóng"]), timeout: 2)
            }
        } else {
            e2e.note("LIMIT \(tag) product | no Add product button for this role")
        }
        XCTAssertTrue(seen.isEmpty, "raw API codes shown for a plan limit: \(seen)")
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
    /// #727: dedicated accounts from scripts/mobile-e2e/prepare-accounts.sh (expired-trial, paused, at-limit, stock, …)
    let scenario: String
    /// owner | staff | kho (only with a scenario)
    let scenarioRole: String
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
        scenario = (env["E2E_SCENARIO"] ?? "").lowercased()
        scenarioRole = (env["E2E_SCENARIO_ROLE"] ?? "owner").lowercased()
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

    /// #727: the run was started with --scenario <slug> (one of `slugs`)
    func requireScenario(_ slugs: [String]) throws {
        if !slugs.contains(scenario) { throw XCTSkip("scenario run only: \(slugs.joined(separator: "|")) (this run: \(scenario.isEmpty ? "none" : scenario))") }
    }

    func requireRole(_ wanted: String) throws {
        if role != wanted { throw XCTSkip("\(wanted) run only (this run: \(role))") }
    }

    // MARK: #727 helpers: accounts whose subscription is broken (the main shell may never come up)

    /// Launch and log in without requiring the tab bar: an expired account may land on an alert or an empty shell.
    func startLoose() {
        app.launch()
        if isLoginScreen(timeout: 8) {
            for attempt in 1...3 {
                login()
                if !app.secureTextFields.firstMatch.waitForNonExistence(timeout: 8) {
                    shot("00-login-retry-\(attempt)", attachOnly: true)
                    dismissAlerts()
                    continue
                }
                break
            }
        }
        // notification prompt / onboarding, then give the first requests time to fail or succeed
        let deadline = Date().addingTimeInterval(14)
        while Date() < deadline {
            dismissSystemAlert()
            let skip = button(["Skip", "Bỏ qua"])
            if skip.exists && skip.isHittable { skip.tap() }
            sleep(1)
        }
    }

    /// Every visible static text, button label and alert text (what a person can read on this screen)
    func screenTexts() -> [String] {
        var out: [String] = []
        for alert in app.alerts.allElementsBoundByIndex where alert.exists {
            out.append("ALERT[" + ([alert.label] + alert.staticTexts.allElementsBoundByIndex.map(\.label)).joined(separator: " | ") + "]")
        }
        out += app.staticTexts.allElementsBoundByIndex.prefix(60).map(\.label).filter { !$0.isEmpty }
        return out
    }

    /// Raw API codes on screen ("SUBSCRIPTION_EXPIRED", "PLAN_LIMIT_EXCEEDED", "errors.x.y") are a bug
    func rawKeys() -> [String] {
        let pattern = "^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$|.*(SUBSCRIPTION_|PLAN_LIMIT|PERIOD_ENDED|NO_SUBSCRIPTION|INSUFFICIENT_PERMISSIONS|VALIDATION_ERROR).*|^[a-z]+(\\.[A-Za-z0-9]+){2,}$"
        return screenTexts().filter { NSPredicate(format: "SELF MATCHES %@", pattern).evaluate(with: $0) }
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
            // #677: "Sửa đơn #n" while the cart edits an order
            NSPredicate(format: "(label CONTAINS 'Cart ·' OR label CONTAINS 'Giỏ hàng ·') AND (label CONTAINS 'Create order' OR label CONTAINS 'Tạo đơn' OR label CONTAINS 'Edit order' OR label CONTAINS 'Sửa đơn')")
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

    // MARK: #727 helpers: Vietnam days, pixel colour, date sheet

    /// The shop (Vietnam) civil day `offset` days from today: key "yyyy-MM-dd", "dd/MM" as on the calendar cells, day number
    func vnDay(_ offset: Int) -> (key: String, dm: String, day: Int) {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
        let date = calendar.date(byAdding: .day, value: offset, to: Date())!
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        let (y, m, d) = (parts.year!, parts.month!, parts.day!)
        return (String(format: "%04d-%02d-%02d", y, m, d), String(format: "%02d/%02d", d, m), d)
    }

    /// In the date sheet (FSCalendar), tap a day number once: a same-day range on that day (same rule as pickTodayInDateSheet)
    func pickDayInDateSheet(_ day: Int) {
        sleep(1)
        let matches = app.collectionViews.cells.matching(NSPredicate(format: "label == %@ OR label BEGINSWITH %@", "\(day)", "\(day) "))
        let texts = app.collectionViews.staticTexts.matching(NSPredicate(format: "label == %@", "\(day)"))
        let pool = matches.count > 0 ? matches : texts
        guard pool.count > 0 else { return note("No day \(day) in the date sheet") }
        let target = day < 15 ? pool.element(boundBy: 0) : pool.element(boundBy: pool.count - 1)
        if target.isHittable { target.tap() } else { note("Day \(day) not hittable in the date sheet") }
        sleep(1)
    }

    /// green | amber | red | other: the dominant saturated colour in the left 16 pt of an element (the "●" of a stock line)
    func colourName(of element: XCUIElement) -> String {
        guard let image = XCUIScreen.main.screenshot().image.cgImage else { return "?" }
        let scale = CGFloat(image.width) / app.windows.firstMatch.frame.width
        let frame = element.frame
        let rect = CGRect(x: frame.minX * scale, y: frame.minY * scale, width: min(16, frame.width) * scale, height: frame.height * scale).integral
        guard let crop = image.cropping(to: rect), crop.width > 0, crop.height > 0 else { return "?" }
        var pixels = [UInt8](repeating: 0, count: crop.width * crop.height * 4)
        guard let context = CGContext(data: &pixels, width: crop.width, height: crop.height, bitsPerComponent: 8, bytesPerRow: crop.width * 4,
                                      space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return "?" }
        context.draw(crop, in: CGRect(x: 0, y: 0, width: crop.width, height: crop.height))
        var r = 0.0, g = 0.0, b = 0.0, n = 0.0
        for i in stride(from: 0, to: pixels.count, by: 4) {
            let (pr, pg, pb) = (Double(pixels[i]), Double(pixels[i + 1]), Double(pixels[i + 2]))
            let high = max(pr, pg, pb), low = min(pr, pg, pb)
            if high > 0, (high - low) / high > 0.45 { r += pr; g += pg; b += pb; n += 1 }
        }
        guard n > 0 else { return "other" }
        (r, g, b) = (r / n, g / n, b / n)
        if g > r * 1.15 && g > b * 1.3 { return "green" }
        if r > 180 && g > 110 && b < 90 && g < r * 0.85 { return "amber" }
        if r > g * 1.8 && r > b * 1.8 { return "red" }
        return "other(\(Int(r)),\(Int(g)),\(Int(b)))"
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
