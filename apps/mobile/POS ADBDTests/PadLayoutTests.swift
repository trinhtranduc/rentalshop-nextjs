import XCTest
@testable import POS_ADBD

/// #973 iPad landscape: the centered column, the form sheet size, the capped product photo, the popover anchor
/// that keeps action sheets from crashing on iPad, and the camera orientation for a landscape screen.
final class PadLayoutTests: XCTestCase {

    // MARK: Column

    func testColumnIsFullWidthOnIPhone() {
        for width: CGFloat in [320, 375, 393, 430, 440] {
            XCTAssertEqual(PadLayout.columnWidth(available: width), width)
            XCTAssertEqual(PadLayout.sideInset(available: width), 0)
        }
    }

    func testColumnIsCappedAndCenteredOnIPadLandscape() {
        // iPad Pro 13" and iPad mini in landscape
        XCTAssertEqual(PadLayout.columnWidth(available: 1376), 900)
        XCTAssertEqual(PadLayout.sideInset(available: 1376), 238)
        XCTAssertEqual(PadLayout.columnWidth(available: 1133), 900)
        XCTAssertEqual(PadLayout.sideInset(available: 1133), 116.5)
        XCTAssertEqual(PadLayout.columnWidth(available: 1376, max: 720), 720)
        XCTAssertEqual(PadLayout.columnWidth(available: -10), 0)
    }

