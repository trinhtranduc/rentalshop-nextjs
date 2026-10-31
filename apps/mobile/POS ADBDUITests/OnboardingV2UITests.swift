import XCTest

/// #1404 the 3-page onboarding on a fresh install, walked like a person: Next, swipes, fast swipes, background and return,
/// then Start into Home. Run it with `scripts/mobile-e2e/ios-e2e.sh`'s environment (a seeded local API); it needs a
/// fresh install, because the pages show once. `E2E_OUT_DIR` gets the stills and, when set, `E2E_MARKER_DIR` gets
/// `record-start` and `record-stop` so a recording can cover exactly this walk.
final class OnboardingV2UITests: XCTestCase {
    private let app = XCUIApplication()
    private let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    private var env: [String: String] { ProcessInfo.processInfo.environment }
    private var isVietnamese: Bool { Locale.preferredLanguages.first?.hasPrefix("vi") == true }

    private func word(_ vi: String, _ en: String) -> String { isVietnamese ? vi : en }

    private func marker(_ name: String) {
        guard let dir = env["E2E_MARKER_DIR"], !dir.isEmpty else { return }
        FileManager.default.createFile(atPath: "\(dir)/\(name)", contents: Data())
    }

    private func still(_ name: String) {
        let shot = XCUIScreen.main.screenshot()
        if let dir = env["E2E_OUT_DIR"], !dir.isEmpty {
            try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
            try? shot.pngRepresentation.write(to: URL(fileURLWithPath: "\(dir)/\(name).png"))
        }
    }

    private func titleExists(_ text: String) -> Bool {
        app.staticTexts[text].waitForExistence(timeout: 3)
    }

    private func dismissPrompts() {
        let labels = ["Don’t Allow", "Don't Allow", "Không cho phép", "Not Now", "Không phải bây giờ"]
        let predicate = NSPredicate(format: "label IN %@", labels)
        for element in [springboard.alerts.buttons.matching(predicate).firstMatch, app.alerts.buttons.matching(predicate).firstMatch,
                        springboard.buttons.matching(predicate).firstMatch, app.buttons.matching(predicate).firstMatch]
        where element.exists && element.isHittable {
            element.tap()
        }
    }

    private func logIn() throws {
        let email = app.textFields.firstMatch
        XCTAssertTrue(email.waitForExistence(timeout: 30), "Login form")
        email.tap()
        email.typeText(try XCTUnwrap(env["E2E_EMAIL"]))
        let password = app.secureTextFields.firstMatch
        password.tap()
        password.typeText(try XCTUnwrap(env["E2E_PASSWORD"]))
        let login = app.buttons.matching(NSPredicate(format: "label IN %@", ["Login", "Đăng nhập", "Log in"])).firstMatch
        if !login.isHittable { app.tap() }
        login.tap()
    }

    func testWalkThroughThePages() throws {
        app.launch()
        dismissPrompts()
        try logIn()

        let next = app.buttons[word("Tiếp", "Next")]
        let skip = app.buttons[word("Bỏ qua", "Skip")]
        let deadline = Date().addingTimeInterval(45)
        while !(next.exists && next.isHittable), Date() < deadline {
            dismissPrompts()
            sleep(1)
        }
        XCTAssertTrue(next.exists, "The onboarding pages open after the first login")
        // The notification prompt comes up over page 1, a moment after login
        for _ in 0..<6 {
            dismissPrompts()
            sleep(1)
        }
        marker("record-start")
        sleep(1)

        // Page 1: effect, hold, one repeat
        let page1 = word("Quên tên đồ? Chụp là ra.", "Forgot the name? Just snap it.")
        let page2 = word("Trùng lịch, app báo trước.", "Double-booked? You'll know first.")
        let page3 = word("Giao ai, trả ai? Mở Lịch là thấy.", "Who's due today? Open Calendar.")
        XCTAssertTrue(titleExists(page1))
        XCTAssertTrue(skip.exists)
        usleep(800_000)
        still("p1-effect-running")
        sleep(1)
        still("p1-finished")
        sleep(6)

        next.tap()
        XCTAssertTrue(titleExists(page2))
        usleep(800_000)
        still("p2-effect-running")
        sleep(1)
        still("p2-finished")
        sleep(6)

        next.tap()
        XCTAssertTrue(titleExists(page3))
        XCTAssertFalse(skip.exists && skip.isHittable, "Page 3 has no Skip")
        XCTAssertTrue(app.buttons[word("Bắt đầu", "Get started")].exists)
        usleep(800_000)
        still("p3-effect-running")
        sleep(1)
        still("p3-finished")
        sleep(6)

        // Going back plays the target page again
        app.swipeRight()
        XCTAssertTrue(titleExists(page2))
        sleep(2)
        app.swipeRight()
        XCTAssertTrue(titleExists(page1))
        sleep(2)
        app.swipeRight() // Past the first page: nothing happens
        XCTAssertTrue(titleExists(page1))

        // Fast, back and forth, mid-run
        for _ in 0..<4 {
            app.swipeLeft()
            app.swipeLeft()
            app.swipeRight()
            app.swipeRight()
        }
        XCTAssertTrue(titleExists(page1), "Fast swipes end on the right page")
        still("after-fast-swipes")
        sleep(3)

        // Background and return keeps the page and replays its effect
        next.tap()
        XCTAssertTrue(titleExists(page2))
        usleep(500_000)
        XCUIDevice.shared.press(.home)
        sleep(3)
        app.activate()
        XCTAssertTrue(titleExists(page2), "The page is kept after background")
        sleep(3)
        still("after-background")

        next.tap()
        XCTAssertTrue(titleExists(page3))
        sleep(3)
        app.buttons[word("Bắt đầu", "Get started")].tap()
        XCTAssertTrue(app.tabBars.firstMatch.waitForExistence(timeout: 20), "Start opens Home")
        sleep(2)
        still("home-after-start")
        marker("record-stop")

        // Shown once
        app.terminate()
        app.launch()
        dismissPrompts()
        XCTAssertTrue(app.tabBars.firstMatch.waitForExistence(timeout: 20))
        XCTAssertFalse(next.exists, "The pages show once")
    }
}
