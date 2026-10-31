import XCTest
@testable import POS_ADBD

/// #1393: the rules of the first-run card: who sees it, what ticks a row, when it ends, and that a failed read shows nothing.
final class FirstRunGuideTests: XCTestCase {
    private final class FakeSource: FirstRunGuideDataSource {
        var orders: Int? = 0
        var customers: Int? = 0
        var orderCalls = 0
        var customerCalls = 0
        /// Set to hold the order answer back
        var heldOrders: ((Int?) -> Void)?
        var holdOrders = false

        func orderTotal(completion: @escaping (Int?) -> Void) {
            orderCalls += 1
            if holdOrders { heldOrders = completion } else { completion(orders) }
        }

        func customerTotal(completion: @escaping (Int?) -> Void) {
            customerCalls += 1
            completion(customers)
        }
    }

    private struct Context { var role: Role? = .merchant; var merchantId: Int? = 1; var newProducts = true; var newCustomers = true }

    private var defaults: UserDefaults!
    private var suite: String!
    private var source: FakeSource!
    private var context = Context()

    override func setUp() {
        super.setUp()
        suite = "FirstRunGuideTests.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suite)
        source = FakeSource()
        context = Context()
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suite)
        super.tearDown()
    }

    private func tracker() -> FirstRunGuideTracker {
        FirstRunGuideTracker(dataSource: source, defaults: defaults) { [unowned self] in
            FirstRunGuideContext(role: self.context.role, merchantId: self.context.merchantId,
                                 newProducts: self.context.newProducts, newCustomers: self.context.newCustomers)
        }
    }

    // MARK: - Audience

    func testOnlyTheOwnerIsTheAudience() {
        XCTAssertTrue(FirstRunGuide.isAudience(role: .merchant, merchantId: 1, newProducts: true, newCustomers: true))
        for role: Role in [.admin, .outletAdmin, .outletStaff, .outletInventory] {
            XCTAssertFalse(FirstRunGuide.isAudience(role: role, merchantId: 1, newProducts: true, newCustomers: true), "\(role)")
        }
        XCTAssertFalse(FirstRunGuide.isAudience(role: nil, merchantId: 1, newProducts: true, newCustomers: true))
    }

    func testOldScreensAndAMissingShopAreNotTheAudience() {
        XCTAssertFalse(FirstRunGuide.isAudience(role: .merchant, merchantId: 1, newProducts: false, newCustomers: true))
        XCTAssertFalse(FirstRunGuide.isAudience(role: .merchant, merchantId: 1, newProducts: true, newCustomers: false))
        XCTAssertFalse(FirstRunGuide.isAudience(role: .merchant, merchantId: nil, newProducts: true, newCustomers: true))
    }

    func testAnotherRoleMakesNoCallAndGetsNoCard() {
        context.role = .outletAdmin
        let guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        XCTAssertEqual(source.orderCalls, 0)
        XCTAssertEqual(source.customerCalls, 0)
        XCTAssertEqual(guide.card(searching: false), .hidden)
        XCTAssertNil(guide.settingsDoneCount)
    }

    // MARK: - Steps

    func testNewShopShowsAllThreeOpen() {
        let guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        XCTAssertEqual(guide.card(searching: false), .steps(done: []))
        XCTAssertEqual(FirstRunGuide.current(done: []), .product)
        XCTAssertEqual(guide.settingsDoneCount, 0)
    }

    func testProductThenCustomerTick() {
        let guide = tracker()
        guide.noteProducts(true)
        guide.refresh()
        XCTAssertEqual(guide.card(searching: false), .steps(done: [.product]))
        XCTAssertEqual(FirstRunGuide.current(done: [.product]), .customer)
        source.customers = 1
        guide.refresh()
        XCTAssertEqual(guide.card(searching: false), .steps(done: [.product, .customer]))
        XCTAssertEqual(FirstRunGuide.current(done: [.product, .customer]), .order)
        XCTAssertEqual(guide.settingsDoneCount, 2)
    }

    func testACustomerAddedBeforeAProductTicksOnlyTheCustomer() {
        source.customers = 3
        let guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        XCTAssertEqual(guide.card(searching: false), .steps(done: [.customer]))
        XCTAssertEqual(FirstRunGuide.current(done: [.customer]), .product)
    }

    func testSearchHidesTheCard() {
        let guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        XCTAssertEqual(guide.card(searching: true), .hidden)
    }

    func testNoCardBeforeTheProductListAnswered() {
        let guide = tracker()
        guide.refresh()
        XCTAssertEqual(guide.card(searching: false), .hidden)
    }

    // MARK: - Done

    func testAShopWithOrdersOnANewPhoneNeverSeesACard() {
        source.orders = 1
        let guide = tracker()
        guide.noteProducts(true)
        guide.refresh()
        XCTAssertEqual(guide.card(searching: false), .hidden)
        XCTAssertNil(guide.settingsDoneCount)
        XCTAssertEqual(source.customerCalls, 0, "an order ends it: the customer read is not needed")
    }

    func testAnOrderEndsItEvenWithNoCustomerAndNoProduct() {
        let guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        guide.noteCardShown()
        source.orders = 2
        guide.refresh()
        XCTAssertEqual(guide.card(searching: false), .finished)
    }

    func testFinishShowsOnceAndCloseEndsIt() {
        let guide = tracker()
        guide.noteProducts(true)
        guide.refresh()
        guide.noteCardShown()
        source.orders = 1
        guide.refresh()
        XCTAssertEqual(guide.card(searching: false), .finished)
        XCTAssertNil(guide.settingsDoneCount)
        guide.closeFinish()
        XCTAssertEqual(guide.card(searching: false), .hidden)
        XCTAssertEqual(tracker().card(searching: false), .hidden, "still gone after a relaunch")
    }

    func testFinishSurvivesARelaunchUntilClosed() {
        let guide = tracker()
        guide.noteProducts(true)
        guide.refresh()
        guide.noteCardShown()
        source.orders = 1
        guide.refresh()
        XCTAssertEqual(tracker().card(searching: false), .finished)
    }

    func testDoneFlagStopsEveryFurtherCall() {
        source.orders = 1
        let guide = tracker()
        guide.refresh()
        XCTAssertEqual(source.orderCalls, 1)
        guide.refresh()
        let relaunched = tracker()
        relaunched.refresh()
        XCTAssertEqual(source.orderCalls, 1)
        XCTAssertEqual(source.customerCalls, 0)
    }

    // MARK: - Network error

    func testOrderReadFailureShowsNothing() {
        source.orders = nil
        let guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        XCTAssertEqual(guide.card(searching: false), .hidden)
        XCTAssertNil(guide.settingsDoneCount)
    }

    func testCustomerReadFailureShowsNothing() {
        source.customers = nil
        let guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        XCTAssertEqual(guide.card(searching: false), .hidden)
    }

    func testProductListFailureShowsNothing() {
        let guide = tracker()
        guide.noteProducts(nil)
        guide.refresh()
        XCTAssertEqual(guide.card(searching: false), .hidden)
    }

    func testAFailureDoesNotEndTheGuide() {
        source.orders = nil
        let guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        source.orders = 0
        guide.refresh()
        XCTAssertEqual(guide.card(searching: false), .steps(done: []))
    }

    func testACardOnScreenGoesWhenARefreshFails() {
        let guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        XCTAssertEqual(guide.card(searching: false), .steps(done: []))
        source.customers = nil
        guide.refresh()
        XCTAssertEqual(guide.card(searching: false), .hidden)
    }

    // MARK: - Skip

    func testSkipIsPerShop() {
        let guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        guide.skip()
        XCTAssertEqual(guide.card(searching: false), .hidden)

        context.merchantId = 2
        let other = tracker()
        other.noteProducts(false)
        other.refresh()
        XCTAssertEqual(other.card(searching: false), .steps(done: []), "another shop on this phone still sees its card")

        context.merchantId = 1
        XCTAssertEqual(tracker().card(searching: false), .hidden, "the first shop stays skipped")
    }

    func testStoreKeysCarryTheShop() {
        XCTAssertEqual(FirstRunGuideStore.key("skipped", merchantId: 42), "firstRunGuide.skipped.42")
    }

    func testSkippedGuideMakesNoCallFromHomeButSettingsStillReads() {
        let guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        guide.skip()
        let calls = source.orderCalls
        guide.refresh()
        XCTAssertEqual(source.orderCalls, calls)
        guide.refresh(forSettings: true)
        XCTAssertEqual(source.orderCalls, calls + 1)
        XCTAssertEqual(guide.settingsDoneCount, 0, "the row stays so the guide can be reopened")
    }

    func testReopeningClearsTheSkip() {
        let guide = tracker()
        guide.noteProducts(false)
        guide.refresh()
        guide.skip()
        guide.clearSkip()
        XCTAssertEqual(guide.card(searching: false), .steps(done: []))
    }

    func testASkippedGuideGetsNoFinishCard() {
        let guide = tracker()
        guide.noteProducts(true)
        guide.refresh()
        guide.noteCardShown()
        guide.skip()
        source.orders = 1
        guide.refresh(forSettings: true)
        XCTAssertEqual(guide.card(searching: false), .hidden)
        XCTAssertNil(guide.settingsDoneCount)
    }

    // MARK: - Shop change

    func testAnotherShopDoesNotInheritFacts() {
        source.customers = 5
        let guide = tracker()
        guide.noteProducts(true)
        guide.refresh()
        context.merchantId = 2
        XCTAssertEqual(guide.card(searching: false), .hidden, "nothing known about the new shop yet")
        XCTAssertNil(guide.settingsDoneCount)
    }

    func testAnAnswerForTheOldShopIsDropped() {
        source.holdOrders = true
        let guide = tracker()
        guide.refresh()
        context.merchantId = 2
        source.heldOrders?(9)
        XCTAssertFalse(FirstRunGuideStore(defaults: defaults).marks(merchantId: 1).done)
        XCTAssertFalse(FirstRunGuideStore(defaults: defaults).marks(merchantId: 2).done)
    }

    // MARK: - Row actions

    func testRowActions() {
        XCTAssertEqual(FirstRunGuide.action(for: .product, hasProduct: true, cartIsEmpty: true), .openProductForm)
        XCTAssertEqual(FirstRunGuide.action(for: .customer, hasProduct: true, cartIsEmpty: true), .openCart(addFirstProduct: true))
        XCTAssertEqual(FirstRunGuide.action(for: .order, hasProduct: true, cartIsEmpty: false), .openCart(addFirstProduct: false))
        XCTAssertEqual(FirstRunGuide.action(for: .customer, hasProduct: false, cartIsEmpty: true), .openProductForm)
    }

    // MARK: - Settings row

    func testSettingsRowSitsUnderWidgetOnlyWhenAsked() {
        let items = SettingsV2Logic.sections(role: .merchant, permissions: [], hasPlan: false, supportsWidget: true, showsGuide: true)
            .first { $0.group == .account }?.items
        XCTAssertEqual(items, [.language, .widget, .firstRunGuide, .advanced])
        let without = SettingsV2Logic.sections(role: .merchant, permissions: [], hasPlan: false, supportsWidget: true)
            .first { $0.group == .account }?.items
        XCTAssertEqual(without, [.language, .widget, .advanced])
    }
}