    func testReadableColumnGuideLaysOut() {
        for (width, expected) in [(CGFloat(390), CGFloat(390)), (1376, 900), (1133, 900)] {
            let view = UIView(frame: CGRect(x: 0, y: 0, width: width, height: 800))
            let guide = view.readableColumn()
            XCTAssertTrue(view.readableColumn() === guide, "one guide per view")
            let child = UIView()
            view.addSubview(child)
            child.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                child.leadingAnchor.constraint(equalTo: guide.leadingAnchor),
                child.trailingAnchor.constraint(equalTo: guide.trailingAnchor),
                child.topAnchor.constraint(equalTo: view.topAnchor),
                child.heightAnchor.constraint(equalToConstant: 10),
            ])
            view.layoutIfNeeded()
            XCTAssertEqual(child.frame.width, expected, accuracy: 0.5, "width \(width)")
            XCTAssertEqual(child.frame.midX, width / 2, accuracy: 0.5, "centered at \(width)")
        }
    }

    // MARK: Form sheet and photo

    func testFormSheetFitsTheWindow() {
        XCTAssertEqual(PadLayout.formSheetSize(in: CGSize(width: 1376, height: 1032)), CGSize(width: 720, height: 900))
        // iPad mini landscape: shorter than the form, keeps a margin
        XCTAssertEqual(PadLayout.formSheetSize(in: CGSize(width: 1133, height: 744)), CGSize(width: 720, height: 680))
    }

    func testProductPhotoHeightIsCappedOnlyWhenWide() {
        XCTAssertEqual(PadLayout.heroHeight(width: 440), 440 * 0.62, accuracy: 0.01, "iPhone: unchanged")
        XCTAssertEqual(PadLayout.heroHeight(width: 900), 320)
    }

    // MARK: Popover anchor (iPad action sheets)

    func testAnchorKeepsAnExistingSource() {
        let host = UIViewController()
        let alert = UIAlertController(title: nil, message: nil, preferredStyle: .actionSheet)
        alert.modalPresentationStyle = .popover
        guard let popover = alert.popoverPresentationController else { return XCTFail("popover controller") }
        let row = UIView(frame: CGRect(x: 10, y: 20, width: 100, height: 44))
        popover.sourceView = row
        popover.anchor(to: nil, fallback: host.view)
        XCTAssertTrue(popover.sourceView === row)
    }

    func testAnchorFallsBackToTheMiddleOfTheScreen() {
        let host = UIViewController()
        host.view.frame = CGRect(x: 0, y: 0, width: 1376, height: 1032)
        let alert = UIAlertController(title: nil, message: nil, preferredStyle: .actionSheet)
        alert.modalPresentationStyle = .popover
        guard let popover = alert.popoverPresentationController else { return XCTFail("popover controller") }
        // A source that is not on screen (or nil) cannot anchor a popover
        popover.anchor(to: UIView(), fallback: host.view)
        XCTAssertTrue(popover.sourceView === host.view)
        XCTAssertEqual(popover.sourceRect, CGRect(x: 688, y: 516, width: 0, height: 0))
        XCTAssertEqual(popover.permittedArrowDirections, [])
    }

    func testAnchorUsesAVisibleSource() {
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 1376, height: 1032))
        let host = UIViewController()
        window.rootViewController = host
        window.isHidden = false
        let button = UIButton(frame: CGRect(x: 1200, y: 40, width: 44, height: 44))
        host.view.addSubview(button)
        let alert = UIAlertController(title: nil, message: nil, preferredStyle: .actionSheet)
        alert.modalPresentationStyle = .popover
        guard let popover = alert.popoverPresentationController else { return XCTFail("popover controller") }
        popover.anchor(to: button, fallback: host.view)
        XCTAssertTrue(popover.sourceView === button)
        XCTAssertEqual(popover.sourceRect, button.bounds)
        window.isHidden = true
    }

    // MARK: Camera

    func testCameraFollowsTheScreen() {
        XCTAssertEqual(CameraOrientation.rotationAngle(for: .portrait), 90, "iPhone: unchanged")
        XCTAssertEqual(CameraOrientation.rotationAngle(for: .landscapeRight), 0)
        XCTAssertEqual(CameraOrientation.rotationAngle(for: .landscapeLeft), 180)
        XCTAssertEqual(CameraOrientation.rotationAngle(for: .unknown), 90)
        XCTAssertEqual(CameraOrientation.imageOrientation(for: .portrait), .right, "iPhone: unchanged")
        XCTAssertEqual(CameraOrientation.imageOrientation(for: .landscapeRight), .up)
        XCTAssertEqual(CameraOrientation.imageOrientation(for: .landscapeLeft), .down)
    }

    func testOffScreenViewCountsAsPortrait() {
        XCTAssertEqual(CameraOrientation.interfaceOrientation(of: UIView()), .portrait)
    }

    // MARK: Info.plist

    func testIPadIsLandscapeOnlyAndFullScreen() {
        // The raw file: on an iPad, infoDictionary already resolves "key~ipad" into "key"
        let url = Bundle.main.bundleURL.appendingPathComponent("Info.plist")
        let info = NSDictionary(contentsOf: url) as? [String: Any] ?? [:]
        let pad = info["UISupportedInterfaceOrientations~ipad"] as? [String] ?? []
        XCTAssertEqual(Set(pad), ["UIInterfaceOrientationLandscapeLeft", "UIInterfaceOrientationLandscapeRight"])
        let phone = info["UISupportedInterfaceOrientations"] as? [String] ?? []
        XCTAssertTrue(phone.contains("UIInterfaceOrientationPortrait"), "iPhone stays portrait")
        XCTAssertFalse(phone.contains { $0.contains("Landscape") }, "iPhone stays portrait")
        XCTAssertEqual(info["UIRequiresFullScreen"] as? Bool, true, "landscape only needs full screen (no Split View)")
    }

    // MARK: Two panes (Orders, Settings) and Home grid + cart panel

    func testListPaneWidth() {
        XCTAssertEqual(PadSplit.primaryWidth(total: 1376), 440, "iPad Pro 13\"")
        XCTAssertEqual(PadSplit.primaryWidth(total: 1133), 1133 * 0.36, accuracy: 0.5, "iPad mini")
        XCTAssertEqual(PadSplit.primaryWidth(total: 900), 360, "never narrower than 360")
    }

    func testCartPanelWidth() {
        XCTAssertEqual(PadSplit.cartPanelWidth(total: 1376), 420)
        XCTAssertEqual(PadSplit.cartPanelWidth(total: 1133), 1133 * 0.32, accuracy: 0.5)
        XCTAssertEqual(PadSplit.cartPanelWidth(total: 1000), 360)
    }

    func testCartPanelShowsOnlyWithItems() {
        XCTAssertFalse(PadSplit.showsCartPanel(itemCount: 0))
        XCTAssertTrue(PadSplit.showsCartPanel(itemCount: 1))
    }

    /// "Tạo đơn" in the cart panel: the cart is not the top of the stack there, the Home split is (#973 bug)
    func testCartPanelIsInFrontWhenItsHomeSplitIsTop() {
        let cart = CartV2ViewController()
        cart.isPanel = true
        let split = HomeCartSplitViewController(home: ProductsHomeViewController())
        split.addChildViewController(cart)
        let nav = UINavigationController(rootViewController: split)
        XCTAssertTrue(PadSplit.cartIsInFront(cart, top: nav.topViewController))
        nav.pushViewController(UIViewController(), animated: false)
        XCTAssertFalse(PadSplit.cartIsInFront(cart, top: nav.topViewController), "a screen pushed over Home")
    }

    func testFullCartIsInFrontOnlyWhenTop() {
        let cart = CartV2ViewController()
        let nav = UINavigationController(rootViewController: UIViewController())
        nav.pushViewController(cart, animated: false)
        XCTAssertTrue(PadSplit.cartIsInFront(cart, top: nav.topViewController), "iPhone and the full cart: as before")
        nav.pushViewController(UIViewController(), animated: false)
        XCTAssertFalse(PadSplit.cartIsInFront(cart, top: nav.topViewController))
        XCTAssertFalse(PadSplit.cartIsInFront(cart, top: nil))
    }

    func testGridColumnsByWidth() {
        XCTAssertEqual(HomeGrid.columns(width: 390), 1, "iPhone: the list")
        XCTAssertEqual(HomeGrid.columns(width: 599), 1)
        XCTAssertEqual(HomeGrid.columns(width: 1376), 4, "iPad Pro 13\" without the cart")
        XCTAssertEqual(HomeGrid.columns(width: 1376 - 420), 3, "with the cart panel")
        XCTAssertEqual(HomeGrid.columns(width: 1133), 3, "iPad mini")
        XCTAssertEqual(HomeGrid.columns(width: 1133 - 362), 2, "iPad mini with the cart panel")
        XCTAssertEqual(HomeGrid.columns(width: 3000), 4, "at most 4")
    }

    func testGridRowsAndIndices() {
        XCTAssertEqual(HomeGrid.rows(count: 0, columns: 3), 0)
        XCTAssertEqual(HomeGrid.rows(count: 7, columns: 3), 3)
        XCTAssertEqual(HomeGrid.rows(count: 6, columns: 3), 2)
        XCTAssertEqual(HomeGrid.indices(row: 0, columns: 3, count: 7), 0..<3)
        XCTAssertEqual(HomeGrid.indices(row: 2, columns: 3, count: 7), 6..<7)
        XCTAssertEqual(HomeGrid.indices(row: 5, columns: 3, count: 7), 7..<7)
        XCTAssertEqual(HomeGrid.rows(count: 5, columns: 1), 5, "one column = one product per row")
    }

    func testPushFromListOpensInTheDetailPane() {
        let list = UIViewController()
        let split = PadSplitViewController(primary: list, emptyText: "pick one", symbol: "doc.text")
        split.loadViewIfNeeded()
        XCTAssertNil(split.detail, "empty state first")
        let detail = UIViewController()
        detail.hidesBottomBarWhenPushed = true
        list.navigationController?.pushViewController(detail, animated: false)
        XCTAssertTrue(split.detail === detail, "shown on the right")
        XCTAssertEqual(list.navigationController?.viewControllers.count, 1, "the list stays")
        XCTAssertFalse(detail.hidesBottomBarWhenPushed, "the tabs stay on iPad")
        let next = UIViewController()
        list.navigationController?.pushViewController(next, animated: false)
        XCTAssertTrue(split.detail === next, "a new pick replaces the detail")
        XCTAssertEqual(split.secondaryNav.viewControllers.count, 2, "empty state + one detail")
        // A screen opened from the detail stacks inside the detail pane
        let deeper = UIViewController()
        next.navigationController?.pushViewController(deeper, animated: false)
        XCTAssertTrue(split.detail === deeper)
        XCTAssertEqual(split.secondaryNav.viewControllers.count, 3)
        split.clearDetail()
        XCTAssertNil(split.detail)
    }

    func testRowWidthEstimate() {
        let screen = UIScreen.main.bounds.width
        if UIDevice.current.userInterfaceIdiom == .pad {
            XCTAssertEqual(PadLayout.rowWidthEstimate, PadSplit.primaryWidth(total: screen), "the Orders list pane")
        } else {
            XCTAssertEqual(PadLayout.rowWidthEstimate, screen, "iPhone: unchanged")
        }
    }

    func testUnwrapFindsTheScreenInsideAPane() {
        let list = UIViewController()
        let split = PadSplitViewController(primary: list, emptyText: "x", symbol: "doc.text")
        let nav = UINavigationController(rootViewController: split)
        XCTAssertTrue(PadSplit.unwrap(nav) === list)
        XCTAssertTrue(PadSplit.unwrap(split) === list)
        let plain = UIViewController()
        XCTAssertTrue(PadSplit.unwrap(UINavigationController(rootViewController: plain)) === plain, "iPhone: unchanged")
        XCTAssertTrue(PadSplit.unwrap(plain) === plain)
        XCTAssertNil(PadSplit.unwrap(nil))
    }
}

