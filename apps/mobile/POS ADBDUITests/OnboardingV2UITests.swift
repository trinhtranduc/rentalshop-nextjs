import XCTest

/// #1404 the 3-page onboarding on a fresh install, walked like a person: Next, swipes, fast swipes, background and return,
/// then Start into login, then Home (#1455: the pages come before login). Run it with `scripts/mobile-e2e/ios-e2e.sh`'s
/// environment (a seeded local API); each test needs a fresh install, because the pages show once. `E2E_OUT_DIR` gets the stills and,
/// when set, `E2E_MARKER_DIR` gets `record-start` and `record-stop` so a recording can cover exactly this walk.
final class OnboardingV2UITests: XCTestCase {
    private let app = XCUIApplication()
    private let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    private var env: [String: String] { ProcessInfo.processInfo.environment }
    private lazy var e2e = E2E(test: self, app: app)
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

    private var loginForm: XCUIElement { app.secureTextFields.firstMatch }
    private var tabs: XCUIElement { app.tabBars.firstMatch }

    /// A person's words on the buttons, in whichever language the app came up: `app.open` starts it without the test's language
    private var nextButton: XCUIElement { e2e.button(["Next", "Tiếp"]) }
    private var skipButton: XCUIElement { e2e.button(["Skip", "Bỏ qua"]) }

    private func waitForTabs(_ why: String) {
        let deadline = Date().addingTimeInterval(30)
        while !tabs.exists, Date() < deadline {
            dismissPrompts()
            sleep(1)
        }
        XCTAssertTrue(tabs.exists, why)
    }

    func testWalkThroughThePages() throws {
        app.launch()
        dismissPrompts()

        let next = app.buttons[word("Tiếp", "Next")]
        let skip = app.buttons[word("Bỏ qua", "Skip")]
        let deadline = Date().addingTimeInterval(45)
        while !(next.exists && next.isHittable), Date() < deadline {
            dismissPrompts()
            sleep(1)
        }
        XCTAssertTrue(next.exists, "A fresh install opens on the onboarding pages")
        XCTAssertFalse(loginForm.exists, "The pages come before login")
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
        XCTAssertTrue(loginForm.waitForExistence(timeout: 20), "Start opens login")
        sleep(1)
        still("login-after-start")
        marker("record-stop")

        try logIn()
        waitForTabs("Login opens Home")
        XCTAssertFalse(next.exists, "No pages after login")
        sleep(2)
        still("home-after-login")

        // Shown once
        app.terminate()
        app.launch()
        dismissPrompts()
        XCTAssertTrue(tabs.waitForExistence(timeout: 20))
        XCTAssertFalse(next.exists, "The pages show once")
    }

    /// #1455: Bỏ qua goes to login; no pages after it, at a relaunch, or after a logout
    func testSkipGoesToLoginAndThePagesNeverComeBack() throws {
        app.launch()
        XCTAssertTrue(skipButton.waitForExistence(timeout: 30), "page 1")
        still("skip-01-page1")
        skipButton.tap()
        XCTAssertTrue(loginForm.waitForExistence(timeout: 20), "Bỏ qua opens login")
        XCTAssertFalse(tabs.exists)
        still("skip-02-login")

        // Quit on the login screen: the pages are over
        app.terminate()
        app.launch()
        XCTAssertTrue(loginForm.waitForExistence(timeout: 30), "login again, no pages")
        XCTAssertFalse(nextButton.exists)
        still("skip-03-relaunch-login")

        try logIn()
        waitForTabs("Login opens Home")
        XCTAssertFalse(nextButton.exists, "no pages after login")
        still("skip-04-home")

        // Signed in, relaunch
        app.terminate()
        app.launch()
        XCTAssertTrue(tabs.waitForExistence(timeout: 30), "Home at a relaunch")
        XCTAssertFalse(nextButton.exists)
        dismissPrompts()
        still("skip-05-relaunch-home")

        // Logout
        e2e.logout()
        XCTAssertTrue(loginForm.waitForExistence(timeout: 20), "logout opens login")
        XCTAssertFalse(nextButton.exists, "no pages after a logout")
        still("skip-06-after-logout")
        app.terminate()
        app.launch()
        XCTAssertTrue(loginForm.waitForExistence(timeout: 30), "login at a relaunch after logout")
        XCTAssertFalse(nextButton.exists)

        // And Home straight after logging in again
        try logIn()
        waitForTabs("Login again opens Home")
        XCTAssertFalse(nextButton.exists)
    }

