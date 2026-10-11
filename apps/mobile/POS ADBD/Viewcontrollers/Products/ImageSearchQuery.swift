import UIKit

/// #654: the query photo sent to `POST /api/products/searchByImage`.
/// Same numbers on Android (`domain/products/ImageSearchQuery.kt`).
///
/// Why: the old ≤ 20 KB / quality-down-to-0.05 loop wiped out the lace and pattern detail the
/// model compares. The model looks at a small square anyway, so 512 px at 0.7 keeps the detail
/// and stays around 30–80 KB.
enum ImageSearchQuery {
    /// Longest side of the photo we send, in pixels
    static let maxLongSide: CGFloat = 512
    /// JPEG quality of the photo we send
    static let jpegQuality: CGFloat = 0.7
    /// The server gives up after 20 s with SEARCH_TIMEOUT; wait longer so that code reaches the app
    static let requestTimeout: TimeInterval = 30
    /// Success with no products (or an old server sending it as an error): show the empty state
    static let noMatchCode = "NO_PRODUCTS_FOUND"

    /// Pixel size to encode: the long side at most 512, aspect kept, never upscaled.
    static func targetSize(for pixelSize: CGSize) -> CGSize {
        let longSide = max(pixelSize.width, pixelSize.height)
        guard longSide > maxLongSide, pixelSize.width > 0, pixelSize.height > 0 else {
            return CGSize(width: pixelSize.width.rounded(), height: pixelSize.height.rounded())
        }
        let scale = maxLongSide / longSide
        return CGSize(width: max(1, (pixelSize.width * scale).rounded()),
                      height: max(1, (pixelSize.height * scale).rounded()))
    }

    /// The JPEG to upload: resized to [targetSize] (orientation applied), quality 0.7.
    static func jpegData(from image: UIImage) -> Data? {
        let pixels = CGSize(width: image.size.width * image.scale, height: image.size.height * image.scale)
        let size = targetSize(for: pixels)
        guard size.width >= 1, size.height >= 1 else { return nil }
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        format.opaque = true
        let resized = UIGraphicsImageRenderer(size: size, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }
        return UIImageJPEGRepresentation(resized, jpegQuality)
    }

    /// True when the API code means "nothing matched" rather than a failure.
    static func isNoMatch(code: String?) -> Bool {
        code?.uppercased() == noMatchCode
    }
}

/// #672: what the image-search results sheet shows. One list in API order (best first), no similarity
/// percentage; no matches shows the empty state with tips. Same rules on Android
/// (`domain/products/ImageSearchQuery.kt`, `ImageSearchResults`).
enum ImageSearchResults {
    enum Content: Equatable {
        case list
        case empty
    }

    static func content(count: Int) -> Content {
        count > 0 ? .list : .empty
    }

    /// "4 sản phẩm giống" / "1 similar product" / "Không thấy sản phẩm giống"
    static func titleKey(count: Int) -> String {
        switch count {
        case ...0: return "imageSearch.results.empty.title"
        case 1: return "imageSearch.results.title.one"
        default: return "imageSearch.results.title"
        }
    }

    static func title(count: Int) -> String {
        let key = titleKey(count: count)
        return count > 0 ? String(format: key.localized(), count) : key.localized()
    }

    /// The three tips of the empty state, in order
    static let tipKeys = [
        "imageSearch.empty.tip.whole",
        "imageSearch.empty.tip.background",
        "imageSearch.empty.tip.photo",
    ]

    /// Every key the sheet reads (tests check en and vi have them)
    static let stringKeys = [
        "imageSearch.results.title", "imageSearch.results.title.one", "imageSearch.results.empty.title",
        "imageSearch.results.subtitle", "imageSearch.action.retake", "imageSearch.action.searchByName",
        "imageSearch.empty.headline", "imageSearch.empty.message",
    ] + tipKeys
}
