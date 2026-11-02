//
//  WidgetHomeScreenUITests.swift
//  POS ADBDUITests
//
//  #1375: puts the AnyRent "Việc cần làm" widget on the Simulator home screen by driving SpringBoard, so the widget can be
//  looked at and photographed. Not part of a normal run: it skips unless E2E_WIDGET_SIZE is set (small | medium | home[N] | confirm), and
//  SpringBoard's controls change between iOS versions (written against iOS 26, English). Run it with:
//    TEST_RUNNER_E2E_WIDGET_SIZE=small xcodebuild test -only-testing:"POS ADBDUITests/WidgetHomeScreenUITests" ...
//  TEST_RUNNER_E2E_WIDGET_DUMP=1 prints SpringBoard's element tree when a control is not found.
//

import XCTest

final class WidgetHomeScreenUITests: XCTestCase {
    private let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func dump(_ why: String) {
        if ProcessInfo.processInfo.environment["E2E_WIDGET_DUMP"] != nil { print("WIDGET_DUMP \(why):\n\(springboard.debugDescription)") }
    }

    func testAddWidget() throws {
        guard let size = ProcessInfo.processInfo.environment["E2E_WIDGET_SIZE"] else { throw XCTSkip("set E2E_WIDGET_SIZE=small|medium") }
        if size == "confirm" { // `simctl openurl anyrent://...` asks "Open in AnyRent?": answer Open
            let open = springboard.alerts.buttons["Open"]
            XCTAssertTrue(open.waitForExistence(timeout: 8), "the Open in AnyRent? alert")
            open.tap()
            return
        }
        XCUIDevice.shared.press(.home)
        sleep(1)
        if size.hasPrefix("home") { // only go to the home screen (to photograph the widgets): "home", "home1" = one page to the left
            let pages = Int(size.dropFirst(4)) ?? 0 // negative = to the right
            for _ in 0..<abs(pages) {
                // A drag along the middle of the screen, away from the widgets (a plain swipe also scrolls)
                let screen = springboard.windows.firstMatch
                let from = screen.coordinate(withNormalizedOffset: CGVector(dx: pages > 0 ? 0.92 : 0.08, dy: 0.5))
                let to = screen.coordinate(withNormalizedOffset: CGVector(dx: pages > 0 ? 0.08 : 0.92, dy: 0.5))
                from.press(forDuration: 0.1, thenDragTo: to)
                sleep(1)
            }
            return
        }
        // Long press an empty spot of the first page until the icons wiggle
        let screen = springboard.windows.firstMatch
        screen.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.36)).press(forDuration: 1.8)
        sleep(1)
        let edit = springboard.buttons["Edit"]
        if !edit.waitForExistence(timeout: 5) { dump("no Edit button") }
        XCTAssertTrue(edit.exists, "Edit button")
        edit.tap()
        let addWidget = springboard.buttons["Add Widget"].exists ? springboard.buttons["Add Widget"] : springboard.menuItems["Add Widget"]
        if !addWidget.waitForExistence(timeout: 4) { dump("no Add Widget menu item") }
        XCTAssertTrue(addWidget.exists, "Add Widget menu item")
        addWidget.tap()
        // The gallery: search "AnyRent"
        let search = springboard.searchFields.firstMatch
        if !search.waitForExistence(timeout: 6) { dump("no widget search field") }
        XCTAssertTrue(search.exists, "widget search field")
        search.tap()
        search.typeText("AnyRent")
        sleep(1)
        let result = springboard.cells.containing(.staticText, identifier: "AnyRent").firstMatch.exists
            ? springboard.cells.containing(.staticText, identifier: "AnyRent").firstMatch
            : springboard.staticTexts["AnyRent"].firstMatch
        if !result.waitForExistence(timeout: 5) { dump("no AnyRent result") }
        XCTAssertTrue(result.exists, "AnyRent in the gallery")
        result.tap()
        sleep(1)
        // Pages: Việc cần làm small, medium (the Live Activity has no gallery page)
        if size == "medium" {
            springboard.windows.firstMatch.swipeLeft()
            sleep(1)
        }
        // The gallery sheet is not always in SpringBoard's element tree: fall back to the button's place at the bottom
        let add = springboard.buttons["Add Widget"]
        if add.waitForExistence(timeout: 3) {
            add.tap()
        } else {
            dump("no Add Widget button, tapping its place")
            screen.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.905)).tap()
        }
        sleep(1)
        let done = springboard.buttons["Done"]
        if done.waitForExistence(timeout: 4) { done.tap() }
        sleep(1)
        XCUIDevice.shared.press(.home)
    }
}
