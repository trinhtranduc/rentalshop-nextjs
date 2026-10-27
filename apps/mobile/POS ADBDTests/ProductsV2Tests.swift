import UIKit
import XCTest
@testable import POS_ADBD

/// #373 — role rules, product prices, form validation, cart totals, error mapping, barcode match, list paging
final class ProductsV2Tests: XCTestCase {

    // MARK: - Helpers

    private func product(_ json: String) throws -> Product {
        try JSONDecoder.shared.decode(Product.self, from: json.data(using: .utf8)!)
    }

    private func item(price: Double, qty: Int = 1, deposit: Double = 0, options: [PricingOption]? = nil) -> CartItem {
        var item = CartItem(productId: 1, productName: "Áo dài", barcode: nil, quantity: qty, price: price, deposit: deposit,
                            originalRentPrice: price, originalSalePrice: 900_000)
        item.pricingOptions = options
        item.pricingType = "FIXED"
        return item
    }

    private let fixed = PricingOption(id: 1, type: "FIXED", price: 300_000, isDefault: true, isActive: true)
    private let daily = PricingOption(id: 2, type: "DAILY", price: 120_000, isDefault: false, isActive: true)

    // MARK: - Roles

    // MARK: - Home row price line (#681)

    func testRowPriceShowsTheDefaultOptionFirstAndTheOtherSecond() throws {
        let rentalDefault = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"pricingOptions":[{"id":1,"type":"FIXED","price":300000,"isDefault":true},{"id":2,"type":"DAILY","price":120000,"isDefault":false}]}"#)
        XCTAssertEqual(ProductRowLogic.price(rentalDefault),
                       ProductRowPrice(main: 300_000, mainMode: .perRental, second: 120_000, secondMode: .perDay))
        let dayDefault = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"pricingOptions":[{"id":1,"type":"FIXED","price":300000,"isDefault":false},{"id":2,"type":"DAILY","price":120000,"isDefault":true}]}"#)
        XCTAssertEqual(ProductRowLogic.price(dayDefault),
                       ProductRowPrice(main: 120_000, mainMode: .perDay, second: 300_000, secondMode: .perRental))
    }

    func testRowPriceWithOneOptionHasNoSecondAndSaleOnlyHasNoMode() throws {
        let rentalOnly = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"salePrice":900000}"#)
        XCTAssertEqual(ProductRowLogic.price(rentalOnly), ProductRowPrice(main: 300_000, mainMode: .perRental, second: nil, secondMode: nil, sale: 900_000))
        let dayOnly = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"pricingOptions":[{"id":2,"type":"DAILY","price":120000,"isDefault":true}]}"#)
        XCTAssertEqual(ProductRowLogic.price(dayOnly), ProductRowPrice(main: 120_000, mainMode: .perDay, second: nil, secondMode: nil))
        let saleOnly = try product(#"{"id":1,"name":"Áo dài","rentPrice":0,"salePrice":900000}"#)
        XCTAssertEqual(ProductRowLogic.price(saleOnly), ProductRowPrice(main: 900_000, mainMode: nil, second: nil, secondMode: nil))
        let none = try product(#"{"id":1,"name":"Áo dài","rentPrice":0}"#)
        XCTAssertNil(ProductRowLogic.price(none))
    }

    /// #887: a product that is rented and sold keeps "· bán <price>" after its rent prices (board SP-dong)
    func testRowPriceKeepsTheSalePriceNextToRentPrices() throws {
        let both = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"salePrice":1800000,"pricingOptions":[{"id":1,"type":"FIXED","price":300000,"isDefault":true},{"id":2,"type":"DAILY","price":120000,"isDefault":false}]}"#)
        XCTAssertEqual(ProductRowLogic.price(both),
                       ProductRowPrice(main: 300_000, mainMode: .perRental, second: 120_000, secondMode: .perDay, sale: 1_800_000))
        let dayOnly = try product(#"{"id":1,"name":"Áo dài","rentPrice":120000,"salePrice":1800000,"pricingOptions":[{"id":2,"type":"DAILY","price":120000,"isDefault":true}]}"#)
        XCTAssertEqual(ProductRowLogic.price(dayOnly)?.sale, 1_800_000)
        // Legacy `sale_price` (older payloads) counts too
        let legacy = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"sale_price":1800000}"#)
        XCTAssertEqual(ProductRowLogic.price(legacy)?.sale, 1_800_000)
        // No sale price, or zero: nothing after the rent prices
        let noSale = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"salePrice":null}"#)
        XCTAssertNil(ProductRowLogic.price(noSale)?.sale)
        let zeroSale = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"salePrice":0}"#)
        XCTAssertNil(ProductRowLogic.price(zeroSale)?.sale)
        // A sale-only product keeps today's "bán <price>" as the main text, not twice
        let saleOnly = try product(#"{"id":1,"name":"Áo dài","rentPrice":0,"salePrice":900000}"#)
        XCTAssertNil(ProductRowLogic.price(saleOnly)?.sale)
    }

    /// #887: the edit form fills the sale field from `salePrice` or legacy `sale_price`, so a save that leaves
    /// the field alone sends the same price back (the update sends `salePrice: input ?? 0`)
    func testEditFormSaleFieldIsFilledFromSalePriceOrLegacySale() throws {
        let modern = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"salePrice":1800000}"#)
        XCTAssertEqual(MoneyInput.parse(MoneyInput.display(ProductPricing.sale(modern))), 1_800_000)
        let legacy = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"sale_price":1800000}"#)
        XCTAssertEqual(MoneyInput.parse(MoneyInput.display(ProductPricing.sale(legacy))), 1_800_000)
        let nullModern = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"salePrice":null,"sale_price":1800000}"#)
        XCTAssertEqual(MoneyInput.parse(MoneyInput.display(ProductPricing.sale(nullModern))), 1_800_000)
    }

    /// #887: "Giá vốn" on detail only when > 0 and the role may see prices (never OUTLET_STAFF)
    func testCostPriceShownOnlyWhenSetAndPricesAreVisible() throws {
        let withCost = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"costPrice":700000}"#)
        XCTAssertEqual(ProductCostPrice.shown(withCost, showsPrices: true), 700_000)
        XCTAssertNil(ProductCostPrice.shown(withCost, showsPrices: false))
        let zero = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"costPrice":0}"#)
        XCTAssertNil(ProductCostPrice.shown(zero, showsPrices: true))
        let none = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"costPrice":null}"#)
        XCTAssertNil(ProductCostPrice.shown(none, showsPrices: true))
    }

    // MARK: - Home cart bar and add feedback (#893)

    /// #893 (owner): "+" shows no success toast. #952: the floating cart bar is gone; the top-right button says the count
    func testHomeAddShowsNoToastAndCartButtonSaysTheCount() {
        XCTAssertFalse(HomeCartButton.showsAddedToast)
        XCTAssertNil(HomeCartButton.accessibilityValue(itemCount: 0))
        XCTAssertEqual(HomeCartButton.accessibilityValue(itemCount: 2), PluralText.format("products.cart.bar", count: 2, 2))
    }

    // MARK: - Cart swipe to delete (#893)

    /// #893 (owner): swiping a cart line right-to-left reveals a red "Xoá"; a full swipe deletes at once
    func testSwipeDeleteOutcome() {
        let width: CGFloat = 375
        XCTAssertEqual(SwipeDeleteLogic.outcome(offset: -10, width: width, velocity: 0), .close)
        XCTAssertEqual(SwipeDeleteLogic.outcome(offset: -60, width: width, velocity: 0), .open)
        XCTAssertEqual(SwipeDeleteLogic.outcome(offset: -240, width: width, velocity: 0), .delete, "past 60% of the width")
        XCTAssertEqual(SwipeDeleteLogic.outcome(offset: -100, width: width, velocity: -1600), .delete, "a fast fling deletes")
        XCTAssertEqual(SwipeDeleteLogic.outcome(offset: 20, width: width, velocity: 0), .close, "left to right never deletes")
        XCTAssertEqual(SwipeDeleteLogic.clamped(-500, width: width), -width)
        XCTAssertEqual(SwipeDeleteLogic.clamped(30, width: width), 0)
        let vi = Bundle(for: OrderRowCell.self).path(forResource: "vi-VN", ofType: "lproj").flatMap(Bundle.init(path:))
        XCTAssertEqual(vi?.localizedString(forKey: "cart.swipe.delete", value: nil, table: nil), "Xoá")
    }

    /// #893: removing a line updates the item count and the totals
    func testCartRemoveLineUpdatesTotals() {
        let cart = Cart()
        cart.addItem(CartItem(productId: 1, productName: "Áo dài", barcode: nil, quantity: 1, price: 300_000, deposit: 0,
                              originalRentPrice: 300_000, originalSalePrice: 0))
        cart.addItem(CartItem(productId: 2, productName: "Vest", barcode: nil, quantity: 2, price: 100_000, deposit: 0,
                              originalRentPrice: 100_000, originalSalePrice: 0))
        let before = cart.subtotalAmount
        cart.removeItem(at: 0)
        XCTAssertEqual(cart.items.map(\.productId), [2])
        XCTAssertEqual(cart.itemCount, 2)
        XCTAssertLessThan(cart.subtotalAmount, before)
    }

    // MARK: - Product orders × qty (#891)

    func testProductQuantityInAnOrder() throws {
        let json = #"{"id":1,"orderNumber":"9","orderType":"RENT","status":"RESERVED","createdAt":"2026-10-01T03:00:00.000Z","updatedAt":"2026-10-01T03:00:00.000Z","customerName":"Huy","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B","totalAmount":1,"orderItems":[{"id":1,"quantity":2,"unitPrice":1,"totalPrice":2,"productId":7,"productName":"Vest"},{"id":2,"quantity":1,"unitPrice":1,"totalPrice":1,"productId":8,"productName":"Cà vạt"},{"id":3,"quantity":1,"unitPrice":1,"totalPrice":1,"productId":7,"productName":"Vest"}]}"#
        let order = try JSONDecoder.shared.decode(Order.self, from: Data(json.utf8))
        XCTAssertEqual(ProductDetailV2Logic.quantity(of: 7, in: order), 3)
        XCTAssertEqual(ProductDetailV2Logic.quantity(of: 8, in: order), 1)
        XCTAssertEqual(ProductDetailV2Logic.quantity(of: 99, in: order), 1, "list without the item: 1")
    }

    // MARK: - Cart cost (#888, hidden in the cart since #1007)

    /// #888: a cart line carries the product's cost; a cart saved before #888 (no key) still decodes
    func testCartLineTakesTheProductCost() throws {
        let withCost = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000,"costPrice":800000}"#)
        XCTAssertEqual(CartItem(from: withCost, quantity: 1, price: 300_000).costPrice, 800_000)
        let staffView = try product(#"{"id":1,"name":"Áo dài","rentPrice":300000}"#)
        XCTAssertNil(CartItem(from: staffView, quantity: 1, price: 300_000).costPrice)
        let saved = try JSONEncoder().encode(item(price: 300_000))
        var json = try JSONSerialization.jsonObject(with: saved) as! [String: Any]
        json.removeValue(forKey: "costPrice")
        let old = try JSONDecoder().decode(CartItem.self, from: JSONSerialization.data(withJSONObject: json))
        XCTAssertNil(old.costPrice)
    }

    /// #1007 (owner 2026-10-17): the cart never shows cost price ("Giá vốn", "Tổng giá vốn", "Lãi dự kiến") for any
    /// role, because the cart is shown to the customer. The cart strings are gone; the line still carries `costPrice`.
    func testCartShowsNoCostPrice() {
        for key in ["products.cart.cost", "products.cart.totalCost", "products.cart.profit"] {
            XCTAssertEqual(Bundle.main.localizedString(forKey: key, value: nil, table: nil), key, "\(key) should be removed")
        }
    }

    /// #887: the form sends the typed cost; an empty field sends 0 only when the product had a cost (the user cleared
    /// it), so a product read without `costPrice` (list payload) never loses its cost on save
    func testCostPriceSentOnSaveNeverWipesAnUnknownCost() {
        XCTAssertEqual(ProductCostPrice.toSend(typed: 650_000, original: 700_000), 650_000)
        XCTAssertEqual(ProductCostPrice.toSend(typed: 700_000, original: nil), 700_000)
        XCTAssertEqual(ProductCostPrice.toSend(typed: nil, original: 700_000), 0)
        XCTAssertNil(ProductCostPrice.toSend(typed: nil, original: nil))
        XCTAssertNil(ProductCostPrice.toSend(typed: nil, original: 0))
    }

    /// #887: an update without a cost leaves `costPrice` out of the form data, so the API keeps the stored value
    func testUpdateWithoutCostDoesNotSendCostPrice() {
        let request = UpdateProductRequest(name: "Áo dài", description: nil, barcode: nil, rentPrice: 300_000, salePrice: 1_800_000,
                                           costPrice: nil, deposit: 0, totalStock: nil, categoryId: nil, merchantId: nil,
                                           outletStock: nil, images: nil, isActive: nil)
        XCTAssertNil(request.toFormData()["costPrice"])
        XCTAssertEqual(request.toFormData()["salePrice"] as? Double, 1_800_000)
    }

    // MARK: - Full-screen photos (#472)

    func testViewerUrlsUseImagesWithoutBlanksElseImageUrl() throws {
        var p = try product(#"{"id":1,"name":"Áo dài","images":["https://x/a.jpg"," ","https://x/b.jpg"]}"#)
        XCTAssertEqual(ProductImages.viewerUrls(p), ["https://x/a.jpg", "https://x/b.jpg"])
        p.images = ["", "  "]
        p.image_url = "https://x/avatar.jpg"
        XCTAssertEqual(ProductImages.viewerUrls(p), ["https://x/avatar.jpg"])
        p.image_url = " "
        XCTAssertEqual(ProductImages.viewerUrls(p), [])
    }

    func testThumbnailTapOpensViewerAtTheThumbnailPhoto() throws {
        var p = try product(#"{"id":1,"name":"Áo dài","images":["https://x/a.jpg","https://x/b.jpg"]}"#)
        XCTAssertEqual(ProductImages.thumbnailTap(p), ProductImageViewerRequest(urls: ["https://x/a.jpg", "https://x/b.jpg"], startIndex: 0))
        p.image_url = "https://x/b.jpg"
        XCTAssertEqual(ProductImages.thumbnailTap(p)?.startIndex, 1)
        // A thumbnail URL outside the list still opens the viewer, at the first photo
        p.image_url = "https://x/other.jpg"
        XCTAssertEqual(ProductImages.thumbnailTap(p)?.startIndex, 0)
    }

    func testThumbnailTapWithoutPhotoFallsBackToRow() throws {
        var p = try product(#"{"id":1,"name":"Áo dài"}"#)
        XCTAssertNil(ProductImages.thumbnailUrl(p))
        XCTAssertNil(ProductImages.thumbnailTap(p))
        p.image_url = ""
        XCTAssertNil(ProductImages.thumbnailTap(p))
    }

    func testDetailTapStartsAtTheVisiblePageClamped() throws {
        let p = try product(#"{"id":1,"name":"Áo dài","images":["https://x/a.jpg","https://x/b.jpg","https://x/c.jpg"]}"#)
        XCTAssertEqual(ProductImages.detailTap(p, page: 1)?.startIndex, 1)
        XCTAssertEqual(ProductImages.detailTap(p, page: 9)?.startIndex, 2)
        XCTAssertEqual(ProductImages.detailTap(p, page: -1)?.startIndex, 0)
        XCTAssertNil(ProductImages.detailTap(try product(#"{"id":2,"name":"Váy"}"#), page: 0))
    }

    func testImageViewerShowsOnePagePerPhotoAndClampsStart() {
        let viewer = ImageViewerViewController(urls: ["https://x/a.jpg", "https://x/b.jpg"], startIndex: 5)
        viewer.loadViewIfNeeded()
        let pager = viewer.view.subviews.compactMap { $0 as? UIScrollView }.first
        XCTAssertEqual(pager?.subviews.filter { $0 is UIScrollView }.count, 2)
        XCTAssertEqual(viewer.modalPresentationStyle, .overFullScreen)
        let counter = viewer.view.subviews.compactMap { $0 as? UILabel }.first
        XCTAssertEqual(counter?.text?.trimmingCharacters(in: .whitespaces), "2/2")
        XCTAssertEqual(counter?.isHidden, false)
    }

    func testOutletStaffSeesNoPriceFieldsAndCannotEdit() {
        let staffPerms = ["products.view", "products.create", "orders.view"]
        XCTAssertFalse(ProductAccess.showsPriceFields(role: .outletStaff, permissions: staffPerms))
        XCTAssertFalse(ProductAccess.canEdit(role: .outletStaff, permissions: staffPerms))
        XCTAssertTrue(ProductAccess.canCreate(role: .outletStaff, permissions: staffPerms))
        // Even a stray permission does not give staff the price fields or edit
        XCTAssertFalse(ProductAccess.showsPriceFields(role: .outletStaff, permissions: ["products.manage"]))
        XCTAssertFalse(ProductAccess.canEdit(role: .outletStaff, permissions: ["products.manage"]))
    }

    // MARK: - Nhân viên kho (#682)

    func testInventoryStaffManagesProductsAndCategoriesButHidesMoneyLikeStaff() throws {
        let perms = ["outlet.view", "products.view", "products.create", "products.update", "products.manage",
                     "products.export", "orders.create", "orders.view", "orders.update", "customers.view", "customers.manage"]
        XCTAssertEqual(Role(rawValue: "OUTLET_INVENTORY"), .outletInventory)
        XCTAssertTrue(ProductAccess.canCreate(role: .outletInventory, permissions: perms))
        XCTAssertTrue(ProductAccess.canEdit(role: .outletInventory, permissions: perms))
        XCTAssertTrue(ProductAccess.canDelete(role: .outletInventory, permissions: perms))
        XCTAssertTrue(ProductAccess.showsPriceFields(role: .outletInventory, permissions: perms))
        XCTAssertTrue(CategoryRules.canAdd(role: .outletInventory, permissions: perms))
        XCTAssertTrue(CategoryRules.canManage(role: .outletInventory))
        XCTAssertFalse(CategoryRules.canManage(role: .outletAdmin))
        XCTAssertTrue(Role.outletInventory.isStaffLike)
        XCTAssertFalse(Role.outletAdmin.isStaffLike)
        XCTAssertTrue(OrdersHomeLogic.hidesMoney(role: .outletInventory, hideForStaff: true))
        XCTAssertFalse(OrdersHomeLogic.hidesMoney(role: .outletInventory, hideForStaff: false))
        XCTAssertTrue(ChangeHistoryLogic.isStaff("OUTLET_INVENTORY"))
        XCTAssertFalse(ChangeHistoryLogic.canView("OUTLET_INVENTORY"))
    }

    /// #1061: the item note line (empty or filled) and the TIỀN edit rows show the same blue pencil, after the text
    func testCartUsesOnePencil() throws {
        let money = V2ValueRow(title: "Giảm giá", editable: true)
        let empty = CartNoteEntry(note: nil, emptyTitle: "Ghi chú")
        let filled = CartNoteEntry(note: "Sửa eo 2cm", emptyTitle: "Ghi chú")
        let icon = try XCTUnwrap(DS.editIcon(size: V2.editPencilSize))
        XCTAssertEqual(icon.size, CGSize(width: V2.editPencilSize, height: V2.editPencilSize))
        XCTAssertEqual(icon.renderingMode, .alwaysTemplate)
        let reference = try XCTUnwrap(icon.pngData())
        XCTAssertEqual(V2.editPencil().image?.pngData(), reference)
        for pencil in [money.pencil, empty.pencil, filled.pencil] {
            XCTAssertEqual(pencil.image?.pngData(), reference)
            XCTAssertEqual(pencil.tintColor, DS.Color.primary)
            XCTAssertFalse(pencil.isHidden)
        }
        // empty: "Ghi chú" in blue (blue = tappable); filled: the note in #334155
        XCTAssertEqual(empty.textLabel.textColor, DS.Color.primary)
        XCTAssertEqual(filled.textLabel.text, "Sửa eo 2cm")
        XCTAssertEqual(filled.textLabel.textColor, UIColor(hexString: "334155"))
        // the text first, the pencil after it, no other icon
        for entry in [empty, filled] {
            let row = try XCTUnwrap(entry.subviews.first as? UIStackView)
            XCTAssertEqual(row.arrangedSubviews, [entry.textLabel, entry.pencil])
        }
    }

    /// #1024 (option A): the cart's icons, the item note on one line, and what VoiceOver reads
    func testCartIconsAndItemNoteLine() throws {
        XCTAssertEqual(CartV2Icon.addItem.rawValue, "plus.circle")
        // #1061 (owner: "đổi icon edit không giống", "icon đúng mockup"): one pen-line for every edit in the cart,
        // drawn by DS.editIcon (SF `pencil.line` needs iOS 17)
        XCTAssertEqual(CartV2Icon.edit.rawValue, "pen-line")
        XCTAssertEqual(CartV2Icon.itemNote, .edit)
        XCTAssertEqual(CartV2Icon.orderNote, .edit)
        XCTAssertNotNil(UIImage(systemName: CartV2Icon.addItem.rawValue), "addItem is an SF Symbol")
        // nil = the entry shows "Ghi chú"; a note is one line (the button cuts it with "…")
        XCTAssertNil(CartV2Logic.itemNoteLine(nil))
        XCTAssertNil(CartV2Logic.itemNoteLine(" \n\t "))
        XCTAssertEqual(CartV2Logic.itemNoteLine("  Sửa eo 2cm "), "Sửa eo 2cm")
        XCTAssertEqual(CartV2Logic.itemNoteLine("Tặng kèm\n size M\r\n\ngiao trước 9h\n"), "Tặng kèm size M giao trước 9h")
        let long = String(repeating: "Giao trước 9h ", count: 20)
        XCTAssertEqual(CartV2Logic.itemNoteLine(long), long.trimmingCharacters(in: .whitespaces), "the text is whole; the button truncates it")
        // VoiceOver: "Ghi chú cho <product>" and the note, as before the icon
        let empty = CartV2Logic.itemNoteSpoken(productName: "Áo dài", note: "  ")
        XCTAssertEqual(empty.label, String(format: "cart.itemNote.accessibility".localized(), "Áo dài"))
        XCTAssertTrue(empty.label.contains("Áo dài"))
        XCTAssertNil(empty.value)
        XCTAssertEqual(CartV2Logic.itemNoteSpoken(productName: "Áo dài", note: " Size M ").value, "Size M")
        XCTAssertNotEqual("products.cart.addItem.accessibility".localized(), "products.cart.addItem.accessibility", "Thêm món is localized")
    }

    /// #1043: the order note uses the item note sheet: photos (#480) only on a new order, and its own strings
    func testOrderNoteSheetPhotosAndStrings() throws {
        XCTAssertEqual(CartV2Logic.orderNoteMaxPhotos(editMode: false), 5)
        XCTAssertEqual(CartV2Logic.orderNoteMaxPhotos(editMode: false), OrderDetailLogic.maxNotePhotos)
        XCTAssertEqual(CartV2Logic.orderNoteMaxPhotos(editMode: true), 0, "editing an order stays text only")
        // the cart entry shows the order note on one line, like an item note
        XCTAssertEqual(CartV2Logic.itemNoteLine("Giao trước 9h\nKhách lấy tại tiệm"), "Giao trước 9h Khách lấy tại tiệm")
        for key in ["cart.orderNote.title", "cart.orderNote.placeholder", "cart.orderNote.hint"] {
            XCTAssertNotEqual(key.localized(), key, "\(key) is localized")
        }
        XCTAssertNotEqual("cart.orderNote.title".localized(), "cart.itemNote.title".localized())
    }

    /// #1056: the cart line's price link must not fade. A `.system` button fades a new attributed title in, and the
    /// cart builds a new link on every render (2–3 renders while it opens): the price vanished and came back
    func testCartPricingLinkIsASteadyCustomButton() {
        let link = CartV2ViewController.pricingLinkButton(amount: "200.000đ", unit: "theo lần")
        XCTAssertEqual(link.buttonType, .custom, "a .system button fades its title in on each render")
        XCTAssertEqual(link.attributedTitle(for: .normal)?.string, "200.000đ / theo lần")
        XCTAssertEqual(link.contentHorizontalAlignment, .leading)
        XCTAssertNotNil(link.image(for: .normal), "the ⌄ stays")
        XCTAssertNotNil(link.attributedTitle(for: .highlighted), "a tap still dims the link, as the .system button did")
        let empty = CartV2ViewController.pricingLinkButton(amount: nil, unit: "theo lần")
        XCTAssertEqual(empty.attributedTitle(for: .normal)?.string,
                       "products.cart.pricing.enterPrice".localized() + " / theo lần")
    }

    /// #1056: the same availability answer changes nothing and posts nothing (each post rebuilt every cart row)
    func testSameAvailabilityDoesNotNotifyTheCart() {
        let cart = Cart()
        cart.addItem(CartItem(productId: 7, productName: "Áo dài", barcode: nil, quantity: 1, price: 300_000, deposit: 0,
                              originalRentPrice: 300_000, originalSalePrice: 0))
        let status = AvailabilityStatus(isAvailable: true, available: 3)
        XCTAssertTrue(cart.updateAvailabilityStatus(for: 7, status: status), "nil → loaded is a change")
        XCTAssertFalse(cart.updateAvailabilityStatus(for: 7, status: status), "the same answer again is not")
        XCTAssertTrue(cart.updateAvailabilityStatus(for: 7, status: AvailabilityStatus(isAvailable: true, available: 2)))
        XCTAssertFalse(cart.updateAvailabilityStatus(for: 99, status: status), "no line of that product")

        let saved = CartStore.shared.cart
        defer { CartStore.shared.replaceCart(with: saved, notify: false) }
        CartStore.shared.replaceCart(with: cart, notify: false)
        var posts = 0
        let token = NotificationCenter.default.addObserver(forName: .cartStoreDidChange, object: nil, queue: nil) { _ in posts += 1 }
        defer { NotificationCenter.default.removeObserver(token) }
        CartStore.shared.updateAvailabilityStatus(for: 7, status: AvailabilityStatus(isAvailable: true, available: 2))
        XCTAssertEqual(posts, 0, "unchanged availability does not redraw the cart")
        CartStore.shared.updateAvailabilityStatus(for: 7, status: AvailabilityStatus(isAvailable: false, available: 0))
        XCTAssertEqual(posts, 1)
    }

    /// #1056 (owner: "note cần xuống dòng"): a note shows in full, its own line breaks kept, blank lines dropped
    func testNoteShownKeepsTheLines() {
        XCTAssertNil(CartV2Logic.noteShown(nil))
        XCTAssertNil(CartV2Logic.noteShown(" \n\t "))
        XCTAssertEqual(CartV2Logic.noteShown("  Giao 9h \n\n Khách lấy tại tiệm  "), "Giao 9h\nKhách lấy tại tiệm")
        let long = String(repeating: "Giao trước 9h ", count: 20).trimmingCharacters(in: .whitespaces)
        XCTAssertEqual(CartV2Logic.noteShown(long), long, "never cut")
    }

    /// #1056: the item note line wraps (it was one line cut with "…"); empty it reads "Ghi chú"
    func testItemNoteEntryWraps() {
        let note = "Giao trước 9h sáng thứ 7\nKhách lấy tại tiệm, gọi trước 30 phút"
        let entry = CartNoteEntry(note: note, emptyTitle: "Ghi chú")
        XCTAssertEqual(entry.textLabel.numberOfLines, 0)
        XCTAssertEqual(entry.textLabel.text, note)
        XCTAssertTrue(entry.accessibilityTraits.contains(.button))
        XCTAssertEqual(CartNoteEntry(note: "  ", emptyTitle: "Ghi chú").textLabel.text, "Ghi chú")
    }

    /// #1056: the order note row in TIỀN wraps its text on the right; money rows stay one line
    func testOrderNoteRowWraps() {
        let row = V2ValueRow(title: "Ghi chú", editable: true, wrapsValue: true)
        XCTAssertEqual(row.valueLabel.numberOfLines, 0)
        XCTAssertEqual(row.valueLabel.textAlignment, .right)
        XCTAssertEqual(V2ValueRow(title: "Giảm giá", editable: true).valueLabel.numberOfLines, 1)
    }

    /// #1056 (owner: "style present note view nên giống nhau"): the order and item note sheets are one sheet —
    /// same detent and corners; only the order note on a new order has the photo row
    func testOrderAndItemNoteSheetsAreTheSame() {
        let item = CartItemNoteSheet(productName: "Áo dài", note: nil)
        let order = CartItemNoteSheet.orderNote(note: "Giao 9h", photos: [], editMode: false)
        let editing = CartItemNoteSheet.orderNote(note: nil, photos: [], editMode: true)
        for sheet in [item, order, editing] {
            XCTAssertEqual(sheet.sheetPresentationController?.detents, [.large()])
            XCTAssertEqual(sheet.sheetPresentationController?.preferredCornerRadius, 24)
        }
        XCTAssertEqual(item.maxPhotos, 0)
        XCTAssertEqual(order.maxPhotos, CartV2Logic.orderNoteMaxPhotos(editMode: false))
        XCTAssertEqual(editing.maxPhotos, 0, "editing an order stays text only")
        XCTAssertEqual(order.titleText, "cart.orderNote.title".localized())
        XCTAssertEqual(item.titleText, "cart.itemNote.title".localized())
    }

    /// #1056 (owner, mockup cartmoney): TIỀN — blue value + pencil = tappable, black = read only (Android CartMoneyRowsTest)
    func testCartMoneyRowsBlueMeansTappable() throws {
        XCTAssertFalse(CartMoneyRow.subtotal.isEditable)
        XCTAssertFalse(CartMoneyRow.total.isEditable)
        XCTAssertTrue(CartMoneyRow.discount.isEditable)
        XCTAssertTrue(CartMoneyRow.deposit.isEditable)
        XCTAssertTrue(CartMoneyRow.note.isEditable)
        XCTAssertEqual(CartV2Logic.moneyRowTone(.subtotal), .plain)
        XCTAssertEqual(CartV2Logic.moneyRowTone(.total), .plain)
        XCTAssertEqual(CartV2Logic.moneyRowTone(.discount), .action, "a discount of 0 is blue too")
        XCTAssertEqual(CartV2Logic.moneyRowTone(.deposit), .action)
        XCTAssertEqual(CartV2Logic.moneyRowTone(.note, note: nil), .action, "empty note: blue Thêm")
        XCTAssertEqual(CartV2Logic.moneyRowTone(.note, note: " \n "), .action)
        XCTAssertEqual(CartV2Logic.moneyRowTone(.note, note: "Khách lấy lúc 9h"), .noteText)
        XCTAssertEqual(CartV2Logic.discountShown(0), 0)
        XCTAssertEqual(CartV2Logic.discountShown(-5), 0)
        XCTAssertEqual(CartV2Logic.discountShown(50_000), -50_000)
        let edit = "products.detail.edit".localized()
        XCTAssertEqual(CartV2Logic.moneyRowSpoken(value: "0đ"), "0đ, \(edit)")
        XCTAssertEqual(CartV2Logic.moneyRowSpoken(value: "Khách lấy lúc 9h", photos: "2 ảnh"), "Khách lấy lúc 9h, 2 ảnh, \(edit)")
        for key in ["products.cart.note", "products.cart.addNote", "products.detail.edit"] {
            XCTAssertNotEqual(key.localized(), key, "\(key) is localized")
        }
    }

    /// #1056: the editable row has no ›, a blue bold value and a blue pencil; VoiceOver: title, then "value, Sửa"
    func testEditableValueRowLooksTappable() throws {
        let row = V2ValueRow(title: "Giảm giá", editable: true)
        row.valueLabel.text = "0đ"
        XCTAssertTrue(row.chevron.isHidden, "no › on an editable row")
        XCTAssertFalse(row.pencil.isHidden)
        XCTAssertEqual(row.pencil.tintColor, DS.Color.primary)
        XCTAssertEqual(row.valueLabel.textColor, DS.Color.primary)
        XCTAssertTrue(row.valueLabel.font.fontDescriptor.symbolicTraits.contains(.traitBold))
        XCTAssertTrue(row.accessibilityTraits.contains(.button))
        XCTAssertEqual(row.accessibilityLabel, "Giảm giá")
        XCTAssertEqual(row.accessibilityValue, CartV2Logic.moneyRowSpoken(value: "0đ"))
        let plain = V2ValueRow(title: "Tổng cộng", chevron: false)
        XCTAssertTrue(plain.pencil.isHidden, "read-only rows have no pencil")
        XCTAssertTrue(plain.chevron.isHidden)
    }

    func testInventoryRoleIsPickedOnlyWhenTheApiAllowsIt() throws {
        XCTAssertEqual(UserFormRoles.choices(inventoryRole: false, currentRole: nil), [.outletStaff, .outletAdmin])
        XCTAssertEqual(UserFormRoles.choices(inventoryRole: true, currentRole: nil), [.outletStaff, .outletAdmin, .outletInventory])
        XCTAssertEqual(UserFormRoles.choices(inventoryRole: false, currentRole: .outletInventory).last, .outletInventory)
        // #684: an item note is trimmed; a blank one clears it
        XCTAssertNil(CartV2Logic.noteText(nil))
        XCTAssertNil(CartV2Logic.noteText("  \n "))
        XCTAssertEqual(CartV2Logic.noteText("  Sửa eo 2cm \n"), "Sửa eo 2cm")
        // #684: no role until one is picked; every pickable role has a one-line explanation
        XCTAssertFalse(UserFormRoles.isComplete(nil))
        XCTAssertTrue(UserFormRoles.isComplete(.outletStaff))
        for role in UserFormRoles.choices(inventoryRole: true, currentRole: nil) {
            XCTAssertFalse(UserFormRoles.help(role).isEmpty, "\(role) has a help line")
            XCTAssertNotEqual(UserFormRoles.help(role), "users.role.help.\(role)", "\(role) help is localized")
        }
        let on = try JSONDecoder().decode(AppConfig.self, from: Data(#"{"features":{},"inventoryRole":true}"#.utf8))
        XCTAssertTrue(on.inventoryRole)
        let old = try JSONDecoder().decode(AppConfig.self, from: Data(#"{"features":{}}"#.utf8))
        XCTAssertFalse(old.inventoryRole)
    }

    func testMerchantAndOutletAdminManagePrices() {
        for role in [Role.merchant, .outletAdmin] {
            XCTAssertTrue(ProductAccess.showsPriceFields(role: role, permissions: ["products.manage"]))
            XCTAssertTrue(ProductAccess.canEdit(role: role, permissions: ["products.manage"]))
            XCTAssertTrue(ProductAccess.canCreate(role: role, permissions: ["products.manage"]))
        }
        XCTAssertFalse(ProductAccess.showsPriceFields(role: .merchant, permissions: ["products.view"]))
        XCTAssertFalse(ProductAccess.canCreate(role: .merchant, permissions: ["products.view"]))
    }

    // MARK: - Prices and stock

    func testPricesFromOptionsAndLegacyFields() throws {
        let withOptions = try product("""
        {"id":7,"name":"Vest","rentPrice":300000,"salePrice":2500000,"totalStock":3,"available":2,
         "pricingOptions":[{"id":1,"type":"FIXED","price":300000,"isDefault":false},{"id":2,"type":"DAILY","price":150000,"isDefault":true}]}
        """)
        XCTAssertEqual(ProductPricing.perRental(withOptions), 300_000)
        XCTAssertEqual(ProductPricing.perDay(withOptions), 150_000)
        XCTAssertEqual(ProductPricing.sale(withOptions), 2_500_000)
        XCTAssertEqual(ProductPricing.defaultMode(withOptions), .perDay)
        XCTAssertEqual(ProductStock.counts(withOptions), ProductStockCounts(total: 3, rented: 1, free: 2))

        let legacyDaily = try product(#"{"id":8,"name":"Váy","rentPrice":90000,"pricingType":"DAILY","salePrice":0}"#)
        XCTAssertNil(ProductPricing.perRental(legacyDaily))
        XCTAssertEqual(ProductPricing.perDay(legacyDaily), 90_000)
        XCTAssertNil(ProductPricing.sale(legacyDaily))
    }

    func testStockOfOneOutletRow() throws {
        let p = try product("""
        {"id":9,"name":"Giày","totalStock":7,"outletStock":[
          {"outletId":2,"stock":5,"renting":2,"available":3,"outlet":{"id":2,"name":"A"}},
          {"stock":2,"renting":0,"available":2,"outlet":{"id":4,"name":"B"}}]}
        """)
        XCTAssertEqual(ProductStock.counts(p, outletId: 2), ProductStockCounts(total: 5, rented: 2, free: 3))
        XCTAssertEqual(ProductStock.counts(p, outletId: 4), ProductStockCounts(total: 2, rented: 0, free: 2))
        XCTAssertEqual(ProductOutletChoice.outletId(userOutletId: nil, product: p, merchantOutlets: []), 2)
        XCTAssertEqual(ProductOutletChoice.outletId(userOutletId: 4, product: p, merchantOutlets: []), 4)
        XCTAssertEqual(ProductOutletChoice.outletId(userOutletId: nil, product: nil,
                                                    merchantOutlets: [(id: 2, isDefault: false), (id: 4, isDefault: true)]), 4)
    }

    func testPricingOptionsSentOnSave() {
        let both = ProductPricing.options(perRental: 300_000, perDay: 120_000, defaultMode: .perDay)
        XCTAssertEqual(both.map { $0.type }, ["FIXED", "DAILY"])
        XCTAssertEqual(both.filter { $0.isDefault }.map { $0.type }, ["DAILY"])
        // A default without a price falls back to the mode that has one
        let onlyFixed = ProductPricing.options(perRental: 300_000, perDay: nil, defaultMode: .perDay)
        XCTAssertEqual(onlyFixed.map { $0.type }, ["FIXED"])
        XCTAssertTrue(onlyFixed[0].isDefault)
        XCTAssertTrue(ProductPricing.options(perRental: nil, perDay: nil, defaultMode: .perRental).isEmpty)
    }

    // MARK: - Form validation

    private func input(name: String = "Áo", perRental: Double? = 100_000, perDay: Double? = nil, mode: ProductPricingMode = .perRental,
                       deposit: Double? = nil, quantity: Int = 1, rented: Int = 0, photos: Int = 0, showsPrices: Bool = true) -> ProductFormInput {
        ProductFormInput(name: name, perRental: perRental, perDay: perDay, defaultMode: mode, salePrice: nil, deposit: deposit,
                         quantity: quantity, rented: rented, photoCount: photos, showsPrices: showsPrices)
    }

    func testFormValidation() {
        XCTAssertEqual(ProductFormValidator.validate(input()), [])
        XCTAssertEqual(ProductFormValidator.validate(input(name: "   ")), [.nameRequired])
        XCTAssertEqual(ProductFormValidator.validate(input(mode: .perDay)), [.perDayDefaultNeedsPrice])
        XCTAssertEqual(ProductFormValidator.validate(input(perDay: 50_000, mode: .perDay)), [])
        XCTAssertEqual(ProductFormValidator.validate(input(deposit: -1)), [.negativeAmount])
        XCTAssertEqual(ProductFormValidator.validate(input(quantity: -1)), [.negativeQuantity])
        XCTAssertEqual(ProductFormValidator.validate(input(quantity: 2, rented: 3)), [.quantityBelowRented(3)])
        XCTAssertEqual(ProductFormValidator.validate(input(quantity: 3, rented: 3)), [])
        XCTAssertEqual(ProductFormValidator.validate(input(photos: 6)), [.tooManyPhotos(5)])
        // Staff: price rules do not apply (no price fields)
        XCTAssertEqual(ProductFormValidator.validate(input(perRental: nil, mode: .perDay, showsPrices: false)), [])
    }

    func testMoneyInput() {
        XCTAssertEqual(MoneyInput.parse("1.250.000"), 1_250_000)
        XCTAssertNil(MoneyInput.parse(""))
        XCTAssertNil(MoneyInput.parse(nil))
        XCTAssertEqual(MoneyInput.display(1_250_000), "1.250.000")
        XCTAssertEqual(MoneyInput.display(0), "0")
        XCTAssertEqual(MoneyInput.display(nil), "")
    }

    // MARK: - Cart totals

    func testRentPerRentalVersusPerDay() {
        let cart = Cart()
        cart.orderType = .rent
        cart.addItem(item(price: 300_000, qty: 2, deposit: 100_000, options: [fixed, daily]))
        let pickup = ISO8601DateFormatter().date(from: "2026-10-03T00:00:00Z")!
        cart.pickupPlanAt = pickup
        cart.returnPlanAt = pickup.addingTimeInterval(2 * 86_400 + 3_600) // 3 civil days in UTC/VN

        var line = CartV2Logic.calc(cart.items[0], orderType: .rent)
        XCTAssertEqual(line.unit, .perRental)
        XCTAssertEqual(line.total, 600_000)
        XCTAssertEqual(cart.subtotalAmount, 600_000)
        XCTAssertTrue(CartV2Logic.offersBothModes(cart.items[0]))

        cart.selectPricingType(at: 0, type: "DAILY")
        cart.syncRentalDaysFromDates()
        line = CartV2Logic.calc(cart.items[0], orderType: .rent)
        XCTAssertEqual(line.unit, .perDay(days: cart.items[0].rentalDays))
        XCTAssertEqual(line.unitPrice, 120_000)
        XCTAssertEqual(line.total, 120_000 * 2 * Double(cart.items[0].rentalDays))
        XCTAssertEqual(cart.subtotalAmount, line.total)

        // Rent collects the prepaid deposit now; discount lowers the order total
        XCTAssertEqual(CartV2Logic.collectNow(cart), 200_000)
        cart.discount = 50_000
        XCTAssertEqual(cart.totalAmount, line.total - 50_000)
        XCTAssertEqual(CartV2Logic.collectNow(cart), 200_000)
    }

    func testSaleCollectsTheTotal() {
        let cart = Cart()
        cart.orderType = .sale
        var sold = item(price: 850_000, qty: 2, deposit: 100_000, options: [fixed])
        sold.pricingType = "DAILY" // ignored for a sale
        cart.addItem(sold)
        let line = CartV2Logic.calc(cart.items[0], orderType: .sale)
        XCTAssertEqual(line.unit, .sale)
        XCTAssertEqual(line.total, 1_700_000)
        XCTAssertFalse(CartV2Logic.offersBothModes(cart.items[0]))
        cart.discount = 10
        cart.discountType = .percentage
        XCTAssertEqual(CartV2Logic.collectNow(cart), 1_530_000)
    }

    /// #1054 (owner): "Chỉ còn 1 trống…" in red read as out of stock; some units free = amber (#1032 palette),
    /// none free = red as before
    func testShortageToneAmberWhenSomeUnitsFree() {
        XCTAssertEqual(CartV2Logic.shortageTone(left: 1), .low)
        XCTAssertEqual(CartV2Logic.shortageTone(left: 3), .low)
        XCTAssertEqual(CartV2Logic.shortageTone(left: 0), .none)

        let low = CartV2ViewController.shortageStyle(.low)
        XCTAssertEqual(low.colors.text, DS.Status.waiting.text)
        XCTAssertEqual(low.colors.fill, DS.Status.waiting.fill)
        XCTAssertEqual(low.colors.text, UIColor(hexString: "9A3412"))
        XCTAssertEqual(low.colors.fill, UIColor(hexString: "FFEDD5"))
        XCTAssertEqual(low.weight, .semibold) // #1132: soft pill, semibold

        let none = CartV2ViewController.shortageStyle(.none)
        XCTAssertEqual(none.colors.text, UIColor(hexString: "991B1B"))
        XCTAssertEqual(none.colors.fill, UIColor(hexString: "FEE2E2"))
        XCTAssertEqual(none.weight, .semibold)
    }

    /// #1132 (owner, mockup A): the status is a pill — the tone's fill behind, a 7 pt dot in the text colour, the text
    func testStockPillHasFillDotAndText() {
        let pill = CartV2ViewController.stockPill(text: "Còn 1", tone: .low)
        XCTAssertEqual(pill.backgroundColor, UIColor(hexString: "FFEDD5"))
        pill.layoutIfNeeded()
        let labels = pill.subviews.flatMap { [$0] + $0.subviews }.compactMap { $0 as? UILabel }
        XCTAssertEqual(labels.first?.text, "Còn 1", "the text has no glyph dot any more")
        XCTAssertEqual(labels.first?.textColor, UIColor(hexString: "9A3412"))
        let dots = pill.subviews.flatMap { [$0] + $0.subviews }.filter { $0.accessibilityIdentifier == "cart.stockPill.dot" }
        XCTAssertFalse(dots.isEmpty, "a round dot sits before the text")
        XCTAssertEqual(CartV2ViewController.stockPill(text: "Còn 3", tone: .ok).backgroundColor, UIColor(hexString: "DCFCE7"))
        XCTAssertEqual(CartV2ViewController.stockPill(text: "Hết", tone: .none).backgroundColor, UIColor(hexString: "FEE2E2"))
    }

    /// #1064 (owner): 0 free = "Hết đồ" / "Hết hàng" in red; 1 free (or fewer than asked) = amber; 2+ free and enough
    /// for the cart = green "Còn N". Short texts ("text còn trống dài quá"); VoiceOver reads the long one. Nothing
    /// until availability loads
    func testAvailabilityNoteByFreeCount() {
        typealias Note = CartV2Logic.AvailabilityNote
        func note(_ available: Int?, _ asked: Int, _ rent: Bool) -> Note? {
            CartV2Logic.availabilityNote(available: available, asked: asked, isRent: rent)
        }
        XCTAssertNil(note(nil, 1, true))
        XCTAssertNil(note(nil, 1, false))

        // 0: red
        XCTAssertEqual(note(0, 1, true), Note(key: "products.cart.bookedOut", spokenKey: "products.cart.unavailableRent", count: 0, tone: .none))
        XCTAssertEqual(note(-2, 1, true), Note(key: "products.cart.bookedOut", spokenKey: "products.cart.unavailableRent", count: 0, tone: .none))
        XCTAssertEqual(note(0, 1, false), Note(key: "products.cart.outOfStock", spokenKey: "products.cart.outOfStock", count: 0, tone: .none))
        // 1 free, 1 asked: amber "Còn 1"
        XCTAssertEqual(note(1, 1, true), Note(key: "products.cart.left", spokenKey: "products.cart.freeRent", count: 1, tone: .low))
        XCTAssertEqual(note(1, 1, false), Note(key: "products.cart.left", spokenKey: "products.cart.inStock", count: 1, tone: .low))
        // fewer than asked: amber "Chỉ còn N" (2 free but 3 in the cart cannot be filled → amber, not green)
        XCTAssertEqual(note(1, 3, false), Note(key: "products.cart.onlyLeft", spokenKey: "products.cart.shortStock", count: 1, tone: .low))
        XCTAssertEqual(note(2, 3, true), Note(key: "products.cart.onlyLeft", spokenKey: "products.cart.shortRent", count: 2, tone: .low))
        XCTAssertEqual(note(2, 3, false), Note(key: "products.cart.onlyLeft", spokenKey: "products.cart.shortStock", count: 2, tone: .low))
        // 2+ and enough: green "Còn N"
        XCTAssertEqual(note(2, 2, true), Note(key: "products.cart.left", spokenKey: "products.cart.freeRent", count: 2, tone: .ok))
        XCTAssertEqual(note(5, 1, true), Note(key: "products.cart.left", spokenKey: "products.cart.freeRent", count: 5, tone: .ok))
        XCTAssertEqual(note(5, 1, false), Note(key: "products.cart.left", spokenKey: "products.cart.inStock", count: 5, tone: .ok))

        // Every text exists, reads the count, and the shown one is short
        for n in [note(0, 1, true), note(0, 1, false), note(1, 1, true), note(2, 3, true), note(4, 1, true), note(4, 1, false)].compactMap({ $0 }) {
            XCTAssertNotEqual(n.text, n.key)
            XCTAssertNotEqual(n.spoken, n.spokenKey)
            if n.count > 0 {
                XCTAssertTrue(n.text.contains("\(n.count)"))
                XCTAssertTrue(n.spoken.contains("\(n.count)"))
            }
            XCTAssertFalse(n.text.contains("trong ngày") || n.text.contains("on these dates"), n.text)
            XCTAssertLessThanOrEqual(n.text.count, 14, n.text)
        }

        // Green reuses the "done" token, same weight as amber
        let ok = CartV2ViewController.shortageStyle(.ok)
        XCTAssertEqual(ok.colors.text, UIColor(hexString: "166534")) // #1132
        XCTAssertEqual(ok.colors.fill, UIColor(hexString: "DCFCE7"))
        XCTAssertEqual(ok.weight, .semibold)
    }

    func testShortageAndRentalDays() {
        var line = item(price: 1, qty: 2)
        XCTAssertNil(CartV2Logic.shortage(line))
        line.availabilityStatus = AvailabilityStatus(isAvailable: false, available: 1)
        XCTAssertEqual(CartV2Logic.shortage(line), 1)
        line.availabilityStatus = AvailabilityStatus(isAvailable: true, available: 2)
        XCTAssertNil(CartV2Logic.shortage(line))

        let vietnam = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
        let iso = ISO8601DateFormatter()
        // Same civil day still counts one day; 23:30 VN on 03/10 to 00:30 VN on 05/10 is 3 days (03, 04, 05)
        XCTAssertEqual(CartV2Logic.rentalDays(pickup: iso.date(from: "2026-10-03T01:00:00Z")!,
                                              return: iso.date(from: "2026-10-03T10:00:00Z")!, timeZone: vietnam), 1)
        XCTAssertEqual(CartV2Logic.rentalDays(pickup: iso.date(from: "2026-10-03T16:30:00Z")!,
                                              return: iso.date(from: "2026-10-04T17:30:00Z")!, timeZone: vietnam), 3)
        XCTAssertEqual(CartV2Logic.rentalDays(pickup: iso.date(from: "2026-10-03T16:30:00Z")!,
                                              return: iso.date(from: "2026-10-04T17:30:00Z")!,
                                              timeZone: TimeZone(identifier: "UTC")!), 2)
    }

    /// #433: "+ Add" in the cart opens the product list, not the customer page the cart came from
    func testCartAddMoreOpensProductsHome() {
        XCTAssertEqual(CartV2Logic.addMoreRoute(previousIsProductsHome: true), .pop)
        XCTAssertEqual(CartV2Logic.addMoreRoute(previousIsProductsHome: false), .openHomeTab)
    }

    // MARK: - Errors and barcode

    func testStockBelowRentedMapsToItsOwnMessage() {
        let response = APIErrorResponse(success: false, code: "STOCK_BELOW_RENTED",
                                        message: "Stock cannot be lower than the number of units currently rented out.", error: nil)
        XCTAssertEqual(response.errorCode, .stockBelowRented)
        XCTAssertEqual(response.httpStatusCode, 400)
        XCTAssertEqual(response.localizedMessage, "STOCK_BELOW_RENTED".localized())
        XCTAssertNotEqual(response.localizedMessage, "STOCK_BELOW_RENTED")
        XCTAssertEqual(response.toNSError().localizedDescription, response.localizedMessage)
    }

    /// #994: last 8 clock digits + 3 random digits, same as the web form
    func testGeneratedBarcodeIsEightClockDigitsPlusThreeRandom() {
        XCTAssertEqual(ProductBarcode.generate(now: 1_759_000_123_456, random: 42), "00123456042")
        XCTAssertEqual(ProductBarcode.generate(now: 1_759_000_123_456, random: 999), "00123456999")
        XCTAssertEqual(ProductBarcode.generate(now: 42, random: 7), "00000042007")
    }

    func testBarcodeKeepsOnlyAnExactMatch() throws {
        let byName = try product(#"{"id":1,"name":"AD-0123 áo","barcode":"XYZ"}"#)
        let exact = try product(#"{"id":2,"name":"Áo dài","barcode":" ad-012 "}"#)
        XCTAssertEqual(BarcodeMatch.exact("AD-012", in: [byName, exact])?.id, 2)
        XCTAssertNil(BarcodeMatch.exact("AD-01", in: [byName, exact]))
        XCTAssertNil(BarcodeMatch.exact("  ", in: [exact]))
    }

    // MARK: - Home row (#383)

    func testCartCountSumsTheLinesOfOneProduct() throws {
        let other = CartItem(productId: 7, productName: "Vest", barcode: nil, quantity: 3, price: 100, deposit: 0,
                             originalRentPrice: 100, originalSalePrice: 0)
        let items = [item(price: 100, qty: 2), other]
        XCTAssertEqual(ProductRowLogic.cartCount(productId: 1, in: items), 2)
        XCTAssertEqual(ProductRowLogic.cartCount(productId: 7, in: items), 3)
        XCTAssertEqual(ProductRowLogic.cartCount(productId: 99, in: items), 0)
        XCTAssertEqual(ProductRowLogic.cartCount(productId: 1, in: []), 0)
        XCTAssertEqual(ProductRowLogic.cartId(try product(#"{"id":12,"name":"A"}"#)), 12)
    }

    func testRowSubtitleIsCodeAndStockWithoutCategory() throws {
        let withCode = try product(#"{"id":1,"name":"Áo dài","barcode":" AD-012 ","category":{"id":3,"name":"Áo dài"},"available":3,"stock":3}"#)
        let subtitle = ProductRowLogic.subtitle(withCode)
        XCTAssertEqual(subtitle, ProductRowSubtitle(code: "AD-012", free: 3))
        XCTAssertNil(ProductRowLogic.subtitle(try product(#"{"id":2,"name":"B","barcode":"  ","available":0}"#)).code)
        XCTAssertNil(ProductRowLogic.subtitle(try product(#"{"id":3,"name":"C","barcode":"null"}"#)).code)
        XCTAssertEqual(ProductRowLogic.subtitle(try product(#"{"id":4,"name":"D","available":0}"#)).free, 0)
    }

    func testAddButtonState() {
        XCTAssertEqual(ProductRowLogic.addState(free: 3, inCart: 0), .add)
        XCTAssertEqual(ProductRowLogic.addState(free: 3, inCart: 2), .inCart(2))
        XCTAssertEqual(ProductRowLogic.addState(free: 0, inCart: 0), .out)
        XCTAssertEqual(ProductRowLogic.addState(free: 0, inCart: 2), .inCart(2)) // #677: in-cart wins
    }

    // MARK: - List paging

    private final class FakeSource: ProductsHomeDataSource {
        var calls: [(query: String?, page: Int, completion: (ProductsPage?, NSError?) -> Void)] = []
        func loadProducts(query: String?, page: Int, limit: Int,
                          completion: @escaping (ProductsPage?, NSError?) -> Void) {
            calls.append((query, page, completion))
        }
    }

    private func waitMain() {
        let done = expectation(description: "main")
        DispatchQueue.main.async { done.fulfill() }
        wait(for: [done], timeout: 1)
    }

    func testStaleSearchIsDroppedAndPagesDedupe() throws {
        let source = FakeSource()
        let model = ProductsHomeViewModel(dataSource: source)
        let a = try product(#"{"id":1,"name":"A"}"#)
        let b = try product(#"{"id":2,"name":"B"}"#)

        model.refreshQuietly() // nothing loaded yet: no call
        XCTAssertTrue(source.calls.isEmpty)
        model.setQuery("ao")
        model.setQuery("vest")
        source.calls[1].completion(ProductsPage(products: [b], hasMore: true), nil)
        source.calls[0].completion(ProductsPage(products: [a], hasMore: false), nil) // old answer, dropped
        waitMain()
        XCTAssertEqual(model.products.map { $0.id }, [2])
        XCTAssertTrue(model.hasMore)

        model.loadMore()
        XCTAssertEqual(source.calls.last?.page, 2)
        source.calls.last?.completion(ProductsPage(products: [b, a], hasMore: false), nil)
        waitMain()
        XCTAssertEqual(model.products.map { $0.id }, [2, 1])
        XCTAssertFalse(model.hasMore)
    }

    /// #677 — after an order changed, the loaded rows take the new stock in place (same rows, same order)
    func testQuietRefreshUpdatesRowsInPlace() throws {
        let source = FakeSource()
        let model = ProductsHomeViewModel(dataSource: source)
        model.reload()
        source.calls[0].completion(ProductsPage(products: [try product(#"{"id":1,"name":"A","available":5}"#),
                                                           try product(#"{"id":2,"name":"B","available":3}"#)],
                                                hasMore: true), nil)
        waitMain()

        model.refreshQuietly()
        XCTAssertEqual(source.calls.count, 2)
        XCTAssertEqual(source.calls[1].page, 1)
        // The answer has B with less stock and a product not on screen: only B changes
        source.calls[1].completion(ProductsPage(products: [try product(#"{"id":3,"name":"C"}"#),
                                                           try product(#"{"id":2,"name":"B2","available":1}"#)],
                                                hasMore: true), nil)
        waitMain()
        XCTAssertEqual(model.products.map { $0.id }, [1, 2])
        XCTAssertEqual(model.products.map { $0.name }, ["A", "B2"])
        XCTAssertTrue(model.hasMore)
    }

    /// #753: a 403 (subscription expired, cancelled, paused, past due) is the empty state's reason, with Retry
    func testFailedLoadShowsTheReasonNotNoProducts() throws {
        let source = FakeSource()
        let model = ProductsHomeViewModel(dataSource: source)
        model.reload()
        let reason = NSError.errorWithOwnMessage(message: "Đăng ký đã hết hạn", domain: "RC")
        source.calls[0].completion(nil, reason)
        waitMain()
        XCTAssertNotNil(model.loadError)
        XCTAssertEqual(ProductsHomeEmptyState.state(productCount: 0, isLoading: false, hasQuery: false, error: model.loadError),
                       .failed("Đăng ký đã hết hạn"))
        model.reload() // Retry: the reason goes while the answer is on its way
        XCTAssertNil(model.loadError)
        source.calls[1].completion(ProductsPage(products: [], hasMore: false), nil)
        waitMain()
        XCTAssertEqual(ProductsHomeEmptyState.state(productCount: 0, isLoading: false, hasQuery: false, error: model.loadError), .empty)
        XCTAssertEqual(ProductsHomeEmptyState.state(productCount: 0, isLoading: false, hasQuery: true, error: nil), .searchEmpty)
        XCTAssertEqual(ProductsHomeEmptyState.state(productCount: 3, isLoading: false, hasQuery: false, error: reason), .none,
                       "rows on screen: no empty state")
        XCTAssertEqual(ProductsHomeEmptyState.state(productCount: 0, isLoading: true, hasQuery: false, error: nil), .none)
    }

    /// #681 (Home option 1): the "● Còn N hôm nay" / "● Hết hôm nay" line is 13pt regular (#1080; semibold in #681)
    func testStockLabelIsSemibold13() throws {
        let cell = ProductRowV2Cell(style: .default, reuseIdentifier: ProductRowV2Cell.reuseId)
        cell.bind(try product(#"{"id":1,"name":"Áo dài"}"#), inCart: 0)
        func labels(_ view: UIView) -> [UILabel] {
            ((view as? UILabel).map { [$0] } ?? []) + view.subviews.flatMap(labels)
        }
        let stock = try XCTUnwrap(labels(cell.contentView).first { $0.text?.hasPrefix("● ") == true })
        XCTAssertEqual(stock.font, V2.label(size: 13, weight: .regular).font)
    }

    /// #937: a long name wraps to two lines on Home, then "…"
    func testHomeRowNameShowsTwoLines() throws {
        let cell = ProductRowV2Cell(style: .default, reuseIdentifier: ProductRowV2Cell.reuseId)
        let name = "Váy cưới đuôi cá ren Pháp tay dài đính ngọc trai cao cấp"
        cell.bind(try product(#"{"id":1,"name":"\#(name)"}"#), inCart: 0)
        func labels(_ view: UIView) -> [UILabel] {
            ((view as? UILabel).map { [$0] } ?? []) + view.subviews.flatMap(labels)
        }
        let label = try XCTUnwrap(labels(cell.contentView).first { $0.text == name })
        XCTAssertEqual(label.numberOfLines, 2)
        XCTAssertEqual(label.lineBreakMode, .byTruncatingTail)
    }

    // MARK: - Home cart button (#937)

    /// #937: the Home top-right button counts the cart's items (same number as the cart bar), hidden when empty
    func testHomeCartButtonBadge() {
        XCTAssertNil(HomeCartButton.badge(itemCount: 0))
        XCTAssertEqual(HomeCartButton.badge(itemCount: 3), "3")
        XCTAssertEqual(HomeCartButton.badge(itemCount: 99), "99")
        XCTAssertEqual(HomeCartButton.badge(itemCount: 140), "99")
        XCTAssertEqual(HomeCartButton.symbol, "basket")
    }
}

/// #461 — the number pad covered "Lưu sản phẩm" and had no Done key
final class ProductFormKeyboardTests: XCTestCase {
    override func tearDown() {
        User.reset()
        super.tearDown()
    }

    /// Price fields only show for a user with `products.manage` who is not `OUTLET_STAFF`
    private func merchantForm() throws -> ProductFormViewController {
        let json = #"{"id":1,"role":"MERCHANT","permissions":["products.manage"]}"#
        User.save(user: try JSONDecoder.shared.decode(User.self, from: Data(json.utf8)))
        let form = ProductFormViewController(product: nil)
        form.loadViewIfNeeded()
        return form
    }

    private func allViews(_ view: UIView) -> [UIView] {
        [view] + view.subviews.flatMap { allViews($0) }
    }

    private func fields(_ view: UIView) -> [UITextField] {
        allViews(view).compactMap { $0 as? UITextField }
    }

    /// Customer phone pads keep their "Xong" bar (#461); #952 removed it from the product form only
    private func assertDoneBar(_ field: UITextField?, file: StaticString = #filePath, line: UInt = #line) {
        guard let field else { return XCTFail("field not found", file: file, line: line) }
        let bar = field.inputAccessoryView as? UIToolbar
        let done = bar?.items?.last
        XCTAssertNotNil(bar, "\(field.accessibilityLabel ?? "field") has no Done bar", file: file, line: line)
        XCTAssertEqual(done?.title, "Done".localized(), file: file, line: line)
        XCTAssertTrue(done?.target === field, "Done must end editing on its own field", file: file, line: line)
        XCTAssertEqual(done?.action, #selector(UIResponder.resignFirstResponder), file: file, line: line)
    }

    /// #952 (owner): no "Xong" bar on the number pads; a tap outside a field or a drag of the form closes the keyboard
    /// #994: create starts with an 11-digit code and a button that replaces it
    func testNewProductStartsWithAGeneratedBarcode() throws {
        let form = try merchantForm()
        let barcode = try XCTUnwrap(fields(form.view).first { $0.accessibilityLabel == "products.form.barcode".localized() })
        let first = try XCTUnwrap(barcode.text)
        XCTAssertEqual(first.count, 11)
        XCTAssertTrue(first.allSatisfy(\.isNumber))
        let regenerate = try XCTUnwrap(allViews(form.view).compactMap { $0 as? UIButton }
            .first { $0.accessibilityLabel == "products.form.regenerateBarcode".localized() })
        regenerate.sendActions(for: .touchUpInside)
        let second = try XCTUnwrap(barcode.text)
        XCTAssertEqual(second.count, 11)
        XCTAssertTrue(second.allSatisfy(\.isNumber))
    }

    func testPriceFieldsHaveNoDoneBarAndTheKeyboardStillCloses() throws {
        let form = try merchantForm()
        let numeric = fields(form.view).filter { $0.keyboardType == .numberPad }
        XCTAssertEqual(numeric.count, 5, "per rental, per day, sale, deposit, cost (#887); the day table is on its own screen (#1249)")
        numeric.forEach { XCTAssertNil($0.inputAccessoryView, "\($0.accessibilityLabel ?? "field") keeps no Done bar") }
        let taps = (form.view.gestureRecognizers ?? []).compactMap { $0 as? UITapGestureRecognizer }
        XCTAssertTrue(taps.contains { !$0.cancelsTouchesInView }, "a tap outside a field ends editing (fields still take taps)")
        let scrolls = allViews(form.view).compactMap { $0 as? UIScrollView }.filter { !($0 is UITextView) }
        XCTAssertTrue(scrolls.contains { $0.keyboardDismissMode != .none }, "dragging the form closes the keyboard")
    }

    func testSaveButtonRidesOnTheKeyboard() throws {
        let form = try merchantForm()
        let guide = form.view.keyboardLayoutGuide
        let save = try XCTUnwrap(allViews(form.view).compactMap { $0 as? UIButton }
            .first { $0.title(for: .normal) == "products.form.save".localized() })
        let tied = allViews(form.view).flatMap { $0.constraints }.contains { constraint in
            constraint.isActive && ((constraint.firstItem === save && constraint.secondItem === guide)
                || (constraint.firstItem === guide && constraint.secondItem === save))
        }
        XCTAssertTrue(tied, "the save button must sit on the keyboard while it is up")
    }

    /// A Maestro run showed "300" after typing "30": the next tap on the covered save button hit the pad's "0"
    func testTypingDigitsKeepsExactlyThoseDigits() throws {
        let form = try merchantForm()
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = form
        window.makeKeyAndVisible()
        defer { window.isHidden = true }
        let perRental = try XCTUnwrap(fields(form.view).first { $0.accessibilityLabel == "products.form.perRental".localized() })
        XCTAssertTrue(perRental.becomeFirstResponder())

        perRental.insertText("3")
        perRental.insertText("0")
        XCTAssertEqual(perRental.text, "30")
        ["0", "0", "0"].forEach { perRental.insertText($0) }
        XCTAssertEqual(perRental.text, "30.000")
        perRental.resignFirstResponder()
    }

    func testCustomerPhoneHasADoneBar() {
        let screen = NewCustomerViewController(mode: .pick)
        screen.loadViewIfNeeded()
        assertDoneBar(fields(screen.view).first { $0.keyboardType == .phonePad })

        let edit = EditCustomerViewController(customerId: 1)
        edit.loadViewIfNeeded()
        assertDoneBar(fields(edit.view).first { $0.keyboardType == .phonePad })
    }
}

/// #473 — the cart's "Theo lần / Theo ngày" toggle for a product that has both prices
extension ProductsV2Tests {
    /// One row of `GET /api/products?page=1&limit=20&sortBy=createdAt&sortOrder=desc&outletId=17` (local stack, 2026-10-05)
    private func homeRow(options: String) throws -> Product {
        try product("""
        {"id":301,"name":"Cart toggle probe both prices","description":null,"barcode":null,"totalStock":3,"stock":3,
         "renting":0,"available":3,"effectiveAvailableToday":3,"rentPrice":150000,"salePrice":0,"costPrice":0,"deposit":0,
         "images":[],"isActive":true,"embeddingGeneratedAt":null,"pricingType":"FIXED","durationConfig":null,
         "pricingOptions":\(options),
         "createdAt":"2026-10-05T13:03:54.566Z","updatedAt":"2026-10-05T13:03:54.566Z","deletedAt":null,"categoryId":1,
         "category":{"id":1,"name":"Electronics"},"merchant":{"id":9,"name":"Rental Shop Demo"},"merchantId":9,
         "outletStock":[{"id":601,"stock":3,"available":3,"renting":0,"productId":301,"outletId":17,
                         "outlet":{"id":17,"name":"Rental Shop Demo - Main Branch","address":"123 Main Street"}}]}
        """)
    }

    private var bothOptions: String {
        """
        [{"id":1,"productId":301,"type":"FIXED","price":150000,"unit":null,"blockSize":null,"isDefault":true,"isActive":true,
          "sortOrder":0,"createdAt":"2026-10-05T13:03:54.566Z","updatedAt":"2026-10-05T13:03:54.566Z"},
         {"id":2,"productId":301,"type":"DAILY","price":50000,"unit":null,"blockSize":null,"isDefault":false,"isActive":true,
          "sortOrder":1,"createdAt":"2026-10-05T13:03:54.566Z","updatedAt":"2026-10-05T13:03:54.566Z"}]
        """
    }

    func testHomeRowWithBothPricesOffersBothModes() throws {
        let row = try homeRow(options: bothOptions)
        let line = CartItem(from: row, quantity: 1, price: row.rentPrice ?? row.rent)
        XCTAssertTrue(CartV2Logic.offersBothModes(line))
        XCTAssertEqual(line.pricingType, "FIXED")
        XCTAssertEqual(line.price, 150_000)
    }

    func testOnePriceProductShowsNoToggle() throws {
        let onePrice = try homeRow(options: "[]")
        let cart = Cart()
        cart.orderType = .rent
        cart.addItem(CartItem(from: onePrice, quantity: 1, price: 150_000))
        cart.addItem(CartItem(from: onePrice, quantity: 1, price: 150_000))
        cart.refreshPricing(from: onePrice)
        XCTAssertEqual(cart.items.count, 2, "#951: each add is its own line")
        XCTAssertFalse(CartV2Logic.offersBothModes(cart.items[0]))
    }

    func testStaleLineGetsTheToggleWhenTheProductIsAddedAgain() throws {
        // Put in the cart while it had one price; then the per-day price was added and it is added again
        let cart = Cart()
        cart.orderType = .rent
        cart.addItem(CartItem(from: try homeRow(options: "[]"), quantity: 1, price: 150_000))
        XCTAssertFalse(CartV2Logic.offersBothModes(cart.items[0]))

        cart.addItem(CartItem(from: try homeRow(options: bothOptions), quantity: 1, price: 150_000))
        // #951: every add is a new line; the earlier line of the product still takes the fresh prices
        XCTAssertEqual(cart.items.count, 2)
        XCTAssertEqual(cart.items[0].quantity, 1)
        XCTAssertTrue(CartV2Logic.offersBothModes(cart.items[0]))
        XCTAssertEqual(cart.items[0].pricingType, "FIXED")
        XCTAssertEqual(cart.items[0].price, 150_000)

        cart.selectPricingType(at: 0, type: "DAILY")
        XCTAssertEqual(cart.items[0].price, 50_000)
    }

    func testRestoredOrEditedLineGetsTheToggleAfterARefresh() throws {
        // A line of an edited order: no options, the order's own unit price
        var edited = CartItem(productId: 301, productName: "Cart toggle probe both prices", barcode: nil, quantity: 1,
                              price: 140_000, deposit: 0, originalRentPrice: 140_000, originalSalePrice: 140_000,
                              customRentPrice: 140_000)
        edited.pricingType = "FIXED"
        let cart = Cart()
        cart.orderType = .rent
        cart.addItem(edited)
        XCTAssertFalse(CartV2Logic.offersBothModes(cart.items[0]))

        cart.refreshPricing(from: try homeRow(options: bothOptions))
        XCTAssertTrue(CartV2Logic.offersBothModes(cart.items[0]))
        XCTAssertEqual(cart.items[0].price, 140_000, "the order's unit price stays until the mode changes")
        XCTAssertEqual(cart.items[0].pricingType, "FIXED")

        // A cart saved to disk and restored keeps the refreshed options
        let restored = try JSONDecoder().decode(CartItem.self, from: JSONEncoder().encode(cart.items[0]))
        XCTAssertTrue(CartV2Logic.offersBothModes(restored))
    }

    // MARK: Owner decision 2026-10-05: both modes on every rent line, the line price is editable

    private func onePriceRentCart() throws -> Cart {
        let cart = Cart()
        cart.orderType = .rent
        cart.customer = try JSONDecoder.shared.decode(Customer.self, from: Data(#"{"id":5,"firstName":"Minh","phone":"0912"}"#.utf8))
        cart.addItem(CartItem(from: try homeRow(options: "[]"), quantity: 2, price: 150_000))
        let pickup = ISO8601DateFormatter().date(from: "2026-10-02T17:00:00Z")!
        cart.pickupPlanAt = pickup
        cart.returnPlanAt = ISO8601DateFormatter().date(from: "2026-10-05T16:59:59Z")!
        return cart
    }

    func testEveryRentLineShowsTheToggleEvenWithOnePrice() throws {
        let cart = try onePriceRentCart()
        XCTAssertFalse(CartV2Logic.offersBothModes(cart.items[0]))
        XCTAssertTrue(CartV2Logic.showsPricingToggle(orderType: .rent))
        XCTAssertFalse(CartV2Logic.showsPricingToggle(orderType: .sale))
    }

    func testAModeWithoutAPriceStartsAtZeroAsksForAPriceAndBlocksCreate() throws {
        let cart = try onePriceRentCart()
        XCTAssertFalse(CartV2Logic.needsPrice(cart.items[0], orderType: .rent))
        XCTAssertTrue(CartV2Logic.missingPrices(cart).isEmpty)

        cart.selectPricingType(at: 0, type: "DAILY")
        XCTAssertEqual(cart.items[0].price, 0)
        XCTAssertTrue(CartV2Logic.needsPrice(cart.items[0], orderType: .rent), "the cart opens the price editor")
        XCTAssertEqual(CartV2Logic.missingPrices(cart), [String(format: "products.cart.needPrice".localized(), "Cart toggle probe both prices")])

        // Back to per rental: the product's own price again
        cart.selectPricingType(at: 0, type: "FIXED")
        XCTAssertEqual(cart.items[0].price, 150_000)
        XCTAssertTrue(CartV2Logic.missingPrices(cart).isEmpty)
    }

    func testTheEditedLinePriceIsUsedInTotalsAndTheCreateRequest() throws {
        let cart = try onePriceRentCart()
        cart.selectPricingType(at: 0, type: "DAILY")
        cart.updatePrice(at: 0, price: 60_000)
        cart.syncRentalDaysFromDates()
        let days = Double(cart.items[0].rentalDays)
        XCTAssertGreaterThanOrEqual(days, 3)
        XCTAssertEqual(CartV2Logic.calc(cart.items[0], orderType: .rent).total, 60_000 * 2 * days)
        XCTAssertTrue(CartV2Logic.missingPrices(cart).isEmpty)

        let item = try XCTUnwrap(cart.toCreateOrderRequest().orderItems.first)
        XCTAssertEqual(item.unitPrice, 60_000)
        XCTAssertEqual(item.pricingType, "DAILY")
        XCTAssertEqual(item.rentDays, cart.items[0].rentalDays)
        XCTAssertEqual(item.totalPrice, 60_000 * 2 * days)

        // Per rental keeps its own price; the edit never touches the product
        cart.selectPricingType(at: 0, type: "FIXED")
        cart.updatePrice(at: 0, price: 120_000)
        XCTAssertEqual(CartV2Logic.calc(cart.items[0], orderType: .rent).total, 240_000)
        XCTAssertEqual(cart.items[0].originalRentPrice, 150_000)
    }
}

/// #482 — one pricing chip per cart line and the "Cách tính giá" sheet (board Gio-hang-chon-gia)
extension ProductsV2Tests {
    private var threeOptions: String {
        """
        [{"id":1,"type":"FIXED","price":350000,"isDefault":true,"isActive":true},
         {"id":2,"type":"DAILY","price":150000,"isDefault":false,"isActive":true},
         {"id":3,"type":"BLOCK","price":0,"isDefault":false,"isActive":true},
         {"id":4,"type":"HOURLY","price":20000,"isDefault":false,"isActive":false}]
        """
    }

    private func pricingCart() throws -> Cart {
        let cart = Cart()
        cart.orderType = .rent
        cart.customer = try JSONDecoder.shared.decode(Customer.self, from: Data(#"{"id":5,"firstName":"Minh","phone":"0912"}"#.utf8))
        cart.addItem(CartItem(from: try homeRow(options: threeOptions), quantity: 1, price: 350_000))
        cart.pickupPlanAt = ISO8601DateFormatter().date(from: "2026-10-02T17:00:00Z")!
        cart.returnPlanAt = ISO8601DateFormatter().date(from: "2026-10-05T16:59:59Z")!
        return cart
    }

    func testSheetListsBothModesThenOtherActiveOptionTypes() throws {
        let line = try pricingCart().items[0]
        XCTAssertEqual(CartV2Logic.pricingChoices(line), [
            CartPricingChoice(type: "FIXED", catalogPrice: 350_000),
            CartPricingChoice(type: "DAILY", catalogPrice: 150_000),
            CartPricingChoice(type: "BLOCK", catalogPrice: 0),
        ], "an inactive option is left out; #951: a 0đ option is a price")
        // A one-price product still offers both modes
        let onePrice = CartItem(from: try homeRow(options: "[]"), quantity: 1, price: 150_000)
        XCTAssertEqual(CartV2Logic.pricingChoices(onePrice).map(\.type), ["FIXED", "DAILY"])
        XCTAssertNil(CartV2Logic.pricingChoices(onePrice)[1].catalogPrice)
        XCTAssertEqual(CartV2Logic.pricingLabel("BLOCK"), "products.cart.pricing.block".localized())
    }

    func testFieldStartsAtTheLinePriceThenTheCatalogPrice() throws {
        let cart = try pricingCart()
        cart.updatePrice(at: 0, price: 320_000)
        let line = cart.items[0]
        XCTAssertEqual(CartV2Logic.startPrice(line, type: "FIXED"), 320_000, "the line's own mode shows the line price")
        XCTAssertEqual(CartV2Logic.startPrice(line, type: "DAILY"), 150_000)
        XCTAssertEqual(CartV2Logic.startPrice(line, type: "BLOCK"), 0)
    }

    /// Owner 2026-10-09: order detail lines read like the cart link
    func testOrderItemPricingMatchesCartLink() {
        let vi = Locale(identifier: "vi_VN")
        let perRental = "products.price.perRental".localized().lowercased(with: vi)
        let perDay = "products.price.perDay".localized().lowercased(with: vi)
        let days = PluralText.format("products.cart.days", count: 3, 3)
        XCTAssertEqual(CartV2Logic.orderItemPricing(unitPrice: 200_000, pricingType: "FIXED", rentalDays: 3, orderType: .rent),
                       "200.000đ / \(perRental)")
        XCTAssertEqual(CartV2Logic.orderItemPricing(unitPrice: 200_000, pricingType: nil, rentalDays: nil, orderType: .rent),
                       "200.000đ / \(perRental)", "old rows without a type are per rental")
        XCTAssertEqual(CartV2Logic.orderItemPricing(unitPrice: 400_000, pricingType: "DAILY", rentalDays: 3, orderType: .rent),
                       "400.000đ / \(perDay) × \(days)")
        XCTAssertEqual(CartV2Logic.orderItemPricing(unitPrice: 900_000, pricingType: nil, rentalDays: nil, orderType: .sale),
                       "900.000đ / " + "products.cart.pricing.sale".localized().lowercased(with: vi))
    }

    func testChipAndPreviewTexts() throws {
        let cart = try pricingCart()
        // #684: the cart link reads price first
        XCTAssertEqual(CartV2Logic.link(cart.items[0], orderType: .rent).amount, "350.000đ")
        XCTAssertEqual(CartV2Logic.link(cart.items[0], orderType: .rent).unit,
                       "products.price.perRental".localized().lowercased(with: Locale(identifier: "vi_VN")))
        XCTAssertEqual(CartV2Logic.chip(cart.items[0], orderType: .rent).label, "products.price.perRental".localized())
        XCTAssertEqual(CartV2Logic.chip(cart.items[0], orderType: .rent).price, "350.000đ")
        cart.selectPricingType(at: 0, type: "DAILY")
        cart.updatePrice(at: 0, price: 130_000)
        XCTAssertEqual(CartV2Logic.chip(cart.items[0], orderType: .rent).price,
                       String(format: "products.cart.pricing.perDaySuffix".localized(), "130.000đ"))
        cart.selectPricingType(at: 0, type: "BLOCK")
        XCTAssertEqual(CartV2Logic.chip(cart.items[0], orderType: .rent).price, "0đ", "#951: a 0đ option is a price")
        XCTAssertEqual(CartV2Logic.chip(cart.items[0], orderType: .sale).label, "products.cart.pricing.sale".localized())

        let daily = CartV2Logic.pricePreview(type: "DAILY", price: 130_000, days: 3, quantity: 1, orderType: .rent)
        XCTAssertEqual(daily.text, "130.000đ × " + PluralText.format("products.cart.days", count: 3, 3) + " × 1")
        XCTAssertEqual(daily.total, 390_000)
        let fixed = CartV2Logic.pricePreview(type: "FIXED", price: 350_000, days: 3, quantity: 2, orderType: .rent)
        XCTAssertEqual(fixed.text, "350.000đ × 2")
        XCTAssertEqual(fixed.total, 700_000)
        XCTAssertEqual(CartV2Logic.pricePreview(type: "DAILY", price: 300_000, days: 3, quantity: 2, orderType: .sale).total, 600_000)
    }

    func testApplyingAThirdOptionChangesOnlyTheLineAndKeepsThePayloadValid() throws {
        let cart = try pricingCart()
        cart.selectPricingType(at: 0, type: "BLOCK")
        cart.updatePrice(at: 0, price: 400_000)
        XCTAssertEqual(cart.items[0].pricingType, "BLOCK")
        XCTAssertEqual(CartV2Logic.calc(cart.items[0], orderType: .rent).total, 400_000)
        XCTAssertNil(cart.items[0].customFixedPrice, "the per-rental price typed earlier is not overwritten")
        let request = try XCTUnwrap(cart.toCreateOrderRequest().orderItems.first)
        XCTAssertEqual(request.unitPrice, 400_000)
        XCTAssertEqual(request.pricingType, "FIXED", "the order API takes FIXED / HOURLY / DAILY; a block price is unit × quantity")
        XCTAssertNil(request.pricingOptionId)
        XCTAssertEqual(request.totalPrice, 400_000)
        // Back to per rental: the catalog price, the product never changed
        cart.selectPricingType(at: 0, type: "FIXED")
        XCTAssertEqual(cart.items[0].price, 350_000)
        XCTAssertEqual(cart.items[0].originalRentPrice, 150_000)
    }
}

/// #476 — "Tạo đơn" opens a confirm sheet on the cart, then a "Đã tạo đơn" sheet
extension ProductsV2Tests {
    private var vn: TimeZone { TimeZone(identifier: "Asia/Ho_Chi_Minh")! }

    private func rentCart() throws -> Cart {
        let cart = Cart()
        cart.orderType = .rent
        cart.customer = try JSONDecoder.shared.decode(Customer.self, from: Data(#"{"id":5,"firstName":"Trần Văn","lastName":"Minh","phone":"0912555018"}"#.utf8))
        let vest = CartItem(productId: 1, productName: "Vest đen slim fit", barcode: nil, quantity: 1, price: 150_000, deposit: 100_000,
                            originalRentPrice: 150_000, originalSalePrice: 0)
        let aoDai = CartItem(productId: 2, productName: "Áo dài lụa đỏ", barcode: nil, quantity: 2, price: 300_000, deposit: 100_000,
                             originalRentPrice: 300_000, originalSalePrice: 0)
        cart.addItem(vest)
        cart.addItem(aoDai)
        // 03/10/26 → 05/10/26 in Vietnam
        cart.pickupPlanAt = ISO8601DateFormatter().date(from: "2026-10-02T17:00:00Z")
        cart.returnPlanAt = ISO8601DateFormatter().date(from: "2026-10-05T16:59:59Z")
        return cart
    }

    func testRentConfirmSheetSummarisesTheCart() throws {
        let cart = try rentCart()
        let confirm = CreateOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertFalse(confirm.isSale)
        XCTAssertEqual(confirm.customer, "Trần Văn Minh")
        XCTAssertEqual(confirm.range, "03/10/26 → 05/10/26")
        XCTAssertEqual(confirm.days, 3)
        XCTAssertEqual(confirm.items, "Vest đen slim fit", "the sheet shows the first product only (#1239)")
        XCTAssertEqual(confirm.moreCount, 1)
        XCTAssertEqual(confirm.total, cart.totalAmount)
        XCTAssertEqual(confirm.total, 750_000)
        XCTAssertEqual(confirm.collect, cart.depositAmount, "rent collects the prepaid deposit")
        XCTAssertEqual(confirm.titleKey, "products.cart.confirm.rentTitle")
        XCTAssertEqual(confirm.collectKey, "products.cart.confirm.collectDeposit")
    }

    func testBigCartShowsOneProductAndTheNumberOfTheOthers() throws {
        let cart = try rentCart()
        for index in 3...15 {
            cart.addItem(CartItem(productId: index, productName: "Sản phẩm \(index)", barcode: nil, quantity: 1, price: 100_000, deposit: 0,
                                  originalRentPrice: 100_000, originalSalePrice: 0))
        }
        let confirm = CreateOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertEqual(confirm.items, "Vest đen slim fit")
        XCTAssertEqual(confirm.moreCount, 14)
        let single = try rentCart()
        single.removeItem(at: 1)
        XCTAssertEqual(CreateOrderSheetLogic.confirm(single, timeZone: vn).moreCount, 0)
    }

    func testSaleConfirmSheetCollectsTheAmountDue() throws {
        let cart = try rentCart()
        cart.orderType = .sale
        cart.discount = 10_000
        let confirm = CreateOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertTrue(confirm.isSale)
        XCTAssertNil(confirm.range, "a sale has no rental dates")
        XCTAssertEqual(confirm.collect, cart.amountDue)
        XCTAssertEqual(confirm.titleKey, "products.cart.confirm.saleTitle")
        XCTAssertEqual(confirm.collectKey, "products.cart.confirm.collectSale")
    }

    func testCreatedSheetUsesTheShortOrderNumber() throws {
        let confirm = CreateOrderSheetLogic.confirm(try rentCart(), timeZone: vn)
        let created = CreateOrderSheetLogic.created(orderNumber: "ORD-17-0063", confirm: confirm)
        XCTAssertEqual(created.shortNumber, "0063")
        XCTAssertEqual(created.subtitle, "Trần Văn Minh · 03/10/26 → 05/10/26")
        XCTAssertEqual(created.paid, confirm.collect)
        XCTAssertEqual(created.paidKey, "products.cart.created.paidDeposit")

        let saleCart = try rentCart()
        saleCart.orderType = .sale
        let sale = CreateOrderSheetLogic.created(orderNumber: "ORD-17-0064", confirm: CreateOrderSheetLogic.confirm(saleCart, timeZone: vn))
        XCTAssertEqual(sale.subtitle, "Trần Văn Minh")
        XCTAssertEqual(sale.paidKey, "products.cart.created.paidSale")
    }

    func testBothSheetsLayOutWithTheBoardButtons() throws {
        // Laying the buttons out used to throw "no common ancestor" (width constraint before the row existed)
        let confirm = CreateOrderSheetLogic.confirm(try rentCart(), timeZone: vn)
        let sheets: [V2FittingSheet] = [
            CreateOrderConfirmSheet(confirm: confirm),
            OrderCreatedSheet(summary: CreateOrderSheetLogic.created(orderNumber: "ORD-17-0063", confirm: confirm)),
        ]
        for sheet in sheets {
            sheet.loadViewIfNeeded()
            sheet.view.frame = CGRect(x: 0, y: 0, width: 390, height: 460)
            sheet.view.layoutIfNeeded()
            let buttons = sheet.stack.arrangedSubviews.last as? UIStackView
            let widths = buttons?.arrangedSubviews.map { $0.frame.width } ?? []
            XCTAssertEqual(widths.count, 2)
            XCTAssertEqual(buttons?.arrangedSubviews.first?.frame.height, 50)
            let ratio: CGFloat = sheet is CreateOrderConfirmSheet ? 1.6 : 1
            XCTAssertEqual(widths[1] / widths[0], ratio, accuracy: 0.02)
        }
    }

    func testOnlyANewOrderUsesTheSheet() {
        XCTAssertEqual(CartV2Logic.ctaRoute(isEditMode: false), .confirmSheet)
        XCTAssertEqual(CartV2Logic.ctaRoute(isEditMode: true), .editSheet, "#676: an edit saves from its own sheet, not the review screen")
    }

    func testOneCreateAtATimeAndTheKeyIsReusedOnRetry() {
        let submission = CreateOrderSubmission()
        let key = submission.idempotencyKey
        XCTAssertTrue(submission.begin())
        XCTAssertFalse(submission.begin(), "a double tap must not send a second create (#341)")
        submission.failed()
        XCTAssertEqual(submission.idempotencyKey, key, "a retry after an error reuses the key")
        XCTAssertTrue(submission.begin())
        submission.succeeded()
        XCTAssertNotEqual(submission.idempotencyKey, key, "the next cart is a new checkout")
        XCTAssertFalse(submission.inFlight)
    }


    // MARK: - Categories from the product form (#632)

    func testCategoryAddFollowsProductsManageNeverStaff() {
        XCTAssertTrue(CategoryRules.canAdd(role: .merchant, permissions: ["products.manage"]))
        XCTAssertTrue(CategoryRules.canAdd(role: .outletAdmin, permissions: ["products.manage", "products.view"]))
        XCTAssertFalse(CategoryRules.canAdd(role: .outletStaff, permissions: ["products.view", "products.create"]))
        XCTAssertFalse(CategoryRules.canAdd(role: .outletStaff, permissions: ["products.manage"]), "staff never, whatever the list says")
        XCTAssertFalse(CategoryRules.canAdd(role: nil, permissions: []))
    }

    func testCategoryRenameAndDeleteOnlyMerchant() {
        XCTAssertTrue(CategoryRules.canManage(role: .merchant))
        XCTAssertTrue(CategoryRules.canManage(role: .admin))
        XCTAssertFalse(CategoryRules.canManage(role: .outletAdmin), "PUT/DELETE /api/categories/{id} reject OUTLET_ADMIN")
        XCTAssertFalse(CategoryRules.canManage(role: .outletStaff))
        XCTAssertFalse(CategoryRules.canManage(role: nil))
    }

    func testDefaultCategoryIsNeverDeletable() {
        var category = Category()
        XCTAssertTrue(CategoryRules.canDelete(category))
        category.isDefault = false
        XCTAssertTrue(CategoryRules.canDelete(category))
        category.isDefault = true
        XCTAssertFalse(CategoryRules.canDelete(category))
    }

    func testCategorySearchIgnoresAccentsAndCase() {
        XCTAssertTrue(CategoryRules.matches("Áo cưới", query: "ao cuoi"))
        XCTAssertTrue(CategoryRules.matches("Đầm dạ hội", query: "dam"))
        XCTAssertTrue(CategoryRules.matches("Váy", query: "  "))
        XCTAssertFalse(CategoryRules.matches("Áo dài", query: "vay"))
        XCTAssertFalse(CategoryRules.matches(nil, query: "a"))
    }

    func testCategoryNameIsTrimmedAndTwoToFiftyCharacters() {
        XCTAssertEqual(CategoryRules.validateName("   "), .required)
        XCTAssertEqual(CategoryRules.validateName(" Á "), .tooShort)
        XCTAssertNil(CategoryRules.validateName(" Áo "))
        XCTAssertNil(CategoryRules.validateName(String(repeating: "đ", count: 50)))
        XCTAssertEqual(CategoryRules.validateName(String(repeating: "đ", count: 51)), .tooLong)
    }
}

/// #676 — editing an order: "Lưu thay đổi" on the cart and a sheet that tags the rows changed since the order loaded
extension ProductsV2Tests {
    private func editCart(paid: Double = 200_000) throws -> Cart {
        let cart = try rentCart()
        cart.orderId = 42
        cart.editOriginal = CartEditOriginal.capture(cart, orderNumber: "482913", paid: paid)
        return cart
    }

    func testEditCartSaysSaveChanges() {
        XCTAssertEqual(CartV2Logic.ctaTitleKey(isEditMode: true, isRent: true), "products.cart.edit.save")
        XCTAssertEqual(CartV2Logic.ctaTitleKey(isEditMode: true, isRent: false), "products.cart.edit.save")
        XCTAssertEqual(CartV2Logic.ctaTitleKey(isEditMode: false, isRent: true), "products.cart.create")
        XCTAssertEqual(CartV2Logic.ctaTitleKey(isEditMode: false, isRent: false), "products.cart.sellAndCollect")
    }

    func testEditHeaderNamesTheOrderTheCustomerAndTheType() throws {
        XCTAssertNil(EditOrderSheetLogic.header(try rentCart()), "a new order keeps the cart title")
        let header = try XCTUnwrap(EditOrderSheetLogic.header(try editCart()))
        XCTAssertEqual(header.number, "482913")
        XCTAssertEqual(header.subtitle, "Trần Văn Minh · " + "products.cart.edit.rentType".localized())

        let legacy = try rentCart()
        legacy.orderId = 42 // a draft saved before #676 has no snapshot
        XCTAssertNil(EditOrderSheetLogic.header(legacy)?.number)
    }

    func testUnchangedEditSheetHasNoTags() throws {
        let cart = try editCart()
        let confirm = EditOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertEqual(confirm.number, "482913")
        XCTAssertFalse(confirm.isSale)
        XCTAssertEqual(confirm.range, "03/10/26 → 05/10/26", "same date format as the create sheet")
        XCTAssertEqual(confirm.days, 3)
        XCTAssertEqual(confirm.itemCount, 3)
        XCTAssertEqual(confirm.total, cart.totalAmount)
        // #677: a draft without payment notes: the 300.000đ booking deposit + its payments
        XCTAssertEqual(confirm.paid, 500_000)
        XCTAssertNil(confirm.collectAtHandOver, "status unknown: no Thu khi giao")
        XCTAssertEqual(confirm.itemsKey, "products.cart.edit.rentItems")
        XCTAssertFalse(confirm.datesChanged)
        XCTAssertFalse(confirm.itemsChanged)
    }

    func testNewDatesTagTheDatesRowOnly() throws {
        let cart = try editCart()
        cart.returnPlanAt = ISO8601DateFormatter().date(from: "2026-10-06T16:59:59Z") // 06/10/26
        let confirm = EditOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertTrue(confirm.datesChanged)
        XCTAssertFalse(confirm.itemsChanged)
    }

    func testAnotherTimeOnTheSameShopDayIsNotAChange() throws {
        let cart = try editCart()
        cart.pickupPlanAt = ISO8601DateFormatter().date(from: "2026-10-03T03:00:00Z") // 10:00 on 03/10 in Vietnam
        XCTAssertFalse(EditOrderSheetLogic.confirm(cart, timeZone: vn).datesChanged)
    }

    func testQuantityPriceAndLineChangesTagTheItemsRow() throws {
        let quantity = try editCart()
        quantity.updateQuantity(at: 0, quantity: 2)
        XCTAssertTrue(EditOrderSheetLogic.confirm(quantity, timeZone: vn).itemsChanged)
        XCTAssertFalse(EditOrderSheetLogic.confirm(quantity, timeZone: vn).datesChanged)

        let price = try editCart()
        price.updatePrice(at: 1, price: 280_000)
        XCTAssertTrue(EditOrderSheetLogic.confirm(price, timeZone: vn).itemsChanged)

        let removed = try editCart()
        removed.removeItem(at: 0)
        XCTAssertTrue(EditOrderSheetLogic.confirm(removed, timeZone: vn).itemsChanged)
    }

    func testBackToTheLoadedQuantityClearsTheTag() throws {
        let cart = try editCart()
        cart.updateQuantity(at: 0, quantity: 3)
        cart.updateQuantity(at: 0, quantity: 1)
        XCTAssertFalse(EditOrderSheetLogic.confirm(cart, timeZone: vn).itemsChanged)
    }

    func testNothingCollectedHidesThePaidRow() throws {
        let cart = try editCart(paid: 0)
        cart.setManualDepositAmount(0)
        XCTAssertNil(EditOrderSheetLogic.confirm(cart, timeZone: vn).paid)
    }

    // MARK: #677 — "Đã thu" and "Thu khi giao" on the save sheet

    private func bookedCart(payments: [OrderPaymentLine]) throws -> Cart {
        let cart = try rentCart()
        cart.orderId = 42
        cart.editOriginal = CartEditOriginal.capture(cart, orderNumber: "482913", paid: payments.reduce(0) { $0 + $1.amount },
                                                     status: .reserved, payments: payments)
        return cart
    }

    func testDepositOnlyOrderShowsTheDepositAsCollected() throws {
        let cart = try bookedCart(payments: [])
        let confirm = EditOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertEqual(confirm.paid, 300_000, "bug B: a booking deposit alone shows Đã thu")
        XCTAssertEqual(confirm.collectAtHandOver, cart.totalAmount - 300_000)
    }

    func testDepositAndPaymentsCountOnlyCompletedPickupPayments() throws {
        let cart = try bookedCart(payments: [
            OrderPaymentLine(amount: 100_000, status: "COMPLETED", notes: "PICKUP"),
            OrderPaymentLine(amount: 50_000, status: "PENDING", notes: "PICKUP"),
            OrderPaymentLine(amount: 20_000, status: "COMPLETED", notes: "RETURN_ADJUSTMENT"),
        ])
        cart.updateQuantity(at: 0, quantity: 2) // the new total counts
        cart.setManualDepositAmount(300_000) // the order's booking deposit
        let confirm = EditOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertEqual(confirm.paid, 400_000)
        XCTAssertEqual(confirm.collectAtHandOver,
                       OrderDetailLogic.handOver(total: cart.totalAmount, deposit: 300_000, securityDeposit: 0,
                                                 payments: cart.editOriginal?.payments ?? []).due)
        XCTAssertEqual(confirm.collectAtHandOver, cart.totalAmount - 300_000 - 100_000)
    }

    func testTheChanIsNeverCollectedButIsAskedAtHandOver() throws {
        let cart = try bookedCart(payments: [OrderPaymentLine(amount: 100_000, status: "COMPLETED", notes: "PICKUP")])
        cart.manualSecurityDeposit = 500_000
        let confirm = EditOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertEqual(confirm.paid, 400_000, "thế chân is not in Đã thu")
        XCTAssertEqual(confirm.collectAtHandOver, cart.totalAmount - 400_000 + 500_000)
    }

    func testSaleOrderCountsSalePaymentsAndHasNoHandOver() throws {
        let cart = try rentCart()
        cart.orderType = .sale
        cart.orderId = 43
        cart.editOriginal = CartEditOriginal.capture(cart, orderNumber: "482914", paid: 0, status: .reserved, payments: [
            OrderPaymentLine(amount: 200_000, status: "COMPLETED", notes: "SALE"),
            OrderPaymentLine(amount: 70_000, status: "COMPLETED", notes: "PICKUP"),
        ])
        let confirm = EditOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertEqual(confirm.paid, 200_000)
        XCTAssertNil(confirm.collectAtHandOver)
    }

    func testPickedUpRentalHasNoHandOverRow() throws {
        let cart = try bookedCart(payments: [])
        cart.editOriginal?.status = .pickuped
        XCTAssertNil(EditOrderSheetLogic.confirm(cart, timeZone: vn).collectAtHandOver)
    }

    func testPaymentsSurviveTheSavedDraft() throws {
        let cart = try bookedCart(payments: [OrderPaymentLine(amount: 100_000, status: "COMPLETED", notes: "PICKUP")])
        let data = try JSONEncoder().encode(cart.makeDiskSnapshot())
        let restored = Cart()
        restored.applyDiskSnapshot(try JSONDecoder().decode(Cart.DiskSnapshot.self, from: data))
        XCTAssertEqual(restored.editOriginal, cart.editOriginal)
        XCTAssertEqual(restored.editOriginal?.status, .reserved)
    }

    // MARK: #677 — the Home cart bar and "Huỷ sửa"

    func testCartBarSaysEditOrderWhileEditing() throws {
        XCTAssertEqual(CartV2Logic.cartBarAction(isEditMode: false, number: nil), "products.cart.create".localized())
        XCTAssertEqual(CartV2Logic.cartBarAction(isEditMode: true, number: "482913"),
                       String(format: "products.cart.edit.title".localized(), "482913"))
        XCTAssertEqual(CartV2Logic.cartBarAction(isEditMode: true, number: nil), "products.cart.editTitle".localized())
        let cart = try editCart()
        XCTAssertEqual(CartV2Logic.cartBarAction(isEditMode: cart.isEditMode, number: EditOrderSheetLogic.number(cart)),
                       String(format: "products.cart.edit.title".localized(), "482913"))
    }

    /// #677 (board gio-menu) — the cart's ⋯: none while editing, both items off on an empty cart
    func testCartMoreMenuState() throws {
        XCTAssertNil(CartV2Logic.moreMenu(try editCart()), "no ⋯ while editing")
        XCTAssertEqual(CartV2Logic.moreMenu(Cart()), CartV2Logic.MoreMenuState(shareEnabled: false, clearEnabled: false))
        XCTAssertEqual(CartV2Logic.moreMenu(try rentCart()), CartV2Logic.MoreMenuState(shareEnabled: true, clearEnabled: true))
        let noDates = try rentCart()
        noDates.returnPlanAt = nil
        XCTAssertEqual(CartV2Logic.moreMenu(noDates), CartV2Logic.MoreMenuState(shareEnabled: false, clearEnabled: true),
                       "a rental without dates cannot be quoted yet, but can be cleared")
    }

    func testCancelEditReturnsTheOrderAndTitle() throws {
        XCTAssertNil(EditOrderSheetLogic.cancelEdit(try rentCart()), "a new order has nothing to cancel")
        XCTAssertEqual(EditOrderSheetLogic.cancelEdit(try editCart()), 42)
        XCTAssertEqual(EditOrderSheetLogic.cancelTitle(number: "482913"),
                       String(format: "products.cart.edit.cancelTitle".localized(), "482913"))
        XCTAssertEqual(EditOrderSheetLogic.cancelTitle(number: nil), "products.cart.edit.cancelTitleNoNumber".localized())
    }

    func testSaleEditHasNoDatesRow() throws {
        let cart = try editCart()
        cart.orderType = .sale
        cart.editOriginal = CartEditOriginal.capture(cart, orderNumber: "482914", paid: 0)
        let confirm = EditOrderSheetLogic.confirm(cart, timeZone: vn)
        XCTAssertNil(confirm.range)
        XCTAssertFalse(confirm.datesChanged)
        XCTAssertEqual(confirm.itemsKey, "products.cart.edit.saleItems")
        XCTAssertEqual(EditOrderSheetLogic.header(cart)?.subtitle, "Trần Văn Minh · " + "products.cart.edit.saleType".localized())
    }

    func testEditSnapshotSurvivesTheSavedDraftAndClears() throws {
        let cart = try editCart()
        let data = try JSONEncoder().encode(cart.makeDiskSnapshot())
        let restored = Cart()
        restored.applyDiskSnapshot(try JSONDecoder().decode(Cart.DiskSnapshot.self, from: data))
        XCTAssertEqual(restored.editOriginal, cart.editOriginal)

        // A draft saved before #676 still loads, without a snapshot
        var json = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        json.removeValue(forKey: "editOriginal")
        let old = Cart()
        old.applyDiskSnapshot(try JSONDecoder().decode(Cart.DiskSnapshot.self, from: JSONSerialization.data(withJSONObject: json)))
        XCTAssertEqual(old.orderId, 42)
        XCTAssertNil(old.editOriginal)

        cart.clear()
        XCTAssertNil(cart.editOriginal)
    }

    func testEditSheetTagsOnlyTheChangedRows() throws {
        let cart = try editCart()
        cart.updateQuantity(at: 0, quantity: 2)
        let sheet = EditOrderConfirmSheet(confirm: EditOrderSheetLogic.confirm(cart, timeZone: vn))
        sheet.loadViewIfNeeded()
        sheet.view.frame = CGRect(x: 0, y: 0, width: 390, height: 520)
        sheet.view.layoutIfNeeded()
        func tags(in view: UIView) -> Int {
            (view.accessibilityIdentifier == "cart.edit.changed" ? 1 : 0) + view.subviews.reduce(0) { $0 + tags(in: $1) }
        }
        XCTAssertEqual(tags(in: sheet.view), 1, "only Đồ thuê changed")
        XCTAssertEqual(sheet.saveButton.title(for: .normal), "products.cart.edit.save".localized())
    }
}

/// #951 — products priced 0đ, a free line (price 0), one cart line per add
extension ProductsV2Tests {
    private var freeProduct: String {
        #"{"id":401,"name":"Túi quà","rentPrice":0,"salePrice":0,"pricingType":"FIXED","pricingOptions":[{"id":9,"type":"FIXED","price":0,"isDefault":true,"isActive":true}]}"#
    }
    private var noRentPrice: String { #"{"id":402,"name":"Chưa có giá","rentPrice":0,"salePrice":0,"pricingOptions":[]}"# }

    func testZeroOptionIsAPriceAndALegacyZeroIsNot() throws {
        let free = try product(freeProduct)
        XCTAssertEqual(ProductPricing.perRental(free), 0)
        XCTAssertNil(ProductPricing.perDay(free))
        XCTAssertEqual(ProductRowLogic.price(free), ProductRowPrice(main: 0, mainMode: .perRental, second: nil, secondMode: nil))
        let daily0 = try product(#"{"id":3,"name":"A","rentPrice":0,"pricingOptions":[{"id":1,"type":"DAILY","price":0,"isDefault":true}]}"#)
        XCTAssertEqual(ProductPricing.perDay(daily0), 0)
        let zero = try product(noRentPrice)
        XCTAssertNil(ProductPricing.perRental(zero), "a bare rentPrice of 0 is not a list price; the cart still accepts it (#996)")
        XCTAssertNil(ProductRowLogic.price(zero))
        // salePrice 0 still reads "not for sale" (the apps save 0 for an empty box)
        XCTAssertNil(ProductPricing.sale(free))
    }

    func testFormSendsAndAcceptsZeroButNotNegative() {
        let zero = ProductPricing.options(perRental: 0, perDay: nil, defaultMode: .perRental)
        XCTAssertEqual(zero.map { $0.type }, ["FIXED"])
        XCTAssertEqual(zero.map { $0.price }, [0])
        XCTAssertTrue(zero[0].isDefault)
        let dailyZero = ProductPricing.options(perRental: nil, perDay: 0, defaultMode: .perRental)
        XCTAssertEqual(dailyZero.map { $0.type }, ["DAILY"])
        XCTAssertTrue(dailyZero[0].isDefault)
        XCTAssertEqual(ProductFormValidator.validate(input(perRental: 0)), [])
        XCTAssertEqual(ProductFormValidator.validate(input(perRental: nil, perDay: 0, mode: .perDay)), [])
        XCTAssertEqual(ProductFormValidator.validate(input(perRental: nil, perDay: nil, mode: .perDay)), [.perDayDefaultNeedsPrice])
        XCTAssertEqual(ProductFormValidator.validate(input(perRental: -1)), [.negativeAmount])
        XCTAssertEqual(MoneyInput.display(ProductPricing.perRental(try! product(freeProduct))), "0", "edit shows 0, not empty")
    }

    func testZeroPriceProductGoesInTheCartAtZeroWithoutAskingForAPrice() throws {
        let cart = Cart()
        cart.orderType = .rent
        cart.addItem(CartItem(from: try product(freeProduct), quantity: 2, price: 0))
        let line = cart.items[0]
        XCTAssertEqual(line.price, 0)
        XCTAssertFalse(CartV2Logic.needsPrice(line, orderType: .rent))
        XCTAssertTrue(CartV2Logic.missingPrices(cart).isEmpty)
        XCTAssertEqual(CartV2Logic.link(line, orderType: .rent).amount, "0đ")
        XCTAssertEqual(CartV2Logic.chip(line, orderType: .rent).price, "0đ")
        XCTAssertEqual(CartV2Logic.calc(line, orderType: .rent).total, 0)
        XCTAssertEqual(CartV2Logic.pricingChoices(line).first, CartPricingChoice(type: "FIXED", catalogPrice: 0))
        XCTAssertEqual(CartV2Logic.startPrice(line, type: "FIXED"), 0)
    }

    /// #996: a product stored at rent price 0 creates at 0đ. Theo ngày still asks when the product has no daily price.
    func testAZeroRentPriceCreatesWithoutAsking() throws {
        let cart = Cart()
        cart.orderType = .rent
        cart.addItem(CartItem(from: try product(noRentPrice), quantity: 1, price: 0))
        XCTAssertEqual(cart.items[0].price, 0)
        XCTAssertFalse(CartV2Logic.needsPrice(cart.items[0], orderType: .rent))
        XCTAssertEqual(CartV2Logic.link(cart.items[0], orderType: .rent).amount, "0đ")
        XCTAssertEqual(CartV2Logic.pricingChoices(cart.items[0]).first?.catalogPrice, 0)
        XCTAssertEqual(CartV2Logic.startPrice(cart.items[0], type: "FIXED"), 0)
        XCTAssertTrue(CartV2Logic.missingPrices(cart).isEmpty)
        XCTAssertEqual(cart.toCreateOrderRequest().orderItems.first?.unitPrice, 0)
        cart.updatePrice(at: 0, price: 50_000)
        cart.clearPrice(at: 0)
        XCTAssertEqual(cart.items[0].price, 0)
        XCTAssertFalse(CartV2Logic.needsPrice(cart.items[0], orderType: .rent))
        cart.selectPricingType(at: 0, type: "DAILY")
        XCTAssertTrue(CartV2Logic.needsPrice(cart.items[0], orderType: .rent))
    }

    func testAPricedLineCanBeGivenFreeAndBack() throws {
        let cart = try pricingCart()
        cart.updatePrice(at: 0, price: 0)
        XCTAssertEqual(cart.items[0].price, 0)
        XCTAssertFalse(CartV2Logic.needsPrice(cart.items[0], orderType: .rent))
        XCTAssertEqual(CartV2Logic.link(cart.items[0], orderType: .rent).amount, "0đ")
        XCTAssertEqual(CartV2Logic.startPrice(cart.items[0], type: "FIXED"), 0)
        let request = try XCTUnwrap(cart.toCreateOrderRequest().orderItems.first)
        XCTAssertEqual(request.unitPrice, 0)
        XCTAssertEqual(request.totalPrice, 0)
        // Thuê → Bán → Thuê keeps the free price
        cart.orderType = .sale
        cart.syncPricesWithOrderType()
        cart.orderType = .rent
        cart.syncPricesWithOrderType()
        XCTAssertEqual(cart.items[0].price, 0)
        XCTAssertFalse(CartV2Logic.needsPrice(cart.items[0], orderType: .rent))
        // an empty box goes back to the catalog price
        cart.clearPrice(at: 0)
        XCTAssertEqual(cart.items[0].price, 350_000)
        XCTAssertFalse(CartV2Logic.needsPrice(cart.items[0], orderType: .rent))
    }

    func testASaleLineAtZeroShowsZeroAndNeverAsks() throws {
        let cart = Cart()
        cart.orderType = .sale
        cart.addItem(CartItem(from: try product(noRentPrice), quantity: 1, price: 0))
        cart.syncPricesWithOrderType()
        XCTAssertEqual(cart.items[0].price, 0)
        XCTAssertFalse(CartV2Logic.needsPrice(cart.items[0], orderType: .sale))
        XCTAssertEqual(CartV2Logic.link(cart.items[0], orderType: .sale).amount, "0đ")
        XCTAssertEqual(CartV2Logic.chip(cart.items[0], orderType: .sale).price, "0đ")
        // a priced sale line given free, then back
        let priced = try pricingCart()
        priced.orderType = .sale
        priced.syncPricesWithOrderType()
        priced.updatePrice(at: 0, price: 0)
        XCTAssertEqual(priced.items[0].price, 0)
        priced.clearPrice(at: 0)
        XCTAssertEqual(priced.items[0].price, priced.items[0].originalSalePrice)
    }

    func testASavedOrderLineAtZeroIsNotBlockedAndLinesStayApart() throws {
        let json = #"{"id":1,"orderNumber":"9","orderType":"RENT","status":"RESERVED","createdAt":"2026-10-01T03:00:00.000Z","updatedAt":"2026-10-01T03:00:00.000Z","customerName":"Huy","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B","totalAmount":150000,"orderItems":[{"id":1,"quantity":1,"unitPrice":150000,"totalPrice":150000,"productId":7,"productName":"Vest"},{"id":3,"quantity":2,"unitPrice":0,"totalPrice":0,"productId":7,"productName":"Vest"}]}"#
        let order = try JSONDecoder.shared.decode(Order.self, from: Data(json.utf8))
        let cart = Cart.fromOrder(order)
        XCTAssertEqual(cart.items.map(\.quantity), [1, 2])
        XCTAssertEqual(cart.items.map(\.price), [150_000, 0])
        XCTAssertNotEqual(cart.items[0].lineId, cart.items[1].lineId)
        XCTAssertTrue(CartV2Logic.missingPrices(cart).isEmpty)
        XCTAssertEqual(cart.toUpdateOrderRequest().orderItems?.map(\.unitPrice), [150_000, 0])
    }

    func testEveryAddIsANewLineAndLineActionsTouchOnlyThatLine() throws {
        let row = try homeRow(options: bothOptions)
        let cart = Cart()
        cart.orderType = .rent
        cart.addItem(product: row, quantity: 1, price: 150_000)
        cart.addItem(product: row, quantity: 1, price: 150_000)
        XCTAssertEqual(cart.items.count, 2)
        XCTAssertNotEqual(cart.items[0].lineId, cart.items[1].lineId)
        XCTAssertEqual(cart.itemCount, 2)
        XCTAssertEqual(ProductRowLogic.cartCount(productId: 301, in: cart.items), 2)
        XCTAssertEqual(HomeCartButton.badge(itemCount: cart.itemCount), "2")

        // 0đ on the second line only
        let second = cart.items[1].lineId
        let index = try XCTUnwrap(cart.index(ofLine: second))
        cart.updatePrice(at: index, price: 0)
        cart.updateQuantity(at: index, quantity: 3)
        XCTAssertEqual(cart.items.map(\.price), [150_000, 0])
        XCTAssertEqual(cart.items.map(\.quantity), [1, 3])
        let request = cart.toCreateOrderRequest().orderItems
        XCTAssertEqual(request.map(\.productId), [301, 301])
        XCTAssertEqual(request.map(\.unitPrice), [150_000, 0])

        // removing the first line leaves the free one
        cart.removeItem(at: 0)
        XCTAssertEqual(cart.items.count, 1)
        XCTAssertEqual(cart.items[0].lineId, second)
        XCTAssertEqual(cart.items[0].price, 0)
        XCTAssertNil(cart.index(ofLine: UUID()))
    }

    func testShortageCountsEveryLineOfTheProduct() throws {
        let row = try homeRow(options: bothOptions)
        let cart = Cart()
        cart.orderType = .rent
        cart.addItem(product: row, quantity: 1, price: 150_000)
        cart.addItem(product: row, quantity: 1, price: 150_000)
        cart.updateAvailabilityStatus(for: 301, status: AvailabilityStatus(isAvailable: true, available: 1))
        XCTAssertNil(CartV2Logic.shortage(cart.items[0]), "one line alone fits")
        XCTAssertEqual(CartV2Logic.shortage(cart.items[0], in: cart.items), 1)
        XCTAssertEqual(CartV2Logic.shortage(cart.items[1], in: cart.items), 1)
        cart.updateAvailabilityStatus(for: 301, status: AvailabilityStatus(isAvailable: true, available: 2))
        XCTAssertNil(CartV2Logic.shortage(cart.items[1], in: cart.items))
    }

    func testASavedCartWithoutLineIdsGetsThemOnLoad() throws {
        let line = CartItem(from: try homeRow(options: bothOptions), quantity: 1, price: 150_000)
        var json = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(line)) as? [String: Any])
        XCTAssertNotNil(json["lineId"])
        json.removeValue(forKey: "lineId")
        json.removeValue(forKey: "priceMissing")
        let data = try JSONSerialization.data(withJSONObject: json)
        let a = try JSONDecoder().decode(CartItem.self, from: data)
        let b = try JSONDecoder().decode(CartItem.self, from: data)
        XCTAssertNotEqual(a.lineId, b.lineId)
        XCTAssertEqual(a.price, 150_000)
        XCTAssertFalse(CartV2Logic.needsPrice(a, orderType: .rent))
        // a line saved at 0 before #951 still asks (as it did)
        json["price"] = 0
        let zero = try JSONDecoder().decode(CartItem.self, from: JSONSerialization.data(withJSONObject: json))
        XCTAssertTrue(CartV2Logic.needsPrice(zero, orderType: .rent))
        // round trip keeps the id
        let again = try JSONDecoder().decode(CartItem.self, from: JSONEncoder().encode(a))
        XCTAssertEqual(again.lineId, a.lineId)
    }

    // MARK: - #952 cart date row

    private func shopDay(_ y: Int, _ m: Int, _ d: Int, hour: Int = 0) -> Date {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = Date.shopTimeZone
        return cal.date(from: DateComponents(year: y, month: m, day: d, hour: hour))!
    }

    /// #952 (owner): no dates → "Chọn ngày thuê" (blue, no pill); dates → "12/10/26 → 15/10/26" + 4 days; calendar icon
    func testCartDateRowStates() {
        let empty = CartDateRowLogic.state(pickup: nil, return: nil)
        XCTAssertEqual(empty.text, "products.cart.pickDates".localized())
        XCTAssertNil(empty.days)
        XCTAssertTrue(empty.isEmpty)
        XCTAssertTrue(CartDateRowLogic.state(pickup: shopDay(2026, 10, 12), return: nil).isEmpty, "half a range is still empty")

        let chosen = CartDateRowLogic.state(pickup: shopDay(2026, 10, 12), return: shopDay(2026, 10, 15, hour: 23))
        XCTAssertEqual(chosen.text, "12/10/26 → 15/10/26")
        XCTAssertEqual(chosen.days, 4)
        XCTAssertFalse(chosen.isEmpty)
        XCTAssertEqual(CartDateRowLogic.iconSymbol, "calendar")
        XCTAssertEqual(CartDateRowLogic.iconSize, 40, "same circle as the customer row avatar")
    }
}

// MARK: - #1067 discount can't be more than the order total

extension ProductsV2Tests {
    func testDiscountLimitIsTheSubtotalOrOneHundredPercent() {
        XCTAssertEqual(CartV2Logic.discountLimit(subtotal: 77, isPercent: false), 77)
        XCTAssertEqual(CartV2Logic.discountLimit(subtotal: 77, isPercent: true), 100)
        XCTAssertEqual(CartV2Logic.discountLimit(subtotal: -5, isPercent: false), 0)
    }

    func testDiscountAboveTheSubtotalIsRefused() {
        // the e2e cart: −5.000.050.000 on a 77đ order
        XCTAssertTrue(CartV2Logic.discountExceeds(value: 5_000_050_000, subtotal: 77, isPercent: false))
        XCTAssertTrue(CartV2Logic.discountExceeds(value: 78, subtotal: 77, isPercent: false))
        XCTAssertFalse(CartV2Logic.discountExceeds(value: 77, subtotal: 77, isPercent: false), "equal: total 0 is allowed")
        XCTAssertFalse(CartV2Logic.discountExceeds(value: 0, subtotal: 0, isPercent: false), "no discount on an empty cart is fine")
        XCTAssertTrue(CartV2Logic.discountExceeds(value: 10, subtotal: 0, isPercent: false))
        XCTAssertTrue(CartV2Logic.discountExceeds(value: 101, subtotal: 77, isPercent: true))
        XCTAssertFalse(CartV2Logic.discountExceeds(value: 100, subtotal: 77, isPercent: true))
        XCTAssertFalse(CartV2Logic.discountExceeds(value: 50, subtotal: 0, isPercent: true), "50% of nothing is 0")
    }

    func testDiscountErrorNamesTheLimit() {
        XCTAssertNil(CartV2Logic.discountError(value: 77, subtotal: 77, isPercent: false))
        let amount = CartV2Logic.discountError(value: 5_000_050_000, subtotal: 77, isPercent: false)
        XCTAssertNotNil(amount)
        XCTAssertTrue(amount?.contains("(77đ)") == true, amount ?? "nil")
        let percent = CartV2Logic.discountError(value: 150, subtotal: 77, isPercent: true)
        XCTAssertTrue(percent?.contains("(100%)") == true, percent ?? "nil")
        let bundle = Bundle(for: OrderRowCell.self)
        let vi = bundle.path(forResource: "vi-VN", ofType: "lproj").flatMap(Bundle.init(path:))
        let en = bundle.path(forResource: "en", ofType: "lproj").flatMap(Bundle.init(path:))
        XCTAssertEqual(vi?.localizedString(forKey: "cart.discount.tooHigh", value: nil, table: nil),
                       "Giảm giá không được lớn hơn tổng đơn (%@)")
        XCTAssertEqual(en?.localizedString(forKey: "cart.discount.tooHigh", value: nil, table: nil),
                       "Discount can't be more than the order total (%@)")
    }

    /// Removing items so the subtotal falls below the saved discount makes the cart's discount invalid (blocks create)
    func testCartDiscountTurnsInvalidWhenItemsAreRemoved() {
        let cart = Cart()
        cart.addItem(CartItem(productId: 1, productName: "Áo dài", barcode: nil, quantity: 1, price: 300_000, deposit: 0,
                              originalRentPrice: 300_000, originalSalePrice: 0))
        cart.addItem(CartItem(productId: 2, productName: "Vest", barcode: nil, quantity: 1, price: 50_000, deposit: 0,
                              originalRentPrice: 50_000, originalSalePrice: 0))
        cart.discountType = .amount
        cart.discount = 200_000
        XCTAssertNil(CartV2Logic.cartDiscountError(cart))
        cart.removeItem(at: 0)
        XCTAssertNotNil(CartV2Logic.cartDiscountError(cart))
        cart.discount = 50_000
        XCTAssertNil(CartV2Logic.cartDiscountError(cart))
        cart.discountType = .percentage
        cart.discount = 100
        XCTAssertNil(CartV2Logic.cartDiscountError(cart))
    }

    /// The keypad opened on an old value: the first key replaces it instead of appending (5.000.050.000 bug)
    func testKeypadFirstKeyReplacesTheOpeningValue() {
        var entry = NumberPadEntry("50000")
        entry.press("7")
        XCTAssertEqual(entry.text, "7")
        entry.press("7")
        XCTAssertEqual(entry.text, "77", "after the first key, keys append")
        entry.press("000")
        XCTAssertEqual(entry.text, "77000")
        entry.press("⌫")
        XCTAssertEqual(entry.text, "7700")

        var cleared = NumberPadEntry("50000")
        cleared.press("⌫")
        XCTAssertEqual(cleared.text, "0", "backspace clears the selected old value")
        cleared.press("5")
        XCTAssertEqual(cleared.text, "5")

        var zero = NumberPadEntry("0")
        zero.press("000")
        XCTAssertEqual(zero.text, "0")
        zero.press("4")
        XCTAssertEqual(zero.text, "4")
        zero.press("⌫")
        XCTAssertEqual(zero.text, "0")

        var oldThousands = NumberPadEntry("50000")
        oldThousands.press("000")
        XCTAssertEqual(oldThousands.text, "0", "000 on a fresh entry starts from 0, not 50000000")
    }
}

/// #1162 — quantity from the shared number pad
final class QuantityEntryTests: XCTestCase {
    func testKeepsAWholeNumber() {
        XCTAssertEqual(QuantityEntry.fromPad(20, minimum: 0), 20)
        XCTAssertEqual(QuantityEntry.fromPad(0, minimum: 0), 0)
    }

    func testClampsBelowTheMinimumAndAboveTheCap() {
        XCTAssertEqual(QuantityEntry.fromPad(0, minimum: 1), 1)
        XCTAssertEqual(QuantityEntry.fromPad(10_000, minimum: 0), QuantityEntry.maximum)
        XCTAssertEqual(QuantityEntry.fromPad(1_000_000, minimum: 0), QuantityEntry.maximum)
    }
}
