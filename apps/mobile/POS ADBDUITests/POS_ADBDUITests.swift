//
//  POS_ADBDUITests.swift
//  POS ADBDUITests
//
//  Created by Tran Trinh on 3/2/20.
//  Copyright © 2020 Trinh Tran. All rights reserved.
//

import XCTest

class POS_ADBDUITests: XCTestCase {

    override func setUp() {
        continueAfterFailure = true
    }

    override func tearDown() {
    }

    func testCPPAoDaiScreenshots() throws {
        let creds = Self.loadScreenshotCredentials()
        let email = creds.email
        let password = creds.password
        XCTAssertFalse(email.isEmpty, "Set CPP_SCREENSHOT_EMAIL or /tmp/anyrent-cpp-credentials.env")
        XCTAssertFalse(password.isEmpty, "Set CPP_SCREENSHOT_PASSWORD or /tmp/anyrent-cpp-credentials.env")

        let device = ProcessInfo.processInfo.environment["CPP_SCREENSHOT_DEVICE"] ?? creds.device
        let outputDir = ProcessInfo.processInfo.environment["CPP_SCREENSHOT_DIR"] ?? creds.outputDir
            ?? "/tmp/anyrent-cpp-ao-dai/\(device)"
        try FileManager.default.createDirectory(atPath: outputDir, withIntermediateDirectories: true)

        if device.lowercased().contains("ipad") {
            // App only supports landscape on iPad (Info.plist). Portrait mode letterboxes with black bars.
            XCUIDevice.shared.orientation = .landscapeLeft
        } else {
            XCUIDevice.shared.orientation = .portrait
        }

        let app = XCUIApplication()
        app.launch()

        loginIfNeeded(app: app, email: email, password: password)
        dismissSystemAlerts(app: app)
        XCTAssertTrue(waitForMainShell(app: app), "Main shell should appear after login")

        // 1) Product list (home)
        tapTab(app: app, names: ["Home", "Trang chủ"], fallbackIndex: 0)
        sleep(2)
        dismissSystemAlerts(app: app)
        saveScreenshot(named: "01-products", outputDir: outputDir)

        // 4) Orders list (capture before cart hides tab bar)
        dismissSystemAlerts(app: app)
        if tapTab(app: app, names: ["My Order", "Đơn Hàng", "Đơn hàng", "Hoá đơn", "Orders"], fallbackIndex: 1) {
            sleep(2)
            dismissSystemAlerts(app: app)
            saveScreenshot(named: "04-orders", outputDir: outputDir)
        }

        // 5) Rental calendar
        dismissSystemAlerts(app: app)
        if tapTab(app: app, names: ["Calendar", "Lịch", "Lịch thuê"], fallbackIndex: 2) {
            sleep(2)
            dismissSystemAlerts(app: app)
            saveScreenshot(named: "05-calendar", outputDir: outputDir)
        }

        // 6) Overview / report
        dismissSystemAlerts(app: app)
        if tapTab(app: app, names: ["Reports", "Báo cáo", "Report", "Tổng quan"], fallbackIndex: 3) {
            sleep(2)
            dismissSystemAlerts(app: app)
            saveScreenshot(named: "06-overview", outputDir: outputDir)
        }

        // 2) Add first product + open cart
        tapTab(app: app, names: ["Home", "Trang chủ"], fallbackIndex: 0)
        sleep(1)
        dismissSystemAlerts(app: app)
        addFirstProductIfPossible(app: app)
        openCartIfPossible(app: app)
        sleep(2)
        dismissSystemAlerts(app: app)
        saveScreenshot(named: "02-cart-rent-dates", outputDir: outputDir)

        // 3) Preview order (if enabled)
        dismissSystemAlerts(app: app)
        let previewCandidates = [
            app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'preview'")).firstMatch,
            app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] 'preview'")).firstMatch
        ]
        var openedPreview = false
        for candidate in previewCandidates where candidate.waitForExistence(timeout: 2) {
            if candidate.isHittable {
                candidate.tap()
            } else {
                candidate.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
            }
            openedPreview = true
            break
        }
        if !openedPreview {
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.92)).tap()
        }
        sleep(2)
        dismissSystemAlerts(app: app)
        if app.alerts.buttons["OK"].exists {
            app.alerts.buttons["OK"].tap()
            sleep(1)
        }
        saveScreenshot(named: "03-order-preview", outputDir: outputDir)
    }

    private static func loadScreenshotCredentials() -> (email: String, password: String, device: String, outputDir: String?) {
        let env = ProcessInfo.processInfo.environment
        if let email = env["CPP_SCREENSHOT_EMAIL"], !email.isEmpty,
           let password = env["CPP_SCREENSHOT_PASSWORD"], !password.isEmpty {
            return (email, password, env["CPP_SCREENSHOT_DEVICE"] ?? "iphone", env["CPP_SCREENSHOT_DIR"])
        }

        let path = env["CPP_SCREENSHOT_CREDENTIALS_FILE"] ?? "/tmp/anyrent-cpp-credentials.env"
        guard let contents = try? String(contentsOfFile: path, encoding: .utf8) else {
            return ("", "", "iphone", nil)
        }

        var values: [String: String] = [:]
        for line in contents.split(separator: "\n") {
            let parts = line.split(separator: "=", maxSplits: 1).map(String.init)
            guard parts.count == 2 else { continue }
            values[parts[0].trimmingCharacters(in: .whitespaces)] = parts[1].trimmingCharacters(in: .whitespaces)
        }

        return (
            values["CPP_SCREENSHOT_EMAIL"] ?? "",
            values["CPP_SCREENSHOT_PASSWORD"] ?? "",
            values["CPP_SCREENSHOT_DEVICE"] ?? "iphone",
            values["CPP_SCREENSHOT_DIR"]
        )
    }

    private func loginIfNeeded(app: XCUIApplication, email: String, password: String) {
        if waitForMainShell(app: app) { return }

        let emailField = app.textFields.matching(
            NSPredicate(format: "label CONTAINS[c] 'email' OR placeholderValue CONTAINS[c] 'email'")
        ).firstMatch
        if emailField.waitForExistence(timeout: 3) == false,
           app.textFields.element(boundBy: 0).waitForExistence(timeout: 5) == false {
            return
        }

        let resolvedEmailField = emailField.exists ? emailField : app.textFields.element(boundBy: 0)
        XCTAssertTrue(resolvedEmailField.waitForExistence(timeout: 10))
        resolvedEmailField.tap()
        resolvedEmailField.clearAndEnterText(email)

        let passwordField = app.secureTextFields.matching(
            NSPredicate(format: "label CONTAINS[c] 'password' OR placeholderValue CONTAINS[c] 'password'")
        ).firstMatch
        let resolvedPasswordField = passwordField.exists ? passwordField : app.secureTextFields.element(boundBy: 0)
        XCTAssertTrue(resolvedPasswordField.waitForExistence(timeout: 5))
        resolvedPasswordField.tap()
        resolvedPasswordField.clearAndEnterText(password)

        let loginButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'đăng nhập' OR label CONTAINS[c] 'login'")
        ).firstMatch
        XCTAssertTrue(loginButton.waitForExistence(timeout: 5))
        loginButton.tap()
        sleep(3)
        dismissSystemAlerts(app: app)
    }

    private func dismissSystemAlerts(app: XCUIApplication) {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let notNow = springboard.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'not now' OR label CONTAINS[c] 'không'")
        ).firstMatch
        if notNow.waitForExistence(timeout: 2) {
            notNow.tap()
            sleep(1)
        }

        let dismiss = app.alerts.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'not now' OR label CONTAINS[c] 'ok' OR label CONTAINS[c] 'đóng' OR label CONTAINS[c] 'cancel'")
        ).firstMatch
        if dismiss.waitForExistence(timeout: 1) {
            dismiss.tap()
        }
    }

    private func addFirstProductIfPossible(app: XCUIApplication) {
        let firstProduct = app.tables.cells.firstMatch
        if firstProduct.waitForExistence(timeout: 4), firstProduct.isHittable {
            firstProduct.tap()
            sleep(1)
            return
        }

        // iPad split view: tap first product row in collection/table on the left.
        let productName = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] 'áo' OR label CONTAINS[c] 'ao'")
        ).firstMatch
        if productName.waitForExistence(timeout: 6) {
            if productName.isHittable {
                productName.tap()
            } else {
                productName.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
            }
            sleep(1)
        }
    }

    private func navigateBackToRoot(app: XCUIApplication) {
        for _ in 0..<6 {
            if app.tabBars.buttons["Home"].waitForExistence(timeout: 1) { return }

            let cancel = app.buttons.matching(
                NSPredicate(format: "label CONTAINS[c] 'cancel' OR label CONTAINS[c] 'huỷ' OR label CONTAINS[c] 'hủy'")
            ).firstMatch
            if cancel.waitForExistence(timeout: 1), cancel.isHittable {
                cancel.tap()
                sleep(1)
                continue
            }

            let backButtons = app.navigationBars.buttons
            if backButtons.count > 0 {
                let back = backButtons.element(boundBy: 0)
                if back.exists, back.isHittable {
                    back.tap()
                    sleep(1)
                    continue
                }
            }
            break
        }
        if app.tabBars.buttons["Home"].waitForExistence(timeout: 2) {
            app.tabBars.buttons["Home"].tap()
        }
    }

    private func waitForMainShell(app: XCUIApplication) -> Bool {
        let markers = ["Home", "My Order", "Product name...", "Tên sản phẩm"]
        let deadline = Date().addingTimeInterval(35)
        while Date() < deadline {
            if app.tabBars.firstMatch.exists { return true }
            for marker in markers where app.staticTexts[marker].exists || app.buttons[marker].exists {
                return true
            }
            if app.searchFields.firstMatch.exists { return true }
            sleep(1)
        }
        return false
    }

    @discardableResult
    private func tapTab(app: XCUIApplication, names: [String], fallbackIndex: Int? = nil) -> Bool {
        for name in names {
            let tabBarButton = app.tabBars.buttons[name]
            if tabBarButton.waitForExistence(timeout: 2) {
                tabBarButton.tap()
                return true
            }

            let topButtons = app.buttons.matching(NSPredicate(format: "label == %@", name))
            if topButtons.count > 0 {
                topButtons.element(boundBy: 0).tap()
                return true
            }
        }
        if let index = fallbackIndex, app.tabBars.buttons.count > index {
            app.tabBars.buttons.element(boundBy: index).tap()
            return true
        }
        return false
    }

    private func openCartIfPossible(app: XCUIApplication) {
        let cartCandidates = [
            app.navigationBars.buttons.matching(NSPredicate(format: "identifier CONTAINS 'cart'")).firstMatch,
            app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'cart' OR label CONTAINS[c] 'giỏ'")).firstMatch,
            app.navigationBars.buttons.element(boundBy: app.navigationBars.buttons.count - 1)
        ]
        for button in cartCandidates where button.exists && button.isHittable {
            button.tap()
            return
        }
    }

    private func saveScreenshot(named name: String, outputDir: String) {
        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)

        let path = (outputDir as NSString).appendingPathComponent("\(name).png")
        let data = screenshot.pngRepresentation
        XCTAssertTrue(FileManager.default.createFile(atPath: path, contents: data), "Failed writing \(path)")
        print("CPP_SCREENSHOT_SAVED:\(path)")
    }

    func testExample() {
        
        let app = XCUIApplication()
        app.textFields["Email"].tap()
        app.secureTextFields["Mật khẩu"].tap()
        app.buttons["ĐĂNG NHẬP"].tap()
        app.tabBars.buttons["Hoá đơn"].tap()
                


       // Use recording to get started writing UI tests.
        // Use XCTAssert and related functions to verify your tests produce the correct results.
    }

}

private extension XCUIElement {
    func clearAndEnterText(_ text: String) {
        guard let stringValue = value as? String else {
            tap()
            typeText(text)
            return
        }
        tap()
        let deleteString = String(repeating: XCUIKeyboardKey.delete.rawValue, count: stringValue.count)
        typeText(deleteString)
        typeText(text)
    }
}

