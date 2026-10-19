import XCTest
@testable import POS_ADBD

/// #1079 — several carts at once: the store keeps a list, `cart` is the one in use
final class CartStoreMultiCartTests: XCTestCase {
    private var store: CartStore { CartStore.shared }

    private func customer(_ id: Int, _ name: String) -> Customer {
        var c = Customer()
        c.id = id
        c.customer_id = id
        c.full_name = name
        return c
    }

    override func setUp() {
        super.setUp()
        store.resetAllCarts(notify: false, persistToDisk: false)
    }

    override func tearDown() {
        store.resetAllCarts(notify: false, persistToDisk: false)
        super.tearDown()
    }

    func testStartsWithOneEmptyCart() {
        XCTAssertEqual(store.carts.count, 1)
        XCTAssertEqual(store.activeIndex, 0)
        XCTAssertTrue(store.cart.isEmpty)
    }

    func testNewCartIsAddedAndUsed() {
        store.setCustomer(customer(1, "Mai"))
        XCTAssertTrue(store.newCart(notify: false))
        XCTAssertEqual(store.carts.count, 2)
        XCTAssertEqual(store.activeIndex, 1)
        XCTAssertNil(store.cart.customer)
        XCTAssertEqual(store.carts[0].customer?.full_name, "Mai")
    }

    func testSwitchingCartsKeepsEachOnesContent() {
        store.setCustomer(customer(1, "Mai"))
        store.newCart(notify: false)
        store.setCustomer(customer(2, "Lâm"))
        store.switchCart(to: 0, notify: false)
        XCTAssertEqual(store.cart.customer?.full_name, "Mai")
        store.switchCart(to: 1, notify: false)
        XCTAssertEqual(store.cart.customer?.full_name, "Lâm")
    }

    func testSwitchToBadIndexDoesNothing() {
        store.switchCart(to: 5, notify: false)
        XCTAssertEqual(store.activeIndex, 0)
    }

    func testAtMostTenCarts() {
        for _ in 1..<CartStore.maxCarts { XCTAssertTrue(store.newCart(notify: false)) }
        XCTAssertEqual(store.carts.count, CartStore.maxCarts)
        XCTAssertFalse(store.newCart(notify: false))
        XCTAssertEqual(store.carts.count, CartStore.maxCarts)
    }

    func testDefaultNamesUseSmallestFreeNumber() {
        store.newCart(notify: false)   // Giỏ 2
        store.newCart(notify: false)   // Giỏ 3
        XCTAssertEqual(store.carts.map(\.number), [1, 2, 3])
        store.deleteCart(at: 1, notify: false)
        store.newCart(notify: false)
        XCTAssertEqual(store.carts.map(\.number), [1, 3, 2])
    }

    func testTitleIsCustomerNameOrCartNumber() {
        store.newCart(notify: false)
        XCTAssertEqual(CartStore.title(of: store.cart), String(format: "cart.multi.title".localized(), 2))
        store.setCustomer(customer(3, "Nguyễn Thị Mai"))
        XCTAssertEqual(CartStore.title(of: store.cart), "Nguyễn Thị Mai")
    }

    func testAvatarIsInitialsOrNumber() {
        store.newCart(notify: false)
        XCTAssertEqual(CartStore.avatarText(of: store.cart), "2")
        store.setCustomer(customer(3, "Nguyễn Thị Mai"))
        XCTAssertEqual(CartStore.avatarText(of: store.cart), "NM")
    }

    func testClosingTheActiveCartMovesToAnother() {
        store.setCustomer(customer(1, "Mai"))
        store.newCart(notify: false)
        store.setCustomer(customer(2, "Lâm"))
        store.resetCart(notify: false)               // order created
        XCTAssertEqual(store.carts.count, 1)
        XCTAssertEqual(store.cart.customer?.full_name, "Mai")
    }

    func testClosingTheOnlyCartLeavesAnEmptyOne() {
        store.setCustomer(customer(1, "Mai"))
        store.resetCart(notify: false)
        XCTAssertEqual(store.carts.count, 1)
        XCTAssertTrue(store.cart.isEmpty)
        XCTAssertNil(store.cart.customer)
    }

    func testDeleteBeforeActiveKeepsTheSameCartActive() {
        store.setCustomer(customer(1, "Mai"))
        store.newCart(notify: false)
        store.setCustomer(customer(2, "Lâm"))
        store.deleteCart(at: 0, notify: false)
        XCTAssertEqual(store.cart.customer?.full_name, "Lâm")
        XCTAssertEqual(store.activeIndex, 0)
    }

    func testResetAllClearsEveryCart() {
        store.newCart(notify: false)
        store.newCart(notify: false)
        store.resetAllCarts(notify: false, persistToDisk: false)
        XCTAssertEqual(store.carts.count, 1)
    }

    func testSnapshotRoundTripKeepsCartsAndActive() throws {
        store.setCustomer(customer(1, "Mai"))
        store.newCart(notify: false)
        store.setCustomer(customer(2, "Lâm"))
        let data = try CartStore.encodeSnapshot(carts: store.carts, activeIndex: store.activeIndex)
        let restored = try XCTUnwrap(CartStore.decodeSnapshot(multi: data, legacy: nil))
        XCTAssertEqual(restored.carts.count, 2)
        XCTAssertEqual(restored.activeIndex, 1)
        XCTAssertEqual(restored.carts[0].customer?.full_name, "Mai")
        XCTAssertEqual(restored.carts.map(\.number), [1, 2])
    }

    func testOldSingleCartDraftBecomesTheFirstCart() throws {
        store.setCustomer(customer(9, "Cũ"))
        let legacy = try JSONEncoder().encode(store.cart.makeDiskSnapshot())
        let restored = try XCTUnwrap(CartStore.decodeSnapshot(multi: nil, legacy: legacy))
        XCTAssertEqual(restored.carts.count, 1)
        XCTAssertEqual(restored.carts[0].customer?.full_name, "Cũ")
        XCTAssertEqual(restored.carts[0].number, 1)
    }

    func testNothingSavedMeansNoSnapshot() {
        XCTAssertNil(CartStore.decodeSnapshot(multi: nil, legacy: nil))
    }

    func testSwitchBarShowsWithItemsOrManyCarts() {
        XCTAssertFalse(CartSwitchBar.shouldShow(cartCount: 1, itemCount: 0, isEditMode: false))
        XCTAssertTrue(CartSwitchBar.shouldShow(cartCount: 1, itemCount: 2, isEditMode: false))
        XCTAssertTrue(CartSwitchBar.shouldShow(cartCount: 2, itemCount: 0, isEditMode: false))
        XCTAssertFalse(CartSwitchBar.shouldShow(cartCount: 3, itemCount: 2, isEditMode: true))
    }
}
