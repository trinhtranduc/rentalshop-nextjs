import XCTest
@testable import POS_ADBD

/// #654: the image-search query photo is 512 px on the long side at JPEG 0.7 (same numbers as the
/// Android `ImageSearchQueryTest`), the five search codes have vi/en text, and NO_PRODUCTS_FOUND is
/// the empty state.
final class ImageSearchQueryTests: XCTestCase {
    func testNumbersMatchAndroid() {
        XCTAssertEqual(ImageSearchQuery.maxLongSide, 512)
        XCTAssertEqual(ImageSearchQuery.jpegQuality, 0.7, accuracy: 0.0001)
        XCTAssertGreaterThanOrEqual(ImageSearchQuery.requestTimeout, 25)
    }

    func testTargetSizeKeepsAspectAndCapsLongSide() {
        XCTAssertEqual(ImageSearchQuery.targetSize(for: CGSize(width: 4032, height: 3024)), CGSize(width: 512, height: 384))
        XCTAssertEqual(ImageSearchQuery.targetSize(for: CGSize(width: 3024, height: 4032)), CGSize(width: 384, height: 512))
        XCTAssertEqual(ImageSearchQuery.targetSize(for: CGSize(width: 1080, height: 1080)), CGSize(width: 512, height: 512))
        XCTAssertEqual(ImageSearchQuery.targetSize(for: CGSize(width: 1920, height: 1080)), CGSize(width: 512, height: 288))
    }

    func testTargetSizeNeverUpscales() {
        XCTAssertEqual(ImageSearchQuery.targetSize(for: CGSize(width: 400, height: 300)), CGSize(width: 400, height: 300))
        XCTAssertEqual(ImageSearchQuery.targetSize(for: CGSize(width: 512, height: 100)), CGSize(width: 512, height: 100))
    }

    func testJpegDataIsResizedJpeg() throws {
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        let source = UIGraphicsImageRenderer(size: CGSize(width: 2000, height: 1000), format: format).image { ctx in
            UIColor.red.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: 1000, height: 1000))
            UIColor.blue.setFill()
            ctx.fill(CGRect(x: 1000, y: 0, width: 1000, height: 1000))
        }
        let data = try XCTUnwrap(ImageSearchQuery.jpegData(from: source))
        XCTAssertEqual(Array(data.prefix(2)), [0xFF, 0xD8])
        let decoded = try XCTUnwrap(UIImage(data: data))
        XCTAssertEqual(decoded.size.width * decoded.scale, 512)
        XCTAssertEqual(decoded.size.height * decoded.scale, 256)
    }

    func testNoProductsFoundIsTheEmptyState() {
        XCTAssertTrue(ImageSearchQuery.isNoMatch(code: "NO_PRODUCTS_FOUND"))
        XCTAssertTrue(ImageSearchQuery.isNoMatch(code: "no_products_found"))
        XCTAssertFalse(ImageSearchQuery.isNoMatch(code: "SEARCH_FAILED"))
        XCTAssertFalse(ImageSearchQuery.isNoMatch(code: nil))
    }

    func testSearchCodesHaveLocalizedText() throws {
        let codes = ["SEARCH_FAILED", "SEARCH_TIMEOUT", "INVALID_LIMIT", "INVALID_MIN_SIMILARITY", "NO_PRODUCTS_FOUND"]
        let bundle = Bundle(for: ImageSearchViewController.self)
        for lang in ["en", "vi-VN"] {
            let path = try XCTUnwrap(bundle.path(forResource: "Localizable", ofType: "strings", inDirectory: nil,
                                                 forLocalization: lang), lang)
            let table = try XCTUnwrap(NSDictionary(contentsOfFile: path) as? [String: String], lang)
            for code in codes {
                XCTAssertNotNil(APIErrorCode(from: code), code)
                let text = try XCTUnwrap(table[code], "\(lang) \(code)")
                XCTAssertFalse(text.isEmpty)
                XCTAssertNotEqual(text, code)
            }
        }
        XCTAssertEqual(APIErrorResponse(success: false, code: "SEARCH_TIMEOUT", message: "raw", error: nil).localizedMessage,
                       APIErrorCode.searchTimeout.defaultMessage)
    }
}
