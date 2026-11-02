import XCTest
@testable import POS_ADBD

/// #396 — board icon sizes (canvas px = icon box) map to SF Symbol point sizes
final class IconTokensTests: XCTestCase {
    func testTokensAreTheBoardSizes() {
        XCTAssertEqual(DS.Icon.sm, 18)
        XCTAssertEqual(DS.Icon.md, 20)
        XCTAssertEqual(DS.Icon.lg, 22)
    }

    func testPointSizeIsTheMeasuredFactorRoundedToHalfPoints() {
        XCTAssertEqual(DS.Icon.pointFactor, 0.78, accuracy: 0.0001)
        XCTAssertEqual(DS.symbolPointSize(for: DS.Icon.sm), 14)
        XCTAssertEqual(DS.symbolPointSize(for: DS.Icon.md), 15.5)
        XCTAssertEqual(DS.symbolPointSize(for: DS.Icon.lg), 17)
        XCTAssertEqual(DS.symbolPointSize(for: 16), 12.5)
    }

    private func button(_ id: String, in view: UIView) -> UIButton? {
        if view.accessibilityIdentifier == id { return view as? UIButton }
        return view.subviews.lazy.compactMap { self.button(id, in: $0) }.first
    }

    /// #1438: the hand-over block shows the note editor's one tile beside the photos until 3/3, and no other photo button
    func testHandOverBlockShowsTheNoteTileUntilFull() throws {
        let photo = try XCTUnwrap(UIImage(systemName: "photo")?.pngData())
        for count in 0...2 {
            let block = OrderPhotoBlockView(photos: Array(repeating: photo, count: count), presenter: UIViewController())
            let tile = try XCTUnwrap(button("orderPhotos.add", in: block), "\(count) photos")
            XCTAssertEqual(tile.configuration?.image, DS.symbol("camera", DS.Icon.lg))
            XCTAssertEqual(tile.configuration?.title, "notes.v2.add".localized())
            XCTAssertEqual(tile.accessibilityLabel, AddPhotoTile.make().accessibilityLabel)
            XCTAssertNil(button("orderPhotos.camera", in: block))
            XCTAssertNil(button("orderPhotos.library", in: block))
        }
        let full = OrderPhotoBlockView(photos: Array(repeating: photo, count: 3), presenter: UIViewController())
        XCTAssertNil(button("orderPhotos.add", in: full), "3/3 hides the tile")
        XCTAssertNotNil(button("orderPhotos.remove.2", in: full), "× stays")
    }

    /// #1438: the "Thêm" tile of the order detail draws the same camera
    func testDetailAddTileDrawsTheNoteCamera() {
        let row = OrderPhotoSection.content(title: "", urls: [], waiting: [], id: "t", onOpen: { _ in }, onAdd: { _ in })
        XCTAssertEqual(button("t.add", in: row)?.configuration?.image, DS.addPhotoIcon)
    }

    func testWideGlyphsGetTheirOpticalCorrection() {
        XCTAssertEqual(DS.symbolPointSize(for: DS.Icon.md, name: "camera"), 12.5)
        XCTAssertEqual(DS.symbolPointSize(for: DS.Icon.md, name: "camera.fill"), 12.5)
        XCTAssertEqual(DS.symbolPointSize(for: DS.Icon.md, name: "barcode.viewfinder"), 15.5)
        XCTAssertEqual(DS.symbolPointSize(for: DS.Icon.sm, name: "chevron.right"), 12.5)
    }

    func testSymbolIsSmallerThanTheOldFontSizedGlyph() throws {
        let sized = try XCTUnwrap(DS.symbol("bell", DS.Icon.lg))
        let old = try XCTUnwrap(UIImage(systemName: "bell", withConfiguration: UIImage.SymbolConfiguration(pointSize: 22)))
        XCTAssertLessThan(sized.size.height, old.size.height)
        XCTAssertLessThanOrEqual(sized.size.height, DS.Icon.lg)
    }
}
