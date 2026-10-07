import XCTest
import UIKit
@testable import POS_ADBD

/// #430 — names cut short in order rows, and English "1 days" / "1 orders" / "Cart · 1 items"
final class Issue430Tests: XCTestCase {
    private func saleOrder(name: String, item: String = "Product 1 - Electronics") throws -> Order {
        let json = #"{"id":7,"orderNumber":"ORD-003-0022","orderType":"SALE","status":"COMPLETED","createdAt":"2026-10-05T03:00:00.000Z","updatedAt":"2026-10-05T03:00:00.000Z","customerName":"\#(name)","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B","totalAmount":148,"amountDue":0,"refundDue":0,"orderItems":[{"id":1,"productId":7,"productName":"\#(item)","quantity":1,"unitPrice":148,"totalPrice":148}]}"#
        return try JSONDecoder.shared.decode(Order.self, from: Data(json.utf8))
    }

    private func labels(in view: UIView) -> [UILabel] {
        view.subviews.flatMap { sub -> [UILabel] in ((sub as? UILabel).map { [$0] } ?? []) + labels(in: sub) }
    }

    // MARK: Row truncation

    func testRowShowsWholeNameBesidePayLine() throws {
        let name = "Nguyễn Văn Kiểm Thử"
        let cell = OrderRowCell(style: .default, reuseIdentifier: OrderRowCell.reuseId)
        cell.configure(.order(try saleOrder(name: name), lateDays: 0), context: .sale, hidesMoney: false)
        cell.frame = CGRect(x: 0, y: 0, width: 390, height: 120)
        let size = cell.contentView.systemLayoutSizeFitting(CGSize(width: 390, height: UIView.layoutFittingCompressedSize.height),
                                                            withHorizontalFittingPriority: .required,
                                                            verticalFittingPriority: .fittingSizeLevel)
        cell.frame.size.height = size.height
        cell.setNeedsLayout()
        cell.layoutIfNeeded()

        // #424: at the larger type scale a long name may wrap to two lines, but every word stays visible
        let nameLabel = try XCTUnwrap(labels(in: cell.contentView).first { $0.text == name })
        let needed = nameLabel.sizeThatFits(CGSize(width: nameLabel.bounds.width, height: .greatestFiniteMagnitude)).height
        XCTAssertLessThanOrEqual(needed, nameLabel.bounds.height + 0.5,
                                 "name cut: needs \(needed)pt height, has \(nameLabel.bounds.height)pt")
    }

    // MARK: Plurals

    func testPluralKeyPicksOneOnlyForOne() {
        XCTAssertEqual(PluralText.key("orders.v2.count", count: 1), "orders.v2.count.one")
        XCTAssertEqual(PluralText.key("orders.v2.count", count: 0), "orders.v2.count")
        XCTAssertEqual(PluralText.key("orders.v2.count", count: 2), "orders.v2.count")
    }

    private static let keys = [
        "orders.v2.count", "orders.v2.search.summary", "notPickedUp.chip", "orders.v2.filter.showCount",
        "products.cart.bar", "products.cart.days", "products.cart.calc.perDay",
        "%d days", "%@/day × %d days", "Return late %d days", "Hand-over late %d days", "Late fee (%d days)",
    ]

    func testEveryOneKeyExistsInBothLanguages() throws {
        for language in ["en", "vi-VN"] {
            let path = try XCTUnwrap(Bundle.main.path(forResource: language, ofType: "lproj"), language)
            let bundle = try XCTUnwrap(Bundle(path: path))
            for key in Self.keys {
                XCTAssertNotEqual(bundle.localizedString(forKey: key + ".one", value: "∅", table: nil), "∅", "\(language): \(key).one")
            }
        }
    }

    func testEnglishSingulars() throws {
        let en = try XCTUnwrap(Bundle(path: try XCTUnwrap(Bundle.main.path(forResource: "en", ofType: "lproj"))))
        func text(_ key: String, _ count: Int, _ args: CVarArg...) -> String {
            String(format: en.localizedString(forKey: PluralText.key(key, count: count), value: nil, table: nil), arguments: args)
        }
        XCTAssertEqual(text("orders.v2.count", 1, 1), "1 order")
        XCTAssertEqual(text("orders.v2.count", 3, 3), "3 orders")
        XCTAssertEqual(text("products.cart.bar", 1, 1), "Cart · 1 item")
        XCTAssertEqual(text("products.cart.bar", 2, 2), "Cart · 2 items")
        XCTAssertEqual(text("%d days", 1, 1), "1 day")
        XCTAssertEqual(text("notPickedUp.chip", 1, 1), "1 day past · call the customer")
        XCTAssertEqual(text("products.cart.days", 1, 1), "1 day")
        XCTAssertEqual(text("%@/day × %d days", 1, "104", 1), "104/day × 1 day")
        XCTAssertEqual(text("orders.v2.search.summary", 1, 1, "kiem"), "1 order matches “kiem” · all statuses, item names too")
        XCTAssertEqual(text("orders.v2.filter.showCount", 1, 1), "Show 1 order")
        XCTAssertEqual(text("Return late %d days", 1, 1), "Return late 1 day")
        XCTAssertEqual(text("Hand-over late %d days", 1, 1), "Hand-over late 1 day")
        XCTAssertEqual(text("Late fee (%d days)", 1, 1), "Late fee (1 day)")
    }
}
