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
}