    /// #1455: links on a fresh install, with nobody signed in: no crash, no skipped login. An order link waits for the login, as it always did.
    /// E2E_LINK_ORDER_ID, E2E_LINK_ORDER_NUMBER: an order of the account that logs in.
    func testLinksOnAFreshInstallWaitForLogin() throws {
        guard #available(iOS 16.4, *) else { throw XCTSkip("needs XCUIApplication.open") }
        guard let orderId = env["E2E_LINK_ORDER_ID"], let number = env["E2E_LINK_ORDER_NUMBER"] else { throw XCTSkip("set TEST_RUNNER_E2E_LINK_ORDER_ID and _NUMBER") }

        // Cold start from an order link
        app.open(try XCTUnwrap(URL(string: "anyrent://order/\(orderId)")))
        XCTAssertTrue(nextButton.waitForExistence(timeout: 30), "the pages, not the order")
        XCTAssertFalse(tabs.exists, "no tabs without a login")
        still("link-01-order-link-cold-pages")

        // More links while the pages are up
        for link in ["anyrent://todo", "anyrent://draft-cart"] {
            app.open(try XCTUnwrap(URL(string: link)))
            sleep(2)
            XCTAssertTrue(nextButton.exists, "\(link) leaves the pages up")
            XCTAssertFalse(tabs.exists, "\(link): no tabs without a login")
        }
        still("link-02-more-links-pages")

        skipButton.tap()
        XCTAssertTrue(loginForm.waitForExistence(timeout: 20), "login after the pages")

        // A link on the login screen
        app.open(try XCTUnwrap(URL(string: "anyrent://todo")))
        sleep(2)
        XCTAssertTrue(loginForm.exists, "the link leaves login up")
        XCTAssertFalse(tabs.exists)
        still("link-03-login")

        try logIn()
        waitForTabs("Home after login")
        let order = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", number)).firstMatch
        XCTAssertTrue(order.waitForExistence(timeout: 20), "the order of the first link opens after login")
        still("link-04-order-after-login")
    }

    /// #1455: an older version was updated while a page was up: signed in, flag never set. The pages once, then Home.
    /// Install an older build, log in, stop on a page, install this build, run with TEST_RUNNER_E2E_UPDATED_ON_A_PAGE=1.
    func testAnUpdateOnAPageShowsThePagesOnceThenHome() throws {
        guard env["E2E_UPDATED_ON_A_PAGE"] == "1" else { throw XCTSkip("needs an older build stopped on a page") }
        app.launch()
        XCTAssertTrue(skipButton.waitForExistence(timeout: 30), "the pages")
        XCTAssertFalse(loginForm.exists, "still signed in")
        still("update-01-pages")
        skipButton.tap()
        waitForTabs("Home, no login")
        XCTAssertFalse(loginForm.exists)
        still("update-02-home")

        app.terminate()
        app.launch()
        dismissPrompts()
        XCTAssertTrue(tabs.waitForExistence(timeout: 30))
        XCTAssertFalse(nextButton.exists, "not twice")
        still("update-03-relaunch-home")
    }

    /// #1455: the session ends while a page is up (same state as above, and the account logged in somewhere else over curl first).
    /// Login takes over, then Home with no pages, now or at the next launch. TEST_RUNNER_E2E_SESSION_ENDED_ON_A_PAGE=1.
    func testASessionEndingOnAPageGoesToLoginThenHome() throws {
        guard env["E2E_SESSION_ENDED_ON_A_PAGE"] == "1" else { throw XCTSkip("needs an older build stopped on a page, and a second login") }
        app.launch()
        XCTAssertTrue(skipButton.waitForExistence(timeout: 30), "the pages, signed in")
        still("session-01-pages")
        // The first reads of the launch get the 401
        let deadline = Date().addingTimeInterval(30)
        while !loginForm.exists, Date() < deadline { sleep(1) }
        XCTAssertTrue(loginForm.exists, "the ended session opens login")
        still("session-02-login-with-reason")
        e2e.dismissAlerts()
        XCTAssertFalse(nextButton.exists, "no pages over login")

        try logIn()
        waitForTabs("Home after login")
        XCTAssertFalse(nextButton.exists, "no pages after login")
        still("session-03-home")

        app.terminate()
        app.launch()
        dismissPrompts()
        XCTAssertTrue(tabs.waitForExistence(timeout: 30))
        XCTAssertFalse(nextButton.exists, "no pages at the next launch either")
    }
}
