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
