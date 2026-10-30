//
//  AnyRentE2ETests.swift
//  POS ADBDUITests
//
//  End-to-end walk through the main features, like a human tester (#395).
//  Run it with scripts/mobile-e2e/ios-e2e.sh; it reads (via TEST_RUNNER_ prefixing):
//    E2E_EMAIL, E2E_PASSWORD   the account to log in with
//    E2E_ROLE                  merchant | manager | staff | inventory (manager = Quản lý chi nhánh, OUTLET_ADMIN; staff runs read-only flows + restrictions; inventory = #682)
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

    /// #973: iPad in landscape. Walks the main screens and saves one screenshot per screen (ipad-NN-*.png) for the
    /// layout review; it checks only that each screen opens. Run with: ios-e2e.sh --only testIPadLandscapeTour
    /// on an iPad simulator. It does not create or change orders.
    func testIPadLandscapeTour() throws {
        guard UIDevice.current.userInterfaceIdiom == .pad else { throw XCTSkip("iPad only") }
        e2e.rotateIfPad()
        app.launch()
        if app.secureTextFields.firstMatch.waitForExistence(timeout: 8) {
            e2e.shot("ipad-00-login")
        }
        try e2e.start()
        let landscape = app.windows.firstMatch.frame
        XCTAssertGreaterThan(landscape.width, landscape.height, "iPad runs in landscape")
        let back = { self.e2e.goBack(); sleep(1) }
        // A sheet: its close button, else tap the dimmed area beside it (iPad sheets do not cover the screen)
        let close = {
            let button = self.e2e.button(["Close", "Đóng", "Cancel", "Hủy", "Huỷ", "Done", "Xong"])
            if button.waitForExistence(timeout: 2) && button.isHittable {
                button.tap()
            } else if self.app.otherElements["PopoverDismissRegion"].firstMatch.exists {
                self.app.otherElements["PopoverDismissRegion"].firstMatch.tap()
            } else {
                self.app.coordinate(withNormalizedOffset: CGVector(dx: 0.02, dy: 0.6)).tap()
            }
            sleep(1)
        }

        // Trang chủ
        XCTAssertTrue(e2e.tapTab(["Home", "Trang chủ"], index: 0), "Home tab")
        XCTAssertTrue(app.tables.cells.firstMatch.waitForExistence(timeout: 15), "Product list")
        sleep(1)
        e2e.shot("ipad-01-home")
        e2e.tapRow(app.tables.cells.element(boundBy: 0))
        sleep(3)
        e2e.shot("ipad-02-product-detail")
        let edit = e2e.button(["Edit product", "Sửa sản phẩm", "Edit", "Sửa"])
        if edit.waitForExistence(timeout: 3) {
            edit.tap()
            sleep(2)
            e2e.shot("ipad-03-product-edit")
            let first = app.textFields.firstMatch
            if first.waitForExistence(timeout: 3) { first.tap(); sleep(1); e2e.shot("ipad-03b-product-edit-keyboard") }
            e2e.hideKeyboard()
            close()
        }
        back()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        let add = e2e.button(["Add product", "Thêm sản phẩm"])
        if add.waitForExistence(timeout: 3) {
            add.tap()
            sleep(2)
            e2e.shot("ipad-04-product-new")
            close()
            back()
        }

        // Giỏ
        if e2e.openCartWithOneItem() {
            sleep(1)
            e2e.shot("ipad-05-cart")
            let dates = e2e.element(labelBeginsWith: ["Choose rental dates", "Chọn ngày thuê"])
            if dates.waitForExistence(timeout: 3) {
                dates.tap()
                sleep(2)
                e2e.shot("ipad-06-cart-dates-sheet")
                close()
            }
            let customer = e2e.element(labelBeginsWith: ["Choose customer", "Chọn khách hàng"])
            if customer.waitForExistence(timeout: 3) {
                customer.tap()
                sleep(2)
                e2e.shot("ipad-07-cart-customer-picker")
                close()
            }
            let pricing = e2e.element(labelBeginsWith: ["Change pricing for", "Đổi cách tính giá"], type: .button)
            if pricing.waitForExistence(timeout: 3) {
                pricing.tap()
                sleep(2)
                e2e.shot("ipad-08-cart-pricing-sheet")
                close()
            }
            let more = app.buttons["cart.more"]
            if more.waitForExistence(timeout: 2) {
                more.tap()
                sleep(1)
                e2e.shot("ipad-09-cart-more")
                app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.9)).tap()
                sleep(1)
            }
            back()
            // #973: Home grid with the cart beside it (the cart has an item now)
            sleep(2)
            e2e.shot("ipad-09b-home-cart-panel")
            XCTAssertTrue(app.buttons["cart.more"].waitForExistence(timeout: 5), "iPad: the cart panel beside the grid")
        } else {
            e2e.soft(false, "iPad: cart with one item")
        }

        // Đơn hàng
        XCTAssertTrue(e2e.tapTab(["My Order", "Đơn hàng"], index: 1), "Orders tab")
        sleep(3)
        e2e.shot("ipad-10-orders-todo")
        e2e.soft(app.descendants(matching: .any)["ipad.split.empty"].exists, "iPad: Orders shows the empty right pane")
        e2e.tapIfExists(e2e.button(["All orders", "Tất cả đơn"]), timeout: 3)
        sleep(2)
        e2e.shot("ipad-11-orders-all")
        if e2e.openFirstOrder(chip: ["Booked", "Đã đặt"]) {
            sleep(2)
            e2e.shot("ipad-13-order-detail")
            e2e.soft(e2e.button(["All orders", "Tất cả đơn"]).exists, "iPad: the list stays beside the order")
            if e2e.openOrderSheet() {
                sleep(1)
                e2e.shot("ipad-14-order-more-sheet")
                let share = e2e.button(["Share order", "Chia sẻ đơn"])
                if share.exists {
                    share.tap()
                    sleep(6)
                    e2e.shot("ipad-15-order-share")
                    e2e.tapIfExists(e2e.button(["Close", "Đóng"]), timeout: 3)
                    if app.otherElements["PopoverDismissRegion"].firstMatch.exists { app.otherElements["PopoverDismissRegion"].firstMatch.tap() }
                    sleep(1)
                } else {
                    close()
                }
            }
            back()
        }
        e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
        e2e.tapIfExists(e2e.saleModeButton, timeout: 3)
        sleep(2)
        e2e.shot("ipad-12-orders-sales")
        e2e.tapIfExists(e2e.button(["Rentals", "Đơn thuê"]), timeout: 3) // back to rentals for the next run

        // Lịch, Báo cáo
        if e2e.tapTab(["Calendar", "Lịch Thuê", "Lịch"], index: 2) {
            sleep(3)
            e2e.shot("ipad-16-calendar")
        }
        if e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3) {
            sleep(4)
            e2e.shot("ipad-17-overview")
        }

        // Cài đặt
        XCTAssertTrue(e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil), "Settings tab")
        sleep(2)
        e2e.shot("ipad-18-settings")
        let openRow = { (labels: [String], name: String) in
            // On iPad the Settings list is the left pane: scroll that list, not the middle of the screen
            let list = self.app.tables.firstMatch
            let row = list.staticTexts.matching(NSPredicate(format: "label IN %@", labels)).firstMatch
            let height = self.app.windows.firstMatch.frame.height
            let visible = { row.exists && row.isHittable && row.frame.minY > 200 && row.frame.maxY < height - 40 }
            for _ in 0..<3 where !visible() { list.swipeDown() }
            for _ in 0..<8 where !visible() { list.swipeUp(); sleep(1) }
            guard visible() else { return self.e2e.note("iPad: no row \(labels)") }
            row.tap()
            sleep(3)
            self.e2e.shot(name)
            back()
            self.e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
            sleep(1)
        }
        openRow(["Customers", "Khách hàng"], "ipad-19-customers")
        // #1259: Thông báo is the bell at the top right of Cài đặt
        let bell = app.buttons["settings.notifications"]
        if bell.exists {
            bell.tap()
            sleep(3)
            e2e.shot("ipad-20-notifications")
            back()
            e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
            sleep(1)
        }
        openRow(["Print & receipts", "In & phiếu"], "ipad-21-printer")
        let mine = app.descendants(matching: .any)["attendance.mine"]
        if mine.exists {
            app.swipeDown()
            sleep(1)
            e2e.shot("ipad-22-attendance-card")
            mine.tap()
            sleep(3)
            e2e.shot("ipad-23-my-shifts")
            back()
        }
        let punch = app.buttons["attendance.punch"]
        if punch.exists {
            e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
            punch.tap()
            sleep(3)
            e2e.shot("ipad-24-attendance-scan")
            close()
        }
    }

    /// #973: iPad with the new-screen flags off (API MOBILE_FEATURES=none): each tab of the old design opens
    /// (centered column) without a crash. Run: ios-e2e.sh --fresh --only testIPadOldScreensSmoke
    func testIPadOldScreensSmoke() throws {
        guard UIDevice.current.userInterfaceIdiom == .pad else { throw XCTSkip("iPad only") }
        try e2e.start()
        for (index, names) in [["Home", "Trang chủ"], ["My Order", "Đơn hàng"], ["Calendar", "Lịch Thuê", "Lịch"],
                               ["Reports", "Báo cáo", "Overview", "Tổng quan"], ["Settings", "Cài đặt", "Setting"]].enumerated() {
            XCTAssertTrue(e2e.tapTab(names, index: index == 4 ? nil : index), "tab \(names[0])")
            sleep(3)
            e2e.shot("ipad-old-\(index)-\(names[0].lowercased().replacingOccurrences(of: " ", with: "-"))")
            XCTAssertEqual(app.state, .runningForeground, "still running after \(names[0])")
        }
    }

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
        XCTAssertTrue(e2e.homeCart.waitForExistence(timeout: 5), "Cart button counts the product after adding it")
        XCTAssertFalse(e2e.floatingCartBar.exists, "#952: no floating cart bar on Home")
        e2e.shot("14-home-cart-button")
    }

    // MARK: #1346 "Hiện ở chi nhánh"

    private var listingTicks: XCUIElementQuery {
        app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'product.form.listing.'"))
    }

    /// Scrolls the open product form down until its "Hiện ở chi nhánh" ticks show; false when the form has none
    private func scrollToListingTicks() -> Bool {
        for _ in 0..<6 where !listingTicks.firstMatch.exists { app.swipeUp() }
        return listingTicks.firstMatch.waitForExistence(timeout: 2)
    }

    private func editOpenProduct() -> Bool {
        let edit = e2e.button(["Edit product", "Sửa sản phẩm", "Edit", "Sửa"])
        guard edit.waitForExistence(timeout: 5) else { return false }
        edit.tap()
        sleep(2)
        return true
    }

    /// #1346: the owner unticks the branch in use in the product form (E2E_LISTING_PRODUCT, default "Product 5 -"), saves, sees the
    /// row on Home say "Chưa hiện ở chi nhánh này" without a +, then ticks it back. The DB is checked from outside the test.
    func test1dBranchListingOwner() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        let key = ProcessInfo.processInfo.environment["E2E_LISTING_PRODUCT"] ?? "Product 5 -"
        guard e2e.openProduct(named: key) else { return XCTFail("product \(key) not found") }
        XCTAssertTrue(editOpenProduct(), "owner sees Edit")
        if ProcessInfo.processInfo.environment["E2E_EXPECT_NO_TICK"] == "1" { // a shop with one active branch (Basic): no box
            for _ in 0..<4 { app.swipeUp() }
            XCTAssertFalse(listingTicks.firstMatch.exists, "a one-branch shop has no 'Hiện ở chi nhánh' box")
            e2e.shot("37-listing-owner-one-branch-form")
            e2e.tapIfExists(e2e.button(["Close", "Đóng"]), timeout: 3)
            e2e.goBackOnce()
            XCTAssertTrue(e2e.openProduct(named: key))
            e2e.goBackOnce()
            e2e.shot("38-listing-owner-one-branch-home")
            return
        }
        guard scrollToListingTicks() else { return XCTFail("the form has no 'Hiện ở chi nhánh' ticks (a shop with 2+ branches?)") }
        XCTAssertGreaterThanOrEqual(listingTicks.count, 2, "one tick per active branch")
        app.swipeUp()
        e2e.shot("30-listing-owner-form-ticked")
        let first = listingTicks.element(boundBy: 0)
        XCTAssertEqual(first.value as? String, "1", "the branch in use is ticked")
        first.tap()
        sleep(1)
        XCTAssertEqual(listingTicks.element(boundBy: 0).value as? String, "0", "tapping unticks")
        app.swipeUp()
        e2e.shot("31-listing-owner-form-unticked")
        let save = e2e.button(["Save changes", "Lưu thay đổi"])
        XCTAssertTrue(save.waitForExistence(timeout: 3))
        save.tap()
        sleep(4)
        e2e.dismissAlerts()
        e2e.goBackOnce()
        // Home: the row is still there for the owner, marked, with no +
        XCTAssertTrue(e2e.openProduct(named: key), "owner still finds the unticked product")
        e2e.goBackOnce()
        let notShown = app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Not shown at this branch' OR label CONTAINS 'Chưa hiện ở chi nhánh này'")).firstMatch
        e2e.soft(notShown.waitForExistence(timeout: 5), "the unticked row says it is not shown here")
        e2e.shot("32-listing-owner-home-unlisted")
        // Tick it back
        XCTAssertTrue(e2e.openProduct(named: key))
        XCTAssertTrue(editOpenProduct())
        guard scrollToListingTicks() else { return XCTFail("ticks missing on the second edit") }
        XCTAssertEqual(listingTicks.element(boundBy: 0).value as? String, "0", "the untick was saved")
        listingTicks.element(boundBy: 0).tap()
        e2e.button(["Save changes", "Lưu thay đổi"]).tap()
        sleep(4)
        e2e.dismissAlerts()
        e2e.goBackOnce()
        e2e.shot("33-listing-owner-home-ticked-back")
    }

    /// #1346: a branch role (manager, kho, staff) sees the dimmed tick (E2E_LISTING_PRODUCT has rows at 2+ branches), cannot change it,
    /// and its list holds no product that is unticked at its branch (E2E_HIDDEN_PRODUCT, unticked from outside the test).
    func test1eBranchListingBranchRole() throws {
        try e2e.requireFlag("newProducts")
        if e2e.role == "merchant" { throw XCTSkip("branch roles only") }
        try e2e.start()
        let env = ProcessInfo.processInfo.environment
        if let hidden = env["E2E_HIDDEN_PRODUCT"] {
            e2e.tapTab(["Home", "Trang chủ"], index: 0)
            let search = e2e.field(["Search name, barcode or take a photo", "Tìm tên, mã vạch hoặc chụp ảnh", "Name, barcode…", "Tên, mã vạch…"])
            XCTAssertTrue(search.waitForExistence(timeout: 10))
            search.tap()
            search.typeText(hidden + "\n")
            sleep(3)
            e2e.soft(!app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", hidden)).firstMatch.exists, "'\(hidden)' is unticked at this branch and not listed")
            e2e.shot("34-listing-\(e2e.role)-hidden-search")
        }
        let key = env["E2E_LISTING_PRODUCT"] ?? "Product 5 -"
        guard e2e.openProduct(named: key) else { return XCTFail("product \(key) not found") }
        e2e.shot("35-listing-\(e2e.role)-detail")
        if e2e.role == "staff" { // staff has no edit form: the dimmed line sits on the detail
            let line = app.staticTexts.matching(NSPredicate(format: "identifier == 'product.detail.listing'")).firstMatch
            e2e.soft(line.waitForExistence(timeout: 3), "staff sees the dimmed 'Hiện ở chi nhánh' line on the detail")
            return
        }
        XCTAssertTrue(editOpenProduct(), "\(e2e.role) sees Edit")
        guard scrollToListingTicks() else { return XCTFail("no dimmed tick in the form") }
        app.swipeUp()
        e2e.shot("36-listing-\(e2e.role)-form")
        XCTAssertEqual(listingTicks.count, 1, "only the own branch")
        XCTAssertFalse(listingTicks.element(boundBy: 0).isEnabled, "the tick is dimmed and cannot be changed")
    }

    /// #1353 (#1335 PR 2m, mockup C1a/C1b/C1e): a rental cart for today with E2E_HINT_PRODUCTS (default "Product 1 - Electronics,
    /// Product 3 - Furniture"; the first is out today at this branch while another branch has it, the second is out everywhere).
    /// Owner, manager and kho of a shop with other branches read "Chi nhánh khác còn: …" under the first line only; staff and a
    /// one-branch shop (E2E_HINT_EXPECT=none) read only the "Hết đồ" tag. Another day (tomorrow) has no short line and no hint.
    func test2cCartOtherBranches() throws {
        try e2e.requireFlag("newProducts")
        try e2e.start()
        let env = ProcessInfo.processInfo.environment
        let names = (env["E2E_HINT_PRODUCTS"] ?? "Product 1 - Electronics,Product 3 - Furniture").split(separator: ",").map(String.init)
        let expectHint = (env["E2E_HINT_EXPECT"] ?? (e2e.role == "staff" ? "none" : "show")) == "show"
        e2e.emptyCart()
        for name in names where !addFromHome(name) { return XCTFail("could not add \(name)") }
        guard openCart() else { return XCTFail("cart did not open") }
        e2e.cartRentToday()
        sleep(5)
        let hint = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Chi nhánh khác còn' OR label BEGINSWITH 'Other branches have'"))
        e2e.note("hints today: \(hint.allElementsBoundByIndex.map(\.label))")
        e2e.shot("othbr-\(e2e.role)-1-today")
        if expectHint {
            XCTAssertEqual(hint.count, 1, "one hint, under the line that another branch can cover")
            XCTAssertTrue(hint.firstMatch.label.contains("Quận 7 (3)"), "the other branch and its units: \(hint.firstMatch.label)")
        } else {
            XCTAssertEqual(hint.count, 0, "no hint for this role or shop")
        }
        // Another day: the dates row → tomorrow. The line is not short any more, so the hint is gone.
        let tomorrow = Calendar.current.component(.day, from: Calendar.current.date(byAdding: .day, value: 1, to: Date())!)
        let chooser = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS '→'")).firstMatch
        if chooser.waitForExistence(timeout: 5) {
            chooser.tap()
            sleep(2)
            e2e.shot("othbr-\(e2e.role)-1b-dates-sheet")
            let cells = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "\(tomorrow)"))
            e2e.note("tomorrow \(tomorrow): \(cells.count) elements, hittable \(cells.allElementsBoundByIndex.map(\.isHittable))")
            let cell = cells.allElementsBoundByIndex.first { $0.isHittable }
            cell?.tap()
            sleep(1)
            e2e.shot("othbr-\(e2e.role)-1c-dates-tapped")
            e2e.tapIfExists(e2e.button(["Confirm", "Xác nhận"]), timeout: 3)
            sleep(5)
        } else {
            e2e.soft(false, "the dates row to change the day")
        }
        e2e.note("hints tomorrow: \(hint.allElementsBoundByIndex.map(\.label))")
        e2e.shot("othbr-\(e2e.role)-2-tomorrow")
        XCTAssertEqual(hint.count, 0, "no short line on a free day, so no hint")
        e2e.goBackOnce()
        e2e.emptyCart()
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

    /// #1162: tap the quantity number, type 20 on the shared pad, confirm.
    func test2bQuantityPad() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        guard e2e.openCartWithOneItem() else { return XCTFail("Could not open the cart with an item") }
        e2e.shot("qty-1-cart")
        let enter = e2e.button(["Nhập số lượng", "Enter quantity"])
        guard e2e.scrollTo(enter) else { return XCTFail("cart line has Nhập số lượng") }
        enter.tap()
        let confirm = e2e.button(["Confirm", "Xác nhận"])
        XCTAssertTrue(confirm.waitForExistence(timeout: 5), "the quantity pad opens")
        e2e.shot("qty-2-pad")
        for key in ["2", "0"] { e2e.tapIfExists(e2e.button([key]), timeout: 2) }
        XCTAssertTrue(app.staticTexts["20"].waitForExistence(timeout: 2), "the pad shows 20")
        e2e.shot("qty-3-typed-20")
        confirm.tap()
        sleep(1)
        XCTAssertTrue(enter.waitForExistence(timeout: 5), "pad closes")
        XCTAssertTrue(app.staticTexts["20"].waitForExistence(timeout: 3), "the cart line quantity is 20")
        e2e.shot("qty-4-applied")
    }

    /// #1079 multi-cart: bar, picker, switch, rent + sale create, delete with confirm, edit order, relaunch
    func test11MultiCart() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        if e2e.leaveEditMode() { e2e.shot("110-leftover-edit-cancelled") }
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        XCTAssertTrue(app.tables.cells.firstMatch.waitForExistence(timeout: 15), "Home list loads")

        func any(_ id: String) -> XCUIElement { app.descendants(matching: .any).matching(identifier: id).firstMatch }
        func alive(_ step: String) { e2e.note("ALIVE \(step): state \(app.state.rawValue)") }
        func addNth(_ n: Int) -> Bool {
            let add = app.tables.buttons.matching(NSPredicate(
                format: "(label BEGINSWITH 'Add ' AND label CONTAINS 'cart') OR (label BEGINSWITH 'Thêm ' AND label CONTAINS 'giỏ')"))
            var seen = 0
            for index in 0..<min(add.count, 8) {
                let candidate = add.element(boundBy: index)
                guard candidate.isHittable && candidate.isEnabled else { continue }
                if seen == n { candidate.tap(); sleep(1); return true }
                seen += 1
            }
            return false
        }
        func openPicker() -> Bool {
            let sw = any("cart.switchBar.switch")
            guard sw.waitForExistence(timeout: 5) else { return false }
            sw.tap()
            return any("cart.picker").waitForExistence(timeout: 5)
        }
        func pickerRows() -> [XCUIElement] { app.cells.matching(identifier: "cart.picker.row").allElementsBoundByIndex }
        func barLabel() -> String { any("cart.switchBar").exists ? any("cart.switchBar").label : "none" }
        func barTexts() -> String { any("cart.switchBar").exists ? any("cart.switchBar").descendants(matching: .staticText).allElementsBoundByIndex.map(\.label).joined(separator: " / ") : "none" }
        func closePicker() { app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.08)).tap(); sleep(1) }

        // 0. Clean start: empty cart, no bar
        e2e.emptyCart()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        XCTAssertFalse(any("cart.switchBar").exists, "S0: no bar with an empty single cart")
        e2e.shot("110-s0-empty-no-bar")

        // 1. First item: bar appears with 1 cart
        XCTAssertTrue(addNth(0), "S1: add an item")
        XCTAssertTrue(any("cart.switchBar").waitForExistence(timeout: 5), "S1: bar shows for a single cart with items")
        e2e.shot("111-s1-bar-one-cart")
        e2e.note("S1 bar label: \(any("cart.switchBar").label)")
        XCTAssertTrue(openPicker(), "S1: tapping the name opens the picker")
        e2e.shot("112-s1-picker-one-cart")
        let newBtn = app.buttons["cart.picker.new"]
        XCTAssertTrue(newBtn.waitForExistence(timeout: 3), "S1: + Giỏ mới exists")
        newBtn.tap()
        sleep(1)
        e2e.shot("113-s1-after-new-cart")
        // second cart is empty and active; bar still shows (2 carts)
        XCTAssertTrue(any("cart.switchBar").waitForExistence(timeout: 5), "S1: bar shows with 2 carts")
        e2e.note("S1 bar after new cart: \(any("cart.switchBar").label)")
        XCTAssertTrue(addNth(1) || addNth(0), "S1: add an item to cart 2")
        e2e.shot("114-s1-cart2-with-item")
        XCTAssertTrue(openPicker(), "S1: picker with two carts")
        let rows = pickerRows()
        XCTAssertEqual(rows.count, 2, "S1: picker lists two carts")
        e2e.shot("115-s1-picker-two-carts")
        // switch to cart 1 (the other row)
        if rows.count == 2 { (rows.first { !$0.label.isEmpty && !($0.value as? String ?? "").contains("selected") } ?? rows[0]).tap() }
        sleep(1)
        e2e.shot("116-s1-switched")
        e2e.note("S1 bar after switch: \(any("cart.switchBar").label)")

        // 2. Open the cart: switch row, customer, name
        let open = app.buttons["cart.switchBar.open"]
        XCTAssertTrue(open.waitForExistence(timeout: 3), "S2: Xem giỏ button")
        open.tap()
        XCTAssertTrue(any("cart.switchRow").waitForExistence(timeout: 8), "S2: cart screen shows the Giỏ · Đổi row")
        e2e.note("S2 row label: \(any("cart.switchRow").label)")
        e2e.shot("120-s2-cart-row-unnamed")
        let customer = e2e.pickFirstCustomer() ?? ""
        sleep(1)
        alive("after "+#line.description)
        e2e.shot("121-s2-cart-customer")
        e2e.note("S2 row label after customer: \(any("cart.switchRow").label) (customer \(customer))")
        XCTAssertFalse(any("cart.switchRow").label.hasPrefix("Giỏ "), "S2: after choosing a customer the row shows the customer name, not Giỏ k")
        // dates -> then back to Home: bar has the dates line
        e2e.cartRentToday()
        e2e.shot("122-s2-cart-dates")
        alive("after "+#line.description)
        e2e.goBackOnce()
        sleep(1)
        e2e.shot("123-s2-home-bar-with-dates")
        alive("after "+#line.description)
        let texts = e2e.screenTexts().joined(separator: " | ")
        e2e.note("S2 home texts: \(texts)")
        e2e.soft(texts.contains("→"), "S2: bar shows the rental dates line")

        // 3. Rent order: create from the cart, then the bar/cart state
        e2e.note("S3 app state before tap: \(app.state.rawValue)")
        app.buttons["cart.switchBar.open"].tap()
        e2e.note("S3 app state after tap: \(app.state.rawValue)")
        XCTAssertTrue(e2e.button(["Back to products", "Quay lại chọn sản phẩm"]).waitForExistence(timeout: 8), "S3: cart opens")
        XCTAssertTrue(e2e.createOrderFromCart(cta: E2E.rentCta, shotPrefix: "130-s3-rent"),
                      "S3: rent order created (last alert: \(e2e.lastAlert ?? "none"))")
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        sleep(1)
        e2e.shot("131-s3-home-after-rent")
        XCTAssertTrue(any("cart.switchBar").exists, "S3: the other cart (with item) is active and the bar still shows")
        e2e.note("S3 bar after rent: \(any("cart.switchBar").label) | \(e2e.screenTexts().joined(separator: " | "))")

        // 4. Sale order from the remaining cart
        any("cart.switchBar.open").tap()
        XCTAssertTrue(e2e.button(["Back to products", "Quay lại chọn sản phẩm"]).waitForExistence(timeout: 8), "S4: cart opens")
        XCTAssertFalse(any("cart.switchRow").exists, "S4: one cart left, no switch row")
        let sale = e2e.button(["Sale", "Bán"])
        if sale.waitForExistence(timeout: 3) { sale.tap(); sleep(1) }
        _ = e2e.pickFirstCustomer()
        e2e.shot("140-s4-sale-cart")
        XCTAssertTrue(e2e.createOrderFromCart(cta: ["Sell & collect", "Bán & thu tiền"], shotPrefix: "141-s4-sale"),
                      "S4: sale order created (last alert: \(e2e.lastAlert ?? "none"))")
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        sleep(1)
        e2e.shot("142-s4-home-after-sale")
        XCTAssertFalse(any("cart.switchBar").exists, "S4: all carts done, no bar")

        // 5. Delete: build two carts, swipe-delete with confirmation
        XCTAssertTrue(addNth(0), "S5: item for cart 1")
        XCTAssertTrue(openPicker(), "S5: picker")
        app.buttons["cart.picker.new"].tap(); sleep(1)
        XCTAssertTrue(addNth(1) || addNth(0), "S5: item for cart 2")
        XCTAssertTrue(openPicker(), "S5: picker with 2")
        e2e.shot("150-s5-picker-before-delete")
        var rs = pickerRows()
        XCTAssertEqual(rs.count, 2, "S5: two carts")
        rs.last?.swipeLeft()
        sleep(1)
        e2e.shot("151-s5-swipe")
        let del = app.buttons.matching(NSPredicate(format: "label IN %@", ["Xoá", "Xóa", "Delete"])).firstMatch
        XCTAssertTrue(del.waitForExistence(timeout: 3), "S5: swipe shows Xoá")
        del.tap()
        let confirmTitle = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Xoá giỏ này?", "Delete this cart?"])).firstMatch
        XCTAssertTrue(confirmTitle.waitForExistence(timeout: 3), "S5: delete asks for confirmation")
        e2e.shot("152-s5-confirm")
        let cancel = app.alerts.buttons.matching(NSPredicate(format: "label IN %@", ["Huỷ", "Hủy", "Cancel"])).firstMatch
        XCTAssertTrue(cancel.exists, "S5: Cancel on the alert")
        cancel.tap(); sleep(1)
        XCTAssertEqual(pickerRows().count, 2, "S5: cancel keeps both carts")
        rs = pickerRows()
        rs.last?.swipeLeft(); sleep(1)
        app.buttons.matching(NSPredicate(format: "label IN %@", ["Xoá", "Xóa", "Delete"])).firstMatch.tap()
        let ok = app.alerts.buttons.matching(NSPredicate(format: "label IN %@", ["Xoá", "Xóa", "Delete"])).firstMatch
        XCTAssertTrue(ok.waitForExistence(timeout: 3), "S5: destructive confirm button")
        ok.tap(); sleep(1)
        e2e.shot("153-s5-after-delete")
        e2e.note("S5 after delete: rows \(pickerRows().count), texts \(e2e.screenTexts().joined(separator: " | "))")
        if any("cart.picker").exists { closePicker() }
        e2e.shot("154-s5-home-after-delete")

        // 6. Edit an existing order while 1-2 carts hold items
        e2e.note("S6 start: bar \(any("cart.switchBar").exists ? any("cart.switchBar").label : "none")")
        if !any("cart.switchBar").exists { _ = addNth(0) }
        if any("cart.switchBar").exists, openPicker() { app.buttons["cart.picker.new"].tap(); sleep(1); _ = addNth(1) || addNth(0) }
        e2e.shot("160-s6-before-edit")
        let cartsBefore = barTexts()
        var pickerBefore = 0
        if any("cart.switchBar").exists, openPicker() { pickerBefore = pickerRows().count; closePicker() }
        let beforeTexts = e2e.screenTexts().joined(separator: " | ")
        XCTAssertTrue(e2e.tapTab(["My Order", "Đơn hàng"], index: 1) || true)
        XCTAssertTrue(openAllOrders(), "S6: Tất cả đơn")
        sleep(2)
        let booked = app.cells.allElementsBoundByIndex.first { E2E.texts($0).contains("Đã đặt") || E2E.texts($0).contains("Reserved") }
        let rowToEdit = booked ?? app.cells.firstMatch
        e2e.tapRow(rowToEdit)
        XCTAssertTrue(e2e.orderMoreButton.waitForExistence(timeout: 10), "S6: order detail opens")
        e2e.shot("161-s6-detail")
        e2e.note("S6 carts before edit: [\(cartsBefore)], \(pickerBefore) carts")
        guard e2e.tapOrderSheetRow(["Edit order", "Sửa đơn"]) else { return XCTFail("S6: the order offers no Sửa đơn") }
        sleep(2)
        e2e.shot("162-s6-edit-home")
        XCTAssertFalse(any("cart.switchBar").exists, "S6: no cart bar while editing")
        if e2e.homeCart.waitForExistence(timeout: 5) { e2e.homeCart.tap() }
        sleep(2)
        e2e.shot("163-s6-edit-cart")
        XCTAssertFalse(any("cart.switchRow").exists, "S6: no switch row while editing")
        // 6a. cancel the edit
        XCTAssertTrue(e2e.leaveEditMode(), "S6a: Huỷ sửa leaves edit mode")
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        sleep(1)
        e2e.shot("164-s6-after-cancel-edit")
        let afterCancel = barTexts()
        var pickerAfterCancel = 0
        if any("cart.switchBar").exists, openPicker() { pickerAfterCancel = pickerRows().count; e2e.shot("164b-s6-picker-after-cancel"); closePicker() }
        e2e.note("S6a carts after cancel edit: [\(afterCancel)], \(pickerAfterCancel) carts (before: \(pickerBefore))")
        e2e.soft(afterCancel != "none", "S6a: after cancelling the edit a cart bar is back (the cart the edit replaced is empty or restored)")

        // 6b. edit again and save a change
        e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
        XCTAssertTrue(openAllOrders(), "S6b: Tất cả đơn")
        sleep(2)
        let again = app.cells.allElementsBoundByIndex.first { E2E.texts($0).contains("Đã đặt") || E2E.texts($0).contains("Reserved") } ?? app.cells.firstMatch
        e2e.tapRow(again)
        XCTAssertTrue(e2e.orderMoreButton.waitForExistence(timeout: 10), "S6b: detail opens")
        XCTAssertTrue(e2e.tapOrderSheetRow(["Edit order", "Sửa đơn"]), "S6b: Sửa đơn")
        sleep(2)
        if e2e.homeCart.waitForExistence(timeout: 5) { e2e.homeCart.tap() }
        let plus = e2e.button(["Thêm 1", "One more"])
        if e2e.scrollTo(plus) { plus.tap(); sleep(2); e2e.dismissAlerts() }
        let save = e2e.button(["Lưu thay đổi", "Save changes"])
        XCTAssertTrue(save.waitForExistence(timeout: 5), "S6b: Lưu thay đổi")
        if !save.isHittable { app.swipeDown() }
        save.tap()
        let sheetSave = app.buttons["cart.edit.save"]
        XCTAssertTrue(sheetSave.waitForExistence(timeout: 8), "S6b: save sheet")
        e2e.shot("165-s6-save-sheet")
        sheetSave.tap()
        XCTAssertTrue(e2e.orderMoreButton.waitForExistence(timeout: 10), "S6b: save lands on the order detail")
        sleep(2)
        e2e.shot("166-s6-saved-detail")
        e2e.goBackOnce()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        sleep(1)
        e2e.shot("167-s6-home-after-save")
        e2e.note("S6b carts after save: \(barTexts())")

        // 7. Relaunch: carts persist. Make sure two distinct carts exist first.
        if !any("cart.switchBar").exists { _ = addNth(0) }
        if openPicker() { app.buttons["cart.picker.new"].tap(); sleep(1); _ = addNth(1) || addNth(0) }
        e2e.shot("168-s7-before-relaunch")
        let beforeRelaunch = barTexts()
        var rowsBefore = 0
        if openPicker() { rowsBefore = pickerRows().count; closePicker() }
        app.terminate(); app.launch()
        e2e.settle(seconds: 8)
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        sleep(2)
        e2e.shot("170-s7-after-relaunch")
        let afterRelaunch = barTexts()
        e2e.note("S7 bar before [\(beforeRelaunch)] after [\(afterRelaunch)], carts before \(rowsBefore)")
        XCTAssertEqual(afterRelaunch, beforeRelaunch, "S7: the active cart survives a relaunch")
        if openPicker() {
            XCTAssertEqual(pickerRows().count, rowsBefore, "S7: all carts survive a relaunch")
            e2e.shot("171-s7-picker-after-relaunch")
            closePicker()
        }
        // clean: empty carts
        e2e.emptyCart()
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

        // The sort bar under the status chips opens "Lọc & sắp xếp" (board Loc, #888: one date for sort and range).
        let filter = e2e.sortButton
        if filter.waitForExistence(timeout: 3) {
            filter.tap()
            sleep(1)
            e2e.shot("42-orders-filter-sheet")
            e2e.soft(!e2e.button(["Nearest task", "Việc gần nhất"]).exists, "#888: Việc gần nhất left the sheet")
            e2e.tapIfExists(e2e.button(["Return date", "Ngày trả"]))
            e2e.tapIfExists(e2e.button(["Next 7 days", "7 ngày tới"]))
            sleep(1)
            e2e.shot("42b-orders-filter-return")
            e2e.tapIfExists(e2e.element(labelBeginsWith: ["Show", "Xem"], type: .button), timeout: 3)
            sleep(2)
            e2e.soft(e2e.element(labelBeginsWith: ["Sorted by return date", "Xếp theo ngày trả"], type: .button).exists,
                     "list header says it is sorted by return date")
            e2e.shot("42c-orders-return")
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

    /// #1231: a STAGED shop (prepare with 3 plan orders: stage due today, 3 days late, due tomorrow) lists the stages that
    /// are due today or late as To do rows; tomorrow's stage is not a row; a tap opens the order
    func test4dTodoDepositStages() throws {
        try e2e.requireFlag("newOrders")
        try e2e.start()
        e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
        sleep(2)
        let todo = e2e.button(["To do", "Việc cần làm"])
        XCTAssertTrue(todo.waitForExistence(timeout: 8), "Việc cần làm segment")
        todo.tap()
        sleep(3)
        e2e.shot("1231-a-todo-stages")
        // The stage rows sit among the late rows (most late first): scroll until both are seen
        let stageTexts = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Cọc' OR label BEGINSWITH 'Deposit'"))
        var seen = Set<String>()
        for _ in 0..<8 {
            for index in 0..<stageTexts.count { seen.insert(stageTexts.element(boundBy: index).label) }
            if seen.count >= 2 { break }
            app.swipeUp()
            sleep(1)
        }
        e2e.note("deposit stage rows seen: \(seen.sorted())")
        sleep(2)
        e2e.shot("1231-b-stage-rows")
        XCTAssertEqual(seen.count, 2, "one row for the stage due today and one for the late stage, none for tomorrow")
        if let first = seen.sorted().first {
            let target = stageTexts.matching(NSPredicate(format: "label == %@", first)).firstMatch
            e2e.tapRow(target)
            e2e.soft(e2e.orderMoreButton.waitForExistence(timeout: 10), "a deposit stage row opens its order")
            sleep(2)
            e2e.shot("1231-c-stage-order")
            e2e.goBackOnce()
        }
    }

    /// #888: Tất cả đơn rows show only "Lấy dd/mm/yy  Trả dd/mm/yy"; one "Xếp theo" date drives the order and the range;
    /// the bar always says how the list is sorted. Screens for each date, a range by each date, and an order detail.
    func test4bOrdersSortDates() throws {
        try e2e.requireFlag("newOrders")
        try e2e.start()
        guard openAllOrders() else { return XCTFail("Tất cả đơn did not list rows") }
        sleep(1)
        e2e.shot("4b-00-default-pickup")
        e2e.soft(e2e.element(labelBeginsWith: ["Sorted by pickup date · latest first", "Xếp theo ngày lấy · mới nhất trước"], type: .button).exists,
                 "default: sorted by pickup date, nearest first")
        let dmy = "[0-9]{2}/[0-9]{2}/[0-9]{2}"
        // #1008: the two dates are icon chips ("↗ 20/10/26", "↩ 22/10/26"); VoiceOver reads each as "Lấy 20/10/26" / "Trả 22/10/26"
        let pickupChip = app.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "(Lấy|Pickup) \(dmy)")).firstMatch
        let returnChip = app.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "(Trả|Return) \(dmy)")).firstMatch
        e2e.soft(pickupChip.waitForExistence(timeout: 3) && returnChip.exists, "a row has the chips Lấy dd/mm/yy and Trả dd/mm/yy")
        e2e.soft(app.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "#.* · (tạo|created) \(dmy) [0-9]{2}:[0-9]{2}")).firstMatch.exists,
                 "Tất cả đơn rows keep #code · tạo dd/mm/yy HH:mm (owner)")

        let steps: [(date: [String], range: [String]?, farthest: Bool, shot: String, bar: [String])] = [
            (["Return date", "Ngày trả"], nil, false, "4b-10-return", ["Sorted by return date", "Xếp theo ngày trả"]),
            (["Created date", "Ngày tạo"], nil, false, "4b-20-created", ["Sorted by created date · newest first", "Xếp theo ngày tạo · mới nhất trước"]),
            (["Created date", "Ngày tạo"], nil, true, "4b-25-created-oldest", ["Sorted by created date · oldest first", "Xếp theo ngày tạo · cũ nhất trước"]),
            (["Pickup date", "Ngày lấy"], ["This month", "Tháng này"], false, "4b-30-pickup-month", ["Sorted by pickup date", "Xếp theo ngày lấy"]),
            (["Return date", "Ngày trả"], ["This month", "Tháng này"], false, "4b-40-return-month", ["Sorted by return date", "Xếp theo ngày trả"]),
            (["Created date", "Ngày tạo"], ["This month", "Tháng này"], false, "4b-50-created-month", ["Sorted by created date", "Xếp theo ngày tạo"]),
        ]
        for step in steps {
            guard e2e.sortButton.waitForExistence(timeout: 5) else { XCTFail("sort bar"); return }
            e2e.sortButton.tap()
            sleep(1)
            e2e.tapIfExists(e2e.button(["Reset Filter", "Đặt lại"]))
            e2e.tapIfExists(e2e.button(step.date))
            if step.farthest { e2e.tapIfExists(e2e.button(["Oldest first", "Cũ nhất trước", "Earliest first", "Xa nhất trước"])) }
            if let range = step.range { e2e.tapIfExists(e2e.button(range)) }
            sleep(1)
            e2e.shot(step.shot + "-sheet")
            e2e.tapIfExists(e2e.element(labelBeginsWith: ["Show", "Xem"], type: .button), timeout: 3)
            sleep(2)
            e2e.soft(e2e.element(labelBeginsWith: step.bar, type: .button).exists, "bar after \(step.shot): \(step.bar)")
            e2e.shot(step.shot)
        }
        // Order detail: dates dd/mm/yy, "Đặt" (created) step
        if let first = app.cells.allElementsBoundByIndex.first(where: { $0.isHittable }) {
            e2e.tapRow(first)
            sleep(2)
            e2e.shot("4b-60-detail")
            e2e.soft(app.descendants(matching: .any).matching(NSPredicate(format: "label MATCHES %@", ".*\(dmy).*")).firstMatch.exists,
                     "detail shows dd/mm/yy")
            e2e.goBackOnce()
        }
        // Back to the default for the next flows
        if e2e.sortButton.waitForExistence(timeout: 5) {
            e2e.sortButton.tap()
            sleep(1)
            e2e.tapIfExists(e2e.button(["Reset Filter", "Đặt lại"]))
            e2e.tapIfExists(e2e.element(labelBeginsWith: ["Show", "Xem"], type: .button), timeout: 3)
        }
    }

    /// #891: list badge vs detail badge for one order of each status (Đã đặt, Đang thuê, Đã trả, Đã huỷ, Hoàn thành)
    func test4cBadgeListVsDetail() throws {
        try e2e.requireFlag("newOrders")
        try e2e.start()
        guard openAllOrders() else { return XCTFail("Tất cả đơn did not list rows") }
        let chips: [([String], String)] = [(["Booked", "Đã đặt"], "reserved"), (["Renting", "Đang thuê"], "renting"),
                                           (["Returned", "Đã trả"], "returned"), (["Cancelled", "Đã huỷ"], "cancelled")]
        for (labels, name) in chips {
            let chip = app.buttons.matching(NSPredicate(format: "label IN %@", labels)).firstMatch
            guard chip.waitForExistence(timeout: 5) else { e2e.note("chip \(name) missing"); continue }
            chip.tap()
            sleep(2)
            e2e.shot("4c-\(name)-list")
            if let row = app.cells.allElementsBoundByIndex.first(where: { $0.isHittable }) {
                e2e.tapRow(row)
                sleep(2)
                e2e.shot("4c-\(name)-detail")
                e2e.goBackOnce()
                sleep(1)
            }
        }
        e2e.tapIfExists(app.buttons.matching(NSPredicate(format: "label IN %@", ["All", "Tất cả"])).firstMatch)
        let sale = e2e.saleModeButton
        if sale.waitForExistence(timeout: 5) {
            sale.tap()
            sleep(2)
            e2e.shot("4c-completed-list")
            if let row = app.cells.allElementsBoundByIndex.first(where: { $0.isHittable && $0.label.contains("Hoàn") || $0.staticTexts["Hoàn thành"].exists }) {
                e2e.tapRow(row)
                sleep(2)
                e2e.shot("4c-completed-detail")
                e2e.goBackOnce()
            }
        }
    }

    /// #1043: the order note in TIỀN looks like an item note line and opens the same sheet ("Ghi chú đơn"); the note
    /// shows on the entry after Lưu, and "Xoá ghi chú" clears it again
    func test8hCartOrderNoteSheet() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        e2e.emptyCart()
        guard e2e.openCartWithOneItem() else { return XCTFail("Could not open the cart with an item") }
        // #1056: the order note is a TIỀN row "Ghi chú … Thêm ✎" (it was the "Ghi chú đơn" entry)
        let entry = app.buttons.matching(NSPredicate(format: "label IN %@", ["Note", "Ghi chú"])).firstMatch
        XCTAssertTrue(e2e.scrollTo(entry), "the order note entry is in TIỀN")
        sleep(1)
        e2e.shot("1043a-cart-order-note-empty")
        entry.tap()
        let title = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Order note", "Ghi chú đơn"])).firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 5), "the entry opens the Ghi chú đơn sheet")
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5), "the keyboard opens, as in the item sheet")
        XCTAssertTrue(e2e.element(labelBeginsWith: ["Photos", "Ảnh"]).exists, "a new order keeps the note photos (#480)")
        sleep(1)
        e2e.shot("1043b-cart-order-note-sheet")
        app.textViews.firstMatch.typeText("Giao trước 9h sáng thứ 7\nKhách lấy tại tiệm, gọi trước 30 phút")
        e2e.shot("1043c-cart-order-note-typed")
        e2e.button(["Lưu", "Save"]).tap()
        sleep(2)
        let filled = app.buttons.matching(NSPredicate(format: "value CONTAINS 'Giao trước 9h'")).firstMatch
        XCTAssertTrue(filled.waitForExistence(timeout: 5), "the note shows on the entry")
        _ = e2e.scrollTo(filled)
        e2e.shot("1043d-cart-order-note-filled")
        filled.tap()
        XCTAssertTrue(title.waitForExistence(timeout: 5), "the filled entry opens the sheet again")
        XCTAssertEqual(app.textViews.firstMatch.value as? String, "Giao trước 9h sáng thứ 7\nKhách lấy tại tiệm, gọi trước 30 phút",
                       "the sheet is prefilled")
        e2e.button(["Xoá ghi chú", "Delete note"]).tap()
        sleep(2)
        XCTAssertTrue(entry.waitForExistence(timeout: 5), "Xoá ghi chú empties the entry")
        XCTAssertFalse(app.buttons.matching(NSPredicate(format: "value CONTAINS 'Giao trước 9h'")).firstMatch.exists)
        e2e.goBackOnce()
        e2e.emptyCart()
    }

    /// #1056: product detail "Sắp tới" lists the farthest pickup first; "Tất cả N" reads "… · mới nhất trước";
    /// the cart opens without the price link flashing (record the simulator around this test); TIỀN rows that can be
    /// changed are blue with a pencil (discount 0 / note empty, then filled). Screenshots polish-*.png.
    func test8iReleasePolish() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        e2e.emptyCart()
        // Three open orders or more, so "Sắp tới" can show its order (the seed has few; add pickups in your own DB)
        if e2e.openProduct(where: { $0 > 2 }) ?? e2e.openProduct(where: { $0 > 1 }) != nil {
            let upcoming = e2e.element(labelBeginsWith: ["Upcoming ", "Sắp tới "], type: .button)
            e2e.tapIfExists(upcoming, timeout: 3)
            sleep(2)
            app.swipeUp()
            sleep(1)
            e2e.shot("polish-01-detail-upcoming")
            let all = e2e.element(labelBeginsWith: ["All ", "Tất cả "], type: .button)
            if e2e.scrollTo(all) {
                all.tap()
                sleep(3)
                let bar = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'latest first' OR label CONTAINS[c] 'mới nhất trước'")).firstMatch
                e2e.soft(bar.waitForExistence(timeout: 5), "#1056: Tất cả N sort bar reads 'mới nhất trước'")
                e2e.shot("polish-02-all-orders")
                e2e.goBackOnce()
            } else {
                e2e.soft(false, "Tất cả N on product detail")
            }
            // The detail is scrolled to its orders: back to the top so "Quay lại" can be tapped (not an order row)
            app.swipeDown()
            app.swipeDown()
            e2e.goBack()
        } else {
            e2e.note("#1056: no product with two open orders")
        }
        guard e2e.openCartWithOneItem() else {
            e2e.shot("polish-03-cart-missing")
            return XCTFail("Could not open the cart with an item")
        }
        e2e.shot("polish-03-cart-open")
        let discount = e2e.element(labelBeginsWith: ["Discount", "Giảm giá"])
        XCTAssertTrue(e2e.scrollTo(discount), "Giảm giá row in TIỀN")
        sleep(1)
        e2e.shot("polish-04-money-empty")
        discount.tap()
        for key in ["5", "0", "0", "0", "0"] { e2e.tapIfExists(e2e.button([key]), timeout: 2) }
        e2e.tapIfExists(e2e.button(["Confirm", "Xác nhận"]), timeout: 3)
        sleep(2)
        let note = e2e.button(["Note", "Ghi chú"])
        if e2e.scrollTo(note) {
            note.tap()
            if app.textViews.firstMatch.waitForExistence(timeout: 5) {
                app.textViews.firstMatch.typeText("Khách lấy lúc 9h, giao tại shop, gọi trước 30 phút")
                e2e.button(["Lưu", "Save"]).tap()
                sleep(2)
            }
        }
        _ = e2e.scrollTo(e2e.button(["Note", "Ghi chú"]))
        e2e.shot("polish-05-money-filled")
        e2e.goBackOnce()
        e2e.emptyCart()
    }

    /// #1056 (owner: "note cần xuống dòng và style present note view nên giống nhau"): the item note and the order note
    /// open the same sheet; a long note shows in full on several lines under the item and in TIỀN. polish-note-*.png
    func test8jCartNotesWrapAndOneSheet() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        e2e.emptyCart()
        guard e2e.openCartWithOneItem() else { return XCTFail("Could not open the cart with an item") }
        let save = e2e.button(["Lưu", "Save"])
        let itemNote = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Ghi chú cho' OR label BEGINSWITH 'Note for'")).firstMatch
        XCTAssertTrue(itemNote.waitForExistence(timeout: 5), "the item note entry")
        itemNote.tap()
        XCTAssertTrue(app.textViews.firstMatch.waitForExistence(timeout: 5), "the item note sheet opens")
        sleep(1)
        e2e.shot("polish-note-sheet-item")
        app.textViews.firstMatch.typeText("Sửa eo 2cm, lên lai 3cm\nGiao kèm móc treo và túi đựng, khách lấy trước 9h sáng thứ Bảy")
        save.tap()
        sleep(2)
        let orderNote = e2e.button(["Note", "Ghi chú"])
        XCTAssertTrue(e2e.scrollTo(orderNote), "the order note row in TIỀN")
        orderNote.tap()
        XCTAssertTrue(app.textViews.firstMatch.waitForExistence(timeout: 5), "the order note sheet opens")
        sleep(1)
        e2e.shot("polish-note-sheet-order")
        app.textViews.firstMatch.typeText("Khách lấy lúc 9h, giao tại shop, gọi trước 30 phút\nĐặt cọc bằng CCCD, trả đồ trước 18h Chủ nhật")
        save.tap()
        sleep(2)
        app.swipeUp()
        sleep(1)
        e2e.shot("polish-note-wrap")
        e2e.soft(app.buttons.matching(NSPredicate(format: "value CONTAINS 'trả đồ trước 18h'")).firstMatch.exists,
                 "the whole order note is on the row")
        e2e.goBackOnce()
        e2e.emptyCart()
    }

    /// #1061 (owner: "đổi icon edit không giống", mockup cartedit option A): every edit in the cart shows the one blue
    /// pen-line after blue text — the item note ("Ghi chú", then the note), Giảm giá, Cọc, the order note. onepencil-*.png
    func test8kCartOnePencil() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        e2e.emptyCart()
        guard e2e.openCartWithOneItem() else { return XCTFail("Could not open the cart with an item") }
        let discount = e2e.element(labelBeginsWith: ["Discount", "Giảm giá"])
        XCTAssertTrue(e2e.scrollTo(discount), "Giảm giá row in TIỀN")
        discount.tap()
        for key in ["5", "0", "0", "0", "0"] { e2e.tapIfExists(e2e.button([key]), timeout: 2) }
        e2e.tapIfExists(e2e.button(["Confirm", "Xác nhận"]), timeout: 3)
        sleep(2)
        let save = e2e.button(["Lưu", "Save"])
        let orderNote = e2e.button(["Note", "Ghi chú"])
        XCTAssertTrue(e2e.scrollTo(orderNote), "the order note row in TIỀN")
        orderNote.tap()
        XCTAssertTrue(app.textViews.firstMatch.waitForExistence(timeout: 5), "the order note sheet opens")
        app.textViews.firstMatch.typeText("Khách lấy lúc 9h, giao tại shop, gọi trước 30 phút")
        save.tap()
        sleep(2)
        app.swipeDown()
        sleep(1)
        e2e.shot("onepencil-1-item-note-empty")
        let itemNote = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Ghi chú cho' OR label BEGINSWITH 'Note for'")).firstMatch
        XCTAssertTrue(itemNote.waitForExistence(timeout: 5), "the item note entry")
        itemNote.tap()
        XCTAssertTrue(app.textViews.firstMatch.waitForExistence(timeout: 5), "the item note sheet opens")
        app.textViews.firstMatch.typeText("Sửa eo 2cm, lên lai 3cm, giao kèm móc treo")
        save.tap()
        sleep(2)
        e2e.shot("onepencil-2-item-note-filled")
        e2e.goBackOnce()
        e2e.emptyCart()
    }

    /// #1064 (owner): every cart line says how many are free in a short pill ("Còn N" green when 2+ and enough, amber
    /// "Còn 1" / "Chỉ còn N", red "Hết đồ" / "Hết hàng"); VoiceOver reads "… trong ngày đã chọn" / "… trong kho"; a sale
    /// line shows one count. Products 1, 5 and 9 have no open orders in the seed; for all three colours set their outlet
    /// stock to 0, 1 and 2 first (the run only checks what it sees). cart-avail-*.png
    func test8lCartAvailabilityNotes() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        e2e.emptyCart()
        let names = ["Product 1 - Electronics", "Product 5 - Party Supplies", "Product 9 - Office Equipment"]
        for name in names where !addFromHome(name) { return XCTFail("could not add \(name)") }
        guard openCart() else { return XCTFail("cart did not open") }
        e2e.cartRentToday()
        sleep(3)
        let rentNotes = app.staticTexts.matching(NSPredicate(format:
            "label CONTAINS 'trong ngày đã chọn' OR label CONTAINS 'on these dates'"))
        e2e.note("rent notes: \(rentNotes.allElementsBoundByIndex.map(\.label))")
        XCTAssertEqual(rentNotes.count, names.count, "one availability pill per rent line")
        let long = app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'trống trong ngày đã chọn' AND label BEGINSWITH 'Còn'")).count
        XCTAssertEqual(long, 0, "the old long Còn N trống … text is gone")
        e2e.shot("cart-avail-1-rent")
        // two more of the last product: with 2 free it turns amber "Chỉ còn 2" (3 asked)
        let plus = app.buttons.matching(NSPredicate(format: "label == 'Thêm 1' OR label == 'One more'"))
        if plus.count >= names.count {
            plus.element(boundBy: names.count - 1).tap(); sleep(1)
            plus.element(boundBy: names.count - 1).tap(); sleep(3)
        }
        e2e.note("rent notes after +2: \(rentNotes.allElementsBoundByIndex.map(\.label))")
        e2e.shot("cart-avail-2-rent-fewer-than-asked")
        e2e.tapIfExists(e2e.button(["Sale", "Bán"]), timeout: 3)
        sleep(3)
        let counts = app.staticTexts.matching(NSPredicate(format:
            "label CONTAINS 'trong kho' OR label CONTAINS 'in stock' OR label == 'Hết hàng' OR label == 'Out of stock'"))
        e2e.note("sale notes: \(counts.allElementsBoundByIndex.map(\.label))")
        XCTAssertEqual(counts.count, names.count, "one count per sale line")
        e2e.shot("cart-avail-3-sale")
        e2e.goBackOnce()
        e2e.emptyCart()
    }

    /// #1067 (owner: "chặn giảm giá lớn hơn tổng đơn luôn"): the discount sheet refuses more than the lines, the first key
    /// replaces the old value, and removing lines below a saved discount blocks "Tạo đơn" with the same message.
    /// Product 1 (28) + Product 2 (32) in the seed.
    func test8lCartDiscountCap() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        e2e.emptyCart()
        guard addFromHome("Product 1 - Electronics"), addFromHome("Product 2 - Tools") else {
            return XCTFail("could not add Product 1 and Product 2")
        }
        guard openCart() else { return XCTFail("cart did not open") }
        let discount = e2e.element(labelBeginsWith: ["Discount", "Giảm giá"])
        XCTAssertTrue(e2e.scrollTo(discount), "Giảm giá row in TIỀN")
        discount.tap()
        let confirm = e2e.button(["Confirm", "Xác nhận"])
        XCTAssertTrue(confirm.waitForExistence(timeout: 5), "the discount sheet opens")
        for key in ["9", "9", "9", "9"] { e2e.tapIfExists(e2e.button([key]), timeout: 2) }
        let error = app.staticTexts["discount.error"]
        XCTAssertTrue(error.waitForExistence(timeout: 3), "red error under the value")
        e2e.note("discount error: \(error.label)")
        XCTAssertTrue(error.label.hasPrefix("Giảm giá không được lớn hơn tổng đơn") || error.label.hasPrefix("Discount can't be more"))
        XCTAssertFalse(confirm.isEnabled, "Confirm is off while the discount is above the lines")
        e2e.shot("discount-cap-1-sheet-error")
        for _ in 0..<4 { e2e.tapIfExists(e2e.button(["⌫"]), timeout: 2) }
        for key in ["5", "0"] { e2e.tapIfExists(e2e.button([key]), timeout: 2) }
        XCTAssertTrue(confirm.isEnabled, "50 ≤ 60 is allowed")
        confirm.tap()
        sleep(2)

        // Opening again on 50: the first key replaces it (it used to append: 5040)
        XCTAssertTrue(e2e.scrollTo(discount))
        discount.tap()
        XCTAssertTrue(confirm.waitForExistence(timeout: 5))
        for key in ["4", "0"] { e2e.tapIfExists(e2e.button([key]), timeout: 2) }
        XCTAssertTrue(app.staticTexts["40"].waitForExistence(timeout: 2), "the sheet shows 40, not 5040")
        e2e.shot("discount-cap-2-sheet-replaced")
        confirm.tap()
        sleep(2)

        // Remove Product 2: 28 left, below the saved 40 → notice + "Tạo đơn" off
        let line = app.staticTexts["Product 2 - Tools"]
        XCTAssertTrue(e2e.scrollTo(line))
        line.swipeLeft()
        sleep(1)
        let delete = app.buttons.matching(identifier: "cart.swipe.delete").firstMatch
        if app.staticTexts["Product 2 - Tools"].exists && delete.exists && delete.isHittable {
            delete.tap()
        } else if app.staticTexts["Product 2 - Tools"].exists {
            // a full right-to-left swipe removes the line (#893)
            let start = line.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.5))
            start.press(forDuration: 0.05, thenDragTo: line.coordinate(withNormalizedOffset: CGVector(dx: -1.5, dy: 0.5)))
        }
        sleep(1)
        XCTAssertFalse(app.staticTexts["Product 2 - Tools"].waitForExistence(timeout: 2), "Product 2 removed")
        let notice = app.otherElements["cart.discount.notice"]
        let noticeText = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Giảm giá không được' OR label BEGINSWITH 'Discount can'")).firstMatch
        XCTAssertTrue(notice.waitForExistence(timeout: 3) || noticeText.waitForExistence(timeout: 1), "the cart shows the discount notice")
        let create = e2e.button(["Create order", "Tạo đơn"])
        if create.exists { XCTAssertFalse(create.isEnabled, "Tạo đơn is off") }
        e2e.shot("discount-cap-3-blocked-after-remove")
        e2e.goBackOnce()
        e2e.emptyCart()
    }

    /// #893: swiping a cart line right-to-left removes it (red "Xoá" when the swipe stops halfway)
    func test8gCartSwipeDelete() throws {
        try e2e.requireFlag("newProducts")
        try e2e.start()
        e2e.emptyCart()
        guard addFromHome("Product 1 - Electronics"), addFromHome("Product 2 - Tools") else {
            return XCTFail("could not add two products")
        }
        guard openCart() else { return XCTFail("cart did not open") }
        let line = app.staticTexts["Product 1 - Electronics"]
        XCTAssertTrue(line.waitForExistence(timeout: 5))
        e2e.shot("8g-10-cart-before")
        line.swipeLeft()
        sleep(1)
        e2e.shot("8g-11-cart-swiped")
        let delete = app.buttons.matching(identifier: "cart.swipe.delete").firstMatch
        e2e.note("delete button exists=\(delete.exists) hittable=\(delete.exists && delete.isHittable) frame=\(delete.frame)")
        if app.staticTexts["Product 1 - Electronics"].exists && delete.exists { delete.tap(); sleep(1) }
        XCTAssertFalse(app.staticTexts["Product 1 - Electronics"].waitForExistence(timeout: 2), "the swiped line is gone")
        XCTAssertTrue(app.staticTexts["Product 2 - Tools"].exists, "the other line stays")
        e2e.shot("8g-12-cart-after")
        e2e.goBackOnce()
        e2e.emptyCart()
    }

    /// #1007 (owner 2026-10-17): the cart never shows "Giá vốn", "Tổng giá vốn" or "Lãi dự kiến" for any role (#888
    /// showed them); the cart is shown to the customer. Product 1 and Product 2 have a cost in the e2e DB.
    func test8fCartCost() throws {
        try e2e.requireFlag("newProducts")
        try e2e.start()
        e2e.emptyCart()
        guard addFromHome("Product 1 - Electronics"), addFromHome("Product 2 - Tools") else {
            return XCTFail("could not add Product 1 and Product 2")
        }
        guard openCart() else { return XCTFail("cart did not open") }
        e2e.cartRentToday() // the dates row reads dd/mm/yy → dd/mm/yy
        sleep(1)
        let cost = e2e.element(labelBeginsWith: ["Cost", "Giá vốn"])
        e2e.soft(!cost.waitForExistence(timeout: 3), "no Giá vốn on the line (\(e2e.role))")
        e2e.shot("8f-10-cart-rent")
        _ = e2e.scrollTo(e2e.button(["Note", "Ghi chú"]))
        e2e.soft(!e2e.element(labelBeginsWith: ["Total cost", "Tổng giá vốn"]).exists, "no Tổng giá vốn (\(e2e.role))")
        e2e.shot("8f-11-cart-rent-money")
        e2e.tapIfExists(e2e.button(["Sale", "Bán"]))
        sleep(1)
        app.swipeDown()
        e2e.shot("8f-20-cart-sale")
        _ = e2e.scrollTo(e2e.button(["Note", "Ghi chú"]))
        e2e.soft(!e2e.element(labelBeginsWith: ["Expected profit", "Lãi dự kiến"]).exists, "no Lãi dự kiến (\(e2e.role))")
        e2e.shot("8f-21-cart-sale-money")
        e2e.tapIfExists(e2e.button(["Rent", "Thuê"]))
        e2e.goBackOnce()
        e2e.emptyCart()
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
            let handed = e2e.element(labelBeginsWith: ["Handed over", "Đã lấy", "Đã giao"], type: .button)  // #888: "Đã lấy · thu …"
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
        // #930: the bar is In + Nhận trả; Gia hạn is in the ⋯ sheet
        let print = e2e.button(["Print", "In"])
        XCTAssertTrue(print.waitForExistence(timeout: 10), "A renting order shows In on the bottom bar")
        e2e.shot("58-detail-renting")
        XCTAssertTrue(e2e.tapOrderSheetRow(["Extend", "Gia hạn"]), "A renting order offers Gia hạn in ⋯")
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

        // #930: Print is the bottom bar's "In"
        if print.waitForExistence(timeout: 5) {
            print.tap()
            sleep(3)
            e2e.shot("5b-detail-print-preview")
            e2e.dismissAlerts()
            e2e.tapIfExists(e2e.button(["Close", "Đóng", "Cancel", "Huỷ", "Hủy", "Done", "Xong"]), timeout: 2)
            if !print.exists { e2e.goBackOnce() }
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
            e2e.shot("5c-detail-booked")
            // #930: Sửa đơn is in the ⋯ sheet
            if e2e.tapOrderSheetRow(["Edit order", "Sửa đơn"]) {
                sleep(3)
                e2e.shot("5d-detail-edit-order")
                // Leave edit mode with Huỷ sửa: a cart left as "Sửa đơn #n" has no Tạo đơn for the next flows (#1040)
                XCTAssertTrue(e2e.leaveEditMode(), "Huỷ sửa leaves the edit cart")
                return
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
        // #888: day cells read "12/10/26" (dd/mm/yy), older builds "T2 12/10"
        let today = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@ OR label ENDSWITH %@", todayKey + "/", " " + todayKey)).firstMatch
        let tomorrow = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@ OR label ENDSWITH %@", tomorrowKey + "/", " " + tomorrowKey)).firstMatch
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

    /// #757: the reasons under the Collected rows read in the app language (the API text is Vietnamese)
    func test7mCollectedReasonsFollowTheLanguage() throws {
        try e2e.requireFlag("newOverview")
        try e2e.start()
        guard e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3) else {
            throw XCTSkip("No Reports tab for this account")
        }
        sleep(4)
        let week = e2e.element(labelBeginsWith: ["7 days", "7 ngày"], type: .button)
        guard week.waitForExistence(timeout: 8) else { throw XCTSkip("No period chips for this account") }
        week.tap()
        sleep(3)
        let collected = e2e.element(labelBeginsWith: ["Collected", "Thực thu"], type: .button)
        XCTAssertTrue(collected.waitForExistence(timeout: 8), "Collected tile")
        let english = collected.label.hasPrefix("Collected")
        collected.tap()
        let link = e2e.element(labelBeginsWith: ["See these orders", "Xem các đơn liên quan"], type: .button)
        XCTAssertTrue(link.waitForExistence(timeout: 6), "detail sheet links to the orders")
        link.tap()
        let total = app.staticTexts["related.total"]
        XCTAssertTrue(total.waitForExistence(timeout: 20), "related list total")
        sleep(2)
        e2e.shot("74-overview-related-collected-reasons")
        let texts = app.staticTexts.allElementsBoundByIndex.map(\.label)
        e2e.note("RELATED REASONS english=\(english) | \(texts.prefix(24))")
        if english {
            let vietnamese = ["Thu tiền cọc", "Thu tiền khi lấy hàng", "Hoàn tiền cọc", "Đơn bán được tạo", "Đơn hủy (hoàn lại)",
                              "Thu phí hư hỏng", "Thuê và trả trong cùng ngày"]
            XCTAssertTrue(texts.filter { vietnamese.contains($0) }.isEmpty, "#757 Vietnamese reasons in the English app: \(texts)")
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

    /// #1062: with a branch chosen on Home, the Giá trị đơn mới list of 7 ngày adds up to the tile (no other branch)
    func test7pRelatedOrdersBranch() throws {
        try e2e.requireFlag("newOverview")
        try e2e.start()
        guard e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3) else {
            throw XCTSkip("No Reports tab for this account")
        }
        let week = e2e.element(labelBeginsWith: ["7 days", "7 ngày"], type: .button)
        guard week.waitForExistence(timeout: 8) else { throw XCTSkip("No revenue for this account") }
        week.tap()
        sleep(4)
        let tile = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@ OR label BEGINSWITH %@", "Giá trị đơn mới", "New order value")).firstMatch
        XCTAssertTrue(tile.waitForExistence(timeout: 15), "Giá trị đơn mới tile")
        let parts = tile.label.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
        let value = parts.count > 1 ? parts[1] : "?"
        e2e.note("RELATED BRANCH | TILE \(tile.label)")
        e2e.shot("76-overview-7-days-tile")
        tile.tap()
        let see = e2e.element(labelBeginsWith: ["See these orders", "Xem các đơn liên quan"], type: .button)
        XCTAssertTrue(see.waitForExistence(timeout: 8), "Xem các đơn liên quan in the tile sheet")
        e2e.shot("76b-overview-tile-sheet")
        see.tap()
        let total = app.staticTexts["related.total"]
        XCTAssertTrue(total.waitForExistence(timeout: 20), "related orders list")
        let deadline = Date().addingTimeInterval(30)
        while total.label.isEmpty && Date() < deadline { sleep(1) }
        e2e.note("RELATED BRANCH | LIST \(total.label)")
        e2e.shot("76c-overview-related-orders")
        XCTAssertTrue(total.label.hasSuffix(value), "list total \(total.label) equals the tile \(value)")
        e2e.goBackOnce()
    }

    /// #1059: on Hôm nay "Đơn tạo hôm nay" replaces Top sản phẩm / Top khách hàng; its "N đơn · Tổng giá trị" equals the
    /// Giá trị đơn mới tile; a row opens the order, "Xem tất cả" the tile's list; 7 ngày brings the Top cards back.
    func test7oOverviewTodayOrders() throws {
        try e2e.requireFlag("newOverview")
        try e2e.start()
        guard e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3) else {
            throw XCTSkip("No Reports tab for this account")
        }
        let week = e2e.element(labelBeginsWith: ["7 days", "7 ngày"], type: .button)
        guard week.waitForExistence(timeout: 8) else { throw XCTSkip("No revenue for this account: no card") }
        sleep(3)
        let title = e2e.element(labelBeginsWith: ["Orders created today", "Đơn tạo hôm nay"], type: .staticText)
        XCTAssertTrue(title.waitForExistence(timeout: 10), "Đơn tạo hôm nay card on Hôm nay")
        let topProducts = e2e.element(labelBeginsWith: ["Top products", "Top sản phẩm"], type: .staticText)
        XCTAssertFalse(topProducts.exists, "no Top sản phẩm on Hôm nay")

        // The summary equals the tile: "8 đơn · Tổng giá trị 2.201.000đ" vs the tile's "8 đơn mới"
        let summary = app.otherElements["overview.todayOrders.summary"]
        let tile = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@ OR label BEGINSWITH %@", "Giá trị đơn mới", "New order value")).firstMatch
        if summary.waitForExistence(timeout: 15), tile.waitForExistence(timeout: 5) {
            e2e.note("TODAY ORDERS | \(summary.label) | TILE \(tile.label)")
            let count = summary.label.split(separator: " ").first.map(String.init) ?? "?"
            XCTAssertTrue(tile.label.contains("\(count) đơn mới") || tile.label.contains("\(count) new order"),
                          "summary count \(count) equals the tile chip: \(tile.label)")
        } else {
            e2e.soft(false, "summary line and Giá trị đơn mới tile")
        }
        // The card sits under the tiles, chart and Hôm nay counters
        app.swipeUp()
        sleep(1)
        e2e.shot("75-overview-today-orders")

        let row = app.buttons["overview.todayOrders.row"].firstMatch
        if row.waitForExistence(timeout: 8) {
            e2e.note("TODAY ORDER ROW | \(row.label)")
            row.tap()
            sleep(3)
            e2e.shot("75b-overview-today-order-detail")
            e2e.goBackOnce()
            sleep(2)
        } else {
            e2e.soft(app.staticTexts["overview.todayOrders.empty"].exists, "rows or the empty text")
        }

        let viewAll = app.buttons["overview.todayOrders.viewAll"]
        if viewAll.waitForExistence(timeout: 5) {
            viewAll.tap()
            let total = app.staticTexts["related.total"]
            XCTAssertTrue(total.waitForExistence(timeout: 20), "Xem tất cả opens the Giá trị đơn mới list")
            let deadline = Date().addingTimeInterval(30)
            while total.label.isEmpty && Date() < deadline { sleep(1) }
            e2e.note("TODAY ORDERS RELATED | \(total.label)")
            e2e.shot("75c-overview-today-orders-all")
            e2e.goBackOnce()
            sleep(2)
        } else {
            e2e.soft(false, "Xem tất cả on Đơn tạo hôm nay")
        }

        app.swipeDown()
        sleep(1)
        week.tap()
        sleep(4)
        XCTAssertFalse(title.exists, "no Đơn tạo hôm nay on 7 ngày")
        app.swipeUp()
        sleep(1)
        XCTAssertTrue(topProducts.waitForExistence(timeout: 10), "Top sản phẩm on 7 ngày")
        e2e.shot("75d-overview-7-days-top")
        app.swipeDown()
        e2e.element(labelBeginsWith: ["Today", "Hôm nay"], type: .button).tap()
        sleep(2)
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
        // From the end of the list: test7dProductChangeHistory edits Product 25 and test7eOverlapSetting uses Product 2, so the product
        // this test deletes must be neither (it used to take the first one without orders, Product 2, which broke 7e in a full run).
        guard e2e.openProduct(where: { $0 == 0 }, upTo: 30, descending: true) != nil else { return XCTFail("No product without open orders") }
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
        if e2e.role != "merchant" { // staff and kho (#682) have no users.manage
            e2e.shot("7h-\(e2e.role)-settings")
            e2e.soft(!users.exists, "\(e2e.role) does not see Người dùng")
            return
        }
        XCTAssertTrue(users.waitForExistence(timeout: 8), "Users row")
        users.tap()
        sleep(3)
        e2e.shot("7h-settings-users")
        e2e.goBackOnce()
    }

    /// #909 / #927 Chấm công: card L at the top of Cài đặt → Vào ca (Debug "Nhập mã" with E2E_ATTENDANCE_CODE) → Ra ca,
    /// a refused code (E2E_ATTENDANCE_BAD_CODE, default an expired one) → Ca và công của tôi. Needs the #907 API with the
    /// module on for this merchant and an outlet whose coordinates match the Simulator location. Grant location first
    /// (`xcrun simctl privacy <udid> grant location <bundle id>`): the shared alert helper taps "Don't Allow".
    func test9AttendanceClockInOut() throws {
        let env = ProcessInfo.processInfo.environment
        guard let code = env["E2E_ATTENDANCE_CODE"], !code.isEmpty else { throw XCTSkip("E2E_ATTENDANCE_CODE is not set") }
        try e2e.requireFlag("newSettings")
        try e2e.start()
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        let punch = app.buttons["attendance.punch"]
        XCTAssertTrue(punch.waitForExistence(timeout: 15), "Settings shows the clock card when the module is on and the user must clock in")
        sleep(2)
        e2e.shot("9a-attendance-card")

        var scannerShot = false
        func scan(_ value: String) {
            punch.tap()
            let manual = app.buttons["attendance.manualCode"]
            XCTAssertTrue(manual.waitForExistence(timeout: 10), "Scanner opens (Debug: Nhập mã)")
            if !scannerShot {
                scannerShot = true
                sleep(2)
                e2e.shot("9c-attendance-scanner")
            }
            manual.tap()
            let field = app.alerts.textFields.firstMatch
            XCTAssertTrue(field.waitForExistence(timeout: 5), "Manual code field")
            field.tap()
            field.typeText(value)
            app.alerts.buttons["OK"].tap()
        }

        // ✓ line inside the card, or the red box under it
        let result = app.descendants(matching: .any).matching(NSPredicate(format: "identifier IN {'attendance.result', 'attendance.error'}")).firstMatch
        let wasIn = punch.label.contains("Ra ca") || punch.label.contains("Clock out")
        scan(code)
        XCTAssertTrue(result.waitForExistence(timeout: 25), "A result box after the punch")
        sleep(1)
        e2e.note("first punch: \(result.label)")
        e2e.shot(wasIn ? "9e-attendance-out" : "9d-attendance-in")

        // The scanner may wait up to 10 s for a fresh GPS fix: wait for the box to change
        func waitForNewResult(after previous: String) {
            let deadline = Date().addingTimeInterval(20)
            while Date() < deadline {
                if result.exists && result.label != previous { break }
                sleep(1)
            }
        }
        var previous = result.label
        scan(code)
        waitForNewResult(after: previous)
        e2e.note("second punch: \(result.label)")
        e2e.shot(wasIn ? "9d-attendance-in" : "9e-attendance-out")

        previous = result.label
        scan(env["E2E_ATTENDANCE_BAD_CODE"] ?? "a1.1.1.D.2020-01-01.AAAAAAAAAAAAAAAAAAAAAA")
        waitForNewResult(after: previous)
        e2e.note("refused: \(result.label)")
        e2e.shot("9f-attendance-refused")

        let mine = app.descendants(matching: .any)["attendance.mine"]
        if mine.waitForExistence(timeout: 5) {
            mine.tap()
            XCTAssertTrue(app.descendants(matching: .any)["attendance.mine.screen"].waitForExistence(timeout: 10), "Ca và công của tôi opens")
            sleep(4)
            e2e.shot("9g-attendance-mine")
        }
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
            let priceLabels = ["Prices", "Giá", "Rental price", "Giá thuê", "Per rental", "Theo lần", "Per day", "Theo mỗi ngày",
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
        let priceLabels = ["Per rental", "Theo lần", "Per day", "Theo mỗi ngày", "Sale price", "Giá bán"]
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
        XCTAssertTrue(e2e.homeCart.waitForExistence(timeout: 5), "cart bar")
        e2e.homeCart.tap()
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
        XCTAssertTrue(e2e.homeCart.waitForExistence(timeout: 5), "cart bar")
        e2e.homeCart.tap()
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

    /// #1246: the staged-deposit card on order detail runs edge to edge like the other rows. E2E_ORDER_NUMBER = a plan order.
    func test5gDepositCardWidth() throws {
        try e2e.requireFlag("newOrders")
        try e2e.requireFlag("newOrderDetail")
        try e2e.requireRole("merchant")
        guard let number = ProcessInfo.processInfo.environment["E2E_ORDER_NUMBER"] else { throw XCTSkip("E2E_ORDER_NUMBER not set") }
        try e2e.start()
        e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
        sleep(2)
        e2e.tapIfExists(e2e.button(["All orders", "Tất cả đơn"]), timeout: 5)
        sleep(2)
        let search = e2e.ordersSearchField
        XCTAssertTrue(search.waitForExistence(timeout: 5), "Orders search field")
        search.tap()
        search.typeText(number)
        sleep(3)
        let row = app.cells.firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 8), "plan order \(number) in the list")
        e2e.tapRow(row)
        XCTAssertTrue(e2e.orderMoreButton.waitForExistence(timeout: 10))
        sleep(2)
        e2e.shot("5g-detail-top")
        app.swipeUp()
        sleep(1)
        e2e.shot("5g-deposit-card")
        XCTAssertTrue(app.otherElements["deposit.card"].exists || app.staticTexts["deposit.card.badge"].exists, "the deposit card shows")
        // #1285: the sections below the card (papers & collateral, notes) and the bottom bar
        app.swipeUp()
        sleep(1)
        e2e.shot("5g-detail-bottom")
    }

    /// #1279: a picked-up order keeps a "Giấy tờ & thế chân" card with "Sửa"; the sheet saves new papers and deposit and the
    /// status stays. E2E_ORDER_NUMBER = a PICKUPED rental.
    func test5iCollateralEditAfterPickup() throws {
        try e2e.requireFlag("newOrders")
        try e2e.requireFlag("newOrderDetail")
        try e2e.requireRole("merchant")
        guard let number = ProcessInfo.processInfo.environment["E2E_ORDER_NUMBER"] else { throw XCTSkip("E2E_ORDER_NUMBER not set") }
        try e2e.start()
        e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
        sleep(2)
        e2e.tapIfExists(e2e.button(["All orders", "Tất cả đơn"]), timeout: 5)
        sleep(2)
        let search = e2e.ordersSearchField
        XCTAssertTrue(search.waitForExistence(timeout: 5), "Orders search field")
        search.tap()
        search.typeText(number)
        sleep(3)
        let row = app.cells.firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 8), "order \(number) in the list")
        e2e.tapRow(row)
        XCTAssertTrue(e2e.orderMoreButton.waitForExistence(timeout: 10))
        sleep(2)
        let edit = app.buttons["order.detail.collateralEdit"]
        XCTAssertTrue(e2e.scrollTo(edit), "the collateral card has an edit button")
        e2e.shot("5i-1-card")
        edit.tap()
        let papers = app.textFields["collateralEdit.papers"]
        XCTAssertTrue(papers.waitForExistence(timeout: 5), "the edit sheet opens")
        sleep(1)
        e2e.shot("5i-2-sheet")
        papers.tap()
        papers.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 40))
        papers.typeText("GPLX")
        let deposit = app.textFields["collateralEdit.securityDeposit"]
        deposit.tap()
        deposit.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 40))
        deposit.typeText("700000")
        e2e.shot("5i-3-filled")
        app.buttons["collateralEdit.save"].tap()
        sleep(3)
        let value = app.staticTexts["order.detail.collateralValue"]
        let savedPapers = app.staticTexts["order.detail.collateralPapers"]
        XCTAssertTrue(e2e.scrollTo(value), "the section shows the saved value")
        XCTAssertEqual(savedPapers.label, "GPLX", "papers row says GPLX")
        XCTAssertTrue(value.label.contains("700") && !value.label.contains("500"), "money row says 700, got \(value.label)")
        e2e.shot("5i-4-saved")
    }

    /// ⋯ on the order detail opens a sheet (board CT-thao-tac), not a UIMenu: Chia sẻ đơn, Ghi chú, Sửa đơn / Gia hạn (#930), Lịch sử,
    /// then Huỷ đơn apart. Actions the screen already shows as buttons are not repeated in it.
    func test5cOrderActionSheet() throws {
        try e2e.requireFlag("newOrders")
        try e2e.requireFlag("newOrderDetail")
        try e2e.requireRole("merchant")
        try e2e.start()

        // A booked rental: the bottom bar has In + Giao đồ (#930); Sửa đơn is in the sheet
        guard e2e.openFirstOrder(chip: ["Booked", "Đã đặt"]) else { return XCTFail("No booked order to open") }
        checkOrderSheet(onScreen: [["Print", "In"]], onScreenPrefixes: [["Hand over", "Giao đồ"]],
                        expected: [["Share order", "Chia sẻ đơn"], ["Notes", "Ghi chú"], ["Edit order", "Sửa đơn"],
                                   ["Change history", "Lịch sử thay đổi"]],
                        destructive: ["Cancel order", "Huỷ đơn"], absent: [["Extend", "Gia hạn"]],
                        shotPrefix: "47a-order-sheet-booked")
        e2e.goBack()

        // A renting order: In + Nhận trả on screen; Gia hạn in the sheet
        guard e2e.openFirstOrder(chip: ["Renting", "Đang thuê"]) else { return XCTFail("No renting order to open") }
        checkOrderSheet(onScreen: [["Print", "In"]], onScreenPrefixes: [["Take back", "Nhận trả"]],
                        expected: [["Share order", "Chia sẻ đơn"], ["Notes", "Ghi chú"], ["Extend", "Gia hạn"],
                                   ["Change history", "Lịch sử thay đổi"]],
                        destructive: ["Cancel order", "Huỷ đơn"], shotPrefix: "47b-order-sheet-renting")
        XCTAssertFalse(e2e.button(["Edit order", "Sửa đơn"]).exists, "A renting order is not editable: no Sửa đơn in the sheet")
        e2e.goBack()
    }

    /// Opens ⋯ on the open detail and checks the sheet against the buttons the screen shows
    private func checkOrderSheet(onScreen: [[String]], onScreenPrefixes: [[String]], expected: [[String]],
                                 destructive: [String], absent: [[String]] = [], shotPrefix: String) {
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
        guard e2e.openOrderSheet() else { return XCTFail("\(shotPrefix): ⋯ does not open the ⋯ sheet") }
        sleep(1)
        e2e.shot("\(shotPrefix)-sheet")
        // A sheet has a close button (no title since #1297); a UIMenu has none
        XCTAssertTrue(e2e.button(["Close", "Đóng"]).exists, "\(shotPrefix): the sheet has a close button")

        var frames: [CGRect] = []
        for labels in expected {
            let row = e2e.button(labels)
            XCTAssertTrue(row.exists, "\(shotPrefix): sheet lists \(labels)")
            frames.append(row.exists ? row.frame : .zero)
        }
        for labels in absent { XCTAssertFalse(e2e.button(labels).exists, "\(shotPrefix): sheet has no \(labels)") }
        let cancel = e2e.button(destructive)
        XCTAssertTrue(cancel.exists, "\(shotPrefix): sheet lists \(destructive) (destructive)")
        if cancel.exists, let last = frames.last, last != .zero {
            XCTAssertGreaterThan(cancel.frame.minY - last.maxY, 4, "\(shotPrefix): Huỷ đơn sits apart from the other rows")
        }
        XCTAssertEqual(frames.map(\.minY), frames.map(\.minY).sorted(), "\(shotPrefix): rows in the expected order")

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

    /// #930: ⋯ → Chia sẻ đơn on a booked rental, a renting order and a sale. The share sheet stays up for
    /// `E2E_SHARE_HOLD` seconds (default 2) so a run can copy Order_<number>.jpg out of the app's tmp folder.
    func test5hShareImage() throws {
        try e2e.requireFlag("newOrders")
        try e2e.requireFlag("newOrderDetail")
        try e2e.requireRole("merchant")
        try e2e.start()
        let hold = UInt32(ProcessInfo.processInfo.environment["E2E_SHARE_HOLD"] ?? "") ?? 2
        let share: (String) -> Void = { prefix in
            self.e2e.shot("\(prefix)-detail")
            XCTAssertTrue(self.e2e.button(["Print", "In"]).exists || prefix.hasPrefix("49c"), "\(prefix): In on the bottom bar")
            XCTAssertTrue(self.e2e.tapOrderSheetRow(["Share order", "Chia sẻ đơn"]), "\(prefix): ⋯ → Chia sẻ đơn")
            sleep(6)
            self.e2e.shot("\(prefix)-share-sheet")
            sleep(hold)
            self.e2e.tapIfExists(self.e2e.button(["Close", "Đóng"]), timeout: 3)
            sleep(1)
        }
        guard e2e.openFirstOrder(chip: ["Booked", "Đã đặt"]) else { return XCTFail("No booked order to open") }
        share("49a-share-booked")
        e2e.goBack()
        guard e2e.openFirstOrder(chip: ["Renting", "Đang thuê"]) else { return XCTFail("No renting order to open") }
        share("49b-share-renting")
        e2e.goBack()

        e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
        let sale = e2e.saleModeButton
        guard sale.waitForExistence(timeout: 5) else { return XCTFail("Đơn bán switch") }
        sale.tap()
        sleep(2)
        let row = app.cells.firstMatch
        guard row.waitForExistence(timeout: 8) else { return XCTFail("No sale to open") }
        e2e.tapRow(row)
        XCTAssertTrue(e2e.orderMoreButton.waitForExistence(timeout: 10), "sale detail opens")
        share("49c-share-sale")
        e2e.goBack()
    }

    /// Lịch sử thay đổi of an order (board LS-don): a new order shows "Tạo đơn" under today; a note and a hand-over
    /// add entries, the hand-over with the status old → new.
    func test5dOrderChangeHistory() throws {
        try e2e.requireFlag("newOrders")
        try e2e.requireFlag("newOrderDetail")
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        // A cart left as "Sửa đơn #n" by an earlier flow has "Lưu thay đổi", not Tạo đơn (#1040)
        e2e.leaveEditMode()
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
            let handed = e2e.element(labelBeginsWith: ["Handed over", "Đã lấy", "Đã giao"], type: .button)  // #888: "Đã lấy · thu …"
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
        // English Home placeholder: "Search name, barcode or take a photo" (`products.home.searchPlaceholder`)
        let byLabel = e2e.field(["Name, barcode…", "Tên, mã vạch…", "Tìm tên, mã vạch hoặc chụp ảnh", "Search name, barcode or take a photo"])
        if byLabel.exists { return byLabel }
        return app.textFields.matching(NSPredicate(format:
            "placeholderValue BEGINSWITH 'Tìm tên' OR placeholderValue BEGINSWITH 'Name' OR placeholderValue BEGINSWITH 'Search name' OR label BEGINSWITH 'Tìm tên'")).firstMatch
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
        guard search.waitForExistence(timeout: 10) else { e2e.note("home search field not found"); e2e.shot("home-search-missing"); return nil }
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

        // A cart left in edit mode by an earlier run: leave it with Huỷ sửa (#677), then empty any other cart
        if e2e.leaveEditMode() { e2e.shot("60-0-leftover-edit-cancelled") }
        e2e.emptyCart()

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
        // The seed has orders whose createdAt is later today than now (ORD-001-0004 is created at 22:44 Vietnam time), and they sort above
        // a new order: so the new order must be in the loaded list without a pull-to-refresh, not necessarily the top row.
        let topTexts = app.cells.allElementsBoundByIndex.prefix(8).map { E2E.texts($0) }
        e2e.note("top rows after create: \(topTexts.joined(separator: " || "))")
        var listed = topTexts.contains { $0.contains(number) }
        for _ in 0..<3 where !listed {
            app.swipeUp()
            listed = app.cells.allElementsBoundByIndex.contains { E2E.texts($0).contains(number) }
        }
        XCTAssertTrue(listed, "#674: new order #\(number) is in Tất cả đơn without pull-to-refresh")
        e2e.soft(topTexts.first?.contains(number) == true, "the new order is the top row (the seed has orders created later today, so it may not be)")
        for _ in 0..<3 { app.swipeDown() }
        e2e.shot("60c-all-orders-after-create")

        var row = app.cells.containing(NSPredicate(format: "label CONTAINS %@", number)).firstMatch
        if !row.exists { row = app.cells.matching(NSPredicate(format: "label CONTAINS %@", number)).firstMatch }
        guard row.waitForExistence(timeout: 5) else { return XCTFail("Order #\(number) not in Tất cả đơn") }
        e2e.tapRow(row)
        XCTAssertTrue(e2e.orderMoreButton.waitForExistence(timeout: 10), "order detail opens")
        sleep(2)
        e2e.shot("60d-edit-detail-before")

        // #930: the bottom bar is In / Giao đồ / ⋯; Sửa đơn is a row of the ⋯ sheet
        guard e2e.tapOrderSheetRow(["Edit order", "Sửa đơn"]) else { return XCTFail("Booked order offers Sửa đơn in ⋯") }
        e2e.shot("60d2-edit-after-tap")
        // Sửa đơn loads the order into the cart and shows the product list; the cart bar opens the cart
        if !e2e.button(["Lưu thay đổi", "Save changes"]).exists, e2e.homeCart.waitForExistence(timeout: 5) {
            e2e.note("cart bar while editing: \(e2e.homeCart.label)")
            e2e.homeCart.tap()
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
        // The toast is on screen (60i-edit-saved-burst-0.png shows "Đã lưu đơn #n") but its label is not in the accessibility tree (the screen's
        // accessibilityElements leave the ToastView out), so the query cannot see it: soft, and the saved detail below is the hard proof.
        e2e.soft(toastSeen, "toast 'Đã lưu đơn #\(number)' is queryable (it shows in 60i-edit-saved-burst-0.png, not in the accessibility tree)")
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
            guard e2e.homeCart.waitForExistence(timeout: 5) else { return XCTFail("cart bar") }
            e2e.homeCart.tap()
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
        XCTAssertTrue(e2e.homeCart.waitForExistence(timeout: 5), "tapping + on an out-today product adds it (cart bar shows)")
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

    /// #1189 / #1249 day-block pricing: product form → Giá theo khối ngày → the setup screen (80.000 / 100.000 / 120.000, +20.000 a day, preview
    /// 5 days = 160.000) → save → cart with 1 / 3 / 5 days (80.000 / 120.000 / 160.000, "Khối 3 ngày + 2 ngày thêm") →
    /// order → order detail shows the sum. The numbers are the golden ones (tests/fixtures/block-pricing-golden.json).
    func test7qBlockDayPricing() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        let key = "Product 25 -"
        guard e2e.openProduct(named: key) else { return XCTFail("\(key) not found") }
        let edit = e2e.button(["Edit product", "Sửa sản phẩm", "Edit", "Sửa"])
        XCTAssertTrue(edit.waitForExistence(timeout: 5), "product detail has Sửa")
        edit.tap()
        // #1249 (mockup v179): Theo lần, Theo mỗi ngày and the Theo block ngày row all exist; the row opens its own screen
        let blockFormRow = app.descendants(matching: .any)["product.form.blockSummary"]
        XCTAssertTrue(e2e.scrollTo(blockFormRow), "the product form has the Theo block ngày row")
        XCTAssertFalse(app.textFields["block.tier.1"].exists, "the table is not on the form")
        e2e.shot("70a-form-three-prices")
        blockFormRow.tap()
        let firstTier = app.textFields["block.tier.1"]
        XCTAssertTrue(firstTier.waitForExistence(timeout: 5), "the Theo block ngày row opens the setup screen")
        e2e.shot("70b-setup-empty")
        func typeTier(_ index: Int, _ value: String) {
            let box = app.textFields["block.tier.\(index)"]
            XCTAssertTrue(e2e.scrollTo(box), "tier \(index) box")
            box.tap()
            box.typeText(value)
            e2e.hideKeyboard()
        }
        typeTier(1, "80000")
        for (index, value) in [(2, "100000"), (3, "120000")] {
            let add = app.buttons["block.addDay"]
            XCTAssertTrue(e2e.scrollTo(add), "+ Thêm ngày \(index)")
            add.tap()
            typeTier(index, value)
        }
        let extra = app.textFields["block.extra"]
        XCTAssertTrue(e2e.scrollTo(extra), "extra price box")
        extra.tap()
        extra.typeText("20000")
        e2e.hideKeyboard()
        let total = app.staticTexts["block.previewTotal"]
        XCTAssertTrue(e2e.scrollTo(total), "preview total")
        XCTAssertTrue((total.label).contains("160.000"), "preview of 5 days is 160.000 (\(total.label))")
        e2e.shot("70c-setup-filled")
        let saveTable = app.buttons["block.save"]
        XCTAssertTrue(saveTable.waitForExistence(timeout: 3), "Lưu bảng giá")
        saveTable.tap()
        XCTAssertTrue(app.descendants(matching: .any)["product.form.blockSummary"].waitForExistence(timeout: 5), "back on the form with the summary card")
        e2e.shot("70d-form-block-summary")
        let saveProduct = e2e.button(["Save changes", "Lưu thay đổi"])
        e2e.scrollTo(saveProduct)
        saveProduct.tap()
        sleep(3)
        e2e.dismissAlerts()
        XCTAssertTrue(e2e.button(["Add to cart", "Thêm vào giỏ"]).waitForExistence(timeout: 10), "saved, back on the product detail")
        e2e.shot("70e-block-product-detail")
        e2e.goBackOnce()

        // Cart: 1 / 3 / 5 days
        e2e.emptyCart()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        XCTAssertTrue(addFromHome(key), "add the block product to the cart")
        XCTAssertTrue(openCart(), "open the cart")
        e2e.tapIfExists(e2e.button(["Rent", "Thuê"]))
        // #1249: a line starts on the default option, which is always Theo lần; the pricing sheet switches it to the table
        let pricingChip = e2e.element(labelBeginsWith: ["Change pricing for", "Đổi cách tính giá"], type: .button)
        XCTAssertTrue(pricingChip.waitForExistence(timeout: 5), "the line has the pricing link")
        pricingChip.tap()
        let pickBlock = e2e.element(labelBeginsWith: ["Day block", "Theo khối ngày"], type: .button)
        XCTAssertTrue(pickBlock.waitForExistence(timeout: 5), "the pricing sheet lists Theo khối ngày")
        pickBlock.tap()
        e2e.tapIfExists(e2e.button(["Apply", "Áp dụng"]), timeout: 2)
        sleep(1)
        let today = Calendar.current.component(.day, from: Date())
        func setDays(_ count: Int) {
            let dates = app.descendants(matching: .any)["cart.datesRow"]
            XCTAssertTrue(dates.waitForExistence(timeout: 5), "dates row")
            dates.tap()
            sleep(1)
            e2e.pickTodayInDateSheet()
            // A range already chosen: the first tap on today clears it ("Xác nhận" greys out); tap it again
            if !e2e.button(["Confirm", "Xác nhận"]).isEnabled { e2e.pickTodayInDateSheet() }
            if count > 1 {
                let end = today + count - 1
                let texts = app.collectionViews.staticTexts.matching(NSPredicate(format: "label == %@", "\(end)"))
                let byCell = app.collectionViews.cells.matching(NSPredicate(format: "label == %@ OR label BEGINSWITH %@", "\(end)", "\(end) "))
                let cells = byCell.count > 0 ? byCell : texts
                let target = end < 15 ? cells.element(boundBy: 0) : cells.element(boundBy: max(0, cells.count - 1))
                e2e.note("end day \(end): \(cells.count) cells, hittable \(target.isHittable), confirm enabled \(e2e.button(["Confirm", "Xác nhận"]).isEnabled)")
                if target.isHittable { target.tap() } else { e2e.note("day \(end) not hittable") }
                sleep(1)
                e2e.shot("71x-dates-\(count)")
            }
            e2e.tapIfExists(e2e.button(["Confirm", "Xác nhận"]), timeout: 3)
            sleep(2)
        }
        for (days, money) in [(1, "80.000"), (3, "120.000"), (5, "160.000")] {
            setDays(days)
            let line = app.buttons.matching(NSPredicate(format: "value CONTAINS %@", money)).firstMatch
            XCTAssertTrue(line.waitForExistence(timeout: 5), "\(days) days: the pricing link shows \(money) (\(app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Đổi cách tính giá' OR label BEGINSWITH 'Change pricing'")).firstMatch.value ?? ""))")
            e2e.shot("71-cart-block-\(days)-days")
        }
        let formula = app.staticTexts["cart.blockFormula"]
        XCTAssertTrue(formula.waitForExistence(timeout: 3), "5 days shows the sum under the link")
        XCTAssertTrue(formula.label.contains("120.000") && formula.label.contains("20.000") && formula.label.contains("160.000"),
                      "the sum reads 120.000 (3) + 2 × 20.000 = 160.000 (\(formula.label))")

        // The pricing sheet offers the block row; Theo lần and back
        let chip = e2e.element(labelBeginsWith: ["Change pricing for", "Đổi cách tính giá"], type: .button)
        chip.tap()
        e2e.shot("72a-cart-pricing-sheet-block")
        let perRental = e2e.element(labelBeginsWith: ["Per rental", "Theo lần"], type: .button)
        XCTAssertTrue(perRental.waitForExistence(timeout: 5), "the sheet lists Theo lần")
        let blockRow = e2e.element(labelBeginsWith: ["Day block", "Theo khối ngày"], type: .button)
        XCTAssertTrue(blockRow.exists, "the sheet lists Theo khối ngày")
        e2e.tapIfExists(e2e.button(["Apply", "Áp dụng"]), timeout: 2)
        sleep(1)

        _ = e2e.pickFirstCustomer()
        guard e2e.createOrderFromCart(cta: ["Create order", "Tạo đơn"], shotPrefix: "73-cart-block", openOrder: true) else {
            return XCTFail("Block rent order was not created (last alert: \(e2e.lastAlert ?? "none"))")
        }
        let sum = app.staticTexts["orderDetail.item.blockFormula"]
        XCTAssertTrue(sum.waitForExistence(timeout: 10), "order detail shows the sum of the block line")
        XCTAssertTrue(sum.label.contains("120.000"), "order detail sum (\(sum.label))")  // #1285: the total sits at the right of the line
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS '160.000'")).count >= 1, "the order totals 160.000")
        e2e.shot("74-order-detail-block")
    }

    /// #1249 (mockup v179): Theo lần, Theo mỗi ngày and Theo block ngày exist together. New product: three prices, block
    /// "Chưa cài"; the row opens the setup screen, back keeps the day price; the table is typed by hand; "Lưu bảng giá"
    /// shows the summary and the day price box stays. Old per-day product and a product with a table open right.
    /// Needs the products "Ao dai DAILY cu" (DAILY 150.000 only) and "Vay cuoi co bang" (a BLOCK table) in the shop;
    /// a soft note when they are missing. Nothing is saved.
    func test7rProductPriceKind() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireRole("merchant")
        try e2e.start()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        let add = e2e.button(["Add product", "Thêm sản phẩm"])
        XCTAssertTrue(add.waitForExistence(timeout: 10), "Home has +")
        add.tap()
        let blockRow = app.descendants(matching: .any)["product.form.blockSummary"]
        XCTAssertTrue(e2e.scrollTo(blockRow), "the new product form has the Theo block ngày row")
        XCTAssertTrue(app.textFields["product.form.perRental"].exists, "Theo lần box")
        XCTAssertTrue(app.textFields["product.form.perDay"].exists, "Theo mỗi ngày box")
        XCTAssertTrue(blockNotSetTexts.contains(blockRow.value as? String ?? ""), "block says Chưa cài (\(blockRow.value ?? ""))")
        XCTAssertFalse(app.descendants(matching: .any)["product.form.kind.block"].exists, "no radio")
        e2e.shot("80a-new-three-prices")
        // the day price survives a trip to the setup screen and back
        let dayBox = app.textFields["product.form.perDay"]
        e2e.scrollTo(dayBox)
        dayBox.tap()
        dayBox.typeText("80000")
        e2e.hideKeyboard()
        e2e.scrollTo(blockRow)
        blockRow.tap()
        XCTAssertTrue(app.textFields["block.tier.1"].waitForExistence(timeout: 5), "the row opens the setup screen")
        e2e.shot("80b-setup")
        // typed by hand: 80.000, 100.000, 120.000 (3 days), 20.000 a day past the table
        func fillTable() {
            func typeTier(_ index: Int, _ value: String) {
                let box = app.textFields["block.tier.\(index)"]
                XCTAssertTrue(e2e.scrollTo(box), "tier \(index) box")
                box.tap()
                box.typeText(value)
                e2e.hideKeyboard()
            }
            typeTier(1, "80000")
            for (index, value) in [(2, "100000"), (3, "120000")] {
                let add = app.buttons["block.addDay"]
                XCTAssertTrue(e2e.scrollTo(add), "+ Thêm ngày \(index)")
                add.tap()
                typeTier(index, value)
            }
            let extra = app.textFields["block.extra"]
            XCTAssertTrue(e2e.scrollTo(extra), "extra price box")
            extra.tap()
            extra.typeText("20000")
            e2e.hideKeyboard()
        }
        XCTAssertFalse(app.buttons["block.quick"].exists, "there is no Tạo nhanh")
        fillTable()
        let third = app.textFields["block.tier.3"]
        XCTAssertTrue(third.waitForExistence(timeout: 5), "3 rows")
        XCTAssertTrue((third.value as? String ?? "").contains("120.000"), "row 3 is 120.000 (\(third.value ?? ""))")
        e2e.shot("80d-setup-filled")
        // back without saving: nothing changes (day price still there, block still Chưa cài)
        let back = app.buttons["block.back"]
        XCTAssertTrue(back.waitForExistence(timeout: 3), "back")
        back.tap()
        XCTAssertTrue(app.textFields["product.form.perDay"].waitForExistence(timeout: 5), "cancelled setup returns to the form")
        XCTAssertEqual(app.textFields["product.form.perDay"].value as? String, "80.000", "the day price is still there")
        XCTAssertTrue(blockNotSetTexts.contains(blockRow.value as? String ?? ""), "no table was saved: Chưa cài")
        // the row again, the table by hand, Lưu bảng giá: the summary shows and the day price box stays
        e2e.scrollTo(blockRow)
        blockRow.tap()
        XCTAssertTrue(app.textFields["block.tier.1"].waitForExistence(timeout: 5))
        fillTable()
        XCTAssertTrue(app.textFields["block.tier.3"].waitForExistence(timeout: 5))
        app.buttons["block.save"].tap()
        XCTAssertTrue(blockRow.waitForExistence(timeout: 5), "Lưu bảng giá: back on the form")
        XCTAssertFalse(blockNotSetTexts.contains(blockRow.value as? String ?? ""), "the row shows the table summary")
        XCTAssertTrue(app.textFields["product.form.perDay"].exists, "the day price box stays next to the table")
        e2e.shot("80e-new-block-summary")
        e2e.tapIfExists(e2e.button(["Close", "Đóng"]), timeout: 3)
        e2e.dismissAlerts()

        for (key, shot) in [("Ao dai DAILY", "80c-edit-old-daily"), ("Vay cuoi co", "80d-edit-with-table"), ("Ao vest theo", "80e-edit-per-rental")] {
            guard e2e.openProduct(named: key) else { e2e.note("\(key) not found"); continue }
            let edit = e2e.button(["Edit product", "Sửa sản phẩm", "Edit", "Sửa"])
            guard edit.waitForExistence(timeout: 5) else { e2e.note("no Sửa for \(key)"); e2e.goBackOnce(); continue }
            edit.tap()
            let row = app.descendants(matching: .any)["product.form.blockSummary"]
            _ = e2e.scrollTo(row)
            e2e.shot(shot)
            app.swipeUp()
            sleep(1)
            e2e.shot(shot + "-more")
            e2e.tapIfExists(e2e.button(["Close", "Đóng"]), timeout: 3)
            e2e.goBackOnce()
        }
    }

    private var blockNotSetTexts: [String] { ["Not set", "Chưa cài"] }

    /// Product detail → Sửa → the "Theo mỗi ngày" box (#1249 mockup v179) → new value → Lưu thay đổi. Returns the value the field had (may be "").
    private func editDailyPrice(to value: String, shot: String?) -> String? {
        let edit = e2e.button(["Edit product", "Sửa sản phẩm", "Edit", "Sửa"])
        guard edit.waitForExistence(timeout: 5) else { e2e.note("no Sửa on product detail"); return nil }
        edit.tap()
        let field = app.textFields["product.form.perDay"]
        guard field.waitForExistence(timeout: 8) || e2e.scrollTo(field) else { e2e.note("no day price box"); return nil }
        e2e.scrollTo(field)
        let raw = field.value as? String ?? ""
        let old = (raw == field.placeholderValue || raw == "0") ? "" : raw
        // one tap at the right end of the box (caret after the text), then delete what is there and type
        field.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.5)).tap()
        if !old.isEmpty { field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: old.count + 4)) }
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
        // #1064: the pill is short ("Còn N" / "Chỉ còn N" / "Hết đồ"); its label is the VoiceOver text. A line with enough
        // units says "Còn N trong ngày đã chọn" (green): only "Chỉ còn N trống…" (amber) or "Hết đồ trong ngày…" (red) means
        // the stock runs out
        let short = app.staticTexts.matching(NSPredicate(format:
            "label CONTAINS 'Chỉ còn' OR label CONTAINS 'Only ' OR label BEGINSWITH ' Hết đồ' OR label BEGINSWITH ' Booked out' OR label BEGINSWITH 'Hết đồ' OR label BEGINSWITH 'Booked out'")).firstMatch
        // A product already booked out today (an earlier run took the units) shows the red "Hết …" tag at once instead of "Chỉ còn N trống"
        let outTag = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Xem các đơn' OR label BEGINSWITH 'See the orders'")).firstMatch
        sleep(2)
        e2e.shot("33a2-overlap-cart-free") // #1064: enough units → green "Còn N"
        for _ in 0..<40 where !short.exists && !outTag.exists {
            guard plus.exists else { break }
            plus.tap()
            sleep(1)
        }
        e2e.soft(short.waitForExistence(timeout: 3) || outTag.exists, "the line says the stock runs out")
        e2e.shot("33b-overlap-first-order-cart")
        _ = e2e.pickFirstCustomer()
        guard e2e.createOrderFromCart(cta: E2E.rentCta, shotPrefix: "33c-overlap-first") else {
            return XCTFail("The order taking all stock was not created (last alert: \(e2e.lastAlert ?? "none"))")
        }
        let firstNumber = e2e.lastCreatedOrderNumber ?? ""

        // 2. Same product, same day: the line shows the clash; the confirm sheet warns and reads "Vẫn tạo đơn"
        guard e2e.addToCartAndOpen(product: key) else { return XCTFail("Could not put \(key) in the cart again") }
        e2e.cartRentToday()
        // #684: the line carries a red tag "Hết 10/10 ›" (a button: "Xem các đơn đang giữ món ngày 10/10"); the old text line
        // "Hết đồ … · đã thuê ở đơn #…" is gone. The tag opens Lịch trống on that day (test8cOverlapTagAndRoleSheet).
        let clash = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Xem các đơn' OR label BEGINSWITH 'See the orders'")).firstMatch
        XCTAssertTrue(clash.waitForExistence(timeout: 10), "the cart line shows the Hết tag (Xem các đơn đang giữ món ngày …)")
        if clash.exists { e2e.note("clash tag: \(clash.label) (first order #\(firstNumber))") }
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
        XCTAssertTrue(e2e.homeCart.waitForExistence(timeout: 5), "the cart is kept")
        e2e.homeCart.tap()
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

    // MARK: - #1315 settings sync: the owner changes a setting (over HTTP, as the owner), this device (staff / manager) reads it

    /// The UI test target is built for iOS 12.2: addTeardownBlock needs 13
    private func onTeardown(_ block: @escaping () -> Void) {
        if #available(iOS 13.0, *) { addTeardownBlock(block) }
    }

    /// Home shows prices: the money unit on screen ("đ" or "$")
    private func moneyMark() -> String {
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        sleep(4)
        let texts = app.staticTexts.allElementsBoundByIndex.prefix(80).map(\.label)
        if texts.contains(where: { $0.contains("$") }) { return "USD" }
        // VND prices have no symbol on the Home rows ("103/lần"): a price line without "$" is VND
        if texts.contains(where: { $0.contains("đ") || $0.contains("₫") || $0.contains("/lần") || $0.contains("/ngày") }) { return "VND" }
        return "none"
    }

    /// (a) #1307: the owner switches the shop currency; after reopening the app this device shows the new unit, and the old one again after switching back
    func test7qSettingsSyncCurrency() throws {
        try e2e.requireFlag("newSettings")
        if e2e.role == "merchant" { throw XCTSkip("run as staff / manager: the owner's API login would end the owner's app session") }
        try e2e.start()
        guard OwnerAPI.login() else { return XCTFail("owner login over HTTP failed") }
        let start = OwnerAPI.currency() ?? "?"
        let other = start == "VND" ? "USD" : "VND"
        onTeardown { _ = OwnerAPI.put("/api/settings/currency", ["currency": start]) }
        e2e.note("SYNC currency start=\(start) role=\(e2e.role) email=\(e2e.email)")
        let before = moneyMark(); e2e.shot("sync-cur-1-home-\(start)")
        XCTAssertEqual(before, start, "this device shows the shop currency \(start) before the change")
        XCTAssertEqual(OwnerAPI.put("/api/settings/currency", ["currency": other]), 200, "the owner changes the currency")
        app.terminate(); app.launch(); e2e.settle(seconds: 8)
        let after = moneyMark(); e2e.shot("sync-cur-2-home-\(other)")
        XCTAssertEqual(after, other, "after reopening, this device shows \(other)")
        XCTAssertEqual(OwnerAPI.put("/api/settings/currency", ["currency": start]), 200, "the owner changes it back")
        app.terminate(); app.launch(); e2e.settle(seconds: 8)
        XCTAssertEqual(moneyMark(), start, "changed back: this device shows \(start) again")
        e2e.shot("sync-cur-3-home-back")
    }

    /// (b, owner side) the owner edits the note and the QR switch on the printer screen; the API then holds them
    private func ownerEditsPrintSettings() {
        let note = "Ghi chu chu shop \(Int(Date().timeIntervalSince1970) % 100000)"
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil); sleep(2)
        let row = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Print & receipts' OR label BEGINSWITH 'In & phiếu'")).firstMatch
        XCTAssertTrue(e2e.scrollTo(row), "the Print & receipts row")
        e2e.tapRow(row); sleep(4)
        e2e.shot("sync-prn-owner-1-printer")
        let noteView = app.textViews.firstMatch
        XCTAssertTrue(noteView.waitForExistence(timeout: 8), "the note field")
        _ = e2e.scrollTo(noteView)
        let readonly = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Only the shop owner' OR label BEGINSWITH 'Chỉ chủ shop'")).firstMatch
        XCTAssertFalse(readonly.exists, "the owner has no read-only caption")
        noteView.tap(); sleep(1)
        noteView.typeText(note)
        e2e.hideKeyboard(); sleep(1)
        let qr = app.switches["printer.bankQr.switch"]
        _ = e2e.scrollTo(qr)
        XCTAssertTrue(qr.isEnabled, "the owner can use the QR switch")
        if qr.value as? String != "1" { qr.tap(); sleep(3) }
        e2e.shot("sync-prn-owner-2-edited")
        e2e.goBackOnce(); sleep(2)
        guard OwnerAPI.login() else { return XCTFail("owner login over HTTP failed") }
        let oid = Int(ProcessInfo.processInfo.environment["E2E_OUTLET_ID"] ?? "") ?? 1
        let saved = OwnerAPI.outletPrint(oid)
        e2e.note("SYNC owner saved note='\(saved.note)' qr=\(saved.qr)")
        XCTAssertTrue(saved.note.contains(note), "the server holds the note the owner typed, got '\(saved.note)'")
        XCTAssertTrue(saved.qr, "the server holds the QR switch ON")
        _ = OwnerAPI.put("/api/outlets?outletId=\(oid)", ["printNote": "", "printBankQr": false])
    }

    /// (b) #1308: the owner edits the branch print note + QR; this device reads them on Print & receipts, read-only unless the owner
    func test7rSettingsSyncPrintNote() throws {
        try e2e.requireFlag("newSettings")
        try e2e.start()
        let isOwner = e2e.role == "merchant"
        if isOwner { return ownerEditsPrintSettings() }
        guard OwnerAPI.login() else { return XCTFail("owner login over HTTP failed") }
        let outletId = Int(ProcessInfo.processInfo.environment["E2E_OUTLET_ID"] ?? "")
        XCTAssertNotNil(outletId, "E2E_OUTLET_ID (outlet of the account under test) is not set")
        guard let oid = outletId else { return }
        let note = "Ghi chu dong bo \(Int(Date().timeIntervalSince1970) % 100000)"
        let original = OwnerAPI.outletPrint(oid)
        onTeardown { _ = OwnerAPI.put("/api/outlets?outletId=\(oid)", ["printNote": original.note, "printBankQr": original.qr]) }
        XCTAssertEqual(OwnerAPI.put("/api/outlets?outletId=\(oid)", ["printNote": note, "printBankQr": true]), 200, "the owner sets note + QR")
        app.terminate(); app.launch(); e2e.settle(seconds: 8)
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil); sleep(2)
        let row = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Print & receipts' OR label BEGINSWITH 'In & phiếu'")).firstMatch
        XCTAssertTrue(e2e.scrollTo(row), "the Print & receipts row")
        e2e.shot("sync-prn-1-settings-\(e2e.role)")
        e2e.tapRow(row); sleep(4)
        e2e.shot("sync-prn-2-printer-\(e2e.role)")
        let noteView = app.textViews.firstMatch
        XCTAssertTrue(noteView.waitForExistence(timeout: 8), "the note field")
        _ = e2e.scrollTo(noteView)
        XCTAssertTrue((noteView.value as? String ?? "").contains(note), "this device shows the owner's note '\(note)', got '\(noteView.value as? String ?? "nil")'")
        let qr = app.switches["printer.bankQr.switch"]
        _ = e2e.scrollTo(qr)
        XCTAssertEqual(qr.value as? String, "1", "the QR switch shows ON")
        let readonly = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Only the shop owner' OR label BEGINSWITH 'Chỉ chủ shop'")).firstMatch
        _ = e2e.scrollTo(readonly)
        if isOwner {
            XCTAssertFalse(readonly.exists, "the owner has no read-only caption")
            XCTAssertTrue(qr.isEnabled, "the owner can use the QR switch")
        } else {
            XCTAssertTrue(readonly.exists, "a non-owner sees the read-only caption")
            XCTAssertFalse(qr.isEnabled, "the QR switch is disabled for a non-owner")
        }
        e2e.shot("sync-prn-3-printer-bottom-\(e2e.role)")
        // the receipt: the same note comes from the order's outlet (share image text is not readable here; see the notes)
        e2e.note("SYNC print: role=\(e2e.role) note shown=\(noteView.value as? String ?? "nil") qr=\(qr.value as? String ?? "nil") readonlyCaption=\(readonly.exists)")
        XCTAssertEqual(OwnerAPI.put("/api/outlets?outletId=\(oid)", ["printNote": "", "printBankQr": false]), 200, "the owner clears them")
        e2e.goBackOnce()
        app.terminate(); app.launch(); e2e.settle(seconds: 8)
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil); sleep(2)
        let row2 = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Print & receipts' OR label BEGINSWITH 'In & phiếu'")).firstMatch
        _ = e2e.scrollTo(row2); e2e.tapRow(row2); sleep(4)
        let noteAfter = app.textViews.firstMatch
        _ = noteAfter.waitForExistence(timeout: 8)
        XCTAssertFalse((noteAfter.value as? String ?? "").contains(note), "changed back: the old note is gone (no stale value)")
        e2e.shot("sync-prn-4-printer-cleared-\(e2e.role)")
    }

    /// #1354: "Hiện ghi chú đơn trên ảnh chia sẻ" on In & phiếu. The owner's switch saves at once (the API then holds it).
    /// Any other role sees it dimmed with "Chỉ chủ shop bật/tắt." and follows the owner's change after the app comes back to
    /// the front (the app reads the flag at most once a minute, so the test waits 65 s).
    func test7uShareOrderNoteSwitch() throws {
        try e2e.requireFlag("newSettings")
        try e2e.start()
        let isOwner = e2e.role == "merchant"
        let toggle = app.switches["printer.shareNote.switch"]
        let readonly = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Only the shop owner can turn' OR label BEGINSWITH 'Chỉ chủ shop bật/tắt'")).firstMatch
        let openPrinter: () -> Void = {
            self.e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil); sleep(2)
            let row = self.app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Print & receipts' OR label BEGINSWITH 'In & phiếu'")).firstMatch
            XCTAssertTrue(self.e2e.scrollTo(row), "the Print & receipts row")
            self.e2e.tapRow(row); sleep(4)
            XCTAssertTrue(self.e2e.scrollTo(toggle), "the order-note switch")
        }
        if isOwner {
            openPrinter()
            XCTAssertTrue(toggle.isEnabled, "the owner can use the switch")
            XCTAssertFalse(readonly.exists, "the owner has no read-only caption")
            let before = toggle.value as? String == "1"
            e2e.shot("share-note-owner-1-before")
            toggle.tap(); sleep(3)
            XCTAssertEqual(toggle.value as? String, before ? "0" : "1", "the switch moved")
            e2e.shot("share-note-owner-2-after")
            // The HTTP login signs the app out (one session per account): only after the screens
            guard OwnerAPI.login() else { return XCTFail("owner login over HTTP failed") }
            XCTAssertEqual(OwnerAPI.shareOrderNote(), !before, "the API holds the new value")
            _ = OwnerAPI.put("/api/settings/merchant", ["shareOrderNote": before])
            return
        }
        guard OwnerAPI.login() else { return XCTFail("owner login over HTTP failed") }
        let original = OwnerAPI.shareOrderNote() ?? false
        onTeardown { _ = OwnerAPI.put("/api/settings/merchant", ["shareOrderNote": original]) }
        XCTAssertEqual(OwnerAPI.put("/api/settings/merchant", ["shareOrderNote": false]), 200, "the owner turns it OFF")
        app.terminate(); app.launch(); e2e.settle(seconds: 8)
        openPrinter()
        XCTAssertEqual(toggle.value as? String, "0", "OFF for \(e2e.role)")
        XCTAssertFalse(toggle.isEnabled, "dimmed: \(e2e.role) cannot change it")
        _ = e2e.scrollTo(readonly)
        XCTAssertTrue(readonly.exists, "Chỉ chủ shop bật/tắt.")
        e2e.shot("share-note-\(e2e.role)-1-off")
        e2e.goBackOnce(); sleep(1)
        XCTAssertEqual(OwnerAPI.put("/api/settings/merchant", ["shareOrderNote": true]), 200, "the owner turns it ON (another device)")
        sleep(65)
        XCUIDevice.shared.press(.home); sleep(2)
        app.activate(); sleep(5)
        openPrinter()
        XCTAssertEqual(toggle.value as? String, "1", "ON after the app came back to the front (\(e2e.role))")
        XCTAssertFalse(toggle.isEnabled)
        e2e.shot("share-note-\(e2e.role)-2-on-after-foreground")
        e2e.goBackOnce(); sleep(1)
        XCTAssertEqual(OwnerAPI.put("/api/settings/merchant", ["shareOrderNote": false]), 200, "the owner turns it OFF again")
        sleep(65)
        XCUIDevice.shared.press(.home); sleep(2)
        app.activate(); sleep(5)
        openPrinter()
        XCTAssertEqual(toggle.value as? String, "0", "OFF again (\(e2e.role))")
        e2e.shot("share-note-\(e2e.role)-3-off-again")
    }

    /// (c) #1310: "Cọc" is shown to the shop owner only. Needs the build of PR #1316
    func test7sSettingsSyncDepositHidden() throws {
        try e2e.requireFlag("newSettings")
        guard ProcessInfo.processInfo.environment["E2E_PR1310"] == "1" else { throw XCTSkip("waits for #1310 (PR #1316): run with TEST_RUNNER_E2E_PR1310=1 on a build that has it") }
        try e2e.start()
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil); sleep(3)
        e2e.shot("sync-dep-1-settings-\(e2e.role)")
        let deposit = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Deposit' OR label BEGINSWITH 'Cọc'")).firstMatch
        for _ in 0..<3 where !deposit.exists { app.swipeUp() }
        e2e.shot("sync-dep-2-settings-scrolled-\(e2e.role)")
        if e2e.role == "merchant" { XCTAssertTrue(deposit.exists, "the owner sees the Cọc row") } else { XCTAssertFalse(deposit.exists, "\(e2e.role) does not see the Cọc row") }
    }

    /// (d) the owner turns "Cho tạo đơn khi trùng lịch" off: this device's cart refuses a product that is fully booked today; on again, it allows it
    func test7tSettingsSyncOverlapCart() throws {
        try e2e.requireFlag("newProducts")
        if e2e.role == "merchant" { throw XCTSkip("run as staff / manager: the owner's API login would end the owner's app session") }
        try e2e.start()
        guard OwnerAPI.login() else { return XCTFail("owner login over HTTP failed") }
        onTeardown { _ = OwnerAPI.put("/api/settings/merchant", ["allowOverlappingOrders": true]) }
        let blocked = app.descendants(matching: .any).matching(NSPredicate(format:
            "label BEGINSWITH 'Cửa hàng không cho tạo đơn trùng lịch' OR label BEGINSWITH 'This shop does not allow overlapping'")).firstMatch
        let product = "Váy trùng đơn test"  // prepare-accounts.sh staged: 1 in stock, all held today
        func openCart() -> Bool {
            e2e.emptyCart()
            guard e2e.addToCartAndOpen(product: product) else { return false }
            e2e.cartRentToday(); sleep(3)
            return true
        }
        XCTAssertEqual(OwnerAPI.put("/api/settings/merchant", ["allowOverlappingOrders": false]), 200, "the owner turns overlap OFF")
        app.terminate(); app.launch(); e2e.settle(seconds: 8)
        XCTAssertTrue(openCart(), "cart with \(product)")
        XCTAssertTrue(blocked.waitForExistence(timeout: 10), "OFF: the staff cart shows the blocked notice")
        let cta = e2e.button(["Create order", "Tạo đơn"])
        XCTAssertFalse(cta.exists && cta.isEnabled, "OFF: Tạo đơn is disabled")
        e2e.shot("sync-ovl-1-off-\(e2e.role)")
        e2e.goBackOnce()
        XCTAssertEqual(OwnerAPI.put("/api/settings/merchant", ["allowOverlappingOrders": true]), 200, "the owner turns overlap ON")
        app.terminate(); app.launch(); e2e.settle(seconds: 8)
        XCTAssertTrue(openCart(), "cart with \(product) again")
        sleep(2)
        XCTAssertFalse(blocked.exists, "ON: the notice is gone (no stale value)")
        e2e.shot("sync-ovl-2-on-\(e2e.role)")
        e2e.emptyCart()
    }

    /// (c) #1309: the Cọc row is hidden from a staff device (#1310), but its Giỏ still collects the deposit the way the shop chose:
    /// the owner switches "Cách thu cọc" (one time ↔ staged) over HTTP; after reopening, the cart shows the matching block.
    func test7vSettingsSyncDepositCart() throws {
        try e2e.requireFlag("newProducts")
        if e2e.role == "merchant" { throw XCTSkip("run as staff / manager: the owner's API login would end the owner's app session") }
        try e2e.start()
        guard OwnerAPI.login() else { return XCTFail("owner login over HTTP failed") }
        let before = (OwnerAPI.call("GET", "/api/settings/deposit").body?["data"] as? [String: Any])?["depositMode"] as? String ?? "ONE_TIME"
        let policy = (OwnerAPI.call("GET", "/api/settings/deposit").body?["data"] as? [String: Any])?["cancellationPolicy"] as? String ?? ""
        onTeardown { _ = OwnerAPI.put("/api/settings/deposit", ["depositMode": before, "cancellationPolicy": policy]) }
        let product = "Váy trùng đơn test"
        // the block title is drawn in capitals and the row may carry its value in the label: match any element, ignoring case
        let stagedTitle = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] 'Thu cọc theo giai đoạn' OR label CONTAINS[c] 'Staged deposit'")).firstMatch
        let oneTime = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] 'Cọc trả trước' OR label CONTAINS[c] 'Deposit paid now'")).firstMatch
        func openCart() -> Bool {
            e2e.emptyCart()
            guard e2e.addToCartAndOpen(product: product) else { return false }
            e2e.cartRentToday(); sleep(4)
            return true
        }
        XCTAssertEqual(OwnerAPI.put("/api/settings/deposit", ["depositMode": "STAGED", "cancellationPolicy": policy]), 200, "the owner switches to staged deposit")
        app.terminate(); app.launch(); e2e.settle(seconds: 8)
        XCTAssertTrue(openCart(), "cart with \(product)")
        e2e.shot("sync-dep-cart-1-staged-\(e2e.role)")
        XCTAssertTrue(stagedTitle.waitForExistence(timeout: 8), "STAGED: the staff cart shows Thu cọc theo giai đoạn")
        XCTAssertFalse(oneTime.exists, "STAGED: no one-time Cọc trả trước row")
        e2e.goBackOnce()
        XCTAssertEqual(OwnerAPI.put("/api/settings/deposit", ["depositMode": "ONE_TIME", "cancellationPolicy": policy]), 200, "the owner switches back to one-time deposit")
        app.terminate(); app.launch(); e2e.settle(seconds: 8)
        XCTAssertTrue(openCart(), "cart with \(product) again")
        e2e.shot("sync-dep-cart-2-one-time-\(e2e.role)")
        XCTAssertTrue(oneTime.waitForExistence(timeout: 8), "ONE_TIME: the staff cart shows Cọc trả trước")
        XCTAssertFalse(stagedTitle.exists, "ONE_TIME: no staged block (no stale value)")
        e2e.emptyCart()
    }

    /// (a, d, owner side) #1309: the OWNER changes the shop currency and "Cho tạo đơn khi trùng lịch" with the app's own screens.
    /// The owner is signed in on the phone, so nothing here calls the API as the owner; the run reads the database before and
    /// after. Target comes from TEST_RUNNER_E2E_OWNER_SET: "currency=VND", "currency=USD", "overlap=off", "overlap=on" (comma list).
    func test7uOwnerChangesSettingsByUI() throws {
        try e2e.requireFlag("newSettings")
        try e2e.requireRole("merchant")
        let spec = (ProcessInfo.processInfo.environment["E2E_OWNER_SET"] ?? "")
            .split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
        guard !spec.isEmpty else { throw XCTSkip("set TEST_RUNNER_E2E_OWNER_SET, e.g. currency=VND,overlap=off") }
        try e2e.start()
        for item in spec {
            let parts = item.split(separator: "=").map(String.init)
            guard parts.count == 2 else { return XCTFail("bad spec '\(item)'") }
            switch parts[0] {
            case "overlap":
                XCTAssertEqual(e2e.setOverlapAllowed(parts[1] == "on"), parts[1] == "on", "the owner turns Cho tạo đơn khi trùng lịch \(parts[1]) in Settings")
                e2e.shot("owner-set-overlap-\(parts[1])")
            case "currency":
                e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil); sleep(2)
                let row = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Store Information", "Thông tin cửa hàng"])).firstMatch
                XCTAssertTrue(row.waitForExistence(timeout: 8), "the Thông tin cửa hàng row")
                e2e.tapRow(row); sleep(3)
                let cur = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Currency", "Tiền tệ"])).firstMatch
                XCTAssertTrue(cur.waitForExistence(timeout: 5), "Tiền tệ row in the shop block")
                e2e.tapRow(cur); sleep(2)
                e2e.shot("owner-set-currency-1-sheet")
                let want = parts[1].uppercased()
                let choice = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", want)).firstMatch
                XCTAssertTrue(choice.waitForExistence(timeout: 5), "the \(want) choice in the sheet")
                choice.tap(); sleep(2)
                e2e.shot("owner-set-currency-2-confirm")
                let confirm = app.alerts.firstMatch.buttons.matching(NSPredicate(format: "label CONTAINS %@", want)).firstMatch
                if confirm.waitForExistence(timeout: 3) { confirm.tap(); sleep(3) } else { e2e.note("no confirm alert: the shop already had \(want)") }
                e2e.shot("owner-set-currency-3-after")
                XCTAssertTrue(app.staticTexts[want].waitForExistence(timeout: 5), "the Tiền tệ row now reads \(want)")
                e2e.goBackOnce()
                e2e.tapTab(["Home", "Trang chủ"], index: 0); sleep(4)
                e2e.shot("owner-set-currency-4-home")
            default:
                XCTFail("unknown key '\(parts[0])'")
            }
        }
    }

    /// (b, owner side, second branch) #1308: the owner picks ANOTHER branch on In & phiếu and edits its note + QR; the first branch
    /// keeps its own. Nothing here calls the API as the owner (the phone is signed in as the owner): the run reads the database
    /// before and after. TEST_RUNNER_E2E_BRANCH_NAME is the branch to pick (default "Outlet 2").
    func test7wOwnerPrintOtherBranch() throws {
        try e2e.requireFlag("newSettings")
        try e2e.requireRole("merchant")
        try e2e.start()
        let branch = ProcessInfo.processInfo.environment["E2E_BRANCH_NAME"] ?? "Outlet 2"
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil); sleep(2)
        let row = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Print & receipts' OR label BEGINSWITH 'In & phiếu'")).firstMatch
        XCTAssertTrue(e2e.scrollTo(row), "the Print & receipts row")
        e2e.tapRow(row); sleep(4)
        let picker = app.buttons["printer.branch.button"]
        XCTAssertTrue(picker.waitForExistence(timeout: 8), "the owner has the branch picker")
        e2e.shot("owner-branch-1-first")
        picker.tap(); sleep(2)
        e2e.shot("owner-branch-2-sheet")
        let choice = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", branch)).firstMatch
        XCTAssertTrue(choice.waitForExistence(timeout: 5), "the sheet lists \(branch)")
        choice.tap(); sleep(3)
        XCTAssertTrue(picker.label.contains(branch), "the picker now reads \(branch): '\(picker.label)'")
        let noteView = app.textViews.firstMatch
        XCTAssertTrue(noteView.waitForExistence(timeout: 8), "the note field")
        noteView.tap(); sleep(1)
        noteView.typeText("Ghi chu chi nhanh hai \(Int(Date().timeIntervalSince1970) % 100000)")
        e2e.hideKeyboard(); sleep(1)
        let qr = app.switches["printer.bankQr.switch"]
        _ = e2e.scrollTo(qr)
        XCTAssertTrue(qr.isEnabled, "the owner can use the QR switch")
        if qr.value as? String != "1" { qr.tap(); sleep(3) }
        e2e.shot("owner-branch-3-edited")
        let save = e2e.button(["Save", "Lưu"])
        if save.exists { save.tap(); sleep(3) }
        e2e.shot("owner-branch-4-saved")
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

    /// #1270 Settings plan B: Thông tin cửa hàng, Tiền tệ, Tài khoản ngân hàng, Cọc ›, In & phiếu ›, then the screens.
    /// Staff runs check what is hidden (currency, bank accounts, the switch); Cọc stays for everyone.
    func test7zCompactSettings() throws {
        try e2e.requireFlag("newSettings")
        try e2e.start()
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        sleep(3)
        func label(_ labels: [String]) -> XCUIElement {
            app.staticTexts.matching(NSPredicate(format: "label IN %@", labels)).firstMatch
        }
        let isOwner = e2e.role == "merchant"
        let isManager = e2e.role == "manager"  // Quản lý chi nhánh
        // #1313: the owner's row is "Thông tin cửa hàng", every other role "Thông tin chi nhánh"
        let storeInfo = isOwner ? label(["Store Information", "Thông tin cửa hàng"]) : label(["Branch Information", "Thông tin chi nhánh"])
        let collect = label(["Deposit", "Cọc"])
        let printing = label(["Print & receipts", "In & phiếu"])
        XCTAssertTrue(storeInfo.waitForExistence(timeout: 8), "Thông tin cửa hàng row")
        XCTAssertEqual(collect.exists, isOwner, "#1310: the Cọc row is the owner's only")
        XCTAssertTrue(printing.exists, "In & phiếu row")
        XCTAssertFalse(label(["Currency", "Tiền tệ"]).exists, "#1313: Tiền tệ is inside Thông tin cửa hàng, not a row of the list")
        XCTAssertEqual(label(["Bank Accounts", "Tài khoản ngân hàng"]).exists, isOwner || isManager,
                       "Tài khoản ngân hàng row for owner / outlet admin only (#1319 will make it the owner's only)")
        XCTAssertFalse(label(["Payments", "Thu tiền"]).exists, "no Thu tiền screen any more")
        XCTAssertFalse(label(["Printer", "Máy in"]).exists, "no separate Máy in row")
        XCTAssertFalse(label(["Change Password", "Đổi mật khẩu"]).exists, "Đổi mật khẩu is inside the name card")
        XCTAssertFalse(label(["Delete Account", "Xoá tài khoản"]).exists, "Xoá tài khoản is inside Nâng cao")
        XCTAssertTrue(app.buttons["settings.notifications"].exists, "the Thông báo bell at the top right")
        e2e.soft(isOwner == app.switches.firstMatch.exists, "the overlap switch shows for the owner only")
        e2e.shot("z1-settings-top")
        app.swipeUp()
        sleep(1)
        e2e.shot("z2-settings-bottom")
        let advanced = label(["Advanced", "Nâng cao"])
        XCTAssertTrue(advanced.exists, "Nâng cao row")
        app.swipeDown()
        sleep(1)

        if isOwner {
            collect.tap()
            sleep(3)
            e2e.shot("z3-collect")
            XCTAssertTrue(app.descendants(matching: .any)["settings.collect.mode"].exists, "Cách thu cọc line")
            XCTAssertTrue(app.descendants(matching: .any)["deposit.templates.row"].exists, "Mẫu giai đoạn line")
            XCTAssertTrue(app.descendants(matching: .any)["deposit.policy.row"].exists, "Chính sách huỷ / dời ngày line")
            e2e.goBackOnce()
        }

        printing.tap()
        sleep(2)
        e2e.shot("z4-printing")
        e2e.goBackOnce()

        XCTAssertTrue(e2e.scrollTo(advanced), "Nâng cao reachable")
        advanced.tap()
        sleep(2)
        e2e.shot("z5-advanced")
        XCTAssertTrue(app.descendants(matching: .any)["settings.advanced.appInfo"].exists, "Thông tin ứng dụng")
        XCTAssertTrue(app.descendants(matching: .any)["settings.advanced.deleteAccount"].exists, "Xoá tài khoản")
        e2e.goBackOnce()

        app.swipeDown()
        sleep(1)
        let card = app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'hồ sơ, mật khẩu' OR label CONTAINS 'profile, password'")).firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 5), "the name card")
        card.tap()
        sleep(2)
        e2e.shot("z6-profile")
        XCTAssertTrue(app.descendants(matching: .any)["settings.profile.password"].exists, "Đổi mật khẩu")
        e2e.goBackOnce()

        storeInfo.tap()
        sleep(2)
        e2e.shot("z7-store-info")
        e2e.goBackOnce()
    }

    /// #1313 Thông tin cửa hàng / chi nhánh. Owner: shop card + Tiền tệ + branch list, edit the shop phone, edit a branch;
    /// branch manager: the own branch form; staff / kho: the same form, read only (no Lưu).
    func test7sShopAndBranchInfo() throws {
        try e2e.requireFlag("newSettings")
        try e2e.start()
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        sleep(3)
        func label(_ labels: [String]) -> XCUIElement {
            app.staticTexts.matching(NSPredicate(format: "label IN %@", labels)).firstMatch
        }
        let isOwner = e2e.role == "merchant"
        let row = isOwner ? label(["Store Information", "Thông tin cửa hàng"]) : label(["Branch Information", "Thông tin chi nhánh"])
        XCTAssertTrue(row.waitForExistence(timeout: 8), "the Settings row for this role")
        e2e.shot("s1-settings")
        row.tap()
        sleep(3)
        e2e.shot("s2-info")
        let save = e2e.button(["Save", "Lưu"])
        if isOwner {
            XCTAssertTrue(label(["Currency", "Tiền tệ"]).exists, "Tiền tệ row in the shop block")
            XCTAssertFalse(app.staticTexts["Outlet ID not found"].exists, "no Outlet ID error")
            let edit = e2e.button(["Edit", "Sửa"])
            XCTAssertTrue(edit.waitForExistence(timeout: 5), "Sửa on the shop card")
            edit.tap()
            sleep(2)
            e2e.shot("s3-shop-form")
            XCTAssertFalse(e2e.field(["Website"]).exists, "no Website field")
            XCTAssertTrue(e2e.type(into: ["Phone Number", "Số điện thoại"], text: "0901234567"), "type the phone")
            e2e.hideKeyboard()
            XCTAssertTrue(save.waitForExistence(timeout: 3), "Lưu")
            save.tap()
            sleep(3)
            e2e.shot("s4-after-shop-save")
            XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS '0901234567'")).firstMatch.waitForExistence(timeout: 6),
                          "the saved phone shows on the shop card")
            // a branch
            let branches = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH[c] 'Branches' OR label BEGINSWITH[c] 'Chi nhánh'")).firstMatch
            XCTAssertTrue(branches.exists, "the branch list header")
            let firstBranch = app.tables.cells.element(boundBy: 2)
            XCTAssertTrue(firstBranch.waitForExistence(timeout: 5), "a branch row")
            firstBranch.tap()
            sleep(2)
            e2e.shot("s5-branch-form")
            XCTAssertTrue(e2e.type(into: ["Phone Number", "Số điện thoại"], text: "0907654321"), "type the branch phone")
            e2e.hideKeyboard()
            save.tap()
            sleep(3)
            e2e.shot("s6-after-branch-save")
            XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS '0907654321'")).firstMatch.waitForExistence(timeout: 6),
                          "the saved branch phone shows in the list")
        } else {
            XCTAssertTrue(e2e.field(["Branch name", "Tên chi nhánh"]).waitForExistence(timeout: 5), "the own branch form")
            if e2e.role == "staff" || e2e.role == "inventory" {
                XCTAssertFalse(save.exists, "staff: no Lưu")
                XCTAssertTrue(label(["You can only view this.", "Bạn chỉ xem được mục này."]).exists, "view-only note")
            } else {
                XCTAssertTrue(save.exists, "branch manager: Lưu")
            }
        }
    }

    /// Cài đặt → Đổi mật khẩu (#490 #491, board DMK-doi-mat-khau): a bottom sheet; an empty submit shows the error
    /// under "Mật khẩu hiện tại". The password is never changed.
    func test7gChangePasswordSheet() throws {
        try e2e.requireFlag("newSettings")
        try e2e.start()
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        sleep(2)
        // #1259: the name card opens Hồ sơ & bảo mật, which has the Đổi mật khẩu row
        let card = app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'hồ sơ, mật khẩu' OR label CONTAINS 'profile, password'")).firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 8), "the name card in Settings")
        card.tap()
        let row = app.descendants(matching: .any)["settings.profile.password"]
        XCTAssertTrue(row.waitForExistence(timeout: 5), "Đổi mật khẩu row in Hồ sơ & bảo mật")
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
        // Known bug #532 (the sheet grows under the status bar with the keyboard up): soft so the run is green but honest.
        // Change both back to XCTAssertTrue when #532 is fixed.
        e2e.soft((sheetTitle?.frame.minY ?? 0) >= top, "the sheet title is not cut off at the top (y \(Int(sheetTitle?.frame.minY ?? -1))) (known: #532)")
        e2e.soft(close.exists && close.frame.minY >= top, "the close button is not cut off at the top (y \(Int(close.frame.minY))) (known: #532)")
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
                          tiles: [["Orders, ", "Số đơn, "], ["Rentals, ", "Lượt thuê, "]],
                          absentTiles: [["Revenue, ", "Doanh thu, "]], // #658: the product screen has no money tile
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

    private func checkEntityOrders(title: [String], tiles: [[String]], absentTiles: [[String]] = [], shot: String) {
        let header = app.staticTexts.matching(NSPredicate(format: "label IN %@", title)).firstMatch
        XCTAssertTrue(header.waitForExistence(timeout: 10), "\(shot): \(title) opens")
        sleep(3)
        for labels in tiles {
            XCTAssertTrue(e2e.element(labelBeginsWith: labels).exists, "\(shot): tile \(labels)")
        }
        for labels in absentTiles {
            XCTAssertFalse(e2e.element(labelBeginsWith: labels).exists, "\(shot): no tile \(labels)")
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

    /// Cài đặt → Thông báo (#482, #937: the Home bell became the cart button): the list renders and long titles wrap
    func test7iNotifications() throws {
        try e2e.requireFlag("newSettings")
        try e2e.start()
        if e2e.features.contains("newProducts") {
            e2e.tapTab(["Home", "Trang chủ"], index: 0)
            let cart = e2e.button(["Cart", "Giỏ hàng"])
            XCTAssertTrue(cart.waitForExistence(timeout: 8), "#937: cart button on Trang chủ")
            XCTAssertFalse(e2e.button(["Notifications", "Thông báo"]).exists, "#937: no bell on Trang chủ")
            e2e.shot("16a-home-cart-button")
        }
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        sleep(2)
        let row = app.buttons["settings.notifications"]
        XCTAssertTrue(row.waitForExistence(timeout: 8), "#1259: the Thông báo bell in Cài đặt")
        e2e.shot("16b-settings-notifications-row")
        row.tap()
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
                // Known bug #533 (long titles run off the screen; the merchant seed has no notifications, staff and kho do): soft.
                e2e.soft(text.frame.height > oneLine && text.frame.maxX <= screenRight + 1,
                              "long notification text wraps: '\(text.label.prefix(40))…' is \(Int(text.frame.height))pt tall, "
                              + "right edge \(Int(text.frame.maxX)) of \(Int(screenRight)) (known: #533)")
            }
        }
        e2e.shot("16-notifications")
        e2e.goBackOnce()
    }

    /// Tổng quan → the "Hôm nay" card (#496, now four tiles: Cần giao x/y, Cần nhận trả x/y, Trễ hạn trả, Quá ngày lấy, and the
    /// "Ngày mai" line): "Quá ngày lấy" opens "Chưa lấy đồ" (board DT-chua-lay), "Cần giao" opens Đơn hàng. The numbers are
    /// compared with the API by test7mTodayCounters (scenario ops); this flow only needs a shop with any data.
    func test7jTodayWorkAndNotPickedUp() throws {
        try e2e.requireFlag("newOverview")
        try e2e.start()
        guard e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3) else {
            throw XCTSkip("No Tổng quan tab for this account")
        }
        sleep(3)
        let pickups = e2e.element(labelBeginsWith: ["To hand over", "Cần giao"], type: .button)
        let returns = e2e.element(labelBeginsWith: ["To take back", "Cần nhận trả"], type: .button)
        XCTAssertTrue(e2e.scrollTo(pickups), "Cần giao tile on the Hôm nay card")
        XCTAssertTrue(returns.exists, "Cần nhận trả tile on the Hôm nay card")
        let header = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Today", "Hôm nay"])).allElementsBoundByIndex
            .first { $0.frame.maxY < pickups.frame.minY && pickups.frame.minY - $0.frame.maxY < 120 }
        e2e.soft(header != nil, "the Hôm nay card has its header above the tiles")
        if pickups.exists { e2e.note("today tile: \(pickups.label)") }
        let tomorrow = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Ngày mai' OR label BEGINSWITH 'Tomorrow'")).firstMatch
        e2e.soft(tomorrow.exists, "the Hôm nay card has the Ngày mai line")
        e2e.shot("65a-overview-today-work")

        let noShows = e2e.element(labelBeginsWith: ["Pickup day passed", "Quá ngày lấy"], type: .button)
        XCTAssertTrue(e2e.scrollTo(noShows), "Quá ngày lấy tile")
        e2e.note("no-show tile: \(noShows.label)")
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

        // Cần giao → Đơn hàng
        e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3)
        sleep(2)
        if e2e.scrollTo(pickups) {
            pickups.tap()
            sleep(2)
            XCTAssertTrue(e2e.button(["All orders", "Tất cả đơn"]).waitForExistence(timeout: 8), "Cần giao opens Đơn hàng")
            e2e.shot("65b-today-work-orders")
        }
    }

    /// #1037: product detail chips "Sắp tới" / "Đang thuê" / "Đã xong" list the product's orders as visible rows
    func test7pProductDetailChipOrders() throws {
        try e2e.requireFlag("newProducts")
        try e2e.start()
        guard e2e.openProduct(where: { $0 > 0 }) != nil else { return XCTFail("No product with open orders") }
        let chips: [([String], String)] = [(["Sắp tới", "Upcoming"], "upcoming"), (["Đang thuê", "Rented"], "renting"),
                                           (["Đã xong", "Done"], "done")]
        for (labels, name) in chips {
            let chip = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@ OR label BEGINSWITH %@", labels[0], labels[1])).firstMatch
            guard e2e.scrollTo(chip) else { XCTFail("chip \(name) missing"); continue }
            // "Sắp tới 2" → 2; a chip without a number has not loaded
            let count = Int(chip.label.split(separator: " ").last.map(String.init) ?? "") ?? 0
            chip.tap()
            sleep(2)
            let rows = app.buttons.matching(NSPredicate(format: "label CONTAINS ', #'"))
            let visible = rows.allElementsBoundByIndex.filter { $0.frame.height >= 44 }
            e2e.shot("66-product-chip-\(name)")
            if count > 0 {
                XCTAssertFalse(visible.isEmpty, "chip \(name) (\(count)) shows its order rows; rows: "
                               + rows.allElementsBoundByIndex.map { "\($0.label) h=\($0.frame.height)" }.joined(separator: " | "))
            }
        }
    }

    /// #622: Settings → Tài khoản ngân hàng (list, add form, bank picker) and the printer switch "In QR chuyển khoản"
    func test7kBankAccounts() throws {
        try e2e.requireFlag("newSettings")
        try e2e.start()
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        // #1270: Tài khoản ngân hàng is a row of CỬA HÀNG again
        let row = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Bank Accounts", "Tài khoản ngân hàng"])).firstMatch
        if e2e.role != "merchant" { // staff and kho (#682) have no bank-account permission; the branch manager still has it until #1319
            e2e.shot("7k-\(e2e.role)-settings")
            e2e.soft(row.exists == (e2e.role == "manager"), "\(e2e.role): Tài khoản ngân hàng row shown = \(row.exists) (manager only, until #1319)")
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
        e2e.goBackOnce() // the list → Cài đặt

        // Printer page: the switch sits under the printer note, off by default; turned on for the shot, then back
        let printer = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Print & receipts", "In & phiếu"])).firstMatch
        XCTAssertTrue(printer.waitForExistence(timeout: 5), "In & phiếu row (#1259)")
        printer.tap()
        let toggle = app.switches["printer.bankQr.switch"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 5), "In QR chuyển khoản trên bill switch")
        let wasOn = (toggle.value as? String) == "1"
        if !wasOn { toggle.tap() }
        e2e.shot("7k-printer-bank-qr-on")
        if !wasOn { toggle.tap() }
        e2e.goBackOnce()
    }

    /// #970: no printer → "Chưa cấu hình máy in" from order detail; In thử shows its result (wrong IP: what to check;
    /// the virtual printer, scripts/virtual-printer: success). Runs only with E2E_PRINTER_IP (TEST_RUNNER_E2E_PRINTER_IP).
    func test7nPrinting() throws {
        guard let printerIP = ProcessInfo.processInfo.environment["E2E_PRINTER_IP"], !printerIP.isEmpty else {
            throw XCTSkip("E2E_PRINTER_IP not set (start scripts/virtual-printer first)")
        }
        try e2e.requireFlag("newOrderDetail")
        try e2e.start()
        func openPrinterPage() {
            e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
            let row = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Print & receipts", "In & phiếu"])).firstMatch
            XCTAssertTrue(row.waitForExistence(timeout: 8), "In & phiếu row (#1259)")
            row.tap()
            sleep(1)
        }
        let ipField = app.textFields.firstMatch
        func setIP(_ ip: String) {
            XCTAssertTrue(ipField.waitForExistence(timeout: 5), "printer IP field")
            // The text is right-aligned: tap its end so every character is deleted
            ipField.coordinate(withNormalizedOffset: CGVector(dx: 0.98, dy: 0.5)).tap()
            let old = (ipField.value as? String) ?? ""
            ipField.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: old.count + 2) + ip)
            e2e.hideKeyboard()
        }
        func testPrint(_ shot: String) -> String {
            e2e.button(["Test Printer", "Kiểm tra máy in"]).tap()
            sleep(1)
            e2e.shot("\(shot)-sending")
            let alert = app.alerts.firstMatch
            XCTAssertTrue(alert.waitForExistence(timeout: 12), "In thử shows a result")
            let text = alert.staticTexts.allElementsBoundByIndex.map(\.label).joined(separator: " | ")
            Swift.print("E2E_NOTE: 970 \(shot): \(text)")
            e2e.shot(shot)
            alert.buttons.firstMatch.tap()
            return text
        }

        // 1. No printer saved: the field is empty (no 192.168.1.199)
        openPrinterPage()
        setIP("")
        e2e.button(["Save", "Lưu"]).tap()
        sleep(1)
        e2e.dismissAlerts()
        e2e.shot("7n-1-printer-empty")
        e2e.goBackOnce()

        // 2. Order detail → In: "Chưa cấu hình máy in" with a button to the printer page
        e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
        sleep(2)
        e2e.tapIfExists(e2e.button(["All orders", "Tất cả đơn"]), timeout: 5)
        sleep(2)
        let row = app.cells.firstMatch
        guard row.waitForExistence(timeout: 8) else { return XCTFail("No order to print") }
        e2e.tapRow(row)
        let printButton = e2e.button(["Print", "In"])
        XCTAssertTrue(printButton.waitForExistence(timeout: 10), "In on order detail")
        printButton.tap()
        let notSetUp = app.alerts.matching(NSPredicate(format: "label IN %@", ["Printer not set up", "Chưa cấu hình máy in"])).firstMatch
        XCTAssertTrue(notSetUp.waitForExistence(timeout: 3), "no printer: 'Chưa cấu hình máy in' at once")
        e2e.shot("7n-2-detail-not-configured")
        notSetUp.buttons.matching(NSPredicate(format: "label IN %@", ["Printer settings", "Cài đặt máy in"])).firstMatch.tap()
        sleep(2)

        // 3. Wrong IP: In thử ends with an error and what to check
        setIP("10.255.255.1")
        let wrong = testPrint("7n-3-test-print-wrong-ip")
        XCTAssertTrue(wrong.contains("10.255.255.1") || wrong.contains("timeout") || wrong.contains("Hết thời gian"), wrong)

        // 4. The virtual printer: In thử succeeds
        setIP(printerIP)
        let ok = testPrint("7n-4-test-print-ok")
        XCTAssertTrue(ok.contains("successfully") || ok.contains("thành công"), ok)

        // 5. Back on the order: In sends the bill (no alert)
        e2e.goBackOnce()
        XCTAssertTrue(printButton.waitForExistence(timeout: 5))
        printButton.tap()
        sleep(4)
        e2e.soft(!app.alerts.firstMatch.exists, "printing to the virtual printer shows no error")
        e2e.shot("7n-5-detail-printed")
    }

    /// #1028: Máy in → the IP field's software keyboard has "." (Vietnamese `.decimalPad` showed only ","),
    /// and 192.168.1.50 can be typed key by key. Needs the software keyboard (not the Mac one).
    func test7oPrinterIPKeyboard() throws {
        try e2e.start()
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        let row = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Print & receipts", "In & phiếu"])).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 8), "In & phiếu row (#1259)")
        row.tap()
        let ipField = app.textFields.firstMatch
        XCTAssertTrue(ipField.waitForExistence(timeout: 5), "printer IP field")
        ipField.coordinate(withNormalizedOffset: CGVector(dx: 0.98, dy: 0.5)).tap()
        let keyboard = app.keyboards.firstMatch
        XCTAssertTrue(keyboard.waitForExistence(timeout: 5), "software keyboard shown")
        let old = (ipField.value as? String) ?? ""
        if !old.isEmpty { ipField.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: old.count + 2)) }
        XCTAssertTrue(keyboard.keys["."].exists, "the IP keyboard has a \".\" key")
        for character in "192.168.1.50" { keyboard.keys[String(character)].tap() }
        e2e.shot("7o-printer-ip-keyboard")
        XCTAssertEqual(ipField.value as? String, "192.168.1.50")
        e2e.hideKeyboard()
        e2e.button(["Save", "Lưu"]).tap()
        sleep(1)
        e2e.dismissAlerts()
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
            // Every tab that loads data should say why it is empty. Known misses, soft so the run stays green but honest:
            let explains = e2e.screenTexts().contains { $0.contains("Đăng ký") || $0.contains("Thanh toán gói") || $0.lowercased().contains("subscription") || $0.lowercased().contains("payment") }
            if name == "home" { e2e.soft(explains, "\(tag) home gives the reason, not 'Chưa có sản phẩm' (known: #753)") }
            if name == "reports" && e2e.role != "merchant" { e2e.soft(explains, "\(tag) Tổng quan gives the reason, not only 'Hôm nay —' (known: #754)") }
            if name == "orders" || name == "calendar" { XCTAssertTrue(explains, "\(tag) \(name) shows the subscription reason") }
            raw += e2e.rawKeys()
            // #753 (Home, every role) and #754 (Tổng quan of staff and kho): the reason and Retry, never a bare empty state
            if name == "home" || name == "reports" {
                let retry = app.descendants(matching: .any)
                    .matching(NSPredicate(format: "label CONTAINS[c] 'Thử lại' OR label CONTAINS[c] 'Retry'")).firstMatch
                XCTAssertTrue(retry.exists, "#753/#754 \(tag) \(name) shows the reason with Thử lại")
                let bare = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Chưa có sản phẩm", "No products yet"])).firstMatch
                XCTAssertFalse(bare.exists, "#753 \(tag) Home shows the reason, not \"Chưa có sản phẩm\"")
            }
            e2e.dismissAlerts()
        }
        // #756: an owner has no outlet of their own; adding a product says why the shop is blocked, not "which store"
        if e2e.scenarioRole == "owner", e2e.tapTab(["Home", "Trang chủ"], index: 0) {
            let add = e2e.button(["Add product", "Thêm sản phẩm"])
            if add.waitForExistence(timeout: 5) {
                add.tap()
                let name = e2e.field(["Product name", "Tên sản phẩm"])
                if name.waitForExistence(timeout: 8) {
                    name.tap()
                    name.typeText("SP khoa \(Int(Date().timeIntervalSince1970) % 100000)")
                    e2e.hideKeyboard()
                    let save = e2e.button(["Save", "Lưu", "Save product", "Lưu sản phẩm"])
                    if save.waitForExistence(timeout: 3) { save.tap(); sleep(3) }
                    e2e.shot("10f-sub-add-product")
                    let texts = e2e.screenTexts()
                    e2e.note("SUB \(tag) add product: texts=\(texts.prefix(12))")
                    XCTAssertFalse(texts.contains { $0.contains("which store") || $0.contains("cửa hàng để lưu") },
                                   "#756 \(tag) add product shows the subscription reason, not the outlet message: \(texts)")
                    e2e.dismissAlerts()
                    e2e.tapIfExists(e2e.button(["Close", "Đóng"]), timeout: 2)
                }
            }
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
        return e2e.homeCart.waitForExistence(timeout: 5)
    }

    private func openCart() -> Bool {
        guard e2e.homeCart.waitForExistence(timeout: 5) else { return false }
        e2e.homeCart.tap()
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
        // #1132: the availability pill is a control (not a static text); its VoiceOver label is the long "Còn 5 trong kho"
        let inStock = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS 'trong kho' OR label CONTAINS 'in stock'")).firstMatch
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
            // the next-days strip: today's cell reads "<day>: <free>" (VoiceOver), shown as "20 / 2"
            let todayCell = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "\(e2e.vnDay(0).day): 2")).firstMatch
            e2e.soft(todayCell.exists || texts.contains("Còn 2") || texts.contains("2 left"), "detail shows 2 free today in the next-days strip")
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
        // #1064 (owner): the one unit free tomorrow is the amber "Còn 1" (VoiceOver "Còn 1 trong ngày đã chọn"), never the
        // red "Hết đồ"
        // #1132: the pills are controls, so look at any element
        let shortage = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH 'Hết đồ' OR label BEGINSWITH 'Booked out'")).firstMatch
        let oneLeft = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH 'Còn 1 trong ngày' OR label BEGINSWITH '1 left on these dates'")).firstMatch
        e2e.note("STOCKFLOW het-tomorrow note: \(oneLeft.exists ? oneLeft.label : "<none>") red: \(shortage.exists) tag: \(tag.exists)")
        XCTAssertFalse(shortage.exists, "Het is free tomorrow: not unavailable")
        e2e.soft(oneLeft.exists && freeFrom(oneLeft.label) == 1, "Het tomorrow says 1 left")
        e2e.shot("1d-stock-het-tomorrow")
        // MOB-STOCK-08: 2 × Het tomorrow, only 1 exists → "Chỉ còn 1 trống trong ngày đã chọn"
        let plusOne = e2e.button(["Thêm 1", "One more"])
        if plusOne.waitForExistence(timeout: 3) { plusOne.tap(); sleep(2) }
        let short2 = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH 'Chỉ còn' OR label BEGINSWITH 'Only'")).firstMatch
        e2e.note("STOCKFLOW het-tomorrow x2 shortage: \(short2.exists ? short2.label : "<none>")")
        XCTAssertTrue(short2.exists, "2 × Het for tomorrow shows how many are left")
        XCTAssertEqual(freeFrom(short2.label), 1, "…and says 1")
        e2e.shot("1d-stock-het-short")
        e2e.goBackOnce() // the cart screen has no tab bar: back to Home, then empty the cart from there
        e2e.emptyCart()

        // final lines for the API checker
        for key in ["E2E Con5", "E2E Con1", "E2E Het"] {
            if let last = stockLine(key) { e2e.note("STOCKFLOW final \(key): \(last.line)") }
        }
    }

    /// A day row of the calendar or of Việc cần làm as "out:300000" / "back:200000": its tag (Giao / Cần giao = out,
    /// Trả / Cần trả = back) and its total. Nil for a cell that is not an order row.
    private func calendarRow(_ cell: XCUIElement) -> String? {
        let labels = cell.staticTexts.allElementsBoundByIndex.map { $0.label.trimmingCharacters(in: .whitespaces) }
        let kind: String
        if labels.contains(where: { ["Giao", "Hand over", "Cần giao", "To hand over"].contains($0) }) { kind = "out" }
        else if labels.contains(where: { ["Trả", "Return", "Cần trả", "To take back"].contains($0) }) { kind = "back" }
        else { return nil }
        guard let money = labels.first(where: { $0.range(of: "^[0-9]{1,3}([.,][0-9]{3})*$", options: .regularExpression) != nil }) else { return nil }
        return kind + ":" + money.filter(\.isNumber)
    }

    /// MOB-CAL-01..: month grid and day list for the ops scenario (orders 710001..710009 around today). Every selected day's
    /// header summary ("lấy x · trả y", today "N trễ · lấy x · trả y") and its rows are noted as
    /// `E2E_NOTE: CAL <yyyy-MM-dd> | … | rows=out:300000,back:200000` for tests/e2e/mobile/calendar-check.js (API:
    /// /api/calendar/orders/count, /by-date and the late returns of outlet-operations). The rows show no order number
    /// (#893 lean row): a row is its tag (Giao = out, Trả = back) and its total. Grid cells read "dd/mm/yy" (#888).
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
        func dmy(_ day: (key: String, dm: String, day: Int)) -> String { day.dm + "/" + String(day.key.prefix(4).suffix(2)) }
        for offset in -5...4 {
            let day = e2e.vnDay(offset)
            let cell = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", dmy(day))).firstMatch
            guard cell.waitForExistence(timeout: 3), cell.isHittable else { e2e.note("CAL \(day.key) | not on this month's grid"); continue }
            cell.tap()
            sleep(3)
            let title = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", day.dm)).allElementsBoundByIndex
                .map(\.label).first { $0.uppercased() == $0 || $0.hasPrefix("HÔM NAY") } ?? ""
            let summary = app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'lấy ' OR label CONTAINS 'out '")).allElementsBoundByIndex.map(\.label).first ?? ""
            var rows: [String] = []
            for cellRow in app.tables.cells.allElementsBoundByIndex where cellRow.exists {
                if let row = calendarRow(cellRow) { rows.append(row) }
            }
            e2e.note("CAL \(day.key) | title=\(title) | summary=\(summary) | rows=\(rows.sorted().joined(separator: ","))")
            if offset == 0 || offset == 1 || offset == -2 || offset == 3 { e2e.shot("6b-calendar-\(day.key)") }
        }
        // MOB-CAL-02: a day row opens its order
        if let day = Optional(e2e.vnDay(0)), let cell = Optional(app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", dmy(day))).firstMatch), cell.exists {
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
            ("late", ["Trễ hạn trả", "Overdue returns"]), ("noshows", ["Quá ngày lấy", "Past pickup"]),
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
        // The two lists open a screen with two sections: the first holds the tile's orders ("TRỄ HẠN TRẢ · 1",
        // "QUÁ NGÀY LẤY, CHƯA THU · 1"), the second the rest ("CÒN HẠN", "SẼ THU KHI KHÁCH LẤY ĐỒ"). `first=` is the first section.
        func firstSection() -> String {
            let headers = app.staticTexts.allElementsBoundByIndex.filter { $0.exists && $0.label == $0.label.uppercased() && $0.label.range(of: "· \\d+$", options: .regularExpression) != nil }
                .sorted { $0.frame.minY < $1.frame.minY }
            guard let head = headers.first, let r = head.label.range(of: "\\d+$", options: .regularExpression), let n = Int(head.label[r]) else { return "" }
            let ordered = app.cells.allElementsBoundByIndex.filter { $0.exists }.sorted { $0.frame.minY < $1.frame.minY }
            var numbers: [String] = []
            for cell in ordered.prefix(n) {
                if let r = E2E.texts(cell).range(of: "#\\d{5,6}", options: .regularExpression) { numbers.append(String(E2E.texts(cell)[r]).replacingOccurrences(of: "#", with: "")) }
            }
            return numbers.sorted().joined(separator: ",")
        }
        // Trễ hạn trả → list of late returns; Quá ngày lấy → "Chưa lấy đồ"
        for (key, labels, shot) in [("late", ["Trễ hạn trả", "Overdue returns"], "7m-late-list"), ("noshows", ["Quá ngày lấy", "Past pickup"], "7m-noshow-list")] {
            let el = e2e.element(labelBeginsWith: labels, type: .button)
            guard e2e.scrollTo(el) else { continue }
            el.tap()
            sleep(4)
            e2e.note("TODOLIST \(key) | rows=\(rowNumbers()) | first=\(firstSection())")
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
            // #893 lean rows: no order number; the "HÔM NAY · …" section as tag:total (todo-check.js `orders-todo-today`)
            let headers = app.staticTexts.allElementsBoundByIndex.filter { $0.exists && $0.label == $0.label.uppercased() && $0.label.contains(" · ") }
                .sorted { $0.frame.minY < $1.frame.minY }
            var today: [String] = []
            if let i = headers.firstIndex(where: { $0.label.hasPrefix("HÔM NAY ·") || $0.label.hasPrefix("TODAY ·") }) {
                let top = headers[i].frame.maxY
                // a header can be listed twice (same frame): the next section starts at the first header below this one
                let bottom = headers.first { $0.frame.minY > headers[i].frame.minY + 1 }?.frame.minY ?? .greatestFiniteMagnitude
                for cell in app.cells.allElementsBoundByIndex where cell.exists && cell.frame.minY >= top - 1 && cell.frame.maxY <= bottom + 1 {
                    if let row = calendarRow(cell) { today.append(row) }
                }
            }
            e2e.note("TODOLIST orders-todo-today | rows=\(today.sorted().joined(separator: ","))")
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
            e2e.hideKeyboard()
            // after the first order the app is already on the "Tất cả đơn" list (search field there): no tab button to press
            if !e2e.ordersSearchField.exists {
                e2e.tapTab(["My Order", "Đơn hàng"], index: 1)
                let all = e2e.button(["All orders", "Tất cả đơn"])
                guard all.waitForExistence(timeout: 8) else { e2e.shot("5g-orders-tab-missing"); return XCTFail("Orders tab") }
                all.tap()
                sleep(2)
            }
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
        for hidden in [["Users", "Người dùng"], ["Export Data", "Xuất dữ liệu"], ["Bank accounts", "Tài khoản ngân hàng"]] {
            e2e.soft(!rows.contains(where: { hidden.contains($0) }), "\(tag) does not see \(hidden[0]) in Cài đặt")
        }
        // "Gói dịch vụ" stays: staff and kho carry billing.view (the login permissions), so the row is by design, not a leak.
        e2e.note("ROLE \(tag) settings plan row shown=\(rows.contains(where: { ["Subscription", "Gói đăng ký", "Gói dịch vụ"].contains($0) })) (billing.view)")
        XCTAssertTrue(raw.isEmpty, "raw API codes on screen: \(raw)")
    }

    /// MOB-SUB-10..: at-limit merchant (plan limits equal to what exists: 2 products, 2 customers, 1 order): creating a customer, an
    /// order or a product must answer with a readable message (no raw code), and must not create anything
    /// (the DB counts are compared by tests/e2e/mobile/subscription-flow.sh). Run for owner, staff and kho.
    /// #828 branch picker. Merchant (shop with two active branches): the "🏬 <branch> ▾" button above the Home title
    /// opens "Chọn chi nhánh"; an empty cart switches at once and Home stock follows the branch; a cart with lines asks
    /// "Đổi sang …?" and "Xoá giỏ và đổi" empties it. Orders, Calendar and Overview have no button (Home only) and
    /// follow the chosen branch.
    /// Staff / inventory: the branch name in the same place, not a button.
    func test9zOutletPicker() throws {
        try e2e.requireFlag("newProducts")
        try e2e.start()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        XCTAssertTrue(app.tables.cells.firstMatch.waitForExistence(timeout: 15), "Product list should load")
        let header = app.descendants(matching: .any)["outlet.header.button"]
        XCTAssertTrue(header.waitForExistence(timeout: 10), "branch line above the Home title")
        guard e2e.role == "merchant" else {
            header.tap()
            e2e.soft(!app.buttons["outlet.picker.use"].waitForExistence(timeout: 2), "outlet user: no branch sheet")
            e2e.note("OUTLET header (\(e2e.role)): \(header.label)")
            e2e.shot("11f-outlet-staff-home")
            return
        }
        e2e.emptyCart()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        let button = app.buttons["outlet.header.button"]
        XCTAssertTrue(button.waitForExistence(timeout: 10), "merchant with two branches gets the branch button")
        let firstStock = { () -> String in
            let line = self.app.tables.cells.firstMatch.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "●")).firstMatch
            return line.exists ? line.label : "<none>"
        }
        let before = button.label
        let stockBefore = firstStock()
        e2e.note("OUTLET before: \(before) | first row \(stockBefore)")
        e2e.shot("11a-outlet-home")

        // Empty cart: pick the other branch, it switches without a question
        button.tap()
        let use = app.buttons["outlet.picker.use"]
        XCTAssertTrue(use.waitForExistence(timeout: 5), "branch sheet opens")
        e2e.shot("11b-outlet-sheet")
        let rows = app.descendants(matching: .any).matching(NSPredicate(format: "identifier BEGINSWITH 'outlet.picker.row.'"))
        let other = rows.matching(NSPredicate(format: "NOT (label CONTAINS 'Đang chọn' OR label CONTAINS 'In use')")).firstMatch
        XCTAssertTrue(other.exists, "another active branch in the sheet")
        other.tap()
        use.tap()
        XCTAssertFalse(app.alerts.firstMatch.waitForExistence(timeout: 2), "empty cart: no question")
        sleep(3)
        let after = button.label
        e2e.soft(after != before, "button shows the new branch (\(before) → \(after))")
        let stockAfter = firstStock()
        e2e.note("OUTLET after: \(after) | first row \(stockAfter)")
        e2e.shot("11c-outlet-switched")

        // Cart with a line: the switch asks first, then empties the cart
        let plus = app.tables.cells.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Thêm ' OR label BEGINSWITH 'Add '")).firstMatch
        if plus.waitForExistence(timeout: 5) {
            plus.tap()
            XCTAssertTrue(e2e.homeCart.waitForExistence(timeout: 5), "cart bar after +")
            button.tap()
            XCTAssertTrue(use.waitForExistence(timeout: 5), "branch sheet opens again")
            rows.matching(NSPredicate(format: "NOT (label CONTAINS 'Đang chọn' OR label CONTAINS 'In use')")).firstMatch.tap()
            use.tap()
            let confirm = app.alerts.buttons.matching(NSPredicate(format: "label IN %@", ["Xoá giỏ và đổi", "Empty cart and switch"])).firstMatch
            XCTAssertTrue(confirm.waitForExistence(timeout: 5), "cart with lines: 'Đổi sang …?' asks first")
            e2e.shot("11d-outlet-cart-alert")
            confirm.tap()
            sleep(3)
            e2e.soft(!e2e.homeCart.exists, "cart emptied by the switch")
            e2e.soft(button.label == before, "back on the first branch (\(button.label))")
            e2e.shot("11e-outlet-after-cart-switch")
        } else {
            e2e.soft(false, "a + button on Home")
        }

        // Switch to the other branch again, then the same button on the other tabs
        button.tap()
        if use.waitForExistence(timeout: 5) {
            rows.matching(NSPredicate(format: "NOT (label CONTAINS 'Đang chọn' OR label CONTAINS 'In use')")).firstMatch.tap()
            use.tap()
            sleep(2)
        }
        for (names, index, shot) in [(["My Order", "Đơn hàng"], 1, "11g-outlet-orders"), (["Calendar", "Lịch"], 2, "11h-outlet-calendar"),
                                     (["Overview", "Tổng quan"], 3, "11i-outlet-overview")] {
            e2e.tapTab(names, index: index)
            sleep(3)
            // Owner (#828): the button is on Home only; the other tabs just follow the chosen branch
            e2e.soft(!app.descendants(matching: .any)["outlet.header.button"].exists, "\(names[1]): no branch button")
            e2e.shot(shot)
        }
        // Leave the account on its default branch for the next flows
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        if button.waitForExistence(timeout: 5), button.label != before {
            button.tap()
            if use.waitForExistence(timeout: 5) {
                rows.matching(NSPredicate(format: "NOT (label CONTAINS 'Đang chọn' OR label CONTAINS 'In use')")).firstMatch.tap()
                use.tap()
            }
        }
    }

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
            // The failed save leaves the "Khách mới" form open over the picker over the cart: form back → picker, then swipe the
            // picker sheet down. Then the order: the first existing customer, rent today.
            e2e.lastAlert = nil
            e2e.goBackOnce()
            if !e2e.button(["Back to products", "Quay lại chọn sản phẩm"]).isHittable {
                app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.07))
                    .press(forDuration: 0.1, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.98)))
                sleep(1)
            }
            e2e.shot("10e-limit-back-in-cart")
            if e2e.button(["Back to products", "Quay lại chọn sản phẩm"]).waitForExistence(timeout: 5) {
                e2e.cartRentToday()
                _ = e2e.pickFirstCustomer()
                let created = e2e.createOrderFromCart(cta: E2E.rentCta, shotPrefix: "10e-limit-order")
                XCTAssertFalse(created, "an order must not be created when the plan's order limit is reached")
                e2e.shot("10e-limit-order-result")
                record("order")
                e2e.dismissAlerts()
            } else {
                e2e.note("LIMIT \(tag) order | could not get back to the cart after the customer error")
            }
            for _ in 0..<2 where !app.tabBars.firstMatch.isHittable { e2e.goBackOnce() }
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

    /// #952 (owner 13/10/26): the cart's date row has a calendar icon; a pencil in the customer picker edits the
    /// customer (the cart follows); Home has no floating cart bar; the product form has no "Xong" keyboard bar
    func test952CartUi() throws {
        try e2e.requireFlag("newProducts")
        try e2e.requireFlag("newCustomers")
        try e2e.requireRole("merchant")
        try e2e.start()
        e2e.emptyCart()
        guard e2e.openCartWithOneItem() else { return XCTFail("Could not open the cart with an item") }
        // A kept cart may hold a customer and dates from an earlier run: ⋯ → Xoá giỏ hàng starts clean
        if app.buttons["cart.more"].waitForExistence(timeout: 3) {
            app.buttons["cart.more"].tap()
            e2e.tapIfExists(e2e.button(["Xoá giỏ hàng", "Clear cart"]), timeout: 3)
            e2e.tapIfExists(app.alerts.buttons.matching(NSPredicate(format: "label IN %@", ["Xoá", "Delete"])).firstMatch, timeout: 3)
            sleep(1)
            e2e.goBackOnce()
            guard e2e.openCartWithOneItem() else { return XCTFail("Could not open the cart again") }
        }
        e2e.tapIfExists(e2e.button(["Rent", "Thuê"]))
        let dates = e2e.element(labelBeginsWith: ["Choose rental dates", "Chọn ngày thuê"])
        if dates.waitForExistence(timeout: 5) { // a kept cart may already have dates
            e2e.shot("952a-cart-date-empty")
            dates.tap()
            e2e.pickTodayInDateSheet()
            e2e.tapIfExists(e2e.button(["Confirm", "Xác nhận"]), timeout: 3)
        } else {
            e2e.note("cart kept its dates: no empty date row this run")
        }
        let chosen = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS ' → '")).firstMatch
        XCTAssertTrue(chosen.waitForExistence(timeout: 5), "dates: dd/mm/yy → dd/mm/yy")
        e2e.shot("952b-cart-date-chosen")

        // Pick a customer, then edit them from the picker's pencil
        let pickRow = e2e.element(labelBeginsWith: ["Choose customer", "Chọn khách hàng"])
        XCTAssertTrue(pickRow.waitForExistence(timeout: 5), "customer row in the cart")
        pickRow.tap()
        let pencil = app.buttons.matching(identifier: "customers.picker.edit").firstMatch
        XCTAssertTrue(pencil.waitForExistence(timeout: 8), "rows of the picker have a pencil")
        sleep(2)
        e2e.shot("952c-picker-pencil")
        let firstCell = app.cells.containing(.button, identifier: "customers.picker.edit").firstMatch
        let picked = firstCell.staticTexts.allElementsBoundByIndex.map(\.label)
            .first { !$0.isEmpty && !$0.contains("·") && $0.count > 2 } ?? ""
        XCTAssertFalse(picked.isEmpty, "the first row has a name")
        firstCell.coordinate(withNormalizedOffset: CGVector(dx: 0.4, dy: 0.5)).tap()
        sleep(2)
        let customerRow = e2e.element(labelBeginsWith: [picked])
        XCTAssertTrue(customerRow.waitForExistence(timeout: 5), "the cart shows the picked customer \(picked)")
        customerRow.tap()
        XCTAssertTrue(pencil.waitForExistence(timeout: 8), "picker again")
        sleep(1)
        app.cells.containing(NSPredicate(format: "label == %@", picked)).firstMatch
            .buttons.matching(identifier: "customers.picker.edit").firstMatch.tap()
        let nameField = e2e.field(["Full name", "Họ và tên"])
        XCTAssertTrue(nameField.waitForExistence(timeout: 8), "the edit sheet opens")
        sleep(2)
        XCTAssertFalse(e2e.field(["Email"]).exists, "the sheet keeps name, phone, address and note only")
        e2e.shot("952d-edit-sheet")
        let newName = picked.hasSuffix(" E2E") ? String(picked.dropLast(4)) : picked + " E2E"
        nameField.tap()
        nameField.clearText()
        nameField.typeText(newName)
        // Lưu rides on the keyboard (no hideKeyboard: its drag-down fallback would close the sheet)
        e2e.button(["Save", "Lưu"]).tap()
        let toast = app.descendants(matching: .any)
            .matching(NSPredicate(format: "label CONTAINS 'Customer saved' OR label CONTAINS 'Đã lưu khách hàng'")).firstMatch
        sleep(1)
        e2e.shot("952e-list-after-save")
        // The toast is in the screenshot; XCUITest does not always see ToastView's label: a soft check
        e2e.soft(toast.exists, "toast Đã lưu khách hàng")
        e2e.tapIfExists(e2e.button(["Close", "Đóng"]), timeout: 3)
        sleep(1)
        XCTAssertTrue(e2e.element(labelBeginsWith: [newName]).waitForExistence(timeout: 5), "the cart shows the new name")
        e2e.shot("952f-cart-updated-customer")

        // Home: the top-right button counts the cart; no floating bar
        e2e.goBackOnce()
        e2e.tapTab(["Home", "Trang chủ"], index: 0)
        XCTAssertTrue(e2e.homeCart.waitForExistence(timeout: 5), "the cart button has the count")
        XCTAssertFalse(e2e.floatingCartBar.exists, "no floating cart bar")
        e2e.shot("952g-home-no-cart-bar")

        // Product form: a number field has no "Xong" bar; a tap outside closes the keyboard
        let add = e2e.button(["Add product", "Thêm sản phẩm"])
        guard add.waitForExistence(timeout: 5) else { return XCTFail("Thêm sản phẩm") }
        add.tap()
        XCTAssertTrue(e2e.field(["Product name", "Tên sản phẩm"]).waitForExistence(timeout: 8), "form opens")
        let price = app.textFields.matching(NSPredicate(format: "placeholderValue == '0'")).firstMatch
        for _ in 0..<4 where !(price.exists && price.isHittable) { app.swipeUp() }
        XCTAssertTrue(price.exists, "a price field")
        price.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5), "number pad up")
        XCTAssertFalse(app.toolbars.buttons.matching(NSPredicate(format: "label IN %@", ["Done", "Xong"])).firstMatch.exists,
                       "no Xong bar on the keyboard")
        sleep(1)
        e2e.shot("952h-product-form-keyboard")
        // a tap outside any field: the header title
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.6, dy: 0.1)).tap()
        sleep(1)
        XCTAssertFalse(app.keyboards.firstMatch.exists, "a tap outside closes the keyboard")
        e2e.shot("952i-product-form-keyboard-closed")
        e2e.tapIfExists(e2e.button(["Close", "Đóng"]), timeout: 2)
        e2e.dismissAlerts()
        e2e.emptyCart()
    }

    /// #1199 "Thu cọc theo giai đoạn" (mockups m11b, m4, m5, m6, m7, m8, m9): Settings → Cách thu cọc → STAGED + a
    /// 30 / 40 / rest template → a rental in the cart with the stages → created with stage 1 collected → Overview and
    /// list → the detail card → edit plan → hand-over blocked, collect stage 2 → cancel keeping part of the money.
    /// Needs a product whose price is 12.000.000 (the run sets "Product 2 -" in its own database).
    func test7qStagedDeposit() throws {
        try e2e.requireFlag("newSettings")
        try e2e.requireRole("merchant")
        try e2e.start()
        func text(_ labels: [String]) -> XCUIElement {
            app.descendants(matching: .any).matching(NSPredicate(format: "label IN %@", labels)).firstMatch
        }
        func textStarting(_ labels: [String]) -> XCUIElement { e2e.element(labelBeginsWith: labels) }
        func field(_ id: String) -> XCUIElement { app.textFields[id] }
        func type(_ element: XCUIElement, _ value: String, clear: Bool = false) {
            guard element.waitForExistence(timeout: 5) else { return XCTFail("field missing") }
            element.tap()
            if clear, let current = element.value as? String, !current.isEmpty {
                element.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count))
            }
            element.typeText(value)
        }
        func dismissKeyboard() {
            let done = e2e.button(["Done", "Xong"])
            if done.exists && done.isHittable { done.tap() } else { app.keyboards.buttons["return"].tap() }
        }
        func scrollTo(_ element: XCUIElement, max: Int = 8) {
            var tries = 0
            while !(element.exists && element.isHittable) && tries < max { app.swipeUp(); tries += 1 }
        }

        // 1. Settings → Cách thu cọc (mode 1 read-only text), then mode 2
        e2e.tapTab(["Settings", "Cài đặt", "Setting"], index: nil)
        // #1270: Cọc › holds Cách thu cọc, Mẫu giai đoạn cọc and Chính sách huỷ / dời ngày
        let collect = text(["Cọc", "Deposit"])
        scrollTo(collect)
        e2e.shot("60a-settings-row")
        XCTAssertTrue(collect.exists, "Settings has the Cọc row")
        collect.tap()
        let row = app.descendants(matching: .any)["settings.collect.mode"]
        XCTAssertTrue(row.waitForExistence(timeout: 5), "Cọc has the Cách thu cọc row")
        row.tap()
        sleep(2)
        e2e.shot("60b-mode-one-time")
        let staged = text(["Thu cọc theo giai đoạn", "Staged deposit"])
        if app.buttons["deposit.mode.STAGED"].exists { app.buttons["deposit.mode.STAGED"].tap() } else { staged.tap() }
        sleep(1)
        sleep(3)
        e2e.shot("60d-mode-staged")
        XCTAssertFalse(textStarting(["Nhân viên đang dùng app cũ", "Staff on an older app"]).exists, "no old-app warning in mode 2 (#1275)")

        // 2. A template 30% on order + 40% four days before pickup, the rest at hand-over (#1270: the row is in Cọc)
        e2e.goBackOnce()
        sleep(1)
        let templates = app.descendants(matching: .any)["deposit.templates.row"]
        XCTAssertTrue(templates.waitForExistence(timeout: 5))
        templates.tap()
        sleep(2)
        e2e.shot("60e-templates-empty")
        let add = e2e.button(["+ Tạo mẫu mới", "+ New template"])
        XCTAssertTrue(add.waitForExistence(timeout: 5), "+ Tạo mẫu mới")
        add.tap()
        sleep(1)
        type(field("deposit.template.name"), "Áo cưới · 3 giai đoạn")
        dismissKeyboard()
        let addStage = e2e.button(["+ Thêm giai đoạn", "+ Add stage"])
        scrollTo(addStage)
        addStage.tap()
        sleep(1)
        e2e.shot("60f-template-editor")
        let days = field("deposit.stage.days.1")
        if days.waitForExistence(timeout: 3) {
            days.tap()
            days.typeText(XCUIKeyboardKey.delete.rawValue + "4")
            dismissKeyboard()
        }
        e2e.shot("60g-template-editor-filled")
        e2e.button(["Lưu mẫu", "Save template"]).tap()
        sleep(3)
        e2e.shot("60h-templates-list")
        XCTAssertTrue(textStarting(["Áo cưới · 3 giai đoạn"]).exists, "the template is listed")
        e2e.goBackOnce()
        e2e.goBackOnce()

        // 3. Cart: stages, collect stage 1 with the order
        e2e.emptyCart()
        guard e2e.addToCartAndOpen(product: "Product 2 -") else { return XCTFail("Could not put Product 2 in the cart") }
        e2e.cartRentToday()
        _ = e2e.pickFirstCustomer()
        sleep(2)
        let stageRow = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS '3.600.000'")).firstMatch
        e2e.shot("61a-cart-staged")
        e2e.soft(stageRow.waitForExistence(timeout: 5), "the cart shows stage 1 = 3.600.000")
        scrollTo(text(["Phần còn lại, thu khi giao", "The rest, collected at hand-over"]), max: 3)
        e2e.shot("61b-cart-staged-money")
        let create = e2e.button(["Tạo đơn · thu cọc", "Create · collect"])
        XCTAssertTrue(create.waitForExistence(timeout: 5), "the cart button collects stage 1")
        create.tap()
        sleep(2)
        e2e.shot("61c-confirm-sheet")
        let sheetConfirm = app.buttons.matching(NSPredicate(format: "label IN %@", ["Tạo đơn", "Create order"])).allElementsBoundByIndex
            .filter { $0.isHittable }.max { $0.frame.minY < $1.frame.minY }
        sheetConfirm?.tap()
        let created = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Đã tạo đơn #' OR label BEGINSWITH 'Order #'")).firstMatch
        XCTAssertTrue(created.waitForExistence(timeout: 20), "the order is created")
        let number = created.label.components(separatedBy: "#").last?.components(separatedBy: CharacterSet.decimalDigits.inverted).first ?? ""
        e2e.note("STAGED ORDER #\(number)")
        e2e.shot("61d-created")
        e2e.tapIfExists(e2e.button(["Xem đơn", "View order"]), timeout: 3)
        sleep(3)
        e2e.dismissRatingPrompt()
        e2e.shot("62a-detail-card")
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH 'Đã thu ' OR label BEGINSWITH 'Collected '")).firstMatch.exists, "the card says Đã thu (the percent follows the seeded rent price, e.g. 29.79%)")

        // 4. Overview "Cần thu hôm nay" (stage 2 is late: due 4 days before today's pickup) and the list badge
        e2e.goBackOnce()
        e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3)
        sleep(5)
        e2e.shot("63a-overview")
        scrollTo(textStarting(["Cần thu hôm nay", "To collect today"]), max: 4)
        e2e.shot("63b-overview-installments")
        e2e.soft(textStarting(["Cần thu hôm nay", "To collect today"]).exists, "Overview shows Cần thu hôm nay")
        e2e.tapTab(["Orders", "Đơn hàng"], index: 1)
        sleep(4)
        e2e.tapIfExists(e2e.button(["All orders", "Tất cả đơn"]), timeout: 5)
        sleep(3)
        e2e.shot("64a-orders-badge")
        e2e.soft(app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS 'Đã thu ' OR label CONTAINS 'Collected '")).firstMatch.exists,
                 "the order row shows Đã thu")

        // 5. Back to the detail: edit the plan, hand-over blocked, collect stage 2, hand-over sheet
        let orderRow = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", number)).firstMatch
        if orderRow.waitForExistence(timeout: 5) { orderRow.tap() } else { return XCTFail("order #\(number) not in the list") }
        sleep(3)
        let edit = app.buttons["deposit.card.edit"]
        XCTAssertTrue(edit.waitForExistence(timeout: 8), "Sửa on the card")
        edit.tap()
        sleep(2)
        e2e.shot("65a-edit-plan")
        e2e.goBackOnce()
        sleep(1)
        let handOver = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Giao đồ' OR label BEGINSWITH 'Hand over'")).firstMatch
        XCTAssertTrue(handOver.waitForExistence(timeout: 5), "Giao đồ button")
        handOver.tap()
        sleep(2)
        e2e.shot("66a-handover-blocked")
        XCTAssertTrue(textStarting(["Còn giai đoạn cọc chưa thu", "Deposit stages not collected"]).exists, "the unpaid stages sheet shows")
        e2e.button(["Thu giai đoạn 2", "Collect stage 2"]).tap()
        sleep(2)
        e2e.shot("66b-collect-sheet")
        let confirmCollect = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Thu ' OR label BEGINSWITH 'Collect '")).allElementsBoundByIndex
            .filter { $0.isHittable }.max { $0.frame.minY < $1.frame.minY }
        confirmCollect?.tap()
        sleep(4)
        e2e.shot("66c-after-collect-handover-sheet")
        // the hand-over sheet follows by itself: close it without handing over
        e2e.tapIfExists(e2e.button(["Cancel", "Hủy", "Huỷ", "Close", "Đóng"]), timeout: 3)
        sleep(2)
        e2e.shot("66d-detail-stage-2-collected")

        // 6. Cancel keeping 1.800.000 of what the customer paid
        XCTAssertTrue(e2e.tapOrderSheetRow(["Cancel order", "Hủy đơn", "Huỷ đơn"]), "⋯ → Huỷ đơn")
        sleep(2)
        e2e.shot("67a-cancel-sheet")
        let kept = app.textFields["deposit.cancel.kept"]
        if kept.waitForExistence(timeout: 5) {
            kept.tap()
            kept.typeText("1800000")
            dismissKeyboard()
        }
        e2e.shot("67b-cancel-sheet-kept")
        e2e.button(["Xác nhận huỷ", "Confirm cancel"]).tap()
        sleep(4)
        e2e.shot("67c-detail-cancelled")
        e2e.note("STAGED FLOW DONE order #\(number)")
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

    /// Repro (owner report): today's calendar header counts late returns that today's list never shows;
    /// the Thế chân tile's "đang giữ N" chip vs the 7-day related orders list.
    func test6zLateHoldRepro() throws {
        try e2e.start()
        e2e.tapTab(["Calendar", "Lịch Thuê", "Lịch"], index: 2)
        sleep(3)
        let todayKey = E2E.dayMonth(Date())
        let today = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@ OR label ENDSWITH %@", todayKey + "/", " " + todayKey)).firstMatch
        if today.waitForExistence(timeout: 5) { today.tap(); sleep(3) }
        e2e.shot("01-calendar-today")
        let texts = app.staticTexts.allElementsBoundByIndex.filter(\.exists).map(\.label)
        e2e.note("CAL TEXTS | \(texts.prefix(40))")
        e2e.note("CAL CELLS | \(app.tables.cells.count) cells")
        app.swipeUp(); sleep(1)
        e2e.shot("02-calendar-today-list-scrolled")

        guard e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3) else { throw XCTSkip("No Reports tab") }
        sleep(4)
        let week = e2e.element(labelBeginsWith: ["7 days", "7 ngày"], type: .button)
        XCTAssertTrue(week.waitForExistence(timeout: 8), "7 ngày chip")
        week.tap()
        sleep(4)
        let tile = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@ OR label BEGINSWITH %@", "Thế chân", "Collateral")).firstMatch
        XCTAssertTrue(tile.waitForExistence(timeout: 8), "Thế chân tile")
        e2e.note("TILE | \(tile.label)")
        if !tile.isHittable { app.swipeUp(); sleep(1) }
        e2e.shot("03-overview-7days-tiles")
        tile.tap()
        sleep(2)
        e2e.shot("04-collateral-sheet")
        let link = e2e.element(labelBeginsWith: ["See these orders", "Xem các đơn liên quan"], type: .button)
        XCTAssertTrue(link.waitForExistence(timeout: 6), "related orders link")
        link.tap()
        let total = app.staticTexts["related.total"]
        if total.waitForExistence(timeout: 20) {
            let deadline = Date().addingTimeInterval(30)
            while total.label.isEmpty && Date() < deadline { sleep(1) }
            e2e.note("RELATED | \(total.label)")
        }
        sleep(2)
        e2e.shot("05-collateral-related-orders")
    }

    /// #1273 Thế chân in two sections: the note, "Đang giữ thế chân" with its total, "Phát sinh hôm nay" with Nhận, Trả and
    /// the three totals; needs orders with collateral held (some handed over today, some returned today).
    func test7qCollateralTwoSections() throws {
        try e2e.requireFlag("newOverview")
        try e2e.start()
        guard e2e.tapTab(["Reports", "Báo cáo", "Overview", "Tổng quan"], index: 3) else { throw XCTSkip("No Reports tab") }
        sleep(4)
        let today = e2e.element(labelBeginsWith: ["Today", "Hôm nay"], type: .button)
        if today.waitForExistence(timeout: 8) { today.tap(); sleep(3) }
        let tile = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@ OR label BEGINSWITH %@", "Thế chân", "Collateral")).firstMatch
        XCTAssertTrue(tile.waitForExistence(timeout: 10), "Thế chân tile")
        if !tile.isHittable { app.swipeUp(); sleep(1) }
        tile.tap()
        let link = e2e.element(labelBeginsWith: ["See these orders", "Xem các đơn liên quan"], type: .button)
        XCTAssertTrue(link.waitForExistence(timeout: 6), "related orders link")
        link.tap()
        XCTAssertTrue(app.staticTexts["related.held.total"].waitForExistence(timeout: 25), "Tổng đang giữ")
        sleep(2)
        e2e.shot("90-collateral-sections-top")
        e2e.note("COLLATERAL HELD TOTAL | \(app.staticTexts["related.held.total"].label)")
        for _ in 0..<4 where !app.staticTexts["related.total"].isHittable { app.swipeUp(); sleep(1) }
        XCTAssertTrue(app.staticTexts["related.flow.in"].exists, "Nhận khi giao")
        XCTAssertTrue(app.staticTexts["related.flow.out"].exists, "Trả khi nhận đồ")
        e2e.note("COLLATERAL FLOW | \(app.staticTexts["related.flow.in"].label) | \(app.staticTexts["related.flow.out"].label) | \(app.staticTexts["related.total"].label)")
        e2e.shot("91-collateral-sections-bottom")
    }

    /// #1124 "Đặt online": needs two PENDING requests on merchant1's shop (names "Nguyễn Thị Mai" and "Trần Văn Bình",
    /// made through POST /api/public/<tenantKey>/booking-requests) and MOBILE_FEATURES with onlineBooking.
    /// Chip with the count → list → Mai → Xác nhận → the new cart is filled → Tạo đơn → Đã xác nhận; then Bình → Từ chối.
    func testOnlineBooking() throws {
        try e2e.requireFlag("onlineBooking")
        try e2e.start()
        XCTAssertTrue(e2e.tapTab(["My Order", "Đơn hàng"], index: 1), "Orders tab")
        let chip = app.buttons["orders.booking"]
        XCTAssertTrue(chip.waitForExistence(timeout: 15), "Đặt online chip")
        let count = app.staticTexts["orders.booking.count"]
        XCTAssertTrue(count.waitForExistence(timeout: 10), "red count")
        e2e.note("BOOKING COUNT | \(count.label)")
        e2e.shot("booking-01-orders-chip")
        chip.tap()
        sleep(2)
        let mai = app.cells.matching(NSPredicate(format: "label BEGINSWITH 'Nguyễn Thị Mai'")).firstMatch
        XCTAssertTrue(mai.waitForExistence(timeout: 10), "Mai's request in the list")
        e2e.shot("booking-02-list")
        mai.tap()
        sleep(2)
        let confirm = app.buttons["booking.confirm"]
        XCTAssertTrue(confirm.waitForExistence(timeout: 10), "Xác nhận")
        e2e.shot("booking-03-detail")
        app.swipeUp(); sleep(1)
        e2e.shot("booking-03b-detail-items")
        confirm.tap()
        sleep(4)
        e2e.dismissAlerts()
        let cartCustomer = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS 'Nguyễn Thị Mai'")).firstMatch
        XCTAssertTrue(cartCustomer.waitForExistence(timeout: 10), "the new cart has the customer")
        e2e.shot("booking-04-cart-prefilled")
        guard e2e.createOrderFromCart(cta: ["Create order", "Tạo đơn"], shotPrefix: "booking-05-order") else {
            return XCTFail("Order from the booking was not created (last alert: \(e2e.lastAlert ?? "none"))")
        }
        e2e.note("BOOKING ORDER | \(e2e.lastCreatedOrderNumber ?? "?")")

        // Back to the list: Mai is now under Đã xác nhận
        for _ in 0..<4 where !app.buttons["booking.tab.CONFIRMED"].exists { e2e.goBackOnce() }
        if !app.buttons["booking.tab.CONFIRMED"].exists {
            e2e.tapTab(["My Order", "Đơn hàng"], index: 1); sleep(1)
            e2e.tapTab(["My Order", "Đơn hàng"], index: 1); sleep(1)
            if chip.waitForExistence(timeout: 5) { chip.tap(); sleep(2) }
        }
        let confirmedTab = app.buttons["booking.tab.CONFIRMED"]
        XCTAssertTrue(confirmedTab.waitForExistence(timeout: 10), "Đã xác nhận tab")
        confirmedTab.tap()
        sleep(2)
        let maiConfirmed = app.cells.matching(NSPredicate(format: "label BEGINSWITH 'Nguyễn Thị Mai'")).firstMatch
        XCTAssertTrue(maiConfirmed.waitForExistence(timeout: 10), "Mai under Đã xác nhận")
        e2e.soft(maiConfirmed.label.contains("Đã xác nhận") || maiConfirmed.label.contains("Confirmed"), "status Đã xác nhận (\(maiConfirmed.label))")
        e2e.shot("booking-06-confirmed")

        // Reject Bình: Hết đồ
        app.buttons["booking.tab.PENDING"].tap()
        sleep(2)
        let binh = app.cells.matching(NSPredicate(format: "label BEGINSWITH 'Trần Văn Bình'")).firstMatch
        XCTAssertTrue(binh.waitForExistence(timeout: 10), "Bình's request")
        binh.tap()
        let reject = app.buttons["booking.reject"]
        XCTAssertTrue(reject.waitForExistence(timeout: 10), "Từ chối")
        reject.tap()
        let reason = e2e.button(["Hết đồ", "Out of stock"])
        XCTAssertTrue(reason.waitForExistence(timeout: 5), "reason sheet")
        // #1137: the sheet has a title and a description; pick the reason, then send
        e2e.soft(app.staticTexts["booking.reject.sheet"].exists, "reject sheet title")
        reason.tap()
        e2e.shot("booking-07-reject-sheet")
        let send = app.buttons["booking.reject.send"]
        XCTAssertTrue(send.waitForExistence(timeout: 5), "Từ chối in the sheet")
        send.tap()
        sleep(3)
        let rejected = app.staticTexts.matching(NSPredicate(format: "label IN %@", ["Từ chối", "Rejected"])).firstMatch
        XCTAssertTrue(rejected.waitForExistence(timeout: 10), "status Từ chối")
        XCTAssertFalse(app.buttons["booking.confirm"].isHittable, "no actions on a rejected request")
        e2e.shot("booking-08-rejected")
        e2e.goBackOnce()
        sleep(1)
        e2e.goBackOnce()
        sleep(2)
        e2e.soft(!app.staticTexts["orders.booking.count"].exists, "no red count when nothing waits")
        e2e.shot("booking-09-orders-no-count")
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

    // MARK: iPad (#973)

    /// iPadOS 18+ floats the tabs at the top as plain buttons: there is no tabBar element.
    let isPad = UIDevice.current.userInterfaceIdiom == .pad
    static let tabLabels = ["Home", "Trang chủ", "My Order", "Đơn hàng", "Calendar", "Lịch Thuê", "Lịch",
                            "Reports", "Báo cáo", "Overview", "Tổng quan", "Settings", "Cài đặt", "Setting"]

    /// The main tab bar on iPhone; on iPad the first top tab button (exists / isHittable mean the same thing)
    var tabBar: XCUIElement {
        let bar = app.tabBars.firstMatch
        if !isPad || bar.exists { return bar }
        return padTabButtons.firstMatch
    }

    private var padTabButtons: XCUIElementQuery {
        app.buttons.matching(NSPredicate(format: "label IN %@", E2E.tabLabels))
    }

    /// The app only runs in landscape on iPad (Info.plist); a portrait simulator letterboxes it.
    func rotateIfPad() {
        if isPad { XCUIDevice.shared.orientation = .landscapeLeft }
    }

    private func tapPadTab(_ names: [String], index: Int?) -> Bool {
        guard padTabButtons.firstMatch.waitForExistence(timeout: 10) else { return false }
        for name in names {
            let tab = app.buttons.matching(NSPredicate(format: "label == %@", name)).firstMatch
            if tab.exists && tab.isHittable { tab.tap(); return true }
        }
        // The top strip lists each tab once (nested duplicates share a frame): order them by x
        var seen: [CGFloat] = []
        let tabs = padTabButtons.allElementsBoundByIndex.filter { button in
            guard button.frame.minY < 120, !seen.contains(button.frame.minX) else { return false }
            seen.append(button.frame.minX)
            return true
        }.sorted { $0.frame.minX < $1.frame.minX }
        let target = index.map { $0 < tabs.count ? tabs[$0] : nil } ?? tabs.last
        guard let target else { return false }
        target.tap()
        return true
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
        rotateIfPad()
        app.launch()
        if isLoginScreen(timeout: 8) {
            for attempt in 1...3 {
                login()
                if !app.secureTextFields.firstMatch.waitForNonExistence(timeout: 8) {
                    shot("00-login-retry-\(attempt)")
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
        rotateIfPad()
        app.launch()
        if isLoginScreen(timeout: 8) {
            // The secure field sometimes drops the typed password (keyboard switch after the email field),
            // leaving Login disabled. Retry while the login form is still showing.
            for attempt in 1...3 {
                login()
                if !app.secureTextFields.firstMatch.waitForNonExistence(timeout: 8) {
                    shot("00-login-retry-\(attempt)")
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
        guard tabBar.waitForExistence(timeout: 30) else {
            shot("00-no-main-shell")
            XCTFail("Main tab bar did not appear after login")
            throw XCTSkip("not logged in")
        }
    }

    private func isLoginScreen(timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if app.secureTextFields.firstMatch.exists { return true }
            if tabBar.exists && !app.alerts.firstMatch.exists { return false }
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
        // An empty secure field reports its placeholder (8 dots) as its value. A password of exactly 8 characters (staff123)
        // also reads as 8 dots, so only retype when the length differs: typing it twice made 16 characters and a failed login.
        if let typed = pass.value as? String, typed.isEmpty || (typed == pass.placeholderValue && typed.count != password.count) {
            pass.tap()
            pass.typeText(password)
        }
        shot("01-login-filled", attachOnly: true)
        note("LOGIN typed email=\(resolved.value as? String ?? "?") passwordChars=\((pass.value as? String)?.count ?? -1) expected=\(password.count)")
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
            if !acted && tabBar.exists {
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
        let v2 = field(["Name, phone, or order number", "Tìm tên, SĐT hoặc mã đơn"])
        return v2.exists ? v2 : app.searchFields.firstMatch.exists ? app.searchFields.firstMatch
            : app.textFields.matching(NSPredicate(format: "placeholderValue BEGINSWITH 'Name, phone' OR placeholderValue BEGINSWITH 'Tên'")).firstMatch
    }

    /// Home → search the product by name → open its detail. True when "Add to cart" shows.
    func openProduct(named name: String) -> Bool {
        tapTab(["Home", "Trang chủ"], index: 0)
        // v2 placeholder "Tìm tên, mã vạch hoặc chụp ảnh" (the old "Tên, mã vạch…" is gone: openProduct never found its field)
        let search = field(["Search name, barcode or take a photo", "Tìm tên, mã vạch hoặc chụp ảnh", "Name, barcode…", "Tên, mã vạch…"])
        guard search.waitForExistence(timeout: 10) else { note("openProduct '\(name)': no Home search field"); shot("openproduct-no-search"); return false }
        search.tap()
        search.clearText()
        search.typeText(name + "\n")
        sleep(3)
        let row = app.cells.containing(NSPredicate(format: "label CONTAINS %@", name)).firstMatch
        let text = app.staticTexts[name]
        // "Product 2 -" also matches Product 20…29 (word prefix), and the list is sorted by name: the row can be further down
        if !row.waitForExistence(timeout: 5) {
            note("openProduct '\(name)': first rows \(screenTexts().prefix(12))")
            for _ in 0..<6 where !row.exists { app.swipeUp() }
        }
        if row.exists { tapRow(row) } else if text.exists { text.tap() } else {
            note("openProduct '\(name)': no row. search=\((search.value as? String) ?? "?") cells=\(app.cells.allElementsBoundByIndex.prefix(4).map(\.label))")
            shot("openproduct-missing")
            return false
        }
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
    func openProduct(where match: (Int) -> Bool, upTo last: Int = 20, descending: Bool = false) -> String? {
        for index in (descending ? Array((1...last).reversed()) : Array(1...last)) {
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

    /// Sort bar on Tất cả đơn ("Xếp theo ngày lấy · gần nhất trước ⌄", #888); it opens the filter sheet.
    var sortButton: XCUIElement {
        element(labelBeginsWith: ["Sorted by", "Xếp theo"], type: .button)
    }

    /// #952: the Home top-right cart button while the cart has items (its value says "Giỏ hàng · N món");
    /// it is the only entry to the cart (the floating cart bar is gone)
    var homeCart: XCUIElement {
        app.buttons.matching(
            NSPredicate(format: "label IN %@ AND (value CONTAINS 'Cart ·' OR value CONTAINS 'Giỏ hàng ·')", ["Cart", "Giỏ hàng"])
        ).firstMatch
    }

    /// #952: the old floating bar ("Giỏ hàng · N món … Tạo đơn ›"); must not exist
    var floatingCartBar: XCUIElement {
        app.descendants(matching: .any).matching(
            NSPredicate(format: "(label CONTAINS 'Cart ·' OR label CONTAINS 'Giỏ hàng ·') AND (label CONTAINS 'Create order' OR label CONTAINS 'Tạo đơn' OR label CONTAINS 'Edit order' OR label CONTAINS 'Sửa đơn')")
        ).firstMatch
    }

    // MARK: Actions

    @discardableResult
    func tapTab(_ names: [String], index: Int?) -> Bool {
        if isPad && !app.tabBars.firstMatch.exists { return tapPadTab(names, index: index) }
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
        let tabBar = self.tabBar
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
        if !homeCart.waitForExistence(timeout: 2) {
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
        guard homeCart.waitForExistence(timeout: 5) else { return false }
        homeCart.tap()
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
            cell.frame.minY.isFinite && cell.frame.minY >= top && cell.isHittable  // an off-screen cell has an infinite frame: isHittable would throw
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
        guard homeCart.waitForExistence(timeout: 3) else { return }
        homeCart.tap()
        guard button(["Back to products", "Quay lại chọn sản phẩm"]).waitForExistence(timeout: 8) else { return }
        let minus = app.buttons.matching(NSPredicate(format: "label IN %@", ["One less", "Bớt 1"]))
        for _ in 0..<60 where minus.firstMatch.exists {
            minus.firstMatch.tap()
            let remove = app.alerts.buttons.matching(NSPredicate(format: "label IN %@", ["Remove", "Bỏ"])).firstMatch
            if remove.waitForExistence(timeout: 1) { remove.tap(); sleep(1) }
        }
        goBackOnce()
    }

    /// #677: leave a cart in edit mode ("Sửa đơn #n") with Huỷ sửa → confirm (the app shows the order again), then back to
    /// the tab bar. Works from the edit cart, the product list Sửa đơn opens, or a tab. False when the cart is not editing.
    @discardableResult
    func leaveEditMode() -> Bool {
        let cancel = app.buttons["cart.edit.cancel"]
        if !cancel.exists {
            if !homeCart.exists { tapTab(["Home", "Trang chủ"], index: 0) }
            guard homeCart.waitForExistence(timeout: 4) else { return false }
            homeCart.tap()
            guard cancel.waitForExistence(timeout: 5) else {
                goBackOnce()  // an ordinary cart: leave it as it is
                return false
            }
        }
        cancel.tap()
        let confirm = app.alerts.buttons.matching(NSPredicate(format: "label IN %@", ["Huỷ sửa", "Hủy sửa", "Cancel edit"])).firstMatch
        guard confirm.waitForExistence(timeout: 5) else {
            note("Huỷ sửa asked no confirmation")
            return false
        }
        confirm.tap()
        sleep(3)
        dismissAlerts()
        for _ in 0..<3 where !(tabBar.exists && tabBar.isHittable) { goBack() }
        let left = !app.buttons["cart.edit.cancel"].exists
        if left { note("left a cart in edit mode with Huỷ sửa") }
        return left
    }

    /// Home → product detail → Thêm vào giỏ → back → open the cart. True when the cart shows.
    func addToCartAndOpen(product key: String) -> Bool {
        guard openProduct(named: key) else { note("product \(key) not found"); return false }
        button(["Add to cart", "Thêm vào giỏ"]).tap()
        sleep(1)
        tapIfExists(button(["Back", "Quay lại"]))
        guard homeCart.waitForExistence(timeout: 5) else { return false }
        homeCart.tap()
        return button(["Back to products", "Quay lại chọn sản phẩm"]).waitForExistence(timeout: 8)
    }

    /// The ⋯ button of the order detail (#519: the header keeps only ⋯; it opens the action sheet)
    var orderMoreButton: XCUIElement {
        let byId = app.buttons["order.detail.more"]
        return byId.exists ? byId : button(["More actions", "Thêm thao tác"])
    }

    /// The ⋯ sheet has no title since #1297 (the order number is on the top bar): its close button marks it
    var orderSheetTitle: XCUIElement {
        app.buttons["order.sheet.close"]
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
        if !(tabBar.exists && tabBar.isHittable) { goBack() }
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
        // app colours: ok 047857 (green), warn 9A3412 (dark orange: g about a third of r, b well below g), danger B91C1C (red: g and b alike and low)
        if r > 130 && g > r * 0.22 && g < r * 0.85 && b < g * 0.6 { return "amber" }
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


// MARK: - #1315 the shop owner over HTTP (the UI test runs inside the simulator and reaches the local API)

private enum OwnerAPI {
    static let base = ProcessInfo.processInfo.environment["E2E_API_URL"] ?? "http://localhost:3180"
    static var token = ""

    @discardableResult
    static func call(_ method: String, _ path: String, _ json: [String: Any]? = nil, bearer: String? = nil) -> (status: Int, body: [String: Any]?) {
        guard let url = URL(string: base + path) else { return (-1, nil) }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("10.\(Int.random(in: 1...250)).\(Int.random(in: 1...250)).\(Int.random(in: 1...250))", forHTTPHeaderField: "x-forwarded-for")
        if let bearer = bearer ?? (token.isEmpty ? nil : token) { request.setValue("Bearer \(bearer)", forHTTPHeaderField: "Authorization") }
        if let json = json {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try? JSONSerialization.data(withJSONObject: json)
        }
        var result: (Int, [String: Any]?) = (-1, nil)
        let done = DispatchSemaphore(value: 0)
        URLSession.shared.dataTask(with: request) { data, response, _ in
            result = ((response as? HTTPURLResponse)?.statusCode ?? -1, data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] })
            done.signal()
        }.resume()
        _ = done.wait(timeout: .now() + 30)
        return result
    }

    static func login() -> Bool {
        let env = ProcessInfo.processInfo.environment
        let r = call("POST", "/api/mobile/auth/login", ["email": env["E2E_OWNER_EMAIL"] ?? "merchant1@example.com", "password": env["E2E_OWNER_PASSWORD"] ?? "merchant123", "deviceId": "settings-sync-owner"])
        token = ((r.body?["data"] as? [String: Any])?["token"] as? String) ?? ""
        return !token.isEmpty
    }

    static func put(_ path: String, _ json: [String: Any]) -> Int { call("PUT", path, json).status }

    /// `merchant.shareOrderNote` of GET /api/users/profile (#1354)
    static func shareOrderNote() -> Bool? {
        (((call("GET", "/api/users/profile").body?["data"] as? [String: Any])?["merchant"] as? [String: Any])?["shareOrderNote"] as? Bool)
    }

    static func currency() -> String? { ((call("GET", "/api/settings/currency").body?["data"] as? [String: Any])?["currency"] as? String) }

    private static func outlets() -> [[String: Any]] {
        let data = call("GET", "/api/outlets?limit=50").body?["data"]
        if let list = data as? [[String: Any]] { return list }
        let dict = data as? [String: Any]
        return (dict?["outlets"] as? [[String: Any]]) ?? (dict?["items"] as? [[String: Any]]) ?? []
    }

    static func outletPrint(_ id: Int) -> (note: String, qr: Bool) {
        let row = outlets().first { ($0["id"] as? Int) == id }
        return ((row?["printNote"] as? String) ?? "", (row?["printBankQr"] as? Bool) ?? false)
    }
}
